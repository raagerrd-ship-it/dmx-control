// SKRAPBANKEN FOR DMX (2026-10-01, portad fran lotus tools/skrap): kor HELA motorn (dist/index.js) offline med falsk
// arecord (WAV -> S16 stereo-perioder om 128 ramar), falsk dmx-helper-socket (varje ram som skickas fangas), falsk
// SPI-ring och falsk BLE-sidecar. Env = kodens standard + tools/ladan.py SHOW_ENV (last via import, inte regex) och
// ladans config.json (kopia; motorn far skriva i kopian).
//
//   node [--max-old-space-size=96 --min-semi-space-size=4 --max-semi-space-size=4 --trace-gc] tools/skrap/dmxRun.mjs
//        --cfg <config.json> --wav a.wav[,b.wav] [--secs 600] [--mode virtual|real] [--split inline|worker]
//        [--dist <dist-katalog>] [--frames ut.tsv] [--profile WARM:SECS --profout ut.heapprofile] [--env K=V ...]
//
// virtual (standard): VIRTUELL klocka (Date.now/performance.now/setTimeout/setInterval) -> deterministiskt; ljudet
//   matas period for period och timrarna (renderrastret 200 Hz, fallback 50 Hz, ring 30 Hz, halsa 1 Hz) kors i ratt
//   ordning mellan perioderna. --frames skriver varje DMX-ram (virtuell ms + hex) = beviset for oforandrad show.
// real: realtid med riktiga timrar (1 ms timerupplosning via koffi pa Windows, KOFFI_DIR), analysatorn i worker som
//   pa Pi:n och uppvarmningen pa. For GC-matning (--trace-gc) och allokering i ett varmt fonster.
import { createRequire, register, syncBuiltinESMExports } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { EventEmitter } from 'node:events';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ENGINE = path.resolve(HERE, '..', '..');
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const MODE = opt('--mode', 'virtual'), SECS = Number(opt('--secs', 600));
const SPLIT = opt('--split', MODE === 'virtual' ? 'inline' : 'worker');
const FRAMES = opt('--frames', null), PROF = opt('--profile', null);
const WAVS = String(opt('--wav', '')).split(',').filter(Boolean);
const CFG = opt('--cfg', null);
if (!WAVS.length || !CFG) { console.error('ange --wav och --cfg'); process.exit(2); }

// ---- ENV: kodens standard + ladans SHOW_ENV (ur ladan.py via import) ----
const showEnv = JSON.parse(execFileSync('python', ['-c', 'import json,ladan;print(json.dumps([[k,v] for k,v,_ in ladan.SHOW_ENV]))'], { cwd: path.join(ENGINE, 'tools'), encoding: 'utf8' }));
for (const [k, v] of showEnv) process.env[k] = v;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dmxskrap-'));
fs.copyFileSync(CFG, path.join(tmp, 'config.json'));
Object.assign(process.env, {
  NODE_ENV: 'production', UV_THREADPOOL_SIZE: '2', PORT: '0', CONFIG_PATH: path.join(tmp, 'config.json'),
  DMX_ANALYSER_SPLIT: SPLIT, DMX_WARMUP: MODE === 'virtual' ? '0' : path.join(ENGINE, 'warmup', 'warmup.wav'),
});
for (let i = 0; i < argv.length; i++) if (argv[i] === '--env') { const [k, ...v] = argv[i + 1].split('='); process.env[k] = v.join('='); }
process.stderr.write(`[bank] mode=${MODE} split=${SPLIT} secs=${SECS} env: ${showEnv.map(([k, v]) => k + '=' + v).join(' ')}\n`);

// ---- LJUDET: WAV:arna i foljd (loopar), mono 16-bit 48 kHz -> stereo S16 (L=R) ----
const SR = 48000, PERIOD = 128, PMS = PERIOD / SR * 1000;
const wavs = WAVS.map((p) => {
  const b = fs.readFileSync(p); let off = 12, d = 44;
  while (off + 8 <= b.length) { const id = b.toString('ascii', off, off + 4), len = b.readUInt32LE(off + 4); if (id === 'data') { d = off + 8; break; } off += 8 + len + (len & 1); }
  if (b.readUInt32LE(24) !== SR || b.readUInt16LE(22) !== 1 || b.readUInt16LE(34) !== 16) throw new Error('kraver 48 kHz mono 16-bit: ' + p);
  return new Int16Array(b.buffer.slice(b.byteOffset + d, b.byteOffset + b.length - ((b.length - d) & 1)));
});
let wi = 0, wpos = 0;
function nextPeriod() {   // en NY Buffer per period, som strommen fran arecord-pipen
  const out = Buffer.allocUnsafe(PERIOD * 4);
  for (let k = 0; k < PERIOD; k++) {
    if (wpos >= wavs[wi].length) { wi = (wi + 1) % wavs.length; wpos = 0; }
    const v = wavs[wi][wpos++];
    out.writeInt16LE(v, 4 * k); out.writeInt16LE(v, 4 * k + 2);
  }
  return out;
}

