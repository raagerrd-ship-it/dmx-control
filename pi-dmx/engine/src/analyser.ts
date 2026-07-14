/**
 * Audio analyser: sliding FFT window, RMS level with slow auto-gain,
 * kick detection via bass-flux median-prominence gate.
 */

import FFT from "fft.js";
import type { EngineConfig } from "./config.js";

export interface Frame {
  level: number;        // 0..1, auto-gained RMS
  energy: number;       // 0..1, bass-weighted spectral energy
  treble: number;       // 0..1, high-band spectral energy (hats/cymbals/vocals top)
  flux: number;         // 0..1, bass-band spectral flux
  kick: boolean;        // true on rising edge only
  gain: number;         // current auto-gain factor (debug)
  bpm: number;          // 0 = ej låst; lokal tempo-estimat via autokorrelation
  bpmConfidence: number;// 0..1, hur tydlig vinnande takttoppen är (peak-to-mean)
  beatAnchorMs: number; // wall-clock ms för ett taktslag (fas)
}


export class Analyser {
  private fft: FFT;
  private window: Float32Array;
  private buffer: Float32Array;      // sliding FFT window
  private writePos = 0;
  private prevMag: Float32Array;     // for flux
  private fluxHistory: number[] = []; // for median
  private readonly fluxHistLen: number;   // ~115 ms median-fönster (frame-rate-oberoende)
  private static readonly ENV_HZ = 100;
  private static readonly ENV_LEN = 100 * 5;
  private envRing = new Float32Array(Analyser.ENV_LEN);
  private envPos = 0;
  private envFilled = 0;
  private envAccum = 0;
  private envAccumT = 0;
  private bpmCounter = 0;
  private localBpm = 0;
  private localBpmConfidence = 0;

  private bpmHist: number[] = [];   // senaste råestimat (~3s) för median-stabilisering
  private silentMs = 0;
  private beatAnchorMs = 0;
  private gain = 1;
  // Attack/release-smoothed outputs — raw per-hop values update ~370x/s and
  // read as flicker on the lamps. Fast attack keeps hits punchy; the slower
  // release lets light glide down instead of sputtering.
  private lvlSmooth = 0;
  private engSmooth = 0;
  private trbSmooth = 0;

  /** Called when the input routing changes — the old gain is meaningless for
   *  the new source's signal level, so re-converge from neutral. */
  private gainLocked = false;

  resetGain(startGain = 1) {
    // Seed per input: line (aux) arrives hot -> 1x; the room mic is weak -> ~20x.
    this.gain = Math.max(0.5, Math.min(20, startGain));
    this.envelope = 0;
  }

  /** Lock the AGC (aux: fixed 1x, level tracks the mixer directly) or let it run. */
  setGainLock(locked: boolean, fixed = 1) {
    this.gainLocked = locked;
    if (locked) { this.gain = fixed; this.envelope = 0; }
  }

