import type { EffectDef } from "./types.js";
// Fart: hela riggen glöder och sväller med musikens NIVÅ, palettfärgen driver
// långsamt, mitten en aning ljusare (en sol). Ren energi-effekt — inga krav på
// trummor/takt, så dirigenten alltid har något att köra på energiska partier utan
// tydligt komp.
export const sol: EffectDef = {
  key: "sol", label: "Sol", tier: "fart",
  desc: "Hela riggen glöder och sväller med nivån, färgen driver långsamt.",
  render(c) {
    const hue = c.mixedSector(Math.floor(c.t / 6)) / 6;
    const half = Math.max(1, (c.count - 1) / 2);
    const center = 1 - (Math.abs(c.idx - half) / half) * 0.35;   // mitten ljusare
    const v = c.shaped(0.12, (0.25 + c.audio * 0.7 + c.beatPulse * 0.2) * center) + c.punch * 0.25;
    return c.hsv(hue, 0.9, Math.min(1, v));
  },
};
