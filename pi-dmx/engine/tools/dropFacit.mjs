/**
 * DROP-FACIT (2026-10-10 natt, uppgift 1 i tools/natt/todo.md): ladans 10 dropklipp (tools/ladan-2026-10-10, recorder, Aux -18 dB)
 * har en RIKTIG drop vid 15,0 s (riggen fyrade live; prerollSamples 720000). Kor analysatorn med DMX_DROP_TRACE=1 och visar per klipp:
 *   - kroppens niva (bodyDb) och hur lange den legat >= 5 dB under kroppens topp fore 15 s ("break" - BODY_GONE_MIN_MS kraver 4 s sedan 10-10)
 *   - dropedge-/dropcalm-raderna 13-17 s (varfor bankens detektor INTE fyrade) och om dropCount steg 14,5-16 s
 *   node tools/dropFacit.mjs [--dir tools/ladan-2026-10-10] [--fore 15]   (miljovariabler som vanligt, t.ex. BODY_GONE_MIN_MS=2000)
 */
import { readFileSync, readdirSync } from "node:fs";
process.env.DMX_DROP_TRACE = process.env.DMX_DROP_TRACE ?? "1";
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const DIR = opt("--dir", "tools/ladan-2026-10-10"), DROP_S = Number(opt("--fore", 15));
const { Analyser } = await import("../dist/analyser.js");
const { defaultConfig } = await import("../dist/config.js");
const SR = 48000, HOP = 128, EPOCH = 1700000000000;
const lines = []; const origLog = console.log;
console.log = (...a) => lines.push(a.join(" "));
const rows = [];
for (const f of readdirSync(DIR).filter((x) => x.endsWith(".wav")).sort()) {
  const d = readFileSync(`${DIR}/${f}`); const n = (d.length - 44) >> 1;
  const an = new Analyser(JSON.parse(JSON.stringify(defaultConfig))); an.setGainLock(true, 1);
  const buf = new Float32Array(HOP); lines.length = 0;
  let lastDrop = 0, lastMini = 0, fired = [], minis = [], body = [], peak = -200;
  for (let off = 0; off + HOP <= n; off += HOP) {
    for (let i = 0; i < HOP; i++) buf[i] = d.readInt16LE(44 + (off + i) * 2) / 32768;
    const t = off / SR, ms = EPOCH + t * 1000; an.setVirtualClock(ms); Date.now = () => ms; performance.now = () => ms - EPOCH;
    const lc = lines.length;
    const fr = an.process(buf);
    for (let k = lc; k < lines.length; k++) lines[k] = `${t.toFixed(2)} ${lines[k]}`;
    if (fr.dropCount !== lastDrop) { lastDrop = fr.dropCount; fired.push(+t.toFixed(2)); }
    if ((fr.miniDropCount ?? 0) !== lastMini) { lastMini = fr.miniDropCount ?? 0; minis.push(+t.toFixed(2)); }
    if ((off / HOP) % 37 === 0) body.push([t, fr.bodyDb ?? -120]);   // ~10 Hz
  }
  // break fore dropen: hur lange kroppen legat >= 5 dB under toppen (topp = max bodyDb 0..fore) fram till DROP_S
  const pre = body.filter(([t]) => t < DROP_S - 0.1); for (const [, b] of pre) if (b > peak) peak = b;
  let breakS = 0; for (let k = pre.length - 1; k >= 0 && pre[k][1] <= peak - 5; k--) breakS = DROP_S - pre[k][0];
  const at = (s) => (body.find(([t]) => t >= s) ?? [0, NaN])[1];
  const trace = lines.filter((l) => { const t = Number(l.split(" ")[0]); return t > DROP_S - 2.5 && t < DROP_S + 2; });
  rows.push({ klipp: f.slice(5, 22), topp: +peak.toFixed(1), kropp13: +at(DROP_S - 2).toFixed(1), kropp149: +at(DROP_S - 0.1).toFixed(1), kropp155: +at(DROP_S + 0.5).toFixed(1),
              breakS: +breakS.toFixed(1), drop: fired.filter((t) => Math.abs(t - DROP_S) < 1.5), allaDrops: fired, minis: minis.filter((t) => Math.abs(t - DROP_S) < 1.5), trace: trace.slice(0, 6) });
}
console.log = origLog;
for (const r of rows) {
  console.log(`${r.klipp}  topp ${r.topp} dB | kropp 13 s ${r.kropp13} / 14,9 s ${r.kropp149} / 15,5 s ${r.kropp155} | break ${r.breakS} s | drop vid 15: ${r.drop.length ? r.drop.join(",") : "NEJ"} (alla ${r.allaDrops.join(",") || "-"}) | mini ${r.minis.join(",") || "-"}`);
  for (const l of r.trace) console.log("    " + l);
}
console.log(`\nfyrade vid 15 s: ${rows.filter((r) => r.drop.length).length}/${rows.length}, mini vid 15 s: ${rows.filter((r) => !r.drop.length && r.minis.length).length}, break median ${rows.map((r) => r.breakS).sort((a, b) => a - b)[rows.length >> 1]} s`);
