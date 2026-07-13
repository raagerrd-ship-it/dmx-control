import { useEffect, useRef } from "react";
import { useSmartSync, type TimelineEvent, type SmartSyncTrack } from "@/store/smartSync";
import { useDmx, type PresetId } from "@/store/dmx";
import { supabase } from "@/integrations/supabase/client";

/**
 * Smart Sync: mobilen lyssnar via sin mic, skickar 6s audio till ACRCloud
 * var 12:e sekund. Vid träff hämtas Spotify audio-analysis och en tidslinje
 * med preset/hue-byten och drop-flashes byggs upp lokalt.
 *
 * Kräver internet på mobilen (via mobildata parallellt med Pi-AP:n).
 */

const CHUNK_MS = 6000;
const RETRY_INTERVAL_MS = 12000;

// Encode Float32Array PCM → 16-bit little-endian WAV (mono)
function encodeWav(samples: Float32Array, sampleRate: number): Uint8Array {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeStr = (o: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, samples.length * 2, true);
  let off = 44;
  for (let i = 0; i < samples.length; i++, off += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Uint8Array(buffer);
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as any);
  }
  return btoa(bin);
}

/** Spela in `durationMs` ms mono @ 16 kHz och returnera WAV-base64. */
async function recordChunk(durationMs: number): Promise<string> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: {
    channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false,
  } });
  try {
    const ac = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    // Vissa browsers ignorerar sampleRate → resample manuellt om vi hamnar fel
    const src = ac.createMediaStreamSource(stream);
    const targetLen = Math.floor((ac.sampleRate * durationMs) / 1000);
    const buf = new Float32Array(targetLen);
    let writeIdx = 0;
    const proc = ac.createScriptProcessor(4096, 1, 1);
    let resolveDone: () => void;
    const done = new Promise<void>((r) => { resolveDone = r; });
    proc.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      const room = targetLen - writeIdx;
      const n = Math.min(input.length, room);
      buf.set(input.subarray(0, n), writeIdx);
      writeIdx += n;
      if (writeIdx >= targetLen) resolveDone();
    };
    src.connect(proc);
    proc.connect(ac.destination);
    await Promise.race([done, new Promise<void>((r) => setTimeout(r, durationMs + 500))]);
    proc.disconnect(); src.disconnect(); await ac.close();
    const wav = encodeWav(buf.subarray(0, writeIdx), ac.sampleRate);
    return bytesToBase64(wav);
  } finally {
    stream.getTracks().forEach((t) => t.stop());
  }
}

const VALID_PRESETS: PresetId[] = ["auto", "party", "strobe", "comet", "chase", "split", "mono"];

export function useSmartSync_Runner() {
  const enabled = useSmartSync((s) => s.enabled);
  const setStatus = useSmartSync((s) => s.setStatus);
  const setSync = useSmartSync((s) => s.setSync);
  const markAttempt = useSmartSync((s) => s.markAttempt);
  const running = useRef(false);
  const abort = useRef(false);

  useEffect(() => {
    if (!enabled) { abort.current = true; return; }
    abort.current = false;

    const loop = async () => {
      if (running.current) return;
      running.current = true;
      try {
        while (!abort.current) {
          markAttempt();
          setStatus("listening");
          let audioBase64: string;
          try {
            audioBase64 = await recordChunk(CHUNK_MS);
          } catch (e: any) {
            setStatus("error", e?.message || "mic_failed");
            await sleep(RETRY_INTERVAL_MS);
            continue;
          }
          if (abort.current) break;

          setStatus("identifying");
          const identifyStartWall = Date.now();
          const { data: idData, error: idErr } = await supabase.functions.invoke("acrcloud-identify", {
            body: { audioBase64 },
          });
          if (idErr) {
            setStatus("error", `identify: ${idErr.message}`);
            await sleep(RETRY_INTERVAL_MS);
            continue;
          }
          if (!idData?.matched) {
            setStatus("no-match");
            await sleep(RETRY_INTERVAL_MS);
            continue;
          }
          const spotifyId: string | null = idData.spotifyId ?? null;
          const playOffsetMs: number = Number(idData.playOffsetMs ?? 0);
          const acrTitle: string = idData.title ?? "Okänd";
          const acrArtists: string = idData.artists ?? "";

          if (!spotifyId) {
            // Har match men saknar Spotify-id → visa track men ingen timeline.
            setSync({
              track: { id: "acr:" + acrTitle, name: acrTitle, artists: acrArtists, artUrl: null, durationMs: Number(idData.durationMs ?? 0) },
              anchorAt: identifyStartWall - playOffsetMs,
              events: [],
            });
            await sleep(RETRY_INTERVAL_MS * 3);
            continue;
          }

          setStatus("analyzing");
          const { data: anData, error: anErr } = await supabase.functions.invoke("spotify-track-analysis", {
            body: { trackId: spotifyId, playOffsetMs },
          });
          if (anErr) {
            setStatus("error", `analyze: ${anErr.message}`);
            await sleep(RETRY_INTERVAL_MS);
            continue;
          }
          if (!anData?.ok) {
            setStatus("error", anData?.error || "analyze_failed");
            await sleep(RETRY_INTERVAL_MS);
            continue;
          }

          const track: SmartSyncTrack = {
            id: spotifyId,
            name: anData.track?.name || acrTitle,
            artists: anData.track?.artists || acrArtists,
            artUrl: anData.track?.artUrl ?? null,
            durationMs: Number(anData.track?.durationMs ?? 0),
          };
          const events = (anData.events as TimelineEvent[]) ?? [];
          // Ankartid: när vi började spela in var vi vid playOffsetMs i låten.
          const anchorAt = identifyStartWall - playOffsetMs;
          setSync({ track, anchorAt, events });

          // Sätt initial preset + hue baserat på Spotifys features (fallback för start)
          const st = useDmx.getState();
          const nextPreset = VALID_PRESETS.includes(anData.preset) ? (anData.preset as PresetId) : "auto";
          st.setPreset(nextPreset);
          const hues = anData.hues;
          if (hues) {
            st.patchParams({
              cometHue: hues.primary,
              monoHue: hues.primary,
              splitHueA: hues.primary,
              splitHueB: hues.secondary,
            });
          }

          // Vänta tills låten borde vara slut, eller RETRY-intervall (whichever first),
          // för att re-identifiera vid låtbyte.
          const remaining = Math.max(0, (track.durationMs || 0) - playOffsetMs);
          const wait = Math.min(remaining + 2000, 45_000);
          await sleep(Math.max(wait, RETRY_INTERVAL_MS));
        }
      } finally {
        running.current = false;
        if (abort.current) setStatus("off");
      }
    };

    void loop();
    return () => { abort.current = true; };
  }, [enabled, setStatus, setSync, markAttempt]);
}

function sleep(ms: number) { return new Promise<void>((r) => setTimeout(r, ms)); }
