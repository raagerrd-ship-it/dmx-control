/** LIVSTECKEN PER SIGNAL (2026-11-14). Kör analysatorn (delad inline, ladans config, klockan och låtgränsen inkopplade) över
 *  inspelningar och säger för VARJE fält i ramen hur det lever: andel av tiden skilt från noll, ändringar per minut, min/max.
 *  Ett fält som aldrig ändras efter insvängningen (20 s) är DÖTT. 11-14 hittades tre döda signaler för hand på det rena ljudet
 *  (inRiser/buildUp, inZone, låtgränsen: absoluta nivågränser) - den här listan ska visa sådant direkt.
 *    node tools/livstecken.mjs <wav> [<wav> ...] [--alla]      (utan --alla visas bara döda och nästan döda fält + räknarna) */
import { readFileSync } from "node:fs"; import path from "node:path"; import { pathToFileURL } from "node:url"; import { ladanCfg } from "./benchCfg.mjs";
const argv = process.argv.slice(2), ALLA = argv.includes("--alla"), wavs = argv.filter(a => a.endsWith(".wav"));
const U = f => pathToFileURL(path.resolve("dist", f)).href;
process.env.DMX_ANALYSER_SPLIT = "inline";
const { createAnalyser } = await import(U("analyser.js")); const { defaultConfig } = await import(U("config.js")); const { BeatFeed } = await import(U("analyserClock.js")); const { BoundaryDetector } = await import(U("boundaryDetector.js"));
const log = console.log; const tot = new Map();   // fält -> per fil { on, ch, min, max, n }
const flat = (o, pre, out) => { for (const k in o) { const v = o[k]; if (v && typeof v === "object" && !ArrayBuffer.isView(v) && !Array.isArray(v)) flat(v, pre + k + ".", out); else if (typeof v === "number" || typeof v === "boolean" || typeof v === "string") out.push([pre + k, v]); } return out; };
for (const wav of wavs) {
  console.log = () => {};
  // DELAD cfg som live (index.ts): taktrastret (cfg.beat) når analysatorn
  const cfg = ladanCfg(defaultConfig), an = createAnalyser(BeatFeed.analyserCfg ? BeatFeed.analyserCfg(cfg) : cfg, undefined), feed = new BeatFeed(); an.setGainLock(true, 1);
  const bounds = new BoundaryDetector(() => Date.now()); an.setSpectrumSink((mag, binHz) => bounds.pushSpectrum(mag, binHz)); const ba = { level: 0, bpm: 0, bpmConfidence: 0, silent: false }; let lb = 0, nb = 0;
  const d = readFileSync(wav); let o = 12, start = 44, len = d.length - 44;
  while (o + 8 <= d.length) { const id = d.toString("latin1", o, o + 4), ln = d.readUInt32LE(o + 4); if (id === "data") { start = o + 8; len = Math.min(ln || d.length - start, d.length - start); break; } o += 8 + ln + (ln & 1); }
  const ch = d.readUInt16LE(22), SR = d.readUInt32LE(24), n = Math.floor(len / 2 / ch), HOP = 128, EPOCH = 1700000000000, buf = new Float32Array(HOP);
  const st = new Map(); let frames = 0;
  for (let off = 0; off + HOP <= n; off += HOP) {
    for (let i = 0; i < HOP; i++) buf[i] = d.readInt16LE(start + (off + i) * 2 * ch) / 32768;
    const t = off / SR, ms = EPOCH + t * 1000; an.setVirtualClock(ms); Date.now = () => ms; performance.now = () => ms - EPOCH;
    const fr = an.process(buf); ba.silent = fr.silent; ba.level = fr.level; ba.bpm = fr.bpm; ba.bpmConfidence = fr.bpmConfidence; bounds.tick(ba);
    if (bounds.boundaryCount !== lb) { lb = bounds.boundaryCount; an.hintTrackChange(5000); if (t >= 20) nb++; }
    if (an.hopLane) an.hopLane.feed(fr, cfg, an); else feed.update(fr, cfg, an);
    if (t < 20) continue; frames++;
    for (const [k, v] of flat(fr, "", [])) { let s = st.get(k); if (!s) st.set(k, s = { on: 0, ch: 0, min: Infinity, max: -Infinity, last: v, str: typeof v === "string" });
      if (typeof v === "string" ? v !== "" : v !== 0 && v !== false && v === v) s.on++; if (v !== s.last) { s.ch++; s.last = v; }
      if (typeof v === "number") { if (v < s.min) s.min = v; if (v > s.max) s.max = v; } }
  }
  const mins = frames * HOP / SR / 60;
  st.set("(låtgränser)", { on: nb, ch: nb, min: 0, max: nb, str: false, cnt: true });
  for (const [k, s] of st) (tot.get(k) ?? tot.set(k, []).get(k)).push({ on: s.cnt ? NaN : 100 * s.on / frames, cpm: s.ch / mins, min: s.min, max: s.max, str: s.str });
}
console.log = log;
const f = (x, d = 1) => x !== x ? "-" : Math.abs(x) >= 1e6 ? x.toExponential(1) : x.toFixed(d);
console.log(`LIVSTECKEN, ${wavs.length} filer: ${wavs.map(w => path.basename(w).replace(/^lang-|\.wav$/g, "")).join("  ")}   (efter 20 s insvängning)`);
console.log(`${"fält".padEnd(26)} ${"dom".padEnd(10)} ${"andel av tiden ≠ 0 (%)".padEnd(26)} ${"ändringar per minut".padEnd(26)} max`);
// Döda med flit i DMX-bänken: förstärkningen är låst (aux), och taktfasen läser DMX ur klockan (cfg.beat), inte ur ramen (lotus läser ramen).
const VANTAT = { gain: "låst förstärkning", barShift: "DMX läser klockan", beatPhaseMs: "DMX läser klockan", beatPhaseConf: "DMX läser klockan" };
let dead = 0, weak = 0, vantade = 0;
for (const [k, a] of [...tot].sort((x, y) => x[0].localeCompare(y[0]))) {
  const cpm = Math.max(...a.map(x => x.cpm)), on = Math.max(...a.map(x => x.on !== x.on ? 0 : x.on));
  const counter = /Count$|Spaced$|Demoted$|låtgräns/.test(k);   // räknare för sällsynta händelser döms inte som nästan döda
  const dom = cpm === 0 ? "DÖD" : !counter && (cpm < 0.5 || (on > 0 && on < 0.5)) ? "nästan död" : "";
  if (dom === "DÖD" && VANTAT[k]) vantade++; else if (dom === "DÖD") dead++; else if (dom) weak++;
  if (!ALLA && !dom && !/Count$|låtgräns|inRiser|inZone|buildUp$|^bpm$|^section$/.test(k)) continue;
  console.log(`${k.padEnd(26)} ${(dom === "DÖD" && VANTAT[k] ? "död*" : dom).padEnd(10)} ${a.map(x => f(x.on)).join(" / ").padEnd(26)} ${a.map(x => f(x.cpm)).join(" / ").padEnd(26)} ${a.map(x => x.str ? "text" : x.max === -Infinity ? "ja/nej" : f(x.max, 2)).join(" / ")}`);
}
console.log(`${tot.size} fält: ${dead} OVÄNTAT döda, ${weak} nästan döda, ${vantade} döda med flit (* = ${[...new Set(Object.values(VANTAT))].join("; ")}).`);
if (dead) process.exitCode = 1;
