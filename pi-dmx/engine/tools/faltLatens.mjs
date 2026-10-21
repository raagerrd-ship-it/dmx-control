/**
 * FÄLTLATENS (natt 10-21, 'den tvådelade analysatorn'): hur långt efter LJUDET ligger varje fält som ljuset läser direkt?
 * Referens ur wav:en utan fasfel: nollfas-filtrerad (biquad fram+bak) energi per hop (2,67 ms), i dB. Fältets och referensens
 * STIGANDE flanker (positiv differens) korskorreleras över 0..200 ms; toppen = fältets effektiva fördröjning för anslag.
 * Analysatorn körs som live (delad inline, DMX-profilen, virtuell klocka); första 15 s hoppas över (uppvärmningen, mätfälla 44).
 *   node tools/faltLatens.mjs <wav> [--s 300]
 * Fält: level (512-RMS), onset.kick (512-flux kickband), kick (bool), bodyDb (2048-FFT basband, drop-kroppen), specAbs.kick
 * (2048-FFT 60-120 Hz). Referenser: helband, bas 40-150 Hz.
 */
import { readFileSync } from "node:fs";
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const path = args.find((a) => a.endsWith(".wav"));
const MAX_S = Number(opt("--s", 300));
const DIST = new URL("../dist/", import.meta.url).href;
const { Analyser } = await import(DIST + "analyser.js");
const { defaultConfig } = await import(DIST + "config.js");
const { createSplitBuffers } = await import(DIST + "split.js");
const d = readFileSync(path); const SR = 48000, HOP = 128, EPOCH = 1700000000000;
const n = Math.min((d.length - 44) >> 1, MAX_S * SR);
const x = new Float64Array(n); for (let i = 0; i < n; i++) x[i] = d.readInt16LE(44 + i * 2) / 32768;

function biquad(sig, type, f0, q = 0.707) {   // RBJ, en riktning
  const w = 2 * Math.PI * f0 / SR, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q);
  let b0, b1, b2; if (type === "lp") { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; } else { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; }
  const a0 = 1 + al, a1 = -2 * c, a2 = 1 - al; const y = new Float64Array(sig.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < sig.length; i++) { const v = (b0 * sig[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0; x2 = x1; x1 = sig[i]; y2 = y1; y1 = v; y[i] = v; }
  return y;
}
const rev = (a) => a.slice().reverse();
const filtfilt = (sig, type, f0) => rev(biquad(rev(biquad(sig, type, f0)), type, f0));
const hopDb = (sig) => { const H = Math.floor(sig.length / HOP), o = new Float64Array(H); for (let h = 0; h < H; h++) { let s = 0; for (let i = h * HOP; i < (h + 1) * HOP; i++) s += sig[i] * sig[i]; o[h] = 10 * Math.log10(s / HOP + 1e-12); } return o; };
const refFull = hopDb(x);
const refBass = hopDb(filtfilt(filtfilt(x, "lp", 150), "hp", 40));
const refHigh = hopDb(filtfilt(x, "hp", 5000));

const cfg = JSON.parse(JSON.stringify(defaultConfig));
const b = createSplitBuffers(); const an = new Analyser(cfg, { role: "fast", split: b }); an.setInlinePeer(new Analyser(structuredClone(cfg), { role: "slow", split: b }));
an.setGainLock(true, 1);
console.log = () => {};
const H = Math.floor(n / HOP);
const F = { level: new Float64Array(H), onsetKick: new Float64Array(H), kick: new Float64Array(H), bodyDb: new Float64Array(H), specKick: new Float64Array(H), hat: new Float64Array(H), onsetTreble: new Float64Array(H), drumKick: new Float64Array(H) };
const buf = new Float32Array(HOP);
for (let h = 0; h < H; h++) {
  for (let i = 0; i < HOP; i++) buf[i] = x[h * HOP + i];
  const ms = EPOCH + h * HOP / SR * 1000; an.setVirtualClock(ms - EPOCH); Date.now = () => ms; performance.now = () => ms - EPOCH;
  const fr = an.process(buf);
  F.level[h] = 20 * Math.log10(fr.level + 1e-6); F.onsetKick[h] = fr.onset.kick; F.kick[h] = fr.kick ? 1 : 0; F.bodyDb[h] = fr.bodyDb; F.specKick[h] = 20 * Math.log10((fr.specAbs?.kick ?? 0) + 1e-7);
  F.hat[h] = fr.drum.hat; F.onsetTreble[h] = fr.onset.treble; F.drumKick[h] = fr.drum.kick;
}
const START = Math.ceil(15 * SR / HOP);
const rise = (a, isOnset) => { const o = new Float64Array(a.length); for (let i = 1; i < a.length; i++) { const v = isOnset ? a[i] : a[i] - a[i - 1]; o[i] = v > 0 ? v : 0; } return o; };
function lagOf(field, ref, isOnset) {
  const fa = rise(field, isOnset), ra = rise(ref, false); const L = Math.ceil(0.2 * SR / HOP);
  let best = -1, bl = 0; const cc = [];
  for (let l = 0; l <= L; l++) {
    let s = 0, sf = 0, sr = 0;
    for (let i = START; i + l < fa.length; i++) { s += fa[i + l] * ra[i]; sf += fa[i + l] * fa[i + l]; sr += ra[i] * ra[i]; }
    const c = s / Math.sqrt(sf * sr + 1e-12); cc.push(c); if (c > best) { best = c; bl = l; }
  }
  // halvbredd över toppen (hur utsmetad fördröjningen är)
  let lo = bl, hi = bl; while (lo > 0 && cc[lo - 1] > best * 0.5) lo--; while (hi < cc.length - 1 && cc[hi + 1] > best * 0.5) hi++;
  return { ms: +(bl * HOP / SR * 1000).toFixed(1), r: +best.toFixed(3), halfMs: [+(lo * HOP / SR * 1000).toFixed(0), +(hi * HOP / SR * 1000).toFixed(0)] };
}
const res = {
  "level (512 RMS) mot helband": lagOf(F.level, refFull, false),
  "onset.kick (512) mot bas": lagOf(F.onsetKick, refBass, true),
  "kick (bool) mot bas": lagOf(F.kick, refBass, true),
  "specAbs.kick (2048) mot bas": lagOf(F.specKick, refBass, false),
  "bodyDb (2048, drop-kropp) mot bas": lagOf(F.bodyDb, refBass, false),
  "drum.kick (512 kickdetektor) mot bas": lagOf(F.drumKick, refBass, false),
  "onset.treble (2048) mot diskant": lagOf(F.onsetTreble, refHigh, true),
  "drum.hat mot diskant": lagOf(F.hat, refHigh, false),
};
process.stdout.write(`${path.split(/[\\/]/).pop()} ${(n / SR).toFixed(0)} s\n`);
for (const [k, v] of Object.entries(res)) process.stdout.write(`  ${k.padEnd(36)} ${String(v.ms).padStart(6)} ms  r ${v.r}  halv [${v.halfMs.join("..")}] ms\n`);
