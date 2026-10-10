/**
 * KONSERTBANKEN (2026-10-10 natt, uppgift KONSERTSHOW i tools/natt/todo.md - agaren: "hur kan vi fa ljusshowen mer lik en riktig
 * konsert-show?"). Kor riktiga analysatorn + effektmotorn i smart-lage (som showTight: ladans config, latgranser, beatFeed) och mater det
 * en ljusdesigner gor som en automat ofta inte gor:
 *   kulorbyten/min     hur ofta riggens kulorer (6 sektorer bland tanda lampor, stabila >= 0,5 s) byts  - konsert: fa, pa sektionsgranser
 *   kulorerPerSektion  median antal kulorer (sektorer) som anvands under en sektion                  - konsert: 2-3 (EN palett)
 *   paletterPerSektion median antal paletter (motorns 3-kulors) under en sektion                      - konsert: 1
 *   palettPaGrans      andel palettbyten inom 1 s fran en sektionsgrans                               - konsert: hog
 *   bytePaFras         andel look-byten inom +-1 slag fran en 4-taktsgrans (beatIdx % 16)            - konsert: hog
 *   allaTanda          andel tid alla fyra lampor lyser (> 25 % av ljusaste, ljusaste > 20 DMX)     - konsert: inte jamt - sparas till refrangen
 *   lampAntalR         korrelation antal tanda lampor (> 30 % DMX) mot frame.intensity                - konsert: positiv (1 -> 2 -> 4)
 *   versRefrang        riggens ljus i sektion high minus i low/intro (0..1)                          - konsert: tydligt positiv
 *   aterseende         andel aterkommande sektioner (samma etikett i samma lat) som far SAMMA palett  - konsert: hog (igenkanning)
 *   node tools/concertBench.mjs <wav> [--json ut.json] [--sek S] [--start S] [--norm DBFS]
 */
