import type { EffectDef } from "./types.js";

// MÖRKERSLAG (full x break, situationsrutnätet 2026-10-12 - rutan hade två effekter, syskon efterskalv/skuggor): breaket i
// negativ. Riggen glöder på olika nivåer i två kulörer, och varje slag slår ett HÅL - en lampa (ny plats per slag) släcks och
// tänds långsamt igen. Takten syns som mörker i stället för ljus, energin vilar men pulsen finns kvar.
// Efterskalv och skuggor tänder på slaget; mörkerslag släcker.
export const morkerslag: EffectDef = {
  key: "morkerslag", label: "Mörkerslag", tier: "full", modulate: { energy: true, pulse: false }, section: ["break"],
  desc: "Break i full fart: riggen glöder och varje slag släcker en ny lampa - takten som mörker.",
  render(c) {
    const n = Math.max(1, c.count);
    const hole = (Math.imul(c.beatIdx + 9, 2654435761) >>> 0) % n;
    const lvl = [0.03, 0.25, 0.45][(c.lamp + Math.floor(c.beatIdx / 4)) % 3];   // olika nivå per lampa (en nästan mörk), byts per takt
    const base = c.mixedSector(Math.floor(c.hueIdx / 16));
    const hue = ((base + 2 * (c.lamp & 1)) % 6) / 6;
    const v = c.lamp === hole ? lvl * (1 - Math.exp(-c.beatFrac / 0.35)) : lvl;
    return c.hsv(hue, 1, Math.min(1, 0.02 + v));
  },
};
