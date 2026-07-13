/**
 * Effect engine: consume Frames from the analyser, write a 512-byte DMX
 * universe.
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
  /** Chase mode: fixture-index of the currently lit head. Advanced on kick and slow-time. */
  private chasePos = 0;
  private chaseDir = 1;
  private lastChaseAdvance = 0;
  /** Beat clock: last whole-beat index seen (SmartSync tempo sync). */
  private lastBeatIdx = -1;

  constructor(private cfg: EngineConfig) {}

  render(frame: Frame): Uint8Array {
    const t = (performance.now() - this.t0) / 1000;
    if (frame.kick) this.lastKickBoost = performance.now();

    // SmartSync beat clock → predicted kick: pulse in the song's exact tempo,
    // phase-calibrated by the Spotify downbeat markers. Beats real kick
    // detection whenever we're synced.
    let beatEnv = 0;
    let beatTick = false;
    const beat = this.cfg.beat;
    if (beat && beat.bpm > 40) {
      const beatMs = 60000 / beat.bpm;
      const since = Date.now() - beat.anchorMs;
      const phase = ((since % beatMs) + beatMs) % beatMs / beatMs;
      beatEnv = Math.pow(1 - phase, 3);
      const beatIdx = Math.floor(since / beatMs);
      if (beatIdx !== this.lastBeatIdx) { this.lastBeatIdx = beatIdx; beatTick = true; }
    }
    const kickEnv = Math.max(
      Math.max(0, 1 - (performance.now() - this.lastKickBoost) / 250),
      beatEnv * 0.8,
    );

    this.universe.fill(0);

    if (this.cfg.mode === "blackout") return this.universe;

    // Identify override: light only the target fixture(s) at full white so the
    // user can visually locate each fixture in the room. Bypasses audio/mode.
    const id = this.cfg.identify;
    if (id && id.index >= 0 && id.index < this.cfg.fixtures.length) {
      writeFixture(this.universe, this.cfg.fixtures[id.index], [1, 1, 1], 1);
      return this.universe;
    }

    // SmartSync drop-flash: everything white for the duration. Sits after
    // identify so locating fixtures still works while synced.
    if (this.cfg.flashUntil && Date.now() < this.cfg.flashUntil) {
      for (const fx of this.cfg.fixtures) writeFixture(this.universe, fx, [1, 1, 1], this.cfg.master, 220);  // hw-strobe burst on drop flashes
      return this.universe;
    }

        // Normalize against the AGC target so "at target loudness" = full drive —
        // the AGC otherwise parks the level around ~0.5 and v never reaches 1.
        const audio = Math.min(1, (frame.level / Math.max(0.15, this.cfg.detection.autoGainTarget)) * (0.5 + this.cfg.sensitivity));
    const master = this.cfg.master;
    const count = this.cfg.fixtures.length;

    // Chase state machine — kick advances one step, plus a slow auto-advance
    // so it never stalls in silence. Runs regardless of mode so the head
    // stays coherent when the user switches into it.
    const now = performance.now();
    const autoAdvanceMs = 320;   // ~185 bpm floor
    // Beat-locked when synced: step ON the beat instead of after the kick.
    const advance = this.cfg.beat ? beatTick : frame.kick;
    if (count > 0 && (advance || now - this.lastChaseAdvance > autoAdvanceMs)) {
      this.lastChaseAdvance = now;
      if (this.cfg.chaseStyle === "pingpong" && count > 1) {
        this.chasePos += this.chaseDir;
        if (this.chasePos >= count - 1) { this.chasePos = count - 1; this.chaseDir = -1; }
        else if (this.chasePos <= 0)    { this.chasePos = 0;         this.chaseDir =  1; }
      } else {
        this.chasePos = (this.chasePos + 1) % Math.max(1, count);
      }
    }

    for (let i = 0; i < count; i++) {
      const fx = this.cfg.fixtures[i];
      const hwStrobe = this.cfg.mode === "strobe" && fixtureRoles(fx).includes("strobe");
      // CH-strobe rate follows the music: quiet = slow flashes, loud = machine gun.
      const strobeVal = hwStrobe ? Math.round(100 + audio * 155) : 0;
      // Hardware strobe: steady white on the color channels, CH-strobe does the flashing.
      const rgb = hwStrobe ? ([1, 1, 1] as [number, number, number]) : pickColor(this.cfg, t, i, count, audio, kickEnv, frame, this.chasePos, fx);
      writeFixture(this.universe, fx, rgb, master, strobeVal);
    }

    return this.universe;
  }
}

