/**
 * SEKTIONSLAG (ladan 10-21, ägaren: 'inte latensen det största, utan hur snabbt dirigenten förstår typ av sektion/låt'):
 * hur långt efter LJUDETS nivåskifte byter analysatorns sektionsetikett, och hur mycket fladdrar den?
 * Kör motorns kedja utan effektmotorn (delad analysator inline med motorns cfg, låtgränsen, beatFeed - kickgrinden läser rutnätet),
 * env som i motorn (t.ex. DMX_SECTION_RUN=3). Referens ur wav:en, oberoende av analysatorn:
 *   nivå per 0,5 s (RMS dB); skifte där medel [t, t+6 s] skiljer >= SKIFT_DB från medel [t-6 s, t] (centrerat, ser framåt - facit, inte
 *   realtid), lokalt max av |skillnaden| inom +-4 s. Upp = etiketten ska bli high (build räknas som delvis: egen kolumn);
 *   ned = etiketten ska lämna high (low/break/intro).
 *   etikettlagg = tid från skiftet till första etikett i rätt riktning (inom 20 s, annars miss). Etiketten som redan stod rätt räknas inte.
 * Fladder: sektionsdelar < 8 s, sektionsbyten/min.
 * GRIDFAS (natt 10-28, uppdrag 10-27 punkt 2): sitter effektklockans rutnät (cfg.beat efter beatFeed) på basens ansats? Starka ansatser
 *   ur ljudets eget spektrum (sub+kick specAbs i dB: stigning >= 6 dB över 6 hop, ansatsen = minimum de 8 hopen före, >= 0,6 slag
 *   isär), bara i 10 s-fönster där rutnätet stått på samma tempo (+-1 %) och konfidens >= 0,35 hela fönstret, från 30 s. Fasfel = ms till
 *   närmaste slag (+ = slaget efter ansatsen). Median och andel inom +-40 ms.
 *   node tools/sektionLag.mjs <wav ...> [--skift 5] [--json ut.json]
 */
