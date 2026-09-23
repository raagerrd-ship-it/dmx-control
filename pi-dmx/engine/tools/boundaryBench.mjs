/**
 * LATGRANS-BANK (2026-09-23). Mater analysatorns klangnyhet (DMX_BOUNDARY_NOV=1) mot PC-facit for latgranser och
 * mot motorns egna dropfyrningar. Svarar pa agarens fraga "far bort falska drops vid latbyte/intro/outro":
 *   1. Stiger nyheten vid en verklig latgrans? (recall mot facit)
 *   2. Stiger den FORE de drops som ligger pa en grans? (da kan en grind hinna)
 *   3. Hur ofta stiger den nar ingenting hander? (falsklarm per minut)
 *
 *   DMX_BOUNDARY_NOV=1 node tools/boundaryBench.mjs <wav> --facit <bnd.json> [--tros 0.06]
 *
 * Facit kommer fran lotus PC-sidans nyhetsdetektor (tools/tempo-facit-pc/mkcorpus_mix.py, librosa) - samma
 * definition som anvands nar korpusens mix-fonster klipps. Det ar STRUKTURgranser, inte bara latbyten: en tydlig
 * sektionsvaxel raknas ocksa. Det ar avsiktligt - bada ar tillfallen dar en "drop" oftast ar falsk.
 */
import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const path = args.find((a) => a.endsWith(".wav"));
if (!path) { console.error("ange en wav-fil"); process.exit(2); }
const facit = JSON.parse(readFileSync(opt("--facit", ""), "utf8"));
const TROS = Number(opt("--tros", 0.06));

const { Analyser } = await import("../dist/analyser.js");
const { defaultConfig } = await import("../dist/config.js");

const d = readFileSync(path);
const nSamples = (d.length - 44) >> 1;
const SR = 48000, HOP = 128, EPOCH = 1700000000000;
const an = new Analyser(JSON.parse(JSON.stringify(defaultConfig)));
an.setGainLock(true, 1);

const origLog = console.log;
const fires = [];
console.log = (...a) => { const s = a.join(" "); if (s.startsWith("[dropfire]")) fires.push(s); };

const buf = new Float32Array(HOP);
const nov = [];           // [t, novelty] nar den andras (1 s-upplosning)
let lastNov = -1, lastDrops = 0;
const dropT = [];
for (let off = 0; off + HOP <= nSamples; off += HOP) {
  for (let i = 0; i < HOP; i++) buf[i] = d.readInt16LE(44 + (off + i) * 2) / 32768;
  const tS = off / SR;
  an.setVirtualClock(EPOCH + tS * 1000);
  const fr = an.process(buf);
  if (fr.dropCount !== lastDrops) { lastDrops = fr.dropCount; dropT.push(tS); }
  if (an.boundaryNov !== lastNov) { lastNov = an.boundaryNov; nov.push([tS, an.boundaryNov]); }
}
console.log = origLog;

if (nov.length < 5) { console.error("ingen nyhetssignal - glomde du DMX_BOUNDARY_NOV=1?"); process.exit(2); }

const novIn = (t0, t1) => { let mx = 0; for (const [t, v] of nov) if (t >= t0 && t <= t1) { if (v > mx) mx = v; } return mx; };
const vals = nov.map((x) => x[1]).sort((a, b) => a - b);
const p = (q) => vals[Math.min(vals.length - 1, Math.floor(q * vals.length))];
const totMin = (nSamples / SR) / 60;

console.log(`\n=== ${path} ===`);
console.log(`nyhet: p50 ${p(.5).toFixed(3)}  p90 ${p(.9).toFixed(3)}  p99 ${p(.99).toFixed(3)}  max ${vals[vals.length - 1].toFixed(3)}   (${nov.length} block)`);

console.log(`\n1) VID FACIT-GRANSERNA (max nyhet i +/- 3 s):`);
let hit = 0;
for (const t of facit) {
  const m = novIn(t - 3, t + 3);
  if (m >= TROS) hit++;
  console.log(`   ${String(Math.round(t)).padStart(4)} s   nyhet ${m.toFixed(3)}  ${m >= TROS ? "TRAFF" : "missad"}`);
}
console.log(`   recall vid troskel ${TROS}: ${hit}/${facit.length}`);

// Falsklarm: block over troskeln som INTE ligger nara en facit-grans (raknat som distinkta toppar, 6 s hophallning)
let fp = 0, lastFp = -99;
for (const [t, v] of nov) {
  if (v < TROS) continue;
  if (facit.some((b) => Math.abs(b - t) <= 3)) continue;
  if (t - lastFp < 6) continue;
  lastFp = t; fp++;
}
console.log(`   falsklarm utan facit-grans: ${fp} st = ${(fp / totMin).toFixed(1)}/min`);

console.log(`\n2) VID DROPFYRNINGARNA (max nyhet i de 4 s FORE fyrningen):`);
for (const t of dropT) {
  const before = novIn(t - 4, t);
  const near = facit.find((b) => Math.abs(b - t) <= 2);
  console.log(`   ${t.toFixed(1).padStart(6)} s  nyhet-fore ${before.toFixed(3)}  ${near !== undefined ? `<- FACIT-GRANS ${Math.round(near)} s` : ""}`);
}
const onB = dropT.filter((t) => facit.some((b) => Math.abs(b - t) <= 2));
const offB = dropT.filter((t) => !facit.some((b) => Math.abs(b - t) <= 2));
const avg = (a) => a.length ? a.reduce((s, t) => s + novIn(t - 4, t), 0) / a.length : 0;
console.log(`\n   drops PA en grans:    ${onB.length} st, medelnyhet fore ${avg(onB).toFixed(3)}`);
console.log(`   drops UTANFOR grans:  ${offB.length} st, medelnyhet fore ${avg(offB).toFixed(3)}`);
console.log(`   => en grind pa nyheten kan skilja dem at om den forsta ar tydligt hogre.`);
