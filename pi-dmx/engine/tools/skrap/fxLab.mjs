// Labb (skräpjakten 10-18): efter LAB_AT_S s ljud tas motorns riktiga ctx och en effekt anropas i en tät slinga - allokerat per anrop,
// med ctx-hjälparna utbytta en i taget (hsv/heart/mixedSector/mclk) för att se vilken gräns som boxar.
import v8 from "node:v8";
const D = new URL("../../dist/", import.meta.url).href;
const { EffectEngine } = await import(D + "effects.js"); const { EFFECT_MAP } = await import(D + "effects/registry.js"); const C = await import(D + "effects/color.js");
const hs = () => v8.getHeapStatistics().used_heap_size, AT = Number(process.env.LAB_AT_S ?? 900) * 1000;
const orig = EffectEngine.prototype.render; let done = false;
const ST = process.env.LAB_NAT ? new Function("f", "return %GetOptimizationStatus(f)") : null;   // LAB_NAT=1 kräver --allow-natives-syntax
function per(fx, c, N) { const acc = new Float64Array(1); for (let i = 0; i < 2e4; i++) { const r = fx.render(c); acc[0] += r[0]; } const u0 = hs(); for (let i = 0; i < N; i++) { const r = fx.render(c); acc[0] += r[0]; } return (hs() - u0) / N; }
EffectEngine.prototype.render = function (fr) {
  const r = orig.call(this, fr);
  if (!done && Date.now() - 1700000000000 >= AT) {
    done = true; const c = this.ctx, keep = { hsv: c.hsv, heart: c.heart, mixedSector: c.mixedSector, mclk: c.mclk };
    for (const k of (process.env.LAB_FX ?? "pendel,drumkit,flod,hjarta,party").split(",")) {
      const fx = EFFECT_MAP.get(k); const row = [k.padEnd(10), "som den är", per(fx, c, 2e5).toFixed(1)];
      c.hsv = (h, s, v) => C.hsvToRgb(h, s, v); row.push("hsv-omslag", per(fx, c, 2e5).toFixed(1)); c.hsv = keep.hsv;
      c.heart = () => 1; row.push("heart=1", per(fx, c, 2e5).toFixed(1)); c.heart = keep.heart;
      c.mixedSector = (n) => n % 6; row.push("mixedSector", per(fx, c, 2e5).toFixed(1)); c.mixedSector = keep.mixedSector;
      process.stderr.write(row.join("  ") + " B/anrop\n");
    }
    process.stderr.write(`ctx: ${Object.keys(c).length} egenskaper\n`);
    const SYN = { konst: "return c.hsv(0.3, 1, 0.5);", audio: "return c.hsv(c.audio * 0.1, 1, 0.5);", mclk: "const s = c.mclk(1, 0.5); return c.hsv((s % 16) / 16, 1, 0.5);",
      heart: "return c.hsv(0.3, 1, c.heart(0.3));", sector: "return c.hsv(c.mixedSector(3) / 6, 1, 0.5);", beatFrac: "return c.hsv(0.3, 1, Math.exp(-c.beatFrac / 0.2));",
      drum: "const d = c.drum; return c.hsv(0.3, 1, Math.min(1, d.kick));", spec: "return c.hsv(0.98 + c.frame.spec.bass * 0.04, 1, 0.5);", idx: "return c.hsv(0.3, 1, Math.abs(c.idx - 1.5) / 3);" };
    for (const [k, body] of Object.entries(SYN)) { const f = { render: new Function("c", body) }; process.stderr.write(`syn ${k.padEnd(9)} ${per(f, c, 2e5).toFixed(1)} B/anrop${ST ? "  status " + ST(f.render).toString(2) + " hsv " + ST(C.hsvToRgb).toString(2) : ""}\n`); }
    { const fresh = new Function("const RING = Array.from({ length: 32 }, () => [0.5, 0.5, 0.5]); let ringAt = 0; function out(a, b, c) { const o = RING[ringAt]; ringAt = (ringAt + 1) & 31; o[0] = a; o[1] = b; o[2] = c; return o; } return " + C.hsvToRgb.toString())();
      const keepH = c.hsv; c.hsv = fresh;
      for (const k of ["audio", "beatFrac", "idx"]) { const f = { render: new Function("c", SYN[k]) }; process.stderr.write(`farsk-hsv ${k.padEnd(9)} ${per(f, c, 2e5).toFixed(1)} B/anrop\n`); }
      c.hsv = keepH;
      const direkt = (h) => { const acc = new Float64Array(1); for (let i = 0; i < 2e4; i++) acc[0] += h(i * 1e-5, 1, 0.5 + i * 1e-7)[0]; const u0 = hs(); for (let i = 0; i < 2e5; i++) acc[0] += h(i * 1e-5, 1, 0.5 + i * 1e-7)[0]; return (hs() - u0) / 2e5; };
      process.stderr.write(`direkt original ${direkt(C.hsvToRgb).toFixed(1)} B/anrop, direkt farsk ${direkt(fresh).toFixed(1)} B/anrop\n`); }
    const c2 = { ...c };   // samma egenskaper, ny map
    for (const k of ["audio", "beatFrac", "idx"]) { const f = { render: new Function("c", SYN[k]) }; process.stderr.write(`kopia ${k.padEnd(9)} ${per(f, c2, 2e5).toFixed(1)} B/anrop\n`); }
    for (const k of (process.env.LAB_FX ?? "pendel").split(",")) { const fx = EFFECT_MAP.get(k); process.stderr.write(`kopia ${k.padEnd(9)} ${per({ render: new Function("c", "return (" + fx.render.toString().replace(/^render/, "function") + ")(c)") }, c2, 2e5).toFixed(1)} B/anrop (ny funktion, kopierad ctx)\n`); }
  }
  return r;
};
