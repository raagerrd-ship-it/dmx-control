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
import { SmartSync } from "./smartsync.js";
import { activeSlots, type Mode } from "./config.js";

// Physical button cycles through the fun modes (skips blackout so the button never kills the show).
const MODE_CYCLE: Mode[] = ["pulse", "party", "chase", "spectrum", "vu", "mono"];

const cfg = await loadConfig();
// Migrate legacy mode names from persisted configs.
const LEGACY_MODES: Record<string, Mode> = { auto: "spectrum", comet: "pulse", split: "party", strobe: "party" };
if (LEGACY_MODES[cfg.mode as string]) cfg.mode = LEGACY_MODES[cfg.mode as string];
if (!["pulse","party","chase","spectrum","vu","mono","blackout"].includes(cfg.mode)) cfg.mode = "spectrum";

// Re-apply the chosen codec input routing (the boot service restores the aux
// default; this honors a persisted mic choice).
if (cfg.audioInput === "mic") {
  const { spawn: sp } = await import("node:child_process");
  sp("alsactl", ["restore", "-f", "/etc/alsa/codec-zero-mic.state"], { stdio: "ignore" });
}
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
  smartSync.feed(samples);
  const universe = effects.render(frame);
  dmx.send(universe, curSlots);
});

capture.on("stderr", (s) => console.error("[arecord]", s));
capture.on("exit", (code) => console.error("[arecord] exited", code));

capture.start();

// SmartSync: song-identification driven show (needs internet → hotspot mode).
const smartSync = new SmartSync({
  cfg,
  onConfigChanged: () => {
    scheduleSave(cfg);
    server?.broadcastConfig();
  },
  onState: (st) => server?.broadcastSmartSync(st),
});

// Shared mode cycler — used by both the physical button and the WS "cycleMode" message,
// so UI and hardware follow the exact same path.
let server: Server;
const cycleMode = (): Mode => {
  // Filter to modes the user has enabled in rotation; fall back to the full
  // list if they disabled everything so the button never becomes a no-op.
  const enabled = MODE_CYCLE.filter((m) => cfg.rotation?.[m] !== false);
  const list = enabled.length > 0 ? enabled : MODE_CYCLE;
  const cur = list.indexOf(cfg.mode);
  cfg.mode = list[(cur + 1) % list.length];
  scheduleSave(cfg);
  server.broadcastConfig();
  return cfg.mode;
};

server = await startServer({
  cfg,
  getLatestFrame: () => latestFrame,
  cycleMode,
  smartSync,
  resetAgc: () => analyser.resetGain(),
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
  smartSync.disable();
  capture.stop();
  button?.stop();
  dmx.close();
  process.exit(0);
});
