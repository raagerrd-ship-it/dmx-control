import type { EffectDef } from "./types.js";
import { hsv } from "./color.js";

// DANSPARET (labbet 4, ägaren i ladan 2026-11-07: 'denna är bättre' + 'ljuset skall hjälpa dom som dansar att dansa i takt'): två
// ljuspunkter i motfärger dansar ETT STEG PER SLAG - mot varandra, möts, förbi, tillbaka (STEPS över två takter, B speglad); varannan
// tvåtakt byter de plats. Slaget klingar, ett svagt spår ligger kvar där dansaren stod. Styrkan ur kicken/basens kropp.
// Kulören följer paletten och byts bara på taktens etta (aldrig på en tänd lampa mitt i ett slag - diodblinket).
const STEPS = [0, 1, 1, 0, 0, 1, 2, 3];
export const dansparet: EffectDef = {
  key: "dansparet", label: "Dansparet", tier: "full", modulate: { energy: true, pulse: false }, section: ["high"], toggle: true,
  desc: "Två ljuspunkter i motfärger dansar ett steg per slag och byter plats varannan takt.",
  render(c) {
    const n = Math.max(1, c.count), k = ((c.beatIdx % 8) + 8) % 8, prev = (k + 7) % 8, scale = (n - 1) / 3;
    const swap = Math.floor(c.beatIdx / 8) % 2 === 1;
    const a = Math.round(STEPS[k] * scale), b = n - 1 - a, ap = Math.round(STEPS[prev] * scale), bp = n - 1 - ap;
    const base = c.mixedSector(Math.floor(c.beatIdx / 32));
    const sA = swap ? base + 3 : base, sB = swap ? base : base + 3;
    const energy = 0.4 + 0.6 * Math.min(1, Math.max(c.drum.kick, c.bassBody));
    const pulse = Math.exp(-c.beatFrac * 2.5) * energy, i = c.lamp;
    const h = (s: number) => (((s % 6) + 6) % 6) / 6;
    if (a === b && i === a) return hsv(h(k % 2 ? sB : sA), 1, pulse);   // de möts: den vars tur det är
    if (i === a) return hsv(h(sA), 1, pulse);
    if (i === b) return hsv(h(sB), 1, pulse);
    if (i === ap) return hsv(h(sA), 1, 0.22 * (1 - c.beatFrac));         // spåret efter steget
    if (i === bp) return hsv(h(sB), 1, 0.22 * (1 - c.beatFrac));
    return [0, 0, 0];
  },
};
