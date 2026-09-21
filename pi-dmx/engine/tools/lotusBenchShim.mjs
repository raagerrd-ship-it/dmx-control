/** Shim sa lotus-bankens bench.mjs kan kora DMX-analysatorn:
 *   node ../../../lotus-light-link/tools/tempo-facit-pc/bench.mjs --analyser tools/lotusBenchShim.mjs
 * Lotus-API: createAnalyser(cfg), setVirtualClock/advanceVirtualClock, setAudioClockMs (ignoreras), setBeatGrid (cfg.beat). */
import { Analyser } from "../dist/analyser.js";
import { defaultConfig } from "../dist/config.js";
export function createAnalyser(_cfg) {
  const cfg = JSON.parse(JSON.stringify(defaultConfig));
  const an = new Analyser(cfg);
  an.setGainLock(true, 1);
  an.advanceVirtualClock = (ms) => an.setVirtualClock(ms);
  an.setAudioClockMs = () => {};
  an.setBeatGrid = (g) => { cfg.beat = g ? { anchorMs: g.anchorMs, bpm: g.bpm, confidence: 1 } : null; };
  return an;
}
