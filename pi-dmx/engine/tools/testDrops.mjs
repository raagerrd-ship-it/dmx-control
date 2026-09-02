/**
 * MÄTBÄNK FÖR DROP-GRINDARNA (bara mätning — analyser.ts rörs inte).
 *
 * Syntetiska spår med KÄNDA drop-tider (facit) körs genom den riktiga
 * analysatorn. bodyOnset räknas fram HÄR ur frame.spec.sub/kick/bass med
 * exakt samma formler som i analyser.ts, så alla grind-kombinationer kan
 * mätas utan att röra motorn. Seedat mulberry32-brus, åtta fasta seeder.
 */
const { Analyser } = await import("../dist/analyser.js");
const { defaultConfig } = await import("../dist/config.js");
const RATE = 48000, HOP = 128;
const SEEDS = process.env.SEEDS ? +process.env.SEEDS : 8;
const TOL = 2.0;          // träff = inom ±2 s från facit

let rngState = 0x9e3779b9;
const noise = () => {
  rngState = (rngState + 0x6d2b79f5) | 0;
  let x = rngState;
  x = Math.imul(x ^ (x >>> 15), 1 | x);
  x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
  return (((x ^ (x >>> 14)) >>> 0) / 4294967296) * 2 - 1;
};
const resetNoise = (s) => { rngState = s | 0; };

const kick = (tt, beat, d = 25) => Math.exp(-((tt % beat) / beat) * beat * d) * Math.sin(2 * Math.PI * 58 * tt);
const hat = (tt, beat) => Math.exp(-((tt % (beat / 2)) / (beat / 2)) * beat * 80) * noise();

/** Ett spår = lista av sektioner {dur, body (0..1 bas-kropp), riser (0..1), lead}. */
function build(sections, bpm) {
  const b = 60 / bpm;
  const cuts = []; let acc = 0;
  for (const s of sections) { cuts.push({ ...s, t0: acc, t1: acc + s.dur }); acc += s.dur; }
  const dur = acc;
  const drops = [];
  for (let i = 1; i < cuts.length; i++) if (cuts[i].drop) drops.push(cuts[i].t0);
  const gen = (tt) => {
    let s = cuts[cuts.length - 1];
    for (const c of cuts) if (tt >= c.t0 && tt < c.t1) { s = c; break; }
    const p = s.dur > 0 ? (tt - s.t0) / s.dur : 0;
    const body = s.body + (s.bodyTo === undefined ? 0 : (s.bodyTo - s.body) * p);
    const riser = (s.riser || 0) * (s.riserRamp ? p : 1);
    return body * (0.75 * kick(tt, b) + 0.3 * hat(tt, b))
      + (s.lead || 0) * Math.sin(2 * Math.PI * 300 * tt) * (0.7 + 0.3 * Math.sin(tt * 1.7))
      // riser: brus-sweep som klättrar i spektrum + stigande nivå
      + riser * (0.5 * noise() * (0.4 + 0.6 * p) + 0.4 * Math.sin(2 * Math.PI * (400 + 2600 * p) * tt))
      + 0.02 * noise();
  };
  return { gen, dur, drops, bpm };
}

