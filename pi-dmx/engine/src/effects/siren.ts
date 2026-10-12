import type { EffectDef } from "./types.js";

// SIREN (full x uppbyggnad, situationsrutnätet 2026-10-12 - andra effekten i rutan, syskon rulle): båda lampgrupperna (c.group)
// lyser hela tiden men BYTER KULÖR med varandra som en siren - en gång per slag, två efter en tredjedel och fyra efter två
// tredjedelar av uppbyggnaden (c.buildUp). Ljuset stiger med förloppet. Rulle blinkar; siren växlar färg.
export const siren: EffectDef = {
  key: "siren", label: "Siren", tier: "full", modulate: { energy: true, pulse: false }, section: ["build"], fastLight: true, toggle: true,
  desc: "Uppbyggnad i full fart: två lampgrupper byter kulör med varandra, allt tätare mot dropen.",
  render(c) {
    const p = c.buildUp;
    const rate = p >= 0.66 ? 4 : p >= 0.33 ? 2 : 1;
    const flip = Math.floor((c.beatIdx + c.beatFrac) * rate) & 1;
    const base = c.mixedSector(Math.floor(c.hueIdx / 16));
    const hue = (((c.group ^ flip) ? base + 3 : base) % 6) / 6;
    return c.hsv(hue, 1, Math.min(1, 0.25 + 0.45 * p));   // 0,45 + 0,5p -> 0,25 + 0,45p (10-12: builden fick inte lysa mer än refrängen)
  },
};
