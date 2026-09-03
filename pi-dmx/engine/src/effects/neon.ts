import type { EffectDef } from "./types.js";
// Fart: varje lampa lyser i sin egen mättade palettfärg (en neonskylt), och hela
// mönstret skiftar färg vartannat taktslag; ljusstyrkan andas med nivån. Inga krav
// → alltid tillgänglig som färgstark grund.
export const neon: EffectDef = {
  key: "neon", label: "Neon", tier: "fart",
  desc: "Mättade neonfärger per lampa som skiftar på takten.",
  render(c) {
    const hue = c.mixedSector(c.idx + Math.floor(c.beatIdx / 2)) / 6;
    const v = c.shaped(0.12, 0.35 + c.audio * 0.55 + c.beatPulse * 0.15) + c.punch * 0.2;
    return c.hsv(hue, 1, Math.min(1, v));
  },
};
