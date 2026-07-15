import type { EffectDef } from "./types.js";

// Full fart: FÄRGKAOS-PUMP — varje lampa egen ren färg (blandas om varje takt)
// och hela riggen THROBBAR hårt: nästan kolsvart mellan slagen, full på beatet.
// Lågt golv (5%) + extra kick-drive → rave-hård kontrast som sitter på basen.
export const party: EffectDef = {
  key: "party", label: "Party", tier: "full",
  desc: "Färgkaos som pumpar hårt på varje taktslag.",
  render(c) {
    const hue = c.mixedSector(c.beatIdx + c.idx * 2) / 6;
    const pump = Math.min(1, c.beatPulse * 1.0 + c.kickEnv * 0.9);   // mer kick → tightare till basen
    const v = 0.05 + 0.95 * pump;                                     // djupare throb (mörkare mellan slagen)
    return c.hsv(hue, 1, v);
  },
};
