import type { EffectDef } from "./types.js";

// Lugn CALL-AND-RESPONSE: två grupper (varannan lampa) andas i MOTFAS — när grupp
// A stiger sjunker grupp B, som ett stilla anrop-och-svar. Grupp A varm ton,
// grupp B kall kontrastfärg. Golv 30%. Färgvandring var 8:e takt.
export const twin: EffectDef = {
  key: "twin", label: "Tvilling", tier: "lugn",
  desc: "Två grupper andas i motfas – varmt anrop, kallt svar.",
  render(c) {
    const even = c.idx % 2 === 0;
    // TAKTLAST VAXELSANG. Forut var detta en fri sinus med en halv periods
    // forskjutning mellan varannan lampa - alltsa samma vag som breathe och
    // aurora. Nu byter paren av VARANDRA pa taktrutnatet: ett par lyser upp
    // medan det andra tonar ner, och de skiftar var fjarde taktslag. Det gor
    // twin till en musikalisk fraga-och-svar i stallet for en vag, och den
    // hor darmed hemma i lugn utan att se ut som sina grannar.
    const vaxel = (c.mclk(4, 2) % 2 === 0) === even ? 1 : 0;   // vems tur ar det?
    const mjuk = 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, c.beatFrac * 2));   // mjuk overgang
    const wash = vaxel ? 0.35 + 0.65 * mjuk : 0.65 - 0.45 * mjuk;
    const pairBase = c.mixedSector(c.mclk(8, 10) + Math.round(c.frame.centroid * 3));   // centroid → palett-läge (som breathe/aurora)
    const hue = ((even ? pairBase : pairBase + 3) % 6) / 6;
    const m = Math.min(1, wash * 0.7 + c.band * 0.3 + c.punch * 0.2);   // + dunk-svall
    return c.hsv(hue, 1, 0.3 + 0.7 * m);
  },
};
