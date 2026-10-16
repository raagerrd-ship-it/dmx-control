/**
 * ALLOKERINGSPROFIL (10-16, GC-jakten: "hur skapar vi mindre skräp"). Kör konsertReplay (analysator + beatFeed + effektmotor, samma
 * koppel som live) under V8:s samplande heap-profilerare MED objekt som städats bort av minor/major GC - alltså allt skräp, inte bara
 * det som lever kvar - och skriver bytes per sekund ljud per källa (fil:funktion:rad), sorterat. Bänkens egna rader (konsertReplay,
 * allocProf) visas separat så de inte förväxlas med motorn.
 *   node tools/allocProf.mjs <wav> [--step 5] [--top 40] [--sekunder 120] [--dist <patchad dist-kopia>]
 * (--sekunder: profilera bara de första N s av filen via en avkortad kopia i temp.)
 */
import { Session } from "node:inspector/promises";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, basename } from "node:path";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
let wav = args.find((a) => a.endsWith(".wav"));
const TOP = Number(opt("--top", 40)), STEP = opt("--step", "5"), SEK = Number(opt("--sekunder", 0));
const tmp = mkdtempSync(join(tmpdir(), "allocprof-"));
if (SEK > 0) {   // avkortad kopia: 44 byte huvud + SEK s mono 16 bit 48 kHz
  const d = readFileSync(wav), n = Math.min(d.length, 44 + SEK * 48000 * 2);
  const c = Buffer.from(d.subarray(0, n)); c.writeUInt32LE(n - 8, 4); c.writeUInt32LE(n - 44, 40);
  wav = join(tmp, basename(wav)); writeFileSync(wav, c);
}
const secs = (readFileSync(wav).length - 44) / 96000;

const s = new Session(); s.connect();
await s.post("HeapProfiler.enable");
await s.post("HeapProfiler.startSampling", { samplingInterval: 4096, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
process.argv = [process.argv[0], "konsertReplay.mjs", wav, "--delad-cfg", "--step", STEP, "--json", join(tmp, "r.json"), ...(opt("--dist", null) ? ["--dist", opt("--dist")] : [])];
const t0 = Date.now();
const realNow = Date.now;
await import(pathToFileURL(new URL("./konsertReplay.mjs", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")).href);
const { profile } = await s.post("HeapProfiler.stopSampling");

// summera själv-allokeringar per nod (fil:funktion:rad)
const per = new Map();
let tot = 0;
(function walk(n) {
  const self = n.selfSize ?? 0;
  if (self > 0) {
    const f = n.callFrame, file = (f.url || "(native)").split(/[\\/]/).pop();
    const k = `${file}:${f.functionName || "(anon)"}:${f.lineNumber + 1}`;
    per.set(k, (per.get(k) ?? 0) + self); tot += self;
  }
  for (const c of n.children ?? []) walk(c);
})(profile.head);
const rows = [...per].sort((a, b) => b[1] - a[1]);
const kb = (b) => (b / 1024 / secs).toFixed(1).padStart(8);
const bench = (k) => /^(konsertReplay|allocProf)\.mjs/.test(k);
const engTot = rows.filter(([k]) => !bench(k)).reduce((a, [, v]) => a + v, 0);
const byFile = new Map(); for (const [k, v] of rows) if (!bench(k)) { const f = k.split(":")[0]; byFile.set(f, (byFile.get(f) ?? 0) + v); }
console.error = () => {};
process.stdout.write(`\n${basename(wav)}: ${secs.toFixed(0)} s ljud, step ${STEP} ms, ${((realNow() - t0) / 1000).toFixed(0)} s körning\n`);
process.stdout.write(`motorn allokerar ${kb(engTot)} kB per s ljud (bänken ${kb(tot - engTot)} kB/s)\n\nper fil (kB/s):\n`);
for (const [f, v] of [...byFile].sort((a, b) => b[1] - a[1]).slice(0, 15)) process.stdout.write(`${kb(v)}  ${(100 * v / engTot).toFixed(1).padStart(5)} %  ${f}\n`);
process.stdout.write(`\nper källa (kB/s):\n`);
for (const [k, v] of rows.filter(([k]) => !bench(k)).slice(0, TOP)) process.stdout.write(`${kb(v)}  ${(100 * v / engTot).toFixed(1).padStart(5)} %  ${k}\n`);
process.exit(0);
