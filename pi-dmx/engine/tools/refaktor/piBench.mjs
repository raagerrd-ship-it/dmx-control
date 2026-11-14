// TID PER HOPP PÅ PI:N, samma ljud genom två byggen av analysatorn (lotus-stil, delad inline = snabb + långsam väg i samma tråd).
//   node piBench.mjs <gammal/analyser.js> <ny/analyser.js> <wav> [varv]     Växelvis gammal/ny, första 10 s räknas inte.
import { readFileSync } from "node:fs"; import { pathToFileURL } from "node:url";
const [A, B, wav, R = "3"] = process.argv.slice(2); process.env.LOTUS_ANALYSER_SPLIT = "inline";
const mods = { gammal: await import(pathToFileURL(A).href), ny: await import(pathToFileURL(B).href) };
const b = readFileSync(wav), n = (b.length - 44) >> 1, y = new Float32Array(n); for (let i = 0; i < n; i++) y[i] = b.readInt16LE(44 + i * 2) / 32768;
const log = console.log; const HOP = 128, EPOCH = 1700000000000;
const run = mod => { console.log = () => {};
  const an = mod.createAnalyser({ sampleRate: 48000, hopSize: HOP, autoGainTarget: 0.75, maxGain: 200, noiseFloor: 0.0015, onsetEnhancements: false }); an.setGainLock(false); an.setVirtualClock(EPOCH);
  const buf = new Float32Array(HOP), t = []; let chk = 0;
  for (let off = 0; off + HOP <= n; off += HOP) { buf.set(y.subarray(off, off + HOP)); const ms = EPOCH + off / 48; an.setVirtualClock(ms);
    const t0 = process.hrtime.bigint(); const fr = an.process(buf); const dt = Number(process.hrtime.bigint() - t0) / 1000;
    if (off >= 480000) { t.push(dt); chk += fr.level + fr.bpm + fr.dropCount + fr.intensity; } }
  console.log = log; t.sort((p, q) => p - q); const q = p => t[Math.min(t.length - 1, Math.floor(p * t.length))];
  return { medel: t.reduce((s, v) => s + v, 0) / t.length, p50: q(0.5), p90: q(0.9), p99: q(0.99), max: t[t.length - 1], over: t.filter(v => v > 2667).length, n: t.length, chk };
};
const res = { gammal: [], ny: [] };
for (let r = 0; r < Number(R); r++) for (const k of r % 2 ? ["ny", "gammal"] : ["gammal", "ny"]) { const x = run(mods[k]); res[k].push(x);
  log(`varv ${r + 1} ${k.padEnd(6)} medel ${x.medel.toFixed(1)} us  p50 ${x.p50.toFixed(1)}  p90 ${x.p90.toFixed(1)}  p99 ${x.p99.toFixed(0)}  max ${x.max.toFixed(0)}  över 2,67 ms: ${x.over} av ${x.n}  (kontrollsumma ${x.chk.toFixed(3)})`); }
const m = (k, f) => res[k].reduce((s, x) => s + x[f], 0) / res[k].length;
log(`SUMMA medel us/hopp: gammal ${m("gammal", "medel").toFixed(1)}  ny ${m("ny", "medel").toFixed(1)}  (${(100 * (m("ny", "medel") / m("gammal", "medel") - 1)).toFixed(1)} %)   p99: gammal ${m("gammal", "p99").toFixed(0)}  ny ${m("ny", "p99").toFixed(0)}`);