// LEVERANSMONSTER: standard en period per 'data' (som arecord --period-size=128 skriver). --klump: pipen levererar i
// pseudoslumpade bitar (1..2000 byte, aven udda granser, deterministiskt fro) - provar leftover-/concat-vagen i audio.ts.
const KLUMP = argv.includes('--klump');
let kq = [], kqLen = 0, kseed = 12345;
function deliver(per) {
  if (!KLUMP) { if (arecord) arecord.stdout.emit('data', per); return; }
  kq.push(per); kqLen += per.length;
  kseed = (Math.imul(kseed, 1103515245) + 12345) >>> 0;
  const want = 1 + (kseed >>> 8) % 2000;
  if (kqLen < want) return;
  const all = Buffer.concat(kq); kq = []; kqLen = 0;
  let o = 0;
  while (o < all.length) { kseed = (Math.imul(kseed, 1103515245) + 12345) >>> 0; const n = Math.min(all.length - o, 1 + (kseed >>> 8) % 1500); const piece = Buffer.from(all.subarray(o, o + n)); o += n; if (arecord) arecord.stdout.emit('data', piece); }
}

// ---- VIRTUELL KLOCKA OCH TIMRAR ----
const EPOCH = 1_790_000_000_000;
let vnow = EPOCH;
const realSetImmediate = setImmediate;
const tick = () => new Promise((r) => realSetImmediate(r));
let timers = [], tseq = 0;
if (MODE === 'virtual') {
  Date.now = () => Math.floor(vnow);
  performance.now = () => vnow - EPOCH + 1000;
  class VT {
    constructor(fn, args, ms, iv) { this.fn = fn; this.args = args; this.iv = iv; this.on = true; this.ms = ms; this.at(vnow + ms); }
    at(t) { this.t = t; this.seq = ++tseq; let i = timers.length; timers.push(this); while (i > 0 && (timers[i - 1].t > t || (timers[i - 1].t === t && timers[i - 1].seq > this.seq))) { timers[i] = timers[i - 1]; i--; } timers[i] = this; }
    unref() { return this; } ref() { return this; } hasRef() { return true; }
    refresh() { clear(this); this.on = true; this.at(vnow + this.ms); return this; }
    close() { clear(this); return this; }
    [Symbol.toPrimitive]() { return this.seq; }
  }
  const delay = (ms) => { ms = Number(ms); return ms >= 1 && ms <= 2147483647 ? ms : 1; };
  const clear = (t) => { if (t && t instanceof VT) { t.on = false; const i = timers.indexOf(t); if (i >= 0) timers.splice(i, 1); } };
  globalThis.setTimeout = (fn, ms, ...a) => new VT(fn, a, delay(ms), false);
  globalThis.setInterval = (fn, ms, ...a) => new VT(fn, a, delay(ms), true);
  globalThis.clearTimeout = clear; globalThis.clearInterval = clear;
}
function runUntil(T) {
  while (timers.length && timers[0].t <= T) {
    const t = timers.shift(); if (t.t > vnow) vnow = t.t;
    if (t.iv) t.at(t.t + t.ms); else t.on = false;
    t.fn(...t.args);
  }
}

// ---- FALSKA PROCESSER/SOCKETAR (child_process, net) ----
const cp = require('node:child_process'), net = require('node:net');
let arecord = null;
class FakeProc extends EventEmitter {
  constructor(cmd) { super(); this.cmd = cmd; this.pid = 4242; this.stdout = new EventEmitter(); this.stderr = new EventEmitter(); this.killed = false; }
  kill() { this.killed = true; if (this === arecord) arecord = null; return true; }
}
cp.spawn = (cmd) => { const p = new FakeProc(cmd); if (cmd === 'arecord') arecord = p; return p; };
const frameLog = FRAMES ? fs.openSync(FRAMES, 'w') : null; let frameBuf = [], nFrames = 0;
const md5 = crypto.createHash('md5');
class FakeDmxSocket extends EventEmitter {
  constructor() { super(); this.writableLength = 0; }
  connect() { setTimeout(() => this.emit('connect'), 1); return this; }
  write(b) {
    nFrames++;
    md5.update(b);
    if (frameLog) { frameBuf.push(`${(vnow - EPOCH).toFixed(3)}\t${Buffer.from(b).toString('hex')}`); if (frameBuf.length >= 4000) { fs.writeSync(frameLog, frameBuf.join('\n') + '\n'); frameBuf = []; } }
    return true;
  }
  destroy() {}
}
net.Socket = FakeDmxSocket;
net.createConnection = () => { const s = new EventEmitter(); s.write = () => true; s.destroy = () => {}; setTimeout(() => { s.emit('error', new Error('ingen ble-sidecar')); s.emit('close'); }, 1); return s; };
syncBuiltinESMExports();
register('./hooks.mjs', import.meta.url);   // spi-device -> falsk

