import type { EffectDef } from "./types.js";

// FAMN (lugn x refräng, situationsrutnätet 2026-10-12 - andra effekten i rutan, syskon svall): en lugn refräng som öppnar sig.
// Mittlamporna håller en varm, stilla glöd; ytterlamporna blommar ut på taktens etta och klingar av över hela takten - riggen
// omfamnar mitten. Svall andas fram och tillbaka på två slag; famn slår en gång per takt.
export const famn: EffectDef = {
  key: "famn", label: "Famn", tier: "lugn", modulate: { energy: true, pulse: false }, section: ["high"],
  desc: "Lugn refräng: mitten glöder stilla, ytterlamporna blommar ut på taktens etta och klingar av.",
  render(c) {
    const n = Math.max(1, c.count);
    const outer = c.lamp === 0 || c.lamp === n - 1;
    const base = c.mixedSector(Math.floor(c.hueIdx / 16));
    if (!outer) return c.hsv(base / 6, 0.9, 0.35 * c.heart(0.15));
    const inBar = (((c.beatIdx % 4) + 4) % 4 + c.beatFrac) / 4;        // 0..1 över takten
    return c.hsv(((base + 1) % 6) / 6, 1, Math.min(1, 0.12 + 0.85 * Math.exp(-inBar / 0.35)));
  },
};
