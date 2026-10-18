import type { EffectDef } from "./types.js";
import { hsv } from "./color.js";

// PINGPONG (build, 2026-10-11): yttre och inre paret (c.group via grupperingen) turas om - ett par per slag, efter fyra takter två
// gånger per slag. Paret som har tur slår fullt, det andra är släckt. Ljuset stiger med tiden. En kulör per fras, paren i motfärg.
export const pingpong: EffectDef = {
  key: "pingpong", label: "Pingpong", tier: "fart", modulate: { energy: true, pulse: false }, section: ["build"], toggle: true,
  desc: "Uppbyggnad: yttre och inre paret turas om på slaget, dubbel fart efter fyra takter.",
  render(c) {
    const bpm = c.cfg.beat?.bpm ?? 0; const beatS = bpm > 0 ? 60 / bpm : 0.5;
    const p = c.buildUp;   // uppbyggnadens förlopp 0..1 (32 slag från builden start, 10-11 22:05)
    const rate = 1;   // var 2 efter halva uppbyggnaden (ägaren 10-12: 'inte kännas som en strobe' - aldrig snabbare än takten)
    const step = Math.floor(c.beatIdx * rate + c.beatFrac * rate);
    const turn = (step & 1) === c.group;
    const hit = Math.exp(-((c.beatFrac * rate) % 1) / 0.2);
    const ramp = Math.min(1, 0.55 + 0.45 * p);
    const base = c.mixedSector(Math.floor(c.hueIdx / 16));
    const hue = ((c.group ? base + 3 : base) % 6) / 6;
    return hsv(hue, 1, turn ? Math.min(1, ramp * (0.6 + 0.4 * hit)) : 0);
  },
};
