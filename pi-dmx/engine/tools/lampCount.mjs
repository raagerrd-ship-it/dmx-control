/**
 * LAMPANTAL PER EFFEKT (2026-10-10 natt, KONSERTSHOW idé 3 "lamptrappa"): tvingar varje effekt i tur och ordning genom riktiga
 * analysatorn + motorn (beatFeed som live) och mäter hur många av de fyra lamporna som i snitt lyser (> 30 % DMX) när riggen alls lyser.
 * Underlag för dirigentens lamptrappa: sparsamma looks i vers/intro, fulla i refrängen.
 *   node tools/lampCount.mjs <wav> [--start 120] [--sek 60] [--json ut.json]
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
const d = readFileSync(path); const nSamples = (d.length - 44) >> 1;
const SR = 48000, HOP = 128, EPOCH = 1700000000000, STEP_MS = 25;
console.log = () => {};
const out = {};
for (const look of EFFECT_KEYS) {
  const cfg = JSON.parse(JSON.stringify(defaultConfig)); cfg.mode = look; cfg.master = 1;
  const lamps = cfg.fixtures.map((fx) => { const roles = fixtureRoles(fx), base = (fx.address ?? 1) - 1; const at = (r) => { const i = roles.indexOf(r); return i < 0 ? -1 : base + i; }; return [at("r"), at("g"), at("b")]; });
  const an = new Analyser(JSON.parse(JSON.stringify(defaultConfig))); an.setGainLock(true, 1);
  const feed = new BeatFeed();
  const t00 = EPOCH + startS * 1000; Date.now = () => t00; performance.now = () => t00 - EPOCH;
  const eng = new EffectEngine(cfg);
  const buf = new Float32Array(HOP); let lastRender = -1, sum = 0, n = 0;
  const end = Math.min(nSamples, Math.floor((startS + maxS) * SR));
  for (let off = Math.floor(startS * SR / HOP) * HOP; off + HOP <= end; off += HOP) {
    for (let i = 0; i < HOP; i++) buf[i] = d.readInt16LE(44 + (off + i) * 2) / 32768;
    const ms = EPOCH + off / SR * 1000; an.setVirtualClock(ms); Date.now = () => ms; performance.now = () => ms - EPOCH;
    const fr = an.process(buf); feed.update(fr, cfg, an);
    if (ms - lastRender < STEP_MS && lastRender >= 0) continue;
    lastRender = ms; eng.render(fr); const u = eng.universe; if (!u || off / SR - startS < 15) continue;
    const v = lamps.map(([r, g, b]) => Math.max(u[r] ?? 0, u[g] ?? 0, u[b] ?? 0));
    if (Math.max(...v) < 20) continue;
    sum += v.filter((x) => x > 0.3 * 255).length; n++;
  }
  out[look] = n ? +(sum / n).toFixed(2) : null;
}
const sorted = Object.entries(out).sort((a, b) => (a[1] ?? 9) - (b[1] ?? 9));
process.stdout.write(sorted.map(([k, v]) => `${k} ${v}`).join("\n") + "\n");
if (opt("--json", null)) writeFileSync(opt("--json"), JSON.stringify(out, null, 1));
