// Återanvänds för både Mono och Comet. Speglar knapparna i mobile-UI:t
// (pi-dmx/engine/public/index.html).

const PRESETS: { name: string; hue: number }[] = [
  { name: "Red",    hue: 0   },
  { name: "Fire",   hue: 15  },
  { name: "Yellow", hue: 55  },
  { name: "Green",  hue: 120 },
  { name: "Cyan",   hue: 180 },
  { name: "Blue",   hue: 220 },
  { name: "Purple", hue: 280 },
  { name: "Pink",   hue: 320 },
];

export function HueColorCard(props: {
  label: string;
  hue: number;
  onChange: (h: number) => void;
}) {
  const { label, hue, onChange } = props;
  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-baseline justify-between">
        <div className="text-sm font-medium">{label}</div>
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-4 h-4 rounded border border-border"
            style={{ background: `hsl(${hue} 100% 50%)` }}
          />
          <span className="font-display tabular-nums text-sm">{Math.round(hue)}°</span>
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={359}
        value={hue}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2.5 rounded-full appearance-none cursor-pointer"
        style={{
          background:
            "linear-gradient(90deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
        }}
      />

      <div className="grid grid-cols-4 gap-2">
        {PRESETS.map((p) => {
          const active = Math.round(hue) === p.hue;
          return (
            <button
              key={p.name}
              onClick={() => onChange(p.hue)}
              className={`py-2 rounded-lg text-xs font-medium border transition-colors ${
                active ? "border-accent" : "border-border hover:border-muted-foreground/40"
              }`}
              style={{
                background: `hsl(${p.hue} 85% 50% / ${active ? 0.35 : 0.18})`,
                color: `hsl(${p.hue} 90% 85%)`,
              }}
            >
              {p.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
