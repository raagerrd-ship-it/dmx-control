// LIVELABBET (2026-10-18): HELA motorn (dist/index.js: server, ws, ljudvägen, DMX-sändaren, timers) på PC:n med låtsas-arecord som
// spelar en WAV i realtid - för att se skräpet som körbänken (bara analysator + effekter) inte ser. Allokeringsprofil med bortstädat
// (HeapProfiler, includeObjectsCollectedBy*GC) efter uppvärmning; skriver topp-allokeringsställen och total kB/s.
//   node tools/liveLab.mjs [wav=tools/pop_ladan.wav] [--ws] [--sek=60] [--varm=40]
// --ws = en webbsidesklient är ansluten (frame-pushen 20 Hz). Ingen DMX-helper/knapp/vred/ring på PC:n: de spawn-/socketvägarna
// står och väntar som på en Pi utan hårdvara. Kräver `npm run build`.
import cp from "node:child_process";
import fs from "node:fs";
import { syncBuiltinESMExports, registerHooks } from "node:module";
import { EventEmitter } from "node:events";
import { Readable } from "node:stream";
import { Session } from "node:inspector/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const WAV = args.find((a) => !a.startsWith("--")) ?? path.join(HERE, "pop_ladan.wav");
const WS = args.includes("--ws");
const SEK = Number(args.find((a) => a.startsWith("--sek="))?.slice(6) ?? 60);
const VARM = Number(args.find((a) => a.startsWith("--varm="))?.slice(7) ?? 40);
const PORT = 18000 + Math.floor(Math.random() * 1000);

const SPI_STUB = "export default{open(b,d,cb){const o={setOptions(x,c){c&&c(null)},transfer(m,c){setImmediate(()=>c(null,m))},close(c){c&&c(null)}};setImmediate(()=>cb(null));return o}}";
registerHooks({   // spi-device (vredets LED-ring) är Linux-only: låtsasring som tar emot överföringarna som på Pi:n
  resolve(spec, ctx, next) { return spec === "spi-device" ? { url: "data:text/javascript," + encodeURIComponent(SPI_STUB), shortCircuit: true } : next(spec, ctx); },
});

// WAV -> rå S16LE (stereo 48 kHz förväntas, som ladans line-in)
const wav = fs.readFileSync(WAV);
let p = 12, data = null, ch = 2, rate = 48000;
while (p < wav.length - 8) {
  const id = wav.toString("ascii", p, p + 4), n = wav.readUInt32LE(p + 4);
  if (id === "fmt ") { ch = wav.readUInt16LE(p + 10); rate = wav.readUInt32LE(p + 12); }
  if (id === "data") { data = wav.subarray(p + 8, n > 0 && p + 8 + n <= wav.length ? p + 8 + n : wav.length); break; }   // strömmande skrivna WAV: längd 0 -> resten av filen
  p += 8 + n + (n & 1);
}
if (!data || rate !== 48000 || ch > 2) throw new Error(`${WAV}: behöver 48 kHz mono/stereo (fick ${ch} kanaler ${rate} Hz)`);
if (ch === 1) {   // mono-facit -> samma signal i båda kanalerna (line-in är stereo)
  const st = Buffer.alloc(data.length * 2);
  for (let i = 0; i < data.length; i += 2) { st[2 * i] = st[2 * i + 2] = data[i]; st[2 * i + 1] = st[2 * i + 3] = data[i + 1]; }
  data = st;
}

// Låtsas-arecord: läser "pipen" i realtid. En riktig pipe ger en ny Buffer per läsning, ~en ALSA-period (128 ramar = 512 B) åt gången.
function fakeArecord() {
  const pr = new EventEmitter(); pr.pid = 0; pr.kill = () => { clearInterval(t); arecordKills++; setImmediate(() => pr.emit("exit", null)); };   // som en dödad process: exit -> motorns trappa respawnar
  const out = new Readable({ read() {} }); pr.stdout = out; pr.stderr = new Readable({ read() {} });
  const t0 = performance.now(); let sent = 0; const BPF = 4, PERIOD = 128 * BPF;
  const t = setInterval(() => {
    const want = Math.floor(((performance.now() - t0) / 1000) * 48000) * BPF;
    while (sent + PERIOD <= want) {
      const off = sent % (data.length - PERIOD - (data.length % PERIOD));
      out.push(Buffer.from(data.subarray(off, off + PERIOD)));   // kopia = ny Buffer per läsning, som libuv
      sent += PERIOD;
    }
  }, 1);
  return pr;
}
let arecordKills = 0;
const realSpawn = cp.spawn;
cp.spawn = (cmd, a, o) => {
  if (cmd === "arecord") return fakeArecord();
  const pr = new EventEmitter(); pr.pid = 0; pr.kill = () => {}; pr.stdout = new Readable({ read() {} }); pr.stderr = new Readable({ read() {} });
  if (cmd !== "gpiomon") setImmediate(() => { pr.emit("exit", 0); pr.emit("close", 0); });   // taskset/chrt/amixer: klart direkt
  return pr;   // gpiomon (knapp/vred): står och väntar som utan tryck
};
const realRead = fs.readFileSync;
fs.readFileSync = (f, ...r) => (f === "/proc/uptime" ? "100000.0 0\n" : realRead(f, ...r));
syncBuiltinESMExports();

