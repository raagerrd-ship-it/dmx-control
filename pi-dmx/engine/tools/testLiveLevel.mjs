/** "LIV" I NIVAN: kor en WAV genom analysatorn + effektmotorn (virtuell klocka) och mater hur mycket
 *  DMX-ljusets summa ror sig pa SLAGSKALA (std inom 2 s-fonster) och pa SEKTIONSSKALA (std av 10 s-medel).
 *   DMX_LIVE_LEVEL=1 node tools/testLiveLevel.mjs tools/pop_ladan.wav [startS] [sekunder] */
import { readFileSync } from "node:fs";
const { Analyser } = await import("../dist/analyser.js");
const { EffectEngine } = await import("../dist/effects.js");
const { defaultConfig } = await import("../dist/config.js");
const f = process.argv[2] || "tools/pop_ladan.wav", startS = Number(process.argv[3] || 60), secs = Number(process.argv[4] || 60);
const d = readFileSync(f); const n = (d.length - 44) / 2; const SR = 48000, HOP = 128;
const cfg = JSON.parse(JSON.stringify(defaultConfig)); cfg.beatPulse = true; cfg.mode = process.env.MODE || "mono"; if (cfg.mode === "smart") cfg.energyDrivesMode = true;
const an = new Analyser(JSON.parse(JSON.stringify(defaultConfig))); an.setGainLock(true, 1);
const eng = new EffectEngine(cfg);
const buf = new Float32Array(HOP); let ms0 = 1700000000000; let lastRender = -1; const out = [];
let fr = null;
for (let off = 0; off + HOP <= n && off < (startS + secs) * SR; off += HOP) {
  for (let i = 0; i < HOP; i++) buf[i] = d.readInt16LE(44 + (off + i) * 2) / 32768;
  const ms = ms0 + (off / SR) * 1000; an.setVirtualClock(ms);
  Date.now = () => ms; performance.now = () => ms - 1700000000000;
  fr = an.process(buf);
  if (fr.kick) eng.registerKick(0.4 + Math.min(1, fr.energy * 1.4) * 0.6);   // som index.ts:394 (matfalla 36)
  if (fr.bpm > 0) { if (!cfg.beat || Math.abs(cfg.beat.bpm / fr.bpm - 1) > 0.03) cfg.beat = { anchorMs: fr.beatAnchorMs || ms, bpm: fr.bpm, confidence: fr.bpmConfidence }; else cfg.beat.confidence = fr.bpmConfidence; }   // stabilt ankare som motorns PLL
  if (off / SR >= startS && ms - lastRender >= 25) { lastRender = ms; const u = eng.render(fr); let v = 0; for (let i = 0; i < u.length; i++) v += u[i]; out.push([off / SR, v / u.length]); }
}
const v = out.map((x) => x[1]); const mean = v.reduce((a, b) => a + b, 0) / v.length;
const win = 80; const stds = []; const means = [];
for (let i = 0; i + win <= v.length; i += win) { const w = v.slice(i, i + win); const m = w.reduce((a, b) => a + b, 0) / win; means.push(m); stds.push(Math.sqrt(w.reduce((a, b) => a + (b - m) ** 2, 0) / win)); }
const med = (a) => [...a].sort((x, y) => x - y)[a.length >> 1];
const sm = means.length ? Math.sqrt(means.reduce((a, b) => a + (b - mean) ** 2, 0) / means.length) : 0;
console.log(`${process.env.DMX_LIVE_LEVEL === '1' ? 'LIVE_LEVEL' : 'standard  '} ${f} ${startS}-${startS + secs}s: medel ${mean.toFixed(2)} | slagskala (std i 2 s) median ${med(stds).toFixed(3)} | sektionsskala (std av 2 s-medel) ${sm.toFixed(3)} | min ${Math.min(...v).toFixed(2)} max ${Math.max(...v).toFixed(2)}`);
