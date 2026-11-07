/**
 * EFTER DROPEN - SPÅRET (dagkörningen 2026-11-07, ägaren: 'efter drop räkna med att det är refräng så taket är 95 %, men jag tror att
 * öka golvet till 70 % är fel, då dödar vi ju bara dynamik'). Kör en wav genom analysatorn + effektmotorn SOM LIVE (som konsertReplay
 * --step 5 --delad-cfg --live-kick: 200 Hz render, delad analysator med motorns cfg, kick-bypass) och skriver per renderruta motorns
 * inre tal som energilyftet efter dropen styr. Läses av tools/efterDrop.py (som också mäter ljudets basanslag ur samma wav).
 *
 *   node tools/efterDropTrace.mjs <wav> --trace ut.f32 [--sek S] [--step 5] [--utan-live-kick] [--fx-dist patchad-dist-kopia]
 *
 * Float32 x NCOL per renderruta (kolumner i COLS nedan):
 *   t, sec (0 intro 1 low 2 build 3 high 4 break 5 annat), l0..l3 (lampans ljus efter kalibreringen 0..1 = starkaste kanalen x dimmer),
 *   md (energifaktorn efter E_LIN), secCeil, ceil (lampans tak i ljus: calCeil x 0,95 + dropens öppning, x master),
 *   eBass, liftLeft (ms kvar av dropens lyft inkl. fallet, 0 = inget lyft), miniLeft (ms kvar av minidropens lyft inkl. fall),
 *   dropCount (analysatorns), bpm (effektklockans cfg.beat.bpm, 0 = ingen), kick (1 = kickhändelse i rutan), drv (rDrive),
 *   bangLeft (ms kvar av dropens smäll dropBangUntil: SHOWENS drop = motorns flank, inte analysatorns dropCount),
 *   eSm (volymfönstrets energi = efterkontrollens mått), preDrop (eSm vid dropen, efterkontrollens jämförelse)
 * Ändrar inget i motorn - bara läser fält (privata i TS, vanliga egenskaper i JS).
 */
