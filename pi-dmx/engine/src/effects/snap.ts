import type { EffectDef } from "./types.js";

// Full fart: UNISONT FÄRGSLAG — alla lampor SAMMA färg, KONSTANT ljus (ingen
// pump), hård kapning till en NY färg exakt på taktslaget. Läser som en
// färg-slideshow i takt; snabb fade ger färgsläp i själva kapet. Motsats till
// party (mörk throb) och rave (spatial växling).
export const snap: EffectDef = {
  key: "snap", label: "Snap", tier: "full",
  desc: "Alla lampor byter färg blixtsnabbt på varje slag.",
  render(c) {
    const hue = c.mixedSector(c.beatIdx) / 6;
    const v = Math.min(1, 0.9 + c.audio * 0.1);
    return c.hsv(hue, 1, v);
  },
};
