// Kör bara analysatorn N s (virtuell klocka) med en tidsmarkör per minut ljud på stdout - för V8-spårning
// (--trace-opt/--trace-deopt) av analysatorns heta funktioner i stabilt läge. Med --fran S: allokering per
// funktion (V8 samplande heap-profilerare inkl. bortstädat skräp) från S s ljud till slutet, kB per s ljud.
//   node [v8-flaggor] tools/skrap/anaForm.mjs <wav> [sek] [--dist dir] [--fran S]
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { Session } from "node:inspector";
const args = process.argv.slice(2);
const opt = (k, dflt) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : dflt; };
const DIST = opt("--dist", null) ? pathToFileURL(opt("--dist") + "/").href : new URL("../../dist/", import.meta.url).href;
const { Analyser } = await import(DIST + "analyser.js");
const { defaultConfig } = await import(DIST + "config.js");
const wav = args[0], SEK = Number(args[1] ?? 120), FRAN = Number(opt("--fran", -1));
const d = readFileSync(wav), n = Math.min((d.length - 44) >> 1, SEK * 48000);
const an = new Analyser(JSON.parse(JSON.stringify(defaultConfig))); an.setGainLock(true, 1);
const buf = new Float32Array(128), EPOCH = 1700000000000;
const ses = new Session(); ses.connect(); let started = false;
const SAMPLE = { samplingInterval: 4096, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true };
console.log = () => {};
for (let off = 0; off + 128 <= n; off += 128) {
  for (let i = 0; i < 128; i++) buf[i] = d.readInt16LE(44 + (off + i) * 2) / 32768;
  const ms = EPOCH + off / 48; an.setVirtualClock(off / 48); Date.now = () => ms; performance.now = () => off / 48;
  if (FRAN >= 0 && !started && off / 48000 >= FRAN) { started = true; ses.post("HeapProfiler.enable"); ses.post("HeapProfiler.startSampling", SAMPLE); }
  an.process(buf);
  if (off % (48000 * 60) < 128) process.stdout.write("### t=" + off / 48000 + " s\n");
}
if (started) ses.post("HeapProfiler.stopSampling", (e, r) => {
  const tot = new Map();
  const walk = (nd) => { const k = (nd.callFrame.url.split("/").pop() || "(native)") + ":" + (nd.callFrame.functionName || "(anon)"); tot.set(k, (tot.get(k) ?? 0) + nd.selfSize); nd.children.forEach(walk); };
  walk(r.profile.head);
  const secs = n / 48000 - FRAN;
  for (const [k, v] of [...tot].sort((a, b) => b[1] - a[1]).slice(0, 15)) process.stdout.write((v / 1024 / secs).toFixed(1).padStart(8) + " kB/s  " + k + "\n");
});
process.stdout.write("klart\n");
