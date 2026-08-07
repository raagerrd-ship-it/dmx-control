/** Kor den RIKTIGA songMemory mot en inspelning med kant facit. */
import { readFileSync } from "node:fs";
import { Analyser } from "../dist/analyser.js";
import { defaultConfig } from "../dist/config.js";
import { SongMemory } from "../dist/songMemory.js";

const wav = process.argv[2];
const facit = (process.argv[3] || "").split(",").filter(Boolean).map(Number);
const b = readFileSync(wav);
let p = 12, fmt = null, data = null;
while (p + 8 <= b.length) {
  const id = b.toString("ascii", p, p + 4), sz = b.readUInt32LE(p + 4);
  if (id === "fmt ") fmt = { ch: b.readUInt16LE(p + 10), rate: b.readUInt32LE(p + 12) };
  else if (id === "data") { data = b.subarray(p + 8, p + 8 + sz); break; }
  p += 8 + sz + (sz & 1);
}
const cfg = structuredClone(defaultConfig);
cfg.audio.rate = fmt.rate; cfg.audio.channels = fmt.ch; cfg.fft.hop = 128;
let vclock = 0;
const analyser = new Analyser(cfg);
analyser.resetGain?.(1); analyser.setGainLock?.(true, 1);
const songs = new SongMemory(() => vclock);
analyser.setSpectrumSink?.((mag, binHz) => songs.pushSpectrum(mag, binHz, true));

const hop = cfg.fft.hop, INV = fmt.ch === 1 ? 1/32768 : 1/65536;
const i16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength >> 1);
const out = new Float32Array(hop);
const total = Math.floor(i16.length / fmt.ch / hop);
let lastDrop = 0, prevSongs = 0;
const bounds = [];
for (let k = 0; k < total; k++) {
  const base = k * hop * fmt.ch;
  if (fmt.ch === 1) for (let i = 0; i < hop; i++) out[i] = i16[base+i]*INV;
  else for (let i = 0, j = base; i < hop; i++, j += 2) out[i] = (i16[j]+i16[j+1])*INV;
  vclock = (k * hop / fmt.rate) * 1000;
  analyser.setVirtualClock?.(vclock);
  const f = analyser.process(out);
  const dropped = f.dropCount !== lastDrop; lastDrop = f.dropCount;
  songs.tick({ level: f.level, dropped, bpm: f.bpm, bpmConfidence: f.bpmConfidence,
               intensity: f.intensity, beatAnchorMs: f.beatAnchorMs, learn: true });
  const st = songs.state();
  if (st.songs !== prevSongs) { bounds.push(vclock/1000); prevSongs = st.songs; }
}
console.log(`${(vclock/1000).toFixed(0)} s ljud`);
console.log(`GRANSER hittade: ${bounds.map(x=>x.toFixed(0)).join(", ") || "(inga)"}`);
if (facit.length) {
  console.log(`FACIT:           ${facit.join(", ")}`);
  let hit = 0;
  for (const fa of facit) {
    const m = bounds.find(x => Math.abs(x - fa) < 20);
    console.log(`  ${fa}s -> ${m !== undefined ? m.toFixed(0)+"s (fel "+(m-fa>0?"+":"")+(m-fa).toFixed(0)+" s)" : "MISSAD"}`);
    if (m !== undefined) hit++;
  }
  console.log(`TRAFF ${hit}/${facit.length}, falska ${bounds.length - hit}`);
}
