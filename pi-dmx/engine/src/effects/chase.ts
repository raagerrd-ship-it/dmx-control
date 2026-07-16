import type { EffectDef } from "./types.js";

// Snabb LÖPARE: skarpt huvud som hoppar ETT steg per taktslag, kort svans, och
// BYTER ren färg medan det springer → rytmiskt och gles, inte en full färgvåg
// (wave). + hi-hat-glitter: diskant-anslaget (onset.treble) ger en snabb gnista
// på huvudet, samma pigga tick som wave fick.
export const chase: EffectDef = {
  key: "chase", label: "Jakt", tier: "fart",
  desc: "En ljuspunkt springer i takt och byter färg.",
  render(c) {
    const d = Math.abs(c.idx - c.chasePos);
    const tail = Math.exp(-d * 1.6);
    const hue = c.mixedSector(c.chasePos + Math.floor(c.t / 4)) / 6;
    const v = Math.min(1, tail * c.shaped(0.22, 0.55 + c.audio * 0.55 + c.kickEnv * 0.5 + c.frame.onset.treble * 0.35) + c.punch * 0.3);
    return c.hsv(hue, 1 - c.punch * 0.25, v);   // riktig dunk → hela svansen blixtrar
  },
};
