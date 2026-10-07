/**
 * TEMPOVAXLINGENS BANK (natt-agenten 2026-10-07). Agaren 10-06: "tempo okning (som inte triggar drop), hur vi far
 * till sa de syns snyggt i showen". Banken svarar pa tre fragor, pa den RIKTIGA showen (showTight.mjs --trace,
 * som sedan bank v2 kor index.ts:s BoundaryDetector-sidokedja och darfor kan fyra tempovaxlingen alls):
 *
 *   1. SER MOTORN DEN?  positivt facit tools/tempo-facit/manifest.tsv (kand vaxlingspunkt t_s, kand kvot):
 *      traff = tempovaxling inom [t_s, t_s + 10 s], fordrojning, falsk = fyrning utanfor; motorns BPM-median
 *      8 s fore mot 6-14 s efter (sag analysatorn ens okningen? - analysatorn ar delad, inte var att andra)
 *   2. FYRAR DEN FEL?   negativt facit = frozen6-klipp dar motorns las hoppar oktav (bpm_end/bpm_start > 1,4
 *      eller < 0,72): dar far vaxlingen INTE fyra
 *   3. SYNS DEN?        riggen 4 s efter fyrningen (eller t_s vid miss) mot 4 s fore: medelljus, p90, lampspr,
 *      byttes looken och med vilken orsak, kickTraff fore/efter (gesten far inte kosta takten)
 *
 *   node tools/tempoShiftBench.mjs [--neg] [--env K=V ...] [--json ut.json]
 *
 * Klippen nivaanpassas till ladans aux-niva (--norm -3.5, matfalla 35). Env = ladans SHOW_ENV ur ladan.py (aldrig PORTAR_EJ_LIVE, matfalla 26) + --env.
 */
import { execFileSync, execFile } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ENGINE = dirname(HERE);
const say = (...a) => process.stdout.write(a.join(" ") + "\n");
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const NEG = args.includes("--neg");

const showEnv = JSON.parse(execFileSync("python", ["-c", "import json,sys; sys.path.insert(0,'tools'); from ladan import SHOW_ENV; print(json.dumps([[k,v] for k,v,_ in SHOW_ENV]))"], { cwd: ENGINE, encoding: "utf-8" }));
const env = { ...process.env };
for (const [k, v] of showEnv) env[k] = v;
args.forEach((a, i) => { if (a === "--env") { const [k, ...v] = args[i + 1].split("="); env[k] = v.join("="); } });

const tsv = (p) => { const [h, ...r] = readFileSync(p, "utf-8").trim().split(/\r?\n/).map((l) => l.split("\t")); return r.map((x) => Object.fromEntries(h.map((k, i) => [k, x[i]]))); };
const pos = tsv(join(HERE, "tempo-facit", "manifest.tsv")).map((r) => ({ wav: join("tools", "tempo-facit", r.fil), t: Number(r.t_s), kvot: Number(r.kvot), namn: r.fil }));
const neg = NEG ? tsv(join(HERE, "frozen6", "manifest.tsv")).filter((r) => { const q = Number(r.bpm_end) / Number(r.bpm_start); return Number(r.bpm_start) > 0 && (q > 1.4 || q < 0.72); })
  .map((r) => ({ wav: join("tools", "frozen6", r.file), namn: r.file })) : [];

const tmp = mkdtempSync(join(tmpdir(), "tsb-"));
const run = (job, k) => new Promise((res) => {
  const out = join(tmp, `t${k}.json`);
  execFile("node", ["tools/showTight.mjs", job.wav, "--tyst", "--norm", "-3.5", "--trace", out], { cwd: ENGINE, env, maxBuffer: 1 << 26 }, (err) => {
    try { res({ ...job, tr: JSON.parse(readFileSync(out, "utf-8")) }); } catch { res({ ...job, fel: String(err).slice(0, 200) }); }
  });
});
const jobs = [...pos.map((j) => ({ ...j, typ: "pos" })), ...neg.map((j) => ({ ...j, typ: "neg" }))];
const done = [];
for (let i = 0; i < jobs.length; i += 2) done.push(...await Promise.all(jobs.slice(i, i + 2).map((j, k) => run(j, i + k))));   // hogst tva parallellt
rmSync(tmp, { recursive: true, force: true });

const med = (a) => { const s = a.filter(Number.isFinite).sort((x, y) => x - y); return s.length ? s[s.length >> 1] : NaN; };
const mean = (a) => a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN;
const p90 = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(0.9 * (s.length - 1))] : NaN; };

