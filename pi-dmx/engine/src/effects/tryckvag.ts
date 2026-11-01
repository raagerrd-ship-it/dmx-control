import type { EffectDef } from "./types.js";
import { hsv } from "./color.js";

// TRYCKVÅG (full x high, 2026-11-01): varje slag tänder hela riggen; kanterna slocknar fort, mitten bär basen längre - tyngden
// samlas i mitten och slaget ser ut att dra ihop sig mot den. Kanterna i motfärg, vit kärna i mitten på taktens etta.
// (ripple: slaget slår ner i mitten och rullar UT; tryckvågen: allt slår, sedan dras ljuset IN.)
export const tryckvag: EffectDef = {
  key: "tryckvag", label: "Tryckvåg", tier: "full", modulate: { energy: true, pulse: false }, section: ["high"], toggle: true,
  desc: "Varje slag tänder allt, kanterna dör fort och mitten bär basen - ljuset dras ihop mot mitten.",
  render(c) {
    const f = c.hasBeat ? c.beatFrac : 1 - c.kickEnv;
    const n = Math.max(1, c.count), e = Math.min(c.idx, n - 1 - c.idx), mid = n > 2 ? e / ((n - 1) / 2) : 1;   // 0 kant .. 1 mitt
    const v = Math.exp(-f / (0.1 + 0.35 * mid));
    const base = c.mixedSector(Math.floor(c.hueIdx / 16));
    const hue = ((mid >= 0.5 ? base : base + 3) % 6) / 6;
    const core = (c.beatIdx & 3) === 0 && mid >= 0.5 ? Math.exp(-f / 0.08) : 0;
    return hsv(hue, 1 - core, v);
  },
};
