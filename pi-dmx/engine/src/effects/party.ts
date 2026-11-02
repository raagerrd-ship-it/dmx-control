import type { EffectDef } from "./types.js";
import { hsv, soft } from "./color.js";
import { slotSize } from "./rig.js";

// Full fart: FÄRGKAOS-PUMP — varje lampa egen ren färg (blandas om varje takt)
// och hela riggen THROBBAR hårt: nästan kolsvart mellan slagen, full på beatet.
// Lågt golv (5%) + extra kick-drive → rave-hård kontrast som sitter på basen.
export const party: EffectDef = {
  key: "party", label: "Party", tier: "full", modulate: { energy: true, pulse: false }, section: ["high"],
  desc: "Färgkaos som pumpar hårt på varje taktslag.",
  render(c) {
    // EFFEKTGENOMGÅNGEN 10-13 (effectDyn i refrängen: spridning 0,00, rum 0,00 - alla fyra pumpade lika; kickEnv/punch som NIVÅ
    // dubbelmodulerade mot basenergin): pumpen sitter på slaget (taktklockan), och en lampa VILAR per slag - hålet vandrar ett steg
    // per slag runt riggen, så pumpen rör sig. Egen kulör per lampa ur paletten (byts per fras).
    const g = slotSize(c.count), n = Math.max(1, Math.ceil(c.count / g));   // hyrkitet: hålet = en plats om g lampor
    const hole = ((c.beatIdx % n) + n) % n;
    const hue = c.mixedSector(Math.floor(c.hueIdx / 16) + c.idx * 2) / 6;
    if (n >= 3 && Math.floor(c.idx / g) === hole && c.sectionEntry < 0.05) return hsv(hue, 1, 0);
    // EFFEKTSVEPET 11-02 (ägaren: 'fixa direkt de effekterna'; effectDyn alla effekter pop+mega 5 min): pumpen slog på direkt (hopp 0,032) - nu mjuk stigning, samma klang.
    const pump = c.hasBeat ? soft(c.beatFrac, 0.12, 0.25) : c.beatPulse;
    const v = 0.12 + 0.88 * pump;   // motorns hjartslag dippar redan till 0.30 → hoj eget golv sa det inte blir strobe                                     // djupare throb (mörkare mellan slagen)
    const entry = c.section === 'high' ? c.sectionEntry : 0;   // refrangens forsta slag: stot + blinder
    if (entry > 0) c.want.blinder = entry;
    // REFRANGEN AR TILLBAKA (2026-09-23): repeatSim >= 0,92 och minst tredje refrangen -> vit karna pa slaget + UV pa slaget.
    const back = c.section === 'high' && c.repeatSim >= 0.92 && c.sectionIndex >= 2 ? 1 : 0;
    if (back) c.want.uv = c.beatPulse;
    // Dunken bars av `v` (pump) och entren av `v + entry*0.5`; avmattningen var en extra barare mot vitt.
    // Halverad, och entren far mest eftersom en refrangentre AR en vit stot.
    return hsv(hue, 1 - Math.max(entry * 0.35, back * c.beatPulse * 0.3), Math.min(1, v + entry * 0.5));   // dunk → gnista, kuloren kvar
  },
};
