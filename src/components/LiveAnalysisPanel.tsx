import { useLiveAnalysis } from "@/store/liveAnalysis";
import { useLiveAnalysisRunner } from "@/hooks/useLiveAnalysis";
import { useLiveAnalysisRelay } from "@/hooks/useLiveAnalysisRelay";
import { Waves, Activity, AlertCircle, Loader2 } from "lucide-react";

export function LiveAnalysisPanel() {
  useLiveAnalysisRunner();
  useLiveAnalysisRelay();
  const s = useLiveAnalysis();

  const statusLabel =
    s.status === "locked"    ? `Låst @ ${s.bpm} BPM` :
    s.status === "listening" ? "Lyssnar…" :
    s.status === "loading"   ? "Laddar Essentia…" :
    s.status === "error"     ? "Fel" : "Av";

  const statusClass =
    s.status === "locked"    ? "text-emerald-400" :
    s.status === "error"     ? "text-destructive" :
    "text-muted-foreground";

  return (
    <section className="rounded-2xl bg-card border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Waves className="w-4 h-4" style={{ color: "hsl(var(--accent))" }} />
          <div>
            <div className="font-display font-semibold text-sm">Live Analysis</div>
            <div className="text-[11px] text-muted-foreground">Essentia.js — BPM-lås, drop-lookahead, tonart</div>
          </div>
        </div>
        <button
          onClick={() => s.setEnabled(!s.enabled)}
          className={`relative w-11 h-6 rounded-full transition-colors ${s.enabled ? "bg-accent" : "bg-muted"}`}
          aria-pressed={s.enabled}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-background shadow transition-transform ${s.enabled ? "translate-x-5" : ""}`}
          />
        </button>
      </div>

      {s.enabled && (
        <>
          <div className="flex items-center gap-2 text-xs flex-wrap">
            {s.status === "loading" && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
            {s.status === "error" && <AlertCircle className="w-3.5 h-3.5 text-destructive" />}
            <span className={statusClass}>{statusLabel}</span>
            {s.key && (
              <span className="px-2 py-0.5 rounded-full bg-muted text-[11px]">{s.key}</span>
            )}
            <span className="ml-auto flex items-center gap-1 text-muted-foreground">
              <Activity className="w-3 h-3" />
              {(s.energy * 100).toFixed(0)}%
            </span>
          </div>

          {s.errorMsg && (
            <p className="text-[11px] text-destructive break-words">{s.errorMsg}</p>
          )}

          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px]">
              <span>Drop-känslighet</span>
              <span className="text-muted-foreground">{(s.sensitivity * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={s.sensitivity * 100}
              onChange={(e) => s.setSensitivity(Number(e.target.value) / 100)}
              className="w-full accent-[hsl(var(--accent))]"
            />
          </div>

          <div className="space-y-3 pt-2 border-t border-border/50">
            <SegRow label="Takt" value={s.bpmMult} onPick={s.setBpmMult}
              options={[[0.5, "½×"], [1, "1×"], [2, "2×"]]} />
            <SegRow label="Byter läge" value={s.dwellMode} onPick={s.setDwellMode}
              options={[["slow", "Sällan"], ["normal", "Normal"], ["fast", "Ofta"]]} />
          </div>

          <div className="space-y-2 pt-2 border-t border-border/50">
            <ToggleRow label="Pulsa ljuset på taktslag" checked={s.beatPulse} onChange={s.setBeatPulse} />
            <ToggleRow label="Energi styr läget" checked={s.energyDrivesMode} onChange={s.setEnergyDrivesMode} />
            <ToggleRow label="Skicka beats (taktlås)" checked={s.sendBeats} onChange={s.setSendBeats} />
            <ToggleRow label="Skicka drops" checked={s.sendDrops} onChange={s.setSendDrops} />
            <ToggleRow label="Färg från tonart" checked={s.sendHues} onChange={s.setSendHues} />
          </div>
        </>
      )}
    </section>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (b: boolean) => void }) {
  return (
    <label className="flex items-center justify-between text-[11px] cursor-pointer">
      <span>{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors ${checked ? "bg-accent" : "bg-muted"}`}
        aria-pressed={checked}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-background shadow transition-transform ${checked ? "translate-x-4" : ""}`}
        />
      </button>
    </label>
  );
}

function SegRow<T extends string | number>({ label, value, options, onPick }: {
  label: string; value: T; options: [T, string][]; onPick: (v: T) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-[11px]">{label}</div>
      <div className="flex gap-1.5">
        {options.map(([v, txt]) => (
          <button key={String(v)} type="button" onClick={() => onPick(v)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium border ${value === v ? "bg-accent border-accent text-accent-foreground" : "bg-muted/40 border-border text-foreground"}`}>
            {txt}
          </button>
        ))}
      </div>
    </div>
  );
}
