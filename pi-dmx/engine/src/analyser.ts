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
}

export class Analyser {
  private fft: FFT;
  private window: Float32Array;
  private buffer: Float32Array;      // sliding FFT window
  private writePos = 0;
  private prevMag: Float32Array;     // for flux
  private fluxHistory: number[] = []; // for median
  private readonly fluxHistLen = 43;  // ~1s @ 375 Hz frame rate
  private gain = 1;
  private envelope: number;
  private lastKick = 0;
  private lastT = performance.now();

  constructor(private cfg: EngineConfig) {
    this.fft = new FFT(cfg.fft.size);
    this.window = hannWindow(cfg.fft.size);
    this.buffer = new Float32Array(cfg.fft.size);
    this.prevMag = new Float32Array(cfg.fft.size / 2);
    this.envelope = cfg.detection.autoGainTarget;
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
    const energy = Math.min(1, (bassEnergy / bassBins) * 0.02);
    const treble = Math.min(1, (trebleEnergy / (half - trebleStart)) * 0.03);
    const fluxNorm = Math.min(1, flux * 0.005);

    // Auto-gain (slow: seconds-to-minute timescales)
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.lastT) / 1000);
    this.lastT = now;
    const d = this.cfg.detection;
    if (rms > d.noiseFloor) {
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
    const level = Math.min(1, rms * 4 * this.gain);

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

    return { level, energy, flux: fluxNorm, kick, gain: this.gain };
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
