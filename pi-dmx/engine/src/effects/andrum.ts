import type { EffectDef } from "./types.js";

// ANDRUM (break, 2026-09-21): breakdownen ar en paus - riggen dimmar till en djup ton, ror sig langsamt och behaller bara
// hjartslaget svagt sa takten aldrig tappas. Ju langre breaket, desto morkare (ner till ett golv), och nar energin
// borjar komma tillbaka (buildUp) oppnar den forsiktigt. Dirigenten valjer den vid 'break'-gransen (section-tagg).
export const andrum: EffectDef = {
  key: "andrum", label: "Andrum", tier: "lugn", modulate: { energy: true, pulse: false }, section: ["break"],
  desc: "Breakdown: dimmat, langsamt, bara hjartslaget kvar.",
  drives: ["hazer"],
  render(c) {
    const age = Math.min(1, c.sectionAgeMs / 12000);
    // NIVA MOT REFRANGEN (2026-09-23): ju langre under senaste refrangen breaket ligger (levelVsHighDb), desto djupare golv.
    const dip = c.levelVsHighDb < 0 ? Math.max(-0.10, c.levelVsHighDb / 60) : 0;
    // 10-13 (effectDyn: spridning 0,10 - golvet 0,30 lyftes av motorns grundnivå (FX_FLOOR) till nästan fullt, alla fyra lika):
    // golvet är borta, driften går ner i nästan mörker och bär breakets nivå; kulören per fras (var c.t/13).
    const deep = Math.max(0.2, 1 - 0.4 * age + c.frame.buildUp * 0.6 + dip * 3);   // morknar langsamt, oppnar mot uppbyggnad
    const hue = (c.mixedSector(Math.floor(c.hueIdx / 16)) / 6 + 0.55) % 1;          // kall komplementton
    const drift = 0.5 + 0.5 * Math.sin(c.t * 0.4 + c.idx * 1.6);
    // HJARTSLAGET VANDRAR (2026-09-27): slaget landar pa en grupp i taget (jamn/udda eller inre/yttre via c.grouping) sa aven
    // breaket har rorelse mellan lamporna - forut var pulsen uniform och andrum lastes som hjarta/subbreath (rV-familjen).
    const mine = c.group === (c.beatIdx & 1);
    const beat = mine ? (c.hasBeat ? Math.exp(-c.beatFrac / 0.12) * 0.3 : c.heartPulse * 0.25) : 0;
    c.want.hazer = 0.5;
    return c.hsv(hue, 0.9, Math.min(1, 0.01 + 0.45 * drift * drift * deep + beat));
  },
};
