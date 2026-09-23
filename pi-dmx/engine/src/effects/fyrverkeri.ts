import type { EffectDef } from "./types.js";

// FYRVERKERI (high, 2026-09-21): dropen ar festen. Nar dropEnv slar till exploderar lamporna i slumpad ordning under ~2 s -
// varje lampa far sin egen tandtid och palettfarg, vit karna som bleknar till farg - och lugnar sedan ner till ett pumpande
// partylage tills nasta drop. Refrangens entre (sectionEntry) tander en mindre salva.
export const fyrverkeri: EffectDef = {
  key: "fyrverkeri", label: "Fyrverkeri", tier: "full", modulate: { energy: false, pulse: false }, section: ["high"],
  desc: "Dropen exploderar lamporna en i taget i palettfarger, sedan pumpande party.",
  drives: ["blinder", "strobe"],
  render(c) {
    const seed = ((c.idx + 1) * 2654435761 + Math.floor(c.now / 8000) * 40503) >>> 0;   // ny slumpordning var 8:e s
    const delay = ((seed % 1000) / 1000) * 1.4;                        // 0..1,4 s efter dropen
    const salva = Math.max(c.dropEnv, c.sectionEntry * 0.6);
    // dropEnv faller fran 1 med ~0,5 s halveringstid (motorn) -> tid sedan dropen ur envelopen
    const since = salva > 0.02 ? -Math.log(salva) * 0.72 : 9;           // s sedan smallen (approx)
    const age = since - delay;                                          // < 0 = inte tand an
    const burst = age >= 0 ? Math.exp(-age / 0.45) : 0;
    const hue = c.mixedSector((seed >>> 8) % 6) / 6;
    if (c.dropEnv > 0.8) c.want.blinder = c.dropEnv; if (c.dropEnv > 0.9) c.want.strobe = 0.5;
    const party = 0.10 + 0.9 * Math.min(1, c.beatPulse * 0.9 + c.kickEnv * 0.6 + c.punch * 0.6);
    const v = Math.max(party * (1 - burst * 0.5), burst);
    return c.hsv(hue, 1 - burst * 0.85, Math.min(1, v));
  },
};
