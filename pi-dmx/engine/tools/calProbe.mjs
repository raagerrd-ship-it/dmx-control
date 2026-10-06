/**
 * B-SONDEN (2026-10-06). Mater vad CAL_V2:s B faktiskt blir i showen, och simulerar vad kurvan ger for olika
 * B-referenser - sa nasta live-prov startar pa ett matt varde i stallet for pa en gissning.
 *
 *   node tools/calProbe.mjs <wav> [startS] [sekunder]
 *
 * BAKGRUND: B = (dim/255) x (starkaste fargen/255) x master, dvs POLERINGEN gange EFFEKTENS styrka
 * (writeFixture: effekten skriver farg OCH styrka i r/g/b; dim skrivs pa fullt och poleringen drar ner det).
 * Showen hamnar darfor langt under 1, och kurvan P = PMIN x (PMAX/PMIN)^B mappade allt till lampans dodaste del.
 * Live-prov 2026-10-06 med BREF = 1: "foljer tex inte energi alls". BREF normerar mot showens verkliga topp.
 *
 * Banken kor MED gamla kalibreringen (CAL_V2 av), eftersom den lamnar dim och den starkaste fargkanalen i
 * princip orörda - den lyfter bara kanaler under tandpunkten och klamper mot taket. B blir darmed det CAL_V2
 * hade sett. Det ar en approximation, och det ar den enda som gar att gora utan att rora driftvagen.
 */
import { readFileSync } from "node:fs";
const say = (...a) => process.stdout.write(a.join(" ") + "\n");

const args = process.argv.slice(2);
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

// Kurvans konstanter (samma standard som output.ts)
const PMIN = 270, DMAX = 127, CMAX = 120, GAMMA = 1;
const PMAX = DMAX * CMAX;
const curve = (B, bref, gamma) => {
  const b = Math.min(1, B / bref);
  return b <= 0.002 ? 0 : PMIN * Math.pow(PMAX / PMIN, Math.pow(Math.min(1, b), gamma));
};

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
  if (off / SR >= startS && ms - lastT >= 25) { lastT = ms; frames.push({ fr: structuredClone(fr), ms }); }
}

const probe = JSON.parse(JSON.stringify(defaultConfig));
const lamps = probe.fixtures.map((fx) => {
  const roles = fixtureRoles(fx), base = (fx.address ?? 1) - 1;
  const at = (r) => { const i = roles.indexOf(r); return i < 0 ? -1 : base + i; };
  return { r: at("r"), g: at("g"), b: at("b"), dim: at("dim") };
});

