import type { EffectDef } from "./types.js";
import { hsv } from "./color.js";

// SIDOKEDJA (full x high, 2026-11-01): klubbens pumpande ljud som ljus - riggen lyser fullt i en kulör och KICKEN TRYCKER NER den;
// ljuset sväller tillbaka under slaget och är fullt igen strax före nästa kick. Ytterparet (motfärg) hämtar sig en kvarts slag efter
// mitten, så varje sväll rullar utåt. Kulören byts per fras. (pump i versen: lamporna hämtar sig i olika takt; här pumpar hela riggen.)
// GRANSKNINGEN 11-01: att trycka NER ljuset på kicken går inte i kedjan (uttoningen 0,25 s + minsta på-tid 150 ms, och energin är
// basen - den är som högst just på kicken), så mörkret hamnade mitt i slaget och toppen strax före kicken (takt 0,43, sprid 0,18).
// Nu delas pumpen på två lager: KICKEN är ytterparet (slår på varje slag, följer basen), PADDEN är mittparet i motfärg som trycks
// ner på ettan och trean och sväller tillbaka över två slag - utan energin (den skulle släcka padden mellan kickarna). Mitt/kant
// räknas på den fysiska lampan (c.lamp).
export const sidokedja: EffectDef = {
  key: "sidokedja", label: "Sidokedja", tier: "full", modulate: { energy: true, pulse: false }, section: ["high"], toggle: true,
  desc: "Kicken slår i ytterparet, mittens padd trycks ner och sväller tillbaka över två slag - klubbens pump.",
  render(c) {
    const f = c.hasBeat ? c.beatFrac : 1 - c.kickEnv;
    const n = Math.max(1, c.count), e = Math.min(c.lamp, n - 1 - c.lamp), mid = n > 2 && e >= (n - 1) / 4;
    const base = c.mixedSector(Math.floor(c.hueIdx / 16));
    if (!mid) return hsv(((base + 3) % 6) / 6, 1, f < 0.25 ? 1 : 0.04);   // kicken
    c.want.energy = false;                                                // padden: egen dynamik
    const x = Math.max(0, Math.min(1, ((c.beatIdx & 1) + f - 0.3) / 1.6));
    return hsv(base / 6, 1, 0.03 + 0.97 * x * x * (3 - 2 * x));          // trycks ner på 1 och 3, sväller till nästa
  },
};
