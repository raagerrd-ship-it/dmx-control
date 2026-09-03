import type { EffectDef } from "./types.js";
// Fart: EN ljusstark stråle sveper fram och tillbaka över riggen (till skillnad
// från wave som är en regnbåge och chase som är gles) — en enda palettfärg som
// glider. Nivådriven, inga krav.
export const sopa: EffectDef = {
  key: "sopa", label: "Svep", tier: "fart",
  desc: "En ljusstråle sveper fram och tillbaka i en färg.",
  render(c) {
    const head = (Math.sin(c.wavePhase * 0.5) * 0.5 + 0.5) * (c.count - 1);
    const d = c.idx - head;
    const beam = Math.exp(-d * d * 0.7);
    const hue = c.mixedSector(Math.floor(c.wavePhase * 0.15)) / 6;
    const v = c.shaped(0.16, beam * (0.5 + c.audio * 0.6) + c.kickEnv * 0.3) + c.punch * 0.2;
    return c.hsv(hue, 1, Math.min(1, v));
  },
};
