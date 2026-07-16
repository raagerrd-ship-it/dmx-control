import type { EffectDef } from "./types.js";

// Flödande FÄRGVÅG: varje lampa har sin egen rena färg och hela regnbågen glider
// över riggen. Full rigg tänd med en mjuk ljusvåg ovanpå — handlar om FÄRG i
// rörelse, till skillnad från sweep (en färg) och chase (gles). + diskant-glitter:
// hi-hat/cymbal-ANSLAGET (onset.treble ur dubbel-FFT:n) ger en skarp ljusflick
// ovanpå vågen — pigg tick i stället för det utsmetade diskantbandet.
export const wave: EffectDef = {
  key: "wave", label: "Våg", tier: "fart",
  desc: "Flödande färgvåg som rullar över hela riggen.",
  render(c) {
    const base = 0.55 + 0.45 * Math.sin(c.wavePhase - c.idx * 1.3 * c.phaseSpread);
    const hue = c.mixedSector(c.idx + Math.floor(c.wavePhase * 0.4)) / 6;
    const v = c.shaped(0.12, base * (0.35 + c.audio * 0.7) + c.kickEnv * 0.2 + c.frame.onset.treble * 0.4);
    return c.hsv(hue, 1, v);
  },
};
