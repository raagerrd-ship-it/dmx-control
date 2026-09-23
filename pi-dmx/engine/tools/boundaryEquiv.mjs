/**
 * EKVIVALENSTEST for latgransdetektorn (2026-09-23). Kor en WAV genom analysatorn pa virtuell klocka och matar
 * BADE det gamla latminnet (songMemory.js, fryst kopia fran fore rensningen) och den nya utbrutna
 * BoundaryDetector med exakt samma spektrum och samma ram-varden. Kravet: boundaryCount stiger pa SAMMA hop.
 *
 *   node tools/boundaryEquiv.mjs <wav> --old <katalog med songMemory.js + fingerprint.js>
 *
 * Det gamla minnet kors med tomt bibliotek och learn=false - precis som i ladan, dar latminnet var avstangt
 * men gransdetektorn anda levde inuti det. Da ar igenkanning/inlarning dod kod och enda vagen till en grans ar
 * klangskifte/tempo/nivadipp/tystnad/maxlangd - samma vag som den nya modulen.
 */
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const path = args.find((a) => a.endsWith(".wav"));
const oldDir = opt("--old", null);
if (!path || !oldDir) { console.error("ange wav och --old <katalog>"); process.exit(2); }

// Tomt bibliotek: peka SONGS_PATH pa en fil som inte finns, innan modulen laddas.
process.env.SONGS_PATH = resolve(oldDir, "no-such-songs.bin");
const { Analyser } = await import("../dist/analyser.js");
const { defaultConfig } = await import("../dist/config.js");
const { BoundaryDetector } = await import("../dist/boundaryDetector.js");
const { SongMemory } = await import(pathToFileURL(resolve(oldDir, "songMemory.js")).href);

const d = readFileSync(path);
const nSamples = (d.length - 44) >> 1;
const SR = 48000, HOP = 128, EPOCH = 1700000000000;
let nowMs = EPOCH;
const clock = () => nowMs;

const an = new Analyser(JSON.parse(JSON.stringify(defaultConfig)));
an.setGainLock(true, 1);
const oldM = new SongMemory(clock);
try { await oldM.load(); } catch { /* tomt bibliotek ar poangen */ }
const neu = new BoundaryDetector(clock);
an.setSpectrumSink((mag, binHz) => { oldM.pushSpectrum(mag, binHz, false); neu.pushSpectrum(mag, binHz); });

const origLog = console.log; const logs = [];
console.log = (...a) => { const s = a.join(" "); if (s.startsWith("[song]")) logs.push(s); };

const buf = new Float32Array(HOP);
const oldT = [], newT = [];
let oc = 0, nc = 0;
for (let off = 0; off + HOP <= nSamples; off += HOP) {
  for (let i = 0; i < HOP; i++) buf[i] = d.readInt16LE(44 + (off + i) * 2) / 32768;
  const tS = off / SR; nowMs = EPOCH + tS * 1000;
  an.setVirtualClock(nowMs);
  const fr = an.process(buf);
  oldM.tick({ level: fr.level, dropped: false, bpm: fr.bpm, bpmConfidence: fr.bpmConfidence, intensity: fr.intensity, beatAnchorMs: fr.beatAnchorMs, learn: false });
  neu.tick({ level: fr.level, bpm: fr.bpm, bpmConfidence: fr.bpmConfidence });
  if (oldM.boundaryCount !== oc) { oc = oldM.boundaryCount; oldT.push(+tS.toFixed(3)); }
  if (neu.boundaryCount !== nc) { nc = neu.boundaryCount; newT.push(+tS.toFixed(3)); }
}
console.log = origLog;

const same = oldT.length === newT.length && oldT.every((t, i) => t === newT[i]);
console.log(`${path}: gamla ${oldT.length} granser, nya ${newT.length} granser -> ${same ? "IDENTISKA" : "SKILJER"}`);
console.log(`  gamla: ${oldT.join(" ")}`);
console.log(`  nya:   ${newT.join(" ")}`);
if (!same) process.exit(1);
