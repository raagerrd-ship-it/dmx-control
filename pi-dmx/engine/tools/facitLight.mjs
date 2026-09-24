// Medelljus (4 armaturer, max(r,g,b)) i facitets high- mot low-segment, per langfangst. DMX-motor + gemensam analysator + latgransdetektor.
import { readFileSync, readdirSync } from "node:fs"; import { pathToFileURL } from "node:url"; import { join } from "node:path";
const [distDir, corpus, nMax, split] = process.argv.slice(2); let idx = -1; const u = (f) => pathToFileURL(distDir + "/" + f).href;
const { Analyser } = await import(u("analyser.js")); const { EffectEngine } = await import(u("effects.js")); const { defaultConfig } = await import(u("config.js"));
const files = readdirSync(corpus).filter((f) => /_s[a-z0-9]{8,}\.json$/.test(f)).sort();
const out = []; let used = 0;
for (const f of files) {
  if (used >= Number(nMax || 20)) break;
  const meta = JSON.parse(readFileSync(join(corpus, f), "utf8")); const der = meta?.result?.analysis?.sections?.derived || [];
  if (!der.some((s) => s.tier === "high") || !der.some((s) => s.tier === "low")) continue;
  idx++; if (split === 'train' && idx % 2) continue; if (split === 'test' && !(idx % 2)) continue;
  const wav = join(corpus, f.replace(/\.json$/, ".wav")); let d; try { d = readFileSync(wav); } catch { continue; }
  used++;
  const SR = d.readUInt32LE(24), HOP = Math.round(128 * SR / 48000); const n = (d.length - 44) / 2;
  const cfg = JSON.parse(JSON.stringify(defaultConfig)); cfg.beatPulse = true; cfg.mode = "smart"; cfg.energyDrivesMode = true;
  const ms0 = 1700000000000; Date.now = () => ms0; performance.now = () => 0;
  const an = new Analyser(JSON.parse(JSON.stringify(defaultConfig))); an.setGainLock(true, 1); const eng = new EffectEngine(cfg); const ol = console.log; console.log = () => {};
  const buf = new Float32Array(HOP); let last = -1; const acc = { high: [0, 0], low: [0, 0] };
  for (let off = 0; off + HOP <= n; off += HOP) {
    for (let i = 0; i < HOP; i++) buf[i] = d.readInt16LE(44 + (off + i) * 2) / 32768;
    const t = off / SR, ms = ms0 + t * 1000; an.setVirtualClock(ms); Date.now = () => ms; performance.now = () => ms - ms0;
    const fr = an.process(buf); if (fr.kick) eng.registerKick(0.4 + Math.min(1, fr.energy * 1.4) * 0.6);
    if (fr.bpm > 0) { if (!cfg.beat || Math.abs(cfg.beat.bpm / fr.bpm - 1) > 0.03) cfg.beat = { anchorMs: fr.beatAnchorMs || ms, bpm: fr.bpm, confidence: fr.bpmConfidence }; else cfg.beat.confidence = fr.bpmConfidence; }
    if (ms - last >= 25) { last = ms; const o = eng.render(fr); if (t < 20) continue; const seg = der.find((s) => t >= s.start && t < s.end); if (!seg || !(seg.tier in acc)) continue;
      let v = 0; for (let k = 0; k < 4; k++) v += Math.max(o[k * 7], o[k * 7 + 1], o[k * 7 + 2]); acc[seg.tier][0] += v / 4 / 2.55; acc[seg.tier][1]++; }
  }
  console.log = ol;
  const hi = acc.high[1] ? acc.high[0] / acc.high[1] : NaN, lo = acc.low[1] ? acc.low[0] / acc.low[1] : NaN;
  if (acc.high[1] > 80 && acc.low[1] > 80) out.push([f.slice(0, 28), hi, lo]);
}
for (const [f, hi, lo] of out) console.log(`${f.padEnd(28)} refrang ${hi.toFixed(0).padStart(3)}  vers ${lo.toFixed(0).padStart(3)}  kvot ${(hi / lo).toFixed(2)}`);
const r = out.map((x) => x[1] / x[2]).sort((a, b) => a - b);
const g = out.map((x) => Math.log(x[1] / x[2])); const gm = Math.exp(g.reduce((a, b) => a + b, 0) / g.length); const lvl = out.reduce((a, x) => a + (x[1] + x[2]) / 2, 0) / out.length;
console.log(`SUMMA ${out.length} latar: geomedel ${gm.toFixed(2)}, medelljus ${lvl.toFixed(0)}, kvot median ${r[r.length >> 1]?.toFixed(2)}, refrang ljusare i ${r.filter((x) => x > 1.1).length}, ungefar lika ${r.filter((x) => x >= 0.9 && x <= 1.1).length}, vers ljusare ${r.filter((x) => x < 0.9).length}`);
