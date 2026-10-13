import type { EffectDef } from "./types.js";

// Lugn: LUFT-GLÖD — riggen är nästan mörk med en svag, långsamt driftande blågrön
// glöd; varje cymbal-splash, shaker och sib-konsonant i sången (air 10–16 kHz)
// tänder en gnista, olika fas per lampa. Extremt musikalisk för akustiskt / jazz /
// ambient där alla andra lägen är för aggressiva. Utnyttjar air-bandet som gamla
// grova trebandet knappt såg. Färgtonen glider mot cyan när air är SUSTAINED
// (stråkar/pads), tillbaka mot grönt på rena transienter. (Lovable-idé.)
export const airglow: EffectDef = {
  key: "airglow", label: "Luft-glöd", tier: "lugn", modulate: { energy: true, pulse: false }, section: ["intro", "break"],
  desc: "Nästan mörkt; varje cymbal/shaker/väsljud tänder en gnista i kanten.",
  flat: true,   // statiskt svep → kortare dwell
  render(c) {
    // 10-13 (effectDyn: spridning 0,27 - vilo-glöden 0,20 lyftes av motorns grundnivå (FX_FLOOR) till nästan fullt, så 'nästan mörkt'
    // var halvljust; råa onset-spikar (en hop lång) fladdrade): glöden 0,01-0,03, gnistorna från de mjukade enveloperna (trebleEnv/airEnv).
    const base = 0.01 + 0.02 * (0.5 + 0.5 * Math.sin(c.t * 0.3 + c.idx * 1.7));   // svag vilo-glöd
    // GNISTOR I TVA GRUPPER (2026-09-27): hi-hat/shaker (onset.treble) tander grupp 0, luften/vasljuden (onset.air) grupp 1
    // (jamn/udda eller inre/yttre via c.grouping). Forut fick alla fyra lampor SAMMA gnista (onset ar rigg-globalt) -> ingen
    // rorelse mellan lamporna alls, bara ett unisont flimmer.
    const own = c.group === 0 ? c.trebleEnv : c.airEnv;
    const other = c.group === 0 ? c.airEnv : c.trebleEnv;
    const spark = c.shaped(0, Math.max(own, other * 0.35)) * 0.95;                 // egen rost fullt, den andra svagt
    const hue = 0.40 + c.frame.spec.air * 0.10;                    // grön → cyan när air sustained
    return c.hsv(hue, 1, Math.min(1, base * c.heart(0.3) + spark));   // glöden pulsar med hjartat, gnistorna ororda (09-27)
  },
};
