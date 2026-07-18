import type { EffectDef } from "./types.js";

// TIDVATTEN: en vattenlinje som stiger och sjunker genom riggen. Lamporna under
// linjen lyser fullt, lampan VID linjen glöder delvis, ovanför är mörkt. Nivån
// är gravitations-VU:n — den knuffas upp av musiken och faller med gravitation,
// så vattnet svallar tungt i stället för att följa varje transient.
// Mekanik: rumslig tröskel, ingen sinus alls → ser inte ut som breathe/aurora.
export const tide: EffectDef = {
  key: "tide", label: "Tidvatten", tier: "lugn",
  desc: "En vattenlinje som stiger genom riggen med musikens tyngd; skum på toppen.",
  render(c) {
    const line = c.gravLevel * c.count;              // vattenlinjens läge i lampor
    const below = line - c.idx;                       // >1 helt under, 0..1 vid ytan
    const fill = Math.max(0, Math.min(1, below));
    // Skum: peak-hållet ligger kvar ovanför ytan → en ljusare rand som dröjer.
    const foam = Math.max(0, Math.min(1, c.gravPeak * c.count - c.idx)) - fill;
    const hue = c.mixedSector(0) / 6 + 0.06 * fill;   // djupare färg längre ner
    return c.hsv(hue, 1 - foam * 0.6, 0.05 + 0.85 * fill + foam * 0.35);
  },
};
