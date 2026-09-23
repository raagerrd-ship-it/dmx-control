/** EFFEKTLIKHET v2 (2026-09-23). Matar en REALISTISK kontext-serie ur en WAV (analysator -> dirigentens ctx-fyllning i smart-lage,
 *  med ladans env satt av anroparen) och renderar VARJE effekt pa exakt samma ctx-serie, 4 lampor, 40 Hz. Jamfor effektens EGEN
 *  avsikt (render() -> rgb per lampa, kontraktet i ARKITEKTUR.md: farg + relativ intensitet) - INTE DMX-utgangen.
 *
 *  Varfor v1 gav 0,99 for nastan alla par: den matte motorns UTGANG (u[]) per effekt i eget lage. Dar ligger mastern
 *  (LIGHT_FLOOR + loudness), tystnadsgrinden, ballistiken och sektionsgasen ovanpa - en gemensam nivakurva som dominerar
 *  variansen, sa alla effekter korrelerade mot samma nivakurva. Dessutom saknade ctx:en takt/sektion i manga lagen
 *  (beatPulse av, energyDrivesMode av) sa taktdrivna effekter kollapsade till samma platta form.
 *
 *  Nu: (1) EN korning i smart-lage fyller ctx:en per ruta (sektion, sectionEntry, expectHighInMs, levelVsHighDb, repeatSim,
 *  takt, kick, punch, drum, grav, band ...), kontexten frysas per ruta; (2) motorns lagesbundna tillstand (wavePhase, chasePos,
 *  dropFired) simuleras per ruta sa wave/sopa/chase/drops inte star stilla nar de inte ar valda; (3) varje effekt renderas pa
 *  serien, per-lampa-luminans -> parvis korrelation; (4) par >= 0,90 i SAMMA pool (delad tier eller sektionstagg) markeras.
 *
 *   DMX_SECTION=1 DMX_SECTION_SWITCH=1 DMX_GRID_PHASE=1 DMX_PHASE_FOLLOW=1 node tools/effectSimilarity.mjs [wav] [startS] [sek]
 *     --famr 0.95            klusterradie for visuella familjer
 *     --pairsjson fil.json   alla par >= 0,70 (sla ihop flera inspelningar)
 *     --famjson fil.json     familjerna
 *     --signals              vilka ctx-/frame-signaler varje effekt LASER (statisk skanning av kallfilen) */
import { readFileSync, existsSync } from "node:fs";
const { Analyser } = await import("../dist/analyser.js");
const { EffectEngine } = await import("../dist/effects.js");
const { defaultConfig } = await import("../dist/config.js");
const { EFFECTS, TIER } = await import("../dist/effects/registry.js");
const { setPalette, currentPalette, mixedSector } = await import("../dist/effects/palette.js");
const { hsvToRgb } = await import("../dist/effects/color.js");
const argv = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const f = argv[0] || "tools/pop_ladan.wav", startS = Number(argv[1] || 60), secs = Number(argv[2] || 60);
const d = readFileSync(f); const n = (d.readUInt32LE(40) || d.length - 44) / 2; const SR = 48000, HOP = 128, LAMPS = 4;

