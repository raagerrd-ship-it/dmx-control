/** LATGRANS UR LJUDET — utbruten ur songMemory.ts 2026-09-23 nar latminnet togs bort fran driften. Anteckningar (kommentarerna som stod i koden): docs/analysator/boundaryDetector.md */

import { silentLevel } from "./analyser.js";
const SILENCE_END_MS = 3000;   // tystnad sa lange
const START_HOLD_MS = 1000;   // ett segment startar nar musiken hallit sig over slackgransen sa lange
const MIN_SEG_MS = 110000;   // MATT: 75 s triggade direkt
const MAX_SEG_MS = 600000;   // 10 min utan grans
const NOV_WIN_MS = 1500;   // klangprofil per 1,5 s
const NOV_LAG_MS = 8000;   // jamfor mot profilen sa langt bakat
const CHAR_D = 0.55;   // 10-01 i koden
const CHAR_REFRACT_MS = 15000;
const NOV_Q = 0.97;   // skiftet maste ligga i toppen av de senaste minuterna
const NOV_TAU_S = 45;   // glomska pa fordelningen
const NOV_DIST_MIN_S = 20;   // innan sa mycket data samlats galler bara absoluta kravet
const NOV_DIST_BUCKETS = 48;   // d ar ett L1-avstand i 0..2
const NOV_BANDS = [40, 80, 160, 320, 640, 1280, 2560, 5120, 11000];
const TEMPO_SHIFT_PCT = 0.06;   // TEMPOVAXLING UPPAT
const TEMPO_SHIFT_MAX = 0.40;   // mer = troligen oktavhopp, inte musik
const TEMPO_SHIFT_HOLD_MS = 900;   // sa lange maste okningen sta
const TEMPO_SHIFT_REFRACT_MS = 12000;
const TEMPO_REF_S = 20;   // latens etablerade tempo
const F_NB = 24, F_BLO = 40, F_BHI = 12000;   // LATENS FORM
const F_CLO = 250, F_CHI = 5000;   // kromagrammets omfang
const F_BLK_MS = 500;   // ett sarlagsblock
const F_LB = 160, F_LA = 16, F_G = 2;   // block: 80 s fore, 8 s efter, 1 s glapp runt skarven
const F_WC = 6, F_WB = 1;   // vikter kroma, tempo
const F_THR = 1.3;   // MATT (med F_TMIN)
const F_TMIN = 0.3;   // en falsk grans nollar tempolaset och byter manus, en missad kostar bara...
const F_RING = 256;

/** Median. */
function median(a: Float64Array): number {
  a.sort(); const n = a.length, h = n >> 1;
  return n & 1 ? a[h] : (a[h - 1] + a[h]) / 2;
}
/** Tempoavstand i oktaver med oktav- och 1,5x-fel bortvikta. */
function foldBpm(a: number, b: number): number {
  if (a < 40 || b < 40) return 0;
  const x = Math.abs(Math.log2(b / a)) % 1;
  return Math.min(x, 1 - x, Math.abs(x - 0.585), Math.abs(x - 0.415));
}

export class BoundaryDetector {
  constructor(private readonly clock: () => number = Date.now) {}

  boundaryCount = 0;   // Stiger vid varje passerad latgrans
  lastBoundary = "";   // Varfor senaste gransen sattes
  tempoShiftCount = 0;   // Stiger vid varje tempoVAXLING uppat
  tempoShiftFrom = 0; tempoShiftTo = 0;   // Tempot vaxlingen gick fran
  private tempoUpSince = 0;
  private tempoUpFrom = 0;
  private tempoRef = 0;
  private tempoRefAt = 0;
  private tempoShiftAt = -1e9;
  /** Gransignalen vid senaste beslutet. */
  get lastEvidence(): string[] { return this.lastBoundary ? [this.lastBoundary] : []; }

