import type { EffectDef } from "./types.js";

// Lugn men LEVANDE: en brasa/glöd. Varje lampa flimrar organiskt (lager av
// sinusar i otakt, inte hård random), färgen glider rött→bärnsten→gult när lågan
// flammar upp, och den andas som eld. Varm ton (ej snäppt). Golv 30%.
export const mono: EffectDef = {
  key: "mono", label: "Eld", tier: "lugn",
  desc: "Varm brasa som flimrar levande, glider rött → gult.",
  render(c) {
    const flick = Math.sin(c.t * 6.7 + c.idx * 2.3) * 0.5
                + Math.sin(c.t * 10.9 + c.idx * 4.1) * 0.3
                + Math.sin(c.t * 17.3 + c.idx * 1.7) * 0.2;   // -1..1 organiskt
    const ember = 0.5 + 0.5 * flick;                          // 0..1 glöd
    // Basgången (spec.bass) får lågan att SVALLA, kicken ger en flare, och
    // mellan/hög-mel-ANSLAG (virvel/gitarr) sprakar som kort vit gnista ovanpå →
    // elden andas OCH sprakar med musiken. Ljusare musik (centroid) drar gnistan
    // mot gult (magisk eld) i stället för bara djupt rött.
    const crackle = Math.max(c.frame.onset.mid, c.frame.onset.highMid);
    const hue = 0.015 + 0.11 * ember + c.frame.centroid * 0.04;   // rött → gult, ljusare = varmare
    const m = Math.min(1, 0.4 + ember * 0.4 + c.kickEnv * 0.2 + Math.max(c.frame.spec.sub, c.frame.spec.bass) * 0.22 + crackle * 0.5 + c.punch * 0.25);   // dunk = eld-flare
    const sat = 1 - crackle * 0.5;                              // anslag → kort vit gnista
    return c.hsv(hue, sat, 0.3 + 0.7 * m);
  },
};
