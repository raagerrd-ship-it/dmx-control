// Visar tempogrammets TOPPSTRUKTUR i slutet av ett klipp, och hur varje topp
// forhaller sig till facit. Svarar pa fragan "finns ratt svar i datan, och
// vinner det?" -- vilket ar en annan fraga an "vad blev laset?".
//
//   node tools/peaks.mjs tools/stranden.wav 114
import { readFileSync } from "node:fs";
const { Analyser } = await import("../dist/analyser.js");
const { defaultConfig } = await import("../dist/config.js");

const path = process.argv[2];
const truth = Number(process.argv[3] || 0);
const HOP = 128, SR = 48000, HZ = 100;   // ENV_HZ

const d = readFileSync(path);
const n = d.readUInt32LE(40) / 2;
const an = new Analyser(JSON.parse(JSON.stringify(defaultConfig)));
an.setGainLock(true, 1);
const buf = new Float32Array(HOP);
let last = 0;
for (let off = 0; off + HOP <= n; off += HOP) {
  for (let i = 0; i < HOP; i++) buf[i] = d.readInt16LE(44 + (off + i) * 2) / 32768;
  const ms = (off / SR) * 1000;
  an.setVirtualClock(ms);
  last = an.process(buf).bpm || last;
}

const tg = an.tempoGramSnapshot;
const [lagMin, lagMax] = an.lagBounds;
const peaks = [];
for (let L = lagMin + 1; L < lagMax; L++)
  if (tg[L] >= tg[L - 1] && tg[L] >= tg[L + 1] && tg[L] > 0)
    peaks.push({ bpm: (HZ * 60) / L, v: tg[L] });
peaks.sort((a, b) => b.v - a.v);

const rel = (b) => {
  if (!truth) return "";
  const q = b / truth;
  for (const [name, v] of [["=facit", 1], ["x2", 2], ["/2", 0.5], ["x4/3", 4 / 3],
                           ["x3/4", 0.75], ["x3/2", 1.5], ["x2/3", 2 / 3],
                           ["x8/3", 8 / 3], ["x3", 3], ["/3", 1 / 3], ["x5/4", 1.25]])
    if (Math.abs(q / v - 1) <= 0.04) return name;
  return `x${q.toFixed(2)}`;
};

console.log(`  ${path.split(/[\\/]/).pop()}  facit ${truth}  las ${Math.round(last)}`);
for (const p of peaks.slice(0, 7))
  console.log(`    ${p.bpm.toFixed(1).padStart(6)} BPM  ${p.v.toFixed(4)}  ${rel(p.bpm)}`);
