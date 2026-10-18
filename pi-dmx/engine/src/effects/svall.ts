import type { EffectDef } from "./types.js";
import { hsv } from "./color.js";

// SVALL (lugn x refräng, situationsrutnätet 2026-10-12 - rutan var tom): en lugn låts refräng. De två grupperna (c.group: jämn/udda
// eller inre/yttre) sväller i motfas över två slag - som ett andetag som går fram och tillbaka över riggen - och taktens etta
// lyfter båda lite. Grupperna i närliggande kulörer (palettens, per fras). Aldrig släckt, aldrig alla lika.
export const svall: EffectDef = {
  key: "svall", label: "Svall", tier: "lugn", modulate: { energy: true, pulse: false }, section: ["high"],
  desc: "Lugn refräng: två lampgrupper sväller i motfas över två slag, taktens etta lyfter båda.",
  render(c) {
    const ph = ((((c.beatIdx % 2) + 2) % 2) + c.beatFrac) / 2;       // 0..1 över två slag
    const s = 0.5 - 0.5 * Math.cos(2 * Math.PI * ph);
    const mine = c.group ? s : 1 - s;
    const one = (((c.beatIdx % 4) + 4) % 4) === 0 ? Math.exp(-c.beatFrac / 0.35) : 0;   // taktens etta
    const base = c.mixedSector(Math.floor(c.hueIdx / 16));
    const hue = ((c.group ? base + 1 : base) % 6) / 6;
    // 10-13 (effectDyn): motorns grundnivå (FX_FLOOR 0,6) lyfter allt över ~0,1 till minst 64 % - "låg glöd" måste ligga på ~0,01-0,03.
    //   Spridningen var 0,29 (botten 0,22 syntes som nästan fullt): grupperna sväller nu ner i nästan mörker (0,01) mellan.
    return hsv(hue, 0.95, Math.min(1, 0.01 + 0.8 * mine * mine + 0.18 * one));
  },
};
