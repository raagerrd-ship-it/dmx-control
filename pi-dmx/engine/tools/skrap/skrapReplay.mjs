// MAGER REPLAY FÖR SKRÄPMÄTNING (skräpjakten 10-18): samma koppel som konsertReplay --delad-cfg (analysator + låtgräns + beatFeed +
// effektmotor, render var --step ms) men utan bänkens egna mått - konsertReplay skapar två closurer per hop (Date.now/performance.now)
// och map/filter/reduce per renderruta, vilket syns i winAlloc-totalen. Här sätts klockan en gång och läser en variabel.
//   node --min-semi-space-size=512 --max-semi-space-size=512 --import file:///.../winAlloc.mjs tools/skrap/skrapReplay.mjs <wav> [--step 5] [--dist d]
//   (WIN_MOD=<dist>/effects.js WIN_CLASS=EffectEngine WIN_METHOD=render WIN_FROM_S=300 WIN_TO_S=540)
//   --varv N: spela filen N ganger i rad (virtuell tid fortsatter) - stabilt lage = andra varvet, da alla grenar korts en gang
//   (forsta varvet har V8:s deopt/omoptimering som en rigg med dagars drifttid inte har).
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const path = args.find((a) => a.endsWith(".wav"));
const DIST = opt("--dist", null) ? pathToFileURL(opt("--dist") + "/").href : new URL("../../dist/", import.meta.url).href;
const { Analyser } = await import(DIST + "analyser.js");
const { EffectEngine } = await import(DIST + "effects.js");
const { BeatFeed } = await import(DIST + "beatFeed.js");
const { defaultConfig } = await import(DIST + "config.js");
const { EFFECT_KEYS } = await import(DIST + "effects/registry.js");
const { BoundaryDetector } = await import(DIST + "boundaryDetector.js");
const d = readFileSync(path); const nSamples = (d.length - 44) >> 1;
const SR = 48000, HOP = 128, EPOCH = 1700000000000, STEP_MS = Number(opt("--step", 5)), VARV = Number(opt("--varv", 1));
const cfg = JSON.parse(JSON.stringify(defaultConfig));
cfg.mode = opt("--mode", "smart"); cfg.energyDrivesMode = cfg.mode === "smart"; cfg.master = 1;   // --mode <look>: en fast look (skräpmätning per effekt)
cfg.rotation = {}; for (const k of EFFECT_KEYS) cfg.rotation[k] = true;
const an = new Analyser(BeatFeed.analyserCfg(cfg)); an.setGainLock(true, 1);
const feed = new BeatFeed();
const bounds = new BoundaryDetector(() => Date.now());
an.setSpectrumSink((mag, binHz) => bounds.pushSpectrum(mag, binHz));
const boundsArg = { level: 0, bpm: 0, bpmConfidence: 0 };
let ms = EPOCH; Date.now = () => ms; performance.now = () => ms - EPOCH;
const eng = new EffectEngine(cfg);
console.log = () => {};
const buf = new Float32Array(HOP);
let lastRender = -1, lastCharShift = 0, lastTempoShift = 0, lastBoundary = 0, sum = 0;
const nHop = Math.floor(nSamples / HOP) * HOP;
for (let off = 0; off + HOP <= nHop * VARV; off += HOP) {
  const fo = off % nHop;
  for (let i = 0; i < HOP; i++) buf[i] = d.readInt16LE(44 + (fo + i) * 2) / 32768;
  ms = EPOCH + off / SR * 1000;
  an.setVirtualClock(ms - EPOCH);
  const fr = an.process(buf);
  boundsArg.level = fr.level; boundsArg.bpm = fr.bpm; boundsArg.bpmConfidence = fr.bpmConfidence; bounds.tick(boundsArg);
  if (bounds.charShiftCount !== lastCharShift) { lastCharShift = bounds.charShiftCount; eng.noteCharShift?.(); }
  if (bounds.tempoShiftCount !== lastTempoShift) { lastTempoShift = bounds.tempoShiftCount; eng.noteCharShift?.(`tempovaxling ${bounds.tempoShiftFrom}->${bounds.tempoShiftTo} BPM`); }
  if (bounds.boundaryCount !== lastBoundary) { lastBoundary = bounds.boundaryCount; eng.softenRange(); an.hintTrackChange(5000); }
  feed.update(fr, cfg, an);
  if (ms - lastRender < STEP_MS && lastRender >= 0) continue;
  lastRender = ms; eng.render(fr); const u = eng.universe; if (u) sum += u[0];
}
process.stdout.write(`skrapReplay klar (${(nHop * VARV / SR).toFixed(0)} s, kontrollsumma ${sum})\n`);
