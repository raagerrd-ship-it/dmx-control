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

import { readFileSync, existsSync } from "node:fs";
import { AudioCapture } from "./audio.js";
import { Analyser, type Frame } from "./analyser.js";
import { EffectEngine } from "./effects.js";
import { DmxSender } from "./dmx.js";
import { startServer, applyInputRouting, type Server } from "./server.js";
import { loadConfig, scheduleSave } from "./persist.js";
import { Button } from "./button.js";
import { SmartSync } from "./smartsync.js";
import { activeSlots, type Mode } from "./config.js";

// Physical button cycles through the fun modes (skips blackout so the button never kills the show).
const MODE_CYCLE: Mode[] = ["smart", "drops", "party", "chase", "wave", "cycle", "mono"];

const cfg = await loadConfig();
// Migrate legacy mode names from persisted configs.
const LEGACY_MODES: Record<string, Mode> = { auto: "wave", comet: "wave", split: "party", strobe: "party", pulse: "drops", spectrum: "wave", vu: "cycle" };
if (LEGACY_MODES[cfg.mode as string]) cfg.mode = LEGACY_MODES[cfg.mode as string];
if (!["smart","drops","party","chase","wave","cycle","mono","blackout"].includes(cfg.mode)) cfg.mode = "smart";

// Re-apply the chosen codec input routing (the boot service restores the aux
// default; this honors a persisted mic choice).
applyInputRouting(cfg.audioInput === "mic" ? "mic" : "aux");
const analyser = new Analyser(cfg);
analyser.resetGain(cfg.audioInput === "mic" ? 20 : 1);
analyser.setGainLock(cfg.audioInput !== "mic", 1);  // aux: fixed 1x
const effects = new EffectEngine(cfg);
const dmx = new DmxSender();
dmx.setMaxHz(cfg.dmxMaxHz);

let latestFrame: Frame | null = null;
let lastLiveBeatMs = 0;
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
  // Lokal BPM → taktklocka. Fasen ankras vid senaste kick. Fylls INTE i om
  // mobilens Live Analysis nyligen satt en beat (den vinner då, 5 s fönster).
  if (frame.bpm > 0 && Date.now() - lastLiveBeatMs > 5000) {
    cfg.beat = { anchorMs: frame.beatAnchorMs || Date.now(), bpm: frame.bpm };
  }
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

const serverDeps = {
  cfg,
  getLatestFrame: () => latestFrame,
  cycleMode,
  smartSync,
  onLiveBeat: () => { lastLiveBeatMs = Date.now(); },
  resetAgc: (g?: number) => analyser.resetGain(g),
  setGainLock: (locked: boolean) => analyser.setGainLock(locked, 1),
  onConfigChanged: () => {
    scheduleSave(cfg);
    curSlots = activeSlots(cfg.fixtures);
    dmx.setMaxHz(cfg.dmxMaxHz);
  },
};
const s80 = await startServer(serverDeps, Number(process.env.PORT ?? 80));

// HTTPS on 443 (self-signed) — the phone microphone (getUserMedia in the
// Live Analysis app) requires a secure context, and wss must be same-origin.
let s443: Server | null = null;
const TLS_KEY = "/etc/audio-dmx/tls/key.pem";
const TLS_CERT = "/etc/audio-dmx/tls/cert.pem";
if (existsSync(TLS_KEY) && existsSync(TLS_CERT)) {
  try {
    s443 = await startServer(serverDeps, 443, { key: readFileSync(TLS_KEY), cert: readFileSync(TLS_CERT) });
    console.log("https on :443");
  } catch (e) {
    console.error("[https] failed:", (e as Error).message);
  }
}
server = {
  app: s80.app,
  broadcastConfig: () => { s80.broadcastConfig(); s443?.broadcastConfig(); },
  broadcastSmartSync: (st) => { s80.broadcastSmartSync(st); s443?.broadcastSmartSync(st); },
};
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
