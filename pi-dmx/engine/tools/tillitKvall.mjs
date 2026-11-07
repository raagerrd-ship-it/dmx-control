/**
 * TILLITEN RUNT DROPEN I KVÄLLEN (dagkörningen 2026-11-07, agent-tillit): läser konsertReplay --json (10 Hz-rader med conf = tilliten ut
 * till effekterna, trust = effects.ts beatTrust, cbpm = effektklockans tempo) - samma körning som natt.py:s kvällssteg
 * (konsertReplay <kvall-svep.wav> --step 5 --delad-cfg --live-kick). Kvällen har riktiga break (ladans ljud), mixarna nästan inga.
 * Per drop (drops-flank, efter 15 s): klockan borta före (s av 10), lås = conf >= 0,8 med klocka, lås57 = conf >= 0,57 (trustRaw full),
 * takt85 = beatTrust >= 0,85 (dirigentens 'låst takt'), tillit 0-3 s. 15 = aldrig inom 15 s.
 *   node tools/tillitKvall.mjs a.json [b.json ...]     (första = A; för B skrivs drops där lås skiljer > 0,3 s)
 *   --facit f.txt  dropens tider ur tools/breakSyntet.py:s utskrift ('drop X s  break B s') i stället för drops-flanken
 *                  (+ 'show' = om motorn själv räknade en drop inom +-1,5 s); sammanfattningen även per breaklängd.
 */
