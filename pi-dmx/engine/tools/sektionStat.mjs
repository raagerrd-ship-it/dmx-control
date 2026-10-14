/**
 * Summerar sektionMatt-json (natten 10-14): node tools/sektionStat.mjs <katalog med *.json> [--facit tools/natt/latbyten-facit.json]
 * Mått: sektionsbyten/min, andel sektioner < 8 s (antal och tid), korta per etikett, nollningar till intro mitt i inspelningen,
 * låtgränser/min och - med facit - rätt (inom 15 s från ett facit-byte) / falska / missade.
 */
import { readFileSync, readdirSync } from "node:fs";
const args = process.argv.slice(2);
const dir = args[0];
const fi = args.indexOf("--facit"); const facit = fi >= 0 ? JSON.parse(readFileSync(args[fi + 1], "utf8")) : null;
let min = 0, nSeg = 0, nShort = 0, tShort = 0, nIntro = 0, nLat = 0, ok = 0, fals = 0, miss = 0, nFac = 0;
const shortBy = {}, segBy = {}, tBy = {};
const per = [];
for (const f of readdirSync(dir).filter((x) => x.endsWith(".json")).sort()) {
  const j = JSON.parse(readFileSync(dir + "/" + f, "utf8"));
  min += j.min; nLat += j.latgrans.length;
  // inre segment (inte första/sista: de är avklippta av inspelningen)
  const inner = j.segs.slice(1, -1);
  let fs = 0;
  for (const [a, b, l] of j.segs) tBy[l] = (tBy[l] ?? 0) + b - a;
  for (const [a, b, l] of inner) { nSeg++; segBy[l] = (segBy[l] ?? 0) + 1; if (b - a < 8) { nShort++; fs++; tShort += b - a; shortBy[l] = (shortBy[l] ?? 0) + 1; } }
  for (let i = 1; i < j.segs.length; i++) if (j.segs[i][2] === 'intro' && j.segs[i][0] > 20) nIntro++;
  let fOk = 0, fFals = 0, fMiss = 0;
  if (facit) {
    const key = Object.keys(facit).find((k) => j.wav.includes(k)); const F = key ? facit[key] : [];
    nFac += F.length;
    for (const t of j.latgrans) { if (F.some((x) => Math.abs(x - t) <= 15)) fOk++; else fFals++; }
    for (const x of F) if (!j.latgrans.some((t) => Math.abs(x - t) <= 15)) fMiss++;
    ok += fOk; fals += fFals; miss += fMiss;
  }
  per.push(`${f.padEnd(14)} ${j.min.toFixed(1).padStart(5)} min  byten ${(inner.length / j.min).toFixed(1)}/min  <8s ${fs}/${inner.length}  latgr ${j.latgrans.length}${facit ? ` rätt ${fOk} falsk ${fFals} miss ${fMiss}` : ''}`);
}
if (args.includes("--per")) console.log(per.join("\n"));
console.log(`${min.toFixed(0)} min: sektionsbyten ${(nSeg / min).toFixed(2)}/min, < 8 s ${nShort}/${nSeg} = ${(100 * nShort / nSeg).toFixed(0)} % (${(100 * tShort / (min * 60)).toFixed(1)} % av tiden), ` +
  `korta per etikett ${Object.entries(shortBy).map(([k, v]) => `${k} ${v}/${segBy[k]}`).join(' ')}, intro-nollningar ${nIntro} (${(nIntro / min * 10).toFixed(1)}/10 min), ` +
  `låtgränser ${nLat} (${(nLat / min * 10).toFixed(1)}/10 min)` + `, tid ${Object.entries(tBy).map(([k, v]) => `${k} ${(100 * v / (min * 60)).toFixed(0)}%`).join(' ')}` + (facit ? `, facit ${nFac}: rätt ${ok} falsk ${fals} miss ${miss}` : ''));
