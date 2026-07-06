/**
 * audio-dmx-engine entry point.
 *
 * Pipeline: arecord → Analyser → EffectEngine → DmxSender → Unix socket
 *                                                       ↓
 *                                                  dmx-helper → PL011 → MAX485
 *
 * Fastify serves the mobile control UI on :80 and pushes live state via WS.
 */

import { defaultConfig } from "./config.js";
import { AudioCapture } from "./audio.js";
import { Analyser, type Frame } from "./analyser.js";
import { EffectEngine } from "./effects.js";
import { DmxSender } from "./dmx.js";
import { startServer } from "./server.js";

const cfg = defaultConfig;
const analyser = new Analyser(cfg);
const effects = new EffectEngine(cfg);
const dmx = new DmxSender();

let latestFrame: Frame | null = null;

const capture = new AudioCapture({
  device: cfg.audio.device,
  rate: cfg.audio.rate,
  channels: cfg.audio.channels,
  hopSamples: cfg.fft.hop,
});

capture.on("chunk", (samples: Float32Array) => {
  const frame = analyser.process(samples);
  latestFrame = frame;
  const universe = effects.render(frame);
  dmx.send(universe);
});

capture.on("stderr", (s) => console.error("[arecord]", s));
capture.on("exit", (code) => console.error("[arecord] exited", code));

capture.start();

startServer({
  cfg,
  getLatestFrame: () => latestFrame,
}, Number(process.env.PORT ?? 80))
  .then((app) => console.log(`audio-dmx-engine listening on ${app.server.address()}`))
  .catch((e) => { console.error("server failed:", e); process.exit(1); });

process.on("SIGTERM", () => {
  capture.stop();
  dmx.close();
  process.exit(0);
});
