/**
 * SHOW-TAJTHET (2026-10-06). Agaren: "analysera mot nya motorn hur effekterna syns/visualiseras sa de blir
 * tight mot latarna och en snygg ljusshow". Den har banken mater precis de tva sakerna, pa EN korning genom
 * den RIKTIGA analysatorn och den RIKTIGA effektmotorn i smart-lage pa virtuell klocka - alltsa showen som
 * den faktiskt blir i ladan, inte en modell av den.
 *
 *   node tools/showTight.mjs <wav> [--json ut.json] [--agc] [--start S] [--sek S] [--tyst]
 *
 * TAJT MOT LATEN (foljer ljuset musiken?)
 *   kickLag      median ms fran analysatorns kick till att riggens ljus natt 90 % av sin topp (ljusvagen)
 *   kickTraff    andel kickar som alls ger en synlig uppgang (>= 15 % over nivan precis fore)
 *   energiR      korrelation riggens ljus mot frame.intensity  <- "ljusstyrka foljer energi"
 *   nivaR        korrelation riggens ljus mot frame.level
 *   musikByten   andel look-byten med musikalisk orsak (allt utom 'dwell'), + byten/min och orsaksfordelning
 *   dropSprang   riggens ljussprang vid drops (fore -> topp inom 0,8 s), lugna och hoga partier skilt
 *
 * SNYGG LJUSSHOW (ser det bra ut?)
 *   alla3        andel tanda lamprutor dar R, G och B alla lyser = vitaktigt (lagre = renare kulorer)
 *   matt         median mattnad (max-min)/max per lampa, 1 = ren farg
 *   lampspr      medelspridning MELLAN lampor i DMX-steg = rumslighet (hogre = mindre "allt lika")
 *   lookar       distinkta lookar, median looklangd, langsta oavbrutna stund i EN look
 *   morkt        andel tid riggen ar i praktiken slackt
 *   spann        riggens ljus p10/p50/p90 - anvander showen sitt omfang eller ligger den still?
 *
 * VARFOR KORRELATION OCH INTE BARA NIVA: energilagret ar det ENDA som far dampa (agarens arkitektur: effekter
 * bestammer farg/styrka/lampa, energilagret polerar precis innan utskick). Da ar fragan inte hur ljust det ar
 * utan om ljuset ROR SIG med musiken. r ar det matt som svarar pa det, och det ar jamforbart natt mot natt.
 *
 * LATGRANS/KARAKTAR/TEMPOVAXLING (bank v2, natt-agenten 2026-10-07): index.ts matar BoundaryDetector fran
 * analysatorns spektrum och ger motorn bytesskal (noteCharShift: karaktarsskifte + tempovaxling uppat) och
 * latgranser (softenRange + analyser.hintTrackChange). Bank v1 hade INTE den sidokedjan - "tempovaxlingen fyrade
 * 0 ganger pa mixarna" 10-06 var darfor banken, inte motorn (matfalla 34). Speglas har rad for rad fran index.ts.
 * --norm DBFS (bank v2): frozen6-klippen ligger ~28 dB under ladans aux-inspelningar (median 100 ms-RMS -31,7 mot
 * pop -3,4 / megamix -4,1 dBFS) och aux kor med last gain 1 - utan nivaanpassning matar korpusen en rigg som far
 * en tjugondel av signalen (matfalla 35). --norm skalar klippet sa medianen hamnar pa DBFS (hard klippning vid +-1).
 * --trace ut.json skriver per-ruta-serier + handelser (tempoShiftBench.mjs laser den).
 *
 * MATFALLA: analysatorn ateranvander SAMMA ruta-objekt varje hop - allt som sparas maste klonas (det var felet
 * som gav 0 i alla effektbankar i tre dygn). Och den virtuella klockan maste sta FORE motorn skapas, annars blir
 * forsta dt negativ och tystnadsgrinden oppnar aldrig.
 */
import { readFileSync, writeFileSync } from "node:fs";

// Motorn stanger av console.log i tyst lage - bankens utskrift maste ga direkt till stdout.
const say = (...a) => process.stdout.write(a.join(" ") + "\n");
const args = process.argv.slice(2);
const flag = (k) => args.includes(k);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };

const path = args.find((a) => a.endsWith(".wav"));
if (!path) { say("ange en wav-fil"); process.exit(2); }
const startS = Number(opt("--start", 0));
const maxS = Number(opt("--sek", 1e9));
const QUIET = flag("--tyst");

