/** ENAD ANALYSATOR (2026-09-24) — en fil, samma byte i lotus-light-link (pi/src/audio-analyser/) och dmx-control (pi-dmx/engine/src/). Anteckningar (kommentarerna som stod i koden): docs/analysator/analyser.md */

import { sysEnv, stabilise, makeFack, off, stenarAv, type Fack, BODY_CEIL_DB_S, BE_FALLBACK_MS, BASS_SPAN_DB, BIG_EVERY,
  type BeatGrid, type AnalyserDetection, type Cfg, type Role } from './analyserFack.js';
export { BASS_SPAN_DB, BODY_CEIL_DB_S };
export type { BeatGrid, AnalyserDetection, Cfg, Role };
import {
  POST_N, POST_PCM, POST_LEN, P_SEQ, P_N, P_ENVF, P_NOW, P_REC, P_PERF, P_FLAGS, P_HINT_MS, P_VCLOCK, P_FLAGCNT, RING_MARGIN, FLAG_BITS, B, BS, S,
  packFlagCounts, lostFlags, seqLow, seqDelta, C_WAITING, C_FORM_SEQ, S_LOST_FLAGS,
  F_HINT, F_VCLOCK_SET, F_VCLOCK_NULL,
  C_WRITE, C_READ, S_REC_SEQ, S_PROCESSED, S_LAG_MS, S_LAG_MAX, S_BUSY_US, S_BUSY_MAX_US, S_SKIPPED, STATE_LEN,
  stateWrite, stateRead, createSplitBuffers, type SplitBuffers, type WorkerData,
  C_WAKE, syncWait, HopLaneFast, HopLaneSlow, StateReader,
  C_WAITING_B, C_BIG_READ, BS_SEQ, svarDelar,
  BS_SPEC_N, BS_SKIPPED, BIG_STATE_LEN, SPEC_SLOTS, SPEC_MAX,
} from './split.js';
const Bh = B.hop, Bf = B.fft, Bl = B.level, Bk = B.kick, BSs = BS.spectrum, Sc = S.clock;   // kärnans platser ur taggarna
import FFT from "fft.js";
import { BeatFeed, publishPhase, type ClockCfg } from "./analyserClock.js";   // ANALYSATORNS KLOCKA
import { DropDetector } from "./analyserDrop.js";
import { SectionTracker } from "./analyserSection.js";
import { RiserDetector } from "./analyserRiser.js";
import { CharacterProfile } from "./analyserCharacter.js";
import { KickDetector } from "./analyserKick.js";
import { BassTracker } from "./analyserBass.js";
import { LevelTracker } from "./analyserLevel.js";
import { SpectrumBands } from "./analyserSpectrum.js";
import { SmallFft, hannWindow } from "./analyserFft.js";

/** Sann om ratten ar satt till nagot icke-tomt. */
function sysOn(name: string): boolean { return !!sysEnv(name); }
const BPM_TRACE = sysOn('BPM_TRACE');

export interface AnalyserConfig {
  sampleRate?: number;   // Platt form
  hopSize?: number;
  fftSize?: number;   // Small-FFT size
  autoGainTarget?: number;
  tauUp?: number;
  tauDown?: number;
  noiseFloor?: number;
  silenceLevel?: number;   // Släckgränsen på frame.level
  maxGain?: number;   // Upper clamp for analyser gain
  onsetEnhancements?: boolean;   // Enable log-compressed, adaptively whitened and normalized onset features
  audio?: { rate: number };   // Nastlad form
  fft?: { size: number; hop: number };
  detection?: AnalyserDetection;
  beat?: BeatGrid | null;
  role?: Role;   // DELAD ANALYSATOR
  split?: SplitBuffers;
  resumeSeq?: number;   // Seq att fortsatta fran
}

/** DELAD ANALYSATOR. */
export interface SplitInit {
  role: Role;
  split?: SplitBuffers;
  resumeSeq?: number;
  sync?: boolean;   // Bänkens synk-läge
}

/** Rikt log-spektrum. */
export interface Spectrum {
  sub: number;
  kick: number;
  bass: number;
  lowMid: number;
  mid: number;
  highMid: number;
  treble: number;
  air: number;
}

export const SILENCE_LEVEL = 0.05;   // Släckgränsens standard
let silenceLevelLive = SILENCE_LEVEL;
/** Samma tystnadsbeslut som frame.silent för den som bara har nivån. */
export function silentLevel(level: number): boolean { return level <= silenceLevelLive; }

export interface Frame {
  silent: boolean;   // TYSTNAD
  level: number;   // 0..1, auto-gained RMS
  levelVU: number;   // 0..1, ~200ms symmetriskt smoothat PÅ HOP-TAKT
  energy: number;   // 0..1, bass-band spectral energy

  centroid: number;   // mid/treble på 512-FFT:n är BORTA
  flux: number;   // 0..1, bass-band spectral flux
  kick: boolean;   // true on rising edge only
  gain: number;   // current auto-gain factor
  bpm: number;   // 0 = ej låst
  bpmConfidence: number;   // 0..1, hur tydlig vinnande takttoppen är
  intensity: number;   // 0..1 SEKTIONSENERGI relativt låtens eget snitt
  dropCount: number;   // DROP-DETEKTION
  miniDropCount: number;   // MINIDROP
  dropBuildCount: number;   // UPPBYGGNAD: stiger när en uppbyggnad börjar (basen dras ur, högst var 3:e s)
  dropDemoted: number; dropSpaced: number;   // EN DROPDETEKTOR
  nearDropDb: number; nearDipDb: number; liftDb: number; stopCount: number; stopS: number; dropMiniBack: number; dropKeys: number; dropNear: number;   // LYFT/NÄSTAN-DROP/STOPP; dropMiniBack: minidropens baskropp föll tillbaka
  levelInZone: boolean;   // nivån är i låtens topp-zon
  levelBreaking: boolean;   // nivån är i en svacka/break
  buildUp: number;   // UPPBYGGNAD
  sectionBuildProg: number;   // UPPBYGGNADENS FÖRLOPP 0..1
  inRiser: boolean;
  profile: { punch: number; bass: number; bright: number; beat: number; bassline: number };   // KARAKTÄRSPROFIL
  kickAnchorMs: number;   // wall-clock ms för ett taktslag
  kickAtMs: number;
  barShift: number;   // TAKTFAS
  beatPhaseMs: number;   // GRIDFAS
  beatPhaseConf: number;   // Gridfasens on/half-kvot
  beatTrust: number;   // TILLITEN TILL TAKTEN 0..1
  section: string;   // SEKTION
  sectionAgeMs: number;   // ms sedan sektionen borjade
  sectionIndex: number;   // antal 'high'-partier hittills i laten
  sectionTier: number;   // 0 lag / 1 mellan / 2 hog
  repeatSim: number; repeatAgoMs: number;   // UPPREPNING
  expectHighInMs: number; prevSection: string; sectionLevelVsHighDb: number; sectionBars: number;   // SEKTIONSMINNE + FORUTSAGELSE
  spec: Spectrum;   // Rikt spektrum + per-band onset
  specAbs: Spectrum;   // Absolut per-band magnitud före AGC, för Lotus ljusväg och bandandelar
  bodyDb: number;   // BASKROPPEN I RA dB
  bassEnergy: number; bassEnergyShort: number; bassLevel: number;   // BASENERGIN 0..1
  midHiDb: number;   // ABSOLUT mid+diskant-niva i dB
  onset: Spectrum;   // per-band ONSET/anslag
  drum: { kick: number; snare: number; hat: number; bass: number };   // TRUM-KIT-envelopes
  stenarAv: number;   // en bit per avstängd sten (analyserFack.ts stenarAv)
}

