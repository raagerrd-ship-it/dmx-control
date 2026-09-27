import type { EffectDef } from "./types.js";

// TRUM-KIT: varje lampa är en trumröst som PUNCHAR på sitt eget anslag och
// slocknar snabbt — inte en jämn EQ-mätare utan diskreta trumslag. Motorn ger
// oss färdiga onset-envelopes (c.drum): kick = sub-transient, snare = mellan-
// onset, hat = diskant-onset, bass = sustained lågfrekvens.
//
// 4 lampor = klassiskt kit: [0] kick (röd dunk) · [1] snare (vit crack) ·
// [2] hi-hat (isig tick) · [3] bas (magenta pump). Färre/fler lampor cyklar
// rösterna (idx % 4); en enda lampa spelar hela kittet mixat.
//
// Litet golv så mörkret mellan slagen inte är stendött, resten = envelopen.
// (Motorn kör drumkit i fast-mode → kort ballistik-decay, så hi-hats tickar
//  skarpt i stället för att smetas ut.)
export const drumkit: EffectDef = {
  key: "drumkit", label: "Trumkit", tier: "full", section: ["high"],
  desc: "Varje lampa = en trumröst (kick/snare/hi-hat/bas) som punchar på sitt eget anslag.",
  render(c) {
    const d = c.drum;
    const hit = (env: number, floor: number): number => floor + (1 - floor) * Math.min(1, env);
    const voice = c.count > 1 ? c.idx % 4 : -1;
    switch (voice) {
      case 0: return c.hsv(0.01, 1.00, hit(d.kick, 0.05));   // KICK  → röd dunk
      case 1: return c.hsv(0.09, 0.20, hit(d.snare, 0.04));  // SNARE → varm-vit crack
      // HI-HAT: sat 0,35 snapptes till VITT av hsv (< 0,5 = vitt) -> lampa 1 och 2 var bada vita. Nu >= 0,5 = cyan, skild fran virveln.
      case 2: return c.hsv(0.53, 0.60, hit(d.hat, 0.02));    // HI-HAT→ isig cyan tick
      // BAS: drum.bass ar SUSTAINED -> lampa 3 lyste konstant magenta medan de andra punchade (agaren 09-27: "en lampa som
      // lyser konstant medan de andra kor"). Nu pumpar mattan med hjartat sa aven bas-lampan slar i takten.
      case 3: return c.hsv(0.83, 1.00, hit(d.bass * c.heart(0.6), 0.06));   // BAS   → magenta pump i takten
      default: {
        // Enda lampa: hela kittet i en. Kick+bas driver rött, hi-haten lägger
        // en ljus gnista; snyggast dominant-röst bestämmer färgtonen.
        const v = Math.min(1, d.kick + d.bass * 0.6 + d.snare * 0.5 + d.hat * 0.4);
        const hue = d.hat > Math.max(d.kick, d.bass) ? 0.53 : 0.02;
        return c.hsv(hue, 0.8, 0.05 + 0.95 * v);
      }
    }
  },
};
