/**
 * Hyresgäst-STÄMNINGAR: ETT val ställer in hela riggens känsla.
 * Motorn äger definitionen (en sanningskälla) — UI:t (Lovable) skickar bara
 *   { type: "setMood", value: "chill" | "fest" | "galet" }  →  applyMood().
 *
 * ▼▼▼ JUSTERA HÄR ▼▼▼  Alla värden nedan är trygga att tweaka; bygg om + deploya.
 */
import type { EngineConfig, MoodId, Mode } from "./config.js";
import { EFFECT_KEYS } from "./effects/registry.js";

/** Vilka effekter smart-läget får välja bland per stämning (rotation-poolen).
 *  Bara dessa är "på"; alla andra sätts AV så smart bara plockar ur poolen. */
const POOL: Record<MoodId, Mode[]> = {
  chill: ["breathe", "aurora", "mono", "subbreath", "airglow", "twin", "tide", "drift", "pendel", "viska"],
  fest:  ["breathe", "aurora", "twin", "wave", "chase", "pulse", "drops", "party", "snap", "bounce", "gallop", "ripple", "tide", "pendel", "backbeat", "eko", "hjarta", "stege"],
  galet: ["party", "snap", "bounce", "rave", "gallop", "ripple", "drops", "drumkit", "duel", "split", "pulse", "strobe", "backbeat", "tick", "stege", "eko"],
};

/** "Känslo-rattarna" per stämning. LÄTT ATT JUSTERA. */
const FEEL: Record<MoodId, {
  dynamics: number;      // 0 = jämnt, 1 = hård kontrast (mörkt mellan, smäll på topp)
  sensitivity: number;   // 0..1 reaktions-känslighet
  beatPulse: boolean;    // pulsa hela riggen på taktslag
  dropBlackout: boolean; // kort kolsvart just före drop-explosionen
  clubMode: boolean;     // kvadrera VU-taket → extra hård kontrast
  ambientGlow: boolean;  // varm vilo-glöd i tystnad (annars helt mörkt)
  energyDrivesMode: boolean; // låt energin driva effekt-BYTEN (av = byter bara på dwell-timern → lugnt)
  smartDwellMs: number;  // hur ofta smart byter effekt (lägre = piggare)
  master: number;        // ljus-tak (0..1): hela riggens max-styrka
  calmDecay: number;     // output-decay (s) för lugna/fart-effekter: högre = trögare,
                         //   ljuset tonar långsamt = "långsam reaktion". (fart-lägen
                         //   har egen kort decay; detta rör calm/fart.)
  // ── Regi (pro) — anpassas per stämning (scenicAnchor lämnas till ägaren; layout-beroende) ──
  /** Dynamiskt VU-ljustak. AV i alla stamningar sedan 2026-08-07: det var
   *  ENDA signalen som applicerades EFTER ballistiken (outjamnad, med flit) och
   *  gav synligt FLADDER vid max ljusstyrka, dar VU:n ror sig 0.8-1.0.
   *  Isolerat med tre test: clubMode av = ingen skillnad; en lampa pa ratt
   *  DMX 255 stod HELT stabil (hardvaran frisk); energyCeiling av = fladdret
   *  BORTA. Agarens dom med den av: "betydligt battre och jamnare".
   *  Effekterna reagerar anda pa musiken via c.audio/c.punch — VU-taket var ett
   *  EXTRA globalt lager, inte sjalva musikreaktiviteten.
   *  Kan fortfarande slas pa manuellt i Regi (pro). */
  /** LJUSTAK UR INSIGNALEN (p5..p95 rullande, 0,12 s attack / 0,60 s release).
   *  Stod länge på false: taket fladdrade. Två orsaker hittades 2026-08-07 —
   *  (1) en glappkontakt på AUX halverade signalen, vilket halverade brusmarginalen
   *  i just de tysta partier där taket rör sig mest, och (2) hjärtslaget och
   *  utgångens ballistik var två attack/decay-enveloper i SERIE. Med hel kabel och
   *  en envelope är taket lugnt — och det kan aldrig hamna ur fas med musiken,
   *  eftersom det ÄR musiken. Minnets förberäknade kurva behövs inte för detta.
   *  ("nu blev det känsla!! hjärtslagen ihop med dynamiska ljusstyrkan")
   */
  energyCeiling: boolean;
  riserStrobe: boolean;   // accelererande strobe + vit-kollaps under uppbyggnad → drama
  dropHeadroom: boolean;  // normal ≤90%, drops → 100% (drops poppar hårdare)
  beatSyncStrength: number; // hur hårt PLL-fasen knuffas mot trumslag (0/0.10/0.18/0.30)
}> = {
  chill: { dynamics: 0.30, sensitivity: 0.50, beatPulse: false, dropBlackout: false, clubMode: false, ambientGlow: true,  energyDrivesMode: false, smartDwellMs: 40000, master: 0.30, calmDecay: 1.20, energyCeiling: true, riserStrobe: false, dropHeadroom: false, beatSyncStrength: 0.10 },
  fest:  { dynamics: 0.60, sensitivity: 0.60, beatPulse: true,  dropBlackout: true,  clubMode: false, ambientGlow: false, energyDrivesMode: true,  smartDwellMs: 15000,  master: 1.00, calmDecay: 0.42, energyCeiling: true, riserStrobe: false, dropHeadroom: false, beatSyncStrength: 0.18 },
  galet: { dynamics: 0.85, sensitivity: 0.70, beatPulse: true,  dropBlackout: true,  clubMode: true,  ambientGlow: false, energyDrivesMode: true,  smartDwellMs: 10000,  master: 1.00, calmDecay: 0.42, energyCeiling: true, riserStrobe: true,  dropHeadroom: true,  beatSyncStrength: 0.30 },
};
/** ▲▲▲ JUSTERA HÄR ▲▲▲ */