export class Analyser {
  readonly f: Fack = makeFack(() => this.wallNow());   // FACKEN
  get role(): Role { return this.f.hop.role; }   get bigOn(): boolean { return this.f.hop.bigOn; }   get cfg(): Cfg { return this.f.hop.cfg; }
  get bandOn(): Float32Array { return this.f.spectrum.bandOn; }   get beatSrc(): { beat?: BeatGrid | null } { return this.f.clock.src; }   // verktygen
  get bodyUnderDb(): number { return this.f.drop.bodyUnderDb; }   get bassOnsetsPerBeat(): number { return this.f.bass.onsetsPerBeat; }   // klockan (HopTarget), verktygen
  get boundaryNov(): number { return this.f.section.boundaryNov; }   // boundaryBench.mjs
  private outSpecAbs: Spectrum = { sub: 0, kick: 0, bass: 0, lowMid: 0, mid: 0, highMid: 0, treble: 0, air: 0 };
  private outSpec: Spectrum = { sub: 0, kick: 0, bass: 0, lowMid: 0, mid: 0, highMid: 0, treble: 0, air: 0 };
  private outOnset: Spectrum = { sub: 0, kick: 0, bass: 0, lowMid: 0, mid: 0, highMid: 0, treble: 0, air: 0 };
  private outDrum = { kick: 0, snare: 0, hat: 0, bass: 0 };   // trum-envelopes
  private outFrame!: Frame;   // ETT återanvänt Frame
  private static readonly BAND_HZ = [20, 60, 120, 250, 500, 1200, 3500, 10000, 16000];
  static readonly BE_FALLBACK_MS = BE_FALLBACK_MS;

  static readonly BIG_EVERY = BIG_EVERY;
  private static readonly FB_TAU_MS = [12, 6, 3];
  setSpectrumSink(fn: ((mag: Float32Array, binHz: number) => void) | null): void { this.f.spectrum.sink = fn; }
  private static readonly ENV_HZ = 100;


  private static readonly GRID_PHASE_OFFSET_MS = Number(sysEnv('GRID_PHASE_OFFSET_MS')) || 0;   // Fasval

  private tickT = 0;   // 100 Hz-steget
  private splitCtrl: Int32Array | null = null; private splitState: Float64Array | null = null;
  private stateCopy = new Float64Array(STATE_LEN); private stateRd = new StateReader();   // a7: kopian bara när blocket ändrats
  private recSeq = 0;   // fast: senast skrivna record
  private barrierSeq = 0;   // fast: tillstand aldre an detta record ignoreras
  private pendFlags = 0; private pendHintMs = 0; private pendVclock = 0; private recPost = 0; private recPerf = 0;   // fast: recordet som åker med i hoppets post (kedjan steg 11N)
  private flagCnt = new Int32Array(FLAG_BITS);   // fast: antal ganger varje flagga rests
  private slowLastCnt = -1;   // slow: P_FLAGCNT i senast behandlade record
  private slowGap = false;   // slow: poster tappade sedan senast behandlade
  private slowLostFlags = 0;   // slow: antal flaggor som aterskapats ur raknarna efter tapp
  splitRestarts = 0;   // fast: antal omstarter av workern
  hopLane: HopLaneFast | null = null;   // TAKTVÄGEN
  private syncWorker = false;   // fast: vänta på workern efter varje record
  private inlinePeer: Analyser | null = null;
  private postRing: Float64Array | null = null; private postPcm: Float32Array | null = null; private bigState: Float64Array | null = null;   private postSeq = 0; private bigCopy = new Float64Array(BIG_STATE_LEN); private bigRd = new StateReader();  private specDelivered = 0;  private postSkipped = 0;
  private bigEnvFlag = 0;
  bigYield: (() => void) | null = null;   // PI:NS VERKLIGHET
  private slowBusyEmaUs = 0; private slowBusyMaxUs = 0; private slowLagMaxMs = 0; private slowProcessed = 0;

  private aVU = 0;
  private dKick = 0;
  private silenceLevel = SILENCE_LEVEL;
  /** Släckgränsen live. */
  setSilenceLevel(v: number | undefined): void { this.silenceLevel = silenceLevelLive = v ?? SILENCE_LEVEL; }
  private lvlVU = 0;



  /** Called when the input routing changes. */
  resetGain(startGain = 1) {
    this.f.level.gain = Math.max(0.5, Math.min(20, startGain));
    this.f.level.envelope = this.f.hop.cfg.detection.autoGainTarget;
    this.levels.resetAgcBlocks();
  }

  /** Lock the AGC. */
  setGainLock(locked: boolean, fixed = 1) {
    this.f.level.gainLocked = locked;
    if (locked) { this.f.level.gain = fixed; this.f.level.envelope = this.f.hop.cfg.detection.autoGainTarget; this.levels.resetAgcBlocks(); }
  }