const { Analyser } = await import("../dist/analyser.js");
const { EffectEngine } = await import("../dist/effects.js");
const { BeatFeed } = await import("../dist/beatFeed.js");   // taktmatningen som i motorn (matfalla 43)
const { defaultConfig, fixtureRoles } = await import("../dist/config.js");
const { EFFECT_KEYS } = await import("../dist/effects/registry.js");
const { BoundaryDetector } = await import("../dist/boundaryDetector.js");

const d = readFileSync(path);
if (d.toString("ascii", 0, 4) !== "RIFF") { say("inte en WAV"); process.exit(2); }
if (d.readUInt32LE(24) !== 48000 || d.readUInt16LE(34) !== 16 || d.readUInt16LE(22) !== 1) {
  say("kraver 48 kHz mono 16-bit"); process.exit(2);
}
const nSamples = (d.length - 44) >> 1;
let GAIN = 1;
if (opt("--norm", null) !== null) {   // median 100 ms-RMS -> malniva (se huvudet, matfalla 35)
  const blk = 4800, rms = [];
  for (let o = 0; o + blk <= nSamples; o += blk) { let q = 0; for (let i = 0; i < blk; i++) { const x = d.readInt16LE(44 + (o + i) * 2) / 32768; q += x * x; } const r = Math.sqrt(q / blk); if (r > 1e-4) rms.push(r); }
  rms.sort((a, b) => a - b);
  if (rms.length) GAIN = Math.pow(10, Number(opt("--norm")) / 20) / rms[rms.length >> 1];
}
const SR = 48000, HOP = 128, EPOCH = 1700000000000, STEP_MS = 25;   // 25 ms = riggens egen takt

// LADANS CONFIG: smart-lage, alla lookar pa, master 1. Annars matas en annan rigg an den som star i ladan.
const cfg = JSON.parse(JSON.stringify(defaultConfig));
cfg.mode = "smart"; cfg.energyDrivesMode = true; cfg.beatPulse = true; cfg.master = 1; cfg.energyCeiling = true;
cfg.rotation = {}; for (const k of EFFECT_KEYS) cfg.rotation[k] = true;

// ROLLKARTAN ur motorns egen fixtureRoles() - ingen gissning om vilken kanal som ar r/g/b/dim.
const lamps = cfg.fixtures.map((fx) => {
  const roles = fixtureRoles(fx), base = (fx.address ?? 1) - 1;
  const at = (r) => { const i = roles.indexOf(r); return i < 0 ? -1 : base + i; };
  return { r: at("r"), g: at("g"), b: at("b"), dim: at("dim") };
});

const an = new Analyser(JSON.parse(JSON.stringify(defaultConfig)));
const feed = new BeatFeed();
// GAIN: motorn laser forstarkningen bara pa aux (index.ts: setGainLock(cfg.audioInput !== "mic", 1)).
// Kor ladan pa mikrofon ar AGC:n aktiv dar men inte har; --agc kor som mikrofoningang.
if (!flag("--agc")) an.setGainLock(true, 1);
// LATGRANSENS SIDOKEDJA som i index.ts (se huvudet). Klockan ar Date.now = den virtuella.
const bounds = new BoundaryDetector(() => Date.now());   // INTE standardklockan: den fangar Date.now-funktionen vid konstruktion, och banken byter den per hop
an.setSpectrumSink((mag, binHz) => bounds.pushSpectrum(mag, binHz));
const boundsArg = { level: 0, bpm: 0, bpmConfidence: 0 };
let lastCharShift = 0, lastTempoShift = 0, lastBoundary = 0;
const EV = [];   // {t, typ, txt}

// Klockan FORE motorn skapas (matfallan ovan).
const t00 = EPOCH + startS * 1000;
Date.now = () => t00; performance.now = () => t00 - EPOCH;
const eng = new EffectEngine(cfg);

// Motorns rader fangas sa de inte sloar ner korningen; [dirigent] ar enda raden som sager nagot om VARFOR.
const dirigent = [];
const origLog = console.log;
console.log = (...a) => { const s = a.join(" "); if (s.startsWith("[dirigent]")) dirigent.push(s); };

