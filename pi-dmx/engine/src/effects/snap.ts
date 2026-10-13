import type { EffectDef } from "./types.js";

// Full fart: HÅRT KAP — KONSTANT ljus (ingen pump), och på varje taktslag kapas ljuset till ett nytt lamppar (10-13; var unisont
// färgslag i alla fyra = spridning 0). Motsats till party (throb med vandrande hål) och rave (fast jämn/udda-växling).
export const snap: EffectDef = {
  key: "snap", label: "Snap", tier: "full", modulate: { energy: true, pulse: false }, section: ["high"],
  desc: "Hårt kap på varje slag: ett nytt lamppar tänds, taktens etta tänder alla.",
  render(c) {
    // EFFEKTGENOMGÅNGEN 10-13 (effectDyn: spridning 0,00, rum 0,00 i refrängen - alla fyra fullt hela tiden): kapet flyttar nu ETT
    // lamppar per slag (6 par, aldrig samma två slag i rad), andra paret släckt; taktens etta tänder alla. Kulören per fras (hueIdx/16).
    const n = Math.max(1, c.count);
    const one = (((c.beatIdx % 4) + 4) % 4) === 0;
    const pairOf = (b: number) => (Math.imul(b + 3, 2654435761) >>> 0) % 6;
    let pr = pairOf(c.beatIdx); if (pr === pairOf(c.beatIdx - 1)) pr = (pr + 1) % 6;
    const PAIRS = [[0, 1], [2, 3], [0, 2], [1, 3], [0, 3], [1, 2]];
    const lit = one || n < 4 || PAIRS[pr].includes(c.lamp % 4);
    const base = c.mixedSector(Math.floor(c.hueIdx / 16));
    const hue = (((c.lamp & 1) ? base + 3 : base) % 6) / 6;
    if (!lit) return c.hsv(hue, 1, 0);
    // Vit-kap på SLAGET: gnista = grid-flanken (beatHit) ELLER en riktig dunk →
    // varje färgbyte punkteras av en kort vit gnista även när basen är svag, och
    // sitter på gridet (eller kicken utan BPM-lås). fastMode ger den kort utklang.
    const gnista = Math.max(c.punch, c.beatHit ? 1 : 0);
    const v = Math.min(1, 0.9 + gnista * 0.1);   // c.audio borttagen (dubbelmodulering mot basenergin)
    const entry = c.section === 'high' ? c.sectionEntry : 0;
    if (entry > 0.5) c.want.blinder = entry;
    // REFRANGEN AR TILLBAKA (2026-09-23): kapet far en vit karna och UV pa slaget nar repeatSim sager att det ar samma refrang igen.
    const back = c.section === 'high' && c.repeatSim >= 0.92 && c.sectionIndex >= 2 ? gnista : 0;
    if (back > 0) c.want.uv = back;
    // `entry` var 1,0 = helt vitt genom hela refrangentren. Gnistan syns i `v`; kuloren ska bara bloma, inte forsvinna.
    return c.hsv(hue, 1 - Math.max(gnista * 0.25, entry * 0.45, back * 0.4), v);   // slag → gnista, kuloren kvar
  },
};
