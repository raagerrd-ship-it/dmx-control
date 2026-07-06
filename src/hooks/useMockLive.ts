import { useEffect, useRef } from "react";
import { channelsFor, presetById, useDmx } from "@/store/dmx";
import { smoothStep, softnessToAlpha } from "@/lib/audioCurve";
import { useMic } from "@/hooks/useMic";

/**
 * Mock live-loop: simulerar mic-nivå + kick och genererar DMX-frame
 * utifrån vald preset. Ersätts av WebSocket när Pi-tjänsten är på plats.
 *
 * Portat från Lotus Lantern piEngine.ts:
 *  - Spectral-flux onset (median * 1.8 + 0.008, refractory 150 ms)
 *  - Drop-detektor → vit blixt (dropFlashMs 220 ms)
 *  - Energy-gate (tickEnergyFloor) → brightnessFloor istället för flimmer
 *  - Dynamics-expansion runt en glidande centernivå
 *
 * Mjukhet (`params.smoothness`) styr release-alpha via samma exponentialkurva
 * som Lotus (`softnessToAlpha`). Attack = 1.0 (omedelbar rise).
 */

// --- Konstanter portade från Lotus DEFAULT_CAL ---
const ONSET_THRESHOLD = 1.8;
const ONSET_ABS_FLOOR = 0.008;
const ONSET_REFRACTORY_MS = 150;
const ONSET_ENERGY_FLOOR = 0.05;
const TICK_ENERGY_FLOOR = 0.05;
const BRIGHTNESS_FLOOR = 0.04;         // ~5/255, håller lampan svagt tänd i tystnad
const DROP_MULT = 1.5;                 // sustained > mean*1.5 → drop
const DROP_FLASH_MS = 220;
const DYNAMIC_DAMPING = 0.8;
const CENTER_ALPHA = 0.002;            // per tick, glidande centernivå

