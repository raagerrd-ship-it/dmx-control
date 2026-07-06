/**
 * audio-dmx-engine entry point.
 *
 * Pipeline: arecord → Analyser → EffectEngine → DmxSender → Unix socket
 *                                                       ↓
 *                                                  dmx-helper → PL011 → MAX485
 *
 * Fastify serves the mobile control UI on :80 and pushes live state via WS.
 * A physical push-button on GPIO cycles through modes (see cfg.modeButton).
 * Runtime config is loaded from /var/lib/audio-dmx-engine/config.json and
 * saved back (debounced) whenever anything changes it.
 */

import { AudioCapture } from "./audio.js";
import { Analyser, type Frame } from "./analyser.js";
import { EffectEngine } from "./effects.js";
import { DmxSender } from "./dmx.js";
import { startServer } from "./server.js";
import { loadConfig, scheduleSave } from "./persist.js";
import { Button } from "./button.js";
import type { Mode } from "./config.js";

const MODE_CYCLE: Mode[] = ["auto", "party", "comet", "mono", "strobe", "blackout"];

const cfg = await loadConfig();
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

const server = await startServer({
  cfg,
  getLatestFrame: () => latestFrame,
  onConfigChanged: () => scheduleSave(cfg),
}, Number(process.env.PORT ?? 80));
console.log(`audio-dmx-engine listening on ${server.app.server.address()}`);

// Physical mode button — cycles Auto → Chill → Party → Chase → Fire → Strobe → Blackout → Auto…
let button: Button | null = null;
if (cfg.modeButton) {
  button = new Button({ chip: cfg.modeButton.chip, line: cfg.modeButton.line });
  button.on("press", () => {
    const cur = MODE_CYCLE.indexOf(cfg.mode);
    cfg.mode = MODE_CYCLE[(cur + 1) % MODE_CYCLE.length];
    console.log(`[button] mode → ${cfg.mode}`);
    scheduleSave(cfg);
    server.broadcastConfig();   // mobile UI updates instantly
  });
  button.on("stderr", (s) => console.error("[gpiomon]", s));
  button.on("exit", (code) => console.error("[gpiomon] exited", code));
  button.start();
  console.log(`mode-button on ${cfg.modeButton.chip} line ${cfg.modeButton.line}`);
}

process.on("SIGTERM", () => {
  capture.stop();
  button?.stop();
  dmx.close();
  process.exit(0);
});