import { readFileSync, writeFileSync } from "node:fs";
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const path = args.find((a) => a.endsWith(".wav"));
const startS = Number(opt("--start", 0)), maxS = Number(opt("--sek", 1e9));
const { Analyser } = await import("../dist/analyser.js");
const { EffectEngine } = await import("../dist/effects.js");
const { BeatFeed } = await import("../dist/beatFeed.js");
const { defaultConfig, fixtureRoles } = await import("../dist/config.js");
const { EFFECT_KEYS } = await import("../dist/effects/registry.js");
const { BoundaryDetector } = await import("../dist/boundaryDetector.js");
const d = readFileSync(path); const nSamples = (d.length - 44) >> 1;
let GAIN = 1;
if (opt("--norm", null) !== null) { const blk = 4800, rms = []; for (let o = 0; o + blk <= nSamples; o += blk) { let q = 0; for (let i = 0; i < blk; i++) { const x = d.readInt16LE(44 + (o + i) * 2) / 32768; q += x * x; } const r = Math.sqrt(q / blk); if (r > 1e-4) rms.push(r); } rms.sort((a, b) => a - b); if (rms.length) GAIN = Math.pow(10, Number(opt("--norm")) / 20) / rms[rms.length >> 1]; }
const SR = 48000, HOP = 128, EPOCH = 1700000000000, STEP_MS = 25;
const cfg = JSON.parse(JSON.stringify(defaultConfig));
cfg.mode = "smart"; cfg.energyDrivesMode = true; cfg.master = 1;
cfg.rotation = {}; for (const k of EFFECT_KEYS) cfg.rotation[k] = true;
const lamps = cfg.fixtures.map((fx) => { const roles = fixtureRoles(fx), base = (fx.address ?? 1) - 1; const at = (r) => { const i = roles.indexOf(r); return i < 0 ? -1 : base + i; }; return { r: at("r"), g: at("g"), b: at("b") }; });
const an = new Analyser(JSON.parse(JSON.stringify(defaultConfig))); an.setGainLock(true, 1);
const feed = new BeatFeed();
const bounds = new BoundaryDetector(() => Date.now());
an.setSpectrumSink((mag, binHz) => bounds.pushSpectrum(mag, binHz));
const boundsArg = { level: 0, bpm: 0, bpmConfidence: 0 };
const t00 = EPOCH + startS * 1000; Date.now = () => t00; performance.now = () => t00 - EPOCH;
const eng = new EffectEngine(cfg);
console.log = () => {};
const buf = new Float32Array(HOP);
let lastRender = -1, lastCharShift = 0, lastTempoShift = 0, lastBoundary = 0, song = 0;
// per ruta
const R = [];   // {t, sec, secIdx, song, look, pal, hueSet, nLit, allLit, light, int, beatIdx}
const end = Math.min(nSamples, Math.floor((startS + maxS) * SR));
const sector = (r, g, b) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b); if (mx - mn < 20) return -1; let h; if (mx === r) h = ((g - b) / (mx - mn) + 6) % 6; else if (mx === g) h = (b - r) / (mx - mn) + 2; else h = (r - g) / (mx - mn) + 4; return Math.round(h) % 6; };
for (let off = Math.floor(startS * SR / HOP) * HOP; off + HOP <= end; off += HOP) {
  for (let i = 0; i < HOP; i++) { const x = d.readInt16LE(44 + (off + i) * 2) / 32768 * GAIN; buf[i] = x > 1 ? 1 : x < -1 ? -1 : x; }
  const tS = off / SR, ms = EPOCH + tS * 1000;
  an.setVirtualClock(ms); Date.now = () => ms; performance.now = () => ms - EPOCH;
  const fr = an.process(buf);
  boundsArg.level = fr.level; boundsArg.bpm = fr.bpm; boundsArg.bpmConfidence = fr.bpmConfidence; bounds.tick(boundsArg);
  if (bounds.charShiftCount !== lastCharShift) { lastCharShift = bounds.charShiftCount; eng.noteCharShift(); }
  if (bounds.tempoShiftCount !== lastTempoShift) { lastTempoShift = bounds.tempoShiftCount; eng.noteCharShift(`tempovaxling ${bounds.tempoShiftFrom}->${bounds.tempoShiftTo} BPM`); }
  if (bounds.boundaryCount !== lastBoundary) { lastBoundary = bounds.boundaryCount; song++; eng.softenRange(); an.hintTrackChange(5000); }
  feed.update(fr, cfg, an);
  if (ms - lastRender < STEP_MS && lastRender >= 0) continue;
  lastRender = ms; eng.render(fr); const u = eng.universe; if (!u) continue;
  const v = lamps.map((L) => [u[L.r] ?? 0, u[L.g] ?? 0, u[L.b] ?? 0]);
  const lv = v.map(([r, g, b]) => Math.max(r, g, b)), mx = Math.max(...lv);
  const hs = new Set(); v.forEach(([r, g, b], k) => { if (lv[k] > 40) { const s = sector(r, g, b); if (s >= 0) hs.add(s); } });
  R.push({ t: tS, sec: fr.section ?? "", secIdx: fr.sectionIndex ?? 0, song, look: eng.getActiveMode(), pal: eng.paletteIdx, hue: [...hs].sort().join(""),
           nLit: lv.filter((x) => x > 0.3 * 255).length, allLit: mx > 20 && lv.every((x) => x > 0.25 * mx), light: lv.reduce((a, b) => a + b, 0) / (4 * 255),
           int: fr.intensity ?? 0, beatIdx: eng.ctx?.beatIdx ?? 0 });
}
const N = R.length, totMin = N * STEP_MS / 60000;
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : NaN; };
const corr = (a, b) => { const n = a.length, ma = a.reduce((x, y) => x + y, 0) / n, mb = b.reduce((x, y) => x + y, 0) / n; let sab = 0, sa = 0, sb = 0; for (let i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); sa += (a[i] - ma) ** 2; sb += (b[i] - mb) ** 2; } return sab / Math.sqrt(sa * sb || 1); };
// kulorbyten: stabil >= 0,5 s (20 rutor)
let hueChanges = 0, cur = null, cand = null, candN = 0;
for (const r of R) { if (r.hue === "") continue; if (r.hue === cur) { cand = null; continue; } if (r.hue === cand) { if (++candN >= 20) { if (cur !== null) hueChanges++; cur = cand; cand = null; } } else { cand = r.hue; candN = 1; } }
// sektioner (lopande etikett, sammanhangande)
const secs = []; let s0 = 0;
for (let i = 1; i <= N; i++) if (i === N || R[i].sec !== R[s0].sec || R[i].song !== R[s0].song) { if (i - s0 >= 80) secs.push({ a: s0, b: i, sec: R[s0].sec, song: R[s0].song }); s0 = i; }
const huesPerSec = secs.map(({ a, b }) => { const c = new Map(); for (let i = a; i < b; i++) for (const ch of R[i].hue) c.set(ch, (c.get(ch) ?? 0) + 1); return [...c.values()].filter((n) => n > (b - a) * 0.05).length; });
const palsPerSec = secs.map(({ a, b }) => new Set(R.slice(a, b).map((r) => r.pal)).size);
const secStarts = secs.map(({ a }) => R[a].t);
let palCh = 0, palOnB = 0; for (let i = 1; i < N; i++) if (R[i].pal !== R[i - 1].pal) { palCh++; if (secStarts.some((t) => Math.abs(t - R[i].t) <= 1)) palOnB++; }
let sw = 0, swPh = 0; for (let i = 1; i < N; i++) if (R[i].look !== R[i - 1].look) { sw++; const m = ((R[i].beatIdx % 16) + 16) % 16; if (m === 0 || m === 1 || m === 15) swPh++; }
// aterseende: samma etikett igen i samma lat -> samma (dominerande) palett?
const domPal = ({ a, b }) => { const c = new Map(); for (let i = a; i < b; i++) c.set(R[i].pal, (c.get(R[i].pal) ?? 0) + 1); return [...c.entries()].sort((x, y) => y[1] - x[1])[0][0]; };
let again = 0, same = 0; const seen = new Map();
for (const s of secs) { const k = s.song + ":" + s.sec; const p = domPal(s); if (seen.has(k)) { again++; if (seen.get(k) === p) same++; } seen.set(k, p); }
const lightOf = (f) => { const x = R.filter(f); return x.length ? x.reduce((a, r) => a + r.light, 0) / x.length : NaN; };
const res = {
  wav: path, min: +totMin.toFixed(1),
  kulorbytenPerMin: +(hueChanges / totMin).toFixed(1),
  kulorerPerSektion: med(huesPerSec), paletterPerSektion: med(palsPerSec), sektioner: secs.length,
  palettbytenPerMin: +(palCh / totMin).toFixed(2), palettPaGrans: +(palCh ? palOnB / palCh : 0).toFixed(2),
  lookbytenPerMin: +(sw / totMin).toFixed(1), bytePaFras: +(sw ? swPh / sw : 0).toFixed(2),
  allaTanda: +(R.filter((r) => r.allLit).length / N).toFixed(2),
  lampAntalR: +corr(R.map((r) => r.nLit), R.map((r) => r.int)).toFixed(2),
  versRefrang: +(lightOf((r) => r.sec === "high") - lightOf((r) => r.sec === "low" || r.sec === "intro")).toFixed(2),
  aterseende: again ? +(same / again).toFixed(2) : null, aterkommande: again,
};
process.stdout.write(JSON.stringify(res) + "\n");
if (opt("--json", null)) writeFileSync(opt("--json"), JSON.stringify(res, null, 1));
