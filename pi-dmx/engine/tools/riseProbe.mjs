/**
 * UPPGANGSSONDEN (2026-10-06). Agaren: "riggen ar nu kanske 100 ms efter... ar fran slackta lampor till ljus
 * vid inte drop" (drops sitter). Fragan som MASTE skiljas: ar uppgangen SENARE, eller bara SVAGARE?
 * En lampa som gar fran vitt (alla tre dioderna) till ren kulor (en diod) ger mindre totalt ljus aven om
 * tidpunkten ar identisk - och mindre ljus laser ogat latt som "tragare".
 *
 *   node tools/riseProbe.mjs <wav> [startS] [sekunder]
 *
 * Mater per KICK (analysatorns egen), utanfor drops:
 *   fordrojning  tid fran kicken till att riggens ljus natt 90 % av sin topp inom 400 ms
 *   topp         riggens ljus i den toppen (medel over lampornas starkaste fargkanal + dim)
 * Kors for flera varianter av BEAT_LIFT sa fore/efter kvallens andring gar att jamfora rakt av.
 */
import { readFileSync } from "node:fs";
const say = (...a) => process.stdout.write(a.join(" ") + "\n");

const args = process.argv.slice(2);
const f = args.find((a) => a.endsWith(".wav")) || "tools/pop_ladan.wav";
const nums = args.filter((a) => /^\d+$/.test(a)).map(Number);
const startS = nums[0] ?? 60, secs = nums[1] ?? 120;

const { Analyser } = await import("../dist/analyser.js");
const { EffectEngine } = await import("../dist/effects.js");
const { defaultConfig, fixtureRoles } = await import("../dist/config.js");

const d = readFileSync(f);
const n = (d.length - 44) >> 1;
const SR = 48000, HOP = 128, EPOCH = 1700000000000;
const STEP_MS = 10;   // finare an riggens 25 ms sa fordrojningen gar att lasa

// Rutor en gang (klonade - analysatorn ateranvander objektet)
const an = new Analyser(JSON.parse(JSON.stringify(defaultConfig)));
an.setGainLock(true, 1);
const frames = [];
const buf = new Float32Array(HOP);
let lastT = -1;
for (let off = 0; off + HOP <= n && off < (startS + secs) * SR; off += HOP) {
  for (let i = 0; i < HOP; i++) buf[i] = d.readInt16LE(44 + (off + i) * 2) / 32768;
  const ms = EPOCH + (off / SR) * 1000;
  an.setVirtualClock(ms); Date.now = () => ms; performance.now = () => ms - EPOCH;
  const fr = an.process(buf);
  const kick = !!fr.kick;
  if (off / SR >= startS && ms - lastT >= STEP_MS) { lastT = ms; frames.push({ fr: structuredClone(fr), ms, kick }); }
  else if (kick && frames.length) frames[frames.length - 1].kick = true;   // tappa ingen kick mellan proven
}

const probe = JSON.parse(JSON.stringify(defaultConfig));
const lamps = probe.fixtures.map((fx) => {
  const roles = fixtureRoles(fx), base = (fx.address ?? 1) - 1;
  const at = (r) => { const i = roles.indexOf(r); return i < 0 ? -1 : base + i; };
  return { r: at("r"), g: at("g"), b: at("b"), dim: at("dim") };
});

function run(mode) {
  const cfg = JSON.parse(JSON.stringify(defaultConfig));
  for (const fx of cfg.fixtures) fx.cal = { off: 0, on: 16 };
  cfg.mode = mode; cfg.beatPulse = true; cfg.master = 1; cfg.energyCeiling = true; cfg.energyDrivesMode = true;
  const t0 = frames[0].ms; Date.now = () => t0; performance.now = () => t0 - EPOCH;
  const eng = new EffectEngine(cfg);
  const lvl = [];   // riggens ljus per ruta
  for (const { fr, ms } of frames) {
    Date.now = () => ms; performance.now = () => ms - EPOCH;
    if (fr.bpm > 0) cfg.beat = { anchorMs: fr.beatAnchorMs || ms, bpm: fr.bpm, confidence: fr.bpmConfidence };
    const u = eng.render(structuredClone(fr));
    let s = 0;
    for (const L of lamps) s += Math.max(u[L.r] ?? 0, u[L.g] ?? 0, u[L.b] ?? 0) + (L.dim >= 0 ? (u[L.dim] ?? 0) : 0);
    lvl.push(s / lamps.length);
  }
  // Per kick utanfor drop: fordrojning till 90 % av toppen inom 400 ms, och toppen
  const W = Math.round(400 / STEP_MS);
  const lags = [], peaks = [];
  for (let i = 1; i < frames.length - W; i++) {
    if (!frames[i].kick) continue;
    if ((frames[i].fr.dropCount ?? 0) !== (frames[i - 1].fr.dropCount ?? 0)) continue;   // drops har egen vag
    if (lvl[i] > lvl[i - 1] * 1.05) continue;                                            // redan pa vag upp
    let mx = lvl[i], at = 0;
    for (let k = 1; k <= W; k++) if (lvl[i + k] > mx) { mx = lvl[i + k]; at = k; }
    if (mx <= lvl[i] * 1.15) continue;        // ingen tydlig uppgang - sager inget om fordrojning
    const thr = lvl[i] + 0.9 * (mx - lvl[i]);
    let k = 1; while (k <= at && lvl[i + k] < thr) k++;
    lags.push(k * STEP_MS); peaks.push(mx);
  }
  const med = (a) => { const s2 = [...a].sort((x, y) => x - y); return s2.length ? s2[s2.length >> 1] : NaN; };
  return { n: lags.length, lag: med(lags), peak: med(peaks), mean: lvl.reduce((a, b) => a + b, 0) / lvl.length };
}

say(`${f} ${startS}-${startS + secs}s, ${frames.length} rutor a ${STEP_MS} ms\n`);
say(`  ${'look'.padEnd(12)}${'kickar'.padStart(8)}${'fordrojning'.padStart(14)}${'topp'.padStart(9)}${'medelljus'.padStart(11)}`);
for (const mode of ["mono", "party", "chase", "varannan", "drift"]) {
  const r = run(mode);
  say(`  ${mode.padEnd(12)}${String(r.n).padStart(8)}${(r.lag.toFixed(0) + ' ms').padStart(14)}${r.peak.toFixed(0).padStart(9)}${r.mean.toFixed(0).padStart(11)}`);
}
say(`\nFordrojningen ar ljusvagens, inte hela kedjans: analysatorns kick -> riggens 90 %.`);
say(`Kor med BEAT_LIFT=0.25 for att jamfora mot laget fore kvallens andring.`);
