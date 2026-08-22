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
import { readFileSync, existsSync, writeFileSync, copyFileSync } from "node:fs";
import type { EngineConfig, FixtureConfig, Mode, FixturePreset, ChannelRole } from "./config.js";
import { fixtureRoles, defaultConfig } from "./config.js";
import { applyMood, applyIntensity, isMood } from "./moods.js";
import type { FogStatus } from "./effects.js";
import type { Frame } from "./analyser.js";
import { EFFECT_MAP, EFFECT_META } from "./effects/registry.js";
import { logHealth, getHealthLog } from "./healthLog.js";

// Version hämtas från package.json vid startup — ingen build-tid-magi, bara en
// synkron read en gång per process.
let PKG_VERSION = "dev";
try {
  const pkgPath = join(__dirname_shim(), "..", "package.json");
  PKG_VERSION = JSON.parse(readFileSync(pkgPath, "utf8")).version || "dev";
} catch { /* dev-läge utan package.json bredvid dist/ */ }
function __dirname_shim() { return dirname(fileURLToPath(import.meta.url)); }


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
  /** True om DMX-sockeln mot helpern är öppen. UI:t visar röd banner annars. */
  getDmxConnected: () => boolean;
  /** Rökmaskinens tillstånd (uppvärmning/värmekonto/drifträknare). null = ej ansluten. */
  getFogStatus: () => FogStatus | null;
  /** Nollställ rökmaskinens drifträknare efter underhåll. */
  resetFogService: () => void;
  /** Låtminnets tillstånd (igenkänning/inlärning) + glöm-knapp. */
  songMemory?: {
    state: () => { songs: number; known: boolean; plays: number; confidence: number; positionMs: number; learning: boolean; refining: boolean };
    forget: () => void;
    /** Manuell inlärning: användaren markerar låtgränserna själv. */
    manualStart: () => void;
    manualNext: () => void;
    manualStop: () => void;
    list: () => { id: number; durationMs: number; plays: number; drops: number; bpm: number; refined: boolean; note: string; dropTimes: number[] }[];
    setNote: (id: number, note: string) => void;
    forgetSong: (id: number) => void;
    dumpCurve: (id: number) => void;
  };
  probeDmx?: (channels: number[], frames: number) => void;
  /** Strukturkons lage for UI:t: hur manga vantar, hur manga ar klara. */
  structureStatus?: () => { pending: number; analysed: number; busy: boolean; error: string };
  /** Per lat: hur langt strukturanalysen kommit — visas i latlistan. */
  structureInfo?: (songId: number) => { parts: number; kinds: string[]; pending: boolean; active: boolean };
  onConfigChanged?: () => void;

  /** Advance to the next mode in the shared cycle. Returns the new mode. */
  cycleMode: () => Mode;
  /** Reset the AGC after an input-routing switch. */
  resetAgc: (startGain?: number) => void;
  setGainLock: (locked: boolean) => void;
  /** BLE sidecar bridge. Optional — null when hardware / sidecar isn't available. */
  ble?: {
    activeCount: () => number;
    paired: () => { mac: string; name: string; chip: "bledom" | "unknown"; connected: boolean; cal?: { rGain: number; gGain: number; bGain: number; maxBrightness: number; gamma: number } }[];
    scan: () => void;
    pair: (mac: string) => void;
    unpair: (mac: string) => void;
    /** Blinka en specifik slinga i identifieringsfärg så användaren kan bekräfta vilken fysisk enhet det är. */
    identify: (mac: string) => void;
    /** Live-uppdatera vitbalans, max-ljus och gamma per slinga. */
    setCal: (mac: string, cal: { rGain: number; gGain: number; bGain: number; maxBrightness: number; gamma: number }) => void;
    /** Register a listener called whenever a scan finishes. */
    onScan: (fn: (devices: { mac: string; name: string; chip: "bledom" | "unknown"; rssi: number }[]) => void) => void;
    /** Register a listener called whenever the paired list changes. */
    onPaired: (fn: () => void) => void;
  };
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
  /** Fan out till alla anslutna klienter. Utan argument = aktuell config. */
  const broadcast = (payload?: unknown) => {
    const s = JSON.stringify(payload ?? { type: "config", config: deps.cfg });
    for (const c of app.websocketServer.clients) {
      if (c.readyState === 1) c.send(s);
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

  // ---- Version + systemlogg ------------------------------------------------
  // Uthyrning: när något går fel behöver support kunna se "vilken firmware" och
  // "vad hände de senaste minuterna" utan SSH. Version läses en gång vid start
  // (PKG_VERSION), logg är en ring­buffert i minnet (se healthLog.ts).
  app.get("/api/version", async () => ({ version: PKG_VERSION }));
  app.get("/api/health-log", async () => ({
    version: PKG_VERSION,
    now: Date.now(),
    events: getHealthLog(),
  }));

  // ---- Config export / import ---------------------------------------------
  // Ägaren kan ladda ner config.json som backup och ladda upp igen — så en
  // brickad enhet kan återskapas på 30 s utan att paras om alla lampor/BLE.
  const CFG_PATH = process.env.CONFIG_PATH ?? "/var/lib/audio-dmx-engine/config.json";
  app.get("/api/config/export", async (_req, reply) => {
    // Strippa transienta fält (samma som persist.ts) så exporten är ren.
    // replicateToken strippas OCKSA: exporten ar en fil agaren delar och sparar,
    // och en API-nyckel i klartext dar ar en lackande hemlighet som overlever
    // langt efter att den glomts bort. Den bor bara i configen pa Pi:n.
    const { identify: _1, beat: _2, beatErr: _3, fogTrigger: _4, walkTest: _5, calTest: _6, replicateToken: _7,
            acrKey: _8, acrSecret: _9, ...persist } = deps.cfg as any;
    const body = JSON.stringify({ version: PKG_VERSION, exportedAt: new Date().toISOString(), config: persist }, null, 2);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    return reply
      .header("content-type", "application/json")
      .header("content-disposition", `attachment; filename="pi-dmx-config-${stamp}.json"`)
      .send(body);
  });

  app.post("/api/config/import", async (req, reply) => {
    // Accepterar antingen { config: {...} } (från vår export) eller ett rått
    // config-objekt (för händigt manuellt bruk). Skriver till samma sökväg
    // som persist.ts men går förbi debouncern → syns direkt efter restart.
    const body = req.body as any;
    const incoming = body && typeof body === "object"
      ? (body.config && typeof body.config === "object" ? body.config : body)
      : null;
    if (!incoming || typeof incoming !== "object") {
      return reply.code(400).send({ error: "invalid JSON body" });
    }
    // Grov sanity check: måste ha en fixtures-array (matchar persist.ts).
    if (!Array.isArray(incoming.fixtures)) {
      return reply.code(400).send({ error: "config saknar fixtures[]" });
    }
    try {
      // Behåll nuvarande som .import-<ts>-backup ifall användaren ångrar sig.
      try {
        const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        copyFileSync(CFG_PATH, `${CFG_PATH}.import-${ts}.bak`);
      } catch { /* first import, no prior */ }
      writeFileSync(CFG_PATH, JSON.stringify(incoming, null, 2), "utf8");
      logHealth("info", "config", "importerad — startar om motorn");
      // Motorn läser config i startup → begär restart. Detached så vi hinner svara.
      spawn("systemd-run", ["--unit=pi-dmx-restart", "--collect", "--quiet",
        "systemctl", "restart", "audio-dmx-engine"], { detached: true, stdio: "ignore" })
        .on("error", (e) => console.error("[import] restart spawn:", (e as Error).message)).unref();
      return reply.send({ imported: true, restarting: true });
    } catch (e) {
      logHealth("err", "config", `import misslyckades: ${(e as Error).message}`);
      return reply.code(500).send({ error: (e as Error).message });
    }
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
      logHealth("info", "update", "OTA-uppdatering startad");
      return reply.send({ started: true });
    } catch (e) {
      logHealth("err", "update", `start misslyckades: ${(e as Error).message}`);
      return reply.code(500).send({ error: (e as Error).message });
    }
  });

  // Rollback: kör rollback.sh som checkar ut `.prev-sha` sparad av senaste
  // update.sh och kör om install. Samma detachning som /update — annars killar
  // engine-restarten scriptet halvvägs.
  app.post("/update/rollback", async (_req, reply) => {
    try {
      const up = spawn("systemd-run", [
        "--unit=pi-dmx-rollback", "--collect", "--quiet",
        "/bin/bash", `${REPO}/pi-dmx/rollback.sh`,
      ], { detached: true, stdio: "ignore" });
      up.on("error", (e) => console.error("[rollback] spawn:", (e as Error).message));
      up.unref();
      logHealth("warn", "update", "rollback startad");
      return reply.send({ started: true });
    } catch (e) {
      logHealth("err", "update", `rollback misslyckades: ${(e as Error).message}`);
      return reply.code(500).send({ error: (e as Error).message });
    }
  });

  // Fabriks-reset: flytta undan configen (BEHÅLL den som .factory-<ts> för
  // återhämtning om ägaren ångrar sig), tvinga en systemd-restart så motorn
  // laddar defaults. Fixtures FÖRSVINNER — det är hela poängen med reset.
  app.post("/factory-reset", async (_req, reply) => {
    try {
      const CFG = process.env.CONFIG_PATH ?? "/var/lib/audio-dmx-engine/config.json";
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      spawn("sh", ["-c", `mv -f ${CFG} ${CFG}.factory-${ts} 2>/dev/null; mv -f ${CFG}.bak ${CFG}.bak.factory-${ts} 2>/dev/null; systemctl restart audio-dmx-engine`], { detached: true, stdio: "ignore" })
        .on("error", (e) => console.error("[factory-reset] spawn:", (e as Error).message)).unref();
      logHealth("warn", "config", "fabriks-reset — motorn startas om");
      return reply.send({ started: true });
    } catch (e) {
      logHealth("err", "config", `fabriks-reset misslyckades: ${(e as Error).message}`);
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

  // ---- Frame-push: EN delad fläkt för alla klienter -------------------------
  // Tidigare hade varje socket sin EGEN 50 ms-timer och sin egen
  // JSON.stringify → N× serialisering och N osynkade pushar. Nu byggs
  // payloaden en gång per tick och samma sträng skickas till alla.
  //
  // TOPPHÅLLNING + BATCH: vi POLLAR frames på 50 Hz men SKICKAR på 20 Hz, och
  // tar MAX av level/energy/kick och OR av beat mellan två pushar. Analysatorn
  // kan variera i takt (375 Hz normalt, men BPM-strid/tystnad glesar ut) utan
  // att mätaren hackar — UI:t får alltid toppen i intervallet istället för ett
  // slumpmässigt ögonblicksvärde som råkade ligga i en dal.
  //
  // Beat-lås-prick: räkna takt-index ur den STABILA PLL-taktklockan (cfg.beat,
  // samma som effekternas beatPulse) och flagga `beat:true` den push där indexet
  // går fram. Servern kör på Pi:n → samma klocka som anchorMs (klient-oberoende).
  // OBS: använd cfg.beat.anchorMs (stabilt, PLL-fasat), INTE frame.beatAnchorMs
  // som hoppar till varje ny kick och nollar indexet → sporadiska blink.
  let lastBeatIdx = -1;
  let pkLevel = 0, pkEnergy = 0, pkKick = 0, pkBeat = false, subTick = 0;
  let frameTimer: ReturnType<typeof setInterval> | null = null;

  const frameTick = () => {
    const frame = deps.getLatestFrame();
    if (!frame) return;
    // 1) Ackumulera topparna (körs 50 Hz).
    if (frame.level > pkLevel) pkLevel = frame.level;
    if (frame.energy > pkEnergy) pkEnergy = frame.energy;
    if (frame.kick > pkKick) pkKick = frame.kick;
    const bc = deps.cfg.beat;
    if (bc && bc.bpm > 40) {
      const idx = Math.floor((Date.now() - bc.anchorMs) / (60000 / bc.bpm));
      if (lastBeatIdx >= 0 && idx > lastBeatIdx) pkBeat = true;
      lastBeatIdx = idx;
    } else { lastBeatIdx = -1; }
    // 2) Skicka varannan tick (20 Hz) — en sträng för alla klienter.
    if (++subTick < 2) return;
    subTick = 0;
    const clients = app.websocketServer.clients;
    if (clients.size === 0) {
      if (frameTimer) { clearInterval(frameTimer); frameTimer = null; }
      return;
    }
    const s = JSON.stringify({
      type: "frame",
      level: pkLevel,
      energy: pkEnergy,
      kick: pkKick,
      gain: frame.gain,
      bpm: frame.bpm,
      bpmConfidence: frame.bpmConfidence,
      intensity: frame.intensity,   // sektionsenergi (diagnostik)
      dropCount: frame.dropCount,   // monoton drop-räknare (diagnostik)
      beatMul: (frame as unknown as Record<string, number>).beatMul,   // hjärtslagets faktiska djup (diagnostik)
      buildUp: frame.buildUp,       // uppbyggnad 0..1 (diagnostik)
      inRiser: frame.inRiser,       // riser PÅGÅR — utan detta fältet läser en
                                    // extern mätning undefined, vilket i en
                                    // percentiltabell ser exakt ut som en nolla.
                                    // Det ledde till slutsatsen "signalen är död"
                                    // och en revert av en korrekt fix (820e7b6).
      inZone: frame.inZone,
      profile: frame.profile,       // karaktarsprofil (diagnostik)
      beat: pkBeat,
      beatErr: deps.cfg.beatErr ?? 0,
      mode: deps.getActiveMode(),
      activeMood: deps.cfg.activeMood,
      activeIntensity: deps.cfg.activeIntensity,   // vred/slider-position (0..1)
      fog: deps.getFogStatus(),     // null när maskinen inte är ansluten
      bleActive: deps.ble?.activeCount() ?? 0,   // antal parade BLE-slingor som är uppkopplade
      // Drift-hälsa: UI:t visar en banner om DMX-helpern är nere eller
      // om parade BLE-slingor tappat kontakt. Billigt att skicka varje
      // frame — samma push-rate som resten (20 Hz).
      dmxOk: deps.getDmxConnected(),
      blePairedCount: deps.ble?.paired().length ?? 0,
      song: deps.songMemory?.state() ?? null,   // låtminne: känd låt / lär in
    });
    pkLevel = 0; pkEnergy = 0; pkKick = 0; pkBeat = false;
    for (const c of clients) {
      if (c.readyState === 1 && ((c as any).bufferedAmount ?? 0) < 4096) c.send(s);
    }
  };

  app.register(async (f) => {
    f.get("/ws", { websocket: true }, (conn) => {
      // @fastify/websocket v10+ passes the raw WebSocket; older versions pass
      // a SocketStream with `.socket`. Support both.
      const sock: any = (conn as any).socket ?? conn;
      // Send initial state — effekt-katalogen (en sanningskälla för UI-listorna)
      // följt av configen.
      sock.send(JSON.stringify({ type: "effects", effects: EFFECT_META }));
      sock.send(JSON.stringify({ type: "config", config: deps.cfg }));

      // Starta den delade fläkten vid första klienten (den stoppar sig själv
      // när sista klienten försvinner).
      if (!frameTimer) { subTick = 0; frameTimer = setInterval(frameTick, 25); }


      sock.on("message", (raw: Buffer) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.type === "setMood" && isMood(msg.value)) {
            // Hyresgäst-stämning: motorn sätter HELA känslan (mode/dynamik/rotation/…).
            applyMood(deps.cfg, msg.value);
          } else if (msg.type === "setIntensity" && typeof msg.value === "number") {
            // Kontinuerligt vred/slider 0..1 — samma kontrakt för KY-040 och UI.
            applyIntensity(deps.cfg, msg.value);
          } else if (msg.type === "setMode" && isMode(msg.mode)) {
            deps.cfg.mode = msg.mode;
            deps.cfg.activeMood = undefined;   // manuell effekt → ingen stämning aktiv längre
          } else if (msg.type === "cycleMode") {
            const next = deps.cycleMode();
            sock.send(JSON.stringify({ type: "modeChanged", mode: next }));
          } else if (msg.type === "setSongNote" && typeof msg.id === "number") {
            deps.songMemory?.setNote(msg.id, typeof msg.note === "string" ? msg.note : "");
            const l2 = deps.songMemory?.list() ?? [];
            sock.send(JSON.stringify({ type: "songList", songs: l2 }));
          } else if (msg.type === "forgetSong" && typeof msg.id === "number") {
            deps.songMemory?.forgetSong(msg.id);
            sock.send(JSON.stringify({ type: "songList", songs: deps.songMemory?.list() ?? [] }));
          } else if (msg.type === "songCurve" && typeof msg.id === "number") {
            deps.songMemory?.dumpCurve(msg.id);
          } else if (msg.type === "setReplicateToken" && typeof msg.value === "string") {
            // Tom strang = sla av analysen. Nyckeln ekas ALDRIG tillbaka.
            const v = msg.value.trim();
            deps.cfg.replicateToken = v || undefined;
            console.log(`[struktur] API-nyckel ${v ? "satt" : "borttagen"}`);
            sock.send(JSON.stringify({ type: "structureStatus", hasToken: !!v, ...(deps.structureStatus?.() ?? {}) }));
          } else if (msg.type === "structureStatus") {
            sock.send(JSON.stringify({ type: "structureStatus", hasToken: !!deps.cfg.replicateToken, ...(deps.structureStatus?.() ?? {}) }));
          } else if (msg.type === "setAcrCreds" && typeof msg.key === "string" && typeof msg.secret === "string") {
            // Hemligheterna ekas ALDRIG tillbaka — bara om de ar satta eller ej.
            const k = msg.key.trim(), s2 = msg.secret.trim();
            deps.cfg.acrKey = k || undefined;
            deps.cfg.acrSecret = s2 || undefined;
            if (typeof msg.host === "string" && msg.host.trim()) deps.cfg.acrHost = msg.host.trim();
            console.log(`[namn] ACRCloud-uppgifter ${k && s2 ? "satta" : "borttagna"}`);
            sock.send(JSON.stringify({ type: "structureStatus", hasToken: !!deps.cfg.replicateToken, hasAcr: !!(deps.cfg.acrKey && deps.cfg.acrSecret), ...(deps.structureStatus?.() ?? {}) }));
          } else if (msg.type === "probeDmx") {
            deps.probeDmx?.(Array.isArray(msg.channels) ? msg.channels.map(Number) : [1, 2, 3, 4, 5, 6, 7], Number(msg.frames) || 400);
          } else if (msg.type === "listSongs") {
            const l = deps.songMemory?.list() ?? [];
            // Berika med strukturlaget sa listan visar bade tvatten OCH analysen.
            const withStruct = l.map((r: any) => ({ ...r, struct: deps.structureInfo?.(r.id) }));
            sock.send(JSON.stringify({
              type: "songList",
              songs: withStruct,
              structure: { hasToken: !!deps.cfg.replicateToken, hasAcr: !!(deps.cfg.acrKey && deps.cfg.acrSecret), ...(deps.structureStatus?.() ?? {}) },
            }));
          } else if (msg.type === "songManualStart") {
            // Inlärning ska bara vara på när ägaren faktiskt spelar in. Automatisk
            // inlärning utanför manuellt läge producerade bara blandposter.
            deps.cfg.songLearn = true;
            deps.songMemory?.manualStart();
          } else if (msg.type === "songManualNext") {
            deps.songMemory?.manualNext();
          } else if (msg.type === "songManualStop") {
            deps.songMemory?.manualStop();
            deps.cfg.songLearn = false;
          } else if (msg.type === "forgetSongs") {
            deps.songMemory?.forget();
            return;

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
          } else if (msg.type === "setWalkTest") {
            // Walk-test: tänd en rå DMX-kanal på mål-fixturen. index<0 = av.
            const idx = Math.floor(Number(msg.index));
            const ch = Math.floor(Number(msg.channel));
            if (Number.isFinite(idx) && idx >= 0 && idx < deps.cfg.fixtures.length && Number.isFinite(ch) && ch >= 0 && ch < 32) {
              stopIdentify();
              deps.cfg.calTest = null;
              deps.cfg.walkTest = { index: idx, channel: ch };
            } else {
              deps.cfg.walkTest = null;
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
          } else if (msg.type === "setBeatSyncOverride") {
            deps.cfg.beatSyncOverride = !!msg.value;
          } else if (msg.type === "setEnergyDrivesMode") {
            deps.cfg.energyDrivesMode = !!msg.value;
          } else if (msg.type === "setRotation" && typeof msg.mode === "string") {
            deps.cfg.rotation = { ...deps.cfg.rotation, [msg.mode]: !!msg.value };
          } else if (msg.type === "setSmartDwell") {
            const m = { slow: 30000, normal: 15000, fast: 8000 } as Record<string, number>;
            deps.cfg.smartDwellMs = m[msg.mode as string] ?? 15000;
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
              // Uppvärmning: 0 = "hoppa över nedräkningen" (maskinen redan varm), tak 30 min.
              warmupMs: typeof f.warmupMs === "number" ? Math.max(0, Math.min(1800000, Math.round(f.warmupMs))) : cur.warmupMs,
              // Drifträknarna ägs av motorn — aldrig satta av klienten.
              sprayMs: cur.sprayMs, bursts: cur.bursts, serviceAtMs: cur.serviceAtMs, warmStartMs: cur.warmStartMs,
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
          } else if (msg.type === "setMemCeiling") {
            deps.cfg.memCeilingOff = !msg.value;   // value=true → taket PÅ
          } else if (msg.type === "setShowLead" && typeof msg.value === "number") {
            deps.cfg.showLeadMs = Math.max(0, Math.min(300, Math.round(msg.value)));
          } else if (msg.type === "setSongLearn") {
            deps.cfg.songLearn = !!msg.value;   // frys/tina latminnets inlarning
          } else if (msg.type === "setStrobeUnlimited") {
            deps.cfg.strobeUnlimited = !!msg.value;
          } else if (msg.type === "setDropHeadroom") {
            deps.cfg.dropHeadroom = !!msg.value;
          } else if (msg.type === "setRegiPro") {
            deps.cfg.regiPro = !!msg.value;
          } else if (msg.type === "setRing" && msg.ring && typeof msg.ring === "object" && deps.cfg.intensityRing) {
            const r = msg.ring as Record<string, unknown>;
            const cur = deps.cfg.intensityRing;
            deps.cfg.intensityRing = {
              bus: cur.bus, device: cur.device,
              maxBright:      typeof r.maxBright === "number"      ? Math.max(0.05, Math.min(1,    r.maxBright))      : cur.maxBright,
              pulseBoost:     typeof r.pulseBoost === "number"     ? Math.max(0,    Math.min(0.5,  r.pulseBoost))     : cur.pulseBoost,
              blackoutFadeMs: typeof r.blackoutFadeMs === "number" ? Math.max(0,    Math.min(3000, Math.round(r.blackoutFadeMs))) : cur.blackoutFadeMs,
            };
          } else if (msg.type === "fogNow") {
            deps.cfg.fogTrigger = true;   // engångs-puff (motorn nollställer flaggan)
          } else if (msg.type === "fogService") {
            deps.resetFogService();       // tank påfylld / rengjord → nollställ räknarna
          } else if (msg.type === "bleScan") {
            // Åtta-sekunders scan i sidecarn; resultatet kommer via bleScanResults nedan.
            deps.ble?.scan();
            return;
          } else if (msg.type === "blePair" && typeof msg.mac === "string") {
            deps.ble?.pair(msg.mac);
            // Kom ihåg i cfg så en respawn av sidecarn (eller reboot) återansluter av sig själv.
            const list = deps.cfg.bleDevices ?? (deps.cfg.bleDevices = []);
            if (!list.some((d) => d.mac.toLowerCase() === msg.mac.toLowerCase())) {
              list.push({ mac: msg.mac.toLowerCase(), name: typeof msg.name === "string" ? msg.name : msg.mac, chip: msg.chip === "bledom" ? "bledom" : "unknown" });
            }
          } else if (msg.type === "bleUnpair" && typeof msg.mac === "string") {
            deps.ble?.unpair(msg.mac);
            if (deps.cfg.bleDevices) {
              deps.cfg.bleDevices = deps.cfg.bleDevices.filter((d) => d.mac.toLowerCase() !== msg.mac.toLowerCase());
            }
          } else if (msg.type === "bleIdentify" && typeof msg.mac === "string") {
            // "Blinka lampan" — hjälper användaren identifiera vilken fysisk slinga
            // en post motsvarar. Ingen cfg-mutation; sidecarn hanterar timeout.
            deps.ble?.identify(msg.mac);
            return;
          } else if (msg.type === "bleCal" && typeof msg.mac === "string" && msg.cal) {
            // Vitbalans, max-ljus och gamma per slinga. Persistera i cfg så värdena
            // överlever reboot; skicka till sidecarn för direkt effekt.
            const clamp01 = (x: any) => {
              const n = typeof x === "number" && Number.isFinite(x) ? x : 1;
              return n < 0 ? 0 : n > 1 ? 1 : n;
            };
            const clampGamma = (x: any) => {
              const n = typeof x === "number" && Number.isFinite(x) ? x : 1;
              return n < 0.3 ? 0.3 : n > 3.0 ? 3.0 : n;
            };
            const cal = {
              rGain: clamp01(msg.cal.rGain),
              gGain: clamp01(msg.cal.gGain),
              bGain: clamp01(msg.cal.bGain),
              maxBrightness: clamp01(msg.cal.maxBrightness),
              gamma: clampGamma(msg.cal.gamma),
            };
            const mac = msg.mac.toLowerCase();
            const list = deps.cfg.bleDevices ?? (deps.cfg.bleDevices = []);
            const entry = list.find((d) => d.mac.toLowerCase() === mac);
            if (entry) entry.cal = cal;
            deps.ble?.setCal(mac, cal);
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
  logHealth("info", "server", `HTTP redo på port ${port} (v${PKG_VERSION})`);

  const broadcastConfig = () => broadcast();

  // Sidecar events → fan out to every connected browser. Same server instance
  // registers per port (80 + 443) so both listeners see the same events; the
  // sidecar only fires ONE event per action, so this doubles up harmlessly.
  deps.ble?.onScan((devices) => {
    logHealth("info", "ble", `scan hittade ${devices.length} enhet(er)`);
    broadcast({ type: "bleScanResults", devices });
  });
  deps.ble?.onPaired(() => {
    const list = deps.ble!.paired();
    const online = list.filter((d) => d.connected).length;
    logHealth("info", "ble", `parad lista uppdaterad: ${online}/${list.length} uppkopplade`);
    broadcast({ type: "blePaired", devices: list });
  });
  return { app, broadcastConfig };
}

function isMode(m: unknown): m is Mode {
  return typeof m === "string" &&
    (m === "smart" || m === "blackout" || EFFECT_MAP.has(m as Mode));
}
const clamp01 = (x: number) => typeof x === "number" && x >= 0 && x <= 1 ? x : 0;

const VALID_PRESETS: FixturePreset[] = ["rgb", "rgb7", "rgbw", "dimmer", "custom"];
const VALID_ROLES: ChannelRole[] = ["r", "g", "b", "w", "dim", "strobe", "hazer", "uv", "blinder", "laser", "co2", "unused"];

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
