import type { EffectDef } from "./types.js";

// Lugn: SUB-ANDNING — hela riggen andas gemensamt med den DJUPASTE sub-basen
// (20–60 Hz) i en monokrom djup färg (palettens basfärg). När luftiga element
// (air 10–16 kHz: vispar, cymbaler, ljusa pads) smyger in skiftar YTTERLAMPORNA
// mot iskallt vitt → rummet andas i botten men glittrar i taket. Hypnotiskt för
// breakdowns / deep house. Bygger på sub- och air-banden som 512:an aldrig såg.
// (Gemini-idé, anpassad.)
export const subbreath: EffectDef = {
  key: "subbreath", label: "Sub-andning", tier: "lugn",
  desc: "Djup sub-bas-andning med krispigt luft-skimmer i kanterna.",
  render(c) {
    const base = Math.min(1, 0.3 + 0.7 * c.shaped(0.1, c.frame.spec.sub) + c.punch * 0.2);   // sub-andning + dunk-svall
    const hue = c.mixedSector(0) / 6;                            // palettens djupa basfärg
    const air = c.frame.spec.air;
    const isOuter = c.count < 3 ? c.idx % 2 === 0 : (c.idx === 0 || c.idx === c.count - 1);
    if (isOuter && air > 0.3) {
      const blend = Math.min(1, (air - 0.3) / 0.7);
      // Skifta mot iskallt: sänk mättnad (mot vitt) + lyft ljus lite.
      return c.hsv(hue, 1 - blend * 0.7, Math.min(1, base + blend * 0.3));
    }
    return c.hsv(hue, 1, base);
  },
};
