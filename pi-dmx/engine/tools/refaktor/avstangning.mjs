// AVSTÄNGNINGSPROVET (flytten steg 14, med flit inte byte-identiskt): en sten i taget byts mot off(...) i en kopia av src
// under .arena/flytten/s14/av/<sten>, byggs i DMX- och lotusprofil och körs odelad, inline och inline med omstart (ny långsam sida var 60:e s).
// Krav per ruta: stenens ramfält har sitt neutrala värde, inget ramfält NaN eller annan typeof än i påslaget bygge, inget undantag,
// loggraden "[analysator] sten av: <namn>" syns; för sektionen 0 [dropcalm]-rader med DROP_TRACE. Kontroll: samma prov på påslaget bygge ska fälla.
//   node tools/refaktor/avstangning.mjs [sek] [wav] [--sten <namn>]   (sektionens [dropcalm]-kontroll biter på lang-20261113T151659.wav: 6 rader påslaget)
//   node tools/refaktor/avstangning.mjs --kor <dist> <mall-dist> <sten> <dmx|lotus> <sek> <wav>    (ett bygge, tre lägen, JSON sist)
import { readFileSync, rmSync, mkdirSync, cpSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { execSync, spawn } from 'node:child_process';

const ENGINE = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const LP = resolve(ENGINE, '../../../lotus-light-link/pi/src/audio-analyser/analyserProfile.ts');
const STENAR = {   // namn i off(): [fält i Analyser, klass, fack, har neutral()]
  kick: ['kicks', 'KickDetector', 'kick', true], bas: ['bass', 'BassTracker', 'bass', true], drop: ['drop', 'DropDetector', 'drop', false],
  uppbyggnad: ['riser', 'RiserDetector', 'riser', false], 'karaktär': ['character', 'CharacterProfile', 'character', false],
  sektion: ['sections', 'SectionTracker', 'section', true],
};
const NEUTRAL = {   // ramfält som stenen äger -> neutralt värde
  kick: { kick: false, kickAtMs: 0, kickAnchorMs: 0, 'drum.kick': 0 },
  bas: { bassEnergy: 0, bassEnergyShort: 0, bassLevel: 1 },
  drop: { dropCount: 0, miniDropCount: 0, dropBuildCount: 0, dropDemoted: 0, dropSpaced: 0, nearDropDb: 0, nearDipDb: 0, liftDb: 0, stopCount: 0, stopS: 0 },
  uppbyggnad: { buildUp: 0, inRiser: false },
  'karaktär': { 'profile.punch': 0.4, 'profile.bass': 0.5, 'profile.bright': 0.3, 'profile.beat': 0.5, 'profile.bassline': 0 },
  sektion: { section: '', sectionAgeMs: 0, sectionIndex: 0, sectionTier: 1, repeatSim: 0, repeatAgoMs: 0, expectHighInMs: -1, prevSection: '', sectionLevelVsHighDb: 0, sectionBars: 0, sectionBuildProg: 0 },
};
const argv = process.argv.slice(2);

if (argv[0] === '--kor') await kor(...argv.slice(1)); else await driver();

async function driver() {
  const si = argv.indexOf('--sten'), BARA = si >= 0 ? argv.splice(si, 2)[1] : null;
  for (const k of Object.keys(STENAR)) if (BARA && k !== BARA) delete STENAR[k];
  const SECS = /^\d+$/.test(argv[0] ?? '') ? argv.shift() : '700';
  const WAV = argv[0] ?? join(ENGINE, 'tools/ladan-2026-11-13/lang-20261113T160345.wav');
  const ROOT = join(ENGINE, '.arena/flytten/s14/av');
  const sh = (c) => execSync(c, { cwd: ENGINE, stdio: ['ignore', 'pipe', 'inherit'] }).toString();
  const lotus = (dist, out) => {   // som bevis.sh lp(): samma bygge med lotus profilfil
    rmSync(out, { recursive: true, force: true }); cpSync(dist, out, { recursive: true });
    sh(`npx tsc "${LP}" --outDir "${out}" --target es2022 --module nodenext --moduleResolution nodenext --skipLibCheck --types node`);
    if (!readFileSync(join(out, 'analyserProfile.js'), 'utf8').includes("envPrefix: 'LOTUS_'")) throw new Error('lotusbygge ' + out);
  };
  const byggen = { 'på': { dmx: join(ENGINE, 'dist'), lotus: join(ROOT, 'pa-lotus') } };
  lotus(byggen['på'].dmx, byggen['på'].lotus);
  for (const [namn, [falt, cls, fack, neu]] of Object.entries(STENAR)) {
    const d = join(ROOT, namn.replace('ä', 'a'));
    rmSync(d, { recursive: true, force: true }); mkdirSync(d, { recursive: true });
    cpSync(join(ENGINE, 'src'), join(d, 'src'), { recursive: true }); cpSync(join(ENGINE, 'tsconfig.json'), join(d, 'tsconfig.json'));
    const p = join(d, 'src/analyser.ts'), s = readFileSync(p, 'utf8');
    const rad = `readonly ${falt}: ${cls} | null = new ${cls}(this.f, this.f.${fack});`;
    if (s.split(rad).length !== 2) throw new Error('kedjeraden saknas: ' + rad);
    writeFileSync(p, s.replace(rad, `readonly ${falt}: ${cls} | null = off('${namn}', this.f.${fack});`));
    sh(`npx tsc -p "${join(d, 'tsconfig.json')}"`);
    byggen[namn] = { dmx: join(d, 'dist'), lotus: join(d, 'lotus') };
    lotus(byggen[namn].dmx, byggen[namn].lotus);
    console.log(`byggt: ${namn}`);
  }
  const jobb = [];
  for (const namn of Object.keys(STENAR)) for (const prof of ['dmx', 'lotus']) {
    jobb.push({ namn, prof, bygge: namn }); jobb.push({ namn, prof, bygge: 'på' });
  }
  const res = await pool(jobb, 4, (j) => new Promise((ok) => {
    const c = spawn(process.execPath, [fileURLToPath(import.meta.url), '--kor', byggen[j.bygge][j.prof], byggen['på'][j.prof], j.namn, j.prof, SECS, WAV], { cwd: ENGINE });
    let out = ''; c.stdout.on('data', (b) => out += b); c.stderr.on('data', (b) => out += b);
    c.on('close', () => { const l = out.trim().split('\n').pop(); try { ok({ ...j, r: JSON.parse(l) }); } catch { ok({ ...j, r: null, out }); } });
  }));
  let fel = 0, kontrollFel = 0;
  console.log(`\nAVSTÄNGNINGSPROVET ${SECS} s ${WAV.split(/[\\/]/).pop()}`);
  console.log('sten        profil  läge     hop     ej neutralt  NaN  typeof  undantag  loggrad  dropcalm  | kontroll (på): ej neutralt / dropcalm');
  for (const namn of Object.keys(STENAR)) for (const prof of ['dmx', 'lotus']) {
    const a = res.find((x) => x.namn === namn && x.prof === prof && x.bygge === namn), k = res.find((x) => x.namn === namn && x.prof === prof && x.bygge === 'på');
    if (!a.r) { console.log(`${namn} ${prof}: KÖRFEL\n${a.out}`); fel++; continue; }
    for (const m of a.r) {
      const km = k.r?.find((x) => x.mode === m.mode);
      const bad = Object.values(m.bad).reduce((x, y) => x + y, 0);
      const okRad = !m.exc && bad === 0 && m.nan === 0 && m.typeBad === 0 && m.offLog > 0 && (namn !== 'sektion' || m.dropcalm === 0) && m.hops > 0;
      const kb = km ? Object.values(km.bad).reduce((x, y) => x + y, 0) : -1;
      const kOk = km && km.offLog === 0 && kb > 0 && (namn !== 'sektion' || km.dropcalm > 0);
      if (!okRad) fel++; if (!kOk) kontrollFel++;
      console.log(`${namn.padEnd(11)} ${prof.padEnd(7)} ${m.mode.padEnd(8)} ${String(m.hops).padStart(6)}  ${String(bad).padStart(11)}  ${String(m.nan).padStart(3)}  ${String(m.typeBad).padStart(6)}  ${(m.exc ? 'JA' : 'nej').padStart(8)}  ${String(m.offLog).padStart(7)}  ${String(m.dropcalm).padStart(8)}  | ${kb} / ${km?.dropcalm ?? '-'}${okRad ? '' : '  FEL'}${kOk ? '' : '  KONTROLL BITER INTE'}`
        + (m.exc ? `\n    undantag: ${m.exc}` : '') + (m.first.length && !okRad ? '\n    ' + m.first.join('\n    ') : ''));
    }
  }
  console.log(`SUMMA avstängning: ${Object.keys(STENAR).length} stenar × 2 profiler × 3 lägen, fel ${fel}, kontroller som inte biter ${kontrollFel}`);
  process.exit(fel ? 1 : 0);
}

async function pool(items, n, fn) {
  const out = []; let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const j = items[i++]; out.push(await fn(j)); } }));
  return out;
}