  /** DELAD ANALYSATOR. */
  flagSlow(f: number): void {
    if (this.f.hop.role !== 'fast') return;
    this.pendFlags |= f; this.barrierSeq = this.recSeq + 1;
    for (let k = 0; k < FLAG_BITS; k++) if (f & (1 << k)) this.flagCnt[k]++;
  }
  /** Ett record per 100 Hz-steg: det åker med i hoppets post (kedjan steg 11N), med tiden från steget. */
  private pushSlowRecord(): void { this.recPost = ++this.recSeq; this.recPerf = this.perfNow(); }
  /** Sektionen ur svarets formdel (sektionsbiten). */
  private pullSlowState(): void {
    if (!this.stateRd.read(this.splitCtrl!, this.splitState!, this.stateCopy)) return;
    const s = this.stateCopy; if (s[S_REC_SEQ] < this.barrierSeq) return;
    this.sections?.unpack(s);
  }
  setInlinePeer(slow: Analyser | null): void { this.inlinePeer = slow; this.hopLane?.peer?.connect(slow); }   // EN TEMPOKÄLLA: taktvägen skriver tempot i den långsamma sidan
  /** Halsa for /api/live. Posterna: skrivna, lästa av högerspalten och efter (kedjan steg 11N); lagMs = 100 Hz-delens eftersläp. */
  getSplitStats(): { role: string; written: number; processed: number; behind: number; lagMs: number; lagMaxMs: number; busyUs: number; busyMaxUs: number; skipped: number; lostFlags: number; restarts: number } | null {
    if (this.f.hop.role !== 'fast') return null;
    const s = this.stateCopy;
    return { role: this.f.hop.role, written: this.postSeq, processed: s[S_PROCESSED], behind: this.postSeq - this.bigCopy[BS_SEQ], lagMs: +s[S_LAG_MS].toFixed(1), lagMaxMs: +s[S_LAG_MAX].toFixed(1),
      busyUs: Math.round(s[S_BUSY_US]), busyMaxUs: Math.round(s[S_BUSY_MAX_US]), skipped: s[S_SKIPPED], lostFlags: s[S_LOST_FLAGS], restarts: this.splitRestarts };
  }
  /** fast: senast skrivna record. */
  fastWriteSeq(): number { return this.recSeq; }
  fastReadSeq(): number { const d = seqDelta(Atomics.load(this.splitCtrl!, C_READ), this.recSeq); return d > 0 ? this.recSeq : this.recSeq + d; }

  /** Workern, HÖGERSPALTEN (kedjan steg 11N): posterna en i taget. Klockan först: före varje post tar den alla nya poster (bigYield).
   *  Per post: 100 Hz-delen (kommandona, sektionens steg, tillståndsblocket) och sedan stenarna; storblocket efter de nya posterna. */
  drainRecords(): number {
    const h = this.f.hop;
    const lv = this.f.level, kk = this.f.kick, ff = this.f.fft;
    const ctrl = this.splitCtrl!, r = this.postRing!, pcm = this.postPcm!;
    const w = this.postSeq + seqDelta(Atomics.load(ctrl, C_WRITE), this.postSeq);
    if (w - this.postSeq > POST_N - RING_MARGIN) { this.postSkipped += (w - this.postSeq) - (POST_N - RING_MARGIN); this.postSeq = w - (POST_N - RING_MARGIN); this.slowGap = true; }
    let n = 0;
    while (this.postSeq < w) {
      if (this.bigYield) this.bigYield();   // klockan först
      const seq = ++this.postSeq, slot = seq % POST_N, o = slot * POST_LEN;
      if (r[o + P_SEQ] !== seq) { this.postSkipped++; this.slowGap = true; continue; }
      const t0 = performance.now();
      if (r[o + P_REC] > 0) this.slowRecord(o);
      const hn = r[o + P_N];
      this.bass?.accumulate();
      ff.rms = r[o + Bf.rms]; h.nowWall = r[o + Bh.nowWall]; ff.centSmooth = r[o + Bf.centSmooth]; h.breaking = r[o + Bh.breaking] === 1;
      h.kickHit = r[o + Bh.kickHit];
      lv.lvlSmooth = r[o + Bl.lvlSmooth]; lv.activeMs = r[o + Bl.activeMs]; lv.intensity = r[o + Bl.intensity]; lv.levelCeil = r[o + Bl.levelCeil]; kk.kick = r[o + Bk.kick] === 1;
      if (r[o + P_ENVF] === 1) this.bass?.stepBassline();
      { const po = slot * POST_PCM; this.bands.bigRingPush(pcm.subarray(po, po + hn)); }
      this.bands.bigTick();
      this.slowPart();
      this.sections?.bigAgg();
      const us = (performance.now() - t0) * 1000;
      this.slowBusyEmaUs = this.slowBusyEmaUs === 0 ? us : this.slowBusyEmaUs + 0.02 * (us - this.slowBusyEmaUs);
      if (us > this.slowBusyMaxUs) this.slowBusyMaxUs = us;
      this.slowProcessed++; n++;
    }
    if (n > 0) {
      Atomics.store(ctrl, C_BIG_READ, seqLow(this.postSeq));
      stateWrite(ctrl, this.bigState!, (s) => {
        s[BS_SEQ] = this.postSeq; s[BSs.bodyDb] = this.f.spectrum.bodyDb; this.drop?.pack(s); this.riser?.pack(s); this.character?.pack(s); s[BS_SPEC_N] = this.bands.specN; s[BS_SKIPPED] = this.postSkipped;
      }, C_FORM_SEQ);
      if (this.syncWorker) Atomics.notify(ctrl, C_FORM_SEQ);
    }
    return n;
  }
  /** 100 Hz-delen av en post (förr recordet): tappade kommandon ur räknarna, kommandona, sektionens steg och tillståndsblocket, före postens stenar som förr. */
  private slowRecord(o: number): void {
    const ctrl = this.splitCtrl!, r = this.postRing!;
    if (this.slowGap) {
      if (this.slowLastCnt >= 0) {
        const lost = lostFlags(this.slowLastCnt, r[o + P_FLAGCNT], r[o + P_FLAGS]);
        if (lost) { this.slowLostFlags++; this.applyFlags(lost, 5000, r[o + P_PERF]); }
      }
      this.slowGap = false;
    }
    this.recSeq = r[o + P_REC];
    this.slowStep(o); this.slowLastCnt = r[o + P_FLAGCNT];
    const lagMs = Date.now() - r[o + P_NOW]; if (lagMs > this.slowLagMaxMs) this.slowLagMaxMs = lagMs;
    Atomics.store(ctrl, C_READ, seqLow(this.recSeq));
    stateWrite(ctrl, this.splitState!, (s) => {
      s[S_REC_SEQ] = this.recSeq;
      this.sections?.pack(s);
      s[S_PROCESSED] = this.slowProcessed; s[S_LAG_MS] = lagMs; s[S_LAG_MAX] = this.slowLagMaxMs; s[S_BUSY_US] = this.slowBusyEmaUs; s[S_BUSY_MAX_US] = this.slowBusyMaxUs; s[S_SKIPPED] = this.postSkipped; s[S_LOST_FLAGS] = this.slowLostFlags;
    });
    if (this.syncWorker) Atomics.notify(ctrl, C_FORM_SEQ);
  }

