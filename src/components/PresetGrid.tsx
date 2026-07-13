import { Eye, EyeOff } from "lucide-react";
import { PRESETS, useDmx, type PresetId } from "@/store/dmx";

export function PresetGrid() {
  const preset = useDmx((s) => s.preset);
  const setPreset = useDmx((s) => s.setPreset);
  const rotation = useDmx((s) => s.rotation);
  const toggleRotation = useDmx((s) => s.toggleRotation);

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        {PRESETS.map((p) => {
          const active = preset === p.id;
          const inRotation = rotation[p.id];
          return (
            <div
              key={p.id}
              className={[
                "relative rounded-2xl border transition-all",
                active
                  ? "border-transparent bg-accent/15 accent-glow"
                  : inRotation
                    ? "border-border bg-card"
                    : "border-border/50 bg-card/40",
              ].join(" ")}
              style={active ? { borderColor: `hsl(${p.hue} 90% 60% / 0.5)` } : undefined}
            >
              <button
                onClick={() => setPreset(p.id as PresetId)}
                className={[
                  "w-full text-left p-4 pr-10 rounded-2xl active:scale-[0.98] transition-transform",
                  inRotation || active ? "" : "opacity-60",
                ].join(" ")}
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
              <button
                onClick={(e) => { e.stopPropagation(); toggleRotation(p.id); }}
                aria-label={inRotation ? "Ta bort från rotation" : "Lägg till i rotation"}
                title={inRotation ? "I rotation (knapp/cykel)" : "Utanför rotation"}
                className={[
                  "absolute top-2 right-2 p-1.5 rounded-lg transition-colors",
                  inRotation
                    ? "text-accent hover:bg-accent/10"
                    : "text-muted-foreground/60 hover:bg-muted",
                ].join(" ")}
              >
                {inRotation ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
            </div>
          );
        })}
      </div>
      <div className="mt-2 text-[11px] text-muted-foreground px-1">
        Öga = med i knapp-cykeln på Pi:n. Tryck på kortet för att välja manuellt.
      </div>
    </div>
  );
}
