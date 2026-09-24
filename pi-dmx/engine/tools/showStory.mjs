// Anvandning: env $(ladan-env) node tools/showStory.mjs dist tools/pop_ladan.wav 600   (dist-katalogen som forsta argument)
// Drejbok: kor en WAV genom analysator + latgrans + effektmotor (som index.ts) och skriver per lat: sektioner med vald look, ljus, puls, drops.
import { readFileSync } from "node:fs"; import { pathToFileURL } from "node:url";
const [distDir, wav, secsArg] = process.argv.slice(2); const u = (f) => pathToFileURL(distDir + "/" + f).href;
const { Analyser } = await import(u("analyser.js")); const { EffectEngine } = await import(u("effects.js")); const { defaultConfig } = await import(u("config.js"));
const { BoundaryDetector } = await import(u("boundaryDetector.js"));
const d = readFileSync(wav); const n = (d.length - 44) / 2; const SR = 48000, HOP = 128; const SECS = Number(secsArg || 600);
const cfg = JSON.parse(JSON.stringify(defaultConfig)); cfg.beatPulse = true; cfg.mode = "smart"; cfg.energyDrivesMode = true;
const an = new Analyser(JSON.parse(JSON.stringify(defaultConfig))); an.setGainLock(true, 1); const eng = new EffectEngine(cfg);
let nowMs = 1700000000000; const bounds = new BoundaryDetector(() => nowMs); an.setSpectrumSink((m, b) => bounds.pushSpectrum(m, b)); let lastB = 0;
const logs = []; const origLog = console.log; let tNow = 0; console.log = (...a) => { const s = a.join(" "); if (/^\[(dirigent|song|dropfire|minidrop)\]/.test(s)) logs.push([tNow, s]); };
const buf = new Float32Array(HOP); const ms0 = 1700000000000; let last = -1; const rows = [];
for (let off = 0; off + HOP <= n && off < SECS * SR; off += HOP) {
  for (let i = 0; i < HOP; i++) buf[i] = d.readInt16LE(44 + (off + i) * 2) / 32768;
  const ms = ms0 + (off / SR) * 1000; nowMs = ms; tNow = off / SR; an.setVirtualClock(ms); Date.now = () => ms; performance.now = () => ms - ms0;
  const fr = an.process(buf); bounds.tick({ level: fr.level, bpm: fr.bpm, bpmConfidence: fr.bpmConfidence });
  if (bounds.boundaryCount !== lastB) { lastB = bounds.boundaryCount; eng.softenRange(); if (process.env.DMX_BOUNDARY_SOFT) an.hintTrackChange(5000); else an.resetTempo(); }
  if (fr.kick) eng.registerKick(0.4 + Math.min(1, fr.energy * 1.4) * 0.6);
  if (fr.bpm > 0) { if (!cfg.beat || Math.abs(cfg.beat.bpm / fr.bpm - 1) > 0.03) cfg.beat = { anchorMs: fr.beatAnchorMs || ms, bpm: fr.bpm, confidence: fr.bpmConfidence }; else cfg.beat.confidence = fr.bpmConfidence; }
  if (ms - last >= 25) { last = ms; const o = eng.render(fr); let v = 0; for (let f = 0; f < 4; f++) v += Math.max(o[f * 7], o[f * 7 + 1], o[f * 7 + 2]); rows.push({ t: tNow, look: eng.activeMode || eng.smartMode, sec: fr.section, lvl: 100 * v / 4 / 255, bw: eng.beatW ?? 1, bpm: fr.bpm, lvh: fr.levelVsHighDb ?? 0 }); }
}
console.log = origLog;
// latgranser ur loggen
const songStarts = [0, ...logs.filter(([, s]) => s.startsWith("[song]")).map(([t]) => t)];
const drops = logs.filter(([, s]) => s.startsWith("[dropfire]")).map(([t]) => t);
const out = [];
for (let k = 0; k < songStarts.length; k++) {
  const a = songStarts[k], b = k + 1 < songStarts.length ? songStarts[k + 1] : rows[rows.length - 1].t;
  const R = rows.filter((r) => r.t >= a && r.t < b); if (R.length < 40) continue;
  // segment = sammanhangande (sektion, look)
  const segs = []; for (const r of R) { const L = segs[segs.length - 1]; if (L && L.sec === r.sec && L.look === r.look) { L.b = r.t; L.lv.push(r.lvl); L.bw.push(r.bw); } else segs.push({ a: r.t, b: r.t, sec: r.sec, look: r.look, lv: [r.lvl], bw: [r.bw] }); }
  const merged = segs.filter((s) => s.b - s.a >= 3);
  const bpmM = [...R.map((r) => r.bpm)].sort((x, y) => x - y)[R.length >> 1];
  out.push(`\n=== LAT ${k + 1}: ${a.toFixed(0)}-${b.toFixed(0)} s (${(b - a).toFixed(0)} s), tempo ~${bpmM}, drops ${drops.filter((t) => t >= a && t < b).map((t) => (t - a).toFixed(0) + "s").join(" ") || "-"}`);
  for (const s of merged) { const lv = s.lv.reduce((x, y) => x + y, 0) / s.lv.length; const bw = s.bw.reduce((x, y) => x + y, 0) / s.bw.length;
    out.push(`  ${(s.a - a).toFixed(0).padStart(4)}-${(s.b - a).toFixed(0).padEnd(4)} ${String(s.sec).padEnd(6)} ${String(s.look).padEnd(12)} ljus ${lv.toFixed(0).padStart(3)}  ${bw > 0.6 ? "takt" : bw < 0.3 ? "energi" : "blandat"}`); }
  // show-bedomning per lat
  const bySec = {}; for (const s of merged) (bySec[s.sec] ||= new Set()).add(s.look);
  const lvSec = {}; for (const r of R) (lvSec[r.sec] ||= []).push(r.lvl);
  out.push(`  -> looker per sektionstyp: ${Object.entries(bySec).map(([k2, v]) => `${k2}: ${[...v].join("/")}`).join(" | ")}`);
  out.push(`  -> ljus per sektionstyp: ${Object.entries(lvSec).map(([k2, v]) => `${k2} ${(v.reduce((x, y) => x + y, 0) / v.length).toFixed(0)}`).join(", ")}`);
}
process.stdout.write(out.join("\n") + "\n");