  /** POSTEN (kedjan steg 11N): EN väg in. En post per hopp, direkt efter de snabba banden: ljudet, stammens IN-fält, klockans del och
   *  100 Hz-delen när tickStep slagit. Inline tar klockan och sedan högerspalten posten här. I lås-läget väntar posten på storblocket,
   *  och i ett 100 Hz-steg hämtas sektionen, så att basenergin och ramen läser samma steg som förr. */
  private post(samples: Float32Array): void {
    const h = this.f.hop;
    const lv = this.f.level, kk = this.f.kick, ff = this.f.fft;
    const r = this.postRing!, ctrl = this.splitCtrl!, seq = ++this.postSeq, slot = seq % POST_N, o = slot * POST_LEN, n = samples.length;
    if (n > POST_PCM) throw new Error(`Analyser: hoppet har ${n} sampel, posten rymmer ${POST_PCM}`);
    this.postPcm!.set(samples, slot * POST_PCM);
    r[o + P_N] = n; r[o + P_NOW] = Date.now(); r[o + Bf.rms] = ff.rms; r[o + Bh.nowWall] = h.nowWall; r[o + Bf.centSmooth] = ff.centSmooth; r[o + Bh.breaking] = h.breaking ? 1 : 0;
    r[o + Bh.kickHit] = h.kickHit;
    r[o + Bl.lvlSmooth] = lv.lvlSmooth; r[o + Bl.activeMs] = lv.activeMs; r[o + Bl.intensity] = lv.intensity; r[o + Bl.levelCeil] = lv.levelCeil; r[o + Bk.kick] = kk.kick ? 1 : 0;
    r[o + P_ENVF] = this.bigEnvFlag; this.bigEnvFlag = 0;
    const rec = this.recPost; r[o + P_REC] = rec;
    if (rec > 0) {
      r[o + P_PERF] = this.recPerf; r[o + P_FLAGS] = this.pendFlags; r[o + P_HINT_MS] = this.pendHintMs; r[o + P_VCLOCK] = this.pendVclock;
      r[o + P_FLAGCNT] = packFlagCounts(this.flagCnt); this.pendFlags = 0; this.recPost = 0;
    }
    if (this.hopLane) this.hopLane.write(r, o, seq, kk.beatAnchorMs, kk.kickAt, this.f.spectrum.fbOn, this.bands.fbAbs, this);   // klockans del (förr taktringen)
    r[o + P_SEQ] = seq;
    Atomics.store(ctrl, C_WRITE, seqLow(seq)); Atomics.add(ctrl, C_WAKE, 1);
    if (Atomics.load(ctrl, C_WAITING) || Atomics.load(ctrl, C_WAITING_B)) Atomics.notify(ctrl, C_WAKE);
    if (this.inlinePeer) { this.hopLane?.peer?.drain(); this.inlinePeer.drainRecords(); }
    else if (this.syncWorker) syncWait(ctrl, C_FORM_SEQ, () => this.bigRd.read(ctrl, this.bigState!, this.bigCopy, C_FORM_SEQ) && this.bigCopy[BS_SEQ] >= seq);
    if (rec > 0 && (this.inlinePeer || this.syncWorker)) this.pullSlowState();
  }
  /** Svarets formdel, storbiten (droppet, uppbyggnaden, karaktären, baskroppen, spektrumet), läst efter basenergin som förr i pushBig. */
  private pullBig(): void {
    const h = this.f.hop, sp = this.f.spectrum, ctrl = this.splitCtrl!;
    const s = this.bigCopy;
    if (!this.bigRd.read(ctrl, this.bigState!, s, C_FORM_SEQ) || s[BS_SEQ] === 0) return;
    sp.bodyDb = s[BSs.bodyDb]; this.drop?.unpack(s); this.riser?.unpack(s); this.character?.unpack(s);
    const sn = s[BS_SPEC_N];
    if (sn > this.specDelivered) {
      const sink = sp.sink, binHz = h.cfg.audio.rate / this.bands.bufferBig.length, R = this.bands.specRing!, c = this.bands.specCopy;
      for (let k = Math.max(this.specDelivered + 1, sn - SPEC_SLOTS + 1); k <= sn; k++) {
        if (sink) { const o2 = (k % SPEC_SLOTS) * SPEC_MAX; c.set(R.subarray(o2, o2 + c.length)); sink(c, binHz); }
      }
      this.specDelivered = sn;
    }
  }

  /** slow: alla poster lästa av högerspalten? */
  bigIdle(): boolean { return seqLow(this.postSeq) === Atomics.load(this.splitCtrl!, C_WRITE); }
  /** Snabba sidans kommandon i exakt den ordning de restes. */
  private applyFlags(flags: number, hintMs: number, vclock: number): void {
    if (flags & F_VCLOCK_NULL) this.setVirtualClock(null); else if (flags & F_VCLOCK_SET) this.setVirtualClock(vclock);
    if (flags & F_HINT) this.hintTrackChange(hintMs);
  }
  /** 100 Hz-delen av en post: kommandona, workerns tid och sektionens steg. */
  private slowStep(o: number): void {
    const r = this.postRing!;
    this.applyFlags(r[o + P_FLAGS], r[o + P_HINT_MS], r[o + P_VCLOCK]);
    this.virtualMs = r[o + P_PERF]; this.virtualOn = true;
    this.sections?.fromRecord();
  }

