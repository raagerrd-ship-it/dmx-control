/**
 * STÄDA NÄR RIGGEN ÄR MÖRK (opt-in DMX_GC_DARK=<andel 0..1>, 2026-10-18, ägaren: 'smart städning ... när det är tyst', portat från lotus
 * gcIfNearLimit). Med --heap-growing-percent=200 får gamla minnet växa till ~3x det levande innan V8 städar stort själv (mitt i showen).
 * Här görs i stället en full GC (global.gc, kräver node --expose-gc) när riggen är MÖRK - tystnadsgrinden stängd (ingången under
 * släckgränsen), minst DMX_GC_DARK_MS (1500) sedan nivån föll (uttoningen klar) och den nyss sända DMX-ramen helt släckt - men BARA om
 * gamla minnet nått <andel> av gränsen (levande efter senaste storstädning x tillväxtfaktorn ur nodens egna flaggor), högst en per 60 s.
 * En tvingad GC är en stopp-städning utan inkrementell märkning (lotus Zero 2 W: ~93 ms) - i mörker syns den inte. Ljusvägen rörs inte:
 * modulen läser bara mörkret (effects.darkForMs) och den sända ramen. Varje städning registreras i GET /api/perf (perfStats.noteForcedGc).
 * 0/osatt = av.
 */
import { getHeapStatistics, getHeapSpaceStatistics } from "node:v8";
import { PerformanceObserver, constants } from "node:perf_hooks";
import { noteForcedGc } from "./perfStats.js";

const FRAC = 0.6;
const DARK_MS = 1500;
const GC_FN: (() => void) | null = typeof (globalThis as { gc?: unknown }).gc === "function" ? (globalThis as unknown as { gc: () => void }).gc : null;
const HEAP_GROW = (() => { const a = process.execArgv.find((x) => x.startsWith("--heap-growing-percent=")); return a ? 1 + Number(a.split("=")[1]) / 100 : 1.4; })();
export const GC_DARK_ON = FRAC > 0 && GC_FN !== null;

function oldUsedBytes(): number {   // allt utom unga generationen (det är den som fylls mot gränsen)
  let n = getHeapStatistics().used_heap_size;
  for (const sp of getHeapSpaceStatistics()) if (sp.space_name === "new_space" || sp.space_name === "new_large_object_space") n -= sp.space_used_size;
  return n;
}

let oldLive = 0, lastGc = -1e9, pending = false;
if (GC_DARK_ON) {
  oldLive = oldUsedBytes();   // startvärde tills första storstädningen (överskattar levande -> städar hellre för sent än för tidigt)
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      const k = (e as unknown as { detail?: { kind?: number } }).detail?.kind ?? (e as unknown as { kind?: number }).kind;
      if (k === constants.NODE_PERFORMANCE_GC_MAJOR) setImmediate(() => { oldLive = oldUsedBytes(); });
    }
  }).observe({ entryTypes: ["gc"] });
}

/** Anropas efter varje DMX-sändning (index.ts). darkMs = effects.darkForMs(), universe = ramen som just skickades. */
export function gcWhenDark(darkMs: number, universe: Uint8Array): void {
  if (!GC_DARK_ON || pending || darkMs < DARK_MS) return;
  const now = performance.now();
  if (now - lastGc < 60000 || oldLive <= 0) return;
  for (let i = 0; i < universe.length; i++) if (universe[i] !== 0) return;   // riggen ska vara helt släckt
  const used = oldUsedBytes(), limit = oldLive * HEAP_GROW;
  if (used < FRAC * limit) return;
  lastGc = now; pending = true;
  setImmediate(() => {
    const t0 = performance.now(); GC_FN!(); const dt = performance.now() - t0;
    const after = oldUsedBytes(); oldLive = after; pending = false;
    noteForcedGc(dt, "mörk rigg", used / 1048576, limit / 1048576, after / 1048576);
  });
}
