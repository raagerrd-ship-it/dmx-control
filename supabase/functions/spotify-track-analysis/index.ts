// deno-lint-ignore-file no-explicit-any
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// -- Enkel in-memory token cache (per warm instance) --
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getSpotifyToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 30_000) return cachedToken.value;
  const id = Deno.env.get("SPOTIFY_CLIENT_ID");
  const secret = Deno.env.get("SPOTIFY_CLIENT_SECRET");
  if (!id || !secret) throw new Error("spotify_not_configured");
  const basic = btoa(`${id}:${secret}`);
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`spotify_token_failed [${res.status}]: ${txt}`);
  }
  const j = await res.json();
  const expiresIn = Number(j.expires_in ?? 3600);
  cachedToken = { value: j.access_token, expiresAt: now + expiresIn * 1000 };
  return cachedToken.value;
}

async function sp(token: string, path: string): Promise<any> {
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`spotify [${res.status}] ${path}: ${txt}`);
  }
  return res.json();
}

// --- Färgval från audio-features ---
type PaletteHues = { primary: number; secondary: number };

function palette(valence: number, energy: number, danceability: number): PaletteHues {
  // valence: 0 (sad/dark) -> 1 (happy/bright)
  // energy:  0 -> 1
  // Palettmap:
  //  Låg valence + låg energy  → djupblå + lila (chill)
  //  Låg valence + hög energy  → rött + magenta (metal/aggro)
  //  Hög valence + låg energy  → varm orange/gul (akustisk)
  //  Hög valence + hög energy  → cyan + magenta (party/pop)
  let primary: number, secondary: number;
  if (valence < 0.4 && energy < 0.5) { primary = 220; secondary = 280; }
  else if (valence < 0.4)            { primary = 0;   secondary = 320; }
  else if (energy < 0.5)             { primary = 30;  secondary = 55;  }
  else                               { primary = 190; secondary = 320; }
  // Dance-bump: extra saturation-shift
  if (danceability > 0.75) { secondary = (secondary + 20) % 360; }
  return { primary, secondary };
}

// Välj preset från audio-features
function presetFor(energy: number, danceability: number, tempo: number): string {
  if (energy < 0.35) return "auto";
  if (danceability > 0.7 && energy > 0.6) return "party";
  if (tempo > 140 && energy > 0.75) return "split";
  if (energy > 0.65) return "comet";
  return "auto";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => null);
    const trackId: string | undefined = body?.trackId;
    const playOffsetMs: number = Math.max(0, Number(body?.playOffsetMs ?? 0));
    if (!trackId || !/^[a-zA-Z0-9]{15,30}$/.test(trackId)) {
      return new Response(JSON.stringify({ error: "invalid_track_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = await getSpotifyToken();
    const [track, features, analysis] = await Promise.all([
      sp(token, `/tracks/${trackId}`),
      sp(token, `/audio-features/${trackId}`),
      sp(token, `/audio-analysis/${trackId}`),
    ]);

    const energy = Number(features?.energy ?? 0.5);
    const valence = Number(features?.valence ?? 0.5);
    const danceability = Number(features?.danceability ?? 0.5);
    const tempo = Number(features?.tempo ?? 120);
    const hues = palette(valence, energy, danceability);
    const preset = presetFor(energy, danceability, tempo);

    const sections: any[] = Array.isArray(analysis?.sections) ? analysis.sections : [];
    const bars: any[] = Array.isArray(analysis?.bars) ? analysis.bars : [];

    // Relativ tid till NU (0 = nu). Bygg events endast för det som fortfarande ligger i framtiden
    // (efter aktuell playOffsetMs).
    const events: any[] = [];

    // 1. Sections → preset/hue-byte + pre-drop flash på höga loudness-hopp
    for (let i = 0; i < sections.length; i++) {
      const s = sections[i];
      const startMs = Math.round(Number(s.start ?? 0) * 1000);
      if (startMs < playOffsetMs - 500) continue;
      const relMs = startMs - playOffsetMs;

      const secEnergy = Math.min(1, Math.max(0, (Number(s.loudness ?? -20) + 30) / 30));
      const secTempo = Number(s.tempo ?? tempo);

      // Byte-hue för variation: växla mellan primary/secondary
      const hueForThis = i % 2 === 0 ? hues.primary : hues.secondary;

      // Preset per section
      let sectionPreset = preset;
      if (secEnergy > 0.75 && secTempo > 130) sectionPreset = "split";
      else if (secEnergy > 0.6) sectionPreset = "comet";
      else if (secEnergy < 0.35) sectionPreset = "auto";

      events.push({
        atMs: Math.max(0, relMs),
        type: "section",
        preset: sectionPreset,
        primaryHue: hueForThis,
        secondaryHue: i % 2 === 0 ? hues.secondary : hues.primary,
        energy: secEnergy,
      });

      // Om nästa section har mycket högre loudness → build-up + white flash strax innan
      const next = sections[i + 1];
      if (next) {
        const dLoud = Number(next.loudness ?? -20) - Number(s.loudness ?? -20);
        if (dLoud > 4) {
          const dropMs = Math.round(Number(next.start ?? 0) * 1000) - playOffsetMs;
          if (dropMs > 500) {
            events.push({ atMs: Math.max(0, dropMs - 300), type: "flash", durationMs: 250 });
          }
        }
      }
    }

    // 2. Downbeats (var 4:e bar) → subtil hue-shift-hint. Vi genererar bara sparsamt
    //    så vi inte spammar timelinen med hundratals events.
    let barCount = 0;
    for (const bar of bars) {
      if (barCount % 4 === 0) {
        const startMs = Math.round(Number(bar.start ?? 0) * 1000);
        if (startMs >= playOffsetMs) {
          events.push({ atMs: startMs - playOffsetMs, type: "bar", conf: bar.confidence ?? 0 });
        }
      }
      barCount++;
    }

    // Sortera
    events.sort((a, b) => a.atMs - b.atMs);

    const durationMs = Math.round(Number(track?.duration_ms ?? 0));
    const artUrl: string | null = track?.album?.images?.[0]?.url ?? null;

    return new Response(JSON.stringify({
      ok: true,
      track: {
        id: trackId,
        name: track?.name ?? "Okänd",
        artists: (track?.artists ?? []).map((a: any) => a?.name).filter(Boolean).join(", "),
        artUrl,
        durationMs,
      },
      features: { energy, valence, danceability, tempo },
      preset,
      hues,
      events,
      playOffsetMs,
      generatedAt: Date.now(),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("spotify-track-analysis error", e);
    // audio-analysis + audio-features kräver båda att låten finns i Spotifys katalog.
    // 404 där = ingen analys. Returnera struktur som klienten kan gracefully hantera.
    const msg = String(e?.message ?? e);
    const isNotFound = /\[404\]/.test(msg);
    return new Response(JSON.stringify({
      ok: false,
      error: isNotFound ? "spotify_no_analysis" : "spotify_error",
      details: msg.slice(0, 400),
    }), { status: isNotFound ? 200 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
