import type { EffectDef } from "./types.js";

// EFTERSKALV (full x break, situationsrutnätet 2026-10-12 - rutan var tom): breaket efter en drop i en fullfartslåt. Tempot finns
// kvar men energin har lagt sig: ena gruppen (c.group) slår på halvtakt (vartannat slag) med djup puls, andra gruppen glöder lågt
// i motfärg - riggen håller pulsen vid liv tills nästa lyft. Grupperna byter roll varje fras.
export const efterskalv: EffectDef = {
  key: "efterskalv", label: "Efterskalv", tier: "full", modulate: { energy: true, pulse: false }, section: ["break"],
  desc: "Break i full fart: en lampgrupp slår på halvtakt, den andra glöder lågt i motfärg.",
  render(c) {
    const lead = c.group === (Math.floor(c.beatIdx / 16) & 1);
    const base = c.mixedSector(Math.floor(c.hueIdx / 16));
    if (!lead) return c.hsv(((base + 3) % 6) / 6, 1, 0.12);
    const ph = ((((c.beatIdx % 2) + 2) % 2) + c.beatFrac) / 2;        // halvtakt: ett slag per två
    return c.hsv(base / 6, 1, Math.min(1, 0.15 + 0.8 * Math.exp(-ph / 0.18)));
  },
};
