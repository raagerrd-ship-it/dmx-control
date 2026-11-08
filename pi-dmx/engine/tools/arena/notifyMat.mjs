// TVÅ VÄGAR (2026-11-08): VÄCKNINGSKOSTNADEN i huvudtråden för tools/feedRealtid.mjs (finalens bonus). Laddas med
// NODE_OPTIONS=--import=<denna fil> + TVAVAGAR_NOTIFY_OUT=<json>; mäter varje Atomics.notify i HUVUDTRÅDEN (antal + µs, performance.now
// runt anropet - all väckning av workern går via Atomics.notify; postMessage är inte tillåtet för kommandon) och skriver vid exit
// {n, us}. Workern rörs inte. Utan TVAVAGAR_NOTIFY_OUT gör filen ingenting.
import { writeFileSync } from 'node:fs';
import { isMainThread } from 'node:worker_threads';
if (isMainThread && process.env.TVAVAGAR_NOTIFY_OUT) {
  const orig = Atomics.notify; const pnow = performance.now.bind(performance); let n = 0, us = 0;
  Atomics.notify = function notify(a, i, c) { const t = pnow(); const r = orig.call(Atomics, a, i, c); us += (pnow() - t) * 1000; n++; return r; };
  process.on('exit', () => { try { writeFileSync(process.env.TVAVAGAR_NOTIFY_OUT, JSON.stringify({ n, us: +us.toFixed(1) })); } catch { /* */ } });
}
