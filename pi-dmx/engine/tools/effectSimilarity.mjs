/** EFFEKTLIKHET (2026-09-21): rendera ALLA effekter pa samma ljud (analysator -> frames) och 4 lampor, 40 Hz, och mat
 *  (1) kontrast: std av riggens medelljus, (2) taktmodulation: andel av variansen inom 2 s-fonster, (3) rumslighet: medel-std
 *  mellan lamporna, (4) fargrorelse: std av hue, samt parvis korrelation av per-lampa-ljuskurvorna -> dubbletter (r >= 0,90).
 *   node tools/effectSimilarity.mjs [wav] [startS] [sekunder] */
import { readFileSync } from "node:fs";
const { Analyser } = await import("../dist/analyser.js");
const { EffectEngine } = await import("../dist/effects.js");
const { defaultConfig } = await import("../dist/config.js");
const { EFFECTS } = await import("../dist/effects/registry.js");
const f = process.argv[2] || "tools/pop_ladan.wav", startS = Number(process.argv[3] || 60), secs = Number(process.argv[4] || 60);
const d = readFileSync(f); const n = (d.length - 44) / 2; const SR = 48000, HOP = 128, LAMPS = 4;
// 1) samla frames en gang
const an = new Analyser(JSON.parse(JSON.stringify(defaultConfig))); an.setGainLock(true, 1);
const frames = []; const buf = new Float32Array(HOP); let ms0 = 1700000000000, lastT = -1;
for (let off = 0; off + HOP <= n && off < (startS + secs) * SR; off += HOP) {
  for (let i = 0; i < HOP; i++) buf[i] = d.readInt16LE(44 + (off + i) * 2) / 32768;
  const ms = ms0 + (off / SR) * 1000; an.setVirtualClock(ms); Date.now = () => ms; performance.now = () => ms - ms0;
  const fr = an.process(buf);
  if (off / SR >= startS && ms - lastT >= 25) { lastT = ms; frames.push({ ms, fr: structuredClone(fr) }); }
}
// 2) rendera varje effekt pa samma frames
const rows = {}; const H = {};
for (const e of EFFECTS) {
  const cfg = JSON.parse(JSON.stringify(defaultConfig)); cfg.mode = e.key; cfg.beatPulse = false; cfg.energyDrivesMode = false;   // ingen motor-puls: mat EFFEKTENS egen form
  { const t0 = frames[0].ms; Date.now = () => t0; performance.now = () => t0 - ms0; }   // klockan pa forsta rutan INNAN motorn skapas (start-fade/tystnadsgrind)
  const eng = new EffectEngine(cfg);
  const L = []; const hues = [];
  for (const { ms, fr } of frames) {
    Date.now = () => ms; performance.now = () => ms - ms0;
    if (fr.bpm > 0) cfg.beat = { anchorMs: fr.beatAnchorMs || ms, bpm: fr.bpm, confidence: fr.bpmConfidence };
    const u = eng.render(fr); const lamps = [];
    const fxs = cfg.fixtures; let r0 = 0, g0 = 0, b0 = 0;
    for (let k = 0; k < Math.min(LAMPS, fxs.length); k++) { const a = fxs[k].address - 1; const r = u[a] || 0, g = u[a + 1] || 0, b = u[a + 2] || 0, dim = (u[a + 3] ?? 255) / 255; lamps.push((r + g + b) / (3 * 255)); void dim; if (k === 0) { r0 = r; g0 = g; b0 = b; } }   // rgb utan dim-mastern: effektens EGEN form
    L.push(lamps);
    const mx = Math.max(r0, g0, b0), mn = Math.min(r0, g0, b0); let h = 0;
    if (mx > mn) { if (mx === r0) h = ((g0 - b0) / (mx - mn)) % 6; else if (mx === g0) h = (b0 - r0) / (mx - mn) + 2; else h = (r0 - g0) / (mx - mn) + 4; h = (h / 6 + 1) % 1; }
    hues.push(h);
  }
  rows[e.key] = L; H[e.key] = hues;
}
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length, std = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((v) => (v - m) ** 2))); };
const stats = {};
for (const [k, L] of Object.entries(rows)) {
  const rig = L.map((l) => mean(l)); const contrast = std(rig);
  let within = 0, cnt = 0; for (let i = 0; i + 80 <= rig.length; i += 80) { within += std(rig.slice(i, i + 80)) ** 2; cnt++; }
  const beatMod = cnt ? Math.sqrt(within / cnt) : 0;
  const spatial = mean(L.map((l) => std(l)));
  const hh = H[k]; const hueMove = std(hh.map((h) => Math.sin(2 * Math.PI * h)));
  stats[k] = { m: mean(rig), contrast, beatMod, spatial, hueMove };
}
const keys = Object.keys(rows);
const flat = (k) => rows[k].flat();
const corr = (a, b) => { const ma = mean(a), mb = mean(b); let sab = 0, saa = 0, sbb = 0; for (let i = 0; i < a.length; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; } return saa > 0 && sbb > 0 ? sab / Math.sqrt(saa * sbb) : 0; };
const F = Object.fromEntries(keys.map((k) => [k, flat(k)]));
const pairs = [];
for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) { const r = corr(F[keys[i]], F[keys[j]]); if (r >= 0.85) pairs.push([r, keys[i], keys[j]]); }
pairs.sort((a, b) => b[0] - a[0]);
console.log(`${f} ${startS}-${startS + secs}s, ${frames.length} rutor, ${keys.length} effekter`);
console.log("\nkontrast/taktmod/rumslighet/fargrorelse (lagt = svag):");
for (const k of keys.sort((a, b) => stats[a].contrast + stats[a].spatial - stats[b].contrast - stats[b].spatial)) { const s = stats[k]; console.log(`  ${k.padEnd(11)} medel ${s.m.toFixed(2)} kontrast ${s.contrast.toFixed(3)} takt ${s.beatMod.toFixed(3)} rum ${s.spatial.toFixed(3)} farg ${s.hueMove.toFixed(2)}`); }
console.log("\nnara dubbletter (r >= 0,85 pa per-lampa-ljuskurvor):");
for (const [r, a, b] of pairs) console.log(`  ${r.toFixed(2)}  ${a} ~ ${b}`);

