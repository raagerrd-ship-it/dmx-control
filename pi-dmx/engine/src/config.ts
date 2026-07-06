/**
 * Runtime config. Kept as a single object so the mobile UI can mutate it
 * over WebSocket and we can persist to /var/lib/audio-dmx-engine/config.json.
 */

export type Mode = "auto" | "chill" | "party" | "chase" | "mono" | "strobe" | "blackout";

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
}

export interface EngineConfig {
  audio: {
    device: string;       // e.g. "hw:1,0" for UCA202
    rate: number;         // 48000
    channels: 1 | 2;      // 2 for stereo line-in (summed to mono internally)
  };
  fft: {
    size: 512;            // ~5 ms latency @ 48k, decent bass resolution
    hop: 128;             // ~2.7 ms hop
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
  sensitivity: number;    // 0..1 user knob
  master: number;         // 0..1 master brightness
  /** Hue 0..360 used by "mono" mode. 15 ≈ fire orange, 0 = red, 240 = blue. */
  monoHue: number;
  /** Physical push-button that cycles through modes. Set null to disable. */
  modeButton: { chip: string; line: number } | null;
  /** Transient identify override — not persisted. index = fixture being lit. */
  identify?: { index: number } | null;
}

export const defaultConfig: EngineConfig = {
  audio: { device: "hw:1,0", rate: 48000, channels: 2 },
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
  mode: "auto",
  sensitivity: 0.6,
  master: 1.0,
  monoHue: 15,   // warm orange — feels like fire, but the user can pick anything
  modeButton: { chip: "gpiochip0", line: 17 },   // GPIO17 = physical pin 11
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
