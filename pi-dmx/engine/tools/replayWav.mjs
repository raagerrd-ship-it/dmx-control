/** Spelar upp en RIKTIG WAV genom analysatorn, hop för hop, deterministiskt.
 *
 *  VARFÖR: de syntetiska scenarierna i testBpmHard.mjs reproducerar inte de
 *  verkliga tempo-felen. Uppmätt 2026-08-31: varken originalfällan eller en
 *  medvetet skärpt variant (kick nedsänkt till 0.14, treslagsmönster på 1.0)
 *  fick baslinjen att fela — medan riktig musik gav 2/3-fel i 89 sekunder.
 *  Utan riktigt ljud går det inte att skilja "fixen fungerar" från "materialet
 *  råkade vara snällare".
 *
 *  Ljudet spelas in med POST /api/raw-capture/start på Pi:n (48 kHz mono).
 *  Kör:  node tools/replayWav.mjs tools/real.wav
 *  A/B:  OLD=1 node tools/replayWav.mjs tools/real.wav
 */
import { readFileSync } from "node:fs";

const mod = process.env.OLD ? "../dist/analyserOld.js" : "../dist/analyser.js";
const { Analyser } = await import(mod);
const { defaultConfig } = await import("../dist/config.js");

const path = process.argv[2];
if (!path) { console.error("ange en wav-fil"); process.exit(2); }
const d = readFileSync(path);
if (d.toString("ascii", 0, 4) !== "RIFF") { console.error("inte en WAV"); process.exit(2); }
const rate = d.readUInt32LE(24), bits = d.readUInt16LE(34), ch = d.readUInt16LE(22);
if (rate !== 48000 || bits !== 16 || ch !== 1) {
  console.error(`kräver 48 kHz mono 16-bit, fick ${rate}/${ch}/${bits}`); process.exit(2);
}
const nSamples = d.readUInt32LE(40) / 2;

const HOP = 128;
const an = new Analyser(JSON.parse(JSON.stringify(defaultConfig)));
an.setGainLock(true, 1);
const buf = new Float32Array(HOP);
const series = [];
let cpu = 0, hops = 0;

for (let off = 0; off + HOP <= nSamples; off += HOP) {
  for (let i = 0; i < HOP; i++) buf[i] = d.readInt16LE(44 + (off + i) * 2) / 32768;
  const ms = (off / 48000) * 1000;
  an.setVirtualClock(ms);
  const t0 = process.hrtime.bigint();
  const f = an.process(buf);
  cpu += Number(process.hrtime.bigint() - t0) / 1e6;
  hops++;
  if (f.bpm > 0) series.push([ms / 1000, f.bpm, f.bpmConfidence ?? 0]);
}

// Sanningen är okänd — men ett STABILT lås är målet. Mät mot serien egen median
// efter inkörning, och räkna sammanhängande excursioner.
const TRUTH = Number(process.env.TRUTH) || 0;   // känt facit, t.ex. 137.5
const settled = series.filter(([t]) => t >= 5);
const sorted = settled.map((x) => x[1]).sort((a, b) => a - b);
const med = sorted[Math.floor(sorted.length / 2)];
const HARM = [[2 / 3, "2/3"], [3 / 4, "3/4"], [4 / 5, "4/5"], [1 / 2, "1/2"], [2, "2/1"], [3 / 2, "3/2"], [4 / 3, "4/3"]];

let exc = [], run = [];
for (const [t, bpm] of settled) {
  if (Math.abs(bpm / med - 1) > 0.08) run.push([t, bpm]);
  else { if (run.length) exc.push(run); run = []; }
}
if (run.length) exc.push(run);

const ref = TRUTH || med;
const okN = settled.filter(([, b]) => Math.abs(b / ref - 1) < 0.04).length;
const wrong = settled.filter(([, b]) => Math.abs(b / ref - 1) > 0.12).length;
console.log(`  ${process.env.OLD ? "BASLINJE" : "ÄNDRAD  "} | facit ${ref.toFixed(1)} | ` +
  `RÄTT (±4%): ${(100 * okN / settled.length).toFixed(1)}% | fel >12%: ${(100 * wrong / settled.length).toFixed(1)}% | ` +
  `median ${med.toFixed(0)} | cpu ${(cpu / hops * 1000).toFixed(0)} µs/hop`);
for (const e of exc) {
  const dur = e[e.length - 1][0] - e[0][0];
  if (dur < 1) continue;
  const r = e[Math.floor(e.length / 2)][1] / med;
  const lab = HARM.find(([f]) => Math.abs(r / f - 1) < 0.05)?.[1] ?? r.toFixed(2);
  console.log(`      excursion ${lab.padEnd(5)} ${dur.toFixed(1).padStart(5)} s  vid t=${e[0][0].toFixed(0)}s`);
}
if (!exc.some((e) => e[e.length - 1][0] - e[0][0] >= 1)) console.log("      inga excursioner >=1 s");
