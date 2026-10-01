// GC i ett fonster av LJUDTID: --trace-gc-rader mellan bankens "=== T <s>"-markorer (dmxRun.mjs med TMARK=1).
//   node gcwin.mjs <logg> <fran_s> <till_s>
// Huvudtradens isolat = forsta isolatet i loggen (workern startar senare). Rader per ljudminut, paus-median/p95/max.
import fs from 'node:fs';
const [file, from, to] = process.argv.slice(2);
const re = /^\[\d+:([0-9a-fA-Fx]+)\]\s+(\d+) ms: (Scavenge|Mark-Compact|Minor Mark-Sweep|Mark-Compact \(reduce\))[^,]*?([\d.]+) \(([\d.]+)\) -> ([\d.]+) \(([\d.]+)\) MB,(?: pooled: [\d.]+ MB,)? ([\d.]+) \/ ([\d.]+) ms/;
let T = 0, main = null; const ev = {};
for (const l of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
  const m0 = /^=== T (\d+)/.exec(l); if (m0) { T = +m0[1]; continue; }
  const m = re.exec(l); if (!m) continue;
  main ??= m[1];
  if (T < +from || T >= +to) continue;
  const iso = m[1] === main ? 'main' : 'worker';
  const kind = m[3].startsWith('Mark-Compact') ? 'Mark-Compact' : m[3];
  ((ev[iso] ??= {})[kind] ??= []).push({ pause: +m[8], before: +m[4], after: +m[6], total: +m[7] });
}
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : 0; };
const min = (to - from) / 60, out = { file: file.split(/[\/]/).pop(), fonsterS: to - from };
for (const [iso, kinds] of Object.entries(ev)) {
  out[iso] = {};
  for (const [k, a] of Object.entries(kinds)) { const p = a.map((x) => x.pause); out[iso][k] = { n: a.length, perMin: +(a.length / min).toFixed(1), median: q(p, .5), p95: q(p, .95), max: Math.max(...p), sumMsPerMin: +(p.reduce((x, y) => x + y, 0) / min).toFixed(1), reclaimedMBperMin: +(a.reduce((x, y) => x + y.before - y.after, 0) / min).toFixed(1), heapTotalMax: Math.max(...a.map((x) => x.total)) }; }
}
console.log(JSON.stringify(out));
