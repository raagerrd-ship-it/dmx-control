import { create } from "zustand";

export type FixtureMode = "rgb" | "rgbw" | "dimmer";

export interface Fixture {
  id: string;
  name: string;
  startCh: number; // 1..512
  mode: FixtureMode;
}

export type PresetId =
  | "auto"
  | "chill"
  | "party"
  | "strobe"
  | "chase"
  | "fire";

export interface Preset {
  id: PresetId;
  name: string;
  hue: number;           // base hue 0..360 (accent color)
  description: string;
}

export const PRESETS: Preset[] = [
  { id: "auto",   name: "Auto",   hue: 280, description: "Färghjul, kick → blixt" },
  { id: "chill",  name: "Chill",  hue: 20,  description: "Varma toner, långsam" },
  { id: "party",  name: "Party",  hue: 320, description: "Regnbåge, snabb, kick" },
  { id: "strobe", name: "Strobe", hue: 0,   description: "Vit blink i takt" },
  { id: "chase",  name: "Chase",  hue: 160, description: "Färgvåg sveper genom lamporna" },
  { id: "fire",   name: "Fire",   hue: 15,  description: "Varma flammor, flimrande" },
];

export interface Params {
  brightness: number;   // 0..100
  smoothness: number;   // 0..100  (0 = snärtigt/snabbt release, 100 = mjukt/långsamt — mappar releaseAlpha)
  sensitivity: number;  // 0..100
}

export type ConnState = "mock" | "connecting" | "connected" | "disconnected";

interface DmxState {
  preset: PresetId;
  params: Params;
  fixtures: Fixture[];
  conn: ConnState;
  micEnabled: boolean;
  micError: string | null;
  audioLevel: number;   // 0..1 (smoothed)
  kick: number;         // 0..1 (decaying)
  frame: number[];      // DMX 1..512, values 0..255
  setPreset: (id: PresetId) => void;
  patchParams: (p: Partial<Params>) => void;
  addFixture: () => void;
  updateFixture: (id: string, patch: Partial<Fixture>) => void;
  removeFixture: (id: string) => void;
  setLive: (audio: number, kick: number, frame: number[]) => void;
  setConn: (c: ConnState) => void;
  setMicEnabled: (b: boolean) => void;
  setMicError: (m: string | null) => void;
}

const LS_KEY = "dmx-config-v1";

interface Persisted {
  preset: PresetId;
  params: Params;
  fixtures: Fixture[];
}

const defaults: Persisted = {
  preset: "auto",
  params: { brightness: 80, smoothness: 50, sensitivity: 60 },
  fixtures: [
    { id: "f1", name: "PAR 1", startCh: 1,  mode: "rgb" },
    { id: "f2", name: "PAR 2", startCh: 4,  mode: "rgb" },
    { id: "f3", name: "PAR 3", startCh: 7,  mode: "rgb" },
    { id: "f4", name: "PAR 4", startCh: 10, mode: "rgb" },
  ],
};

function load(): Persisted {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return defaults;
    const merged = { ...defaults, ...JSON.parse(raw) } as Persisted;
    // Migrera bort borttagna presets (static/blackout → auto)
    if (!PRESETS.some((p) => p.id === merged.preset)) merged.preset = "auto";
    return merged;
  } catch {
    return defaults;
  }
}

function save(s: Persisted) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {}
}

const initial = load();

export const useDmx = create<DmxState>((set, get) => ({
  preset: initial.preset,
  params: initial.params,
  fixtures: initial.fixtures,
  conn: "mock",
  micEnabled: false,
  micError: null,
  audioLevel: 0,
  kick: 0,
  frame: new Array(512).fill(0),

  setPreset: (id) => {
    set({ preset: id });
    const { params, fixtures } = get();
    save({ preset: id, params, fixtures });
  },
  patchParams: (p) => {
    const params = { ...get().params, ...p };
    set({ params });
    save({ preset: get().preset, params, fixtures: get().fixtures });
  },
  addFixture: () => {
    const fixtures = [...get().fixtures];
    const last = fixtures[fixtures.length - 1];
    const startCh = last ? Math.min(509, last.startCh + channelsFor(last.mode)) : 1;
    fixtures.push({
      id: "f" + Date.now().toString(36),
      name: `Fixture ${fixtures.length + 1}`,
      startCh,
      mode: "rgb",
    });
    set({ fixtures });
    save({ preset: get().preset, params: get().params, fixtures });
  },
  updateFixture: (id, patch) => {
    const fixtures = get().fixtures.map((f) => (f.id === id ? { ...f, ...patch } : f));
    set({ fixtures });
    save({ preset: get().preset, params: get().params, fixtures });
  },
  removeFixture: (id) => {
    const fixtures = get().fixtures.filter((f) => f.id !== id);
    set({ fixtures });
    save({ preset: get().preset, params: get().params, fixtures });
  },
  setLive: (audioLevel, kick, frame) => set({ audioLevel, kick, frame }),
  setConn: (conn) => set({ conn }),
}));

export function channelsFor(mode: FixtureMode): number {
  return mode === "rgbw" ? 4 : mode === "dimmer" ? 1 : 3;
}

export function presetById(id: PresetId): Preset {
  return PRESETS.find((p) => p.id === id) ?? PRESETS[0];
}
