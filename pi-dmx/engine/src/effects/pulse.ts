import type { EffectDef } from "./types.js";

// Fart: hela riggen samma färg, pulsar på beatet; färg stegar var fjärde takt.
export const pulse: EffectDef = {
  key: "pulse", label: "Puls", tier: "fart", section: ["low", "high", "build"],
  desc: "Hela riggen i en färg som pulsar på beatet.",
  render(c) {
    const hue = c.mixedSector(Math.floor(c.beatIdx / 4)) / 6;
    // spec.kick i st.f. bredbandsnivå → pulsen sitter på TRUMMAN, inte på sång/pads.
    const v = c.punchFloor + (1 - c.punchFloor) * Math.min(1, c.beatPulse * 0.85 + c.frame.spec.kick * 0.25 + c.punch * 0.5);
    const entry = c.section === 'high' ? c.sectionEntry : 0;
    return c.hsv(hue, 1 - Math.max(c.punch * 0.3, entry * 0.6), Math.min(1, v + entry * 0.4));   // riktig dunk → hårt slag mot vitt; refrang-entre lyfter
  },
};
