import type { EffectDef } from "./types.js";
import { hsv } from "./color.js";

// FYLLNING (build, 2026-10-11, ägaren i ladan: "dirigenten borde ha fler specifika effekter inom varje gren" - build hade bara två):
// riggen fylls - en lampa till tänds varje takt (1, 2, 3, 4 lampor) i ordning utifrån och in, och på frasens sista slag blixtrar alla.
// Ljuset stiger med fyllnaden. En kulör (palettens, per fras). Varje tänd lampa slår på slaget (kort topp) så takten syns.
export const fyllning: EffectDef = {
  key: "fyllning", label: "Fyllning", tier: "fart", modulate: { energy: true, pulse: false }, section: ["build"], toggle: true,
  desc: "Uppbyggnad: en lampa till tänds varje takt tills riggen är full, alla blixtrar på frasens sista slag.",
  render(c) {
    const n = Math.max(1, c.count);
    const bar = Math.floor(c.beatIdx / 4), beatInBar = ((c.beatIdx % 4) + 4) % 4;
    const lit = c.buildUp > 0 ? Math.min(n, 1 + Math.floor(c.buildUp * n)) : (bar % n) + 1;   // riggen fylls över hela uppbyggnaden (32 slag), annars en lampa till per takt
    const rank = c.lamp < n / 2 ? 2 * c.lamp : 2 * (n - 1 - c.lamp) + 1;   // utifrån och in: 0, sista, 1, näst sista ...
    const on = rank < lit;
    const last = lit >= n && beatInBar === 3;                        // frasens sista slag: alla
    const hit = Math.exp(-c.beatFrac / 0.18);
    const hue = c.mixedSector(Math.floor(c.hueIdx / 16)) / 6;
    if (last) return hsv(hue, 0.85, Math.min(1, 0.5 + 0.5 * hit));
    if (!on) return hsv(hue, 1, 0);
    return hsv(hue, 1, Math.min(1, (0.35 + 0.4 * Math.max(lit / n, c.buildUp)) + 0.25 * hit));
  },
};
