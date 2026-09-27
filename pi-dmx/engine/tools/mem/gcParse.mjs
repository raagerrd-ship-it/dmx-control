/** Summerar en --trace-gc-logg: antal Scavenge / Mark-Compact / Minor MS, paus-median/p95/max, heapTotal-topp, per isolat
 *  (huvudtrad och worker skriver till samma logg med olika isolat-id).
 *  node tools/mem/gcParse.mjs <gc.log> [--from "=== CHURN START"] [--to "=== CHURN END"] [--quartiles]
 *  --quartiles: reclaimed MB per fjardedel av loggens tidsspann (visar om skrapet ar storst under uppvarmningen). */
import { readFileSync } from "node:fs";
const args = process.argv.slice(2); const file = args[0];
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
let lines = readFileSync(file, "utf8").split(/\r?\n/);
const from = opt("--from", null), to = opt("--to", null);
if (from) { const i = lines.findIndex((l) => l.includes(from)); if (i >= 0) lines = lines.slice(i + 1); }
if (to) { const i = lines.findIndex((l) => l.includes(to)); if (i >= 0) lines = lines.slice(0, i); }
// [pid:isolate]    12345 ms: Scavenge 10.1 (20.2) -> 8.0 (21.2) MB, pooled: 0 MB, 1.23 / 0.00 ms  (average mu = ...) ...
const re = /^\[\d+:([0-9a-fA-Fx]+)\]\s+(\d+) ms: (Scavenge|Mark-Compact|Minor Mark-Sweep|Minor Mark-Compact|Mark-sweep)(?: \(([^)]*)\))? ([\d.]+) \(([\d.]+)\) -> ([\d.]+) \(([\d.]+)\) MB,(?: pooled: [\d.]+ MB,)? ([\d.]+) \/ ([\d.]+) ms/;
const iso = new Map(); let unparsed = 0; const events = [];
for (const l of lines) {
  if (!l.includes(" ms: ")) continue;
  const m = re.exec(l); if (!m) { unparsed++; continue; }
  const id = m[1];
  const I = iso.get(id) ?? iso.set(id, { kinds: {}, heapTotalPeak: 0, heapUsedPeak: 0, firstMs: null, lastMs: null }).get(id);
  const kind = m[3].startsWith("Minor") ? "Minor-MS" : m[3].startsWith("Mark") ? "Mark-Compact" : m[3];
  const k = I.kinds[kind] ??= { n: 0, pauses: [], reclaimed: 0 };
  const t = +m[2], before = +m[5], after = +m[7], pause = +m[9];
  k.n++; k.pauses.push(pause); k.reclaimed += before - after;
  I.heapTotalPeak = Math.max(I.heapTotalPeak, +m[6], +m[8]); I.heapUsedPeak = Math.max(I.heapUsedPeak, before);
  I.firstMs ??= t; I.lastMs = t;
  events.push({ id, t, kind, reclaimed: before - after, pause });
}
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : 0; };
const out = { file: file.split(/[\\/]/).pop(), unparsed, isolates: {} };
const ids = [...iso.keys()];
ids.forEach((id, idx) => {
  const I = iso.get(id); const name = idx === 0 ? "main" : `worker${idx}`;
  const o = { spanS: I.firstMs != null ? +((I.lastMs - I.firstMs) / 1000).toFixed(1) : 0, heapTotalPeakMB: I.heapTotalPeak, heapUsedPeakMB: I.heapUsedPeak, kinds: {} };
  for (const [k, v] of Object.entries(I.kinds)) o.kinds[k] = { n: v.n, medianMs: q(v.pauses, 0.5), p95Ms: q(v.pauses, 0.95), maxMs: Math.max(...v.pauses), sumMs: +v.pauses.reduce((a, b) => a + b, 0).toFixed(1), reclaimedMB: +v.reclaimed.toFixed(1) };
  if (args.includes("--quartiles") && I.firstMs != null) {
    const span = Math.max(1, I.lastMs - I.firstMs); const qs = [0, 0, 0, 0], qn = [0, 0, 0, 0];
    for (const e of events) if (e.id === id && e.kind === "Scavenge") { const qi = Math.min(3, Math.floor(4 * (e.t - I.firstMs) / span)); qs[qi] += e.reclaimed; qn[qi]++; }
    o.scavengeQuartilesMB = qs.map((x) => +x.toFixed(0)); o.scavengeQuartilesN = qn;
  }
  out.isolates[name] = o;
});
console.log(JSON.stringify(out));
