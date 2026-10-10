/**
 * LEVANDE DYNAMIK UTAN FLADDER (natt-agenten 2026-10-09, uppdraget "Fran kvallen 2026-10-08" i tools/natt/todo.md).
 * Agaren i ladan: "ljuset kanns levande, borjar bli bra. Men tror vi kan gora det battre. Da utan att de fladdrar."
 * Och: "fa lamporna att kora stabilare pa r g b dioderna. nu kan tex R lysa och B fladdra till".
 *
 * Samma korning som showTight (riktig analysator + riktig effektmotor i smart-lage, virtuell klocka, latgransens
 * sidokedja), men med KALIBRERADE lampor (cal.on = --on, standard 16 = ladans tandpunkt) sa utgangens mappning
 * ar den som star i ladan - standardconfigens lampor saknar cal och visar inte tandpunktsfelen.
 *
 *   node tools/dynBench.mjs <wav> [--on 16] [--tyst] [--norm DBFS] [--start S] [--sek S]
 *
 * LEVANDE
 *   mdSteg      energifaktorns spann i STEG (log2 p90/p10 av eSimple^E_CURVE, golv 1/64) - ett steg = dubbelt sa ljust
 *   ljusSteg    riggens 1 s-medelljus, samma matt (det ogat ser efter puls, drop, utgang)
 *   rDb         riggens 1 s-medelljus mot ingangens 1 s-medel i dB (levelVU) - foljer ljuset volymen?
 *   kontrast    medelljus i hogsta dB-kvartilens sekunder / lagsta kvartilens
 * FLADDER
 *   fladderMin  per lampa och minut: BLIPPAR - ett extrem (zigzag, svangning >= 5 % av fullt at bada hall) dar bade
 *               benet in och benet ut gar pa < 150 ms och inget slag/kick (grid + kick, +-60 ms) ligger i spannet.
 *               Snabb uppgang + langsamt fall = puls, inte fladder. Medel over lamporna.
 *   pulsPerKick riggens uppgangar som startar inom +-60 ms fran en kick / antal kickar (instrumentkontroll)
 * R/G/B (diodernas sanning: en kanal LYSER nar DMX > tandpunkten)
 *   sidoVaxl    per lampa och minut: en fargkanal tands/slacks medan lampan sjalv forblir tand
 *   sidoBlink   av dem: korta episoder (< 300 ms) - "B fladdrar till"
 *   ofrivBlink  av blinkarna: de dar effekten BEGAR kanalen hela episoden (utgangen intent) - ljusstyrkan, inte fargen,
 *               tande/slackte dioden. Det ar agarens "R lyser och B fladdrar till".
 *   alla3       andel tanda lamprutor dar alla tre dioderna lyser over tandpunkten (vitaktigt)
 *
 * Kontroll av instrumentet: --synt ton|kick skriver en konstant ton / ren kickloop (120 BPM) i stallet for en wav.
 */
import { readFileSync } from "node:fs";

const say = (...a) => process.stdout.write(a.join(" ") + "\n");
const args = process.argv.slice(2);
const flag = (k) => args.includes(k);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const QUIET = flag("--tyst");
const ON = Number(opt("--on", 16));
const SR = 48000, HOP = 128, EPOCH = 1700000000000, STEP_MS = 25;

