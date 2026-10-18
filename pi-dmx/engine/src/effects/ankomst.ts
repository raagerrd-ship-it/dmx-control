import type { EffectDef } from "./types.js";
import { hsv } from "./color.js";

// ANKOMST (fart x intro, situationsrutnätet 2026-10-12 - rutan var tom): en fartfylld låts intro. EN lampa slår på varje slag och
// platsen flyttas en lampa per takt (c.idx-ordningen, så hållet växlar), övriga släckta - takten presenteras innan låten drar igång.
// Slaget blir starkare ju längre introt pågått (sectionAgeMs, 16 s).
export const ankomst: EffectDef = {
  key: "ankomst", label: "Ankomst", tier: "fart", modulate: { energy: true, pulse: false }, section: ["intro"],
  desc: "Intro i fart: en lampa slår på varje slag och flyttar en plats per takt.",
  render(c) {
    const n = Math.max(1, c.count);
    const pos = ((Math.floor(c.beatIdx / 4) % n) + n) % n;
    if (c.idx !== pos) return hsv(0, 0, 0);
    const grow = Math.min(1, c.sectionAgeMs / 16000);
    const hit = Math.exp(-c.beatFrac / 0.22);
    const hue = c.mixedSector(Math.floor(c.hueIdx / 16)) / 6;
    return hsv(hue, 1, Math.min(1, (0.25 + 0.75 * hit) * (0.6 + 0.4 * grow)));
  },
};
