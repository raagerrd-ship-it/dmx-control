import { useEffect, useState } from "react";

/** Pi-style mode-kategorier. Håll i synk med pi-dmx/engine/public/index.html. */
export const CALM_MODES: [string, string, string][] = [
  ["cycle",   "Cykel",   "Alla lampor andas i takt medan färgen sakta vandrar runt."],
  ["breathe", "Andas",   "Hela riggen andas som en – djup mjuk våg i en färg."],
  ["tide",    "Tidvatten","En långsam våg sköljer fram och tillbaka i par."],
  ["mono",    "Eld",     "Varm brasa som flimrar levande, glider rött → gult."],
  ["aurora",  "Aurora",  "Varje lampa driver i sin egen färg, som norrsken."],
  ["drift",   "Drift",   "Nästan stilla glöd som mycket sakta byter färg."],
];
export const FAST_MODES: [string, string, string][] = [
  ["wave",   "Våg",    "Flödande färgvåg som rullar över hela riggen."],
  ["chase",  "Jakt",   "En ljuspunkt springer i takt och byter färg."],
  ["drops",  "Drops",  "Varje slag målar nästa lampa i en ny färg."],
  ["sweep",  "Svep",   "En smal spotlight glider över en mörk rigg."],
  ["pulse",  "Puls",   "Hela riggen i en färg som pulsar på beatet."],
];
export const FULL_MODES: [string, string, string][] = [
  ["party",  "Party",  "Färgkaos som pumpar hårt på varje taktslag."],
  ["snap",   "Snap",   "Alla lampor byter färg blixtsnabbt på varje slag."],
  ["bounce", "Studs",  "En skarp ljuspunkt studsar fram och tillbaka."],
  ["strobe", "Strobe", "Snabb strobe-blixt med skiftande färg."],
  ["rave",   "Rave",   "Varannan lampa blinkar i motfärger – hård växling."],
];
const ALL = [...CALM_MODES, ...FAST_MODES, ...FULL_MODES];

const LS_KEY = "pi-mock-v1";

export type Dwell = "slow" | "normal" | "fast";
export type DropSens = 0 | 0.3 | 0.6 | 0.9;
export type AudioIn = "aux" | "mic";

export interface PiSettings {
  rotation: Record<string, boolean>;
  energyDrivesMode: boolean;
  beatPulse: boolean;
  dwell: Dwell;
  dropSensitivity: DropSens;
  agcAgg: 0.15 | 0.85;
  dynamics: 0.35 | 0.6 | 0.85;
  master: 0.5 | 0.75 | 1;
  audioInput: AudioIn;
}

const defaults: PiSettings = {
  rotation: Object.fromEntries(ALL.map(([m]) => [m, true])),
  energyDrivesMode: true,
  beatPulse: false,
  dwell: "normal",
  dropSensitivity: 0.6,
  agcAgg: 0.15,
  dynamics: 0.6,
  master: 1,
  audioInput: "aux",
};

function load(): PiSettings {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return defaults;
    const p = JSON.parse(raw) as Partial<PiSettings>;
    return { ...defaults, ...p, rotation: { ...defaults.rotation, ...(p.rotation ?? {}) } };
  } catch { return defaults; }
}

/** Global mock-state — små hooks som pratar med samma singleton så alla kort ser samma värden. */
let state: PiSettings = load();
const listeners = new Set<() => void>();
function emit() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
  listeners.forEach((l) => l());
}
export function setPi(patch: Partial<PiSettings>) { state = { ...state, ...patch }; emit(); }
export function setRotation(mode: string, on: boolean) {
  state = { ...state, rotation: { ...state.rotation, [mode]: on } }; emit();
}
export function usePi(): PiSettings {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  return state;
}

/** Cyklar aktiv mode enligt dwell + enabled rotation. Returnerar aktuell mode-nyckel. */
export function usePlayingMode(): string {
  const s = usePi();
  const [mode, setMode] = useState<string>(() => firstEnabled(s.rotation));
  useEffect(() => {
    const dwellMs = s.dwell === "fast" ? 4500 : s.dwell === "slow" ? 15000 : 9000;
    const id = setInterval(() => {
      const enabled = ALL.map(([m]) => m).filter((m) => s.rotation[m] !== false);
      if (!enabled.length) return;
      setMode((cur) => {
        const idx = enabled.indexOf(cur);
        return enabled[(idx + 1) % enabled.length];
      });
    }, dwellMs);
    return () => clearInterval(id);
  }, [s.dwell, s.rotation]);
  // Om aktuell mode blev bortkryssad, hoppa framåt.
  useEffect(() => {
    if (s.rotation[mode] === false) setMode(firstEnabled(s.rotation));
  }, [s.rotation, mode]);
  return mode;
}

function firstEnabled(r: Record<string, boolean>): string {
  const m = ALL.find(([m]) => r[m] !== false);
  return m ? m[0] : "cycle";
}
