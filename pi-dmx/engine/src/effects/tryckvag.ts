import type { EffectDef } from "./types.js";
import { hsv } from "./color.js";

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
  desc: "Varje slag tänder allt, kanterna dör fort och mitten bär basen - ljuset dras ihop mot mitten.",
  render(c) {
    const f = c.hasBeat ? c.beatFrac : 1 - c.kickEnv;
    const n = Math.max(1, c.count), e = Math.min(c.lamp, n - 1 - c.lamp), mid = n > 2 && e >= (n - 1) / 4;   // mittparet / kanterna
    const base = c.mixedSector(Math.floor(c.hueIdx / 16));
    const hue = ((mid ? base : base + 3) % 6) / 6;
    const core = f < 0.2 && ((c.beatIdx & 15) === 0 || (mid && (c.beatIdx & 3) === 0));   // vit kärna: ettan i mitten, frasens etta överallt
    if (!mid) return hsv(hue, core ? 0 : 1, f < 0.2 ? 1 : 0);                 // kanterna: smällen, sedan släckt
    c.want.energy = false;                                                    // mitten: basen själv (energin följer kicken)
    return hsv(hue, core ? 0 : 1, f < 0.2 ? 1 : 0.3 + 0.7 * c.drum.bass);
  },
};
