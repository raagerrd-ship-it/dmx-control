/**
 * TILLITEN RUNT DROPEN, A mot B (dagkörningen 2026-11-07, agent-tillit). Läser två eller fler showTight --trace (ST_BEAT=1) av SAMMA wav
 * och skriver per show-drop (dropCount-flank i A, parad mot närmaste i B inom 1 s):
 *   lås    s från dropen till klockan finns OCH tilliten >= 0,8 (som dropTakt.mjs, 15 = aldrig); lås57 = >= 0,57 (effects.ts trustRaw full ramp)
 *   stadig tillitens median -10..-2 s före och +5..+15 s efter (låtens egen nivå: når låten aldrig 0,8 mäter lås inte dropen)
 *   t0/+1  tilliten (cfg.beat.confidence) vid dropen och 1 s efter, bpmK = klockans tempo före -> efter
 *   språng som showTight:s dropSprang: medelljus 500 ms före -> topp inom 800 ms efter (pre/mx), sektion vid dropen
 *   look   look före -> efter dropen
 * Sammanfattning per trace: lås median/medel/>1 s/>2 s, språng hög/lugn, tillit +1 s medel.
 *   node tools/tillitDrop.mjs a.json b.json [c.json ...] [--alla]   (--alla = rad per drop även där inget skiljer)
 */
import { readFileSync } from "node:fs";
const say = (...a) => process.stdout.write(a.join(" ") + "\n");
const args = process.argv.slice(2), ALLA = args.includes("--alla");
const files = args.filter((a) => a.endsWith(".json"));
const calm = (s) => s === "low" || s === "intro" || s === "break";
const med = (a) => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[b.length >> 1] : NaN; };
const mean = (a) => a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN;
const f = (x, d = 2) => (x == null || Number.isNaN(x) ? "-" : x.toFixed(d));

function load(fn) {
  const { BEATS, LIT, LOOK, STEP_MS } = JSON.parse(readFileSync(fn, "utf8"));
  const step = STEP_MS || 25, drops = [];
  let last = BEATS[0][4];
  for (let i = 1; i < BEATS.length; i++) {
    if (BEATS[i][4] === last) continue; last = BEATS[i][4];
    const t0 = BEATS[i][0]; if (t0 < 15) continue;
    let las = 15, las57 = 15;
    for (let j = i; j < BEATS.length && BEATS[j][0] < t0 + 15; j++) if (BEATS[j][2] > 0 && BEATS[j][3] >= 0.8) { las = BEATS[j][0] - t0; break; }
    for (let j = i; j < BEATS.length && BEATS[j][0] < t0 + 15; j++) if (BEATS[j][2] > 0 && BEATS[j][3] >= 0.57) { las57 = BEATS[j][0] - t0; break; }
    const cs = (a, b) => med(BEATS.filter((x) => x[0] >= t0 + a && x[0] < t0 + b).map((x) => (x[2] > 0 ? x[3] : 0)));
    const sPre = cs(-10, -2), sPost = cs(5, 15), s03 = mean(BEATS.filter((x) => x[0] >= t0 && x[0] < t0 + 3).map((x) => (x[2] > 0 ? x[3] : 0)));
    const j1 = Math.min(BEATS.length - 1, i + Math.round(1000 / step));
    const i0 = Math.max(0, i - Math.round(500 / step)), i2 = Math.min(LIT.length - 1, i + Math.round(800 / step));
    let pre = 0, n = 0; for (let k = i0; k < i; k++) { pre += LIT[k]; n++; } pre = n ? pre / n : 0;
    let mx = 0; for (let k = i; k <= i2; k++) if (LIT[k] > mx) mx = LIT[k];
    const ib = Math.max(0, i - Math.round(2000 / step));
    let pre5 = 0, n5 = 0; for (let k = Math.max(0, i - Math.round(5000 / step)); k < i; k++) { pre5 += LIT[k]; n5++; } pre5 = n5 ? pre5 / n5 : 0;
    drops.push({ t: t0, i, las, las57, sPre, sPost, s03, c0: BEATS[i - 1][3], c1: BEATS[j1][3], b0: BEATS[ib][2], b1: BEATS[j1][2], sec: BEATS[i][6], pre, pre5, mx, jump: mx - pre,
      lookPre: LOOK[i0] ?? "?", lookDrop: LOOK[i - 1] ?? "?", lookPost: LOOK[Math.min(LOOK.length - 1, i + Math.round(1500 / step))] ?? "?" });
  }
  return { fn: fn.split(/[\\/]/).pop(), drops };
}

