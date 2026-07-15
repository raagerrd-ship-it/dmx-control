import type { EffectDef } from "./types.js";

// CALL-AND-RESPONSE: två grupper (varannan lampa) är BÅDA tända men BYTER
// kontrastfärg på varje taktslag → A/B/A/B utan att släckas (mjukare än rave,
// som mörklägger ena gruppen). Färgparet byts var 8:e takt. Med transient-
// skärpan kapar färgbytet stenhårt.
export const flip: EffectDef = {
  key: "flip", label: "Flip", tier: "full",
  desc: "Två grupper byter kontrastfärg på varje slag – A/B/A/B, båda tända.",
  render(c) {
    const even = c.idx % 2 === 0;
    const onBeatA = c.beatIdx % 2 === 0;
    const pairBase = c.mixedSector(Math.floor(c.beatIdx / 8));
    const useA = even === onBeatA;
    const hue = ((useA ? pairBase : pairBase + 3) % 6) / 6;   // motfärger mellan grupperna
    const v = 0.6 + 0.4 * Math.min(1, c.beatPulse * 0.7 + c.audio * 0.3);   // båda ljusa, lätt puls
    return c.hsv(hue, 1, v);
  },
};
