/**
 * EFFEKTERNAS DYNAMIK (2026-10-11, ägaren i ladan med konsertpaketet: "kolla över effekterna, så de har mycket dynamik (olika
 * ljusstyrka på olika lampor mm)"). Tvingar varje effekt genom riktiga analysatorn + motorn (beatFeed som live) och mäter i DMX-ljus
 * (max(R,G,B) per lampa, efter alla tre stegen):
 *   spridning  median över tända rutor av (ljusaste - mörkaste lampa) / ljusaste   - 0 = alla lampor lika, 1 = någon släckt bredvid full
 *   rorelse    median per lampa av (p90 - p10) / p90 inom 2 s-fönster             - 0 = lampan står still, 1 = full sving
 *   niva       median ljusaste lampa / 255
 *   node tools/effectDyn.mjs <wav> [--start 120] [--sek 60] [--json ut.json] [--look a,b] [--sec intro,break,low]
 *
 * LUGN-SKÖNHET och EFFEKTFULLT (10-13, ägaren: "effektfulla där de behövs och snygga i lugna perioder"):
 *   --sec  räkna bara rutor i de sektionerna (analysatorns frame.section); utan = alla.
 *   Analysatorn körs EN gång per fil/avsnitt (rutorna + taktklockan cachas) och alla looker renderas på samma rutor.
 *   LUGN (lägre = vackrare):
 *     hopp      andel 25 ms-steg per lampa där ljuset hoppar > 30 % av lampans p90 (kantighet; mjuka svep ~0)
 *     kulhopp   hårda kulörbyten per lampa och minut (lampa >= 40/255, nyansen hoppar > 40° på ett steg)
 *     kulorer   median antal samtidiga kulörfamiljer (30°-fack) bland tända lampor
 *     glid      median nyansfart per tänd lampa i °/s (hur fort kulören vandrar)
 *     matt      median mättnad (1 - min/max) på tända lampor (regel >= 0,65)
 *   EFFEKTFULLT (högre = mer effekt):
 *     topp      p95 av ljusaste lampan / 255
 *     slagdjup  median per slag och lampa av (max - min) / max inom slaget
 *     takt      R² av lampornas ljus vikt på taktens fas (4 slag x 4 fack, i 16-slagsblock): andelen av svängningen som följer takten
 *     rum       median i 2 s-fönster av ljustyngdpunktens svep (p90 - p10) över riggen / (antal - 1)
 */
import { readFileSync, writeFileSync } from "node:fs";
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const path = args.find((a) => a.endsWith(".wav"));
const startS = Number(opt("--start", 120)), maxS = Number(opt("--sek", 60));
const SECS = opt("--sec", null) ? new Set(opt("--sec").split(",")) : null;
const { Analyser } = await import("../dist/analyser.js");
const { EffectEngine } = await import("../dist/effects.js");
const { BeatFeed } = await import("../dist/beatFeed.js");
const { defaultConfig, fixtureRoles } = await import("../dist/config.js");
const { EFFECT_KEYS } = await import("../dist/effects/registry.js");
const LOOKS = opt("--look", null) ? opt("--look").split(",") : EFFECT_KEYS;
const d = readFileSync(path); const nSamples = (d.length - 44) >> 1;
const SR = 48000, HOP = 128, EPOCH = 1700000000000, STEP_MS = 25, WIN = 80;   // 80 rutor = 2 s
console.log = () => {};
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : 0; };
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : 0; };
const hueOf = (r, g, b) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b), dd = mx - mn; if (dd <= 0) return -1;
  let h = mx === r ? ((g - b) / dd) % 6 : mx === g ? (b - r) / dd + 2 : (r - g) / dd + 4; h *= 60; return h < 0 ? h + 360 : h; };
const hueDiff = (a, b) => { const x = Math.abs(a - b) % 360; return x > 180 ? 360 - x : x; };

// --- ANALYSEN EN GÅNG: rutorna (klonade) + taktklockan per renderruta ---
const t00 = EPOCH + startS * 1000; Date.now = () => t00; performance.now = () => t00 - EPOCH;
const acfg = JSON.parse(JSON.stringify(defaultConfig));
const an = new Analyser(JSON.parse(JSON.stringify(defaultConfig))); an.setGainLock(true, 1);
const feed = new BeatFeed();
const buf = new Float32Array(HOP); let lastRender = -1;
const CACHE = [], BPM = [];
const end = Math.min(nSamples, Math.floor((startS + maxS) * SR));
for (let off = Math.floor(startS * SR / HOP) * HOP; off + HOP <= end; off += HOP) {
  for (let i = 0; i < HOP; i++) buf[i] = d.readInt16LE(44 + (off + i) * 2) / 32768;
  const ms = EPOCH + off / SR * 1000; an.setVirtualClock(ms); Date.now = () => ms; performance.now = () => ms - EPOCH;
  const fr = an.process(buf); feed.update(fr, acfg, an); if (fr.bpm > 0) BPM.push(fr.bpm);
  if (ms - lastRender < STEP_MS && lastRender >= 0) continue;
  lastRender = ms;
  CACHE.push({ ms, fr: structuredClone(fr), beat: acfg.beat ? { ...acfg.beat } : null, beatErr: acfg.beatErr ?? 0, warm: off / SR - startS >= 15 });
}
const bpmMed = med(BPM) || 120;