const buf = new Float32Array(HOP);
const T = [], LIT = [], INT = [], LVL = [], BPM = [], TE = [], LSPR = [], LOOK = [], WHY = [];   // per renderruta (TE = motorns tierEma)
const KICK = [];                                      // index i T dar en kick lag
const DROP = [];                                      // {t, i, sec, lvh}
const lookRuns = [];                                  // {look, t0, t1}
const lookTime = new Map();
const whyCount = new Map();
let alla3 = 0, en = 0, litFrames = 0, mattSum = [], lamsprSum = 0, lamsprN = 0;
let lastRender = -1, lastLook = null, lastSwitch = 0, lastDrop = 0, kickPending = false;
let lastMini = 0, MINIS = 0;   // minidrops (analysatorns miniDropCount-flanker)
const endSample = Math.min(nSamples, Math.floor((startS + maxS) * SR));

for (let off = Math.floor(startS * SR / HOP) * HOP; off + HOP <= endSample; off += HOP) {
  for (let i = 0; i < HOP; i++) { const x = d.readInt16LE(44 + (off + i) * 2) / 32768 * GAIN; buf[i] = x > 1 ? 1 : x < -1 ? -1 : x; }
  const tS = off / SR, ms = EPOCH + tS * 1000;
  an.setVirtualClock(ms); Date.now = () => ms; performance.now = () => ms - EPOCH;
  const fr = an.process(buf);
  boundsArg.level = fr.level; boundsArg.bpm = fr.bpm; boundsArg.bpmConfidence = fr.bpmConfidence;
  bounds.tick(boundsArg);
  if (bounds.charShiftCount !== lastCharShift) { lastCharShift = bounds.charShiftCount; eng.noteCharShift(); EV.push({ t: tS, typ: 'karaktar' }); }
  if (bounds.tempoShiftCount !== lastTempoShift) { lastTempoShift = bounds.tempoShiftCount; eng.noteCharShift(`tempovaxling ${bounds.tempoShiftFrom}->${bounds.tempoShiftTo} BPM`); EV.push({ t: tS, typ: 'tempo', fran: bounds.tempoShiftFrom, till: bounds.tempoShiftTo }); }
  if (bounds.boundaryCount !== lastBoundary) {
    lastBoundary = bounds.boundaryCount; eng.softenRange(); EV.push({ t: tS, typ: 'grans' });
    if (process.env.DMX_BOUNDARY_SOFT !== '0') an.hintTrackChange(5000); else { an.resetTempo(); if ((process.env.DMX_SECTION_HINT_LOWCONF ?? '0') === '0') an.hintTrackChange(5000); }
  }
  feed.update(fr, cfg, an);   // TAKTMATNINGEN SOM LIVE (beatFeed.ts, matfalla 43; forr anchorMs = fr.beatAnchorMs varje hop)
  if (fr.kick) kickPending = true;                                   // tappa ingen kick mellan renderrutorna
  if (ms - lastRender < STEP_MS && lastRender >= 0) continue;

  const dt = lastRender < 0 ? STEP_MS / 1000 : (ms - lastRender) / 1000;
  lastRender = ms;
  eng.render(fr);
  const u = eng.universe;
  if (!u) continue;

  // RIGGENS LJUS: per lampa den starkaste fargkanalen gange dimmern - det ogat ser.
  let lit = 0;
  for (const L of lamps) {
    const r = u[L.r] ?? 0, g = u[L.g] ?? 0, b = u[L.b] ?? 0;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const dim = L.dim >= 0 ? (u[L.dim] ?? 0) / 255 : 1;
    lit += (mx / 255) * dim;
    if (mx > 8) {                                                    // slackt lampa sager inget om farg
      litFrames++;
      if (Math.min(r, g, b) > 8) alla3++;
      if ((r > 8 ? 1 : 0) + (g > 8 ? 1 : 0) + (b > 8 ? 1 : 0) === 1) en++;
      mattSum.push((mx - mn) / mx);
    }
  }
  lit /= lamps.length;
  // RUMSLIGHET: spridningen MELLAN lampornas ljus. Lika pa alla lampor = platt vagg.
  let lmin = 1e9, lmax = -1e9;
  for (const L of lamps) {
    const v = Math.max(u[L.r] ?? 0, u[L.g] ?? 0, u[L.b] ?? 0) * (L.dim >= 0 ? (u[L.dim] ?? 0) / 255 : 1);
    if (v < lmin) lmin = v; if (v > lmax) lmax = v;
  }
  lamsprSum += lmax - lmin; lamsprN++;
  LSPR.push(lmax - lmin);

  const i = T.length;
  T.push(tS); LIT.push(lit); INT.push(fr.intensity ?? 0); LVL.push(fr.level ?? 0); BPM.push(fr.bpm ?? 0); TE.push(eng.tierEma ?? 0);
  if (kickPending) { KICK.push(i); kickPending = false; }
  if ((fr.miniDropCount ?? 0) !== lastMini) { lastMini = fr.miniDropCount ?? 0; MINIS++; }
  if ((fr.dropCount ?? 0) !== lastDrop) { lastDrop = fr.dropCount ?? 0; DROP.push({ t: tS, i, sec: fr.section, lvh: fr.levelVsHighDb ?? 0 }); }

  const look = eng.smartMode;
  if (look !== lastLook) {
    if (lastLook !== null) lookRuns.push({ look: lastLook, t0: lookRuns.length ? lookRuns[lookRuns.length - 1].t1 : startS, t1: tS });
    lastLook = look;
  }
  lookTime.set(look, (lookTime.get(look) ?? 0) + dt);
  LOOK.push(look);
  if (eng.switchCount !== lastSwitch) { lastSwitch = eng.switchCount; const w = eng.switchWhy || '?'; whyCount.set(w, (whyCount.get(w) ?? 0) + 1); WHY.push({ t: tS, why: w, look }); }
}
if (lastLook !== null) lookRuns.push({ look: lastLook, t0: lookRuns.length ? lookRuns[lookRuns.length - 1].t1 : startS, t1: T[T.length - 1] ?? startS });
console.log = origLog;

