import type { EffectDef } from "./types.js";

// FORVARNING (2026-09-23): analysatorns forutsagelse (expectHighInMs = ms till nasta vantade refrang) blir en synlig
// nedrakning: de sista 4 takterna fore refrangen tands lamporna EN I TAGET utifran och in (4 lampor = en per takt), sista
// takten smalnar allt mot en vit karna medan UV och hazer stiger - och pa slaget slapps allt (vit stot pa refrangens entre,
// sedan lamnar dirigenten over till high-poolen). Utan forutsagelse (eller > 4 takter kvar) ar den en lugn vantan: palett-
// farg, mjuk puls, som langsamt vaknar ju langre sektionen pagatt (sectionBars). Pool build/low.
export const forvarning: EffectDef = {
  key: "forvarning", label: "Forvarning", tier: "fart", section: ["build", "low"],
  desc: "Sista fyra takterna fore forutsedd refrang: lamporna tands en i taget utifran och in, vit karna sista takten, slapp pa slaget.",
  drives: ["uv", "hazer", "blinder"],
  render(c) {
    const bpm = c.cfg.beat?.bpm ?? 0;
    const barMs = bpm > 0 ? 240000 / bpm : 2000;
    const ex = c.expectHighInMs;
    const barsLeft = ex > 0 ? ex / barMs : -1;                                   // takter kvar till refrangen (-1 = okant)
    const n = Math.max(1, c.count);
    // Tandordning utifran och in, vanster fore hoger vid lika avstand: 4 lampor -> 0, 3, 1, 2.
    const half = (n - 1) / 2;
    const order: number[] = [...Array(n).keys()].sort((a, b) => (Math.abs(b - half) - Math.abs(a - half)) || (a - b));
    const rank = order.indexOf(c.idx);
    const hue = c.mixedSector(Math.floor(c.sectionBars / 4)) / 6;
    if (c.section === "high" || ex === 0) {
      // SLAPPET: refrangen ar har - vit stot som faller pa 400 ms, sedan en full puls tills dirigenten byter.
      const e = c.sectionEntry;
      if (e > 0.5) c.want.blinder = e;
      return c.hsv(hue, 1 - e, Math.min(1, 0.5 + c.beatPulse * 0.4 + e * 0.5 + c.punch * 0.3));
    }
    if (barsLeft >= 0 && barsLeft <= 4) {
      const prog = 1 - barsLeft / 4;                                              // 0 -> 1 genom de fyra takterna
      const litCount = Math.min(n, Math.ceil(prog * n + 1e-6));                   // en lampa till per takt (4 lampor)
      const lit = rank < litCount;
      const last = Math.max(0, 1 - barsLeft);                                     // sista takten: 0 -> 1
      c.want.hazer = 0.3 + 0.6 * prog; c.want.uv = last;
      const pulse = c.hasBeat ? Math.exp(-c.beatFrac / 0.12) : c.kickEnv;
      const v = lit ? Math.min(1, 0.35 + 0.35 * prog + pulse * 0.3 + last * 0.3) : 0.04 + pulse * 0.08 * prog;
      return c.hsv(hue, lit ? 1 - last * 0.9 : 1, v);
    }
    // VANTAN: lugn palettpuls som vaknar med sektionens langd (16 takter -> fullt vaken).
    const wake = Math.min(1, c.sectionBars / 16);
    const v = 0.18 + 0.15 * wake + c.beatPulse * (0.15 + 0.2 * wake) + c.punch * 0.25;
    return c.hsv(hue, 1, Math.min(1, v));
  },
};
