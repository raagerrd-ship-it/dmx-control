import type { EffectDef } from "./types.js";
import { hsv } from "./color.js";

// SIREN (full x uppbyggnad, situationsrutnätet 2026-10-12 - andra effekten i rutan, syskon rulle): båda lampgrupperna (c.group)
// lyser hela tiden men BYTER KULÖR med varandra som en siren - varannat slag, och varje slag efter halva uppbyggnaden
// (c.buildUp) - aldrig snabbare än takten. Ljuset stiger med förloppet. Rulle blinkar; siren växlar färg.
// 10-13: roterande blåljus i stället (se render) - grupperna lyste lika hela tiden.
export const siren: EffectDef = {
  key: "siren", label: "Siren", tier: "full", modulate: { energy: true, pulse: false }, section: ["build"], toggle: true,
  desc: "Uppbyggnad i full fart: ett roterande blåljus - två strålar i motfärg går runt riggen, smalare och ljusare mot dropen.",
  render(c) {
    // EFFEKTGENOMGÅNGEN 10-13 (effectDyn: spridning 0,00, rum 0,00 - alla fyra lika ljusa hela tiden, bara kulören bytte): nu ett
    // ROTERANDE BLÅLJUS - två strålar i motfärg mittemot varandra går runt riggen, ett varv per två slag (varje lampa träffas av en
    // stråle per slag, aldrig fler). Mot dropen smalnar strålarna och ljuset stiger.
    const p = c.buildUp, n = Math.max(1, c.count);
    const ph = (((c.beatIdx + c.beatFrac) / 2) % 1 + 1) % 1;            // ett varv per två slag
    const base = c.mixedSector(Math.floor(c.hueIdx / 16));
    const width = 1.1 - 0.4 * p;                                         // strålens halvbredd i lampor
    let best = 0, hue = base / 6;
    for (let k = 0; k < 2; k++) {
      let d = Math.abs(c.lamp + 0.5 - ((ph + k / 2) % 1) * n); d = Math.min(d, n - d);
      const v = Math.max(0, 1 - d / width);
      if (v > best) { best = v; hue = ((k ? base + 3 : base) % 6) / 6; }
    }
    return hsv(hue, 1, Math.min(1, (0.45 + 0.4 * p) * best * best));
  },
};
