/** IDENTITETSBEVIS FÖR TAKTVÄGEN (2026-11-08, split.ts TAKTVÄGEN, profilens BEAT_FEED 'slow') - i stil med splitProof.mjs.
 *
 *  Kör samma ljud hop för hop genom två motorkedjor (analysator + låtgräns + taktmatning, som index.ts/dmxDump.mjs) och jämför
 *  per hop det taktmatningen lämnar: cfg.beat (finns/null/osatt, ankare, bpm, konfidens - ettan och coasten ligger i ankaret och
 *  konfidensen), cfg.beatErr, frame.bpmConfidence efter matningen, analysatorns eget rutnät (beatSrc.beat) och HELA ramen (plattad).
 *  KRAVET: 0 avvikelser.
 *
 *    node tools/feedProof.mjs --a <dist>:<läge> --b <dist>:<läge> [--secs 0] <wav> ...
 *    läge: odelad | inline | sync (riktiga workern i lås-steg) | inline-main (delad analysator, taktmatningen i huvudtråden)
 *    Standard: --a dist:inline --b dist:sync (workern mot inline).
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const A = opt('--a', 'dist:inline'), B = opt('--b', 'dist:sync'), SECS = Number(opt('--secs', 0));
const wavs = argv.filter((a, i) => a.endsWith('.wav') && !['--a', '--b', '--secs'].includes(argv[i - 1]));
if (!wavs.length) { console.error('ange minst en wav'); process.exit(2); }
const SR = 48000, HOP = 128, EPOCH = 1700000000000;

function readWav(path) {
  const d = readFileSync(path); let p = 12, dataOff = 44, dataLen = d.length - 44;
  while (p + 8 <= d.length) { const id = d.toString('ascii', p, p + 4), sz = d.readUInt32LE(p + 4); if (id === 'data') { dataOff = p + 8; dataLen = Math.min(sz || d.length, d.length - p - 8); break; } p += 8 + sz + (sz & 1); }
  const n = dataLen >> 1, y = new Float32Array(n); for (let i = 0; i < n; i++) y[i] = d.readInt16LE(dataOff + i * 2) / 32768;
  return y;
}
const mods = new Map();
async function load(dist) {
  if (mods.has(dist)) return mods.get(dist);
  const imp = (f) => import(pathToFileURL(resolve(dist, f)).href);
  const m = { ...(await imp('analyser.js')), ...(await imp('beatFeed.js')), ...(await imp('config.js')), ...(await imp('boundaryDetector.js')) };
  mods.set(dist, m); return m;
}
async function make(spec) {
  const [dist, mode] = spec.split(':'); const m = await load(dist);
  const acfg = JSON.parse(JSON.stringify(m.defaultConfig));
  let an;
  if (mode === 'odelad') an = new m.Analyser(acfg);
  else {
    process.env.DMX_ANALYSER_SPLIT = 'inline';
    if (mode === 'inline-main') process.env.DMX_BEAT_FEED = ''; else delete process.env.DMX_BEAT_FEED;
    an = m.createAnalyser(acfg, mode === 'sync' ? 'sync' : undefined);
    delete process.env.DMX_BEAT_FEED;
  }
  an.setGainLock(true, 1);
  const cfg = JSON.parse(JSON.stringify(m.defaultConfig));
  const bounds = new m.BoundaryDetector(() => Date.now()); an.setSpectrumSink((mag, binHz) => bounds.pushSpectrum(mag, binHz));
  return { spec, an, cfg, feed: new m.BeatFeed(), bounds, ba: { level: 0, bpm: 0, bpmConfidence: 0 }, lb: 0, lane: !!an.hopLane };
}
function flat(f, out, pre = '') {
  for (const k of Object.keys(f)) { const v = f[k]; if (v && typeof v === 'object') flat(v, out, pre + k + '.'); else out[pre + k] = v; }
  return out;
}
const same = (a, b) => Object.is(a, b) || a === b;
const beatCode = (b) => (b ? 1 : b === null ? -1 : 0);

console.log = () => {};
const out = (s) => process.stdout.write(s + '\n');
let totHops = 0, totFeed = 0, totFrame = 0;
for (const w of wavs) {
  const y = readWav(w); const X = [await make(A), await make(B)];
  const buf = new Float32Array(HOP); const n = SECS > 0 ? Math.min(y.length, SECS * SR) : y.length;
  let hops = 0, feedBad = 0, frameBad = 0; const firsts = []; const fields = new Map();
  for (let off = 0; off + HOP <= n; off += HOP, hops++) {
    for (let i = 0; i < HOP; i++) buf[i] = y[off + i];
    const ms = EPOCH + off / SR * 1000; const res = [];
    for (const S of X) {
      S.an.setVirtualClock(ms); Date.now = () => ms; performance.now = () => ms - EPOCH;
      const fr = S.an.process(buf); S.ba.level = fr.level; S.ba.bpm = fr.bpm; S.ba.bpmConfidence = fr.bpmConfidence; S.bounds.tick(S.ba);
      if (S.bounds.boundaryCount !== S.lb) { S.lb = S.bounds.boundaryCount; S.an.hintTrackChange(5000); }
      if (S.an.hopLane) S.an.hopLane.feed(fr, S.cfg, S.an); else S.feed.update(fr, S.cfg, S.an);
      const b = S.cfg.beat, g = S.an.beatSrc?.beat;
      res.push({ feed: [beatCode(b), b?.anchorMs, b?.bpm, b?.confidence, S.cfg.beatErr, fr.bpmConfidence, beatCode(g), g?.anchorMs, g?.bpm], frame: flat(fr, {}) });
    }
    const [a, c] = res;
    const FN = ['beat', 'anchorMs', 'bpm', 'confidence', 'beatErr', 'frame.bpmConfidence', 'grid', 'grid.anchorMs', 'grid.bpm'];
    let bad = false;
    for (let i = 0; i < FN.length; i++) if (!same(a.feed[i], c.feed[i])) { bad = true; fields.set(FN[i], (fields.get(FN[i]) || 0) + 1); if (firsts.length < 5) firsts.push(`t=${(off / SR).toFixed(3)} ${FN[i]}: A ${a.feed[i]} B ${c.feed[i]}`); }
    if (bad) feedBad++;
    let fb = false;
    for (const k of Object.keys(a.frame)) if (!same(a.frame[k], c.frame[k])) { fb = true; fields.set('ram.' + k, (fields.get('ram.' + k) || 0) + 1); if (firsts.length < 5) firsts.push(`t=${(off / SR).toFixed(3)} ram.${k}: A ${a.frame[k]} B ${c.frame[k]}`); }
    if (fb) frameBad++;
  }
  const st = X.map((S) => S.an.hopLane?.stats?.());
  for (const S of X) S.an.__stopWorker?.();
  totHops += hops; totFeed += feedBad; totFrame += frameBad;
  out(`${w.split(/[\\/]/).pop()}: ${hops} hop, taktmatning olika ${feedBad}, ram olika ${frameBad}  [A ${A} lane=${X[0].lane}, B ${B} lane=${X[1].lane}]` +
    (fields.size ? `\n  fält: ${[...fields.entries()].sort((p, q) => q[1] - p[1]).slice(0, 10).map(([k, v]) => k + ' ' + v).join(', ')}\n  ${firsts.join('\n  ')}` : '') +
    (st[1] ? `\n  B taktväg: ${JSON.stringify(st[1])}` : ''));
}
out(`SUMMA ${wavs.length} filer, ${totHops} hop: taktmatning olika ${totFeed}, ram olika ${totFrame}`);
process.exit(totFeed || totFrame ? 1 : 0);
