import type { EffectDef } from "./types.js";

// Lugn: SPEKTRALT PRISMA — låten bryts upp i färg. Varje lampa lyser med SITT
// band (sub/lowMid/mid/treble) men färgtonen SPRIDS (som ljus genom ett prisma)
// beroende på musikens densitet: mer mellanenergi (spec.mid) → större brytnings-
// index → färgerna sträcker isär mellan lamporna; tunn mix → de kryper ihop.
// Bas-färgen driver extremt sakta över tid. (Gemini-idé — skiljer sig från eq
// genom att det är FÄRG-refraktion, inte nivå-staplar.)
export const prisma: EffectDef = {
  key: "prisma", label: "Prisma", tier: "lugn",
  desc: "Låten bryts i färg-refraktioner som sträcker och drar ihop sig efter musikens densitet.",
  render(c) {
    const refraction = 0.04 + c.frame.spec.mid * 0.14;                 // brytningsindex
    const baseHue = (c.mixedSector(0) / 6 + c.t * 0.01) % 1;           // långsam drift
    const lampOffset = (c.idx - (c.count - 1) / 2) * refraction;       // spridning per position
    const hue = (baseHue + lampOffset + 1) % 1;
    let bandVal = c.frame.spec.mid;
    if (c.idx === 0) bandVal = c.frame.spec.sub;
    else if (c.idx === 1) bandVal = c.frame.spec.lowMid;
    else if (c.idx === 3) bandVal = c.frame.spec.treble;
    return c.hsv(hue, 0.95, c.shaped(0.12, bandVal));
  },
};
