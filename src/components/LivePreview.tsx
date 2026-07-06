import { channelsFor, useDmx } from "@/store/dmx";

export function LivePreview() {
  const fixtures = useDmx((s) => s.fixtures);
  const frame    = useDmx((s) => s.frame);
  const audio    = useDmx((s) => s.audioLevel);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-display font-bold text-base">Live-preview</div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Mic</span>
          <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-accent transition-[width] duration-75"
              style={{ width: `${Math.round(audio * 100)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(fixtures.length || 1, 4)}, minmax(0, 1fr))` }}>
        {fixtures.map((f) => {
          const ch = f.startCh - 1;
          const r = frame[ch] ?? 0;
          const g = frame[ch + 1] ?? 0;
          const b = frame[ch + 2] ?? 0;
          const w = f.mode === "rgbw" ? (frame[ch + 3] ?? 0) : 0;
          const dim = f.mode === "dimmer" ? (frame[ch] ?? 0) : 0;

          let bg: string;
          let intensity: number;
          if (f.mode === "dimmer") {
            bg = `rgb(${dim}, ${dim}, ${dim})`;
            intensity = dim / 255;
          } else {
            const rr = Math.min(255, r + w);
            const gg = Math.min(255, g + w);
            const bb = Math.min(255, b + w);
            bg = `rgb(${rr}, ${gg}, ${bb})`;
            intensity = Math.max(rr, gg, bb) / 255;
          }

          return (
            <div key={f.id} className="flex flex-col items-center gap-1.5">
              <div
                className="w-full aspect-square rounded-full border border-border/50"
                style={{
                  background: bg,
                  boxShadow: `0 0 ${20 + intensity * 40}px ${intensity * 12}px ${bg}`,
                  transition: "background 60ms linear, box-shadow 60ms linear",
                }}
              />
              <div className="text-[10px] text-muted-foreground truncate max-w-full">{f.name}</div>
            </div>
          );
        })}
      </div>

      <div className="text-[10px] text-muted-foreground tabular-nums">
        {fixtures.reduce((n, f) => n + channelsFor(f.mode), 0)} kanaler används · {fixtures.length} fixtures
      </div>
    </div>
  );
}
