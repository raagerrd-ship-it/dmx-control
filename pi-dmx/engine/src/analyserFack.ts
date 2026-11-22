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

// FACKEN. Startvärde = dagens startvärde (byte för byte).

/** HOPPET: kärnans fält per hopp. Skrivkartan per tråd: docs/analysator/analyserFack.md. */
export class HopOut {
  role: Role = 'all'; bigOn = false; cfg!: Cfg;   // skrivs en gång i Analysers konstruktor
  dtHop = 0; hopMs = 0.5;
  rms = 0.5; now = 0.5; dt = 0.5; nowWall = 0.5; gated = false;
  kickFlux = 0.5; energy = 0.5; flux = 0.5; level = 0.5; lvlSmooth = 0; centSmooth = 0.5; body = 0.5; breaking = false;
  kickHit = 0;   // trumkittet
  sec = 'intro'; lvh = 0.5; conf = 0.5; bpm = 0.5;   // långsamma värden sedda vid hoppet
  constructor(readonly wallNow: () => number) { stabilise(this, ['lvlSmooth', 'kickHit']); }   // wallNow = analysatorns väggklocka
}

/** NIVÅN. intensity = förr hIntensity, inZone = förr levels.inZoneState. */
export class LevelOut {
  gain = 1; envelope!: number; activeMs = 0; silentMs = -0; intensity = 0.5; levelCeil = 0.5; inZone = false; gainLocked = false;
  constructor() { stabilise(this, ['activeMs']); }
}
/** SPEKTRUMET. Banden förblir Float32Array. sink = förr specSink. */
export class SpectrumOut {
  readonly bandAbs = new Float32Array(8); readonly bandDbRaw = new Float32Array(8);   // absolut magnitud före AGC, rå dB
  readonly bandLvl = new Float32Array(8); readonly bandOn = new Float32Array(8); readonly fbOn = new Float32Array(8);
  readonly bassOnRing = new Float32Array(BASSON_LEN); bassOnN = 0;
  bigN = 0; bassOnPeaks = 0;   // räknare: stor-FFT:er och bastoppar (förr flaggorna secSpecDirty, bassOnPeak)
  sink: ((mag: Float32Array, binHz: number) => void) | null = null;
}
/** KICKEN. kick = förr hKick, kickAt = förr hKickAt. */
export class KickOut {
  kick = false; kickAt = 0.5;
  beatAnchorMs = 0; pendingKickMs = 0; lastKick = 0; kfPrev = 0; kfPrev2 = 0;
  dbgKick: { flux: number; thresh: number; med: number; mad: number; energy: number; gain: number; rms: number; env: number; locked: boolean } | null = null;
  constructor() { stabilise(this, ['pendingKickMs', 'kfPrev', 'kfPrev2', 'beatAnchorMs', 'lastKick']); }
  neutral(): void { this.kickAt = 0; }   // kicken av: ingen förfinad kick (0,5 vore en kick vid 0,5 ms för klockan)
}
/** KLOCKAN sedd av analysatorn: bpm/conf = förr localBpm/localBpmConfidence, phaseMs/phaseConf = gridfasen, src = förr beatSrc (samma objekt). */
export class ClockOut {
  bpm = 0; conf = 0; phaseMs = 0; phaseConf = 0;
  src!: { beat?: BeatGrid | null };
  constructor() { stabilise(this, ['conf']); }
  resetPhase(): void { this.phaseMs = 0; this.phaseConf = 0; }   // hopp i klockan (setVirtualClock)
  zeroBpm(): void { this.bpm = 0; }   // tystnad 10 s (nivån, F_SIL10)
}

/** SEKTIONEN: de 17 publicerade fälten (förr på Analyser). */
export class SectionOut {
  section = 'intro'; sectionStartMs = 0; sectionIndex = 0; sectionTier = 1; prevSection = ''; levelVsHighDb = 0;
  repeatSim = 0; repeatAgoMs = 0; repeatSection = ''; repeatTier = -1; repeatHighAtMs = 0; repeatHighEndAtMs = 0;
  expectHighMs = 0; expectSource = 0; secBuildAt = 0; secBuildSeen = 0; boundaryNov = 0;
  constructor() { stabilise(this, ['expectHighMs', 'levelVsHighDb', 'sectionStartMs', 'secBuildAt', 'secBuildSeen', 'repeatSim', 'repeatAgoMs']); }
  neutral(): void { this.section = ''; }   // sektionen av: '' = okänd (sectionCode 0); 'intro' skulle ge drops lugn-veto
}
/** BASEN. bassline/onsetsPerBeat = förr profBassline/bassOnsetsPerBeat. */
export class BassOut {
  beHi = NaN; beRef = NaN; beShort = 0; energy = 0; bassline = 0; onsetsPerBeat = 0;
  constructor() { stabilise(this, ['bassline', 'onsetsPerBeat']); }
  neutral(): void { this.beHi = 0; this.beRef = 0; }   // basen av: bassLevel 1 i stället för NaN
}
/** UPPBYGGNADEN. inRiser = förr hInRiser. */
export class RiserOut { buildUp = 0; inRiser = false; constructor() { stabilise(this, ['buildUp']); } }
/** DROP. */
export class DropOut {
  dropCount = 0; miniDropCount = 0; buildStartCount = 0; dropCand = 0; secBodyRet = 0;
  dropDemoted = 0; dropSpaced = 0; dropRiseDb = -0; nearDropDb = -0; nearDipDb = -0; liftDb = -0; stopCount = 0; stopS = -0;
  lastDropMs = -1.5e9; bodyUnderDb = 0;   // lastDropMs utanför Smi-intervallet
  constructor() { stabilise(this, ['lastDropMs', 'dropRiseDb', 'nearDropDb', 'nearDipDb', 'liftDb', 'stopS']); }
}
/** KARAKTÄREN. profile = förr character.outProfile, ramens profile pekar hit. */
export class CharacterOut { readonly profile = { punch: 0.4, bass: 0.5, bright: 0.3, beat: 0.5, bassline: 0 }; }

export interface Fack { hop: HopOut; level: LevelOut; spectrum: SpectrumOut; kick: KickOut; clock: ClockOut;
  section: SectionOut; bass: BassOut; riser: RiserOut; drop: DropOut; character: CharacterOut }
export function makeFack(wallNow: () => number): Fack {
  return { hop: new HopOut(wallNow), level: new LevelOut(), spectrum: new SpectrumOut(), kick: new KickOut(), clock: new ClockOut(),
    section: new SectionOut(), bass: new BassOut(), riser: new RiserOut(), drop: new DropOut(), character: new CharacterOut() };
}

/** EN AVSTÄNGD STEN: facket får sitt neutrala värde, och det syns i loggen. */
export function off(name: string, fack?: { neutral(): void }): null {
  fack?.neutral();
  console.log(`[analysator] sten av: ${name}`);
  return null;
}
