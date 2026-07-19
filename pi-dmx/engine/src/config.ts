/**
 * Runtime config. Kept as a single object so the mobile UI can mutate it
 * over WebSocket and we can persist to /var/lib/audio-dmx-engine/config.json.
 */

export type Mode = "smart" | "drops" | "party" | "chase" | "wave" | "breathe" | "snap" | "bounce" | "mono" | "aurora" | "pulse" | "strobe" | "rave" | "eq" | "gallop" | "twin" | "ripple" | "gravity" | "drumkit" | "split" | "subbreath" | "duel" | "airglow" | "tide" | "drift" | "pendel" | "viska" | "backbeat" | "tick" | "stege" | "eko" | "hjarta" | "blackout";

/** Hyresgäst-stämning: ETT val ställer in hela riggens känsla (se moods.ts). */
export type MoodId = "chill" | "fest" | "galet";

/**
 * A fixture is placed at `address` and occupies channels in a defined role
 * order. Preset "rgb"/"rgbw"/"dimmer" expand to standard layouts; "custom"
 * takes an explicit `roles` array (e.g. ["dim","r","g","b","strobe"]) so
 * odd fixtures can be mapped without code changes.
 */
export type ChannelRole = "r" | "g" | "b" | "w" | "dim" | "strobe" | "unused";
export type FixturePreset = "rgb" | "rgbw" | "dimmer" | "custom";

export interface FixtureConfig {
  /** Human name shown in the mobile UI */
  name: string;
  /** DMX start address 1..512 */
  address: number;
  /** Preset or "custom" (in which case `roles` is used) */
  preset: FixturePreset;
  /** Only used when preset === "custom" */
  roles?: ChannelRole[];
  /** Spectrum bands driving this lamp in auto/party/mono (strongest wins).
   *  Empty/unset = auto by list order. */
  bands?: ("bass" | "mid" | "treble" | "kick" | "low")[];
  /** Per-lampa ljus-kalibrering (DMX 0..255) på de ljusbärande kanalerna.
   *  on  = TÄNDTRÖSKEL: minsta tända värde lyfts till on (LED:ns tändpunkt) →
   *        dim-toningar syns jämnt, ingen kanal i dödzonen. off (svartpunkt) legacy.
   *  onR/onG/onB/onW = valfria PER-FÄRG-trösklar (R/G/B tänder vid olika DMX). En
   *        kanal använder sin egen tröskel om satt, annars gemensamma `on`. */
  cal?: { off: number; on: number; onR?: number; onG?: number; onB?: number; onW?: number };
}

