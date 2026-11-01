import type { EffectDef } from "./types.js";
import { hsv } from "./color.js";

// MJUK PULS (ägaren i ladan 11-01: 'de får gärna köra men med mjuka stigningen och ner igen'): stiger mjukt på `rise` slag, klingar ut på `tau`.
const soft = (f: number, rise: number, tau: number) => { if (f < rise) { const x = f / rise; return x * x * (3 - 2 * x); } return Math.exp(-(f - rise) / tau); };

// SLÄGGA (full x high, 2026-11-01, ägaren: 'fler effekter som uppfyller refräng/drop-kriterierna - tydlig basgång/takt'): varje slag
// slår ner i hela riggen; släggan själv - en VIT smäll - träffar en ny lampa per slag (vandrar runt riggen) medan de andra slår i
// palettens kulör, och allt glöder ut på basen mot nästa slag. Taktens etta: släggan träffar hela riggen. Varannan lampa i motfärg.
// (backbeat: vitt på virveln; party: kulör på slaget, en lampa vilar - släggan: vitt som vandrar på varje slag.)
// GRANSKNINGEN 11-01 (effectDyn: sprid 0,16, rum 0,06 - alla fyra slog nästan lika, den vita smällen syntes inte i ljuset): släggans
// lampa slår FULLT och de andra bara till halv styrka, så smällen flyttar ljuset (1-2-3-ALLA i varje takt), och frasens sista slag
// är också en hel-vit smäll (fyran in i nästa fras). Den vita smällen hålls 0,22 slag - energin (basen) kommer
// ~0,1 slag efter effektens klocka, en kortare topp hann knappt synas.
export const slagga: EffectDef = {
  key: "slagga", label: "Slägga", tier: "full", modulate: { energy: true, pulse: false }, section: ["high"], toggle: true,
  desc: "Släggan slår fullt i en ny lampa per slag, ettan i hela riggen; de andra glöder svagare.",
  render(c) {
    const f = c.hasBeat ? c.beatFrac : 1 - c.kickEnv;
    const n = Math.max(1, c.count), b = c.beatIdx;
    const all = (b & 3) === 0 || (b & 15) === 15;                     // ettan + frasens sista slag: hela riggen
    const pos = ((b % n) + n) % n;                                    // släggans lampa (ordningen växlar motorn var 32:a slag)
    const hit = all || c.idx === pos;
    const base = c.mixedSector(Math.floor(c.hueIdx / 16));
    const hue = ((c.group === 0 ? base : base + 3) % 6) / 6;
    // (INGET VITT 11-01 kväll, ägaren i ladan: 'R och G lyser men B bara blinkar till' - vitt i ~100 ms tände den släckta dioden)
    if (hit) return hsv(hue, 1, 0.15 + 0.85 * soft(f, 0.12, 0.45));   // smällen i full kulör, klingar ut
    return hsv(hue, 1, 0.08 + 0.4 * soft(f, 0.15, 0.4));
  },
};