// 1) EN korning genom analysator + dirigent i smart-lage; frys ctx:en per ruta.
const cfg = JSON.parse(JSON.stringify(defaultConfig)); cfg.beatPulse = true; cfg.mode = "smart"; cfg.energyDrivesMode = true;
const an = new Analyser(JSON.parse(JSON.stringify(defaultConfig))); an.setGainLock(true, 1);
const eng = new EffectEngine(cfg);
const origLog = console.log; console.log = (...a) => { if (!String(a[0]).startsWith("[")) origLog(...a); };
const buf = new Float32Array(HOP); const ms0 = 1700000000000; let lastRender = -1;
const snaps = []; let wavePhase = 0, chasePos = 0, chaseDir = 1, lastChase = 0, dropCount = 0, lastDrop = 0;
const dropFired = new Array(LAMPS).fill(-1e9), dropHue = new Array(LAMPS).fill(0);
let prevBeatIdx = -1, prevMs = 0;
for (let off = 0; off + HOP <= n && off < (startS + secs) * SR; off += HOP) {
  for (let i = 0; i < HOP; i++) buf[i] = d.readInt16LE(44 + (off + i) * 2) / 32768;
  const ms = ms0 + (off / SR) * 1000; an.setVirtualClock(ms); Date.now = () => ms; performance.now = () => ms - ms0;
  const fr = an.process(buf);
  if (fr.bpm > 0) cfg.beat = { anchorMs: fr.beatAnchorMs || ms, bpm: fr.bpm, confidence: fr.bpmConfidence };
  if (ms - lastRender < 25) continue;
  lastRender = ms; eng.render(fr);
  if (off / SR < startS) continue;
  const c = eng.ctx;   // dirigentens fyllda kontext (samma objekt varje ruta -> kopiera)
  const dt = prevMs ? (ms - prevMs) / 1000 : 0.025; prevMs = ms;
  // Lagesbundet motor-tillstand som annars bara stegar nar effekten ar vald:
  wavePhase += dt * (1.6 + c.audio * 4);                                             // effects.ts: wave
  const tick = c.beatHit;
  if (tick || ms - lastChase > 1200) { lastChase = ms; chasePos += chaseDir; if (chasePos >= LAMPS - 1) { chasePos = LAMPS - 1; chaseDir = -1; } else if (chasePos <= 0) { chasePos = 0; chaseDir = 1; } }
  if (tick && ms - lastDrop > 140) { lastDrop = ms; dropCount++; const p = Math.floor(((dropCount * 0.61803398875) % 1) * LAMPS); dropFired[p] = ms - ms0; dropHue[p] = mixedSector(dropCount) / 6; }
  const s = c.frame.spec, fr2 = c.frame;
  const bands = [Math.max(s.kick, s.bass), Math.max(s.lowMid, s.mid), Math.max(s.treble, s.air), Math.min(1, Math.max(s.kick, fr2.onset.kick) * 0.6 + c.kickEnv * 0.6), Math.max(0, (0.5 - c.audio) * 2) * 0.6];
  const snap = {
    cfg, frame: structuredClone(fr2), fx: undefined, t: c.t, idx: 0, count: LAMPS, want: {},
    audio: c.audio, kickEnv: c.kickEnv, punch: c.punch, dropEnv: c.dropEnv, band: 0, gravLevel: c.gravLevel, gravPeak: c.gravPeak,
    drum: { ...fr2.drum }, section: c.section, sectionAgeMs: c.sectionAgeMs, sectionIndex: c.sectionIndex, sectionEntry: c.sectionEntry,
    sectionTier: c.sectionTier, repeatSim: c.repeatSim, expectHighInMs: c.expectHighInMs, levelVsHighDb: c.levelVsHighDb,
    sectionBars: c.sectionBars, bassline: c.bassline, bassNoteIdx: c.bassNoteIdx, bassNoteAge: c.bassNoteAge,   // 2026-09-23: utan dessa blev basgang NaN (medel 0,00) och basnots-/frasgrenarna i chase/eko/stege/tide/pendel/frasraknare/forvarning kordes aldrig
    beatIdx: c.beatIdx, beatFrac: c.beatFrac, beatPulse: c.beatPulse, beatHit: c.beatHit, hasBeat: c.hasBeat,
    wavePhase, buildUp: c.buildUp, phaseSpread: c.phaseSpread, punchFloor: c.punchFloor, chasePos,
    dropFired: [...dropFired], dropHue: [...dropHue], now: ms - ms0, bands, palette: [...currentPalette()],
    mixedSector, hsv: hsvToRgb,
  };
  snap.mclk = (b, sec) => snap.hasBeat ? Math.floor(snap.beatIdx / b) : Math.floor(snap.t / sec);
  snap.shaped = (floor, x) => { const dyn = Math.max(0, Math.min(1, cfg.dynamics ?? 0.6)); const fl = floor * (1 - dyn); return Math.min(1, fl + (1 - fl) * Math.pow(Math.max(0, Math.min(1, x)), 1 + dyn * 1.2)); };
  snaps.push(snap);
  void prevBeatIdx;
}
console.log = origLog;
if (!snaps.length) { console.error("inga rutor"); process.exit(1); }

