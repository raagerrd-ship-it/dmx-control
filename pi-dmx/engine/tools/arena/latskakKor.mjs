/** MÄTNINGEN TILL LÅTBYTESDOMAREN (tools/arena/latdom.py): spelar en inspelning genom HELA analysatorn som motorn kör den (delad inline,
 *  ladans config delad med klockan, låtgränsdetektorn inkopplad -> hintTrackChange) ur dist/ eller deltagarens bygge (DMX_DIST + distHook)
 *  och skriver klockans tempo i 2 Hz, låtgränserna (när de SÄGS), drop och kostnaden per hopp.
 *    node tools/arena/latskakKor.mjs <wav> <ut.json> [startS]   (körs av latskak.py; startS = hoppa över början, tiderna är filens) */
import { readFileSync, writeFileSync } from "node:fs"; import { ladanCfg } from "../benchCfg.mjs";
const [wav, ut, skipS = "0"] = process.argv.slice(2), log = console.log.bind(console);   // skipS: börja så här många sekunder in (skakprovet)
const { createAnalyser } = await import("../../dist/analyser.js"); const { defaultConfig } = await import("../../dist/config.js");
const { BeatFeed } = await import("../../dist/analyserClock.js"); const { BoundaryDetector } = await import("../../dist/boundaryDetector.js");
const d = readFileSync(wav); let o = 12, start = 44, len = d.length - 44;
while (o + 8 <= d.length) { const id = d.toString("latin1", o, o + 4), ln = d.readUInt32LE(o + 4); if (id === "data") { start = o + 8; len = Math.min(ln || d.length - start, d.length - start); break; } o += 8 + ln + (ln & 1); }
const ch = d.readUInt16LE(22), SR = d.readUInt32LE(24), n = Math.floor(len / 2 / ch), HOP = 128, EPOCH = 1700000000000, realNow = performance.now.bind(performance);
console.log = () => {}; process.env.DMX_ANALYSER_SPLIT = "inline";
const cfg = ladanCfg(defaultConfig), an = createAnalyser(BeatFeed.analyserCfg ? BeatFeed.analyserCfg(cfg) : cfg, undefined), feed = new BeatFeed(); an.setGainLock(true, 1);
const bounds = new BoundaryDetector(() => Date.now()); an.setSpectrumSink((mag, binHz) => bounds.pushSpectrum(mag, binHz));
const ba = { level: 0, bpm: 0, bpmConfidence: 0, silent: false }, buf = new Float32Array(HOP); let lb = 0, lastD = 0, cpu = 0, hops = 0;
const bpm = [], conf = [], grans = [], drops = [];
const SKIP = Math.round(Number(skipS) * 48000);
for (let off = SKIP; off + HOP <= n; off += HOP) {
  for (let i = 0; i < HOP; i++) buf[i] = d.readInt16LE(start + (off + i) * 2 * ch) / 32768;
  const t = off / SR, ms = EPOCH + t * 1000; an.setVirtualClock(ms); Date.now = () => ms; performance.now = () => ms - EPOCH;
  const a = realNow(); const fr = an.process(buf);
  ba.silent = fr.silent; ba.level = fr.level; ba.bpm = fr.bpm; ba.bpmConfidence = fr.bpmConfidence; bounds.tick(ba);
  if (bounds.boundaryCount !== lb) { lb = bounds.boundaryCount; an.hintTrackChange(5000); grans.push([+t.toFixed(2), bounds.active ? String(bounds.lastBoundary) : "tystnad"]); }
  if (an.hopLane) an.hopLane.feed(fr, cfg, an); else feed.update(fr, cfg, an);
  cpu += realNow() - a; hops++;
  if (fr.dropCount !== lastD) { lastD = fr.dropCount; drops.push(+t.toFixed(2)); }
  if (((off - SKIP) / HOP) % 188 === 0) { bpm.push(+(fr.bpm || 0).toFixed(1)); conf.push(+(fr.bpmConfidence || 0).toFixed(2)); }
}
console.log = log;
writeFileSync(ut, JSON.stringify({ wav, seconds: n / SR, stegS: 188 * HOP / SR, bpm, conf, grans, drops, cpuUsPerHop: +(cpu * 1000 / hops).toFixed(1) }));
log(`${wav}: ${grans.length} låtgränser (${grans.map(g => g[0]).join(" ")}), ${drops.length} drop, ${(cpu * 1000 / hops).toFixed(0)} us/hopp`);
