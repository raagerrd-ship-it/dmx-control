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
    const floor = 0.30 - 0.12 * age + c.frame.buildUp * 0.3;                        // morknar langsamt, oppnar mot uppbyggnad
    const hue = (c.mixedSector(Math.floor(c.t / 13)) / 6 + 0.55) % 1;               // kall komplementton
    const drift = 0.5 + 0.5 * Math.sin(c.t * 0.4 + c.idx * 0.9);
    const beat = c.hasBeat ? Math.exp(-c.beatFrac / 0.08) * 0.25 : c.kickEnv * 0.2;
    c.want.hazer = 0.5;
    return c.hsv(hue, 0.9, Math.min(1, floor + drift * 0.12 + beat));
  },
};
