/**
 * DROP-SVEP: kör dropBench.mjs för en lista varianter (env-uppsättningar) över session (19 facit-markeringar),
 * pop_ladan och megamix_ladan, tre processer parallellt per variant, och skriver EN tabell:
 *
 *   node tools/dropSweep.mjs [--session <wav>] [--marks <fil>] [--pop <wav>] [--megamix <wav>] [--out <dir>] [--only namn,namn]
 *
 * Varianter definieras nedan (VARIANTS). "ladan" = drop-disco.conf-raderna som kör i ladan; allt annat = ladan + en ändring.
 * Kolumner: recall x/19 (fyr inom [edge-1 s, edge+2 s]), tidsfel median/p90 (fyr - flank, ms), omatchade fyrningar i
 * markerat spann (>= 430 s), pop/megamix: antal fyrningar + landad-klass (<4 riktig / >=7 falsk, memory 09-08).
 */
import { spawn } from "node:child_process";
import { readFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const SESSION = opt("--session", "C:/Users/richa/Desktop/Claude/corpus/session_mono.wav");
const MARKS = opt("--marks", "C:/Users/richa/Desktop/Claude/corpus_notes.txt");
const POP = opt("--pop", "C:/Users/richa/Desktop/Claude/dmx-control/pi-dmx/engine/tools/pop_ladan.wav");
const MEGA = opt("--megamix", "C:/Users/richa/Desktop/Claude/dmx-control/pi-dmx/engine/tools/megamix_ladan.wav");
const OUT = opt("--out", join(tmpdir(), "dropsweep-out"));
const only = opt("--only", "")?.split(",").filter(Boolean);
mkdirSync(OUT, { recursive: true });

const LADAN = { DROP_QUALITY_DB: "6.5", BODY_RISE_DB: "17", DROP_ARM_MS: "300", DROP_RISE_MIN: "1", BODY_FAST_S: "0.06", DROP_RISE_LOW_DB: "12", MINI_SPACING_MS: "12000", BPM_MIN: "80", DMX_SECTION: "1" };
export const VARIANTS = {
  default: { DMX_SECTION: "1" },
  ladan: LADAN,
  calm: { ...LADAN, DMX_DROP_CALM_GATE: "1" },
  calm_land: { ...LADAN, DMX_DROP_CALM_GATE: "1", DROP_CALM_LAND_MS: "600" },
  kicklock: { ...LADAN, DROP_KICK_LOCK_MS: "200" },
  kicklock_grid: { ...LADAN, DROP_KICK_LOCK_MS: "200", DROP_KICK_LOCK_GRID: "1", DMX_GRID_PHASE: "1" },
  upgrade3: { ...LADAN, DROP_UPGRADE_DB: "3" },
  kicklock150: { ...LADAN, DROP_KICK_LOCK_MS: "150", DROP_KICK_RECENT_MS: "150" },
  calm_land300: { ...LADAN, DMX_DROP_CALM_GATE: "1", DROP_CALM_LAND_MS: "300" },
  calm_lvh_only: { ...LADAN, DMX_DROP_CALM_GATE: "1", DROP_CALM_LAND_MS: "300", DMX_SECTION: "0" },
  gone1500: { ...LADAN, BODY_GONE_MIN_MS: "1500" },
  gone1000: { ...LADAN, BODY_GONE_MIN_MS: "1000" },
};

function run(env, wav, extra) {
  return new Promise((res) => {
    const p = spawn(process.execPath, [join(here, "dropBench.mjs"), wav, "--quiet", ...extra], { env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
    let err = ""; p.stderr.on("data", (d) => err += d); p.stdout.on("data", () => {});
    p.on("close", (code) => res({ code, err }));
  });
}
const fmt = (v, d = 0) => Number.isFinite(v) ? v.toFixed(d) : "–";
const rows = [];
for (const [name, env] of Object.entries(VARIANTS)) {
  if (only.length && !only.includes(name)) continue;
  const js = (f) => join(OUT, `${name}_${f}.json`);
  const t0 = Date.now();
  const [a, b, c] = await Promise.all([
    run(env, SESSION, ["--marks", MARKS, "--from", "430", "--json", js("session")]),
    run(env, POP, ["--json", js("pop")]),
    run(env, MEGA, ["--json", js("megamix")]),
  ]);
  for (const r of [a, b, c]) if (r.code !== 0) { console.error(name, "FEL", r.err.slice(-800)); }
  const S = JSON.parse(readFileSync(js("session"), "utf8")), P = JSON.parse(readFileSync(js("pop"), "utf8")), M = JSON.parse(readFileSync(js("megamix"), "utf8"));
  const f = S.facit;
  const row = { variant: name, recall: `${f.hits}/${f.n}`, mini: f.miniHits, errMed: fmt(f.errMedian), errP90: fmt(f.errP90), unmatched: f.unmatchedInSpan, pop: `${P.nFires} (${P.classes.real}/${P.classes.mid}/${P.classes.false})`, megamix: `${M.nFires} (${M.classes.real}/${M.classes.mid}/${M.classes.false})`, s: ((Date.now() - t0) / 1000).toFixed(0) };
  rows.push(row);
  console.log(`${name.padEnd(14)} recall ${row.recall.padEnd(6)} (+mini ${row.mini}) tidsfel med/p90 ${row.errMed}/${row.errP90} ms  omatchade ${String(row.unmatched).padStart(2)}  pop ${row.pop.padEnd(12)} megamix ${row.megamix.padEnd(12)} (${row.s} s)`);
}
console.log("\n(pop/megamix: fyrningar (landad<4 / 4–7 / >=7))");