// ---- ljud ----
let samples, path = args.find((a) => a.endsWith(".wav"));
const synt = opt("--synt", null);
if (synt) {
  const n = SR * 40; samples = new Float32Array(n);
  if (synt === "ton") for (let i = 0; i < n; i++) samples[i] = 0.18 * Math.sin(2 * Math.PI * 220 * i / SR);
  else {   // kick 120 BPM: 55 Hz-svep med snabb avklingning + klick
    const per = SR / 2;
    for (let i = 0; i < n; i++) { const t = (i % per) / SR; const f = 55 + 90 * Math.exp(-t * 40); samples[i] = 0.7 * Math.exp(-t * 14) * Math.sin(2 * Math.PI * f * t) + (t < 0.002 ? 0.3 : 0); }
  }
  path = `synt:${synt}`;
} else {
  if (!path) { say("ange en wav-fil eller --synt ton|kick"); process.exit(2); }
  const d = readFileSync(path);
  if (d.readUInt32LE(24) !== 48000 || d.readUInt16LE(34) !== 16 || d.readUInt16LE(22) !== 1) { say("kraver 48 kHz mono 16-bit"); process.exit(2); }
  // datablocket: leta 'data' (recorderns filer kan ha extra block)
  let p = 12, dataOff = 44, dataLen = d.length - 44;
  while (p + 8 <= d.length) { const id = d.toString("ascii", p, p + 4), sz = d.readUInt32LE(p + 4); if (id === "data") { dataOff = p + 8; dataLen = Math.min(sz, d.length - p - 8); break; } p += 8 + sz + (sz & 1); }
  const n = dataLen >> 1; samples = new Float32Array(n);
  for (let i = 0; i < n; i++) samples[i] = d.readInt16LE(dataOff + i * 2) / 32768;
  if (opt("--norm", null) !== null) {
    const blk = 4800, rms = [];
    for (let o = 0; o + blk <= n; o += blk) { let q = 0; for (let i = 0; i < blk; i++) q += samples[o + i] ** 2; const r = Math.sqrt(q / blk); if (r > 1e-4) rms.push(r); }
    rms.sort((a, b) => a - b); const g = rms.length ? Math.pow(10, Number(opt("--norm")) / 20) / rms[rms.length >> 1] : 1;
    for (let i = 0; i < n; i++) samples[i] = Math.max(-1, Math.min(1, samples[i] * g));
  }
}
// NIVASTEG (--steg "0,-6,-12,-6,0" [--stegS 15]): klippet loopat i nivasteg - visar om utsignalen gar fran botten till toppen
// nar SAMMA musik spelas tystare/starkare (det ar fragan "tacker den hela spannet"; ett 30 s-klipp ar mest slag-for-slag-variation).
const STEG = opt("--steg", null);
if (STEG) {
  const gs = STEG.split(",").map(Number), segN = Math.round(Number(opt("--stegS", 15)) * SR), out = new Float32Array(gs.length * segN);
  for (let k = 0; k < gs.length; k++) { const g = Math.pow(10, gs[k] / 20); for (let i = 0; i < segN; i++) out[k * segN + i] = samples[(k * segN + i) % samples.length] * g; }
  samples = out;
}
const startS = Number(opt("--start", 0)), maxS = Number(opt("--sek", 1e9));

const { Analyser } = await import("../dist/analyser.js");
const { EffectEngine } = await import("../dist/effects.js");
const { defaultConfig, fixtureRoles } = await import("../dist/config.js");
const { EFFECT_KEYS } = await import("../dist/effects/registry.js");
const { BoundaryDetector } = await import("../dist/boundaryDetector.js");

const cfg = JSON.parse(JSON.stringify(defaultConfig));
cfg.mode = "smart"; cfg.energyDrivesMode = true; cfg.beatPulse = true; cfg.master = 1; cfg.energyCeiling = true;
cfg.rotation = {}; for (const k of EFFECT_KEYS) cfg.rotation[k] = true;
for (const fx of cfg.fixtures) fx.cal = { off: 0, on: ON };   // LADANS tandpunkt (se huvudet)
const lamps = cfg.fixtures.map((fx) => {
  const roles = fixtureRoles(fx), base = (fx.address ?? 1) - 1;
  const at = (r) => { const i = roles.indexOf(r); return i < 0 ? -1 : base + i; };
  return { ch: [at("r"), at("g"), at("b")], dim: at("dim") };
});

const an = new Analyser(JSON.parse(JSON.stringify(defaultConfig)));
an.setGainLock(true, 1);
const bounds = new BoundaryDetector(() => Date.now());
an.setSpectrumSink((mag, binHz) => bounds.pushSpectrum(mag, binHz));
const boundsArg = { level: 0, bpm: 0, bpmConfidence: 0 };
let lastCharShift = 0, lastTempoShift = 0, lastBoundary = 0;
const t00 = EPOCH + startS * 1000;
Date.now = () => t00; performance.now = () => t00 - EPOCH;
if (process.env.DYN_HIST) globalThis.__chHist = [];
const eng = new EffectEngine(cfg);
console.log = () => {};