if (MODE === 'real') {
  try { require(path.join(process.env.KOFFI_DIR || '', 'node_modules', 'koffi')).load('winmm.dll').func('uint32 __stdcall timeBeginPeriod(uint32)')(1); }
  catch (e) { process.stderr.write('timeBeginPeriod: ' + e.message + '\n'); }
}
const logs = [];
const origWarn = console.warn.bind(console), origErr = console.error.bind(console);
console.warn = (...a) => { logs.push('W ' + a.join(' ')); };
console.error = (...a) => { logs.push('E ' + a.join(' ')); };

// ---- STARTA MOTORN ----
let ready = false;
const DIST = path.resolve(opt('--dist', path.join(ENGINE, 'dist')));
const imp = import(pathToFileURL(path.join(DIST, 'index.js')).href).then(() => { ready = true; }, (e) => { origErr('import fel', e); process.exit(1); });
for (let i = 0; !ready; i++) {
  await tick();
  if (MODE === 'virtual') { runUntil(vnow); if (i > 200 && timers.length) { vnow = timers[0].t; runUntil(vnow); } }
  if (i > 200000) { origErr('motorn startade aldrig'); process.exit(1); }
}
await imp;
process.stderr.write(`[bank] motorn uppe (vnow+${(vnow - EPOCH).toFixed(0)} ms)\n`);

