import type { EffectDef } from "./types.js";

// 3-band spektrum: varje lampa = ETT band i EN ren färg, ljusstyrkan = bandets
// nivå. Bas→Röd, Mellan→Grön, Diskant→Blå. Skalas mot AGC-målet med HEADROOM
// (banden saturerar sällan) + EXPANDERANDE gamma (1.8) → tydlig KONTRAST: ett
// tyst band blir mörkt medan ett starkt lyser fullt, i stället för att alla
// lyser lika. Per-band-gain kompenserar för att diskanten har mindre energi.
// (Effekten är omedveten om master/beatPulse/VU — de ligger uniformt efter.)
export const eq: EffectDef = {
  key: "eq", label: "Spektrum", tier: "fart",
  desc: "3-band-EQ: bas→röd lampa, mellan→grön, diskant→blå. Visar ljudets färg.",
  render(c) {
    const tgt = Math.max(0.15, c.cfg.detection?.autoGainTarget ?? 0.5);
    const bar = (x: number, gain: number) => {
      const n = Math.min(1, (x / tgt) * gain);
      return 0.04 + 0.96 * Math.pow(n, 1.8);   // gamma 1.8 = kontrast; litet golv 4%
    };
    const r = bar(c.frame.energy, 0.85);   // bas (mest energi → minst gain)
    const g = bar(c.frame.mid, 1.2);       // mellan
    const b = bar(c.frame.treble, 2.0);    // diskant (minst energi → mest gain)
    const bandIdx = c.count > 1 ? c.idx % 3 : -1;
    if (bandIdx === 0) return [r, 0, 0];   // bas → röd
    if (bandIdx === 1) return [0, g, 0];   // mellan → grön
    if (bandIdx === 2) return [0, 0, b];   // diskant → blå
    return [r, g, b];                      // enda lampa: full mix
  },
};
