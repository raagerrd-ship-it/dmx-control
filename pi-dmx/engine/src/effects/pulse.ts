import type { EffectDef } from "./types.js";

// Fart: hela riggen samma färg, pulsar på beatet; färg stegar var fjärde takt.
export const pulse: EffectDef = {
  key: "pulse", label: "Puls", tier: "fart",
  desc: "Hela riggen i en färg som pulsar på beatet.",
  render(c) {
    const hue = c.mixedSector(Math.floor(c.beatIdx / 4)) / 6;
    const v = c.punchFloor + (1 - c.punchFloor) * Math.min(1, c.beatPulse * 0.85 + c.audio * 0.25);
    return c.hsv(hue, 1, v);
  },
};
