import type { EffectDef } from "./types.js";

// PINGPONG (build, 2026-10-11): yttre och inre paret (c.group via grupperingen) turas om - ett par per slag, efter fyra takter två
// gånger per slag. Paret som har tur slår fullt, det andra är släckt. Ljuset stiger med tiden. En kulör per fras, paren i motfärg.
let startT = -1, lastT = -1;
export const pingpong: EffectDef = {
  key: "pingpong", label: "Pingpong", tier: "fart", modulate: { energy: true, pulse: false }, section: ["build"], toggle: true,
  desc: "Uppbyggnad: yttre och inre paret turas om på slaget, dubbel fart efter fyra takter.",
  render(c) {
    if (lastT < 0 || c.t - lastT > 1) startT = c.t;
    lastT = c.t;
    const bpm = c.cfg.beat?.bpm ?? 0; const beatS = bpm > 0 ? 60 / bpm : 0.5;
    const beats = (c.t - startT) / beatS;
    const rate = beats >= 16 || (c.expectHighInMs > 0 && c.expectHighInMs < 8 * beatS * 1000) ? 2 : 1;
    const step = Math.floor(c.beatIdx * rate + c.beatFrac * rate);
    const turn = (step & 1) === c.group;
    const hit = Math.exp(-((c.beatFrac * rate) % 1) / 0.2);
    const ramp = Math.min(1, 0.55 + 0.45 * beats / 32);
    const base = c.mixedSector(Math.floor(c.hueIdx / 16));
    const hue = ((c.group ? base + 3 : base) % 6) / 6;
    return c.hsv(hue, 1, turn ? Math.min(1, ramp * (0.6 + 0.4 * hit)) : 0);
  },
};
