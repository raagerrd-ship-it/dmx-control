import type { EffectDef } from "./types.js";

// Lugnast: hela riggen andas UNISONT i EN långsamt vandrande färg — djup,
// symmetrisk swell (lång mjuk in-/utandning). Golv 30% så den aldrig släcks.
export const breathe: EffectDef = {
  key: "breathe", label: "Andas", tier: "lugn",
  desc: "Hela riggen andas som en – djup mjuk våg i en färg.",
  render(c) {
    const hue = c.mixedSector(Math.floor(c.t / 11) + Math.round(c.frame.centroid * 3)) / 6;   // centroid → palett-läge
    const breath = 0.5 + 0.5 * Math.sin(c.t * 0.7);
    const m = Math.min(1, breath * 0.85 + c.audio * 0.2);
    return c.hsv(hue, 1, 0.3 + 0.7 * m);
  },
};
