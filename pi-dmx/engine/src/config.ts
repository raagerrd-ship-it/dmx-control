/**
 * Runtime config. Kept as a single object so the mobile UI can mutate it
 * over WebSocket and we can persist to /var/lib/audio-dmx-engine/config.json.
 */

export type Mode = "auto" | "chill" | "party" | "chase" | "fire" | "strobe" | "blackout";

export interface FixtureConfig {
  /** DMX start address (1..512) */
  address: number;
  /** 3 = RGB, 4 = RGBW, 1 = dimmer-only */
  channels: 3 | 4 | 1;
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
    // MVP: 4 RGB-par-lampor på adress 1, 4, 7, 10
    { address: 1,  channels: 3 },
    { address: 4,  channels: 3 },
    { address: 7,  channels: 3 },
    { address: 10, channels: 3 },
  ],
  mode: "auto",
  sensitivity: 0.6,
  master: 1.0,
};
