import type { EffectDef } from "./types.js";

// BACKBEAT: den klassiska rock/pop-känslan. Kicken ger en DOV puls över hela
// riggen, virveln en VIT blixt — och eftersom virveln ligger på 2 och 4 uppstår
// backbeaten av sig själv, utan att vi behöver veta var i takten vi är.
// Detta är effekten som trum-envelope-fixen låste upp: innan låg kick-envelopen
// tänd 97 % av tiden, så "pulsen" var en konstant glöd utan accent.
export const backbeat: EffectDef = {
  key: "backbeat", label: "Backbeat", tier: "fart",
  desc: "Dov puls på bastrumman, vit blixt på virveln — den klassiska 2-och-4-känslan.",
  render(c) {
    const d = c.drum;
    const hue = c.mixedSector(Math.floor(c.beatIdx / 8)) / 6;
    const body = 0.12 + d.kick * 0.55 + c.frame.spec.bass * 0.2;   // kickens kropp
    const crack = d.snare * 0.9;                                    // virvelns smäll
    return c.hsv(hue, 1 - crack * 0.85, Math.min(1, body + crack));
  },
};
