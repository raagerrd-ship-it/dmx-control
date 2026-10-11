import type { EffectDef } from "./types.js";

// RULLANDE ANDNING (break/intro, 2026-10-11): en långsam andning (en per takt) som rullar över lamporna - varje lampa en kvarts
// andetag efter grannen, så riggen andas som en våg i stället för alla samtidigt. Två kulörer (palettens), varannan lampa.
export const rullandning: EffectDef = {
  key: "rullandning", label: "Rullande andning", tier: "lugn", modulate: { energy: true, pulse: false }, section: ["break", "intro"],
  desc: "Lugnt: riggen andas som en våg - varje lampa en kvarts andetag efter grannen.",
  render(c) {
    const bpm = c.cfg.beat?.bpm ?? 0;
    const ph = (bpm > 0 ? (c.beatIdx + c.beatFrac) / 4 : c.t / 3) - c.idx * 0.25;   // ett andetag per takt
    const b = 0.5 - 0.5 * Math.cos(2 * Math.PI * ph);
    const base = c.mixedSector(Math.floor(c.hueIdx / 16));
    const hue = ((c.idx % 2 ? base + 2 : base) % 6) / 6;
    return c.hsv(hue, 1, 0.06 + 0.8 * b * b);
  },
};
