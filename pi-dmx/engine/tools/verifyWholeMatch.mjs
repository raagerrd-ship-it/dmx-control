/** ENGANGSKOLLEN: spela in samma ljud TVA ganger i manuellt lage.
 *  Varv 1 ska bli en NY lat. Varv 2 ska kannas igen och SLAS IHOP — inte dubbleras. */
import { readFileSync } from "node:fs";
import { Analyser } from "../dist/analyser.js";
import { defaultConfig } from "../dist/config.js";
import { SongMemory } from "../dist/songMemory.js";

const wav = process.argv[2];
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

const hop = cfg.fft.hop, INV = fmt.ch === 1 ? 1 / 32768 : 1 / 65536;
const i16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength >> 1);
const out = new Float32Array(hop);
// Bara forsta ~200 s = en lat, sa segmentet inte blir en blandning.
// Tva olika avsnitt: facit3 har latgranser vid ~42, 208 och 363 s.
const DIFF = process.argv[3] === "olika";
const SEG = [[45, 200], DIFF ? [215, 360] : [45, 200]];
const durS = 160;
let lastDrop = 0;

for (let lap = 0; lap < 2; lap++) {
  console.log(`\n=== VARV ${lap + 1} (${lap === 0 ? "ny lat" : "samma ljud igen"}) ===`);
  songs.manualStart();
  const k0 = Math.floor(SEG[lap][0] * fmt.rate / hop), k1 = Math.floor(SEG[lap][1] * fmt.rate / hop);
  for (let k = k0; k < k1; k++) {
    const base = k * hop * fmt.ch;
    if (fmt.ch === 1) for (let i = 0; i < hop; i++) out[i] = i16[base + i] * INV;
    else for (let i = 0, j = base; i < hop; i++, j += 2) out[i] = (i16[j] + i16[j + 1]) * INV;
    vclock = lap * (durS + 10) * 1000 + ((k - k0) * hop / fmt.rate) * 1000;
    analyser.setVirtualClock?.(vclock);
    const f = analyser.process(out);
    const dropped = f.dropCount !== lastDrop; lastDrop = f.dropCount;
    songs.tick({ level: f.level, dropped, bpm: f.bpm, bpmConfidence: f.bpmConfidence,
                 intensity: f.intensity, beatAnchorMs: f.beatAnchorMs, learn: true });
  }
  songs.manualNext();
  songs.manualStop();
  console.log(`-> latar i minnet: ${songs.state().songs}`);
}
const l = songs.list();
console.log("\nRESULTAT");
for (const r of l) console.log(`  #${r.id}  ${(r.durationMs / 1000).toFixed(0)}s  ${r.plays} spelningar`);
if (DIFF) console.log(l.length === 2 ? "OK — olika latar halls isar" : `FEL — olika latar slogs ihop (${l.length} post)`);
else console.log(l.length === 1 && l[0].plays === 2 ? "OK — samma lat kandes igen och slogs ihop" : `FEL — fick ${l.length} lat(ar)`);
