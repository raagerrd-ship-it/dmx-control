/**
 * useLiveAnalysis: mic-capture → circular buffer → Essentia.js analys.
 *
 * - Ringbuffert 4 s @ 22050 Hz (~88k samples) för Essentia batch-anrop.
 * - Var 250 ms: PercivalBpmEstimator (BPM) på senaste 4 s.
 * - Var 500 ms: KeyExtractor på senaste 4 s (varm/kall palett).
 * - Varje mic-callback: RMS + spektral-flux; 500 ms lookahead-drop-detektor
 *   utlöser markFlash() ~200 ms INNAN energitoppen når Pi-mic.
 *
 * Alla events skrivs till zustand-storen liveAnalysis; useMockLive (browser)
 * och Pi:s WS-sändare (via useWsRelay) plockar upp dem.
 */

import { useEffect } from "react";
import { useLiveAnalysis } from "@/store/liveAnalysis";
import { loadEssentia } from "@/lib/essentia/loader";

const SAMPLE_RATE_TARGET = 22050;
const RING_SECONDS = 4;
const RING_SIZE = SAMPLE_RATE_TARGET * RING_SECONDS;
const LOOKAHEAD_MS = 200;

export function useLiveAnalysisRunner() {
  const enabled = useLiveAnalysis((s) => s.enabled);
  const sensitivity = useLiveAnalysis((s) => s.sensitivity);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let audioCtx: AudioContext | null = null;
    let stream: MediaStream | null = null;
    let processor: ScriptProcessorNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let bpmTimer: number | null = null;
    const bpmHist: number[] = [];   // oktavvikta estimat, senaste ~3 s
    let lockedBpm = 0;              // stabil takt
    let beatAnchor = 0;             // fasankare (wall-clock ms)
    let keyTimer: number | null = null;

    const set = useLiveAnalysis.setState;

    // Ringbuffert för Essentia batch
    const ring = new Float32Array(RING_SIZE);
    let ringWrite = 0;
    let filled = 0;

    // Spektral-flux lookahead-detektor (400 ms fönster)
    const FLUX_HIST = 20;              // ~400 ms @ 20 ms hop
    const fluxHistory = new Float32Array(FLUX_HIST);
    let fluxIdx = 0;
    let energyPeak = 0.15;   // långsam energitopp — grindar bort drops i lugna partier
    let prevSpectrum: Float32Array | null = null;
    let lastFlashTs = 0;
    let energyEma = 0;

    // FFT-buffert för flux
    const FFT_SIZE = 512;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });
        if (cancelled) { stream?.getTracks().forEach((t) => t.stop()); return; }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Ctx = (window.AudioContext ?? (window as any).webkitAudioContext) as typeof AudioContext;
        audioCtx = new Ctx({ sampleRate: SAMPLE_RATE_TARGET });
        source = audioCtx.createMediaStreamSource(stream);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const essentia = await loadEssentia().catch((e: any) => {
          set({ status: "error", errorMsg: `Essentia: ${e?.message ?? e}` });
          return null;
        });
        if (!essentia || cancelled) return;

        set({ status: "listening" });

        // ScriptProcessor är deprecated men mest kompatibel över mobiler
        processor = audioCtx.createScriptProcessor(1024, 1, 1);
        processor.onaudioprocess = (ev) => {
          const raw = ev.inputBuffer.getChannelData(0);
          const trimDb = useLiveAnalysis.getState().micTrimDb;
          const gain = Math.pow(10, trimDb / 20);
          // Kopiera + applicera trim så vi inte muterar WebAudio-buffern
          const input = new Float32Array(raw.length);
          for (let i = 0; i < raw.length; i++) input[i] = raw[i] * gain;
          // Skriv in i ringbuffert
          for (let i = 0; i < input.length; i++) {
            ring[ringWrite] = input[i];
            ringWrite = (ringWrite + 1) % RING_SIZE;
          }
          filled = Math.min(RING_SIZE, filled + input.length);


          // RMS energi
          let sum = 0;
          for (let i = 0; i < input.length; i++) sum += input[i] * input[i];
          const rms = Math.sqrt(sum / input.length);
          energyEma += (Math.min(1, rms * 4) - energyEma) * 0.1;

          // Spektral-flux via Essentia på 512-sampel-fönster
          if (input.length >= FFT_SIZE) {
            try {
              const slice = input.subarray(0, FFT_SIZE);
              const vec = essentia.arrayToVector(slice);
              const win = essentia.Windowing(vec, true, FFT_SIZE, "hann");
              const spec = essentia.Spectrum(win.frame, FFT_SIZE);
              const specArr = essentia.vectorToArray(spec.spectrum);

              if (prevSpectrum && prevSpectrum.length === specArr.length) {
                let flux = 0;
                for (let i = 0; i < specArr.length; i++) {
                  const d = specArr[i] - prevSpectrum[i];
                  if (d > 0) flux += d;
                }
                fluxHistory[fluxIdx] = flux;
                fluxIdx = (fluxIdx + 1) % FLUX_HIST;

                // Lookahead-drop: nuvarande flux vs median över 400 ms
                const sorted = Array.from(fluxHistory).sort((a, b) => a - b);
                const median = sorted[Math.floor(sorted.length / 2)] || 1e-6;
                const now = performance.now();
                const threshold = 3 + (1 - sensitivity) * 4;   // 3..7×
                // Långsam energitopp (attack snabb, decay ~30 s) — drops bara
                // när partiet faktiskt har energi, inte på lugn bakgrund.
                energyPeak = Math.max(energyEma, energyPeak * 0.9995);
                const loudEnough = energyEma > 0.12 && energyEma > energyPeak * 0.55;
                if (
                  flux > median * threshold &&
                  loudEnough &&
                  now - lastFlashTs > 350
                ) {
                  lastFlashTs = now;
                  const fireAt = Date.now() + LOOKAHEAD_MS;
                  set({ lastFlashAt: fireAt });
                }
              }
              prevSpectrum = specArr;

              vec.delete?.();
              win.frame.delete?.();
              spec.spectrum.delete?.();
            } catch {
              // Essentia kan kasta på degenererad input; ignorera enstaka frames
            }
          }

          set({ energy: energyEma });
        };
        source.connect(processor);
        processor.connect(audioCtx.destination);

        // BPM-tracker var 250 ms över senaste 4 s
        bpmTimer = window.setInterval(() => {
          if (filled < SAMPLE_RATE_TARGET * 2) return;
          try {
            // Rulla ut ringbufferten linjärt
            const buf = new Float32Array(filled);
            const start = (ringWrite - filled + RING_SIZE) % RING_SIZE;
            for (let i = 0; i < filled; i++) buf[i] = ring[(start + i) % RING_SIZE];

            const vec = essentia.arrayToVector(buf);
            const res = essentia.PercivalBpmEstimator(vec);
            let raw = res.bpm ?? 0;
            vec.delete?.();
            if (raw >= 40 && raw <= 250) {
              // Oktavvik till ett kanoniskt band så 85 och 170 räknas som samma takt.
              while (raw < 82) raw *= 2;
              while (raw >= 164) raw /= 2;
              bpmHist.push(raw);
              if (bpmHist.length > 12) bpmHist.shift();

              const sorted = [...bpmHist].sort((a, b) => a - b);
              const median = sorted[Math.floor(sorted.length / 2)];
              const agree = bpmHist.filter((x) => Math.abs(x - median) <= 3).length / bpmHist.length;
              const now = Date.now();
              const st = useLiveAnalysis.getState();

              if (bpmHist.length >= 6 && agree >= 0.5) {
                // Stabil nog. Uppdatera bara låst takt vid tydlig förändring, och
                // behåll fasen kontinuerlig (nolla inte varje tick).
                const rounded = Math.round(median);
                if (lockedBpm === 0 || Math.abs(rounded - lockedBpm) > 4) {
                  lockedBpm = rounded;
                  beatAnchor = now;
                }
                const conf = Math.min(1, st.bpmConfidence + 0.12);
                const beatMs = 60000 / lockedBpm;
                const nb = Math.floor((now - beatAnchor) / beatMs) + 1;
                set({ bpm: lockedBpm, bpmConfidence: conf, nextBeatAt: beatAnchor + nb * beatMs,
                      status: conf > 0.6 ? "locked" : "listening" });
              } else {
                // Osäkert — sänk confidence men behåll senaste låsta takt.
                const conf = Math.max(0, st.bpmConfidence - 0.05);
                set({ bpmConfidence: conf, status: conf > 0.6 ? "locked" : "listening" });
              }
            }
          } catch {
            /* ignorera */
          }
        }, 250);

        // Key/scale var 1500 ms
        keyTimer = window.setInterval(() => {
          if (filled < SAMPLE_RATE_TARGET * 3) return;
          try {
            const buf = new Float32Array(filled);
            const start = (ringWrite - filled + RING_SIZE) % RING_SIZE;
            for (let i = 0; i < filled; i++) buf[i] = ring[(start + i) % RING_SIZE];
            const vec = essentia.arrayToVector(buf);
            const res = essentia.KeyExtractor(vec);
            vec.delete?.();
            const k = res.key ? `${res.key} ${res.scale ?? ""}`.trim() : "";
            if (k) set({ key: k });
          } catch {
            /* ignorera */
          }
        }, 1500);
      } catch (e) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        set({ status: "error", errorMsg: (e as any)?.message ?? String(e) });
      }
    })();

    return () => {
      cancelled = true;
      if (bpmTimer) clearInterval(bpmTimer);
      if (keyTimer) clearInterval(keyTimer);
      try { processor?.disconnect(); } catch { /* noop */ }
      try { source?.disconnect(); } catch { /* noop */ }
      try { audioCtx?.close(); } catch { /* noop */ }
      stream?.getTracks().forEach((t) => t.stop());
      lockedBpm = 0; beatAnchor = 0; bpmHist.length = 0;
      set({ status: "off", bpm: 0, bpmConfidence: 0, energy: 0, key: "" });
    };
  }, [enabled, sensitivity]);
}
