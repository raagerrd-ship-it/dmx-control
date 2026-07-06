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
  const micEnabled = useDmx((s) => s.micEnabled);
  const micError = useDmx((s) => s.micError);
  const setMicEnabled = useDmx((s) => s.setMicEnabled);

  return (
    <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">Ljudkälla</div>
          <div className="text-xs text-muted-foreground">
            {micEnabled ? (micError ? `Mic fel: ${micError}` : "Datorns mic") : "Syntetisk fejksignal"}
          </div>
        </div>
        <button
          onClick={() => setMicEnabled(!micEnabled)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            micEnabled ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
          }`}
        >
          {micEnabled ? "Mic PÅ" : "Mic AV"}
        </button>
      </div>
      <Slider label="Ljusstyrka" value={params.brightness} onChange={(v) => patch({ brightness: v })} />
      <Slider label="Mjukhet"    value={params.smoothness} onChange={(v) => patch({ smoothness: v })} />
      <Slider label="Känslighet" value={params.sensitivity} onChange={(v) => patch({ sensitivity: v })} />
    </div>
  );
}