const totS = (T[T.length - 1] ?? startS) - startS;
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : NaN; };
const pctl = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : NaN; };
/** ENVELOPPER over W sekunder: medelvardet per block. LIT pulserar per slag, INT ar en langsam energikurva -
 *  en korrelation ruta-mot-ruta mater mest fasskillnaden mellan puls och envelopp och ger nara 0 aven nar
 *  ljuset foljer musiken perfekt pa sekundskala. Agarens fraga ("foljer ljusstyrkan energin") galler sekunder. */
const envel = (a, w) => {
  const n = Math.max(1, Math.round(w * 1000 / STEP_MS)), out = [];
  for (let i = 0; i + n <= a.length; i += n) { let s2 = 0; for (let k = 0; k < n; k++) s2 += a[i + k]; out.push(s2 / n); }
  return out;
};
const envelMax = (a, w) => {
  const n = Math.max(1, Math.round(w * 1000 / STEP_MS)), out = [];
  for (let i = 0; i + n <= a.length; i += n) { let m = -1e9; for (let k = 0; k < n; k++) if (a[i + k] > m) m = a[i + k]; out.push(m); }
  return out;
};
const pear = (a, b) => {
  const n = Math.min(a.length, b.length); if (n < 10) return NaN;
  let sa = 0, sb = 0; for (let i = 0; i < n; i++) { sa += a[i]; sb += b[i]; }
  const ma = sa / n, mb = sb / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { const x = a[i] - ma, y = b[i] - mb; num += x * y; da += x * x; db += y * y; }
  return da > 0 && db > 0 ? num / Math.sqrt(da * db) : NaN;
};

// KICKENS AVTRYCK I LJUSET. Per kick utanfor drops: finns en tydlig uppgang inom 400 ms, och nar nar den 90 %?
// En kick utan uppgang ar en kick ogat inte ser - det ar ett lika viktigt matt som fordrojningen.
const bpmMed = med(BPM.filter((x) => x > 0)) || 120;
const beatMs = 60000 / bpmMed;
// FONSTRET maste vara KORTARE an ett halvt slag, annars kan toppen inom fonstret vara NASTA slags uppgang och
// medianen blir halva takten i stallet for ljusvagens fordrojning (matfalla 2026-10-06: 400 ms gav 250 ms pa
// en mix dar slagen ligger 470 ms isar).
const W = Math.max(2, Math.round(Math.min(300, 0.45 * beatMs) / STEP_MS));
const lags = [], heights = [];
let kickWithRise = 0, kickTested = 0;
const nearDrop = (i) => DROP.some((dp) => Math.abs(T[i] - dp.t) < 1.2);
for (const i of KICK) {
  if (i < 1 || i + W >= LIT.length) continue;
  if (nearDrop(i)) continue;                                   // drops har egen vag och egen storlek
  if (LIT[i] > LIT[i - 1] * 1.05) continue;                    // redan pa vag upp - sager inget om fordrojning
  kickTested++;
  let mx = LIT[i], at = 0;
  for (let k = 1; k <= W; k++) if (LIT[i + k] > mx) { mx = LIT[i + k]; at = k; }
  if (mx <= LIT[i] * 1.15) continue;                           // ingen synlig uppgang
  kickWithRise++;
  const thr = LIT[i] + 0.9 * (mx - LIT[i]);
  let k = 1; while (k <= at && LIT[i + k] < thr) k++;
  lags.push(k * STEP_MS); heights.push(mx - LIT[i]);
}

