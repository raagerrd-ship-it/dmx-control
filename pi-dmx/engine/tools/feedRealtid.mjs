/** TAKTVÄGEN I REALTID (2026-11-08): motorns riktiga worker-läge i realtidstakt på PC:n - analysator (DMX_ANALYSER_SPLIT=worker),
 *  låtgräns, taktmatningen via analyser.hopLane (profilens BEAT_FEED 'slow') - och mät hur långt workern ligger efter.
 *
 *    node tools/feedRealtid.mjs [dist] <wav> [sek=120]
 *  Utan taktväg (äldre dist / BEAT_FEED av) körs taktmatningen i huvudtråden som förr - för att jämföra huvudtrådens CPU per hop
 *  (process.threadCpuUsage, analys + takt + effekter var 25 ms som dmxDump, exkl. wav-läsning).
 *
 *  Per hop: hur många hop huvudtrådens cfg.beat ligger efter (written - senast publicerade), taktvägens fördröjning i ms
 *  (hop skrivet -> färdigkört i workern) och analysatorns egen (env-record). Rutnätets RYCK (ankare/tempo ändrat av matningen)
 *  räknas med sin storlek i ms: det är bara under ett ryck som fördröjningen syns - ankaret är en tidpunkt, så en fördröjd kopia av
 *  samma rutnät ger samma slag.
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const dist = args[0]?.endsWith('.wav') ? 'dist' : args.shift();
const [wav, sekS] = args; const SECS = Number(sekS || 120);
const SR = 48000, HOP = 128;
process.env.DMX_ANALYSER_SPLIT = 'worker';
const imp = (f) => import(pathToFileURL(resolve(dist, f)).href);
const { createAnalyser } = await imp('analyser.js'); const { BeatFeed } = await imp('beatFeed.js');
const { defaultConfig, fixtureRoles } = await imp('config.js'); const { BoundaryDetector } = await imp('boundaryDetector.js');
const { EffectEngine } = await imp('effects.js'); const { EFFECT_KEYS } = await imp('effects/registry.js');
const d = readFileSync(wav); let p = 12, dataOff = 44, dataLen = d.length - 44;
while (p + 8 <= d.length) { const id = d.toString('ascii', p, p + 4), sz = d.readUInt32LE(p + 4); if (id === 'data') { dataOff = p + 8; dataLen = Math.min(sz, d.length - p - 8); break; } p += 8 + sz + (sz & 1); }
const n = Math.min(dataLen >> 1, SECS * SR), y = new Float32Array(n); for (let i = 0; i < n; i++) y[i] = d.readInt16LE(dataOff + i * 2) / 32768;

const cfg = JSON.parse(JSON.stringify(defaultConfig));
cfg.mode = 'smart'; cfg.energyDrivesMode = true; cfg.beatPulse = true; cfg.master = 1; cfg.energyCeiling = true;
cfg.rotation = {}; for (const k of EFFECT_KEYS) cfg.rotation[k] = true; for (const fx of cfg.fixtures) fx.cal = { off: 0, on: 16 };
const an = createAnalyser(BeatFeed.analyserCfg(cfg)); an.setGainLock(true, 1);
const feed = new BeatFeed(); const eng = new EffectEngine(cfg); let lastRender = -1e9; console.log = () => {};
const bounds = new BoundaryDetector(() => Date.now()); an.setSpectrumSink((mag, binHz) => bounds.pushSpectrum(mag, binHz));
const ba = { level: 0, bpm: 0, bpmConfidence: 0 }; let lb = 0;
await new Promise((r) => setTimeout(r, 1000));   // workern startar (dynamisk import, som i motorn)

const behindHist = new Map(); const lagS = []; const envLag = []; const jumps = []; let prevA = 0, prevB = 0, h = 0;
const buf = new Float32Array(HOP); const t0 = performance.now(); const wall0 = Date.now();
const cpu0 = process.threadCpuUsage();
await new Promise((res) => {
  const iv = setInterval(() => {
    const want = Math.floor((performance.now() - t0) / 1000 * SR / HOP);
    while (h < want && (h + 1) * HOP <= n) {
      buf.set(y.subarray(h * HOP, (h + 1) * HOP));
      const fr = an.process(buf); ba.level = fr.level; ba.bpm = fr.bpm; ba.bpmConfidence = fr.bpmConfidence; bounds.tick(ba);
      if (bounds.boundaryCount !== lb) { lb = bounds.boundaryCount; an.hintTrackChange(5000); }
      if (an.hopLane) an.hopLane.feed(fr, cfg, an); else feed.update(fr, cfg, an);
      const nowR = performance.now(); if (nowR - lastRender >= 25) { lastRender = nowR; eng.render(fr); }
      h++;
      if (an.hopLane) { const st = an.hopLane.stats(); behindHist.set(st.behind, (behindHist.get(st.behind) || 0) + 1); if (h % 37 === 0) lagS.push(st.lagMs); }
      if (h % 37 === 0) { const ss = an.getSplitStats(); if (ss) envLag.push(ss.lagMs); }
      const b = cfg.beat;
      if (b && prevB) { if (b.bpm !== prevB || b.anchorMs !== prevA) { const bm = 60000 / b.bpm, now = Date.now(); const ph = (x, bpm) => ((now - x) % (60000 / bpm) + 60000 / bpm) % (60000 / bpm); let dms = ph(b.anchorMs, b.bpm) - ph(prevA, prevB); dms -= Math.round(dms / bm) * bm; jumps.push(Math.abs(dms)); } }
      prevA = b?.anchorMs ?? 0; prevB = b?.bpm ?? 0;
    }
    if ((h + 1) * HOP > n) { clearInterval(iv); res(); }
  }, 2);
});
const cpu = process.threadCpuUsage(cpu0);
const q = (a, f) => { const s = [...a].sort((x, z) => x - z); return s.length ? +s[Math.min(s.length - 1, Math.floor(f * s.length))].toFixed(2) : 0; };
const st = an.hopLane?.stats() ?? null; an.__stopWorker?.();
const hist = [...behindHist.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k}:${(100 * v / h).toFixed(2)}%`).join(' ');
process.stdout.write(JSON.stringify({
  wav: wav.split(/[\\/]/).pop(), sek: +((Date.now() - wall0) / 1000).toFixed(1), hop: h,
  huvudtradCpuUsPerHop: +((cpu.user + cpu.system) / h).toFixed(2),
  efterHop: hist, taktvagLagMs: { p50: q(lagS, 0.5), p99: q(lagS, 0.99), max: st?.lagMaxMs }, taktvag: st,
  envLagMs: { p50: q(envLag, 0.5), p99: q(envLag, 0.99) },
  ryck: { antal: jumps.length, perMin: +(jumps.length / (h * HOP / SR / 60)).toFixed(1), msP50: q(jumps, 0.5), msP90: q(jumps, 0.9), msMax: q(jumps, 1) },
}) + '\n');
process.exit(0);
