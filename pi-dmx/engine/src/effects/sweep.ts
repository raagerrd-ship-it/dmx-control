import type { EffectDef } from "./types.js";

// Enfärgad SPOTLIGHT: ETT smalt ljusband glider mjukt över en mörk rigg — hög
// kontrast, en färg i taget. Motsats till wave (full rigg, många färger).
export const sweep: EffectDef = {
  key: "sweep", label: "Svep", tier: "fart",
  desc: "En smal spotlight glider över en mörk rigg.",
  render(c) {
    const headPos = (c.wavePhase * 0.5) % c.count;
    let dd = Math.abs(c.idx - headPos);
    if (dd > c.count / 2) dd = c.count - dd;   // wrap
    const hue = c.mixedSector(c.mclk(4, 5)) / 6;                  // ny färg var 4:e takt (eller 5s)
    const v = c.shaped(0.05, Math.exp(-dd * 1.9) * (0.75 + c.audio * 0.4) + c.kickEnv * 0.15);
    return c.hsv(hue, 1, v);
  },
};
