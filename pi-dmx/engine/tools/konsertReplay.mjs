/**
 * KONSERTREPLAY (2026-10-11 kväll, analysen av konsertläget efter ladan): kör en långinspelning (lang-*.wav) genom analysatorn +
 * effektmotorn som concertBench (ladans config, beatFeed, låtgränser) och skriver en tidslinje i 10 Hz med det showen GÖR:
 *   look, orsak (switchWhy), sektion, intensitet, ljus (medel 0..1), tända lampor, drop/nästan-drop/lyft/minidrop-look/build-landning.
 *   (+ 'pal' = palettindex, kulörfamiljen; mäts med tools/rodTrad.mjs)
 * Jämförs med inspelningens events.json (det som hände live, med dåvarande kod) och ägarens markeringar.
 *   node tools/konsertReplay.mjs <wav> --json ut.json [--trace ut.f32]
 *  --trace (10-12, energikedjan): varje renderruta (40 Hz) som Float32 x 10: t, sektion (0 intro 1 low 2 build 3 high 4 break 5 annat),
 *  lampa 0..3 (starkaste kanalen efter kalibreringen, 0..1), bodyDb, diskant-dB (specAbs treble+air), drop-look (dropColEnv>0 eller
 *  minidrop-looken), energin (eBass). Mäts med tools/energiMatt.mjs.
 *  --bas-ref subkick (10-16): trace-kolumnen 'bas' = sub+kick (20-120 Hz, medel av sub- och kick-dB som DMX_BASS_SUBKICK) i stället för bodyDb.
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
const SR = 48000, HOP = 128, EPOCH = 1700000000000, STEP_MS = Number(opt("--step", 25));   // --step 5 = som live (200 Hz)
const cfg = JSON.parse(JSON.stringify(defaultConfig));
cfg.mode = "smart"; cfg.energyDrivesMode = true; cfg.master = 1;
cfg.rotation = {}; for (const k of EFFECT_KEYS) cfg.rotation[k] = true;
const lamps = cfg.fixtures.map((fx) => { const roles = fixtureRoles(fx), base = (fx.address ?? 1) - 1; const at = (r) => { const i = roles.indexOf(r); return i < 0 ? -1 : base + i; }; return { r: at("r"), g: at("g"), b: at("b"), dim: at("dim") }; });
// --delad-cfg (MÄTFÄLLA 47, 10-13): live får analysatorn MOTORNS cfg (index.ts createAnalyser(cfg)), så kickgrinden mot taktgridet
// och taktfasen (analyser.ts beatSrc.beat = cfg.beat) är PÅ live - med en egen kopia (bänkarnas standard) är cfg.beat alltid null där.
// DELNINGEN SOM LIVE (10-19): ladan kör den delade analysatorn delad (DMX-profilen ANALYSER_SPLIT 'worker') - snabba sidan i motorns
// tråd med motorns cfg, långsamma (tempo/gridfas/sektion) i en worker som får en KOPIA av cfg vid start (structured clone). Här
// körs den långsamma sidan synkront (inline, deterministiskt) med en kopia som i workern. --odelad = en analysator i en tråd (förr).
const { createSplitBuffers } = await import(DIST + "split.js");
const liveAnalyser = (c) => { if (args.includes("--odelad")) return new Analyser(c); const b = createSplitBuffers(); const fast = new Analyser(c, { role: "fast", split: b }); fast.setInlinePeer(new Analyser(structuredClone(c), { role: "slow", split: b })); return fast; };
const an = liveAnalyser(args.includes("--delad-cfg") ? cfg : JSON.parse(JSON.stringify(defaultConfig))); an.setGainLock(true, 1);
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
const TRACE = opt("--trace", null) ? [] : null; const REF_SK = opt("--bas-ref", "body") === "subkick"; const SEC = { intro: 0, low: 1, build: 2, high: 3, break: 4 };
const ROWS = [];   // [t, look, why, sec, int, light, nLit, drops, near, lift, miniLook, upgrades, bpm]
let acc = { light: 0, nLit: 0, n: 0, mini: 0, hi: 0, lo: 9, top: 0 };
for (let off = 0; off + HOP <= nSamples; off += HOP) {
  for (let i = 0; i < HOP; i++) buf[i] = d.readInt16LE(44 + (off + i) * 2) / 32768;
  const tS = off / SR, ms = EPOCH + tS * 1000; tNow = tS;
  // MÄTFÄLLA 48 (10-13): analysatorns virtuella väggklocka är virtualEpoch (1,7e12) + det som skickas in - med EPOCH + t blev
  // kickAtMs/beatAnchorMs 1,7e12 ms före Date.now() (beatFeed/effekterna), så taktklockans fas efter varje tempobyte och
  // effekternas slag satt en godtycklig, tempoberoende bit från kickarna (128 BPM: 0,67 slag). Live är båda Date.now().
  // --epok-fel = gamla (felaktiga) vägen för jämförelse mot äldre json.
  an.setVirtualClock(args.includes("--epok-fel") ? ms : ms - EPOCH); Date.now = () => ms; performance.now = () => ms - EPOCH;
  const fr = an.process(buf);
  boundsArg.level = fr.level; boundsArg.bpm = fr.bpm; boundsArg.bpmConfidence = fr.bpmConfidence; bounds.tick(boundsArg);
  if (bounds.charShiftCount !== lastCharShift) { lastCharShift = bounds.charShiftCount; eng.noteCharShift?.(); }
  if (bounds.tempoShiftCount !== lastTempoShift) { lastTempoShift = bounds.tempoShiftCount; eng.noteCharShift?.(`tempovaxling ${bounds.tempoShiftFrom}->${bounds.tempoShiftTo} BPM`); }
  if (bounds.boundaryCount !== lastBoundary) { lastBoundary = bounds.boundaryCount; eng.softenRange(); an.hintTrackChange(5000); LOG.push([+tS.toFixed(2), 'LATGRANS']); }
  feed.update(fr, cfg, an);
  if (ms - lastRender < STEP_MS && lastRender >= 0) continue;
  lastRender = ms; eng.render(fr); const u = eng.universe; if (!u) continue;
  const lv = lamps.map((L) => Math.max(u[L.r] ?? 0, u[L.g] ?? 0, u[L.b] ?? 0) * (L.dim >= 0 ? u[L.dim] / 255 : 1));   // verkligt ljus = färg x dimmer
  if (TRACE) { const sa = fr.specAbs ?? {}; TRACE.push(tS, SEC[fr.section] ?? 5, lv[0] / 255, lv[1] / 255, lv[2] / 255, lv[3] / 255, REF_SK && sa.sub != null ? (20 * Math.log10(sa.sub + 1e-7) + 20 * Math.log10(sa.kick + 1e-7)) / 2 : fr.bodyDb ?? -90,
    20 * Math.log10((sa.treble ?? 0) + (sa.air ?? 0) + 1e-7), (eng.dropColEnv ?? 0) > 0.005 || ms < eng.miniBangUntil ? 1 : 0, eng.eBass ?? eng.eSm ?? 0); }
  { const L = lv.reduce((a, b) => a + b, 0) / (4 * 255), T = Math.max(...lv) / 255; acc.light += L; acc.top = (acc.top ?? 0) + T; if (T > acc.hi) acc.hi = T; if (T < acc.lo) acc.lo = T; }
  acc.nLit += lv.filter((x) => x > 0.3 * 255).length; acc.n++;   // hi/lo/top = ljusaste lampan
  if (ms < eng.miniBangUntil) acc.mini = 1;
  if (ms - lastRow >= 100) {
    lastRow = ms;
    ROWS.push([+tS.toFixed(2), eng.getActiveMode(), eng.switchWhy, fr.section ?? '', +(fr.intensity ?? 0).toFixed(2), +(acc.light / acc.n).toFixed(3), +(acc.nLit / acc.n).toFixed(1),
      fr.dropCount ?? 0, eng.nearCount ?? 0, eng.liftCount ?? 0, acc.mini, eng.buildUpgrades ?? 0, Math.round(fr.bpm ?? 0), +(fr.bodyDb ?? -90).toFixed(1), fr.miniDropCount ?? 0, +(fr.profile?.bassline ?? 0).toFixed(2), +acc.hi.toFixed(3), +acc.lo.toFixed(3), +((acc.top ?? 0) / acc.n).toFixed(3), eng.paletteIdx ?? -1,
      +(fr.bpmConfidence ?? 0).toFixed(2), +(eng.beatTrust ?? 0).toFixed(2), +(cfg.beat?.bpm ?? 0).toFixed(1), cfg.beat && cfg.beat.bpm > 40 && (cfg.beat.confidence ?? 0) >= 0.2 ? 1 : 0]);
    acc = { light: 0, nLit: 0, n: 0, mini: 0, hi: 0, lo: 9, top: 0 };
  }
}
const out = { wav: path, columns: ['t', 'look', 'why', 'sec', 'int', 'light', 'nLit', 'drops', 'near', 'lift', 'miniLook', 'upgrades', 'bpm', 'bodyDb', 'aMini', 'bass', 'hi', 'lo', 'top', 'pal', 'conf', 'trust', 'cbpm', 'lock'], rows: ROWS, log: LOG };
writeFileSync(opt("--json", "replay.json"), JSON.stringify(out));
if (TRACE) writeFileSync(opt("--trace"), Buffer.from(new Float32Array(TRACE).buffer));
process.stdout.write(`${path}: ${ROWS.length} rader, ${LOG.length} loggrader\n`);
