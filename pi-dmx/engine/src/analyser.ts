/**
 * Audio analyser: sliding FFT window, RMS level with slow auto-gain,
 * kick detection via bass-flux median-prominence gate.
 */

import FFT from "fft.js";
import type { EngineConfig } from "./config.js";

/** Rikt log-spektrum (8 band) från den parallella 2048-FFT:n. Varje band är
 *  per-band AGC-normaliserat (0..1) så alla band nyttjar full range oavsett mix. */
export interface Spectrum {
  sub: number;      // ~20–60 Hz   — sub/808-rumble
  kick: number;     // ~60–120 Hz  — kick-grundton/kropp (nu SKILD från basen)
  bass: number;     // ~120–250 Hz — basgång/basnoter
  lowMid: number;   // ~250–500 Hz — låg kropp, toms, låg röst
  mid: number;      // ~0.5–2 kHz  — röst, snare-kropp, synth
  highMid: number;  // ~2–5 kHz    — närvaro, snare-crack, konsonanter
  treble: number;   // ~5–10 kHz   — hi-hats, cymbaler
  air: number;      // ~10–16 kHz  — luft/glitter
}

export interface Frame {
  level: number;        // 0..1, auto-gained RMS (15ms attack / 400ms release smoothed)
  levelRaw: number;     // 0..1, samma auto-gain men OSMOOTHAT (rå per-hop)
  levelVU: number;      // 0..1, ~130ms symmetriskt smoothat PÅ HOP-TAKT (375Hz) — för VU-taket
                        //  (ser alla hops → mycket mindre brus än att smootha rå på 50Hz)
  energy: number;       // 0..1, bass-band spectral energy (~0–1.5 kHz)
  mid: number;          // 0..1, mid-band spectral energy (~1.5–12 kHz: röst/synth/virvel)
  treble: number;       // 0..1, high-band spectral energy (hats/cymbals/vocals top)
  centroid: number;     // 0..1, spektralt tyngdpunkt: mörk/bastung → 0, ljus/diskant → 1
  flux: number;         // 0..1, bass-band spectral flux
  kick: boolean;        // true on rising edge only
  gain: number;         // current auto-gain factor (debug)
  bpm: number;          // 0 = ej låst; lokal tempo-estimat via autokorrelation
  bpmConfidence: number;// 0..1, hur tydlig vinnande takttoppen är (peak-to-mean)
  intensity: number;    // 0..1 SEKTIONSENERGI relativt låtens eget snitt (0.5 = snittet,
                        //  <0.34 breakdown, >0.78 drop/topp) — driver show-orkestreringen
  /** DROP-DETEKTION. dropCount är MONOTON: den ökar en gång per upptäckt drop, så
   *  en konsument på lägre takt (render 100Hz) kan jämföra mot sitt eget senaste
   *  värde och ALDRIG missa en flank (till skillnad från en enframs-boolean). */
  dropCount: number;    // monoton räknare — +1 per drop
  inZone: boolean;      // nivån är i låtens topp-zon (ihållande tillstånd, hysteres)
  breaking: boolean;    // nivån är i en svacka/break (ihållande tillstånd)
  /** UPPBYGGNAD (riser): 0..1 tension som ramsar upp mot en drop. Mjuk signal →
   *  sampling-säker. Show-REAKTIONERNA (strobe, swell) ligger i effekt-motorn. */
  buildUp: number;
  inRiser: boolean;
  /** KARAKTÄRSPROFIL (~8s glidande) — vad SLAGS musik är detta? Dirigenten väljer
   *  effekt efter passform mot den här, inte bara efter energinivå.
   *    punch  = transienttäthet (fyra-på-golvet/trummigt ↔ svävande)
   *    bass   = låg-endens tyngd (sub+kick+bas mot resten)
   *    bright = klang uppåt (hi-hats/luft mot resten)
   *    beat   = hur tydlig takten är (BPM-konfidens) */
  profile: { punch: number; bass: number; bright: number; beat: number };
  beatAnchorMs: number; // wall-clock ms för ett taktslag (fas)
  /** Rikt spektrum + per-band onset (anslag) från dubbel-FFT:n (hög-upplöst). */
  spec: Spectrum;       // per-band NIVÅ (AGC 0..1)
  onset: Spectrum;      // per-band ONSET/anslag (halvvågs-flux mot adaptiv baslinje, 0..1)
  /** TRUM-KIT-envelopes (0..1): peak-hold + decay PÅ HOP-TAKT (375Hz) → fångar
   *  varje anslag, aldrig missat mellan två render-frames. kick=diskret kick +
   *  onset.kick, snare=highMid-onset, hat=treble-onset, bass=spec.bass (nivå). */
  drum: { kick: number; snare: number; hat: number; bass: number };
}


