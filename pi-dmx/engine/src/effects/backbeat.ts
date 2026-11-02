import type { EffectDef } from "./types.js";
import { hsv, soft } from "./color.js";

// BACKBEAT: den klassiska rock/pop-känslan. Kicken ger en DOV puls över hela
// riggen, virveln en VIT blixt — och eftersom virveln ligger på 2 och 4 uppstår
// backbeaten av sig själv, utan att vi behöver veta var i takten vi är.
// Detta är effekten som trum-envelope-fixen låste upp: innan låg kick-envelopen
// tänd 97 % av tiden, så "pulsen" var en konstant glöd utan accent.
export const backbeat: EffectDef = {
  key: "backbeat", label: "Backbeat", tier: "full", modulate: { energy: true, pulse: false }, section: ["high", "low"], toggle: true,
  desc: "Dov puls på bastrumman, vit blixt på virveln — den klassiska 2-och-4-känslan.",
  render(c) {
    const hue = c.mixedSector(Math.floor(c.hueIdx / 8)) / 6;
    // MJUK PULS (11-02, ägaren i ladan 11-01: refrängeffekterna 'väldigt AV/PÅ'): kroppen och virveln går på effektklockan med mjuk
    // stigning och uttoning (soft) i stället för trumdetektorns branta envelopes (d.kick/d.snare) - 2-och-4 hoppar fortfarande mellan
    // grupperna, men ljuset sväller och klingar i stället för att slå av och på.
    const f = c.hasBeat ? c.beatFrac : 1 - c.kickEnv;
    const back = (c.beatIdx & 1) === 1;                             // slag 2 och 4 (ankaret på ettan)
    const body = 0.3 + 0.3 * soft(f, 0.12, 0.45) + c.frame.spec.bass * 0.15;   // kroppen på varje slag
    // TVA OCH TVA (2026-09-27): kicken pumpar hela riggen, men virvelns vita small HOPPAR mellan de tva grupperna varje slag
    // (jamn/udda eller inre/yttre via c.grouping). Forut var backbeat helt uniform - pa fyra lampor oskiljbar fran pulse/party.
    const mine = c.group === ((c.beatIdx >> 1) & 1);               // varannan backbeat: grupp 0 på tvåan, grupp 1 på fyran
    const crack = back && mine ? 0.55 * soft(f, 0.12, 0.4) : 0;     // virvelns smäll på min grupp
    // Virveln bars redan av ljuset (body + crack) OCH av grupphoppet (mine) - avmattningen var en tredje,
    // overflodig barare som dessutom tog kuloren. 0,85 -> 0,3.
    return hsv(hue, 1 - crack * 0.3, Math.min(1, body + crack));
  },
};