// DROP-SPRANGET: riggens ljus 0,5 s FORE mot hogsta inom 0,8 s EFTER, lugna och hoga partier skilt.
const jumps = DROP.map((dp) => {
  const i0 = Math.max(0, dp.i - Math.round(500 / STEP_MS)), i2 = Math.min(LIT.length - 1, dp.i + Math.round(800 / STEP_MS));
  let pre = 0, n = 0; for (let i = i0; i < dp.i; i++) { pre += LIT[i]; n++; }
  pre = n ? pre / n : 0;
  let mx = 0; for (let i = dp.i; i <= i2; i++) if (LIT[i] > mx) mx = LIT[i];
  return { sec: dp.sec, lvh: dp.lvh, pre, mx, jump: mx - pre };
});
const calmSec = (s) => s === 'low' || s === 'intro' || s === 'break';
const avg = (a, k) => a.length ? a.reduce((s, x) => s + x[k], 0) / a.length : NaN;

// LJUS PER TIER: motorns egen tierEma delar showen i lugn/fart/full (samma gransvarden som showBench anvander
// for tidsandelen; motorn har hysteres, det har ar bara en indelning). Medelljus och toppljus per tier svarar rakt
// pa "blir det ljusare nar musiken blir storre" utan att ga via en korrelation.
const tierOf = (te) => te < 0.30 ? 0 : te < 0.63 ? 1 : 2;
const tierLit = [[], [], []], tierTop = [[], [], []];
{
  const n = Math.max(1, Math.round(1000 / STEP_MS));
  for (let i = 0; i + n <= LIT.length; i += n) {
    let s2 = 0, m = -1e9, te = 0;
    for (let k = 0; k < n; k++) { s2 += LIT[i + k]; if (LIT[i + k] > m) m = LIT[i + k]; te += TE[i + k]; }
    const t = tierOf(te / n);
    tierLit[t].push(s2 / n); tierTop[t].push(m);
  }
}
const medOr = (a) => a.length ? med(a) : NaN;

const switches = [...whyCount.values()].reduce((a, b) => a + b, 0);
const musical = switches - (whyCount.get('dwell') ?? 0);
const DARK = 0.02;
const res = {
  wav: path, startS, gainDb: +(20 * Math.log10(GAIN)).toFixed(1), totS: Math.round(totS), rutor: T.length,
  tajt: {
    kickLagMs: med(lags), kickar: kickTested, kickTraff: kickTested ? kickWithRise / kickTested : NaN,
    kickHojd: med(heights),
    energiR: pear(envel(LIT, 1), envel(INT, 1)), nivaR: pear(envel(LIT, 1), envel(LVL, 1)),
    energiRtopp: pear(envelMax(LIT, 1), envel(INT, 1)),   // 1 s TOPP mot energi - straffar inte flimmer
    energiRruta: pear(LIT, INT),       // ruta-mot-ruta (pulsen mot enveloppen) - referens, inte malet
    bpmMed, kickFonsterMs: W * STEP_MS,
    litLugn: medOr(tierLit[0]), litFart: medOr(tierLit[1]), litFull: medOr(tierLit[2]),
    toppLugn: medOr(tierTop[0]), toppFart: medOr(tierTop[1]), toppFull: medOr(tierTop[2]),
    sekLugn: tierLit[0].length, sekFart: tierLit[1].length, sekFull: tierLit[2].length,
    byten: switches, bytenPerMin: totS > 0 ? switches / (totS / 60) : NaN,
    musikByten: switches ? musical / switches : NaN, orsaker: Object.fromEntries(whyCount),
    drops: DROP.length, minidrops: MINIS,
    granser: EV.filter((e) => e.typ === 'grans').length, karaktarsskiften: EV.filter((e) => e.typ === 'karaktar').length,
    tempovaxlingar: EV.filter((e) => e.typ === 'tempo').length,
    dropSprangLugn: avg(jumps.filter((j) => calmSec(j.sec)), 'jump'),
    dropSprangHog: avg(jumps.filter((j) => !calmSec(j.sec)), 'jump'),
    dropsLugna: jumps.filter((j) => calmSec(j.sec)).length,
  },
  snygg: {
    alla3: litFrames ? alla3 / litFrames : NaN, en: litFrames ? en / litFrames : NaN,
    matt: med(mattSum), lampspr: lamsprN ? lamsprSum / lamsprN : NaN,
    lookar: lookTime.size, lookMedianS: med(lookRuns.map((r) => r.t1 - r.t0)),
    lookLangstaS: lookRuns.reduce((m, r) => Math.max(m, r.t1 - r.t0), 0),
    morkt: LIT.length ? LIT.filter((x) => x < DARK).length / LIT.length : NaN,
    litP10: pctl(LIT, .1), litP50: pctl(LIT, .5), litP90: pctl(LIT, .9),
  },
  lookTime: [...lookTime.entries()].sort((a, b) => b[1] - a[1]),
};