  /**
   * BPM (55..175) från onset-envelopens autokorrelation.
   *  1) Toppen i autokorrelationen ger en kandidat-lag.
   *  2) SUB-HARMONIC-PREFERENS: om dubbla/tredubbla lagget (halva/tredjedels
   *     tempot) resonerar nästan lika bra är det oftast det ÄKTA beatet — annars
   *     låser en tryckare/ballad på sin subdivision (dubbeltakt). Väljer grundtempot.
   *  3) MEDIAN över ~3s → robust mot enstaka oktav-flippar (istället för att
   *     bestämma per frame, vilket flimrade). Snäpper vid verkligt oktavbyte,
   *     glider mjukt vid små avvik.
   *  (Ref: comb/sub-harmonic + fler-frames-röstning, se @audio/beat och
   *   OBTAIN-realtidsbeat-tracking.)
   */
  private computeBpm() {
    if (this.envFilled < 80) return;   // ~0.8s → första grovestimat direkt, förfinas löpande
    const N = this.envFilled;
    const env = new Float32Array(N);
    let mean = 0;
    const start = (this.envPos - N + Analyser.ENV_LEN) % Analyser.ENV_LEN;
    for (let i = 0; i < N; i++) { env[i] = this.envRing[(start + i) % Analyser.ENV_LEN]; mean += env[i]; }
    mean /= N;
    for (let i = 0; i < N; i++) env[i] -= mean;
    const HZ = Analyser.ENV_HZ;
    const lagMin = Math.floor(HZ * 60 / 185);
    const lagMax = Math.min(N - 1, Math.floor(HZ * 60 / 55));   // ner till 55 BPM
    // 1) Rå autokorrelation, LENGTH-NORMALISERAD: /(N-lag) tar bort biasen mot
    //    korta lag (annars vinner alltid snabb takt eftersom fler termer bidrar).
    // 2) COMB-SCORING: ac(L) + ½·ac(2L) + ⅓·ac(3L). En äkta beat-period resonerar
    //    även på dubbla/trippla lag — enskilda toppar gör det inte. (Klapuri.)
    // 3) PULSE-TRAIN CROSS-CORRELATION (Percival-Tzanetakis 2014, Essentia):
    //    korrelera envelopen mot en idealiserad pulsserie vid bästa fas. Fångar
    //    regelbundenheten även när AC är utsmetad (mjuka onsets, synkoperingar).
    // 4) PERCEPTUELL PRIOR: log-Gauss runt 120 BPM, σ = 1.0 oktav (Ellis/librosa).
    const ac = new Float32Array(lagMax + 1);
    for (let lag = lagMin; lag <= lagMax; lag++) {
      let sum = 0;
      const M = N - lag;
      for (let i = 0; i < M; i++) sum += env[i] * env[i + lag];
      ac[lag] = sum / M;
    }
    // Halvvågsrektifierad envelope (positiv del) — pulse xcorr använder bara energi PÅ slaget.
    const envPos = new Float32Array(N);
    for (let i = 0; i < N; i++) envPos[i] = env[i] > 0 ? env[i] : 0;
    // Pulse-train xcorr per lag: max över fas av Σ envPos[φ + k·L], normaliserad per antal pulser.
    const pulse = new Float32Array(lagMax + 1);
    let pulseMax = 1e-9, combMax = 1e-9;
    for (let lag = lagMin; lag <= lagMax; lag++) {
      let best = 0;
      for (let ph = 0; ph < lag; ph++) {
        let s = 0, k = 0;
        for (let i = ph; i < N; i += lag) { s += envPos[i]; k++; }
        if (k > 0) { const norm = s / k; if (norm > best) best = norm; }
      }
      pulse[lag] = best;
      if (best > pulseMax) pulseMax = best;
      let comb = ac[lag];
      if (2 * lag <= lagMax) comb += 0.5 * ac[2 * lag];
      if (3 * lag <= lagMax) comb += 0.33 * ac[3 * lag];
      if (comb > combMax) combMax = comb;
    }
    let bestLag = 0, bestVal = 0;
    let scoreSum = 0, scoreCount = 0;
    for (let lag = lagMin; lag <= lagMax; lag++) {
      let comb = ac[lag];
      if (2 * lag <= lagMax) comb += 0.5 * ac[2 * lag];
      if (3 * lag <= lagMax) comb += 0.33 * ac[3 * lag];
      // Normalisera båda till [0,1] och rösta jämnt — så de kan väga upp varandra.
      // AC svarar starkt på självlikhet, pulse xcorr på regelbunden energi-fördelning.
      const combN = comb / combMax;
      const pulseN = pulse[lag] / pulseMax;
      const bpmAt = (HZ * 60) / lag;
      const oct = Math.log2(bpmAt / 120);
      const prior = Math.exp(-(oct * oct) / 2.0);   // σ = 1.0 oktav
      const score = (0.5 * combN + 0.5 * pulseN) * prior;
      scoreSum += score; scoreCount++;
      if (score > bestVal) { bestVal = score; bestLag = lag; }
    }

    if (bestLag === 0 || bestVal <= 0) return;
    // Peak-to-mean confidence: en tydlig takttopp sticker ut från medelnivån,
    // en utsmetad "tempolös" låt eller brus har ~platt scoring. clamp(0..1).
    const meanScore = scoreSum / Math.max(1, scoreCount);
    const rawConf = meanScore > 0 ? 1 - meanScore / bestVal : 0;
    // Skala: ~0.35 råvärde är typiskt "helt låst". Mappa 0..0.5 → 0..1.
    const conf = Math.max(0, Math.min(1, rawConf / 0.5));

    // OFF-BEAT-TEST → skilj äkta snabb takt (dans) från subdivision (ballad).
    // Vik onset-envelopen på DUBBLA perioden, jämför energi PÅ slaget vs MELLAN.
    // Svaga mellanslag → sanna takten är halva; starka → behåll snabb takt.
    const P = bestLag * 2;
    if (P <= lagMax) {
      let bestPhase = 0, bestPhaseSum = -1;
      for (let ph = 0; ph < P; ph++) {
        let s = 0; for (let i = ph; i < N; i += P) s += Math.max(0, env[i]);
        if (s > bestPhaseSum) { bestPhaseSum = s; bestPhase = ph; }
      }
      let onE = 0, offE = 0;
      const offPh = (bestPhase + bestLag) % P;
      for (let i = bestPhase; i < N; i += P) onE += Math.max(0, env[i]);
      for (let i = offPh;    i < N; i += P) offE += Math.max(0, env[i]);
      if (onE > 0 && offE < onE * 0.45) bestLag = P;
    }

    // Parabolisk interpolation kring toppen → sub-lag-precision (t.ex. 125 ist. 122).
    let lagF = bestLag;
    if (bestLag > lagMin && bestLag + 1 <= lagMax) {
      const acAt = (L: number) => { let s = 0; for (let i = 0; i + L < N; i++) s += env[i] * env[i + L]; return s; };
      const yl = acAt(bestLag - 1), y0 = acAt(bestLag), yr = acAt(bestLag + 1);
      const den = yl - 2 * y0 + yr;
      if (den < 0) { const d = 0.5 * (yl - yr) / den; if (Math.abs(d) < 1) lagF = bestLag + d; }
    }
    let bpm = (HZ * 60) / lagF;
    while (bpm < 55) bpm *= 2;
    while (bpm >= 175) bpm /= 2;
    // OKTAV-STICKINESS: när takten väl är låst, vik nya estimat till oktaven
    // närmast låset. En låt byter inte oktav mitt i — så en breakdown med svaga
    // mellanslag (off-beat-testet vill halvera) ska INTE halvera en låst danstakt.
    // Off-beat-testet avgör bara vid FÖRSTA låsningen; nya låtar låser om via
    // tyst-resetten (localBpm=0).
    if (this.localBpm > 0) {
      let folded = bpm, fd = Math.abs(bpm - this.localBpm);
      for (const c of [bpm * 2, bpm / 2]) {
        if (c >= 55 && c < 175 && Math.abs(c - this.localBpm) < fd) { fd = Math.abs(c - this.localBpm); folded = c; }
      }
      bpm = folded;
    }
    // Median-stabilisering över ~5s (20 estimat @ 4 Hz) → robust mot att
    // autokorrelationen råkar peka på olika metriska nivåer i olika sektioner.
    this.bpmHist.push(bpm);
    if (this.bpmHist.length > 20) this.bpmHist.shift();
    const sorted = [...this.bpmHist].sort((a, b) => a - b);
    const med = sorted[sorted.length >> 1];
    if (this.localBpm === 0 || Math.abs(med - this.localBpm) > 15) this.localBpm = Math.round(med);   // nytt/oktavbyte → snäpp
    else this.localBpm = Math.round(this.localBpm + (med - this.localBpm) * 0.35);                    // små avvik → glid
    // Smooth confidence (undvik hoppig UI); attack snabbt, release långsamt.
    const cA = this.localBpmConfidence;
    this.localBpmConfidence = cA + (conf - cA) * (conf > cA ? 0.35 : 0.08);
  }