  /** Sparets tid. */
  private traceT(): number { return (this.wallNow() - 1700000000000) / 1000; }

  trackBoundaries = 0;   // LÅTGRÄNSEN
  boundSure = false;   // LÅTGRÄNSEN ÄR SÄKER
  /** Tystnad i ms. */
  get quietMs(): number { return this.f.level.silentMs; }
  /** EN KÄLLA. */
  setClock(bpm: number, conf: number): void { this.f.clock.bpm = bpm > 40 ? bpm : 0; this.f.clock.conf = bpm > 40 ? conf : 0; }
  hintTrackChange(windowMs = 5000, sections = true): void {
    if (this.f.hop.role !== 'slow') this.trackBoundaries++;
    if (BPM_TRACE) console.log(`[bpmrst] t=${this.traceT().toFixed(1)} HINT bpm=${this.f.clock.bpm} conf=${this.f.clock.conf.toFixed(2)}`);
    if (this.f.hop.role === 'fast') { this.pendHintMs = windowMs; this.flagSlow(F_HINT); }
    if (sections) this.sections?.carry();
  }

  private lastT = 0;   // 0 = "ej satt"

  private virtualMs = NaN; private virtualOn = false;   // VIRTUELL KLOCKA
  /** Driv analysatorn på en virtuell klocka. */
  setVirtualClock(ms: number | null) {
    if (this.f.hop.role === 'fast') { if (ms === null) this.flagSlow(F_VCLOCK_NULL); else { this.pendVclock = ms; this.flagSlow(F_VCLOCK_SET); } }
    const prev = this.virtualMs;
    const jump = ms === null || !this.virtualOn || ms < prev || ms - prev > 1000;
    if (ms === null) { this.virtualOn = false; this.virtualMs = NaN; } else { this.virtualOn = true; this.virtualMs = ms; }
    if (!jump) return;
    this.kicks?.reset(); this.sections?.sectionReset();
    this.lastT = 0;
  }
  /** KORBANK. */
  advanceVirtualClock(ms: number): void { this.virtualMs = ms; this.virtualOn = true; }
  private perfNow(): number { return this.virtualOn ? this.virtualMs : performance.now(); }
  private audioClockMs = -1;   // LJUDKLOCKAN
  private audioToWallOffset = 0;
  private audioOffsetSeeded = false;
  setAudioClockMs(ms: number): void {
    this.audioClockMs = ms;
    const raw = Date.now() - ms;
    if (!this.audioOffsetSeeded) { this.audioToWallOffset = raw; this.audioOffsetSeeded = true; return; }
    if (Math.abs(raw - this.audioToWallOffset) > 250) { this.audioToWallOffset = raw; return; }
    this.audioToWallOffset += (raw - this.audioToWallOffset) * 0.0005;
  }
  /** Tillbaka till Date.now(). */
  clearAudioClock(): void { this.audioClockMs = -1; this.audioOffsetSeeded = false; this.audioToWallOffset = 0; }
  wallNow(): number {
    if (this.virtualOn) return this.virtualEpoch + this.virtualMs;
    return this.audioClockMs >= 0 ? this.audioClockMs + this.audioToWallOffset : Date.now();
  }
  private virtualEpoch = 1700000000000;


  /** EN KLOCKA. */
  setBeatGrid(grid: BeatGrid | null): void { this.extGrid = grid; }
  private extGrid: BeatGrid | null = null;
  /** Klockans inre rutnät. */
  setClockGrid(grid: BeatGrid | null): void { this.f.clock.src.beat = grid; }

