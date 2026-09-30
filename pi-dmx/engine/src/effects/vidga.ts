import type { EffectDef } from "./types.js";

// VIDGA (2026-09-29, agaren i ladan: "effekter som beroende pa energi kanske bara kor pa de yttre och sen om energin gar upp pa
// alla, men kor t.ex. i takt / heart-beat"). Energin oppnar riggen utifran och in: lag energi = bara ytterlamporna
// glor, mer energi = mittlamporna tands en i taget, hog energi = alla slar i takt med effektens egen hjartpuls. Pulsen djupnar
// med energin, sa lugnt = andning och fullt = tydligt slag.
// VALDES ALDRIG (effektoversynen 09-29/30, agaren 'kor 1 och 2'): (1) utan section-tagg skar dirigentens sektionspool alltid bort den
// -> taggad low+high; (2) gravLevel ar en kick-VU (median 0,97-0,99 i ladan) -> riggen stod alltid helt oppen. Energin kommer nu ur
// frame.intensity (sektionsenergi mot latens eget snitt, p10 0,31 / median 0,5-0,58 / p90 1,0). Bank: vald 0 -> 3,2 %, mellan lampor 0 -> 13 %.

export const vidga: EffectDef = {
  key: "vidga", label: "Vidga", tier: "fart", modulate: { energy: true, pulse: false }, section: ["low", "high"],
  desc: "Ytterlamporna vid lag energi, oppnar inat med energin, alla i takt vid hog.",
  render(c) {
    const e = Math.max(0, Math.min(1, (c.frame.intensity - 0.3) / 0.6));
    const half = Math.max(1, (c.count - 1) / 2);
    const edge = Math.abs(c.idx - (c.count - 1) / 2) / half;          // 1 = ytterlampa, 0 = mitten
    const thr = 0.20 + 0.45 * (1 - edge);                              // ytter 0,20 - mitten 0,65 (4 lampor: inre 0,50)
    const x = Math.max(0, Math.min(1, (e - thr) / 0.15));
    const open = edge >= 0.99 ? 0.35 + 0.65 * x : x * x * (3 - 2 * x);  // ytterlamporna glor alltid lite
    const beat = c.heart(0.25 + 0.55 * e);                             // andning vid lag energi, tydligt slag vid hog
    const hue = (c.mixedSector(Math.floor(c.beatIdx / 32)) / 6 + (edge >= 0.99 ? 0 : 0.08)) % 1;
    return c.hsv(hue, 0.95, Math.min(1, open * (0.55 + 0.45 * e) * beat));
  },
};
