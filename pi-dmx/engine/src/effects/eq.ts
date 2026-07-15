import type { EffectDef } from "./types.js";

// 3-band spektrum-EQ över riggen: varje lampa = ETT band i EN ren färg,
// ljusstyrkan = bandets NORMALISERADE energi (c.bands: bas/mellan/diskant, redan
// skalade till 0..1). Bas→Röd, Mellan→Grön, Diskant→Blå. En lätt gamma ger punch
// och ett golv så en tyst mätare glöder svagt i stället för att slockna helt.
// (Motorn kör eq med STADIG master — ingen beatPulse-dipp — och utanför VU-taket
// så den läser som en ren spektrum-mätare, inte en pulsande show-effekt.)
export const eq: EffectDef = {
  key: "eq", label: "Spektrum", tier: "fart",
  desc: "3-band-EQ: bas→röd lampa, mellan→grön, diskant→blå. Visar ljudets färg.",
  render(c) {
    const FLOOR = 0.1;
    const bar = (x: number) => Math.max(FLOOR, Math.min(1, Math.pow(x, 0.75)));   // lätt gamma → punchigare
    const r = bar(c.bands[0]);   // bas
    const g = bar(c.bands[1]);   // mellan
    const b = bar(c.bands[2]);   // diskant
    const bandIdx = c.count > 1 ? c.idx % 3 : -1;
    if (bandIdx === 0) return [r, 0, 0];   // bas → röd
    if (bandIdx === 1) return [0, g, 0];   // mellan → grön
    if (bandIdx === 2) return [0, 0, b];   // diskant → blå
    return [r, g, b];                      // enda lampa: full mix
  },
};
