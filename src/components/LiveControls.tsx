import { useDmx } from "@/store/dmx";

function Slider(props: {
  label: string;
  value: number;
  min?: number; max?: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  const { label, value, min = 0, max = 100, onChange, suffix = "%" } = props;
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="font-display font-medium tabular-nums">
          {Math.round(value)}{suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none bg-muted accent-[hsl(var(--accent))] cursor-pointer"
        style={{
          background: `linear-gradient(to right, hsl(var(--accent)) 0%, hsl(var(--accent)) ${
            ((value - min) / (max - min)) * 100
          }%, hsl(var(--muted)) ${((value - min) / (max - min)) * 100}%, hsl(var(--muted)) 100%)`,
        }}
      />
    </label>
  );
}

export function LiveControls() {
  const params = useDmx((s) => s.params);
  const patch = useDmx((s) => s.patchParams);
  const preset = useDmx((s) => s.preset);

  return (
    <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
      <Slider label="Ljusstyrka" value={params.brightness} onChange={(v) => patch({ brightness: v })} />
      <Slider label="Hastighet"  value={params.speed}      onChange={(v) => patch({ speed: v })} />
      <Slider label="Känslighet" value={params.sensitivity} onChange={(v) => patch({ sensitivity: v })} />
      {preset === "static" && (
        <Slider
          label="Färg (hue)"
          value={params.staticHue}
          min={0} max={360} suffix="°"
          onChange={(v) => patch({ staticHue: v })}
        />
      )}
    </div>
  );
}
