import type { EffectDef } from "./types.js";

// Lugn: varje lampa håller sin EGEN långsamt driftande färg med mjuka,
// OBEROENDE korsfades — likt norrsken där färgerna glider var för sig. Per-lampa
// frekvensband. Golv 30%.
export const aurora: EffectDef = {
  key: "aurora", label: "Aurora", tier: "lugn",
  desc: "Varje lampa driver i sin egen färg, som norrsken.",
  render(c) {
    const hue = c.mixedSector(c.idx * 2 + c.mclk(8, 7) + Math.round(c.frame.centroid * 3)) / 6;   // + centroid → palett-läge
    const wash = 0.5 + 0.5 * Math.sin(c.t * 0.45 - c.idx * 1.3 * c.phaseSpread);
    // NORRSKENETS SKIMMER: draperiet lyser starkare dar de HOGA banden ligger.
    // Utan detta var aurora bara en sinusvag med rumslig gradient - strukturellt
    // samma effekt som breathe och twin, bara annan fasvinkel. Nu ar rorelsen
    // rumslig OCH ljusstyrkan klangdriven, vilket ger det flimrande djup ett
    // norrsken har. Varje lampa far sin egen blandning av diskant och luft.
    const skimmer = (c.idx % 2 === 0 ? c.frame.spec.treble : c.frame.spec.air);
    const m = Math.min(1, 0.35 + wash * 0.40 + c.band * 0.20 + skimmer * 0.35 + c.punch * 0.2);
    return c.hsv(hue, 1, 0.3 + 0.7 * m);
  },
};
