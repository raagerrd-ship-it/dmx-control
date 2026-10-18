// OPTIMERINGSSVEP (10-18, ägaren: "varför inte gå över alla, t.ex. computeBpm?"). Förladdas (--import, kräver --allow-natives-syntax):
// för VARJE metod i Analyser, EffectEngine, BoundaryDetector och BeatFeed + alla effekters render + hsvToRgb mäts, från OPT_FROM_S s
// virtuell tid, andelen rutor där funktionen är TurboFan-kod (V8 10/12: statusbit 6) och hur många gånger den tappat den (deopt).
// Bara funktioner som faktiskt anropats i fönstret listas; sorterat på lägst andel. Kör på Node 18 (Pi:ernas V8) och andra varvet:
//   OPT_FROM_S=900 C:/Users/richa/node18/node-v18.20.4-win-x64/node --allow-natives-syntax --import file:///.../optAll.mjs \
//     tools/skrap/skrapReplay.mjs <wav> --step 5 --varv 2
const D = new URL("../../dist/", import.meta.url).href;
const st = new Function("f", "return %GetOptimizationStatus(f)");
const FROM = Number(process.env.OPT_FROM_S ?? 900) * 1000;
const fns = {};
const add = (name, obj, key) => { const f = obj[key]; if (typeof f === "function") fns[name] = { obj, key, f, calls: 0 }; };
for (const [mod, cls] of [["analyser.js", "Analyser"], ["effects.js", "EffectEngine"], ["boundaryDetector.js", "BoundaryDetector"], ["beatFeed.js", "BeatFeed"]]) {
  const M = await import(D + mod), C = M[cls]; if (!C) continue;
  for (const k of Object.getOwnPropertyNames(C.prototype)) if (k !== "constructor" && typeof Object.getOwnPropertyDescriptor(C.prototype, k).value === "function") add(`${cls}.${k}`, C.prototype, k);
}
const { EFFECT_MAP } = await import(D + "effects/registry.js");
for (const [k, e] of EFFECT_MAP) add(`fx:${k}`, e, "render");
const C = await import(D + "effects/color.js"); fns["hsvToRgb"] = { f: C.hsvToRgb, calls: 0 };
// räkna anrop i fönstret utan att byta funktionsobjekten (statusen ska gälla originalet): vi läser bara status per ruta
const tot = {}, tf = {}, drop = {}, was = {};
const { EffectEngine } = await import(D + "effects.js");
const orig = EffectEngine.prototype.render; let n = 0;
EffectEngine.prototype.render = function (fr) {
  const r = orig.call(this, fr);
  if (Date.now() - 1700000000000 >= FROM && (++n & 7) === 0) for (const k in fns) {
    const s = st(fns[k].f), on = (s & 64) !== 0, ran = (s & 1) !== 0;   // bit 0 = är en funktion; körd minst en gång syns i att den inte är 'never optimized'-tom
    if (!(s & (16 | 32 | 64)) && !tot[k]) { /* aldrig optimerad - räknas ändå om den körs */ }
    tot[k] = (tot[k] ?? 0) + 1; if (on) tf[k] = (tf[k] ?? 0) + 1;
    if (was[k] && !on) drop[k] = (drop[k] ?? 0) + 1; was[k] = on;
  }
  return r;
};
// vilka som körts i fönstret: lindas efter importen av replayen? enklare: V8:s status bit 4/5/6 (interpreted/sparkplug/turbofan) sätts först när
// funktionen körts - funktioner med bara bit 0 i hela fönstret listas inte.
const ever = {};
const orig2 = EffectEngine.prototype.render;
EffectEngine.prototype.render = function (fr) { const r = orig2.call(this, fr); if (Date.now() - 1700000000000 >= FROM && (n & 255) === 0) for (const k in fns) { const s = st(fns[k].f); if (s & (8 | 16 | 32 | 64 | 2048)) ever[k] = true; } return r; };
process.on("exit", () => {
  const rows = Object.keys(tot).filter((k) => ever[k]).map((k) => [k, 100 * (tf[k] ?? 0) / tot[k], drop[k] ?? 0, fns[k].f.toString().length]);
  rows.sort((a, b) => a[1] - b[1]);
  process.stderr.write(`\nTurboFan-andel från ${FROM / 1000} s (rutor var 8:e), deopt = antal tapp, källa = källkodens längd (tecken)\n`);
  for (const [k, p, d, len] of rows) process.stderr.write(`${p.toFixed(0).padStart(4)} %  deopt ${String(d).padStart(3)}  källa ${String(len).padStart(6)}  ${k}\n`);
});
