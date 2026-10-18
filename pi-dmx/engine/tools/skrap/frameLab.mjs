// RAMLABB (10-18, skräpjakten på Node 18): vilka talfält i analysatorns ram (Frame) packar in vid skrivning? En riktig ram efter
// 20 s ljud; varje talfält (även i spec/onset/drum/profile/specAbs) skrivs med decimaltal i en slinga - B per skrivning.
// 16 B = fältet har inpackad form (V8 'tagged') och varje skrivning i analysatorn (fillFrame m.fl., 375 Hz) skapar skräp.
//   <node18> --min-semi-space-size=1024 --max-semi-space-size=1024 --allow-natives-syntax --import n18compat tools/skrap/frameLab.mjs
import v8 from "node:v8";
const D = new URL("../../dist/", import.meta.url).href;
const { Analyser } = await import(D + "analyser.js");
const { defaultConfig } = await import(D + "config.js");
console.log = () => {};
const hs = () => v8.getHeapStatistics().used_heap_size;
const fast = new Function("o", "return %HasFastProperties(o)");
let ms = 1700000000000; Date.now = () => ms; performance.now = () => ms - 1700000000000;
const an = new Analyser(JSON.parse(JSON.stringify(defaultConfig))); an.setGainLock(true, 1);
const buf = new Float32Array(128); let fr = null;
for (let i = 0; i < 375 * 20; i++) { for (let j = 0; j < 128; j++) buf[j] = Math.sin((i * 128 + j) * 0.05) * 0.3; ms += 128 / 48; an.setVirtualClock(ms - 1700000000000); fr = an.process(buf); }
const rows = [];
function probe(obj, name) {
  process.stderr.write(`${name}: snabba egenskaper ${fast(obj)}, ${Object.keys(obj).length} fält\n`);
  for (const k of Object.keys(obj)) {
    const v = obj[k]; if (typeof v !== "number") continue;
    // värdet räknas fram INNE i skrivfunktionen (ett decimaltal som argument packas alltid in - det vore provets egen kostnad)
    const w = new Function("o", "i", `o[${JSON.stringify(k)}] = 0.37 + i * 1e-9;`);   // egen funktion per fält (monomorf), i är heltal
    for (let i = 0; i < 2e4; i++) w(obj, i);
    const N = 2e5, u0 = hs(); for (let i = 0; i < N; i++) w(obj, i); const u1 = hs();
    obj[k] = v; rows.push([((u1 - u0) / N), name + "." + k]);
  }
}
probe(fr, "frame");
for (const k of ["spec", "onset", "drum", "profile", "specAbs"]) if (fr[k] && typeof fr[k] === "object") probe(fr[k], "frame." + k);
const boxed = rows.filter((r) => r[0] > 8);
process.stderr.write(`\ninpackade fält (B per skrivning): ${boxed.length} av ${rows.length}\n`);
for (const [b, k] of boxed) process.stderr.write(`${b.toFixed(1).padStart(6)}  ${k}\n`);
