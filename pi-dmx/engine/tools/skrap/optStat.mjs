// Hur stor del av tiden analysatorns heta funktioner är optimerade (TurboFan) i stabilt läge: V8:s optimeringsstatus
// läses varje hop från --fran S s ljud. Kräver --allow-natives-syntax.
//   node --allow-natives-syntax tools/skrap/optStat.mjs <wav> [sek] [--fran S] [--dist dir]
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
const args = process.argv.slice(2);
const opt = (k, dflt) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : dflt; };
const DIST = opt("--dist", null) ? pathToFileURL(opt("--dist") + "/").href : new URL("../../dist/", import.meta.url).href;
const { Analyser } = await import(DIST + "analyser.js");
const { defaultConfig } = await import(DIST + "config.js");
const wav = args[0], SEK = Number(args[1] ?? 600), FRAN = Number(opt("--fran", 300));
const d = readFileSync(wav), n = Math.min((d.length - 44) >> 1, SEK * 48000);
const an = new Analyser(JSON.parse(JSON.stringify(defaultConfig))); an.setGainLock(true, 1);
const buf = new Float32Array(128), EPOCH = 1700000000000;
const FNS = ["computeBpm", "dropStep", "process", "sectionBlock", "fillFrame", "bigStep", "kickStep"];
const turbo = new Map(), tot = new Map();
console.log = () => {};
for (let off = 0; off + 128 <= n; off += 128) {
  for (let i = 0; i < 128; i++) buf[i] = d.readInt16LE(44 + (off + i) * 2) / 32768;
  const ms = EPOCH + off / 48; an.setVirtualClock(off / 48); Date.now = () => ms; performance.now = () => off / 48;
  an.process(buf);
  if (off / 48000 >= FRAN) for (const f of FNS) {
    const st = %GetOptimizationStatus(Analyser.prototype[f]);
    tot.set(f, (tot.get(f) ?? 0) + 1); if (st & 64) turbo.set(f, (turbo.get(f) ?? 0) + 1);   // bit 6 = TurboFan-kod
  }
}
for (const f of FNS) process.stdout.write(f.padEnd(14) + " TurboFan " + (100 * (turbo.get(f) ?? 0) / tot.get(f)).toFixed(0) + " % av tiden\n");