// 2) Rendera varje effekt pa samma serie (effektens avsikt, inga motorlager).
const rows = {}, H = {}, WANT = {};
for (const e of EFFECTS) {
  const L = [], hues = []; const w = { strobe: 0, blinder: 0, uv: 0, hazer: 0 };
  for (const sn of snaps) {
    setPalette(sn.palette);
    const lamps = []; let r0 = 0, g0 = 0, b0 = 0;
    for (let k = 0; k < LAMPS; k++) {
      sn.idx = k; sn.band = sn.bands[k]; sn.want = {};
      let rgb; try { rgb = e.render(sn); } catch (err) { rgb = [0, 0, 0]; if (!WANT[e.key + ":err"]) { WANT[e.key + ":err"] = 1; console.error(`render-fel ${e.key}: ${err.message}`); } }
      const r = Math.max(0, Math.min(1, rgb[0] || 0)), g = Math.max(0, Math.min(1, rgb[1] || 0)), b = Math.max(0, Math.min(1, rgb[2] || 0));
      lamps.push((r + g + b) / 3); if (k === 0) { r0 = r; g0 = g; b0 = b; }
      for (const key of Object.keys(w)) if (sn.want[key] !== undefined) w[key] += sn.want[key];
    }
    L.push(lamps);
    const mx = Math.max(r0, g0, b0), mn = Math.min(r0, g0, b0); let h = 0;
    if (mx > mn) { if (mx === r0) h = ((g0 - b0) / (mx - mn)) % 6; else if (mx === g0) h = (b0 - r0) / (mx - mn) + 2; else h = (r0 - g0) / (mx - mn) + 4; h = (h / 6 + 1) % 1; }
    hues.push(h);
  }
  rows[e.key] = L; H[e.key] = hues; WANT[e.key] = Object.fromEntries(Object.entries(w).map(([k, v]) => [k, v / (snaps.length * LAMPS)]));
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
const F = Object.fromEntries(keys.map((k) => [k, rows[k].flat()]));
const corr = (a, b) => { const ma = mean(a), mb = mean(b); let sab = 0, saa = 0, sbb = 0; for (let i = 0; i < a.length; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; } return saa > 0 && sbb > 0 ? sab / Math.sqrt(saa * sbb) : 0; };
// TVA MATT PER PAR: rExact = per-lampa-luminans i lampordning (identisk look), rPerm = basta korrelation over alla
// lampomkastningar (24 for 4 lampor: spegling, inre<->yttre, jamn<->udda). Publiken ser "tva lampor pa slaget, tva pa
// off-beatet" som SAMMA effekt oavsett vilka tva - darfor ar rPerm dubblettmattet (utan omkastning gav varannan~innerouter 0,39
// fast de har identisk statistik). rOf() = rPerm.
const PERMS = []; (function gen(a, k) { if (k === a.length) { PERMS.push([...a]); return; } for (let i = k; i < a.length; i++) { [a[k], a[i]] = [a[i], a[k]]; gen(a, k + 1); [a[k], a[i]] = [a[i], a[k]]; } })([0, 1, 2, 3], 0);
const COLS = Object.fromEntries(keys.map((k) => [k, [0, 1, 2, 3].map((li) => rows[k].map((l) => l[li]))]));
const permCorr = (a, b) => { let best = -1; for (const pm of PERMS) { const x = [], y = []; for (let li = 0; li < LAMPS; li++) { x.push(COLS[a][li]); y.push(COLS[b][pm[li]]); } const r = corr(x.flat(), y.flat()); if (r > best) best = r; } return best; };
const R = {}, RX = {}; for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) { RX[keys[i] + "|" + keys[j]] = corr(F[keys[i]], F[keys[j]]); R[keys[i] + "|" + keys[j]] = permCorr(keys[i], keys[j]); }
const rOf = (a, b) => R[a + "|" + b] ?? R[b + "|" + a] ?? 0;
const rxOf = (a, b) => RX[a + "|" + b] ?? RX[b + "|" + a] ?? 0;
// SAMMA POOL = delar tier ELLER en sektionstagg (dirigenten kan stalla dem mot varandra i samma val).
const def = Object.fromEntries(EFFECTS.map((e) => [e.key, e]));
const samePool = (a, b) => def[a].tier === def[b].tier || (def[a].section || []).some((s) => (def[b].section || []).includes(s));
const pairs = [];
for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) { const r = rOf(keys[i], keys[j]); if (r >= 0.80) pairs.push([r, keys[i], keys[j], samePool(keys[i], keys[j])]); }
pairs.sort((a, b) => b[0] - a[0]);
console.log(`${f} ${startS}-${startS + secs}s, ${snaps.length} rutor, ${keys.length} effekter (effektens avsikt pa dirigentens ctx-serie)`);
console.log("\nkontrast/taktmod/rumslighet/fargrorelse (lagt = svag) + onskemal (medel want/lampa):");
for (const k of [...keys].sort((a, b) => stats[a].contrast + stats[a].spatial - stats[b].contrast - stats[b].spatial)) {
  const s = stats[k], w = WANT[k]; const ws = Object.entries(w).filter(([, v]) => v > 0.001).map(([kk, v]) => `${kk} ${v.toFixed(2)}`).join(" ");
  console.log(`  ${k.padEnd(11)} medel ${s.m.toFixed(2)} kontrast ${s.contrast.toFixed(3)} takt ${s.beatMod.toFixed(3)} rum ${s.spatial.toFixed(3)} farg ${s.hueMove.toFixed(2)}${ws ? "  want: " + ws : ""}`);
}
console.log("\nnara dubbletter (rPerm >= 0,80: per-lampa-luminans, basta lampomkastning; * = samma pool):");
for (const [r, a, b, sp] of pairs) console.log(`  ${r.toFixed(2)} ${sp ? "*" : " "} ${a} ~ ${b}  (exakt ${rxOf(a, b).toFixed(2)})`);
console.log("\nnarmaste granne per effekt:");
for (const k of keys) { let best = null; for (const o of keys) if (o !== k) { const r = rOf(k, o); if (!best || r > best[0]) best = [r, o]; } console.log(`  ${k.padEnd(11)} ${best[1].padEnd(11)} ${best[0].toFixed(2)}${samePool(k, best[1]) ? " *" : ""}`); }

