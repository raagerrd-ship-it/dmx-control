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

    // Identify override: light only the target fixture(s) at full white so the
    // user can visually locate each fixture in the room. Bypasses audio/mode.
    const id = this.cfg.identify;
    if (id && id.index >= 0 && id.index < this.cfg.fixtures.length) {
      writeFixture(this.universe, this.cfg.fixtures[id.index], [1, 1, 1], 1);
      return this.universe;
    }

    const audio = frame.level * this.cfg.sensitivity;
    const master = this.cfg.master;

    for (let i = 0; i < this.cfg.fixtures.length; i++) {
      const fx = this.cfg.fixtures[i];
      const rgb = pickColor(this.cfg.mode, t, i, this.cfg.fixtures.length, audio, kickEnv, frame, this.cfg.monoHue, this.cfg.cometHue);
      writeFixture(this.universe, fx, rgb, master);
    }

    return this.universe;
  }
}

function writeFixture(
  u: Uint8Array,
  fx: FixtureConfig,
  rgb: [number, number, number],
  master: number,
) {
  const roles = fixtureRoles(fx);
  const base = fx.address - 1;   // DMX is 1-indexed
  const m = clamp01(master);

  const [r, g, b] = rgb;
  // White = min(r,g,b) so RGBW fixtures keep saturation on the color chans
  const w = Math.min(r, g, b);
  const dim = Math.max(r, g, b);

  for (let i = 0; i < roles.length; i++) {
    const ch = base + i;
    if (ch < 0 || ch >= 512) continue;
    switch (roles[i]) {
      case "r":      u[ch] = to255((r - (roles.includes("w") ? w : 0)) * m); break;
      case "g":      u[ch] = to255((g - (roles.includes("w") ? w : 0)) * m); break;
      case "b":      u[ch] = to255((b - (roles.includes("w") ? w : 0)) * m); break;
      case "w":      u[ch] = to255(w * m); break;
      case "dim":    u[ch] = to255(dim * m); break;
      case "strobe": u[ch] = 0; break;  // off unless mode adds it later
      case "unused": break;
    }
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
  monoHue: number,
  cometHue: number,
): [number, number, number] {
  switch (mode) {
    case "auto": {
      const hue = ((t * 45 + idx * (360 / count) + frame.energy * 40) % 360) / 360;
      const v = Math.min(1, 0.3 + audio * 0.8 + kickEnv * 0.5);
      return hsvToRgb(hue, 1, v);
    }
    case "party": {
      const dir = idx % 2 === 0 ? 1 : -1;
      const hue = ((t * 90 * dir + idx * 137) % 360 + 360) % 360 / 360;
      const v = Math.min(1, 0.5 + audio * 0.5 + kickEnv * 0.5);
      return hsvToRgb(hue, 1, v);
    }
    case "comet": {
      // A fireball glides through the fixtures with a long trailing tail.
      // Head speed sped up by audio; head hue is user-picked (cometHue).
      const speed = 1.2 + audio * 2.2;                 // fixtures per second
      const head = (t * speed) % count;
      // Signed distance behind the head (positive = behind, in the tail)
      let behind = head - idx;
      if (behind < -count / 2) behind += count;         // wrap forward
      if (behind >  count / 2) behind -= count;         // wrap back
      const tailLen = Math.max(3, count * 1.2);
      let v;
      if (behind >= 0) {
        // Trailing tail — slow exponential fade + faint embers
        v = Math.exp(-behind / (tailLen * 0.75)) + 0.08 * Math.exp(-behind / tailLen);
      } else {
        // Leading edge — quick falloff so the fireball has a sharp front
        v = Math.exp(-(-behind) * 2.5);
      }
      v = Math.min(1, v);
      // Head = white-hot (low sat) glowing into fully-saturated picked hue.
      const heat = v;                                    // 1 at head, ~0 at tail end
      const hue = (((cometHue % 360) + 360) % 360) / 360;
      const sat = 0.35 + (1 - heat) * 0.65;              // white-hot core, saturated tail
      const kickBoost = 1 + kickEnv * 0.35;
      return hsvToRgb(hue, sat, Math.min(1, v * kickBoost));
    }
    case "mono": {
      // Single user-picked hue, brightness driven by audio + kick, with a
      // subtle flicker so it never feels static. At warm hues (~15°) with a
      // stronger flicker weight it reads as "fire".
      const isWarm = monoHue < 40 || monoHue > 340;
      const flicker = isWarm
        ? 0.7 + Math.random() * 0.3            // fire-like jitter
        : 0.9 + Math.random() * 0.1;           // gentle shimmer
      const hue = (((monoHue + (isWarm ? (Math.random() - 0.5) * 12 : 0)) % 360) + 360) % 360 / 360;
      const v = flicker * Math.min(1, 0.4 + audio * 0.6 + kickEnv * 0.3);
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
