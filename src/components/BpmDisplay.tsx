import { usePiLive } from "@/hooks/usePiLive";

/**
 * Realtids-BPM + confidence-mätare. Visas bara när Pi-engine är ansluten
 * (i preview: dolt). Confidence är peak-to-mean av tempo-scoringen —
 * hög = tydlig, stabil puls; låg = otydlig/utsmetad.
 */
export function BpmDisplay() {
  const { connected, bpm, bpmConfidence } = usePiLive();
  if (!connected) return null;

  const pct = Math.round(Math.max(0, Math.min(1, bpmConfidence)) * 100);
  const locked = bpm > 0 && bpmConfidence > 0.55;
  const color = locked
    ? "hsl(140 70% 55%)"          // stabil = grön
    : bpm > 0
      ? "hsl(45 90% 60%)"         // preliminär = amber
      : "hsl(0 0% 40%)";          // ingen lås

  return (
    <div className="rounded-xl bg-card border border-border p-3 flex items-center gap-3">
      <div className="flex flex-col items-center min-w-[64px]">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">BPM</div>
        <div className="font-display font-bold text-2xl tabular-nums leading-none" style={{ color }}>
          {bpm > 0 ? bpm : "—"}
        </div>
      </div>
      <div className="flex-1">
        <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
          <span>Confidence</span>
          <span className="tabular-nums">{pct}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full transition-[width,background-color] duration-200"
            style={{ width: `${pct}%`, background: color }}
          />
        </div>
        <div className="text-[10px] text-muted-foreground mt-1">
          {locked ? "Stabil puls" : bpm > 0 ? "Söker lås…" : "Ingen puls"}
        </div>
      </div>
    </div>
  );
}
