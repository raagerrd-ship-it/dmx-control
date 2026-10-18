import type { EffectDef } from "./types.js";
import { hsv } from "./color.js";

// GLESNA (fart x break, situationsrutnätet 2026-10-12 - rutan hade två effekter, syskon hjarta/glimt): breaket i en fartfylld låt
// tunnar ut. Varje slag blinkar ett slumpat urval lampor (ny blandning per slag), och urvalet glesnar med breaket (sectionAgeMs:
// tre lampor -> en på 12 s) - refrängens myller som rinner av tills bara pulsen är kvar. Glimt lever på diskanten; glesna på slaget.
export const glesna: EffectDef = {
  key: "glesna", label: "Glesna", tier: "fart", modulate: { energy: true, pulse: false }, section: ["break"],
  desc: "Break i fart: slumpade lampor blinkar på slaget, allt färre ju längre breaket pågår.",
  render(c) {
    const n = Math.max(1, c.count);
    const m = Math.max(1, Math.round((n - 1) - (n - 2) * Math.min(1, c.sectionAgeMs / 12000)));   // 3 -> 1 lampor
    const h = Math.imul(c.beatIdx + 3, 2654435761) >>> 0;
    const rank = (c.lamp * (1 + 2 * ((h >>> 3) & 1)) + h) % n;        // ny blandning per slag
    const base = c.mixedSector(Math.floor(c.hueIdx / 16));
    // 10-13 (effectDyn: 39,5 kulörhopp/min - kulören följde den slumpade rangen, så lamporna bytte kulör varje slag): fast kulör per lampa.
    const hue = (((c.lamp & 1) ? base + 2 : base) % 6) / 6;
    if (rank >= m) return hsv(hue, 1, 0.015);
    return hsv(hue, 1, Math.min(1, 0.06 + 0.85 * Math.exp(-c.beatFrac / 0.25)));
  },
};
