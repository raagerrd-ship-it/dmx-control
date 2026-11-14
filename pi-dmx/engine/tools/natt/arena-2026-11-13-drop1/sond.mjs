/** SOND: spelar en inspelning genom analysatorn (dist/ eller DMX_DIST via distHook) som dropdomKor, men släpper igenom analysatorns
 *  spårrader ([flank] ...) med tiden i filen framför, och skriver bpm + bodyUnderDb per halv sekund.
 *  Motorns låtgränsdetektor är inkopplad (hintTrackChange). Tempofacit: tempofacit.py mot tools/ladan-2026-11-13/beatthis.jsonl (Beat This!).
 *  node tools/natt/arena-2026-11-13-drop1/sond.mjs <wav> [ut.json]      (DMX_DROP_TRACE=1 för spårraderna) */
import { readFileSync, writeFileSync } from "node:fs"; import { ladanCfg } from "../../benchCfg.mjs";   // ladans config (släckgräns 0,015 m.m.)
const [wav, ut] = process.argv.slice(2); const log = console.log.bind(console);
const { createAnalyser } = await import("../../../dist/analyser.js");
const { defaultConfig } = await import("../../../dist/config.js"); const { BeatFeed } = await import("../../../dist/beatFeed.js");
const { BoundaryDetector } = await import("../../../dist/boundaryDetector.js");   // motorns låtgränser (som dmxDump/konsertReplay): hintTrackChange släpper klockans håll
const d = readFileSync(wav); let o = 12, start = 44, len = d.length - 44;
while (o + 8 <= d.length) { const id = d.toString("latin1", o, o + 4), ln = d.readUInt32LE(o + 4); if (id === "data") { start = o + 8; len = Math.min(ln || d.length - start, d.length - start); break; } o += 8 + ln + (ln & 1); }
const ch = d.readUInt16LE(22), SR = d.readUInt32LE(24), n = Math.floor(len / 2 / ch), HOP = 128, EPOCH = 1700000000000;
let tNow = 0;
console.log = (...a) => { const s = a.join(" "); if (/flank|fras|drop|break|tempo/i.test(s)) log(tNow.toFixed(2).padStart(7), s); };
process.env.DMX_ANALYSER_SPLIT = "inline"; const cfg = ladanCfg(defaultConfig);
const an = createAnalyser(ladanCfg(defaultConfig), "sync"); const feed = new BeatFeed(); an.setGainLock(true, 1);
const buf = new Float32Array(HOP); let lastD = 0;
const bounds = new BoundaryDetector(() => Date.now()); an.setSpectrumSink((mag, binHz) => bounds.pushSpectrum(mag, binHz)); const ba = { level: 0, bpm: 0, bpmConfidence: 0, silent: false }; let lb = 0; const grans = [];
const drops = [], bpm = [], under = [], zon = [], bygg = [], rise = [], lvl = [];
for (let off = 0; off + HOP <= n; off += HOP) {
  for (let i = 0; i < HOP; i++) buf[i] = d.readInt16LE(start + (off + i) * 2 * ch) / 32768;
  const t = off / SR, ms = EPOCH + t * 1000; tNow = t; an.setVirtualClock(ms); Date.now = () => ms; performance.now = () => ms - EPOCH;
  const fr = an.process(buf); ba.silent = fr.silent; ba.level = fr.level; ba.bpm = fr.bpm; ba.bpmConfidence = fr.bpmConfidence; bounds.tick(ba);
  if (bounds.boundaryCount !== lb) { lb = bounds.boundaryCount; an.hintTrackChange(5000); grans.push(`${t.toFixed(1)}${bounds.active ? "form" : "tyst"}`); }
  if (an.hopLane) an.hopLane.feed(fr, cfg, an); else feed.update(fr, cfg, an);
  if (fr.dropCount !== lastD) { lastD = fr.dropCount; drops.push(+t.toFixed(2)); }
  const k = off / HOP;
  if (k % 188 === 0) { bpm.push(+(fr.bpm || 0).toFixed(1)); under.push(+(an.bodyUnderDb ?? 0).toFixed(1)); zon.push(fr.inZone ? 1 : 0); bygg.push(+(fr.buildUp ?? 0).toFixed(2)); rise.push(fr.inRiser ? 1 : 0); lvl.push(+fr.level.toFixed(3)); }
}
console.log = log;
if (ut) writeFileSync(ut, JSON.stringify({ wav, stegS: 188 * HOP / SR, drops, grans, bpm, under, zon, bygg, rise, lvl, form: (bounds.fTrace ?? []).map(r => [+((r[0] - EPOCH) / 1000).toFixed(1), r[1], r[2], r[3], r[4]]) }));
const pct = a => (100 * a.reduce((x, y) => x + (y ? 1 : 0), 0) / a.length).toFixed(1);
console.log(`${wav}: drop ${drops.join(" ")} | låtgräns ${grans.join(" ")} | inZone ${pct(zon)} % | inRiser ${pct(rise)} % | buildUp>0,35 ${pct(bygg.map(v => v > 0.35))} %`);