export class Analyser {
  private fft: FFT;
  private window: Float32Array;
  private buffer: Float32Array;      // sliding FFT window
  private prevMag: Float32Array;     // for flux
  // --- Pre-allokerade scratchpads för 512-FFT + utdata (GC-skydd: process()
  //     allokerade ~7KB/hop → ~2.6 MB/s skräp @375Hz. Nu 0 alloc/hop). ---
  private windowed512!: Float32Array;   // fönstrad tidssignal (scratch)
  private spectrum512!: number[];       // fft.js komplex-spektrum (scratch)
  private mag512!: Float32Array;        // magnitud denna hop (swap:as med prevMag)
  private outSpec: Spectrum = { sub: 0, kick: 0, bass: 0, lowMid: 0, mid: 0, highMid: 0, treble: 0, air: 0 };
  private outOnset: Spectrum = { sub: 0, kick: 0, bass: 0, lowMid: 0, mid: 0, highMid: 0, treble: 0, air: 0 };
  private outDrum = { kick: 0, snare: 0, hat: 0, bass: 0 };   // trum-envelopes (återanvänt)
  private outProfile = { punch: 0.4, bass: 0.5, bright: 0.3, beat: 0.5 };   // karaktärsprofil (återanvänt)
  private outFrame!: Frame;             // ETT återanvänt Frame (muteras/hop; säkert — main-tråden läser synkront)
  // TRUM-KIT peak-hold-envelopes (håll mellan hops). Flyttade FRÅN effects.ts render
  // (100Hz) hit (375Hz) → fångar varje onset-topp. tau bevarade: hat 60ms / snare
  // 110ms / kick 150ms. (Block 3 av arkitektur-refaktoreringen.)
  private hatHit = 0;
  private snareHit = 0;
  private kickHit = 0;
  // --- DUBBEL-FFT: en parallell 2048-FFT enbart för effekternas ljudbild.
  //     512:an ovan sköter RMS/kick/BPM/onset ORÖRT (all tightad timing intakt);
  //     denna ger 23 Hz/bin (4× uppl. i botten) → kick och bas kan äntligen skiljas. ---
  private fftBig!: FFT;
  private windowBig!: Float32Array;
  private windowedBig!: Float32Array;   // scratch (återanvänds, ingen alloc/frame)
  private bufferBig!: Float32Array;     // egen glidande buffert (matas samma hops)
  private prevMagBig!: Float32Array;    // för per-band flux
  private magBig!: Float32Array;        // scratch magnitud
  private specBig!: number[];           // scratch complex (fft.js createComplexArray)
  private static readonly BAND_HZ = [20, 60, 120, 250, 500, 2000, 5000, 10000, 16000];
  private bandLo: number[] = [];        // bin-start per band (förberäknat)
  private bandHi: number[] = [];        // bin-slut per band
  private bandPeak = new Float32Array(8);  // per-band AGC-peak (själv-skalande nivå)
  private onsetBase = new Float32Array(8); // per-band adaptiv flux-baslinje (onsets)
  private bandLvl = new Float32Array(8);   // scratch: per-band nivå denna frame (~90ms smoothad)
  private bandLvlSm = new Float32Array(8); // per-band nivå-smooth (håll mellan frames)
  private bandOn = new Float32Array(8);    // scratch: per-band onset denna frame
  private bigCounter = 0;                  // decimering av 2048-FFT:n (se BIG_EVERY)
  private static readonly BIG_EVERY = 3;   // kor stor-FFT var N:e hop → analysen ryms i realtid
  private kickMed = 0.1;             // robust glidande MEDIAN av kick-fluxen (sign-baserad)
  private kickMad = 0.05;            // robust MAD (median absolut avvikelse) → tröskel-spridning
  private kickSeed = 0;              // warmup-räknare: snabb EMA-seed av skalan innan sign-baserad tar över
  private kickWasAbove = false;      // stigande-flank-detektion
  private kickPrimed = false;        // false på första framen (skräp-flux) → ingen falsk kick
  private static readonly ENV_HZ = 100;
  private static readonly ENV_LEN = 100 * 5;
  private envRing = new Float32Array(Analyser.ENV_LEN);
  private envPos = 0;
  private envFilled = 0;
  private envAccum = 0;
  private envAccumT = 0;
  private bpmCounter = 0;
  private localBpm = 0;
  private localBpmConfidence = 0;
  private octaveVote = 0;   // ackumulerat bevis för att byta oktav (självrättande lås)
  private bpmStable = 0;    // antal stabila (finjusterings-)estimat i rad → committa oktaven

  private bpmHist: number[] = [];   // senaste råestimat (~3s) för median-stabilisering
  // Pre-allokerade scratchpads för computeBpm (GC-skydd; annars 4× Float32Array/anrop).
  private envScratch = new Float32Array(Analyser.ENV_LEN);
  private envPosScratch = new Float32Array(Analyser.ENV_LEN);
  private acScratch = new Float32Array(Analyser.ENV_LEN);
  private pulseScratch = new Float32Array(Analyser.ENV_LEN);
  private silentMs = 0;
  private beatAnchorMs = 0;
  // #2 sub-hop fas: kick-flankens flux-topp ligger sällan exakt på en hop. Vi
  // sparar de två föregående kick-flux-värdena och gör parabolisk interpolation
  // hoppet EFTER en kick → förfinar beatAnchorMs med ±0.5 hop (~1.3ms). Ren
  // fas-korrektion; själva kick-blixten fyrar oförändrat direkt.
  private kfPrev = 0;
  private kfPrev2 = 0;
  private pendingKickMs = 0;   // >0 = kick väntar på fas-förfining nästa hop
  private gain = 1;
  // Attack/release-smoothed outputs — raw per-hop values update ~370x/s and
  // read as flicker on the lamps. Fast attack keeps hits punchy; the slower
  // release lets light glide down instead of sputtering.
  private lvlSmooth = 0;
  private intensityEma = 0.5;    // sektionsenergi: utjämnad nivå
  private intensityFloor = 0.5;  // dess robusta P50-baslinje (låtens snitt)
  private activeMs = 0;          // hur länge musik spelat (warmup för baslinjen)
  // DROP-DETEKTION (flyttad från effects: analys hör hemma här; show-reaktionen stannar där)
  private levelCeil = 0.5;       // långsamt nivå-tak (låtens loud-topp)
  private breakAtMs = 0;         // senaste svacka
  private inZoneState = false;   // hysteres för topp-zonen
  private wasInZone = false;
  private dropCount = 0;         // monoton drop-räknare (edge-säker för konsumenter)
  private lastDropMs = -1e9;
  // RISER/UPPBYGGNAD (flyttad från effects)
  private specSlow = new Float32Array(8);
  private novSlow = 0;           // ihållande spektral novelty (~1.5s)
  private novBaseline = 0.2;     // ~8s baslinje → riser = novelty STIGER över den
  private centSlow = 0.3;
  private lvlSlowR = 0.3;
  private buildUp = 0;           // 0..1 uppbyggnads-envelope
  // KARAKTÄRSPROFIL (långsam, ~8s)
  private profPunch = 0.4;
  private profBass = 0.5;
  private profBright = 0.3;
  private profBeat = 0.5;
  private lvlVU = 0;      // ~130ms hop-takt-smooth av levelRaw → VU-taket (låg jitter)
  private engSmooth = 0;
  private midSmooth = 0;
  private trbSmooth = 0;
  private centSmooth = 0.5;

  /** Called when the input routing changes — the old gain is meaningless for
   *  the new source's signal level, so re-converge from neutral. */
  private gainLocked = false;

  resetGain(startGain = 1) {
    // Seed per input: line (aux) arrives hot -> 1x; the room mic is weak -> ~20x.
    this.gain = Math.max(0.5, Math.min(20, startGain));
    this.envelope = 0;
  }

  /** Lock the AGC (aux: fixed 1x, level tracks the mixer directly) or let it run. */
  setGainLock(locked: boolean, fixed = 1) {
    this.gainLocked = locked;
    if (locked) { this.gain = fixed; this.envelope = 0; }
  }

