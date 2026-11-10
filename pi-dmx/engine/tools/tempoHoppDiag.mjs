// TEMPOHOPPEN 2026-11-10 (tools/natt/tempohopp-2026-11-10.md): tvavagarKor mix-jobbet (motorns kedja) + instrumenterad BeatFeed.
// Lista = tvavagar.latar(...) som json, eller {"wav": "tools/...wav", "facit": [120]} för en lång inspelning. Ut: samp [t, klocka bpm, tillit, tempoBpm, tgClear, repeatRate, onBeatRate, coast] var 100 ms + tempobyten (ev: fastSw = snabba minnet bytte).
// node tools/tempoHoppDiag.mjs <dist> <lista.json> <ut.json>   (från engine/; dist under engine/, t.ex. .arena/<körning>/<v>/dist)
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const [dist, listFile, outFile] = process.argv.slice(2);
const imp = (f) => import(pathToFileURL(resolve(dist, f)).href);
const { createAnalyser } = await imp('analyser.js'); const { BeatFeed } = await imp('analyserClock.js');
const { defaultConfig } = await imp('config.js'); const { BoundaryDetector } = await imp('boundaryDetector.js');
const { fold } = await import(new URL('./catalog.mjs', import.meta.url).href);
console.log = () => {}; const log = (...a) => process.stdout.write(a.join(' ') + '\n');
const SR = 48000, HOP = 128, EPOCH = 1700000000000, HMS = HOP / SR * 1000;
const list = JSON.parse(readFileSync(listFile, 'utf8'));
let FEED = null; let curT = 0; const ev = [];
const P = BeatFeed.prototype;
const oUpd = P.update; P.update = function (...a) { FEED = this; return oUpd.apply(this, a); };
const oTg = P.tgStep; P.tgStep = function (now) {
  const b0 = this.tempoBpm, sw0 = this.tgSwitches, hv0 = this.hvSwitches; this._t0 = 0;
  const r = oTg.call(this, now);
  if (b0 > 0 && this.tempoBpm > 0 && Math.abs(this.tempoBpm / b0 - 1) > 0.03) ev.push({ t: curT, from: b0, to: this.tempoBpm, t0: this._t0, fastSw: this.tgSwitches - sw0, vote: this.hvSwitches - hv0, clear: this.tgClear, rep: this.repeatRate, onb: this.onBeatRate, coast: this.gridCoasting });
  return r;
};
const oPv = P.peakVote; P.peakVote = function (t0, now) { this._t0 = t0; return oPv.call(this, t0, now); };
const oRl = P.relock; P.relock = function () { ev.push({ t: curT, relock: 1, bpm: this.tempoBpm }); return oRl.call(this); };

