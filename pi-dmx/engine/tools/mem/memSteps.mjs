/**
 * MINNESTRAPPA (2026-09-27, minnesgranskningen). Vad bestar RSS av? Mater process.memoryUsage() stegvis:
 * tom node -> server-moduler (fastify, @fastify/static, @fastify/websocket/ws) -> motorns moduler ->
 * Analyser + EffectEngine -> N s uppspelning (WAV STROMMAS i 1 s-bitar: ligger aldrig i heapen).
 *
 *   node --expose-gc tools/mem/memSteps.mjs [--secs 240] [--split worker|none] [--wav <fil>] [--render 100]
 *
 * --split worker: createAnalyser() med DMX_ANALYSER_SPLIT=worker (som pa Pi:n). Workerns isolat mats med
 * worker.getHeapStatistics() (Node >= 22.16). RSS ar processens (bada isolaten).
 * Varje rad tas EFTER tva global.gc() sa siffrorna ar levande data, inte skrap.
 */
import { pathToFileURL } from "node:url";
import fs from "node:fs";
import v8 from "node:v8";
import { performance } from "node:perf_hooks";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const ENG = process.env.ENG ? pathToFileURL(process.env.ENG.replace(/\/?$/, "/")).href : new URL("../../", import.meta.url).href;
const WAV = opt("--wav", "C:/Users/richa/Desktop/Claude/dmx-control/pi-dmx/engine/tools/pop_ladan.wav");
const SECS = Number(opt("--secs", 240));
const SPLIT = opt("--split", "worker");
const RENDER_MS = Number(opt("--render", 10));   // live: 100 Hz render/DMX
if (SPLIT === "worker") process.env.DMX_ANALYSER_SPLIT = "worker"; else process.env.DMX_ANALYSER_SPLIT = "";
const gc = () => { if (!global.gc) throw new Error("kor med --expose-gc"); global.gc(); global.gc(); };
const MB = (b) => (b / 1048576).toFixed(1).padStart(6);
const rows = [];
let rssPeak = 0;
function mark(label, extra = "") {
  gc();
  const m = process.memoryUsage();
  rssPeak = Math.max(rssPeak, m.rss);
  rows.push({ label, m, extra });
}
function table() {
  const out = [];
  out.push("| steg | rss | heapTotal | heapUsed | external | arrayBuffers | Δrss | ΔheapUsed |");
  out.push("|---|---:|---:|---:|---:|---:|---:|---:|");
  let prev = null;
  for (const r of rows) {
    const d = prev ? MB(r.m.rss - prev.m.rss) : "";
    const dh = prev ? MB(r.m.heapUsed - prev.m.heapUsed) : "";
    out.push(`| ${r.label}${r.extra ? " " + r.extra : ""} | ${MB(r.m.rss)} | ${MB(r.m.heapTotal)} | ${MB(r.m.heapUsed)} | ${MB(r.m.external)} | ${MB(r.m.arrayBuffers)} | ${d} | ${dh} |`);
    prev = r;
  }
  return out.join("\n");
}

mark("tom node (--expose-gc)");
await import("fastify"); mark("+fastify");
await import("@fastify/static"); mark("+@fastify/static (send, glob...)");
await import("@fastify/websocket"); mark("+@fastify/websocket (ws)");
const A = await import(ENG + "dist/analyser.js"); mark("+dist/analyser.js (fft.js, tempoTracker, split, profile)");
const E = await import(ENG + "dist/effects.js"); mark("+dist/effects.js (alla effekter)");
await import(ENG + "dist/server.js"); mark("+dist/server.js");
const C = await import(ENG + "dist/config.js");
// knobRing.js drar in spi-device (native, laddar inte pa PC) - hoppas over har, mats separat i importCost.mjs.
for (const m of ["audio", "boundaryDetector", "warmup", "dmx", "persist", "button", "intensityKnob", "bleClient", "moods", "beatClock", "runtimeHealth", "healthLog", "effects/registry"]) await import(ENG + "dist/" + m + ".js");
mark("+ovriga index.js-beroenden (utom knobRing/spi-device)");

const cfg = JSON.parse(JSON.stringify(C.defaultConfig));
cfg.mode = "smart"; cfg.energyDrivesMode = true; cfg.beatPulse = true; cfg.master = 1; cfg.energyCeiling = true; cfg.fft.hop = 128;
const { EFFECT_KEYS } = await import(ENG + "dist/effects/registry.js");
cfg.rotation = {}; for (const k of EFFECT_KEYS) cfg.rotation[k] = true;
console.log = () => {}; console.warn = () => {};
const w = (s) => process.stdout.write(s + "\n");
const an = A.createAnalyser(JSON.parse(JSON.stringify(C.defaultConfig)));
an.setGainLock(true, 1);
const eng = new E.EffectEngine(cfg);
await new Promise((r) => setTimeout(r, 300));   // workern startas asynkront
mark(`Analyser(${an.__worker ? "fast+worker" : "en trad"}) + EffectEngine`);

