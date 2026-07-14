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
  /** Drops mode: per-lamp fire time + hue; advanced on each beat/kick. */
  private dropPos = 0;
  private dropSector = 0;
  private dropCount = 0;
  private lastDropAdvance = 0;
  private dropFired: number[] = [];
  private dropHue: number[] = [];
  /** Wave mode: integrated phase — speed may vary per frame without the
   *  wave jumping (t*speed would re-scale all elapsed time on every change). */
  private wavePhase = 0;
  /** "smart" mode: which effect the feel-chooser currently delegates to. */
  private smartMode: Mode = "wave";
  private smartDwellUntil = 0;
  private lastSectionAt = 0;
  private intensityEma = 0.4;
  private intensityPeak = 0.4;
  /** Silence gate: fade the whole rig to black when no music plays. */
  private lastActiveMs = performance.now();
  private silenceGate = 1;
  /** Output ballistics: per-channel peak-hold with exponential decay — the
   *  eye sees instant attack and a soft ~0.4 s fall, whatever the modes do. */
  private outSmooth = new Float32Array(512);
  private smartCount = 0;
  private lastSmartIntensity = 0;
  private lastRenderMs = performance.now();

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

    // Drop-flash (lokal strong-kick): everything white for the duration.
    const nowWall = Date.now();
    const flashActive = !!(this.cfg.flashUntil && nowWall < this.cfg.flashUntil);
    if (flashActive) {
      // White pop; optional hardware-strobe punch (fixture stutters on the
      // drop). Punch is opt-in — the clean pop is the default.
      const punch = this.cfg.punchOnDrop ? 235 : 0;
      for (const fx of this.cfg.fixtures) writeFixture(this.universe, fx, [1, 1, 1], this.cfg.master, punch);
      // Feed the ballistics so it decays smoothly out of the flash.
      for (let ch = 0; ch < 512; ch++) this.outSmooth[ch] = this.universe[ch];
      return this.universe;
    }

        // Normalize against the AGC target so "at target loudness" = full drive —
        // the AGC otherwise parks the level around ~0.5 and v never reaches 1.
        const audio = Math.min(1, (frame.level / Math.max(0.15, this.cfg.detection.autoGainTarget)) * (0.35 + this.cfg.sensitivity * 0.5));
        const beatMul = this.cfg.beatPulse ? (0.45 + 0.55 * beatEnv) : 1;
    const master = this.cfg.master * this.silenceGate * beatMul;
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

    // "smart": pick the effect from the song's feel — SmartSync section energy
    // when synced (switches on musical section boundaries), otherwise a slow
    // local energy average with a 12 s dwell so it never zaps around.
    let effMode: Mode = this.cfg.mode;
    if (this.cfg.mode === "smart") {
      // Energi styr läget → lokal intensitet väljer pool; annars fast medel.
      const intensity = this.cfg.energyDrivesMode ? Math.min(1, this.intensityEma / Math.max(0.08, this.intensityPeak)) : 0.5;
        const bigJump = this.cfg.energyDrivesMode && Math.abs(intensity - this.lastSmartIntensity) > 0.12;
        if (bigJump || now > this.smartDwellUntil) {
        this.lastSmartIntensity = intensity;
        this.smartDwellUntil = now + (this.cfg.smartDwellMs || 9000);
        // Rotate within a pool of modes that fit the current feel — mixed
        // order, never the same mode twice in a row.
        const POOLS: Mode[][] = [
          ["cycle", "wave", "mono", "chase"],     // lugnt
          ["wave", "chase", "drops", "cycle"],    // mellan
          ["party", "drops", "chase", "wave"],    // högt tryck
        ];
        const pool = POOLS[intensity < 0.3 ? 0 : intensity < 0.6 ? 1 : 2];
        this.smartCount++;
        let next = pool[Math.floor(((this.smartCount * 0.61803398875) % 1) * pool.length)];
        if (next === this.smartMode) next = pool[(pool.indexOf(next) + 1) % pool.length];
        this.smartMode = next;
      }
      effMode = this.smartMode;
    }

    // Advance the wave phase by dt so speed changes glide instead of jumping.
    const dtSec = Math.min(0.1, (now - this.lastRenderMs) / 1000);
    this.lastRenderMs = now;
    this.intensityEma += (Math.max(audio, kickEnv * 0.8) - this.intensityEma) * Math.min(1, dtSec / 6);
    this.intensityPeak = Math.max(this.intensityEma, this.intensityPeak - dtSec / 40 * this.intensityPeak);

    // Silence gate: below threshold for 4 s → fade out over 2 s; music back →
    // fade in fast. Mode floors otherwise keep the lamps glowing in silence.
    // Gain-aware threshold: at high AGC gain the amplified noise floor sits
    // well above 0.05 and read as flicker — real (even weak) music still
    // lands near the AGC target and passes.
    const silenceThreshold = 0.05 * Math.max(1, frame.gain / 3);
    if (frame.level > silenceThreshold || frame.kick) this.lastActiveMs = now;
    const gateTarget = now - this.lastActiveMs > 4000 ? 0 : 1;
    const gateRate = gateTarget > this.silenceGate ? dtSec / 0.3 : dtSec / 2;
    this.silenceGate += Math.max(-gateRate, Math.min(gateRate, gateTarget - this.silenceGate));
    if (effMode === "wave") this.wavePhase += dtSec * (1.6 + audio * 4);

    // Drops: each beat/kick fires the next lamp in a fresh pure color.
    if (effMode === "drops" && count > 0 && (frame.kick || beatTick) && now - this.lastDropAdvance > 140) {
      this.lastDropAdvance = now;
      this.dropCount++;
      // Golden-ratio walk over the lamps too — mixed order, never the same
      // lamp twice in a row, all lamps hit evenly.
      this.dropPos = Math.floor(((this.dropCount * 0.61803398875) % 1) * count);
      this.dropSector = mixedSector(this.dropCount);
      this.dropFired[this.dropPos] = now;
      this.dropHue[this.dropPos] = this.dropSector / 6;
    }

    for (let i = 0; i < count; i++) {
      const fx = this.cfg.fixtures[i];
      const rgb = pickColor(this.cfg, t, i, count, audio, kickEnv, frame, this.chasePos, fx, this.dropFired, this.dropHue, this.wavePhase, effMode);
      writeFixture(this.universe, fx, rgb, master);
    }

    // Output ballistics on color/dim channels (never strobe/mode channels —
    // a decaying strobe value would sweep through real strobe speeds).
    // Snappare fade-out i energiska lägen så pumpen syns; lugna behåller mjukheten.
    const fastMode = effMode === "party" || effMode === "snap" || effMode === "bounce" || effMode === "drops";
    const decay = Math.exp(-dtSec / (fastMode ? 0.2 : 0.3));
    const skip = new Set<number>();
    for (const fx of this.cfg.fixtures) {
      const roles = fixtureRoles(fx);
      for (let r = 0; r < roles.length; r++) {
        if (roles[r] === "strobe") skip.add(fx.address - 1 + r);
      }
    }
    for (let ch = 0; ch < 512; ch++) {
      if (skip.has(ch)) { this.outSmooth[ch] = this.universe[ch]; continue; }
      const held = this.outSmooth[ch] * decay;
      const v = this.universe[ch] >= held ? this.universe[ch] : held;
      this.outSmooth[ch] = v;
      this.universe[ch] = Math.round(v);
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
  dropFired: number[] = [],
  dropHue: number[] = [],
  wavePhase = 0,
  modeOverride?: Mode,
): [number, number, number] {
  const { monoHue, cometHue, splitHueA, splitHueB } = cfg;
  const mode = modeOverride ?? cfg.mode;
  // Taktindex/fas från den lokala BPM-klockan — för beat-låsta lägen.
  let beatIdx = 0, beatFrac = 0;
  if (cfg.beat && cfg.beat.bpm > 40) {
    const beatMs = 60000 / cfg.beat.bpm;
    const since = Date.now() - cfg.beat.anchorMs;
    beatIdx = Math.floor(since / beatMs);
    beatFrac = ((since % beatMs) + beatMs) % beatMs / beatMs;
  }
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
    // "low": calm glow when the music is quiet, out of the way when loud.
    Math.max(0, (0.5 - audio) * 2) * 0.6,
  ];
  const BAND_IDX = { bass: 0, mid: 1, treble: 2, kick: 3, low: 4 } as const;
  const band = fx?.bands?.length
    ? Math.max(...fx.bands.map((b) => bands[BAND_IDX[b]]))
    : bands[idx % bands.length];
  const dyn = Math.max(0, Math.min(1, cfg.dynamics ?? 0.6));
  const shaped = (floor: number, x: number) => {
    const f = floor * (1 - dyn);
    return Math.min(1, f + (1 - f) * Math.pow(Math.max(0, Math.min(1, x)), 1 + dyn * 1.2));
  };
  switch (mode) {
    case "party": {
      // Beat-pumpad: mörk mellan slagen, full på kick/beat — inte sustained level
      // (som saturerade nära 100%). Motroterande rena färger, vit punch på kick.
      const dir = idx % 2 === 0 ? 1 : -1;
      const hue = snapHue(idx, ((t * 90 * dir + idx * 137) % 360 + 360) % 360 / 360);
      const v = shaped(0.05, kickEnv * 1.0 + audio * 0.1);
      return hsvToRgb(hue, 1, v);   // rena färger som pumpar; ingen urtvättande vit-blixt
    }
    case "drops": {
      // Every beat paints the next lamp in a fresh pure color that decays —
      // overlapping decays turn the rhythm into moving splashes of color.
      const since = (performance.now() - (dropFired[idx] ?? -1e9)) / 1000;
      const v = Math.exp(-since / 0.45) * (0.55 + 0.45 * Math.min(1, audio + kickEnv));
      return hsvToRgb(dropHue[idx] ?? 0, 1, Math.min(1, v));
    }
    case "wave": {
      // A soft brightness wave rolling across the rig at music speed; the whole
      // rig shares one hue that steps onward every few seconds.
      const base = 0.5 + 0.5 * Math.sin(wavePhase - idx * 1.1);
      const hue = mixedSector(Math.floor(t / 4.3)) / 6;
      const v = shaped(0.1, base * (0.3 + audio * 0.8) + kickEnv * 0.25);
      return hsvToRgb(hue, 1, v);
    }
    case "cycle": {
      // Calm: all lamps breathe together, slowly walking the color circle.
      const hue = mixedSector(Math.floor(t / 8.5)) / 6;
      const sway = 0.9 + 0.1 * Math.sin(t * 0.8 + idx * 1.6);
      const v = shaped(0.35, (0.3 + audio * 0.55 + kickEnv * 0.1) * sway);
      return hsvToRgb(hue, 1, v);
    }
    case "breathe": {
      // Lugnast: hela riggen andas i EN långsamt vandrande färg, mjukt golv.
      const hue = mixedSector(Math.floor(t / 11)) / 6;
      const breath = 0.5 + 0.5 * Math.sin(t * 0.9);
      const v = shaped(0.4, 0.25 + breath * 0.5 + audio * 0.25);
      return hsvToRgb(hue, 1, v);
    }
    case "tide": {
      // Lugn spatial våg: färg sköljer långsamt i par över riggen.
      const wash = 0.5 + 0.5 * Math.sin(t * 1.1 - idx * 0.9);
      const pair = Math.floor(idx / 2);
      const hue = mixedSector(pair + Math.floor(t / 9)) / 6;
      const v = shaped(0.3, 0.2 + wash * (0.4 + audio * 0.5));
      return hsvToRgb(hue, 1, v);
    }
    case "snap": {
      // Snabb: varje taktslag hoppar ALLA lampor till en ny ren färg.
      const hue = mixedSector(beatIdx) / 6;
      const v = shaped(0.2, Math.max(kickEnv, 1 - beatFrac) * (0.5 + audio * 0.5));
      return hsvToRgb(hue, 1, v);
    }
    case "bounce": {
      // Snabb: ljuspunkt studsar fram och tillbaka, ett steg per taktslag.
      const span = Math.max(1, count - 1);
      const cyc = beatIdx % (span * 2);
      const pos = cyc <= span ? cyc : span * 2 - cyc;   // triangel-våg
      const d = Math.abs(idx - pos);
      const hue = mixedSector(Math.floor(beatIdx / (span * 2))) / 6;
      const v = shaped(0.12, Math.exp(-d * 1.3) * (0.6 + audio * 0.4 + kickEnv * 0.3));
      return hsvToRgb(hue, 1, v);
    }
    case "chase": {
      // Bright head at chasePos with short trailing tail. Neighbouring fixtures
      // glow briefly so the move reads even on 4 fixtures. Hue = cometHue.
      const d = Math.abs(idx - chasePos);
      const tail = Math.exp(-d * 1.4);
      const hue = snapHue(idx, (((cometHue % 360) + 360) % 360) / 360);
      const v = Math.min(1, tail * shaped(0.35, audio * 0.7 + kickEnv * 0.5));
      return hsvToRgb(hue, 0.9, v);
    }
    case "mono": {
      const isWarm = monoHue < 40 || monoHue > 340;
      const flicker = isWarm ? 0.7 + Math.random() * 0.3 : 0.9 + Math.random() * 0.1;
      const hue = snapHue(idx, (((monoHue + (isWarm ? (Math.random() - 0.5) * 12 : 0)) % 360) + 360) % 360 / 360);
      // One color, four lamps — each breathing with its own spectrum band.
      const v = flicker * shaped(0.25, band * 0.8 + kickEnv * 0.25);
      return hsvToRgb(hue, 1, v);
    }
    default:
      return [0, 0, 0];
  }
}

