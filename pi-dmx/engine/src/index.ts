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

import { activeSlots, type Mode } from "./config.js";

// Physical button cycles through the fun modes (skips blackout so the button never kills the show).
const MODE_CYCLE: Mode[] = ["smart", "drops", "party", "chase", "wave", "cycle", "breathe", "tide", "snap", "bounce", "mono", "aurora", "drift", "sweep", "pulse", "strobe", "rave", "eq", "flip"];

const cfg = await loadConfig();
// Migrate legacy mode names from persisted configs.
const LEGACY_MODES: Record<string, Mode> = { auto: "wave", comet: "wave", split: "party", strobe: "party", pulse: "drops", spectrum: "wave", vu: "cycle" };
if (LEGACY_MODES[cfg.mode as string]) cfg.mode = LEGACY_MODES[cfg.mode as string];
if (!["smart","drops","party","chase","wave","cycle","breathe","tide","snap","bounce","mono","aurora","drift","sweep","pulse","strobe","rave","eq","flip","blackout"].includes(cfg.mode)) cfg.mode = "smart";
cfg.fft.hop = 128;   // analys 375 Hz (beprövad tuning); render/DMX separat 50 Hz

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
let lastChunkAt = Date.now();   // hälsokoll: uppdateras varje ljud-chunk
let lastDropMs = 0;
let lastRenderMs = 0;
let fluxBaseline = 0.1;
const slotsFor = () => Math.max(activeSlots(cfg.fixtures), cfg.fog?.enabled ? cfg.fog.address : 0);
let curSlots = slotsFor();

const capture = new AudioCapture({
  device: cfg.audio.device,
  rate: cfg.audio.rate,
  channels: cfg.audio.channels,
  hopSamples: cfg.fft.hop,
});

capture.on("chunk", (samples: Float32Array) => {
  const frame = analyser.process(samples);
  latestFrame = frame;
  lastChunkAt = Date.now();
  // Lokal BPM → taktklocka med STABIL fri-rullande fas. Ankaret sätts bara vid
  // (om)lås; att sätta det på varje kick fick pulsen att flimra.
  // Tap-tempo: en manuellt låst takt överstyr auto-detektionen (men PLL:en nedan
  // riktar ändå fasen mot faktiska trumslag).
  const effBpm = cfg.manualBpm && cfg.manualBpm > 0 ? cfg.manualBpm : frame.bpm;
  if (effBpm === 0) cfg.beat = null;   // tyst → stoppa beat-effekter direkt
  if (effBpm > 0) {
    if (!cfg.beat || Math.abs(cfg.beat.bpm - effBpm) > 2) {
      let anchor = frame.beatAnchorMs || Date.now();
      if (cfg.beat) {
        // Bevara nuvarande fas vid tempoändring så pulsen inte hoppar.
        const oldMs = 60000 / cfg.beat.bpm, newMs = 60000 / effBpm;
        const phase = (((Date.now() - cfg.beat.anchorMs) % oldMs) + oldMs) % oldMs / oldMs;
        anchor = Date.now() - phase * newMs;
      }
      cfg.beat = { anchorMs: anchor, bpm: effBpm };
    }
    // annars: behåll ankaret → jämn, kontinuerlig fas

    // FAS-LÅS (PLL): knuffa takt-ankaret mot faktiska trumslag så pulsen sitter
    // i takt även om BPM-SIFFRAN är någon enhet fel. Vid varje kick, mät hur
    // långt slaget ligger från närmaste förutsagda taktslag och korrigera en
    // liten del (18%) av felet. Bara när slaget är nära ett taktslag (|fel|<0.25)
    // → syncoperade off-beat-slag stör inte låset. Liten korrektion = mjuk
    // inlåsning utan det flimmer en hård nollställning gav.
    if (frame.kick && cfg.beat) {
      const beatMs = 60000 / cfg.beat.bpm;
      const ph = ((((Date.now() - cfg.beat.anchorMs) % beatMs) + beatMs) % beatMs) / beatMs;
      const err = ph < 0.5 ? ph : ph - 1;   // -0.5..0.5 av ett taktslag
      if (Math.abs(err) < 0.25) cfg.beat.anchorMs += err * beatMs * 0.18;
    }
  }
  // Lokal drop: ett slag som är MYCKET starkare än det normala → sällsynt blixt.
  // (Inte varje kick — annars överröstar blixten alla lägen.) Baslinje = långsam
  // EMA av kick-flux; drop kräver ett tydligt uthopp + minst ~900 ms mellanrum.
  if (frame.kick) {
    fluxBaseline += (frame.flux - fluxBaseline) * 0.05;
    const mult = 2.4 - cfg.dropSensitivity * 1.5;   // känslig 0.9x .. trög 2.4x
    const strong = frame.flux > Math.max(0.10, fluxBaseline * mult);
    if (cfg.dropSensitivity > 0 && strong && Date.now() - lastDropMs > 600) {
      lastDropMs = Date.now();
      cfg.flashUntil = Date.now() + 150;
    }
  }


  // Frikoppla render från analysrate: analysern (FFT/onset/BPM) körs varje chunk
  // (~375 Hz) för tighta drops, men effekterna behöver bara ~60 Hz för lamporna.
  // Att rendera 375x/s var slöseri (rate-limiten kastade 85%) och orsaken till
  // att Node låg ~2% efter realtid. Render + DMX i lås-steg på 50 Hz.
  const nowR = performance.now();
  if (nowR - lastRenderMs >= 20) {
    lastRenderMs = nowR;
    const universe = effects.render(latestFrame);
    dmx.send(universe, curSlots);
  }
});

capture.on("stderr", (s) => console.error("[arecord]", s));
capture.on("exit", (code) => console.error("[arecord] exited", code));

capture.start();


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
  getActiveMode: () => effects.getActiveMode(),
  // Frisk = en ljud-chunk bearbetad senaste 10 s (arecord + event-loop lever).
  getHealthy: () => Date.now() - lastChunkAt < 10000,
  cycleMode,

  resetAgc: (g?: number) => analyser.resetGain(g),
  setGainLock: (locked: boolean) => analyser.setGainLock(locked, 1),
  onConfigChanged: () => {
    scheduleSave(cfg);
    curSlots = slotsFor();
    dmx.setMaxHz(cfg.dmxMaxHz);
  },
};
const s80 = await startServer(serverDeps, Number(process.env.PORT ?? 80));

// HTTPS on 443 (self-signed) — kept in case future features need a secure
// context on the phone (getUserMedia etc.). Optional, serves same routes.
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
  capture.stop();
  button?.stop();
  dmx.close();
  process.exit(0);
});