const E_CURVE = Math.max(0.3, Math.min(10, Number(process.env.DMX_E_CURVE ?? 10)));   // = motorns standard sedan 10-10
const T = [], LIT = [], DB = [], MD = [], ES = [], DIMP = [], LAMP = lamps.map(() => []), CH = lamps.map(() => [[], [], []]), INTENT = lamps.map(() => [[], [], []]);
const KICKT = [], BEATT = [], LOOK = [], BPMS = [], CONF = [];
let lastRender = -1, kickPending = false, lastBeatIdx = null;
const buf = new Float32Array(HOP);
const endSample = Math.min(samples.length, Math.floor((startS + maxS) * SR));
for (let off = Math.floor(startS * SR / HOP) * HOP; off + HOP <= endSample; off += HOP) {
  for (let i = 0; i < HOP; i++) buf[i] = samples[off + i];
  const tS = off / SR, ms = EPOCH + tS * 1000;
  an.setVirtualClock(ms); Date.now = () => ms; performance.now = () => ms - EPOCH;
  const fr = an.process(buf);
  boundsArg.level = fr.level; boundsArg.bpm = fr.bpm; boundsArg.bpmConfidence = fr.bpmConfidence;
  bounds.tick(boundsArg);
  if (bounds.charShiftCount !== lastCharShift) { lastCharShift = bounds.charShiftCount; eng.noteCharShift(); }
  if (bounds.tempoShiftCount !== lastTempoShift) { lastTempoShift = bounds.tempoShiftCount; eng.noteCharShift(`tempovaxling ${bounds.tempoShiftFrom}->${bounds.tempoShiftTo} BPM`); }
  if (bounds.boundaryCount !== lastBoundary) { lastBoundary = bounds.boundaryCount; if (process.env.DYN_GRANS_LOG) process.stderr.write(`GRANS ${(off / SR).toFixed(1)}
`); if (!process.env.DYN_INGEN_GRANS) { eng.softenRange(); an.hintTrackChange(5000); } }
  if (fr.bpm > 0) {
    cfg.beat = { anchorMs: fr.beatAnchorMs || ms, bpm: fr.bpm, confidence: fr.bpmConfidence };
    const per = 60000 / fr.bpm, idx = Math.floor((ms - cfg.beat.anchorMs) / per);
    if (lastBeatIdx !== null && idx !== lastBeatIdx) BEATT.push(cfg.beat.anchorMs + idx * per - EPOCH);
    lastBeatIdx = idx;
  }
  if (fr.kick) { kickPending = true; KICKT.push(ms - EPOCH); }
  if (ms - lastRender < STEP_MS && lastRender >= 0) continue;
  lastRender = ms;
  eng.render(fr);
  const u = eng.universe; if (!u) continue;
  let lit = 0;
  lamps.forEach((L, k) => {
    const v = L.ch.map((c) => u[c] ?? 0), dim = L.dim >= 0 ? (u[L.dim] ?? 0) / 255 : 1;
    const l = Math.max(...v) / 255 * dim; LAMP[k].push(l); lit += l;
    for (let c = 0; c < 3; c++) { CH[k][c].push(v[c]); INTENT[k][c].push(eng.out?.intent ? eng.out.intent[L.ch[c]] : 1); }
  });
  LOOK.push(eng.smartMode); BPMS.push(fr.bpm ?? 0); CONF.push(fr.bpmConfidence ?? 0); T.push(tS * 1000); LIT.push(lit / lamps.length);
  DB.push(20 * Math.log10(Math.max(1e-5, fr.levelVU ?? fr.level)));
  MD.push(Math.pow(eng.eSimple ?? 0, E_CURVE)); ES.push(eng.eSimple ?? 0);
  { let dm = 0, n = 0; for (const L of lamps) if (L.dim >= 0) { dm += (u[L.dim] ?? 0) / 255; n++; } DIMP.push(n ? dm / n : NaN); }
}

const pctl = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : NaN; };
const steg = (a) => Math.log2(Math.max(1 / 64, pctl(a, 0.9)) / Math.max(1 / 64, pctl(a, 0.1)));
const envel = (a) => { const n = 1000 / STEP_MS, o = []; for (let i = 0; i + n <= a.length; i += n) { let s = 0; for (let k = 0; k < n; k++) s += a[i + k]; o.push(s / n); } return o; };
const pear = (a, b) => { const n = Math.min(a.length, b.length); if (n < 5) return NaN; let sa = 0, sb = 0; for (let i = 0; i < n; i++) { sa += a[i]; sb += b[i]; } const ma = sa / n, mb = sb / n; let x = 0, da = 0, db = 0; for (let i = 0; i < n; i++) { const p = a[i] - ma, q = b[i] - mb; x += p * q; da += p * p; db += q * q; } return da > 0 && db > 0 ? x / Math.sqrt(da * db) : NaN; };