  /**
   * BPM (55..175) från onset-envelopens autokorrelation.
   *  1) Toppen i autokorrelationen ger en kandidat-lag.
   *  2) SUB-HARMONIC-PREFERENS: om dubbla/tredubbla lagget (halva/tredjedels
   *     tempot) resonerar nästan lika bra är det oftast det ÄKTA beatet — annars
   *     låser en tryckare/ballad på sin subdivision (dubbeltakt). Väljer grundtempot.
   *  3) MEDIAN över ~3s → robust mot enstaka oktav-flippar (istället för att
   *     bestämma per frame, vilket flimrade). Snäpper vid verkligt oktavbyte,
   *     glider mjukt vid små avvik.
   *  (Ref: comb/sub-harmonic + fler-frames-röstning, se @audio/beat och
   *   OBTAIN-realtidsbeat-tracking.)
   */
  private computeBpm() {
    if (this.envFilled < 50) return;   // ~0.5s → snabbt första grovestimat (täcker ≥~122 BPM;
                                       //  långsammare spår låser på overton tills fönstret växer),
                                       //  förfinas löpande. Halverar time-to-first-lock.
    const N = this.envFilled;
    const env = this.envScratch;   // pre-allokerad (index 0..N-1)
    let mean = 0;
    const start = (this.envPos - N + Analyser.ENV_LEN) % Analyser.ENV_LEN;
    for (let i = 0; i < N; i++) { env[i] = this.envRing[(start + i) % Analyser.ENV_LEN]; mean += env[i]; }
    mean /= N;
    for (let i = 0; i < N; i++) env[i] -= mean;
    const HZ = Analyser.ENV_HZ;
    const lagMin = Math.floor(HZ * 60 / 185);
    const lagMax = Math.min(N - 1, Math.floor(HZ * 60 / 55));   // ner till 55 BPM
    // 1) Rå autokorrelation, LENGTH-NORMALISERAD: /(N-lag) tar bort biasen mot
    //    korta lag (annars vinner alltid snabb takt eftersom fler termer bidrar).
    // 2) COMB-SCORING: ac(L) + ½·ac(2L) + ⅓·ac(3L). En äkta beat-period resonerar
    //    även på dubbla/trippla lag — enskilda toppar gör det inte. (Klapuri.)
    // 3) PULSE-TRAIN CROSS-CORRELATION (Percival-Tzanetakis 2014, Essentia):
    //    korrelera envelopen mot en idealiserad pulsserie vid bästa fas. Fångar
    //    regelbundenheten även när AC är utsmetad (mjuka onsets, synkoperingar).
    // 4) PERCEPTUELL PRIOR: log-Gauss runt 120 BPM, σ = 1.0 oktav (Ellis/librosa).
    const ac = this.acScratch;   // pre-allokerad (index lagMin..lagMax skrivs/läses)
    for (let lag = lagMin; lag <= lagMax; lag++) {
      let sum = 0;
      const M = N - lag;
      for (let i = 0; i < M; i++) sum += env[i] * env[i + lag];
      ac[lag] = sum / M;
    }
    // Halvvågsrektifierad envelope (positiv del) — pulse xcorr använder bara energi PÅ slaget.
    const envPos = this.envPosScratch;   // pre-allokerad (index 0..N-1)
    for (let i = 0; i < N; i++) envPos[i] = env[i] > 0 ? env[i] : 0;
    // Pulse-train xcorr per lag: max över fas av Σ envPos[φ + k·L], normaliserad per antal pulser.
    const pulse = this.pulseScratch;   // pre-allokerad (index lagMin..lagMax)
    let pulseMax = 1e-9, combMax = 1e-9;
    for (let lag = lagMin; lag <= lagMax; lag++) {
      let best = 0;
      for (let ph = 0; ph < lag; ph++) {
        let s = 0, k = 0;
        for (let i = ph; i < N; i += lag) { s += envPos[i]; k++; }
        if (k > 0) { const norm = s / k; if (norm > best) best = norm; }
      }
      pulse[lag] = best;
      if (best > pulseMax) pulseMax = best;
      let comb = ac[lag];
      if (2 * lag <= lagMax) comb += 0.5 * ac[2 * lag];
      if (3 * lag <= lagMax) comb += 0.33 * ac[3 * lag];
      if (comb > combMax) combMax = comb;
    }
    let bestLag = 0, bestVal = 0;
    let scoreSum = 0, scoreCount = 0;
    for (let lag = lagMin; lag <= lagMax; lag++) {
      let comb = ac[lag];
      if (2 * lag <= lagMax) comb += 0.5 * ac[2 * lag];
      if (3 * lag <= lagMax) comb += 0.33 * ac[3 * lag];
      // Normalisera båda till [0,1] och rösta jämnt — så de kan väga upp varandra.
      // AC svarar starkt på självlikhet, pulse xcorr på regelbunden energi-fördelning.
      const combN = comb / combMax;
      const pulseN = pulse[lag] / pulseMax;
      const bpmAt = (HZ * 60) / lag;
      const oct = Math.log2(bpmAt / 120);
      const prior = Math.exp(-(oct * oct) / 2.0);   // σ = 1.0 oktav
      const score = (0.5 * combN + 0.5 * pulseN) * prior;
      scoreSum += score; scoreCount++;
      if (score > bestVal) { bestVal = score; bestLag = lag; }
    }

    if (bestLag === 0 || bestVal <= 0) return;
    // Peak-to-mean confidence: en tydlig takttopp sticker ut från medelnivån,
    // en utsmetad "tempolös" låt eller brus har ~platt scoring. clamp(0..1).
    const meanScore = scoreSum / Math.max(1, scoreCount);
    const rawConf = meanScore > 0 ? 1 - meanScore / bestVal : 0;
    // Skala: ~0.35 råvärde är typiskt "helt låst". Mappa 0..0.5 → 0..1.
    const conf = Math.max(0, Math.min(1, rawConf / 0.5));

    // OFF-BEAT-TEST → skilj äkta snabb takt (dans) från subdivision (ballad).
    // Vik onset-envelopen på DUBBLA perioden, jämför energi PÅ slaget vs MELLAN.
    // Svaga mellanslag → sanna takten är halva; starka → behåll snabb takt.
    const P = bestLag * 2;
    if (P <= lagMax) {
      let bestPhase = 0, bestPhaseSum = -1;
      for (let ph = 0; ph < P; ph++) {
        let s = 0; for (let i = ph; i < N; i += P) s += envPos[i];
        if (s > bestPhaseSum) { bestPhaseSum = s; bestPhase = ph; }
      }
      let onE = 0, offE = 0, offC = 0;
      const offPh = (bestPhase + bestLag) % P;
      for (let i = bestPhase; i < N; i += P) onE += envPos[i];
      for (let i = offPh;    i < N; i += P) { offE += envPos[i]; offC++; }
      let posMean = 0; for (let i = 0; i < N; i++) posMean += envPos[i]; posMean /= N;
      const offAvg = offC > 0 ? offE / offC : 0;
      // Halvera bara om mellanslagen (a) är mycket svagare än slagen OCH (b) inte
      // har ett EGET onset (ligger nära baslinjen, offAvg < ~1.2× medel). (b)
      // skiljer en ballad (tomma mellanslag → halvera) från en danslåt med
      // accent-mönster (svagare men RIKTIGA kick-slag → behåll snabb takt).
      if (onE > 0 && offE < onE * 0.45 && offAvg < posMean * 1.2) bestLag = P;
    }

    // Parabolisk interpolation kring toppen → sub-lag-precision (t.ex. 125 ist. 122).
    let lagF = bestLag;
    if (bestLag > lagMin && bestLag + 1 <= lagMax) {
      const acAt = (L: number) => { let s = 0; for (let i = 0; i + L < N; i++) s += env[i] * env[i + L]; return s; };
      const yl = acAt(bestLag - 1), y0 = acAt(bestLag), yr = acAt(bestLag + 1);
      const den = yl - 2 * y0 + yr;
      if (den < 0) { const d = 0.5 * (yl - yr) / den; if (Math.abs(d) < 1) lagF = bestLag + d; }
    }
    let bpm = (HZ * 60) / lagF;
    while (bpm < 55) bpm *= 2;
    while (bpm >= 175) bpm /= 2;
    // Median över RÅestimaten (utan oktav-tvång) → dämpar brus men låser inte
    // fast oktaven, så en fel initial låsning kan rättas. Långt fönster (~5s) för
    // att inte studsa på brusiga/tvetydiga låtar.
    this.bpmHist.push(bpm);
    if (this.bpmHist.length > 20) this.bpmHist.shift();
    const sorted = [...this.bpmHist].sort((a, b) => a - b);
    const med = sorted[sorted.length >> 1];
    if (this.localBpm === 0) {
      this.localBpm = Math.round(med);
      this.octaveVote = 0;
      this.bpmStable = 0;
    } else {
      // SJÄLVRÄTTANDE OKTAV: håll nuvarande takt för stabilitet, MEN om estimaten
      // ihållande pekar på en annan oktav (½× eller 2×) → byt efter ~2s bevis, så
      // en halvtempo-låsning "ökar" till rätt takt istället för att fastna. Ett
      // enstaka breakdown hinner inte nå tröskeln → ingen flimrig växling.
      // COMMIT: efter ~15s STABIL lås (60 finjusterings-estimat @4Hz) LÅSES oktaven —
      // bara finjustering tillåts, aldrig ½×/2× mitt i en låt (en låt byter inte
      // oktav; halvering nollade takt-gridet & bröt beat-synken). Ett wrong initial-
      // lås hinner rättas under första 15s. Nollställs vid tystnad/låtbyte (localBpm=0).
      const committed = this.bpmStable >= 60;
      const ratio = med / this.localBpm;
      if (ratio >= 0.9 && ratio <= 1.11) {
        this.localBpm = Math.round(this.localBpm + (med - this.localBpm) * 0.35);   // samma takt → glid
        this.octaveVote *= 0.5;
        if (this.bpmStable < 100000) this.bpmStable++;                              // stabil tid ackumuleras
      } else if (!committed && ratio > 1.4) {
        this.octaveVote = Math.max(0, this.octaveVote) + 1;                          // estimaten HÖGRE oktav
        if (this.octaveVote >= 8) { this.localBpm = Math.round(med); this.octaveVote = 0; this.bpmStable = 0; }
      } else if (!committed && ratio < 0.7) {
        this.octaveVote = Math.min(0, this.octaveVote) - 1;                          // estimaten LÄGRE oktav
        if (this.octaveVote <= -8) { this.localBpm = Math.round(med); this.octaveVote = 0; this.bpmStable = 0; }
      } else {
        this.octaveVote *= 0.7;                                                      // mellanting (3/2) / committad off-oktav → brus
      }
    }
    // Smooth confidence (undvik hoppig UI); attack snabbt, release långsamt.
    const cA = this.localBpmConfidence;
    this.localBpmConfidence = cA + (conf - cA) * (conf > cA ? 0.35 : 0.08);
  }

