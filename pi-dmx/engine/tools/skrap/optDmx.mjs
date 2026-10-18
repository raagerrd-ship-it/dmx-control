// Förladdas (--import, kräver --allow-natives-syntax): andel av rutorna från OPT_FROM_S s där motorns heta funktioner är TurboFan (V8 10/12: bit 6).
const D = new URL("../../dist/", import.meta.url).href;
const { EffectEngine } = await import(D + "effects.js"); const { EFFECT_MAP } = await import(D + "effects/registry.js"); const C = await import(D + "effects/color.js");
const st = new Function("f", "return %GetOptimizationStatus(f)"); const FROM = Number(process.env.OPT_FROM_S ?? 900) * 1000;
const fns = { render: EffectEngine.prototype.render, renderLamps: EffectEngine.prototype.renderLamps, effektNiva: EffectEngine.prototype.effektNiva, hueGlide: EffectEngine.prototype.hueGlide, stepDrop: EffectEngine.prototype.stepDrop, hsvToRgb: C.hsvToRgb };
for (const k of ["drumkit", "backbeat", "duel", "basgang", "hiss", "party"]) fns["fx:" + k] = EFFECT_MAP.get(k)?.render;
const tot = {}, tf = {}; const orig = EffectEngine.prototype.render; let n = 0;
EffectEngine.prototype.render = function (fr) { const r = orig.call(this, fr); if (Date.now() - 1700000000000 >= FROM && (++n & 15) === 0) for (const k in fns) if (fns[k]) { tot[k] = (tot[k] ?? 0) + 1; if (st(fns[k]) & 64) tf[k] = (tf[k] ?? 0) + 1; } return r; };
process.on("exit", () => { for (const k in tot) process.stderr.write(`${k.padEnd(14)} TurboFan ${(100 * (tf[k] ?? 0) / tot[k]).toFixed(0)} %\n`); });
