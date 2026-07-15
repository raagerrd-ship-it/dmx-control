import type { EffectDef } from "./types.js";

// Snabb LÖPARE: skarpt huvud som hoppar ETT steg per taktslag, kort svans, och
// BYTER ren färg medan det springer → rytmiskt och gles, inte en jämn glidning
// (sweep) eller full färgvåg (wave).
export const chase: EffectDef = {
  key: "chase", label: "Jakt", tier: "fart",
  desc: "En ljuspunkt springer i takt och byter färg.",
  render(c) {
    const d = Math.abs(c.idx - c.chasePos);
    const tail = Math.exp(-d * 1.6);
    const hue = c.mixedSector(c.chasePos + Math.floor(c.t / 4)) / 6;
    const v = Math.min(1, tail * c.shaped(0.22, 0.55 + c.audio * 0.55 + c.kickEnv * 0.5));
    return c.hsv(hue, 1, v);
  },
};
