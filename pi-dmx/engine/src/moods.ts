/**
 * LJUSSTYRKAN (vredet KY-040 och slidern i UI:t). STÄMNINGARNA chill/fest/galet ÄR BORTTAGNA 2026-10-11 (ägaren i ladan:
 * "gör det [konsertläget] till enda läget" + "du kan ta bort stämningarna tillsvidare"): de valde effektpool, dynamik, dwell och
 * ljustak per stämning. Nu finns ett läge - konsertshowen (effects.ts CONCERT) med alla effekter som dirigenten får välja - och
 * vredet styr bara ljustaket (cfg.master). 0 = släckt sköts av UI:t/vredets knapp (mode blackout), inte här.
 * Gamla stämningar finns i git-historiken (moods.ts före 2026-10-11).
 */
import { readFileSync } from "node:fs";
import type { EngineConfig } from "./config.js";

/** KALLSTART = MAX (ägaren 11-22: nästa uthyrning börjar på max). Ny boot_id = Pi:n har startats om (inte bara motorn) ->
 *  reglaget till max. En omstart av motorn mitt i kvällen behåller läget. Sant om något ändrades. */
export function maxOnColdBoot(cfg: EngineConfig): boolean {
  let id = "";
  try { id = readFileSync("/proc/sys/kernel/random/boot_id", "utf8").trim(); } catch { return false; }
  if (!id || cfg.lastBootId === id) return false;
  const first = cfg.lastBootId === undefined;
  cfg.lastBootId = id;
  if (!first) applyIntensity(cfg, 1);
  return true;
}

/** Ljustakets spann för vredet/slidern (ägaren 11-22: 30-95 %, hyraren ser inga värden). */
const MASTER_MIN = 0.3;
const MASTER_MAX = 0.95;

/** Vred/slider 0..1 -> ljustak MASTER_MIN..MASTER_MAX. Ändrar inget annat än läget (smart) och ljustaket. */
export function applyIntensity(cfg: EngineConfig, xRaw: number): void {
  const x = Math.max(0, Math.min(1, xRaw));
  cfg.mode = "smart";
  cfg.master = MASTER_MIN + (MASTER_MAX - MASTER_MIN) * x;
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