// ---- PROFIL (samplad allokering, skrap inraknat) ----
let post = null, profT0 = 0;
const [PW, PS] = PROF ? PROF.split(':') : [];
const PO = opt('--profout', 'alloc.heapprofile');
let profStarted = false;
async function startProf() {
  const inspector = await import('node:inspector');
  const s = new inspector.Session(); s.connect();
  post = (m, p) => new Promise((r, j) => s.post(m, p ?? {}, (e, x) => (e ? j(e) : r(x))));
  await post('HeapProfiler.enable');
  await post('HeapProfiler.startSampling', { samplingInterval: Number(process.env.PROF_INTERVAL ?? 512), includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
}
async function stopProf(secs) {
  const { profile } = await post('HeapProfiler.stopSampling');
  fs.writeFileSync(PO, JSON.stringify(profile));
  process.stderr.write(`[bank] profil ${secs.toFixed(1)} s -> ${PO}\n`);
}
const mem = () => { const m = process.memoryUsage(); return `rss ${(m.rss / 1048576).toFixed(1)} heapUsed ${(m.heapUsed / 1048576).toFixed(1)} heapTotal ${(m.heapTotal / 1048576).toFixed(1)} MB`; };

// ---- OPTSTAT=1: andel av tiden de heta funktionerna ar TurboFan-optimerade (sampling var 50 ms, virtuell tid) ----
let optSamp = null;
if (process.env.OPTSTAT && MODE === 'virtual') {
  const os = new Function('f', 'return %GetOptimizationStatus(f)');
  const E = await import(pathToFileURL(path.join(DIST, 'effects.js')).href), A = await import(pathToFileURL(path.join(DIST, 'analyser.js')).href);
  const fns = [['EffectEngine.render', E.EffectEngine.prototype.render], ['Analyser.process', A.Analyser.prototype.process]];
  optSamp = fns.map(([n]) => ({ n, per10: [] }));
  let k = 0;
  setInterval(() => { const b = Math.floor(k++ / 200); fns.forEach(([, f], i) => { const st = os(f); const a = (optSamp[i].per10[b] ??= [0, 0]); a[1]++; if (st & 64) a[0]++; }); }, 50);
}

// ---- MEMDUMP=N: minnets sammansattning var N:e ljudsekund (RSS, V8-heapens rum, externt/ArrayBuffers, V8:s malloc) ----
const v8m = await import('node:v8');
function memDump(tag) {
  const m = process.memoryUsage(), h = v8m.getHeapStatistics(), sp = {};
  for (const x of v8m.getHeapSpaceStatistics()) sp[x.space_name.replace('_space', '')] = +(x.space_size / 1048576).toFixed(1);
  process.stderr.write(`[memdump] ${tag} ${JSON.stringify({ rss: +(m.rss / 1048576).toFixed(1), heapTotal: +(m.heapTotal / 1048576).toFixed(1), heapUsed: +(m.heapUsed / 1048576).toFixed(1), external: +(m.external / 1048576).toFixed(1), arrayBuffers: +(m.arrayBuffers / 1048576).toFixed(1), malloced: +(h.malloced_memory / 1048576).toFixed(1), peakMalloced: +(h.peak_malloced_memory / 1048576).toFixed(1), spaces: sp })}
`);
}
const MEMDUMP = Number(process.env.MEMDUMP || 0);
if (MEMDUMP) memDump('t=0');

// ---- KOR ----
const total = Math.floor(SECS * 1000 / PMS);
if (MODE === 'virtual') {
  const t0 = vnow;
  for (let p = 0; p < total; p++) {
    const tp = t0 + (p + 1) * PMS;
    runUntil(tp); vnow = tp;
    const st = (vnow - t0) / 1000;
    if (PROF && !profStarted && st >= +PW) { profStarted = true; await startProf(); profT0 = st; process.stderr.write(`=== PROF START ${st.toFixed(0)} s\n`); }
    if (PROF && post && profT0 >= 0 && st >= +PW + +PS) { await stopProf(st - profT0); profT0 = -1; process.stderr.write(`=== PROF END\n`); }
    deliver(nextPeriod());
    if (MEMDUMP && p % (375 * MEMDUMP) === 0) memDump(`t=${st.toFixed(0)}`);
    if (p % 375 === 0) await tick();   // I/O (fastify m.m.) far ga
    if (process.env.MEMLOG && p % (375 * Number(process.env.MEMLOG)) === 0 && globalThis.gc) { globalThis.gc(); process.stderr.write(`[mem] t=${st.toFixed(0)} s levande efter full GC: ${mem()}
`); }
    if (process.env.TMARK && p % 3750 === 0) process.stdout.write(`=== T ${st.toFixed(0)}
`);
  }
} else {
  // REALTID: perioderna levereras i den takt de "spelats in" (klump om 1-4 perioder som pipen ger), timrarna ar riktiga.
  const wall0 = performance.now(); let p = 0;
  await new Promise((done) => {
    const pump = () => {
      const st = (performance.now() - wall0) / 1000;
      const due = Math.min(total, Math.floor((performance.now() - wall0) / PMS));
      while (p < due) { deliver(nextPeriod()); p++; if (MEMDUMP && p % (375 * MEMDUMP) === 0) memDump(`t=${(p * PMS / 1000).toFixed(0)}`); if (process.env.TMARK && p % 3750 === 0) process.stdout.write(`=== T ${(p * PMS / 1000).toFixed(0)}
`); }
      if (PROF && !profStarted && st >= +PW) { profStarted = true; profT0 = st; startProf().then(() => process.stderr.write(`=== PROF START ${st.toFixed(0)} s\n`)); }
      if (PROF && post && profT0 >= 0 && st >= +PW + +PS) { const d = st - profT0; profT0 = -1; stopProf(d).then(() => process.stderr.write('=== PROF END\n')); }
      if (p >= total) return done();
      setTimeout(pump, 1);
    };
    pump();
  });
}
if (process.env.OPTSTAT) {   // node --allow-natives-syntax: optimeringsstatus for de heta funktionerna (bit 4 = TurboFan, 5 = Maglev? se v8 OptimizationStatus)
  const os = new Function('f', 'return %GetOptimizationStatus(f)');
  const E = await import(pathToFileURL(path.join(DIST, 'effects.js')).href), A = await import(pathToFileURL(path.join(DIST, 'analyser.js')).href);
  for (const [n, f] of [['EffectEngine.render', E.EffectEngine.prototype.render], ['Analyser.process', A.Analyser.prototype.process]]) process.stderr.write(`[opt] ${n} ${os(f).toString(2)}
`);
}
if (optSamp) for (const o of optSamp) process.stderr.write(`[opt] ${o.n} TurboFan-andel per 10 s: ${o.per10.map((a) => Math.round(100 * a[0] / a[1])).join(' ')}
`);
if (frameLog) { if (frameBuf.length) fs.writeSync(frameLog, frameBuf.join('\n') + '\n'); fs.closeSync(frameLog); }
if (post && profT0 >= 0) await stopProf(SECS - profT0);
process.stderr.write(`[bank] klart: ${nFrames} DMX-ramar, md5 ${md5.digest('hex')}, ${mem()}\n`);
const lf = opt('--logs', null); if (lf) fs.writeFileSync(lf, logs.join('\n') + '\n');
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(0);