  private playStart = 0;   // vaggklocka da segmentet borjade
  private lastLoud = 0;
  private loudSince = 0;
  private novAcc = new Float32Array(NOV_BANDS.length - 1);
  private novN = 0;
  private novStart = 0;
  private novHist: Float32Array[] = [];
  private novIdx = 0;   // nasta slot i ringen
  private novFilled = 0;   // antal skrivna profiler
  charShiftCount = 0; charShiftD = 0; private charShiftAt = 0;   // KARAKTARSSKIFTE
  private novDist = new Float32Array(NOV_DIST_BUCKETS);   // fordelning over ALLA d
  private novDistTotal = 0;

  /** Ett segment. */
  get active(): boolean { return this.playStart > 0; }
  /** Sa lange nuvarande segment varat. */
  get segmentMs(): number { return this.playStart ? this.clock() - this.playStart : 0; }

  /** Matas fran analysatorns spektrum-sink. */
  pushSpectrum(mag: Float32Array, binHz: number): void {
    if (!this.playStart) return;
    this.pushNovelty(mag, binHz);
    this.pushForm(mag, binHz);
  }

  private fBand: Int8Array | null = null; private fPc: Int8Array | null = null; private fHz = 0;   // LATENS FORM
  private fAcc = new Float64Array(F_NB); private fCh = new Float64Array(12); private fN = 0; private fStart = 0;
  private fLb = new Float32Array(F_RING * F_NB); private fC = new Float32Array(F_RING * 12);
  private fT = new Float64Array(F_RING); private fBpm = new Float64Array(F_RING); private fCount = 0;
  private fLastBpm = 0;
  private fPendAt = 0; private fPendScore = 0;
  private fMa = new Float64Array(F_NB); private fMb = new Float64Array(F_NB); private fCa = new Float64Array(12); private fCb = new Float64Array(12);
  private fMedA = new Float64Array(F_LB); private fMedB = new Float64Array(F_LA);

  private pushForm(mag: Float32Array, binHz: number): void {
    if (!this.fBand || this.fHz !== binHz || this.fBand.length !== mag.length) {
      const n = mag.length; this.fHz = binHz; this.fBand = new Int8Array(n).fill(-1); this.fPc = new Int8Array(n).fill(-1);
      for (let i = 1; i < n; i++) {
        const f = i * binHz;
        if (f >= F_BLO && f < F_BHI) this.fBand[i] = Math.floor(F_NB * Math.log(f / F_BLO) / Math.log(F_BHI / F_BLO));
        if (f >= F_CLO && f < F_CHI) this.fPc[i] = ((Math.round(12 * Math.log2(f / 440)) % 12) + 12) % 12;
      }
    }
    const band = this.fBand, pc = this.fPc!, acc = this.fAcc, ch = this.fCh;
    for (let i = 1; i < mag.length; i++) { const m = mag[i], b = band[i], p = pc[i]; if (b >= 0) acc[b] += m; if (p >= 0) ch[p] += m * m; }
    this.fN++;
    const now = this.clock();
    if (!this.fStart) this.fStart = now;
    if (now - this.fStart < F_BLK_MS) return;
    this.fStart = now;
    const k = this.fCount % F_RING, o = k * F_NB, oc = k * 12, n = this.fN;
    let mean = 0;
    for (let b = 0; b < F_NB; b++) { const v = Math.log(acc[b] / n + 1e-6); this.fLb[o + b] = v; mean += v; }
    mean /= F_NB; for (let b = 0; b < F_NB; b++) this.fLb[o + b] -= mean;
    let cs = 0; for (let p = 0; p < 12; p++) cs += ch[p] / n;
    for (let p = 0; p < 12; p++) this.fC[oc + p] = (ch[p] / n) / (cs + 1e-12);
    this.fT[k] = now; this.fBpm[k] = this.fLastBpm; this.fCount++;
    acc.fill(0); ch.fill(0); this.fN = 0;
    this.formDecide();
  }

