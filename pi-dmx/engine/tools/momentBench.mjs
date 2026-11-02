/**
 * BRÖLLOPSLÄGETS BEVIS (natt-todo 2026-11-01 steg 5, byggt 11-02). Spelar en inspelning genom riktiga analysatorn + motorn (beatFeed som
 * live, virtuell klocka, render var 5 ms som på Pi:n) med cfg.moment = varje stund och mäter i DMX (efter alla tre stegen):
 *   takt     R² av riggens ljus vikt på taktens fas (4 slag x 4 fack i 16-slagsblock, som effectDyn) - ~0 = följer inte takten
 *   kick     korrelation mellan riggens ljus och analysatorns kick-anslag (onset.kick) - ~0 = följer inte kicken
 *   fall     snabbaste fall per lampa i DMX-steg/s (p99,9 och max) - jämförs mot festen (uttoningen 0,25 s)
 *   strobe   rutor där någon lampas strobe-kanal (rgb7 kanal 5) är > 0
 *   underTp  tända lamp-rutor under tändpunkten+1 (bänken sätter cal.on 16 på alla lampor, ladans standard)
 *   niva     median ljusaste lampa / 255
 * Plus ett manus med övergångar och tystnad: fest 30 s -> middag 30 -> tal 20 (med 10 s helt tyst ingång) -> forstadans 30 -> tartan 25
 * -> fest 20: snabbaste fall genom övergångarna och lägsta ljus under tystnaden i talet.
 *   node tools/momentBench.mjs <wav> [--start 60] [--sek 150]
 */
import { readFileSync } from "node:fs";
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const path = args.find((a) => a.endsWith(".wav"));
const startS = Number(opt("--start", 60)), maxS = Number(opt("--sek", 150));
const { Analyser } = await import("../dist/analyser.js");
const { EffectEngine } = await import("../dist/effects.js");
const { BeatFeed } = await import("../dist/beatFeed.js");
const { defaultConfig, fixtureRoles } = await import("../dist/config.js");
const d = readFileSync(path); const nSamples = (d.length - 44) >> 1;
const SR = 48000, HOP = 128, EPOCH = 1700000000000, STEP_MS = 5;
console.log = () => {};
const out = (s) => process.stdout.write(s + "\n");
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : 0; };
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : 0; };

// manus: [stund, sekunder, tyst?]
const SCRIPT = [["fest", 30], ["middag", 30], ["tal", 10], ["tal", 10, true], ["forstadans", 30], ["tartan", 25], ["fest", 20]];

function run(momentOf) {
  const t00 = EPOCH + startS * 1000; Date.now = () => t00; performance.now = () => t00 - EPOCH;
  const cfg = JSON.parse(JSON.stringify(defaultConfig)); cfg.master = 1;
  for (const fx of cfg.fixtures) fx.cal = { on: 16 };
  const an = new Analyser(BeatFeed.analyserCfg(cfg)); an.setGainLock(true, 1);   // som index.ts (TVÅ RUTNÄT)
  const feed = new BeatFeed();
  const eng = new EffectEngine(cfg);
  const lamps = cfg.fixtures.map((fx) => { const roles = fixtureRoles(fx), base = fx.address - 1; const at = (r) => { const i = roles.indexOf(r); return i < 0 ? -1 : base + i; }; return { r: at("r"), g: at("g"), b: at("b"), s: at("strobe"), on: fx.cal.on }; });
  const buf = new Float32Array(HOP); let lastRender = -1, prevMo = "fest";
  const R = [];
  const end = Math.min(nSamples, Math.floor((startS + maxS) * SR));
  for (let off = Math.floor(startS * SR / HOP) * HOP; off + HOP <= end; off += HOP) {
    const tRel = off / SR - startS, mo = momentOf(tRel);
    for (let i = 0; i < HOP; i++) buf[i] = mo.silent ? 0 : d.readInt16LE(44 + (off + i) * 2) / 32768;
    const ms = EPOCH + off / SR * 1000; an.setVirtualClock(ms); Date.now = () => ms; performance.now = () => ms - EPOCH;
    const fr = an.process(buf); feed.update(fr, cfg, an);
    if (ms - lastRender < STEP_MS && lastRender >= 0) continue;
    lastRender = ms;
    if (mo.m !== prevMo) { cfg.moment = mo.m; prevMo = mo.m; }   // knapptryck bara vid byte (tårtan går tillbaka själv efter 20 s)
    const u = eng.render(fr);
    const v = lamps.map((l) => Math.max(u[l.r], u[l.g], u[l.b]));
    const strobe = lamps.some((l) => l.s >= 0 && u[l.s] > 0);
    const under = lamps.filter((l, k) => v[k] > 0 && v[k] < l.on + 1).length;
    const bp = cfg.beat && cfg.beat.bpm > 0 ? (ms - cfg.beat.anchorMs) / (60000 / cfg.beat.bpm) : NaN;
    R.push({ t: tRel, m: mo.m, mm: cfg.moment ?? "fest", v, strobe, under, bp, kick: fr.onset?.kick ?? 0, warm: tRel >= 15 });
  }
  return R;
}