// Strommad uppspelning: 1 s-bitar i en ateranvand Buffer (96 kB, extern). WAV:en ligger aldrig i heapen.
const fd = fs.openSync(WAV, "r");
const hdr = Buffer.alloc(44); fs.readSync(fd, hdr, 0, 44, 0);
if (hdr.readUInt32LE(24) !== 48000 || hdr.readUInt16LE(34) !== 16 || hdr.readUInt16LE(22) !== 1) throw new Error("kraver 48 kHz mono 16-bit");
const SR = 48000, HOP = 128, EPOCH = 1700000000000;
const chunk = Buffer.alloc(SR * 2);
const buf = new Float32Array(HOP);
let lastRender = -1e9, hops = 0, pos = 44;
const tWall0 = performance.now();
const marks = [...new Set([10, 60, 120, 180, 240, 300, 360, 420, 480, 540, 600, SECS])].filter((s) => s <= SECS);
for (let sec = 0; sec < SECS; sec++) {
  const n = fs.readSync(fd, chunk, 0, chunk.length, pos); pos += n;
  if (n < chunk.length) break;
  for (let off = 0; off + HOP <= SR; off += HOP) {
    for (let i = 0; i < HOP; i++) buf[i] = chunk.readInt16LE((off + i) * 2) / 32768;
    const tS = sec + off / SR, ms = EPOCH + tS * 1000;
    an.setVirtualClock(ms); Date.now = () => ms; performance.now = () => ms - EPOCH;
    const fr = an.process(buf); hops++;
    if (fr.bpm > 0) cfg.beat = { anchorMs: fr.beatAnchorMs || ms, bpm: fr.bpm, confidence: fr.bpmConfidence };
    if (ms - lastRender >= RENDER_MS) { lastRender = ms; eng.render(fr); }
  }
  rssPeak = Math.max(rssPeak, process.memoryUsage.rss());
  if (marks.includes(sec + 1)) {
    if (an.__worker) await new Promise((r) => setTimeout(r, 50));   // lat workern hinna ikapp ringen
    mark(`t=${sec + 1} s uppspelning`);
  }
}
fs.closeSync(fd);
const wallS = (performance.now() - tWall0) / 1000;

w(`# memSteps  split=${SPLIT}  render=${RENDER_MS} ms  ${SECS} s ljud, ${hops} hop  (node ${process.version}, ${process.platform})`);
w(table());
w(`\nRSS-topp under uppspelningen (utan gc): ${MB(rssPeak)} MB`);
const hs = v8.getHeapStatistics();
w(`\nhuvudisolat v8.getHeapStatistics: total_heap_size ${MB(hs.total_heap_size)} used ${MB(hs.used_heap_size)} malloced ${MB(hs.malloced_memory)} peak_malloced ${MB(hs.peak_malloced_memory)} external ${MB(hs.external_memory)} heap_size_limit ${MB(hs.heap_size_limit)}`);
w("heap spaces (main): " + v8.getHeapSpaceStatistics().map((s) => `${s.space_name} ${MB(s.space_size).trim()}/${MB(s.space_used_size).trim()}`).join(" | "));
const cs = v8.getHeapCodeStatistics();
w(`code: code_and_metadata ${MB(cs.code_and_metadata_size)} bytecode_and_metadata ${MB(cs.bytecode_and_metadata_size)} external_script_source ${MB(cs.external_script_source_size)}`);
if (an.__worker) {
  // Workern ar unref():ad i createAnalyser -> utan ref() dor event-loopen innan svaret kommer (unsettled top-level await).
  an.__worker.ref();
  const wh = await Promise.race([an.__worker.getHeapStatistics(), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout 5 s")), 5000))]).catch((e) => ({ err: e.message }));
  if (wh.err) w(`\nWORKER-isolat: ${wh.err}`);
  else w(`\nWORKER-isolat (worker.getHeapStatistics): total_heap_size ${MB(wh.total_heap_size)} used ${MB(wh.used_heap_size)} malloced ${MB(wh.malloced_memory)} peak_malloced ${MB(wh.peak_malloced_memory)} external ${MB(wh.external_memory)} heap_size_limit ${MB(wh.heap_size_limit)} (huvudisolatets limit ${MB(hs.heap_size_limit)})`);
  an.__stopWorker();
}
w(`\nprocess.resourceUsage maxRSS ${MB(process.resourceUsage().maxRSS * 1024)} MB`);
process.exit(0);
