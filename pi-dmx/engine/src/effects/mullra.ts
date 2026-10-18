import type { EffectDef } from "./types.js";
import { hsv } from "./color.js";

// MULLRA (lugn x uppbyggnad, situationsrutnätet 2026-10-12 - syskon gryning/flod/stjärnor): uppbyggnaden i en lugn låt bärs av
// basen. Mittlamporna mullrar med basens sustain (c.drum.bass) i paletten, ytterlamporna står i motfärg och ljusnar med uppbyggnaden
// (c.buildUp) - vänster på jämna slag, höger på udda, så kanten tickar svagt i takt. Basen i mitten, spänningen i kanten.
export const mullra: EffectDef = {
  key: "mullra", label: "Mullra", tier: "lugn", modulate: { energy: true, pulse: false }, section: ["build"],
  desc: "Lugn uppbyggnad: mitten mullrar med basen, kanterna ljusnar i motfärg mot dropen.",
  render(c) {
    const n = Math.max(1, c.count), p = c.buildUp;
    const base = c.mixedSector(Math.floor(c.hueIdx / 32));
    const outer = c.lamp === 0 || c.lamp === n - 1;
    // 10-13 (effectDyn): motorns grundnivå (FX_FLOOR 0,6) lyfter allt över ~0,1 till minst 64 % - "låg glöd" måste ligga på ~0,01-0,03.
    //   Spridningen var 0,24: kanternas botten 0,04 + 0,28p syntes som nästan fullt. Nu släckta mellan tickarna. Mittens mullrande
    //   bärs av basenergin (drum.bass som NIVÅ dubbelmodulerade mot den) - mitten glöder jämnt med hjärtat.
    if (!outer) return hsv(base / 6, 1, Math.min(1, 0.5 * c.heart(0.3)));
    const mine = ((c.beatIdx & 1) === 0) === (c.lamp === 0);
    const tickV = mine ? Math.exp(-c.beatFrac / 0.3) : 0;
    return hsv(((base + 3) % 6) / 6, 0.95, Math.min(1, 0.01 + (0.15 + 0.5 * p) * tickV));
  },
};
