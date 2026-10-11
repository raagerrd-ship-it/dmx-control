/**
 * KONSERTREPLAY (2026-10-11 kväll, analysen av konsertläget efter ladan): kör en långinspelning (lang-*.wav) genom analysatorn +
 * effektmotorn som concertBench (ladans config, beatFeed, låtgränser) och skriver en tidslinje i 10 Hz med det showen GÖR:
 *   look, orsak (switchWhy), sektion, intensitet, ljus (medel 0..1), tända lampor, drop/nästan-drop/lyft/minidrop-look/build-landning.
 * Jämförs med inspelningens events.json (det som hände live, med dåvarande kod) och ägarens markeringar.
 *   node tools/konsertReplay.mjs <wav> --json ut.json
 */
import { readFileSync, writeFileSync } from "node:fs";
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const path = args.find((a) => a.endsWith(".wav"));
const { pathToFileURL } = await import("node:url");
const DIST = opt("--dist", null) ? pathToFileURL(opt("--dist") + "/").href : new URL("../dist/", import.meta.url).href;   // --dist: prova en patchad kopia
const { Analyser } = await import(DIST + "analyser.js");
const { EffectEngine } = await import(DIST + "effects.js");
const { BeatFeed } = await import(DIST + "beatFeed.js");
const { defaultConfig, fixtureRoles } = await import(DIST + "config.js");
const { EFFECT_KEYS } = await import(DIST + "effects/registry.js");
const { BoundaryDetector } = await import(DIST + "boundaryDetector.js");
const d = readFileSync(path); const nSamples = (d.length - 44) >> 1;
const SR = 48000, HOP = 128, EPOCH = 1700000000000, STEP_MS = 25;
const cfg = JSON.parse(JSON.stringify(defaultConfig));
cfg.mode = "smart"; cfg.energyDrivesMode = true; cfg.master = 1;
cfg.rotation = {}; for (const k of EFFECT_KEYS) cfg.rotation[k] = true;
const lamps = cfg.fixtures.map((fx) => { const roles = fixtureRoles(fx), base = (fx.address ?? 1) - 1; const at = (r) => { const i = roles.indexOf(r); return i < 0 ? -1 : base + i; }; return { r: at("r"), g: at("g"), b: at("b") }; });
const an = new Analyser(JSON.parse(JSON.stringify(defaultConfig))); an.setGainLock(true, 1);
const feed = new BeatFeed();
const bounds = new BoundaryDetector(() => Date.now());
an.setSpectrumSink((mag, binHz) => bounds.pushSpectrum(mag, binHz));
const boundsArg = { level: 0, bpm: 0, bpmConfidence: 0 };
Date.now = () => EPOCH; performance.now = () => 0;
const eng = new EffectEngine(cfg);
let tNow = 0; const LOG = [];
console.log = (...a) => { const s = a.join(" "); if (/^\[dirigent\]/.test(s)) LOG.push([+tNow.toFixed(2), s.slice(11, 140)]); };
const buf = new Float32Array(HOP);
let lastRender = -1, lastCharShift = 0, lastTempoShift = 0, lastBoundary = 0, lastRow = -1;
const ROWS = [];   // [t, look, why, sec, int, light, nLit, drops, near, lift, miniLook, upgrades, bpm]
let acc = { light: 0, nLit: 0, n: 0, mini: 0 };
for (let off = 0; off + HOP <= nSamples; off += HOP) {
  for (let i = 0; i < HOP; i++) buf[i] = d.readInt16LE(44 + (off + i) * 2) / 32768;
  const tS = off / SR, ms = EPOCH + tS * 1000; tNow = tS;
  an.setVirtualClock(ms); Date.now = () => ms; performance.now = () => ms - EPOCH;
  const fr = an.process(buf);
  boundsArg.level = fr.level; boundsArg.bpm = fr.bpm; boundsArg.bpmConfidence = fr.bpmConfidence; bounds.tick(boundsArg);
  if (bounds.charShiftCount !== lastCharShift) { lastCharShift = bounds.charShiftCount; eng.noteCharShift(); }
  if (bounds.tempoShiftCount !== lastTempoShift) { lastTempoShift = bounds.tempoShiftCount; eng.noteCharShift(`tempovaxling ${bounds.tempoShiftFrom}->${bounds.tempoShiftTo} BPM`); }
  if (bounds.boundaryCount !== lastBoundary) { lastBoundary = bounds.boundaryCount; eng.softenRange(); an.hintTrackChange(5000); LOG.push([+tS.toFixed(2), 'LATGRANS']); }
  feed.update(fr, cfg, an);
  if (ms - lastRender < STEP_MS && lastRender >= 0) continue;
  lastRender = ms; eng.render(fr); const u = eng.universe; if (!u) continue;
  const lv = lamps.map((L) => Math.max(u[L.r] ?? 0, u[L.g] ?? 0, u[L.b] ?? 0));
  acc.light += lv.reduce((a, b) => a + b, 0) / (4 * 255); acc.nLit += lv.filter((x) => x > 0.3 * 255).length; acc.n++;
  if (ms < eng.miniBangUntil) acc.mini = 1;
  if (ms - lastRow >= 100) {
    lastRow = ms;
    ROWS.push([+tS.toFixed(2), eng.getActiveMode(), eng.switchWhy, fr.section ?? '', +(fr.intensity ?? 0).toFixed(2), +(acc.light / acc.n).toFixed(3), +(acc.nLit / acc.n).toFixed(1),
      fr.dropCount ?? 0, eng.nearCount ?? 0, eng.liftCount ?? 0, acc.mini, eng.buildUpgrades ?? 0, Math.round(fr.bpm ?? 0), +(fr.bodyDb ?? -90).toFixed(1), fr.miniDropCount ?? 0]);
    acc = { light: 0, nLit: 0, n: 0, mini: 0 };
  }
}
const out = { wav: path, columns: ['t', 'look', 'why', 'sec', 'int', 'light', 'nLit', 'drops', 'near', 'lift', 'miniLook', 'upgrades', 'bpm', 'bodyDb', 'aMini'], rows: ROWS, log: LOG };
writeFileSync(opt("--json", "replay.json"), JSON.stringify(out));
process.stdout.write(`${path}: ${ROWS.length} rader, ${LOG.length} loggrader\n`);
