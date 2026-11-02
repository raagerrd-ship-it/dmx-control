import type { EffectDef } from "./types.js";
import { hsv, soft } from "./color.js";
import { slotSize } from "./rig.js";

// MELLANSLAG (full x intro, situationsrutnätet 2026-10-12 - syskon kickregn/startskott/blixtnedslag): introt med house-basens
// offbeat. Ljuset slår på "och"-et mellan slagen (halvt slag efter kicken) och flyttar en lampa per offbeat (c.idx-ordningen),
// med basens sustain (c.drum.bass) som extra lyft; kicken själv syns bara som en svag glöd i lampan mittemot. Takten känns i
// luckan mellan slagen. Gallop delar grupper beat/off-beat; mellanslag vandrar på offbeaten.
export const mellanslag: EffectDef = {
  key: "mellanslag", label: "Mellanslag", tier: "fart", modulate: { energy: true, pulse: false }, section: ["intro"],
  desc: "Intro i full fart: ljuset slår på offbeaten mellan kickarna och vandrar en lampa per slag.",
  render(c) {
    // EFFEKTSVEPET 11-02 (ägaren: 'fixa direkt de effekterna'; effectDyn alla effekter pop+mega 5 min): 27,6 kulörhopp/min - lampan bytte mellan grundfärg och motfärg när offbeaten
    // vandrade förbi; nu FAST kulör per plats (varannan i motfärg), mjuk uppgång på "och"-et, och 4 platser om g lampor på 8.
    const g = slotSize(c.count), n = Math.max(1, Math.ceil(c.count / g)), me = Math.floor(c.idx / g);
    const ph = (c.beatFrac + 0.5) % 1;                                 // tid sedan "och"-et
    const off = c.beatFrac >= 0.5 ? c.beatIdx : c.beatIdx - 1;         // vilket offbeat som senast slog
    const pos = ((off % n) + n) % n;
    const base = c.mixedSector(Math.floor(c.hueIdx / 16));
    const hue = (((me & 1) ? base + 3 : base) % 6) / 6;
    if (me === pos) return hsv(hue, 1, Math.min(1, 0.05 + (0.7 + 0.25 * Math.min(1, c.drum.bass * 1.5)) * soft(ph, 0.12, 0.22)));
    if (n > 2 && me === (pos + 2) % n) return hsv(hue, 1, 0.03 + 0.3 * c.kickEnv);
    return hsv(hue, 1, 0.02);
  },
};
