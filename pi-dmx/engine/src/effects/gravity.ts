import type { EffectDef } from "./types.js";

// Full fart: GRAVITATIONS-VU — ljudet KNUFFAR upp en nivå som sen FALLER med
// gravitation; lamporna fylls vänster→höger upp till nivån → fysisk tyngd, inte
// en rå följare. En PEAK-PRICK i kontrastfärg håller senaste toppen och sjunker
// långsamt (minnet av den hårdaste smällen). Motorn räknar fysiken; effekten
// ritar bara stapeln + pricken. (WLED "Gravcenter"-mekaniken, anpassad för 4 PAR.)
export const gravity: EffectDef = {
  key: "gravity", label: "Gravitation", tier: "full",
  desc: "Ljudet lyfter en nivå som faller med tyngd; en peak-prick hänger kvar.",
  render(c) {
    const n = Math.max(1, c.count);
    const fill = Math.max(0, Math.min(1, (c.gravLevel - c.idx / n) * n));   // hur mkt av lampan under nivån
    const peakLamp = Math.min(n - 1, Math.floor(c.gravPeak * n));
    if (c.idx === peakLamp && c.gravPeak > 0.03) {
      const peakHue = ((c.mixedSector(Math.floor(c.beatIdx / 8)) + 3) % 6) / 6;   // peak i kontrastfärg
      return c.hsv(peakHue, 1, 1);
    }
    const base = c.mixedSector(Math.floor(c.beatIdx / 8)) / 6;               // lugn färgvandring
    return c.hsv(base, 1, 0.05 + 0.95 * fill);
  },
};
