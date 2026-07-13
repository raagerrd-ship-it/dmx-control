import { useEffect, useRef, useState } from "react";
import { useLiveAnalysis } from "@/store/liveAnalysis";

/**
 * Mikrofonkalibrering + nivåmätare.
 *
 * - Öppnar en egen mic-stream när panelen är expanderad (påverkar inte
 *   Live Analysis-runnern som har sin egen stream).
 * - Visar peak/RMS i dBFS med brusgolv- och clip-zoner.
 * - Trim-slider i dB (-24..+24) sparas i store + localStorage och
 *   appliceras på Essentia-inputen (BPM + drop-flux).
 * - Auto-kalibrera: mät i 2 s och sätt trim så att peak ≈ -6 dBFS.
 */
export function MicCalibration() {
  const trimDb = useLiveAnalysis((s) => s.micTrimDb);
  const setTrimDb = useLiveAnalysis((s) => s.setMicTrimDb);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rmsDb, setRmsDb] = useState(-90);
  const [peakDb, setPeakDb] = useState(-90);
  const [calibrating, setCalibrating] = useState(false);

  const measuredPeakRef = useRef(0);

  useEffect(() => {
    if (!open) return;
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
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0;
        src.connect(analyser);
        const buf = new Float32Array(analyser.fftSize);
        setError(null);

        let peakEnv = 0;
        const loop = () => {
          if (cancelled) return;
          analyser.getFloatTimeDomainData(buf);
          const currentGain = Math.pow(10, useLiveAnalysis.getState().micTrimDb / 20);
          let sum = 0;
          let peak = 0;
          for (let i = 0; i < buf.length; i++) {
            const s = buf[i] * currentGain;
            sum += s * s;
            const a = s < 0 ? -s : s;
            if (a > peak) peak = a;
          }
          const rms = Math.sqrt(sum / buf.length);
          // Peak-hold med snabb attack, långsam release
          peakEnv = peak > peakEnv ? peak : peakEnv * 0.92;
          measuredPeakRef.current = peakEnv;
          setRmsDb(rms > 1e-5 ? 20 * Math.log10(rms) : -90);
          setPeakDb(peakEnv > 1e-5 ? 20 * Math.log10(peakEnv) : -90);
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      } catch (e) {
        setError((e as Error)?.message ?? "Kunde inte öppna mic");
      }
    })();

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (ctx) ctx.close().catch(() => {});
    };
  }, [open]);

  async function autoCalibrate() {
    setCalibrating(true);
    const start = performance.now();
    let peak = 0;
    await new Promise<void>((resolve) => {
      const t = setInterval(() => {
        if (measuredPeakRef.current > peak) peak = measuredPeakRef.current;
        if (performance.now() - start > 2000) {
          clearInterval(t);
          resolve();
        }
      }, 30);
    });
    setCalibrating(false);
    if (peak < 1e-4) { setError("Ingen signal — spela musik under kalibrering"); return; }
    // Nuvarande peak i dBFS (efter befintlig trim)
    const currentDb = 20 * Math.log10(peak);
    // Sikta mot -6 dBFS → headroom kvar för transienter
    const delta = -6 - currentDb;
    setTrimDb(Math.max(-24, Math.min(24, trimDb + delta)));
    setError(null);
  }

  // Meter: mappa -60..0 dBFS till 0..100 %
  const meterPct = (db: number) => Math.max(0, Math.min(100, ((db + 60) / 60) * 100));
  const rmsW = meterPct(rmsDb);
  const peakW = meterPct(peakDb);
  const clipping = peakDb > -1;
  const tooQuiet = open && rmsDb < -45;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">Mikrofonkalibrering</div>
          <div className="text-xs text-muted-foreground">
            Trim {trimDb >= 0 ? "+" : ""}{trimDb.toFixed(1)} dB
            {open && ` · RMS ${rmsDb.toFixed(0)} dB · Peak ${peakDb.toFixed(0)} dB`}
          </div>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            open ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
          }`}
        >
          {open ? "Stäng" : "Öppna"}
        </button>
      </div>

      {open && (
        <>
          {error && (
            <div className="text-xs text-destructive">Fel: {error}</div>
          )}

          {/* Nivåmätare */}
          <div className="space-y-2">
            <div className="relative h-3 rounded-full bg-muted overflow-hidden">
              {/* Sweet-spot -18..-6 dBFS */}
              <div
                className="absolute top-0 bottom-0 bg-emerald-500/15"
                style={{ left: `${meterPct(-18)}%`, width: `${meterPct(-6) - meterPct(-18)}%` }}
              />
              {/* RMS-fill */}
              <div
                className="absolute top-0 bottom-0 left-0 transition-[width] duration-75"
                style={{
                  width: `${rmsW}%`,
                  background: clipping
                    ? "hsl(0 80% 55%)"
                    : rmsDb > -12
                      ? "hsl(45 90% 55%)"
                      : "hsl(150 70% 45%)",
                }}
              />
              {/* Peak-marker */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-foreground/80"
                style={{ left: `${peakW}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
              <span>-60</span><span>-40</span><span>-20</span><span>-6</span><span>0 dBFS</span>
            </div>
          </div>

          {tooQuiet && (
            <div className="text-xs text-muted-foreground">
              Signalen är svag — höj trim eller flytta mobilen närmare högtalarna.
            </div>
          )}
          {clipping && (
            <div className="text-xs text-destructive">
              Clipping! Sänk trim för renare drop-detektion.
            </div>
          )}

          {/* Trim-slider */}
          <label className="block">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-sm text-muted-foreground">Trim (gain)</span>
              <span className="font-display font-medium tabular-nums">
                {trimDb >= 0 ? "+" : ""}{trimDb.toFixed(1)} dB
              </span>
            </div>
            <input
              type="range"
              min={-24}
              max={24}
              step={0.5}
              value={trimDb}
              onChange={(e) => setTrimDb(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none bg-muted accent-[hsl(var(--accent))] cursor-pointer"
              style={{
                background: `linear-gradient(to right, hsl(var(--accent)) 0%, hsl(var(--accent)) ${
                  ((trimDb + 24) / 48) * 100
                }%, hsl(var(--muted)) ${((trimDb + 24) / 48) * 100}%, hsl(var(--muted)) 100%)`,
              }}
            />
          </label>

          <div className="flex gap-2">
            <button
              onClick={autoCalibrate}
              disabled={calibrating}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-accent text-accent-foreground disabled:opacity-50"
            >
              {calibrating ? "Mäter 2 s…" : "Auto-kalibrera"}
            </button>
            <button
              onClick={() => setTrimDb(0)}
              className="px-3 py-2 rounded-lg text-sm font-medium bg-muted text-muted-foreground hover:bg-muted/70"
            >
              Nollställ
            </button>
          </div>

          <div className="text-[11px] text-muted-foreground leading-relaxed">
            Grön zon = optimal nivå för BPM- och drop-detektion. Håll peak
            under -3 dBFS så drop-flux inte klipps. Kalibrera med typisk
            spelvolym.
          </div>
        </>
      )}
    </div>
  );
}
