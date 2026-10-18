import type { EffectDef } from "./types.js";
import { hsv } from "./color.js";

// URLADDNING (full x break, situationsrutnätet 2026-10-12 - syskon efterskalv/skuggor/mörkerslag): dropens energi som rinner ur
// riggen. När breaket börjar står lamporna laddade på olika nivå (en redan mörk) och laddas ur var för sig i egen takt (c.idx:
// 3, 6, 9 s, sectionAgeMs) - en efter en blir de mörka. Kvar blir en svag puls på taktens etta i en lampa som flyttar per takt.
// Ingen takt i urladdningen; tiden i breaket styr.
export const urladdning: EffectDef = {
  key: "urladdning", label: "Urladdning", tier: "full", modulate: { energy: true, pulse: false }, section: ["break"],
  desc: "Break i full fart: lamporna laddas ur var för sig efter dropen, kvar blir en svag puls på ettan.",
  render(c) {
    const n = Math.max(1, c.count);
    const age = c.sectionAgeMs / 1000;
    const charge = Math.max(0, 0.9 - 0.3 * c.idx) * Math.exp(-age / (3 + 3 * c.idx));   // sista lampan börjar mörk
    const bar = ((Math.floor(c.beatIdx / 4) % n) + n) % n;
    const one = c.idx === bar && (((c.beatIdx % 4) + 4) % 4) === 0 ? 0.35 * Math.exp(-c.beatFrac / 0.4) : 0;
    const base = c.mixedSector(Math.floor(c.hueIdx / 16));
    return hsv(((base + (c.idx & 1)) % 6) / 6, 1, Math.min(1, 0.03 + charge + one));
  },
};
