import { useEffect } from "react";
import { useDmx } from "@/store/dmx";

/**
 * Öppnar WS mot Pi-engine (samma origin) och skriver live BPM + confidence
 * till dmx-store. I dev/preview är WS inte tillgängligt — då lämnas
 * store-värdena åt useMockLive.
 */
export function usePiLive() {
  const setBpm = useDmx((s) => s.setBpm);

  useEffect(() => {
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
      ws.onclose = () => {
        if (!closed) reconnectT = setTimeout(connect, 2000);
      };
      ws.onerror = () => ws?.close();
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === "frame" && typeof msg.bpm === "number") {
            setBpm(msg.bpm, typeof msg.bpmConfidence === "number" ? msg.bpmConfidence : 0);
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
  }, [setBpm]);
}
