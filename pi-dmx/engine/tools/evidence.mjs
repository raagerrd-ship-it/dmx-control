// Visar vad BEVISEN sa over tid, mot vad LASET gjorde.
// `dump.mjs` visar bara laset; nar de tva gar isar ar det beslutslogiken som ar
// fel, inte analysen -- och da ar det meningslost att roka i signalbehandlingen.
//
//   node tools/evidence.mjs tools/corpus/xxx.wav [facit]
import { readFileSync } from "node:fs";
const { Analyser } = await import("../dist/analyser.js");
const { defaultConfig } = await import("../dist/config.js");

const path = process.argv[2];
const truth = Number(process.argv[3] || 0);
const HOP = 128, SR = 48000, HZ = 100;

const d = readFileSync(path);
const n = d.readUInt32LE(40) / 2;
const an = new Analyser(JSON.parse(JSON.stringify(defaultConfig)));
an.setGainLock(true, 1);
const buf = new Float32Array(HOP);

const rows = [];
let nextAt = 0;
for (let off = 0; off + HOP <= n; off += HOP) {
  for (let i = 0; i < HOP; i++) buf[i] = d.readInt16LE(44 + (off + i) * 2) / 32768;
  const ms = (off / SR) * 1000;
  an.setVirtualClock(ms);
  const fr = an.process(buf);
  if (ms < nextAt) continue;
  nextAt = ms + 2000;
  const tg = an.tempoGramSnapshot;
  const [lo, hi] = an.lagBounds;
  if (!hi) continue;
  // tva starkaste topparna i tempogrammet
  let b1 = 0, v1 = -1e9, b2 = 0, v2 = -1e9;
  for (let L = lo; L <= hi; L++) {
    if (tg[L] > v1) { b2 = b1; v2 = v1; b1 = L; v1 = tg[L]; }
    else if (tg[L] > v2 && Math.abs(L - b1) > 3) { b2 = L; v2 = tg[L]; }
  }
  rows.push({ s: ms / 1000, lock: Math.round(fr.bpm || 0),
              e1: (HZ * 60) / b1, v1, e2: (HZ * 60) / b2, v2 });
}

console.log(`  ${path.split(/[\\/]/).pop()}   facit ${truth || "?"}`);
console.log("   tid   LAS   basta bevis      tvaa            avviker?");
for (const r of rows) {
  const gap = truth && r.lock ? Math.abs(r.lock / truth - 1) : 0;
  const flag = truth && gap > 0.06 ? "  <-- LAS FEL" : "";
  const split = Math.abs(r.lock - r.e1) / Math.max(1, r.e1) > 0.06 ? " (las != bevis)" : "";
  console.log(`  ${String(r.s.toFixed(0)).padStart(3)}s  ${String(r.lock).padStart(3)}   ` +
    `${r.e1.toFixed(1).padStart(6)} @${r.v1.toFixed(3)}   ${r.e2.toFixed(1).padStart(6)} @${r.v2.toFixed(3)}${split}${flag}`);
}
