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
 *  effekt-fil – så vi har EN översikt att justera från. */
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
