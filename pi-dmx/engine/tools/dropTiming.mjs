/**
 * DROP-TIMING (2026-10-12, ägarens uppdrag 'FULL DROP-TIMINGEN': "känns som bara var 3:e träffar rätt").
 * Kör en långinspelning genom analysatorn + effektmotorn (samma koppel som konsertReplay) och skriver per hop (375 Hz) baskroppen
 * (frame.bodyDb, rå dB) + alla drop-händelser: analysatorns fyrning ([dropfire]-raden), showens riktiga drop (dropBangUntil),
 * spärrad drop -> minidrop, minidrop-looken (miniBangUntil), energilyftet (liftCount). Analysen (flank, fördröjning, baslyft)
 * görs i tools/dropTimingStat.mjs på utfilerna.
 *   node tools/dropTiming.mjs <wav> --json ut.json [--dist dir]
 */
import { readFileSync, writeFileSync } from "node:fs";
process.env.DMX_DROP_TRACE = process.env.DMX_DROP_TRACE ?? "1";
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const path = args.find((a) => a.endsWith(".wav"));
const { pathToFileURL } = await import("node:url");
const DIST = opt("--dist", null) ? pathToFileURL(opt("--dist") + "/").href : new URL("../dist/", import.meta.url).href;
const { Analyser } = await import(DIST + "analyser.js");
const { EffectEngine } = await import(DIST + "effects.js");
const { BeatFeed } = await import(DIST + "beatFeed.js");
const { defaultConfig } = await import(DIST + "config.js");
const { EFFECT_KEYS } = await import(DIST + "effects/registry.js");
const { BoundaryDetector } = await import(DIST + "boundaryDetector.js");
const d = readFileSync(path); const nSamples = (d.length - 44) >> 1;
const SR = 48000, HOP = 128, EPOCH = 1700000000000, STEP_MS = 25;
const cfg = JSON.parse(JSON.stringify(defaultConfig));
cfg.mode = "smart"; cfg.energyDrivesMode = true; cfg.master = 1;
cfg.rotation = {}; for (const k of EFFECT_KEYS) cfg.rotation[k] = true;
const an = new Analyser(JSON.parse(JSON.stringify(defaultConfig))); an.setGainLock(true, 1);
const feed = new BeatFeed();
const bounds = new BoundaryDetector(() => Date.now());
an.setSpectrumSink((mag, binHz) => bounds.pushSpectrum(mag, binHz));
const boundsArg = { level: 0, bpm: 0, bpmConfidence: 0 };
Date.now = () => EPOCH; performance.now = () => 0;
const eng = new EffectEngine(cfg);
let tNow = 0; const LINES = [];
console.log = (...a) => { const s = a.join(" "); if (/^\[(dropfire|dropedge|dropcalm|dirigent)\]/.test(s)) LINES.push([+tNow.toFixed(3), s.slice(0, 260)]); };
const buf = new Float32Array(HOP);
const BODY = new Float32Array(Math.ceil(nSamples / HOP));
let nb = 0, lastRender = -1, lastCharShift = 0, lastTempoShift = 0, lastBoundary = 0;
let lastDrop = 0, lastBang = 0, lastMiniBang = 0, lastLift = 0;
const EV = { fire: [], show: [], miniLook: [], lift: [], sec: [] };
let prevSec = '';
for (let off = 0; off + HOP <= nSamples; off += HOP) {
  for (let i = 0; i < HOP; i++) buf[i] = d.readInt16LE(44 + (off + i) * 2) / 32768;
  const tS = off / SR, ms = EPOCH + tS * 1000; tNow = tS;
  an.setVirtualClock(ms); Date.now = () => ms; performance.now = () => ms - EPOCH;
  const fr = an.process(buf);
  BODY[nb++] = fr.bodyDb ?? -90;
  if (fr.dropCount !== lastDrop) { lastDrop = fr.dropCount; EV.fire.push(+tS.toFixed(3)); }
  if ((fr.section ?? '') !== prevSec) { prevSec = fr.section ?? ''; EV.sec.push([+tS.toFixed(2), prevSec]); }
  boundsArg.level = fr.level; boundsArg.bpm = fr.bpm; boundsArg.bpmConfidence = fr.bpmConfidence; bounds.tick(boundsArg);
  if (bounds.charShiftCount !== lastCharShift) { lastCharShift = bounds.charShiftCount; eng.noteCharShift(); }
  if (bounds.tempoShiftCount !== lastTempoShift) { lastTempoShift = bounds.tempoShiftCount; eng.noteCharShift(`tempovaxling ${bounds.tempoShiftFrom}->${bounds.tempoShiftTo} BPM`); }
  if (bounds.boundaryCount !== lastBoundary) { lastBoundary = bounds.boundaryCount; eng.softenRange(); an.hintTrackChange(5000); }
  feed.update(fr, cfg, an);
  if (ms - lastRender < STEP_MS && lastRender >= 0) continue;
  lastRender = ms; eng.render(fr);
  if (eng.dropBangUntil !== lastBang) { lastBang = eng.dropBangUntil; if (lastBang > 0) EV.show.push(+tS.toFixed(3)); }
  if (eng.miniBangUntil !== lastMiniBang) { lastMiniBang = eng.miniBangUntil; if (lastMiniBang > 0) EV.miniLook.push(+tS.toFixed(3)); }
  if ((eng.liftCount ?? 0) !== lastLift) { lastLift = eng.liftCount ?? 0; EV.lift.push(+tS.toFixed(3)); }
}
const out = { wav: path, hopS: HOP / SR, body: Buffer.from(BODY.buffer, 0, nb * 4).toString('base64'), ev: EV, lines: LINES };
writeFileSync(opt("--json", "timing.json"), JSON.stringify(out));
process.stdout.write(`${path}: fire ${EV.fire.length} show ${EV.show.length} miniLook ${EV.miniLook.length} lift ${EV.lift.length}\n`);
