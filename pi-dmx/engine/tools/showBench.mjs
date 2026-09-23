/**
 * SHOW-BÄNK (2026-09-23 natt). Kör en WAV genom den RIKTIGA analysatorn OCH den RIKTIGA effektmotorn på virtuell
 * klocka, och mäter det ägaren faktiskt klagar på: "den byter inte effekter" och "den triggar drops i lugna partier".
 *
 *   node tools/showBench.mjs <wav> [--json <ut>] [--looks] [--sektioner]
 *
 * Mäter (allt kausalt — samma kod som kör i ladan):
 *   LOOKAR      antal byten, distinkta lookar, speltid per look, längsta oavbrutna stund i EN look
 *   TIER        andel tid i lugn/fart/full (tierEma läses ur motorn, inte räknas om)
 *   SEKTION     etikettfördelning + antal segment + medianlängd  → svarar på om detektorn LÅSER sig
 *   lvh         levelVsHighDb-fördelning: hur ofta lugn-grinden ens KAN se ett lugnt parti (kräver <= -6 dB)
 *   DROPS       fyrningar + etikett/lvh vid fyrningen
 *
 * Varför den mäter tier och sektion tillsammans: de sitter ihop. Om sektionsdetektorn kallar allt 'high' blir
 * lastHighDb ≈ nuvarande nivå, alltså lvh ≈ 0, och lugn-grinden ser ALDRIG ett lugnt parti — drops fyrar fritt.
 * Samma etikett gör dessutom att dirigenten bara plockar ur en pool. En siffra, två symptom.
 */
import { readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const flag = (k) => args.includes(k);
const path = args.find((a) => a.endsWith(".wav"));
if (!path) { console.error("ange en wav-fil"); process.exit(2); }

const { Analyser } = await import("../dist/analyser.js");
const { EffectEngine } = await import("../dist/effects.js");
const { defaultConfig } = await import("../dist/config.js");
const { EFFECT_KEYS } = await import("../dist/effects/registry.js");

const d = readFileSync(path);
if (d.toString("ascii", 0, 4) !== "RIFF") { console.error("inte en WAV"); process.exit(2); }
if (d.readUInt32LE(24) !== 48000 || d.readUInt16LE(34) !== 16 || d.readUInt16LE(22) !== 1) {
  console.error("kräver 48 kHz mono 16-bit"); process.exit(2);
}
const nSamples = (d.length - 44) >> 1;
const SR = 48000, HOP = 128, EPOCH = 1700000000000;

// LADANS CONFIG: smart-läge, alla 31 lookar på, master 1 — annars mäter vi en annan rigg än den som står i ladan.
const cfg = JSON.parse(JSON.stringify(defaultConfig));
cfg.mode = "smart"; cfg.energyDrivesMode = true; cfg.beatPulse = true; cfg.master = 1; cfg.energyCeiling = true;
cfg.rotation = {}; for (const k of EFFECT_KEYS) cfg.rotation[k] = true;

const an = new Analyser(JSON.parse(JSON.stringify(defaultConfig)));
// GAIN: motorn laser forstarkningen BARA pa aux (index.ts:90: setGainLock(cfg.audioInput !== "mic", 1)).
// Kor ladan pa mikrofon ar AGC:n alltsa AKTIV dar men inte har -> bankens intensitet/tier blir en annan rigg.
// --agc kor som mikrofoningang.
if (!flag("--agc")) an.setGainLock(true, 1);
const eng = new EffectEngine(cfg);

// Motorns egna rader fångas; [dirigent] är den enda som säger VARFÖR en look byttes.
const dirigent = [], fires = [];
const origLog = console.log;
console.log = (...a) => {
  const s = a.join(" ");
  if (s.startsWith("[dirigent]")) dirigent.push(s);
  else if (s.startsWith("[dropfire]")) fires.push(s);
};

const buf = new Float32Array(HOP);
const nHops = Math.floor(nSamples / HOP);
const lookRuns = [];           // {look, t0, t1}
const secRuns = [];            // {sec, t0, t1}
const tierTime = { lugn: 0, fart: 0, full: 0 };
const lookTime = new Map();
const lvhHist = [], intHist = [], tierEmaHist = [];
const rig = [];
let lastRender = -1, lastLook = null, lastSec = null, lastT = 0, dropAt = [];
let lastDropCount = 0;

for (let off = 0; off + HOP <= nSamples; off += HOP) {
  for (let i = 0; i < HOP; i++) buf[i] = d.readInt16LE(44 + (off + i) * 2) / 32768;
  const tS = off / SR, ms = EPOCH + tS * 1000;
  an.setVirtualClock(ms);
  Date.now = () => ms;
  performance.now = () => ms - EPOCH;
  const fr = an.process(buf);
  if (fr.bpm > 0) cfg.beat = { anchorMs: fr.beatAnchorMs || ms, bpm: fr.bpm, confidence: fr.bpmConfidence };
  if (fr.dropCount !== lastDropCount) { lastDropCount = fr.dropCount; dropAt.push({ t: tS, sec: fr.section, lvh: fr.levelVsHighDb, tier: fr.sectionTier }); }

  // SEKTION: samla segment på hop-upplösning (etiketten byter bara när ett 1 s-block stänger).
  if (fr.section !== lastSec) { if (lastSec !== null) secRuns.push({ sec: lastSec, t0: lastT, t1: tS }); lastSec = fr.section; lastT = tS; }

  // RENDER i showens takt (~40 Hz, som riggen). Motorn äger tierEma och smartMode.
  if (ms - lastRender >= 25) {
    const dt = lastRender < 0 ? 0.025 : (ms - lastRender) / 1000;
    lastRender = ms;
    eng.render(fr);
    const look = eng.smartMode, te = eng.tierEma ?? 0;
    lvhHist.push(fr.levelVsHighDb); intHist.push(fr.intensity); tierEmaHist.push(te);
    const tier = te < 0.30 ? "lugn" : te < 0.63 ? "fart" : "full";   // bara för tidsandelen; motorn har hysteres
    tierTime[tier] += dt;
    if (look !== lastLook) { if (lastLook !== null) lookRuns.push({ look: lastLook, t0: lookRuns.length ? lookRuns[lookRuns.length - 1].t1 : 0, t1: tS }); lastLook = look; }
    lookTime.set(look, (lookTime.get(look) ?? 0) + dt);
    // RIGGENS FAKTISKA LJUS per ruta - for att mata hur STOR en drop SYNS, inte bara att den fyrade.
    const u = eng.universe, mc = eng.maxCh || 28; if (u) { let sum = 0; for (let i = 0; i < mc; i++) sum += u[i]; rig.push([tS, sum / mc]); }
  }
}
if (lastSec !== null) secRuns.push({ sec: lastSec, t0: lastT, t1: nHops * HOP / SR });
console.log = origLog;

const totS = nSamples / SR;
const pct = (x) => `${(100 * x / totS).toFixed(1).padStart(5)} %`;
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : 0; };
const pctl = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : 0; };

