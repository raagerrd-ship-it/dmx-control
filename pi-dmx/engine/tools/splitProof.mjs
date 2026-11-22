/** DELAT MOT ODELAT: samma ljud genom en ODELAD analysator och en DELAD i inline-läge, matad som motorn (index.ts):
 *  virtuell klocka (Date.now/performance.now per hop, som dmxDump.mjs), och efter process() taktvägen
 *  (hopLane.feed) eller publishClock. Jämför VARJE fält i ramen, hop för hop.
 *
 *  BASLINJEN (uppmätt 2026-11-21, tools/natt/delning-2026-11-21.md): fälten i VANTAT får skilja, alla andra ska vara lika.
 *  - barShift/beatPhaseMs/beatPhaseConf: DMX läser klockan ur cfg.beat; i delat läge körs publishPhase aldrig (samma lista som livstecken.mjs).
 *  - sektionens fält och det som läser sektionen (drop, basnivå, uppbyggnad): blocken stänger på 10 ms-rutnätet i delat läge mot
 *    2,67 ms i odelat (09-22), och en annan kant tidigt flyttar räknarna för resten av låten.
 *  TRÅDARNA (steg 18): i det delade läget jämförs dessutom varje fackfält med taggen IN eller UT (analyserFack.ts TRAD)
 *  mellan huvudtråden och workern, efter process() i varje hop (tempots IN-fält i recordet R bara i hopp med ett record).
 *  Nya fält och nya taggar kommer med av sig själva. Ett fält som skiljer = taggen ljuger (eller raden i transporten saknas).
 *  Exit 1 om ett fält utanför VANTAT skiljer, eller om ett IN/UT-fält skiljer mellan trådarna.
 *
 *    node tools/splitProof.mjs [--n 3] [--worker] [--dist <mapp>]
 *    SPLIT_DIR=<katalog med 48 kHz wav> (standard tools/ladan-2026-11-13)   SPLIT_MAX_S=120 (0 = hela)
 *    --worker  även en rökning av den RIKTIGA workern i realtidstakt (15 s)
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const N = Number(arg('--n', 3));
const WORKER = process.argv.includes('--worker');
const DIST = resolve(arg('--dist', join(here, '..', 'dist')));
const CORPUS = process.env.SPLIT_DIR || join(here, 'ladan-2026-11-13');
const MAX_S = Number(process.env.SPLIT_MAX_S ?? 120);
const HOP = 128, EPOCH = 1.7e12;

const VANTAT = new Set(['barShift', 'beatPhaseMs', 'beatPhaseConf',
  'section', 'sectionAgeMs', 'sectionIndex', 'sectionTier', 'sectionBars', 'prevSection', 'sectionLevelVsHighDb', 'expectHighInMs',
  'repeatSim', 'repeatAgoMs', 'sectionBuildProg', 'miniDropCount', 'dropDemoted', 'bassLevel',
  'dropMiniBack']);   // steg 30: räknare som ärver sektionens och dropDemoted:s skillnad (öppnar fönstret på dem)

const { createAnalyser } = await import(pathToFileURL(join(DIST, 'analyser.js')).href);
const { defaultConfig } = await import(pathToFileURL(join(DIST, 'config.js')).href);
const { FACK } = await import(pathToFileURL(join(DIST, 'analyserFack.js')).href);
const { R } = await import(pathToFileURL(join(DIST, 'split.js')).href);
const TRAD = [];   // [fack, fält, delfält, tagg, bara i hopp med record]
for (const n in FACK) for (const [k, v] of Object.entries(FACK[n].TRAD)) for (const [j, t] of typeof v === 'string' ? [[null, v]] : Object.entries(v))
  if (t === 'IN' || t === 'UT') TRAD.push([n, k, j, t, t === 'IN' && !!R[n] && k in R[n]]);
const trad = new Map();

function readWav(path) {
  const b = readFileSync(path);
  const ch = b.readUInt16LE(22), rate = b.readUInt32LE(24);
  let off = 12, dataOff = 44, dataLen = b.length - 44;
  while (off + 8 <= b.length) {
    const id = b.toString('ascii', off, off + 4), len = b.readUInt32LE(off + 4);
    if (id === 'data') { dataOff = off + 8; dataLen = len === 0 ? b.length - dataOff : Math.min(len, b.length - dataOff); break; }
    off += 8 + len + (len & 1);
  }
  let n = Math.floor(dataLen / 2 / ch);
  if (MAX_S > 0) n = Math.min(n, Math.floor(MAX_S * rate));
  const y = new Float32Array(n);
  for (let i = 0; i < n; i++) { let s = 0; for (let c = 0; c < ch; c++) s += b.readInt16LE(dataOff + (i * ch + c) * 2); y[i] = s / ch / 32768; }
  return { y, rate };
}
function flat(o, p, out) {
  for (const k in o) { const v = o[k];
    if (v && typeof v === 'object' && !ArrayBuffer.isView(v) && !Array.isArray(v)) flat(v, p + k + '.', out);
    else out[p + k] = ArrayBuffer.isView(v) || Array.isArray(v) ? Array.from(v).join(',') : v; }
  return out;
}
function makeCfg(rate) { const cfg = JSON.parse(JSON.stringify(defaultConfig)); cfg.audio.rate = rate; cfg.fft.hop = HOP; return cfg; }
/** Ett hop som motorn: klockan, process, taktvägen eller publishClock. */
function step(an, ck, buf, ms) {
  an.setVirtualClock(ms); Date.now = () => ms; performance.now = () => ms - EPOCH;
  const f = an.process(buf), w = an.inlinePeer;
  if (w) { const rec = an.fastWriteSeq() !== an.__rec; an.__rec = an.fastWriteSeq();
    for (const [n, k, j, t, perRec] of TRAD) { if (perRec && !rec) continue;
      const a = j ? an.f[n][k][j] : an.f[n][k], b = j ? w.f[n][k][j] : w.f[n][k];
      if (!Object.is(a, b)) { const id = `${t} ${n}.${k}${j ? '.' + j : ''}`; trad.set(id, (trad.get(id) ?? 0) + 1); } } }
  if (an.hopLane) an.hopLane.feed(f, ck, an); else an.publishClock(ck);
  return f;
}
function run(y, rate, mode) {
  process.env.DMX_ANALYSER_SPLIT = mode;
  const an = createAnalyser(makeCfg(rate)); an.setGainLock(true, 1);
  const ck = { beat: undefined, beatErr: undefined }, buf = new Float32Array(HOP), out = [];
  for (let h = 0; (h + 1) * HOP <= y.length; h++) { buf.set(y.subarray(h * HOP, (h + 1) * HOP)); out.push(flat(step(an, ck, buf, EPOCH + h * HOP / rate * 1000), '', {})); }
  return out;
}

