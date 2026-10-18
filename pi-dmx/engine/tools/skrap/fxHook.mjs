// Förladdas med en dist-kopia där renderLamps anropar globalThis.__fxCall(effect, ctx) i st f effect.render(ctx) (skräpjakten 10-18):
// allokerat per effektanrop och effekt från FX_FROM_S s ljud (used_heap före/efter, minus mätningens egen kostnad i samma kodväg),
// uppdelat på första sekunden efter lookbytet (~750 anrop) och resten.
import v8 from "node:v8";
const hs = () => v8.getHeapStatistics().used_heap_size, FROM = Number(process.env.FX_FROM_S ?? 900) * 1000, acc = new Map();
let lastKey = "", since = 0;
globalThis.__fxCall = (e, c) => {
  if (e.key !== lastKey) { lastKey = e.key; since = 0; } since++;
  if (Date.now() - 1700000000000 < FROM) return e.render(c);
  const u0 = hs(), u1 = hs(); const r = e.render(c); const u2 = hs();
  if (u2 >= u0) { let a = acc.get(e.key); if (!a) acc.set(e.key, a = [0, 0, 0, 0]); const j = since <= 750 ? 0 : 2; a[j] += (u2 - u1) - (u1 - u0); a[j + 1]++; }
  return r;
};
process.on("exit", () => { for (const [k, a] of [...acc].sort((x, y) => (y[1][0] + y[1][2]) - (x[1][0] + x[1][2]))) process.stderr.write(`${k.padEnd(14)} ${((a[0] + a[2]) / (a[1] + a[3])).toFixed(0).padStart(5)} B/anrop  första s: ${(a[0] / Math.max(1, a[1])).toFixed(0).padStart(5)} B x ${a[1]}  sedan: ${(a[2] / Math.max(1, a[3])).toFixed(0).padStart(5)} B x ${a[3]}\n`); });
