import { create } from "zustand";

export type LiveStatus = "off" | "loading" | "listening" | "locked" | "error";

interface LiveState {
  enabled: boolean;
  status: LiveStatus;
  errorMsg: string | null;
  bpm: number;                 // 0 = ej låst än
  bpmConfidence: number;       // 0..1
  key: string;                 // t.ex. "A minor" eller ""
  energy: number;              // 0..1 EMA
  /** Wall-clock ms för senaste drop-blixt. */
  lastFlashAt: number;
  /** Wall-clock ms — nästa förutspådda beat (från BPM-lås). */
  nextBeatAt: number;
  sensitivity: number;         // 0..1
  sendBeats: boolean;
  sendDrops: boolean;
  sendHues: boolean;
  /** Mic-trim i dB (-24..+24) — appliceras på inspelade sampel före FFT/BPM. */
  micTrimDb: number;

  setEnabled: (b: boolean) => void;
  setStatus: (s: LiveStatus, err?: string | null) => void;
  update: (patch: Partial<Pick<LiveState, "bpm" | "bpmConfidence" | "key" | "energy" | "nextBeatAt">>) => void;
  markFlash: (atMs: number) => void;
  setSensitivity: (v: number) => void;
  setSendBeats: (b: boolean) => void;
  setSendDrops: (b: boolean) => void;
  setSendHues: (b: boolean) => void;
  setMicTrimDb: (v: number) => void;
}

const LS_KEY = "live-analysis-cal-v1";
interface Persisted { micTrimDb: number; sensitivity: number }
function loadCal(): Persisted {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return { micTrimDb: 0, sensitivity: 0.6, ...JSON.parse(raw) };
  } catch { /* noop */ }
  return { micTrimDb: 0, sensitivity: 0.6 };
}
function saveCal(p: Persisted) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(p)); } catch { /* noop */ }
}
const initialCal = loadCal();


export const useLiveAnalysis = create<LiveState>((set) => ({
  enabled: false,
  status: "off",
  errorMsg: null,
  bpm: 0,
  bpmConfidence: 0,
  key: "",
  energy: 0,
  lastFlashAt: 0,
  nextBeatAt: 0,
  sensitivity: initialCal.sensitivity,
  sendBeats: true,
  sendDrops: true,
  sendHues: true,
  micTrimDb: initialCal.micTrimDb,
  setEnabled: (enabled) => set({ enabled, status: enabled ? "loading" : "off", errorMsg: null }),
  setStatus: (status, err = null) => set({ status, errorMsg: err }),
  update: (patch) => set(patch),
  markFlash: (atMs) => set({ lastFlashAt: atMs }),
  setSensitivity: (sensitivity) => {
    set({ sensitivity });
    saveCal({ micTrimDb: useLiveAnalysis.getState().micTrimDb, sensitivity });
  },
  setSendBeats: (sendBeats) => set({ sendBeats }),
  setSendDrops: (sendDrops) => set({ sendDrops }),
  setSendHues: (sendHues) => set({ sendHues }),
  setMicTrimDb: (micTrimDb) => {
    const v = Math.max(-24, Math.min(24, micTrimDb));
    set({ micTrimDb: v });
    saveCal({ micTrimDb: v, sensitivity: useLiveAnalysis.getState().sensitivity });
  },
}));


/** Aktiv drop-blixt (200 ms lookahead-window) från Live Analysis. */
export function liveActiveFlash(nowMs: number): boolean {
  const st = useLiveAnalysis.getState();
  if (!st.enabled || !st.sendDrops) return false;
  return nowMs - st.lastFlashAt < 250;
}

/** Färg-hint från key/mode (dur → varm, moll → kall). Null om av. */
export function liveHueHint(): { primary: number; secondary: number } | null {
  const st = useLiveAnalysis.getState();
  if (!st.enabled || !st.sendHues || !st.key) return null;
  const isMinor = st.key.toLowerCase().includes("minor");
  // Grundton → hue offset
  const NOTE_TO_HUE: Record<string, number> = {
    C: 0, "C#": 30, D: 60, "D#": 90, E: 120, F: 150,
    "F#": 180, G: 210, "G#": 240, A: 270, "A#": 300, B: 330,
  };
  const noteMatch = st.key.match(/^([A-G]#?)/);
  const base = noteMatch ? (NOTE_TO_HUE[noteMatch[1]] ?? 0) : 0;
  if (isMinor) {
    // Kall palett: skifta mot blå/violett
    return { primary: (base + 200) % 360, secondary: (base + 260) % 360 };
  }
  // Varm palett: orange/gul/magenta
  return { primary: (base + 20) % 360, secondary: (base + 320) % 360 };
}
