import type { EffectDef } from "./types.js";

// BACKBEAT: den klassiska rock/pop-känslan. Kicken ger en DOV puls över hela
// riggen, virveln en VIT blixt — och eftersom virveln ligger på 2 och 4 uppstår
// backbeaten av sig själv, utan att vi behöver veta var i takten vi är.
// Detta är effekten som trum-envelope-fixen låste upp: innan låg kick-envelopen
// tänd 97 % av tiden, så "pulsen" var en konstant glöd utan accent.
export const backbeat: EffectDef = {
  key: "backbeat", label: "Backbeat", tier: "full", modulate: { energy: true, pulse: false }, section: ["high", "low"],
  desc: "Dov puls på bastrumman, vit blixt på virveln — den klassiska 2-och-4-känslan.",
  render(c) {
    const d = c.drum;
    const hue = c.mixedSector(Math.floor(c.beatIdx / 8)) / 6;
    const body = 0.12 + d.kick * 0.55 + c.frame.spec.bass * 0.2;   // kickens kropp
    // TVA OCH TVA (2026-09-27): kicken pumpar hela riggen, men virvelns vita small HOPPAR mellan de tva grupperna varje slag
    // (jamn/udda eller inre/yttre via c.grouping). Forut var backbeat helt uniform - pa fyra lampor oskiljbar fran pulse/party.
    const mine = c.group === (c.beatIdx & 1);
    const crack = d.snare * (mine ? 0.9 : 0.25);                    // virvelns smäll: hard pa min grupp, svag pa den andra
    // Virveln bars redan av ljuset (body + crack) OCH av grupphoppet (mine) - avmattningen var en tredje,
    // overflodig barare som dessutom tog kuloren. 0,85 -> 0,3.
    return c.hsv(hue, 1 - crack * 0.3, Math.min(1, body + crack));
  },
};
