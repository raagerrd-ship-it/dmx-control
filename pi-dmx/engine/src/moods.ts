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
  chill: ["breathe", "aurora", "mono", "airglow", "twin", "tide", "drift", "pendel", "viska"],
  fest:  ["breathe", "aurora", "twin", "wave", "chase", "pulse", "drops", "party", "snap", "bounce", "gallop", "ripple", "tide", "pendel", "backbeat", "eko", "hjarta", "stege",
          "forvarning", "basgang", "tyngdlyft", "frasraknare", "vidga"],   // 2026-09-23: signaleffekterna; 09-29 vidga
  galet: ["party", "snap", "bounce", "rave", "gallop", "ripple", "drops", "drumkit", "duel", "split", "pulse", "strobe", "backbeat", "tick", "stege", "eko",
          "forvarning", "basgang", "tyngdlyft", "frasraknare", "vidga"],
};

/** "Känslo-rattarna" per stämning. LÄTT ATT JUSTERA. */
const FEEL: Record<MoodId, {
  dynamics: number;      // 0 = jämnt, 1 = hård kontrast (mörkt mellan, smäll på topp)
  sensitivity: number;   // 0..1 reaktions-känslighet
  energyDrivesMode: boolean; // låt energin driva effekt-BYTEN (av = byter bara på dwell-timern → lugnt)
  smartDwellMs: number;  // hur ofta smart byter effekt (lägre = piggare)
  master: number;        // ljus-tak (0..1): hela riggens max-styrka
  beatSyncStrength: number; // hur hårt PLL-fasen knuffas mot trumslag (0/0.10/0.18/0.30)
}> = {
  chill: { dynamics: 0.30, sensitivity: 0.50,  energyDrivesMode: false, smartDwellMs: 40000, master: 0.30, beatSyncStrength: 0.10 },
  fest:  { dynamics: 0.60, sensitivity: 0.60, energyDrivesMode: true,  smartDwellMs: 15000,  master: 1.00, beatSyncStrength: 0.18 },
  galet: { dynamics: 0.85, sensitivity: 0.70, energyDrivesMode: true,  smartDwellMs: 10000,  master: 1.00,  beatSyncStrength: 0.30 },
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
 *  (Chill → Galet). Kontinuerliga rattar (dynamics/sensitivity/master/smartDwellMs) lerpas mjukt mellan tre ankare; poolen och boolean-
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
  cfg.smartDwellMs   = Math.round(lerp(a.smartDwellMs, b.smartDwellMs));

  // Bucket-snäpp på ~1/3 och ~2/3 (matchar POOL/FEEL-anchoreringen ovan).
  const bucket: MoodId = x < 1 / 3 ? "chill" : x < 2 / 3 ? "fest" : "galet";
  const bf = FEEL[bucket];
  cfg.energyDrivesMode = bf.energyDrivesMode;
  if (!cfg.beatSyncOverride) cfg.beatSyncStrength = bf.beatSyncStrength;
  const pool = new Set<Mode>(POOL[bucket]);
  const rot: Partial<Record<Mode, boolean>> = {};
  for (const k of EFFECT_KEYS) rot[k] = pool.has(k);
  cfg.rotation = rot;

  cfg.activeMood     = bucket;   // för legacy-UI som markerar chill/fest/galet
  cfg.activeIntensity = x;
}
