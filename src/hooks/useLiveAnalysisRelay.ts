/**
 * WS-relay: streamar Live Analysis-events (drop-flash, beat, hue-hint, energi)
 * från browser-storen till Pi-engine på `ws://<samma host>/ws`. No-op i preview.
 *
 * Drop-blixten är tidskritisk och skickas FÖRST + med backpressure-skydd så den
 * aldrig köas bakom lågprio-meddelanden på en stockad socket.
 */

import { useEffect, useRef } from "react";
import { useLiveAnalysis } from "@/store/liveAnalysis";

const NOTE_TO_HUE: Record<string, number> = {
  C: 0, "C#": 30, D: 60, "D#": 90, E: 120, F: 150,
  "F#": 180, G: 210, "G#": 240, A: 270, "A#": 300, B: 330,
};

export function useLiveAnalysisRelay() {
  const enabled = useLiveAnalysis((s) => s.enabled);
  const sockRef = useRef<WebSocket | null>(null);
  const lastFlashSent = useRef(0);
  const lastHueSent = useRef(0);
  const lastBeatSent = useRef(0);
  const lastKeyStr = useRef("");
  const lastEnergySent = useRef(0);
  const lastSettings = useRef("");

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let retryTimer: number | null = null;

    const connect = () => {
      if (cancelled) return;
      try {
        const host = window.location.host;
        if (!host || host.includes("lovable.app") || host.includes("lovable.dev")) return;
        const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
        const ws = new WebSocket(`${proto}//${host}/ws`);
        sockRef.current = ws;
        ws.onopen = () => {
          try {
            ws.send(JSON.stringify({ type: "setMode", mode: "smart" }));
            const st = useLiveAnalysis.getState();
            ws.send(JSON.stringify({ type: "smartDwell", mode: st.dwellMode }));
            ws.send(JSON.stringify({ type: "beatPulse", enabled: st.beatPulse }));
            ws.send(JSON.stringify({ type: "punchOnDrop", enabled: st.punchOnDrop }));
          } catch { /* noop */ }
        };
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

    const unsub = useLiveAnalysis.subscribe((s) => {
      const ws = sockRef.current;
      if (!ws || ws.readyState !== 1) return;
      const now = Date.now();

      // 1) Drop-blixt — tidskritisk, FÖRST och alltid.
      if (s.sendDrops && s.lastFlashAt !== lastFlashSent.current && s.lastFlashAt > 0) {
        lastFlashSent.current = s.lastFlashAt;
        ws.send(JSON.stringify({ type: "liveFlash", inMs: 0, durationMs: 130 }));
      }

      // 2) Stockad socket → hoppa lågprio så flash aldrig fastnar i kö.
      if (ws.bufferedAmount > 2048) return;

      // Inställningar (dwell/puls/punch) — vid ändring.
      const sig = `${s.dwellMode}|${s.beatPulse}|${s.punchOnDrop}`;
      if (sig !== lastSettings.current) {
        lastSettings.current = sig;
        ws.send(JSON.stringify({ type: "smartDwell", mode: s.dwellMode }));
        ws.send(JSON.stringify({ type: "beatPulse", enabled: s.beatPulse }));
        ws.send(JSON.stringify({ type: "punchOnDrop", enabled: s.punchOnDrop }));
      }

      // Energi → smart-lägets effektväljare (throttlat 2 s).
      if (s.energyDrivesMode && now - lastEnergySent.current > 2000 && typeof s.energy === "number") {
        lastEnergySent.current = now;
        ws.send(JSON.stringify({ type: "liveEnergy", value: s.energy }));
      }

      // Taktlås (BPM × multiplikator).
      if (s.sendBeats && s.bpm > 0 && s.nextBeatAt !== lastBeatSent.current) {
        lastBeatSent.current = s.nextBeatAt;
        ws.send(JSON.stringify({ type: "liveBeat", bpm: s.bpm * s.bpmMult, inMs: Math.max(0, s.nextBeatAt - now) }));
      }

      // Färg-hint från tonart (throttlat 5 s).
      if (s.sendHues && s.key && s.key !== lastKeyStr.current && now - lastHueSent.current > 5000) {
        lastKeyStr.current = s.key;
        lastHueSent.current = now;
        const isMinor = s.key.toLowerCase().includes("minor");
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