const eL = envel(LIT), eD = envel(DB);
const qs = [...eD].sort((a, b) => a - b), q1 = qs[Math.floor(qs.length * 0.25)], q3 = qs[Math.floor(qs.length * 0.75)];
const mean = (a) => a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN;
const loL = mean(eL.filter((_, i) => eD[i] <= q1)), hiL = mean(eL.filter((_, i) => eD[i] >= q3));

// slag = grid + kick, sorterat
const SLAG = [...KICKT, ...BEATT].sort((a, b) => a - b);
const slagIn = (a, b) => { let lo = 0, hi = SLAG.length; while (lo < hi) { const m = (lo + hi) >> 1; if (SLAG[m] < a) lo = m + 1; else hi = m; } return lo < SLAG.length && SLAG[lo] <= b; };
const minutes = (T.length * STEP_MS) / 60000;
let fladder = 0, pulsar = 0; const flLook = {};
for (const S of LAMP) {
  // zigzag med 5 %-hysteres
  const ext = []; let dir = 0, cand = 0;
  for (let i = 1; i < S.length; i++) {
    if (dir >= 0) { if (S[i] > S[cand]) cand = i; else if (S[cand] - S[i] >= 0.05) { ext.push({ i: cand, top: true }); dir = -1; cand = i; } }
    if (dir < 0) { if (S[i] < S[cand]) cand = i; else if (S[i] - S[cand] >= 0.05) { ext.push({ i: cand, top: false }); dir = 1; cand = i; } }
  }
  for (let k = 1; k < ext.length; k++) {
    const a = T[ext[k - 1].i], b = T[ext[k].i];
    if (!ext[k - 1].top && slagIn(a - 60, a + 60)) pulsar++;       // uppgang som startar pa en kick/slag
    // FLADDER = en BLIPP: bada benen kring extremet (in och ut) gar pa < 150 ms och inget slag ligger i spannet.
    // En snabb uppgang foljd av ett langsamt fall ar en puls/attack, inte fladder.
    if (k + 1 >= ext.length) continue;
    const c2 = T[ext[k + 1].i];
    if (b - a < 150 && c2 - b < 150 && !slagIn(a - 60, c2 + 60)) {
      if (process.env.DYN_DBG && fladder < 6) { const i0 = ext[k - 1].i - 2; process.stderr.write(`fl ${LOOK[ext[k].i]} t ${(a / 1000).toFixed(2)} ${S.slice(i0, i0 + 12).map((x) => x.toFixed(2)).join(" ")}
`); }
      fladder++; const lk = LOOK[ext[k].i]; flLook[lk] = (flLook[lk] ?? 0) + 1;
    }
  }
}
// R/G/B: kanal tand = DMX > ON, lampan tand = nagon kanal > ON
let vaxl = 0, blink = 0, ofriv = 0; const blinkLook = {};
for (const [li, L] of CH.entries()) for (let c = 0; c < 3; c++) {
  let state = null, since = 0; const I = INTENT[li][c];
  for (let i = 0; i < L[c].length; i++) {
    const lampOn = L[0][i] > ON || L[1][i] > ON || L[2][i] > ON;
    if (!lampOn) { state = null; continue; }
    const s = L[c][i] > ON;
    if (state !== null && s !== state) { vaxl++; if ((i - since) * STEP_MS < 300) { blinkLook[LOOK[i]] = (blinkLook[LOOK[i]] ?? 0) + 1; let held = true; for (let q = Math.max(0, since - 1); q <= i; q++) if (!I[q]) { held = false; break; } if (held) ofriv++; if (process.env.DYN_BLINK && blink < 12) process.stderr.write(`blink ${LOOK[i]} k${c} t ${(T[i] / 1000).toFixed(2)} ${[0, 1, 2].map((q) => L[q].slice(i - 6, i + 3).join(',')).join(' | ')}
`); blink++; } since = i; }
    else if (state === null) since = i;
    state = s;
  }
}
// ALLA3 med tandpunkten: andel tanda lamprutor dar alla tre dioderna verkligen lyser (> ON) = vitaktigt
let a3 = 0, litN = 0;
for (const L of CH) for (let i = 0; i < L[0].length; i++) { const n = (L[0][i] > ON) + (L[1][i] > ON) + (L[2][i] > ON); if (n) { litN++; if (n === 3) a3++; } }
const nl = lamps.length; if (globalThis.__chHist) process.stderr.write("hist " + JSON.stringify(globalThis.__chHist) + "\n");
// SPANNET IN -> UT (agaren i ladan 10-09: "tacker den hela spannet med insignalen mot utsignalen, 1-95 %"):
// ingangens dB i tiondelar (klippets egna p0..p100) -> medel av e (energins fonster 0..1), md (dampningen) och DIM (% av 255)
const spann = (() => {
  const idx = DB.map((d, i) => i).filter((i) => Number.isFinite(DB[i]) && DB[i] > -80).sort((a, b) => DB[a] - DB[b]);
  const dec = []; for (let q = 0; q < 10; q++) { const sl = idx.slice(Math.floor(q * idx.length / 10), Math.floor((q + 1) * idx.length / 10)); const m = (A) => sl.reduce((s2, i) => s2 + A[i], 0) / Math.max(1, sl.length); dec.push({ db: +m(DB).toFixed(1), e: +m(ES).toFixed(2), md: +m(MD).toFixed(2), dim: +(100 * m(DIMP)).toFixed(0), lit: +(100 * m(LIT)).toFixed(0) }); }
  return { dec, eP: [pctl(ES, .01), pctl(ES, .5), pctl(ES, .99)].map((x) => +x.toFixed(2)), dimP: [pctl(DIMP, .01), pctl(DIMP, .5), pctl(DIMP, .99)].map((x) => +(100 * x).toFixed(0)) };
})();
const stegUt = STEG ? (() => { const gs = STEG.split(","), segS = Number(opt("--stegS", 15)), per = segS * 1000 / STEP_MS; return gs.map((g, k) => {
  const a = Math.floor(k * per + per / 2), b = Math.floor((k + 1) * per);   // andra halvan av steget (fonstret hinner stalla in sig)
  const m = (A) => { let s2 = 0, n = 0; for (let i = a; i < b && i < A.length; i++) { s2 += A[i]; n++; } return n ? s2 / n : NaN; };
  return { dB: +g, inDb: +m(DB).toFixed(1), e: +m(ES).toFixed(2), md: +m(MD).toFixed(2), dim: +(100 * m(DIMP)).toFixed(0), lit: +(100 * m(LIT)).toFixed(0) }; }); })() : undefined;
