// Förladdas (--import) i en bänk som kör EffectEngine.render: räknar varje rendering från 300 s ljud hur stor del av tiden analysatorns
// metoder är TurboFan-optimerade och skriver ut vid processens slut. Kräver --allow-natives-syntax (via node-flaggan).
//   node --allow-natives-syntax --import ./tools/skrap/optHook.mjs tools/konsertReplay.mjs <wav> --delad-cfg --step 5 --json ut.json
const FNS = ["computeBpm", "dropStep", "process", "sectionBlock", "templStep", "repeatStep", "fillFrame", "bigStep", "alignScore", "tempoGramStep", "offBeatStep"];
const { Analyser } = await import(new URL("../../dist/analyser.js", import.meta.url).href);
const { EffectEngine } = await import(new URL("../../dist/effects.js", import.meta.url).href);
const status = new Function("f", "return %GetOptimizationStatus(f)");
const tot = new Map(), tf = new Map(); const orig = EffectEngine.prototype.render;
EffectEngine.prototype.render = function (fr) {
  if (Date.now() - 1700000000000 >= 300000) for (const f of FNS) { const fn = Analyser.prototype[f]; if (!fn) continue; tot.set(f, (tot.get(f) ?? 0) + 1); if (status(fn) & 64) tf.set(f, (tf.get(f) ?? 0) + 1); }
  return orig.call(this, fr);
};
process.on("exit", () => { for (const f of FNS) if (tot.get(f)) process.stderr.write(f.padEnd(14) + " TurboFan " + (100 * (tf.get(f) ?? 0) / tot.get(f)).toFixed(0) + " %\n"); });
