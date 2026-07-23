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
import { IntensityKnob } from "./intensityKnob.js";
import { KnobRing } from "./knobRing.js";
import { BleClient, type BleScanDevice } from "./bleClient.js";
import { applyIntensity } from "./moods.js";

import { activeSlots, fixtureRoles, type Mode } from "./config.js";
import { EFFECT_KEYS, EFFECT_MAP } from "./effects/registry.js";

// Physical button cycles through the fun modes (skips blackout so the button never kills the show).
// Härlett ur effekt-registret (samma ordning) → ingen lista att hålla i synk.
const MODE_CYCLE: Mode[] = ["smart", ...EFFECT_KEYS];

const cfg = await loadConfig();
// Migrate legacy mode names from persisted configs.
// Migrera BORTTAGNA lägesnamn (strobe/pulse är RIKTIGA nuvarande lägen → ej här).
const LEGACY_MODES: Record<string, Mode> = { auto: "wave", comet: "wave", spectrum: "eq", vu: "gravity" };
if (LEGACY_MODES[cfg.mode as string]) cfg.mode = LEGACY_MODES[cfg.mode as string];
if (cfg.mode !== "smart" && cfg.mode !== "blackout" && !EFFECT_MAP.has(cfg.mode)) cfg.mode = "smart";
cfg.fft.hop = 128;   // analys 375 Hz (beprövad tuning); render/DMX separat 100 Hz
if (!cfg.dmxMaxHz || cfg.dmxMaxHz <= 50) cfg.dmxMaxHz = 100;   // migrera gamla 50-taket → tightare synk
// Migrera äldre intensityRing utan de nya fälten (maxBright/pulseBoost/blackoutFadeMs).
if (cfg.intensityRing) {
  const r = cfg.intensityRing as Partial<NonNullable<typeof cfg.intensityRing>>;
  cfg.intensityRing = {
    bus: r.bus ?? 0, device: r.device ?? 0,
    maxBright: r.maxBright ?? 0.40,
    pulseBoost: r.pulseBoost ?? 0.18,
    blackoutFadeMs: r.blackoutFadeMs ?? 400,
  };
}

