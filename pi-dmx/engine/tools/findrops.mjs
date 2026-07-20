/**
 * OFFLINE strukturanalys — facit-generator.
 *
 * Den levande detektorn maste bestamma sig i realtid. Det behover inte den har:
 * med hela inspelningen kan vi se vad som hander EFTER varje ogonblick, och en
 * drop definieras just av att energin haller i sig efterat. Darfor blir den
 * betydligt palitligare an nagot som kan koras live — och duger som facit att
 * trimma den causala detektorn mot.
 *
 * Drop-signatur i dansmusik: subbas och kick FORSVINNER i en breakdown och
 * SLAR TILLBAKA vid dropen. Nivan sager mindre, for i den har musiken ligger
 * den hogt hela tiden (uppmatt: inZone sant 80% av tiden).
 */
import { replay } from "./replay.mjs";

const path = process.argv[2];
const fr = replay(path);
const dt = fr[1].t - fr[0].t;
const N = fr.length;

const sm = (arr, tau) => { const a = dt / Math.max(dt, tau); let y = arr[0]; return arr.map(v => (y += (v - y) * a)); };
// Lagfrekvent kropp = det som forsvinner i en breakdown och kommer tillbaka i dropen
const body = fr.map(f => (f.sub + f.kickB + f.bass) / 3);
const B = sm(body, 1.0);

const W = Math.round(6 / dt);      // 6 s fore och efter
const cand = [];
for (let i = W; i < N - W; i++) {
  let before = 0, after = 0;
  for (let k = i - W; k < i; k++) before += B[k];
  for (let k = i; k < i + W; k++) after += B[k];
  before /= W; after /= W;
  // lagsta punkten i fonstret fore -> var det en verklig svacka?
  let lo = 1; for (let k = i - W; k < i; k++) if (B[k] < lo) lo = B[k];
  cand.push({ t: fr[i].t, lift: after - before, before, after, lo });
}
// Toppar: lokalt maximum i lyft, minst 8 s isar
const sorted = [...cand].sort((a, b) => b.lift - a.lift);
const picked = [];
for (const c of sorted) {
  if (c.lift < 0.03) break;
  if (picked.some(p => Math.abs(p.t - c.t) < 8)) continue;
  picked.push(c);
  if (picked.length >= 40) break;
}
picked.sort((a, b) => a.t - b.t);
console.log(`hittade ${picked.length} kandidater (lyft i sub+kick+bas over 6 s fonster)`);
for (const p of picked) console.log(`  ${p.t.toFixed(1).padStart(6)}s  lyft ${p.lift.toFixed(3)}  fore ${p.before.toFixed(2)} -> efter ${p.after.toFixed(2)}`);
