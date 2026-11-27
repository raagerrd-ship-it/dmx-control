/** DELAD ANALYSATOR (2026-09-21): transporten mellan den SNABBA tråden (ljudvägen: FFT, band, onset, kick, nivå, drop — måste svara inom en hop) och den LÅNGSAMMA (tempo, gridfas, sektioner, upprepning — sekunder är ok). Anteckningar (kommentarerna som stod i koden): docs/analysator/split.md */

import { trustStep } from "./analyserClock.js";   // tilliten utjämnas i hoppets tid
import { platser, antal } from "./analyserFack.js";
export const RING_MARGIN = 8;   // poster workern lämnar orörda mot skrivaren

export const F_HINT = 8, F_VCLOCK_SET = 32, F_VCLOCK_NULL = 64;   // Flaggor (1, 2, 4, 16 lediga)
export const FLAG_BITS = 7;

export const FLAG_MOD = 128;   // ROBUSTHET
export function packFlagCounts(cnt: ArrayLike<number>): number {
  let v = 0, m = 1;
  for (let k = 0; k < FLAG_BITS; k++) { v += (cnt[k] % FLAG_MOD) * m; m *= FLAG_MOD; }
  return v;
}
/** Bitmask över flaggor vars räknare skiljer mellan `before` och `after`. */
export function lostFlags(before: number, after: number, ownFlags: number): number {
  let lost = 0;
  for (let k = 0; k < FLAG_BITS; k++) {
    const a = Math.floor(after / FLAG_MOD ** k) % FLAG_MOD, b = Math.floor(before / FLAG_MOD ** k) % FLAG_MOD;
    let d = (a - b + FLAG_MOD) % FLAG_MOD;
    if (ownFlags & (1 << k)) d = (d - 1 + FLAG_MOD) % FLAG_MOD;
    if (d !== 0) lost |= 1 << k;
  }
  return lost;
}

export const C_WRITE = 0;   // Kontrollord: antal skrivna poster (kedjan steg 11N)
export const C_READ = 1;   // antal lästa records (postens 100 Hz-del)
export const C_STATE_SEQ = 2;   // seqlock för tillståndsblocket
export const C_WAITING = 3;   // 1 = workern ligger i Atomics.wait

/** SEQ-WRAP. */
export function seqLow(seq: number): number { return seq | 0; }
/** Signerad skillnad. */
export function seqDelta(ctrlLow: number, mySeq: number): number { return (ctrlLow - (mySeq | 0)) | 0; }

export const S_REC_SEQ = 0, S_PROCESSED = 4, S_LAG_MS = 5, S_LAG_MAX = 6,
  S_BUSY_US = 7, S_BUSY_MAX_US = 8, S_SKIPPED = 9, S_LOST_FLAGS = 10;   // Tillståndsblock (kärnan; 1–3 lediga)

export const SECTIONS = ['', 'intro', 'low', 'build', 'high', 'break'];
export function sectionCode(s: string): number { const i = SECTIONS.indexOf(s); return i < 0 ? 0 : i; }

export interface SplitBuffers { ctrl: SharedArrayBuffer; state: SharedArrayBuffer; hopState: SharedArrayBuffer;   // tillståndsblocket (sektionen), klockans block
  post: SharedArrayBuffer; postPcm: SharedArrayBuffer; bigState: SharedArrayBuffer; spec: SharedArrayBuffer }   // POSTRINGEN (kedjan steg 11N), storblocket, spektra

/** Meddelanden main ↔ worker. */
export type WorkerMsg = { type: 'stop' } | { type: 'crash' };
/** cfg ar en KOPIA. */
export interface WorkerData { cfg: unknown; buffers: SplitBuffers; resumeSeq: number ; sync?: boolean ;   // senast lästa record
  part?: 'all' | 'lane' | 'slow'  }   // två trådar med stora vägen

/** Buffertarna: EN postring in (kedjan steg 11N; förr recordringen, storringen och taktringen), tre svarsblock ut och spektra. */
export function createSplitBuffers(): SplitBuffers {
  return {
    ctrl: new SharedArrayBuffer(16 * 4), state: new SharedArrayBuffer(STATE_LEN * 8), hopState: new SharedArrayBuffer(FEED_STATE_LEN * 8),
    post: new SharedArrayBuffer(POST_N * POST_LEN * 8), postPcm: new SharedArrayBuffer(POST_N * POST_PCM * 4),
    bigState: new SharedArrayBuffer(BIG_STATE_LEN * 8), spec: new SharedArrayBuffer(SPEC_SLOTS * SPEC_MAX * 4),
  };
}

