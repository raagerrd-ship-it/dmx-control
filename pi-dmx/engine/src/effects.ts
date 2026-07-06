/**
 * Effect engine: consume Frames from the analyser, write a 512-byte DMX
 * universe. Ported from useMockLive's color pipelines — cleaned up for
 * headless use.
 *
 * Each fixture in cfg.fixtures gets rendered based on its index. Fixture
 * channel-layout is honored (RGB / RGBW / dimmer).
 */

import type { EngineConfig, FixtureConfig, Mode } from "./config.js";
import { fixtureRoles } from "./config.js";
import type { Frame } from "./analyser.js";

export class EffectEngine {
  private universe = new Uint8Array(512);
  private t0 = performance.now();
  private lastKickBoost = 0;

  constructor(private cfg: EngineConfig) {}

  render(frame: Frame): Uint8Array {
    const t = (performance.now() - this.t0) / 1000;
    if (frame.kick) this.lastKickBoost = performance.now();
    const kickEnv = Math.max(0, 1 - (performance.now() - this.lastKickBoost) / 250);

    this.universe.fill(0);

    if (this.cfg.mode === "blackout") return this.universe;

    const audio = frame.level * this.cfg.sensitivity;
    const master = this.cfg.master;

    for (let i = 0; i < this.cfg.fixtures.length; i++) {
      const fx = this.cfg.fixtures[i];
      const rgb = pickColor(this.cfg.mode, t, i, this.cfg.fixtures.length, audio, kickEnv, frame);
      writeFixture(this.universe, fx, rgb, master);
    }

    return this.universe;
  }
}

function writeFixture(
  u: Uint8Array,
  addr: number,
  channels: 3 | 4 | 1,
  rgb: [number, number, number],
  master: number,
) {
  const base = addr - 1;  // DMX addresses are 1-indexed
  const m = clamp01(master);
  if (channels === 1) {
    // Dimmer: use perceived brightness
    const b = Math.max(rgb[0], rgb[1], rgb[2]) * m;
    u[base] = to255(b);
  } else if (channels === 3) {
    u[base]     = to255(rgb[0] * m);
    u[base + 1] = to255(rgb[1] * m);
    u[base + 2] = to255(rgb[2] * m);
  } else {
    // RGBW: extract white as min(r,g,b)
    const w = Math.min(rgb[0], rgb[1], rgb[2]);
    u[base]     = to255((rgb[0] - w) * m);
    u[base + 1] = to255((rgb[1] - w) * m);
    u[base + 2] = to255((rgb[2] - w) * m);
    u[base + 3] = to255(w * m);
  }
}

function pickColor(
  mode: Mode,
  t: number,
  idx: number,
  count: number,
  audio: number,
  kickEnv: number,
  frame: Frame,
): [number, number, number] {
  switch (mode) {
    case "auto": {
      const hue = ((t * 45 + idx * (360 / count) + frame.energy * 40) % 360) / 360;
      const v = Math.min(1, 0.3 + audio * 0.8 + kickEnv * 0.5);
      return hsvToRgb(hue, 1, v);
    }
    case "chill": {
      const drift = Math.sin(t * 0.15) * 140;
      const hue = ((30 + drift + idx * 20) % 360 + 360) % 360 / 360;
      const v = 0.4 + audio * 0.4;
      return hsvToRgb(hue, 0.7, v);
    }
    case "party": {
      const dir = idx % 2 === 0 ? 1 : -1;
      const hue = ((t * 90 * dir + idx * 137) % 360 + 360) % 360 / 360;
      const v = Math.min(1, 0.5 + audio * 0.5 + kickEnv * 0.5);
      return hsvToRgb(hue, 1, v);
    }
    case "chase": {
      const head = (t * 1.5) % count;
      const dist = Math.min(
        Math.abs(idx - head),
        Math.abs(idx - head - count),
        Math.abs(idx - head + count),
      );
      const v = Math.exp(-dist * dist * 2) * (0.6 + audio * 0.4);
      const hue = ((t * 20) % 360) / 360;
      return hsvToRgb(hue, 1, v);
    }
    case "fire": {
      const flicker = 0.7 + Math.random() * 0.3;
      const hue = 0.02 + Math.random() * 0.05;
      const v = flicker * (0.5 + audio * 0.5);
      return hsvToRgb(hue, 1, v);
    }
    case "strobe": {
      const on = Math.floor(t * 12) % 2 === 0;
      return on ? [1, 1, 1] : [0, 0, 0];
    }
    default:
      return [0, 0, 0];
  }
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: return [v, t, p];
    case 1: return [q, v, p];
    case 2: return [p, v, t];
    case 3: return [p, q, v];
    case 4: return [t, p, v];
    default: return [v, p, q];
  }
}

const clamp01 = (x: number) => x < 0 ? 0 : x > 1 ? 1 : x;
const to255 = (x: number) => Math.round(clamp01(x) * 255);