const TRACKS = {
  // klassisk breakdown → riser → drop, tre gånger
  "klassisk 128": build([
    { dur: 8, body: 0.9, lead: 0.2 },
    { dur: 10, body: 0.05, lead: 0.5 },
    { dur: 6, body: 0.05, lead: 0.4, riser: 1, riserRamp: 1 },
    { dur: 14, body: 1.0, lead: 0.2, drop: 1 },
    { dur: 9, body: 0.05, lead: 0.5 },
    { dur: 5, body: 0.1, lead: 0.4, riser: 1, riserRamp: 1 },
    { dur: 14, body: 1.0, lead: 0.2, drop: 1 },
    { dur: 9, body: 0.08, lead: 0.5 },
    { dur: 5, body: 0.1, riser: 1, riserRamp: 1 },
    { dur: 12, body: 1.0, lead: 0.2, drop: 1 },
  ], 128),
  // modern uppbyggnad: ingen total svacka, DELVIS nedgång + riser rakt in i dropen
  "modern 150": build([
    { dur: 8, body: 0.9, lead: 0.2 },
    { dur: 8, body: 0.35, lead: 0.5 },
    { dur: 6, body: 0.35, bodyTo: 0.55, lead: 0.4, riser: 1, riserRamp: 1 },
    { dur: 14, body: 1.0, lead: 0.2, drop: 1 },
    { dur: 8, body: 0.4, lead: 0.5 },
    { dur: 6, body: 0.4, bodyTo: 0.6, riser: 1, riserRamp: 1 },
    { dur: 14, body: 1.0, lead: 0.2, drop: 1 },
    { dur: 8, body: 0.3, lead: 0.5 },
    { dur: 5, body: 0.3, riser: 1, riserRamp: 1 },
    { dur: 12, body: 1.0, drop: 1 },
  ], 150),
  // LÅGENERGI-fällor: småvariationer i tysta partier ska INTE bli drops
  "lugn 110": build([
    { dur: 10, body: 0.25, lead: 0.5 },
    { dur: 6, body: 0.05, lead: 0.5 },
    { dur: 8, body: 0.3, lead: 0.5 },            // liten upphämtning, ingen drop
    { dur: 6, body: 0.08, lead: 0.5 },
    { dur: 8, body: 0.28, lead: 0.5 },           // liten upphämtning, ingen drop
    { dur: 6, body: 0.05, lead: 0.4, riser: 0.6, riserRamp: 1 },
    { dur: 14, body: 1.0, lead: 0.2, drop: 1 },  // äkta drop
    { dur: 8, body: 0.9, lead: 0.2 },
  ], 110),
  // brusigt rum + två drops utan riser (bara svacka)
  "brusigt 136": build([
    { dur: 8, body: 0.8, lead: 0.3 },
    { dur: 10, body: 0.05, lead: 0.4 },
    { dur: 14, body: 1.0, lead: 0.2, drop: 1 },
    { dur: 10, body: 0.06, lead: 0.4 },
    { dur: 14, body: 1.0, lead: 0.2, drop: 1 },
  ], 136),
};

const COMBOS = [
  { riser: 0, energy: 0, window: 0 },
  { riser: 1, energy: 0, window: 0 },
  { riser: 0, energy: 1, window: 0 },
  { riser: 0, energy: 0, window: 1 },
  { riser: 1, energy: 1, window: 0 },
  { riser: 1, energy: 0, window: 1 },
  { riser: 0, energy: 1, window: 1 },
  { riser: 1, energy: 1, window: 1 },
];

