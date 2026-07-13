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
import { startServer, type Server } from "./server.js";
import { loadConfig, scheduleSave } from "./persist.js";
import { Button } from "./button.js";
import { activeSlots, type Mode } from "./config.js";

// Physical button cycles through the fun modes (skips blackout so the button never kills the show).
const MODE_CYCLE: Mode[] = ["auto", "party", "comet", "chase", "split", "mono", "strobe"];

const cfg = await loadConfig();
const analyser = new Analyser(cfg);
const effects = new EffectEngine(cfg);
const dmx = new DmxSender();
dmx.setMaxHz(cfg.dmxMaxHz);

let latestFrame: Frame | null = null;
let curSlots = activeSlots(cfg.fixtures);

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
  dmx.send(universe, curSlots);
});

capture.on("stderr", (s) => console.error("[arecord]", s));
capture.on("exit", (code) => console.error("[arecord] exited", code));

capture.start();

// Shared mode cycler — used by both the physical button and the WS "cycleMode" message,
// so UI and hardware follow the exact same path.
let server: Server;
const cycleMode = (): Mode => {
  const cur = MODE_CYCLE.indexOf(cfg.mode);
  cfg.mode = MODE_CYCLE[(cur + 1) % MODE_CYCLE.length];
  scheduleSave(cfg);
  server.broadcastConfig();
  return cfg.mode;
};

server = await startServer({
  cfg,
  getLatestFrame: () => latestFrame,
  cycleMode,
  onConfigChanged: () => {
    scheduleSave(cfg);
    curSlots = activeSlots(cfg.fixtures);
    dmx.setMaxHz(cfg.dmxMaxHz);
  },
}, Number(process.env.PORT ?? 80));
console.log(`audio-dmx-engine listening on ${server.app.server.address()}`);

// Physical mode button — short press cycles modes, long press toggles AGC
// aggressiveness between "Lugn" (a=0.1) and "Aggressiv" (a=0.8).
const AGC_CALM = 0.1;
const AGC_AGGRESSIVE = 0.8;
const applyAggressiveness = (a: number) => {
  cfg.detection.tauUp   = 180 * Math.pow(10 / 180, a);
  cfg.detection.tauDown = 60  * Math.pow(2  / 60,  a);
};

let button: Button | null = null;
if (cfg.modeButton) {
  button = new Button({ chip: cfg.modeButton.chip, line: cfg.modeButton.line });
  button.on("press", () => {
    const next = cycleMode();
    console.log(`[button] mode → ${next}`);
  });
  button.on("longPress", () => {
    // Decide from current tauUp which side we're on and flip.
    const isAggressiveNow = cfg.detection.tauUp < 60;
    const next = isAggressiveNow ? AGC_CALM : AGC_AGGRESSIVE;
    applyAggressiveness(next);
    console.log(`[button] AGC → ${next === AGC_CALM ? "Lugn" : "Aggressiv"} (tauUp=${cfg.detection.tauUp.toFixed(1)}s)`);
    scheduleSave(cfg);
    server.broadcastConfig();
  });
  button.on("stderr", (s) => console.error("[gpiomon]", s));
  button.on("exit", (code) => console.error("[gpiomon] exited", code));
  button.start();
  console.log(`mode-button on ${cfg.modeButton.chip} line ${cfg.modeButton.line} (short=mode, long=AGC)`);
}

process.on("SIGTERM", () => {
  capture.stop();
  button?.stop();
  dmx.close();
  process.exit(0);
});
