/**
 * OFFLINE-BÄNK: spelar en WAV genom den riktiga analysatorn.
 *
 * Samma konvertering som AudioCapture (stereo S16_LE → mono (L+R)/65536,
 * hop 128) och samma analysator-kod som körs på Pi:n. Klockan drivs av
 * SAMPELRÄKNAREN, inte av väggklockan — därför blir resultatet identiskt
 * oavsett om filen spelas på 1× eller 200×, och en låt kan analyseras på
 * någon sekund i stället för på fyra minuter av någons kväll.
 */
import { readFileSync } from "node:fs";
import { Analyser } from "../dist/analyser.js";
import { defaultConfig } from "../dist/config.js";

function readWav(path) {
  const b = readFileSync(path);
  if (b.toString("ascii", 0, 4) !== "RIFF") throw new Error("inte en WAV");
  let p = 12, fmt = null, data = null;
  while (p + 8 <= b.length) {
    const id = b.toString("ascii", p, p + 4), sz = b.readUInt32LE(p + 4);
    if (id === "fmt ") fmt = { channels: b.readUInt16LE(p + 10), rate: b.readUInt32LE(p + 12), bits: b.readUInt16LE(p + 22) };
    else if (id === "data") { data = b.subarray(p + 8, p + 8 + sz); break; }
    p += 8 + sz + (sz & 1);
  }
  if (!fmt || !data) throw new Error("saknar fmt/data");
  return { ...fmt, data };
}

export function replay(path, tweak = {}) {
  const w = readWav(path);
  if (w.bits !== 16) throw new Error("bara 16-bit stods");
  const cfg = structuredClone(defaultConfig);
  cfg.audio.rate = w.rate; cfg.audio.channels = w.channels; cfg.fft.hop = 128;
  Object.assign(cfg, tweak);
  const a = new Analyser(cfg);
  if (a.resetGain) a.resetGain(1);
  if (a.setGainLock) a.setGainLock(true, 1);
  const hop = cfg.fft.hop;
  const i16 = new Int16Array(w.data.buffer, w.data.byteOffset, w.data.byteLength >> 1);
  const out = new Float32Array(hop), frames = [];
  const INV = w.channels === 1 ? 1 / 32768 : 1 / 65536;
  const total = Math.floor(i16.length / w.channels / hop);
  for (let k = 0; k < total; k++) {
    const base = k * hop * w.channels;
    if (w.channels === 1) for (let i = 0; i < hop; i++) out[i] = i16[base + i] * INV;
    else for (let i = 0, j = base; i < hop; i++, j += 2) out[i] = (i16[j] + i16[j + 1]) * INV;
    a.setVirtualClock((k * hop / w.rate) * 1000);
    const f = a.process(out);
    frames.push({ t: k * hop / w.rate, level: f.level, energy: f.energy, intensity: f.intensity,
                  inZone: f.inZone ? 1 : 0, inRiser: f.inRiser ? 1 : 0, buildUp: f.buildUp,
                  dropCount: f.dropCount, bpm: f.bpm, breaking: f.breaking ? 1 : 0,
                  sub: f.spec.sub, kickB: f.spec.kick, bass: f.spec.bass, mid: f.spec.mid,
                  treble: f.spec.treble, centroid: f.centroid, flux: f.flux,
                  onKick: f.onset.kick, onSub: f.onset.sub, onBass: f.onset.bass });
  }
  return frames;
}

if (process.argv[1] && process.argv[1].endsWith("replay.mjs")) {
  const t0 = Date.now();
  const fr = replay(process.argv[2]);
  const drops = [];
  for (let i = 1; i < fr.length; i++) if (fr[i].dropCount !== fr[i - 1].dropCount) drops.push(+fr[i].t.toFixed(1));
  const secs = fr[fr.length - 1].t, took = (Date.now() - t0) / 1000;
  console.log(`${fr.length} hopar = ${secs.toFixed(0)}s ljud, analyserat pa ${took.toFixed(1)}s (${(secs / took).toFixed(0)}x realtid)`);
  console.log(`drops: ${drops.length}  ${JSON.stringify(drops)}`);
}