function writeFixture(
  u: Uint8Array,
  fx: FixtureConfig,
  rgb: [number, number, number],
  master: number,
  strobeVal = 0,
) {
  const roles = fixtureRoles(fx);
  const base = fx.address - 1;   // DMX is 1-indexed
  const m = clamp01(master);

  const [r, g, b] = rgb;
  // White = min(r,g,b) so RGBW fixtures keep saturation on the color chans
  const w = Math.min(r, g, b);
  const dim = Math.max(r, g, b);
  // Fixtures with BOTH a dimmer and color channels multiply them internally.
  // Sending brightness on both gives a quadratic curve (reads as blinking,
  // not fading) — master goes on the dim channel, dynamics stay in color.
  const hasColor = roles.includes("r") || roles.includes("g") || roles.includes("b");
  const hasDim = roles.includes("dim");
  const colorScale = hasDim ? 1 : m;

  for (let i = 0; i < roles.length; i++) {
    const ch = base + i;
    if (ch < 0 || ch >= 512) continue;
    switch (roles[i]) {
      case "r":      u[ch] = to255((r - (roles.includes("w") ? w : 0)) * colorScale); break;
      case "g":      u[ch] = to255((g - (roles.includes("w") ? w : 0)) * colorScale); break;
      case "b":      u[ch] = to255((b - (roles.includes("w") ? w : 0)) * colorScale); break;
      case "w":      u[ch] = to255(w * colorScale); break;
      case "dim":    u[ch] = to255(hasColor ? m : dim * m); break;
      case "strobe": u[ch] = Math.max(0, Math.min(255, strobeVal)); break;  // 8-255 = fixture strobe, faster when higher
      case "unused": break;
    }
  }
}