import { readFileSync, writeFileSync } from "node:fs";
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const path = args.find((a) => a.endsWith(".wav"));
const { pathToFileURL } = await import("node:url");
const DIST = opt("--dist", null) ? pathToFileURL(opt("--dist") + "/").href : new URL("../dist/", import.meta.url).href;
const { Analyser } = await import(DIST + "analyser.js");
const FXD = opt("--fx-dist", null) ? pathToFileURL(opt("--fx-dist") + "/").href : DIST;   // --fx-dist: bara effektmotorn ur en patchad kopia (analysatorn behöver node_modules/fft.js)
const { EffectEngine } = await import(FXD + "effects.js");
const { BeatFeed } = await import(DIST + "beatFeed.js");
const { defaultConfig, fixtureRoles } = await import(DIST + "config.js");
const { EFFECT_KEYS } = await import(DIST + "effects/registry.js");
const { BoundaryDetector } = await import(DIST + "boundaryDetector.js");
const { createSplitBuffers } = await import(DIST + "split.js");
const d = readFileSync(path); const nSamples = (d.length - 44) >> 1;
const SR = 48000, HOP = 128, EPOCH = 1700000000000, STEP_MS = Number(opt("--step", 5));
const MAXS = Number(opt("--sek", 1e9));
const LIVE_KICK = !args.includes("--utan-live-kick");
const cfg = JSON.parse(JSON.stringify(defaultConfig));
cfg.mode = "smart"; cfg.energyDrivesMode = true; cfg.master = 1;
cfg.rotation = {}; for (const k of EFFECT_KEYS) cfg.rotation[k] = true;
const lamps = cfg.fixtures.map((fx) => { const roles = fixtureRoles(fx), base = (fx.address ?? 1) - 1; const at = (r) => { const i = roles.indexOf(r); return i < 0 ? -1 : base + i; }; return { r: at("r"), g: at("g"), b: at("b"), dim: at("dim") }; });
const b0 = createSplitBuffers(); const acfg = BeatFeed.analyserCfg(cfg);
const an = new Analyser(acfg, { role: "fast", split: b0 }); an.setInlinePeer(new Analyser(structuredClone(acfg), { role: "slow", split: b0 })); an.setGainLock(true, 1);
const feed = new BeatFeed();
const bounds = new BoundaryDetector(() => Date.now());
an.setSpectrumSink((mag, binHz) => bounds.pushSpectrum(mag, binHz));
const boundsArg = { level: 0, bpm: 0, bpmConfidence: 0 };
Date.now = () => EPOCH; performance.now = () => 0;
const eng = new EffectEngine(cfg);
console.log = () => {};
const SEC = { intro: 0, low: 1, build: 2, high: 3, break: 4 };
const COLS = ["t", "sec", "l0", "l1", "l2", "l3", "md", "secCeil", "ceil", "eBass", "liftLeft", "miniLeft", "dropCount", "bpm", "kick", "drv", "bangLeft", "eSm", "preDrop"];
const NCOL = COLS.length, TR = [];
const buf = new Float32Array(HOP);
let lastRender = -1, lastCharShift = 0, lastTempoShift = 0, lastBoundary = 0, kickPend = 0;
const end = Math.min(nSamples, Math.floor(MAXS * SR));
for (let off = 0; off + HOP <= end; off += HOP) {
  for (let i = 0; i < HOP; i++) buf[i] = d.readInt16LE(44 + (off + i) * 2) / 32768;
  const tS = off / SR, ms = EPOCH + tS * 1000;
  an.setVirtualClock(ms - EPOCH); Date.now = () => ms; performance.now = () => ms - EPOCH;
  const fr = an.process(buf);
  boundsArg.level = fr.level; boundsArg.bpm = fr.bpm; boundsArg.bpmConfidence = fr.bpmConfidence; bounds.tick(boundsArg);
  if (bounds.charShiftCount !== lastCharShift) { lastCharShift = bounds.charShiftCount; eng.noteCharShift?.(); }
  if (bounds.tempoShiftCount !== lastTempoShift) { lastTempoShift = bounds.tempoShiftCount; eng.noteCharShift?.(`tempovaxling ${bounds.tempoShiftFrom}->${bounds.tempoShiftTo} BPM`); }
  if (bounds.boundaryCount !== lastBoundary) { lastBoundary = bounds.boundaryCount; eng.softenRange(); an.hintTrackChange(5000); }
  feed.update(fr, cfg, an);
  let kickEv = false;
  if (LIVE_KICK && fr.kick) { kickEv = true; eng.registerKick(0.4 + Math.min(1, fr.energy * 1.4) * 0.6); }
  if (fr.kick) kickPend = 1;
  if (!kickEv && ms - lastRender < STEP_MS && lastRender >= 0) continue;
  lastRender = ms; eng.render(fr); const u = eng.universe; if (!u) continue;
  const o = eng.out;
  const ceil = (o.calCeil * 0.95 + (o.calCeil - o.calCeil * 0.95) * Math.max(0, Math.min(1, o.calDrop))) * o.calMaster;
  const liftEnd = eng.dropLiftUntil + 3000, miniEnd = eng.miniLiftUntil + 1500;
  TR.push(tS, SEC[fr.section] ?? 5);
  for (const L of lamps) TR.push(Math.max(u[L.r] ?? 0, u[L.g] ?? 0, u[L.b] ?? 0) * (L.dim >= 0 ? u[L.dim] / 255 : 1) / 255);
  TR.push(eng.rMd ?? 0, eng.secCeil ?? 0, ceil, eng.eBass ?? 0, ms < liftEnd ? liftEnd - ms : 0, ms < miniEnd ? miniEnd - ms : 0,
    fr.dropCount ?? 0, cfg.beat?.bpm ?? 0, kickPend, eng.rDrive ?? 0, ms < eng.dropBangUntil ? eng.dropBangUntil - ms : 0, eng.eSm ?? 0, eng.preDropLevel ?? 0);
  kickPend = 0;
}
writeFileSync(opt("--trace", "efterdrop.f32"), Buffer.from(new Float32Array(TR).buffer));
process.stdout.write(JSON.stringify({ wav: path, cols: COLS, rows: TR.length / NCOL, step: STEP_MS, dropFalse: eng.dropFalse, dropCalmDenied: eng.dropCalmDenied, liftCount: eng.liftCount, buildUpgrades: eng.buildUpgrades }) + "\n");
