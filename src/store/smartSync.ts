import { create } from "zustand";

export type TimelineEvent =
  | { atMs: number; type: "section"; preset: string; primaryHue: number; secondaryHue: number; energy: number }
  | { atMs: number; type: "flash"; durationMs: number }
  | { atMs: number; type: "bar"; conf: number };

export interface SmartSyncTrack {
  id: string;
  name: string;
  artists: string;
  artUrl: string | null;
  durationMs: number;
}

export type SmartSyncStatus =
  | "off"
  | "listening"       // spelar in för identifiering
  | "identifying"     // väntar på ACRCloud
  | "analyzing"       // hämtar Spotify audio-analysis
  | "synced"          // timeline aktiv
  | "no-match"        // sista försök hittade inget
  | "error";

interface SmartSyncState {
  enabled: boolean;
  status: SmartSyncStatus;
  errorMsg: string | null;
  track: SmartSyncTrack | null;
  /** Absolut wall-clock ms som motsvarar timeline atMs=0. */
  anchorAt: number | null;
  events: TimelineEvent[];
  lastAttemptAt: number;
  setEnabled: (b: boolean) => void;
  setStatus: (s: SmartSyncStatus, err?: string | null) => void;
  setSync: (payload: { track: SmartSyncTrack; anchorAt: number; events: TimelineEvent[] }) => void;
  markAttempt: () => void;
  reset: () => void;
}

export const useSmartSync = create<SmartSyncState>((set) => ({
  enabled: false,
  status: "off",
  errorMsg: null,
  track: null,
  anchorAt: null,
  events: [],
  lastAttemptAt: 0,
  setEnabled: (enabled) => set({ enabled, status: enabled ? "listening" : "off", errorMsg: enabled ? null : null }),
  setStatus: (status, err = null) => set({ status, errorMsg: err }),
  setSync: ({ track, anchorAt, events }) => set({ track, anchorAt, events, status: "synced", errorMsg: null }),
  markAttempt: () => set({ lastAttemptAt: Date.now() }),
  reset: () => set({ status: "off", track: null, anchorAt: null, events: [], errorMsg: null }),
}));

/** Returnerar aktiv override (senaste passerade `section`) + eventuell aktiv flash. */
export function activeOverride(nowMs: number): {
  section: Extract<TimelineEvent, { type: "section" }> | null;
  flashUntil: number; // absolut wall-clock ms
} {
  const st = useSmartSync.getState();
  if (st.status !== "synced" || !st.anchorAt) return { section: null, flashUntil: 0 };
  const rel = nowMs - st.anchorAt;
  let section: Extract<TimelineEvent, { type: "section" }> | null = null;
  let flashUntil = 0;
  for (const e of st.events) {
    if (e.atMs > rel) break;
    if (e.type === "section") section = e;
    else if (e.type === "flash") {
      const until = st.anchorAt + e.atMs + e.durationMs;
      if (until > nowMs) flashUntil = Math.max(flashUntil, until);
    }
  }
  return { section, flashUntil };
}
