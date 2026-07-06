import { useEffect, useRef } from "react";

export interface MicSample {
  /** RMS 0..1 av tidsdomän-buffern */
  level: number;
  /** Total spektral-energi 0..~1 (sum |X|²) — används som "flux"-källa */
  energy: number;
  /** true = pipelinen levererar data */
  active: boolean;
}

/**
 * Öppnar datorns mic när `enabled` = true och skriver senaste sample till
 * en ref. Loopen som konsumerar (useMockLive) läser refen varje frame,
 * så vi behöver aldrig rendera om vid varje sample.
 */
export function useMic(
  enabled: boolean,
  onError?: (msg: string | null) => void,
): React.MutableRefObject<MicSample> {
  const sample = useRef<MicSample>({ level: 0, energy: 0, active: false });
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let ctx: AudioContext | null = null;
    let stream: MediaStream | null = null;
    let raf = 0;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        ctx = new AudioContext();
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0;
        src.connect(analyser);
        const timeBuf = new Float32Array(analyser.fftSize);
        const freqBuf = new Uint8Array(analyser.frequencyBinCount);

        onError?.(null);
        sample.current.active = true;

        const loop = () => {
          if (cancelled) return;
          analyser.getFloatTimeDomainData(timeBuf);
          analyser.getByteFrequencyData(freqBuf);
          let sum = 0;
          for (let i = 0; i < timeBuf.length; i++) sum += timeBuf[i] * timeBuf[i];
          const rms = Math.sqrt(sum / timeBuf.length);
          // Basviktad energi: låga bins bidrar mer (kick/snare).
          let e = 0;
          const bassCount = Math.min(32, freqBuf.length);
          for (let i = 0; i < bassCount; i++) e += freqBuf[i];
          const energy = e / (bassCount * 255);
          sample.current = { level: Math.min(1, rms * 4), energy, active: true };
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      } catch (err: any) {
        onError?.(err?.message ?? "Kunde inte öppna mic");
        sample.current = { level: 0, energy: 0, active: false };
      }
    })();

    cleanupRef.current = () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (ctx) ctx.close().catch(() => {});
      sample.current = { level: 0, energy: 0, active: false };
    };
    return cleanupRef.current;
  }, [enabled, onError]);

  return sample;
}
