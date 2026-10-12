/**
 * ENERGIMÄTT (10-12, energikedjan: "följa basgången mer än diskant"). Läser konsertReplay --trace (.f32) + --json för en eller flera
 * filer och skriver per sektion: topp/dal på ljusaste lampan (p95/p10), sving = medel av (max-min) i 0,6 s-fönster på ljusaste lampan,
 * slagdjup = samma / max, per-lampa-sving (tända lampor), r mot basen (bodyDb) och mot diskanten (treble+air dB) - riggens medelljus,
 * bästa lag 0..150 ms, både rått och högpassat (minus 2 s glidande medel = takt-/basgångsskalan) - och tända lampor (> 0,3 absolut, och > 0,3 x ljusaste = hur många som syns i bilden).
 * Drop- och minidrop-looken räknas inte in (de är fullt med avsikt). Sist antal drops, minidrop-looker och lookbyten.
 *   node tools/energiMatt.mjs a.f32 [b.f32 ...]   (json-filen = samma namn med .json)
 */
import { readFileSync, existsSync } from "node:fs";
const files = process.argv.slice(2).filter((a) => a.endsWith(".f32"));
const W = 10, NAMES = ["intro", "low", "build", "high", "break"];
const agg = NAMES.map(() => ({ n: 0, tops: [], swing: 0, depth: 0, nw: 0, lampSw: 0, nl: 0, lit: 0, rel: 0, rb: 0, rt: 0, rbh: 0, rth: 0, rw: 0 }));
let drops = 0, minis = 0, looks = 0, lifts = 0, secs = 0;
const pct = (a, p) => { if (!a.length) return NaN; const s = Float64Array.from(a).sort(); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
function corr(x, y, lagMax) {   // bästa r över lag 0..lagMax (ljuset efter ljudet)
  let best = -2;
  for (let L = 0; L <= lagMax; L++) {
    const n = x.length - L; if (n < 40) continue;
    let sx = 0, sy = 0; for (let i = 0; i < n; i++) { sx += x[i + L]; sy += y[i]; } sx /= n; sy /= n;
    let a = 0, b = 0, c = 0; for (let i = 0; i < n; i++) { const dx = x[i + L] - sx, dy = y[i] - sy; a += dx * dy; b += dx * dx; c += dy * dy; }
    const r = b > 0 && c > 0 ? a / Math.sqrt(b * c) : 0; if (r > best) best = r;
  }
  return best;
}
const hp = (v, k) => { const o = new Float64Array(v.length); let s = 0; const q = []; for (let i = 0; i < v.length; i++) { q.push(v[i]); s += v[i]; if (q.length > k) s -= q.shift(); o[i] = v[i] - s / q.length; } return o; };
for (const f of files) {
  const b = readFileSync(f), d = new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4), N = d.length / W;
  const js = f.replace(/\.f32$/, ".json");
  if (existsSync(js)) {
    const J = JSON.parse(readFileSync(js, "utf8")), c = J.columns, R = J.rows, ix = (k) => c.indexOf(k);
    const last = R[R.length - 1]; drops += last[ix("drops")]; lifts += last[ix("lift")];
    for (let i = 1; i < R.length; i++) { if (R[i][ix("miniLook")] && !R[i - 1][ix("miniLook")]) minis++; if (R[i][ix("look")] !== R[i - 1][ix("look")]) looks++; }
    secs += last[0];
  }
  // sammanhängande segment per sektion (utan drop-look) -> mått
  let i0 = 0;
  const flush = (a, e) => {
    const s = d[a * W + 1]; if (s > 4 || e - a < 24) return; const g = agg[s];
    const top = [], mean = [], bass = [], treb = [];
    for (let i = a; i < e; i++) { const o = i * W; const L = [d[o + 2], d[o + 3], d[o + 4], d[o + 5]]; const T = Math.max(...L); top.push(T); mean.push((L[0] + L[1] + L[2] + L[3]) / 4); bass.push(d[o + 6]); treb.push(d[o + 7]); g.tops.push(T); g.lit += L.filter((x) => x > 0.3).length; if (T > 0.02) g.rel += L.filter((x) => x > 0.3 * T).length; else g.rel += 0; g.n++; }
    for (let w = a; w + 24 <= e; w += 24) {   // 0,6 s-fönster
      let mx = 0, mn = 9; for (let i = w; i < w + 24; i++) { const T = top[i - a]; if (T > mx) mx = T; if (T < mn) mn = T; }
      g.swing += mx - mn; if (mx > 0.02) g.depth += (mx - mn) / mx; g.nw++;
      for (let l = 0; l < 4; l++) { let lx = 0, ln = 9; for (let i = w; i < w + 24; i++) { const v = d[i * W + 2 + l]; if (v > lx) lx = v; if (v < ln) ln = v; } if (lx > 0.05) { g.lampSw += lx - ln; g.nl++; } }
    }
    if (e - a >= 160) {   // >= 4 s för korrelation
      const wgt = e - a;
      g.rb += wgt * corr(mean, bass, 6); g.rt += wgt * corr(mean, treb, 6);
      g.rbh += wgt * corr(hp(mean, 80), hp(bass, 80), 6); g.rth += wgt * corr(hp(mean, 80), hp(treb, 80), 6); g.rw += wgt;
    }
  };
  for (let i = 1; i <= N; i++) {
    const brk = i === N || d[i * W + 1] !== d[i0 * W + 1] || d[i * W + 8] !== d[i0 * W + 8];
    if (brk) { if (d[i0 * W + 8] === 0) flush(i0, i); i0 = i; }
  }
}
const f2 = (x) => (Number.isFinite(x) ? x.toFixed(2) : "  - ");
console.log("sektion  andel  topp  dal   sving slagdjup lampsving  r_bas r_disk | r_bas_hp r_disk_hp  tända  tända_rel");
const tot = agg.reduce((a, g) => a + g.n, 0);
for (let s = 0; s < 5; s++) {
  const g = agg[s]; if (!g.n) continue;
  console.log(`${NAMES[s].padEnd(7)} ${(100 * g.n / tot).toFixed(0).padStart(4)} %  ${f2(pct(g.tops, 0.95))}  ${f2(pct(g.tops, 0.10))}  ${f2(g.swing / g.nw)}   ${f2(g.depth / g.nw)}     ${f2(g.lampSw / g.nl)}      ${f2(g.rb / g.rw)}  ${f2(g.rt / g.rw)}  |  ${f2(g.rbh / g.rw)}     ${f2(g.rth / g.rw)}      ${f2(g.lit / g.n)}   ${f2(g.rel / g.n)}`);
}
console.log(`drops ${drops}  minidrop-looker ${minis}  lyft ${lifts}  lookbyten ${looks}  (${(secs / 60).toFixed(0)} min)`);
