/**
 * TAKTLAG (natt 10-21): var ligger den LÖPANDE TAKTENS slag (cfg.beat ur beatFeed.ts) mot LJUDETS basanslag?
 * Referens: nollfas-filtrerad bas (40-150 Hz, biquad fram+bak) i dB per hop; anslag = lokala toppar i den positiva differensen
 * (±60 ms), de 30 % starkaste. För varje anslag: signerat avstånd till närmaste slag i rutnätet (ms, negativt = ljudet före
 * rutnätet = rutnätet SENT). Bara när rutnätet är låst (cfg.beat, bpm > 40, konfidens >= 0,2) och efter 15 s.
 * Kör motorns kedja som konsertReplay (delad analysator inline med motorns cfg, låtgräns, beatFeed). Effektmotorn behövs inte.
 *   node tools/taktLag.mjs <wav> [--s 300]      (env, t.ex. DMX_ONSET_LAG_MS=21, gäller som i motorn)
 */
import { readFileSync } from "node:fs";
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const path = args.find((a) => a.endsWith(".wav"));
const MAX_S = Number(opt("--s", 300));
const DIST = new URL("../dist/", import.meta.url).href;
const { Analyser } = await import(DIST + "analyser.js");
const { BeatFeed } = await import(DIST + "beatFeed.js");
const { defaultConfig } = await import(DIST + "config.js");
const { BoundaryDetector } = await import(DIST + "boundaryDetector.js");
const { createSplitBuffers } = await import(DIST + "split.js");
const d = readFileSync(path); const SR = 48000, HOP = 128, EPOCH = 1700000000000, HMS = HOP / SR * 1000;
const n = Math.min((d.length - 44) >> 1, MAX_S * SR);
const x = new Float64Array(n); for (let i = 0; i < n; i++) x[i] = d.readInt16LE(44 + i * 2) / 32768;
function biquad(sig, type, f0, q = 0.707) {
  const w = 2 * Math.PI * f0 / SR, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q);
  let b0, b1, b2; if (type === "lp") { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; } else { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; }
  const a0 = 1 + al, a1 = -2 * c, a2 = 1 - al; const y = new Float64Array(sig.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < sig.length; i++) { const v = (b0 * sig[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0; x2 = x1; x1 = sig[i]; y2 = y1; y1 = v; y[i] = v; }
  return y;
}
const rev = (a) => a.slice().reverse();
const filtfilt = (sig, type, f0) => rev(biquad(rev(biquad(sig, type, f0)), type, f0));
const bass = filtfilt(filtfilt(x, "lp", 150), "hp", 40);
const H = Math.floor(n / HOP);
const ref = new Float64Array(H); for (let h = 0; h < H; h++) { let s = 0; for (let i = h * HOP; i < (h + 1) * HOP; i++) s += bass[i] * bass[i]; ref[h] = 10 * Math.log10(s / HOP + 1e-12); }
// Stigningen i LINJÄR effekt (dB-differensen lyfte tysta partier och bastoner lika mycket som kickarna: vikningens topp 1,1-1,3x),
// normerad mot 2 s löpande medel så starka och svaga partier väger lika.
const pw = ref.map((v) => 10 ** (v / 10)); const rise = new Float64Array(H); let mAvg = 1e-9;
for (let h = 1; h < H; h++) { mAvg += (pw[h] - mAvg) / 750; rise[h] = Math.max(0, pw[h] - pw[h - 1]) / (mAvg + 1e-12); }
const W = Math.round(60 / HMS); const cand = [];
for (let h = W; h < H - W; h++) { let mx = true; for (let k = -W; k <= W && mx; k++) if (k && rise[h + k] > rise[h]) mx = false; if (mx && rise[h] > 0) cand.push(h); }
const thr = cand.map((h) => rise[h]).sort((a, b) => a - b)[Math.floor(cand.length * 0.7)];
const onsets = cand.filter((h) => rise[h] >= thr);

const cfg = JSON.parse(JSON.stringify(defaultConfig));
const b = createSplitBuffers(); const an = new Analyser(BeatFeed.analyserCfg(cfg), { role: "fast", split: b }); an.setInlinePeer(new Analyser(structuredClone(cfg), { role: "slow", split: b }));
an.setGainLock(true, 1);
const feed = new BeatFeed(); const bounds = new BoundaryDetector(() => Date.now());
an.setSpectrumSink((mag, binHz) => bounds.pushSpectrum(mag, binHz));
const boundsArg = { level: 0, bpm: 0, bpmConfidence: 0 }; let lastBoundary = 0;
console.log = () => {};
const grid = new Array(H).fill(null); const okick = new Float64Array(H); const kb = new Float64Array(H); const buf = new Float32Array(HOP);
for (let h = 0; h < H; h++) {
  for (let i = 0; i < HOP; i++) buf[i] = x[h * HOP + i];
  const ms = EPOCH + h * HMS; an.setVirtualClock(ms - EPOCH); Date.now = () => ms; performance.now = () => ms - EPOCH;
  const fr = an.process(buf);
  boundsArg.level = fr.level; boundsArg.bpm = fr.bpm; boundsArg.bpmConfidence = fr.bpmConfidence; bounds.tick(boundsArg);
  if (bounds.boundaryCount !== lastBoundary) { lastBoundary = bounds.boundaryCount; an.hintTrackChange(5000); }
  okick[h] = fr.onset.kick;
  kb[h] = fr.kick ? 1 : 0;
  feed.update(fr, cfg, an);
  const g = cfg.beat; if (g && g.bpm > 40 && (g.confidence ?? 0) >= 0.2) grid[h] = [g.anchorMs, g.bpm];
}
// VIKNING: referensens stigning (och onset.kick) viks på rutnätets slag i 2 ms-fack över ±150 ms; toppen = var ljudets
// basanslag ligger mot rutnätets slag (negativt = ljudet före rutnätet = rutnätet SENT). Energin i hop h hör till tiden (h + 0,5) hop.
function fold(val) {
  const B = 150, hist = new Float64Array(2 * B / 2 + 1); let nn = 0;
  for (let h = Math.ceil(15000 / HMS); h < H; h++) {
    if (!grid[h] || val[h] <= 0) continue;
    const [a, bpm] = grid[h]; const bm = 60000 / bpm; const t = EPOCH + (h + 0.5) * HMS;
    let r = ((t - a) % bm + bm) % bm; if (r > bm / 2) r -= bm; if (Math.abs(r) > B) continue;
    hist[Math.round((r + B) / 2)] += val[h]; nn++;
  }
  // utjämna 5 fack (10 ms) och ta toppen
  let best = -1, bi = 0; for (let i = 2; i < hist.length - 2; i++) { const v = hist[i - 2] + hist[i - 1] + hist[i] + hist[i + 1] + hist[i + 2]; if (v > best) { best = v; bi = i; } }
  let tot = 0; for (const v of hist) tot += v;
  return { ms: bi * 2 - B, peak: +(best / 5 / (tot / hist.length)).toFixed(2), nn };
}
const fA = fold(rise), fK = fold(okick), fB = fold(kb);
process.stdout.write(`${path.split(/[\\/]/).pop()} ${(n / SR).toFixed(0)} s  låst ${(100 * grid.filter(Boolean).length / H).toFixed(0)} %  ljudets basanslag mot rutnätets slag ${fA.ms} ms (topp ${fA.peak}x medel)  onset.kick ${fK.ms} ms (${fK.peak}x)  kick (512-detektorn) ${fB.ms} ms (${fB.peak}x)\n`);
