import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
const { Analyser } = await import(pathToFileURL(process.argv[3]).href);
const { defaultConfig } = await import(pathToFileURL(process.argv[4]).href);
const d = readFileSync(process.argv[2]); const n = (d.length - 44) >> 1; const HOP = 128;
const an = new Analyser(JSON.parse(JSON.stringify(defaultConfig))); an.setGainLock(true, 1);
const buf = new Float32Array(HOP); let nextT = 0, prevBpm = 0, firstLock = -1;
const rows = [];
for (let off = 0; off + HOP <= n; off += HOP) {
  for (let i = 0; i < HOP; i++) buf[i] = d.readInt16LE(44 + (off + i) * 2) / 32768;
  const ms = (off / 48000) * 1000; an.setVirtualClock(ms); const f = an.process(buf);
  if (f.bpm > 0 && firstLock < 0) firstLock = ms / 1000;
  if (ms >= nextT) { rows.push([ms / 1000, f.bpm, f.bpmConfidence ?? 0]); nextT += 1000; }
}
console.log(`FÖRSTA LÅS: ${firstLock.toFixed(2)}s`);
console.log("t(s)  bpm   conf   (>>> = tempohopp >8%)");
for (const [t, b, c] of rows) {
  const jump = prevBpm > 0 && b > 0 && Math.abs(b / prevBpm - 1) > 0.08;
  console.log(`${String(Math.round(t)).padStart(4)}  ${b.toFixed(0).padStart(4)}  ${c.toFixed(2)}  ${jump ? ">>> " + prevBpm.toFixed(0) + "->" + b.toFixed(0) : ""}`);
  if (b > 0) prevBpm = b;
}
