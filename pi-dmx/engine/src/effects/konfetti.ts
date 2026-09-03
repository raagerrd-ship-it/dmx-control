import type { EffectDef } from "./types.js";
// Full: på varje taktslag poppar en slumpad delmängd lampor i slumpade palettfärger
// och tonar ut till nästa slag — konfetti. Använder beatIdx/beatFrac (funkar även
// coastat), inget trumkrav → energisk variation även utan tydligt komp.
export const konfetti: EffectDef = {
  key: "konfetti", label: "Konfetti", tier: "full",
  desc: "Slumpade lampor poppar i slumpfärger på varje taktslag.",
  render(c) {
    const seed = (c.idx * 2654435761 + c.beatIdx * 40503) >>> 0;
    const lit = (seed % 1000) / 1000 < 0.55;                 // ~55 % lampor per slag
    const hue = c.mixedSector((seed >>> 8) % 6) / 6;
    const decay = Math.max(0, 1 - c.beatFrac * 2.0);          // tona ut efter slaget
    const v = lit ? c.shaped(0.04, decay * (0.6 + c.audio * 0.5) + c.punch * 0.4) : c.punchFloor * 0.15;
    return c.hsv(hue, 1, Math.min(1, v));
  },
};
