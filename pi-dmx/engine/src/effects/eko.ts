import type { EffectDef } from "./types.js";

// EKO: varje taktslag tänder första lampan, och slaget ekar vidare genom riggen
// med en fjärdedels taktslag mellan lamporna — som ett delay-pedal på ljuset.
// Ekot är TAKTLÅST, så fördröjningen krymper när låten går fortare och känns
// alltid rätt. Varje eko är svagare än det förra.
export const eko: EffectDef = {
  key: "eko", label: "Eko", tier: "fart",
  desc: "Taktslaget ekar genom riggen med taktlåst fördröjning, svagare för varje studs.",
  render(c) {
    const DELAY = 0.25;                                   // fjärdedels taktslag per lampa
    // Hur långt sedan DEN HÄR lampans eko slog till (i taktslag, 0..1).
    let age = c.beatFrac - c.idx * DELAY;
    if (age < 0) age += 1;                                // föregående slags eko
    const decay = Math.exp(-age / 0.18);                  // skarp attack, kort svans
    const damp = Math.pow(0.72, c.idx);                   // varje studs svagare
    const hue = c.mixedSector(Math.floor(c.beatIdx / 4) + c.idx) / 6;
    const v = decay * damp * (0.55 + c.audio * 0.45) + c.frame.spec.kick * 0.12;
    return c.hsv(hue, 1, Math.min(1, 0.04 + v + c.punch * 0.25));
  },
};
