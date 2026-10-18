import type { EffectDef } from "./types.js";
import { hsv } from "./color.js";

// GRYNING (lugn x uppbyggnad, situationsrutnätet 2026-10-12 - rutan var tom): en lugn låts uppbyggnad. Riggen vaknar utifrån och in
// med uppbyggnadens förlopp (c.buildUp, motorns 32 slag): först ytterlamporna, sist mitten, och allt ljusnar mot dropen. Mjuk
// andning på effektens hjärtpuls, ingen hackig rörelse. Lamporna som ännu inte vaknat glöder svagt.
export const gryning: EffectDef = {
  key: "gryning", label: "Gryning", tier: "lugn", modulate: { energy: true, pulse: false }, section: ["build"],
  desc: "Lugn uppbyggnad: riggen vaknar utifrån och in med uppbyggnaden och ljusnar mot dropen.",
  render(c) {
    const n = Math.max(1, c.count);
    const rank = c.lamp < n / 2 ? 2 * c.lamp : 2 * (n - 1 - c.lamp) + 1;   // 0 = ytterst ... n-1 = mitten
    const p = c.buildUp;
    const awake = Math.max(0, Math.min(1, p * n - rank + 0.5));        // mjuk tändning när förloppet når lampan
    const hue = c.mixedSector(Math.floor(c.hueIdx / 32)) / 6;
    // 10-13 (effectDyn: spridning 0,26 - de sovande lampornas 0,08 lyftes av motorns grundnivå till drygt halva ljuset): sover = 0,015.
    const v = (0.015 + 0.72 * awake * (0.5 + 0.5 * p)) * c.heart(0.18);
    return hsv(hue, 1 - 0.2 * p, Math.min(1, v));
  },
};
