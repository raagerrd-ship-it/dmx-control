import type { EffectDef } from "./types.js";
import { hsv } from "./color.js";

// PUMP (full x vers, situationsrutnätet 2026-10-12 - rutan hade tre effekter, syskon gravity/backbeat/motor): sidechain-pumpen
// från dansmusiken, i ljus. Kicken TRYCKER NER lamporna i stället för att tända dem, och de hämtar sig var för sig - mittlamporna
// snabbt, kanterna långsamt - så riggen andas ut ojämnt efter varje kick. En lampa per takt vilar mörk (c.idx-ordningen).
// Motor, backbeat och gravity tänder på slaget; pump släcker på det.
export const pump: EffectDef = {
  key: "pump", label: "Pump", tier: "full", modulate: { energy: true, pulse: false }, section: ["low"],
  desc: "Vers i full fart: kicken trycker ner lamporna och de hämtar sig i olika takt - sidechain-pump.",
  render(c) {
    const n = Math.max(1, c.count);
    const rest = ((Math.floor(c.beatIdx / 4) % n) + n) % n;
    const base = c.mixedSector(Math.floor(c.hueIdx / 16));
    if (c.idx === rest) return hsv(((base + 3) % 6) / 6, 1, 0.03);
    const edge = Math.min(c.lamp, n - 1 - c.lamp);                    // 0 = kant
    const rec = edge === 0 ? 0.55 : 0.2;                               // återhämtning i slag
    const duck = Math.max(1 - Math.exp(-c.beatFrac / rec) * 1.0, 0) * (1 - 0.6 * c.drum.kick);
    return hsv(((base + c.group) % 6) / 6, 1, Math.min(1, 0.05 + (edge === 0 ? 0.7 : 0.85) * duck));
  },
};