export function useMockLive() {
  const micEnabled = useDmx((s) => s.micEnabled);
  const setMicError = useDmx((s) => s.setMicError);
  const mic = useMic(micEnabled, setMicError);

  const raf = useRef<number | null>(null);
  const start = useRef(performance.now());
  const smoothedAudio = useRef(0);
  const smoothedKick = useRef(0);
  const huePhase = useRef(0);
  const lastT = useRef(performance.now() / 1000);

  // onset/drop-state
  const prevEnergy = useRef(0);
  const fluxMedian = useRef(0.01);
  const lastOnsetT = useRef(-1);
  const dynamicCenter = useRef(0.3);
  const slowEnergyMean = useRef(0.2);
  const dropUntil = useRef(0);

  // fejkad musikkälla: bas-sinus + slumpade "beats" var 0.35–0.6s + drop var 8–14s
  const nextBeat = useRef(0.5);
  const nextDrop = useRef(10);

  useEffect(() => {
    const tick = () => {
      const t = (performance.now() - start.current) / 1000;
      const dt = Math.max(0.001, Math.min(0.1, t - lastT.current));
      lastT.current = t;
      const st = useDmx.getState();
      const { preset, params, fixtures } = st;
      const sens = params.sensitivity / 100;

      const releaseAlpha = softnessToAlpha(params.smoothness);
      const attackAlpha = 1.0;

      // === Ljudkälla: riktig mic (om aktiv) eller syntetisk fejksignal ===
      let rawEnergy: number;
      if (mic.current.active) {
        // Blanda RMS (dynamik) + basviktad spektral-energi (kick-känsla).
        const m = mic.current.level * 0.6 + mic.current.energy * 0.8;
        rawEnergy = Math.min(1, Math.max(0, m * (0.5 + sens)));
      } else {
        const base = 0.25 + 0.15 * Math.sin(t * 1.4);
        let beatSpike = 0;
        if (t >= nextBeat.current) {
          beatSpike = 0.7 + Math.random() * 0.3;
          nextBeat.current = t + 0.35 + Math.random() * 0.25;
        }
        if (t >= nextDrop.current) {
          dropUntil.current = t + 1.5;
          nextDrop.current = t + 8 + Math.random() * 6;
        }
        const dropBoost = t < dropUntil.current ? 0.35 : 0;
        const noise = Math.random() * 0.05;
        rawEnergy = Math.min(1, Math.max(0, (base + beatSpike * 0.6 + dropBoost + noise) * (0.5 + sens)));
      }

      // === Spectral flux → onset ===
      const flux = Math.max(0, rawEnergy - prevEnergy.current);
      prevEnergy.current = rawEnergy;
      // Median-tracker (enkel EMA — approx median vid låg volatilitet)
      fluxMedian.current += (flux - fluxMedian.current) * 0.05;
      const onsetThresh = fluxMedian.current * ONSET_THRESHOLD + ONSET_ABS_FLOOR;
      const refractoryOk = t - lastOnsetT.current > ONSET_REFRACTORY_MS / 1000;
      const gatedEnergy = rawEnergy > ONSET_ENERGY_FLOOR;
      let kickTarget = 0;
      if (flux > onsetThresh && refractoryOk && gatedEnergy) {
        lastOnsetT.current = t;
        kickTarget = 1;
      }
      smoothedKick.current = smoothStep(smoothedKick.current, kickTarget, attackAlpha, releaseAlpha);
      const kick = smoothedKick.current;

      // === Drop-detektor: sustained > slow mean * 1.5 → vit blixt ===
      slowEnergyMean.current += (rawEnergy - slowEnergyMean.current) * 0.008;
      if (rawEnergy > slowEnergyMean.current * DROP_MULT && rawEnergy > 0.4 && t > dropUntil.current + DROP_FLASH_MS / 1000) {
        // dropUntil används redan för source-boost; separata flash-fönstret:
      }
      // Fired-flag-fri variant: härled flash direkt av rawEnergy vs mean.
      const dropActive = rawEnergy > slowEnergyMean.current * DROP_MULT && rawEnergy > 0.5;
      const flashActive = dropActive;

      // === Energy-gate + smoothing på nivå ===
      let audioTarget = rawEnergy;
      if (rawEnergy < TICK_ENERGY_FLOOR) audioTarget = 0;
      smoothedAudio.current = smoothStep(smoothedAudio.current, audioTarget, attackAlpha, releaseAlpha);
      let audio = smoothedAudio.current;

      // === Dynamics-expansion runt glidande center ===
      dynamicCenter.current += (audio - dynamicCenter.current) * CENTER_ALPHA;
      audio = applyDynamics(audio, dynamicCenter.current, DYNAMIC_DAMPING);
      audio = Math.max(0, Math.min(1.2, audio));

      const frame = new Array(512).fill(0);
      const briSlider = params.brightness / 100;
      const briFloor = BRIGHTNESS_FLOOR * briSlider;

      // Hue-fasackumulator, tempo bromsas med smoothness (tick-rate-oberoende).
      const speedFac = 0.2 + (1 - params.smoothness / 100) * 2.5;
      huePhase.current += dt * speedFac;
      const hueBase = huePhase.current;
      const fixtureCount = Math.max(1, fixtures.length);

      fixtures.forEach((f, idx) => {
        let r = 0, g = 0, b = 0, w = 0;

        switch (preset) {
          case "strobe": {
            const on = Math.sin(hueBase * 6) > 0.5 ? 1 : 0;
            r = g = b = on * 255 * briSlider;
            break;
          }
          case "chill": {
            // Aurora-drift: långsam palett som pendlar warm↔teal↔magenta.
            const drift = Math.sin(hueBase * 0.15) * 140;               // 0..±140°
            const hue = 20 + drift + Math.sin(hueBase * 0.4 + idx * 0.9) * 30;
            const sat = 0.7 + Math.sin(hueBase * 0.25 + idx) * 0.2;
            const v = Math.max(briFloor, briSlider * (0.65 + audio * 0.35));
            const c = hsvToRgb(hue, Math.max(0.4, sat), v);
            r = c[0]; g = c[1]; b = c[2];
            break;
          }
          case "party": {
            // Motrörelse: varannan fixture roterar åt motsatt håll → korsande band.
            const dir = idx % 2 === 0 ? 1 : -1;
            const hue = (hueBase * 120 * dir + idx * 137 + kick * 90) % 360;
            const wave = 0.5 + 0.5 * Math.sin(hueBase * 3 + idx * 1.7);  // extra puls
            const v = Math.max(briFloor, briSlider * (0.45 + audio * 0.55) * (0.6 + wave * 0.4));
            const c = hsvToRgb(hue, 1, Math.min(1, v));
            r = c[0]; g = c[1]; b = c[2];
            if (kick > 0.7 || flashActive) { r = g = b = 255 * briSlider; }
            break;
          }
          case "chase": {
            // Komet med lång svans + kort motström. Kicken puttar fram.
            const headPos = (hueBase * 0.7 + kick * 0.5) % 1;
            const tailPos = 1 - headPos;
            const myPos = idx / fixtureCount;
            const wrapDist = (a: number, b: number) => {
              let d = Math.abs(a - b); if (d > 0.5) d = 1 - d; return d;
            };
            const dHead = wrapDist(myPos, headPos);
            const dTail = wrapDist(myPos, tailPos);
            const head = Math.exp(-(dHead * dHead) * 40);   // stor komet
            const tail = Math.exp(-(dTail * dTail) * 90) * 0.4; // liten motström
            const bump = Math.min(1, head + tail);
            const hue = (hueBase * 60 + idx * 30 + (tail > head ? 180 : 0)) % 360;
            const v = Math.max(briFloor, briSlider * (0.12 + bump * (0.65 + audio * 0.4)));
            const c = hsvToRgb(hue, 1, Math.min(1, v));
            r = c[0]; g = c[1]; b = c[2];
            break;
          }
          case "fire": {
            const flicker = 0.75 + Math.random() * 0.25;
            const kickHue = 55 * kick;
            const hue = 5 + Math.sin(hueBase * 1.1 + idx * 1.3) * 15 + kickHue;
            const v = Math.max(briFloor, briSlider * flicker * (0.55 + audio * 0.55));
            const sat = Math.max(0.6, 1 - kick * 0.5);
            const c = hsvToRgb(hue, sat, Math.min(1, v));
            r = c[0]; g = c[1]; b = c[2];
            if (flashActive) { r = 255 * briSlider; g = 200 * briSlider; b = 80 * briSlider; }
            break;
          }
          case "auto":
          default: {
            // Två lager: snabb hue-spin + långsam palett-drift + audio-hue-modulation.
            const paletteDrift = Math.sin(hueBase * 0.12) * 90;
            const audioHue = audio * 40;
            const hue = (hueBase * 45 + idx * 55 + paletteDrift + audioHue) % 360;
            const sat = 0.85 + Math.sin(hueBase * 0.6 + idx * 0.5) * 0.15;
            const v = Math.max(briFloor, briSlider * (0.5 + audio * 0.6));
            const c = hsvToRgb(hue, Math.max(0.6, sat), Math.min(1, v));
            r = c[0]; g = c[1]; b = c[2];
            if (kick > 0.85 || flashActive) { r = g = b = 255 * briSlider; }
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

      st.setLive(Math.min(1, audio), kick, frame);

      const p = presetById(preset);
      document.documentElement.style.setProperty("--accent-h", String(p.hue));

      raf.current = requestAnimationFrame(tick);
    };

    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, []);
}

/** Dynamics-expansion runt center. Portad från Lotus piEngine.applyDynamics. */
function applyDynamics(energyNorm: number, center: number, dynamicDamping: number): number {
  if (dynamicDamping <= 0) return energyNorm < 0 ? 0 : energyNorm;
  const amount = dynamicDamping < 2 ? dynamicDamping * 0.5 : 1;
  const exponent = 1 / (1 + amount * 4);
  const range = energyNorm >= center ? (1 - center) || 0.5 : center || 0.5;
  const normalized = (energyNorm - center) / range;
  const absN = normalized < 0 ? -normalized : normalized;
  const powered = absN > 0.0001 ? Math.exp(exponent * Math.log(absN)) : 0;
  const expanded = normalized < 0 ? -powered : powered;
  const gain = 1 + amount * 0.5;
  let result = center + expanded * range * gain;
  const ceiling = 1 + amount * 0.4;
  if (result > ceiling) result = ceiling + (result - ceiling) * 0.2;
  return result < 0 ? 0 : result;
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
