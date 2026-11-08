/**
 * TVÅ VÄGAR - domarens mätkörning för LÅNGSAMMA VÄGEN (2026-11-08, anropas av tools/arena/tvavagar.py; brief + vikter står där).
 * Kör MOTORNS analysatorkedja som src/index.ts gör den, ur en valfri dist (deltagarens <mapp>/dist eller engine/dist):
 *   analyser = createAnalyser(BeatFeed.analyserCfg(cfg), 'inline')   (delad analysator, långsamma sidan + taktvägen i samma tråd =
 *              bit-identiskt med workern, deterministiskt), setGainLock(true, 1), BoundaryDetector + hintTrackChange(5000) vid låtgräns,
 *              analyser.hopLane.feed(frame, cfg, analyser) (eller BeatFeed.update om taktvägen saknas) - klockan som tempoMix/sektionLag
 *              (setVirtualClock(ms), Date.now = 1,7e12 + ms, MÄTFÄLLA 48).
 * Måttens DEFINITIONER är verktygens (se respektive jobb); bara kedjan är motorns i stället för verktygens egna (de flesta kör den
 * odelade analysatorn och BeatFeed i huvudtråden - då syns inte en ändring i den delade vägen).
 *   node tools/arena/tvavagarKor.mjs <dist> <jobb> <lista.json> <ut.json>
 *   jobb lang   lista = [wav, ...]                sektionLag.mjs (etikett upp/ned mot ljudets nivåskiften, korta delar, gridfas) + drops/låtgränser
 *   jobb mix    lista = [[[wav, ...], facit, alt?], ...] (en post per låt) tempoMix.mjs (skarvad mix, övertoning 3 s: klocka/ana/annat %, lås s, hopp/min) + låtgräns mot skarvarna
 *   jobb klipp  lista = [[wav, facit, alt?], ...] taktKorpus.mjs (varje klipp kallstartat: klocka/ana % efter 5 s)
 *   (mix/klipp: klippen nivåanpassas till ladans aux-nivå -17 dBFS som showTight --norm, se readClip)
 *   jobb drop   lista = [wav, ...]                dropFacit.mjs (drop-/minitider per klipp; facit 15,0 s döms i tvavagar.py)
 *   jobb ettan  lista = [bpm, ...]                testDownbeat.mjs-signalen (fyrtakt, ettan dubbelt så tung, 90 s, fröat brus): ettan rätt 70-90 s
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const [dist, job, listFile, outFile] = process.argv.slice(2);
const imp = (f) => import(pathToFileURL(resolve(dist, f)).href);
const { createAnalyser } = await imp('analyser.js'); const { BeatFeed } = await imp('beatFeed.js');
const { defaultConfig } = await imp('config.js'); const { BoundaryDetector } = await imp('boundaryDetector.js');
const { beatIndex } = await imp('beatClock.js');
const { fold } = await import(new URL('../catalog.mjs', import.meta.url).href);
console.log = () => {};
const SR = 48000, HOP = 128, EPOCH = 1700000000000, HMS = HOP / SR * 1000;
const list = JSON.parse(readFileSync(listFile, 'utf8'));

function readWav(path) {
  const d = readFileSync(path); let p = 12, dataOff = 44, dataLen = d.length - 44;
  while (p + 8 <= d.length) { const id = d.toString('ascii', p, p + 4), sz = d.readUInt32LE(p + 4); if (id === 'data') { dataOff = p + 8; dataLen = sz > 0 ? Math.min(sz, d.length - p - 8) : d.length - p - 8; break; } p += 8 + sz + (sz & 1); }
  const n = dataLen >> 1, y = new Float32Array(n); for (let i = 0; i < n; i++) y[i] = d.readInt16LE(dataOff + i * 2) / 32768; return y;
}

/** KORPUSKLIPPEN PÅ LADANS AUX-NIVÅ (showTight.mjs --norm -17, natt.py:s standard sedan 10-09, mätfälla 35/42): median 100 ms-RMS
 *  -> -17 dBFS, hård klippning vid +-1. Utan den ligger frozen6 ~28 dB under ladan och låtgränsen startar aldrig (START_LEVEL). */
function readClip(path) {
  const y = readWav(path), blk = 4800, rms = [];
  for (let o = 0; o + blk <= y.length; o += blk) { let q = 0; for (let i = 0; i < blk; i++) q += y[o + i] * y[o + i]; const r = Math.sqrt(q / blk); if (r > 1e-4) rms.push(r); }
  rms.sort((a, b) => a - b); const g = rms.length ? Math.pow(10, -17 / 20) / rms[rms.length >> 1] : 1;
  for (let i = 0; i < y.length; i++) y[i] = Math.max(-1, Math.min(1, y[i] * g));
  return y;
}