/** Skriv tillståndsblocket under seqlock. */
export function stateWrite(ctrl: Int32Array, state: Float64Array, fill: (s: Float64Array) => void, word = C_STATE_SEQ): void {
  const s = Atomics.load(ctrl, word);
  Atomics.store(ctrl, word, s + 1);
  fill(state);
  Atomics.store(ctrl, word, s + 2);
}

/** Läs tillståndsblocket konsistent till `out`. */
export function stateRead(ctrl: Int32Array, state: Float64Array, out: Float64Array, word = C_STATE_SEQ): boolean {
  for (let tries = 0; tries < 4; tries++) {
    const s1 = Atomics.load(ctrl, word);
    if (s1 & 1) continue;
    out.set(state);
    const s2 = Atomics.load(ctrl, word);
    if (s1 === s2) return true;
  }
  return false;
}

/** stateRead med minne. */
export class StateReader {
  private w = -1;   // ordet vid senaste lyckade läsningen
  read(ctrl: Int32Array, state: Float64Array, out: Float64Array, word = C_STATE_SEQ): boolean {
    if (Atomics.load(ctrl, word) === this.w) return true;
    for (let tries = 0; tries < 4; tries++) {
      const s1 = Atomics.load(ctrl, word);
      if (s1 & 1) continue;
      out.set(state);
      const s2 = Atomics.load(ctrl, word);
      if (s1 === s2) { this.w = s1; return true; }
    }
    return false;
  }
}

/** SYNK-LÄGET. */
export function syncWait(ctrl: Int32Array, word: number, ready: () => boolean): void {
  for (let i = 0; i < 300; i++) {
    const v = Atomics.load(ctrl, word);
    if (ready()) return;
    Atomics.wait(ctrl, word, v, 100);
  }
  throw new Error('analyser-split sync: workern svarar inte (30 s)');
}

export const POST_N = 4096, POST_PCM = 128;   // POSTEN (kedjan steg 11N): EN väg in, en post per hopp (4096 poster = 10,9 s), högst 128 sampel ljud per post
export const P_SEQ = 0, P_N = 1, P_ENVF = 2, P_NOW = 3,   // postens kärna: nummer, antal sampel, 100 Hz-steget slog, Date.now när posten skrevs
  P_REC = 4, P_PERF = 5, P_FLAGS = 6, P_HINT_MS = 7, P_VCLOCK = 8, P_FLAGCNT = 9,   // 100 Hz-delen (förr recordet): recordets nummer (0 = inget), tiden, kommandona, flaggräknarna
  P_TS = 10, P_ANCHOR = 11, P_KICKAT = 12, P_ON_KICK = 13, P_ON_HIMID = 14, P_ON_TREBLE = 15,   // klockans del (förr taktringen, HopLaneFast.write)
  P_SA_SUB = 16, P_SA_KICK = 17, P_SA_BASS = 18, P_SA_LOWMID = 19, P_SA_MID = 20, P_SA_HIMID = 21, P_SA_TREBLE = 22,
  P_BOUND = 23, P_QUIET = 24, P_SURE = 25;   // låtgränsen (trackBoundaries, förr H_BOUND), tystnaden, Sonos-gränsen säker
export const C_BIG_READ = 9, C_BIG_SEQ = 10 , C_WAITING_B = 11 ;   // högerspaltens lästa poster, storblockets seqlock (ord 4 och 8 lediga)
export const BS_SEQ = 0, BS_SPEC_N = 1, BS_SKIPPED = 2;   // storblocket (kärnan)

// FACKENS PLATSER (steg 18) ur taggarna (analyserFack.ts TRAD): IN följer postens kärna (kedjan steg 11N), UT storblocket BS (sektionen tillståndsblocket S; klockans platser där står tomma, tempot går med taktvägen).
export const B = platser('IN', ['hop', 'fft', 'level', 'spectrum', 'kick', 'bass', 'riser', 'drop', 'character', 'section'], P_SURE + 1);
export const BS = platser('UT', ['hop', 'level', 'spectrum', 'kick', 'bass', 'riser', 'drop', 'character'], BS_SKIPPED + 1);
export const S = platser('UT', ['clock', 'section'], S_LOST_FLAGS + 1);
if (B.LEN - P_SURE - 1 !== antal('IN') || BS.LEN - BS_SKIPPED - 1 + S.LEN - S_LOST_FLAGS - 1 !== antal('UT')) throw new Error('split: ett IN- eller UT-fält saknar plats');
export const POST_LEN = B.LEN, BIG_STATE_LEN = BS.LEN, STATE_LEN = S.LEN;
export const SPEC_SLOTS = 16, SPEC_MAX = 1024;   // 16 spektra

