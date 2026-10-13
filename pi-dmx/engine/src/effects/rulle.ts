import type { EffectDef } from "./types.js";

// RULLE (full x uppbyggnad, situationsrutnätet 2026-10-12 - rutan var tom): en fullfartslåts uppbyggnad som en trumvirvel över
// riggen. Varje lampa blinkar på sin egen del av slaget (förskjuten 1/n), så blinkarna rullar runt; 1 blink per slag och lampa,
// 2 i sista tredjedelen av uppbyggnaden. Ljuset stiger med förloppet (c.buildUp). Aldrig alla samtidigt (ingen synkron strobe).
export const rulle: EffectDef = {
  key: "rulle", label: "Rulle", tier: "full", modulate: { energy: true, pulse: false }, section: ["build"],
  desc: "Uppbyggnad i full fart: blinkar rullar runt riggen, tätare och ljusare mot dropen.",
  render(c) {
    const n = Math.max(1, c.count), p = c.buildUp;
    const rate = 1;   // var 2 sista tredjedelen (ägaren 10-12: 'inte kännas som en strobe' - aldrig snabbare än takten)   // 2/3 -> 1/2 per slag och lampa (ladan 10-12: 'kändes som trippel takt' - 4 lampor x 2 = 8 blinkar per slag)
    const ph = (c.beatFrac * rate + (c.idx % 2) * 0.5) % 1;   // två grupper på slag och efterslag i stället för 1/n (4 blinkar per slag kändes som strobe)
    const flash = Math.exp(-ph / 0.12);
    c.want.hazer = 0.3 + 0.5 * p;
    const hue = c.mixedSector(Math.floor(c.hueIdx / 16)) / 6;
    // 10-13 (effectDyn: spridning 0,19 - golvet 0,15 lyftes av motorns grundnivå till nästan fullt, så grupperna syntes inte turas om):
    // mörkt mellan blinkarna, blinken klingar av till svart.
    return c.hsv(hue, 1, Math.min(1, (flash > 0.08 ? flash : 0) * (0.5 + 0.5 * p)));
  },
};
