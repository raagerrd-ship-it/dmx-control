// Förladdas med en dist-kopia där renderLamps anropar globalThis.__fxCall(effect, ctx) i st f effect.render(ctx) (skräpjakten 10-18):
// allokerat per effektanrop och effekt från FX_FROM_S s ljud (used_heap före/efter, minus mätningens egen kostnad i samma kodväg).
import v8 from "node:v8";
const hs = () => v8.getHeapStatistics().used_heap_size, FROM = Number(process.env.FX_FROM_S ?? 900) * 1000, acc = new Map();
globalThis.__fxCall = (e, c) => {
  if (Date.now() - 1700000000000 < FROM) return e.render(c);
  const u0 = hs(), u1 = hs(); const r = e.render(c); const u2 = hs();
  if (u2 >= u0) { let a = acc.get(e.key); if (!a) acc.set(e.key, a = [0, 0]); a[0] += (u2 - u1) - (u1 - u0); a[1]++; }
  return r;
};
process.on("exit", () => { for (const [k, [b, n]] of [...acc].sort((x, y) => y[1][0] - x[1][0])) process.stderr.write(`${k.padEnd(14)} ${(b / n).toFixed(0).padStart(5)} B/anrop  ${n} anrop  ${(b / 1024).toFixed(0)} kB\n`); });
