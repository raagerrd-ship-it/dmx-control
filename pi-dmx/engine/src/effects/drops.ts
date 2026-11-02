import type { EffectDef } from "./types.js";
import { hsv } from "./color.js";

// Varje takt/kick målar nästa lampa i en ny ren färg som klingar av —
// överlappande decays gör rytmen till glidande färgstänk. (Tändtiderna sätts av
// motorn i dropFired/dropHue.)
export const drops: EffectDef = {
  key: "drops", label: "Drops", tier: "fart", modulate: { energy: false, pulse: false }, section: ["high"],
  desc: "Varje slag målar nästa lampa i en ny färg.",
  render(c) {
    const since = (c.now - (c.dropFired[c.idx] ?? -1e9)) / 1000;
    // MJUK PULS (11-02, ägaren i ladan 11-01: refrängeffekterna 'väldigt AV/PÅ'): stänket stiger mjukt på ~0,12 slag i stället för
    // att slå på direkt; uttoningen 0,55 s som förut.
    const rise = 0.12 * (c.cfg.beat?.bpm ? 60 / c.cfg.beat.bpm : 0.5);
    const x = since <= 0 ? 0 : Math.min(1, since / rise);
    const sp = since < rise ? x * x * (3 - 2 * x) : Math.exp(-(since - rise) / 0.55);
    const v = sp * (0.6 + 0.4 * Math.min(1, c.audio + c.kickEnv)) + c.punch * 0.3;
    return hsv(c.dropHue[c.idx] ?? 0, 1 - c.punch * 0.3, Math.min(1, v) * c.heart(0.3));   // riktig dunk lyfter hela stänket; egen hjartpuls (09-27)
  },
};
