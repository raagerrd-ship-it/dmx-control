/**
 * FARGBANK (2026-10-06). Agarens hypotes: effekterna ser likadana ut for att nastan alla tander ALLA tre
 * RGB-dioderna samtidigt — da blir resultatet vitaktigt och skillnaden mellan effekter forsvinner.
 * Den har banken mater det per FARGKANAL, pa riktiga rutor ur analysatorn, for varje effekt.
 *
 *   node tools/colorBench.mjs <wav> [startS] [sekunder] [--agc] [--csv ut.csv]
 *
 * Rollkartan hamtas ur motorns egen fixtureRoles() — ingen gissning om vilken kanal som ar r/g/b.
 * Mats per effekt, bara pa rutor dar lampan alls lyser:
 *   alla3    andel rutor dar R, G och B alla ligger over TAND (8 av 255) = "alla dioder tanda"
 *   en       andel rutor med exakt EN kanal tand = ren kulor
 *   matt     mattnad (max-min)/max per lampa, 1,0 = helt ren farg, 0 = vitt
 *   kanalspr medelspridning mellan R/G/B i DMX-steg
 *   lampspr  medelspridning MELLAN lampor (max-min av lampornas ljus) — rumsligheten
 */
import { readFileSync, writeFileSync } from "node:fs";

// Motorn stanger av console.log i tyst lage (DMX_QUIET) — bankens utskrift maste ga direkt till stdout.
const say = (...a) => process.stdout.write(a.join(" ") + "\n");

const args = process.argv.slice(2);
const flag = (k) => args.includes(k);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const f = args.find((a) => a.endsWith(".wav")) || "tools/pop_ladan.wav";
const nums = args.filter((a) => /^\d+$/.test(a)).map(Number);
const startS = nums[0] ?? 60, secs = nums[1] ?? 90;

const { Analyser } = await import("../dist/analyser.js");
const { EffectEngine } = await import("../dist/effects.js");
const { defaultConfig, fixtureRoles } = await import("../dist/config.js");
const { EFFECTS } = await import("../dist/effects/registry.js");

const d = readFileSync(f);
const n = (d.length - 44) >> 1;
const SR = 48000, HOP = 128, EPOCH = 1700000000000;
const TAND = 8;   // over detta raknas en diod som tand (tandpunkten ar 16; 8 fangar aven svagt pa)

// ── 1. Rutor en gang: samma frames till alla effekter, sa jamforelsen ar rattvis ──────────────────
const an = new Analyser(JSON.parse(JSON.stringify(defaultConfig)));
if (!flag("--agc")) an.setGainLock(true, 1);
const frames = [];
const buf = new Float32Array(HOP);
let lastT = -1;
for (let off = 0; off + HOP <= n && off < (startS + secs) * SR; off += HOP) {
  for (let i = 0; i < HOP; i++) buf[i] = d.readInt16LE(44 + (off + i) * 2) / 32768;
  const ms = EPOCH + (off / SR) * 1000;
  an.setVirtualClock(ms);
  Date.now = () => ms; performance.now = () => ms - EPOCH;
  const fr = an.process(buf);
  // MATFALLA: analysatorn returnerar SAMMA objekt varje hop (bevisat: frames[0] === sista). Att spara
  // referensen ger N pekare till en enda, sist muterad, ram - da matte banken en frusen bild och allt blev 0.
  // structuredClone ger en egen ogonblicksbild per ruta.
  if (off / SR >= startS && ms - lastT >= 25) { lastT = ms; frames.push({ fr: structuredClone(fr), ms }); }
}
if (!frames.length) { say("inga rutor - kolla start/langd mot filens langd"); process.exit(2); }

// ── 2. Kanalindex per lampa ur motorns egen rollkarta ────────────────────────────────────────────
// LADANS KALIBRERING: armaturerna har cal {off:0, on:16}; defaultConfig har ingen. Tandpunkten satter bade
// kalibreringsgolvet och pulsutrymmets troskel (on + room), sa utan den mater banken en annan rigg an ladans.
const BARN_CAL = { off: 0, on: 16 };
const probe = JSON.parse(JSON.stringify(defaultConfig));
const lamps = probe.fixtures.map((fx) => {
  const roles = fixtureRoles(fx);
  const base = (fx.address ?? 1) - 1;
  const at = (role) => { const i = roles.indexOf(role); return i < 0 ? -1 : base + i; };
  return { name: fx.name, r: at("r"), g: at("g"), b: at("b"), dim: at("dim") };
});
if (lamps.some((l) => l.r < 0 || l.g < 0 || l.b < 0)) { say("hittade inte r/g/b i rollkartan " + JSON.stringify(lamps)); process.exit(2); }