import { readFileSync } from "node:fs";
const say = (...a) => process.stdout.write(a.join(" ") + "\n");
const argv = process.argv.slice(2), fi = argv.indexOf("--facit");
const FACIT = fi >= 0 ? readFileSync(argv[fi + 1], "utf8").split(/\n/).map((l) => l.match(/drop ([\d.]+) s\s+break ([\d.]+)/)).filter(Boolean).map((m) => ({ t: +m[1], B: +m[2] })) : null;
const files = argv.filter((a) => a.endsWith(".json"));
const med = (a) => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[b.length >> 1] : NaN; };
const mean = (a) => a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN;
const f = (x, d = 2) => (x == null || Number.isNaN(x) ? "-" : x.toFixed(d));
function load(fn) {
  const J = JSON.parse(readFileSync(fn, "utf8")), C = J.columns, R = J.rows, ix = (k) => C.indexOf(k);
  const iT = ix("t"), iD = ix("drops"), iC = ix("conf"), iTr = ix("trust"), iB = ix("cbpm"), iS = ix("sec"), iL = ix("look");
  const drops = []; let last = R[0][iD];
  const flank = []; for (let i = 1; i < R.length; i++) if (R[i][iD] !== R[i - 1][iD]) flank.push(R[i][iT]);
  const idx = FACIT ? FACIT.map((d) => R.findIndex((r) => r[iT] >= d.t)) : null;
  for (let q = 1; q < (FACIT ? FACIT.length + 1 : R.length); q++) {
    let i = q;
    if (FACIT) i = idx[q - 1]; else { if (R[i][iD] === last) continue; last = R[i][iD]; }
    if (i < 1) continue;
    const t0 = FACIT ? FACIT[q - 1].t : R[i][iT]; if (t0 < 15) continue;
    let noll = 0, n = 0; for (let j = i - 1; j >= 0 && R[j][iT] > t0 - 10; j--) { n++; if (!(R[j][iB] > 0)) noll++; }
    const first = (ok) => { for (let j = i; j < R.length && R[j][iT] < t0 + 15; j++) if (ok(R[j])) return R[j][iT] - t0; return 15; };
    const w = R.filter((r) => r[iT] >= t0 && r[iT] < t0 + 3);
    drops.push({ B: FACIT ? FACIT[q - 1].B : 0, show: flank.some((x) => Math.abs(x - t0) < 1.5), cpre: R[Math.max(0, i - 3)][iC], t: t0, sec: R[i][iS], look: R[i][iL], noll: n ? noll / n * 10 : 0,
      las: first((r) => r[iB] > 0 && r[iC] >= 0.8), las57: first((r) => r[iB] > 0 && r[iC] >= 0.57), takt: first((r) => r[iTr] >= 0.85),
      c0: R[i - 1][iC], s03: mean(w.map((r) => (r[iB] > 0 ? r[iC] : 0))), tr03: mean(w.map((r) => r[iTr])) });
  }
  return { fn: fn.split(/[\\/]/).pop(), drops };
}
const T = files.map(load), A = T[0];
say(`${A.fn}: per drop  t | sek | look | klocka borta före | lås | lås57 | takt85 | conf vid drop | conf 0-3 s | beatTrust 0-3 s`);
for (const d of A.drops) say(`  ${f(d.t, 1).padStart(7)} ${FACIT ? "B" + d.B + (d.show ? " show" : " ----") + " " : ""}${String(d.sec).padEnd(6)} ${String(d.look).padEnd(12)} borta ${f(d.noll, 1)}  lås ${f(d.las).padStart(5)}  lås57 ${f(d.las57).padStart(5)}  takt85 ${f(d.takt).padStart(5)}  c0 ${f(d.c0)}  c03 ${f(d.s03)}  tr03 ${f(d.tr03)}`);
for (const B of T.slice(1)) {
  say(`\n${A.fn} -> ${B.fn}: drops där lås/lås57/takt85 skiljer > 0,3 s (A / B)`);
  const left = B.drops.slice();
  for (const a of A.drops) {
    let bi = -1, bd = 1.5; for (let k = 0; k < left.length; k++) { const d = Math.abs(left[k].t - a.t); if (d < bd) { bd = d; bi = k; } }
    const b = bi >= 0 ? left.splice(bi, 1)[0] : null;
    if (!b) { say(`  ${f(a.t, 1).padStart(7)} saknas i B`); continue; }
    if (Math.abs(a.las - b.las) > 0.3 || Math.abs(a.las57 - b.las57) > 0.3 || Math.abs(a.takt - b.takt) > 0.3)
      say(`  ${f(a.t, 1).padStart(7)} ${String(a.sec).padEnd(6)} borta ${f(a.noll, 1)}/${f(b.noll, 1)}  lås ${f(a.las)}/${f(b.las)}  lås57 ${f(a.las57)}/${f(b.las57)}  takt85 ${f(a.takt)}/${f(b.takt)}  c03 ${f(a.s03)}/${f(b.s03)}  look ${a.look}/${b.look}`);
  }
  for (const b of left) say(`  ${f(b.t, 1).padStart(7)} bara i B`);
}
say("\nSAMMANFATTNING");
const sets = [];
for (const X of T) { sets.push([X.fn, X.drops]); if (FACIT) for (const B of [...new Set(X.drops.map((x) => x.B))]) sets.push([X.fn + " break " + B + " s", X.drops.filter((x) => x.B === B)]); }
for (const [fn, d] of sets) {
  const X = { fn }, g = (k) => d.map((x) => x[k]);
  say(`  ${X.fn.padEnd(30)} drops ${d.length}  klocka borta före ${d.filter((x) => x.noll > 0).length}  lås median ${f(med(g("las")))} medel ${f(mean(g("las")))} >1 s ${g("las").filter((x) => x > 1).length}  lås57 medel ${f(mean(g("las57")))} >1 s ${g("las57").filter((x) => x > 1).length}  takt85 medel ${f(mean(g("takt")))} >1 s ${g("takt").filter((x) => x > 1).length}  conf 0-3 s ${f(mean(g("s03")))}  beatTrust 0-3 s ${f(mean(g("tr03")))}${FACIT ? "  show-drop " + d.filter((x) => x.show).length + "/" + d.length + "  conf före " + f(mean(g("cpre"))) : ""}`);
}
