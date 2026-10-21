/**
 * SPLITKARTA (natt 10-21, ägarens uppdrag 'den tvådelade analysatorn'): VAD KOSTAR VAD, OCH PÅ VILKEN SIDA.
 * Kör en inspelning genom motorns kedja som konsertReplay (delad analysator inline, motorns cfg till snabba sidan, kopia till
 * långsamma, låtgränsen, beatFeed, effektmotorn i 200 Hz) och mäter verklig tid (process.hrtime, opåverkad av den virtuella
 * klockan) per hop/ruta:
 *   snabb   = Analyser.process() minus den långsamma sidans drainRecords (i live: motorns tråd)
 *   långsam = drainRecords (i live: workern på egen kärna)
 *   gräns   = BoundaryDetector.tick + pushSpectrum (motorns tråd), takt = BeatFeed.update (motorns tråd)
 *   render  = EffectEngine.render per ruta (motorns tråd), därav dirigent = stepDirigent (+ switchLook) och stepPalette
 * --wrap: EXKLUSIV tid per metod (barnens tid dras av) för analysatorns steg och effektmotorns steg. Omslagen kostar ~0,1 µs/anrop
 *   och stör JIT-inlining - använd --wrap för fördelningen, totalerna utan --wrap för p50/p99.
 * Materialet spelas två varv; bara ANDRA varvet räknas (stabilt läge, mätfälla 50: första varvet = deopt vid nya grenar).
 *   node tools/splitKarta.mjs <wav> [--s 300] [--wrap] [--json ut.json]
 * Node-version: kör med Pi:ns (Node 24: C:/Users/richa/node24dl/win/node-v24.18.0-win-x64/node.exe). PC:n är ~6-10x snabbare än Zero 2 W.
 */
import { readFileSync, writeFileSync } from "node:fs";
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const path = args.find((a) => a.endsWith(".wav"));
const WRAP = args.includes("--wrap"); const MAX_S = Number(opt("--s", 300));
const DIST = new URL("../dist/", import.meta.url).href;
const { Analyser } = await import(DIST + "analyser.js");
const { EffectEngine } = await import(DIST + "effects.js");
const { BeatFeed } = await import(DIST + "beatFeed.js");
const { defaultConfig } = await import(DIST + "config.js");
const { EFFECT_KEYS } = await import(DIST + "effects/registry.js");
const { BoundaryDetector } = await import(DIST + "boundaryDetector.js");
const { createSplitBuffers } = await import(DIST + "split.js");
const hr = () => Number(process.hrtime.bigint()) / 1000;   // µs, verklig tid

// EXKLUSIV TID: stack av starttider; ett barns tid dras av från förälderns
const EX = new Map(); const stack = [];
function wrap(proto, name, tag) {
  const f = proto[name]; if (typeof f !== "function") { process.stderr.write(`saknas: ${tag}.${name}\n`); return; }
  const key = `${tag}.${name}`; EX.set(key, { us: 0, n: 0, max: 0 });
  proto[name] = function (...a) {
    const fr = { t0: hr(), child: 0 }; stack.push(fr);
    try { return f.apply(this, a); }
    finally {
      stack.pop(); const tot = hr() - fr.t0, ex = tot - fr.child, e = EX.get(key);
      if (COUNT) { e.us += ex; e.n++; if (ex > e.max) e.max = ex; }
      if (stack.length) stack[stack.length - 1].child += tot;
    }
  };
}
let COUNT = false;
// drainRecords mäts alltid (skiljer snabb från långsam); inline-peer anropas inifrån process()
let drainUs = 0;
{ const f = Analyser.prototype.drainRecords; Analyser.prototype.drainRecords = function (...a) { const t = hr(); try { return f.apply(this, a); } finally { drainUs += hr() - t; } }; }
if (WRAP) {
  const A = Analyser.prototype;
  for (const m of ["agcStep", "kickStep", "silenceStep", "envSampleStep", "kickRefine", "intensityStep", "bigStep", "dropStep", "riserStep", "profileStep",
    "sectionAggStep", "fillFrame", "pullSlowState", "pushSlowRecord", "stepBassline", "process",
    "slowStep", "applyFlags", "envStep", "computeBpm", "computeGridPhase", "sectionHop", "tempoGramStep", "scoreEnv"]) wrap(A, m, "an");
  const E = EffectEngine.prototype;
  for (const m of ["render", "stepDirigent", "switchLook", "stepLifts", "stepBeatClock", "stepEnergy", "renderLamps", "stepDrop", "stepPalette", "effektNiva", "pickPalette"]) wrap(E, m, "fx");
  const B = BoundaryDetector.prototype; for (const m of ["tick", "pushSpectrum"]) wrap(B, m, "gräns");
  const F = BeatFeed.prototype; for (const m of ["update", "onsetStep"]) wrap(F, m, "takt");
}

