/**
 * EFTERBEHANDLING — sista formningen av ljuset innan output.
 *
 * Effekterna har sagt VAD som ska lysa. Den här modulen bestämmer HUR MYCKET, i
 * rätt ordning, och lämnar sedan över till output-tjänsten som vet hur lamporna
 * tar emot det. Ingen av dem behöver veta något om den andra.
 *
 * ORDNINGEN ÄR MÄTT FRAM (2026-08-07) och får inte kastas om:
 *
 *   1. ballistik   mjuk attack + peak-hold decay. Städar effekternas EGET fladder.
 *   2. ljustak     följer ljudnivån. Skalar även ballistikbufferten, annars ligger
 *                  en okapad topp kvar och blixtrar fram när taket släpper.
 *   3. hjärtslag   ALLRA SIST och i egen pass. Låg det före ballistiken smetades
 *                  pulsen ut av utgångens decay (0,42 s mot pulsens egna 121 ms) —
 *                  autokorrelationen på DMX-utgången visade då ingen periodicitet
 *                  vid takten alls. Bufferten lämnas orörd: matas pulsen tillbaka
 *                  in i ballistiken börjar den släpa och tappar anslaget.
 *   4. blackout    stenhård klippning förbi ballistiken.
 *   5. kalibrering tändpunkt + ljus-tak (output-tjänsten).
 *   6. headroom    klämmer normal styrka så drops sticker ut.
 *
 * BÅDE taket och hjärtslaget har DROP-UNDANTAG (`Math.max(..., dropEnv)`) — en drop
 * som landar mellan två slag ska inte dämpas av pulsen.
 */

import type { FixtureConfig } from "./config.js";
import type { FixtureOutput } from "./output.js";

/** Utgångens attack. Kort nog att inte röra hjärtslagets 45 ms-anslag, lång nog att
 *  dämpa effekternas fladder kring 10 Hz. */
const ATTACK_S = 0.09;
/** Minsta mörker under ljuset (DMX-steg över tändpunkten) så hjärtslaget syns även
 *  i lugna effekter. 44 ⇒ en lampa med tändpunkt 16 lyser lägst på 60. */
const PULSE_ROOM = 44;

export interface PostParams {
  dtSec: number;
  /** Ballistikens decay-faktor för denna ruta (räknas av anroparen: effektens karaktär). */
  decay: number;
  /** Ljustak 0..1 — drop-undantaget ska redan vara inbakat av anroparen. */
  ceilMul: number;
  /** Hjärtslag 0..1 — drop-undantaget ska redan vara inbakat av anroparen. */
  pulseMul: number;
  /** Taket appliceras bara när en takkälla finns och ljudet inte är tyst. */
  ceilingActive: boolean;
  /** Pulsen appliceras bara när den är påslagen och ljudet inte är tyst. */
  pulseActive: boolean;
  /** Kolsvart nu: drop-blackout ELLER avstängd ingång (nivån stabilt under gränsen). */
  blackout: boolean;
  master: number;
  fixtures: FixtureConfig[];
  /** >= 0 ⇒ kläm ljusstyrkan mot detta tak i byte (drop-headroom). */
  headroomCap: number;
  nowMs: number;
}

export class PostProcess {
  /** Ballistikens buffert — per kanal, i flyttal så decayn inte kvantiseras bort. */
  private smooth = new Float32Array(512);

  apply(universe: Uint8Array, out: FixtureOutput, p: PostParams): void {
    const maxCh = out.maxCh;

    // 1. BALLISTIK: mjuk attack, oförändrad decay (peak-hold). En 1-frames-spik når
    //    bara en bit och klingar sen. Specialroller (strobe/hazer/…) hoppar över —
    //    en 255 som tonar nedåt skulle få strobe att fara mellan takter.
    const att = 1 - Math.exp(-p.dtSec / ATTACK_S);
    for (let ch = 0; ch < maxCh; ch++) {
      if (out.isDirect(ch)) { this.smooth[ch] = universe[ch]; continue; }
      const held = this.smooth[ch] * p.decay;
      const target = universe[ch];
      const v = target >= held ? held + (target - held) * att : held;
      this.smooth[ch] = v;
      universe[ch] = Math.round(v);
    }

    // 2. LJUSTAK — efter ballistiken, så det följer nivån direkt utan att släpa.
    if (p.ceilingActive && p.ceilMul < 0.999) {
      out.scale(universe, p.ceilMul);
      for (let ch = 0; ch < maxCh; ch++) if (out.isLight(ch)) this.smooth[ch] *= p.ceilMul;
    }

    // 3. HJÄRTSLAG — sist, i egen pass, buffert orörd.
    //    Först ges ljuset utrymme att pulsa i: en lugn effekt kan ligga så nära
    //    tändpunkten att hela slaget klipps bort av kalibreringsgolvet.
    if (p.pulseActive && p.pulseMul < 0.999) {
      out.ensurePulseRoom(universe, p.fixtures, PULSE_ROOM);
      out.scale(universe, p.pulseMul);
    }

    // 4. BLACKOUT — kolsvart nu, och nolla bufferten så explosionen efteråt reser sig
    //    rent från svart utan pop från en kvarhållen nivå.
    if (p.blackout) {
      for (let ch = 0; ch < maxCh; ch++) {
        if (!out.isDirect(ch)) { universe[ch] = 0; this.smooth[ch] = 0; }
      }
    }

    // 5. KALIBRERING + LJUS-TAK (output-tjänsten äger lampkunskapen).
    out.calibrate(universe, p.fixtures, p.master, p.nowMs);

    // 6. DROP-HEADROOM — sist av allt: kläm normal styrka, släpp drops till fullt.
    if (p.headroomCap >= 0) out.cap(universe, p.headroomCap);
  }
}
