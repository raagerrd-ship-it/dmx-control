import type { EffectDef } from "./types.js";
import { hsv } from "./color.js";

// TRATT (full x uppbyggnad, situationsrutnätet 2026-10-12 - syskon rulle/siren/hiss): uppbyggnaden trängs ihop. Ytterlamporna
// slocknar med förloppet (c.buildUp) så ljuset trycks in mot mitten, och de lampor som är kvar slår på kicken (c.kickEnv) - först
// på slaget, efter halva uppbyggnaden på åttondelar där mittparet turas om (aldrig synkront). Nedräkning tänder allt på åttan;
// tratt släpper aldrig ut ljuset förrän dropen.
export const tratt: EffectDef = {
  key: "tratt", label: "Tratt", tier: "full", modulate: { energy: true, pulse: false }, section: ["build"],
  desc: "Uppbyggnad i full fart: kanterna slocknar, ljuset trycks in i mitten och slår allt tätare.",
  render(c) {
    const n = Math.max(1, c.count), p = c.buildUp;
    const edge = Math.min(c.lamp, n - 1 - c.lamp);                    // 0 = kant, 1 = mitten (fyra lampor)
    const base = c.mixedSector(Math.floor(c.hueIdx / 16));
    if (edge === 0 && p >= 0.4) return hsv(((base + 3) % 6) / 6, 1, 0.03);
    const eighth = false;   // åttondelarna borta (ägaren 10-12: 'inte kännas som en strobe' - aldrig snabbare än takten)
    const ph = eighth ? ((c.beatFrac * 2) + (c.lamp & 1) * 0.5) % 1 : c.beatFrac;   // mittparet omlott på åttondelar
    const hit = eighth ? ((Math.floor(c.beatFrac * 2) & 1) === (c.lamp & 1) ? Math.exp(-((c.beatFrac * 2) % 1) / 0.3) : 0) : Math.exp(-ph / 0.25);
    const v = edge === 0 ? 0.08 + 0.4 * Math.max(hit, c.kickEnv * 0.5) * (1 - p) : 0.1 + (0.45 + 0.4 * p) * Math.max(hit, 0.5 * c.kickEnv);
    return hsv(base / 6, 1, Math.min(1, v));
  },
};
