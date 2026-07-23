import { useEffect, useRef, useState } from "react";
import { useDmx } from "@/store/dmx";


/** Pi-style mode-kategorier. Håll i synk med pi-dmx/engine/public/index.html. */
export const CALM_MODES: [string, string, string][] = [
  ["cycle",   "Cykel",   "Alla lampor andas i takt medan färgen sakta vandrar runt."],
  ["breathe", "Andas",   "Hela riggen andas som en – djup mjuk våg i en färg."],
  ["tide",    "Tidvatten","En långsam våg sköljer fram och tillbaka i par."],
  ["mono",    "Eld",     "Varm brasa som flimrar levande, glider rött → gult."],
  ["aurora",  "Aurora",  "Varje lampa driver i sin egen färg, som norrsken."],
  ["drift",   "Drift",   "Nästan stilla glöd som mycket sakta byter färg."],
];
export const FAST_MODES: [string, string, string][] = [
  ["wave",   "Våg",    "Flödande färgvåg som rullar över hela riggen."],
  ["chase",  "Jakt",   "En ljuspunkt springer i takt och byter färg."],
  ["drops",  "Drops",  "Varje slag målar nästa lampa i en ny färg."],
  ["sweep",  "Svep",   "En smal spotlight glider över en mörk rigg."],
  ["pulse",  "Puls",   "Hela riggen i en färg som pulsar på beatet."],
];
export const FULL_MODES: [string, string, string][] = [
  ["party",  "Party",  "Färgkaos som pumpar hårt på varje taktslag."],
  ["snap",   "Snap",   "Alla lampor byter färg blixtsnabbt på varje slag."],
  ["bounce", "Studs",  "En skarp ljuspunkt studsar fram och tillbaka."],
  ["strobe", "Strobe", "Snabb strobe-blixt med skiftande färg."],
  ["rave",   "Rave",   "Varannan lampa blinkar i motfärger – hård växling."],
];
const ALL = [...CALM_MODES, ...FAST_MODES, ...FULL_MODES];

const LS_KEY = "pi-mock-v1";

export type Dwell = "slow" | "normal" | "fast";
export type AudioIn = "aux" | "mic";
export type Scene = "chill" | "party" | "wild";

/** Scen-presets — sätter ALLA relevanta ljud/ljus-parametrar i ett svep.
 *  Motorn äger stämningarna (setMood); här speglar vi känslan i mock-UI. */
export const SCENES: {
  id: Scene; label: string; hint: string; icon: string;
  modes: string[];
  dwell: Dwell;
  dynamics: 0.35 | 0.6 | 0.85;
  pulse: boolean;
  energyDrivesMode: boolean;
  agcAgg: 0.15 | 0.85;
  master: 0.5 | 0.75 | 1;
}[] = [
  { id: "chill", label: "Chill", hint: "Mjukt & lugnt", icon: "◐",
    modes: CALM_MODES.map(([m]) => m),
    dwell: "slow", dynamics: 0.35, pulse: false,
    energyDrivesMode: false, agcAgg: 0.15, master: 0.75 },
  { id: "party", label: "Fest", hint: "Följer takten", icon: "◈",
    modes: [...CALM_MODES.slice(3).map(([m]) => m), ...FAST_MODES.map(([m]) => m)],
    dwell: "normal", dynamics: 0.6, pulse: true,
    energyDrivesMode: true, agcAgg: 0.15, master: 1 },
  { id: "wild",  label: "Galet", hint: "Full fart", icon: "◆",
    modes: [...FAST_MODES.slice(2).map(([m]) => m), ...FULL_MODES.map(([m]) => m)],
    dwell: "fast", dynamics: 0.85, pulse: true,
    energyDrivesMode: true, agcAgg: 0.85, master: 1 },
];

