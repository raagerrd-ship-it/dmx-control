import type { EffectDef } from "./types.js";

// Lugn CALL-AND-RESPONSE: två grupper (varannan lampa) andas i MOTFAS — när grupp
// A stiger sjunker grupp B, som ett stilla anrop-och-svar. Grupp A varm ton,
// grupp B kall kontrastfärg. Golv 30%. Färgvandring var 8:e takt.
export const twin: EffectDef = {
  key: "twin", label: "Tvilling", tier: "lugn",
  desc: "Två grupper andas i motfas – varmt anrop, kallt svar.",
  render(c) {
    const even = c.idx % 2 === 0;
    const wash = 0.5 + 0.5 * Math.sin(c.t * 0.8 + (even ? 0 : Math.PI) - c.idx * 0.4 * c.phaseSpread);
    const pairBase = c.mixedSector(c.mclk(8, 10) + Math.round(c.frame.centroid * 3));   // centroid → palett-läge (som breathe/aurora)
    const hue = ((even ? pairBase : pairBase + 3) % 6) / 6;
    const m = Math.min(1, wash * 0.7 + c.band * 0.3 + c.punch * 0.2);   // + dunk-svall
    return c.hsv(hue, 1, 0.3 + 0.7 * m);
  },
};