const B = [];
for (const e of EFFECTS) {
  const cfg = JSON.parse(JSON.stringify(defaultConfig));
  for (const fx of cfg.fixtures) fx.cal = { off: 0, on: 16 };
  cfg.mode = e.key; cfg.beatPulse = true; cfg.master = 1; cfg.energyCeiling = true; cfg.energyDrivesMode = true;
  const t0 = frames[0].ms; Date.now = () => t0; performance.now = () => t0 - EPOCH;
  const eng = new EffectEngine(cfg);
  for (const { fr, ms } of frames) {
    Date.now = () => ms; performance.now = () => ms - EPOCH;
    if (fr.bpm > 0) cfg.beat = { anchorMs: fr.beatAnchorMs || ms, bpm: fr.bpm, confidence: fr.bpmConfidence };
    const u = eng.render(structuredClone(fr));
    if (!u) continue;
    for (const L of lamps) {
      const mx = Math.max(u[L.r] ?? 0, u[L.g] ?? 0, u[L.b] ?? 0);
      const dim = L.dim >= 0 ? (u[L.dim] ?? 0) : 255;
      if (mx <= 8) continue;                       // slackt lampa sager inget
      B.push((dim / 255) * (mx / 255));
    }
  }
}
B.sort((a, b) => a - b);
const p = (q) => B[Math.min(B.length - 1, Math.floor(q * B.length))];
say(`${f} ${startS}-${startS + secs}s, ${frames.length} rutor, ${EFFECTS.length} effekter, ${B.length} tanda lamprutor\n`);
say(`B (poleringen x effektens styrka):  p50 ${p(.5).toFixed(3)}  p90 ${p(.9).toFixed(3)}  p99 ${p(.99).toFixed(3)}  max ${p(1).toFixed(3)}`);
say(`kurvans tak PMAX = ${PMAX}, tandgransen PMIN = ${PMIN}\n`);
say(`vad kurvan ger for olika B-referens (P i procent av lampans omrade):`);
say(`  ${'BREF'.padEnd(8)}${'p50'.padStart(10)}${'p90'.padStart(10)}${'p99'.padStart(10)}${'max'.padStart(10)}   spann p50->p99`);
for (const bref of [1, p(.99), p(.9), p(.5) * 2]) {
  const cols = [.5, .9, .99, 1].map((q) => {
    const P = curve(p(q), bref, GAMMA);
    return `${(100 * (P - PMIN) / (PMAX - PMIN)).toFixed(1)} %`.padStart(10);
  });
  const sp = curve(p(.99), bref, GAMMA) / Math.max(1, curve(p(.5), bref, GAMMA));
  say(`  ${bref.toFixed(3).padEnd(8)}${cols.join('')}   ${sp.toFixed(1)}x`);
}
// GAMMA-SVEP. Kurvan ar EXPONENTIELL i B (lika B-steg = lika fordubblingar), men motorns B ar en LINJAR
// ljusstyrka - darfor krossas mitten: vid B 0,135 ger den 1,3 % av omradet. B^GAMMA med GAMMA < 1 lyfter
// mitten. Linjarfelet = medelavvikelse mellan P/PMAX och B/BREF over p10..p99; lagre = ljusstyrkan foljer
// motorns energi battre, vilket ar precis det som gick forlorat i live-provet.
const bref = p(.99);
say(`\ngamma-svep vid BREF = ${bref.toFixed(2)} (P i procent av lampans omrade):`);
say(`  ${'GAMMA'.padEnd(8)}${'p10'.padStart(9)}${'p50'.padStart(9)}${'p90'.padStart(9)}${'p99'.padStart(9)}   linjarfel`);
let best = null;
for (const g of [1, 0.7, 0.5, 0.4, 0.3, 0.22]) {
  const qs = [.1, .5, .9, .99];
  const cols = qs.map((q) => `${(100 * (curve(p(q), bref, g) - PMIN) / (PMAX - PMIN)).toFixed(1)} %`.padStart(9));
  let err = 0;
  for (const q of qs) {
    const rel = (curve(p(q), bref, g) - PMIN) / (PMAX - PMIN);
    err += Math.abs(rel - Math.min(1, p(q) / bref));
  }
  err /= qs.length;
  if (!best || err < best.err) best = { g, err };
  say(`  ${String(g).padEnd(8)}${cols.join('')}   ${err.toFixed(3)}`);
}
say(`\nFORSLAG att prova LIVE:  DMX_CAL_V2=1  DMX_CAL_BREF=${bref.toFixed(2)}  DMX_CAL_GAMMA=${best.g}`);
say(`BREF = showens p99, sa de ljusaste ogonblicken nar kurvans topp i stallet for 35 %.`);
say(`GAMMA ${best.g} gav minsta linjarfelet (${best.err.toFixed(3)}), dvs P foljer motorns B bast - det ar`);
say(`"ljusstyrkan foljer energin" uttryckt i siffror. Med BREF 1 och GAMMA 1 (det som forkastades live) hamnar`);
say(`medianrutan pa 1,3 % av omradet, och det ar darfor energin inte syntes.`);
say(`Atergang: ta bort drop-in:en. Banken kan INTE mata upplevd ljusstyrka - ditt oga avgor.`);
