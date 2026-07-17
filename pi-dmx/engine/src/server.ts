/**
 * Fastify HTTP + WebSocket for the mobile control UI.
 *
 * Serves the static PWA at / and exposes /ws for realtime state.
 * Config mutations from the client are applied to the shared config object
 * (which the effect engine reads every frame).
 */

import Fastify, { FastifyInstance } from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyWebsocket from "@fastify/websocket";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import type { EngineConfig, FixtureConfig, Mode, FixturePreset, ChannelRole } from "./config.js";
import { fixtureRoles } from "./config.js";
import type { Frame } from "./analyser.js";
import { EFFECT_MAP, EFFECT_META } from "./effects/registry.js";


const __dirname = dirname(fileURLToPath(import.meta.url));

// The card-level jack switches (Onboard MIC / MIC Jack / AUX Jack) are NOT
// captured by alsactl and reset to defaults (room mic ON) on every restore —
// they must be set explicitly after each state load.
export function applyInputRouting(input: "aux" | "mic") {
  // Hela analoga kedjan sätts explicit — restore tappar även Aux-amp/mixins.
  const sw = input === "aux"
    ? "amixer -c 0 -q set 'AUX Jack' on; amixer -c 0 -q set 'Onboard MIC' off; amixer -c 0 -q set 'MIC Jack' off; " +
      "amixer -c 0 -q set 'Aux' 53 on; amixer -c 0 -q set 'Mixin Left Aux Left' on; amixer -c 0 -q set 'Mixin Right Aux Right' on"
    : "amixer -c 0 -q set 'Onboard MIC' on; amixer -c 0 -q set 'AUX Jack' off; amixer -c 0 -q set 'MIC Jack' off; " +
      "amixer -c 0 -q set 'Aux' 0 off; amixer -c 0 -q set 'Mixin Left Aux Left' off; amixer -c 0 -q set 'Mixin Right Aux Right' off";
  spawn("sh", ["-c", `alsactl restore 0 -f /etc/alsa/codec-zero-${input}.state 2>/dev/null; ${sw}`], { stdio: "ignore" })
    .on("error", (e) => console.error("[audioInput] spawn:", (e as Error).message));   // annars kraschar ett spawn-fel hela root-processen
}

export interface ServerDeps {
  cfg: EngineConfig;
  getLatestFrame: () => Frame | null;
  /** Effekten som renderas just nu (smart-läget roterar). */
  getActiveMode: () => Mode;
  /** True om ljud-pipelinen bearbetat en frame nyligen (för watchdog /health). */
  getHealthy: () => boolean;
  onConfigChanged?: () => void;
  /** Advance to the next mode in the shared cycle. Returns the new mode. */
  cycleMode: () => Mode;
  /** Reset the AGC after an input-routing switch. */
  resetAgc: (startGain?: number) => void;
  setGainLock: (locked: boolean) => void;
}

export interface Server {
  app: FastifyInstance;
  /** Push current config to all connected clients (e.g. after a physical button press) */
  broadcastConfig: () => void;
}

