import type { EffectDef } from "./types.js";
import { hsv } from "./color.js";

// MOTOR (full x vers, situationsrutnätet 2026-10-12 - rutan hade två effekter): versen i en fullfartslåt - trummaskinen går. Ena
// gruppen (c.group) följer kicken (c.drum.kick), andra gruppen hi-hatten (c.drum.hat) i motfärg, så riggen tickar som en motor:
// dunk - tss - dunk - tss. Varje grupp bara på sitt instrument; nästan släckt emellan.
export const motor: EffectDef = {
  key: "motor", label: "Motor", tier: "full", modulate: { energy: true, pulse: false }, section: ["low"], toggle: true,
  desc: "Vers i full fart: ena lampgruppen på kicken, den andra på hi-hatten i motfärg.",
  render(c) {
    const base = c.mixedSector(Math.floor(c.hueIdx / 16));
    if (c.group === 0) return hsv(base / 6, 1, Math.min(1, 0.06 + 0.94 * Math.max(c.drum.kick, 0.6 * c.kickEnv)));
    return hsv(((base + 3) % 6) / 6, 0.9, Math.min(1, 0.04 + 0.8 * c.drum.hat));
  },
};