const realNow = Date.now, realPerf = performance.now.bind(performance), realLog = console.log;
const files = readdirSync(CORPUS).filter((f) => f.endsWith('.wav') && !f.includes('lagad')).sort().slice(0, N);
if (!files.length) { console.error(`inga .wav i ${CORPUS} - sätt SPLIT_DIR`); process.exit(2); }
const diff = new Map(); let totHops = 0;
for (const f of files) {
  const { y, rate } = readWav(join(CORPUS, f));
  console.log = () => {};
  const A = run(y, rate, ''), B = run(y, rate, 'inline');
  console.log = realLog;
  const keys = new Set([...Object.keys(A[A.length - 1]), ...Object.keys(B[B.length - 1])]);
  for (const k of keys) { let d = 0, first = -1; for (let i = 0; i < A.length; i++) if (A[i][k] !== B[i][k]) { d++; if (first < 0) first = i; }
    if (d) { const s = diff.get(k) ?? { d: 0, first: Infinity, file: f }; s.d += d; if (first * HOP / rate < s.first) { s.first = first * HOP / rate; s.file = f; } diff.set(k, s); } }
  totHops += A.length;
  console.log(`${f.slice(0, 40).padEnd(40)} hop ${A.length}`);
}
Date.now = realNow; performance.now = realPerf;
let bad = 0;
for (const [k, s] of [...diff].sort((a, b) => b[1].d - a[1].d)) {
  const ok = VANTAT.has(k); if (!ok) bad++;
  console.log(`${ok ? 'väntat ' : 'FEL    '} ${k.padEnd(24)} ${(100 * s.d / totHops).toFixed(2).padStart(6)} %   första ${s.first.toFixed(2)} s (${s.file.slice(0, 28)})`);
}
for (const [id, d] of trad) console.log(`FEL tråd ${id.padEnd(30)} ${d} hop: huvudtråden och workern skiljer`);
const nIn = TRAD.filter((x) => x[3] === 'IN').length, nUt = TRAD.length - nIn;
console.log(`\nSUMMA ${files.length} filer, ${totHops} hop: ${diff.size} fält skiljer, varav ${bad} utanför baslinjen; trådarna ${nIn} IN + ${nUt} UT, ${trad.size} skiljer -> ${bad || trad.size ? 'DELNING FEL' : 'DELNING OK'}`);
if (bad || trad.size) process.exitCode = 1;

if (WORKER) {
  const { y, rate } = readWav(join(CORPUS, files[0]));
  process.env.DMX_ANALYSER_SPLIT = 'worker';
  const an = createAnalyser(makeCfg(rate)); an.setGainLock(true, 1);
  const ck = { beat: undefined, beatErr: undefined }, buf = new Float32Array(HOP); let h = 0; const t0 = performance.now(); let lastBpm = 0;
  await new Promise((res) => {
    const iv = setInterval(() => {
      const want = Math.floor((performance.now() - t0) / 1000 * rate / HOP);
      while (h < want && (h + 1) * HOP <= y.length) { buf.set(y.subarray(h * HOP, (h + 1) * HOP)); const f = an.process(buf); if (an.hopLane) an.hopLane.feed(f, ck, an); lastBpm = f.bpm; h++; }
      if (performance.now() - t0 > 15000 || (h + 1) * HOP > y.length) { clearInterval(iv); res(); }
    }, 5);
  });
  console.log(`\nWORKER-RÖKNING ${files[0]}: ${h} hop på 15 s, bpm ${lastBpm}, stats ${JSON.stringify(an.getSplitStats?.() ?? an.hopLane?.stats())}`);
  an.__stopWorker?.();
}
