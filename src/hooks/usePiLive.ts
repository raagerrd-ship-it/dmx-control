import { useEffect, useState } from "react";

/**
 * Öppnar WS mot Pi-engine (samma origin) och exponerar live BPM + confidence.
 * När appen körs från Lovable-preview (ingen Pi) misslyckas anslutningen tyst
 * och `connected` förblir false — komponenten som visar värdena döljer sig då.
 */
export interface PiLive {
  connected: boolean;
  bpm: number;
  bpmConfidence: number;
}

export function usePiLive(): PiLive {
  const [state, setState] = useState<PiLive>({ connected: false, bpm: 0, bpmConfidence: 0 });

  useEffect(() => {
    // Kör inte WS-försök i utvecklings-preview (Vite dev-server har inte /ws).
    // I produktion serveras UI av Pi-Fastify som exponerar /ws på samma origin.
    if (import.meta.env.DEV) return;

    let ws: WebSocket | null = null;
    let reconnectT: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    const connect = () => {
      const proto = location.protocol === "https:" ? "wss" : "ws";
      try {
        ws = new WebSocket(`${proto}://${location.host}/ws`);
      } catch {
        reconnectT = setTimeout(connect, 2000);
        return;
      }
      ws.onopen = () => setState((s) => ({ ...s, connected: true }));
      ws.onclose = () => {
        setState({ connected: false, bpm: 0, bpmConfidence: 0 });
        if (!closed) reconnectT = setTimeout(connect, 2000);
      };
      ws.onerror = () => ws?.close();
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === "frame") {
            setState((s) => ({
              connected: true,
              bpm: typeof msg.bpm === "number" ? msg.bpm : s.bpm,
              bpmConfidence: typeof msg.bpmConfidence === "number" ? msg.bpmConfidence : s.bpmConfidence,
            }));
          }
        } catch { /* ignore */ }
      };
    };
    connect();
    return () => {
      closed = true;
      if (reconnectT) clearTimeout(reconnectT);
      ws?.close();
    };
  }, []);

  return state;
}