  private envelope: number;
  private lastKick = 0;
  private lastT = performance.now();

  constructor(private cfg: EngineConfig) {
    this.fft = new FFT(cfg.fft.size);
    this.window = hannWindow(cfg.fft.size);
    this.buffer = new Float32Array(cfg.fft.size);
    this.prevMag = new Float32Array(cfg.fft.size / 2);
    this.windowed512 = new Float32Array(cfg.fft.size);
    this.spectrum512 = this.fft.createComplexArray();
    this.mag512 = new Float32Array(cfg.fft.size / 2);
    this.envelope = cfg.detection.autoGainTarget;
    // Dubbel-FFT: 2048 för hög låg-uppl. Egen buffert, matas samma hop-chunks.
    const BIG = 2048;
    this.fftBig = new FFT(BIG);
    this.windowBig = hannWindow(BIG);
    this.windowedBig = new Float32Array(BIG);
    this.bufferBig = new Float32Array(BIG);
    this.prevMagBig = new Float32Array(BIG / 2);
    this.magBig = new Float32Array(BIG / 2);
    this.specBig = this.fftBig.createComplexArray();
    const binHzBig = cfg.audio.rate / BIG;
    for (let b = 0; b < 8; b++) {
      this.bandLo[b] = Math.max(1, Math.round(Analyser.BAND_HZ[b] / binHzBig));
      this.bandHi[b] = Math.min(BIG / 2, Math.round(Analyser.BAND_HZ[b + 1] / binHzBig));
      this.bandPeak[b] = 1e-4;   // seed → själv-kalibrerar inom ~1s
    }
    // Ett återanvänt Frame (spec/onset pekar på de pre-allokerade objekten).
    this.outFrame = {
      level: 0, levelRaw: 0, levelVU: 0, energy: 0, mid: 0, treble: 0, centroid: 0, flux: 0,
      kick: false, gain: 1, bpm: 0, bpmConfidence: 0, intensity: 0.5,
      dropCount: 0, inZone: false, breaking: false, buildUp: 0, inRiser: false, profile: this.outProfile, beatAnchorMs: 0,
      spec: this.outSpec, onset: this.outOnset, drum: this.outDrum,
    };
  }

