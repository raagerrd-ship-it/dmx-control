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
  // ── Nya lugna ──
  tide:      { punch: 0.15, bass: 0.65, bright: 0.20, beat: 0.10 },   // tung vattenlinje, sustained
  drift:     { punch: 0.05, bass: 0.30, bright: 0.50, beat: 0.05 },   // ren klangfärg, rör sig inte på slag
  pendel:    { punch: 0.15, bass: 0.30, bright: 0.30, beat: 0.55 },   // lugn MEN taktlåst
  viska:     { punch: 0.70, bass: 0.35, bright: 0.60, beat: 0.30 },   // lever på perkussion trots låg energi
  // ── Nya fart ──
  backbeat:  { punch: 0.90, bass: 0.75, bright: 0.45, beat: 0.85 },   // kräver tydlig kick+virvel
  tick:      { punch: 0.75, bass: 0.20, bright: 0.95, beat: 0.60 },   // hi-hat-driven, toppregister
  stege:     { punch: 0.80, bass: 0.55, bright: 0.75, beat: 0.35 },   // anslag i hela spektrat
  eko:       { punch: 0.55, bass: 0.45, bright: 0.40, beat: 0.95 },   // meningslös utan takt
  hjarta:    { punch: 0.35, bass: 0.70, bright: 0.15, beat: 0.90 },   // taktlåst puls, klarar lugnt

  // ── Lugna: sustained, långsamma ──
  breathe:   { punch: 0.10, bass: 0.55, bright: 0.20, beat: 0.20 },   // andas med sektionsenergin
  aurora:    { punch: 0.10, bass: 0.20, bright: 0.80, beat: 0.10 },   // klangdrivet skimmer
  mono:      { punch: 0.20, bass: 0.60, bright: 0.20, beat: 0.10 },   // eld/glöd, varm
  airglow:   { punch: 0.10, bass: 0.10, bright: 0.90, beat: 0.10 },   // luftig shimmer
  twin:      { punch: 0.15, bass: 0.35, bright: 0.35, beat: 0.70 },   // taktlast vaxelsang
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
  // ── Sektions-/signaleffekter (2026-09-23): stod utan passform (NEUTRAL 0,5) och rankades darfor bort - stegring/nedrakning/
  //    vagbrytare/fyrverkeri valdes ALDRIG pa ladans mixar trots att build var 16 % av tiden. Nu egen rad var. ──
  stegring:  { punch: 0.40, bass: 0.50, bright: 0.45, beat: 0.60 },   // uppbyggnad: takten ar allt
  sug:       { punch: 0.45, bass: 0.60, bright: 0.30, beat: 0.60 },
  nedrakning:{ punch: 0.60, bass: 0.50, bright: 0.40, beat: 0.85 },   // raknar slag - kraver takt
  vagbrytare:{ punch: 0.50, bass: 0.50, bright: 0.50, beat: 0.90 },   // en vag per TAKT
  fyrverkeri:{ punch: 0.75, bass: 0.60, bright: 0.55, beat: 0.60 },
  andrum:    { punch: 0.15, bass: 0.50, bright: 0.25, beat: 0.30 },
  konfetti:  { punch: 0.65, bass: 0.45, bright: 0.60, beat: 0.75 },
  sopa:      { punch: 0.35, bass: 0.45, bright: 0.45, beat: 0.25 },
  varannan:  { punch: 0.60, bass: 0.55, bright: 0.40, beat: 0.90 },
  //    (ladans profil, tools/effectMix: punch 0,7-0,9, bass 0,15-0,4, bright 0,35-0,55, beat 0,85-0,95 - raderna ligger dar)
  forvarning:{ punch: 0.55, bass: 0.35, bright: 0.40, beat: 0.75 },   // stegar takter mot refrangen
  basgang:   { punch: 0.70, bass: 0.55, bright: 0.30, beat: 0.70 },   // lever pa basnoterna (bassline, inte profile.bass)
  tyngdlyft: { punch: 0.65, bass: 0.30, bright: 0.50, beat: 0.65 },   // nivan mot refrangen
  frasraknare:{ punch: 0.50, bass: 0.50, bright: 0.50, beat: 0.85 },  // takter och fraser
  vidga:      { punch: 0.55, bass: 0.55, bright: 0.50, beat: 0.70 },  // energin oppnar riggen
  svall:      { punch: 0.30, bass: 0.40, bright: 0.40, beat: 0.50 },   // lugn refrang, motfas (situationsrutnatet 10-12)
  famn:       { punch: 0.40, bass: 0.50, bright: 0.40, beat: 0.50 },   // lugn refrang, ettan (situationsrutnatet 10-12)
  gryning:    { punch: 0.30, bass: 0.40, bright: 0.40, beat: 0.40 },   // lugn uppbyggnad (situationsrutnatet 10-12)
  flod:       { punch: 0.30, bass: 0.40, bright: 0.40, beat: 0.40 },   // lugn uppbyggnad, vag (situationsrutnatet 10-12)
  ankomst:    { punch: 0.50, bass: 0.40, bright: 0.50, beat: 0.70 },   // intro, slag (situationsrutnatet 10-12)
  spaning:    { punch: 0.50, bass: 0.40, bright: 0.50, beat: 0.70 },   // intro, baktakt (situationsrutnatet 10-12)
  kickregn:   { punch: 0.80, bass: 0.60, bright: 0.50, beat: 0.80 },   // intro, kick (situationsrutnatet 10-12)
  startskott: { punch: 0.70, bass: 0.50, bright: 0.50, beat: 0.80 },   // intro, takter (situationsrutnatet 10-12)
  rulle:      { punch: 0.60, bass: 0.50, bright: 0.60, beat: 0.70 },   // uppbyggnad, virvel (situationsrutnatet 10-12)
  siren:      { punch: 0.60, bass: 0.50, bright: 0.60, beat: 0.70 },   // uppbyggnad, fargbyte (situationsrutnatet 10-12)
  glimt:      { punch: 0.30, bass: 0.20, bright: 0.70, beat: 0.50 },   // break, diskant (situationsrutnatet 10-12)
  efterskalv: { punch: 0.50, bass: 0.40, bright: 0.40, beat: 0.70 },   // break, halvtakt (situationsrutnatet 10-12)
  skuggor:    { punch: 0.50, bass: 0.40, bright: 0.40, beat: 0.60 },   // break, ytter/inner (situationsrutnatet 10-12)
  motor:      { punch: 0.80, bass: 0.60, bright: 0.60, beat: 0.80 },   // vers, kick/hat (situationsrutnatet 10-12)
  // situationsrutnatet 10-12, minst 4 per ruta
  stjarnor:   { punch: 0.45, bass: 0.30, bright: 0.55, beat: 0.55 },   // lugn uppbyggnad, tindrar utan takt
  mullra:     { punch: 0.55, bass: 0.50, bright: 0.35, beat: 0.65 },   // lugn uppbyggnad, basens sustain
  kaskad:     { punch: 0.40, bass: 0.40, bright: 0.40, beat: 0.70 },   // lugn refrang, en lampa per slag
  droppar:    { punch: 0.40, bass: 0.55, bright: 0.35, beat: 0.50 },   // lugn refrang, basnoter
  uppvarmning:{ punch: 0.60, bass: 0.25, bright: 0.75, beat: 0.60 },   // intro, hi-hat
  dunk:       { punch: 0.85, bass: 0.55, bright: 0.35, beat: 0.70 },   // intro, basslagets styrka
  glesna:     { punch: 0.50, bass: 0.35, bright: 0.45, beat: 0.80 },   // break, slaget glesnar
  dyning:     { punch: 0.50, bass: 0.45, bright: 0.40, beat: 0.60 },   // break, bas utan takt
  blixtnedslag:{ punch: 0.85, bass: 0.35, bright: 0.60, beat: 0.80 },  // intro, virveln
  mellanslag: { punch: 0.75, bass: 0.55, bright: 0.45, beat: 0.90 },   // intro, offbeat
  pump:       { punch: 0.80, bass: 0.50, bright: 0.40, beat: 0.90 },   // vers, sidechain
  hiss:       { punch: 0.60, bass: 0.40, bright: 0.65, beat: 0.70 },   // uppbyggnad, klattrar
  tratt:      { punch: 0.75, bass: 0.50, bright: 0.45, beat: 0.80 },   // uppbyggnad, kicken i mitten
  morkerslag: { punch: 0.50, bass: 0.40, bright: 0.40, beat: 0.75 },   // break, hal pa slaget
  urladdning: { punch: 0.55, bass: 0.40, bright: 0.40, beat: 0.70 },   // break, tid
};
/** ▲▲▲ JUSTERA HÄR ▲▲▲ */

