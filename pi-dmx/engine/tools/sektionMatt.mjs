/**
 * SEKTIONSMÅTT (natten 10-14, ägarens prio 1 10-13: "sektioner som håller + inga falska låtgränser"). Kör en lang-*.wav genom
 * BARA analysatorn (DMX-profilen) + låtgränsdetektorn som konsertReplay (samma klocka, samma hint vid LATGRANS) - ingen effektmotor,
 * så ett svep över alla 23 inspelningar tar ~1 min. Sektionen beror inte på motorn utom SECTION_HOLD_BARS (cfg.beat) som är av.
 *   node tools/sektionMatt.mjs <wav> [--json ut.json]
 * Skriver en rad JSON till stdout: { wav, min, segs: [[start_s, slut_s, etikett]], latgrans: [t_s], bpm: [[t_s, bpm]] (1 Hz), lvl: [[t_s, level]] (1 Hz) }.
 * Mäts med tools/sektionStat.py (andel sektioner < 8 s, sektionsbyten/min, nollningar till intro mitt i låten, låtgränser/min).
 */
import { readFileSync, writeFileSync } from "node:fs";
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const path = args.find((a) => a.endsWith(".wav"));
const DIST = new URL("../dist/", import.meta.url).href;
const { Analyser } = await import(DIST + "analyser.js");
const { defaultConfig } = await import(DIST + "config.js");
const { BoundaryDetector } = await import(DIST + "boundaryDetector.js");
const d = readFileSync(path); const nSamples = (d.length - 44) >> 1;
const SR = 48000, HOP = 128, EPOCH = 1700000000000;
const an = new Analyser(JSON.parse(JSON.stringify(defaultConfig))); an.setGainLock(true, 1);
const bounds = new BoundaryDetector(() => Date.now());
an.setSpectrumSink((mag, binHz) => bounds.pushSpectrum(mag, binHz));
const boundsArg = { level: 0, bpm: 0, bpmConfidence: 0 };
Date.now = () => EPOCH; performance.now = () => 0;
console.log = () => {};
const buf = new Float32Array(HOP);
let lastBoundary = 0, curSec = null, segStart = 0, lastSec1 = -1;
const segs = [], latgrans = [], bpm = [], lvl = [];
for (let off = 0; off + HOP <= nSamples; off += HOP) {
  for (let i = 0; i < HOP; i++) buf[i] = d.readInt16LE(44 + (off + i) * 2) / 32768;
  const tS = off / SR, ms = EPOCH + tS * 1000;
  an.setVirtualClock(ms - EPOCH); Date.now = () => ms; performance.now = () => ms - EPOCH;   // mätfälla 48
  const fr = an.process(buf);
  boundsArg.level = fr.level; boundsArg.bpm = fr.bpm; boundsArg.bpmConfidence = fr.bpmConfidence; bounds.tick(boundsArg);
  if (bounds.boundaryCount !== lastBoundary) { lastBoundary = bounds.boundaryCount; an.hintTrackChange(5000); latgrans.push(+tS.toFixed(2)); }
  const s = fr.section ?? '';
  if (s !== curSec) { if (curSec !== null) segs.push([+segStart.toFixed(2), +tS.toFixed(2), curSec]); curSec = s; segStart = tS; }
  const s1 = Math.floor(tS); if (s1 !== lastSec1) { lastSec1 = s1; bpm.push([s1, Math.round(fr.bpm ?? 0), +(fr.bpmConfidence ?? 0).toFixed(2)]); lvl.push([s1, +(fr.level ?? 0).toFixed(3), +(fr.bodyDb ?? -90).toFixed(1)]); }
}
const T = nSamples / SR; segs.push([+segStart.toFixed(2), +T.toFixed(2), curSec]);
const out = { wav: path, min: +(T / 60).toFixed(2), segs, latgrans, bpm, lvl };
if (opt("--json", null)) writeFileSync(opt("--json"), JSON.stringify(out));
process.stdout.write(JSON.stringify({ wav: path, min: out.min, nSeg: segs.length, nLat: latgrans.length }) + "\n");
