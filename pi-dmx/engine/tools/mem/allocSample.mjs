/**
 * SAMPLANDE ALLOKERINGSPROFIL (minnesgranskningen 09-27). Till skillnad fran allocTrace.mjs (HeapProfiler.
 * startTrackingHeapObjects, som stanger av inline-allokering och drar ner koden i ooptimerat lage medan den mater)
 * anvander den har HeapProfiler.startSampling: koden forblir optimerad, var ~N:e allokerad byte stamplas med
 * anropsstacken. includeObjectsCollectedBy*GC=true -> aven skrapet raknas (det ar skrapet vi vill se).
 *
 *   WARMSECS=180 SECS=60 node tools/mem/allocSample.mjs        (varmer upp WARMSECS s, samplar SECS s)
 *   --fx: kor aven effektmotorn (100 Hz)
 *
 * Skriver MB/s och topp-funktioner (self) samt de storsta anropsvagarna in i process().
 */
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import inspector from "node:inspector";
const ENG = process.env.ENG ? pathToFileURL(process.env.ENG.replace(/\/?$/, "/")).href : new URL("../../", import.meta.url).href;
const WAV = process.env.WAV || "C:/Users/richa/Desktop/Claude/dmx-control/pi-dmx/engine/tools/pop_ladan.wav";
const WS = Number(process.env.WARMSECS ?? 180), SECS = Number(process.env.SECS ?? 60), FX = process.argv.includes("--fx");
const INTERVAL = Number(process.env.INTERVAL ?? 4096);
process.env.DMX_ANALYSER_SPLIT = "";
const A = await import(ENG + "dist/analyser.js"), E = await import(ENG + "dist/effects.js"), C = await import(ENG + "dist/config.js");
const { EFFECT_KEYS } = await import(ENG + "dist/effects/registry.js");
const cfg = JSON.parse(JSON.stringify(C.defaultConfig));
cfg.mode = "smart"; cfg.energyDrivesMode = true; cfg.beatPulse = true; cfg.master = 1; cfg.energyCeiling = true; cfg.fft.hop = 128;
cfg.rotation = {}; for (const k of EFFECT_KEYS) cfg.rotation[k] = true;
console.log = () => {}; console.warn = () => {};
const w = (s) => process.stdout.write(s + "\n");
const an = new A.Analyser(JSON.parse(JSON.stringify(C.defaultConfig))); an.setGainLock(true, 1);
const eng = FX ? new E.EffectEngine(cfg) : null;
const fd = fs.openSync(WAV, "r"); const SR = 48000, HOP = 128, EPOCH = 1700000000000;
const chunk = Buffer.alloc(SR * 2), buf = new Float32Array(HOP);
let pos = 44, lastRender = -1e9, hops = 0;
// Bankens egna klock-closures (Date.now = () => ms) skulle synas i profilen: satt dem EN gang och lat dem lasa en variabel.
let vms = EPOCH; Date.now = () => vms; performance.now = () => vms - EPOCH;
function runSecs(n) {
  for (let sec = 0; sec < n; sec++) {
    const got = fs.readSync(fd, chunk, 0, chunk.length, pos); pos += got; if (got < chunk.length) return false;
    for (let off = 0; off + HOP <= SR; off += HOP) {
      for (let i = 0; i < HOP; i++) buf[i] = chunk.readInt16LE((off + i) * 2) / 32768;
      vms = EPOCH + (pos - 44 - chunk.length) / (SR * 2) * 1000 + (off / SR) * 1000;
      an.setVirtualClock(vms);
      const fr = an.process(buf); hops++;
      if (eng) { if (fr.bpm > 0) cfg.beat = { anchorMs: fr.beatAnchorMs || vms, bpm: fr.bpm, confidence: fr.bpmConfidence }; if (vms - lastRender >= 10) { lastRender = vms; eng.render(fr); } }
    }
  }
  return true;
}
runSecs(WS);
const s = new inspector.Session(); s.connect();
const post = (m, p) => new Promise((res, rej) => s.post(m, p ?? {}, (e, r) => (e ? rej(e) : res(r))));
await post("HeapProfiler.enable");
await post("HeapProfiler.startSampling", { samplingInterval: INTERVAL, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
const h0 = hops;
runSecs(SECS);
const { profile } = await post("HeapProfiler.stopSampling");
const self = new Map(), total = { b: 0 };
const walk = (node, stack) => {
  const cf = node.callFrame; const name = `${cf.functionName || "(anon)"} ${(cf.url || "").split("/").pop()}:${cf.lineNumber + 1}`;
  if (node.selfSize) { self.set(name, (self.get(name) || 0) + node.selfSize); total.b += node.selfSize; }
  for (const c of node.children || []) walk(c, stack.concat(name));
};
walk(profile.head, []);
const nh = hops - h0;
w(`# allocSample  varm ${WS} s, samplat ${SECS} s (${nh} hop), intervall ${INTERVAL} B, fx=${FX}`);
w(`allokerat (samplat, skalat): ${(total.b / 1048576).toFixed(1)} MB = ${(total.b / 1048576 / SECS).toFixed(2)} MB/s = ${(total.b / nh / 1024).toFixed(2)} kB/hop`);
w(`| andel | MB | kB/hop | funktion |`); w(`|---:|---:|---:|---|`);
for (const [k, v] of [...self].sort((a, b) => b[1] - a[1]).slice(0, 25)) w(`| ${(100 * v / total.b).toFixed(1)} % | ${(v / 1048576).toFixed(2)} | ${(v / nh / 1024).toFixed(2)} | ${k} |`);
process.exit(0);
