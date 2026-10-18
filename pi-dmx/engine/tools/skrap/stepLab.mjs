// STEGLABB (10-18, skräpjakten på Node 18): den riktiga motorn + en riktig analysatorram, ETT steg anropat i en tät slinga med
// varierande indata - allokerat per anrop (used_heap, stor ung generation så ingen GC). Snabbare att variera än hela replayen.
//   <node18> --min-semi-space-size=1024 --max-semi-space-size=1024 [--import n18compat] tools/skrap/stepLab.mjs [--dist d] [steg ...]
// Steg: stepLifts stepDrop stepDirigent render (render = hela renderingen med ramen).
import v8 from "node:v8";
import { pathToFileURL } from "node:url";
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const D = opt("--dist", null) ? pathToFileURL(opt("--dist") + "/").href : new URL("../../dist/", import.meta.url).href;
const { Analyser } = await import(D + "analyser.js");
const { EffectEngine } = await import(D + "effects.js");
const { defaultConfig } = await import(D + "config.js");
const { EFFECT_KEYS } = await import(D + "effects/registry.js");
console.log = () => {};
const hs = () => v8.getHeapStatistics().used_heap_size;
const cfg = JSON.parse(JSON.stringify(defaultConfig)); cfg.mode = "smart"; cfg.energyDrivesMode = true; cfg.master = 1;
cfg.rotation = {}; for (const k of EFFECT_KEYS) cfg.rotation[k] = true;
let ms = 1700000000000; Date.now = () => ms; performance.now = () => ms - 1700000000000;
const an = new Analyser(cfg); an.setGainLock(true, 1);
const eng = new EffectEngine(cfg);
const buf = new Float32Array(128); let fr = null;
for (let i = 0; i < 375 * 20; i++) { for (let j = 0; j < 128; j++) buf[j] = Math.sin((i * 128 + j) * 0.05) * 0.3 * (1 + Math.sin(i * 0.01)); ms += 128 / 48; an.setVirtualClock(ms - 1700000000000); fr = an.process(buf); if (i % 2 === 0) eng.render(fr); }
// --stub a,b: ersätt motormetoder med tomma (för att se vad render kostar utan dem); renderLamps/stepEnergy/stepBeatClock får rimliga retur-fält
for (const m of (opt("--stub", "") || "").split(",").filter(Boolean)) if (m.startsWith("out.")) eng.out[m.slice(4)] = m === "out.fogTick" ? () => false : () => {}; else eng[m] = m === "renderLamps" ? () => false : m === "stepDirigent" ? function () { return this.smartMode; } : m === "stepDrop" ? () => false : () => {};
const steps = args.filter((a, i) => !a.startsWith("--") && !["--dist", "--stub"].includes(args[i - 1]));
for (const st of (steps.length ? steps : ["stepLifts", "stepDrop", "stepDirigent", "render"])) {
  const call = st === "render" ? () => eng.render(fr) : st === "stepLifts" ? () => eng.stepLifts(fr, false) : st === "stepDrop" ? () => eng.stepDrop(fr) : () => eng.stepDirigent(fr, false, true);
  const tick = (i) => { ms += 5; eng.rNowP = ms - 1700000000000; eng.rNowWall = ms; eng.rDt = 0.005; eng.rDtT = 0.005; fr.bodyDb = 25 + 8 * Math.sin(i * 0.01); fr.level = 0.2 + 0.1 * Math.sin(i * 0.013); };
  for (let i = 0; i < 3e5; i++) { tick(i); call(); }
  const N = 5e5; const u0 = hs(); for (let i = 0; i < N; i++) { tick(i); call(); } const u1 = hs();
  // tickens egen kostnad
  const t0 = hs(); for (let i = 0; i < N; i++) tick(i); const t1 = hs();
  process.stderr.write(`${st.padEnd(14)} ${(((u1 - u0) - (t1 - t0)) / N).toFixed(1)} B/anrop  (tick ${((t1 - t0) / N).toFixed(1)})\n`);
}
