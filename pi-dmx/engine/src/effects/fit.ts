/**
 * PASSFORM: vilken sorts musik varje effekt KLÄR.
 *
 * Dirigenten (smart-läget) jämför den här mot analysatorns karaktärsprofil
 * (frame.profile) och väljer den effekt som passar musiken — istället för att
 * slumpa ur energitiern. Det är skillnaden mellan "byter effekt" och "regisserar".
 *
 * Axlarna (0..1) betyder samma sak som i profilen:
 *   punch  — transienttäthet: 1 = lever på hårda slag, 0 = svävande/sustained
 *   bass   — låg-endens tyngd: 1 = bygger på sub/kick, 0 = bryr sig inte om basen
 *   bright — klang uppåt: 1 = lyser på hi-hats/luft, 0 = mörk/varm
 *   beat   — taktbundenhet: 1 = kräver tydlig takt (kap/växlingar), 0 = fri-flytande
 *
 * ▼▼▼ JUSTERA HÄR ▼▼▼ Tweaka fritt — det här är ren smak.
 */
import type { Mode } from "../config.js";

export interface Fit { punch: number; bass: number; bright: number; beat: number }

export const FIT: Partial<Record<Mode, Fit>> = {
  // ── Lugna: sustained, långsamma ──
  breathe:   { punch: 0.10, bass: 0.40, bright: 0.30, beat: 0.20 },
  aurora:    { punch: 0.10, bass: 0.30, bright: 0.55, beat: 0.10 },
  mono:      { punch: 0.20, bass: 0.60, bright: 0.20, beat: 0.10 },   // eld/glöd, varm
  subbreath: { punch: 0.10, bass: 0.85, bright: 0.10, beat: 0.10 },   // sub-driven andning
  airglow:   { punch: 0.10, bass: 0.10, bright: 0.90, beat: 0.10 },   // luftig shimmer
  twin:      { punch: 0.20, bass: 0.40, bright: 0.45, beat: 0.20 },
  // ── Fart: flödande/rytmiska ──
  wave:      { punch: 0.30, bass: 0.40, bright: 0.60, beat: 0.30 },
  chase:     { punch: 0.50, bass: 0.40, bright: 0.35, beat: 0.70 },
  pulse:     { punch: 0.60, bass: 0.60, bright: 0.30, beat: 0.90 },
  eq:        { punch: 0.40, bass: 0.50, bright: 0.55, beat: 0.20 },   // spektrum-mätare
  drops:     { punch: 0.70, bass: 0.50, bright: 0.40, beat: 0.70 },
  // ── Full fart: punchiga/spatiala ──
  party:     { punch: 0.80, bass: 0.70, bright: 0.40, beat: 0.80 },
  snap:      { punch: 0.70, bass: 0.40, bright: 0.50, beat: 0.95 },   // hårt kap på slaget
  bounce:    { punch: 0.80, bass: 0.50, bright: 0.40, beat: 0.85 },
  rave:      { punch: 0.70, bass: 0.50, bright: 0.40, beat: 0.90 },
  gallop:    { punch: 0.80, bass: 0.60, bright: 0.30, beat: 0.90 },
  ripple:    { punch: 0.60, bass: 0.50, bright: 0.50, beat: 0.80 },
  gravity:   { punch: 0.50, bass: 0.90, bright: 0.20, beat: 0.30 },   // basen knuffar fysiken
  drumkit:   { punch: 0.95, bass: 0.70, bright: 0.50, beat: 0.60 },   // lever på anslag
  split:     { punch: 0.50, bass: 0.50, bright: 0.60, beat: 0.30 },
  duel:      { punch: 0.80, bass: 0.70, bright: 0.60, beat: 0.40 },   // kick vs luft
  strobe:    { punch: 0.90, bass: 0.50, bright: 0.50, beat: 0.80 },
};
/** ▲▲▲ JUSTERA HÄR ▲▲▲ */

/** Vikter per axel — hur mycket varje egenskap väger i matchningen. */
const W = { punch: 1.0, bass: 0.9, bright: 0.8, beat: 0.9 };
const NEUTRAL: Fit = { punch: 0.5, bass: 0.5, bright: 0.5, beat: 0.5 };

/** Hur väl en effekt passar musiken just nu. Högre = bättre (0..1-ish). */
export function fitScore(mode: Mode, p: { punch: number; bass: number; bright: number; beat: number }): number {
  const f = FIT[mode] ?? NEUTRAL;
  const d = Math.abs(f.punch - p.punch) * W.punch
          + Math.abs(f.bass - p.bass) * W.bass
          + Math.abs(f.bright - p.bright) * W.bright
          + Math.abs(f.beat - p.beat) * W.beat;
  return 1 - d / (W.punch + W.bass + W.bright + W.beat);
}
