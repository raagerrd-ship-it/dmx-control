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
