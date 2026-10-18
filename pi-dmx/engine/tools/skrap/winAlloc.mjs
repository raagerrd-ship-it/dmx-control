// Förladdas (--import): allokerade byte per sekund ljud i ett virtuellt tidsfönster, mätt som tillväxt i used_heap_size - fungerar
// på Node 18 (Pi:ernas version), vars samplande heap-profilerare bara visar överlevare (den kör en GC före rapporten; flaggorna
// includeObjectsCollectedBy*GC finns först i V8 11). Kör med stor ung generation så ingen GC sker i fönstret, t.ex.
//   node --min-semi-space-size=512 --max-semi-space-size=512 --import file:///.../winAlloc.mjs <bänk> ...
// env: WIN_MOD (file-URL till modulen; utan WIN_MOD anropar bänken själv globalThis.__winPatch(klass) efter sin import - lotus
//      engineReplay, vars moduler måste laddas efter dess egna hooks), WIN_CLASS, WIN_METHOD (anropet som klockar fönstret), WIN_FROM_S, WIN_TO_S (ljud-s),
//      WIN_EPOCH (virtuella klockans nollpunkt, ms). Skriver "winAlloc: X kB/s" på stderr; "GC i fönstret" = måttet ogiltigt.
import v8 from "node:v8";
const name = process.env.WIN_METHOD;
const EP = Number(process.env.WIN_EPOCH ?? 1700000000000), FROM = Number(process.env.WIN_FROM_S) * 1000, TO = Number(process.env.WIN_TO_S) * 1000;
let st = 0, u0 = 0, prev = 0, n = 0, gc = false;
globalThis.__winPatch = (C) => { const orig = C.prototype[name]; C.prototype[name] = function (a0, a1) {   // inga rest-parametrar: ingen array per anrop
  if (st < 2) {
    const t = Date.now() - EP;
    if (st === 0 && t >= FROM) { st = 1; u0 = prev = v8.getHeapStatistics().used_heap_size; }
    else if (st === 1 && (++n & 255) === 0) { const u = v8.getHeapStatistics().used_heap_size; if (u < prev) gc = true; prev = u; }
    if (st === 1 && t >= TO) { st = 2; const u = v8.getHeapStatistics().used_heap_size; if (u < prev) gc = true;
      process.stderr.write(`winAlloc: ${((u - u0) / 1024 / ((TO - FROM) / 1000)).toFixed(1)} kB/s  (${((TO - FROM) / 1000).toFixed(0)} s ljud${gc ? ", GC i fönstret - OGILTIGT" : ""})\n`); }
  }
  return orig.call(this, a0, a1);
}; };
if (process.env.WIN_MOD) globalThis.__winPatch((await import(process.env.WIN_MOD))[process.env.WIN_CLASS]);
// WIN_INCL = "fil-URL#Klass.metod,..." (+ valfritt fler): allokerat INKLUSIVE per metod i fönstret (used_heap före/efter varje anrop,
// minus mätningens egen kostnad mätt i samma kodväg). Kapslade mätta metoder räknas även i den yttre. Utskrift B/anrop och kB/s.
if (process.env.WIN_INCL) {
  const hs = () => v8.getHeapStatistics().used_heap_size;
  const rows = [];
  const wrapAll = () => { for (const ent of process.env.WIN_INCL.split(",")) {
    const [url, cm] = ent.split("#"), [cls, meth] = cm.split(".");
    import(url).then((M) => { const P = M[cls].prototype, o = P[meth], r = { k: cm, b: 0, n: 0 }; rows.push(r);
      P[meth] = function (...a) { if (st !== 1) return o.apply(this, a); const u0 = hs(), u1 = hs(); const x = o.apply(this, a);   /* 10-18: rest-parametrar (förr högst 4 argument); arrayen skapas före u0 och räknas inte */ const u2 = hs(); if (u2 >= u0) { r.b += (u2 - u1) - (u1 - u0); r.n++; } return x; }; });   // (u1-u0) = mätningens egen kostnad i samma kodväg
  } };
  const prevPatch = globalThis.__winPatch; globalThis.__winPatch = (C) => { prevPatch(C); wrapAll(); };
  if (process.env.WIN_MOD) wrapAll();
  process.on("exit", () => { const s = (TO - FROM) / 1000; for (const r of rows.sort((a, b) => b.b - a.b)) process.stderr.write(`  inkl ${r.k.padEnd(34)} ${(r.b / 1024 / s).toFixed(1).padStart(7)} kB/s  ${(r.b / Math.max(1, r.n)).toFixed(0).padStart(6)} B/anrop  ${r.n} anrop\n`); });
}
