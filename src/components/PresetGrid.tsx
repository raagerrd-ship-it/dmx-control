import { PRESETS, useDmx, type PresetId } from "@/store/dmx";

export function PresetGrid() {
  const preset = useDmx((s) => s.preset);
  const setPreset = useDmx((s) => s.setPreset);

  return (
    <div className="grid grid-cols-2 gap-3">
      {PRESETS.map((p) => {
        const active = preset === p.id;
        return (
          <button
            key={p.id}
            onClick={() => setPreset(p.id as PresetId)}
            className={[
              "relative text-left rounded-2xl border p-4 transition-all active:scale-[0.98]",
              active
                ? "border-transparent bg-accent/15 accent-glow"
                : "border-border bg-card hover:bg-muted",
            ].join(" ")}
            style={active ? { borderColor: `hsl(${p.hue} 90% 60% / 0.5)` } : undefined}
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: `hsl(${p.hue} 90% 60%)` }}
              />
              <span className="font-display font-bold text-lg leading-none">{p.name}</span>
            </div>
            <div className="text-xs text-muted-foreground">{p.description}</div>
          </button>
        );
      })}
    </div>
  );
}