// Per-fixture hue-sector hold: raw hues near a 60° boundary would otherwise
// flip between two pure colors many times a second (reads as color flicker).
// Only leave the held sector once the raw hue is clearly past the boundary.
// Low-discrepancy color walk: golden-ratio jumps visit every pure color in a
// varied, non-sequential order (red→blue→yellow→…) instead of stepping around
// the circle neighbor by neighbor.
function mixedSector(n: number): number {
  return Math.floor(((((n * 0.61803398875) % 1) + 1) % 1) * 6);
}

const sectorHold: number[] = [];
function snapHue(idx: number, h: number): number {
  const raw = (((h * 6) % 6) + 6) % 6;
  let cur = sectorHold[idx];
  if (cur === undefined) cur = sectorHold[idx] = Math.round(raw) % 6;
  let d = raw - cur;
  if (d > 3) d -= 6; else if (d < -3) d += 6;
  if (Math.abs(d) > 0.65) sectorHold[idx] = cur = ((Math.round(raw) % 6) + 6) % 6;
  return cur / 6;
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  // Physical PARs with big discrete R/G/B LEDs can't blend hues — anything
  // between the six pure corner colors lights the LED groups unevenly and
  // looks muddy. Snap hue to 60° steps and saturation to pure color/white;
  // all smoothness lives in brightness (v) instead.
  // hue arrives sector-snapped via snapHue(); saturation stays pure/white
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
