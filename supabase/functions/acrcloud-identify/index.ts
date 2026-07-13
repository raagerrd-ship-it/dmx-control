// deno-lint-ignore-file no-explicit-any
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// HMAC-SHA1 → base64 med Web Crypto
async function hmacSha1B64(key: string, msg: string): Promise<string> {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode(msg));
  const bytes = new Uint8Array(sig);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/^data:[^;]+;base64,/, "");
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const host = Deno.env.get("ACRCLOUD_HOST");
    const accessKey = Deno.env.get("ACRCLOUD_ACCESS_KEY");
    const accessSecret = Deno.env.get("ACRCLOUD_ACCESS_SECRET");
    if (!host || !accessKey || !accessSecret) {
      return new Response(JSON.stringify({ error: "acrcloud_not_configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => null);
    const audioB64: string | undefined = body?.audioBase64;
    if (!audioB64 || typeof audioB64 !== "string" || audioB64.length < 500) {
      return new Response(JSON.stringify({ error: "invalid_audio" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const audioBytes = base64ToBytes(audioB64);
    if (audioBytes.length > 2_000_000) {
      return new Response(JSON.stringify({ error: "audio_too_large" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const stringToSign = ["POST", "/v1/identify", accessKey, "audio", "1", timestamp].join("\n");
    const signature = await hmacSha1B64(accessSecret, stringToSign);

    // multipart/form-data
    const form = new FormData();
    form.append("access_key", accessKey);
    form.append("sample_bytes", String(audioBytes.length));
    form.append("sample", new Blob([audioBytes], { type: "audio/mpeg" }), "sample");
    form.append("timestamp", timestamp);
    form.append("signature", signature);
    form.append("data_type", "audio");
    form.append("signature_version", "1");

    const url = `https://${host}/v1/identify`;
    const acrRes = await fetch(url, { method: "POST", body: form });
    const acrText = await acrRes.text();
    let acr: any;
    try { acr = JSON.parse(acrText); } catch {
      return new Response(JSON.stringify({ error: "acr_bad_json", raw: acrText.slice(0, 500) }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const code = acr?.status?.code;
    // 1001 = No result. 0 = OK.
    if (code === 1001) {
      return new Response(JSON.stringify({ matched: false, reason: "no_match" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (code !== 0) {
      return new Response(JSON.stringify({ matched: false, error: "acr_error", status: acr?.status }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const music = acr?.metadata?.music?.[0];
    if (!music) {
      return new Response(JSON.stringify({ matched: false, reason: "no_music" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const spotifyId: string | undefined = music?.external_metadata?.spotify?.track?.id;
    const title: string = music?.title ?? "Okänd låt";
    const artists: string = (music?.artists ?? []).map((a: any) => a?.name).filter(Boolean).join(", ") || "Okänd artist";
    const playOffsetMs: number = Math.max(0, Number(music?.play_offset_ms ?? 0));
    const durationMs: number = Math.max(0, Number(music?.duration_ms ?? 0));

    return new Response(JSON.stringify({
      matched: true,
      title,
      artists,
      spotifyId: spotifyId ?? null,
      playOffsetMs,
      durationMs,
      score: music?.score ?? null,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("acrcloud-identify error", e);
    return new Response(JSON.stringify({ error: "internal", details: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