// ── VISUELLA FAMILJER (2026-09-23) ───────────────────────────────────────────────────────────────────────────
// Matt kvall 09-22 pa ladans egna inspelningar: dirigenten byter look 57 ganger pa 10 min, men 75 % av tiden ligger
// den i eko/varannan/twin/chase/innerouter - som mater r = 0,97-0,98 mot varandra. Agaren ser darfor "samma effekt"
// aven nar showen formellt byter hela tiden. Familjerna ar enkellankad klustring pa korrelationen: tva effekter i
// samma familj SER likadana ut pa fyra lampor, oavsett vad de heter.
//   node tools/effectSimilarity.mjs <wav> <start> <sek> --famr 0.95 --famjson dist/effectFamilies.json
const famR = Number((process.argv.find((a) => a.startsWith("--famr=")) || "").split("=")[1] || process.argv[process.argv.indexOf("--famr") + 1] || 0.95);
const parent = Object.fromEntries(keys.map((k) => [k, k]));
const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
  const r = corr(F[keys[i]], F[keys[j]]);
  if (r >= famR) { const a = find(keys[i]), b = find(keys[j]); if (a !== b) parent[a] = b; }
}
const fam = {};
for (const k of keys) { const root = find(k); (fam[root] ??= []).push(k); }
const groups = Object.values(fam).sort((a, b) => b.length - a.length);
console.log(`\nVISUELLA FAMILJER (enkellankad klustring, r >= ${famR}): ${groups.length} familjer av ${keys.length} effekter`);
groups.forEach((g, i) => console.log(`  ${String(i).padStart(2)} (${String(g.length).padStart(2)} st)  ${g.join(" ")}`));
const pairIdx = process.argv.indexOf("--pairsjson");
if (pairIdx >= 0) {
  // HELA parlistan (r >= 0,70) sa flera korningar kan slas ihop: ett par raknas som "ser likadant ut" forst nar
  // det gor det pa FLERA inspelningar - en enda latsekvens sager for lite (matt 09-23: varannan~innerouter r 0,98
  // pa pop men under 0,95 pa megamix).
  const all = [];
  for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
    const r = corr(F[keys[i]], F[keys[j]]); if (r >= 0.70) all.push([keys[i], keys[j], Math.round(r * 1000) / 1000]);
  }
  const { writeFileSync } = await import("node:fs");
  writeFileSync(process.argv[pairIdx + 1], JSON.stringify({ wav: f, from: startS, secs, pairs: all }));
  console.log(`  -> ${all.length} par till ${process.argv[pairIdx + 1]}`);
}
const famIdx = process.argv.indexOf("--famjson");
if (famIdx >= 0) {
  const map = {};
  groups.forEach((g, i) => g.forEach((k) => { map[k] = i; }));
  const { writeFileSync } = await import("node:fs");
  writeFileSync(process.argv[famIdx + 1], JSON.stringify({ wav: f, from: startS, secs, famR, groups, map }, null, 1));
  console.log(`  -> ${process.argv[famIdx + 1]}`);
}