function readWav(path) {
  const d = readFileSync(path); let p = 12, dataOff = 44, dataLen = d.length - 44;
  while (p + 8 <= d.length) { const id = d.toString('ascii', p, p + 4), sz = d.readUInt32LE(p + 4); if (id === 'data') { dataOff = p + 8; dataLen = sz > 0 ? Math.min(sz, d.length - p - 8) : d.length - p - 8; break; } p += 8 + sz + (sz & 1); }
  const n = dataLen >> 1, y = new Float32Array(n); for (let i = 0; i < n; i++) y[i] = d.readInt16LE(dataOff + i * 2) / 32768; return y;
}
function readClip(path) {
  const y = readWav(path), blk = 4800, rms = [];
  for (let o = 0; o + blk <= y.length; o += blk) { let q = 0; for (let i = 0; i < blk; i++) q += y[o + i] * y[o + i]; const r = Math.sqrt(q / blk); if (r > 1e-4) rms.push(r); }
  rms.sort((a, b) => a - b); const g = rms.length ? Math.pow(10, -17 / 20) / rms[rms.length >> 1] : 1;
  for (let i = 0; i < y.length; i++) y[i] = Math.max(-1, Math.min(1, y[i] * g));
  return y;
}
const ENG = new URL('../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const cfg = JSON.parse(JSON.stringify(defaultConfig));
const an = createAnalyser(BeatFeed.analyserCfg(cfg), 'inline'); an.setGainLock(true, 1);
const bounds = new BoundaryDetector(() => Date.now()); an.setSpectrumSink((mag, binHz) => bounds.pushSpectrum(mag, binHz));
const ba = { level: 0, bpm: 0, bpmConfidence: 0 }; let lb = 0; const bl = [];
const step = (buf, tMs) => {
  const wall = EPOCH + tMs; an.setVirtualClock(tMs); Date.now = () => wall; performance.now = () => tMs; curT = tMs;
  const fr = an.process(buf); ba.level = fr.level; ba.bpm = fr.bpm; ba.bpmConfidence = fr.bpmConfidence; bounds.tick(ba);
  if (bounds.boundaryCount !== lb) { lb = bounds.boundaryCount; an.hintTrackChange(5000); bl.push(+(tMs / 1000).toFixed(2)); }
  an.hopLane.feed(fr, cfg, an); return fr;
};
let mix, seg;
if (list.wav) {   // en lång inspelning: {wav, facit:[..], t0, t1}
  mix = readWav(ENG + list.wav); seg = [{ f: list.wav, tf: list.facit, t0: 0, t1: mix.length / SR * 1000 }];
} else {
  const FADE = 3 * SR, IN = 2400;
  const clips = list.map(([fs, ...tf]) => ({ f: fs, tf }));
  const song = (fs) => { const parts = fs.map((f) => readClip(ENG + f)); let n = parts.reduce((s, a) => s + a.length, 0) - IN * (parts.length - 1); const o = new Float32Array(n); let at = 0;
    parts.forEach((a, i) => { for (let k = 0; k < a.length; k++) { let g = 1; if (i > 0 && k < IN) g = k / IN; if (i < parts.length - 1 && k >= a.length - IN) g = (a.length - k) / IN; o[at + k] += a[k] * g; } at += a.length - IN; }); return o; };
  const pcm = clips.map((c) => song(c.f)); let total = 0; const starts = [];
  for (let i = 0; i < pcm.length; i++) { starts.push(total); total += pcm[i].length - (i < pcm.length - 1 ? FADE : 0); }
  mix = new Float32Array(total);
  for (let i = 0; i < pcm.length; i++) { const a = pcm[i], s = starts[i], last = i === pcm.length - 1;
    for (let k = 0; k < a.length; k++) { let g = 1; if (i > 0 && k < FADE) g = Math.sin((k / FADE) * Math.PI / 2); if (!last && k >= a.length - FADE) g = Math.cos(((k - (a.length - FADE)) / FADE) * Math.PI / 2); mix[s + k] += a[k] * g; } }
  seg = clips.map((c, i) => ({ f: c.f[0], tf: c.tf, t0: (starts[i] + (i ? FADE : 0)) / SR * 1000, t1: (i < clips.length - 1 ? starts[i + 1] : total) / SR * 1000 }));
}
const H = Math.floor(mix.length / HOP); const buf = new Float32Array(HOP); const STEP = Math.round(100 / HMS); const samp = [];
for (let h = 0; h < H; h++) { buf.set(mix.subarray(h * HOP, h * HOP + HOP)); step(buf, h * HMS);
  if (h % STEP === 0) { const f = FEED; samp.push([+(h * HMS / 1000).toFixed(1), +(cfg.beat?.bpm ?? 0).toFixed(1), +(cfg.beat?.confidence ?? 0).toFixed(2), +(f?.tempoBpm ?? 0).toFixed(1), +(f?.tgClear ?? 0).toFixed(2), +(f?.repeatRate ?? 0).toFixed(2), +(f?.onBeatRate ?? 0).toFixed(2), f?.gridCoasting ? 1 : 0]); } }
const okBpm = (b, tf) => b > 0 && tf.some((t) => Math.abs(fold(b) / t - 1) <= 0.04);
const sib = (b, tf) => b > 0 && !okBpm(b, tf) && tf.some((t) => [2 / 3, 1.5, 0.75, 4 / 3].some((q) => Math.abs(fold(b) / fold(t * q) - 1) <= 0.04));
const per = [];
for (const s of seg) { let n = 0, ok = 0, sb = 0, sbLow = 0, enter = 0, prev = false, run = 0, lock = NaN;
  for (const r of samp) { const t = r[0] * 1000; if (t >= s.t0 && t < s.t1 && isNaN(lock)) { if (okBpm(r[1], s.tf)) { if (++run === 20) lock = (t - 1900 - s.t0) / 1000; } else run = 0; } if (t < s.t0 + 8000 || t >= s.t1) continue; n++; if (okBpm(r[1], s.tf)) ok++; const x = sib(r[1], s.tf); if (x) { sb++; } if (x && !prev) enter++; prev = x; }
  per.push({ f: s.f.split('/').pop(), tf: s.tf, t0: +(s.t0 / 1000).toFixed(1), t1: +(s.t1 / 1000).toFixed(1), ok: +(100 * ok / n).toFixed(1), sib: +(100 * sb / n).toFixed(1), sibIn: enter, lock: isNaN(lock) ? +((s.t1 - s.t0) / 1000).toFixed(1) : +lock.toFixed(1), min: +(n / 600).toFixed(2) }); }
const tot = per.reduce((a, p) => ({ n: a.n + p.min, ok: a.ok + p.ok * p.min, sib: a.sib + p.sib * p.min, inn: a.inn + p.sibIn }), { n: 0, ok: 0, sib: 0, inn: 0 });
const sum = { ok: +(tot.ok / tot.n).toFixed(2), sib: +(tot.sib / tot.n).toFixed(2), sibInPerMin: +(tot.inn / tot.n).toFixed(3), min: +tot.n.toFixed(1), lockMed: per.map((p) => p.lock).sort((a, b) => a - b)[per.length >> 1], bounds: bl };
log(JSON.stringify(sum)); for (const p of per) log(JSON.stringify(p));
writeFileSync(outFile, JSON.stringify({ sum, per, ev, samp, seg: seg.map((s) => ({ f: s.f, tf: s.tf, t0: s.t0, t1: s.t1 })) }));