  constructor(cfgIn: AnalyserConfig, splitIn?: SplitInit) {
    const h = this.f.hop;
    h.role = splitIn?.role ?? cfgIn.role ?? 'all';
    const splitBuf = splitIn?.split ?? cfgIn.split;
    if (h.role !== 'all') {
      if (!splitBuf) throw new Error('Analyser: roll ' + h.role + ' kraver split-buffertar');
      const v = { ctrl: new Int32Array(splitBuf.ctrl), state: svarDelar(splitBuf).sektion }; this.splitCtrl = v.ctrl; this.splitState = v.state;
      this.recSeq = splitIn?.resumeSeq ?? cfgIn.resumeSeq ?? 0;
      this.syncWorker = splitIn?.sync === true;
      if (h.role === 'slow') {
        this.slowGap = true;
        const sq = Atomics.load(v.ctrl, C_FORM_SEQ); if (sq & 1) Atomics.store(v.ctrl, C_FORM_SEQ, sq + 1);
      }
      if (!splitBuf.post || !splitBuf.postPcm || !splitBuf.svar || !splitBuf.spec) throw new Error('Analyser: delat läge kräver postringen och svarsblocket (createSplitBuffers)');
      {
        h.bigOn = true;
        this.postRing = new Float64Array(splitBuf.post); this.postPcm = new Float32Array(splitBuf.postPcm); this.bigState = svarDelar(splitBuf).stor; this.bands.specRing = new Float32Array(splitBuf.spec);
        if (h.role === 'slow') {
          const st = this.bigState; this.postSeq = st[BS_SEQ]; this.bands.resume(st); this.drop?.resume(st);
        }
      }
    }
    const cfg = h.cfg = {
      audio: { rate: cfgIn.audio?.rate ?? cfgIn.sampleRate ?? 48000 },
      fft: { size: cfgIn.fft?.size ?? cfgIn.fftSize ?? 512, hop: cfgIn.fft?.hop ?? cfgIn.hopSize ?? 128 },
      detection: cfgIn.detection ?? {
        autoGainTarget: cfgIn.autoGainTarget ?? 0.15,
        tauUp: cfgIn.tauUp ?? 3,
        tauDown: cfgIn.tauDown ?? 8,
        noiseFloor: cfgIn.noiseFloor ?? 0.002,
        maxGain: cfgIn.maxGain ?? 20,
      },
      onset: { enhancements: cfgIn.onsetEnhancements ?? false },
    };
    this.f.clock.src = cfgIn.detection ? cfgIn : { beat: null };
    this.setSilenceLevel(cfgIn.silenceLevel);
    this.f.level.envelope = cfg.detection.autoGainTarget;
    const BIG = 2048;
    this.bands.fftBig = new FFT(BIG);
    this.bands.windowBig = hannWindow(BIG);
    this.bands.windowedBig = new Float32Array(BIG);
    this.bands.bufferBig = new Float32Array(BIG);
    this.bands.prevMagBig = new Float32Array(BIG / 2);
    this.bands.magBig = new Float32Array(BIG / 2);
    this.bands.specBig = this.bands.fftBig.createComplexArray();
    const binHzBig = cfg.audio.rate / BIG;
    for (let b = 0; b < 8; b++) {
      this.bands.bandLo[b] = Math.max(1, Math.round(Analyser.BAND_HZ[b] / binHzBig));
      this.bands.bandHi[b] = Math.min(BIG / 2, Math.round(Analyser.BAND_HZ[b + 1] / binHzBig));
      this.bands.bandPeak[b] = 1e-4;
    }
    {
      const binHz = cfg.audio.rate / cfg.fft.size, half = cfg.fft.size / 2;
      for (let b = 3; b < 8; b++) { this.bands.fbLo[b] = Math.max(1, Math.round(Analyser.BAND_HZ[b] / binHz)); this.bands.fbHi[b] = Math.min(half, Math.max(this.bands.fbLo[b] + 1, Math.round(Analyser.BAND_HZ[b + 1] / binHz))); }
      const dtMs = cfg.fft.hop / cfg.audio.rate * 1000;
      for (let b = 0; b < 3; b++) {
        for (let s = 0; s < 2; s++) {
          const f0 = Analyser.BAND_HZ[b + s], w = 2 * Math.PI * f0 / cfg.audio.rate, c = Math.cos(w), al = Math.sin(w) / (2 * Math.SQRT1_2), a0 = 1 + al;
          const o = (b * 2 + s) * 5, C = this.bands.fbCoef;
          if (s === 0) { C[o] = (1 + c) / 2 / a0; C[o + 1] = -(1 + c) / a0; C[o + 2] = (1 + c) / 2 / a0; }
          else { C[o] = (1 - c) / 2 / a0; C[o + 1] = (1 - c) / a0; C[o + 2] = (1 - c) / 2 / a0; }
          C[o + 3] = -2 * c / a0; C[o + 4] = (1 - al) / a0;
        }
        this.bands.fbA[b] = 1 - Math.exp(-dtMs / Analyser.FB_TAU_MS[b]);
      }
      this.bands.fbAlvl = 1 - Math.exp(-dtMs / 90);
    }
    this.bands.magBigMax = Math.min(BIG / 2, this.bands.bandHi[7] + 1);
    this.bands.magBigView = this.bands.magBig.subarray(0, this.bands.magBigMax);
    this.bands.prevMagBigView = this.bands.prevMagBig.subarray(0, this.bands.magBigMax);
    if (h.bigOn) this.bands.specCopy = new Float32Array(Math.min(SPEC_MAX, this.bands.magBigMax));

    const dtHop = cfg.fft.hop / cfg.audio.rate;
    h.dtHop = dtHop;
    h.hopMs = dtHop * 1000;

    this.fft.init(this.bands.fbHi[7] + 1);
    this.aVU = 1 - Math.exp(-dtHop / 0.20);
    this.levels.rates(dtHop);
    this.bands.rates(dtHop);
    this.dKick = Math.exp(-dtHop / 0.15);
    this.character?.rates(dtHop);
    this.outFrame = {
      silent: true, level: 0, levelVU: 0, energy: 0, centroid: 0, flux: 0,
      kick: false, gain: 1, bpm: 0, bpmConfidence: 0, intensity: 0.5,
      dropCount: 0, miniDropCount: 0, dropBuildCount: 0, dropDemoted: 0, dropSpaced: 0, nearDropDb: 0, nearDipDb: 0, liftDb: 0, stopCount: 0, stopS: 0, dropMiniBack: 0, dropKeys: 0, dropNear: 0, bodyDb: 0, bassEnergy: 0, bassEnergyShort: 0, bassLevel: 1, midHiDb: -120, levelInZone: false, levelBreaking: false, buildUp: 0, sectionBuildProg: 0, inRiser: false, profile: this.f.character.profile, kickAnchorMs: 0,
      kickAtMs: 0, barShift: -1, beatPhaseMs: 0, beatPhaseConf: 0, beatTrust: 0, section: 'intro', sectionAgeMs: 0, sectionIndex: 0, sectionTier: 1, repeatSim: 0, repeatAgoMs: 0, expectHighInMs: -1, prevSection: '', sectionLevelVsHighDb: 0, sectionBars: 0,
      spec: this.outSpec, specAbs: this.outSpecAbs, onset: this.outOnset, drum: this.outDrum, stenarAv: stenarAv(this.f),
    };
    for (const o of [this.outFrame, this.outSpec, this.outSpecAbs, this.outOnset, this.outDrum, this]) stabilise(o);
  }

  /** Feed a hop-sized chunk of mono samples, get a frame back. */
  process(samples: Float32Array): Frame {
    const h = this.f.hop;
    const lv = this.f.level, kk = this.f.kick, ff = this.f.fft;
    if (h.role === 'fast') this.pullSlowState();
    this.fft.hopStep(samples);

    const now = this.perfNow();
    const dt = this.lastT === 0 ? 0 : Math.max(0, Math.min(0.1, (now - this.lastT) / 1000));
    this.lastT = now;
    h.now = now; h.dt = dt;
    h.gated = ff.rms >= h.cfg.detection.noiseFloor * 1.5;
    this.levels.hopStep();
    const level = lv.level;

    this.kicks?.hopStep();

    const hopMs = h.hopMs;

    const big = h.bigOn;
    if (!big) this.bass?.accumulate();
    this.tickT += hopMs;
    if (this.tickT >= 1000 / Analyser.ENV_HZ) this.tickStep();

    this.lvlVU += (level - this.lvlVU) * this.aVU;

    if (!big) {
    this.bands.bigRingPush(samples);
    this.bands.bigTick();
    }
    this.bands.fastBandStep(samples);
    if (kk.kick) h.kickHit = 1;
    else h.kickHit = h.kickHit * this.dKick;
    const nowWallA = this.wallNow();
    const breaking = lv.lvlSmooth < lv.levelCeil * 0.65;

    h.nowWall = nowWallA;   // IN: färdig före posten
    if (big) { h.breaking = breaking; this.post(samples); }   // S5 POSTEN (kedjan steg 11N), direkt efter de snabba banden
    this.bass?.bassEnergyStep(this.bands.fbAbs[0], this.bands.fbAbs[1]);   // basen läser sektionen: i lås-läget ur postens 100 Hz-steg, som förr
    if (big) this.pullBig(); else this.slowPart();
    h.breaking = breaking;
    return this.fillFrame();
  }

