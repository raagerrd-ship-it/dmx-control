// Spelar en 16 kHz-inspelning från lotus-micen genom den kompilerade analysatorn (som bench.mjs: hop 128 vid 48 kHz, bänkklockan)
// och skriver klockans tempo en gång per sekund. node kallarspel.mjs <analyser index.js> <wav> [ut.csv]
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const [anPath, wavPath, outPath] = process.argv.slice(2);
const { createAnalyser } = await import(pathToFileURL(anPath).href);
const b = readFileSync(wavPath);
const ch = b.readUInt16LE(22), rate0 = b.readUInt32LE(24);
let off = 12, dataOff = 44, dataLen = b.length - 44;
while (off + 8 <= b.length) { const id = b.toString('ascii', off, off + 4), len = b.readUInt32LE(off + 4); if (id === 'data') { dataOff = off + 8; dataLen = Math.min(len, b.length - dataOff); break; } off += 8 + len + (len & 1); }
const n0 = Math.floor(dataLen / 2 / ch); const y0 = new Float32Array(n0);
for (let i = 0; i < n0; i++) y0[i] = b.readInt16LE(dataOff + i * ch * 2) / 32768;
const K = Math.round(48000 / rate0), rate = rate0 * K; const y = new Float32Array(n0 * K);   // linjär uppsampling till 48 kHz
for (let i = 0; i < n0 - 1; i++) for (let k = 0; k < K; k++) y[i * K + k] = y0[i] + (y0[i + 1] - y0[i]) * k / K;
const HOP = 128, EPOCH = 1700000000000;
const an = createAnalyser({ sampleRate: rate, hopSize: HOP, autoGainTarget: 0.75, maxGain: 200, noiseFloor: 0.0015, onsetEnhancements: false });
an.setGainLock?.(false);
const buf = new Float32Array(HOP); let hop = 0; const rows = ['t,bpm,conf,trust,section'];
const realNow = Date.now;
for (let i = 0; i + HOP <= y.length; i += HOP) {
  buf.set(y.subarray(i, i + HOP)); const ms = hop * HOP / rate * 1000;
  an.setAudioClockMs?.(ms); Date.now = () => EPOCH + ms;
  if (hop === 0) an.setVirtualClock?.(0); else an.advanceVirtualClock?.(ms);
  const f = an.process(buf); hop++;
  if (f && f.bpm > 0 && f.beatAnchorMs > 0) an.setBeatGrid?.({ bpm: f.bpm, anchorMs: f.beatAnchorMs });
  if (hop % 375 === 0) rows.push(`${(ms / 1000).toFixed(0)},${(f?.bpm ?? 0).toFixed(1)},${(f?.bpmConfidence ?? 0).toFixed(2)},${(f?.beatTrust ?? 0).toFixed(2)},${f?.section ?? ''}`);
}
Date.now = realNow;
if (outPath) writeFileSync(outPath, rows.join('\n') + '\n');
// sammanfattning: tempobyten > 4 % (efter 10 s) och tid per tempo (avrundat till 2 BPM)
const v = rows.slice(1).map((r) => r.split(',')).filter((r) => +r[0] >= 10 && +r[1] > 0);
let sw = 0; const hist = {};
for (let i = 0; i < v.length; i++) { const bpm = +v[i][1]; const k = Math.round(bpm / 2) * 2; hist[k] = (hist[k] || 0) + 1; if (i && Math.abs(bpm / +v[i - 1][1] - 1) > 0.04) sw++; }
const top = Object.entries(hist).sort((a, c) => c[1] - a[1]).slice(0, 6).map(([k, c]) => `${k}:${(100 * c / v.length).toFixed(0)}%`).join(' ');
console.log(`sek ${v.length}  tempobyten ${sw} (${(sw / (v.length / 60)).toFixed(2)}/min)  tid per tempo: ${top}`);
