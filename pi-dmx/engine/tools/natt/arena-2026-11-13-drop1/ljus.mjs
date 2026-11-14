/** LJUSET FÖRE/EFTER ur två konsertReplay-json (10 Hz): samma look, medelljus, lookbyten, orsaker, drop-looken.
 *  node tools/natt/arena-2026-11-13-drop1/ljus.mjs <bas.json> <variant.json> */
import { readFileSync } from "node:fs";
const A = JSON.parse(readFileSync(process.argv[2])), B = JSON.parse(readFileSync(process.argv[3]));
const c = n => A.columns.indexOf(n), T = c("t"), LOOK = c("look"), WHY = c("why"), LIGHT = c("light"), DROPS = c("drops"), SEC = c("sec"), NLIT = c("nLit");
const n = Math.min(A.rows.length, B.rows.length);
let same = 0, la = 0, lb = 0, dl = 0, secSame = 0, k = 0; const byt = r => { let x = 0; for (let i = 1; i < r.length; i++) if (r[i][LOOK] !== r[i - 1][LOOK]) x++; return x; };
const why = r => { const m = {}; for (let i = 1; i < r.length; i++) if (r[i][LOOK] !== r[i - 1][LOOK]) { const w = r[i][WHY] || "-"; m[w] = (m[w] || 0) + 1; } return m; };
const drops = r => { const o = []; for (let i = 1; i < r.length; i++) if (r[i][DROPS] !== r[i - 1][DROPS]) o.push(r[i][T].toFixed(0)); return o; };
const looktid = r => { const m = {}; for (const x of r) m[x[LOOK]] = (m[x[LOOK]] || 0) + 1; return m; };
for (let i = 0; i < n; i++) { if (A.rows[i][T] < 20) continue; k++; if (A.rows[i][LOOK] === B.rows[i][LOOK]) same++; if (A.rows[i][SEC] === B.rows[i][SEC]) secSame++; la += A.rows[i][LIGHT]; lb += B.rows[i][LIGHT]; dl += Math.abs(A.rows[i][LIGHT] - B.rows[i][LIGHT]); }
console.log(`${process.argv[3]}`);
console.log(`  samma look ${(100 * same / k).toFixed(1)} % av tiden, samma sektion ${(100 * secSame / k).toFixed(1)} %, medelljus ${(la / k).toFixed(3)} -> ${(lb / k).toFixed(3)} (skillnad per ruta ${(dl / k).toFixed(3)})`);
console.log(`  lookbyten ${byt(A.rows)} -> ${byt(B.rows)}; drop-look: [${drops(A.rows).join(" ")}] -> [${drops(B.rows).join(" ")}]`);
const wa = why(A.rows), wb = why(B.rows); const keys = [...new Set([...Object.keys(wa), ...Object.keys(wb)])].filter(x => (wa[x] || 0) !== (wb[x] || 0));
console.log(`  orsaker som ändrats: ${keys.map(x => `${x} ${wa[x] || 0}->${wb[x] || 0}`).join(", ") || "inga"}`);
const ta = looktid(A.rows), tb = looktid(B.rows); const lk = [...new Set([...Object.keys(ta), ...Object.keys(tb)])].map(x => [x, ((tb[x] || 0) - (ta[x] || 0)) / 10]).filter(x => Math.abs(x[1]) >= 10).sort((p, q) => q[1] - p[1]);
console.log(`  looker med >= 10 s ändrad speltid: ${lk.map(x => `${x[0]} ${x[1] > 0 ? "+" : ""}${x[1].toFixed(0)} s`).join(", ") || "inga"}`);
