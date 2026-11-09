// DMX-DUMP (natt 2026-11-08): kör analysator + motor ur <dist> över en wav (48 kHz mono), md5 per lampa av hela DMX-sekvensen - bit-bevis för refaktor/standard. node tools/dmxDump.mjs <dist> <wav> [sek] [gammaLampa gamma] [topLampa top]  (- = hoppa över)
import { readFileSync } from "node:fs"; import { createHash } from "node:crypto"; import { pathToFileURL } from "node:url";
const [dist, wav, sekS, gL, gV, tL, tV] = process.argv.slice(2);
const SR = 48000, HOP = 128, EPOCH = 1700000000000, STEP_MS = 25, maxS = Number(sekS || 120);
const d = readFileSync(wav); let p = 12, dataOff = 44, dataLen = d.length - 44;
while (p + 8 <= d.length) { const id = d.toString("ascii", p, p + 4), sz = d.readUInt32LE(p + 4); if (id === "data") { dataOff = p + 8; dataLen = sz > 0 ? Math.min(sz, d.length - p - 8) : d.length - p - 8; break; } /* sz 0 = strömskriven (pop/megamix): resten av filen (11-09: förr tom md5) */ p += 8 + sz + (sz & 1); }
const n = dataLen >> 1, samples = new Float32Array(n); for (let i = 0; i < n; i++) samples[i] = d.readInt16LE(dataOff + i * 2) / 32768;
const imp = (f) => import(pathToFileURL(dist + "/" + f).href);
const { Analyser, createAnalyser } = await imp("analyser.js"); const { EffectEngine } = await imp("effects.js"); const { BeatFeed } = await imp("beatFeed.js");
const { defaultConfig, fixtureRoles } = await imp("config.js"); const { EFFECT_KEYS } = await imp("effects/registry.js"); const { BoundaryDetector } = await imp("boundaryDetector.js");
const cfg = JSON.parse(JSON.stringify(defaultConfig));
cfg.mode = "smart"; cfg.energyDrivesMode = true; cfg.beatPulse = true; cfg.master = 1; cfg.energyCeiling = true;
cfg.rotation = {}; for (const k of EFFECT_KEYS) cfg.rotation[k] = true;
for (const fx of cfg.fixtures) fx.cal = { off: 0, on: 16 };
if (gL !== undefined && gL !== "-") cfg.fixtures[Number(gL)].cal.gamma = Number(gV);
if (tL !== undefined && tL !== "-") cfg.fixtures[Number(tL)].cal.top = Number(tV);
const lamps = cfg.fixtures.map((fx) => { const roles = fixtureRoles(fx), base = fx.address - 1; return roles.map((_, i) => base + i); });
// DUMP_SPLIT (bänken, 11-08): osatt = odelad analysator + taktmatningen här (som förr); inline = delad analysator i samma tråd (motorns väg,
// med profilens BEAT_FEED slow körs taktmatningen i långsamma sidan); sync = den RIKTIGA workern i lås-steg (createAnalyser(cfg, "sync")); worker = motorns asynkrona worker (bara CPU-mått, ljuset ej deterministiskt).
const SPLIT = process.env.DUMP_SPLIT || ""; if (SPLIT) process.env.DMX_ANALYSER_SPLIT = SPLIT === "worker" ? "worker" : "inline";
const acfg = JSON.parse(JSON.stringify(defaultConfig)); const an = SPLIT ? createAnalyser(acfg, SPLIT === "sync" ? "sync" : undefined) : new Analyser(acfg); const feed = new BeatFeed(); an.setGainLock(true, 1);
const bounds = new BoundaryDetector(() => Date.now()); an.setSpectrumSink((mag, binHz) => bounds.pushSpectrum(mag, binHz));
const ba = { level: 0, bpm: 0, bpmConfidence: 0 }; let lb = 0;
if (SPLIT === "worker") await new Promise((r) => setTimeout(r, 1000));   // workern startar (dynamisk import, som i motorn)
const cpu0 = process.threadCpuUsage();   // huvudtrådens CPU (us) för analys+takt+effekter, exkl. wav-läsning
Date.now = () => EPOCH; performance.now = () => 0;
const eng = new EffectEngine(cfg); console.log = () => {};
const H = lamps.map(() => createHash("md5")); let lastRender = -1, frames = 0; const buf = new Float32Array(HOP);
const lit = lamps.map(() => 0);
for (let off = 0; off + HOP <= Math.min(n, maxS * SR); off += HOP) {
  for (let i = 0; i < HOP; i++) buf[i] = samples[off + i];
  const ms = EPOCH + off / SR * 1000; an.setVirtualClock(ms); Date.now = () => ms; performance.now = () => ms - EPOCH;
  const fr = an.process(buf); ba.level = fr.level; ba.bpm = fr.bpm; ba.bpmConfidence = fr.bpmConfidence; bounds.tick(ba);
  if (bounds.boundaryCount !== lb) { lb = bounds.boundaryCount; eng.softenRange(); an.hintTrackChange(5000); }
  if (an.hopLane) an.hopLane.feed(fr, cfg, an); else feed.update(fr, cfg, an);
  if (ms - lastRender < STEP_MS && lastRender >= 0) continue; lastRender = ms;
  eng.render(fr); const u = eng.universe; if (!u) continue; frames++;
  lamps.forEach((chs, k) => { const b = Buffer.from(chs.map((c) => u[c])); H[k].update(b); for (const c of chs) lit[k] += u[c]; });
}
const cpu = process.threadCpuUsage(cpu0); an.__stopWorker?.();
process.stdout.write(JSON.stringify({ split: SPLIT || undefined, lane: !!an.hopLane, cpuUsPerHop: +((cpu.user + cpu.system) / Math.floor(Math.min(n, maxS * SR) / HOP)).toFixed(2), frames, md5: H.map((h) => h.digest("hex").slice(0, 10)), sum: lit }) + "\n");