console.log(`\n=== ${path}  (${totS.toFixed(0)} s) ===`);

console.log(`\nLOOKAR: ${lookRuns.length} byten, ${lookTime.size} distinkta av ${EFFECT_KEYS.length} påslagna`);
const sorted = [...lookTime.entries()].sort((a, b) => b[1] - a[1]);
for (const [k, v] of sorted.slice(0, 8)) console.log(`   ${String(k).padEnd(12)} ${pct(v)}`);
if (sorted.length > 8) console.log(`   (+ ${sorted.length - 8} till)`);
const longest = lookRuns.reduce((m, r) => Math.max(m, r.t1 - r.t0), 0);
console.log(`   längsta oavbrutna stund i EN look: ${longest.toFixed(0)} s | median look-längd ${med(lookRuns.map(r => r.t1 - r.t0)).toFixed(0)} s`);

// BYTEN TILL NARA DUBBLETT. Agaren: "ser ut som samma effekter" trots att dirigenten byter ofta. Tabellen
// (--lik) ar parvis korrelation pa per-lampa-ljuskurvor, MINIMUM over bada ladans inspelningar - ett par raknas
// som likadant forst nar det ser likadant ut pa bada. Ett byte till ett par over troskeln ar formellt ett byte
// men visuellt ingen forandring alls.
const likPath = opt("--lik", null);
if (likPath && lookRuns.length > 1) {
  const lik = JSON.parse(readFileSync(likPath, "utf8"));
  const rOf = (a, b) => lik[`${a}|${b}`] ?? lik[`${b}|${a}`] ?? 0;
  const TR = Number(opt("--likr", 0.92));
  let dup = 0, tot = 0;
  for (let i = 1; i < lookRuns.length; i++) {
    const a = lookRuns[i - 1].look, b = lookRuns[i].look;
    if (a === b) continue;
    tot++; if (rOf(a, b) >= TR) dup++;
  }
  console.log(`
BYTEN TILL NARA DUBBLETT (r >= ${TR}): ${dup} av ${tot} = ${(100 * dup / Math.max(1, tot)).toFixed(0)} %`);
  console.log(`   visuellt distinkta byten: ${tot - dup} pa ${(totS / 60).toFixed(0)} min = ${((tot - dup) / (totS / 60)).toFixed(1)}/min`);
}
console.log(`\nTIER (tid): lugn ${pct(tierTime.lugn)}  fart ${pct(tierTime.fart)}  full ${pct(tierTime.full)}`);
console.log(`   tierEma  p10 ${pctl(tierEmaHist, .1).toFixed(2)}  p50 ${pctl(tierEmaHist, .5).toFixed(2)}  p90 ${pctl(tierEmaHist, .9).toFixed(2)}  max ${Math.max(...tierEmaHist).toFixed(2)}`);
console.log(`   intensity p10 ${pctl(intHist, .1).toFixed(2)}  p50 ${pctl(intHist, .5).toFixed(2)}  p90 ${pctl(intHist, .9).toFixed(2)}  max ${Math.max(...intHist).toFixed(2)}`);

