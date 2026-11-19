import type { EffectDef } from "./types.js";
import { hsv, soft } from "./color.js";
import { ettaTrea, halva, slotSize } from "./rig.js";

// FRASRAKNARE (2026-09-23): takten som FORM over fraserna. Grunden ar en palettpuls pa slaget; var 4:e takt (fjarde takten i
// varje fyrtaktsfras) sveper ett ljust huvud over riggen genom takten, och pa var 8:e takts etta blixtrar hela riggen vitt
// (+ blinder). Takterna raknas ur analysatorns sectionBars (takter sedan sektionsstart, sa frasen alltid borjar dar
// sektionen borjar) med gridfasen (beatFrac) inom takten; utan tempo faller den tillbaka pa beatIdx. Pool high/low.
// MJUK PULS (11-02, ägaren i ladan 11-01: refrängeffekterna 'väldigt AV/PÅ', 'mjuka stigningen och ner igen'): slagen räknas på
// effektklockan (beatIdx, ankaret på ettan) i stället för sectionBars, slagets lampa stiger mjukt och klingar ut (soft), de andra
// glöder svagt (toggle: ingen grundnivå som jämnar ut), och var 8:e takts etta är hela riggen i kulör - inte en vit blixt (diodblinket).
export const frasraknare: EffectDef = {
  key: "frasraknare", label: "Frasraknare", tier: "fart", modulate: { energy: true, pulse: false }, section: ["high", "low"], toggle: true,
  desc: "Slagen vandrar in från kanterna (1-2 vänster, 3-4 höger), svep var fjärde takt, var åttonde takt tänds ena halvan på ettan och andra på trean.",
  drives: ["blinder"],
  render(c) {
    const f = c.hasBeat ? c.beatFrac : 1 - c.kickEnv;
    const bib = ((c.beatIdx % 4) + 4) % 4, bar = Math.floor(c.beatIdx / 4);
    const inBar = (bib + c.beatFrac) / 4;                                         // 0..1 genom takten
    const hue = c.mixedSector(Math.floor(bar / 4)) / 6;
    // RAKNA TAKTEN PA LAMPORNA (2026-09-27): fyra lampor = fyra slag i takten. Slag k i takten slar hart pa lampa k (v->h),
    // resten far bara en svag puls - publiken ser 1-2-3-4 vandra over riggen. Forut var grundpulsen uniform (= pulse) och
    // effekten syntes bara var 4:e/8:e takt.
    const g = slotSize(c.count), n = Math.max(1, Math.ceil(c.count / g));      // hyrkitet: 4 platser om g lampor
    const sl = Math.floor(c.idx / g), m = n >= 4 ? [0, 1, n - 1, n - 2][bib] : bib % n;   // 1an-3an-stilen (11-19): 1-2 vänster kant och in, 3-4 höger kant och in
    const mine = sl === m;
    let v = mine ? 0.15 + 0.85 * soft(f, 0.12, 0.4) : 0.1 + 0.2 * soft(f, 0.15, 0.4);
    if (bar % 4 === 3) {                                                          // fjarde takten: svep
      const d = (c.idx - inBar * (c.count - 1)) / g;
      v += Math.exp(-d * d * 0.8) * 0.5;
    }
    if (bar % 8 === 0 && bar > 0 && ettaTrea(c.beatIdx, halva(c.lamp, c.count))) {   // attonde takten: ena halvan pa ettan, andra pa trean, i kulor
      const all = soft(f, 0.12, 0.45);
      c.want.blinder = all;
      v = Math.max(v, all);
    }
    return hsv(hue, 1, Math.min(1, v));
  },
};
