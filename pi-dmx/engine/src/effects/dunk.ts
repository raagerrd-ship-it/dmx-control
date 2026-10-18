import type { EffectDef } from "./types.js";
import { hsv } from "./color.js";

// DUNK (fart x intro, situationsrutnätet 2026-10-12 - syskon ankomst/spaning/uppvärmning): introts basslag mäts upp i riggen.
// Varje riktig dunk (c.punch, annars kicken) tänder lampor inifrån och ut efter styrkan - ett svagt slag bara mitten, ett hårt
// tre lampor - och slocknar igen. En stötvåg vars bredd ÄR slagets kraft; aldrig alla fyra.
export const dunk: EffectDef = {
  key: "dunk", label: "Dunk", tier: "fart", modulate: { energy: true, pulse: false }, section: ["intro"],
  desc: "Intro i fart: varje basslag tänder lampor inifrån och ut efter hur hårt det slår.",
  render(c) {
    const n = Math.max(1, c.count);
    const rank = c.lamp < n / 2 ? 2 * (Math.floor(n / 2) - 1 - c.lamp) + 1 : 2 * (c.lamp - Math.ceil(n / 2));   // 0 = mitten ... n-1 = kant
    const hit = Math.max(c.punch, 0.75 * c.kickEnv);
    const reach = hit * (n - 1);                                       // hur många lampor slaget når (max n-1)
    const on = Math.max(0, Math.min(1, reach - rank + 0.3));
    const base = c.mixedSector(Math.floor(c.hueIdx / 16));
    return hsv(((base + (rank >= 2 ? 3 : 0)) % 6) / 6, 1, Math.min(1, 0.03 + 0.92 * on * hit));
  },
};
