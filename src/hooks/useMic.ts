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

        // Auto-gain: långsam RMS-envelope styr en gain-faktor så snittet
        // hålls nära TARGET även om volymen i lokalen ändras under kvällen.
        const TARGET = 0.5;           // sikta mot "loud" — nära max
        const MIN_GAIN = 0.5;
        const MAX_GAIN = 20;
        const NOISE_FLOOR = 0.003;    // under detta räknas som tystnad
        // Grundvolymen ändras sällan — kör mycket långsam adaptation.
        const T_UP = 90;              // ~1.5 min att öka gain
        const T_DOWN = 30;            // ~30s att minska gain
        let gain = 1;
        let envelope = TARGET;
        let lastT = performance.now();

        const loop = () => {
          if (cancelled) return;
          const now = performance.now();
          const dt = Math.min(0.1, (now - lastT) / 1000);
          lastT = now;

          analyser.getFloatTimeDomainData(timeBuf);
          analyser.getByteFrequencyData(freqBuf);
          let sum = 0;
          for (let i = 0; i < timeBuf.length; i++) sum += timeBuf[i] * timeBuf[i];
          const rms = Math.sqrt(sum / timeBuf.length);
          let e = 0;
          const bassCount = Math.min(32, freqBuf.length);
          for (let i = 0; i < bassCount; i++) e += freqBuf[i];
          const energyRaw = e / (bassCount * 255);

          // Uppdatera envelope endast över brusgolvet, annars driver gain iväg.
          if (rms > NOISE_FLOOR) {
            const tau = rms * gain > envelope ? T_DOWN : T_UP;
            const a = 1 - Math.exp(-dt / tau);
            envelope += (rms * gain - envelope) * a;
            const desired = TARGET / Math.max(1e-4, envelope) * gain;
            const gTau = desired > gain ? T_UP : T_DOWN;
            const ga = 1 - Math.exp(-dt / gTau);
            gain += (desired - gain) * ga;
            if (gain < MIN_GAIN) gain = MIN_GAIN;
            else if (gain > MAX_GAIN) gain = MAX_GAIN;
          }

          const level = Math.min(1, rms * 4 * gain);
          const energy = Math.min(1, energyRaw * gain);
          sample.current = { level, energy, active: true };
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