  private envelope: number;
  private lastKick = 0;
  private lastT = performance.now();

  constructor(private cfg: EngineConfig) {
    this.fft = new FFT(cfg.fft.size);
    this.window = hannWindow(cfg.fft.size);
    this.buffer = new Float32Array(cfg.fft.size);
    this.prevMag = new Float32Array(cfg.fft.size / 2);
    this.envelope = cfg.detection.autoGainTarget;
    this.fluxHistLen = Math.max(8, Math.round(0.115 * cfg.audio.rate / cfg.fft.hop));
  }

  /** Feed a hop-sized chunk of mono samples, get a frame back. */
  process(samples: Float32Array): Frame {
    // Slide buffer left by hop, append new samples at end.
    const hop = samples.length;
    this.buffer.copyWithin(0, hop);
    this.buffer.set(samples, this.buffer.length - hop);

    // Windowed FFT
    const windowed = new Float32Array(this.cfg.fft.size);
    for (let i = 0; i < windowed.length; i++) windowed[i] = this.buffer[i] * this.window[i];
    const spectrum = this.fft.createComplexArray();
    this.fft.realTransform(spectrum, windowed);

    // RMS on raw (un-windowed) buffer — cheaper and more stable for auto-gain
    let sumSq = 0;
    for (let i = 0; i < this.buffer.length; i++) sumSq += this.buffer[i] * this.buffer[i];
    const rms = Math.sqrt(sumSq / this.buffer.length);

    // Magnitude spectrum + bass band
    const half = this.cfg.fft.size / 2;
    const mag = new Float32Array(half);
    let bassEnergy = 0;
    let trebleEnergy = 0;
    let flux = 0;
    const bassBins = Math.min(16, half);           // ~0–1.5 kHz @ 48k/512
    const trebleStart = Math.floor(half * 0.5);    // ~top half of spectrum (~12 kHz+)
    for (let i = 0; i < half; i++) {
      const re = spectrum[2 * i];
      const im = spectrum[2 * i + 1];
      mag[i] = Math.sqrt(re * re + im * im);
      if (i < bassBins) {
        bassEnergy += mag[i];
        const d = mag[i] - this.prevMag[i];
        if (d > 0) flux += d;    // half-wave rectified
      }
      if (i >= trebleStart) trebleEnergy += mag[i];
    }
    this.prevMag = mag;
    // Gain-compensated like `level` — otherwise the band-driven fixtures and
    // the kick energy gate die at low volume while the AGC keeps level alive.
    const energy = Math.min(1, (bassEnergy / bassBins) * 0.02 * this.gain);
    const treble = Math.min(1, (trebleEnergy / (half - trebleStart)) * 0.03 * this.gain);
    const fluxNorm = Math.min(1, flux * 0.005);

    // Auto-gain (slow: seconds-to-minute timescales)
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.lastT) / 1000);
    this.lastT = now;
    const d = this.cfg.detection;
    if (!this.gainLocked && rms > d.noiseFloor) {
      const tau = rms * this.gain > this.envelope ? d.tauDown : d.tauUp;
      const a = 1 - Math.exp(-dt / tau);
      this.envelope += (rms * this.gain - this.envelope) * a;
      const desired = (d.autoGainTarget / Math.max(1e-4, this.envelope)) * this.gain;
      const gTau = desired > this.gain ? d.tauUp : d.tauDown;
      const ga = 1 - Math.exp(-dt / gTau);
      this.gain += (desired - this.gain) * ga;
      if (this.gain < 0.5) this.gain = 0.5;
      else if (this.gain > 20) this.gain = 20;
    }
    // rms*gain averages at autoGainTarget once the AGC has converged — the old
    // *4 factor made steady-state level 4x the target, i.e. pegged at 100%.
    const level = Math.min(1, rms * this.gain);

    // Kick: bassFlux above median × threshold, with cooldown + energy gate.
    this.fluxHistory.push(fluxNorm);
    if (this.fluxHistory.length > this.fluxHistLen) this.fluxHistory.shift();
    const median = medianOf(this.fluxHistory);
    let kick = false;
    if (
      fluxNorm > median * d.kickThreshold &&
      fluxNorm > 0.045 &&                  // absolute floor
      energy > 0.05 &&
      now - this.lastKick > d.kickCooldownMs
    ) {
      kick = true;
      this.lastKick = now;
    }

    const frameMs0 = (this.cfg.fft.hop / this.cfg.audio.rate) * 1000;
    // Tystnad → nollställ BPM-klockan så beat-effekter inte fortsätter i fantom-takt.
    if (rms < this.cfg.detection.noiseFloor * 1.5) {
      this.silentMs += frameMs0;
      if (this.silentMs > 350) { this.localBpm = 0; this.localBpmConfidence = 0; this.envFilled = 0; this.beatAnchorMs = 0; this.bpmHist.length = 0; }
    } else {
      this.silentMs = 0;
    }
    // --- Onset-envelope → lokal BPM (nedsamplad till 100 Hz) ---
    const frameMs = (this.cfg.fft.hop / this.cfg.audio.rate) * 1000;
    this.envAccum = Math.max(this.envAccum, fluxNorm);
    this.envAccumT += frameMs;
    if (this.envAccumT >= 1000 / Analyser.ENV_HZ) {
      this.envAccumT -= 1000 / Analyser.ENV_HZ;
      this.envRing[this.envPos] = this.envAccum;
      this.envPos = (this.envPos + 1) % Analyser.ENV_LEN;
      this.envFilled = Math.min(this.envFilled + 1, Analyser.ENV_LEN);
      this.envAccum = 0;
      // Innan lås: räkna på varje ny envelope-sample (100 Hz) för snabbast första estimat.
      // Efter lås: 4 Hz räcker gott — sparar CPU och förfinar med median.
      const stride = this.localBpm === 0 ? 1 : Analyser.ENV_HZ / 4;
      if (++this.bpmCounter >= stride) { this.bpmCounter = 0; this.computeBpm(); }

    }
    if (kick) this.beatAnchorMs = Date.now();

    const dtHop = this.cfg.fft.hop / this.cfg.audio.rate;
    const aAtt = 1 - Math.exp(-dtHop / 0.015);
    const aRel = 1 - Math.exp(-dtHop / 0.4);
    const smooth = (prev: number, x: number) => prev + (x - prev) * (x > prev ? aAtt : aRel);
    this.lvlSmooth = smooth(this.lvlSmooth, level);
    this.engSmooth = smooth(this.engSmooth, energy);
    this.trbSmooth = smooth(this.trbSmooth, treble);
    return { level: this.lvlSmooth, energy: this.engSmooth, treble: this.trbSmooth, flux: fluxNorm, kick, gain: this.gain, bpm: this.localBpm, beatAnchorMs: this.beatAnchorMs };
  }
}

function hannWindow(n: number): Float32Array {
  const w = new Float32Array(n);
  for (let i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
  return w;
}

function medianOf(arr: number[]): number {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[s.length >> 1];
}