export interface PiSettings {
  power: boolean;         // stort AV/PÅ högst upp
  /** Stämnings-vred 0..1 (Chill → Galet). Mappas 1..10 i UI. */
  intensity: number;
  scene: Scene | null;    // härledd bucket (chill/party/wild) från intensity — för visning/legacy
  rotation: Record<string, boolean>;
  energyDrivesMode: boolean;
  beatPulse: boolean;
  dwell: Dwell;
  agcAgg: number;
  dynamics: number;
  master: number;
  audioInput: AudioIn;
  /** LED-ring runt vredet: max-ljusstyrka, pulse-boost och blackout-fade. Speglar
   *  cfg.intensityRing på Pi:n; skickas som setRing-meddelande över WS. */
  ring: { maxBright: number; pulseBoost: number; blackoutFadeMs: number };
}

const defaults: PiSettings = {
  power: true,
  intensity: 0.5,
  scene: "party",
  rotation: Object.fromEntries(ALL.map(([m]) => [m, true])),
  energyDrivesMode: true,
  beatPulse: true,
  dwell: "normal",
  agcAgg: 0.15,
  dynamics: 0.6,
  master: 1,
  audioInput: "aux",
  ring: { maxBright: 0.40, pulseBoost: 0.18, blackoutFadeMs: 400 },
};

/** Härled bucket från intensity 0..1: 0..0.33 chill, 0.34..0.66 party, 0.67..1 wild. */
function bucketFromIntensity(x: number): Scene {
  return x < 0.34 ? "chill" : x < 0.67 ? "party" : "wild";
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Kontinuerlig stämning: interpolerar dynamics/master/agc mjukt mellan
 * chill (0) → fest (0.5) → galet (1). Rotation-pool, dwell, puls och
 * energiläge snäpper vid bucket-gränserna för att matcha motorns FEEL/POOL.
 */
export function applyIntensity(x: number) {
  const clamped = Math.max(0, Math.min(1, x));
  const c = SCENES[0], p = SCENES[1], w = SCENES[2];
  let dynamics: number, master: number, agc: number;
  if (clamped <= 0.5) {
    const t = clamped / 0.5;
    dynamics = lerp(c.dynamics, p.dynamics, t);
    master   = lerp(c.master,   p.master,   t);
    agc      = lerp(c.agcAgg,   p.agcAgg,   t);
  } else {
    const t = (clamped - 0.5) / 0.5;
    dynamics = lerp(p.dynamics, w.dynamics, t);
    master   = lerp(p.master,   w.master,   t);
    agc      = lerp(p.agcAgg,   w.agcAgg,   t);
  }
  const bucket = bucketFromIntensity(clamped);
  const sc = SCENES.find((s) => s.id === bucket)!;
  const rotation = Object.fromEntries(ALL.map(([m]) => [m, sc.modes.includes(m)]));
  setPi({
    intensity: clamped,
    scene: bucket,
    rotation,
    dwell: sc.dwell,
    dynamics,
    beatPulse: sc.pulse,
    energyDrivesMode: sc.energyDrivesMode,
    agcAgg: agc,
    master,
  });
}

/** Legacy: byt till en av de tre bucket-ankarna. */
export function applyScene(id: Scene) {
  applyIntensity(id === "chill" ? 0 : id === "party" ? 0.5 : 1);
}

function load(): PiSettings {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return defaults;
    const p = JSON.parse(raw) as Partial<PiSettings>;
    return {
      ...defaults, ...p,
      rotation: { ...defaults.rotation, ...(p.rotation ?? {}) },
      ring: { ...defaults.ring, ...(p.ring ?? {}) },
    };
  } catch { return defaults; }
}

/** Global mock-state — små hooks som pratar med samma singleton så alla kort ser samma värden. */
let state: PiSettings = load();
const listeners = new Set<() => void>();
function emit() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
  listeners.forEach((l) => l());
}
export function setPi(patch: Partial<PiSettings>) { state = { ...state, ...patch }; emit(); }
export function setRotation(mode: string, on: boolean) {
  state = { ...state, rotation: { ...state.rotation, [mode]: on } }; emit();
}
export function usePi(): PiSettings {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  return state;
}