// ── VISUELLA FAMILJER: enkellankad klustring pa korrelationen ─────────────────────────────────────────────
const famArg = process.argv.find((a) => a.startsWith("--famr=")); const famIx = process.argv.indexOf("--famr");
const famR = Number(famArg ? famArg.split("=")[1] : famIx >= 0 ? process.argv[famIx + 1] : 0.95) || 0.95;
const parent = Object.fromEntries(keys.map((k) => [k, k]));
const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) { if (rOf(keys[i], keys[j]) >= famR) { const a = find(keys[i]), b = find(keys[j]); if (a !== b) parent[a] = b; } }
const fam = {}; for (const k of keys) { const root = find(k); (fam[root] ??= []).push(k); }
const groups = Object.values(fam).sort((a, b) => b.length - a.length);
console.log(`\nVISUELLA FAMILJER (enkellankad klustring, r >= ${famR}): ${groups.length} familjer av ${keys.length} effekter`);
groups.forEach((g, i) => console.log(`  ${String(i).padStart(2)} (${String(g.length).padStart(2)} st)  ${g.join(" ")}`));
const pairIdx = process.argv.indexOf("--pairsjson");
if (pairIdx >= 0) {
  const all = []; for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) { const r = rOf(keys[i], keys[j]); if (r >= 0.70) all.push([keys[i], keys[j], Math.round(r * 1000) / 1000]); }
  const { writeFileSync } = await import("node:fs"); writeFileSync(process.argv[pairIdx + 1], JSON.stringify({ wav: f, from: startS, secs, pairs: all })); console.log(`  -> ${all.length} par till ${process.argv[pairIdx + 1]}`);
}
const famIdx = process.argv.indexOf("--famjson");
if (famIdx >= 0) { const map = {}; groups.forEach((g, i) => g.forEach((k) => { map[k] = i; })); const { writeFileSync } = await import("node:fs"); writeFileSync(process.argv[famIdx + 1], JSON.stringify({ wav: f, from: startS, secs, famR, groups, map }, null, 1)); console.log(`  -> ${process.argv[famIdx + 1]}`); }

// ── SIGNALER: vilka ctx-/frame-falt varje effekt laser (statisk skanning av src/effects/<key>.ts) ─────────
if (process.argv.includes("--signals")) {
  const SIG = ["expectHighInMs", "levelVsHighDb", "repeatSim", "sectionBars", "sectionEntry", "sectionIndex", "sectionAgeMs", "sectionTier", "section", "bassline", "dropEnv", "buildUp", "drum", "onset", "spec", "kickEnv", "punch", "audio", "beatHit", "beatFrac", "beatIdx", "beatPulse", "gravLevel", "gravPeak", "band", "centroid", "wavePhase", "chasePos", "mclk", "want", "\\bt\\b"];
  console.log("\nSIGNALER per effekt (statisk skanning):");
  for (const e of EFFECTS) {
    const p = `src/effects/${e.key}.ts`; if (!existsSync(p)) continue; const src = readFileSync(p, "utf8").replace(/\/\/.*$/gm, "");
    const used = SIG.filter((s) => new RegExp(`(c\\.|frame\\.|profile\\.|\\.)${s}`).test(src) || (s === "\\bt\\b" && /c\.t\b/.test(src))).map((s) => s === "\\bt\\b" ? "t" : s);
    console.log(`  ${e.key.padEnd(11)} ${e.tier.padEnd(4)} ${(e.section || []).join("/").padEnd(16)} ${e.toggle ? "toggle " : "       "}${used.join(" ")}`);
  }
}
