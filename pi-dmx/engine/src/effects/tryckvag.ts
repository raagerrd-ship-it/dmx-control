import type { EffectDef } from "./types.js";
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
  desc: "Varje slag tänder allt, kanterna dör fort och mitten bär basen - ljuset dras ihop mot mitten.",
  render(c) {
    const f = c.hasBeat ? c.beatFrac : 1 - c.kickEnv;
    const n = Math.max(1, c.count), e = Math.min(c.lamp, n - 1 - c.lamp), mid = n > 2 && e >= (n - 1) / 4;   // mittparet / kanterna
    const base = c.mixedSector(Math.floor(c.hueIdx / 16));
    const hue = ((mid ? base : base + 3) % 6) / 6;
    // (vita kärnan borttagen 11-01 kväll: vitt i ~100 ms tände den släckta dioden - 'R och G lyser men B bara blinkar till')
    // BASGANG (a8 11-07): kanterna slår VÄXELVIS (vänster jämna slag, höger udda; den andra klingar ut från sitt förra slag) och mitten bär
    // basens kropp (bassBody) i stället för drum.bass (som höll mitten tänd nästan jämnt: ljusast av alla looks och sämst mot basen, r -0,12..0,22)
    if (!mid) { const mySide = (c.lamp < n / 2 ? 0 : 1) === (((c.beatIdx % 2) + 2) % 2); return hsv(hue, 1, 0.05 + 0.95 * soft(mySide ? f : f + 1, 0.12, 0.3)); }   // STANDARD 2026-11-08 (ladan 11-07: godkänt; backup-tagg backup/fore-tio-standard-20261108)
    c.want.energy = false;                                                    // mitten: basen själv (energin följer kicken)
    return hsv(hue, 1, 0.12 + 0.88 * c.bassBody * c.bassBody);
  },
};
