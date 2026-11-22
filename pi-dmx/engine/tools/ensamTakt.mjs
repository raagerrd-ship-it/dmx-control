/** TAKT OCH LÅTBYTE FÖR SIG (2026-11-14) - syskon till tools/ensam.mjs för de två analyser som inte sitter på analysatorn via this.a.
 *
 *  TAPPA (en gång per inspelning; hela analysatorn inline, ladans config, låtgränsen inkopplad som i motorn):
 *    node tools/ensamTakt.mjs tappa <wav> <mapp>          -> <mapp>/<namn>.klocka.tap  och  <mapp>/<namn>.latgrans.tap
 *      klocka:   klockans hela indata per hopp = taktvägens post (det arbetstråden får: anslag, basband, kick, låtgräns, tystnad,
 *                baskroppen under taket, tiden) + vad klockan svarade.
 *      latgrans: nivå/tempo/tystnad per hopp + spektrum upp till 12 kHz vid varje stor-FFT (stor fil, ~150 MB per 10 min).
 *
 *  KÖR (bråkdelen av en hel körning):
 *    node tools/ensamTakt.mjs klocka <fil.klocka.tap> [--set NAMN=värde ...] [--facit tools/ladan-2026-11-13/beatthis.jsonl] [--aterkoppling]
 *    node tools/ensamTakt.mjs latgrans <fil.latgrans.tap> [--set NAMN=värde ...] [--facit tools/ladan-2026-11-13/latbyten.json]
 *  Utan --set ska svaret vara IDENTISKT med hela analysatorn. --set byter en konstant i en tillfällig kopia av den kompilerade filen
 *  (analyserClock.js / boundaryDetector.js); --dist <mapp> tar filen ur ett annat bygge (en deltagares).
 *  --facit klocka: andel av tiden tempot är rätt (inom 4 % av Beat This!), fel sekunder och var. latgrans: träffar inom 10 s, falska.
 *
 *  ÅTERKOPPLING: klockan läser sitt eget förra svar (ramens bpm/tillit) - med --set matas det UPPSPELADE svaret tillbaka (provat lika
 *  med --aterkoppling utan --set). Det som går genom ANDRA delar följer inte med: klockans rutnät styr kickgrinden, låtgränsen läser
 *  klockans tempo och klockan läser låtgränsen. Bekräfta alltid ett valt värde med en hel körning (sond.mjs + tempofacit.py). */