/** Kör ett spår en gång och returnera per-hop-signaler + kandidatflanker. */
function run(track, seed) {
  resetNoise(seed);
  const an = new Analyser(JSON.parse(JSON.stringify(defaultConfig)));
  an.setGainLock(true, 1);
  const buf = new Float32Array(HOP);
  const hops = Math.floor(track.dur * RATE / HOP);
  const dtHop = HOP / RATE;
  // samma tillstånd som analyser.ts håller för baskroppen
  let bodyEnv = -120, bodyFast = -120, bodyCeil = -300, bodyGoneMs = 0, lastBodyGoneMs = -1e9;
  const HL = 512, hist = new Float32Array(HL); let hp = 0, hl = 0;
  let lastRiserMs = -1e9;
  const cands = [], buildUps = [];
  const riseLog = [], ratioLog = [], bodyLog = [];
  let riserHops = 0, tot = 0;
  let t = 0;
  for (let hop = 0; hop < hops; hop++) {
    for (let i = 0; i < HOP; i++, t++) buf[i] = track.gen(t / RATE);
    const ms = hop * HOP / RATE * 1000;
    an.setVirtualClock(ms);
    const f = an.process(buf);
    // OBEHANDLAD kropp — f.spec ar AGC:ad och raderar bassprnget (se f.bodyDb).
    const bodyNow = f.bodyDb;
    bodyEnv += (bodyNow - bodyEnv) * Math.min(1, dtHop / 0.35);
    bodyFast += (bodyNow - bodyFast) * Math.min(1, dtHop / 0.12);
    // TAKET SJUNKER I dB/s — inte i procent. Kvoter pa en logskala betyder inget.
    bodyCeil = Math.max(bodyEnv, bodyCeil - dtHop * (+process.env.CEIL_DB_S || 0.5));
    if (bodyEnv < bodyCeil - (+process.env.GONE_DB || 3)    /* = BODY_GONE_DB i analyser.ts */) { bodyGoneMs += dtHop * 1000; if (bodyGoneMs >= 2000) lastBodyGoneMs = ms; }
    else bodyGoneMs = 0;
    const oldest = hist[(hp + HL - hl) % HL];
    const bodyRise = bodyFast - oldest;
    hist[hp] = bodyFast; hp = (hp + 1) % HL;
    const want = Math.min(HL - 1, Math.max(1, Math.round(0.5 / dtHop)));
    if (hl < want) hl++;
    const bodyOnset = bodyRise > (+process.env.RISE_DB || 16)   /* = BODY_RISE_DB i analyser.ts */ && ms - lastBodyGoneMs < 6000;
    if (ms > 2000) { riseLog.push([ms/1000, bodyRise]); ratioLog.push([ms/1000, bodyCeil - bodyEnv]); bodyLog.push(bodyNow); }
    if (f.inRiser) lastRiserMs = ms;
    if (ms > 2000) { tot++; if (f.inRiser) riserHops++; buildUps.push(f.buildUp); }
    if (bodyOnset && ms > 2000) cands.push({
      t: ms / 1000, bpm: f.bpm, intensity: f.intensity, buildUp: f.buildUp,
      sinceGone: ms - lastBodyGoneMs, sinceRiser: ms - lastRiserMs,
    });
  }
  // PROB: hur stort ar bassprnget VID de kanda droparna, och hur djup ar svackan fore?
  const atDrop = [], gonePre = [];
  for (const d of track.drops) {
    let mx = -9; for (const [tt, v] of riseLog) if (tt > d - 2 && tt < d + 2 && v > mx) mx = v;
    if (mx > -9) atDrop.push(mx);
    let mn = -999; for (const [tt, v] of ratioLog) if (tt > d - 8 && tt < d && v > mn) mn = v;
    if (mn > -999) gonePre.push(mn);
  }
  const allRise = riseLog.map(r => r[1]);
  return { cands, buildUps, riserPct: 100 * riserHops / tot, atDrop, gonePre, allRise, bodyLog };
}

/** Applicera grindar + refraktärperiod på kandidatflankerna → fyrade drops. */
function fire(cands, g) {
  const out = []; let lastMs = -1e9;
  for (const c of cands) {
    const ms = c.t * 1000;
    const minGap = c.bpm > 40 ? (32 * 60000 / c.bpm) : 13000;
    if (ms - lastMs <= minGap) continue;
    if (g.riser && !(c.buildUp > 0.35)) continue;
    if (g.energy && !(c.intensity > 0.45)) continue;
    if (g.window && !(c.sinceGone < 3500 || c.sinceRiser < 4000)) continue;
    out.push(c.t); lastMs = ms;
  }
  return out;
}

const pct = (a, q) => { const b = a.slice().sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(q * b.length))]; };
const med = (a) => { const b = a.slice().sort((x, y) => x - y); const n = b.length; return n % 2 ? b[(n - 1) / 2] : (b[n / 2 - 1] + b[n / 2]) / 2; };

// ── kör ────────────────────────────────────────────────────────────────
const runs = [];
let refPoints = 0;
for (const [name, tr] of Object.entries(TRACKS)) {
  refPoints += tr.drops.length;
  for (let s = 0; s < SEEDS; s++) runs.push({ name, tr, r: run(tr, 0x9e3779b9 + s * 0x85ebca6b) });
}
console.log(`facit: ${refPoints} referenspunkter x ${SEEDS} seeder = ${refPoints * SEEDS} drops, tolerans ±${TOL}s\n`);

// UPPGIFT 1 — riser-signalen
console.log("RISER-SIGNALEN (novelty-baserad novRiser, mätt efter 2 s):");
for (const [name] of Object.entries(TRACKS)) {
  const rs = runs.filter(x => x.name === name).map(x => x.r);
  const all = rs.flatMap(x => x.buildUps);
  console.log("  " + name.padEnd(14),
    "inRiser", med(rs.map(x => x.riserPct)).toFixed(1).padStart(5) + "%",
    " buildUp p50", pct(all, 0.5).toFixed(2), "p90", pct(all, 0.9).toFixed(2), "p99", pct(all, 0.99).toFixed(2), "max", all.reduce((a,x)=>x>a?x:a,0).toFixed(2));
}
const allB = runs.flatMap(x => x.r.buildUps);
console.log("  TOTALT        ", "inRiser", med(runs.map(x => x.r.riserPct)).toFixed(1).padStart(5) + "%",
  " buildUp p50", pct(allB, 0.5).toFixed(2), "p90", pct(allB, 0.9).toFixed(2), "p99", pct(allB, 0.99).toFixed(2), "max", allB.reduce((a,x)=>x>a?x:a,0).toFixed(2), "\n");

