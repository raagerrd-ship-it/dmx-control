/** UPPBYGGNADEN (utbruten ur analyser.ts 2026-11-14). Riser = spektral nyhet över baskroppen eller stigande klang och nivå; buildUp = dess envelope 0..1. Gränserna är relativa mot låtens eget tak och bandens egna toppar. Läser banden, nivån och senaste drop ur analysatorn (this.a). */
import { type Analyser, BODY_CEIL_DB_S } from "./analyser.js";

// RISERNS FÖNSTER: bandets nivå räknas 0..1 över så här många dB under bandets egen topp (förr absolut -70..-10 dB, samma spann).
const RISER_SPAN_DB = 60;
// RISERN LYSSNAR OVANFÖR BASKROPPEN (band 3-7, >= 250 Hz; kroppen = band 0-2 är drop-detektorns signal). Med alla åtta band blev
// basens ÅTERKOMST den största "nyheten": mätt (övningen, m1) låg 13 av 16 uppbyggnadsepisoder 0-4 s EFTER ett lyft, alltså efter
// droppen. Ett svep eller en virvelrulle stiger ovanför basen; basens återkomst är droppen själv. (I det absoluta fönstret var
// basbanden mättade och bidrog aldrig - så här var novelty-talen 0,15 / 0,45 en gång satta.)
const RISER_BAND0 = 3;
/** Talfält som ska vara flyttal från start (se stabiliseringen i analyser.ts). */
const DOUBLE_FROM_START = ['novSlow'] as const;

export class RiserDetector {
  /** analysatorn som äger den här delen (delade signaler läses via den) */
  a: Analyser;
  constructor(a: Analyser) {
    this.a = a;
    for (const k of DOUBLE_FROM_START) { const v = (this as unknown as Record<string, number>)[k]; if (typeof v === 'number') { (this as unknown as Record<string, number>)[k] = 0.5; (this as unknown as Record<string, number>)[k] = v; } }
  }
  aSpecSlow = 0;aNovSlow = 0;                                 // RISER/UPPBYGGNAD (flyttad från effects)
  /**
   * OBEHANDLAD LOGBANDNIVÅ — riserdetektorns egen ingång.
   *
   * `bandLvl` går genom per-band-AGC:n, och den har NOLL attacktid: så fort
   * `avg > bandPeak` sätts taket till `avg`, och kvoten blir avg/avg ≈ 1. En
   * STIGANDE bandnivå är därmed per konstruktion konstant 1,0 — och en riser ÄR
   * definitionsmässigt en monoton stigning i flera band samtidigt. Alla band
   * pinnar på 1, tvåsekundersmedelvärdet hinner ikapp, och novelty går mot noll.
   *   DET är förklaringen till den uppmätta `buildUp` p50 = p90 = 0.00. Signalen
   *   var inte feljusterad, den var BORTKALIBRERAD av sin egen normalisering.
   * `bandLvl` lämnas orörd — hela effektlagret är kalibrerat mot den. Riser och
   * novelty läser i stället rå dB (`bandDbRaw`), där en ramp är en ramp oavsett nivå.
   * RELATIVT FÖNSTER (drop1 a6, 2026-11-13): förr låg dB-talet i ett ABSOLUT fönster (-70..-10 dB -> 0..1). Ladans rena ljud
   * ligger över -10 dB i sex av åtta band (mätt: mättat i 88-100 % av tiden) -> novelty var noll och risern död. Fönstret hänger
   * nu under BANDETS EGEN TOPP (`bandTop`, sjunker som bodyCeil): 1 = vid toppen, 0 = RISER_SPAN_DB under den. Se riserStep.
   */
  private bandTop = new Float32Array(8).fill(-140);
  private specSlow = new Float32Array(8);
  private novSlow = 0;           // ihållande spektral novelty (~1.5s)
  private novBaseline = 0.2;     // ~8s baslinje → riser = novelty STIGER över den
  private centSlow = 0.3;
  private lvlSlowR = 0.3;

  /** Uppbyggnad/riser (spektral novelty + klang/niva). Returnerar inRiser och uppdaterar buildUp. */
  riserStep(): boolean {
    const nowWallA = this.a.hNowWall;
    const dtHop = this.a.dtHop;
    // ── UPPBYGGNAD / RISER (flyttad hit) ──
    // Spektral NOVELTY = summan av bandens POSITIVA avvikelse från en ~2s baslinje,
    // ihållande ~1.5s. Mätt validerad: ramsar 0.25→0.78 in i en drop. Relativt en
    // ~8s baslinje → RISER = novelty STIGER över den (filter-sweep/snare-roll),
    // skilt från bara-busy (ihållande → baslinjen kommer ikapp). Gammal väg
    // (klang+nivå stiger) ligger kvar som OR. Inte direkt efter en drop.
    let nov = 0; const sr = this.aSpecSlow;
    // NOVELTY PÅ RÅ dB (`bandDbRaw`), INTE `bandLvl` — se `bandTop`. Med den
    // AGC-normaliserade nivån var det här uttrycket matematiskt tvunget att gå
    // mot noll under exakt de förlopp det skulle upptäcka.
    // Fönstret är RELATIVT bandets egen topp (0..1 över RISER_SPAN_DB under den), inte absoluta dB: oberoende av ingångsnivån.
    // BARA BANDEN OVANFÖR BASKROPPEN (RISER_BAND0..7): se RISER_BAND0.
    for (let b = RISER_BAND0; b < 8; b++) {
      const raw = this.a.bandDbRaw[b], top = this.bandTop[b] = Math.max(raw, this.bandTop[b] - dtHop * BODY_CEIL_DB_S);
      const x = Math.max(0, 1 + (raw - top) * (1 / RISER_SPAN_DB));
      this.specSlow[b] += (x - this.specSlow[b]) * sr; nov += Math.max(0, x - this.specSlow[b]);
    }
    this.novSlow += (nov - this.novSlow) * this.aNovSlow;
    this.novBaseline += (this.novSlow - this.novBaseline) * (dtHop / 8);
    const novRiser = this.novSlow > this.novBaseline + 0.15 && this.novSlow > 0.45;
    this.centSlow += (this.a.centSmooth - this.centSlow) * (dtHop / 2.5);
    this.lvlSlowR += (this.a.lvlSmooth - this.lvlSlowR) * (dtHop / 2.5);
    // NIVÅGRINDARNA ÄR ANDELAR AV LÅTENS EGET TAK (levelCeil), inte absoluta nivåer: 0,3 / 0,4 / +0,04 trimmades när taket låg vid 1
    // (sönderklippt ljud); rent ljud i ladan har taket vid 0,1-0,25 och nådde aldrig dit (inRiser 0 % av tiden). Samma tal, nu x taket.
    const lc = this.a.levelCeil;
    const inRiser = this.a.activeMs > 2500 && this.a.lvlSmooth > 0.3 * lc && nowWallA - this.a.drop.lastDropMs > 1500 && (
        novRiser
        || (this.a.centSmooth > this.centSlow + 0.06 && this.a.lvlSmooth > this.lvlSlowR + 0.04 * lc && this.a.lvlSmooth > 0.4 * lc)
      );
    const bTarget = inRiser ? 1 : 0;
    const bRate = bTarget > this.a.buildUp ? dtHop / 3.5 : dtHop / 1.0;   // bygg ~3.5s, klinga ~1s
    this.a.buildUp += Math.max(-bRate, Math.min(bRate, bTarget - this.a.buildUp));
    return inRiser;
  }
}
