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
    // EFFEKTGENOMGÅNGEN 10-13 (effectDyn: 29,7 kulörhopp/min - kulören byttes varje takt; c.audio/punch/beatPulse som NIVÅ
    // dubbelmodulerade mot basenergin och 0,08-golvet lyftes av motorns grundnivå): kulören per fras, mörkt framför och bakom vågen.
    const hue = c.mixedSector(Math.floor(c.hueIdx / 16)) / 6;
    const body = Math.exp(-d * d * 0.9);
    const v = Math.min(1, (body > 0.1 ? body : 0) + crest * 0.7 + c.sectionEntry * 0.5);
    // Kammen PA ettan ska vara vitaktig - det ar effektens ide - men 0,9 gjorde varje takts etta nastan helt vit.
    // 0,45 later den lasas som en ljus kam i latens kulor i stallet for som en vit blixt.
    return c.hsv(hue, 1 - crest * 0.45, v);
  },
};
