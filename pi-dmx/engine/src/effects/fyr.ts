import type { EffectDef } from "./types.js";
import { hsv } from "./color.js";

// FYR (break/intro, 2026-10-11): en långsam stråle sveper runt riggen - ett varv på två takter - mjukt övertonad mellan lamporna,
// de andra nästan släckta. Lugn men rumslig (break hade bara enhetliga looks utom viska). En kulör, mättad.
export const fyr: EffectDef = {
  key: "fyr", label: "Fyr", tier: "lugn", modulate: { energy: true, pulse: false }, section: ["break", "intro"],
  desc: "Lugnt: en långsam stråle sveper runt riggen, ett varv på två takter.",
  render(c) {
    const n = Math.max(1, c.count);
    const bpm = c.cfg.beat?.bpm ?? 0;
    const phase = bpm > 0 ? ((c.beatIdx + c.beatFrac) / 8) % 1 : (c.t / 4) % 1;   // 8 slag per varv (utan takt: 4 s)
    const p = phase * n;                                              // strålens position 0..n
    let d = Math.abs(c.idx + 0.5 - p); d = Math.min(d, n - d);        // avstånd runt riggen
    const v = Math.max(0, 1 - d / 1.1);
    const hue = c.mixedSector(Math.floor(c.hueIdx / 16)) / 6;
    return hsv(hue, 1, 0.04 + 0.86 * v * v);
  },
};