  /** DEN LÅNGSAMMA DELEN: stenarna efter stor-FFT:n, i workern (drainRecords) eller odelat (process). En ny sten här. */
  private slowPart(): void {
    this.drop?.dropStep();
    this.riser?.riserStep();
    this.character?.profileStep();
  }

  /** 100 Hz-steget: basgångens steg, recordet till workern. */
  private tickStep(): void {
    const h = this.f.hop;
    this.tickT -= 1000 / Analyser.ENV_HZ;
    if (h.bigOn) this.bigEnvFlag = 1; else this.bass?.stepBassline();
    if (h.role === 'fast') this.pushSlowRecord();
  }

  /** Muterar det ateranvanda Frame:t. */
  private fillFrame(): Frame {
    const h = this.f.hop;
    const sc = this.f.section;
    const bo = this.f.bass, ri = this.f.riser, dp = this.f.drop;
    const lv = this.f.level, sp = this.f.spectrum, kk = this.f.kick, ck = this.f.clock, ff = this.f.fft;
    const fluxNorm = ff.flux, kick = kk.kick, intensity = lv.intensity, bodyNow = sp.bodyDb, inZone = lv.inZone, breaking = h.breaking,
      inRiser = ri.inRiser, kickAtMs = kk.kickAt;
    const L = this.bands.fbLvl, A = this.bands.fbAbs, O = sp.fbOn;
    const spec = this.outSpec, specAbs = this.outSpecAbs, onset = this.outOnset;
    spec.sub = L[0]; spec.kick = L[1]; spec.bass = L[2]; spec.lowMid = L[3]; spec.mid = L[4]; spec.highMid = L[5]; spec.treble = L[6]; spec.air = L[7];
    specAbs.sub = A[0]; specAbs.kick = A[1]; specAbs.bass = A[2]; specAbs.lowMid = A[3]; specAbs.mid = A[4]; specAbs.highMid = A[5]; specAbs.treble = A[6]; specAbs.air = A[7];
    onset.sub = O[0]; onset.kick = O[1]; onset.bass = O[2]; onset.lowMid = O[3]; onset.mid = O[4]; onset.highMid = O[5]; onset.treble = O[6]; onset.air = O[7];
    const dr = this.outDrum;
    dr.kick = h.kickHit; dr.snare = sp.snareHit; dr.hat = sp.hatHit; dr.bass = L[2];

    const f = this.outFrame;
    f.silent = lv.lvlSmooth <= this.silenceLevel; f.level = lv.lvlSmooth; f.levelVU = this.lvlVU;
    f.energy = ff.engSmooth;
    f.centroid = ff.centSmooth; f.flux = fluxNorm; f.kick = kick; f.gain = lv.gain;
    f.bpm = ck.bpm; f.bpmConfidence = ck.conf; f.intensity = intensity; f.kickAnchorMs = kk.beatAnchorMs;
    f.bodyDb = bodyNow; f.bassEnergy = f.silent ? 0 : bo.energy; f.bassEnergyShort = f.silent ? 0 : bo.beShort; f.bassLevel = Math.pow(10, (bo.beHi - bo.beRef) / 20);
    { let s2 = 1e-12; for (let b = 3; b < 8; b++) { const lin = Math.pow(10, this.bands.fbDbRaw[b] / 20); s2 += lin * lin; } f.midHiDb = 20 * Math.log10(Math.sqrt(s2)); }
    f.dropCount = dp.dropCount; f.miniDropCount = dp.miniDropCount; f.dropBuildCount = dp.buildStartCount; f.dropDemoted = dp.dropDemoted; f.dropSpaced = dp.dropSpaced;
    f.nearDropDb = dp.nearDropDb; f.nearDipDb = dp.nearDipDb; f.liftDb = dp.liftDb; f.stopCount = dp.stopCount; f.stopS = dp.stopS; f.dropMiniBack = dp.dropMiniBack; f.dropKeys = dp.dropKeys; f.dropNear = dp.dropNear; f.levelInZone = inZone; f.levelBreaking = breaking; f.buildUp = ri.buildUp; f.inRiser = inRiser;
    f.kickAtMs = kickAtMs; f.barShift = -1;
    this.sections?.sectionAggStep();
    const nowS = this.wallNow();
    f.sectionBuildProg = sc.secBuildAt > 0 && nowS - sc.secBuildSeen <= 2000 ? Math.min(1, (nowS - sc.secBuildAt) / (32 * (ck.bpm > 0 ? 60000 / ck.bpm : Analyser.BE_FALLBACK_MS))) : 0;
    f.section = sc.section; f.sectionAgeMs = sc.sectionStartMs > 0 ? nowS - sc.sectionStartMs : 0; f.sectionIndex = sc.sectionIndex; f.sectionTier = sc.sectionTier;
    f.repeatSim = sc.repeatSim; f.repeatAgoMs = sc.repeatAgoMs;
    f.expectHighInMs = sc.section === 'high' ? 0 : sc.expectHighMs > 0 ? Math.max(0, sc.expectHighMs - nowS) : -1;
    f.prevSection = sc.prevSection; f.sectionLevelVsHighDb = sc.levelVsHighDb;
    f.sectionBars = ck.bpm > 0 && sc.sectionStartMs > 0 ? (nowS - sc.sectionStartMs) / (240000 / ck.bpm) : 0;
    if (this.clock || this.hopLane) {   // EN KLOCKA (kedjan steg 10N): analysatorn matar taktvägen själv, i DMX som i lotus
      if (this.clock) this.clock.update(f, this.clockOut, this, Date.now());
      else { this.hopLane!.feed(f, this.clockOut, this); this.setClock(this.hopLane!.clockBpm, this.hopLane!.clockConf); }   // huvudtrådens kopia direkt efter matningen (förr i början av nästa process)
      publishPhase(f, this.clockOut.beat, this.clock ? this.clock.barKnown() : this.hopLane!.barKnown, this.extGrid, Date.now(), Analyser.GRID_PHASE_OFFSET_MS);
    }
    return f;
  }
  clock: BeatFeed | null = null;   // ANALYSATORNS KLOCKA utan taktväg
  readonly clockOut: ClockCfg = { beat: undefined, beatErr: undefined };
  /** Klockans utfall till motorn. */
  publishClock(cfg: ClockCfg): void { cfg.beat = this.clockOut.beat; cfg.beatErr = this.clockOut.beatErr; }
  // KEDJAN. Stäng av en sten = byt dess rad mot off('namn', this.f.<fack>) (t.ex. off('sektion', this.f.section)).
  readonly drop: DropDetector | null = new DropDetector(this.f, this.f.drop);   // DROP: flanken, slam-kandidaten, minidrop, lyft/nästan-drop/stopp
  readonly sections: SectionTracker | null = new SectionTracker(this.f, this.f.section);   // SEKTIONER
  readonly riser: RiserDetector | null = new RiserDetector(this.f, this.f.riser);   // UPPBYGGNAD
  readonly character: CharacterProfile | null = new CharacterProfile(this.f, this.f.character);   // KARAKTÄR
  readonly kicks: KickDetector | null = new KickDetector(this.f, this.f.kick);   // KICK: anslag i snabba vägen
  readonly bass: BassTracker | null = new BassTracker(this.f, this.f.bass);   // BAS: basenergin per slag och basgången
  readonly levels = new LevelTracker(this.f, this.f.level);   // NIVÅ: förstärkning/AGC, tystnad, intensitet, nivåtak och topp-zon
  readonly bands = new SpectrumBands(this.f, this.f.spectrum);   // SPEKTRUM
  readonly fft = new SmallFft(this.f, this.f.fft);   // LILLA FFT:N: fönstrets rms, energi, flöde, kickflöde, centroid
}

