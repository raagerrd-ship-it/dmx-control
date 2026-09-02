import { readFileSync } from "node:fs";
const mod = process.env.OLD ? "../dist/analyserOld.js" : "../dist/analyser.js";
const { Analyser } = await import(mod);
const { defaultConfig } = await import("../dist/config.js");
const d = readFileSync(process.argv[2]);
const nSamples = d.readUInt32LE(40) / 2;
const HOP = 128;
const an = new Analyser(JSON.parse(JSON.stringify(defaultConfig)));
an.setGainLock(true, 1);
const buf = new Float32Array(HOP);
const out = [];
for (let off = 0; off + HOP <= nSamples; off += HOP) {
  for (let i = 0; i < HOP; i++) buf[i] = d.readInt16LE(44 + (off + i) * 2) / 32768;
  const ms = (off / 48000) * 1000;
  an.setVirtualClock(ms);
  const f = an.process(buf);
  if (Math.round(ms) % 1000 < 3 && f.bpm > 0) out.push(`${(ms/1000).toFixed(0)}s:${f.bpm.toFixed(0)}`);
}
console.log((process.env.OLD ? "UTAN: " : "MED : ") + out.join(" "));
