import type { EffectDef } from "./types.js";

// BLIXTNEDSLAG (full x intro, situationsrutnätet 2026-10-12 - rutan hade två effekter, syskon kickregn/startskott): introt i en
// fullfartslåt på virveln. Baktakten (slag 2 och 4, och varje virvelslag c.drum.snare) slår ner som en blixt i en lampa (ny plats
// per slag) och en grannlampa blixtrar efter en åttondels slag svagare - blixten grenar sig. Kicken mullrar bara svagt i lampan
// mittemot. Kickregn går på kicken, startskott räknar takter; blixtnedslag är virveln.
export const blixtnedslag: EffectDef = {
  key: "blixtnedslag", label: "Blixtnedslag", tier: "full", modulate: { energy: true, pulse: false }, section: ["intro"], fastLight: true,
  desc: "Intro i full fart: virveln slår ner som en blixt i en lampa, en grannlampa blixtrar efter.",
  render(c) {
    const n = Math.max(1, c.count);
    const bib = ((c.beatIdx % 4) + 4) % 4;
    const back = bib === 1 || bib === 3;
    const strike = (Math.imul(c.beatIdx + 5, 2654435761) >>> 0) % n;
    const branch = (strike + ((c.beatIdx >> 1) & 1 ? 1 : n - 1)) % n;
    const base = c.mixedSector(Math.floor(c.hueIdx / 16));
    if (c.lamp === strike) {
      const f = back ? Math.max(Math.exp(-c.beatFrac / 0.08), c.drum.snare) : 0.5 * c.drum.snare;
      return c.hsv(base / 6, 0.85, Math.min(1, 0.03 + 0.95 * f));
    }
    if (c.lamp === branch && back && c.beatFrac >= 0.12) return c.hsv(((base + 1) % 6) / 6, 0.9, 0.55 * Math.exp(-(c.beatFrac - 0.12) / 0.07));
    if (c.lamp === (strike + 2) % n) return c.hsv(((base + 3) % 6) / 6, 1, 0.03 + 0.2 * c.drum.kick);
    return c.hsv(base / 6, 1, 0);
  },
};
