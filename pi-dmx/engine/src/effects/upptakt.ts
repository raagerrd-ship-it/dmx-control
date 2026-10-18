import type { EffectDef } from "./types.js";
import { hsv } from "./color.js";

// UPPTAKT (build, 2026-10-11, ägaren i ladan: "uppbyggnad ... där är vi inte bra" + "95 % på en lampa i taget som hoppar runt,
// ytter inner, loops"): EN lampa i taget pendlar över riggen (0-1-2-3-2-1) i takt och FÖRDUBBLAR farten efter fyra takter (1 -> 2 steg/slag;
// 4 smetades ut av uttoningen, ägaren 10-11) medan ljuset stiger. Övriga lampor nästan släckta. Med förutsedd refräng (expectHighInMs)
// går den till full fart de sista 8 slagen. En kulör (palettens, per fras). fastLight: stegen är kortare än minsta på-tiden.
// Varje lampa blinkar högst ~2 ggr/s även på högsta farten (stegen går runt riggen) - aldrig hela riggen synkront.
export const upptakt: EffectDef = {
  key: "upptakt", label: "Upptakt", tier: "fart", modulate: { energy: true, pulse: false }, section: ["build"], toggle: true,
  desc: "Uppbyggnad: en lampa i taget pendlar i takt och dubblar farten var fjärde takt medan ljuset stiger.",
  drives: ["hazer"],
  render(c) {
    const bpm = c.cfg.beat?.bpm ?? 0; const beatS = bpm > 0 ? 60 / bpm : 0.5;
    const p = c.buildUp;   // uppbyggnadens förlopp 0..1 (32 slag från builden start, 10-11 22:05)
    const nearHigh = c.expectHighInMs > 0 && c.expectHighInMs < 8 * beatS * 1000;
    const rate = 1;   // var 2 nära refrängen (ägaren 10-12: 'inte kännas som en strobe' - aldrig snabbare än takten); void nearHigh   // 10-11 ägaren: på 4 steg/slag smetade uttoningen ut pendeln -> alla lampor lika. Max 2.
    const n = Math.max(1, c.count), seq = n > 2 ? 2 * n - 2 : n;   // pendel 0..n-1..1
    const s = Math.floor(c.beatIdx * rate + c.beatFrac * rate) % seq;
    const pos = s < n ? s : seq - s;
    const ramp = Math.min(1, 0.55 + 0.45 * p);
    c.want.hazer = 0.2 + 0.6 * p;
    const hue = c.mixedSector(Math.floor(c.hueIdx / 16)) / 6;
    if (c.idx === pos) return hsv(hue, 1, 0.95 * ramp);
    return hsv(hue, 1, 0);   // övriga SLÄCKTA (6 % syntes som ~17 % efter gamma/tändpunkt)
  },
};
