// Kopia av tools/frozen-0927/allocTrace.mjs (huvudutcheckningen 09-27) pekad pa denna klon. ENG=<engine-dir>, WAV=<fil>, WARMSECS=<uppvarmning s, std 60>, SECS=<sparade s>, TOP=<rader>.
// Allokeringstidslinje via inspector HeapProfiler.startTrackingHeapObjects(trackAllocations) -> trace_tree summerat per funktion.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import inspector from "node:inspector";
const eng = process.env.ENG || decodeURIComponent(new URL("../../", import.meta.url).pathname).replace(/^\//, "");
const { Analyser } = await import(pathToFileURL(eng + "dist/analyser.js"));
const { defaultConfig } = await import(pathToFileURL(eng + "dist/config.js"));
console.log = () => {}; const w = process.stdout.write.bind(process.stdout);
const d = readFileSync(process.env.WAV || "C:/Users/richa/Desktop/Claude/dmx-control/pi-dmx/engine/tools/pop_ladan.wav"); const HOP = 128; const SECS = Number(process.env.SECS ?? 20);
const WS = Number(process.env.WARMSECS ?? 60); const WARM = process.env.WARM ? readFileSync(process.env.WARM) : null; const NOTRACK = process.env.NOTRACK === "1";
const cfg = JSON.parse(JSON.stringify(defaultConfig)); let an = new Analyser(cfg); an.setGainLock(true, 1); const SCRATCH = process.env.WARM_SCRATCH === '1';
const buf = new Float32Array(HOP);
// varm upp 30 s utan sparning
if (WARM) { const wn = (WARM.length - 44) >> 1; for (let off = 0; off + HOP <= wn; off += HOP) { for (let i = 0; i < HOP; i++) buf[i] = WARM.readInt16LE(44 + (off + i) * 2) / 32768; an.setVirtualClock(off / 48); an.process(buf); } an.setVirtualClock(null); if (SCRATCH) { an = new Analyser(JSON.parse(JSON.stringify(defaultConfig))); an.setGainLock(true, 1); } }
else for (let off = 0; off < WS * 48000; off += HOP) { for (let i = 0; i < HOP; i++) buf[i] = d.readInt16LE(44 + (off + i) * 2) / 32768; an.setVirtualClock(off / 48); an.process(buf); }
process.stderr.write("=== TRACE START ===" + String.fromCharCode(10));
const s = NOTRACK ? null : new inspector.Session(); if (s) s.connect();
const post = (m, p) => new Promise((res, rej) => s.post(m, p ?? {}, (e, r) => e ? rej(e) : res(r)));
if (s) { await post("HeapProfiler.enable"); await post("HeapProfiler.startTrackingHeapObjects", { trackAllocations: true }); }
for (let off = WS * 48000; off < (WS + SECS) * 48000; off += HOP) { for (let i = 0; i < HOP; i++) buf[i] = d.readInt16LE(44 + (off + i) * 2) / 32768; an.setVirtualClock(off / 48); an.process(buf); }
if (!s) { w("klart (NOTRACK)" + String.fromCharCode(10)); process.exit(0); }
let chunks = ""; s.on("HeapProfiler.addHeapSnapshotChunk", (m) => { chunks += m.params.chunk; });
await post("HeapProfiler.stopTrackingHeapObjects", { reportProgress: false });
const snap = JSON.parse(chunks); const fi = snap.trace_function_infos, tf = snap.snapshot.meta.trace_function_info_fields, tn = snap.snapshot.meta.trace_node_fields, strings = snap.strings;
const F = (i, f) => fi[i * tf.length + tf.indexOf(f)];
const acc = new Map(); let total = 0;
const walk = (arr) => { // trace_tree: [id, function_info_index, count, size, children[]]
  const iId = tn.indexOf("id"), iFi = tn.indexOf("function_info_index"), iCnt = tn.indexOf("count"), iSize = tn.indexOf("size"), iCh = tn.indexOf("children");
  for (let k = 0; k < arr.length; k += tn.length) {
    const fidx = arr[k + iFi], size = arr[k + iSize]; const name = strings[F(fidx, "name")] || "(anon)", file = (strings[F(fidx, "script_name")] || "").split("/").pop(), line = F(fidx, "line");
    if (size) { const key = `${name} ${file}:${line}`; acc.set(key, (acc.get(key) || 0) + size); total += size; }
    const ch = arr[k + iCh]; if (ch && ch.length) walk(ch);
  }
};
walk(snap.trace_tree);
w(`allokerat under ${SECS} s: ${(total / 1e6).toFixed(1)} MB = ${(total / 1e6 / SECS).toFixed(1)} MB/s\n`);
for (const [k, v] of [...acc].sort((a, b) => b[1] - a[1]).slice(0, Number(process.env.TOP ?? 30))) w(`${(100 * v / total).toFixed(1).padStart(5)} %  ${(v / 1e6).toFixed(2).padStart(7)} MB  ${k}\n`);