export const C_HOP_READ = 5, C_FEED_SEQ = 6 , C_WAKE = 7 ;   // TAKTVÄGEN: klockans lästa poster, klockblockets seqlock; väckningen
export const FS_HOP_SEQ = 0, FS_BEAT = 1 , FS_ANCHOR = 2, FS_BPM = 3, FS_BCONF = 4,
  FS_BEATERR = 5 , FS_GRID = 7 ,
  FS_GANCHOR = 8, FS_GBPM = 9, FS_GCONF = 10,
  FS_PROCESSED = 13, FS_LAG_MS = 14, FS_LAG_MAX = 15, FS_BUSY_US = 16, FS_BUSY_MAX_US = 17, FS_SKIPPED = 18,
  FS_BARK = 19 ;
export const FEED_STATE_LEN = 20;

/** Det taktmatningen läser ur ramen, och det den skriver. */
export interface HopFrame { bpm: number; bpmConfidence: number; kickAnchorMs: number; kickAtMs: number; barShift: number; beatTrust?: number;
  onset: { kick: number; highMid: number; treble: number }; specAbs: { sub: number; kick: number; bass: number; treble: number; lowMid: number; mid: number; highMid: number } }
export interface HopGrid { anchorMs: number; bpm: number; confidence?: number }
export interface HopCfg { beat?: HopGrid | null; beatErr?: number }
export interface HopTarget { setClockGrid?(g: HopGrid | null): void; trackBoundaries?: number; quietMs?: number; boundSure?: boolean; bodyUnderDb?: number;
   setClock?(bpm: number, conf: number): void }   // EN KÄLLA
/** Workerns analysator sedd av taktvägen: klockan skriver tempot (Analyser.setClock, spärren bpm > 40) och läser baskroppen (droppets bodyUnderDb, kedjan steg 5). */
export interface LaneReader { setClock(bpm: number, conf: number): void; readonly bodyUnderDb: number }
/** Systemets taktmatning. */
export interface HopFeed { update(frame: HopFrame, cfg: HopCfg, an: HopTarget, now: number): void;  barKnown?(): boolean }   // EN ETTA

