import type { EffectDef } from "./types.js";

// STEGE: riggen blir en frekvensstege och musiken klättrar i den. Lampa 0 är
// basen, sista lampan är luften — men till skillnad från EQ tänds varje pinne
// av sitt bands ANSLAG (onset), inte av dess nivå. Resultatet är löpande
// uppgångar när en fill eller ett break rullar uppåt genom registret.
export const stege: EffectDef = {
  key: "stege", label: "Stege", tier: "fart",
  desc: "Riggen är en frekvensstege — anslag i varje band tänder sin pinne, fills rullar uppåt.",
  render(c) {
    const o = c.frame.onset, s = c.frame.spec;
    const n = Math.max(1, c.count);
    const p = c.idx / n;                                  // 0 = botten, 1 = topp
    // Fyra pinnar täcker sub→luft; fler lampor interpolerar mellan dem.
    const hit = p < 0.25 ? Math.max(o.sub, o.kick)
              : p < 0.50 ? o.lowMid
              : p < 0.75 ? o.highMid
              :            Math.max(o.treble, o.air);
    const bed = p < 0.5 ? Math.max(s.sub, s.bass) * 0.25 : s.treble * 0.2;
    const hue = 0.02 + p * 0.55;                          // rött i botten → blått i topp
    return c.hsv(hue, 1, Math.min(1, 0.05 + bed + hit * 0.95 + c.punch * 0.2));
  },
};
