/** NIVÅN (utbruten ur analyser.ts 2026-11-14). Förstärkningens envelope (AGC), tystnaden, intensiteten och låtens nivåtak med topp-zonen. Läser hoppets rms ur analysatorn (this.a). */
import { Analyser } from "./analyser.js";
import { F_SIL350, F_SIL10 } from './split.js';


export class LevelTracker {
  /** analysatorn som äger den här delen (delade signaler läses via den) */
  a: Analyser;
  constructor(a: Analyser) {
    this.a = a;
  }
  aIUp = 0;aIDown = 0;  silentMs = -0;   // typstabilt (se lastDropRise)
  /** true = tystnadssläppningen redan gjord för denna tystnad (flanktriggad). */
  private silenceArmed = false;
  private intensityEma = 0.5;    // sektionsenergi: utjämnad nivå
  private intensityFloor = 0.5;  // dess robusta P50-baslinje (låtens snitt)
  private intensitySpread = 0.05;  // glidande medelabsolutavvikelse (EJ median-MAD) → sjalvkalibrerande skala

  inZoneState = false;   // hysteres för topp-zonen

  /** PERCENTIL-AGC: 16 blockmaxima à 128 ms (~2 s historik) av RÅ rms. Envelopen är
   *  näst största blockmaximum ≈ 95:e percentilen — en enstaka transient kan alltså
   *  inte dra ner gainen, men en ihållande het ingång kan.
   *  MÄTT I LOTUS: momentan-nivå som AGC-mål pinnade level ≥0.95 i ~55 % av tiden
   *  med upp till 21 % klipp; uppbyggnader blev osynliga eftersom nivån redan låg i
   *  taket. Percentilen tar bort inbränningen — därför är målet ett TAK för topparna,
   *  aldrig ett medelvärde att sikta på. */
  private static readonly AGC_BLOCKS = 16;
  private static readonly AGC_BLOCK_MS = 128;
  private agcBlocks = new Float32Array(LevelTracker.AGC_BLOCKS);
  private agcBlockIdx = 0;
  private agcBlockMax = 0;
  private agcBlockStartMs = 0;
  private agcBlocksFilled = 0;

  resetAgcBlocks(): void {
    this.agcBlocks.fill(0);
    this.agcBlockIdx = 0; this.agcBlockMax = 0; this.agcBlockStartMs = 0; this.agcBlocksFilled = 0;
  }

  /** Mata in rå rms; returnerar näst största av de senaste 16 blockmaxima (0 = ej varm). */
  private agcEnvelope(rawRms: number, nowMs: number): number {
    if (rawRms > this.agcBlockMax) this.agcBlockMax = rawRms;
    if (this.agcBlockStartMs === 0) this.agcBlockStartMs = nowMs;
    if (nowMs - this.agcBlockStartMs >= LevelTracker.AGC_BLOCK_MS) {
      this.agcBlocks[this.agcBlockIdx] = this.agcBlockMax;
      this.agcBlockIdx = (this.agcBlockIdx + 1) % LevelTracker.AGC_BLOCKS;
      if (this.agcBlocksFilled < LevelTracker.AGC_BLOCKS) this.agcBlocksFilled++;
      this.agcBlockMax = 0;
      this.agcBlockStartMs = nowMs;
    }
    // Näst största över de fyllda blocken (16 tal → linjär skanning är billigast).
    if (this.agcBlocksFilled < 2) return 0;
    let top = 0, second = 0;
    for (let i = 0; i < this.agcBlocksFilled; i++) {
      const v = this.agcBlocks[i];
      if (v > top) { second = top; top = v; }
      else if (v > second) { second = v; }
    }
    return second;
  }

  /** AGC (bara mic): utbruten ur process() 2026-09-27 — anropas nar gainen ar olast och signalen over golvet. */
  agcStep(): void {
    const rms = this.a.hRms, now = this.a.hNow, dt = this.a.hDt;
    const d = this.a.cfg.detection;
      const env = this.agcEnvelope(rms, now);
      if (env > 0) {
        this.a.envelope = env;
        const desired = d.autoGainTarget / Math.max(1e-4, env);
        const gTau = desired > this.a.gain ? d.tauUp * 2 : d.tauDown * 0.25;
        const ga = 1 - Math.exp(-dt / gTau);
        this.a.gain += (desired - this.a.gain) * ga;
        if (this.a.gain < 0.5) this.a.gain = 0.5;
        else if (this.a.gain > 20) this.a.gain = 20;
      }
  }