import { readFileSync, writeFileSync } from "node:fs";
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const files = args.filter((a) => a.endsWith(".wav"));
const SKIFT_DB = Number(opt("--skift", 5));
const DIST = new URL("../dist/", import.meta.url).href;
const { Analyser } = await import(DIST + "analyser.js");
const { BeatFeed } = await import(DIST + "beatFeed.js");
const { defaultConfig } = await import(DIST + "config.js");
const { BoundaryDetector } = await import(DIST + "boundaryDetector.js");
const { createSplitBuffers } = await import(DIST + "split.js");
console.log = () => {};
const SR = 48000, HOP = 128, EPOCH = 1700000000000, HMS = HOP / SR * 1000;
const tot = { up: 0, upHit: 0, upLag: [], down: 0, downHit: 0, downLag: [], short: 0, segs: 0, min: 0, changes: 0, grid: [] };
const GRID_RISE_DB = 6;
const per = [];
for (const path of files) {
  const d = readFileSync(path); const n = (d.length - 44) >> 1;
  const cfg = JSON.parse(JSON.stringify(defaultConfig));
  const b = createSplitBuffers(); const an = new Analyser(BeatFeed.analyserCfg(cfg), { role: "fast", split: b }); an.setInlinePeer(new Analyser(structuredClone(cfg), { role: "slow", split: b }));
  an.setGainLock(true, 1);
  const feed = new BeatFeed(); const bounds = new BoundaryDetector(() => Date.now());
  an.setSpectrumSink((mag, binHz) => bounds.pushSpectrum(mag, binHz));
  const bArg = { level: 0, bpm: 0, bpmConfidence: 0 }; let lastB = 0;
  const H = Math.floor(n / HOP); const buf = new Float32Array(HOP);
  const secAt = []; const lvl = []; let acc = 0, accN = 0;   // etikett per 100 ms, nivå per 0,5 s
  const dbR = new Float64Array(16); let armed = true, lastOn = -1e9;   // gridfas: basens dB per hop (ring), ansatser
  const winErr = []; let winStart = -1, winBpm = 0, winOk = false; const gridErr = [];
  for (let h = 0; h < H; h++) {
    for (let i = 0; i < HOP; i++) { const v = d.readInt16LE(44 + (h * HOP + i) * 2) / 32768; buf[i] = v; acc += v * v; }
    accN += HOP; if (accN >= SR / 2) { lvl.push(10 * Math.log10(acc / accN + 1e-10)); acc = 0; accN = 0; }
    const ms = EPOCH + h * HMS; an.setVirtualClock(ms - EPOCH); Date.now = () => ms; performance.now = () => ms - EPOCH;
    const fr = an.process(buf);
    bArg.level = fr.level; bArg.bpm = fr.bpm; bArg.bpmConfidence = fr.bpmConfidence; bounds.tick(bArg);
    if (bounds.boundaryCount !== lastB) { lastB = bounds.boundaryCount; an.hintTrackChange(5000); }
    feed.update(fr, cfg, an);
    {   // GRIDFAS
      const sa = fr.specAbs, db = 20 * Math.log10((sa?.sub ?? 0) + (sa?.kick ?? 0) + 1e-7), tMs = h * HMS;
      dbR[h & 15] = db;
      const g = cfg.beat, wNo = Math.floor(tMs / 10000);
      if (wNo !== winStart) { if (winOk && winStart >= 3) gridErr.push(...winErr); winErr.length = 0; winStart = wNo; winBpm = g?.bpm ?? 0; winOk = !!g; }
      if (!g || (g.confidence ?? 0) < 0.35 || Math.abs(g.bpm / (winBpm || 1) - 1) > 0.01) winOk = false;
      if (h >= 16) {
        const rise = db - dbR[(h - 6) & 15];
        if (rise < GRID_RISE_DB / 2) armed = true;
        if (armed && rise >= GRID_RISE_DB && g && g.bpm > 40) {
          armed = false;
          let mi = 0, mv = 1e9; for (let k = 1; k <= 8; k++) { const v = dbR[(h - k) & 15]; if (v < mv) { mv = v; mi = k; } }
          const tOn = (h - mi) * HMS, bm = 60000 / g.bpm;
          if (tOn - lastOn >= 0.6 * bm) {
            lastOn = tOn;
            const ph = (((EPOCH + tOn - g.anchorMs) % bm) + bm) % bm;   // ansatsens plats efter senaste slaget
            winErr.push(ph < bm / 2 ? -ph : bm - ph);                   // + = slaget kommer efter ansatsen
          }
        }
      }
    }
    if (h % Math.round(100 / HMS) === 0) secAt.push(fr.section);
  }
  const dur = H * HMS / 1000;
  // skiften ur ljudet (0,5 s-raster)
  const W = 12, L = lvl.length; const diff = new Float64Array(L);
  for (let i = W; i < L - W; i++) { let a = 0, c = 0; for (let k = 1; k <= W; k++) { a += lvl[i - k]; c += lvl[i + k - 1]; } diff[i] = (c - a) / W; }
  const shifts = [];
  for (let i = W; i < L - W; i++) {
    if (Math.abs(diff[i]) < SKIFT_DB || i * 0.5 < 25) continue;   // första 25 s: analysatorns uppvärmning + låtstartens intro
    let mx = true; for (let k = -8; k <= 8 && mx; k++) if (k && Math.abs(diff[i + k] || 0) > Math.abs(diff[i])) mx = false;
    if (mx && lvl.slice(i, i + W).every((v) => v > -45)) shifts.push([i * 0.5, diff[i] > 0 ? 1 : -1]);   // inte tystnad/låtbyte
  }
  const lab = (t) => secAt[Math.min(secAt.length - 1, Math.max(0, Math.round(t * 10)))];
  const f = { file: path.split(/[\\/]/).pop(), up: 0, upHit: 0, upLag: [], down: 0, downHit: 0, downLag: [] };
  for (const [t, dir] of shifts) {
    const ok = (s) => dir > 0 ? s === "high" : s !== "high" && s !== "build";
    if (ok(lab(t - 0.5))) continue;   // stod redan rätt
    let hit = -1; for (let u = t - 2; u <= t + 20; u += 0.1) if (ok(lab(u))) { hit = u - t; break; }
    if (dir > 0) { f.up++; if (hit > -9) { f.upHit++; f.upLag.push(hit); } } else { f.down++; if (hit > -9) { f.downHit++; f.downLag.push(hit); } }
  }
  // fladder
  let segs = 0, short = 0, changes = 0, st = 0;
  for (let i = 1; i <= secAt.length; i++) if (i === secAt.length || secAt[i] !== secAt[i - 1]) { segs++; if ((i - st) / 10 < 8) short++; if (i < secAt.length) changes++; st = i; }
  if (winOk && winStart >= 3) gridErr.push(...winErr);
  f.gridMed = med(gridErr); f.gridN = gridErr.length; f.grid40 = gridErr.filter((e) => Math.abs(e) <= 40).length / Math.max(1, gridErr.length);
  tot.grid.push(...gridErr);
  per.push(f);
  tot.up += f.up; tot.upHit += f.upHit; tot.upLag.push(...f.upLag); tot.down += f.down; tot.downHit += f.downHit; tot.downLag.push(...f.downLag);
  tot.segs += segs; tot.short += short; tot.changes += changes; tot.min += dur / 60;
}
function med(a) { const s = a.slice().sort((x, y) => x - y); return s.length ? s[s.length >> 1] : NaN; }
const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor(p * (s.length - 1))] : NaN; };
const r = {
  upp: `${tot.upHit}/${tot.up} träffade, etikett efter ljudet median ${med(tot.upLag).toFixed(1)} s (p25 ${q(tot.upLag, 0.25).toFixed(1)}, p75 ${q(tot.upLag, 0.75).toFixed(1)})`,
  ned: `${tot.downHit}/${tot.down} träffade, median ${med(tot.downLag).toFixed(1)} s (p25 ${q(tot.downLag, 0.25).toFixed(1)}, p75 ${q(tot.downLag, 0.75).toFixed(1)})`,
  grid: `${tot.grid.length} ansatser, slaget median ${med(tot.grid).toFixed(0)} ms (p25 ${q(tot.grid, 0.25).toFixed(0)}, p75 ${q(tot.grid, 0.75).toFixed(0)}), inom +-40 ms ${(100 * tot.grid.filter((e) => Math.abs(e) <= 40).length / Math.max(1, tot.grid.length)).toFixed(0)} %`,
  fladder: `${tot.short}/${tot.segs} delar < 8 s, ${(tot.changes / tot.min).toFixed(2)} byten/min`,
};
process.stdout.write(`${files.length} filer, ${tot.min.toFixed(0)} min, skifte >= ${SKIFT_DB} dB\n  UPP  ${r.upp}\n  NED  ${r.ned}\n  FLADDER ${r.fladder}\n  GRIDFAS ${r.grid}\n`);
if (opt("--json")) writeFileSync(opt("--json"), JSON.stringify({ tot, per }, null, 1));
