import type { EffectDef } from "./types.js";

// TYNGDLYFT (2026-09-23): nivan mot LATENS EGEN refrang (levelVsHighDb) lyfter riggen. 6 dB under senaste refrangen ar
// ljuset djupt och mattat, bara mittlamporna; ju narmare refrangens niva desto fler lampor kommer med (inifran och ut) och
// fargen smalnar mot vitt - vid 0 dB ar hela riggen vit, och OVER refrangens niva ber den om blinder. Pulsen pa slaget
// vaxer med lyftet. Utan refrangreferens (forsta refrangen har inte hants) foljer lyftet nivan. Pool high/low.
export const tyngdlyft: EffectDef = {
  key: "tyngdlyft", label: "Tyngdlyft", tier: "fart", section: ["high", "low"],
  desc: "Djup farg 6 dB under refrangen, vitt nar nivan nar refrangens - blinder over den.",
  drives: ["blinder", "uv"],
  render(c) {
    const lv = c.levelVsHighDb;
    const hasRef = lv !== 0 || c.section === "high";
    const lift = hasRef ? Math.max(0, Math.min(1, (lv + 6) / 6)) : 0.3 + c.audio * 0.45;   // 0 = -6 dB, 1 = refrangens niva
    const over = hasRef ? Math.max(0, Math.min(1, lv / 3)) : 0;                            // over refrangen: 0..1 pa 3 dB
    const n = Math.max(1, c.count);
    const half = (n - 1) / 2;
    const rank = Math.abs(c.idx - half) / Math.max(0.5, half);                             // 0 mitten .. 1 kanten
    const on = Math.max(0, Math.min(1, (lift * 1.15 - rank * 0.6) / 0.45));                // mitten forst, kanten sist
    const hue = c.mixedSector(Math.floor(c.beatIdx / 16)) / 6;
    const pulse = c.hasBeat ? Math.exp(-c.beatFrac / 0.14) : c.kickEnv;
    if (over > 0.2) { c.want.blinder = over; c.want.uv = over; }
    const v = 0.08 + on * (0.25 + 0.45 * lift) + pulse * (0.1 + 0.35 * lift) * on + c.punch * 0.3 + over * 0.3;
    return c.hsv(hue, 1 - Math.max(lift * 0.9 * on, over), Math.min(1, v));
  },
};
