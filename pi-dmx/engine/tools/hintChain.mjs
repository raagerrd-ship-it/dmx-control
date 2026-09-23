/**
 * LATGRANS -> SEKTIONSNOLLNING, HELA KEDJAN UR LJUDET (2026-09-23). DMX har bara aux/mic - ingen Sonos, inget
 * latminne. Den har banken kor exakt det index.ts gor: analysatorn -> boundaryDetector (klangskifte/tempo/
 * nivadipp/tystnad) -> hintTrackChange (DMX_BOUNDARY_SOFT) -> sectionReset (DMX_SECTION_ON_HINT), och visar vad
 * sektionsetiketten och sektionsindex gor runt varje grans.
 *
 *   DMX_SECTION=1 DMX_SECTION_ON_HINT=1 node tools/hintChain.mjs <wav>
 */
import { readFileSync } from "node:fs";
const path = process.argv.find((a) => a.endsWith(".wav"));
if (!path) { console.error("ange en wav-fil"); process.exit(2); }
const { Analyser } = await import("../dist/analyser.js");
const { defaultConfig } = await import("../dist/config.js");
const { BoundaryDetector } = await import("../dist/boundaryDetector.js");

const d = readFileSync(path); const nSamples = (d.length - 44) >> 1;
const SR = 48000, HOP = 128, EPOCH = 1700000000000;
let nowMs = EPOCH;
const an = new Analyser(JSON.parse(JSON.stringify(defaultConfig))); an.setGainLock(true, 1);
const bounds = new BoundaryDetector(() => nowMs);
an.setSpectrumSink((mag, binHz) => bounds.pushSpectrum(mag, binHz));
const origLog = console.log; console.log = () => {};
// HINT_RESETS=1: vem nollar sektionen? (privat metod, men nabar i drift - bara for matning)
const resets = [];
if (process.env.HINT_RESETS && typeof an.sectionReset === "function") {
  const orig = an.sectionReset.bind(an);
  an.sectionReset = () => { const st = (new Error().stack || "").split("\n").slice(2, 4).map((l) => l.trim().replace(/^at /, "").replace(/\(.*\/dist\//, "(")).join(" <- "); resets.push([nowMs, st]); orig(); };
}

const buf = new Float32Array(HOP);
let lastB = 0; const events = []; let lastSec = "", lastIdx = -1; const secLog = [];
for (let off = 0; off + HOP <= nSamples; off += HOP) {
  for (let i = 0; i < HOP; i++) buf[i] = d.readInt16LE(44 + (off + i) * 2) / 32768;
  const tS = off / SR; nowMs = EPOCH + tS * 1000; an.setVirtualClock(nowMs);
  const fr = an.process(buf);
  bounds.tick({ level: fr.level, bpm: fr.bpm, bpmConfidence: fr.bpmConfidence });
  if (bounds.boundaryCount !== lastB) { lastB = bounds.boundaryCount; events.push({ t: tS, why: bounds.lastBoundary, before: `${lastSec}#${lastIdx}` }); an.hintTrackChange(5000); }
  if (fr.section !== lastSec || fr.sectionIndex !== lastIdx) { lastSec = fr.section; lastIdx = fr.sectionIndex; secLog.push([tS, lastSec, lastIdx]); }
}
console.log = origLog;
console.log(`${path}: ${events.length} latgranser ur ljudet (DMX_SECTION_ON_HINT=${process.env.DMX_SECTION_ON_HINT ?? "osatt"})`);
for (const e of events) {
  const win = Number(process.env.HINT_WIN_S || 12);
  const after = secLog.filter((x) => x[0] > e.t && x[0] <= e.t + win).map((x) => `${x[1]}#${x[2]}@${x[0].toFixed(0)}s`).join(" ");
  console.log(`   ${e.t.toFixed(1).padStart(6)} s  (${e.why})  fore: ${e.before}  ->  ${win} s efter: ${after || "(oforandrat)"}`);
}
if (process.env.HINT_TRACE) { console.log("-- hela sektionsfoljden --"); for (const x of secLog) console.log(`   ${x[0].toFixed(0).padStart(4)} s  ${x[1]}#${x[2]}`); }
if (resets.length) { console.log("-- sectionReset-anrop (tid, anropare) --"); for (const [t, st] of resets) console.log(`   ${((t - EPOCH) / 1000).toFixed(1).padStart(6)} s  ${st}`); }
