import type { EffectDef } from "./types.js";

// VIDGA (2026-09-29, agaren i ladan: "effekter som beroende pa energi kanske bara kor pa de yttre och sen om energin gar upp pa
// alla, men kor t.ex. i takt / heart-beat"). Energin (gravLevel) oppnar riggen utifran och in: lag energi = bara ytterlamporna
// glor, mer energi = mittlamporna tands en i taget, hog energi = alla slar i takt med effektens egen hjartpuls. Pulsen djupnar
// med energin, sa lugnt = andning och fullt = tydligt slag.
export const vidga: EffectDef = {
  key: "vidga", label: "Vidga", tier: "fart", modulate: { energy: true, pulse: false },
  desc: "Ytterlamporna vid lag energi, oppnar inat med energin, alla i takt vid hog.",
  render(c) {
    const e = Math.max(0, Math.min(1, c.gravLevel));
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
