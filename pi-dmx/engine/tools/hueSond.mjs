/**
 * HUE-SOND (natt 2026-10-15, uppdrag 10-14 kväll: 'mät skarpa kulörhopp på tända lampor och hur ofta toningen faller till skarpt').
 * Samma koppel som konsertReplay (--delad-cfg, --step 5 = live). Per renderruta och lampa: kulör ur eng.universe (färg x dimmer);
 * HOPP = lampan tänd (>= 30 % och mättad) i båda rutorna och kulören flyttar > 1/12 varv på en ruta. Toningens egna utfall räknas
 * genom att linda hueGlide: 'glid' (rgb omskriven), 'skarp-flagga' (drop/mini/fastLight), 'skarp-ljus' (glidkulören skulle ändra
 * ljuset -> skarpt, se SAMMA LJUS), 'ny' (lampan tändes/omättad). Bara byten > 1/12 räknas i utfallen.
 *   node tools/hueSond.mjs <wav> [--step 5] [--delad-cfg]
 */
import { readFileSync, writeFileSync } from "node:fs";
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const path = args.find((a) => a.endsWith(".wav"));
const { pathToFileURL } = await import("node:url");
const DIST = opt("--dist", null) ? pathToFileURL(opt("--dist") + "/").href : new URL("../dist/", import.meta.url).href;   // --dist: prova en patchad kopia
const { Analyser } = await import(DIST + "analyser.js");
const { EffectEngine } = await import(DIST + "effects.js");
const { BeatFeed } = await import(DIST + "beatFeed.js");
const { defaultConfig, fixtureRoles } = await import(DIST + "config.js");
const { EFFECT_KEYS } = await import(DIST + "effects/registry.js");
const { BoundaryDetector } = await import(DIST + "boundaryDetector.js");
const d = readFileSync(path); const nSamples = (d.length - 44) >> 1;
const SR = 48000, HOP = 128, EPOCH = 1700000000000, STEP_MS = Number(opt("--step", 25));   // --step 5 = som live (200 Hz)
const cfg = JSON.parse(JSON.stringify(defaultConfig));
cfg.mode = "smart"; cfg.energyDrivesMode = true; cfg.master = 1;
cfg.rotation = {}; for (const k of EFFECT_KEYS) cfg.rotation[k] = true;
const lamps = cfg.fixtures.map((fx) => { const roles = fixtureRoles(fx), base = (fx.address ?? 1) - 1; const at = (r) => { const i = roles.indexOf(r); return i < 0 ? -1 : base + i; }; return { r: at("r"), g: at("g"), b: at("b"), dim: at("dim") }; });
// --delad-cfg (MÄTFÄLLA 47, 10-13): live får analysatorn MOTORNS cfg (index.ts createAnalyser(cfg)), så kickgrinden mot taktgridet
// och taktfasen (analyser.ts beatSrc.beat = cfg.beat) är PÅ live - med en egen kopia (bänkarnas standard) är cfg.beat alltid null där.
const an = new Analyser(args.includes("--delad-cfg") ? cfg : JSON.parse(JSON.stringify(defaultConfig))); an.setGainLock(true, 1);
const feed = new BeatFeed();
const bounds = new BoundaryDetector(() => Date.now());
an.setSpectrumSink((mag, binHz) => bounds.pushSpectrum(mag, binHz));
const boundsArg = { level: 0, bpm: 0, bpmConfidence: 0 };
Date.now = () => EPOCH; performance.now = () => 0;
const eng = new EffectEngine(cfg);
const hue = (c) => { const [r, g, b] = c, v = Math.max(r, g, b), mn = Math.min(r, g, b); if (v < 0.3 * 255 || v - mn < 0.5 * v) return null; const d = v - mn;
  let h = r === v ? (g - b) / d : g === v ? 2 + (b - r) / d : 4 + (r - g) / d; return ((h / 6) % 1 + 1) % 1; };