  /** Skarven provas F_G + F_LA block bakat. */
  private formDecide(): void {
    if (this.fPendAt) return;
    const j = this.fCount - 1 - F_G - F_LA, a0 = j - F_G - F_LB, b0 = j + F_G;
    if (a0 < 0 || this.fCount - a0 > F_RING) return;
    const R = F_RING, sAt = this.fT[j % R];
    if (sAt - this.playStart < MIN_SEG_MS || this.fT[a0 % R] <= this.playStart) return;
    const ma = this.fMa, ca = this.fCa, cb = this.fCb; ma.fill(0); ca.fill(0); cb.fill(0);
    for (let q = 0; q < F_LB; q++) { const k = (a0 + q) % R, o = k * F_NB, oc = k * 12;
      for (let b = 0; b < F_NB; b++) ma[b] += this.fLb[o + b];
      for (let p = 0; p < 12; p++) ca[p] += this.fC[oc + p];
      this.fMedA[q] = this.fBpm[k]; }
    let dT = 0;
    const mb = this.fMb; mb.fill(0);
    for (let q = 0; q < F_LA; q++) { const k = (b0 + q) % R, o = k * F_NB, oc = k * 12;
      for (let b = 0; b < F_NB; b++) mb[b] += this.fLb[o + b];
      for (let p = 0; p < 12; p++) cb[p] += this.fC[oc + p];
      this.fMedB[q] = this.fBpm[k]; }
    for (let b = 0; b < F_NB; b++) dT += Math.abs(ma[b] / F_LB - mb[b] / F_LA);
    dT /= F_NB;
    let dot = 0, na = 0, nb = 0; for (let p = 0; p < 12; p++) { dot += ca[p] * cb[p]; na += ca[p] * ca[p]; nb += cb[p] * cb[p]; }
    const dC = 1 - dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
    const dB = foldBpm(median(this.fMedA), median(this.fMedB));
    const sc = dT + F_WC * dC + F_WB * dB;
    if (sc >= F_THR && dT >= F_TMIN) { this.fPendAt = sAt; this.fPendScore = sc; }
  }

  /** Matas varje hop med ramens niva/tempo. */
  tick(o: { level: number; bpm: number; bpmConfidence: number; silent?: boolean }): void {
    const now = this.clock();
    this.fLastBpm = o.bpm;
    const loud = !(o.silent ?? silentLevel(o.level));
    if (loud) this.lastLoud = now;
    if (!this.playStart) {
      if (loud) {
        if (!this.loudSince) this.loudSince = now;
        else if (now - this.loudSince >= START_HOLD_MS) { this.playStart = now; this.lastLoud = now; this.loudSince = 0; }
      } else this.loudSince = 0;
      return;
    }
    if (now - this.lastLoud > SILENCE_END_MS) { this.commit(); return; }
    this.boundary(now, now - this.playStart, o);
  }

  /** KLANGSKIFTE. */
  private pushNovelty(mag: Float32Array, binHz: number): void {
    const now = this.clock();
    if (!this.novStart) this.novStart = now;
    for (let b = 0; b < this.novAcc.length; b++) {
      const lo = Math.max(1, Math.round(NOV_BANDS[b] / binHz));
      const hi = Math.min(mag.length - 1, Math.round(NOV_BANDS[b + 1] / binHz));
      let s = 0;
      for (let i = lo; i <= hi; i++) s += mag[i];
      this.novAcc[b] += hi >= lo ? s / (hi - lo + 1) : 0;
    }
    this.novN++;
    if (now - this.novStart < NOV_WIN_MS) return;
    this.novStart = now;
    let sum = 0;
    for (let b = 0; b < this.novAcc.length; b++) sum += this.novAcc[b];
    this.novN = 0;
    if (sum <= 0) { this.novAcc.fill(0); return; }
    const lag = Math.max(1, Math.round(NOV_LAG_MS / NOV_WIN_MS));
    const size = lag + 1;
    if (this.novHist.length !== size) {
      this.novHist = [];
      for (let i = 0; i < size; i++) this.novHist.push(new Float32Array(this.novAcc.length));
      this.novIdx = 0; this.novFilled = 0;
    }
    const prof = this.novHist[this.novIdx];
    for (let b = 0; b < prof.length; b++) prof[b] = this.novAcc[b] / sum;
    this.novAcc.fill(0);
    this.novIdx = (this.novIdx + 1) % size;
    this.novFilled++;
    if (this.novFilled > lag) {
      const past = this.novHist[this.novIdx];
      let d = 0;
      for (let b = 0; b < prof.length; b++) d += Math.abs(prof[b] - past[b]);
      const dt = NOV_WIN_MS / 1000;
      const decay = Math.exp(-dt / NOV_TAU_S);
      for (let i = 0; i < NOV_DIST_BUCKETS; i++) this.novDist[i] *= decay;
      this.novDistTotal *= decay;
      let bk = Math.floor((d / 2) * NOV_DIST_BUCKETS);
      if (bk < 0) bk = 0; if (bk >= NOV_DIST_BUCKETS) bk = NOV_DIST_BUCKETS - 1;
      this.novDist[bk] += dt;
      this.novDistTotal += dt;
      if (CHAR_D > 0 && d >= CHAR_D && d >= this.novRelThreshold() && now - this.charShiftAt >= CHAR_REFRACT_MS) { this.charShiftAt = now; this.charShiftCount++; this.charShiftD = d; }
    }
  }