const traceOut = opt("--trace", null);
if (traceOut) writeFileSync(traceOut, JSON.stringify({ T, LIT, LSPR, LOOK, BPM, KICK, EV, WHY, STEP_MS }));
const jsonOut = opt("--json", null);
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(res, null, 1));
if (QUIET) { say(JSON.stringify(res)); process.exit(0); }

const f2 = (x) => Number.isFinite(x) ? x.toFixed(2) : "  -";
const f0 = (x) => Number.isFinite(x) ? x.toFixed(0) : " -";
const p1 = (x) => Number.isFinite(x) ? `${(100 * x).toFixed(1)} %` : "   -";
say(`\n=== ${path}  ${startS}-${(startS + totS).toFixed(0)} s, ${T.length} rutor a ${STEP_MS} ms ===`);
say(`\nTAJT MOT LATEN`);
say(`  kick -> ljus       ${f0(res.tajt.kickLagMs)} ms (median, ljusvagen, fonster ${W * STEP_MS} ms vid ${f0(bpmMed)} BPM) pa ${kickWithRise}/${kickTested} kickar = ${p1(res.tajt.kickTraff)}`);
say(`  uppgangens storlek ${f2(res.tajt.kickHojd)} av riggens 0-1 skala`);
say(`  ljus mot energi    r ${f2(res.tajt.energiR)} pa 1 s-MEDEL, ${f2(res.tajt.energiRtopp)} pa 1 s-TOPP (ruta-mot-ruta ${f2(res.tajt.energiRruta)}), ljus mot niva r ${f2(res.tajt.nivaR)}`);
say(`  ljus per tier      lugn ${f2(res.tajt.litLugn)}/${f2(res.tajt.toppLugn)}  fart ${f2(res.tajt.litFart)}/${f2(res.tajt.toppFart)}  full ${f2(res.tajt.litFull)}/${f2(res.tajt.toppFull)}  (medel/topp, ${res.tajt.sekLugn}/${res.tajt.sekFart}/${res.tajt.sekFull} s)`);
say(`  look-byten         ${switches} st = ${f2(res.tajt.bytenPerMin)}/min, musikalisk orsak ${p1(res.tajt.musikByten)}`);
say(`                     ${[...whyCount.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join("  ") || "(inga)"}`);
say(`  drops              ${DROP.length} st, sprang lugna ${f2(res.tajt.dropSprangLugn)} (${res.tajt.dropsLugna} st) / hoga ${f2(res.tajt.dropSprangHog)}`);
say(`\nSNYGG LJUSSHOW`);
say(`  alla tre dioderna  ${p1(res.snygg.alla3)} av tanda lamprutor   exakt en kanal ${p1(res.snygg.en)}`);
say(`  mattnad (median)   ${f2(res.snygg.matt)}      spridning mellan lampor ${f0(res.snygg.lampspr)} DMX-steg`);
say(`  lookar             ${res.snygg.lookar} distinkta, median ${f0(res.snygg.lookMedianS)} s, langsta stund ${f0(res.snygg.lookLangstaS)} s`);
say(`  riggens ljus       p10 ${f2(res.snygg.litP10)}  p50 ${f2(res.snygg.litP50)}  p90 ${f2(res.snygg.litP90)}   slackt ${p1(res.snygg.morkt)} av tiden`);
if (dirigent.length) { say(`\n-- dirigenten (${dirigent.length} rader, 12 forsta) --`); for (const s of dirigent.slice(0, 12)) say("   " + s); }
say(`\nTAJT = kick->ljus lagt, kickTraff hogt, r hogt, musikByten hogt. SNYGGT = alla3 lagt, mattnad och lampspr hoga,`);
say(`flera lookar utan langa stillastaende stunder, och ett ljusspann som anvands. Jamfor natt mot natt, aldrig i absoluta tal.`);
