/**
 * Effekt-registret — EN sanningskälla för alla effekter.
 *
 * Lägg till en effekt = skapa en fil här + en rad i EFFECTS nedan (+ en post i
 * Mode-unionen i config.ts). Motorn, läges-cykeln, valideringen, smart-poolerna
 * och UI:t härleds alla ur det här registret — ingen duplicering i fem filer.
 */

import type { ChannelRole, Mode } from "../config.js";
import type { EffectDef, EffectTier } from "./types.js";

import { drops } from "./drops.js";
import { party } from "./party.js";
import { chase } from "./chase.js";
import { wave } from "./wave.js";
import { breathe } from "./breathe.js";
import { snap } from "./snap.js";
import { bounce } from "./bounce.js";
import { mono } from "./mono.js";
import { aurora } from "./aurora.js";
import { pulse } from "./pulse.js";
import { strobe } from "./strobe.js";
import { rave } from "./rave.js";
import { eq } from "./eq.js";
import { gallop } from "./gallop.js";
import { twin } from "./twin.js";
import { ripple } from "./ripple.js";
import { gravity } from "./gravity.js";
import { drumkit } from "./drumkit.js";
import { split } from "./split.js";
import { subbreath } from "./subbreath.js";
import { duel } from "./duel.js";
import { airglow } from "./airglow.js";
import { tide } from "./tide.js";
import { drift } from "./drift.js";
import { pendel } from "./pendel.js";
import { viska } from "./viska.js";
import { backbeat } from "./backbeat.js";
import { tick } from "./tick.js";
import { stege } from "./stege.js";
import { eko } from "./eko.js";
import { hjarta } from "./hjarta.js";
import { sol } from "./sol.js";
import { konfetti } from "./konfetti.js";
import { sopa } from "./sopa.js";
import { neon } from "./neon.js";
import { varannan } from "./varannan.js";

// ORDNING = fysiska knappens/WS-cykelns ordning (MODE_CYCLE efter "smart").
export const EFFECTS: EffectDef[] = [
  drops, party, chase, wave, breathe, snap, bounce, mono, aurora, pulse,
  strobe, rave, eq, gallop, twin, ripple, gravity, drumkit, split, subbreath,
  duel, airglow,
  // Nya (2026-07): fyller lugn- och fart-poolerna till 10+ vardera.
  tide, drift, pendel, viska, backbeat, tick, stege, eko, hjarta,
];

/** Specialrolls-mappning: vilka fixture-roller (hazer/uv/blinder/strobe/laser/co2)
 *  varje effekt aktivt driver. Effekten fungerar utan dessa; matchning styr bara
 *  vilka SPECIALFIXTURES motorn ska tända, och UI:t gråar ut effekter vars enda
 *  drives saknar kopplad fixture. Håll listan här (metadata) – inte i varje
 *  effekt-fil – så vi har EN översikt att justera från.
 *
 *  DEN HÄR TABELLEN ÄR OCKSÅ NYCKELN TILL `c.want`. En effekt som sätter
 *  `c.want.strobe` men INTE står med här för "strobe" får sitt önskemål TYST
 *  ignorerat — motorn kollar `drives` innan den vidarebefordrar. Lägger du till
 *  ett `want` i en effekt: lägg till rollen här också, annars händer ingenting.
 *  (Undantag: `c.want.fog`. Rökmaskinen är EN enhet på egen adress, inte en roll
 *  per fixtur, så den kräver ingen drives-tagg — bara att maskinen är påslagen
 *  och att hårdvaruskyddet i output.ts släpper fram puffen.) */
const SPECIALTY_DRIVES: Partial<Record<Mode, ChannelRole[]>> = {
  drops:    ["blinder", "strobe", "laser", "co2", "hazer"],
  party:    ["blinder", "laser", "co2", "hazer"],
  strobe:   ["strobe", "laser"],
  rave:     ["strobe", "laser", "blinder", "hazer", "co2"],
  snap:     ["blinder"],
  bounce:   ["laser"],
  backbeat: ["blinder"],
  hjarta:   ["blinder"],
  gallop:   ["laser"],
  chase:    ["laser"],
  aurora:   ["hazer", "uv"],
  subbreath:["hazer"],
  wave:     ["hazer"],
  tide:     ["hazer", "uv"],
  drift:    ["hazer", "uv"],
  airglow:  ["uv"],
  viska:    ["uv"],
  pulse:    ["hazer"],
};

