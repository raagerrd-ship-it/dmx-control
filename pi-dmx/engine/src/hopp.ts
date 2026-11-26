/**
 * KOPPLINGEN PER HOPP (kedjan steg 1, 2026-11-27): det motorn gör med varje ljudhopp mellan analysatorn och effekterna.
 * Flyttad ordagrant ur index.ts, så att motorn och verktygen kör SAMMA koppling (verktygen läser <bygget>/hopp.js).
 *   const hopp = new Hopp(analyser, cfg, { softenRange: () => effects.softenRange(), noteTrack: (n) => ... });
 *   per hopp: const frame = hopp.analys(samples); ...motorns eget (diagnostik, inspelare)...; hopp.koppla(frame);
 * Det motorn själv gör vid en låtgräns går in som två anrop: softenRange (dynamikens omkalibrering) och noteTrack (inspelaren).
 */
import { BoundaryDetector } from "./boundaryDetector.js";
import type { Analyser, Frame } from "./analyser.js";
import type { EngineConfig } from "./config.js";

export interface HoppMotor {
  softenRange(): void;               // effekternas mjuka omkalibrering vid en låtgräns
  noteTrack(boundary: number): void; // inspelaren: en ny "låt" (ladan-<n>)
}

export class Hopp {
  // LATGRANS UR LJUDET (2026-09-23): gransdetektorn matas fran analysatorns stora FFT - ingen extra transform.
  readonly bounds = new BoundaryDetector(() => Date.now());
  private lastLiveDrop = 0;        // senast sedda drop-räknare FRÅN analysatorn
  private lastBoundary = 0;        // senast sedda låtgräns-räknare (dynamikens omkalibrering)
  private outDrop = 0;             // drop-räknaren effekterna ser (live eller replay)
  // Argumentobjekt som fylls per hop i stallet for nya literaler (skrapjakten 10-01: 375 Hz). Mottagarna laser dem synkront.
  private readonly boundsArg = { level: 0, bpm: 0, bpmConfidence: 0, silent: true };

  constructor(private readonly analyser: Analyser, private readonly cfg: EngineConfig, private readonly motor: HoppMotor) {
    analyser.setSpectrumSink((mag, binHz) => this.bounds.pushSpectrum(mag, binHz));
  }

  analys(samples: Float32Array): Frame {
    const { analyser, cfg } = this;
    analyser.setSilenceLevel(cfg.silenceLevel);   // släckgränsen live (/setup) - EN tröskel, i analysatorn
    return analyser.process(samples);
  }

  koppla(frame: Frame): void {
    const { analyser, cfg, bounds, boundsArg } = this;
    const liveDrop = frame.dropCount !== this.lastLiveDrop;
    this.lastLiveDrop = frame.dropCount;
    // LATGRANS (se boundaryDetector.ts) -> mjuk omkalibrering av den lopande dynamiken (auto-rangen far krypa in
    // pa nya latens nivaer inom sekunder i stallet for en minut) och latbytes-hint till tempot: medianfonstret
    // (~5 s) och tempogrammet tillhor forra laten. Mjuk hint i st.f. hard nollstallning (brytaren DMX_BOUNDARY_SOFT borttagen 10-11) -
    // falska latgranser pa pop kastade tempolaset 5x/5 min (ladan 2026-09-04).
    boundsArg.silent = frame.silent; boundsArg.level = frame.level; boundsArg.bpm = frame.bpm; boundsArg.bpmConfidence = frame.bpmConfidence;
    bounds.tick(boundsArg);
    // (KARAKTARSSKIFTE och TEMPOVAXLING som lookbyte borttagna 10-12: LÅTMANUS i effects.ts - looken foljer latens sektioner, inte klangen.)
    if (bounds.boundaryCount !== this.lastBoundary) {
      this.lastBoundary = bounds.boundaryCount; this.motor.softenRange(); analyser.hintTrackChange(5000);   // riktig latgrans nollar sektionerna (tempotappet gor det inte langre)
      this.motor.noteTrack(this.lastBoundary);
    }

    if (liveDrop) this.outDrop++;   // realtidsdetektorn ager dropsen (latminnet borta 2026-09-23)

    frame.dropCount = this.outDrop;
    // tillit + taktklocka (beatFeed.ts). TAKTVÄGEN (profilens BEAT_FEED 'slow', 2026-11-08): körs i analysatorns worker - här bara
    // hoppet in och senaste resultatet ut (cfg.beat, tilliten, analysatorns rutnät/kommandon). Odelad analysator: i huvudtråden som förr.
    if (analyser.hopLane) analyser.hopLane.feed(frame, cfg, analyser); else analyser.publishClock(cfg);   // a7r: utan taktväg körde analysatorn klockan själv i process()
  }
}
