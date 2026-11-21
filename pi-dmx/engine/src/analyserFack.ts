/** FACKEN (flytten 2026-11-21): rattarna, de delade konstanterna och typerna; varje sten får sitt fack här. Anteckningar: docs/analysator/analyserFack.md */
import { PROFILE } from './analyserProfile.js';

// RATTAR
const ENV: Record<string, string | undefined> | undefined = typeof process !== 'undefined' ? process.env : undefined;
const ALIAS_PREFIX = PROFILE.envPrefix === 'LOTUS_' ? 'DMX_' : 'LOTUS_';
export function sysEnv(name: string): string | undefined {
  return ENV?.[PROFILE.envPrefix + name] ?? ENV?.[ALIAS_PREFIX + name] ?? PROFILE.sys[name];
}
/** TEMPOKÄLLAN. */
export function env(name: string): string | undefined {
  return ENV?.[name] ?? PROFILE.bare[name];
}
export function numEnv(name: string, def: number): number { const v = sysEnv(name); const x = Number(v); return v !== undefined && v !== '' && Number.isFinite(x) ? x : def; }

// KONSTANTER SOM FLER ÄN EN DEL LÄSER
export const BODY_CEIL_DB_S = 0.15;   // taket haller latens loud-referens lange
export const BE_FALLBACK_MS = 500;
export const BE_MEM_BEATS = 240;
export const BASS_SPAN_DB = 36;   // frame.bassEnergy / bassEnergyShort
export const BASSON_LEN = 32;
export const BIG_EVERY = 3;   // kor stor-FFT var N:e hop
export const SECTION_AGG_HOP = (sysEnv('SECTION_AGG') || 'env') === 'hop';   // SEKTIONSBLOCKENS TAKT
export const BODY_HIGH_MS = numEnv('SECTION_BODY_HIGH', 0), BODY_HIGH_DB = numEnv('SECTION_BODY_HIGH_DB', 3);   // BASEN TILLBAKA

/** Flyttal från start: skriv 0,5 och sedan värdet. */
export function stabilise(o: object, keys: readonly string[]): void {
  const r = o as Record<string, unknown>;
  for (const k of keys) { const v = r[k]; if (typeof v === 'number') { r[k] = 0.5; r[k] = v; } }
}

// TYPER
export interface BeatGrid { bpm: number; anchorMs: number; confidence?: number; }
/** Detektionsparametrar. */
export interface AnalyserDetection { autoGainTarget: number; tauUp: number; tauDown: number; noiseFloor: number; maxGain?: number }
export interface Cfg { audio: { rate: number }; fft: { size: number; hop: number }; detection: AnalyserDetection; onset: { enhancements: boolean } }
export type Role = 'all' | 'fast' | 'slow';