  /** Feed a hop-sized chunk of mono samples, get a frame back. */
  process(samples: Float32Array): Frame {
    // Slide buffer left by hop, append new samples at end.
    const hop = samples.length;
    this.buffer.copyWithin(0, hop);
    this.buffer.set(samples, this.buffer.length - hop);

    // Windowed FFT (pre-allokerade scratchpads → ingen alloc/hop)
    const windowed = this.windowed512;
    for (let i = 0; i < windowed.length; i++) windowed[i] = this.buffer[i] * this.window[i];
    const spectrum = this.spectrum512;
    this.fft.realTransform(spectrum, windowed);

    // RMS on raw (un-windowed) buffer — cheaper and more stable for auto-gain
    let sumSq = 0;
    for (let i = 0; i < this.buffer.length; i++) sumSq += this.buffer[i] * this.buffer[i];
    const rms = Math.sqrt(sumSq / this.buffer.length);

    // Magnitude spectrum + bass band (mag återanvänds; swap:as med prevMag nedan)
    const half = this.cfg.fft.size / 2;
    const mag = this.mag512;
    let bassEnergy = 0;
    let midEnergy = 0;
    let trebleEnergy = 0;
    let flux = 0;
    let kickFlux = 0;                               // onset ENBART i kick-bandet (sub-bas)
    let magSum = 0, magW = 0;                       // för spektralt centroid
    const binHz = this.cfg.audio.rate / this.cfg.fft.size;          // ~93.75 Hz @ 48k/512
    const bassBins = Math.min(16, half);                            // ~0–1.5 kHz
    const kickBins = Math.min(3, half);                            // bins 0–2 ≈ 0–280 Hz (kick-trumman)
    // Diskant = hi-hats/cymbaler ~5–13 kHz (INTE 12 kHz+ där det är tomt).
    const trebleStart = Math.min(half - 1, Math.round(5000 / binHz));   // ~5 kHz
    const trebleEnd = Math.min(half, Math.round(13000 / binHz));        // ~13 kHz
    for (let i = 0; i < half; i++) {
      const re = spectrum[2 * i];
      const im = spectrum[2 * i + 1];
      mag[i] = Math.sqrt(re * re + im * im);
      if (i < bassBins) {
        bassEnergy += mag[i];
        const d = mag[i] - this.prevMag[i];
        if (d > 0) { flux += d; if (i < kickBins) kickFlux += d; }    // half-wave rectified
      } else if (i < trebleStart) {
        midEnergy += mag[i];                         // mellanband (~1.5–5 kHz: röst/synth/virvel)
      } else if (i < trebleEnd) {
        trebleEnergy += mag[i];                      // diskant (~5–13 kHz: hi-hats/cymbaler)
      }
      magSum += mag[i]; magW += i * mag[i];          // centroid = viktad medelfrekvens
    }
    // Swap: denna hops magnitud blir nästa hops prevMag (zero-copy, ingen alloc).
    { const t = this.prevMag; this.prevMag = this.mag512; this.mag512 = t; }
    // Gain-compensated like `level` — otherwise the band-driven fixtures and
    // the kick energy gate die at low volume while the AGC keeps level alive.
    const energy = Math.min(1, (bassEnergy / bassBins) * 0.02 * this.gain);
    const mid = Math.min(1, (midEnergy / Math.max(1, trebleStart - bassBins)) * 0.025 * this.gain);
    const treble = Math.min(1, (trebleEnergy / Math.max(1, trebleEnd - trebleStart)) * 0.04 * this.gain);
    const centroid = magSum > 1e-6 ? Math.min(1, (magW / magSum) / half) : 0;
    const fluxNorm = Math.min(1, flux * 0.005);

    // Auto-gain (slow: seconds-to-minute timescales)
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.lastT) / 1000);
    this.lastT = now;
    const d = this.cfg.detection;
    // AGC körs BARA för mic (aux låser gain på 1× — line-level är hett & stabilt).
    // Beprövad envelope→autoGainTarget. (Percentil-AGC:n vore bättre men rör bara
    // denna oanvända mic-väg → behåller det testade.)
    if (!this.gainLocked && rms > d.noiseFloor) {
      const tau = rms * this.gain > this.envelope ? d.tauDown : d.tauUp;
      const a = 1 - Math.exp(-dt / tau);
      this.envelope += (rms * this.gain - this.envelope) * a;
      const desired = (d.autoGainTarget / Math.max(1e-4, this.envelope)) * this.gain;
      const gTau = desired > this.gain ? d.tauUp : d.tauDown;
      const ga = 1 - Math.exp(-dt / gTau);
      this.gain += (desired - this.gain) * ga;
      if (this.gain < 0.5) this.gain = 0.5;
      else if (this.gain > 20) this.gain = 20;
    }
    const level = Math.min(1, rms * this.gain);

    // KICK-DETEKTION v2: onset i kick-bandet (sub-bas ~0–280 Hz) mot en ADAPTIV
    // baslinje (långsam EMA av kick-fluxen). En kick = flux tydligt över
    // baslinjen; tröskeln skalar med signalen → fyrar pålitligt även på
    // komprimerat material där en fast tröskel missade nästan alla slag.
    // Stigande flank + cooldown = exakt ett slag per träff.
    // ROBUST kick-tröskel (Lovable/Gemini): sign-baserad glidande MEDIAN + MAD i
    // st.f. EMA-medel × fast faktor. En kick är en OUTLIER → flyttar medianen bara
    // ett litet steg, så tröskeln self-inflatear INTE (EMA-medlet drogs upp av
    // kickarna själva → missade efterföljande). Steget skalar med signalen. Tröskel
    // = median + 4.5·MAD → robust z-score, okänslig för outliers.
    // Warmup ~1s: snabb EMA för att hitta signalens SKALA direkt (annars klättrar
    // median från init i 20s med falska kickar). Sen sign-baserad = robust steady-state.
    if (this.kickSeed < 400) {
      this.kickSeed++;
      this.kickMed += (kickFlux - this.kickMed) * 0.05;
      this.kickMad += (Math.abs(kickFlux - this.kickMed) - this.kickMad) * 0.05;
    } else {
      const kStep = 0.002;
      this.kickMed += Math.sign(kickFlux - this.kickMed) * kStep * (this.kickMed + 0.01);
      this.kickMad += Math.sign(Math.abs(kickFlux - this.kickMed) - this.kickMad) * kStep * (this.kickMad + 0.01);
    }
    const kickThresh = this.kickMed + 4.5 * this.kickMad;
    const KICK_COOLDOWN = 170;                     // ms → max ~350 BPM, hindrar sub-beat-dubbelfyr
    const above = kickFlux > kickThresh && energy > 0.06;
    let kick = false;
    // Första framen: prevMag är noll → flux = hela spektrumet → falsk kick som
    // annars sätter beat-ankaret / triggar drop-blixt vid start-in-i-musik. Hoppa.
    if (above && !this.kickWasAbove && now - this.lastKick > KICK_COOLDOWN && this.kickPrimed) {
      kick = true;
      this.lastKick = now;
    }
    this.kickWasAbove = above;
    this.kickPrimed = true;

    const frameMs0 = (this.cfg.fft.hop / this.cfg.audio.rate) * 1000;
    // Tystnad → nollställ BPM-klockan så beat-effekter inte fortsätter i fantom-takt.
    if (rms < this.cfg.detection.noiseFloor * 1.5) {
      this.silentMs += frameMs0;
      if (this.silentMs > 350) { this.localBpm = 0; this.localBpmConfidence = 0; this.octaveVote = 0; this.bpmStable = 0; this.envFilled = 0; this.beatAnchorMs = 0; this.pendingKickMs = 0; this.bpmHist.length = 0; }
    } else {
      this.silentMs = 0;
    }
    // --- Onset-envelope → lokal BPM (nedsamplad till 100 Hz) ---
    const frameMs = (this.cfg.fft.hop / this.cfg.audio.rate) * 1000;
    this.envAccum = Math.max(this.envAccum, fluxNorm);
    this.envAccumT += frameMs;
    if (this.envAccumT >= 1000 / Analyser.ENV_HZ) {
      this.envAccumT -= 1000 / Analyser.ENV_HZ;
      this.envRing[this.envPos] = this.envAccum;
      this.envPos = (this.envPos + 1) % Analyser.ENV_LEN;
      this.envFilled = Math.min(this.envFilled + 1, Analyser.ENV_LEN);
      this.envAccum = 0;
      // Innan lås: räkna på varje ny envelope-sample (100 Hz) för snabbast första estimat.
      // Efter lås: 4 Hz räcker gott — sparar CPU och förfinar med median.
      const stride = this.localBpm === 0 ? 1 : Analyser.ENV_HZ / 4;
      if (++this.bpmCounter >= stride) { this.bpmCounter = 0; this.computeBpm(); }

    }
    // #2 Förfina förra kickens fas: nu har vi y(-1)=kfPrev2, y(0)=kfPrev, y(+1)=kickFlux
    // runt kick-hopet. Parabelns topp ger sub-hop-offset δ ∈ [-0.5,0.5] hop.
    if (this.pendingKickMs > 0) {
      const ym1 = this.kfPrev2, y0 = this.kfPrev, yp1 = kickFlux;
      const denom = ym1 - 2 * y0 + yp1;
      if (denom < 0) {                                   // konkav → äkta topp
        let delta = 0.5 * (ym1 - yp1) / denom;
        if (delta > 0.5) delta = 0.5; else if (delta < -0.5) delta = -0.5;
        const hopMs = (this.cfg.fft.hop / this.cfg.audio.rate) * 1000;
        this.beatAnchorMs = this.pendingKickMs + delta * hopMs;
      }
      this.pendingKickMs = 0;
    }
    if (kick) { this.beatAnchorMs = Date.now(); this.pendingKickMs = this.beatAnchorMs; }
    this.kfPrev2 = this.kfPrev;
    this.kfPrev = kickFlux;

    const dtHop = this.cfg.fft.hop / this.cfg.audio.rate;
    const aAtt = 1 - Math.exp(-dtHop / 0.015);
    const aRel = 1 - Math.exp(-dtHop / 0.4);
    const smooth = (prev: number, x: number) => prev + (x - prev) * (x > prev ? aAtt : aRel);
    this.lvlSmooth = smooth(this.lvlSmooth, level);
    // VU-nivå: symmetrisk ~200ms lågpass PÅ HOP-TAKT (integrerar alla 375 hops/s
    // → långt mindre brus än att smootha rå-nivån efter 50Hz-decimering). ≤200 BPM
    // = ett slag var ≥300ms, så 200ms suddar aldrig ut en äkta beat — bara brus.
    this.lvlVU += (level - this.lvlVU) * (1 - Math.exp(-dtHop / 0.20));
    this.engSmooth = smooth(this.engSmooth, energy);
    this.midSmooth = smooth(this.midSmooth, mid);
    this.trbSmooth = smooth(this.trbSmooth, treble);
    this.centSmooth = smooth(this.centSmooth, centroid);

    // SEKTIONSENERGI (0..1) — hur energiskt partiet är RELATIVT låtens eget snitt.
    // Ren analys av nivån över tid → hör hemma här, inte i show-orkestreringen.
    // En komprimerad signal ligger jämnt högt, så absolut nivå säger inget; jämför
    // mot en robust baslinje (P50-median, ej EMA-medel som pinnas upp av loud
    // sections). Mitten = snittet, tydligt över = drop/topp, under = breakdown.
    // Attack något snabbare än release så uppbyggnader syns. WARMUP: baslinjen
    // konvergerar snabbt (~3s) de första 8s aktiv musik, sen stabil ~25s.
    // Nollställs vid tystnad → snabb omkalibrering vid låtbyte.
    if (rms >= this.cfg.detection.noiseFloor * 1.5) this.activeMs += dtHop * 1000;
    else this.activeMs = 0;
    const iUp = 1 - Math.exp(-dtHop / 1.5);
    const iDown = 1 - Math.exp(-dtHop / 3.0);
    this.intensityEma += (this.lvlSmooth - this.intensityEma) * (this.lvlSmooth > this.intensityEma ? iUp : iDown);
    const iWarm = this.activeMs < 8000;
    const floorRate = iWarm ? dtHop / 3 : dtHop / 25;
    if (iWarm) this.intensityFloor += (this.intensityEma - this.intensityFloor) * floorRate;   // seed snabbt
    else this.intensityFloor += Math.sign(this.intensityEma - this.intensityFloor) * floorRate * (this.intensityFloor + 0.05);
    const intensity = Math.max(0, Math.min(1, 0.5 + (this.intensityEma - this.intensityFloor) / 0.30));

    // --- DUBBEL-FFT: hög-upplöst log-spektrum för effekterna ---
    // Egen glidande 2048-buffert, matas samma hop. Ger 23 Hz/bin i botten så
    // sub/kick/bas separeras. Per-band AGC-nivå + per-band adaptiv onset.
    // Bufferten matas VARJE hop (glidande fönster måste vara obrutet)...
    this.bufferBig.copyWithin(0, hop);   // skjut vänster med en hop
    this.bufferBig.set(samples, this.bufferBig.length - hop);
    // ...men själva FFT:n + band-analysen körs bara var BIG_EVERY:e hop. 2048-FFT:n
    // är analysatorns dyraste steg och spec-NIVÅERNA smoothas ändå ~90ms — de behöver
    // inte 375Hz. MÄTT: analysen tog 3.8ms/hop mot 2.67ms budget → ljud droppades och
    // ljuset låg 40–140ms efter. Decimeringen får den att rymmas i realtid.
    // Tidssteget skalas (bigDt) så smoothing-tidskonstanterna blir oförändrade.
    if (++this.bigCounter >= Analyser.BIG_EVERY) {
    this.bigCounter = 0;
    const bigDt = dtHop * Analyser.BIG_EVERY;
    for (let i = 0; i < this.bufferBig.length; i++) this.windowedBig[i] = this.bufferBig[i] * this.windowBig[i];
    this.fftBig.realTransform(this.specBig, this.windowedBig);
    const halfBig = this.bufferBig.length / 2;
    for (let i = 0; i < halfBig; i++) {
      const re = this.specBig[2 * i], im = this.specBig[2 * i + 1];
      this.magBig[i] = Math.sqrt(re * re + im * im);
    }
    const gated = rms > this.cfg.detection.noiseFloor * 1.5;
    for (let b = 0; b < 8; b++) {
      const lo = this.bandLo[b], hi = this.bandHi[b];
      const nb = Math.max(1, hi - lo);
      let sum = 0, fl = 0;
      for (let i = lo; i < hi; i++) {
        sum += this.magBig[i];
        const d = this.magBig[i] - this.prevMagBig[i];
        if (d > 0) fl += d;
      }
      const avg = sum / nb;
      // Per-band AGC: skala mot egen långsamt sjunkande peak → varje band nyttjar
      // full range oavsett mix (bas dominerar annars alltid rå-magnituden).
      // GOLV (~0.15·lvlSmooth): peaken nollställs INTE i tystnad → när ett tidigare
      // tyst band (t.ex. diskant i ett intro) smäller till blir det en balanserad
      // respons, inte en överstyrd ljus-chock/pump. (Gemini.)
      const minPeak = this.lvlSmooth * 0.15;
      if (gated && avg > this.bandPeak[b]) this.bandPeak[b] = Math.max(avg, minPeak);
      else this.bandPeak[b] = Math.max(this.bandPeak[b] * 0.9993, minPeak);
      // Nivån smoothas ~90ms PÅ HOP-TAKT → nivå-drivna/lugna effekter (som läser
      // spec via ctx.band) flimrar inte av det råa per-hop-AGC-bruset. onset lämnas
      // skarp (nedan) så transient-drivna effekter behåller sin punch.
      const lvlRawB = gated ? Math.min(1, avg / (this.bandPeak[b] + 1e-6)) : 0;
      this.bandLvlSm[b] += (lvlRawB - this.bandLvlSm[b]) * (1 - Math.exp(-bigDt / 0.09));
      this.bandLvl[b] = this.bandLvlSm[b];
      // Per-band onset: halvvågs-flux mot adaptiv baslinje (som kick-detektorn) →
      // rena anslag oberoende av bandets absoluta energi.
      const fluxN = fl / nb;
      this.onsetBase[b] += (fluxN - this.onsetBase[b]) * (0.02 * Analyser.BIG_EVERY);
      this.bandOn[b] = gated ? Math.max(0, Math.min(1, (fluxN - this.onsetBase[b] * 1.3) * 6)) : 0;
    }
    { const t = this.prevMagBig; this.prevMagBig = this.magBig; this.magBig = t; }
    }   // slut på decimerad stor-FFT
    // TRUM-KIT peak-hold-envelopes PÅ HOP-TAKT (var 2.7ms) → fångar varje anslag,
    // aldrig missat mellan två render-frames (100Hz). tau bevarade från effects.ts:
    // hat 60ms (treble-onset O[6]) / snare 110ms (highMid-onset O[5]) / kick 150ms
    // (diskret kick + kick-onset O[1]). bass = spec.bass-NIVÅ (L[2], ingen envelope).
    this.hatHit = Math.max(this.hatHit * Math.exp(-dtHop / 0.06), this.bandOn[6]);
    this.snareHit = Math.max(this.snareHit * Math.exp(-dtHop / 0.11), this.bandOn[5]);
    if (kick) this.kickHit = 1;
    else this.kickHit = Math.max(this.kickHit * Math.exp(-dtHop / 0.15), this.bandOn[1]);
    // ── DROP-DETEKTION (flyttad hit: att AVGÖRA om det är en drop är analys) ──
    // En "riktig" drop = nivån surgar upp mot låtens tak EFTER en break (svacka).
    // Topp-zonen har hysteres (in vid 85% av taket, ut först vid 70%) så nivån inte
    // flimrar kring tröskeln. Kräver ≥2s musik så låtens INTRO (tystnad→musik) inte
    // läses som en drop. Resultatet exponeras som en MONOTON räknare → en konsument
    // på lägre takt kan aldrig missa flanken.
    const nowWallA = Date.now();
    this.levelCeil = Math.max(this.lvlSmooth, this.levelCeil - dtHop * 0.015 * this.levelCeil);   // tak, decay ~65s
    const breaking = this.lvlSmooth < this.levelCeil * 0.65;
    if (breaking) this.breakAtMs = nowWallA;
    if (this.lvlSmooth > this.levelCeil * 0.85 && this.lvlSmooth > 0.65) this.inZoneState = true;
    else if (this.lvlSmooth < this.levelCeil * 0.70) this.inZoneState = false;
    const inZone = this.inZoneState;
    if (inZone && !this.wasInZone && nowWallA - this.breakAtMs < 3500 && this.activeMs > 2000) {
      this.dropCount++; this.lastDropMs = nowWallA;
    }
    this.wasInZone = inZone;

    // ── UPPBYGGNAD / RISER (flyttad hit) ──
    // Spektral NOVELTY = summan av bandens POSITIVA avvikelse från en ~2s baslinje,
    // ihållande ~1.5s. Mätt validerad: ramsar 0.25→0.78 in i en drop. Relativt en
    // ~8s baslinje → RISER = novelty STIGER över den (filter-sweep/snare-roll),
    // skilt från bara-busy (ihållande → baslinjen kommer ikapp). Gammal väg
    // (klang+nivå stiger) ligger kvar som OR. Inte direkt efter en drop.
    let nov = 0; const sr = 1 - Math.exp(-dtHop / 2.0);
    for (let b = 0; b < 8; b++) { this.specSlow[b] += (this.bandLvl[b] - this.specSlow[b]) * sr; nov += Math.max(0, this.bandLvl[b] - this.specSlow[b]); }
    this.novSlow += (nov - this.novSlow) * (1 - Math.exp(-dtHop / 1.5));
    this.novBaseline += (this.novSlow - this.novBaseline) * (dtHop / 8);
    const novRiser = this.novSlow > this.novBaseline + 0.15 && this.novSlow > 0.45;
    this.centSlow += (this.centSmooth - this.centSlow) * (dtHop / 2.5);
    this.lvlSlowR += (this.lvlSmooth - this.lvlSlowR) * (dtHop / 2.5);
    const inRiser = this.activeMs > 2500 && this.lvlSmooth > 0.3 && nowWallA - this.lastDropMs > 1500 && (
        novRiser
        || (this.centSmooth > this.centSlow + 0.06 && this.lvlSmooth > this.lvlSlowR + 0.04 && this.lvlSmooth > 0.4)
      );
    const bTarget = inRiser ? 1 : 0;
    const bRate = bTarget > this.buildUp ? dtHop / 3.5 : dtHop / 1.0;   // bygg ~3.5s, klinga ~1s
    this.buildUp += Math.max(-bRate, Math.min(bRate, bTarget - this.buildUp));

    // ── KARAKTÄRSPROFIL (~8s) — musikens KARAKTÄR, inte dess energinivå ──
    // Banden är redan per-band AGC:ade (0..1 var), så vi jobbar med RELATIONER:
    // hur stor del av ljudbilden som är låg-end resp. luft, och hur transientrikt
    // det är. Långsam (8s) → stabil nog att styra effektval utan att fladdra.
    let bSum = 1e-6; for (let b = 0; b < 8; b++) bSum += this.bandLvl[b];
    const bassW = (this.bandLvl[0] + this.bandLvl[1] + this.bandLvl[2]) / bSum;   // sub+kick+bas
    const brightW = (this.bandLvl[6] + this.bandLvl[7]) / bSum;                    // diskant+luft
    const punchNow = Math.min(1, (this.bandOn[1] + this.bandOn[5] + this.bandOn[6]) * 0.8);  // kick+snare+hat-anslag
    const pr = 1 - Math.exp(-dtHop / 8.0);
    this.profPunch += (punchNow - this.profPunch) * pr;
    this.profBass += (bassW - this.profBass) * pr;
    this.profBright += (brightW - this.profBright) * pr;
    this.profBeat += (this.localBpmConfidence - this.profBeat) * pr;
    // Skala råvärdena till användbara 0..1-spann (typiska musikvärden → full range).
    const cl = (x: number) => x < 0 ? 0 : x > 1 ? 1 : x;
    // Skalningen är KALIBRERAD mot uppmätta råvärden på riktig musik (annars
    // mättar punch på 1.00 och bright ligger konstant högt → ingen diskriminering).
    this.outProfile.punch = cl((this.profPunch - 0.05) / 0.40);
    this.outProfile.bass = cl((this.profBass - 0.28) / 0.30);
    this.outProfile.bright = cl((this.profBright - 0.14) / 0.19);
    this.outProfile.beat = cl(this.profBeat);

    const L = this.bandLvl, O = this.bandOn;
    const spec = this.outSpec, onset = this.outOnset;
    spec.sub = L[0]; spec.kick = L[1]; spec.bass = L[2]; spec.lowMid = L[3]; spec.mid = L[4]; spec.highMid = L[5]; spec.treble = L[6]; spec.air = L[7];
    onset.sub = O[0]; onset.kick = O[1]; onset.bass = O[2]; onset.lowMid = O[3]; onset.mid = O[4]; onset.highMid = O[5]; onset.treble = O[6]; onset.air = O[7];
    const dr = this.outDrum;
    dr.kick = this.kickHit; dr.snare = this.snareHit; dr.hat = this.hatHit; dr.bass = L[2];

    // Mutera det återanvända Frame:t (spec/onset pekar redan på outSpec/outOnset).
    const f = this.outFrame;
    f.level = this.lvlSmooth; f.levelRaw = level; f.levelVU = this.lvlVU;
    f.energy = this.engSmooth; f.mid = this.midSmooth; f.treble = this.trbSmooth;
    f.centroid = this.centSmooth; f.flux = fluxNorm; f.kick = kick; f.gain = this.gain;
    f.bpm = this.localBpm; f.bpmConfidence = this.localBpmConfidence; f.intensity = intensity; f.beatAnchorMs = this.beatAnchorMs;
    f.dropCount = this.dropCount; f.inZone = inZone; f.breaking = breaking; f.buildUp = this.buildUp; f.inRiser = inRiser;
    return f;
  }
}

function hannWindow(n: number): Float32Array {
  const w = new Float32Array(n);
  for (let i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
  return w;
}
