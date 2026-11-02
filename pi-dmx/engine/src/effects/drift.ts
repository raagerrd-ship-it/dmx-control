import type { EffectDef } from "./types.js";
import { hsv } from "./color.js";

// DRIFT: musikens KLANG bestämmer var i rummet ljuset ligger. Mörk, bastung
// musik samlar ljuset i ena änden av riggen; ljus, diskantrik musik drar det
// till andra änden. Ingen tidsbaserad rörelse alls — rör sig bara när musiken
// byter karaktär, vilket gör den nästan meditativ men aldrig statisk.
let driftSec = -1;   // vald kulorsektor (delas av lamporna - samma klang)
let driftCand = -1, driftCandAt = 0, driftPos = -1, driftAt = 0;   // kandidatsektor sedan, utjämnat läge
export const drift: EffectDef = {
  key: "drift", label: "Drift", tier: "lugn", modulate: { energy: true, pulse: false }, section: ["intro", "low"],
  desc: "Ljuset vandrar genom riggen efter musikens klangfärg — mörkt åt ena hållet, ljust åt andra.",
  flat: true,   // statiskt svep → kortare dwell
  render(c) {
    // EFFEKTSVEPET 11-02 (ägaren: 'fixa direkt de effekterna'; effectDyn alla effekter pop+mega 5 min): 32 kulörhopp/min i en lugn effekt - klangbruset flyttade sektorn ändå (en hel sektor
    // räckte en ruta) och läget hoppade med centroiden. Nu måste den nya sektorn ligga kvar 4 s, och läget glider (1,5 s).
    if (c.idx === 0) {
      const dt = Math.max(0, Math.min(0.2, (c.now - driftAt) / 1000)); driftAt = c.now;
      const target = c.frame.centroid * (c.count - 1);
      driftPos = driftPos < 0 ? target : driftPos + (target - driftPos) * Math.min(1, dt / 1.5);
    }
    const pos = driftPos < 0 ? c.frame.centroid * (c.count - 1) : driftPos;   // klangens läge i lampor
    const d = Math.abs(c.idx - pos);
    const glow = Math.exp(-d * d * 0.9);              // mjuk klocka runt läget
    // KULOR MED HYSTERES (2026-10-09): forr Math.round(centroid*5) varje ruta -> sektorn fladdrade med klangbruset och ballistikens
    // svansar tande alla tre dioderna (colorBench alla3 86 %). Nu byts sektorn forst nar centroiden ligger en hel sektor bort.
    const cs = c.frame.centroid * 5;
    if (driftSec < 0) driftSec = Math.round(cs);
    else if (Math.abs(cs - driftSec) > 0.9) {
      const cand = Math.round(cs);
      if (cand !== driftCand) { driftCand = cand; driftCandAt = c.now; }
      else if (c.now - driftCandAt >= 4000) driftSec = cand;
    } else driftCand = -1;
    const hue = c.mixedSector(driftSec) / 6;
    const m = glow * (0.45 + c.audio * 0.4) + 0.20 + c.punch * 0.15;
    return hsv(hue, 1, Math.min(1, m) * c.heart(0.18));   // egen latt hjartpuls (09-27)
  },
};
