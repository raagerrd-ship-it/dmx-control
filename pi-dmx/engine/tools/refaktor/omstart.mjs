// OMSTARTSPROVET (flytten 2026-11-21): delad analysator i inline-läge (som createAnalyser), matad som motorn med dess koppling per hopp (<bygget>/hopp.js, kedjan steg 1).
// Var 60:e sekund byts den långsamma sidan mot en ny med resumeSeq (som workern efter en omstart, slowWorker.ts:9 / analyser.ts:1034).
// Samma omstarter i ref och ny; VARJE ramfält i VARJE hopp jämförs med Object.is, och räknarna får aldrig bli lägre efter en omstart.
//   node tools/refaktor/omstart.mjs <ref-dist> <ny-dist> [sek] <wav> ...
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { NAMN, BORT } from './namnkarta.mjs';
const [RA, RB, ...rest] = process.argv.slice(2);
const SECS = /^\d+$/.test(rest[0]) ? Number(rest.shift()) : 700, wavs = rest;
const SR = 48000, HOP = 128, EPOCH = 1.7e12, EVERY = 60 * SR / HOP, HINT = 97 * SR / HOP, RESET = 211 * SR / HOP;
// Steg 21 (ägaren 11-22: lägg in): workern får nivåtaket ur huvudtråden i stället för att börja om på 0,5, så uppbyggnaden skiljer efter en omstart. Bara de här två, bara efter en omstart.
const TILLATET = new Set(['buildUp', 'inRiser']);
const RAKNARE = ['dropCount', 'miniDropCount', 'dropBuildCount', 'dropDemoted', 'dropSpaced', 'stopCount', 'dropMiniBack'];
const load = async (d) => { const i = (f) => import(pathToFileURL(resolve(d, f)).href);
  return { ...(await i('analyser.js')), ...(await i('split.js')), ...(await i('analyserClock.js')), ...(await i('hopp.js')), defaultConfig: (await i('config.js')).defaultConfig }; };
const mods = [await load(RA), await load(RB)];
const build = (m) => {
  const cfg = JSON.parse(JSON.stringify(m.defaultConfig)), acfg = m.BeatFeed.analyserCfg(JSON.parse(JSON.stringify(m.defaultConfig)));
  const feedMk = m.hopFeedFactory(), buffers = m.createSplitBuffers(!!feedMk);
  const fast = new m.Analyser(acfg, { role: 'fast', split: buffers }); fast.setGainLock(true, 1);
  if (feedMk) { fast.hopLane = new m.HopLaneFast(buffers, false); fast.hopLane.peer = new m.HopLaneSlow(buffers, feedMk()); } else fast.clock = new m.BeatFeed();
  fast.setInlinePeer(new m.Analyser(acfg, { role: 'slow', split: buffers }));
  return { m, fast, cfg, acfg, buffers, hopp: new m.Hopp(fast, cfg, { softenRange: () => {}, noteTrack: () => {} }) };
};
const flat = (f, out = {}, pre = '') => { for (const k of Object.keys(f)) { const v = f[k]; if (!pre && BORT.has(k)) continue; if (v && typeof v === 'object') flat(v, out, pre + k + '.'); else out[pre + (pre ? k : NAMN.get(k) ?? k)] = v; } return out; };
let side = 0; const logs = [[], []]; const log = console.log; console.log = (...a) => logs[side].push(a.join(' '));
let tillat = 0, tot = 0, totBad = 0, totDown = 0, restarts = 0, logBad = 0;
for (const w of wavs) {
  const d = readFileSync(w); let p = 12, off0 = 44, len = d.length - 44;
  while (p + 8 <= d.length) { const id = d.toString('ascii', p, p + 4), sz = d.readUInt32LE(p + 4); if (id === 'data') { off0 = p + 8; len = sz > 0 ? Math.min(sz, d.length - off0) : d.length - off0; break; } p += 8 + sz + (sz & 1); }
  const n = Math.min(len >> 1, SECS * SR), y = new Float32Array(n); for (let i = 0; i < n; i++) y[i] = d.readInt16LE(off0 + i * 2) / 32768;
  const X = mods.map(build), buf = new Float32Array(HOP); logs[0].length = logs[1].length = 0;
  let hops = 0, bad = 0, down = 0, before = null, prev = null; const firsts = [];
  for (let off = 0; off + HOP <= n; off += HOP, hops++) {
    buf.set(y.subarray(off, off + HOP)); const ms = EPOCH + off / SR * 1000;
    const fr = X.map((x, k) => { side = k;
      if (hops > 0 && hops % EVERY === 0) { if (k === 1) before = { ...prev }; x.fast.setInlinePeer(new x.m.Analyser(x.acfg, { role: 'slow', split: x.buffers, resumeSeq: x.fast.fastReadSeq() })); }
      Date.now = () => ms; performance.now = () => ms - EPOCH; x.fast.setVirtualClock(ms);
      if (hops > 0 && hops % HINT === 0) x.fast.hintTrackChange(5000);
      if (hops > 0 && hops % RESET === 0) x.fast.resetTempo();
      const f = x.hopp.analys(buf); x.hopp.koppla(f);
      return flat(f); });
    if (hops > 0 && hops % EVERY === 0) restarts++;
    prev = fr[1]; let b = false;
    let t = false;
    for (const k of Object.keys(fr[0])) if (!Object.is(fr[0][k], fr[1][k])) { if (hops >= EVERY && TILLATET.has(k)) { t = true; continue; } b = true; if (firsts.length < 5) firsts.push(`t=${(off / SR).toFixed(3)} ${k}: ref ${fr[0][k]} ny ${fr[1][k]}`); }
    if (b) bad++; else if (t) tillat++;
    if (before) for (const k of RAKNARE) if (fr[1][k] < before[k]) { down++; if (firsts.length < 5) firsts.push(`t=${(off / SR).toFixed(3)} ${k} ${before[k]} -> ${fr[1][k]} efter omstart`); }
  }
  for (let i = 0; i < Math.max(logs[0].length, logs[1].length); i++) if (logs[0][i] !== logs[1][i]) logBad++;
  tot += hops; totBad += bad; totDown += down;
  log(`${w.split(/[\\/]/).pop()}: ${hops} hop, avvikande hop ${bad}, räknare lägre efter omstart ${down}, loggrader ${logs[0].length}/${logs[1].length}${firsts.length ? '\n  ' + firsts.join('\n  ') : ''}`);
}
log(`SUMMA omstart: ${wavs.length} filer, ${restarts} omstarter, ${tot} hop, avvikande hop ${totBad}, räknare lägre ${totDown}, avvikande loggrader ${logBad}, tillåtna (buildUp/inRiser efter omstart) ${tillat} hop`);
process.exit(totBad || totDown || logBad ? 1 : 0);