function pickColor(
  cfg: EngineConfig,
  t: number,
  idx: number,
  count: number,
  audio: number,
  kickEnv: number,
  frame: Frame,
  chasePos: number,
  fx?: FixtureConfig,
): [number, number, number] {
  const { mode, monoHue, cometHue, splitHueA, splitHueB } = cfg;
  // Dynamics: lower floors + gamma on the audio-driven part, so quiet passages
  // go dim and beats punch. dyn=0 reproduces the old flat curves.
  // Per-fixture band drive: each lamp breathes with its own slice of the
  // spectrum (bass / mids / treble / kick) so pure-colored lamps still feel
  // alive and independent — full 0..100% swing per color.
  const norm = 1 / Math.max(0.15, cfg.detection?.autoGainTarget ?? 0.5);
  const bands = [
    Math.min(1, frame.energy * norm * 0.9),
    audio,
    Math.min(1, frame.treble * norm * 1.1),
    Math.min(1, frame.energy * norm * 0.45 + kickEnv),
  ];
  const BAND_IDX = { bass: 0, mid: 1, treble: 2, kick: 3 } as const;
  const band = bands[fx?.band ? BAND_IDX[fx.band] : idx % bands.length];
  const dyn = Math.max(0, Math.min(1, cfg.dynamics ?? 0.6));
  const shaped = (floor: number, x: number) => {
    const f = floor * (1 - dyn);
    return Math.min(1, f + (1 - f) * Math.pow(Math.max(0, Math.min(1, x)), 1 + dyn * 1.2));
  };
  switch (mode) {
    case "auto": {
      // Two counter-drifting hue layers blended by treble → richer variety
      // than a single spinning wheel, but still calm.
      const hueA = (t * 45 + idx * (360 / count) + frame.energy * 40);
      const hueB = (-t * 30 + idx * (360 / count) * 1.5 + frame.treble * 90);
      const mix  = 0.35 + frame.treble * 0.5;
      const hue  = (((hueA * (1 - mix) + hueB * mix) % 360) + 360) % 360 / 360;
      const v = shaped(0.15, band * 0.9 + kickEnv * 0.3);
      return hsvToRgb(hue, 1, v);
    }
    case "party": {
      // Counter-rotating hues + white punch on kick for a real "flash" feel.
      const dir = idx % 2 === 0 ? 1 : -1;
      const hue = ((t * 90 * dir + idx * 137) % 360 + 360) % 360 / 360;
      const v = shaped(0.2, band * 0.8 + kickEnv * 0.5);
      const sat = Math.max(0, 1 - kickEnv * 0.8);   // punch flashes white on kicks
      return hsvToRgb(hue, sat, v);
    }
    case "comet": {
      const speed = 1.2 + audio * 2.2;
      const head = (t * speed) % count;
      let behind = head - idx;
      if (behind < -count / 2) behind += count;
      if (behind >  count / 2) behind -= count;
      const tailLen = Math.max(3, count * 1.2);
      let v;
      if (behind >= 0) v = Math.exp(-behind / (tailLen * 0.75)) + 0.08 * Math.exp(-behind / tailLen);
      else             v = Math.exp(-(-behind) * 2.5);
      v = Math.min(1, v);
      const heat = v;
      const hue = (((cometHue % 360) + 360) % 360) / 360;
      const sat = 0.35 + (1 - heat) * 0.65;
      const kickBoost = 1 + kickEnv * 0.35;
      // The tail shape is positional — scale the whole comet with the music so
      // it breathes instead of burning at constant brightness.
      const breathe = 0.25 + 0.75 * shaped(0.2, audio * 0.9 + kickEnv * 0.2);
      return hsvToRgb(hue, sat, Math.min(1, v * kickBoost * breathe));
    }
    case "chase": {
      // Bright head at chasePos with short trailing tail. Neighbouring fixtures
      // glow briefly so the move reads even on 4 fixtures. Hue = cometHue.
      const d = Math.abs(idx - chasePos);
      const tail = Math.exp(-d * 1.4);
      const hue = (((cometHue % 360) + 360) % 360) / 360;
      const v = Math.min(1, tail * shaped(0.35, audio * 0.7 + kickEnv * 0.5));
      return hsvToRgb(hue, 0.9, v);
    }
    case "split": {
      // Groups A/B by index parity. A = bass-driven (kick+energy), B = treble.
      const isA = idx % 2 === 0;
      const hue = (((isA ? splitHueA : splitHueB) % 360) + 360) % 360 / 360;
      const drive = isA
        ? Math.min(1, frame.energy * norm + kickEnv * 0.8)
        : Math.min(1, frame.treble * norm * 1.2 + audio * 0.3);
      const v = shaped(0.15, drive);
      return hsvToRgb(hue, 1, v);
    }
    case "mono": {
      const isWarm = monoHue < 40 || monoHue > 340;
      const flicker = isWarm ? 0.7 + Math.random() * 0.3 : 0.9 + Math.random() * 0.1;
      const hue = (((monoHue + (isWarm ? (Math.random() - 0.5) * 12 : 0)) % 360) + 360) % 360 / 360;
      // One color, four lamps — each breathing with its own spectrum band.
      const v = flicker * shaped(0.25, band * 0.8 + kickEnv * 0.25);
      return hsvToRgb(hue, 1, v);
    }
    case "strobe": {
      const on = Math.floor(t * (6 + audio * 14)) % 2 === 0;
      return on ? [1, 1, 1] : [0, 0, 0];
    }
    default:
      return [0, 0, 0];
  }
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  // Physical PARs with big discrete R/G/B LEDs can't blend hues — anything
  // between the six pure corner colors lights the LED groups unevenly and
  // looks muddy. Snap hue to 60° steps and saturation to pure color/white;
  // all smoothness lives in brightness (v) instead.
  h = (Math.round(h * 6) % 6) / 6;
  s = s >= 0.5 ? 1 : 0;
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
// LED PARs are wildly non-linear: DMX 128 looks ~80% bright and the low end
// cuts off abruptly. Gamma 2.2 makes the fade perceptually linear — half
// looks half, and most DMX resolution lands in the visible low range.
const to255 = (x: number) => Math.round(Math.pow(clamp01(x), 2.2) * 255);