export async function startServer(
  deps: ServerDeps,
  port = 80,
  tls?: { key: Buffer; cert: Buffer },
): Promise<Server> {
  const app = Fastify((tls ? { logger: false, https: tls } : { logger: false }) as any) as unknown as FastifyInstance;

  // Identify runner: blinks fixtures in order (or one specific fixture) so the
  // user can visually locate them. All state lives on cfg.identify so the
  // effect engine picks it up on the next frame.
  let identifyTimer: NodeJS.Timeout | null = null;
  const stopIdentify = () => {
    if (identifyTimer) { clearInterval(identifyTimer); identifyTimer = null; }
    deps.cfg.identify = null;
    broadcast();
  };
  const startIdentifyAll = (stepMs = 700) => {
    stopIdentify();
    if (deps.cfg.fixtures.length === 0) return;
    let i = 0;
    deps.cfg.identify = { index: 0 };
    broadcast();
    identifyTimer = setInterval(() => {
      i++;
      if (i >= deps.cfg.fixtures.length) { stopIdentify(); return; }
      deps.cfg.identify = { index: i };
      broadcast();
    }, stepMs);
  };
  const identifyOne = (index: number, holdMs = 1500) => {
    stopIdentify();
    if (index < 0 || index >= deps.cfg.fixtures.length) return;
    deps.cfg.identify = { index };
    broadcast();
    identifyTimer = setTimeout(() => stopIdentify(), holdMs);
  };
  const broadcast = () => {
    const payload = JSON.stringify({ type: "config", config: deps.cfg });
    for (const c of app.websocketServer.clients) {
      if (c.readyState === 1) c.send(payload);
    }
  };

  await app.register(fastifyWebsocket);
  await app.register(fastifyStatic, {
    root: join(__dirname, "..", "public"),
    prefix: "/",
  });
  // Ägar-/setup-sida: samma app, men fixture-/system-/wifi-sektionerna avslöjas
  // bara här (klienten kollar /setup i URL:en). Hyresgäster använder "/".
  app.get("/setup", (_req, reply) => reply.sendFile("index.html"));

  // CAPTIVE PORTAL: när en telefon/laptop ansluter till Pi-AP:n gör OS:et en
  // "internet-koll" mot en känd URL. DNS på AP:n (dnsmasq-shared.d) pekar ALLA
  // domäner till 192.168.4.1 → koll-requesten landar här. Vi svarar med en 302 →
  // OS:et ser "ingen internet, inloggning krävs" och poppar upp kontroll-sidan
  // automatiskt. Redirect till "/" (hyresgäst-vyn), INTE /setup (ägar-sektioner).
  const CAPTIVE_PORTAL = "http://192.168.4.1/";
  const captiveRedirect = (_req: any, reply: any) => reply.code(302).header("location", CAPTIVE_PORTAL).send();
  // OS-specifika probe-URLer (explicita → vinner över statiska filens wildcard).
  for (const p of [
    "/generate_204", "/gen_204",                 // Android / Chrome OS
    "/hotspot-detect.html",                        // Apple iOS/macOS (CNA)
    "/library/test/success.html",                  // Apple (äldre)
    "/connecttest.txt", "/ncsi.txt", "/redirect",  // Windows NCSI
    "/canonical.html",                             // Firefox
  ]) app.get(p, captiveRedirect);
  // Fallback: alla övriga okända GET (andra probe-varianter, godtyckliga domäner
  // OS:et testar) → samma redirect. Icke-GET behåller normal 404.
  app.setNotFoundHandler((req, reply) => {
    if (req.method === "GET") return captiveRedirect(req, reply);
    return reply.code(404).send();
  });

  // Hälsokoll för watchdog: 200 om ljud-pipelinen lever, annars 503 → watchdogen
  // startar om motorn (fångar ett HÄNG som Restart=always inte ser).
  app.get("/health", (_req, reply) => {
    if (deps.getHealthy()) reply.code(200).send("ok");
    else reply.code(503).send("stale");
  });


  // ---- Self-update ---------------------------------------------------------
  // The repo lives at /root/pi-dmx-src (or wherever `git clone` put it).
  // Override with PI_DMX_REPO=/path if you cloned elsewhere.
  const REPO = process.env.PI_DMX_REPO ?? "/root/pi-dmx-src";
  const UPDATE_LOG = "/var/log/pi-dmx-update.log";

  const gitInfo = () => {
    try {
      const sha = execFileSync("git", ["-C", REPO, "rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
      const msg = execFileSync("git", ["-C", REPO, "log", "-1", "--pretty=%s"], { encoding: "utf8" }).trim();
      const date = execFileSync("git", ["-C", REPO, "log", "-1", "--pretty=%cI"], { encoding: "utf8" }).trim();
      return { sha, msg, date, repo: REPO };
    } catch (e) {
      return { error: (e as Error).message, repo: REPO };
    }
  };

  app.get("/update/status", async () => {
    const log = existsSync(UPDATE_LOG)
      ? readFileSync(UPDATE_LOG, "utf8").split("\n").slice(-40).join("\n")
      : "";
    return { ...gitInfo(), log };
  });

  app.post("/update", async (_req, reply) => {
    // Detach via systemd-run so the install.sh restart of audio-dmx-engine
    // doesn't kill the updater mid-run.
    try {
      const up = spawn("systemd-run", [
        "--unit=pi-dmx-update",
        "--collect",
        "--quiet",
        "/bin/bash", `${REPO}/pi-dmx/update.sh`,
      ], { detached: true, stdio: "ignore" });
      up.on("error", (e) => console.error("[update] spawn:", (e as Error).message));   // ej krascha om systemd-run saknas
      up.unref();
      return reply.send({ started: true });
    } catch (e) {
      return reply.code(500).send({ error: (e as Error).message });
    }
  });

  // ---- WiFi / phone hotspot ------------------------------------------------
  // The appliance has two network personalities, chosen at boot by
  // autoconnect-priority: the user's phone hotspot (200, internet for updates
  // and online features) wins over the own AP "pi-dmx" (100, offline gigs).
  const HOTSPOT_CON = "phone-hotspot";
  const nmcli = (...args: string[]) =>
    execFileSync("nmcli", args, { encoding: "utf8" }).trim();
  const hotspotSsid = (): string | null => {
    try {
      const ssid = nmcli("-g", "802-11-wireless.ssid", "con", "show", HOTSPOT_CON);
      return ssid || null;
    } catch { return null; }
  };

  app.get("/wifi/status", async () => {
    try {
      const active = nmcli("-t", "-f", "NAME,DEVICE", "con", "show", "--active")
        .split("\n").find((l) => l.endsWith(":wlan0"))?.split(":")[0] ?? null;
      return { active, apCon: active === "pi-dmx-ap", hotspotSsid: hotspotSsid() };
    } catch (e) {
      return { error: (e as Error).message };
    }
  });

  app.post("/wifi/hotspot", async (req, reply) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const ssid = typeof b.ssid === "string" ? b.ssid.trim() : "";
    const password = typeof b.password === "string" ? b.password : "";
    if (ssid.length < 1 || ssid.length > 32)
      return reply.code(400).send({ error: "SSID måste vara 1–32 tecken" });
    if (password !== "" && (password.length < 8 || password.length > 63))
      return reply.code(400).send({ error: "Lösenord måste vara 8–63 tecken (eller tomt för öppet nät)" });
    try {
      try { nmcli("con", "delete", HOTSPOT_CON); } catch { /* didn't exist */ }
      nmcli("con", "add", "type", "wifi", "ifname", "wlan0",
        "con-name", HOTSPOT_CON, "ssid", ssid, "autoconnect", "yes");
      nmcli("con", "modify", HOTSPOT_CON, "connection.autoconnect-priority", "200");
      if (password !== "") {
        nmcli("con", "modify", HOTSPOT_CON,
          "802-11-wireless-security.key-mgmt", "wpa-psk",
          "802-11-wireless-security.psk", password);
      }
      return { saved: true, ssid };
    } catch (e) {
      return reply.code(500).send({ error: (e as Error).message });
    }
  });

  app.post("/wifi/hotspot/connect", async (_req, reply) => {
    if (!hotspotSsid()) return reply.code(400).send({ error: "Ingen hotspot sparad" });
    // Detached: switching wlan0 away from the AP kills this HTTP connection,
    // so fire-and-forget and let the client show its own guidance.
    spawn("nmcli", ["con", "up", HOTSPOT_CON], { detached: true, stdio: "ignore" })
      .on("error", (e) => console.error("[wifi] spawn:", (e as Error).message)).unref();
    return { switching: true };
  });

  app.delete("/wifi/hotspot", async (_req, reply) => {
    try {
      nmcli("con", "delete", HOTSPOT_CON);
      return { deleted: true };
    } catch (e) {
      return reply.code(500).send({ error: (e as Error).message });
    }
  });

  app.register(async (f) => {
    f.get("/ws", { websocket: true }, (conn) => {
      // @fastify/websocket v10+ passes the raw WebSocket; older versions pass
      // a SocketStream with `.socket`. Support both.
      const sock: any = (conn as any).socket ?? conn;
      // Send initial state — effekt-katalogen (en sanningskälla för UI-listorna)
      // följt av configen.
      sock.send(JSON.stringify({ type: "effects", effects: EFFECT_META }));
      sock.send(JSON.stringify({ type: "config", config: deps.cfg }));

      // Push frame samples at 20 Hz for the level meter + beat diagnostics.
      // Beat-lås-prick: servern kör på Pi:n (samma klocka som frame.beatAnchorMs)
      // → räkna takt-index och flagga `beat:true` den push där det gick fram.
      // Klock-oberoende av klienten (ingen Pi/telefon-tidsskillnad).
      let lastBeatIdx = -1;
      const push = setInterval(() => {
        const frame = deps.getLatestFrame();
        if (frame && sock.readyState === 1 && (sock.bufferedAmount ?? 0) < 4096) {
          let beat = false;
          if (frame.bpm > 40 && frame.beatAnchorMs > 0) {
            const beatMs = 60000 / frame.bpm;
            const idx = Math.floor((Date.now() - frame.beatAnchorMs) / beatMs);
            if (idx !== lastBeatIdx) { if (lastBeatIdx >= 0 && idx > lastBeatIdx) beat = true; lastBeatIdx = idx; }
          } else { lastBeatIdx = -1; }
          sock.send(JSON.stringify({
            type: "frame",
            level: frame.level,
            energy: frame.energy,
            kick: frame.kick,
            gain: frame.gain,
            bpm: frame.bpm,
            bpmConfidence: frame.bpmConfidence,
            beat,
            mode: deps.getActiveMode(),
          }));

        }
      }, 50);

      sock.on("message", (raw: Buffer) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.type === "setMode" && isMode(msg.mode)) {
            deps.cfg.mode = msg.mode;
          } else if (msg.type === "cycleMode") {
            const next = deps.cycleMode();
            sock.send(JSON.stringify({ type: "modeChanged", mode: next }));
          } else if (msg.type === "setSensitivity") {
            deps.cfg.sensitivity = clamp01(msg.value);
          } else if (msg.type === "setAudioInput" && (msg.value === "aux" || msg.value === "mic")) {
            deps.cfg.audioInput = msg.value;
            applyInputRouting(msg.value);
            deps.resetAgc(msg.value === "mic" ? 20 : 1);
            deps.setGainLock(msg.value !== "mic");
          } else if (msg.type === "setDynamics") {
            deps.cfg.dynamics = clamp01(msg.value);
          } else if (msg.type === "setMaster") {
            deps.cfg.master = clamp01(msg.value);
          } else if (msg.type === "setFixtures" && Array.isArray(msg.fixtures)) {
            const cleaned = sanitizeFixtures(msg.fixtures);
            if (cleaned) { deps.cfg.fixtures = cleaned; stopIdentify(); }
          } else if (msg.type === "identifyAll") {
            startIdentifyAll(typeof msg.stepMs === "number" ? msg.stepMs : 700);
            return; // broadcast already handled
          } else if (msg.type === "identifyOne" && typeof msg.index === "number") {
            identifyOne(msg.index);
            return;
          } else if (msg.type === "identifyStop") {
            stopIdentify();
            return;
          } else if (msg.type === "setCalTest") {
            // Kalibrerings-slider: tvinga en lampa till ett rått DMX-värde. index<0 = av.
            const idx = Math.floor(Number(msg.index));
            if (Number.isFinite(idx) && idx >= 0 && idx < deps.cfg.fixtures.length) {
              stopIdentify();
              const chSel = (["all", "r", "g", "b", "w"].includes(msg.channel as string) ? msg.channel : "all") as "all" | "r" | "g" | "b" | "w";
              deps.cfg.calTest = { index: idx, value: Math.max(0, Math.min(255, Math.floor(Number(msg.value)) || 0)), channel: chSel };
            } else {
              deps.cfg.calTest = null;
            }
          } else if (msg.type === "setDmxMaxHz" && typeof msg.value === "number") {
            deps.cfg.dmxMaxHz = Math.max(30, Math.min(500, Math.round(msg.value)));
          } else if (msg.type === "setAgcTarget" && typeof msg.value === "number") {
            // Target loudness the AGC aims for (0.2 = subtle, 0.8 = punchy).
            deps.cfg.detection.autoGainTarget = Math.max(0.1, Math.min(0.9, msg.value));
          } else if (msg.type === "setAgcAggressiveness" && typeof msg.value === "number") {
            // Single knob → both tau values on a log curve.
            // 0 = slow (tauUp 180 s / tauDown 60 s), 1 = fast (10 s / 2 s).
            const a = Math.max(0, Math.min(1, msg.value));
            deps.cfg.detection.tauUp   = 180 * Math.pow(10 / 180, a);
            deps.cfg.detection.tauDown = 60  * Math.pow(2  / 60,  a);
          } else if (msg.type === "setBeatPulse") {
            deps.cfg.beatPulse = !!msg.value;
          } else if (msg.type === "setBeatSyncStrength" && typeof msg.value === "number") {
            deps.cfg.beatSyncStrength = Math.max(0, Math.min(0.5, msg.value));
          } else if (msg.type === "setEnergyDrivesMode") {
            deps.cfg.energyDrivesMode = !!msg.value;
          } else if (msg.type === "setRotation" && typeof msg.mode === "string") {
            deps.cfg.rotation = { ...deps.cfg.rotation, [msg.mode]: !!msg.value };
          } else if (msg.type === "setSmartDwell") {
            const m = { slow: 20000, normal: 9000, fast: 4000 } as Record<string, number>;
            deps.cfg.smartDwellMs = m[msg.mode as string] ?? 9000;
          } else if (msg.type === "setFog" && msg.fog && typeof msg.fog === "object") {
            const f = msg.fog as Record<string, unknown>;
            const cur = deps.cfg.fog ?? { enabled: false, address: 128, onDrop: true, burstMs: 2500, cooldownMs: 25000, level: 255 };
            deps.cfg.fog = {
              enabled: typeof f.enabled === "boolean" ? f.enabled : cur.enabled,
              address: typeof f.address === "number" ? Math.max(1, Math.min(512, Math.round(f.address))) : cur.address,
              onDrop: typeof f.onDrop === "boolean" ? f.onDrop : cur.onDrop,
              burstMs: typeof f.burstMs === "number" ? Math.max(200, Math.min(8000, Math.round(f.burstMs))) : cur.burstMs,
              cooldownMs: typeof f.cooldownMs === "number" ? Math.max(0, Math.min(300000, Math.round(f.cooldownMs))) : cur.cooldownMs,
              level: typeof f.level === "number" ? Math.max(0, Math.min(255, Math.round(f.level))) : cur.level,
            };
          } else if (msg.type === "setDropBlackout") {
            deps.cfg.dropBlackout = !!msg.value;
          } else if (msg.type === "setScenicAnchor") {
            deps.cfg.scenicAnchor = !!msg.value;
          } else if (msg.type === "setEnergyCeiling") {
            deps.cfg.energyCeiling = !!msg.value;
          } else if (msg.type === "setClubMode") {
            deps.cfg.clubMode = !!msg.value;
          } else if (msg.type === "setAmbientGlow") {
            deps.cfg.ambientGlow = !!msg.value;
          } else if (msg.type === "setRiserStrobe") {
            deps.cfg.riserStrobe = !!msg.value;
          } else if (msg.type === "setDropHeadroom") {
            deps.cfg.dropHeadroom = !!msg.value;
          } else if (msg.type === "fogNow") {
            deps.cfg.fogTrigger = true;   // engångs-puff (motorn nollställer flaggan)
          }
          deps.onConfigChanged?.();
          // Echo back
          for (const c of app.websocketServer.clients) {
            if (c.readyState === 1 && ((c as any).bufferedAmount ?? 0) < 8192) c.send(JSON.stringify({ type: "config", config: deps.cfg }));
          }
        } catch { /* ignore malformed */ }
      });

      sock.on("close", () => clearInterval(push));
    });
  });

  await app.listen({ port, host: "0.0.0.0" });

  const broadcastConfig = () => {
    const payload = JSON.stringify({ type: "config", config: deps.cfg });
    for (const c of app.websocketServer.clients) {
      if (c.readyState === 1) c.send(payload);
    }
  };
  return { app, broadcastConfig };
}