export interface EngineConfig {
  audio: {
    device: string;       // "hw:0,0" — Codec Zero (line-in via 3.5mm AUX)
    rate: number;         // 48000
    channels: 1 | 2;      // 2 for stereo line-in (summed to mono internally)
  };
  fft: {
    size: 512;            // ~5 ms latency @ 48k, decent bass resolution
    hop: number;          // sliding-window hop; 480 = 100 Hz analys @ 48k
  };
  detection: {
    autoGainTarget: number;   // 0..1, aim for this level (loud)
    tauUp: number;            // seconds to raise gain (quieter)
    tauDown: number;          // seconds to lower gain (louder)
    noiseFloor: number;       // below this = silence, no gain drift
  };
  fixtures: FixtureConfig[];
  mode: Mode;
  /** Senast valda hyresgäst-stämning (chill/fest/galet) — för att UI:t ska kunna
   *  markera rätt knapp. Sätts av setMood; en manuell effekt-ändring gör den inaktuell. */
  activeMood?: MoodId;
  /** Which codec input feeds the show: line on the P1 AUX header or the mic path. */
  audioInput: "aux" | "mic";
  sensitivity: number;    // 0..1 user knob
  /** 0..1 kontrast: 0 = jämnt ljus, 1 = dovt i tystnad + smäll i beats. */
  dynamics: number;
  /** Output-ballistikens decay (s) för lugna/fart-effekter — högre = ljuset tonar
   *  långsammare = "långsam reaktion". Sätts per stämning (moods.ts); default 0.42. */
  calmDecay: number;
  /** Pulsa hela riggen på taktslag. */
  beatPulse: boolean;
  /** Hur aggressivt beat-PLL:en knuffar takt-ankaret mot faktiska trumslag
   *  (0 = av/fri-rullande, ~0.10 mjuk, 0.18 normal, ~0.30 aggressiv). */
  beatSyncStrength: number;
  /** Energi (lokal) väljer läge i smart-läget. */
  energyDrivesMode: boolean;
  /** Hur ofta smart byter läge (ms). */
  smartDwellMs: number;
  master: number;         // 0..1 master brightness
  /** "chase" sub-pattern: sweep (L→R loop) or ping-pong (bounce). */
  chaseStyle: "sweep" | "pingpong";
  /** Which modes are included in the physical button / WS cycle. */
  rotation: Partial<Record<Mode, boolean>>;
  /** Physical push-button that cycles through modes. Set null to disable. */
  modeButton: { chip: string; line: number } | null;
  /** Transient identify override — not persisted. index = fixture being lit. */
  identify?: { index: number } | null;
  /** Transient kalibrerings-test — not persisted. Tvingar fixture[index] till ett
   *  rått DMX-värde (0..255) på ljuskanalerna, bypassar show/VU/cal → hitta exakt
   *  tänd/släck-punkt. index<0 = av. channel = vilken färg testet driver ("all"
   *  = alla lika, annars bara r/g/b/w → kalibrera per färg). */
  calTest?: { index: number; value: number; channel?: "all" | "r" | "g" | "b" | "w" } | null;
  /** Transient beat clock (BPM + wall-clock anchor) — not persisted. */
  beat?: { anchorMs: number; bpm: number } | null;
  /** Transient PLL-fasfel (-0.25..0.25 av en takt), utjämnat — för UI:ts beat-synk-
   *  indikator (ser hur mycket fasen justeras). Ej persisterad. */
  beatErr?: number;
  /** Upper DMX refresh cap (Hz). Actual rate = min(dmxMaxHz, wire-limit). */
  dmxMaxHz: number;
  /** Rökmaskin (1 DMX-kanal). Blast på drop, med duty-cycle-skydd. */
  fog?: {
    enabled: boolean;      // maskinen inkopplad/aktiv
    address: number;       // DMX-adress 1..512
    onDrop: boolean;       // auto-blast på drop
    burstMs: number;       // max längd per blast
    cooldownMs: number;    // min tid mellan blast (MUSIKALISK gles­het — inte skyddet)
    level: number;         // DMX-värde (0..255) när den rökar
    /** Uppvärmningstid från kall maskin (ms). LSM1500PRO ≈ 10 min. Motorn kan
     *  inte MÄTA värmen — den räknar från att maskinen slogs på, och visar en
     *  nedräkning. Utan den trycker en gäst på "rök nu", inget händer, och de
     *  tror att maskinen är trasig. Blockerar INTE puffar: efter en motor-
     *  omstart kan maskinen redan vara varm, och då vore 10 min väntan en lögn. */
    warmupMs?: number;
    /** Wall-clock då maskinen slogs PÅ — uppvärmningen räknas härifrån.
     *  PERSISTERAD med flit: annars startar nedräkningen om vid varje motor-
     *  omstart och påstår "10 min kvar" om en maskin som stått varm i en timme. */
    warmStartMs?: number;
    /** Ackumulerad röktid sedan senaste service (ms) — vätskeåtgång + värmearbete. */
    sprayMs?: number;
    /** Antal puffar sedan senaste service. */
    bursts?: number;
    /** Wall-clock då räknarna nollställdes (för "X sedan senaste underhåll"). */
    serviceAtMs?: number;
  };
  /** Transient one-shot: sätt true för en manuell rök-puff — inte persisterad. */
  fogTrigger?: boolean;
  /** REGI: dramaturgisk tystnad — kort kolsvart just före drop-explosionen. */
  dropBlackout: boolean;
  /** REGI: sceniskt djup — mittlamporna hålls som fasta uplights i höga lägen. */
  scenicAnchor: boolean;
  /** REGI: dynamiskt ljustak (VU) — max-styrka följer sektionsenergin; drop bypassar. */
  energyCeiling: boolean;
  /** REGI: klubb-läge — kvadrerar VU-taket (hård kontrast: mörkt mellan, explosion på topp). */
  clubMode: boolean;
  /** REGI: varm vilo-glöd i tystnad — dim bärnsten när ingen musik spelar (annars helt mörkt). */
  ambientGlow: boolean;
  /** REGI: riser-strobe — under en uppbyggnad accelererar en strobe + färgen
   *  kollapsar mot vitt, sen blackout på dropen (klassisk EDM-build). */
  riserStrobe: boolean;
  /** REGI: drop-headroom — kapa normal ljusstyrka till ~95%, men låt DROPS gå
   *  ända till 100% → drops poppar, och konstant full blast dämpas. */
  dropHeadroom: boolean;
}

