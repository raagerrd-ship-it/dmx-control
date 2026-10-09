import type { EffectDef } from "./types.js";

// DRIFT: musikens KLANG bestämmer var i rummet ljuset ligger. Mörk, bastung
// musik samlar ljuset i ena änden av riggen; ljus, diskantrik musik drar det
// till andra änden. Ingen tidsbaserad rörelse alls — rör sig bara när musiken
// byter karaktär, vilket gör den nästan meditativ men aldrig statisk.
let driftSec = -1;   // vald kulorsektor (delas av lamporna - samma klang)
export const drift: EffectDef = {
  key: "drift", label: "Drift", tier: "lugn", modulate: { energy: true, pulse: false }, section: ["intro", "low"],
  desc: "Ljuset vandrar genom riggen efter musikens klangfärg — mörkt åt ena hållet, ljust åt andra.",
  flat: true,   // statiskt svep → kortare dwell
  render(c) {
    const pos = c.frame.centroid * (c.count - 1);     // klangens läge i lampor
    const d = Math.abs(c.idx - pos);
    const glow = Math.exp(-d * d * 0.9);              // mjuk klocka runt läget
    // KULOR MED HYSTERES (2026-10-09): forr Math.round(centroid*5) varje ruta -> sektorn fladdrade med klangbruset och ballistikens
    // svansar tande alla tre dioderna (colorBench alla3 86 %). Nu byts sektorn forst nar centroiden ligger en hel sektor bort.
    const cs = c.frame.centroid * 5;
    if (driftSec < 0 || Math.abs(cs - driftSec) > 0.9) driftSec = Math.round(cs);
    const hue = c.mixedSector(driftSec) / 6;
    const m = glow * (0.45 + c.audio * 0.4) + 0.20 + c.punch * 0.15;
    return c.hsv(hue, 1, Math.min(1, m) * c.heart(0.18));   // egen latt hjartpuls (09-27)
  },
};
