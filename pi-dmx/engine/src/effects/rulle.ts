import type { EffectDef } from "./types.js";

// RULLE (full x uppbyggnad, situationsrutnätet 2026-10-12 - rutan var tom): en fullfartslåts uppbyggnad som en trumvirvel över
// riggen. Varje lampa blinkar på sin egen del av slaget (förskjuten 1/n), så blinkarna rullar runt; 2 blinkar per slag och lampa,
// 3 efter halva uppbyggnaden. Ljuset stiger med förloppet (c.buildUp). Aldrig alla samtidigt (ingen synkron strobe).
export const rulle: EffectDef = {
  key: "rulle", label: "Rulle", tier: "full", modulate: { energy: true, pulse: false }, section: ["build"], fastLight: true,
  desc: "Uppbyggnad i full fart: blinkar rullar runt riggen, tätare och ljusare mot dropen.",
  render(c) {
    const n = Math.max(1, c.count), p = c.buildUp;
    const rate = p >= 0.5 ? 3 : 2;
    const ph = (c.beatFrac * rate + c.idx / n) % 1;
    const flash = Math.exp(-ph / 0.12);
    c.want.hazer = 0.3 + 0.5 * p;
    const hue = c.mixedSector(Math.floor(c.hueIdx / 16)) / 6;
    return c.hsv(hue, 1, Math.min(1, (0.15 + 0.85 * flash) * (0.5 + 0.5 * p)));
  },
};
