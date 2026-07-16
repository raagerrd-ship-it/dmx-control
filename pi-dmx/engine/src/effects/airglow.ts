import type { EffectDef } from "./types.js";

// Lugn: LUFT-GLÖD — riggen är nästan mörk med en svag, långsamt driftande blågrön
// glöd; varje cymbal-splash, shaker och sib-konsonant i sången (air 10–16 kHz)
// tänder en gnista, olika fas per lampa. Extremt musikalisk för akustiskt / jazz /
// ambient där alla andra lägen är för aggressiva. Utnyttjar air-bandet som gamla
// grova trebandet knappt såg. Färgtonen glider mot cyan när air är SUSTAINED
// (stråkar/pads), tillbaka mot grönt på rena transienter. (Lovable-idé.)
export const airglow: EffectDef = {
  key: "airglow", label: "Luft-glöd", tier: "lugn",
  desc: "Nästan mörkt; varje cymbal/shaker/väsljud tänder en gnista i kanten.",
  render(c) {
    const base = 0.12 + 0.08 * Math.sin(c.t * 0.3 + c.idx * 1.7);   // svag drift-glöd
    const spark = c.shaped(0, c.frame.onset.air) * 0.9;            // gnista på luft-anslag
    const hue = 0.40 + c.frame.spec.air * 0.10;                    // grön → cyan när air sustained
    return c.hsv(hue, 1, Math.min(1, base + spark));
  },
};
