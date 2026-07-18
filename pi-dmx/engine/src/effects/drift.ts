import type { EffectDef } from "./types.js";

// DRIFT: musikens KLANG bestämmer var i rummet ljuset ligger. Mörk, bastung
// musik samlar ljuset i ena änden av riggen; ljus, diskantrik musik drar det
// till andra änden. Ingen tidsbaserad rörelse alls — rör sig bara när musiken
// byter karaktär, vilket gör den nästan meditativ men aldrig statisk.
export const drift: EffectDef = {
  key: "drift", label: "Drift", tier: "lugn",
  desc: "Ljuset vandrar genom riggen efter musikens klangfärg — mörkt åt ena hållet, ljust åt andra.",
  render(c) {
    const pos = c.frame.centroid * (c.count - 1);     // klangens läge i lampor
    const d = Math.abs(c.idx - pos);
    const glow = Math.exp(-d * d * 0.9);              // mjuk klocka runt läget
    const hue = c.mixedSector(Math.round(c.frame.centroid * 5)) / 6;
    const m = glow * (0.45 + c.audio * 0.4) + 0.06 + c.punch * 0.15;
    return c.hsv(hue, 1, Math.min(1, m));
  },
};