export const WORKER_RESTART_BACKOFF_MS = [1000, 2000, 5000, 5000, 5000];   // DELAD ANALYSATOR
export const WORKER_RESTART_MAX = 5;
export const WORKER_RESTART_WINDOW_MS = 10 * 60_000;

export function createAnalyser(cfg: AnalyserConfig, modeIn?: 'worker' | 'inline' | 'sync'): Analyser {
  const mode = modeIn ?? sysEnv('ANALYSER_SPLIT');
  if (mode !== 'worker' && mode !== 'inline' && mode !== 'sync') { const a = new Analyser(cfg); a.clock = new BeatFeed(); return a; }
  const sync = mode === 'sync';
  const buffers = createSplitBuffers();
  const fast = new Analyser(cfg, { role: 'fast', split: buffers, sync });
  fast.hopLane = new HopLaneFast(buffers, sync);
  if (mode === 'inline') {
    fast.hopLane.peer = new HopLaneSlow(buffers, new BeatFeed());
    fast.setInlinePeer(new Analyser(cfg, { role: 'slow', split: buffers }));   // efter taktvägen: kopplar klockan till den långsamma sidan
    return fast;
  }
  const withWorker = ({ Worker }: typeof import('node:worker_threads')) => {
    let stopped = false;
    const attempts: number[] = [];
    const parts: Array<'all' | 'lane' | 'slow'> = ['all'];
    const workers: Array<{ postMessage: (m: unknown) => void }> = [];
    const start = (part: 'all' | 'lane' | 'slow', resumeSeq: number, why: string) => {
      const data: WorkerData = { cfg: { ...cfg }, buffers, resumeSeq, sync, part };
      const w = new Worker(new URL('./slowWorker.js', import.meta.url), { workerData: data });
      w.on('error', (e) => console.error('[analyser-split] worker FEL:', e?.message ?? e));
      w.on('exit', (code) => {
        if (stopped || code === 0) { console.log(`[analyser-split] worker stangd (kod ${code})`); return; }
        const now = Date.now();
        while (attempts.length && now - attempts[0] > WORKER_RESTART_WINDOW_MS) attempts.shift();
        if (attempts.length >= WORKER_RESTART_MAX) {
          console.error(`[analyser-split] worker dog (kod ${code}) — ${WORKER_RESTART_MAX} omstarter pa ${WORKER_RESTART_WINDOW_MS / 60000} min, ger upp: tempo/sektion fryser pa senaste tillstandet; starta om motorn`);
          return;
        }
        const delay = WORKER_RESTART_BACKOFF_MS[Math.min(attempts.length, WORKER_RESTART_BACKOFF_MS.length - 1)];
        attempts.push(now);
        console.warn(`[analyser-split] worker dog (kod ${code}) — omstart #${attempts.length} om ${delay} ms, aterupptar vid record ${fast.fastReadSeq()} (skrivet ${fast.fastWriteSeq()})`);
        const t = setTimeout(() => { if (stopped) return; fast.splitRestarts++; start(part, part === 'lane' ? 0 : fast.fastReadSeq(), 'omstart'); }, delay);
        t.unref();
      });
      w.unref();
      workers[parts.indexOf(part)] = w;
      if (part !== 'lane') (fast as unknown as { __worker: unknown }).__worker = w;
      console.log(`[analyser-split] langsam analysator i worker startad (${part}) — ${why}, fran record ${resumeSeq}`);
    };
    (fast as unknown as { __stopWorker: () => void }).__stopWorker = () => {
      stopped = true;
      for (const w of workers) w?.postMessage({ type: 'stop' });
    };
    for (const p of parts) start(p, 0, 'start');
  };
  if (sync) withWorker((process as unknown as { getBuiltinModule(id: string): typeof import('node:worker_threads') }).getBuiltinModule('node:worker_threads'));
  else import('node:worker_threads').then(withWorker).catch((e) => console.error('[analyser-split] kunde inte starta worker:', e?.message ?? e));
  return fast;
}
