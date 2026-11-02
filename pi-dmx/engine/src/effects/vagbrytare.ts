import type { EffectDef } from "./types.js";
import { hsv, soft } from "./color.js";
import { slotSize } from "./rig.js";

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
    const d = Math.abs(c.idx - head) / slotSize(c.count);   // hyrkitet: vågen lika bred på 8 som på 4
    // MJUK PULS (11-02, ägaren i ladan 11-01: refrängeffekterna 'väldigt AV/PÅ'): vågen sväller mjukt på varje slag och kammen på
    // ettan stiger och klingar (soft) i kulör i stället för att slå på direkt med vitt (diodblinket).
    const f = c.hasBeat ? c.beatFrac : 1 - c.kickEnv;
    const crest = inBar === 0 ? 0.6 * soft(f, 0.12, 0.45) : 0;      // ettan: kam över hela riggen
    // EFFEKTGENOMGÅNGEN 10-13 (effectDyn: 29,7 kulörhopp/min - kulören byttes varje takt; c.audio/punch/beatPulse som NIVÅ
    // dubbelmodulerade mot basenergin och 0,08-golvet lyftes av motorns grundnivå): kulören per fras, mörkt framför och bakom vågen.
    const hue = c.mixedSector(Math.floor(c.hueIdx / 16)) / 6;
    const body = Math.max(0, Math.exp(-d * d * 0.9) - 0.1) / 0.9;
    const v = Math.min(1, body * (0.55 + 0.45 * soft(f, 0.12, 0.4)) + crest + c.sectionEntry * 0.5);
    return hsv(hue, 1, v);
  },
};