const d = readFileSync(path); let nSamples = (d.length - 44) >> 1;
const SR = 48000, HOP = 128, EPOCH = 1700000000000, STEP_MS = 5;
nSamples = Math.min(nSamples, MAX_S * SR);
const pcm = new Float32Array(nSamples); for (let i = 0; i < nSamples; i++) pcm[i] = d.readInt16LE(44 + i * 2) / 32768;
const cfg = JSON.parse(JSON.stringify(defaultConfig));
cfg.mode = "smart"; cfg.energyDrivesMode = true; cfg.master = 1;
cfg.rotation = {}; for (const k of EFFECT_KEYS) cfg.rotation[k] = true;
const b = createSplitBuffers(); const an = new Analyser(cfg, { role: "fast", split: b }); an.setInlinePeer(new Analyser(structuredClone(cfg), { role: "slow", split: b }));
an.setGainLock(true, 1);
const feed = new BeatFeed();
const bounds = new BoundaryDetector(() => Date.now());
an.setSpectrumSink((mag, binHz) => bounds.pushSpectrum(mag, binHz));
const boundsArg = { level: 0, bpm: 0, bpmConfidence: 0 };
Date.now = () => EPOCH; performance.now = () => 0;
const eng = new EffectEngine(cfg);
console.log = () => {};
const buf = new Float32Array(HOP);
const S = { fast: [], slow: [], bounds: [], feed: [], render: [] };
let lastRender = -1, lastBoundary = 0, lastCharShift = 0, lastTempoShift = 0;
const DUR = nSamples / SR;
for (let pass = 0; pass < 2; pass++) {
  COUNT = pass === 1;
  for (let off = 0; off + HOP <= nSamples; off += HOP) {
    buf.set(pcm.subarray(off, off + HOP));
    const ms = EPOCH + (pass * DUR + off / SR) * 1000;
    an.setVirtualClock(ms - EPOCH); Date.now = () => ms; performance.now = () => ms - EPOCH;
    drainUs = 0; let t = hr();
    const fr = an.process(buf);
    const tProc = hr() - t;
    t = hr();
    boundsArg.level = fr.level; boundsArg.bpm = fr.bpm; boundsArg.bpmConfidence = fr.bpmConfidence; bounds.tick(boundsArg);
    if (bounds.charShiftCount !== lastCharShift) { lastCharShift = bounds.charShiftCount; eng.noteCharShift?.(); }
    if (bounds.tempoShiftCount !== lastTempoShift) { lastTempoShift = bounds.tempoShiftCount; eng.noteCharShift?.(""); }
    if (bounds.boundaryCount !== lastBoundary) { lastBoundary = bounds.boundaryCount; eng.softenRange(); an.hintTrackChange(5000); }
    const tB = hr() - t; t = hr();
    feed.update(fr, cfg, an);
    const tF = hr() - t;
    if (COUNT) { S.fast.push(tProc - drainUs); S.slow.push(drainUs); S.bounds.push(tB); S.feed.push(tF); }
    if (ms - lastRender < STEP_MS && lastRender >= 0) continue;
    lastRender = ms; t = hr(); eng.render(fr); const tR = hr() - t;
    if (COUNT) S.render.push(tR);
  }
}
const pct = (a, p) => { const s = Float64Array.from(a).sort(); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const sum = {};
for (const k of Object.keys(S)) sum[k] = { n: S[k].length, mean: +mean(S[k]).toFixed(1), p50: +pct(S[k], 0.5).toFixed(1), p99: +pct(S[k], 0.99).toFixed(1), p999: +pct(S[k], 0.999).toFixed(1), max: +Math.max(...S[k]).toFixed(1) };
const hopsPerS = SR / HOP;
const out = { wav: path, node: process.version, s: +DUR.toFixed(1), hops: S.fast.length, renders: S.render.length, summary: sum, exclusive: {} };
if (WRAP) for (const [k, e] of EX) if (e.n) out.exclusive[k] = { usPerS: +(e.us / DUR).toFixed(0), calls: e.n, usPerCall: +(e.us / e.n).toFixed(2), max: +e.max.toFixed(0) };
// µs per sekund ljud = CPU-andel x 1e6 (budget: en kärna = 1 000 000 µs/s)
process.stdout.write(`${path.split(/[\\/]/).pop()} ${process.version} ${DUR.toFixed(0)} s (andra varvet), ${S.fast.length} hop, ${S.render.length} renderingar\n`);
for (const [k, v] of Object.entries(sum)) process.stdout.write(`  ${k.padEnd(7)} µs/anrop medel ${String(v.mean).padStart(6)} p50 ${String(v.p50).padStart(6)} p99 ${String(v.p99).padStart(7)} p99,9 ${String(v.p999).padStart(7)} max ${String(v.max).padStart(7)}  = ${(v.mean * v.n / DUR / 1000).toFixed(1)} ms/s\n`);
if (WRAP) { process.stdout.write("  EXKLUSIV (µs per s ljud, anrop, µs/anrop, max):\n"); for (const [k, v] of Object.entries(out.exclusive).sort((a, b) => b[1].usPerS - a[1].usPerS)) process.stdout.write(`    ${k.padEnd(24)} ${String(v.usPerS).padStart(7)}  ${String(v.calls).padStart(7)}  ${String(v.usPerCall).padStart(8)}  ${String(v.max).padStart(6)}\n`); }
if (opt("--json")) writeFileSync(opt("--json"), JSON.stringify(out, null, 1));