import { readFileSync, writeFileSync, mkdirSync, openSync, writeSync, closeSync } from "node:fs"; import path from "node:path"; import { pathToFileURL } from "node:url";
import { ladanCfg } from "./benchCfg.mjs";
const [cmd, ...rest] = process.argv.slice(2); const opt = (k, d) => { const i = rest.indexOf(k); return i >= 0 ? rest[i + 1] : d; };
const DIST = path.resolve(opt("--dist", "dist")), U = (f, d = DIST) => pathToFileURL(path.join(d, f)).href;
const EPOCH = 1700000000000, HOP = 128, SPEC_N = 513, log = console.log.bind(console);
const head = (file) => { const b = readFileSync(file), hl = b.readUInt32LE(0); return { h: JSON.parse(b.subarray(4, 4 + hl).toString("utf8")), body: b.buffer.slice(b.byteOffset + 4 + hl, b.byteOffset + b.length) }; };
const patched = async (fil, sets) => {   // tillfällig kopia av dist/<fil>.js med bytta konstanter, relativa importer pekade på riktiga dist
  let js = readFileSync(path.join(DIST, fil + ".js"), "utf8");
  for (const [k, v] of sets) { const re = new RegExp("(\\b" + k + " = )([^,;]+)"); if (!re.test(js)) { console.error(`hittar inte konstanten ${k} i ${fil}.js`); process.exit(1); } js = js.replace(re, "$1" + v); }
  js = js.replace(/from\s+(["'])\.\/([^"']+)\1/g, (_, q, f) => `from ${q}${U(f)}${q}`);
  const dir = path.resolve(".arena/ensam"); mkdirSync(dir, { recursive: true }); const tmp = path.join(dir, `${fil}-${process.pid}.mjs`); writeFileSync(tmp, js);
  return import(pathToFileURL(tmp).href);
};
const sets = []; rest.forEach((a, i) => { if (a === "--set") sets.push(rest[i + 1].split("=")); });
const VAR = sets.length > 0 || rest.includes("--dist");   // en ändrad kod: ingen likhetskontroll mot tappen, och klockan får sitt eget svar tillbaka

if (cmd === "tappa") {
  const [wav, dir] = rest; process.env.DMX_ANALYSER_SPLIT = "inline";
  const { createAnalyser } = await import(U("analyser.js")); const { defaultConfig } = await import(U("config.js")); const { BeatFeed } = await import(U("analyserClock.js")); const { BoundaryDetector } = await import(U("boundaryDetector.js"));
  const d = readFileSync(wav); let o = 12, start = 44, len = d.length - 44;
  while (o + 8 <= d.length) { const id = d.toString("latin1", o, o + 4), ln = d.readUInt32LE(o + 4); if (id === "data") { start = o + 8; len = Math.min(ln || d.length - start, d.length - start); break; } o += 8 + ln + (ln & 1); }
  const ch = d.readUInt16LE(22), SR = d.readUInt32LE(24), n = Math.floor(len / 2 / ch), hops = Math.floor(n / HOP);
  // klockan: en rad per update()
  const KW = 22, K = new Float64Array((hops + 8) * KW); let kn = 0, curT = 0;
  const orig = BeatFeed.prototype.update;
  BeatFeed.prototype.update = function (f, cfg, an, now) {
    const r = kn * KW; K[r] = curT; K[r + 1] = now; K[r + 2] = f.bpm; K[r + 3] = f.bpmConfidence; K[r + 4] = f.kickAnchorMs ?? f.beatAnchorMs; K[r + 5] = f.kickAtMs; K[r + 6] = f.barShift;
    K[r + 7] = f.onset?.kick ?? 0; K[r + 8] = f.onset?.highMid ?? 0; K[r + 9] = f.onset?.treble ?? 0; K[r + 10] = f.specAbs?.sub ?? 0; K[r + 11] = f.specAbs?.kick ?? 0; K[r + 12] = f.specAbs?.bass ?? 0;
    K[r + 13] = an.trackBoundaries ?? 0; K[r + 14] = an.quietMs ?? 0; K[r + 15] = an.boundSure ? 1 : 0; K[r + 16] = an.bodyUnderDb ?? 0;
    const ret = orig.call(this, f, cfg, an, now); const b = cfg.beat;
    K[r + 17] = b ? 1 : b === null ? -1 : 0; K[r + 18] = b ? b.bpm : 0; K[r + 19] = b ? b.anchorMs : 0; K[r + 20] = b ? (b.confidence ?? 0) : 0; K[r + 21] = cfg.beatErr ?? NaN; kn++; return ret;
  };
  // låtgränsen: tick per hopp + spektrum per stor-FFT
  const T = new Float64Array(hops * 5), maxS = Math.ceil(hops / 3) + 64, S = new Float32Array(maxS * SPEC_N), ST = new Float64Array(maxS), SH = new Uint32Array(maxS); let tn = 0, sn = 0, binHz0 = 0, magLen = 0; const grans = [];
  console.log = () => {};
  const cfg = ladanCfg(defaultConfig), an = createAnalyser(BeatFeed.analyserCfg ? BeatFeed.analyserCfg(cfg) : cfg, undefined), feed = new BeatFeed(); an.setGainLock(true, 1);
  const bounds = new BoundaryDetector(() => Date.now());
  an.setSpectrumSink((mag, binHz) => { if (sn < maxS) { S.set(mag.subarray(0, SPEC_N), sn * SPEC_N); ST[sn] = Date.now(); SH[sn] = tn; sn++; binHz0 = binHz; magLen = mag.length; } bounds.pushSpectrum(mag, binHz); });
  const ba = { level: 0, bpm: 0, bpmConfidence: 0, silent: false }, buf = new Float32Array(HOP); let lb = 0;
  for (let off = 0; off + HOP <= n; off += HOP) {
    for (let i = 0; i < HOP; i++) buf[i] = d.readInt16LE(start + (off + i) * 2 * ch) / 32768;
    curT = off / SR; const ms = EPOCH + curT * 1000; an.setVirtualClock(ms); Date.now = () => ms; performance.now = () => ms - EPOCH;
    const fr = an.process(buf); ba.silent = fr.silent; ba.level = fr.level; ba.bpm = fr.bpm; ba.bpmConfidence = fr.bpmConfidence;
    const r = tn * 5; T[r] = ms; T[r + 1] = fr.level; T[r + 2] = fr.bpm; T[r + 3] = fr.bpmConfidence; T[r + 4] = fr.silent ? 1 : 0; tn++;
    bounds.tick(ba);
    if (bounds.boundaryCount !== lb) { lb = bounds.boundaryCount; an.hintTrackChange(5000); grans.push([+curT.toFixed(2), bounds.active ? bounds.lastBoundary : "tystnad"]); }
    if (an.hopLane) an.hopLane.feed(fr, cfg, an); else feed.update(fr, cfg, an);
  }
  console.log = log; mkdirSync(dir, { recursive: true }); const namn = path.basename(wav).replace(/\.wav$/, "");
  const skrivJ = (fil, h, parts) => { let s = JSON.stringify(h); while ((4 + Buffer.byteLength(s, "utf8")) % 8) s += " "; const hb = Buffer.from(s, "utf8"), lb4 = Buffer.alloc(4); lb4.writeUInt32LE(hb.length); const fd = openSync(fil, "w"); writeSync(fd, lb4); writeSync(fd, hb); for (const p of parts) writeSync(fd, Buffer.from(p.buffer, p.byteOffset, p.byteLength)); closeSync(fd); };
  skrivJ(path.join(dir, namn + ".klocka.tap"), { v: 1, sort: "klocka", wav, W: KW, rows: kn }, [K.subarray(0, kn * KW)]);
  skrivJ(path.join(dir, namn + ".latgrans.tap"), { v: 1, sort: "latgrans", wav, ticks: tn, specs: sn, specN: SPEC_N, magLen, binHz: binHz0, grans }, [T.subarray(0, tn * 5), ST.subarray(0, sn), SH.subarray(0, sn + (sn & 1)), S.subarray(0, sn * SPEC_N)]);
  log(`${namn}: klocka ${kn} steg (${(kn * KW * 8 / 1e6).toFixed(0)} MB), låtgräns ${tn} hopp + ${sn} spektrum (${(sn * SPEC_N * 4 / 1e6).toFixed(0)} MB); låtgränser i hela körningen: ${grans.map(g => g[0] + " " + g[1]).join(", ") || "inga"}`);
  process.exit(0);
}
if (cmd === "klocka") {
  const { h, body } = head(rest[0]), W = h.W, M = new Float64Array(body, 0, h.rows * W), LOOP = rest.includes("--aterkoppling") || VAR;
  console.log = () => {};
  const { BeatFeed } = await patched("analyserClock", sets);
  const feed = new BeatFeed(), cfg = { beat: undefined, beatErr: undefined }; let rt = 0, rb = 0;
  const fr = { bpm: 0.5, bpmConfidence: 0.5, kickAnchorMs: 0.5, beatAnchorMs: 0.5, kickAtMs: 0.5, barShift: 0.5, onset: { kick: 0.5, highMid: 0.5, treble: 0.5 }, specAbs: { sub: 0.5, kick: 0.5, bass: 0.5 } };
  const target = { trackBoundaries: 0, quietMs: 0, boundSure: false, bodyUnderDb: 0, resetTempo: () => { rt++; }, resetBar: () => { rb++; }, setClockGrid: () => {} };
  const t0 = performance.now.bind(performance)(), realNow = performance.now.bind(performance); let diff = 0, first = "", ob = 0, oc = 0; const tl = [];
  for (let i = 0, o = 0; i < h.rows; i++, o += W) {
    const now = M[o + 1]; Date.now = () => now; performance.now = () => now - EPOCH;
    fr.bpm = LOOP && i > 0 ? ob : M[o + 2]; fr.bpmConfidence = LOOP && i > 0 ? oc : M[o + 3]; fr.kickAnchorMs = fr.beatAnchorMs = M[o + 4]; fr.kickAtMs = M[o + 5]; fr.barShift = M[o + 6];
    fr.onset.kick = M[o + 7]; fr.onset.highMid = M[o + 8]; fr.onset.treble = M[o + 9]; fr.specAbs.sub = M[o + 10]; fr.specAbs.kick = M[o + 11]; fr.specAbs.bass = M[o + 12];
    target.trackBoundaries = M[o + 13]; target.quietMs = M[o + 14]; target.boundSure = M[o + 15] === 1; target.bodyUnderDb = M[o + 16];
    feed.update(fr, cfg, target, now);   // fr.beatAnchorMs: byggen före steg 23 (--dist)
    const b = cfg.beat; ob = b ? b.bpm : 0; oc = b ? (b.confidence ?? 0) : 0;
    if (!VAR && !(ob === M[o + 18] && (b ? b.anchorMs : 0) === M[o + 19] && oc === M[o + 20])) { diff++; if (!first) first = `vid ${M[o].toFixed(2)} s: ensam ${ob.toFixed(3)} bpm, hela ${M[o + 18].toFixed(3)}`; }
    if (i % 188 === 0) tl.push([M[o], ob]);
  }
  const ms = realNow() - t0; console.log = log;
  log(`${path.basename(rest[0])}: ${h.rows} steg på ${ms.toFixed(0)} ms${VAR ? "  [" + (sets.map(s => s.join("=")).join(" ") || "eget bygge") + "]" : diff ? `  AVVIKER från hela analysatorn i ${diff} steg (${first})` : "  IDENTISK med hela analysatorn" + (LOOP ? " (med återkopplingen)" : "")}`);
  if (opt("--facit")) {
    let beats = null; for (const rad of readFileSync(opt("--facit"), "utf8").split("\n")) { if (!rad.trim().startsWith("{")) continue; const r = JSON.parse(rad); if (path.basename(r.path) === path.basename(h.wav)) beats = r.beatsS; }
    if (!beats) { log("  inget facit för " + h.wav); process.exit(0); }
    let lo = 0, hi = 0, n = 0, ratt = 0, okt = 0; const fel = [];
    for (const [t, v] of tl) { if (t < 20) continue; while (lo < beats.length && beats[lo] < t - 4) lo++; while (hi < beats.length && beats[hi] <= t + 4) hi++;
      if (hi - lo < 6) continue; const dd = []; for (let k = lo + 1; k < hi; k++) dd.push(beats[k] - beats[k - 1]); dd.sort((a, b) => a - b); const f = 60 / ((dd.length & 1) ? dd[dd.length >> 1] : (dd[dd.length / 2 - 1] + dd[dd.length / 2]) / 2);
      n++; if (v > 0 && Math.abs(v - f) / f <= 0.04) ratt++; else if (v > 0 && [2, 0.5].some(k => Math.abs(v * k - f) / f <= 0.04)) okt++; else { if (fel.length && t - fel[fel.length - 1][1] <= 1.5) fel[fel.length - 1][1] = t; else fel.push([t, t]); } }
    const felS = (n - ratt - okt) * (tl[1][0] - tl[0][0]);
    log(`  tempo rätt ${(100 * ratt / n).toFixed(1)} %  oktav ${(100 * okt / n).toFixed(1)} %  FEL ${(100 * (n - ratt - okt) / n).toFixed(1)} % (${felS.toFixed(0)} s av ${(n * (tl[1][0] - tl[0][0])).toFixed(0)}): ${fel.filter(x => x[1] - x[0] >= 2).map(x => x[0].toFixed(0) + "-" + x[1].toFixed(0)).join(" ")}`);
  }
  process.exit(0);
}
if (cmd === "latgrans") {
  const { h, body } = head(rest[0]); let off = 0;
  const T = new Float64Array(body, off, h.ticks * 5); off += h.ticks * 5 * 8; const ST = new Float64Array(body, off, h.specs); off += h.specs * 8; const nSH = h.specs + (h.specs & 1);
  const SH = new Uint32Array(body, off, nSH); off += nSH * 4; const S = new Float32Array(body, off, h.specs * h.specN);
  console.log = () => {};
  const { BoundaryDetector } = await patched("boundaryDetector", sets);
  let cur = 0; const bd = new BoundaryDetector(() => cur), mag = new Float32Array(h.magLen), o = { level: 0, bpm: 0, bpmConfidence: 0, silent: false }, grans = []; let si = 0, lb = 0;
  const realNow = performance.now.bind(performance), t0 = realNow();
  for (let k = 0, r = 0; k < h.ticks; k++, r += 5) {
    while (si < h.specs && SH[si] === k) { cur = ST[si]; mag.set(S.subarray(si * h.specN, (si + 1) * h.specN)); bd.pushSpectrum(mag, h.binHz); si++; }
    cur = T[r]; o.level = T[r + 1]; o.bpm = T[r + 2]; o.bpmConfidence = T[r + 3]; o.silent = T[r + 4] === 1; bd.tick(o);
    if (bd.boundaryCount !== lb) { lb = bd.boundaryCount; grans.push([+((cur - EPOCH) / 1000).toFixed(2), bd.active ? bd.lastBoundary : "tystnad"]); }
  }
  const ms = realNow() - t0; console.log = log;
  const same = JSON.stringify(grans) === JSON.stringify(h.grans);
  log(`${path.basename(rest[0])}: ${h.ticks} hopp + ${h.specs} spektrum på ${ms.toFixed(0)} ms${VAR ? "  [" + (sets.map(s => s.join("=")).join(" ") || "eget bygge") + "]" : same ? "  IDENTISK med hela analysatorn" : "  AVVIKER från hela analysatorn (" + h.grans.map(g => g[0]).join(" ") + ")"}`);
  log(`  låtgränser: ${grans.map(g => g[0].toFixed(1) + " (" + g[1] + ")").join("  ") || "inga"}`);
  if (opt("--facit")) { const f = JSON.parse(readFileSync(opt("--facit"), "utf8"))[path.basename(h.wav)] ?? [];
    const inom = (g, t) => g[0] >= t - 8 && g[0] <= t + 25;   // samma regel som domaren (tools/arena/latdom.py): gränsen SÄGS 8 s före till 25 s efter skarven
    const hit = f.filter(t => grans.some(g => inom(g, t))), falsk = grans.filter(g => !f.some(t => inom(g, t)));
    log(`  facit ${f.join(", ")} s: träffade ${hit.length} av ${f.length} (gränsen sagd 8 s före till 25 s efter skarven), falska ${falsk.length}${falsk.length ? " (" + falsk.map(g => g[0].toFixed(0)).join(" ") + ")" : ""}`); }
  process.exit(0);
}
log("node tools/ensamTakt.mjs tappa <wav> <mapp> | klocka <tap> [--set N=v] [--facit beatthis.jsonl] | latgrans <tap> [--set N=v] [--facit latbyten.json]");
