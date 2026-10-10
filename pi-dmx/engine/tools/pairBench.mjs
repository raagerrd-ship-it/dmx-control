/**
 * PARBANKEN (2026-10-10, agaren i ladan: "effekterna som kor parvis med lamporna till BPM-takten kors inte?").
 * Tvingar EN look i taget genom riktiga analysatorn + effektmotorn (virtuell klocka, som showTight) och mater
 * om lampparen syns som par: per renderruta skillnaden mellan ljusaste och morkaste lampa (DMX-ljus = max(R,G,B)).
 *   kontrast  median (max-min)/max over tanda rutor  - 0 = alla lika, 1 = en lampa slackt nar en annan ar full
 *   morkAndel andel rutor dar morkaste lampan < 30 % av ljusaste (gruppen "av" syns som av)
 *   node tools/pairBench.mjs <wav> [--sek 120] [--start 0] [--look varannan,duel]
 */
import { readFileSync } from "node:fs";
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const path = args.find((a) => a.endsWith(".wav"));
const startS = Number(opt("--start", 0)), maxS = Number(opt("--sek", 120));
const LOOKS = opt("--look", "varannan,duel,twin,split,backbeat,gallop,pulse").split(",");

const { Analyser } = await import("../dist/analyser.js");
const { EffectEngine } = await import("../dist/effects.js");
const { BeatFeed } = await import("../dist/beatFeed.js");   // taktmatningen som i motorn (matfalla 43)
const { defaultConfig, fixtureRoles } = await import("../dist/config.js");

const d = readFileSync(path);
const nSamples = (d.length - 44) >> 1, SR = 48000, HOP = 128, EPOCH = 1700000000000, STEP_MS = 25;
console.log = () => {};
const out = {};
for (const look of LOOKS) {
  const cfg = JSON.parse(JSON.stringify(defaultConfig));
  cfg.mode = look; cfg.master = 1; cfg.beatPulse = true;
  const lamps = cfg.fixtures.map((fx) => { const roles = fixtureRoles(fx), base = (fx.address ?? 1) - 1; const at = (r) => { const i = roles.indexOf(r); return i < 0 ? -1 : base + i; }; return [at("r"), at("g"), at("b")]; });
  const an = new Analyser(JSON.parse(JSON.stringify(defaultConfig))); an.setGainLock(true, 1);
  const feed = new BeatFeed();
  const t00 = EPOCH + startS * 1000; Date.now = () => t00; performance.now = () => t00 - EPOCH;
  const eng = new EffectEngine(cfg);
  const buf = new Float32Array(HOP); const K = []; let dark = 0, n = 0, lastRender = -1, locked = 0;
  const end = Math.min(nSamples, Math.floor((startS + maxS) * SR));
  for (let off = Math.floor(startS * SR / HOP) * HOP; off + HOP <= end; off += HOP) {
    for (let i = 0; i < HOP; i++) buf[i] = d.readInt16LE(44 + (off + i) * 2) / 32768;
    const ms = EPOCH + off / SR * 1000; an.setVirtualClock(ms); Date.now = () => ms; performance.now = () => ms - EPOCH;
    const fr = an.process(buf);
    feed.update(fr, cfg, an);   // TAKTMATNINGEN SOM LIVE (beatFeed.ts, matfalla 43; forr anchorMs = fr.beatAnchorMs varje hop)
    if (ms - lastRender < STEP_MS && lastRender >= 0) continue;
    lastRender = ms; eng.render(fr); const u = eng.universe; if (!u) continue;
    if (off / SR - startS < 20) continue;   // uppvarmning (takten laser)
    const v = lamps.map(([r, g, b]) => Math.max(u[r] ?? 0, u[g] ?? 0, u[b] ?? 0));
    const mx = Math.max(...v), mn = Math.min(...v);
    if (eng.ctx?.hasBeat) locked++;
    if (process.env.PAIR_DUMP && off / SR > startS + 40 && off / SR < startS + 41.2) process.stderr.write(`${(off / SR).toFixed(3)} ${v.join(" ")} frac ${(eng.ctx?.beatFrac ?? 0).toFixed(2)}\n`);
    if (mx < 20) continue;
    K.push((mx - mn) / mx); n++; if (mn < 0.3 * mx) dark++;
  }
  K.sort((a, b) => a - b);
  out[look] = { kontrast: +(K[K.length >> 1] ?? 0).toFixed(2), morkAndel: +(n ? dark / n : 0).toFixed(2), rutor: n, last: +(n ? locked / n : 0).toFixed(2) };
}
process.stdout.write(JSON.stringify(out) + "\n");