async function kor(DIST, MALL, NAMN, PROF, SECS, WAV) {
  process.env.DMX_DROP_TRACE = '1'; process.env.LOTUS_DROP_TRACE = '1';
  const logs = []; const log0 = console.log; console.log = (...a) => logs.push(a.join(' ')); console.warn = console.log;
  const load = async (d) => { const i = (f) => import(pathToFileURL(resolve(d, f)).href);
    return { ...(await i('analyser.js')), ...(await i('split.js')), ...(await i('analyserClock.js')), sysEnv: (await i('analyserFack.js')).sysEnv,
      defaultConfig: existsSync(resolve(d, 'config.js')) ? (await i('config.js')).defaultConfig : null }; };
  const m = await load(DIST), mm = await load(MALL);
  const SR = 48000, HOP = 128, EPOCH = PROF === 'dmx' ? 1.7e12 : 1795274000000, EVERY = 60 * SR / HOP, HINT = 97 * SR / HOP, RESET = 211 * SR / HOP;
  const cfgs = (mod) => PROF === 'dmx'
    ? { cfg: JSON.parse(JSON.stringify(mod.defaultConfig)), acfg: mod.BeatFeed.analyserCfg(JSON.parse(JSON.stringify(mod.defaultConfig))) }
    : (() => { const c = { sampleRate: 48000, hopSize: 128, autoGainTarget: 0.75, maxGain: 200, noiseFloor: 0.0015, onsetEnhancements: false }; return { cfg: null, acfg: c }; })();
  const flat = (f, out = {}, pre = '') => { for (const k of Object.keys(f)) { const v = f[k]; if (v && typeof v === 'object') flat(v, out, pre + k + '.'); else out[pre + k] = v; } return out; };
  const gain = (a) => PROF === 'dmx' ? a.setGainLock(true, 1) : a.setGainLock(false);
  // som createAnalyser: odelat med egen klocka, delat inline med taktväg (hopSelf i lotus)
  const build = (mod, mode) => {
    const { cfg, acfg } = cfgs(mod);
    if (mode === 'odelad') { const a = new mod.Analyser(acfg); a.clock = new mod.BeatFeed(); gain(a); return { a, cfg, acfg }; }
    const feedMk = mod.hopFeedFactory(), buffers = mod.createSplitBuffers(!!feedMk);
    const a = new mod.Analyser(acfg, { role: 'fast', split: buffers }); gain(a);
    if (!feedMk) a.clock = new mod.BeatFeed();
    else { a.hopLane = new mod.HopLaneFast(buffers, false); a.hopSelf = mod.sysEnv('BEAT_FEED') === undefined; a.hopLane.peer = new mod.HopLaneSlow(buffers, feedMk()); }
    a.setInlinePeer(new mod.Analyser(acfg, { role: 'slow', split: buffers }));
    return { a, cfg, acfg, buffers };
  };
  const d = readFileSync(WAV); let p = 12, off0 = 44, len = d.length - 44;
  while (p + 8 <= d.length) { const id = d.toString('ascii', p, p + 4), sz = d.readUInt32LE(p + 4); if (id === 'data') { off0 = p + 8; len = sz > 0 ? Math.min(sz, d.length - off0) : d.length - off0; break; } p += 8 + sz + (sz & 1); }
  const n = Math.min(len >> 1, Number(SECS) * SR), y = new Float32Array(n); for (let i = 0; i < n; i++) y[i] = d.readInt16LE(off0 + i * 2) / 32768;
  const mall = (() => { const { a } = build(mm, 'odelad'); return flat(a.process(new Float32Array(HOP))); })();   // typeof i påslaget bygge
  const NEU = NEUTRAL[NAMN], buf = new Float32Array(HOP), out = [];
  for (const mode of ['odelad', 'inline', 'omstart']) {
    logs.length = 0;
    const r = { mode, hops: 0, bad: {}, nan: 0, nanKeys: [], typeBad: 0, exc: null, offLog: 0, dropcalm: 0, first: [] };
    try {
      const X = build(m, mode);
      for (let off = 0; off + HOP <= n; off += HOP, r.hops++) {
        buf.set(y.subarray(off, off + HOP)); const hops = r.hops;
        if (mode === 'omstart' && hops > 0 && hops % EVERY === 0) X.a.setInlinePeer(new m.Analyser(X.acfg, { role: 'slow', split: X.buffers, resumeSeq: X.a.fastReadSeq() }));
        let fr;
        if (PROF === 'dmx') {
          const ms = EPOCH + off / SR * 1000; Date.now = () => ms; performance.now = () => ms - EPOCH; X.a.setVirtualClock(ms);
          if (hops > 0 && hops % HINT === 0) X.a.hintTrackChange(5000);
          if (hops > 0 && hops % RESET === 0) X.a.resetTempo();
          fr = X.a.process(buf);
          if (X.a.hopLane && !X.a.hopSelf) X.a.hopLane.feed(fr, X.cfg, X.a); else X.a.publishClock(X.cfg);
        } else {
          const ms = off / SR * 1000; Date.now = () => EPOCH + ms; performance.now = () => ms;
          X.a.setAudioClockMs(ms); if (hops === 0) X.a.setVirtualClock(0); else X.a.advanceVirtualClock(ms);
          if (hops > 0 && hops % HINT === 0) X.a.hintTrackChange(5000);
          if (hops > 0 && hops % RESET === 0) X.a.resetTempo();
          fr = X.a.process(buf);
          if (fr.bpm > 0 && fr.kickAnchorMs > 0) X.a.setBeatGrid({ bpm: fr.bpm, anchorMs: fr.kickAnchorMs });
        }
        const f = flat(fr), t = (off / SR).toFixed(3);
        for (const k of Object.keys(NEU)) if (f[k] !== NEU[k]) { r.bad[k] = (r.bad[k] || 0) + 1; if (r.first.length < 4) r.first.push(`t=${t} ${k} = ${f[k]} (neutralt ${JSON.stringify(NEU[k])})`); }
        for (const k of Object.keys(mall)) {
          if (typeof f[k] !== typeof mall[k]) { r.typeBad++; if (r.first.length < 4) r.first.push(`t=${t} ${k}: typeof ${typeof f[k]} (påslaget ${typeof mall[k]})`); }
          else if (typeof f[k] === 'number' && Number.isNaN(f[k])) { r.nan++; if (!r.nanKeys.includes(k)) r.nanKeys.push(k); if (r.first.length < 4) r.first.push(`t=${t} ${k} = NaN`); }
        }
      }
    } catch (e) { r.exc = String(e?.stack ?? e).split('\n').slice(0, 3).join(' | '); }
    r.offLog = logs.filter((l) => l === `[analysator] sten av: ${NAMN}`).length;
    r.dropcalm = logs.filter((l) => l.startsWith('[dropcalm]')).length;
    out.push(r);
  }
  log0(JSON.stringify(out));
}
