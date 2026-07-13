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
import type { EngineConfig, FixtureConfig, Mode, FixturePreset, ChannelRole } from "./config.js";
import { fixtureRoles } from "./config.js";
import type { Frame } from "./analyser.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface ServerDeps {
  cfg: EngineConfig;
  getLatestFrame: () => Frame | null;
  onConfigChanged?: () => void;
}

export interface Server {
  app: FastifyInstance;
  /** Push current config to all connected clients (e.g. after a physical button press) */
  broadcastConfig: () => void;
}

export async function startServer(deps: ServerDeps, port = 80): Promise<Server> {
  const app = Fastify({ logger: false });

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

  app.register(async (f) => {
    f.get("/ws", { websocket: true }, (conn) => {
      // Send initial state
      conn.socket.send(JSON.stringify({ type: "config", config: deps.cfg }));

      // Push frame samples at 20 Hz for the level meter
      const push = setInterval(() => {
        const frame = deps.getLatestFrame();
        if (frame && conn.socket.readyState === 1) {
          conn.socket.send(JSON.stringify({
            type: "frame",
            level: frame.level,
            energy: frame.energy,
            kick: frame.kick,
            gain: frame.gain,
          }));
        }
      }, 50);

      conn.socket.on("message", (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.type === "setMode" && isMode(msg.mode)) {
            deps.cfg.mode = msg.mode;
          } else if (msg.type === "setSensitivity") {
            deps.cfg.sensitivity = clamp01(msg.value);
          } else if (msg.type === "setMaster") {
            deps.cfg.master = clamp01(msg.value);
          } else if (msg.type === "setMonoHue" && typeof msg.value === "number") {
            deps.cfg.monoHue = ((msg.value % 360) + 360) % 360;
          } else if (msg.type === "setCometHue" && typeof msg.value === "number") {
            deps.cfg.cometHue = ((msg.value % 360) + 360) % 360;
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
          } else if (msg.type === "setDmxMaxHz" && typeof msg.value === "number") {
            deps.cfg.dmxMaxHz = Math.max(30, Math.min(500, Math.round(msg.value)));
          }
          deps.onConfigChanged?.();
          // Echo back
          for (const c of app.websocketServer.clients) {
            if (c.readyState === 1) c.send(JSON.stringify({ type: "config", config: deps.cfg }));
          }
        } catch { /* ignore malformed */ }
      });

      conn.socket.on("close", () => clearInterval(push));
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
    ["auto", "party", "comet", "mono", "strobe", "blackout"].includes(m);
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
    const fx: FixtureConfig = { name, address, preset, ...(roles ? { roles } : {}) };

    // Check the fixture fits within the universe
    const width = fixtureRoles(fx).length;
    if (address + width - 1 > 512) return null;

    out.push(fx);
  }
  return out;
}
