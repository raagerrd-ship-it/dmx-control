/**
 * RÖD TRÅD (10-12 kväll, ägaren: "nu känns det bara som olika effekter hoppar hela tiden ... mer som att den är förprogrammerad" +
 * "så allt mer känns anpassat efter låten och som att de hänger ihop"). Mäter konsertReplay-json (10 Hz-rader + [dirigent]-logg):
 *   byten/min        lookbyten per minut (drop-looken räknas inte - den är en överlagring, inte en look)
 *   unika/låt        olika looker per låt (låt = mellan LATGRANS-raderna i loggen, och filgränser)
 *   vid sektion      andel byten som sker <= 10 s efter en sektionsgräns där den nya sektionen håller >= 8 s
 *   återseende       sektionsdelar (>= 8 s) av en typ som redan setts i låten: andel med SAMMA huvudlook som förra gången
 *   kort look        andel lookvisningar < 8 s
 *   hör ihop         låtar med både vers (low) och refräng (high): andel där refrängens huvudlook har samma gruppering
 *                    (toggle-flaggan) som versens OCH ligger nära i passform (FIT-avstånd <= 0,6) eller är samma look
 *   paletter/låt     olika kulörfamiljer (palett) per låt (kolumnen 'pal', saknas i äldre json)
 *   variation        unika looker över hela kvällen, effektivt antal (exp entropi över visningstid), rutor tier x sektion som använts
 *   drops/mini/lyft  antal (analysatorns drops, minidrop-looken, energilyft) - ska vara oförändrade
 *   node tools/rodTrad.mjs <dir eller json ...> [--dist dist]
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { pathToFileURL } from "node:url";
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const DIST = opt("--dist", null) ? pathToFileURL(opt("--dist") + "/").href : new URL("../dist/", import.meta.url).href;
const { EFFECT_MAP, EFFECTS } = await import(DIST + "effects/registry.js");
const { FIT } = await import(DIST + "effects/fit.js");
const files = [];
for (const a of args.filter((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--")))) {
  if (statSync(a).isDirectory()) for (const f of readdirSync(a).filter((f) => f.endsWith(".json")).sort()) files.push(a + "/" + f); else files.push(a);
}
const HOLD = 8, NEAR = 10;
const fitD = (a, b) => { const x = FIT[a], y = FIT[b]; if (!x || !y) return 9; return Math.hypot(x.punch - y.punch, x.bass - y.bass, x.bright - y.bright, x.beat - y.beat); };
const tog = (m) => !!EFFECT_MAP.get(m)?.toggle;
let T = 0, nSw = 0, nSwSec = 0, shows = 0, shortShows = 0, songs = 0, uniqSum = 0, palSongs = 0, palSum = 0, reN = 0, reSame = 0, hiN = 0, hiOk = 0;
let drops = 0, minis = 0, lifts = 0, aMini = 0; const lookTime = new Map(), cells = new Set(), whyN = new Map();
for (const f of files) {
  const J = JSON.parse(readFileSync(f, "utf8")); const C = J.columns, ix = (k) => C.indexOf(k);
  const iT = ix("t"), iL = ix("look"), iW = ix("why"), iS = ix("sec"), iP = ix("pal"), iD = ix("drops"), iLi = ix("lift"), iM = ix("miniLook"), iA = ix("aMini");
  const R = J.rows; if (!R.length) continue;
  const dt = 0.1; T += R.length * dt;
  const last = R[R.length - 1]; drops += last[iD]; lifts += last[iLi]; aMini += last[iA] ?? 0;
  for (let i = 1; i < R.length; i++) if (R[i][iM] && !R[i - 1][iM]) minis++;
  const bounds = J.log.filter((x) => x[1] === "LATGRANS").map((x) => x[0]);
  // sektionskörningar
  const runs = []; let s0 = 0;
  for (let i = 1; i <= R.length; i++) if (i === R.length || R[i][iS] !== R[s0][iS]) { runs.push({ a: R[s0][iT], b: R[i - 1][iT] + dt, sec: R[s0][iS], i0: s0, i1: i }); s0 = i; }
  // lookvisningar (drop-looken 'drops' är en överlagring - räknas inte som look)
  const lk = R.map((r) => r[iL]);
  const shw = []; let a = 0;
  for (let i = 1; i <= R.length; i++) if (i === R.length || lk[i] !== lk[a]) { shw.push({ a: R[a][iT], b: R[i - 1][iT] + dt, m: lk[a], i0: a }); a = i; }
  for (const s of shw) { const d = s.b - s.a; lookTime.set(s.m, (lookTime.get(s.m) ?? 0) + d); const def = EFFECT_MAP.get(s.m); if (def) for (const sec of def.section ?? []) cells.add(def.tier + "x" + sec); }
  for (let k = 1; k < shw.length; k++) {
    const s = shw[k]; nSw++; const why = R[s.i0][iW] || "?"; whyN.set(why, (whyN.get(why) ?? 0) + 1);
    if (runs.some((r) => r.a <= s.a + 0.05 && s.a - r.a <= NEAR && r.a > R[0][iT] && r.b - r.a >= HOLD)) nSwSec++;
  }
  for (let k = 1; k < shw.length - 1; k++) { shows++; if (shw[k].b - shw[k].a < HOLD) shortShows++; }   // första/sista visningen klipps av filgränsen
  // låtar
  const edges = [R[0][iT], ...bounds, last[iT] + dt];
  for (let k = 0; k + 1 < edges.length; k++) {
    const A = edges[k], B = edges[k + 1]; if (B - A < 30) continue;
    songs++;
    const inS = (t) => t >= A && t < B;
    uniqSum += new Set(R.filter((r) => inS(r[iT])).map((r) => r[iL])).size;
    if (iP >= 0) { palSongs++; palSum += new Set(R.filter((r) => inS(r[iT])).map((r) => r[iP])).size; }
    const main = (r) => { const c = new Map(); for (let i = r.i0; i < r.i1; i++) c.set(lk[i], (c.get(lk[i]) ?? 0) + 1); return [...c].sort((x, y) => y[1] - x[1])[0][0]; };
    const prev = new Map(), mainBy = new Map();
    for (const r of runs.filter((r) => inS(r.a) && r.b - r.a >= HOLD && r.sec)) {
      const m = main(r);
      if (prev.has(r.sec)) { reN++; if (prev.get(r.sec) === m) reSame++; }
      prev.set(r.sec, m);
      if (!mainBy.has(r.sec)) mainBy.set(r.sec, m);
    }
    if (mainBy.has("low") && mainBy.has("high")) { hiN++; const v = mainBy.get("low"), h = mainBy.get("high"); if (v === h || (tog(v) === tog(h) && fitD(v, h) <= 0.6)) hiOk++; }
  }
}
const tot = [...lookTime.values()].reduce((x, y) => x + y, 0);
const H = -[...lookTime.values()].reduce((s, v) => s + (v / tot) * Math.log(v / tot), 0);
const allCells = new Set(); for (const e of EFFECTS) for (const s of e.section ?? []) allCells.add(e.tier + "x" + s);
const pct = (a, b) => b ? (100 * a / b).toFixed(0) + " %" : "-";
const out = {
  minuter: +(T / 60).toFixed(1), "byten/min": +(nSw / (T / 60)).toFixed(2), "unika/låt": +(uniqSum / songs).toFixed(1), låtar: songs,
  "vid sektion>=8s": pct(nSwSec, nSw), återseende: pct(reSame, reN) + ` (${reN})`, "kort look <8s": pct(shortShows, shows),
  "hör ihop": pct(hiOk, hiN) + ` (${hiN})`, "paletter/låt": palSongs ? +(palSum / palSongs).toFixed(2) : "-",
  "unika kvällen": lookTime.size, "effektivt antal": +Math.exp(H).toFixed(1), rutor: `${[...cells].filter((c) => allCells.has(c)).length}/${allCells.size}`,
  drops, minidropLook: minis, lyft: lifts, aMini, orsaker: Object.fromEntries([...whyN].sort((x, y) => y[1] - x[1])),
};
console.log(JSON.stringify(out, null, 1));
