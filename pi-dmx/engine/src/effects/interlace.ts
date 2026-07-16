import type { EffectDef } from "./types.js";

// Fart: RYTMISK FLÄTNING — udda och jämna lampor flätas i ett alternerande
// taktdelnings-mönster (som rave/flip), MEN upplösningen styrs av diskanten:
// lugnt parti = stabila 4-delar, när hi-hats/shakers piskar på (spec.treble högt)
// dubblas den automatiskt till piskande 8-delar i perfekt taktsynk. Inaktiva
// lampor glöder svagt i bakgrundstonen, gatat av air-svansar. (Gemini-idé — den
// diskant-adaptiva takt-upplösningen är det som skiljer den från rave/flip/gallop.)
export const interlace: EffectDef = {
  key: "interlace", label: "Fläta", tier: "fart",
  desc: "Udda/jämna lampor jagar varandra i taktdelar vars upplösning fördubblas när diskanten ökar.",
  render(c) {
    const subdivisions = c.frame.spec.treble > 0.45 ? 8 : 4;          // diskant → snabbare
    const step = Math.floor(c.beatFrac * subdivisions);
    const isEven = c.idx % 2 === 0;
    const isActive = isEven ? step % 2 === 0 : step % 2 === 1;        // interlace-mönster
    const activeHue = isEven ? c.mixedSector(2) / 6 : c.mixedSector(5) / 6;
    const bgHue = c.mixedSector(0) / 6;
    if (isActive) return c.hsv(activeHue, 0.95, c.shaped(0.4, c.frame.spec.mid));
    return c.hsv(bgHue, 0.85, c.frame.spec.air * 0.12);              // svag bakgrund + luft-svans
  },
};
