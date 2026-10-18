import type { EffectDef } from "./types.js";
import { hsv } from "./color.js";

// (skräpjakten 10-18: förr en closure/array som skapades i render per lampa och ruta - samma räkning)
const h = (x: number, n: number) => (Math.imul(x, 2654435761) >>> 0) % n;

// KICKREGN (full x intro, situationsrutnätet 2026-10-12 - rutan var tom): en fullfartslåts intro som redan har kicken. Varje slag
// tänder EN lampa (hash på slaget, ny plats varje gång) fullt på kicken och på efterslaget en annan lampa till hälften i motfärg -
// regn av slag över riggen. Övriga släckta.
export const kickregn: EffectDef = {
  key: "kickregn", label: "Kickregn", tier: "full", modulate: { energy: true, pulse: false }, section: ["intro"],
  desc: "Intro i full fart: varje kick tänder en ny lampa, efterslaget en annan i motfärg.",
  render(c) {
    const n = Math.max(1, c.count);
    const on = h(c.beatIdx, n), off = (on + 1 + (h(c.beatIdx + 7, n) % Math.max(1, n - 1))) % n;
    const base = c.mixedSector(Math.floor(c.hueIdx / 16));
    if (c.idx === on) return hsv(base / 6, 1, Math.min(1, 0.2 + 0.8 * Math.max(c.kickEnv, Math.exp(-c.beatFrac / 0.2))));
    if (c.idx === off && c.beatFrac >= 0.5) return hsv(((base + 3) % 6) / 6, 1, 0.5 * Math.exp(-(c.beatFrac - 0.5) / 0.15));
    return hsv(0, 0, 0);
  },
};
