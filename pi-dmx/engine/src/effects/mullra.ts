import type { EffectDef } from "./types.js";

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
    if (!outer) return c.hsv(base / 6, 1, Math.min(1, (0.1 + 0.65 * Math.min(1, c.drum.bass * 1.3)) * c.heart(0.15)));
    const mine = ((c.beatIdx & 1) === 0) === (c.lamp === 0);
    const tickV = mine ? Math.exp(-c.beatFrac / 0.3) : 0;
    return c.hsv(((base + 3) % 6) / 6, 0.95, Math.min(1, 0.04 + 0.5 * p * (0.55 + 0.45 * tickV)));
  },
};
