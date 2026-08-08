/** Kor SAMMA inspelning tva varv genom SAMMA songMemory.
 *  Varv 1 = allt okant (klangskifte satter granserna).
 *  Varv 2 = allt inlart → igenkannaren ska satta granserna EXAKT.
 *  Det ar varv 2 som testar "kand lat slut"-beviset och splitOnRecognition. */
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

const hop = cfg.fft.hop, INV = fmt.ch === 1 ? 1 / 32768 : 1 / 65536;
const i16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength >> 1);
const out = new Float32Array(hop);
const total = Math.floor(i16.length / fmt.ch / hop);
const durS = (total * hop) / fmt.rate;
let lastDrop = 0, prevSongs = 0;
const bounds = [[], []];

for (let lap = 0; lap < 2; lap++) {
  prevSongs = lap === 0 ? 0 : -1;
  for (let k = 0; k < total; k++) {
    const base = k * hop * fmt.ch;
    if (fmt.ch === 1) for (let i = 0; i < hop; i++) out[i] = i16[base + i] * INV;
    else for (let i = 0, j = base; i < hop; i++, j += 2) out[i] = (i16[j] + i16[j + 1]) * INV;
    const tLap = (k * hop / fmt.rate) * 1000;
    vclock = lap * durS * 1000 + tLap;
    analyser.setVirtualClock?.(vclock);
    const f = analyser.process(out);
    const dropped = f.dropCount !== lastDrop; lastDrop = f.dropCount;
    songs.tick({ level: f.level, dropped, bpm: f.bpm, bpmConfidence: f.bpmConfidence,
                 intensity: f.intensity, beatAnchorMs: f.beatAnchorMs, learn: true });
    const st = songs.state();
    // Varv 1 (allt okant): en grans = en ny inlard lat.
    // Varv 2 (allt kant): igenkanningen committar inget — gransen syns i stallet
    // som att motorn borjar spela en ANNAN lagrad lat.
    if (lap === 0) {
      if (st.songs !== prevSongs) { bounds[lap].push(tLap / 1000); prevSongs = st.songs; }
    } else {
      if (st.songId !== prevSongs) {
        console.log(`  t=${(tLap/1000).toFixed(1)}s  songId ${prevSongs} -> ${st.songId}  pos=${(st.positionMs/1000).toFixed(1)}s conf=${st.confidence.toFixed(2)}`);
        if (st.songId) bounds[lap].push(tLap / 1000);
        prevSongs = st.songId;
      }
    }
  }
  console.log(`\n=== VARV ${lap + 1} ===`);
  console.log(`granser: ${bounds[lap].map(x => x.toFixed(0)).join(", ") || "(inga)"}`);
  if (facit.length) {
    let hit = 0, err = [];
    for (const fa of facit) {
      const m = bounds[lap].find(x => Math.abs(x - fa) < 20);
      if (m !== undefined) { hit++; err.push((m - fa).toFixed(0)); }
      else err.push("MISSAD");
    }
    console.log(`facit ${facit.join(", ")} -> traff ${hit}/${facit.length}, falska ${bounds[lap].length - hit}, fel [${err.join(", ")}] s`);
  }
}
