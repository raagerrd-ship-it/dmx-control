import type { EffectDef } from "./types.js";

// Full fart: DUELL — kick och hi-hat/luft slåss om HELA riggens färg. Vilken
// frekvensvärld som DOMINERAR (spec.kick vs spec.air, utjämnat) väljer färgen;
// ANSLAGEN (onset) driver ljus-punchen. Kick-tunga partier → allt rött, pulsar på
// trumman; breakdowns med bara hi-hats/cymbaler → allt isblått, tickar; riser
// (bägge starka) → färgen glider mjukt över när balansen skiftar. Bara möjlig med
// onset/spec-separationen. (Lovable-idé — men färgvalet på spec, inte rått
//  onset-diff, annars blir det ett röd/blå-strobe frame-för-frame under risers.)
export const duel: EffectDef = {
  key: "duel", label: "Duell", tier: "full",
  desc: "Kick vs hi-hat slåss om riggens färg – röd dunk eller isblå tick.",
  render(c) {
    const hue = c.frame.spec.kick >= c.frame.spec.air ? 0.00 : 0.53;   // röd (kick) vs isblå (luft)
    const v = c.shaped(0.08, Math.max(c.frame.onset.kick, c.frame.onset.air));
    return c.hsv(hue, 1, v);
  },
};
