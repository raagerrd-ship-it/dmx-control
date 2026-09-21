/** Basgangsmatt (profile.bassline) genom en WAV, 5 s-medel: hur stor andel av laten dirigenten skulle
 *  se som "tydlig basgang" (>= DMX_CLEAR_BASS, 0,5). node tools/basslineProbe.mjs tools/stranden.wav [tröskel] */
import { readFileSync } from "node:fs";
const { Analyser } = await import("../dist/analyser.js");
const { defaultConfig } = await import("../dist/config.js");
const path = process.argv[2]; const TH = Number(process.argv[3] ?? 0.5);
const d = readFileSync(path); const nSamples = (d.readUInt32LE(40) || d.length - 44) / 2; const HOP = 128;
const an = new Analyser(JSON.parse(JSON.stringify(defaultConfig))); an.setGainLock(true, 1);
const buf = new Float32Array(HOP); const rows = []; let acc = 0, accOpb = 0, accBass = 0, n = 0, bin = 0, clear = 0, tot = 0;
for (let off = 0; off + HOP <= nSamples; off += HOP) {
  for (let i = 0; i < HOP; i++) buf[i] = d.readInt16LE(44 + (off + i) * 2) / 32768;
  const ms = (off / 48000) * 1000; an.setVirtualClock(ms); const f = an.process(buf);
  if (ms < 5000) continue;
  acc += f.profile.bassline; accOpb += an.bassOnsetsPerBeat; accBass += f.profile.bass; n++; tot++; if (f.profile.bassline >= TH) clear++;
  if (Math.floor(ms / 5000) !== bin) { bin = Math.floor(ms / 5000); rows.push(`${String(Math.round(ms / 1000)).padStart(4)}s bassline ${(acc / n).toFixed(2)} opb ${(accOpb / n).toFixed(2)} bass ${(accBass / n).toFixed(2)} bpm ${f.bpm.toFixed(0)}`); acc = accOpb = accBass = 0; n = 0; }
}
console.log(path, `andel >= ${TH}: ${(100 * clear / tot).toFixed(0)} %`);
console.log(rows.join("\n"));