/** Taktvägen, snabba sidan: klockans del i hoppets post (write) och klockans svar (feed). */
export class HopLaneFast {
  private readonly ctrl: Int32Array; private readonly state: Float64Array;
  private readonly s = new Float64Array(FEED_STATE_LEN); private readonly sr = new StateReader();
  private seq = 0; private applied = 0;
  private readonly grid = { anchorMs: 0.5, bpm: 0.5, confidence: 0.5 };
  clockBpm = 0; clockConf = 0; private trust = 0; private trustAt = 0;   // Klockans tempo/tillit efter senaste feed
  barKnown = false;   // EN ETTA
  peer: HopLaneSlow | null = null;   // inline-läget (Analyser.post tömmer den först)
  constructor(b: SplitBuffers, private readonly sync = false) {
    this.ctrl = new Int32Array(b.ctrl); this.state = new Float64Array(b.hopState);
  }
  /** Klockans del av hoppets post (kedjan steg 11N, förr taktringen): skrivs i Analyser.post. on = onset per band, sa = absolut magnitud per band. */
  write(r: Float64Array, o: number, seq: number, anchorMs: number, kickAtMs: number, on: Float32Array, sa: Float32Array, an: HopTarget): void {
    this.seq = seq;
    r[o + P_TS] = performance.timeOrigin + performance.now();
    r[o + P_ANCHOR] = anchorMs; r[o + P_KICKAT] = kickAtMs;
    r[o + P_ON_KICK] = on[1]; r[o + P_ON_HIMID] = on[5]; r[o + P_ON_TREBLE] = on[6];
    r[o + P_SA_SUB] = sa[0]; r[o + P_SA_KICK] = sa[1]; r[o + P_SA_BASS] = sa[2]; r[o + P_SA_TREBLE] = sa[6];
    r[o + P_SA_LOWMID] = sa[3]; r[o + P_SA_MID] = sa[4]; r[o + P_SA_HIMID] = sa[5];
    r[o + P_BOUND] = an.trackBoundaries ?? 0; r[o + P_QUIET] = an.quietMs ?? 0; r[o + P_SURE] = an.boundSure ? 1 : 0;
  }
  /** Ett hop: klockans svar för hoppets post. */
  feed(f: HopFrame, cfg: HopCfg, an: HopTarget): void {
    const now = Date.now();
    if (!this.peer && this.sync) syncWait(this.ctrl, C_FEED_SEQ, () => this.sr.read(this.ctrl, this.state, this.s, C_FEED_SEQ) && this.s[FS_HOP_SEQ] >= this.seq);
    this.apply(cfg, an);
    const b = cfg.beat; f.bpm = b ? b.bpm : 0; f.bpmConfidence = b ? (b.confidence ?? 0) : 0; this.clockBpm = f.bpm; this.clockConf = f.bpmConfidence;
    { const dt = this.trustAt > 0 ? now - this.trustAt : 0; this.trustAt = now; f.beatTrust = this.trust = trustStep(this.trust, f.bpmConfidence, cfg.beatErr ?? 0, dt > 250 ? 250 : dt); }
  }
  private apply(cfg: HopCfg, an: HopTarget): void {
    const s = this.s, ctrl = this.ctrl;
    if (!this.sr.read(ctrl, this.state, s, C_FEED_SEQ) || s[FS_HOP_SEQ] === 0) return;
    if (s[FS_HOP_SEQ] === this.applied) return;
    this.applied = s[FS_HOP_SEQ];
    if (s[FS_GRID] === 1) { const g = this.grid; g.anchorMs = s[FS_GANCHOR]; g.bpm = s[FS_GBPM]; g.confidence = s[FS_GCONF]; an.setClockGrid?.(g); }
    else an.setClockGrid?.(null);
    const bc = s[FS_BEAT];
    if (bc === 1) {
      if (!cfg.beat) cfg.beat = { anchorMs: s[FS_ANCHOR], bpm: s[FS_BPM], confidence: s[FS_BCONF] };
      else { cfg.beat.anchorMs = s[FS_ANCHOR]; cfg.beat.bpm = s[FS_BPM]; cfg.beat.confidence = s[FS_BCONF]; }
    } else cfg.beat = bc === -1 ? null : undefined;
    const be = s[FS_BEATERR]; if (be === be) cfg.beatErr = be;
    this.barKnown = s[FS_BARK] === 1;
  }
  /** Hälsa: hur långt efter taktvägen ligger. */
  stats(): { written: number; processed: number; behind: number; lagMs: number; lagMaxMs: number; busyUs: number; busyMaxUs: number; skipped: number } {
    const s = this.s;
    return { written: this.seq, processed: s[FS_PROCESSED], behind: this.seq - s[FS_HOP_SEQ], lagMs: +s[FS_LAG_MS].toFixed(2), lagMaxMs: +s[FS_LAG_MAX].toFixed(2),
      busyUs: +s[FS_BUSY_US].toFixed(1), busyMaxUs: Math.round(s[FS_BUSY_MAX_US]), skipped: s[FS_SKIPPED] };
  }
}

