import type { EffectDef } from "./types.js";

// Full fart: SAMPLE-AND-HOLD — på VARJE taktslag snäpper varje lampa till en NY
// palettfärg och HÅLLER den stenlåst hela takten; ljusstyrkan pulsar lätt på
// slaget. En chunkig, självsäker färg-slideshow som OMFAMNAR PAR-lampornas
// diskreta färger. (Snap = alla samma färg, konstant ljus; party = mörk throb;
// detta = varje lampa sin egen HÅLLNA färg som gungar mjukt.)
export const jump: EffectDef = {
  key: "jump", label: "Hopp", tier: "full",
  desc: "Varje lampa snäpper ny färg på varje slag och håller den – gungar mjukt.",
  render(c) {
    const hue = c.mixedSector(c.beatIdx * 3 + c.idx * 2) / 6;   // ny färg per lampa, ny per takt, hålls
    const v = 0.5 + 0.5 * Math.min(1, c.beatPulse * 0.7 + c.audio * 0.3);   // ljust, gungar (throbbar ej mörkt)
    return c.hsv(hue, 1, v);
  },
};