  /** Troskeln som laten sjalv satter. */
  private novRelThreshold(): number {
    if (this.novDistTotal < NOV_DIST_MIN_S) return 0;
    const target = this.novDistTotal * NOV_Q;
    let acc = 0;
    for (let i = 0; i < NOV_DIST_BUCKETS; i++) {
      acc += this.novDist[i];
      if (acc >= target) return ((i + 0.5) / NOV_DIST_BUCKETS) * 2;
    }
    return 2;
  }

  private resetNovelty(): void {
    this.novAcc.fill(0); this.novN = 0; this.novStart = 0;
    this.novDist.fill(0); this.novDistTotal = 0;
    this.novHist = []; this.novIdx = 0; this.novFilled = 0;
  }

  /** LATGRANS I EN GAPLOS STROM. */
  private boundary(now: number, tLive: number, o: { bpm: number; bpmConfidence: number; level: number }): boolean {
    if (o.bpmConfidence > 0.5 && o.bpm > 40) {
      if (!this.tempoRef) this.tempoRef = o.bpm;
      const up = (o.bpm - this.tempoRef) / this.tempoRef;
      if (up >= TEMPO_SHIFT_PCT) {
        if (!this.tempoUpSince) { this.tempoUpSince = now; this.tempoUpFrom = this.tempoRef; }
        else if (now - this.tempoUpSince >= TEMPO_SHIFT_HOLD_MS && now - this.tempoShiftAt >= TEMPO_SHIFT_REFRACT_MS) {
          const trueUp = (o.bpm - this.tempoUpFrom) / this.tempoUpFrom;
          const octave = Math.abs(trueUp - 0.5) < 0.07 || trueUp > TEMPO_SHIFT_MAX;
          this.tempoUpSince = 0;
          if (!octave) {
            this.tempoShiftAt = now;
            this.tempoShiftFrom = Math.round(this.tempoUpFrom); this.tempoShiftTo = Math.round(o.bpm);
            this.tempoShiftCount++;
            this.tempoRef = o.bpm; this.tempoRefAt = now;
          }
        }
      } else {
        this.tempoUpSince = 0;
        const dtS = this.tempoRefAt ? Math.min(0.5, (now - this.tempoRefAt) / 1000) : 0;
        const a = TEMPO_REF_S > 0 ? Math.min(1, dtS / TEMPO_REF_S) : 1;
        this.tempoRef += (o.bpm - this.tempoRef) * a;
        this.tempoRefAt = now;
      }
    }

    let why = "";
    let back = 0;
    if (this.fPendAt) { why = `latform ${this.fPendScore.toFixed(2)}`; back = Math.max(0, now - this.fPendAt); this.fPendAt = 0; }
    else if (tLive > MAX_SEG_MS) why = "maxlängd";
    if (!why) return false;

    const bAt = now - back;
    console.log(`[song] låtgräns efter ${((bAt - this.playStart) / 1000).toFixed(0)}s (${why})`);
    this.lastBoundary = why;
    this.lastLoud = bAt;
    this.commit();
    this.playStart = bAt;
    this.lastLoud = now;
    return true;
  }

  /** Segmentet ar slut. */
  private commit(): void {
    this.boundaryCount++;
    this.playStart = 0;
    this.resetNovelty(); this.fPendAt = 0; this.loudSince = 0;
  }
}