/** Taktvägen, långsamma sidan: klockan i workern, läser posterna (kedjan steg 11N). */
export class HopLaneSlow {
  private readonly ctrl: Int32Array; private readonly ring: Float64Array; private readonly state: Float64Array;
  private seq: number; private processed: number;
  private skipped = 0; private lagMaxMs = 0; private busyEmaUs = 0; private busyMaxUs = 0;
  private readonly fr = { bpm: 0.5, bpmConfidence: 0.5, kickAnchorMs: 0.5, kickAtMs: 0.5, barShift: 0.5,
    onset: { kick: 0.5, highMid: 0.5, treble: 0.5 }, specAbs: { sub: 0.5, kick: 0.5, bass: 0.5, treble: 0.5, lowMid: 0.5, mid: 0.5, highMid: 0.5 } };
  private readonly cfg: HopCfg = { beat: undefined, beatErr: undefined };
  private grid: HopGrid | null = null;
  private an: LaneReader | null = null;   // workerns analysator (EN TEMPOKÄLLA, kedjan steg 4)
  private readonly target: HopTarget = { trackBoundaries: 0, quietMs: 0, setClockGrid: (g) => { this.grid = g; },
    setClock: (bpm, conf) => { this.an?.setClock(bpm, conf); } };   // klockan skriver tempot direkt i workerns analysator
  constructor(b: SplitBuffers, private readonly feed: HopFeed, private readonly notify = false) {
    this.ctrl = new Int32Array(b.ctrl); this.ring = new Float64Array(b.post); this.state = new Float64Array(b.hopState);
    const sq = Atomics.load(this.ctrl, C_FEED_SEQ); if (sq & 1) Atomics.store(this.ctrl, C_FEED_SEQ, sq + 1);
    const st = this.state; this.seq = st[FS_HOP_SEQ]; this.processed = st[FS_PROCESSED];
  }
  /** Workerns analysator läser klockan direkt. En ny analysator (inline-omstart) får klockans senaste tempo, som ramen bär (bpm 0,5 från start = 0). */
  connect(an: LaneReader | null): void { this.an = an; an?.setClock(this.fr.bpm, this.fr.bpmConfidence); }
  readSeq(): number { return this.seq; }
  /** Behandla alla poster sedan sist (klockans del), publicera. Klockan läser baskroppen ur högerspaltens senast färdiga post. */
  drain(): number {
    const ctrl = this.ctrl, r = this.ring, fr = this.fr;
    const w = this.seq + seqDelta(Atomics.load(ctrl, C_WRITE), this.seq); let n = 0, lagMs = 0;
    if (w - this.seq > POST_N - RING_MARGIN) { this.skipped += (w - this.seq) - (POST_N - RING_MARGIN); this.seq = w - (POST_N - RING_MARGIN); }
    while (this.seq < w) {
      const seq = ++this.seq, o = (seq % POST_N) * POST_LEN;
      if (r[o + P_SEQ] !== seq) { this.skipped++; continue; }
      const t0 = performance.now();
      this.target.trackBoundaries = r[o + P_BOUND]; this.target.quietMs = r[o + P_QUIET]; this.target.boundSure = r[o + P_SURE] === 1;
      this.target.bodyUnderDb = this.an ? this.an.bodyUnderDb : 0;   // baskroppen ur workerns drop (kedjan steg 5)
      fr.kickAnchorMs = r[o + P_ANCHOR]; fr.kickAtMs = r[o + P_KICKAT];
      fr.onset.kick = r[o + P_ON_KICK]; fr.onset.highMid = r[o + P_ON_HIMID]; fr.onset.treble = r[o + P_ON_TREBLE];
      fr.specAbs.sub = r[o + P_SA_SUB]; fr.specAbs.kick = r[o + P_SA_KICK]; fr.specAbs.bass = r[o + P_SA_BASS]; fr.specAbs.treble = r[o + P_SA_TREBLE];
      fr.specAbs.lowMid = r[o + P_SA_LOWMID]; fr.specAbs.mid = r[o + P_SA_MID]; fr.specAbs.highMid = r[o + P_SA_HIMID];
      this.feed.update(fr, this.cfg, this.target, r[o + P_NOW]);
      const t1 = performance.now(), us = (t1 - t0) * 1000;
      this.busyEmaUs = this.busyEmaUs === 0 ? us : this.busyEmaUs + 0.02 * (us - this.busyEmaUs);
      if (us > this.busyMaxUs) this.busyMaxUs = us;
      lagMs = performance.timeOrigin + t1 - r[o + P_TS]; if (lagMs > this.lagMaxMs) this.lagMaxMs = lagMs;
      n++;
    }
    if (n > 0) {
      this.processed += n;
      Atomics.store(ctrl, C_HOP_READ, seqLow(this.seq));
      stateWrite(ctrl, this.state, (s) => {
        const b = this.cfg.beat, g = this.grid;
        s[FS_HOP_SEQ] = this.seq; s[FS_BEAT] = b ? 1 : b === null ? -1 : 0;
        if (b) { s[FS_ANCHOR] = b.anchorMs; s[FS_BPM] = b.bpm; s[FS_BCONF] = b.confidence ?? 0; }
        s[FS_BEATERR] = this.cfg.beatErr ?? NaN;
        s[FS_GRID] = g ? 1 : 0; if (g) { s[FS_GANCHOR] = g.anchorMs; s[FS_GBPM] = g.bpm; s[FS_GCONF] = g.confidence ?? 0; }
        s[FS_PROCESSED] = this.processed; s[FS_LAG_MS] = lagMs; s[FS_LAG_MAX] = this.lagMaxMs; s[FS_BUSY_US] = this.busyEmaUs; s[FS_BUSY_MAX_US] = this.busyMaxUs; s[FS_SKIPPED] = this.skipped;
        s[FS_BARK] = this.feed.barKnown?.() ? 1 : 0;
      }, C_FEED_SEQ);
      if (this.notify) Atomics.notify(ctrl, C_FEED_SEQ);
    }
    return n;
  }
}
