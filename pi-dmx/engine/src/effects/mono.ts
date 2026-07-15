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
    const hue = 0.015 + 0.11 * ember;                         // rött → gult
    const m = Math.min(1, 0.4 + ember * 0.45 + c.kickEnv * 0.3);
    return c.hsv(hue, 1, 0.3 + 0.7 * m);
  },
};
