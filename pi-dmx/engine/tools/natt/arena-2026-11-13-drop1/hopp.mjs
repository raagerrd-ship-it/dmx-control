/** TEMPOHOPP UR SONDENS JSON: varje gång klockans tempo byter (> 4 %, oktaver räknas som byte) - när, från -> till, hur djupt basen
 *  låg under taket (nu och max de 4 s före), och om klockan är TILLBAKA på det gamla tempot inom 40 s (= hoppet var fel: samma låt).
 *  node tools/natt/arena-2026-11-13-drop1/hopp.mjs <sond.json> [<jämför.json>]   Med två filer: sekunder där tempot skiljer > 4 %. */
import { readFileSync } from "node:fs";
const las = p => JSON.parse(readFileSync(p));
const j = las(process.argv[2]), s = j.stegS, B = j.bpm, U = j.under, n = B.length;
const lik = (a, b) => a > 0 && b > 0 && Math.abs(a - b) / b <= 0.04;
let fel = 0, felS = 0, alla = 0; const rader = [];
for (let i = Math.round(20 / s); i < n; i++) {
  if (lik(B[i], B[i - 1]) || B[i - 1] <= 0) continue;
  // gamla tempot = medianen av de 6 s före hoppet
  const a = B.slice(Math.max(0, i - Math.round(6 / s)), i).sort((x, y) => x - y), gammalt = a[a.length >> 1];
  if (lik(B[i], gammalt)) continue;
  let umax = 0; for (let q = Math.max(0, i - Math.round(4 / s)); q <= i; q++) umax = Math.max(umax, U[q]);
  // tillbaka: första tidpunkt inom 40 s där tempot åter är det gamla i minst 3 s
  let back = -1; const need = Math.round(3 / s);
  for (let q = i + 1, run = 0; q < Math.min(n, i + Math.round(40 / s)); q++) { run = lik(B[q], gammalt) ? run + 1 : 0; if (run >= need) { back = (q - need + 1 - i) * s; break; } }
  alla++; if (back >= 0) { fel++; felS += back; }
  rader.push(`${(i * s).toFixed(1).padStart(6)} s  ${gammalt.toFixed(1).padStart(6)} -> ${B[i].toFixed(1).padStart(6)}   bas under taket ${U[i].toFixed(1).padStart(5)} dB (max 4 s före ${umax.toFixed(1).padStart(5)})   ${back >= 0 ? `TILLBAKA efter ${back.toFixed(1)} s` : "stannar (nytt tempo)"}`);
  // hoppa förbi den här episoden
  i += back >= 0 ? Math.round(back / s) : Math.round(3 / s);
}
console.log(`${process.argv[2]}: ${alla} tempobyten, ${fel} gick tillbaka (${felS.toFixed(0)} s på fel tempo)`);
if (!process.argv[3] || process.argv[3] === "-v") for (const r of rader) console.log(r);
if (process.argv[3] && process.argv[3] !== "-v") {
  const k = las(process.argv[3]); let d = 0, m = Math.min(n, k.bpm.length); const var_ = [];
  for (let i = Math.round(20 / s); i < m; i++) if (!lik(B[i], k.bpm[i])) { d++; if (!var_.length || i * s - var_[var_.length - 1][1] > 1) var_.push([i * s, i * s]); else var_[var_.length - 1][1] = i * s; }
  console.log(`  mot ${process.argv[3]}: tempot skiljer ${(d * s).toFixed(0)} s av ${((m - Math.round(20 / s)) * s).toFixed(0)} (${(100 * d / (m - Math.round(20 / s))).toFixed(1)} %): ${var_.map(v => `${v[0].toFixed(0)}-${v[1].toFixed(0)}`).join(" ")}`);
}