function measure(R) {
  R = R.filter((r) => r.warm);
  const tot = R.map((r) => r.v.reduce((a, b) => a + b, 0));
  // takt (som effectDyn, på riggens summa)
  const blocks = new Map(), R2 = [];
  R.forEach((r, i) => { if (!Number.isFinite(r.bp)) return; const bi = Math.floor(r.bp), key = Math.floor(bi / 16);
    const bin = (((bi % 4) + 4) % 4) * 4 + Math.min(3, Math.floor((r.bp - bi) * 4));
    let B = blocks.get(key); if (!B) blocks.set(key, B = { s: new Float64Array(16), n: new Float64Array(16), all: [] }); B.s[bin] += tot[i]; B.n[bin]++; B.all.push(tot[i]); });
  for (const B of blocks.values()) { if (B.all.length < 600) continue; const m = B.all.reduce((a, b) => a + b, 0) / B.all.length; if (m < 10) continue;
    let vt = 0; for (const x of B.all) vt += (x - m) ** 2; vt /= B.all.length; if (vt < 25) { R2.push(0); continue; }
    let vb = 0; for (let j = 0; j < 16; j++) if (B.n[j]) vb += B.n[j] * (B.s[j] / B.n[j] - m) ** 2; vb /= B.all.length; R2.push(vb / vt); }
  // kick-korrelation
  const k = R.map((r) => r.kick), mk = k.reduce((a, b) => a + b, 0) / k.length, mt = tot.reduce((a, b) => a + b, 0) / tot.length;
  let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < k.length; i++) { const x = k[i] - mk, y = tot[i] - mt; sxy += x * y; sxx += x * x; syy += y * y; }
  const corr = sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : 0;
  // fall (DMX-steg per sekund, per lampa)
  const F = []; for (let i = 1; i < R.length; i++) for (let l = 0; l < R[i].v.length; l++) { const df = R[i - 1].v[l] - R[i].v[l]; if (df > 0) F.push(df * 1000 / STEP_MS); }
  return { takt: +med(R2).toFixed(2), kick: +corr.toFixed(2), fallP999: Math.round(pct(F, 0.999)), fallMax: Math.round(Math.max(0, ...F)),
    strobe: R.filter((r) => r.strobe).length, underTp: R.reduce((a, r) => a + r.under, 0), niva: +(med(R.map((r) => Math.max(...r.v))) / 255).toFixed(2), n: R.length };
}

out(`momentBench ${path} start ${startS} s, ${maxS} s, render ${STEP_MS} ms`);
for (const m of ["fest", "middag", "tal", "forstadans", "tartan"]) {
  const r = measure(run(() => ({ m })).filter((x) => x.mm === m));   // tårtan: bara de 20 s den håller
  out(`${m.padEnd(11)} takt ${r.takt.toFixed(2)}  kick ${r.kick.toFixed(2)}  fall p99.9 ${String(r.fallP999).padStart(5)} max ${String(r.fallMax).padStart(5)} DMX/s  strobe ${r.strobe}  underTp ${r.underTp}  niva ${r.niva.toFixed(2)}  (n ${r.n})`);
}
// manuset med övergångar
const edges = []; { let t = 0; for (const [m, s, silent] of SCRIPT) { edges.push({ m, from: t, to: t + s, silent: !!silent }); t += s; } }
const R = run((t) => { const e = edges.find((x) => t >= x.from && t < x.to) ?? edges[edges.length - 1]; return { m: e.m, silent: e.silent }; });
out(`\nmanus: ${SCRIPT.map(([m, s, q]) => `${m}${q ? "(tyst)" : ""} ${s}s`).join(" -> ")}`);
for (const e of edges) {
  const seg = R.filter((r) => r.t >= e.from && r.t < e.to);
  const F = []; for (let i = 1; i < seg.length; i++) for (let l = 0; l < seg[i].v.length; l++) { const df = seg[i - 1].v[l] - seg[i].v[l]; if (df > 0) F.push(df * 1000 / STEP_MS); }
  const lo = Math.min(...seg.map((r) => Math.max(...r.v)));
  out(`  ${(e.m + (e.silent ? " tyst" : "")).padEnd(16)} ${String(e.from).padStart(3)}-${String(e.to).padEnd(3)} s  fall max ${String(Math.round(Math.max(0, ...F))).padStart(5)} DMX/s  ljusaste lampa min ${lo} / median ${med(seg.map((r) => Math.max(...r.v)))}  strobe ${seg.filter((r) => r.strobe).length}`);
}