export function isMood(v: unknown): v is MoodId {
  return v === "chill" || v === "fest" || v === "galet";
}

/** Applicera en stämning på configen. Anroparen (server-handlern) sköter
 *  broadcast + persist efteråt. Rör INTE audioInput (hyresgästen väljer AUX/mic
 *  separat). master (ljus-tak) sätts nu per stämning; kan justeras manuellt efteråt. */
export function applyMood(cfg: EngineConfig, mood: MoodId): void {
  const f = FEEL[mood];
  cfg.mode = "smart";              // stämningarna följer alltid musiken
  cfg.energyDrivesMode = f.energyDrivesMode;   // chill: av → byter effekt bara på dwell
  cfg.dynamics = f.dynamics;
  cfg.sensitivity = f.sensitivity;
  cfg.smartDwellMs = f.smartDwellMs;
  cfg.master = f.master;           // ljus-tak
  cfg.calmDecay = f.calmDecay;      // reaktions-tröghet (output-decay)
  cfg.beatPulse = f.beatPulse;
  if (cfg.regiPro) {
    cfg.dropBlackout = f.dropBlackout;
    cfg.clubMode = f.clubMode;
    cfg.ambientGlow = f.ambientGlow;
    cfg.energyCeiling = f.energyCeiling;   // Regi (pro): VU-ljustak
    cfg.riserStrobe = f.riserStrobe;       // Regi (pro): uppbyggnads-strobe
    cfg.dropHeadroom = f.dropHeadroom;     // Regi (pro): drop-pop
  }
  if (!cfg.beatSyncOverride) cfg.beatSyncStrength = f.beatSyncStrength; // PLL-styrka mot trumslag
  // Rotation: bara stämningens pool aktiv (allt annat AV → smart väljer bara ur poolen).
  const pool = new Set<Mode>(POOL[mood]);
  const rot: Partial<Record<Mode, boolean>> = {};
  for (const k of EFFECT_KEYS) rot[k] = pool.has(k);
  cfg.rotation = rot;
  cfg.activeMood = mood;
  cfg.activeIntensity = mood === "chill" ? 0 : mood === "fest" ? 0.5 : 1;
}

/** Kontinuerlig stämning från ETT vred (KY-040) eller UI-slider: 0..1
 *  (Chill → Galet). Kontinuerliga rattar (dynamics/sensitivity/master/calm­
 *  Decay/smartDwellMs) lerpas mjukt mellan tre ankare; poolen och boolean-
 *  flaggorna snäpper vid 1/3 och 2/3 så motorns rotation-set byts stegvis. */
export function applyIntensity(cfg: EngineConfig, xRaw: number): void {
  const x = Math.max(0, Math.min(1, xRaw));
  // Två segment: chill (0) → fest (0.5) → galet (1).
  const [aId, bId, t] = x <= 0.5
    ? (["chill", "fest",  x / 0.5]        as const)
    : (["fest",  "galet", (x - 0.5) / 0.5] as const);
  const a = FEEL[aId], b = FEEL[bId];
  const lerp = (u: number, v: number) => u + (v - u) * t;

  cfg.mode = "smart";
  cfg.dynamics       = lerp(a.dynamics, b.dynamics);
  cfg.sensitivity    = lerp(a.sensitivity, b.sensitivity);
  cfg.master         = lerp(a.master, b.master);
  cfg.calmDecay      = lerp(a.calmDecay, b.calmDecay);
  cfg.smartDwellMs   = Math.round(lerp(a.smartDwellMs, b.smartDwellMs));

  // Bucket-snäpp på ~1/3 och ~2/3 (matchar POOL/FEEL-anchoreringen ovan).
  const bucket: MoodId = x < 1 / 3 ? "chill" : x < 2 / 3 ? "fest" : "galet";
  const bf = FEEL[bucket];
  cfg.energyDrivesMode = bf.energyDrivesMode;
  cfg.beatPulse        = bf.beatPulse;
  if (cfg.regiPro) {
    cfg.dropBlackout     = bf.dropBlackout;
    cfg.clubMode         = bf.clubMode;
    cfg.ambientGlow      = bf.ambientGlow;
    cfg.energyCeiling    = bf.energyCeiling;
    cfg.riserStrobe      = bf.riserStrobe;
    cfg.dropHeadroom     = bf.dropHeadroom;
  }
  if (!cfg.beatSyncOverride) cfg.beatSyncStrength = bf.beatSyncStrength;
  const pool = new Set<Mode>(POOL[bucket]);
  const rot: Partial<Record<Mode, boolean>> = {};
  for (const k of EFFECT_KEYS) rot[k] = pool.has(k);
  cfg.rotation = rot;

  cfg.activeMood     = bucket;   // för legacy-UI som markerar chill/fest/galet
  cfg.activeIntensity = x;
}
