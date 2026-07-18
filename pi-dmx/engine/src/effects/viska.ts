import type { EffectDef } from "./types.js";

// VISKA: nästan svart rum där bara PERKUSSIONEN syns. Ingen grundnivå att tala
// om — virvel och hi-hat tänder korta gnistor på var sin lampa, kicken ger en
// dov mörkröd puls. Byggd för en bar tidigt på kvällen: närvaro utan blink.
// Använder trum-envelopen (drum), som numera slår diskret i stället för att glöda.
export const viska: EffectDef = {
  key: "viska", label: "Viska", tier: "lugn",
  desc: "Nästan mörkt — bara diskreta gnistor från virvel och hi-hat, dov puls på kicken.",
  render(c) {
    const d = c.drum;
    const role = c.count > 1 ? c.idx % 3 : -1;
    const spark = role === 0 ? d.kick * 0.55 : role === 1 ? d.snare * 0.75 : d.hat * 0.6;
    const hue = role === 0 ? 0.02 : role === 1 ? 0.10 : 0.55;   // röd / varmvit / iskall
    const sat = role === 1 ? 0.25 : 0.9;
    return c.hsv(hue, sat, Math.min(1, 0.03 + spark));
  },
};
