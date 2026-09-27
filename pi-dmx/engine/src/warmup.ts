/**
 * UPPVARMNING I BAKGRUNDEN (2026-09-27, realtidsprincipen: "pa Pi:n ska allt koras i realtid").
 *
 * V8 optimerar analysatorns process() forst nar den varit het en stund, och kastar den optimerade koden varje gang
 * en gren kors for forsta gangen (drop, breakdown, tystnad, latgrans, tempokandidat ...). MATT (PC, pop-facit, 180 s
 * stabilt lage): utan uppvarmning omkompileras process() ~1 gang/min (100-130 ms per varv pa PC, 3-5x pa Zero 2 W)
 * - det ar "slow call: analyser.process 60-120 ms" i ladans journal. Med ett 74 s klipp som innehaller de sallsynta
 * handelserna kort igenom pa SKRAP-instanser: process() omkompileras 0-1 ganger pa 180 s.
 *
 * Skrap-instanser av Analyser och EffectEngine delar funktioner (och objektformer) med de riktiga -> samma
 * typaterkoppling; tillstandet kastas. Klippet: mono 16-bit i motorns samplingsfrekvens, ~74 s, ur ladans egen musik.
 *
 * KORS I SMA BITAR via setImmediate (LADAN 22:49: den forsta, synkrona versionen blockerade event-loopen 30-50 s pa Pi:n
 * -> /health svarade inte -> pi-dmx-watchdog startade om motorn i en loop). Nu ar event-loopen fri mellan bitarna:
 * /health svarar, ljudet och ljuset gar direkt (pa annu ooptimerad kod), och uppvarmningen ar klar efter ~1-2 min.
 * DMX_WARMUP=<sokvag> valjer fil, DMX_WARMUP=0 stanger av. DMX_WARMUP_SLICE = hop per bit (standard 150 = ~0,4 s ljud).
 */
import { existsSync, readFileSync } from "node:fs";
import { Analyser } from "./analyser.js";
import { EffectEngine } from "./effects.js";
import type { EngineConfig } from "./config.js";

export interface WarmUpResult { hops: number; ms: number; secs: number }

export function warmUpInBackground(cfg: EngineConfig, path: string, done: (r: WarmUpResult | null) => void): void {
  if (!existsSync(path)) { done(null); return; }
  const d = readFileSync(path);
  if (d.length < 48 || d.toString("ascii", 0, 4) !== "RIFF") { done(null); return; }
  const channels = d.readUInt16LE(22), rate = d.readUInt32LE(24), bits = d.readUInt16LE(34);
  if (channels !== 1 || bits !== 16 || rate !== cfg.audio.rate) { done(null); return; }
  const n = (d.length - 44) >> 1, HOP = cfg.fft.hop;
  const SLICE = Math.max(10, Math.min(2000, Number(process.env.DMX_WARMUP_SLICE ?? 150)));
  const an = new Analyser(cfg);            // roll 'all' (ingen worker): hela process()-vagen i huvudtraden
  an.setGainLock(true, 1);
  const fx = new EffectEngine(cfg);
  const buf = new Float32Array(HOP);
  const t0 = performance.now();
  let hops = 0, nextRenderMs = 0, off = 0;
  const step = (): void => {
    let k = 0;
    while (k < SLICE && off + HOP <= n) {
      for (let i = 0; i < HOP; i++) buf[i] = d.readInt16LE(44 + (off + i) * 2) / 32768;
      const ms = (off * 1000) / rate;
      an.setVirtualClock(ms);
      const f = an.process(buf);
      hops++; off += HOP; k++;
      if (ms >= nextRenderMs) { nextRenderMs += 10; fx.render(f); }   // 100 Hz som live
    }
    if (off + HOP <= n) setImmediate(step);
    else done({ hops, ms: performance.now() - t0, secs: n / rate });
  };
  setImmediate(step);
}
