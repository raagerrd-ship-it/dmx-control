// Förladdas (--import, kräver --allow-natives-syntax): %DebugPrint av motorn och dess ctx vid render nr DP_AT och DP_AT+1 (skräpjakten 10-18).
// Ett tal vars HeapNumber-adress byts mellan två rutor ligger i ett TAGGAT fält (ny box per skrivning); samma adress = dubbelfält (på plats).
const { EffectEngine } = await import(new URL("../../dist/effects.js", import.meta.url).href);
const dp = new Function("o", "%DebugPrint(o)"); const AT = Number(process.env.DP_AT ?? 100000); let n = 0;
const orig = EffectEngine.prototype.render;
EffectEngine.prototype.render = function (fr) { const r = orig.call(this, fr); n++; if (n === AT || n === AT + 1) { process.stdout.write(`#DP ${n}\n`); dp(this.ctx); dp(this); } return r; };