// RÖKENS UPPVÄRMNINGSKLOCKA FÅR INTE ÖVERLEVA EN STRÖMCYKEL.
// cfg.fog.warmStartMs persisteras med flit så en MOTOR-omstart (deploy, krasch,
// systemd-restart) inte påstår "10 min kvar" om en maskin som stått varm. Men i
// en bar slås hela lådan av över natten: då bootar den, warmStartMs är från
// igår, och UI:t säger "✓ Redo" om en rökmaskin som stått kall i arton timmar —
// exakt det problem nedräkningen fanns till för att lösa.
// Exakt test i stället för tumregel: räkna fram NÄR Pi:n bootade och kasta
// tiden bara om den sattes FÖRE det. En motoromstart 3 min efter boot bevaras
// alltså korrekt, vilket en enkel "uptime < N"-gräns hade slarvat bort.
try {
  const upSec = Number(readFileSync("/proc/uptime", "utf8").split(" ")[0]);
  const bootMs = Date.now() - upSec * 1000;
  if (cfg.fog?.warmStartMs && cfg.fog.warmStartMs < bootMs) {
    cfg.fog.warmStartMs = 0;   // kallstart → nedräkningen börjar om vid första render
    console.log("[fog] kallstart — uppvärmningen räknas om");
  }
} catch { /* /proc saknas (ej Linux) → behåll det persisterade värdet */ }

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
let lastRenderMs = 0;
let clockDetBpm = 0;   // analysatorns bpm som taktklockan LÅSTES på (om-ankrings-referens,
                       // skild från cfg.beat.bpm som frekvens-termen finjusterar)
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
  const effBpm = frame.bpm;
  if (effBpm === 0) { cfg.beat = null; cfg.beatErr = 0; clockDetBpm = 0; }   // tyst → stoppa beat-effekter direkt
  if (effBpm > 0) {
    // Om-ankra bara när ANALYSATORNS bpm ändras (nytt tempo/låt), INTE när vår egen
    // frekvens-finjustering flyttat cfg.beat.bpm — annars nollar korrektionen sig själv.
    if (!cfg.beat || Math.abs(effBpm - clockDetBpm) > 2) {
      clockDetBpm = effBpm;
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
      const k0 = cfg.beatSyncStrength ?? 0.18;  // ägar-ratt: 0 = av/fri-rullande .. ~0.30 aggressiv
      // #3 ADAPTIV: låt takt-tydligheten (bpmConfidence) modulera ratten runt
      // ägarens val. Tydlig takt → snabbare inlåsning; brusig/osäker → försiktig
      // så bruset inte drar iväg fasen. Ägarens "Av" (0) förblir hårt av.
      const conf = frame.bpmConfidence ?? 0;
      let k = k0 * (0.3 + 1.4 * conf);          // conf 0→×0.3, 0.5→×1.0, 1→×1.7
      if (k > 0.4) k = 0.4; else if (k < 0.03) k = 0.03;
      const onBeat = Math.abs(err) < 0.25;      // off-beat/synkoperade slag räknas ej
      // Live fasfel för UI: hur långt slaget låg från gridet, KRAFTIGT utjämnat
      // (~2s) → visar det IHÅLLANDE laget, inte per-slag-jittret. Nära 0 = tight låst.
      if (onBeat) cfg.beatErr = (cfg.beatErr ?? 0) * 0.85 + err * 0.15;
      if (k0 > 0 && onBeat) {
        cfg.beat.anchorMs += err * beatMs * k;   // FAS-term: dra ankaret mot slaget
        // FREKVENS-term (PI-integral): en fas-bara-PLL har ett permanent steady-state-
        // lag när tempo-SIFFRAN ligger snäppet fel (detekterad ≠ sant tempo) → fasen
        // driftar och rycks tillbaka (sågtand). Fin-justera bpm i fasfelets riktning
        // så laget nollas. conf-gated; bundet inom ±4 av LÅS-referensen (clockDetBpm)
        // så ett par bpm tempofel kan tas ut helt, utan att trigga om-ankring (>2 mot
        // referensen, inte mot vår justerade bpm).
        if (conf > 0.4) {
          cfg.beat.bpm += err * 0.35 * conf;
          const lo = clockDetBpm - 4, hi = clockDetBpm + 4;
          if (cfg.beat.bpm < lo) cfg.beat.bpm = lo; else if (cfg.beat.bpm > hi) cfg.beat.bpm = hi;
        }
      }
    }
  }
  // Akustisk tröghet: mata bastransienten till effektmotorn (i full 375 Hz så
  // inga slag missas) → show-tiden får en knuff, starkare ju tyngre basen är.
  if (frame.kick) effects.registerKick(0.4 + Math.min(1, frame.energy * 1.4) * 0.6);
  // WS2812-ringen: mata intensity + kick-puls varje frame (billig update; ringen
  // renderar själv i egen takt @ 30 Hz och avklingar puffen mjukt).
  ring?.update({
    intensity: cfg.activeIntensity ?? 0.5,
    blackout: cfg.mode === "blackout",
    beat: frame.kick,
  });


  // Frikoppla render från analysrate: analysern (FFT/onset/BPM) körs varje chunk
  // (~375 Hz) för tighta drops, men effekterna renderas i 100 Hz (var 10:e ms) →
  // halverad utgångslatens mot 50 Hz = tightare bas/drop-synk. Fortfarande långt
  // under 375 Hz så Node håller realtid. DMX-taket höjt till 100 Hz i takt.
  const nowR = performance.now();
  if (nowR - lastRenderMs >= 10) {
    lastRenderMs = nowR;
    const universe = effects.render(latestFrame);
    dmx.send(universe, curSlots);
    // BLE-slingorna får riggens dominanta färg: medelvärde av alla R/G/B/W-kanaler
    // (W adderas i alla tre → varmvit blir vit på BLEDOM som saknar W). Master
    // skickas som separat brightness så sidecarn kan gamma-korrigera. Billigt
    // (max ~40 iterationer @ 100 Hz) och håller BLE i takt med DMX utan att
    // effekterna behöver veta om att slingorna finns.
    if (bleClient && cfg.bleDevices && cfg.bleDevices.length > 0) {
      let rs = 0, gs = 0, bs = 0, n = 0;
      for (const fx of cfg.fixtures) {
        const roles = fixtureRoles(fx);
        let r = 0, g = 0, b = 0, w = 0, hasRgb = false;
        for (let i = 0; i < roles.length; i++) {
          const v = universe[fx.address - 1 + i] ?? 0;
          if (roles[i] === "r") { r = v; hasRgb = true; }
          else if (roles[i] === "g") { g = v; hasRgb = true; }
          else if (roles[i] === "b") { b = v; hasRgb = true; }
          else if (roles[i] === "w") { w = v; }
          else if (roles[i] === "dim") { r = g = b = v; hasRgb = true; }
        }
        if (hasRgb) { rs += Math.min(255, r + w); gs += Math.min(255, g + w); bs += Math.min(255, b + w); n++; }
      }
      if (n > 0) bleClient.setColor(rs / n / 255, gs / n / 255, bs / n / 255, cfg.master);
    }
  }
});

