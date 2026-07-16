import type { EffectDef } from "./types.js";

// Fart: TRANSIENT-KASKAD — de 4 lamporna mappas till varsitt onset-band i
// STIGANDE frekvens: kick → lowMid → mid → highMid. När ljudet rör sig i
// frekvens (t.ex. en trumfill bastrumma → tom → virvel) vandrar ljuset fysiskt
// vänster→höger i EXAKT samma ögonblick — organisk rörelse UTAN tidsstyrd chase.
// Egen färg per lampa. Bygger helt på per-band-anslagen från dubbel-FFT:n.
// (Gemini-idé. Överlappar drumkit lite — men driver på ren frekvensvandring i
//  stället för fasta trumröster; behåll den som känns bäst.)
export const cascade: EffectDef = {
  key: "cascade", label: "Kaskad", tier: "fart",
  desc: "Lamporna = stigande frekvensband; ljud som rör sig i frekvens vandrar i rummet.",
  render(c) {
    const o = c.frame.onset;
    const ladder = [o.kick, o.lowMid, o.mid, o.highMid];   // låg → hög vänster → höger
    const onsetVal = ladder[c.idx % ladder.length];
    const hue = c.mixedSector(c.idx) / 6;                  // fast egen färg per lampa
    const v = 0.04 + 0.96 * Math.pow(onsetVal, 2);         // hård attack, liten vilo-glöd
    return c.hsv(hue, 1, v);
  },
};
