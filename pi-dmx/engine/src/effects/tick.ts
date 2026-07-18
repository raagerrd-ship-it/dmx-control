import type { EffectDef } from "./types.js";

// TICK: hi-hatsen driver showen. Varje hat-anslag flyttar ljuset ett steg i
// riggen (16-delar går fort → ett strimmigt, nervöst flimmer), medan kicken
// slår ner hela raden i en mörkröd botten. Motsatsen till bas-tunga effekter:
// den lever helt i toppregistret.
export const tick: EffectDef = {
  key: "tick", label: "Tick", tier: "fart",
  desc: "Hi-hatsen flyttar ljuset steg för steg; kicken slår ner hela raden.",
  render(c) {
    const d = c.drum;
    // Position stegar med hat-anslagens ACKUMULERADE takt (mclk håller den
    // musikalisk även när hatsen tystnar) — hat-envelopen sätter skärpan.
    const step = c.mclk(0.5, 0.12);
    const lit = (step % Math.max(1, c.count)) === c.idx;
    const sharp = 0.25 + d.hat * 0.75;
    const hue = 0.5 + c.frame.spec.air * 0.12;        // cyan → blå med luften
    const v = lit ? sharp : 0.04 + d.hat * 0.12;
    return c.hsv(hue, 0.7 - d.hat * 0.4, Math.min(1, v + d.kick * 0.35));
  },
};