capture.on("stderr", (s) => console.error("[arecord]", s));
capture.on("exit", (code) => console.error("[arecord] exited", code));

capture.start();


// Shared mode cycler — used by both the physical button and the WS "cycleMode" message,
// so UI and hardware follow the exact same path.
let server: Server | undefined;
const cycleMode = (): Mode => {
  // Filter to modes the user has enabled in rotation; fall back to the full
  // list if they disabled everything so the button never becomes a no-op.
  const enabled = MODE_CYCLE.filter((m) => cfg.rotation?.[m] !== false);
  const list = enabled.length > 0 ? enabled : MODE_CYCLE;
  const cur = list.indexOf(cfg.mode);
  cfg.mode = list[(cur + 1) % list.length];
  scheduleSave(cfg);
  server?.broadcastConfig();   // kan anropas innan `server` tilldelats (WS i startfönstret)
  return cfg.mode;
};

// BLE-sidecarn (BLEDOM-slingor) — instansieras här så motorn kan mata färger
// varje render-frame. Om sidecarn är nere, socketen saknas, eller ingen slinga
// är parad så är alla setColor/scan-anrop tysta no-ops → resten av showen bryr
// sig inte.
const bleClient = new BleClient();
const bleScanSubs: ((d: BleScanDevice[]) => void)[] = [];
const blePairedSubs: (() => void)[] = [];
bleClient.setListeners({
  onScan:   (devices) => { for (const fn of bleScanSubs)  fn(devices); },
  onPaired: () =>        { for (const fn of blePairedSubs) fn(); },
});
bleClient.setKnownDevices(cfg.bleDevices ?? []);
bleClient.start();

const serverDeps = {
  cfg,
  getLatestFrame: () => latestFrame,
  getActiveMode: () => effects.getActiveMode(),
  // Frisk = en ljud-chunk bearbetad senaste 10 s (arecord + event-loop lever).
  getHealthy: () => Date.now() - lastChunkAt < 10000,
  getFogStatus: () => effects.getFogStatus(),
  resetFogService: () => effects.resetFogService(),
  cycleMode,

  resetAgc: (g?: number) => analyser.resetGain(g),
  setGainLock: (locked: boolean) => analyser.setGainLock(locked, 1),
  onConfigChanged: () => {
    scheduleSave(cfg);
    curSlots = slotsFor();
    dmx.setMaxHz(cfg.dmxMaxHz);
    if (ring && cfg.intensityRing) ring.setOptions({
      maxBright: cfg.intensityRing.maxBright,
      pulseBoost: cfg.intensityRing.pulseBoost,
      blackoutFadeMs: cfg.intensityRing.blackoutFadeMs,
    });
    // Håll sidecarns persisterade lista i synk (paired/unpaired från vilket UI som helst).
    bleClient.setKnownDevices(cfg.bleDevices ?? []);
  },
  ble: {
    activeCount: () => bleClient.activeCount,
    paired: () => bleClient.pairedCache,
    scan:   () => bleClient.scan(),
    pair:   (mac: string) => bleClient.pair(mac),
    unpair: (mac: string) => bleClient.unpair(mac),
    identify: (mac: string) => bleClient.identify(mac),
    setCal: (mac, cal) => bleClient.setCal(mac, cal),
    onScan:   (fn: (d: BleScanDevice[]) => void) => { bleScanSubs.push(fn); },
    onPaired: (fn: () => void) => { blePairedSubs.push(fn); },
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
    server?.broadcastConfig();
  });
  button.on("stderr", (s) => console.error("[gpiomon]", s));
  button.on("exit", (code) => console.error("[gpiomon] exited", code));
  button.start();
  console.log(`mode-button on ${cfg.modeButton.chip} line ${cfg.modeButton.line} (short=mode, long=AGC)`);
}

