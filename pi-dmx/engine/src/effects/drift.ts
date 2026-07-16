import type { EffectDef } from "./types.js";

// Ambient: hela riggen i EN mycket långsamt driftande färg, knappt någon rörelse
// — nära stillastående glöd som sakta byter färg. Golv 30%.
export const drift: EffectDef = {
  key: "drift", label: "Drift", tier: "lugn",
  desc: "Nästan stilla glöd som mycket sakta byter färg.",
  render(c) {
    const hue = c.mixedSector(Math.floor(c.t / 16) + Math.round(c.frame.centroid * 3)) / 6;   // centroid → palett-läge
    const m = Math.min(1, 0.62 + 0.18 * Math.sin(c.t * 0.35) + c.audio * 0.15);
    return c.hsv(hue, 1, 0.3 + 0.7 * m);
  },
};
