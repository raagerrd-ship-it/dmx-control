/**
 * Effekt-modulernas kontrakt.
 *
 * Varje effekt är en ren funktion render(c) → [r,g,b] (0..1) för EN lampa,
 * plus metadata (nyckel/etikett/beskrivning/tier). Motorn (EffectEngine)
 * bygger ett EffectContext per frame och anropar effekten per lampa. All
 * regi/drop/riser/VU/ballistik ligger kvar i motorn — effekten ser bara sin
 * lampa och de färdiga signalerna.
 */

import type { EngineConfig, FixtureConfig, Mode } from "../config.js";
import type { Frame } from "../analyser.js";

/** Smart-lägets energitier som effekten hör hemma i. */
export type EffectTier = "lugn" | "fart" | "full";

/** Allt en effekt behöver för att rendera EN lampa. Byggs av motorn per frame;
 *  idx/fx/band muteras per lampa (samma objekt återanvänds → ingen allokering). */
export interface EffectContext {
  cfg: EngineConfig;
  frame: Frame;
  fx?: FixtureConfig;

  /** Fri-rullande show-tid (s), inkl. riser-acceleration + akustisk tröghet. */
  t: number;
  /** Lampans index och totalt antal lampor. */
  idx: number;
  count: number;

  /** Klippt/normaliserad nivå (0..1). */
  audio: number;
  /** Kick-/beat-envelope (0..1). */
  kickEnv: number;
  /** BAS-PUNCH: "goa slaget" — spikar 0..1 på en riktig dunk (bas klart över sin
   *  baslinje), noll annars. Effekten avgör själv hur hårt den ska slå. */
  punch: number;
  /** DROP-envelope (0..1): full under drop-fönstret, mjuk fade ut. Effekten kan
   *  förstärka på drop; motorn lyfter INTE längre uniformt. */
  dropEnv: number;
  /** Lampans frekvensband (bas/mellan/diskant/kick/low) 0..1. */
  band: number;

  /** Gravitations-VU: nivå som ljudet knuffar upp och som faller med gravitation
   *  (0..1), + peak-håll som sjunker långsamt. Motorn räknar fysiken. */
  gravLevel: number;
  gravPeak: number;

  /** Trum-kit onset-envelopes (0..1) per röst: snabb attack på anslaget, snabb
   *  decay → varje "trumma" punchar och slocknar. kick=sub-transient, snare=mellan-
   *  onset, hat=diskant-onset, bass=sustained lågfrekvens. Motorn räknar dem. */
  drum: { kick: number; snare: number; hat: number; bass: number };

  /** Taktindex + fas (0..1) från BPM-klockan; beatPulse = mjuk puls-envelope. */
  beatIdx: number;
  beatFrac: number;
  beatPulse: number;
  /** DISKRET flank: true exakt den frame takten går fram (grid-slag när BPM är
   *  låst, annars den verkliga kicken). En frame lång → bra för hårda kap/gnistor
   *  och färgbyte, INTE för mjuka accenter (ballistiken dämpar en 1-frames-spik →
   *  använd beatPulse/kickEnv för det). Fungerar även utan BPM-lås. */
  beatHit: boolean;
  hasBeat: boolean;

  /** Integrerad vågfas (wave/sweep). */
  wavePhase: number;
  /** Riser-uppbyggnad 0..1 och den fasförskjutning den ger. */
  buildUp: number;
  phaseSpread: number;
  /** Tempo-anpassat pulsgolv (djupt vid långsamt tempo). */
  punchFloor: number;
  /** Chase-huvudets lampindex. */
  chasePos: number;

  /** drops-läget: per-lampa tändtid (performance.now-skala) + färgton. */
  dropFired: number[];
  dropHue: number[];
  /** performance.now() för denna frame (drops-decay). */
  now: number;

  /** Gyllene-snitt-färg i aktiv palett (0–5). */
  mixedSector: (n: number) => number;
  /** Musik-klocka: stega på taktslag när takt finns, annars på tid. */
  mclk: (beatsPerStep: number, secPerStep: number) => number;
  /** HSV→RGB (sektor-snäppt för rena PAR-färger). */
  hsv: (h: number, s: number, v: number) => [number, number, number];
  /** Dynamik-formad kurva (golv + gamma på den ljud-drivna delen). */
  shaped: (floor: number, x: number) => number;
}

/** En effekt: logik + metadata, allt på ett ställe. */
export interface EffectDef {
  /** Läges-nyckel (matchar Mode-unionen i config.ts). */
  key: Mode;
  /** UI-etikett. */
  label: string;
  /** UI-beskrivning (en mening). */
  desc: string;
  /** Smart-lägets energitier. */
  tier: EffectTier;
  /** Rendera EN lampa → [r,g,b] i 0..1. */
  render: (c: EffectContext) => [number, number, number];
}
