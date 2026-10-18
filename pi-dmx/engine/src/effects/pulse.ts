import type { EffectDef } from "./types.js";
import { hsv } from "./color.js";

// Fart: pulsen på beatet, grupperna turas om och ettan tar hela riggen (10-13).
export const pulse: EffectDef = {
  key: "pulse", label: "Puls", tier: "fart", modulate: { energy: true, pulse: false }, section: ["build"],
  desc: "Pulsen slår på lampgrupperna i tur och ordning, taktens etta i hela riggen.",
  render(c) {
    // EFFEKTGENOMGÅNGEN 10-13 (effectDyn i builden: spridning 0,00, rum 0,00 - hela riggen samma puls; spec.kick/punch som NIVÅ
    // dubbelmodulerade mot basenergin): pulsen slår nu på grupperna i tur och ordning (c.group, andra gruppen släckt) och taktens
    // etta i hela riggen. Kulören per fras.
    const base = c.mixedSector(Math.floor(c.hueIdx / 16));
    const one = (((c.beatIdx % 4) + 4) % 4) === 0;
    const mine = one || (c.beatIdx & 1) === c.group;
    const hue = ((c.group ? base + 3 : base) % 6) / 6;
    const v = mine ? 0.35 + 0.65 * Math.exp(-c.beatFrac / 0.22) : 0;
    const entry = c.section === 'high' ? c.sectionEntry : 0;
    return hsv(hue, 1 - entry * 0.6, Math.min(1, v + entry * 0.4));   // riktig dunk → hårt slag mot vitt; refrang-entre lyfter
  },
};
