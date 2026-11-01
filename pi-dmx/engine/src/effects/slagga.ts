import type { EffectDef } from "./types.js";
import { hsv } from "./color.js";

// SLÄGGA (full x high, 2026-11-01, ägaren: 'fler effekter som uppfyller refräng/drop-kriterierna - tydlig basgång/takt'): varje slag
// slår ner i hela riggen; släggan själv - en VIT smäll - träffar en ny lampa per slag (vandrar runt riggen) medan de andra slår i
// palettens kulör, och allt glöder ut på basen mot nästa slag. Taktens etta: släggan träffar hela riggen. Varannan lampa i motfärg.
// (backbeat: vitt på virveln; party: kulör på slaget, en lampa vilar - släggan: vitt som vandrar på varje slag.)
export const slagga: EffectDef = {
  key: "slagga", label: "Slägga", tier: "full", modulate: { energy: true, pulse: false }, section: ["high"], toggle: true,
  desc: "Varje slag är en vit smäll i hela riggen som färgas och glöder ut till nästa slag.",
  render(c) {
    const f = c.hasBeat ? c.beatFrac : 1 - c.kickEnv;
    const n = Math.max(1, c.count), ett = (c.beatIdx & 3) === 0;
    const hit = ett || c.idx === ((c.beatIdx % n) + n) % n;           // släggans lampa (ettan: alla)
    const white = hit ? Math.exp(-f / (ett ? 0.1 : 0.08)) : 0;        // vit smäll
    const glow = Math.exp(-f / 0.35);                                 // kulören glöder ut mot nästa slag
    const base = c.mixedSector(Math.floor(c.hueIdx / 16));
    const hue = ((c.group === 0 ? base : base + 3) % 6) / 6;
    return hsv(hue, 1 - white, Math.min(1, 0.08 + 0.7 * glow + white));
  },
};