const tmp = fs.mkdtempSync(path.join(process.env.TEMP ?? "/tmp", "livelab-"));
process.env.PORT = String(PORT);
process.env.CONFIG_PATH = path.join(tmp, "config.json");
process.env.DMX_RECORDER_DIR = path.join(tmp, "snippets");
process.env.DMX_WARMUP = process.env.DMX_WARMUP ?? path.join(HERE, "..", "warmup", "warmup.wav");
process.env.DMX_QUIET = "1";
await import(pathToFileURL(path.join(HERE, "..", "dist", "index.js")).href);

let ws = null;
if (WS) {
  ws = new WebSocket(`ws://127.0.0.1:${PORT}/ws`);
  let n = 0; ws.onmessage = () => { n++; }; setInterval(() => { process.stderr.write(`ws ${n} msg\r`); }, 5000).unref();
}
await new Promise((r) => setTimeout(r, VARM * 1000));

if (args.includes("--gcrakna")) {   // oberoende mått utan profilerare: små städningar x ungdomsminnets storlek (kör med --max-semi-space-size=4 --min-semi-space-size=4 som Pi:n)
  const { PerformanceObserver, constants } = await import("node:perf_hooks");
  const v8 = await import("node:v8");
  const nsp = () => v8.getHeapSpaceStatistics().find((x) => x.space_name === "new_space");
  let minor = 0, bytes = 0, ms = 0;
  const ob = new PerformanceObserver((l) => { for (const e of l.getEntries()) if ((e.detail?.kind ?? e.kind) === constants.NODE_PERFORMANCE_GC_MINOR) { minor++; ms += e.duration; } });
  ob.observe({ entryTypes: ["gc"] });
  // allokerat = summan av ungdomsminnets fyllnad mellan städningar: sampla used ofta, räkna fall som städningar
  process.stdout.write("MÄTSTART\n"); let last = nsp().space_used_size; const t0 = performance.now();
  const iv = setInterval(() => { const u = nsp().space_used_size; bytes += u >= last ? u - last : u; last = u; }, 2);
  await new Promise((r) => setTimeout(r, SEK * 1000));
  clearInterval(iv); ob.disconnect();
  const secs = (performance.now() - t0) / 1000;
  process.stdout.write(`GCRÄKNING ${secs.toFixed(0)} s: ${minor} små städningar (${(minor / secs * 60).toFixed(1)}/min, snitt ${(ms / Math.max(1, minor)).toFixed(2)} ms), allokerat ~${(bytes / 1024 / secs).toFixed(0)} kB/s (new_space-sampling)
`);
  process.exit(0);
}
const s = new Session(); s.connect();
await s.post("HeapProfiler.enable");
await s.post("HeapProfiler.startSampling", { samplingInterval: 1024, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
const t0 = performance.now();
await new Promise((r) => setTimeout(r, SEK * 1000));
const { profile } = await s.post("HeapProfiler.stopSampling");
const secs = (performance.now() - t0) / 1000;

// summera per (funktion, fil:rad) självstorlek + per fil
const bySite = new Map(), byFile = new Map(); let tot = 0;
(function walk(n) {
  const sz = n.selfSize; tot += sz;
  if (sz) {
    const cf = n.callFrame, f = (cf.url || "(native)").replace(/^.*\/(dist|node_modules)\//, "$1/").replace(/^node:/, "node:");
    const k = `${cf.functionName || "(anon)"}  ${f}:${cf.lineNumber + 1}`;
    bySite.set(k, (bySite.get(k) ?? 0) + sz); byFile.set(f, (byFile.get(f) ?? 0) + sz);
  }
  for (const c of n.children) walk(c);
})(profile.head);
const say = (...a) => process.stdout.write(a.join(" ") + "\n");   // console.log tystas av DMX_QUIET
// objektstorlekar per ställe (16 B = HeapNumber = ett boxat decimaltal på 64-bit utan pekarkomprimering)
const nodeKey = new Map(); (function w(n) { const cf = n.callFrame; nodeKey.set(n.id, `${cf.functionName || "(anon)"}  ${(cf.url || "(native)").replace(/^.*\/(dist|node_modules)\//, "$1/")}:${cf.lineNumber + 1}`); for (const c of n.children) w(c); })(profile.head);
const sizes = new Map(); for (const sm of profile.samples ?? []) { const k = nodeKey.get(sm.nodeId); const m = sizes.get(k) ?? new Map(); m.set(sm.size, (m.get(sm.size) ?? 0) + 1); sizes.set(k, m); }
const kb = (b) => (b / 1024 / secs).toFixed(1).padStart(6);
say(`\nLIVELABBET ${path.basename(WAV)} ${WS ? "MED" : "utan"} webbklient, ${secs.toFixed(0)} s efter ${VARM} s: TOTALT ${kb(tot)} kB/s`);
say("-- per fil --"); for (const [k, v] of [...byFile].sort((a, b) => b[1] - a[1]).slice(0, 12)) say(kb(v), k);
say("-- per ställe (storlekar: bytes x antal prov) --"); for (const [k, v] of [...bySite].sort((a, b) => b[1] - a[1]).slice(0, 30)) say(kb(v), k, "  [" + [...(sizes.get(k) ?? new Map())].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([z, c]) => z + "x" + c).join(" ") + "]");
const perf = await (await fetch(`http://127.0.0.1:${PORT}/api/perf`)).json();
const hz = await (await fetch(`http://127.0.0.1:${PORT}/health`)).text();
say("-- motorn --", hz.slice(0, 200), "| arecord dödad", arecordKills, "ggr"); say(JSON.stringify(perf).slice(0, 700));
if (process.argv.includes("--json")) fs.writeFileSync(path.join(tmp, "profile.json"), JSON.stringify(profile));
process.exit(0);
