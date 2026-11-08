// DROP -> BAS (natt 2026-11-08, uppdrag E): per show-drop (flanken) tid till första tunga basanslaget (sub+kick dB-stigning >= RISE 8 dB på 40 ms, inom 6 dB av maxet 0-2 s efter). node tools/dropBas.mjs <dist> <wav> [sek]  (negativ = basen kom FÖRE flanken)
import { readFileSync } from "node:fs"; import { pathToFileURL } from "node:url";
const [dist, wav, sekS] = process.argv.slice(2);
const SR = 48000, HOP = 128, EPOCH = 1700000000000, STEP_MS = 25, maxS = Number(sekS || 1e9);
const d = readFileSync(wav); let p = 12, dataOff = 44, dataLen = d.length - 44;
while (p + 8 <= d.length) { const id = d.toString("ascii", p, p + 4), sz = d.readUInt32LE(p + 4); if (id === "data") { dataOff = p + 8; dataLen = Math.min(sz, d.length - p - 8); break; } p += 8 + sz + (sz & 1); }
const n = dataLen >> 1, samples = new Float32Array(n); for (let i = 0; i < n; i++) samples[i] = d.readInt16LE(dataOff + i * 2) / 32768;
const imp = (f) => import(pathToFileURL(dist + "/" + f).href);
const { Analyser } = await imp("analyser.js"); const { EffectEngine } = await imp("effects.js"); const { BeatFeed } = await imp("beatFeed.js");
const { defaultConfig } = await imp("config.js"); const { EFFECT_KEYS } = await imp("effects/registry.js"); const { BoundaryDetector } = await imp("boundaryDetector.js");
const cfg = JSON.parse(JSON.stringify(defaultConfig));
cfg.mode = "smart"; cfg.energyDrivesMode = true; cfg.beatPulse = true; cfg.master = 1; cfg.energyCeiling = true;
cfg.rotation = {}; for (const k of EFFECT_KEYS) cfg.rotation[k] = true; for (const fx of cfg.fixtures) fx.cal = { off: 0, on: 16 };
const an = new Analyser(JSON.parse(JSON.stringify(defaultConfig))); const feed = new BeatFeed(); an.setGainLock(true, 1);
const bounds = new BoundaryDetector(() => Date.now()); an.setSpectrumSink((mag, binHz) => bounds.pushSpectrum(mag, binHz));
const ba = { level: 0, bpm: 0, bpmConfidence: 0 }; let lb = 0;
Date.now = () => EPOCH; performance.now = () => 0;
const eng = new EffectEngine(cfg); console.log = () => {};
const T = [], KDB = [], BODY = []; const drops = []; let lastShow = 0, lastFd = 0, lastRender = -1; const buf = new Float32Array(HOP);
for (let off = 0; off + HOP <= Math.min(n, maxS * SR); off += HOP) {
  for (let i = 0; i < HOP; i++) buf[i] = samples[off + i];
  const ms = EPOCH + off / SR * 1000; an.setVirtualClock(ms); Date.now = () => ms; performance.now = () => ms - EPOCH;
  const fr = an.process(buf); ba.level = fr.level; ba.bpm = fr.bpm; ba.bpmConfidence = fr.bpmConfidence; bounds.tick(ba);
  if (bounds.boundaryCount !== lb) { lb = bounds.boundaryCount; eng.softenRange(); an.hintTrackChange(5000); }
  feed.update(fr, cfg, an);
  const sa = fr.specAbs; T.push(off / SR); KDB.push(sa ? 10 * Math.log10((sa.sub + 1e-7) * (sa.kick + 1e-7)) : -140); BODY.push(fr.bodyDb ?? -90);
  if (ms - lastRender < STEP_MS && lastRender >= 0) continue; lastRender = ms;
  eng.render(fr);
  if (eng.fdAt !== lastFd) { lastFd = eng.fdAt; drops.push({ t: (eng.fdAt - EPOCH) / 1000, kind: "flank" }); }
  if (eng.lastShowDropWall !== lastShow) { lastShow = eng.lastShowDropWall; const t = (lastShow - EPOCH) / 1000; const f = drops.find((x) => Math.abs(x.t - t) < 0.05); if (f) f.show = true; else drops.push({ t, kind: "annan", show: true }); }
}
// basanslag: kickDb stiger >= RISE dB på 40 ms (15 hop) och når inom 6 dB av maxet 0..2 s efter dropen
const RISE = Number(process.env.RISE || 8), H = 15;
const idxOf = (t) => Math.max(0, Math.min(T.length - 1, Math.round(t * SR / HOP)));
const out = [];
for (const dr of drops) {
  const i0 = idxOf(dr.t), mx = Math.max(...KDB.slice(i0, idxOf(dr.t + 2)));
  let hit = null;
  for (let i = idxOf(dr.t - 0.3); i < idxOf(dr.t + 1.2); i++) { if (i < H) continue; if (KDB[i] - Math.min(...KDB.slice(i - H, i)) >= RISE && KDB[i] >= mx - 6) { hit = T[i]; break; } }
  out.push({ t: +dr.t.toFixed(2), kind: dr.kind, show: !!dr.show, basMs: hit === null ? null : Math.round((hit - dr.t) * 1000) });
}
process.stdout.write(JSON.stringify(out) + "\n");
