/**
 * runtimeHealth.ts — mätvärden som avslöjar att motorn börjar tappa realtid
 * INNAN ljuset känns segt. Portad från Lotus-motorn, där dessa tre siffror var
 * det som gjorde långkörningsproblem diagnoserbara på distans:
 *
 *   chunkFps    — ljud-chunkar/s från arecord (förväntat rate/hop ≈ 375 @48k/128).
 *                 Lägre = ALSA tappar samples eller capturen halkar.
 *   renderFps   — faktiska DMX-rutor/s (förväntat ~200).
 *   loopLagMs   — hur sent 1 Hz-schemat kommer = event-loop-blockering.
 *   tickJitterMs— avvikelse mellan verkliga renderintervall och RENDER_MS.
 *
 * CPU-% är INTE ett användbart mått här: ALSA kapar bufferten tyst långt innan
 * lasten ser mättad ut.
 *
 * Ingen egen timer — sample() anropas från den gemensamma 1 Hz-schemaläggaren i
 * index.ts. Max-värden nollställs vid läsning (peak sedan förra hämtningen).
 */

let loopLagEMA = 0;
let loopLagMax = 0;
let lastSampleAt = 0;

let jitterEMA = 0;
let jitterMax = 0;
let lastRenderAt = 0;
let lateRenderTotal = 0;

let chunkTotal = 0;
let renderTotal = 0;
let lastChunkTotal = 0;
let lastRenderTotal = 0;
let chunkFps = 0;
let renderFps = 0;

let overrunTotal = 0;
let lastOverrunTotal = 0;
let overrunPerMin = 0;

let maxSlowCallMs = 0;
let slowCallTotal = 0;
let lastSlowCall: { op: string; ms: number; atIso: string } | null = null;
let lastSlowLogAt = 0;
const SLOW_MS = 50;                  // en ruta är 5 ms → 50 ms är tio missade rutor
const SLOW_LOG_INTERVAL_MS = 10_000; // loggtak: räkna tyst, varna sällan

/** Tidsstämpla ett anrop som kan blockera event-loopen (analys, render, DMX-write). */
export function noteSlowCall(op: string, ms: number): void {
  if (ms > maxSlowCallMs) maxSlowCallMs = ms;
  if (ms >= SLOW_MS) {
    slowCallTotal++;
    lastSlowCall = { op, ms: Math.round(ms * 10) / 10, atIso: new Date().toISOString() };
    const now = performance.now();
    if (now - lastSlowLogAt >= SLOW_LOG_INTERVAL_MS) {
      lastSlowLogAt = now;
      console.warn(`[health] slow call: ${op} ${ms.toFixed(1)}ms`);
    }
  }
}

/** En ljud-chunk togs emot. */
export function noteChunk(): void { chunkTotal++; }

/** En DMX-ruta renderades och sändes. `renderMs` = det avsedda intervallet. */
export function noteRender(nowMs: number, renderMs: number): void {
  renderTotal++;
  if (lastRenderAt > 0) {
    const dt = nowMs - lastRenderAt;
    const jitter = Math.abs(dt - renderMs);
    jitterEMA += (jitter - jitterEMA) * 0.05;
    if (jitter > jitterMax) jitterMax = jitter;
    if (dt > renderMs * 1.5) lateRenderTotal++;
  }
  lastRenderAt = nowMs;
}

/** ALSA-overrun (tappade samples) — arecord skriver dem på stderr. */
export function noteOverrun(): void { overrunTotal++; }

/** Monoton räknare över mottagna ljud-chunkar (stall-diagnos i watchdogen). */
export function getChunkTotal(): number { return chunkTotal; }
/** Monoton räknare över sända DMX-rutor. */
export function getRenderTotal(): number { return renderTotal; }

/** Anropas ~1 Hz från den gemensamma schemaläggaren. */
export function sample(): void {
  const now = performance.now();
  if (lastSampleAt > 0) {
    const dt = now - lastSampleAt;
    const lag = Math.max(0, dt - 1000);
    loopLagEMA += (lag - loopLagEMA) * 0.2;
    if (lag > loopLagMax) loopLagMax = lag;
    chunkFps = ((chunkTotal - lastChunkTotal) * 1000) / dt;
    renderFps = ((renderTotal - lastRenderTotal) * 1000) / dt;
    overrunPerMin = ((overrunTotal - lastOverrunTotal) * 60000) / dt;
  }
  lastSampleAt = now;
  lastChunkTotal = chunkTotal;
  lastRenderTotal = renderTotal;
  lastOverrunTotal = overrunTotal;
}

export type RuntimeHealth = {
  chunkFps: number; renderFps: number;
  loopLagMsEMA: number; loopLagMsMax: number;
  jitterMsEMA: number; jitterMsMax: number;
  lateRenderTotal: number;
  overrunTotal: number; overrunPerMin: number;
  chunkTotal: number; renderTotal: number;
  maxSlowCallMs: number; slowCallTotal: number;
  lastSlowCall: { op: string; ms: number; atIso: string } | null;
};

/** LÄSNING NOLLSTÄLLER MAX-VÄRDENA — de är peak sedan förra hämtningen. */
export function getRuntimeHealth(): RuntimeHealth {
  const r1 = Math.round;
  const out: RuntimeHealth = {
    chunkFps: r1(chunkFps),
    renderFps: r1(renderFps),
    loopLagMsEMA: r1(loopLagEMA * 10) / 10,
    loopLagMsMax: r1(loopLagMax * 10) / 10,
    jitterMsEMA: r1(jitterEMA * 100) / 100,
    jitterMsMax: r1(jitterMax * 10) / 10,
    lateRenderTotal,
    overrunTotal,
    overrunPerMin: r1(overrunPerMin),
    chunkTotal,
    renderTotal,
    maxSlowCallMs: r1(maxSlowCallMs * 10) / 10,
    slowCallTotal,
    lastSlowCall,
  };
  loopLagMax = 0;
  jitterMax = 0;
  maxSlowCallMs = 0;
  return out;
}
