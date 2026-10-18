// Förladdas (--import) i konsertReplay med --dist <kopia> där probe.py satt __probe(k) före varje toppnivåsats i en funktion.
// Delta i used_heap_size mellan två prober = allokerat i avsnittet (prov med GC emellan kastas), från 300 s ljud. PROBE_MAP = kartfilen.
import v8 from "node:v8";
import { readFileSync } from "node:fs";
const acc = new Float64Array(400), cnt = new Float64Array(400); let last = -1, prevU = 0;
const hs = () => v8.getHeapStatistics().used_heap_size;
globalThis.__probe = (k) => {
  if (Date.now() - Number(process.env.PROBE_EPOCH ?? 1700000000000) < Number(process.env.PROBE_FROM_MS ?? 300000)) { last = -1; return; }
  const u = hs();
  if (last >= 0 && u >= prevU) { acc[last] += u - prevU; cnt[last]++; }
  last = k < 0 ? -1 : k; prevU = hs();
};
globalThis.__probeRet = (v) => { globalThis.__probe(-1); return v; };   // probe.py PROBE_RET=1
process.on("exit", () => {
  const map = JSON.parse(readFileSync(process.env.PROBE_MAP, "utf8")); const rows = [];
  for (let k = 0; k < 400; k++) if (cnt[k]) rows.push([k, acc[k] / cnt[k], cnt[k]]);
  const base = Math.min(...rows.map((r) => r[1]));
  rows.sort((a, b) => b[1] - a[1]);
  for (const [k, per, c] of rows.slice(0, 12)) process.stderr.write(`${(per - base).toFixed(0).padStart(8)} B/gång (${c} ggr)  prob ${k} dist-rad ${map[k]}\n`);
});
