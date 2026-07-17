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
  chill: ["breathe", "aurora", "mono", "subbreath", "airglow", "twin"],
  fest:  ["breathe", "aurora", "twin", "wave", "chase", "pulse", "drops", "party", "snap", "bounce", "gallop", "ripple"],
  galet: ["party", "snap", "bounce", "rave", "gallop", "ripple", "drops", "drumkit", "duel", "split", "pulse", "strobe"],
};

/** "Känslo-rattarna" per stämning. LÄTT ATT JUSTERA. */
const FEEL: Record<MoodId, {
  dynamics: number;      // 0 = jämnt, 1 = hård kontrast (mörkt mellan, smäll på topp)
  sensitivity: number;   // 0..1 reaktions-känslighet
  beatPulse: boolean;    // pulsa hela riggen på taktslag
  dropBlackout: boolean; // kort kolsvart just före drop-explosionen
  clubMode: boolean;     // kvadrera VU-taket → extra hård kontrast
  ambientGlow: boolean;  // varm vilo-glöd i tystnad (annars helt mörkt)
  smartDwellMs: number;  // hur ofta smart byter effekt (lägre = piggare)
  master: number;        // ljus-tak (0..1): hela riggens max-styrka
  calmDecay: number;     // output-decay (s) för lugna/fart-effekter: högre = trögare,
                         //   ljuset tonar långsamt = "långsam reaktion". (fart-lägen
                         //   har egen kort decay; detta rör calm/fart.)
  // ── Regi (pro) — anpassas per stämning (scenicAnchor lämnas till ägaren; layout-beroende) ──
  energyCeiling: boolean; // dynamiskt VU-ljustak (styrka följer sektionsenergin)
  riserStrobe: boolean;   // accelererande strobe + vit-kollaps under uppbyggnad → drama
  dropHeadroom: boolean;  // normal ≤90%, drops → 100% (drops poppar hårdare)
}> = {
  chill: { dynamics: 0.30, sensitivity: 0.50, beatPulse: false, dropBlackout: false, clubMode: false, ambientGlow: true,  smartDwellMs: 20000, master: 0.55, calmDecay: 0.80, energyCeiling: true, riserStrobe: false, dropHeadroom: false },
  fest:  { dynamics: 0.60, sensitivity: 0.60, beatPulse: true,  dropBlackout: true,  clubMode: false, ambientGlow: false, smartDwellMs: 9000,  master: 1.00, calmDecay: 0.42, energyCeiling: true, riserStrobe: false, dropHeadroom: false },
  galet: { dynamics: 0.85, sensitivity: 0.70, beatPulse: true,  dropBlackout: true,  clubMode: true,  ambientGlow: false, smartDwellMs: 6000,  master: 1.00, calmDecay: 0.42, energyCeiling: true, riserStrobe: true,  dropHeadroom: true  },
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
  cfg.energyDrivesMode = true;
  cfg.dynamics = f.dynamics;
  cfg.sensitivity = f.sensitivity;
  cfg.beatPulse = f.beatPulse;
  cfg.dropBlackout = f.dropBlackout;
  cfg.clubMode = f.clubMode;
  cfg.ambientGlow = f.ambientGlow;
  cfg.smartDwellMs = f.smartDwellMs;
  cfg.master = f.master;           // ljus-tak
  cfg.calmDecay = f.calmDecay;      // reaktions-tröghet (output-decay)
  cfg.energyCeiling = f.energyCeiling;   // Regi (pro): VU-ljustak
  cfg.riserStrobe = f.riserStrobe;       // Regi (pro): uppbyggnads-strobe
  cfg.dropHeadroom = f.dropHeadroom;     // Regi (pro): drop-pop
  // Rotation: bara stämningens pool aktiv (allt annat AV → smart väljer bara ur poolen).
  const pool = new Set<Mode>(POOL[mood]);
  const rot: Partial<Record<Mode, boolean>> = {};
  for (const k of EFFECT_KEYS) rot[k] = pool.has(k);
  cfg.rotation = rot;
  cfg.activeMood = mood;
}
