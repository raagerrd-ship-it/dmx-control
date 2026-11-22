/** MÄTNINGEN TILL DROP-DOMAREN 3 (tools/arena/dropdom3.py; som dropdom2Kor + uppbyggnad = frame.dropBuildCount stiger): spelar en inspelning genom HELA analysatorn som motorn kör den (delad inline,
 *  ladans config delad med klockan, låtgränsdetektorn inkopplad -> hintTrackChange) ur dist/ eller deltagarens bygge (DMX_DIST + distHook)
 *  och skriver drop, minidrop, låtgränser, klockans tempo i 1 Hz och kostnaden per hopp. Tiderna är sekunder från FILENS början.
 *    node tools/arena/dropdom3Kor.mjs <wav> <ut.json> [start s]      (körs av dropdom3.py; start s = skakprovet, ljudet börjar så långt in) */
import { readFileSync, writeFileSync } from "node:fs"; import { ladanCfg } from "../benchCfg.mjs";
const [wav, ut, offS] = process.argv.slice(2), log = console.log.bind(console);
const { createAnalyser } = await import("../../dist/analyser.js"); const { defaultConfig } = await import("../../dist/config.js");
const { BeatFeed } = await import("../../dist/analyserClock.js"); const { BoundaryDetector } = await import("../../dist/boundaryDetector.js");
const d = readFileSync(wav); let o = 12, start = 44, len = d.length - 44;
while (o + 8 <= d.length) { const id = d.toString("latin1", o, o + 4), ln = d.readUInt32LE(o + 4); if (id === "data") { start = o + 8; len = Math.min(ln || d.length - start, d.length - start); break; } o += 8 + ln + (ln & 1); }
const ch = d.readUInt16LE(22), SR = d.readUInt32LE(24), n = Math.floor(len / 2 / ch), HOP = 128, EPOCH = 1700000000000, realNow = performance.now.bind(performance);
const SKIP = Math.round((+offS || 0) * SR);
console.log = () => {}; process.env.DMX_ANALYSER_SPLIT = "inline";
const cfg = ladanCfg(defaultConfig), an = createAnalyser(BeatFeed.analyserCfg ? BeatFeed.analyserCfg(cfg) : cfg, undefined), feed = new BeatFeed(); an.setGainLock(true, 1);
const bounds = new BoundaryDetector(() => Date.now()); an.setSpectrumSink((mag, binHz) => bounds.pushSpectrum(mag, binHz));
const ba = { level: 0, bpm: 0, bpmConfidence: 0, silent: false }, buf = new Float32Array(HOP); let lb = 0, lastD = 0, lastM = 0, lastU = 0, cpu = 0, hops = 0;
const bpm = [], grans = [], drops = [], minis = [], uppb = [];
for (let off = SKIP; off + HOP <= n; off += HOP) {
  for (let i = 0; i < HOP; i++) buf[i] = d.readInt16LE(start + (off + i) * 2 * ch) / 32768;
  const t = off / SR, ms = EPOCH + t * 1000; an.setVirtualClock(ms); Date.now = () => ms; performance.now = () => ms - EPOCH;
  const a = realNow(); const fr = an.process(buf);
  ba.silent = fr.silent; ba.level = fr.level; ba.bpm = fr.bpm; ba.bpmConfidence = fr.bpmConfidence; bounds.tick(ba);
  if (bounds.boundaryCount !== lb) { lb = bounds.boundaryCount; an.hintTrackChange(5000); grans.push(+t.toFixed(2)); }
  if (an.hopLane) an.hopLane.feed(fr, cfg, an); else feed.update(fr, cfg, an);
  cpu += realNow() - a; hops++;
  if (fr.dropCount !== lastD) { lastD = fr.dropCount; drops.push(+t.toFixed(2)); }
  if ((fr.miniDropCount ?? 0) !== lastM) { lastM = fr.miniDropCount ?? 0; minis.push(+t.toFixed(2)); }
  if ((fr.dropBuildCount ?? fr.buildStartCount ?? 0) !== lastU) { lastU = fr.dropBuildCount ?? fr.buildStartCount ?? 0; uppb.push(+t.toFixed(2)); }
  if (((off - SKIP) / HOP) % 375 === 0) bpm.push(+(fr.bpm || 0).toFixed(1));
}
console.log = log;
writeFileSync(ut, JSON.stringify({ wav, seconds: n / SR, startS: SKIP / SR, bpm, grans, drops, minis, uppb, cpuUsPerHop: +(cpu * 1000 / hops).toFixed(1) }));
log(`${wav}: ${drops.length} drop (${drops.map(x => Math.round(x)).join(" ")}), ${minis.length} minidrop, ${uppb.length} uppbyggnad, ${grans.length} låtgränser, ${(cpu * 1000 / hops).toFixed(0)} us/hopp`);