const rows = [];
for (const e of EFFECTS) {
  const cfg = JSON.parse(JSON.stringify(defaultConfig));
  // --bara-energi: inget hjartslag EFTER effekten (agaren 2026-10-06: "vi kor inte med heartbeat efter
  // effekten utan bara energi"). cfg.beatPulse grindar de fyra post-stallena (bm/beatMulNow, hbPulse,
  // BEAT_LIFT, pulseActive); effekternas EGEN puls (ctx.beatPulse, c.heart) satts separat och ar orord.
  for (const fx of cfg.fixtures) fx.cal = { ...BARN_CAL };   // som ladan
  if (process.env.BENCH_CALM_DECAY) cfg.calmDecay = Number(process.env.BENCH_CALM_DECAY);   // isolera ballistikens utsmetning
  cfg.mode = e.key; cfg.beatPulse = !flag("--bara-energi"); cfg.master = 1; cfg.energyCeiling = true; cfg.energyDrivesMode = true;
  // MATFALLA: klockan far ALDRIG ga bakat over motorns konstruktion. Insamlingen lamnade performance.now()
  // vid fonstrets SLUT; konstrueras motorn da satter den sin lastRenderMs dit, och forsta renderingen (fonstrets
  // borjan) ger delta-t pa minus en minut -> tystnadsgrinden oppnar aldrig och universet blir helsvart. Det var
  // orsaken till att bade colorBench och spreadBench visade 0 for ALLA effekter.
  const t0 = frames[0].ms;
  Date.now = () => t0; performance.now = () => t0 - EPOCH;
  const eng = new EffectEngine(cfg);
  let lit = 0, all3 = 0, one = 0, satSum = 0, chSpread = 0, lampSpread = 0, nRuta = 0;
  for (const { fr, ms } of frames) {
    Date.now = () => ms; performance.now = () => ms - EPOCH;
    if (fr.bpm > 0) cfg.beat = { anchorMs: fr.beatAnchorMs || ms, bpm: fr.bpm, confidence: fr.bpmConfidence };
    const u = eng.render(structuredClone(fr));   // egen kopia: render far mutera utan att smitta nasta effekt
    if (!u) continue;
    const lampVals = [];
    for (const L of lamps) {
      const r = u[L.r] ?? 0, g = u[L.g] ?? 0, b = u[L.b] ?? 0;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      lampVals.push(mx);
      if (mx <= TAND) continue;            // slackt lampa sager inget om farg
      lit++;
      const onCount = (r > TAND ? 1 : 0) + (g > TAND ? 1 : 0) + (b > TAND ? 1 : 0);
      if (onCount === 3) all3++;
      if (onCount === 1) one++;
      satSum += (mx - mn) / mx;
      chSpread += mx - mn;
    }
    lampSpread += Math.max(...lampVals) - Math.min(...lampVals); nRuta++;
  }
  const p = (x) => lit ? (100 * x / lit) : 0;
  rows.push({
    key: e.key, tier: e.tier,
    all3: p(all3), one: p(one),
    sat: lit ? satSum / lit : 0,
    ch: lit ? chSpread / lit : 0,
    lamp: nRuta ? lampSpread / nRuta : 0,
    lit: nRuta ? (100 * lit / (nRuta * lamps.length)) : 0,
  });
}

rows.sort((a, b) => b.all3 - a.all3);
say(`${f} ${startS}-${startS + secs}s, ${frames.length} rutor, ${lamps.length} lampor, ${rows.length} effekter`);
say(`alla3 = andel tanda lampor dar R+G+B ALLA lyser (vitaktigt) | en = exakt en kanal (ren kulor)`);
say(`matt = (max-min)/max, 1,0 ren farg / 0 vitt | kanalspr, lampspr i DMX-steg | tand = andel lampor som lyser\n`);
say(`  ${'effekt'.padEnd(12)} ${'tier'.padEnd(5)} alla3    en    matt  kanalspr lampspr  tand`);
for (const r of rows) {
  say(`  ${r.key.padEnd(12)} ${r.tier.padEnd(5)} ${r.all3.toFixed(0).padStart(4)} % ${r.one.toFixed(0).padStart(4)} %  ${r.sat.toFixed(2)}  ${r.ch.toFixed(0).padStart(6)}  ${r.lamp.toFixed(0).padStart(6)}  ${r.lit.toFixed(0).padStart(3)} %`);
}
const med = (k) => { const s = rows.map((x) => x[k]).sort((a, b) => a - b); return s[s.length >> 1]; };
say(`\nMEDIAN over alla effekter: alla3 ${med('all3').toFixed(0)} %, en ${med('one').toFixed(0)} %, matt ${med('sat').toFixed(2)}, kanalspr ${med('ch').toFixed(0)}, lampspr ${med('lamp').toFixed(0)}`);
const csv = opt("--csv", null);
if (csv) { writeFileSync(csv, "effekt,tier,alla3,en,matt,kanalspr,lampspr,tand\n" + rows.map((r) => `${r.key},${r.tier},${r.all3.toFixed(1)},${r.one.toFixed(1)},${r.sat.toFixed(3)},${r.ch.toFixed(1)},${r.lamp.toFixed(1)},${r.lit.toFixed(1)}`).join("\n")); say(`-> ${csv}`); }
