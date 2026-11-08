import type { EffectDef } from "./types.js";
import { hsv } from "./color.js";
const FX_REN = process.env.DMX_FX_REN === '1';   // PROV 2026-11-08 (kontraktet B): effektens diodanpassning bort, output (RGB_STRICT) tar dioderna

// Lugn CALL-AND-RESPONSE: två grupper (varannan lampa) andas i MOTFAS — när grupp
// A stiger sjunker grupp B, som ett stilla anrop-och-svar. Grupp A varm ton,
// grupp B kall kontrastfärg. Golv 30%. Färgvandring var 8:e takt.
let twinSec = -1, twinPh = -1;   // vald klangsektor, fasens nummer
export const twin: EffectDef = {
  key: "twin", label: "Tvilling", tier: "lugn", modulate: { energy: true, pulse: false }, section: ["intro", "low"], toggle: true,
  desc: "Två grupper andas i motfas – varmt anrop, kallt svar.",
  render(c) {
    const even = c.group === 0;   // jamn/udda eller inre/yttre (c.grouping)
    // TAKTLAST VAXELSANG. Forut var detta en fri sinus med en halv periods
    // forskjutning mellan varannan lampa - alltsa samma vag som breathe och
    // aurora. Nu byter paren av VARANDRA pa taktrutnatet: ett par lyser upp
    // medan det andra tonar ner, och de skiftar var fjarde taktslag. Det gor
    // twin till en musikalisk fraga-och-svar i stallet for en vag, och den
    // hor darmed hemma i lugn utan att se ut som sina grannar.
    const vaxel = (c.mclk(4, 2) % 2 === 0) === even ? 1 : 0;   // vems tur ar det?
    const mjuk = 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, c.beatFrac * 2));   // mjuk overgang
    const wash = vaxel ? 0.35 + 0.65 * mjuk : 0.65 - 0.45 * mjuk;
    // KLANGEN MED HYSTERES (ladan 10-09, sidokanalfladder): Math.round(centroid*3) fladdrade med klangbruset -> kulorparet hoppade.
    // EFFEKTSVEPET 11-02 (ägaren: 'fixa direkt de effekterna'; effectDyn alla effekter pop+mega 5 min): 11,6 kulörhopp/min - kulörparet vandrade var 8:e slag och klangsektorn när som helst,
    // på tända lampor (diodblinket). Nu byts kulören (vandring + klang) bara när frasen byter (32 slag / 40 s utan takt).
    let pairBase: number;
    if (FX_REN) {   // FX_REN: kulörvandring var 8:e slag + klang med hysteres när som helst (före 11-02)
      const cs = c.frame.centroid * 3; if (twinSec < 0 || Math.abs(cs - twinSec) > 0.9) twinSec = Math.round(cs);
      pairBase = c.mixedSector(c.mclk(8, 10) + twinSec);
    } else {
      const ph = c.mclk(32, 40);
      if (ph !== twinPh || twinSec < 0) { twinPh = ph; twinSec = Math.round(c.frame.centroid * 3); }
      pairBase = c.mixedSector(ph + twinSec);
    }   // centroid → palett-läge (som breathe/aurora)
    const hue = ((even ? pairBase : pairBase + 3) % 6) / 6;
    // BASGANG (a8 11-07): vems tur avgör rutnätet, hur starkt basens kropp; annars band + punch-matta på alla
    return hsv(hue, 1, 0.08 + 0.92 * Math.min(1, wash * (0.3 + 0.7 * c.bassBody)));   // STANDARD 2026-11-08 (ladan 11-07: godkänt; backup-tagg backup/fore-tio-standard-20261108)
  },
};
