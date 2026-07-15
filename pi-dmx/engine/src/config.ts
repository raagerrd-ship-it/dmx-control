/**
 * Runtime config. Kept as a single object so the mobile UI can mutate it
 * over WebSocket and we can persist to /var/lib/audio-dmx-engine/config.json.
 */

export type Mode = "smart" | "drops" | "party" | "chase" | "wave" | "cycle" | "breathe" | "tide" | "snap" | "bounce" | "mono" | "aurora" | "drift" | "sweep" | "pulse" | "strobe" | "rave" | "eq" | "blackout";

/**
 * A fixture is placed at `address` and occupies channels in a defined role
 * order. Preset "rgb"/"rgbw"/"dimmer" expand to standard layouts; "custom"
 * takes an explicit `roles` array (e.g. ["dim","r","g","b","strobe"]) so
 * odd fixtures can be mapped without code changes.
 */
export type ChannelRole = "r" | "g" | "b" | "w" | "dim" | "strobe" | "unused";
export type FixturePreset = "rgb" | "rgbw" | "dimmer" | "custom";

export interface FixtureConfig {
  /** Human name shown in the mobile UI */
  name: string;
  /** DMX start address 1..512 */
  address: number;
  /** Preset or "custom" (in which case `roles` is used) */
  preset: FixturePreset;
  /** Only used when preset === "custom" */
  roles?: ChannelRole[];
  /** Spectrum bands driving this lamp in auto/party/mono (strongest wins).
   *  Empty/unset = auto by list order. */
  bands?: ("bass" | "mid" | "treble" | "kick" | "low")[];
}

export interface EngineConfig {
  audio: {
    device: string;       // "hw:0,0" — Codec Zero (line-in via 3.5mm AUX)
    rate: number;         // 48000
    channels: 1 | 2;      // 2 for stereo line-in (summed to mono internally)
  };
  fft: {
    size: 512;            // ~5 ms latency @ 48k, decent bass resolution
    hop: number;          // sliding-window hop; 480 = 100 Hz analys @ 48k
  };
  detection: {
    autoGainTarget: number;   // 0..1, aim for this level (loud)
    tauUp: number;            // seconds to raise gain (quieter)
    tauDown: number;          // seconds to lower gain (louder)
    noiseFloor: number;       // below this = silence, no gain drift
    kickThreshold: number;    // relative to median flux
    kickCooldownMs: number;
  };
  fixtures: FixtureConfig[];
  mode: Mode;
  /** Which codec input feeds the show: line on the P1 AUX header or the mic path. */
  audioInput: "aux" | "mic";
  sensitivity: number;    // 0..1 user knob
  /** 0..1 kontrast: 0 = jämnt ljus, 1 = dovt i tystnad + smäll i beats. */
  dynamics: number;
  /** Pulsa hela riggen på taktslag. */
  beatPulse: boolean;
  /** Lampans hårdvarustrobe som punch på drop. */
  punchOnDrop: boolean;
  /** Energi (lokal) väljer läge i smart-läget. */
  energyDrivesMode: boolean;
  /** Drop-blixt på starka slag: 0=av .. 1=känsligast. */
  dropSensitivity: number;
  /** Hur ofta smart byter läge (ms). */
  smartDwellMs: number;
  master: number;         // 0..1 master brightness
  /** Hue 0..360 used by "mono" mode. 15 ≈ fire orange, 0 = red, 240 = blue. */
  monoHue: number;
  /** Hue 0..360 used by "comet" mode for the fireball head. */
  cometHue: number;
  /** Hue A (bass side) for "split" mode. */
  splitHueA: number;
  /** Hue B (treble side) for "split" mode. */
  splitHueB: number;
  /** "chase" sub-pattern: sweep (L→R loop) or ping-pong (bounce). */
  chaseStyle: "sweep" | "pingpong";
  /** Which modes are included in the physical button / WS cycle. */
  rotation: Partial<Record<Mode, boolean>>;
  /** Physical push-button that cycles through modes. Set null to disable. */
  modeButton: { chip: string; line: number } | null;
  /** Transient identify override — not persisted. index = fixture being lit. */
  identify?: { index: number } | null;
  /** Transient SmartSync flash override (wall-clock ms) — not persisted. */
  flashUntil?: number | null;
  /** Transient SmartSync beat clock (BPM + wall-clock anchor) — not persisted. */
  beat?: { anchorMs: number; bpm: number } | null;
  /** Tap-tempo override (BPM). When set, overrides the auto-detected tempo for
   *  the beat clock; the PLL still aligns phase to real kicks. Transient — not
   *  persisted, so a restart falls back to auto-detection. */
  manualBpm?: number | null;
  /** Upper DMX refresh cap (Hz). Actual rate = min(dmxMaxHz, wire-limit). */
  dmxMaxHz: number;
  /** Rökmaskin (1 DMX-kanal). Blast på drop, med duty-cycle-skydd. */
  fog?: {
    enabled: boolean;      // maskinen inkopplad/aktiv
    address: number;       // DMX-adress 1..512
    onDrop: boolean;       // auto-blast på drop
    burstMs: number;       // max längd per blast
    cooldownMs: number;    // min tid mellan blast (skydd mot överhettning/tomt)
    level: number;         // DMX-värde (0..255) när den rökar
  };
  /** Transient one-shot: sätt true för en manuell rök-puff — inte persisterad. */
  fogTrigger?: boolean;
}

