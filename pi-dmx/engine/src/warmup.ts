/**
 * UPPVARMNING VID START (2026-09-27, realtidsprincipen: "pa Pi:n ska allt koras i realtid").
 *
 * V8 optimerar analysatorns process() forst nar den varit het en stund, och kastar den optimerade koden varje gang
 * en gren kors for forsta gangen (drop, breakdown, tystnad, latgrans, tempokandidat ...). MATT (PC, pop-facit, 180 s
 * stabilt lage): utan uppvarmning omkompileras process() ~1 gang/min (100-130 ms per varv pa PC, 3-5x pa Zero 2 W)
 * - det ar "slow call: analyser.process 60-120 ms" i ladans journal. Med ett 74 s klipp som innehaller de sallsynta
 * handelserna kort igenom FORE start: 0-1 omkompileringar pa 180 s.
 *
 * Klippet kors pa SKRAP-instanser av Analyser och EffectEngine (samma funktioner -> samma typaterkoppling och samma
 * objektformer; tillstandet kastas). De riktiga instanserna skapas efterat och fods med fardiga former. Klippet:
 * mono 16-bit i motorns samplingsfrekvens, ~74 s, ur ladans egen musik (drops med breakdown fore, 2 s tystnad =
 * latgrans, lugn drop). DMX_WARMUP=<sokvag> valjer fil, DMX_WARMUP=0 stanger av.
 *
 * Kostnad: ~27 000 hop synkront innan ljudet startar - ca 10-20 s pa Zero 2 W. Ljuset ar morkt under tiden.
 */
import { existsSync, readFileSync } from "node:fs";
import { Analyser } from "./analyser.js";
import { EffectEngine } from "./effects.js";
import type { EngineConfig } from "./config.js";

export function warmUp(cfg: EngineConfig, path: string): { hops: number; ms: number; secs: number } | null {
  if (!existsSync(path)) return null;
  const d = readFileSync(path);
  if (d.length < 48 || d.toString("ascii", 0, 4) !== "RIFF") return null;
  const channels = d.readUInt16LE(22), rate = d.readUInt32LE(24), bits = d.readUInt16LE(34);
  if (channels !== 1 || bits !== 16 || rate !== cfg.audio.rate) return null;
  const n = (d.length - 44) >> 1, HOP = cfg.fft.hop;
  const an = new Analyser(cfg);            // roll 'all' (ingen worker): hela process()-vagen i huvudtraden
  an.setGainLock(true, 1);
  const fx = new EffectEngine(cfg);
  const buf = new Float32Array(HOP);
  const t0 = performance.now();
  let hops = 0, nextRenderMs = 0;
  for (let off = 0; off + HOP <= n; off += HOP) {
    for (let i = 0; i < HOP; i++) buf[i] = d.readInt16LE(44 + (off + i) * 2) / 32768;
    const ms = (off * 1000) / rate;
    an.setVirtualClock(ms);
    const f = an.process(buf);
    hops++;
    if (ms >= nextRenderMs) { nextRenderMs += 10; fx.render(f); }   // 100 Hz som live
  }
  return { hops, ms: performance.now() - t0, secs: n / rate };
}