/** Motorns kedja (index.ts rad 95-201 utan effekterna). step() = ett hop vid ljudtiden tMs. */
function chain() {
  const cfg = JSON.parse(JSON.stringify(defaultConfig));
  const an = createAnalyser(BeatFeed.analyserCfg(cfg), 'inline'); an.setGainLock(true, 1);
  const feed = an.hopLane ? null : new BeatFeed();
  const bounds = new BoundaryDetector(() => Date.now()); an.setSpectrumSink((mag, binHz) => bounds.pushSpectrum(mag, binHz));
  const ba = { level: 0, bpm: 0, bpmConfidence: 0 }; let lb = 0, ld = 0, lm = 0;
  const C = { cfg, an, bounds: [], drops: [], minis: [] };
  C.step = (buf, tMs) => {
    const wall = EPOCH + tMs; an.setVirtualClock(tMs); Date.now = () => wall; performance.now = () => tMs;
    const fr = an.process(buf); ba.level = fr.level; ba.bpm = fr.bpm; ba.bpmConfidence = fr.bpmConfidence; bounds.tick(ba);
    if (bounds.boundaryCount !== lb) { lb = bounds.boundaryCount; an.hintTrackChange(5000); C.bounds.push(+(tMs / 1000).toFixed(2)); }
    if (an.hopLane) an.hopLane.feed(fr, cfg, an); else feed.update(fr, cfg, an);
    if (fr.dropCount !== ld) { ld = fr.dropCount; C.drops.push(+(tMs / 1000).toFixed(3)); }
    if ((fr.miniDropCount ?? 0) !== lm) { lm = fr.miniDropCount ?? 0; C.minis.push(+(tMs / 1000).toFixed(3)); }
    return fr;
  };
  return C;
}
const med = (a) => { const q = a.slice().sort((x, y) => x - y); return q.length ? q[q.length >> 1] : null; };
const okBpm = (b, tf) => b > 0 && tf.some((t) => Math.abs(fold(b) / t - 1) <= 0.04);
const out = [];

