import type { EffectDef } from "./types.js";
import { vaxel } from "./rig.js";
import { hsv, soft } from "./color.js";


// TRYCKVÅG (full x high, 2026-11-01): varje slag tänder hela riggen; kanterna slocknar fort, mitten bär basen längre - tyngden
// samlas i mitten och slaget ser ut att dra ihop sig mot den. Kanterna i motfärg, vit kärna i mitten på taktens etta.
// (ripple: slaget slår ner i mitten och rullar UT; tryckvågen: allt slår, sedan dras ljuset IN.)
// GRANSKNINGEN 11-01: mitt/kant räknas på den FYSISKA lampan (c.lamp; c.idx växlar ordning och gjorde 'mitten' till varannan lampa
// halva tiden), och kantens smäll är en platå 0,2 slag i stället för exp(-f/0,1) - energin (basen) kommer ~0,1 slag efter effektens
// klocka, så den snabba toppen var redan borta och kanterna slog bara till ~20 %. Mitten går förbi energin (som följer kicken och
// släckte mitten lika fort som kanterna) och bär i stället basgången själv (drum.bass) mellan smällarna. Frasens etta: kärnan vit i
// hela riggen.
export const tryckvag: EffectDef = {
  key: "tryckvag", label: "Tryckvåg", tier: "full", modulate: { energy: true, pulse: false }, section: ["high"], toggle: true,
  desc: "Varje slag sveper ett tryck lampa för lampa över riggen, åt höger på 1 och 4, åt vänster på 2 och 3.",
  render(c) {
    // ÄGAREN 11-22 "alla 8 egna": trycket sveper lampa för lampa över riggen på varje slag, Par 1 -> 8 på slag 1 och 4, 8 -> 1 på 2 och 3 (växeln)
    const f = c.hasBeat ? c.beatFrac : 1 - c.kickEnv;
    const n = Math.max(1, c.count), p = vaxel(c.beatIdx) === 0 ? c.lamp : n - 1 - c.lamp, at = n > 1 ? 0.5 * p / (n - 1) : 0;   // fronten når lampan efter halva slaget som mest
    const hue = ((c.mixedSector(Math.floor(c.hueIdx / 16)) + (p === 0 ? 0 : 3)) % 6) / 6;   // första lampan i grundfärg, resten i motfärg
    return hsv(hue, 1, 0.05 + 0.95 * soft(f >= at ? f - at : f + 1 - at, 0.06, 0.18));
  },
};
