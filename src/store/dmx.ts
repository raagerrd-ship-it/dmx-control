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
  | "party"
  | "strobe"
  | "comet"
  | "chase"
  | "split"
  | "mono";

export interface Preset {
  id: PresetId;
  name: string;
  hue: number;           // base hue 0..360 (accent color)
  description: string;
}

export const PRESETS: Preset[] = [
  { id: "auto",   name: "Auto",   hue: 280, description: "Färghjul, kick → blixt" },
  { id: "party",  name: "Party",  hue: 320, description: "Regnbåge + vit puls på kick" },
  { id: "strobe", name: "Strobe", hue: 0,   description: "Vit blink i takt" },
  { id: "comet",  name: "Comet",  hue: 25,  description: "Eldklot glider med lång svans (välj hue)" },
  { id: "chase",  name: "Chase",  hue: 160, description: "Ljus hoppar mellan lampor på beat" },
  { id: "split",  name: "Split",  hue: 200, description: "Grupp A = bas, Grupp B = diskant" },
  { id: "mono",   name: "Mono",   hue: 15,  description: "En färg, flimrande (välj hue)" },
];

export interface Params {
  brightness: number;   // 0..100
  smoothness: number;   // 0..100
  sensitivity: number;  // 0..100
  monoHue: number;      // 0..360
  cometHue: number;     // 0..360 (delas av Chase-huvudet)
  splitHueA: number;    // 0..360 — Split: grupp A (bas)
  splitHueB: number;    // 0..360 — Split: grupp B (diskant)
}

export type Rotation = Record<PresetId, boolean>;

interface DmxState {
  preset: PresetId;
  params: Params;
  fixtures: Fixture[];
  rotation: Rotation;
  micEnabled: boolean;
  micError: string | null;
  audioLevel: number;   // 0..1 (smoothed)
  kick: number;         // 0..1 (decaying)
  frame: number[];      // DMX 1..512, values 0..255
  bpm: number;          // 0 = ej låst
  bpmConfidence: number;// 0..1
  setPreset: (id: PresetId) => void;
  patchParams: (p: Partial<Params>) => void;
  addFixture: () => void;
  updateFixture: (id: string, patch: Partial<Fixture>) => void;
  removeFixture: (id: string) => void;
  toggleRotation: (id: PresetId) => void;
  setLive: (audio: number, kick: number, frame: number[]) => void;
  setBpm: (bpm: number, confidence: number) => void;

  setMicEnabled: (b: boolean) => void;
  setMicError: (m: string | null) => void;
}

const LS_KEY = "dmx-config-v1";

interface Persisted {
  preset: PresetId;
  params: Params;
  fixtures: Fixture[];
  rotation: Rotation;
}

const defaultRotation: Rotation = {
  auto: true, party: true, strobe: false, comet: true, chase: true, split: true, mono: false,
};

const defaults: Persisted = {
  preset: "auto",
  params: { brightness: 80, smoothness: 50, sensitivity: 60, monoHue: 15, cometHue: 15, splitHueA: 0, splitHueB: 200 },
  fixtures: [
    { id: "f1", name: "PAR 1", startCh: 1,  mode: "rgb" },
    { id: "f2", name: "PAR 2", startCh: 4,  mode: "rgb" },
    { id: "f3", name: "PAR 3", startCh: 7,  mode: "rgb" },
    { id: "f4", name: "PAR 4", startCh: 10, mode: "rgb" },
  ],
  rotation: defaultRotation,
};

function load(): Persisted {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    const merged: Persisted = {
      ...defaults,
      ...parsed,
      params: { ...defaults.params, ...(parsed.params ?? {}) },
      rotation: { ...defaultRotation, ...(parsed.rotation ?? {}) },
    };
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

export const useDmx = create<DmxState>((set, get) => {
  const persist = () => {
    const { preset, params, fixtures, rotation } = get();
    save({ preset, params, fixtures, rotation });
  };
  return {
    preset: initial.preset,
    params: initial.params,
    fixtures: initial.fixtures,
    rotation: initial.rotation,
    micEnabled: false,
    micError: null,
    audioLevel: 0,
    kick: 0,
    frame: new Array(512).fill(0),

    setPreset: (id) => { set({ preset: id }); persist(); },
    patchParams: (p) => { set({ params: { ...get().params, ...p } }); persist(); },
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
      persist();
    },
    updateFixture: (id, patch) => {
      set({ fixtures: get().fixtures.map((f) => (f.id === id ? { ...f, ...patch } : f)) });
      persist();
    },
    removeFixture: (id) => {
      set({ fixtures: get().fixtures.filter((f) => f.id !== id) });
      persist();
    },
    toggleRotation: (id) => {
      const rotation = { ...get().rotation, [id]: !get().rotation[id] };
      set({ rotation });
      persist();
    },
    setLive: (audioLevel, kick, frame) => set({ audioLevel, kick, frame }),
    setMicEnabled: (micEnabled) => set({ micEnabled, micError: micEnabled ? get().micError : null }),
    setMicError: (micError) => set({ micError }),
  };
});

export function channelsFor(mode: FixtureMode): number {
  return mode === "rgbw" ? 4 : mode === "dimmer" ? 1 : 3;
}

export function presetById(id: PresetId): Preset {
  return PRESETS.find((p) => p.id === id) ?? PRESETS[0];
}
