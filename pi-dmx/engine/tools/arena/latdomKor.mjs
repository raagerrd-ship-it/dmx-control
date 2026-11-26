/** MÄTNINGEN TILL LÅTBYTESDOMAREN (tools/arena/latdom.py): spelar en inspelning genom HELA analysatorn som motorn kör den (delad inline,
 *  ladans config delad med klockan, låtgränsdetektorn inkopplad -> hintTrackChange) ur dist/ eller deltagarens bygge (DMX_DIST + distHook)
 *  och skriver klockans tempo i 2 Hz, låtgränserna (när de SÄGS), drop och kostnaden per hopp.
 *    node tools/arena/latdomKor.mjs <wav> <ut.json>      (körs av latdom.py, en fil åt gången) */
import { readFileSync, writeFileSync } from "node:fs"; import { ladanCfg } from "../benchCfg.mjs";
const [wav, ut] = process.argv.slice(2), log = console.log.bind(console);
const { createAnalyser } = await import("../../dist/analyser.js"); const { defaultConfig } = await import("../../dist/config.js");
const { BeatFeed } = await import("../../dist/analyserClock.js"); const { Hopp } = await import("../../dist/hopp.js");   // MOTORNS KOPPLING PER HOPP (kedjan steg 1)
const d = readFileSync(wav); let o = 12, start = 44, len = d.length - 44;
while (o + 8 <= d.length) { const id = d.toString("latin1", o, o + 4), ln = d.readUInt32LE(o + 4); if (id === "data") { start = o + 8; len = Math.min(ln || d.length - start, d.length - start); break; } o += 8 + ln + (ln & 1); }
const ch = d.readUInt16LE(22), SR = d.readUInt32LE(24), n = Math.floor(len / 2 / ch), HOP = 128, EPOCH = 1700000000000, realNow = performance.now.bind(performance);
console.log = () => {}; process.env.DMX_ANALYSER_SPLIT = "inline";
const cfg = ladanCfg(defaultConfig), an = createAnalyser(BeatFeed.analyserCfg ? BeatFeed.analyserCfg(cfg) : cfg, undefined); an.setGainLock(true, 1);
let tNow = 0; const hopp = new Hopp(an, cfg, { softenRange: () => {}, noteTrack: () => grans.push([+tNow.toFixed(2), hopp.bounds.active ? String(hopp.bounds.lastBoundary) : "tystnad"]) });
const buf = new Float32Array(HOP); let lastD = 0, cpu = 0, hops = 0;
const bpm = [], conf = [], grans = [], drops = [];
for (let off = 0; off + HOP <= n; off += HOP) {
  for (let i = 0; i < HOP; i++) buf[i] = d.readInt16LE(start + (off + i) * 2 * ch) / 32768;
  const t = off / SR, ms = EPOCH + t * 1000; an.setVirtualClock(ms); Date.now = () => ms; performance.now = () => ms - EPOCH;
  const a = realNow(); tNow = t; const fr = hopp.analys(buf); hopp.koppla(fr);
  cpu += realNow() - a; hops++;
  if (fr.dropCount !== lastD) { lastD = fr.dropCount; drops.push(+t.toFixed(2)); }
  if ((off / HOP) % 188 === 0) { bpm.push(+(fr.bpm || 0).toFixed(1)); conf.push(+(fr.bpmConfidence || 0).toFixed(2)); }
}
console.log = log;
writeFileSync(ut, JSON.stringify({ wav, seconds: n / SR, stegS: 188 * HOP / SR, bpm, conf, grans, drops, cpuUsPerHop: +(cpu * 1000 / hops).toFixed(1) }));
log(`${wav}: ${grans.length} låtgränser (${grans.map(g => g[0]).join(" ")}), ${drops.length} drop, ${(cpu * 1000 / hops).toFixed(0)} us/hopp`);
