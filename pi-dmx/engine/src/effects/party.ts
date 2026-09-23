import type { EffectDef } from "./types.js";

// Full fart: FÄRGKAOS-PUMP — varje lampa egen ren färg (blandas om varje takt)
// och hela riggen THROBBAR hårt: nästan kolsvart mellan slagen, full på beatet.
// Lågt golv (5%) + extra kick-drive → rave-hård kontrast som sitter på basen.
export const party: EffectDef = {
  key: "party", label: "Party", tier: "full", modulate: { energy: true, pulse: false }, section: ["high"],
  desc: "Färgkaos som pumpar hårt på varje taktslag.",
  render(c) {
    const hue = c.mixedSector(c.beatIdx + c.idx * 2) / 6;
    const pump = Math.min(1, c.beatPulse * 1.0 + c.kickEnv * 0.9 + c.punch * 0.7);   // riktig dunk slår igenom
    const v = 0.12 + 0.88 * pump;   // motorns hjartslag dippar redan till 0.30 → hoj eget golv sa det inte blir strobe                                     // djupare throb (mörkare mellan slagen)
    const entry = c.section === 'high' ? c.sectionEntry : 0;   // refrangens forsta slag: stot + blinder
    if (entry > 0) c.want.blinder = entry;
    // REFRANGEN AR TILLBAKA (2026-09-23): repeatSim >= 0,92 och minst tredje refrangen -> vit karna pa slaget + UV pa slaget.
    const back = c.section === 'high' && c.repeatSim >= 0.92 && c.sectionIndex >= 2 ? 1 : 0;
    if (back) c.want.uv = c.beatPulse;
    return c.hsv(hue, 1 - Math.max(c.punch * 0.4, entry * 0.7, back * c.beatPulse * 0.6), Math.min(1, v + entry * 0.5));   // dunk → gnista mot vitt
  },
};
