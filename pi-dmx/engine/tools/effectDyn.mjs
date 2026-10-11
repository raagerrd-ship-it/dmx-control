/**
 * EFFEKTERNAS DYNAMIK (2026-10-11, ägaren i ladan med konsertpaketet: "kolla över effekterna, så de har mycket dynamik (olika
 * ljusstyrka på olika lampor mm)"). Tvingar varje effekt genom riktiga analysatorn + motorn (beatFeed som live) och mäter i DMX-ljus
 * (max(R,G,B) per lampa, efter alla tre stegen):
 *   spridning  median över tända rutor av (ljusaste - mörkaste lampa) / ljusaste   - 0 = alla lampor lika, 1 = någon släckt bredvid full
 *   rorelse    median per lampa av (p90 - p10) / p90 inom 2 s-fönster             - 0 = lampan står still, 1 = full sving
 *   niva       median ljusaste lampa / 255
 *   node tools/effectDyn.mjs <wav> [--start 120] [--sek 60] [--json ut.json] [--look a,b]
 */
import { readFileSync, writeFileSync } from "node:fs";
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const path = args.find((a) => a.endsWith(".wav"));
const startS = Number(opt("--start", 120)), maxS = Number(opt("--sek", 60));
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
const out = {};
for (const look of LOOKS) {
  const cfg = JSON.parse(JSON.stringify(defaultConfig)); cfg.mode = look; cfg.master = 1;
  const lamps = cfg.fixtures.map((fx) => { const roles = fixtureRoles(fx), base = (fx.address ?? 1) - 1; const at = (r) => { const i = roles.indexOf(r); return i < 0 ? -1 : base + i; }; return [at("r"), at("g"), at("b")]; });
  const an = new Analyser(JSON.parse(JSON.stringify(defaultConfig))); an.setGainLock(true, 1);
  const feed = new BeatFeed();
  const t00 = EPOCH + startS * 1000; Date.now = () => t00; performance.now = () => t00 - EPOCH;
  const eng = new EffectEngine(cfg);
  const buf = new Float32Array(HOP); let lastRender = -1;
  const SP = [], LV = [], hist = lamps.map(() => []), MOV = [];
  const end = Math.min(nSamples, Math.floor((startS + maxS) * SR));
  for (let off = Math.floor(startS * SR / HOP) * HOP; off + HOP <= end; off += HOP) {
    for (let i = 0; i < HOP; i++) buf[i] = d.readInt16LE(44 + (off + i) * 2) / 32768;
    const ms = EPOCH + off / SR * 1000; an.setVirtualClock(ms); Date.now = () => ms; performance.now = () => ms - EPOCH;
    const fr = an.process(buf); feed.update(fr, cfg, an);
    if (ms - lastRender < STEP_MS && lastRender >= 0) continue;
    lastRender = ms; eng.render(fr); const u = eng.universe; if (!u || off / SR - startS < 15) continue;
    const v = lamps.map(([r, g, b]) => Math.max(u[r] ?? 0, u[g] ?? 0, u[b] ?? 0));
    const mx = Math.max(...v), mn = Math.min(...v);
    v.forEach((x, k) => hist[k].push(x));
    if (mx < 20) continue;
    SP.push((mx - mn) / mx); LV.push(mx / 255);
  }
  for (const h of hist) for (let s = 0; s + WIN <= h.length; s += WIN) {
    const w = h.slice(s, s + WIN).sort((a, b) => a - b); const p90 = w[Math.floor(WIN * 0.9)], p10 = w[Math.floor(WIN * 0.1)];
    if (p90 >= 20) MOV.push((p90 - p10) / p90);
  }
  out[look] = { spridning: +med(SP).toFixed(2), rorelse: +med(MOV).toFixed(2), niva: +med(LV).toFixed(2) };
}
const rows = Object.entries(out).sort((a, b) => (a[1].spridning + a[1].rorelse) - (b[1].spridning + b[1].rorelse));
process.stdout.write(rows.map(([k, v]) => `${k.padEnd(12)} spridning ${v.spridning.toFixed(2)}  rorelse ${v.rorelse.toFixed(2)}  niva ${v.niva.toFixed(2)}`).join("\n") + "\n");
if (opt("--json", null)) writeFileSync(opt("--json"), JSON.stringify(out, null, 1));
