/**
 * WS-relay: streamar Live Analysis-events (drop-flash, hue-hint, beat) från
 * browser-storen till Pi-engine på `ws://<samma host>/ws`. No-op i preview
 * (fail silently om ingen server svarar).
 */

import { useEffect, useRef } from "react";
import { useLiveAnalysis } from "@/store/liveAnalysis";

export function useLiveAnalysisRelay() {
  const enabled = useLiveAnalysis((s) => s.enabled);
  const sockRef = useRef<WebSocket | null>(null);
  const lastFlashSent = useRef(0);
  const lastHueSent = useRef(0);
  const lastBeatSent = useRef(0);
  const lastKeyStr = useRef("");

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let retryTimer: number | null = null;

    const connect = () => {
      if (cancelled) return;
      try {
        // Skippa i lovable-preview: bara connect om vi är på Pi:ns AP eller lokal host
        const host = window.location.host;
        if (!host || host.includes("lovable.app") || host.includes("lovable.dev")) return;

        const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
        const ws = new WebSocket(`${proto}//${host}/ws`);
        sockRef.current = ws;
        ws.onclose = () => {
          sockRef.current = null;
          if (!cancelled) retryTimer = window.setTimeout(connect, 3000);
        };
        ws.onerror = () => { try { ws.close(); } catch { /* noop */ } };
      } catch {
        retryTimer = window.setTimeout(connect, 3000);
      }
    };
    connect();

    // Prenumerera på storen och skicka events
    const unsub = useLiveAnalysis.subscribe((s) => {
      const ws = sockRef.current;
      if (!ws || ws.readyState !== 1) return;

      // Drop-flash (lookahead → skicka atMs så Pi kan schemalägga)
      if (s.sendDrops && s.lastFlashAt !== lastFlashSent.current && s.lastFlashAt > 0) {
        lastFlashSent.current = s.lastFlashAt;
        ws.send(JSON.stringify({ type: "liveFlash", atMs: s.lastFlashAt, durationMs: 220 }));
      }

      // BPM-beat (skicka anchor + BPM en gång per BPM-uppdatering)
      if (s.sendBeats && s.bpm > 0 && s.nextBeatAt !== lastBeatSent.current) {
        lastBeatSent.current = s.nextBeatAt;
        ws.send(JSON.stringify({ type: "liveBeat", bpm: s.bpm, atMs: s.nextBeatAt }));
      }

      // Hue-hint (skicka bara när tonarten ändras, throttlat 5 s)
      const now = Date.now();
      if (s.sendHues && s.key && s.key !== lastKeyStr.current && now - lastHueSent.current > 5000) {
        lastKeyStr.current = s.key;
        lastHueSent.current = now;
        const isMinor = s.key.toLowerCase().includes("minor");
        const NOTE_TO_HUE: Record<string, number> = {
          C: 0, "C#": 30, D: 60, "D#": 90, E: 120, F: 150,
          "F#": 180, G: 210, "G#": 240, A: 270, "A#": 300, B: 330,
        };
        const noteMatch = s.key.match(/^([A-G]#?)/);
        const base = noteMatch ? (NOTE_TO_HUE[noteMatch[1]] ?? 0) : 0;
        const primary = isMinor ? (base + 200) % 360 : (base + 20) % 360;
        const secondary = isMinor ? (base + 260) % 360 : (base + 320) % 360;
        ws.send(JSON.stringify({ type: "liveHueHint", primary, secondary }));
      }
    });

    return () => {
      cancelled = true;
      unsub();
      if (retryTimer) clearTimeout(retryTimer);
      try { sockRef.current?.close(); } catch { /* noop */ }
      sockRef.current = null;
    };
  }, [enabled]);
}
