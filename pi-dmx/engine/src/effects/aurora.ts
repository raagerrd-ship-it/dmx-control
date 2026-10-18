import type { EffectDef } from "./types.js";
import { hsv } from "./color.js";

// Lugn: varje lampa håller sin EGEN långsamt driftande färg med mjuka,
// OBEROENDE korsfades — likt norrsken där färgerna glider var för sig. Per-lampa
// frekvensband. Golv 30%.
export const aurora: EffectDef = {
  key: "aurora", label: "Aurora", tier: "lugn", modulate: { energy: true, pulse: false }, section: ["intro", "low"],
  desc: "Varje lampa driver i sin egen färg, som norrsken.",
  render(c) {
    // EFFEKTGENOMGÅNGEN 10-13 (effectDyn i intro/low: 22,7 kulörhopp/min - centroid-avrundningen fladdrade kulören; skimret
    // (diskant/luft), bandet och punch som NIVÅ dubbelmodulerade mot basenergin, och golvet 0,35 + motorns grundnivå höll alla
    // lampor nästan fulla): varje lampa har sin egen kulör ur paletten (byts per fras) och sitt eget långsamma draperi som går
    // ner i nästan mörker - norrskenet rör sig i olika takt i varje lampa (egen period 7-11 s), inte i takt med musiken.
    const hue = c.mixedSector(Math.floor(c.hueIdx / 16) + c.idx * 2) / 6;
    const per = 7 + ((c.lamp * 5) % 4) * 1.3;                                // 7 / 8,3 / 9,6 / 10,9 s - draperierna glider isär
    const wash = 0.5 + 0.5 * Math.sin((2 * Math.PI * c.t) / per + c.lamp * 1.9);
    return hsv(hue, 1, (0.01 + 0.9 * wash * wash) * c.heart(0.18));   // egen latt hjartpuls (09-27)
  },
};
