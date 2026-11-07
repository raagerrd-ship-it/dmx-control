/**
 * TAKTEN RUNT DROPEN (natt 2026-11-07, ägaren i ladan 11-06: 'efter drop tog det 2-3 s innan den tydligt visade takten igen').
 * Läser showTight --trace (kör med ST_BEAT=1) och mäter per show-drop:
 *   nollF   s utan effektklocka (cfg.beat = null) de 10 s före dropen   <- breaket tappar klockan
 *   lasS    s från dropen till klockan finns OCH tilliten >= 0,8 (lås)  <- målet < 1 s
 *   anaS    s från dropen till analysatorns frame.bpm > 0
 *   node tools/dropTakt.mjs trace1.json [trace2.json ...]
 */
import { readFileSync } from "node:fs";
const say = (...a) => process.stdout.write(a.join(" ") + "\n");
const med = (a) => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[b.length >> 1] : NaN; };
const all = [];
for (const f of process.argv.slice(2)) {
  const { BEATS } = JSON.parse(readFileSync(f, "utf8"));
  if (!BEATS?.length) { say(f, "saknar BEATS (kör showTight med ST_BEAT=1)"); continue; }
  let last = BEATS[0][4];
  for (let i = 1; i < BEATS.length; i++) {
    if (BEATS[i][4] === last) continue; last = BEATS[i][4];
    const t0 = BEATS[i][0]; if (t0 < 15) continue;   // uppvärmningen
    let noll = 0, n = 0; for (let j = i - 1; j >= 0 && BEATS[j][0] > t0 - 10; j--) { n++; if (BEATS[j][2] === 0) noll++; }
    let las = NaN, ana = NaN;
    for (let j = i; j < BEATS.length && BEATS[j][0] < t0 + 15; j++) {
      if (isNaN(ana) && BEATS[j][1] > 0) ana = BEATS[j][0] - t0;
      if (BEATS[j][2] > 0 && BEATS[j][3] >= 0.8) { las = BEATS[j][0] - t0; break; }
    }
    const r = { f: f.split(/[\/]/).pop(), t: t0, noll: n ? noll / n * 10 : 0, las: isNaN(las) ? 15 : las, ana: isNaN(ana) ? 15 : ana };
    all.push(r);
    say(`${r.f.padEnd(22)} drop ${t0.toFixed(1).padStart(6)} s  utan klocka före ${r.noll.toFixed(1)} s  lås ${r.las.toFixed(2)} s  analysatorns bpm ${r.ana.toFixed(2)} s`);
  }
}
say(`\nDROPS ${all.length}: lås median ${med(all.map((r) => r.las)).toFixed(2)} s, > 1 s ${all.filter((r) => r.las > 1).length}, utan klocka före (s) median ${med(all.map((r) => r.noll)).toFixed(1)}, drops med klockan borta före ${all.filter((r) => r.noll > 0).length}`);
