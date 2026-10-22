/**
 * LÅTSTART (natt 10-22, ägaren 10-21: 'hur snabbt dirigenten förstår typ av sektion/låt'): hur länge efter en låtgräns står
 * sektionen fel, och när kommer första looken som håller? Läser konsertReplay-json (10 Hz-rader + LATGRANS i loggen) + wav:en.
 *   facit per sekund ur wav:en, INOM låten (gräns -> nästa gräns/filslut, kausalt okänt för analysatorn): 1 s RMS-dB, medel över
 *   +-2 s, percentilrang i låten: >= 0,65 'high', <= 0,35 'low', annars 'mid' (mid godtar allt utom intro).
 *   etikett: high = high; low = low/break/intro (en lugn start ÄR intro); build = mid-godkänd.
 *   rätt     = tid från gränsen till första sekund där etiketten stämmer och stämmer 3 s i rad
 *   intro    = sekunder med 'intro' i gränsens första 30 s
 *   fel20    = andel av första 20 s där etiketten inte stämmer; hiStart = andel av facit-high-sekunderna i första 20 s som etiketten säger high
 *   look8    = tid från gränsen till start av första look (efter gränsen) som håller >= 8 s
 * Bara gränser med >= 40 s till nästa (riktiga låtar, inte falska gränser i refrängen) räknas i 'låtar'; alla i 'alla'.
 *   node tools/latStart.mjs <dir eller json ...> [--per]
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
const args = process.argv.slice(2);
const files = [];
for (const a of args.filter((a) => !a.startsWith("--"))) {
  if (statSync(a).isDirectory()) for (const f of readdirSync(a).filter((f) => f.endsWith(".json")).sort()) files.push(a + "/" + f); else files.push(a);
}
const med = (a) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[s.length >> 1] : NaN; };
const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor(p * (s.length - 1))] : NaN; };
const agg = { alla: { n: 0, ratt: [], miss: 0, intro: [], fel20: [], look8: [], hiN: 0, hiOk: 0 }, latar: { n: 0, ratt: [], miss: 0, intro: [], fel20: [], look8: [], hiN: 0, hiOk: 0 } };
for (const jf of files) {
  const J = JSON.parse(readFileSync(jf, "utf8")); const C = J.columns; const iT = C.indexOf("t"), iL = C.indexOf("look"), iS = C.indexOf("sec");
  const R = J.rows; const dur = R.length ? R[R.length - 1][iT] : 0;
  const d = readFileSync(J.wav); const n = (d.length - 44) >> 1; const SR = 48000;
  const db = []; for (let s = 0; (s + 1) * SR <= n; s++) { let a = 0; for (let i = 0; i < SR; i += 4) { const v = d.readInt16LE(44 + (s * SR + i) * 2) / 32768; a += v * v; } db.push(10 * Math.log10(a / (SR / 4) + 1e-10)); }
  const B = J.log.filter((x) => x[1] === "LATGRANS").map((x) => x[0]);
  const secAt = (t) => { const k = Math.min(R.length - 1, Math.max(0, Math.round(t * 10))); return R[k][iS]; };
  for (let bi = 0; bi < B.length; bi++) {
    const t0 = B[bi], t1 = bi + 1 < B.length ? B[bi + 1] : dur; const s0 = Math.ceil(t0), s1 = Math.min(db.length, Math.floor(t1));
    if (s1 - s0 < 10) continue;
    const sm = []; for (let s = s0; s < s1; s++) { let a = 0, c = 0; for (let k = -2; k <= 2; k++) if (s + k >= s0 && s + k < s1) { a += db[s + k]; c++; } sm.push(a / c); }
    const srt = sm.slice().sort((x, y) => x - y); const rank = (v) => { let lo = 0; while (lo < srt.length && srt[lo] < v) lo++; return lo / Math.max(1, srt.length - 1); };
    const fac = sm.map((v) => { const r = rank(v); return r >= 0.65 ? "high" : r <= 0.35 ? "low" : "mid"; });
    const ok = (s) => { const lab = secAt(s + 0.5), f = fac[s - s0]; if (lab === "intro") return f === "low"; if (f === "mid") return true; return f === "high" ? lab === "high" : lab === "low" || lab === "break"; };
    let ratt = -1; for (let s = s0; s + 3 <= s1 && s < s0 + 60; s++) if (ok(s) && ok(s + 1) && ok(s + 2)) { ratt = s - t0; break; }
    let intro = 0; for (let s = s0; s < Math.min(s1, s0 + 30); s++) if (secAt(s + 0.5) === "intro") intro++;
    let bad = 0, cnt = 0, hiN = 0, hiOk = 0; for (let s = s0; s < Math.min(s1, s0 + 20); s++) { cnt++; if (!ok(s)) bad++; if (fac[s - s0] === "high") { hiN++; if (secAt(s + 0.5) === "high") hiOk++; } }
    let look8 = -1; { const k0 = Math.round(t0 * 10); let st = k0;
      for (let k = k0 + 1; k <= R.length; k++) if (k === R.length || R[k][iL] !== R[k - 1][iL]) { if ((k - st) / 10 >= 8 && st > k0) { look8 = st / 10 - t0; break; } st = k; } }
    for (const key of t1 - t0 >= 40 ? ["alla", "latar"] : ["alla"]) {
      const A = agg[key]; A.n++; if (ratt < 0) A.miss++; else A.ratt.push(ratt); A.intro.push(intro); A.fel20.push(bad / Math.max(1, cnt)); A.hiN += hiN; A.hiOk += hiOk; if (look8 >= 0) A.look8.push(look8);
    }
    if (args.includes("--per")) process.stdout.write(`${jf.split(/[\\/]/).pop()} ${t0.toFixed(0)} s (${(t1 - t0).toFixed(0)} s): rätt ${ratt < 0 ? "miss" : ratt.toFixed(1)} intro ${intro} fel20 ${(100 * bad / Math.max(1, cnt)).toFixed(0)} % look8 ${look8 < 0 ? "-" : look8.toFixed(1)}\n`);
  }
}
for (const [k, A] of Object.entries(agg)) {
  const mean = (a) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
  process.stdout.write(`${k.padEnd(5)} ${A.n} gränser: rätt median ${med(A.ratt).toFixed(1)} s (p75 ${q(A.ratt, 0.75).toFixed(1)}, miss ${A.miss}), intro ${mean(A.intro).toFixed(1)} s/30, fel20 ${(100 * mean(A.fel20)).toFixed(0)} %, hiStart ${(100 * A.hiOk / Math.max(1, A.hiN)).toFixed(0)} % (${A.hiN} s), look>=8 s median ${med(A.look8).toFixed(1)} s (p75 ${q(A.look8, 0.75).toFixed(1)})\n`);
}