export const defaultConfig: EngineConfig = {
  audio: { device: "hw:0,0", rate: 48000, channels: 2 },
  fft: { size: 512, hop: 128 },
  detection: {
    autoGainTarget: 0.5,
    tauUp: 90,
    tauDown: 30,
    noiseFloor: 0.003,
  },
  fixtures: [
    { name: "Par 1", address: 1,  preset: "rgb" },
    { name: "Par 2", address: 4,  preset: "rgb" },
    { name: "Par 3", address: 7,  preset: "rgb" },
    { name: "Par 4", address: 10, preset: "rgb" },
  ],
  mode: "smart",
  audioInput: "aux",
  sensitivity: 0.6,
  dynamics: 0.6,
  calmDecay: 0.42,
  beatPulse: true,
  beatSyncStrength: 0.18,   // normal PLL-korrektion mot trumslag
  energyDrivesMode: true,
  smartDwellMs: 15000,
  master: 1.0,
  chaseStyle: "pingpong",
  rotation: { breathe: true, mono: false, aurora: true, wave: true, chase: true, drops: true, pulse: true, party: true, snap: true, bounce: true, strobe: true, rave: true },
  modeButton: { chip: "gpiochip0", line: 27 },   // GPIO27 = Codec Zero onboard button (SW1)
  dmxMaxHz: 100, // 100 Hz för tightare bas/drop-synk; helper cappar till wire-limit
  // Rok-defaults satta for Ibiza LSM1500PRO + Cameo XTRA HEAVY: maskinen ger
  // 250 m3/min och vatskan ar den tataste sorten (extremt lang svavtid, gjord
  // for UTOMHUS). I ett slutet rum fyller en 2.5s-puff for mycket och den langa
  // svavtiden gor att man inte kan angra sig. Maskinen orkar dessutom bara
  // 40-50s i strack innan varmeblocket maste hamta igen, sa 1s/60s ar ~1.6%
  // arbetscykel - den hinner alltid vara varm. Oka vid behov, inte tvartom.
  fog: { enabled: false, address: 13, onDrop: true, burstMs: 1000, cooldownMs: 60000, level: 255, warmupMs: 600000, sprayMs: 0, bursts: 0 },
  dropBlackout: true,     // dramaturgisk tystnad — låg risk, lyfter varje drop
  scenicAnchor: false,    // ägar-val: antar lampor i rad vänster→höger
  energyCeiling: true,    // direkt VU = ljusstyrka; standard på (drop/punch bypassar)
  clubMode: false,        // hård kontrast (VU²); opt-in — rör inte det trogna linjära läget
  ambientGlow: false,     // tystnad = HELT mörkt som standard; slå på för varm vilo-glöd
  riserStrobe: false,     // ägar-val: accelererande strobe + vit-kollaps under risers
  dropHeadroom: false,    // ägar-val: normal ≤95%, drops → 100% (huvudrum för pop)
};

export const PRESET_ROLES: Record<Exclude<FixturePreset, "custom">, ChannelRole[]> = {
  rgb:    ["r", "g", "b"],
  rgbw:   ["r", "g", "b", "w"],
  dimmer: ["dim"],
};

export function fixtureRoles(fx: FixtureConfig): ChannelRole[] {
  if (fx.preset === "custom") return fx.roles ?? [];
  return PRESET_ROLES[fx.preset];
}

/**
 * Highest DMX channel used by any fixture, or 0 if there are none.
 * The C sidecar accepts frames from 24 to 512 slots — the fewer we send,
 * the faster each frame gets on the wire (fewer bytes @ 44 µs each).
 */
export function activeSlots(fixtures: FixtureConfig[]): number {
  let max = 0;
  for (const fx of fixtures) {
    const w = fixtureRoles(fx).length;
    const top = fx.address + w - 1;
    if (top > max) max = top;
  }
  // Clamp to spec-min 24, spec-max 512
  if (max < 24) max = 24;
  if (max > 512) max = 512;
  return max;
}
