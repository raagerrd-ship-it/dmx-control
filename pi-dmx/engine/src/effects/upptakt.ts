import type { EffectDef } from "./types.js";

// UPPTAKT (build, 2026-10-11, ägaren i ladan: "uppbyggnad ... där är vi inte bra" + "95 % på en lampa i taget som hoppar runt,
// ytter inner, loops"): EN lampa i taget pendlar över riggen (0-1-2-3-2-1) i takt och FÖRDUBBLAR farten efter fyra takter (1 -> 2 steg/slag;
// 4 smetades ut av uttoningen, ägaren 10-11) medan ljuset stiger. Övriga lampor nästan släckta. Med förutsedd refräng (expectHighInMs)
// går den till full fart de sista 8 slagen. En kulör (palettens, per fras). fastLight: stegen är kortare än minsta på-tiden.
// Varje lampa blinkar högst ~2 ggr/s även på högsta farten (stegen går runt riggen) - aldrig hela riggen synkront.
let startT = -1, lastT = -1;
export const upptakt: EffectDef = {
  key: "upptakt", label: "Upptakt", tier: "fart", modulate: { energy: true, pulse: false }, section: ["build"], toggle: true, fastLight: true,
  desc: "Uppbyggnad: en lampa i taget pendlar i takt och dubblar farten var fjärde takt medan ljuset stiger.",
  drives: ["hazer"],
  render(c) {
    if (lastT < 0 || c.t - lastT > 1) startT = c.t;   // ny gång looken visas -> farten börjar om
    lastT = c.t;
    const bpm = c.cfg.beat?.bpm ?? 0; const beatS = bpm > 0 ? 60 / bpm : 0.5;
    const beats = (c.t - startT) / beatS;
    const nearHigh = c.expectHighInMs > 0 && c.expectHighInMs < 8 * beatS * 1000;
    const rate = nearHigh || beats >= 16 ? 2 : 1;   // 10-11 ägaren: på 4 steg/slag smetade uttoningen ut pendeln -> alla lampor lika. Max 2.
    const n = Math.max(1, c.count), seq = n > 2 ? 2 * n - 2 : n;   // pendel 0..n-1..1
    const s = Math.floor(c.beatIdx * rate + c.beatFrac * rate) % seq;
    const pos = s < n ? s : seq - s;
    const ramp = Math.min(1, 0.55 + 0.45 * beats / 32);
    c.want.hazer = 0.2 + 0.6 * Math.min(1, beats / 32);
    const hue = c.mixedSector(Math.floor(c.hueIdx / 16)) / 6;
    if (c.idx === pos) return c.hsv(hue, 1, 0.95 * ramp);
    return c.hsv(hue, 1, 0);   // övriga SLÄCKTA (6 % syntes som ~17 % efter gamma/tändpunkt)
  },
};
