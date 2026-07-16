import type { EffectDef } from "./types.js";

// Lugn: en långsam våg sköljer i PAR över riggen — en rumslig fade som vandrar
// sida till sida. Per-lampa frekvensband. Golv 30%.
export const tide: EffectDef = {
  key: "tide", label: "Tidvatten", tier: "lugn",
  desc: "En långsam våg sköljer fram och tillbaka i par.",
  render(c) {
    const wash = 0.5 + 0.5 * Math.sin(c.t * 0.9 - c.idx * 1.0 * c.phaseSpread);
    const pair = Math.floor(c.idx / 2);
    const hue = c.mixedSector(pair + c.mclk(8, 9) + Math.round(c.frame.centroid * 3)) / 6;   // + centroid → palett-läge
    const m = Math.min(1, 0.3 + wash * 0.55 + c.band * 0.3);   // per-lampa frekvensband
    return c.hsv(hue, 1, 0.3 + 0.7 * m);
  },
};