// UPPGIFT 2 — grind-kombinationer
console.log("GRIND-KOMBINATIONER (r=riser>0.35, e=intensity>0.45, w=svack/riser-fönster):");
for (const g of COMBOS) {
  let tp = 0, fp = 0, fn = 0;
  const perTrack = {};
  for (const { name, tr, r } of runs) {
    const fired = fire(r.cands, g);
    const used = new Set();
    let ltp = 0;
    for (const d of tr.drops) {
      const i = fired.findIndex((f, ix) => !used.has(ix) && Math.abs(f - d) <= TOL);
      if (i >= 0) { used.add(i); ltp++; } else fn++;
    }
    tp += ltp; fp += fired.length - used.size;
    (perTrack[name] ||= []).push([ltp, tr.drops.length, fired.length - used.size]);
  }
  const prec = tp + fp ? 100 * tp / (tp + fp) : 0;
  const rec = 100 * tp / (tp + fn);
  const tag = (g.riser ? "r" : "-") + (g.energy ? "e" : "-") + (g.window ? "w" : "-");
  console.log(" ", tag, "precision", prec.toFixed(0).padStart(3) + "%",
    "recall", rec.toFixed(0).padStart(3) + "%",
    "F1", (2 * prec * rec / (prec + rec || 1)).toFixed(0).padStart(3),
    " tp", String(tp).padStart(3), "fp", String(fp).padStart(3), "fn", String(fn).padStart(3),
    " | " + Object.entries(perTrack).map(([n, v]) =>
      `${n.split(" ")[0]} ${v.reduce((a, x) => a + x[0], 0)}/${v.reduce((a, x) => a + x[1], 0)}+${v.reduce((a, x) => a + x[2], 0)}fp`).join("  "));
}

// ── FORDELNINGSPROB ── kor om med PROBE=1. Den kor HELA korpusen en gang till,
// sa den ar avstangd som standard: den fordubblar bankens tid utan att paverka
// precision/recall-raden ovan. Anvands nar en TROSKEL ska valjas ur matning.
if (process.env.PROBE) {
  const pc = (a, p) => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
  const AD = [], GP = [], AR = [], BL = [];
  for (const name of Object.keys(TRACKS)) for (let s = 0; s < SEEDS; s++) {
    const r = run(TRACKS[name], 1000 + s * 7919);
    AD.push(...r.atDrop); GP.push(...r.gonePre); AR.push(...r.allRise); BL.push(...r.bodyLog);
  }
  console.log("");
  console.log("FORDELNING (bodyDb-kropp):");
  console.log(`  bodyRise VID facit-drop   p10 ${pc(AD,.1).toFixed(3)}  p50 ${pc(AD,.5).toFixed(3)}  p90 ${pc(AD,.9).toFixed(3)}   (n=${AD.length})`);
  console.log(`  bodyRise OVERALLT         p50 ${pc(AR,.5).toFixed(3)}  p90 ${pc(AR,.9).toFixed(3)}  p99 ${pc(AR,.99).toFixed(3)}`);
  console.log(`  RA KROPP bodyDb          p05 ${pc(BL,.05).toFixed(3)}  p50 ${pc(BL,.5).toFixed(3)}  p95 ${pc(BL,.95).toFixed(3)}`);
  console.log(`  DJUPASTE dB UNDER TAK fore drop p10 ${pc(GP,.1).toFixed(1)}  p50 ${pc(GP,.5).toFixed(1)}  p90 ${pc(GP,.9).toFixed(1)}`);
  console.log(`  (gammal rad) p10 ${pc(GP,.1).toFixed(3)}  p50 ${pc(GP,.5).toFixed(3)}  p90 ${pc(GP,.9).toFixed(3)}`);
}
