/**
 * LJUSSTYRKAN (vredet KY-040 och slidern i UI:t). STÄMNINGARNA chill/fest/galet ÄR BORTTAGNA 2026-10-11 (ägaren i ladan:
 * "gör det [konsertläget] till enda läget" + "du kan ta bort stämningarna tillsvidare"): de valde effektpool, dynamik, dwell och
 * ljustak per stämning. Nu finns ett läge - konsertshowen (effects.ts CONCERT) med alla effekter som dirigenten får välja - och
 * vredet styr bara ljustaket (cfg.master). 0 = släckt sköts av UI:t/vredets knapp (mode blackout), inte här.
 * Gamla stämningar finns i git-historiken (moods.ts före 2026-10-11).
 */
import type { EngineConfig } from "./config.js";

/** Lägsta ljustak när vredet står längst ner men inte på av (slidern 1 av 10). */
const MASTER_MIN = 0.2;

/** Vred/slider 0..1 -> ljustak MASTER_MIN..1. Ändrar inget annat än läget (smart) och ljustaket. */
export function applyIntensity(cfg: EngineConfig, xRaw: number): void {
  const x = Math.max(0, Math.min(1, xRaw));
  cfg.mode = "smart";
  cfg.master = MASTER_MIN + (1 - MASTER_MIN) * x;
  cfg.activeIntensity = x;
}

/** Engångsflytt av en sparad config från stämningstiden: activeMood borttaget, vredet på max (= samma ljus som konsertläget
 *  kördes med i ladan 10-11, master 1). Anropas vid start. Sant om något ändrades. */
export function migrateFromMoods(cfg: EngineConfig): boolean {
  const c = cfg as EngineConfig & { activeMood?: unknown };
  if (c.activeMood === undefined) return false;
  delete c.activeMood;
  applyIntensity(cfg, 1);
  return true;
}