export const defaultConfig: EngineConfig = {
  audio: { device: "hw:0,0", rate: 48000, channels: 2 },
  fft: { size: 512, hop: 128 },
  detection: {
    autoGainTarget: 0.5,
    tauUp: 90,
    tauDown: 30,
    noiseFloor: 0.003,
    kickThreshold: 1.6,
    kickCooldownMs: 90,
  },
  fixtures: [
    { name: "Par 1", address: 1,  preset: "rgb" },
    { name: "Par 2", address: 4,  preset: "rgb" },
    { name: "Par 3", address: 7,  preset: "rgb" },
    { name: "Par 4", address: 10, preset: "rgb" },
  ],
  mode: "smart",
  audioInput: "aux",
  sensitivity: 0.6,
  dynamics: 0.6,
  beatPulse: true,
  punchOnDrop: false,
  energyDrivesMode: true,
  dropSensitivity: 0.3,
  smartDwellMs: 9000,
  master: 1.0,
  monoHue: 15,   // warm orange — feels like fire, but the user can pick anything
  cometHue: 15,  // fireball default; pick e.g. 220 for a blue comet
  splitHueA: 0,    // red for bass side
  splitHueB: 200,  // cyan for treble side
  chaseStyle: "pingpong",
  rotation: { cycle: true, breathe: true, tide: true, mono: false, aurora: true, drift: true, wave: true, chase: true, drops: true, sweep: true, pulse: true, party: true, snap: true, bounce: true, strobe: true, rave: true },
  modeButton: { chip: "gpiochip0", line: 27 },   // GPIO27 = Codec Zero onboard button (SW1)
  dmxMaxHz: 50, // safe max for typical fixtures; helper caps automatically
  fog: { enabled: false, address: 128, onDrop: true, burstMs: 2500, cooldownMs: 25000, level: 255 },
};

export const PRESET_ROLES: Record<Exclude<FixturePreset, "custom">, ChannelRole[]> = {
  rgb:    ["r", "g", "b"],
  rgbw:   ["r", "g", "b", "w"],
  dimmer: ["dim"],
};

export function fixtureRoles(fx: FixtureConfig): ChannelRole[] {
  if (fx.preset === "custom") return fx.roles ?? [];
  return PRESET_ROLES[fx.preset];
}

/**
 * Highest DMX channel used by any fixture, or 0 if there are none.
 * The C sidecar accepts frames from 24 to 512 slots — the fewer we send,
 * the faster each frame gets on the wire (fewer bytes @ 44 µs each).
 */
export function activeSlots(fixtures: FixtureConfig[]): number {
  let max = 0;
  for (const fx of fixtures) {
    const w = fixtureRoles(fx).length;
    const top = fx.address + w - 1;
    if (top > max) max = top;
  }
  // Clamp to spec-min 24, spec-max 512
  if (max < 24) max = 24;
  if (max > 512) max = 512;
  return max;
}