const T = files.map(load), A = T[0];
for (const B of T.slice(1)) {
  say(`\n${A.fn}  ->  ${B.fn}`);
  say("  drop s  sek    | lås A  lås B | lås57 A/B | stadig före/efter A | tillit t0 A/B  +1 s A/B | bpmK A före>efter  B före>efter | språng A (pre>mx)   B (pre>mx)   | look A före/drop>efter  ||  B");
  let onlyB = B.drops.slice();
  for (const a of A.drops) {
    let bi = -1, bd = 1; for (let k = 0; k < onlyB.length; k++) { const d = Math.abs(onlyB[k].t - a.t); if (d < bd) { bd = d; bi = k; } }
    const b = bi >= 0 ? onlyB.splice(bi, 1)[0] : null;
    const diff = !b || Math.abs(a.las - b.las) > 0.05 || Math.abs(a.jump - b.jump) > 0.02 || a.lookPost !== b.lookPost;
    if (!diff && !ALLA) continue;
    say(`  ${f(a.t, 1).padStart(6)} ${String(a.sec).padEnd(6)} | ${f(a.las).padStart(5)} ${b ? f(b.las).padStart(5) : "  -  "} | ${f(a.las57)}/${b ? f(b.las57) : "-"} | ${f(a.sPre)}/${f(a.sPost)} | ${f(a.c0)}/${b ? f(b.c0) : "-"}  ${f(a.c1)}/${b ? f(b.c1) : "-"} | ${f(a.b0, 0)}>${f(a.b1, 0)}  ${b ? f(b.b0, 0) + ">" + f(b.b1, 0) : "-"} | ${f(a.jump)} (${f(a.pre)}>${f(a.mx)})  ${b ? f(b.jump) + " (" + f(b.pre) + ">" + f(b.mx) + ")" : "-"} | ${a.lookPre}/${a.lookDrop}>${a.lookPost}  ||  ${b ? b.lookPre + "/" + b.lookDrop + ">" + b.lookPost : "SAKNAS"}`);
  }
  for (const b of onlyB) say(`  ${f(b.t, 1).padStart(6)} bara i B  sek ${b.sec}  lås ${f(b.las)}  språng ${f(b.jump)}  look ${b.lookDrop}>${b.lookPost}`);
}
say("\nSAMMANFATTNING");
for (const X of T) {
  const d = X.drops, las = d.map((x) => x.las);
  const hog = d.filter((x) => !calm(x.sec)), lugn = d.filter((x) => calm(x.sec));
  const l57 = d.map((x) => x.las57);
  say(`  ${X.fn.padEnd(34)} drops ${d.length}  lås57 medel ${f(mean(l57))} > 1 s ${l57.filter((x) => x > 1).length}  tillit 0-3 s ${f(mean(d.map((x) => x.s03)))} (låtens 5-15 s ${f(mean(d.map((x) => x.sPost)))})  lås median ${f(med(las))} medel ${f(mean(las))}  > 1 s ${las.filter((x) => x > 1).length}  > 2 s ${las.filter((x) => x > 2).length}  aldrig ${las.filter((x) => x >= 15).length}  tillit +1 s ${f(mean(d.map((x) => x.c1)))}  språng hög ${f(mean(hog.map((x) => x.jump)))} (${hog.length}) lugn ${f(mean(lugn.map((x) => x.jump)))} (${lugn.length})`);
}