const mdBins = (() => { const m = envel(MD), l = envel(LIT), dm = envel(DIMP); const ix = m.map((_, i) => i).sort((a, b) => m[a] - m[b]); const out = [];
  for (let q = 0; q < 5; q++) { const sl = ix.slice(Math.floor(q * ix.length / 5), Math.floor((q + 1) * ix.length / 5)); const av = (A) => sl.reduce((s2, i) => s2 + A[i], 0) / Math.max(1, sl.length); out.push([+av(m).toFixed(2), +(100 * av(l)).toFixed(1), +(100 * av(dm)).toFixed(0)]); } return out; })();
// TANDA LAMPORS STYRKA (agaren 10-09: "dom far garna slackas om effekten vill det") - medel over lamprutor som lyser (> 2 %)
const litOn = (() => { const v = []; for (const S of LAMP) for (const x of S) if (x > 0.02) v.push(x); return [pctl(v, .1), pctl(v, .5), pctl(v, .9)].map((x) => +(100 * x).toFixed(0)); })();
const litOnFull = (() => { const v = []; for (const S of LAMP) for (const x of S) if (x > 0.005) v.push(x); return [.01, .05, .25, .5, .75, .95, .99, 1].map((q) => +(100 * pctl(v, q)).toFixed(1)); })();
// TANDNING EFTER SLACKT (agaren 10-09: "fran att lamporna slacks tar det lite tid innan de kommer igang, kanns inte synkat"): per lampa,
// nar effekten BEGAR ljus igen (intent pa nagon fargkanal) efter >= 300 ms slackt (lampan < 2 %), ms tills lampan nar 90 % av sin topp
// inom 500 ms. Median och p90.
const tand = (() => { const ds = [];
  lamps.forEach((L, k) => { const S = LAMP[k]; let dark = 0;
    for (let i = 1; i < S.length - 20; i++) {
      const want = INTENT[k][0][i] || INTENT[k][1][i] || INTENT[k][2][i];
      if (S[i] < 0.02 && !want) { dark++; continue; }
      if (want && dark * STEP_MS >= 300 && S[i - 1] < 0.02) {
        let mx = 0; for (let j = i; j < i + 20; j++) mx = Math.max(mx, S[j]);
        if (mx > 0.05) { let j = i; while (S[j] < 0.9 * mx) j++; ds.push((j - i) * STEP_MS); }
      }
      dark = 0;
    } });
  ds.sort((a, b) => a - b); return { n: ds.length, medMs: ds[ds.length >> 1] ?? NaN, p90Ms: ds[Math.floor(ds.length * 0.9)] ?? NaN }; })();
