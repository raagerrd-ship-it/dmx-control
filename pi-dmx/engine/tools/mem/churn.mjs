/**
 * SKRAP PER HOP (minnesgranskningen 09-27). Kor analysatorn (och valfritt effektmotorn) pa virtuell klocka i N s och
 * later --trace-gc rakna Scavenges. Med fast semi-space (--min/max-semi-space-size=S) ar allokerat ~ Scavenges x S MB.
 *
 *   node --trace-gc --min-semi-space-size=8 --max-semi-space-size=8 tools/mem/churn.mjs [--secs 240] [--fx] [--split none|inline|worker] 2> gc.log
 *   node --no-opt --trace-gc ...   (samma, alla flyttal boxade -> skillnaden = skrap som beror pa OOPTIMERAD kod)
 *
 * WAV strommas. Skriver hop-antal och v8-statistik pa stdout. Markorer "=== CHURN START/END ===" pa stderr
 * sa gcParse.mjs kan klippa bort uppstartens GC.
 */
import { pathToFileURL } from "node:url";
import fs from "node:fs";
import v8 from "node:v8";
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const flag = (k) => args.includes(k);
const ENG = process.env.ENG ? pathToFileURL(process.env.ENG.replace(/\/?$/, "/")).href : new URL("../../", import.meta.url).href;
const WAV = opt("--wav", "C:/Users/richa/Desktop/Claude/dmx-control/pi-dmx/engine/tools/pop_ladan.wav");
const SECS = Number(opt("--secs", 240)), SKIP = Number(opt("--skip", 0));
const SPLIT = opt("--split", "none"); process.env.DMX_ANALYSER_SPLIT = SPLIT === "none" ? "" : SPLIT;
const FX = flag("--fx");
const A = await import(ENG + "dist/analyser.js"), E = await import(ENG + "dist/effects.js"), C = await import(ENG + "dist/config.js");
const { EFFECT_KEYS } = await import(ENG + "dist/effects/registry.js");
const cfg = JSON.parse(JSON.stringify(C.defaultConfig));
cfg.mode = "smart"; cfg.energyDrivesMode = true; cfg.beatPulse = true; cfg.master = 1; cfg.energyCeiling = true; cfg.fft.hop = 128;
cfg.rotation = {}; for (const k of EFFECT_KEYS) cfg.rotation[k] = true;
console.log = () => {}; console.warn = () => {};
const w = (s) => process.stdout.write(s + "\n");
const an = A.createAnalyser(JSON.parse(JSON.stringify(C.defaultConfig))); an.setGainLock(true, 1);
const eng = FX ? new E.EffectEngine(cfg) : null;
await new Promise((r) => setTimeout(r, 200));
const fd = fs.openSync(WAV, "r"); const SR = 48000, HOP = 128, EPOCH = 1700000000000;
const chunk = Buffer.alloc(SR * 2), buf = new Float32Array(HOP);
let hops = 0, pos = 44 + SKIP * SR * 2, lastRender = -1e9;
if (global.gc) global.gc();
process.stderr.write(`=== CHURN START (${SECS} s, fx=${FX}, split=${SPLIT}, ${process.execArgv.join(" ")}) ===\n`);
for (let sec = 0; sec < SECS; sec++) {
  const n = fs.readSync(fd, chunk, 0, chunk.length, pos); pos += n; if (n < chunk.length) break;
  for (let off = 0; off + HOP <= SR; off += HOP) {
    for (let i = 0; i < HOP; i++) buf[i] = chunk.readInt16LE((off + i) * 2) / 32768;
    const ms = EPOCH + (SKIP + sec) * 1000 + (off / SR) * 1000;
    an.setVirtualClock(ms); Date.now = () => ms; performance.now = () => ms - EPOCH;
    const fr = an.process(buf); hops++;
    if (eng) { if (fr.bpm > 0) cfg.beat = { anchorMs: fr.beatAnchorMs || ms, bpm: fr.bpm, confidence: fr.bpmConfidence }; if (ms - lastRender >= 10) { lastRender = ms; eng.render(fr); } }
  }
}
process.stderr.write(`=== CHURN END ===\n`);
const hs = v8.getHeapStatistics();
w(`churn: ${hops} hop, ${SECS} s ljud, fx=${FX}, split=${SPLIT}, flags=[${process.execArgv.join(" ")}], heap total ${(hs.total_heap_size / 1048576).toFixed(1)} used ${(hs.used_heap_size / 1048576).toFixed(1)} MB, rss ${(process.memoryUsage().rss / 1048576).toFixed(1)} MB`);
if (an.__stopWorker) an.__stopWorker();
process.exit(0);