if (job === 'lang') {   // ── sektionLag.mjs (ladan 10-21 + gridfas natt 10-28), algoritmen ordagrant ──
  const GRID_RISE_DB = 6, SKIFT_DB = 5;
  for (const path of list) {
    const y = readWav(path); const C = chain(); const H = Math.floor(y.length / HOP); const buf = new Float32Array(HOP);
    const secAt = [], lvl = []; let acc = 0, accN = 0;
    const dbR = new Float64Array(16); let armed = true, lastOn = -1e9;
    const winErr = []; let winStart = -1, winBpm = 0, winOk = false; const gridErr = [];
    for (let h = 0; h < H; h++) {
      for (let i = 0; i < HOP; i++) { const v = y[h * HOP + i]; buf[i] = v; acc += v * v; }
      accN += HOP; if (accN >= SR / 2) { lvl.push(10 * Math.log10(acc / accN + 1e-10)); acc = 0; accN = 0; }
      const fr = C.step(buf, h * HMS); const cfg = C.cfg;
      {
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
            if (tOn - lastOn >= 0.6 * bm) { lastOn = tOn; const ph = (((EPOCH + tOn - g.anchorMs) % bm) + bm) % bm; winErr.push(ph < bm / 2 ? -ph : bm - ph); }
          }
        }
      }
      if (h % Math.round(100 / HMS) === 0) secAt.push(fr.section);
    }
    const W = 12, L = lvl.length; const diff = new Float64Array(L);
    for (let i = W; i < L - W; i++) { let a = 0, c = 0; for (let k = 1; k <= W; k++) { a += lvl[i - k]; c += lvl[i + k - 1]; } diff[i] = (c - a) / W; }
    const shifts = [];
    for (let i = W; i < L - W; i++) {
      if (Math.abs(diff[i]) < SKIFT_DB || i * 0.5 < 25) continue;
      let mx = true; for (let k = -8; k <= 8 && mx; k++) if (k && Math.abs(diff[i + k] || 0) > Math.abs(diff[i])) mx = false;
      if (mx && lvl.slice(i, i + W).every((v) => v > -45)) shifts.push([i * 0.5, diff[i] > 0 ? 1 : -1]);
    }
    const lab = (t) => secAt[Math.min(secAt.length - 1, Math.max(0, Math.round(t * 10)))];
    const f = { file: path.split(/[\\/]/).pop(), min: H * HMS / 60000, up: 0, upHit: 0, upLag: [], down: 0, downHit: 0, downLag: [] };
    for (const [t, dir] of shifts) {
      const ok = (s) => dir > 0 ? s === 'high' : s !== 'high' && s !== 'build';
      if (ok(lab(t - 0.5))) continue;
      let hit = -1; for (let u = t - 2; u <= t + 20; u += 0.1) if (ok(lab(u))) { hit = u - t; break; }
      if (dir > 0) { f.up++; if (hit > -9) { f.upHit++; f.upLag.push(+hit.toFixed(2)); } } else { f.down++; if (hit > -9) { f.downHit++; f.downLag.push(+hit.toFixed(2)); } }
    }
    let segs = 0, short = 0, changes = 0, st = 0;
    for (let i = 1; i <= secAt.length; i++) if (i === secAt.length || secAt[i] !== secAt[i - 1]) { segs++; if ((i - st) / 10 < 8) short++; if (i < secAt.length) changes++; st = i; }
    if (winOk && winStart >= 3) gridErr.push(...winErr);
    Object.assign(f, { segs, short, changes, grid: gridErr.map((e) => +e.toFixed(1)), drops: C.drops, minis: C.minis, bounds: C.bounds });
    out.push(f);
  }
} else if (job === 'mix') {   // ── tempoMix.mjs (2026-10-30), skarven och måtten ordagrant; låtgränsen döms mot skarvarna (sektionStat: inom 15 s) ──
  const FADE_S = 3, FADE = Math.round(FADE_S * SR);
  // en post = EN LÅT: [[klipp, ...], facit, alt?] - låtens klipp skarvas med 50 ms övertoning (hopp inom samma låt = INGEN låtgräns),
  // låtarna med FADE_S (= skarvarna, låtgränsens facit). Ett klipp på 40 s är för kort för låtgränsdetektorn (bas: 0 gränser på 50 klipp).
  const clips = list.map(([fs, ...tf]) => ({ f: fs, tf }));
  const IN = 2400;
  const song = (fs) => { const parts = fs.map(readClip); let n = parts.reduce((s, a) => s + a.length, 0) - IN * (parts.length - 1); const o = new Float32Array(n); let at = 0;
    parts.forEach((a, i) => { for (let k = 0; k < a.length; k++) { let g = 1; if (i > 0 && k < IN) g = k / IN; if (i < parts.length - 1 && k >= a.length - IN) g = (a.length - k) / IN; o[at + k] += a[k] * g; } at += a.length - IN; }); return o; };
  const pcm = clips.map((c) => song(c.f)); let total = 0; const starts = [];
  for (let i = 0; i < pcm.length; i++) { starts.push(total); total += pcm[i].length - (i < pcm.length - 1 ? FADE : 0); }
  const mix = new Float32Array(total);
  for (let i = 0; i < pcm.length; i++) {
    const a = pcm[i], s = starts[i], last = i === pcm.length - 1;
    for (let k = 0; k < a.length; k++) {
      let g = 1;
      if (i > 0 && k < FADE) g = Math.sin((k / FADE) * Math.PI / 2);
      if (!last && k >= a.length - FADE) g = Math.cos(((k - (a.length - FADE)) / FADE) * Math.PI / 2);
      mix[s + k] += a[k] * g;
    }
  }
  const seg = clips.map((c, i) => ({ ...c, t0: (starts[i] + (i ? FADE : 0)) / SR * 1000, t1: (i < clips.length - 1 ? starts[i + 1] : total) / SR * 1000 }));
  const C = chain(); const H = Math.floor(total / HOP); const buf = new Float32Array(HOP);
  const STEP = Math.round(100 / HMS); const samp = [];
  for (let h = 0; h < H; h++) { buf.set(mix.subarray(h * HOP, h * HOP + HOP)); const fr = C.step(buf, h * HMS); if (h % STEP === 0) samp.push([h * HMS, fr.bpm, C.cfg.beat?.bpm ?? 0]); }
  const HARM = [1, 2 / 3, 1.5, 0.75, 4 / 3];
  const harm = (bpm, tf) => bpm > 0 && tf.some((t) => HARM.some((k) => Math.abs(fold(bpm) / (t * k) - 1) <= 0.04 || Math.abs(fold(bpm) / (fold(t * k)) - 1) <= 0.04));
  const T = { n: 0, a: 0, k: 0, other: 0, lock: [], hops: 0, oct: 0, hopMin: 0 }; let si = 0;
  for (const s of seg) {
    const r = { n: 0, k: 0, lock: NaN }; let run = 0, held = 0, cand = 0, cn = 0;
    while (si < samp.length && samp[si][0] < s.t0) si++;
    for (let j = si; j < samp.length && samp[j][0] < s.t1; j++) {
      const [t, a, k] = samp[j]; T.n++; r.n++;
      if (okBpm(a, s.tf)) T.a++;
      if (okBpm(k, s.tf)) { r.k++; T.k++; if (++run === 20 && isNaN(r.lock)) r.lock = (t - 1900 - s.t0) / 1000; } else { run = 0; if (k > 0 && !harm(k, s.tf)) T.other++; }
      if (t - s.t0 >= 8000 && k > 0) {
        T.hopMin += 0.1 / 60;
        if (!held) held = k; else if (Math.abs(k / held - 1) <= 0.04) cand = 0;
        else if (cand && Math.abs(k / cand - 1) <= 0.03) { if (++cn >= 20) { T.hops++; const q = cand / held; if (Math.abs(q / 2 - 1) < 0.05 || Math.abs(q * 2 - 1) < 0.05) T.oct++; held = cand; cand = 0; } }
        else { cand = k; cn = 1; }
      }
    }
    if (isNaN(r.lock)) r.lock = (s.t1 - s.t0) / 1000;
    T.lock.push(r.lock);
  }
  const skarv = starts.slice(1).map((s) => (s + FADE / 2) / SR);   // övertoningens mitt (s)
  const used = new Set(); let ratt = 0, falsk = 0;
  for (const b of C.bounds) { const i = skarv.findIndex((x, k) => !used.has(k) && Math.abs(x - b) <= 15); if (i >= 0) { used.add(i); ratt++; } else falsk++; }
  out.push({ klipp: clips.length, min: total / SR / 60, klocka: 100 * T.k / T.n, ana: 100 * T.a / T.n, annat: 100 * T.other / T.n, lasMed: med(T.lock),
    hoppMin: T.hopMin ? T.hops / T.hopMin : 0, hopp: T.hops, oktav: T.oct, skarvar: skarv.length, grRatt: ratt, grFalsk: falsk, bounds: C.bounds, drops: C.drops.length });
} else if (job === 'klipp') {   // ── taktKorpus.mjs (natt 10-13): per klipp kallstart, andel tid efter 5 s (100 ms-raster) ──
  for (const [f, ...tf] of list) {
    const y = readClip(f); const C = chain(); const H = Math.floor(y.length / HOP); const buf = new Float32Array(HOP);
    let nA = 0, nK = 0, nT = 0; const STEP = Math.round(100 / HMS);
    for (let h = 0; h < H; h++) { buf.set(y.subarray(h * HOP, h * HOP + HOP)); const fr = C.step(buf, h * HMS); if (h % STEP === 0 && h * HMS >= 5000) { nT++; if (okBpm(fr.bpm, tf)) nA++; if (okBpm(C.cfg.beat?.bpm ?? 0, tf)) nK++; } }
    out.push({ file: f.split(/[\\/]/).pop(), ana: nT ? nA / nT : 0, klocka: nT ? nK / nT : 0 });
  }
} else if (job === 'drop') {   // ── dropFacit.mjs (2026-10-10): när fyrade dropen/minidropen ──
  for (const f of list) {
    const y = readWav(f); const C = chain(); const H = Math.floor(y.length / HOP); const buf = new Float32Array(HOP);
    for (let h = 0; h < H; h++) { buf.set(y.subarray(h * HOP, h * HOP + HOP)); C.step(buf, h * HMS); }
    out.push({ file: f.split(/[\\/]/).pop(), drops: C.drops, minis: C.minis });
  }
} else if (job === 'ettan') {   // ── testDownbeat.mjs: kick på varje slag, ettan dubbelt så hård; motorns rutnät (cfg.beat efter matningen, barShift ingår) ──
  for (const BPM of list) {
    let seed = 12345 + BPM; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    const B = 60 / BPM, gen = (t) => { const beat = Math.floor(t / B); const w = beat % 4 === 0 ? 1.0 : 0.45; const p = (t % B) / B; return w * Math.exp(-p * B * 26) * Math.sin(2 * Math.PI * 58 * t) + 0.02 * (rnd() * 2 - 1); };
    const C = chain(); const buf = new Float32Array(HOP); let t = 0; const hops = Math.floor(90 * SR / HOP);
    for (let h = 0; h < hops; h++) { for (let i = 0; i < HOP; i++, t++) buf[i] = gen(t / SR); C.step(buf, h * HMS); }
    let ok = 0, tot = 0;
    for (let beat = Math.ceil(70 / B); beat * B < 90; beat++) { if (beat % 4 !== 0) continue; const idx = beatIndex(C.cfg.beat, EPOCH + beat * B * 1000 + 5); tot++; if (((idx % 4) + 4) % 4 === 0) ok++; }
    out.push({ bpm: BPM, klocka: C.cfg.beat?.bpm ?? 0, ok, tot });
  }
} else { process.stderr.write('okänt jobb ' + job + '\n'); process.exit(2); }
writeFileSync(outFile, JSON.stringify(out));
process.exit(0);
