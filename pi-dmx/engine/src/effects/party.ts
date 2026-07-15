import type { EffectDef } from "./types.js";

// Full fart: FÄRGKAOS-PUMP — varje lampa egen ren färg (blandas om varje takt)
// och hela riggen THROBBAR hårt: mörk mellan slagen, full på beatet. Fast lågt
// golv (12%) så pumpen verkligen syns — det är partyts signatur.
export const party: EffectDef = {
  key: "party", label: "Party", tier: "full",
  desc: "Färgkaos som pumpar hårt på varje taktslag.",
  render(c) {
    const hue = c.mixedSector(c.beatIdx + c.idx * 2) / 6;
    const pump = Math.min(1, c.beatPulse * 1.0 + c.kickEnv * 0.7);
    const v = 0.12 + 0.88 * pump;
    return c.hsv(hue, 1, v);
  },
};