/** Vikter per axel — hur mycket varje egenskap väger i matchningen. */
const W = { punch: 1.0, bass: 0.9, bright: 0.8, beat: 0.9 };
const NEUTRAL: Fit = { punch: 0.5, bass: 0.5, bright: 0.5, beat: 0.5 };

/**
 * SPATIALITET (0..1): stegar effekten / rör sig över riggen (lampor gör OLIKA saker
 * sekventiellt) eller kör alla lampor SAMMA? Ägaren gillar stegande effekter när
 * basslagen är tydliga. Bonusen nedan lyfter dem när `punch` (anslagstäthet) är hög,
 * så en löpande/stegande look föredras framför en uniform puls på ett tydligt komp.
 * Uniforma effekter (pulse/party/snap/rave/strobe/backbeat/hjarta/breathe/mono/
 * subbreath/sol/neon/airglow/viska) står inte med → 0.
 */
const SPATIAL: Partial<Record<Mode, number>> = {
  chase: 1.0, tick: 1.0, stege: 1.0, sopa: 1.0, gallop: 1.0, bounce: 1.0,
  ripple: 0.9, eko: 0.9, drumkit: 0.9, eq: 0.9, wave: 0.8, split: 0.8, drops: 0.8,
  duel: 0.7, konfetti: 0.7, varannan: 1.0, pendel: 0.7, twin: 0.6, tide: 0.6, drift: 0.6, aurora: 0.5,
  basgang: 1.0, forvarning: 0.8, frasraknare: 0.7, nedrakning: 0.8, vagbrytare: 0.8, tyngdlyft: 0.4, vidga: 0.9,
  // situationsrutnatet 10-12 (utan post fick de neutral passform och ingen rumsbonus -> valdes nastan aldrig)
  svall: 0.7, famn: 0.6, gryning: 0.6, flod: 0.8, ankomst: 1.0, spaning: 0.8, kickregn: 1.0, startskott: 0.8, rulle: 1.0, siren: 0.7,
  glimt: 0.8, efterskalv: 0.7, skuggor: 0.8, motor: 0.8,
  stjarnor: 0.7, mullra: 0.6, kaskad: 1.0, droppar: 0.9, uppvarmning: 0.8, dunk: 0.8, glesna: 0.8, dyning: 0.8,
  blixtnedslag: 1.0, mellanslag: 1.0, pump: 0.6, hiss: 1.0, tratt: 0.7, morkerslag: 0.8, urladdning: 0.6,
};
/** Hur mycket den spatiala preferensen väger vid full punch (0 = av). */
const SPATIAL_PREF = Number(process.env.DMX_SPATIAL_PREF ?? 0.5);   // 0,18 -> 0,5 (ladan 10-01 godkant)   // ladan 09-29: "manga effekter lyser bara alla lampor" -> prov 0,5

/** Hur väl en effekt passar musiken just nu. Högre = bättre (0..1-ish). */
export function fitScore(mode: Mode, p: { punch: number; bass: number; bright: number; beat: number }): number {
  const f = FIT[mode] ?? NEUTRAL;
  const d = Math.abs(f.punch - p.punch) * W.punch
          + Math.abs(f.bass - p.bass) * W.bass
          + Math.abs(f.bright - p.bright) * W.bright
          + Math.abs(f.beat - p.beat) * W.beat;
  const base = 1 - d / (W.punch + W.bass + W.bright + W.beat);
  // SPATIAL-BONUS: stegande effekter foredras nar anslagen (basslagen) ar tydliga.
  const spatialBonus = (SPATIAL[mode] ?? 0) * SPATIAL_PREF * p.punch;
  return base + spatialBonus;
}

/** LÅTMANUS (effects.ts MANUS_REL): avstånd mellan två effekters passform (0 = samma sorts musik). */
export function fitDistance(a: Mode, b: Mode): number {
  const x = FIT[a] ?? NEUTRAL, y = FIT[b] ?? NEUTRAL;
  return Math.hypot(x.punch - y.punch, x.bass - y.bass, x.bright - y.bright, x.beat - y.beat);
}
