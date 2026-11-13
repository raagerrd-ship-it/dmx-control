/** MÄTNINGEN TILL DROP-DOMAREN (tools/arena/dropdom.py): spelar en inspelning genom analysatorn (dist/ eller deltagarens via
 *  DMX_DIST + distHook) och skriver vad den gör: drop, minidrop, uppbyggnad (buildUp/inRiser) i 10 Hz, tempo per sekund, sektion per
 *  sekund och kostnaden per hopp.   node tools/arena/dropdomKor.mjs <wav> <ut.json>      (körs av dropdom.py, en fil åt gången) */
import { readFileSync, writeFileSync } from "node:fs";
const [wav, ut] = process.argv.slice(2);
const { createAnalyser } = await import("../../dist/analyser.js");
const { defaultConfig } = await import("../../dist/config.js"); const { BeatFeed } = await import("../../dist/beatFeed.js");
const d = readFileSync(wav); let o = 12, start = 44, len = d.length - 44;
while (o + 8 <= d.length) { const id = d.toString("latin1", o, o + 4), ln = d.readUInt32LE(o + 4); if (id === "data") { start = o + 8; len = Math.min(ln || d.length - start, d.length - start); break; } o += 8 + ln + (ln & 1); }
const ch = d.readUInt16LE(22), SR = d.readUInt32LE(24), n = Math.floor(len / 2 / ch), HOP = 128, EPOCH = 1700000000000;
const realNow = performance.now.bind(performance), log = console.log; console.log = () => {};
// MED KLOCKAN (v2, 11-13 kväll; a7:s fynd i runda 1: v1 skapade en naken Analyser utan taktmatning -> bpm 0 hela filen, tempospärren tom
// och klockberoende mekanismer dömda på reservslaget). Nu som motorn: den delade analysatorn i lås-steg (createAnalyser sync) + taktmatningen.
process.env.DMX_ANALYSER_SPLIT = "inline"; const cfg = JSON.parse(JSON.stringify(defaultConfig));
const an = createAnalyser(JSON.parse(JSON.stringify(defaultConfig)), "sync"); const feed = new BeatFeed(); an.setGainLock(true, 1);
const buf = new Float32Array(HOP); let lastD = 0, lastM = 0, cpu = 0, hops = 0;
const drops = [], minis = [], bygg = [], bpm = [], sek = [];
for (let off = 0; off + HOP <= n; off += HOP) {
  for (let i = 0; i < HOP; i++) buf[i] = d.readInt16LE(start + (off + i) * 2 * ch) / 32768;
  const t = off / SR, ms = EPOCH + t * 1000; an.setVirtualClock(ms); Date.now = () => ms; performance.now = () => ms - EPOCH;
  const a = realNow(); const fr = an.process(buf); if (an.hopLane) an.hopLane.feed(fr, cfg, an); else feed.update(fr, cfg, an); cpu += realNow() - a; hops++;
  if (fr.dropCount !== lastD) { lastD = fr.dropCount; drops.push(+t.toFixed(2)); }
  if ((fr.miniDropCount ?? 0) !== lastM) { lastM = fr.miniDropCount ?? 0; minis.push(+t.toFixed(2)); }
  const k = off / HOP;
  if (k % 38 === 0) bygg.push((fr.inRiser || (fr.buildUp ?? 0) > 0.3) ? 1 : 0);                      // ~10 Hz (101 ms)
  if (k % 375 === 0) { bpm.push(+(fr.bpm || 0).toFixed(1)); sek.push(fr.section ?? ""); }             // 1 Hz
}
console.log = log;
writeFileSync(ut, JSON.stringify({ wav, seconds: n / SR, drops, minis, byggStegS: 38 * HOP / SR, bygg, bpm, sek, cpuUsPerHop: +(cpu * 1000 / hops).toFixed(1) }));
console.log(`${wav}: ${drops.length} drop, ${minis.length} minidrop, uppbyggnad ${(100 * bygg.reduce((a, b) => a + b, 0) / bygg.length).toFixed(1)} % av tiden, ${(cpu * 1000 / hops).toFixed(0)} us/hopp`);
