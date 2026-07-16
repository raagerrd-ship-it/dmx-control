import type { EffectDef } from "./types.js";

// Lugn: alla lampor andas TILLSAMMANS medan färgen vandrar runt hjulet — ett
// mjukt skimmer. Varje lampa reagerar dessutom på SITT frekvensband
// (bas/mellan/diskant) → ett dämpat spatialt spektrum. Golv 30%.
export const cycle: EffectDef = {
  key: "cycle", label: "Cykel", tier: "lugn",
  desc: "Alla lampor andas i takt medan färgen sakta vandrar runt.",
  render(c) {
    // Centroid (mörk/bastung=0 .. ljus/diskant=1) förskjuter palettvalet → tung
    // musik håller lamporna i djupa bas-färger, ljus synth/sång roterar mot varma.
    const hue = c.mixedSector(c.mclk(8, 6) + Math.round(c.frame.centroid * 5)) / 6;
    const shimmer = 0.5 + 0.5 * Math.sin(c.t * 0.9 + c.idx * 1.4 * c.phaseSpread);
    const m = Math.min(1, 0.35 + shimmer * 0.4 + c.band * 0.35);
    return c.hsv(hue, 1, 0.3 + 0.7 * m);
  },
};