const secTime = new Map();
for (const r of secRuns) secTime.set(r.sec, (secTime.get(r.sec) ?? 0) + (r.t1 - r.t0));
console.log(`\nSEKTION: ${secRuns.length} segment, median ${med(secRuns.map(r => r.t1 - r.t0)).toFixed(1)} s`);
for (const [k, v] of [...secTime.entries()].sort((a, b) => b[1] - a[1])) console.log(`   ${String(k).padEnd(8)} ${pct(v)}`);

const calmAble = lvhHist.filter((x) => x <= -6).length;
console.log(`\nlvh (levelVsHighDb): p10 ${pctl(lvhHist, .1).toFixed(1)}  p50 ${pctl(lvhHist, .5).toFixed(1)}  p90 ${pctl(lvhHist, .9).toFixed(1)}`);
console.log(`   <= -6 dB (lugn-grinden kan alls slå till): ${(100 * calmAble / lvhHist.length).toFixed(1)} % av tiden`);

// DROP-SPRANGET: riggens medelljus 0,5 s FORE mot hogsta inom 0,8 s EFTER. Ett stort sprang i ett lugnt parti ar
// precis det agaren kallar "kor massa drops i lugna partier" - aven nar ANTALET fyrningar ar oforandrat.
const rigAt = (t) => { let lo = 0, hi = rig.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (rig[m][0] < t) lo = m + 1; else hi = m; } return lo; };
if (rig.length) {
  const jumps = dropAt.map((f) => {
    const i0 = rigAt(f.t - 0.5), i1 = rigAt(f.t), i2 = rigAt(f.t + 0.8);
    let pre = 0, n = 0; for (let i = i0; i < i1; i++) { pre += rig[i][1]; n++; }
    pre = n ? pre / n : 0;
    let mx = 0; for (let i = i1; i < i2; i++) if (rig[i][1] > mx) mx = rig[i][1];
    return { sec: f.sec, pre, mx, jump: mx - pre };
  });
  const isCalm = (j) => j.sec === 'low' || j.sec === 'intro' || j.sec === 'break';
  const calm = jumps.filter(isCalm), loud = jumps.filter((j) => !isCalm(j));
  const avg = (a, k) => a.length ? a.reduce((s2, x) => s2 + x[k], 0) / a.length : 0;
  console.log(`
DROP-SPRANG (riggens medelljus 0-255): lugna ${calm.length} st, fore ${avg(calm,'pre').toFixed(0)} -> topp ${avg(calm,'mx').toFixed(0)} = sprang ${avg(calm,'jump').toFixed(0)}`);
  console.log(`                                      hoga  ${loud.length} st, fore ${avg(loud,'pre').toFixed(0)} -> topp ${avg(loud,'mx').toFixed(0)} = sprang ${avg(loud,'jump').toFixed(0)}`);
}
console.log(`\nDROPS: ${dropAt.length}`);
for (const f of dropAt) console.log(`   ${f.t.toFixed(1).padStart(6)} s  sect ${String(f.sec).padEnd(6)} lvh ${f.lvh.toFixed(1).padStart(6)}  tier ${f.tier}`);

if (flag("--looks")) { console.log(`\n-- lookföljd --`); for (const r of lookRuns) console.log(`   ${r.t1.toFixed(0).padStart(4)} s -> ${r.look}`); }
if (flag("--sektioner")) { console.log(`\n-- sektionsföljd --`); for (const r of secRuns) console.log(`   ${r.t0.toFixed(0).padStart(4)}-${r.t1.toFixed(0).padStart(4)} s ${r.sec}`); }
if (dirigent.length) { console.log(`\n-- dirigentens egna rader (${dirigent.length}) --`); for (const s of dirigent.slice(0, 25)) console.log("   " + s); }

const out = opt("--json", null);
if (out) writeFileSync(out, JSON.stringify({ path, totS, lookRuns, secRuns, tierTime, lookTime: [...lookTime], dropAt, lvhP50: pctl(lvhHist, .5), calmAblePct: 100 * calmAble / lvhHist.length }, null, 1));
