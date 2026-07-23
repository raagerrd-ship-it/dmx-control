import { useSyncExternalStore } from "react";

/**
 * Riktig WS-klient mot motorn på Pi:n (`/ws` på samma origin när UI:t serveras
 * från Pi via Fastify). Mock-läget lever kvar i `usePiMock.ts` — den här hooken
 * håller sig strikt till det verkliga `{type:"config", config}` som motorn
 * broadcastar. Ingen fabrikation, inga default-värden: `null` när vi inte är
 * anslutna, så UI:t kan visa "Ansluter…".
 */

/** Fält vi speglar från motorns EngineConfig. Håll synkat med moods.ts FEEL. */
export interface EnginePublicConfig {
  master?: number;
  dynamics?: number;
  sensitivity?: number;
  calmDecay?: number;
  smartDwellMs?: number;
  beatPulse?: boolean;
  dropBlackout?: boolean;
  clubMode?: boolean;
  ambientGlow?: boolean;
  energyDrivesMode?: boolean;
  energyCeiling?: boolean;
  riserStrobe?: boolean;
  dropHeadroom?: boolean;
  activeMood?: "chill" | "fest" | "galet";
  activeIntensity?: number;
}

type Listener = () => void;

let ws: WebSocket | null = null;
let backoff = 500;
let config: EnginePublicConfig | null = null;
let connected = false;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l());

function connect() {
  if (typeof window === "undefined") return;
  try {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    ws = new WebSocket(`${proto}//${window.location.host}/ws`);
  } catch {
    scheduleReconnect();
    return;
  }
  ws.addEventListener("open", () => {
    connected = true;
    backoff = 500;
    emit();
  });
  ws.addEventListener("close", () => {
    connected = false;
    emit();
    scheduleReconnect();
  });
  ws.addEventListener("error", () => { try { ws?.close(); } catch { /* noop */ } });
  ws.addEventListener("message", (ev) => {
    try {
      const msg = JSON.parse(ev.data as string);
      if (msg?.type === "config" && msg.config) {
        config = msg.config as EnginePublicConfig;
        emit();
      }
    } catch { /* ignore */ }
  });
}

function scheduleReconnect() {
  const wait = Math.min(backoff, 8000);
  backoff = Math.min(backoff * 2, 8000);
  setTimeout(connect, wait);
}

// Lazy-anslut när första subscribern registrerar sig.
function ensureConnected() {
  if (!ws && typeof window !== "undefined") connect();
}

function subscribe(l: Listener): () => void {
  ensureConnected();
  listeners.add(l);
  return () => { listeners.delete(l); };
}

export function usePiConfig(): EnginePublicConfig | null {
  return useSyncExternalStore(subscribe, () => config, () => null);
}

export function usePiConnected(): boolean {
  return useSyncExternalStore(subscribe, () => connected, () => false);
}

/**
 * Speglar `moods.ts` applyIntensity() exakt. Används i preview (Lovable)
 * där ingen Pi finns att prata WS med — så Avancerat-vyn visar samma
 * kurvor som motorn skulle sätta för given stämning.
 */
const FEEL = {
  chill: { dynamics: 0.30, sensitivity: 0.50, master: 0.30, calmDecay: 1.20, smartDwellMs: 40000,
           beatPulse: false, dropBlackout: false, clubMode: false, ambientGlow: true,
           energyDrivesMode: false, energyCeiling: true, riserStrobe: false, dropHeadroom: false },
  fest:  { dynamics: 0.60, sensitivity: 0.60, master: 1.00, calmDecay: 0.42, smartDwellMs: 15000,
           beatPulse: true,  dropBlackout: true,  clubMode: false, ambientGlow: false,
           energyDrivesMode: true,  energyCeiling: true, riserStrobe: false, dropHeadroom: false },
  galet: { dynamics: 0.85, sensitivity: 0.70, master: 1.00, calmDecay: 0.42, smartDwellMs: 10000,
           beatPulse: true,  dropBlackout: true,  clubMode: true,  ambientGlow: false,
           energyDrivesMode: true,  energyCeiling: true, riserStrobe: true,  dropHeadroom: true  },
} as const;

export function deriveEngineConfig(xRaw: number): EnginePublicConfig {
  const x = Math.max(0, Math.min(1, xRaw));
  const [aId, bId, t] = x <= 0.5
    ? (["chill", "fest",  x / 0.5]        as const)
    : (["fest",  "galet", (x - 0.5) / 0.5] as const);
  const a = FEEL[aId], b = FEEL[bId];
  const lerp = (u: number, v: number) => u + (v - u) * t;
  const bucket = x < 1 / 3 ? "chill" : x < 2 / 3 ? "fest" : "galet";
  const bf = FEEL[bucket];
  return {
    dynamics:       lerp(a.dynamics, b.dynamics),
    sensitivity:    lerp(a.sensitivity, b.sensitivity),
    master:         lerp(a.master, b.master),
    calmDecay:      lerp(a.calmDecay, b.calmDecay),
    smartDwellMs:   Math.round(lerp(a.smartDwellMs, b.smartDwellMs)),
    beatPulse:        bf.beatPulse,
    dropBlackout:     bf.dropBlackout,
    clubMode:         bf.clubMode,
    ambientGlow:      bf.ambientGlow,
    energyDrivesMode: bf.energyDrivesMode,
    energyCeiling:    bf.energyCeiling,
    riserStrobe:      bf.riserStrobe,
    dropHeadroom:     bf.dropHeadroom,
    activeMood: bucket,
    activeIntensity: x,
  };
}
