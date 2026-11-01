import type { EffectDef } from "./types.js";
import { hsv } from "./color.js";

// SIDOKEDJA (full x high, 2026-11-01): klubbens pumpande ljud som ljus - riggen lyser fullt i en kulör och KICKEN TRYCKER NER den;
// ljuset sväller tillbaka under slaget och är fullt igen strax före nästa kick. Ytterparet (motfärg) hämtar sig en kvarts slag efter
// mitten, så varje sväll rullar utåt. Kulören byts per fras. (pump i versen: lamporna hämtar sig i olika takt; här pumpar hela riggen.)
export const sidokedja: EffectDef = {
  key: "sidokedja", label: "Sidokedja", tier: "full", modulate: { energy: true, pulse: false }, section: ["high"], toggle: true,
  desc: "Hela riggen lyser och trycks ner av varje kick, sväller tillbaka till nästa - klubbens pump.",
  render(c) {
    const f = c.hasBeat ? c.beatFrac : 1 - c.kickEnv;
    const n = Math.max(1, c.count), e = Math.min(c.idx, n - 1 - c.idx), mid = n > 2 ? e / ((n - 1) / 2) : 1;   // 0 kant .. 1 mitt
    const x = Math.max(0, Math.min(1, (f - 0.25 * (1 - mid)) / 0.6));   // ytterlamporna hämtar sig en kvarts slag senare
    const swell = x * x * (3 - 2 * x);
    const base = c.mixedSector(Math.floor(c.hueIdx / 16));
    const hue = ((mid >= 0.5 ? base : base + 3) % 6) / 6;
    return hsv(hue, 1, 0.04 + 0.96 * swell);
  },
};