function window(tr, a, b) {
  const idx = []; for (let i = 0; i < tr.T.length; i++) if (tr.T[i] >= a && tr.T[i] < b) idx.push(i);
  const lit = idx.map((i) => tr.LIT[i]), spr = idx.map((i) => tr.LSPR[i]);
  // kickTraff som i showTight (fonster < halvt slag, uppgang >= 15 %)
  const bpm = med(idx.map((i) => tr.BPM[i]).filter((x) => x > 0)) || 120;
  const W = Math.max(2, Math.round(Math.min(300, 0.45 * 60000 / bpm) / tr.STEP_MS));
  let n = 0, hit = 0;
  for (const i of tr.KICK) {
    if (tr.T[i] < a || tr.T[i] >= b || i < 1 || i + W >= tr.LIT.length) continue;
    if (tr.LIT[i] > tr.LIT[i - 1] * 1.05) continue;
    n++; let mx = tr.LIT[i]; for (let k = 1; k <= W; k++) mx = Math.max(mx, tr.LIT[i + k]);
    if (mx > tr.LIT[i] * 1.15) hit++;
  }
  return { lit: mean(lit), p90: p90(lit), spr: mean(spr), kickTraff: n ? hit / n : NaN, bpm };
}

const rows = [];
for (const r of done) {
  if (r.fel) { rows.push({ namn: r.namn, typ: r.typ, fel: r.fel }); continue; }
  const tr = r.tr, fires = tr.EV.filter((e) => e.typ === "tempo");
  if (r.typ === "neg") { rows.push({ namn: r.namn, typ: "neg", fyrningar: fires.length, vid: fires.map((e) => `${e.t.toFixed(1)}s ${e.fran}->${e.till}`) }); continue; }
  const hitEv = fires.find((e) => e.t >= r.t && e.t <= r.t + 10);
  const falsk = fires.filter((e) => e !== hitEv).length;
  const a = hitEv ? hitEv.t : r.t;
  const fore = window(tr, a - 4, a), efter = window(tr, a, a + 4);
  const sw = tr.WHY.filter((w) => w.t >= a && w.t < a + 4);
  const bpmFore = med(tr.T.map((t, i) => (t >= r.t - 8 && t < r.t ? tr.BPM[i] : NaN)).filter((x) => x > 0));
  const bpmEfter = med(tr.T.map((t, i) => (t >= r.t + 6 && t < r.t + 14 ? tr.BPM[i] : NaN)).filter((x) => x > 0));
  rows.push({ namn: r.namn, typ: "pos", kvot: r.kvot, traff: !!hitEv, fordrojS: hitEv ? +(hitEv.t - r.t).toFixed(2) : null, falsk,
    motorKvot: +(bpmEfter / bpmFore).toFixed(3), bpmFore, bpmEfter,
    fore, efter, byte: sw.map((w) => `${w.why}:${w.look}`), ovrigaHandelser: tr.EV.filter((e) => e.typ !== "tempo" && Math.abs(e.t - r.t) < 6).map((e) => `${e.typ}@${e.t.toFixed(1)}`) });
}

const P = rows.filter((r) => r.typ === "pos" && !r.fel), N = rows.filter((r) => r.typ === "neg" && !r.fel);
const sag = P.filter((r) => Math.abs(r.motorKvot / r.kvot - 1) < 0.04);   // motorns BPM foljde okningen
const sum = {
  pos: P.length, traff: P.filter((r) => r.traff).length, falsk: P.reduce((s, r) => s + r.falsk, 0),
  fordrojMedS: med(P.filter((r) => r.traff).map((r) => r.fordrojS)),
  motornSagOkningen: sag.length, traffNarMotornSag: sag.filter((r) => r.traff).length,
  neg: N.length, negFyrningar: N.reduce((s, r) => s + r.fyrningar, 0),
  gest: {   // efter - fore, median over positiva (traffar: kring fyrningen, missar: kring t_s)
    dLit: med(P.map((r) => r.efter.lit - r.fore.lit)), dP90: med(P.map((r) => r.efter.p90 - r.fore.p90)),
    dSpr: med(P.map((r) => r.efter.spr - r.fore.spr)), dKickTraff: med(P.map((r) => r.efter.kickTraff - r.fore.kickTraff)),
    lookByte: P.filter((r) => r.byte.length).length,
  },
};
const jsonOut = opt("--json", null);
if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ env: showEnv, sum, rows }, null, 1));
const f = (x, d = 2) => (Number.isFinite(x) ? x.toFixed(d) : "-");
for (const r of P) say(`${r.traff ? "TRAFF" : "miss "} ${r.namn.slice(0, 44).padEnd(44)} kvot ${r.kvot} motor ${f(r.motorKvot, 3)} (${f(r.bpmFore, 0)}->${f(r.bpmEfter, 0)})  ford ${r.fordrojS ?? "-"} s  falsk ${r.falsk}  lit ${f(r.fore.lit)}->${f(r.efter.lit)} spr ${f(r.fore.spr, 0)}->${f(r.efter.spr, 0)} kt ${f(r.fore.kickTraff)}->${f(r.efter.kickTraff)}  ${r.byte.join(",")} ${r.ovrigaHandelser.join(",")}`);
for (const r of N) if (r.fyrningar) say(`NEG FYRADE ${r.namn}: ${r.vid.join(", ")}`);
say(JSON.stringify(sum));