const out = {};
for (const look of LOOKS) {
  const cfg = JSON.parse(JSON.stringify(defaultConfig)); cfg.mode = look; cfg.master = 1;
  const lamps = cfg.fixtures.map((fx) => { const roles = fixtureRoles(fx), base = (fx.address ?? 1) - 1; const at = (r) => { const i = roles.indexOf(r); return i < 0 ? -1 : base + i; }; return [at("r"), at("g"), at("b")]; });
  const N = lamps.length;
  Date.now = () => t00; performance.now = () => t00 - EPOCH;
  const eng = new EffectEngine(cfg);
  // per använd ruta: v[N], hue[N], sat[N], beatPos (slag sedan ankaret, kontinuerligt), seg-id (för att bryta steg vid sektionsglapp)
  const R = [];
  let seg = 0, prevIn = false;
  for (const c of CACHE) {
    Date.now = () => c.ms; performance.now = () => c.ms - EPOCH;
    cfg.beat = c.beat ? { ...c.beat } : null; cfg.beatErr = c.beatErr;
    eng.render(c.fr); const u = eng.universe;
    const inSec = c.warm && u && (!SECS || SECS.has(c.fr.section));
    if (!inSec) { if (prevIn) seg++; prevIn = false; continue; }
    prevIn = true;
    const v = [], hu = [], sa = [];
    for (const [r, g, b] of lamps) { const R0 = u[r] ?? 0, G0 = u[g] ?? 0, B0 = u[b] ?? 0, mx = Math.max(R0, G0, B0);
      v.push(mx); hu.push(mx >= 40 ? hueOf(R0, G0, B0) : -1); sa.push(mx >= 20 ? 1 - Math.min(R0, G0, B0) / mx : -1); }
    const bp = c.beat && c.beat.bpm > 0 ? (c.ms - c.beat.anchorMs) / (60000 / c.beat.bpm) : NaN;
    R.push({ v, hu, sa, bp, seg });
  }
  if (R.length < WIN) { out[look] = null; continue; }
  // --- gamla måtten ---
  const SP = [], LV = [], MOV = [];
  const hist = Array.from({ length: N }, (_, k) => R.map((r) => r.v[k]));
  for (const r of R) { const mx = Math.max(...r.v), mn = Math.min(...r.v); if (mx < 20) continue; SP.push((mx - mn) / mx); LV.push(mx / 255); }
  for (const h of hist) for (let s = 0; s + WIN <= h.length; s += WIN) {
    const w = h.slice(s, s + WIN).sort((a, b) => a - b); const p90 = w[Math.floor(WIN * 0.9)], p10 = w[Math.floor(WIN * 0.1)];
    if (p90 >= 20) MOV.push((p90 - p10) / p90);
  }
  const beats = R.length * STEP_MS / 60000 * bpmMed, minutes = R.length * STEP_MS / 60000;
  const blink = Math.max(...hist.map((h) => { const s2 = [...h].sort((a, b) => a - b), p90 = s2[Math.floor(s2.length * 0.9)] || 0; if (p90 < 20) return 0;
    let n = 0, low = true; for (const x of h) { if (low && x > 0.5 * p90) { n++; low = false; } else if (!low && x < 0.25 * p90) low = true; } return n; })) / Math.max(1, beats);
  // --- LUGN ---
  let jumps = 0, steps = 0, hueJ = 0; const GL = [], KF = [], SAT = [];
  for (let k = 0; k < N; k++) {
    const p90 = pct(hist[k], 0.9); if (p90 < 20) continue;
    for (let i = 1; i < R.length; i++) {
      if (R[i].seg !== R[i - 1].seg) continue;
      const a = R[i - 1].v[k], b = R[i].v[k]; if (Math.max(a, b) < 20) continue;
      steps++; if (Math.abs(b - a) > 0.3 * p90) jumps++;
      const h0 = R[i - 1].hu[k], h1 = R[i].hu[k];
      if (h0 >= 0 && h1 >= 0) { const dh = hueDiff(h0, h1); if (dh > 40) hueJ++; else GL.push(dh * 1000 / STEP_MS); }
    }
  }
  for (const r of R) { const fam = new Set(); r.hu.forEach((h, k) => { if (h >= 0) { fam.add(Math.floor(((h + 15) % 360) / 30)); SAT.push(r.sa[k]); } }); if (fam.size) KF.push(fam.size); }
  // --- EFFEKTFULLT ---
  const TOP = R.map((r) => Math.max(...r.v) / 255);
  const DEP = [];
  for (let k = 0; k < N; k++) { let cur = -1, mx = 0, mn = 1e9;
    for (const r of R) { if (!Number.isFinite(r.bp)) continue; const bi = Math.floor(r.bp);
      if (bi !== cur) { if (cur >= 0 && mx >= 20) DEP.push((mx - mn) / mx); cur = bi; mx = 0; mn = 1e9; }
      mx = Math.max(mx, r.v[k]); mn = Math.min(mn, r.v[k]); } }
  // takt: per lampa och 16-slagsblock, vik på (slag mod 4)*4 + floor(frac*4); R² = var(fackmedel viktat) / var(totalt)
  const R2 = [];
  for (let k = 0; k < N; k++) {
    const blocks = new Map();
    for (const r of R) { if (!Number.isFinite(r.bp)) continue; const bi = Math.floor(r.bp), key = `${r.seg}:${Math.floor(bi / 16)}`;
      const bin = (((bi % 4) + 4) % 4) * 4 + Math.min(3, Math.floor((r.bp - bi) * 4));
      let B = blocks.get(key); if (!B) blocks.set(key, B = { s: new Float64Array(16), n: new Float64Array(16), all: [] }); B.s[bin] += r.v[k]; B.n[bin]++; B.all.push(r.v[k]); }
    for (const B of blocks.values()) { if (B.all.length < 120) continue; const m = B.all.reduce((a, b) => a + b, 0) / B.all.length; if (m < 10) continue;
      let vt = 0; for (const x of B.all) vt += (x - m) ** 2; vt /= B.all.length; if (vt < 25) { R2.push(0); continue; }
      let vb = 0; for (let j = 0; j < 16; j++) if (B.n[j]) vb += B.n[j] * (B.s[j] / B.n[j] - m) ** 2; vb /= B.all.length; R2.push(vb / vt); }
  }
  const ROOM = [];
  const cent = R.map((r) => { const s = r.v.reduce((a, b) => a + b, 0); return s >= 20 ? r.v.reduce((a, x, i) => a + x * i, 0) / s : NaN; });
  for (let s = 0; s + WIN <= cent.length; s += WIN) { const w = cent.slice(s, s + WIN).filter(Number.isFinite); if (w.length < WIN / 2) continue; ROOM.push((pct(w, 0.9) - pct(w, 0.1)) / Math.max(1, N - 1)); }
  out[look] = { n: R.length, spridning: +med(SP).toFixed(2), rorelse: +med(MOV).toFixed(2), niva: +med(LV).toFixed(2), blinkPerSlag: +blink.toFixed(2),
    hopp: +(jumps / Math.max(1, steps)).toFixed(3), kulhopp: +(hueJ / Math.max(1, N) / Math.max(1e-6, minutes)).toFixed(1), kulorer: med(KF), glid: +med(GL).toFixed(0), matt: +med(SAT).toFixed(2),
    topp: +pct(TOP, 0.95).toFixed(2), slagdjup: +med(DEP).toFixed(2), takt: +med(R2).toFixed(2), rum: +med(ROOM).toFixed(2) };
}
const rows = Object.entries(out).filter(([, v]) => v).sort((a, b) => (a[1].spridning + a[1].rorelse) - (b[1].spridning + b[1].rorelse));
process.stdout.write(`bpm ${bpmMed.toFixed(0)}  sektioner ${SECS ? [...SECS].join(",") : "alla"}\n`);
process.stdout.write(rows.map(([k, v]) => `${k.padEnd(12)} sprid ${v.spridning.toFixed(2)} rorel ${v.rorelse.toFixed(2)} niva ${v.niva.toFixed(2)} blink ${v.blinkPerSlag.toFixed(2)} | hopp ${v.hopp.toFixed(3)} kulhopp ${String(v.kulhopp).padStart(5)} kulor ${v.kulorer} glid ${String(v.glid).padStart(4)} matt ${v.matt.toFixed(2)} | topp ${v.topp.toFixed(2)} djup ${v.slagdjup.toFixed(2)} takt ${v.takt.toFixed(2)} rum ${v.rum.toFixed(2)}  (n ${v.n})`).join("\n") + "\n");
if (opt("--json", null)) writeFileSync(opt("--json"), JSON.stringify(out, null, 1));
