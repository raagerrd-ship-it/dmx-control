/**
 * Effekt-registret — EN sanningskälla för alla effekter.
 *
 * Lägg till en effekt = skapa en fil här + en rad i EFFECTS nedan (+ en post i
 * Mode-unionen i config.ts). Motorn, läges-cykeln, valideringen, smart-poolerna
 * och UI:t härleds alla ur det här registret — ingen duplicering i fem filer.
 */

import type { Mode } from "../config.js";
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

// ORDNING = fysiska knappens/WS-cykelns ordning (MODE_CYCLE efter "smart").
export const EFFECTS: EffectDef[] = [
  drops, party, chase, wave, breathe, snap, bounce, mono, aurora, pulse,
  strobe, rave, eq, gallop, twin, ripple, gravity, drumkit, split, subbreath,
  duel, airglow,
];

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
export const EFFECT_META = EFFECTS.map(({ key, label, desc, tier }) => ({ key, label, desc, tier }));
