import type { EffectDef } from "./types.js";

// Full fart: GALLOPP — två grupper (varannan lampa) slår OMLOTT: grupp A exakt
// på taktslaget, grupp B på off-beatet (&) → dubbel upplevd rytm, ett "dun-ka
// dun-ka" tvärs riggen. Kontrastfärger per grupp, mörk mellan slagen. Färgparet
// byts var 4:e takt. (Rave = grupp släcks helt, flip = båda tända & byter färg;
// gallop = grupperna delar RYTMEN i off-beat.)
export const gallop: EffectDef = {
  key: "gallop", label: "Gallopp", tier: "full",
  desc: "Grupperna slår omlott – beat & off-beat, dubbel rytm.",
  render(c) {
    const even = c.idx % 2 === 0;
    const offFrac = (c.beatFrac + 0.5) % 1;                  // off-beatets fas
    const offPulse = Math.pow(1 - offFrac, 2);
    const groupPulse = even ? c.beatPulse : offPulse;        // A on-beat, B off-beat
    const pairBase = c.mixedSector(Math.floor(c.beatIdx / 4));
    const hue = ((even ? pairBase : pairBase + 3) % 6) / 6;   // motfärger
    const v = 0.1 + 0.9 * Math.min(1, groupPulse * (0.85 + c.audio * 0.3) + c.kickEnv * 0.2 + c.punch * 0.5);
    return c.hsv(hue, 1 - c.punch * 0.3, v);   // riktig dunk slår igenom rytmen
  },
};
