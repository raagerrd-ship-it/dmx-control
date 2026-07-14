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
  private pendingBpm = 0;   // senaste råestimat, för bekräftelse av stora hopp
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

  /** Autokorrelation av onset-envelopen -> BPM (75..170), oktavvikt + glidlast. */
  private computeBpm() {
    if (this.envFilled < Analyser.ENV_LEN * 0.45) return;   // första estimat ~2.2s (var 3.5s)
    const N = this.envFilled;
    const env = new Float32Array(N);
    let mean = 0;
    const start = (this.envPos - N + Analyser.ENV_LEN) % Analyser.ENV_LEN;
    for (let i = 0; i < N; i++) { env[i] = this.envRing[(start + i) % Analyser.ENV_LEN]; mean += env[i]; }
    mean /= N;
    for (let i = 0; i < N; i++) env[i] -= mean;
    const lagMin = Math.floor(Analyser.ENV_HZ * 60 / 175);
    const lagMax = Math.floor(Analyser.ENV_HZ * 60 / 63);   // ner till 63 BPM så tryckare/ballad inte dubblas
    let bestLag = 0, bestVal = 0;
    for (let lag = lagMin; lag <= lagMax; lag++) {
      let sum = 0;
      for (let i = 0; i + lag < N; i++) sum += env[i] * env[i + lag];
      if (sum > bestVal) { bestVal = sum; bestLag = lag; }
    }
    if (bestLag === 0 || bestVal <= 0) return;
    let bpm = (Analyser.ENV_HZ * 60) / bestLag;
    while (bpm < 63) bpm *= 2;
    while (bpm >= 170) bpm /= 2;
    if (this.localBpm === 0) { this.localBpm = Math.round(bpm); this.pendingBpm = bpm; return; }
    // Oktav-stickiness: välj den oktav-varianten (½×, 1×, 2×) som ligger närmast
    // nuvarande tempo → dödar 83↔162-hoppen som gjorde att den aldrig satte sig.
    let best = bpm, bd = Math.abs(bpm - this.localBpm);
    for (const c of [bpm / 2, bpm * 2]) {
      if (c >= 70 && c <= 180 && Math.abs(c - this.localBpm) < bd) { bd = Math.abs(c - this.localBpm); best = c; }
    }
    const diff = best - this.localBpm;
    if (Math.abs(diff) <= 12) {
      this.localBpm = Math.round(this.localBpm + diff * 0.34);          // litet avvik → mjuk glidning (stabilt)
    } else if (Math.abs(best - this.pendingBpm) <= 8) {
      this.localBpm = Math.round(best);                                 // stort hopp bekräftat 2 ggr → nytt tempo, snäpp
    }
    this.pendingBpm = best;                                             // annars: ignorera engångs-uthopp
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
      if (this.silentMs > 350) { this.localBpm = 0; this.envFilled = 0; this.beatAnchorMs = 0; }
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
      if (++this.bpmCounter >= Analyser.ENV_HZ / 4) { this.bpmCounter = 0; this.computeBpm(); }   // 4 Hz (var 2 Hz) → snabbare inlåsning
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