  /** Tystnadsflanken (350 ms / 10 s). Sallan korda grenar: i egen funktion sa att en forsta korning inte deoptimerar hetslingan. */
  silenceStep(): void {
    const hopMs = this.a.hHopMs;
    if (!this.a.hGated) {
      this.silentMs += hopMs;
      // FLANKTRIGGAT: en gång på 350 ms-flanken (tempot rörs inte: de flesta tystnader är en paus i samma låt).
      // Full släppning först efter 10 s tystnad — då är det en ny låt/nytt set.
      if (this.silentMs > 350 && !this.silenceArmed) {
        this.silenceArmed = true;
        if (this.a.role === 'fast') this.a.flagSlow(F_SIL350);
      } else if (this.silenceArmed && this.silentMs > 10000 && this.a.localBpm !== 0) {
        this.a.localBpm = 0;
        this.a.flagSlow(F_SIL10);
      }
    } else {
      this.silentMs = 0;
      this.silenceArmed = false;
    }
  }

  /** Sektionsenergi 0..1 (aktiv tid, EMA, sjalvkalibrerande golv och spann). Returnerar intensity. */
  intensityStep(): void {
    const dtHop = this.a.dtHop;
    // SEKTIONSENERGI (0..1) — hur energiskt partiet är RELATIVT låtens eget snitt.
    // Ren analys av nivån över tid → hör hemma här, inte i show-orkestreringen.
    // En komprimerad signal ligger jämnt högt, så absolut nivå säger inget; jämför
    // mot en robust baslinje (P50-median, ej EMA-medel som pinnas upp av loud
    // sections). Mitten = snittet, tydligt över = drop/topp, under = breakdown.
    // Attack något snabbare än release så uppbyggnader syns. WARMUP: baslinjen
    // konvergerar snabbt (~3s) de första 8s aktiv musik, sen stabil ~25s.
    // Nollställs vid tystnad → snabb omkalibrering vid låtbyte.
    if (this.a.hGated) this.a.activeMs += dtHop * 1000;
    else this.a.activeMs = 0;
    const iUp = this.aIUp;
    const iDown = this.aIDown;
    this.intensityEma += (this.a.lvlSmooth - this.intensityEma) * (this.a.lvlSmooth > this.intensityEma ? iUp : iDown);
    const iWarm = this.a.activeMs < 8000;
    // REFERENSEN MASTE VARA MYCKET LANGSAMMARE AN DET DEN MATER. Golvet gick
    // forut pa 25s (~0.022/s), men musikens sektioner andrar sig over tiotals
    // sekunder OCH auto-gainen plattar ut nivaskillnaderna — sa golvet hann
    // ikapp EMA:n och gapet oppnade sig aldrig.
    //   MATT: intensity p10=0.50 p50=0.50 p90=0.51 p99=0.63.
    // Tiern kraver <0.34 for lugn och >0.78 for full, sa BADA ytterlagena var
    // oatkomliga: full-tiern (11 effekter) spelades 1 gang av 13 pa en kvart.
    // 150s referens = flera latar, alltsa ett aftonsnitt i stallet for ett
    // glidande just-nu-varde.
    const floorRate = iWarm ? dtHop / 3 : dtHop / 150;
    if (iWarm) this.intensityFloor += (this.intensityEma - this.intensityFloor) * floorRate;   // seed snabbt
    else this.intensityFloor += (this.intensityEma > this.intensityFloor ? 1 : this.intensityEma < this.intensityFloor ? -1 : 0) * floorRate * (this.intensityFloor + 0.05);
    // SJALVKALIBRERANDE SKALA: den fasta namnaren 0.30 var en GISSNING om hur
    // stor dynamiken ar. Mat den i stallet — ett glidande medelavvikelse-matt
    // (MAD) over avvikelsen fran golvet. Da nyttjar intensity hela 0..1 oavsett
    // om baren spelar dynamisk rock eller platt komprimerad house. +-2 MAD
    // spanner hela skalan; minsta 0.015 hindrar att tyst brus blir blaser upp.
    const dev = this.intensityEma - this.intensityFloor;
    this.intensitySpread += (Math.abs(dev) - this.intensitySpread) * (iWarm ? dtHop / 3 : dtHop / 60);
    const scale = Math.max(0.015, this.intensitySpread) * 4;
    const intensity = Math.max(0, Math.min(1, 0.5 + dev / scale));
    this.a.hIntensity = intensity;
  }

  /** NIVÅTAKET OCH TOPP-ZONEN (drop1 a6): låtens eget tak (sjunker 1,5 %/s, ~65 s) och zonen med hysteres (in vid 85 % av taket, ut vid
   *  70 %). Det ABSOLUTA golvet 0,65 är borta: ren musik i ladan når nivå 0,25 som mest, så zonen var falsk 100 % av tiden. EN formel,
   *  körd där nivån finns: snabba sidan i process(), långsamma tråden i drainBig på samma lvlSmooth-följd (riserns
   *  nivågrindar läser taket där). */
  zoneStep(): void {
    this.a.levelCeil = Math.max(this.a.lvlSmooth, this.a.levelCeil - this.a.dtHop * 0.015 * this.a.levelCeil);
    if (this.a.lvlSmooth > this.a.levelCeil * 0.85) this.inZoneState = true;
    else if (this.a.lvlSmooth < this.a.levelCeil * 0.70) this.inZoneState = false;
  }
}