// KY-040 stämnings-vred → applyIntensity → samma kod-väg som WS "setIntensity".
// UI-slidern och vredet är alltså exakt samma "input" — vem som än rör den
// senast vinner, och båda syns hos alla klienter via `activeIntensity` i frame.
let knob: IntensityKnob | null = null;
let knobSw: Button | null = null;
if (cfg.intensityKnob) {
  const k = cfg.intensityKnob;
  knob = new IntensityKnob({
    chip: k.chip, clk: k.clk, dt: k.dt,
    initial: cfg.activeIntensity ?? 0.5,
  });
  knob.on("change", (v: number) => {
    applyIntensity(cfg, v);
    scheduleSave(cfg);
    server?.broadcastConfig();
  });
  knob.on("stderr", (s: string) => console.error("[knob]", s));
  knob.start();
  console.log(`intensity-knob on ${k.chip} CLK=${k.clk} DT=${k.dt}${k.sw != null ? ` SW=${k.sw}` : ""}`);

  // Push-knapp på vredet: kort tryck = hoppa till närmaste bucket-mitt
  // (0/0.5/1); långt tryck = blackout-toggle.
  if (k.sw != null) {
    knobSw = new Button({ chip: k.chip, line: k.sw });
    knobSw.on("press", () => {
      const x = cfg.activeIntensity ?? 0.5;
      const next = x < 1 / 3 ? 0.5 : x < 2 / 3 ? 1 : 0;
      applyIntensity(cfg, next);
      knob?.set(next);
      scheduleSave(cfg);
      server?.broadcastConfig();
      console.log(`[knob-sw] intensity → ${next.toFixed(2)}`);
    });
    knobSw.on("longPress", () => {
      cfg.mode = cfg.mode === "blackout" ? "smart" : "blackout";
      scheduleSave(cfg);
      server?.broadcastConfig();
    });
    knobSw.start();
  }

  // WS "setIntensity" från UI: håll vredets interna värde synkat så nästa
  // detent-vridning fortsätter från rätt position (och inte hoppar tillbaka).
  const origBroadcast = server?.broadcastConfig;
  if (origBroadcast && server) {
    server.broadcastConfig = () => { knob?.set(cfg.activeIntensity ?? knob.get()); origBroadcast.call(server); };
  }
}

// WS2812B LED-ring (Electrokit 12-LED) — visuell återkoppling för vredet på
// själva boxen: hyresgäster ser direkt vilket steg de valt utan att titta i UI:t.
let ring: KnobRing | null = null;
if (cfg.intensityRing) {
  const r = cfg.intensityRing;
  ring = new KnobRing({
    bus: r.bus, device: r.device,
    maxBright: r.maxBright, pulseBoost: r.pulseBoost, blackoutFadeMs: r.blackoutFadeMs,
  });
  ring.start();
  console.log(`intensity-ring on SPI${r.bus}.${r.device} (12 × WS2812B, max ${Math.round(r.maxBright * 100)}%)`);
}

// Rökens drifträknare tickar i RENDERLOOPEN, inte via config-meddelanden — utan
// det här skulle de bara nå flashen av en slump (nästa gång någon råkar röra en
// inställning). Spara var 5:e minut, och bara när något faktiskt rökt sedan
// sist: en tomgångsskrivning per 5 min hela kvällen sliter på SD-kortet i onödan.
let savedSprayMs = cfg.fog?.sprayMs ?? 0;
setInterval(() => {
  const s = cfg.fog?.sprayMs ?? 0;
  if (s !== savedSprayMs) { savedSprayMs = s; scheduleSave(cfg); }
}, 300000);

process.on("SIGTERM", () => {
  capture.stop();
  button?.stop();
  knob?.stop();
  knobSw?.stop();
  ring?.stop();
  dmx.close();
  process.exit(0);
});