// ATERKOMST EFTER MORKER (rigg-niva): riggen < 3 % i >= 300 ms, sedan stiger ingangen >= 6 dB over morkrets niva -> ms tills riggen
// nar 50 % av sin topp inom 1,5 s.
const aterkomst = (() => { const ds = []; let dark = 0, darkDb = 0;
  for (let i = 1; i < LIT.length - 60; i++) {
    if (LIT[i] < 0.03) { if (dark === 0) darkDb = DB[i]; dark++; darkDb = Math.min(darkDb, DB[i]); continue; }
    if (dark * STEP_MS >= 300) {
      let a = i - dark; while (a < i && DB[a] < darkDb + 6) a++;   // ljudet tillbaka
      let mx = 0; for (let j = a; j < a + 60; j++) mx = Math.max(mx, LIT[j]);
      if (mx > 0.06) { let j = a; while (LIT[j] < 0.5 * mx) j++; ds.push((j - a) * STEP_MS); }
    }
    dark = 0;
  }
  ds.sort((x, y) => x - y); return { n: ds.length, ms: ds }; })();
const res = {
  wav: path, sek: Math.round(T.length * STEP_MS / 1000), on: ON,
  levande: { mdSteg: +steg(MD).toFixed(2), mdSteg1s: +steg(envel(MD)).toFixed(2), rMdLjus: +pear(envel(MD).map((x) => Math.log2(Math.max(1 / 64, x))), envel(LIT).map((x) => Math.log2(Math.max(1 / 256, x)))).toFixed(2), rMdDim: +pear(envel(MD), envel(DIMP)).toFixed(2), ljusSteg: +steg(eL).toFixed(2), rDb: +pear(eL, eD).toFixed(3), kontrast: +(hiL / Math.max(1e-3, loL)).toFixed(2),
    dbSpann: +(pctl(DB, 0.9) - pctl(DB, 0.1)).toFixed(1), litP10: +pctl(LIT, .1).toFixed(3), litP50: +pctl(LIT, .5).toFixed(3), litP90: +pctl(LIT, .9).toFixed(3) },
  fladder: { fladderMin: +(fladder / nl / minutes).toFixed(1), pulsPerKick: +(pulsar / nl / Math.max(1, KICKT.length)).toFixed(2), kickarMin: +(KICKT.length / minutes).toFixed(0), perLook: flLook },
  spann, stegUt, mdBins, litOn, litOnFull, tand, aterkomst,
  rgb: { sidoVaxlMin: +(vaxl / nl / minutes).toFixed(1), sidoBlinkMin: +(blink / nl / minutes).toFixed(1), alla3: +(a3 / Math.max(1, litN)).toFixed(3), ofrivBlinkMin: +(ofriv / nl / minutes).toFixed(1), blinkLook },
};
if (opt("--kurva", null)) { const [a, b] = opt("--kurva").split("-").map(Number); for (let i = 0; i < T.length; i++) if (T[i] >= a * 1000 && T[i] <= b * 1000 && i % 2 === 0) process.stderr.write(`${(T[i] / 1000).toFixed(2)} in ${DB[i].toFixed(0)} dB  e ${ES[i].toFixed(2)} md ${MD[i].toFixed(2)} dim ${(100 * DIMP[i]).toFixed(0)}  bpm ${BPMS[i].toFixed(0)} konf ${CONF[i].toFixed(2)} rigg ${(100 * LIT[i]).toFixed(0)}% lampor ${LAMP.map((S2) => (100 * S2[i]).toFixed(0)).join('/')} ${LOOK[i]}
`); }
say(QUIET ? JSON.stringify(res) : JSON.stringify(res, null, 1));