/**
 * Aktiv mode.
 * - Om `energyDrivesMode` = ON: byter på **låtens partier** (vers/refräng/drop/breakdown)
 *   genom att jämföra kort (~1 s) och lång (~8 s) EMA av audioLevel.
 *   Nya effekten väljs från rätt energi-bucket (Calm/Fast/Full) — begränsad
 *   till effekter som är aktiverade i rotation. Cooldown 6 s + max-dwell fallback.
 * - Om OFF: gamla beteendet — timer via `dwell`.
 */
export function usePlayingMode(): string {
  const s = usePi();
  const [mode, setMode] = useState<string>(() => firstEnabled(s.rotation));

  // Energi-driven växling — allt state i EN ref för stabil hook-ordning över HMR.
  const r = useRef({ shortEma: 0, longEma: 0, lastSwitchT: 0, inHigh: false, inLow: false });

  useEffect(() => {
    const dwellMs = s.dwell === "fast" ? 4500 : s.dwell === "slow" ? 15000 : 9000;
    const maxDwellMs = dwellMs * 2.5; // säkerhetsnät om inget parti-byte hänt
    const id = setInterval(() => {
      const enabled = ALL.map(([m]) => m).filter((m) => s.rotation[m] !== false);
      if (!enabled.length) return;

      // Timer-läge (klassiskt)
      if (!s.energyDrivesMode) {
        setMode((cur) => {
          const idx = enabled.indexOf(cur);
          return enabled[(idx + 1) % enabled.length];
        });
        return;
      }

      // Energi-läge
      const st = r.current;
      const now = performance.now();
      const audio = useDmx.getState().audioLevel;
      // EMA-alphor kalibrerade för 250ms tick (α = 1 - exp(-dt/τ))
      st.shortEma += (audio - st.shortEma) * 0.22;   // τ ≈ 1 s
      st.longEma  += (audio - st.longEma)  * 0.031;  // τ ≈ 8 s
      const ratio = st.shortEma / Math.max(0.04, st.longEma);

      const sinceLast = now - st.lastSwitchT;
      const cooldownOk = sinceLast > 6000;

      // Kant-detektor: gå in i HIGH när ratio > 1.35, ur när < 1.1. Samma för LOW.
      const risingEdge  = ratio > 1.35 && !st.inHigh;
      const fallingEdge = ratio < 0.72 && !st.inLow;
      if (ratio > 1.35) st.inHigh = true;
      if (ratio < 1.1)  st.inHigh = false;
      if (ratio < 0.72) st.inLow  = true;
      if (ratio > 0.9)  st.inLow  = false;

      const timeoutHit = sinceLast > maxDwellMs;
      if (!cooldownOk && !timeoutHit) return;
      if (!risingEdge && !fallingEdge && !timeoutHit) return;

      // Välj bucket: HIGH → Full, LOW → Calm, annars → Fast/mellan
      const long = st.longEma;
      let bucket: [string, string, string][];
      if (risingEdge)      bucket = long > 0.5 ? FULL_MODES : FAST_MODES;
      else if (fallingEdge) bucket = CALM_MODES;
      else                  bucket = long < 0.3 ? CALM_MODES : long > 0.6 ? FULL_MODES : FAST_MODES;

      // Filtrera på aktiverade + undvik samma effekt
      let pool = bucket.map(([m]) => m).filter((m) => s.rotation[m] !== false && m !== mode);
      if (!pool.length) pool = enabled.filter((m) => m !== mode);
      if (!pool.length) return;

      const next = pool[Math.floor(Math.random() * pool.length)];
      st.lastSwitchT = now;
      setMode(next);
    }, 250);
    return () => clearInterval(id);
  }, [s.dwell, s.rotation, s.energyDrivesMode, mode]);

  // Om aktuell mode blev bortkryssad, hoppa framåt.
  useEffect(() => {
    if (s.rotation[mode] === false) setMode(firstEnabled(s.rotation));
  }, [s.rotation, mode]);
  return mode;
}


function firstEnabled(r: Record<string, boolean>): string {
  const m = ALL.find(([m]) => r[m] !== false);
  return m ? m[0] : "cycle";
}