function isMode(m: unknown): m is Mode {
  return typeof m === "string" &&
    (m === "smart" || m === "blackout" || EFFECT_MAP.has(m as Mode));
}
const clamp01 = (x: number) => typeof x === "number" && x >= 0 && x <= 1 ? x : 0;

const VALID_PRESETS: FixturePreset[] = ["rgb", "rgbw", "dimmer", "custom"];
const VALID_ROLES: ChannelRole[] = ["r", "g", "b", "w", "dim", "strobe", "unused"];

/** Validate + normalize a fixtures[] patch. Returns null if any entry is bogus. */
function sanitizeFixtures(input: unknown[]): FixtureConfig[] | null {
  const out: FixtureConfig[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;
    const name = typeof r.name === "string" ? r.name.slice(0, 40) : "Fixture";
    const address = Math.floor(Number(r.address));
    const preset = r.preset as FixturePreset;
    if (!Number.isFinite(address) || address < 1 || address > 512) return null;
    if (!VALID_PRESETS.includes(preset)) return null;

    let roles: ChannelRole[] | undefined;
    if (preset === "custom") {
      if (!Array.isArray(r.roles) || r.roles.length === 0 || r.roles.length > 32) return null;
      roles = [];
      for (const role of r.roles) {
        if (!VALID_ROLES.includes(role as ChannelRole)) return null;
        roles.push(role as ChannelRole);
      }
    }
    const bandsArr = Array.isArray(r.bands)
      ? ([...new Set(r.bands.filter((b) => ["bass", "mid", "treble", "kick", "low"].includes(b as string)))] as NonNullable<FixtureConfig["bands"]>)
      : undefined;
    // Per-lampa ljus-kalibrering: off/on klippta till 0..255. Släpps om båda 0.
    let cal: FixtureConfig["cal"];
    if (r.cal && typeof r.cal === "object") {
      const cr = r.cal as Record<string, unknown>;
      const clampByte = (x: unknown) => Math.max(0, Math.min(255, Math.floor(Number(x)) || 0));
      const off = clampByte(cr.off), on = clampByte(cr.on);
      // Per-färg-trösklar (valfria): bara med om satta (>0).
      const perCol: Record<string, number> = {};
      for (const k of ["onR", "onG", "onB", "onW"] as const) { const v = clampByte(cr[k]); if (v > 0) perCol[k] = v; }
      if (off > 0 || on > 0 || Object.keys(perCol).length) cal = { off, on, ...perCol };
    }
    const fx: FixtureConfig = { name, address, preset, ...(roles ? { roles } : {}), ...(bandsArr?.length ? { bands: bandsArr } : {}), ...(cal ? { cal } : {}) };

    // Check the fixture fits within the universe
    const width = fixtureRoles(fx).length;
    if (address + width - 1 > 512) return null;

    out.push(fx);
  }
  return out;
}
