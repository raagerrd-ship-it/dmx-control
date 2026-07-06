import { useEffect, useRef } from "react";
import { channelsFor, presetById, useDmx } from "@/store/dmx";
import { smoothStep, softnessToAlpha } from "@/lib/audioCurve";

/**
 * Mock live-loop: simulerar mic-nivå + kick och genererar DMX-frame
 * utifrån vald preset. Ersätts av WebSocket när Pi-tjänsten är på plats.
 *
 * Mjukhet (`params.smoothness`) styr release-alpha via samma exponentialkurva
 * som Lotus Lantern (`softnessToAlpha`). Attack är alltid 1.0 (omedelbar rise),
 * release faller från 1.0 → 0.005 när slidern går 0 → 100. Detta ger fysiskt
 * korrekt "mjukare rörelse ju högre värde" på både ljudnivå, kick-envelope
 * och hue-rotation.
 */
export function useMockLive() {
  const raf = useRef<number | null>(null);
  const start = useRef(performance.now());
  const lastKick = useRef(0);
  const smoothedAudio = useRef(0);
  const smoothedKick = useRef(0);
  const huePhase = useRef(0);
  const lastT = useRef(performance.now() / 1000);

  useEffect(() => {
    const tick = () => {
      const t = (performance.now() - start.current) / 1000;
      const dt = Math.max(0.001, Math.min(0.1, t - lastT.current));
      lastT.current = t;
      const st = useDmx.getState();
      const { preset, params, fixtures } = st;
      const sens = params.sensitivity / 100;

      // Exponentialmappning: hög smoothness → låg releaseAlpha → mjukare fall.
      const releaseAlpha = softnessToAlpha(params.smoothness);
      const attackAlpha = 1.0;

      // Rå simulerad ljudnivå: bas-sinus + brus, smoothad med attack/release.
      const base = 0.35 + 0.35 * Math.sin(t * 1.8);
      const noise = Math.random() * 0.15;
      const rawAudio = Math.min(1, Math.max(0, (base + noise) * (0.5 + sens)));
      smoothedAudio.current = smoothStep(smoothedAudio.current, rawAudio, attackAlpha, releaseAlpha);
      const audio = smoothedAudio.current;

      // Kick-envelope: puls upp till 1.0 vid onset, faller mot 0 med releaseAlpha.
      // Kicks glesnar också med smoothness (mjukt = lugnare tempo).
      const period = 0.6 + (params.smoothness / 100) * 0.8;
      let kickTarget = 0;
      if (t - lastKick.current > period) {
        lastKick.current = t + Math.random() * 0.15;
        kickTarget = 1;
      }
      smoothedKick.current = smoothStep(smoothedKick.current, kickTarget, attackAlpha, releaseAlpha);
      const kick = smoothedKick.current;

      const frame = new Array(512).fill(0);
      const bri = params.brightness / 100;

      // Hue-rotation: fasackumulator drivs av dt så tempot bromsas med smoothness
      // men förblir tick-rate-oberoende. speedFac 0.2..2.7 vid soft 100..0.
      const speedFac = 0.2 + (1 - params.smoothness / 100) * 2.5;
      huePhase.current += dt * speedFac;
      const hueBase = huePhase.current;


      fixtures.forEach((f, idx) => {
        let r = 0, g = 0, b = 0, w = 0;

        switch (preset) {
          case "blackout":
            break;
          case "static": {
            const c = hsvToRgb(params.staticHue, 1, bri);
            r = c[0]; g = c[1]; b = c[2];
            break;
          }
          case "strobe": {
            const on = Math.sin(hueBase * 6) > 0.5 ? 1 : 0;
            r = g = b = on * 255 * bri;
            break;
          }
          case "chill": {
            const hue = 20 + Math.sin(hueBase * 0.3 + idx * 0.7) * 25;
            const v = bri * (0.7 + audio * 0.3);
            const c = hsvToRgb(hue, 0.9, v);
            r = c[0]; g = c[1]; b = c[2];
            break;
          }
          case "party": {
            const hue = (hueBase * 90 + idx * 90 + kick * 60) % 360;
            const v = bri * (0.6 + audio * 0.5);
            const c = hsvToRgb(hue, 1, Math.min(1, v));
            r = c[0]; g = c[1]; b = c[2];
            if (kick > 0.7) { r = g = b = 255 * bri; }
            break;
          }
          case "auto":
          default: {
            const hue = (hueBase * 30 + idx * 45) % 360;
            const v = bri * (0.5 + audio * 0.6);
            const c = hsvToRgb(hue, 0.95, Math.min(1, v));
            r = c[0]; g = c[1]; b = c[2];
            if (kick > 0.85) { r = g = b = 255 * bri; }
          }
        }

        const ch = f.startCh - 1;
        const chans = channelsFor(f.mode);
        if (f.mode === "dimmer") {
          frame[ch] = Math.round(Math.max(r, g, b));
        } else if (f.mode === "rgb") {
          frame[ch] = Math.round(r);
          frame[ch + 1] = Math.round(g);
          frame[ch + 2] = Math.round(b);
        } else {
          w = Math.min(r, g, b) * 0.6;
          frame[ch] = Math.round(r - w * 0.5);
          frame[ch + 1] = Math.round(g - w * 0.5);
          frame[ch + 2] = Math.round(b - w * 0.5);
          frame[ch + 3] = Math.round(w);
        }
        void chans;
      });

      st.setLive(audio, kick, frame);

      // uppdatera accent-färg efter preset
      const p = presetById(preset);
      const hue = preset === "static" ? params.staticHue : p.hue;
      document.documentElement.style.setProperty("--accent-h", String(hue));

      raf.current = requestAnimationFrame(tick);
    };

    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, []);
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  h = ((h % 360) + 360) % 360;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60)       { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else              { r = c; b = x; }
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}