const prevH = [null, null, null, null]; let nLit = 0, hops = 0; const hopT = [];
const G = { glid: 0, flag: 0, ljus: 0, ny: 0 };
{ const orig = eng.hueGlide.bind(eng);
  eng.hueGlide = (i, rgb, dt, skarp) => {
    const before = [rgb[0], rgb[1], rgb[2]], on = eng.glOn[i], gh = eng.glH[i], pv = eng.glV[i];
    orig(i, rgb, dt, skarp);
    const v = Math.max(...before), mn = Math.min(...before); if (v <= 0 || v - mn < 0.5 * v) return;
    const d = v - mn, r = before[0], g = before[1], b = before[2]; let h = r === v ? (g - b) / d : g === v ? 2 + (b - r) / d : 4 + (r - g) / d; h = ((h / 6) % 1 + 1) % 1;
    const dh = Math.abs(((h - gh + 1.5) % 1) - 0.5); if (!on) return; if (dh <= 1 / 12) return;
    if (pv < 0.08 * v) G.ny++; else if (skarp) G.flag++; else if (rgb[0] !== before[0] || rgb[1] !== before[1] || rgb[2] !== before[2]) G.glid++; else G.ljus++;
  }; }
let tNow = 0; const LOG = [];
console.log = () => {};
const buf = new Float32Array(HOP);
let lastRender = -1, lastCharShift = 0, lastTempoShift = 0, lastBoundary = 0, lastRow = -1;
const TRACE = opt("--trace", null) ? [] : null; const SEC = { intro: 0, low: 1, build: 2, high: 3, break: 4 };
const ROWS = [];   // [t, look, why, sec, int, light, nLit, drops, near, lift, miniLook, upgrades, bpm]
let acc = { light: 0, nLit: 0, n: 0, mini: 0, hi: 0, lo: 9, top: 0 };
for (let off = 0; off + HOP <= nSamples; off += HOP) {
  for (let i = 0; i < HOP; i++) buf[i] = d.readInt16LE(44 + (off + i) * 2) / 32768;
  const tS = off / SR, ms = EPOCH + tS * 1000; tNow = tS;
  // MÄTFÄLLA 48 (10-13): analysatorns virtuella väggklocka är virtualEpoch (1,7e12) + det som skickas in - med EPOCH + t blev
  // kickAtMs/beatAnchorMs 1,7e12 ms före Date.now() (beatFeed/effekterna), så taktklockans fas efter varje tempobyte och
  // effekternas slag satt en godtycklig, tempoberoende bit från kickarna (128 BPM: 0,67 slag). Live är båda Date.now().
  // --epok-fel = gamla (felaktiga) vägen för jämförelse mot äldre json.
  an.setVirtualClock(args.includes("--epok-fel") ? ms : ms - EPOCH); Date.now = () => ms; performance.now = () => ms - EPOCH;
  const fr = an.process(buf);
  boundsArg.level = fr.level; boundsArg.bpm = fr.bpm; boundsArg.bpmConfidence = fr.bpmConfidence; bounds.tick(boundsArg);
  if (bounds.charShiftCount !== lastCharShift) { lastCharShift = bounds.charShiftCount; eng.noteCharShift?.(); }
  if (bounds.tempoShiftCount !== lastTempoShift) { lastTempoShift = bounds.tempoShiftCount; eng.noteCharShift?.(`tempovaxling ${bounds.tempoShiftFrom}->${bounds.tempoShiftTo} BPM`); }
  if (bounds.boundaryCount !== lastBoundary) { lastBoundary = bounds.boundaryCount; eng.softenRange(); an.hintTrackChange(5000); LOG.push([+tS.toFixed(2), 'LATGRANS']); }
  feed.update(fr, cfg, an);
  if (ms - lastRender < STEP_MS && lastRender >= 0) continue;
  lastRender = ms; eng.render(fr); const u = eng.universe; if (!u) continue;
  const lv = lamps.map((L) => { const k = L.dim >= 0 ? u[L.dim] / 255 : 1; return [u[L.r] * k, u[L.g] * k, u[L.b] * k]; });
  for (let i = 0; i < 4; i++) {
    const h = hue(lv[i]), p = prevH[i];
    if (h !== null && p !== null) { nLit++; const dh = Math.abs(((h - p + 1.5) % 1) - 0.5); if (dh > 1 / 12) { hops++; hopT.push(+tNow.toFixed(1)); } }
    prevH[i] = h;
  }
}
const min = tNow / 60;
process.stdout.write(`${path}: ${min.toFixed(1)} min, tända lamprutor ${nLit}, HOPP ${hops} (${(hops / min).toFixed(1)}/min); toningen (byten > 1/12): glid ${G.glid}, skarp-flagga ${G.flag}, skarp-ljus ${G.ljus} (${(100 * G.ljus / Math.max(1, G.glid + G.ljus)).toFixed(0)} % av glidbara), ny ${G.ny}\n`);
if (args.includes("--list")) process.stdout.write(hopT.join(" ") + "\n");
