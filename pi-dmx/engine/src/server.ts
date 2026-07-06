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

export async function startServer(deps: ServerDeps, port = 80): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
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
          } else if (msg.type === "setFixtures" && Array.isArray(msg.fixtures)) {
            deps.cfg.fixtures = msg.fixtures;
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
  return app;
}

function isMode(m: unknown): m is Mode {
  return typeof m === "string" &&
    ["auto", "chill", "party", "chase", "fire", "strobe", "blackout"].includes(m);
}
const clamp01 = (x: number) => typeof x === "number" && x >= 0 && x <= 1 ? x : 0;
