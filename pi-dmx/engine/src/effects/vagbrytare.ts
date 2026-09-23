import type { EffectDef } from "./types.js";

// VAGBRYTARE (high, 2026-09-21): en vag per TAKT (4 slag) rullar fran ena kanten till den andra, och pa ettan (barShift
// fran analysatorn) bryter den med en vit kam over hela riggen. Takten syns som en FORM, inte bara som puls. Riktningen
// vaxlar varannan takt. Utan taktfas: ettan = slag 0 i fyrgruppen.
export const vagbrytare: EffectDef = {
  key: "vagbrytare", label: "Vagbrytare", tier: "full", modulate: { energy: true, pulse: false }, section: ["high"],
  desc: "En vag per takt over riggen, vit kam pa ettan.",
  render(c) {
    const inBar = ((c.beatIdx % 4) + 4) % 4;                 // slagets plats i takten (ankaret flyttas till ettan av motorn)
    const barNo = Math.floor(c.beatIdx / 4);
    const prog = (inBar + c.beatFrac) / 4;                   // 0..1 genom takten
    const dir = barNo % 2 === 0 ? 1 : -1;
    const head = (dir > 0 ? prog : 1 - prog) * (c.count - 1);
    const d = Math.abs(c.idx - head);
    const crest = inBar === 0 ? Math.exp(-c.beatFrac / 0.12) : 0;   // ettan: vit kam
    const hue = c.mixedSector(barNo) / 6;
    const body = Math.exp(-d * d * 0.5) * (0.55 + c.audio * 0.45) + c.beatPulse * 0.15;
    const v = Math.min(1, 0.08 + body + crest * 0.7 + c.punch * 0.3 + c.sectionEntry * 0.5);
    return c.hsv(hue, 1 - Math.max(crest * 0.9, c.punch * 0.3), v);
  },
};
