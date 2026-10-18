import type { EffectDef } from "./types.js";
import { hsv } from "./color.js";

// HISS (full x uppbyggnad, situationsrutnätet 2026-10-12 - rutan hade två effekter, syskon rulle/siren): risern som stiger i
// tonhöjd blir ett ljus som klättrar. Hissen står på en våning (c.idx-ordningen, uppbyggnadens förlopp c.buildUp) och glöder med
// hi-hatten (c.drum.hat); på varje slag knackar våningen OVANFÖR i motfärg, allt hårdare mot dropen - ljuset vill uppåt. Våningarna
// under glöder svagt. Rulle blinkar runt, siren byter färg, gryning tänder utifrån; hiss är en position som drar uppåt på slaget.
export const hiss: EffectDef = {
  key: "hiss", label: "Hiss", tier: "full", modulate: { energy: true, pulse: false }, section: ["build"],
  desc: "Uppbyggnad i full fart: ljuset klättrar genom riggen, våningen ovanför knackar på varje slag.",
  render(c) {
    const n = Math.max(1, c.count), p = c.buildUp;
    const floor = Math.min(n - 2, Math.floor(p * (n - 1)));           // våningen (sista steget = näst översta, toppen knackar)
    const base = c.mixedSector(Math.floor(c.hueIdx / 16));
    if (c.idx === floor) return hsv(base / 6, 1, Math.min(1, 0.3 + 0.2 * p + 0.35 * c.drum.hat));
    if (c.idx === floor + 1) return hsv(((base + 3) % 6) / 6, 1, Math.min(1, 0.03 + (0.5 + 0.45 * p) * Math.exp(-c.beatFrac / 0.15)));
    if (c.idx < floor) return hsv(base / 6, 1, 0.1);
    return hsv(base / 6, 1, 0.02);
  },
};
