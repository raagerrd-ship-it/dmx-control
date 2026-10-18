import type { EffectDef } from "./types.js";
import { hsv } from "./color.js";

// STARTSKOTT (full x intro, situationsrutnätet 2026-10-12 - andra effekten i rutan, syskon kickregn): introt räknar in. Bara taktens
// etta blixtrar, och för varje takt i frasen blixtrar en lampa till (utifrån och in, c.lamp): 1, 2, 3, alla - sedan om. Mellan ettorna
// gnistrar de tända lamporna svagt på hi-hatten. Kickregn slår varje slag; startskott räknar takterna.
export const startskott: EffectDef = {
  key: "startskott", label: "Startskott", tier: "full", modulate: { energy: true, pulse: false }, section: ["intro"],
  desc: "Intro i full fart: taktens etta blixtrar i en lampa till för varje takt - 1, 2, 3, alla.",
  render(c) {
    const n = Math.max(1, c.count);
    const bar = ((Math.floor(c.beatIdx / 4) % n) + n) % n;              // 0..n-1 takt i räkningen
    const rank = c.lamp < n / 2 ? 2 * c.lamp : 2 * (n - 1 - c.lamp) + 1;
    if (rank > bar) return hsv(0, 0, 0);
    const base = c.mixedSector(Math.floor(c.hueIdx / 16));
    const one = (((c.beatIdx % 4) + 4) % 4) === 0 ? Math.exp(-c.beatFrac / 0.25) : 0;
    return hsv(((base + (rank & 1) * 3) % 6) / 6, 1, Math.min(1, 0.06 + 0.9 * one + 0.3 * c.drum.hat));
  },
};