// Injicera drives i effekt-def:erna en gång vid modul-init (så EFFECT_META och
// alla konsumenter ser samma sanning).
for (const e of EFFECTS) {
  const d = SPECIALTY_DRIVES[e.key];
  if (d && d.length) e.drives = d;
}

/** Snabb uppslagning nyckel → effekt. */
export const EFFECT_MAP: Map<Mode, EffectDef> = new Map(EFFECTS.map((e) => [e.key, e]));

/** Alla effekt-nycklar i cykel-ordning (driver MODE_CYCLE + validering). */
export const EFFECT_KEYS: Mode[] = EFFECTS.map((e) => e.key);

/** Smart-lägets pooler, härledda ur tier-taggen. */
export const TIER: Record<EffectTier, Mode[]> = {
  lugn: EFFECTS.filter((e) => e.tier === "lugn").map((e) => e.key),
  fart: EFFECTS.filter((e) => e.tier === "fart").map((e) => e.key),
  full: EFFECTS.filter((e) => e.tier === "full").map((e) => e.key),
};

/** Metadata för UI:t (skickas till klienten → en sanningskälla för listorna). */
export const EFFECT_META = EFFECTS.map(({ key, label, desc, tier, drives }) => ({ key, label, desc, tier, drives: drives ?? [] }));

/**
 * EFFEKT-KRAV — hårda gates ovanpå tier + fitScore. En effekt vars krav inte möts
 * utesluts ur dirigentens pool: en strobe fyrar aldrig på en tryckare, en trum-effekt
 * väljs aldrig när det inte finns trummor, en luft-gnista aldrig utan diskant.
 *
 * `minBpm` mäts mot det oktav-vikta tempot (80..160) — en låt på 150-160 fångas,
 * riktigt snabba (>160) viks ner under gränsen, så gränsen är avsiktligt lågt satt
 * där den behövs. profil-fälten (punch/bass/bright/beat) är 0..1 (0.5≈snitt), och
 * `beat` = takt-konfidens. Tomt = inga krav → ambient-effekterna är ALLTID
 * tillgängliga och utgör poolens fallback. Trösklarna är måttliga och lätta att nudga.
 */
export type EffectReq = { minBpm?: number; needsPunch?: number; needsBass?: number; needsBright?: number; needsBeat?: number };
const REQUIREMENTS: Partial<Record<Mode, EffectReq>> = {
  // Snabb/aggressiv → kräver tempo (+ karaktär där det stärker)
  strobe:   { minBpm: 150 },
  rave:     { minBpm: 140, needsPunch: 0.40 },
  snap:     { minBpm: 130, needsPunch: 0.40 },
  gallop:   { minBpm: 125, needsBeat: 0.35 },
  // Transient-effekter → kräver anslag (trummor)
  drumkit:  { needsPunch: 0.45, needsBeat: 0.35 },
  duel:     { needsPunch: 0.40 },
  tick:     { needsPunch: 0.35, needsBeat: 0.30 },
  split:    { needsPunch: 0.35, needsBass: 0.35 },
  backbeat: { needsPunch: 0.35, needsBeat: 0.35 },
  // Bas-effekter → kräver låg-end
  subbreath:{ needsBass: 0.40 },
  gravity:  { needsBass: 0.35 },
  tide:     { needsBass: 0.30 },
  // Luft/diskant-effekter → kräver diskant
  airglow:  { needsBright: 0.40 },
  viska:    { needsBright: 0.35 },
  drift:    { needsBright: 0.30 },
  aurora:   { needsBright: 0.30 },
  // Rytm-effekter → kräver en hyfsat tydlig takt
  ripple:   { needsBeat: 0.35 },
  eko:      { needsBeat: 0.35 },
  hjarta:   { needsBeat: 0.35 },
  chase:    { needsBeat: 0.30 },
  drops:    { needsBeat: 0.30 },
  stege:    { needsBeat: 0.30 },
  varannan: { needsBeat: 0.35 },
};

/** Möter effekten sina krav givet nuvarande tempo + karaktärsprofil? */
export function meetsRequirements(
  key: Mode, bpm: number,
  p: { punch: number; bass: number; bright: number; beat: number },
): boolean {
  const r = REQUIREMENTS[key];
  if (!r) return true;
  if (r.minBpm !== undefined && bpm < r.minBpm) return false;
  if (r.needsPunch !== undefined && p.punch < r.needsPunch) return false;
  if (r.needsBass !== undefined && p.bass < r.needsBass) return false;
  if (r.needsBright !== undefined && p.bright < r.needsBright) return false;
  if (r.needsBeat !== undefined && p.beat < r.needsBeat) return false;
  return true;
}
