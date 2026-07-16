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
    // Diskant-nivån (spec.treble) lägger en snabb krusning på vågfasen → en slät
    // sinus blir TAGGIG och vibrerar när hi-hats/cymbaler piskar på. onset.treble
    // ger dessutom en skarp ljusflick ovanpå (glitter).
    const ripple = c.frame.spec.treble * Math.sin(c.t * 22 + c.idx * 3);
    const base = 0.55 + 0.45 * Math.sin(c.wavePhase - c.idx * 1.3 * c.phaseSpread + ripple * 0.8);
    const hue = c.mixedSector(c.idx + Math.floor(c.wavePhase * 0.4)) / 6;
    // Vågen BÄR på basen (spec.bass), inte på bredbandsbrus → den tystnar inte av
    // diskant/sång. onset.treble-glitter ligger ovanpå + en snabbare luft-shimmer
    // (onset.air) bara på udda lampor → shimmer-topp utan att flödet tappas.
    const shimmer = c.idx % 2 === 1 ? c.frame.onset.air * 0.25 : 0;
    const v = c.shaped(0.12, base * (0.35 + c.frame.spec.bass * 0.7) + c.kickEnv * 0.2 + c.frame.onset.treble * 0.4 + shimmer) + c.punch * 0.3;
    return c.hsv(hue, 1 - c.punch * 0.25, Math.min(1, v));   // riktig dunk lyfter hela vågen kort
  },
};
