import type { EffectDef } from "./types.js";
import { hsv, soft } from "./color.js";
const BASGANG = process.env.DMX_BASGANG === '1';   // PROV 2026-11-07 (arenan puls1, vinnaren a8+a7): styrkan ur basens kropp, se effects.ts BASGANG

// Full fart: GALLOPP — två grupper (varannan lampa) slår OMLOTT: grupp A exakt
// på taktslaget, grupp B på off-beatet (&) → dubbel upplevd rytm, ett "dun-ka
// dun-ka" tvärs riggen. Kontrastfärger per grupp, mörk mellan slagen. Färgparet
// byts var 4:e takt. (Rave = grupp släcks helt, flip = båda tända & byter färg;
// gallop = grupperna delar RYTMEN i off-beat.)
export const gallop: EffectDef = {
  key: "gallop", label: "Gallopp", tier: "full", modulate: { energy: true, pulse: false }, section: ["high"], toggle: true,
  desc: "Grupperna slår omlott – beat & off-beat, dubbel rytm.",
  render(c) {
    const even = c.group === 0;   // jamn/udda eller inre/yttre (c.grouping)
    // RIKTIG GALOPP (2026-09-27): grupp B slar TVA ganger - pa "&" (0,5) och pa sista sextondelen (0,75), den andra svagare -
    // "da-da-DUM" mot grupp A:s slag. Forut var B en enkel off-beat = identiskt monster med varannan (rV ~0,9 pa fyra lampor).
    // MJUK PULS (11-02, ägaren i ladan 11-01: refrängeffekterna 'väldigt AV/PÅ'): båda grupperna stiger mjukt och klingar (soft)
    // i stället för att slå på direkt och falla kvadratiskt; figuren (A på slaget, B på & och sista sextondelen) är densamma.
    const f = c.hasBeat ? c.beatFrac : 1 - c.kickEnv;
    const p1 = (f + 0.5) % 1, p2 = (f + 0.25) % 1;           // faser sedan 0,5 resp. 0,75
    const offPulse = Math.max(soft(p1, 0.12, 0.18) * 0.75, soft(p2, 0.1, 0.15));
    const groupPulse = even ? soft(f, 0.12, 0.3) : offPulse;  // A on-beat, B galopp-figuren
    const pairBase = c.mixedSector(Math.floor(c.hueIdx / 4));
    const hue = ((even ? pairBase : pairBase + 3) % 6) / 6;   // motfärger
    // BASGANG (a8 11-07): figuren (vem som slår när) är rutnätets, styrkan basens kropp - kickEnv/punch-mattan (alla lampor lika) bort
    const bb = c.bassBody;
    const v = BASGANG ? 0.06 + 0.94 * Math.min(1, groupPulse * (0.3 + 0.7 * bb) + (even ? 0.25 * bb * bb : 0))
      : 0.1 + 0.9 * Math.min(1, groupPulse * (0.85 + c.audio * 0.3) + c.kickEnv * 0.2 + c.punch * 0.5);
    return hsv(hue, 1 - c.punch * 0.3, v);   // riktig dunk slår igenom rytmen
  },
};
