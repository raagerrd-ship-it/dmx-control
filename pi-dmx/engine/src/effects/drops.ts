import type { EffectDef } from "./types.js";

// Varje takt/kick målar nästa lampa i en ny ren färg som klingar av —
// överlappande decays gör rytmen till glidande färgstänk. (Tändtiderna sätts av
// motorn i dropFired/dropHue.)
export const drops: EffectDef = {
  key: "drops", label: "Drops", tier: "fart",
  desc: "Varje slag målar nästa lampa i en ny färg.",
  render(c) {
    const since = (c.now - (c.dropFired[c.idx] ?? -1e9)) / 1000;
    const v = Math.exp(-since / 0.55) * (0.6 + 0.4 * Math.min(1, c.audio + c.kickEnv)) + c.punch * 0.3;
    return c.hsv(c.dropHue[c.idx] ?? 0, 1 - c.punch * 0.3, Math.min(1, v));   // riktig dunk lyfter hela stänket
  },
};
