import type { EffectDef } from "./types.js";

// 3-band spektrum-EQ över riggen: varje lampa = ETT band i EN ren färg,
// ljusstyrkan = bandets energi. Bas→Röd, Mellan→Grön, Diskant→Blå. Använder bara
// EN R/G/B-kanal per lampa → perfekt för rena färger.
export const eq: EffectDef = {
  key: "eq", label: "Spektrum", tier: "fart",
  desc: "3-band-EQ: bas→röd lampa, mellan→grön, diskant→blå. Visar ljudets färg.",
  render(c) {
    const bandIdx = c.count > 1 ? c.idx % 3 : -1;
    const r = Math.min(1, c.frame.energy * 1.7);
    const g = Math.min(1, c.frame.mid * 1.9);
    const b = Math.min(1, c.frame.treble * 1.9);
    if (bandIdx === 0) return [Math.max(0.05, r), 0, 0];   // bas → röd
    if (bandIdx === 1) return [0, Math.max(0.05, g), 0];   // mellan → grön
    if (bandIdx === 2) return [0, 0, Math.max(0.05, b)];   // diskant → blå
    return [Math.max(0.05, r), Math.max(0.05, g), Math.max(0.05, b)];   // enda lampa: full mix
  },
};
