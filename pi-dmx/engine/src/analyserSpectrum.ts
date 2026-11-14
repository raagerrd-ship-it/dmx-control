/** SPEKTRUM (utbruten ur analyser.ts 2026-11-14). Snabba banden per hopp (liten FFT) och stor-FFT:ns åtta band, spektralflöde, klang och bandens onsets. Läser ljudbufferten ur analysatorn (this.a). */
import { Analyser, SECTION_AGG_HOP } from "./analyser.js";
import { SPEC_SLOTS, SPEC_MAX } from './split.js';
import FFT from "fft.js";


export class SpectrumBands {
  /** analysatorn som äger den här delen (delade signaler läses via den) */
  a: Analyser;
  constructor(a: Analyser) {
    this.a = a;
  }
  // --- DUBBEL-FFT: en parallell 2048-FFT enbart för effekternas ljudbild.
  //     512:an ovan sköter RMS/kick/BPM/onset ORÖRT (all tightad timing intakt);
  //     denna ger 23 Hz/bin (4× uppl. i botten) → kick och bas kan äntligen skiljas. ---
  fftBig!: FFT;
  windowBig!: Float32Array;
  windowedBig!: Float32Array;   // scratch (återanvänds, ingen alloc/frame)
  bufferBig!: Float32Array;     // egen glidande buffert (matas samma hops) - RING (a7): äldsta sampel vid bigPos
  private bigPos = 0;
  prevMagBig!: Float32Array;    // för per-band flux
  magBig!: Float32Array;        // scratch magnitud
  magBigMax = 0;                // högsta bin någon läser (band 8-taket)
  /** Cachade vyer (0..magBigMax) till specSink — subarray() per stor-FFT vore 125
   *  alloc/s. Vyerna växlas tillsammans med buffertarna, annars pekar de fel
   *  varannan frame. */
  magBigView!: Float32Array;
  prevMagBigView!: Float32Array;

  specBig!: number[];           // scratch complex (fft.js createComplexArray)
  bandLo: number[] = [];        // bin-start per band (förberäknat)
  bandHi: number[] = [];        // bin-slut per band
  bandPeak = new Float32Array(8);  // per-band AGC-peak (själv-skalande nivå)
  private onsetMed = new Float32Array(8);  // robust glidande median av per-band-fluxen
  private onsetMad = new Float32Array(8);  // robust MAD -> troskelspridning per band
  private static readonly ONSET_K = 3.0;   // troskel = median + K*MAD
  private static readonly FB_K = [385, 475, 313, 1.46, 1.62, 1.8, 2.03, 2.12];   // 2048-medel / snabbt medel, median över 4 ladan-inspelningar (+-2 dB mellan filerna)
  fbMag = new Float32Array(256);fbPrevMag = new Float32Array(256);
  fbLo = new Int32Array(8);fbHi = new Int32Array(8);
  fbCoef = new Float64Array(3 * 2 * 5);   // per lågband: HP-biquad + LP-biquad (b0 b1 b2 a1 a2)
  private fbState = new Float64Array(3 * 2 * 4); // x1 x2 y1 y2 per biquad
  private fbPow = new Float64Array(3);private fbPrevAmp = new Float64Array(3);fbA = new Float64Array(3);
  fbAbs = new Float32Array(8);fbDbRaw = new Float32Array(8);fbLvl = new Float32Array(8);  private fbPeak = new Float32Array(8).fill(1e-4);private fbOnMed = new Float32Array(8);private fbOnMad = new Float32Array(8);
  fbAlvl = 0.5;private fbWarm = 0;
  /** Basonset-toppplockning (snabba sidan, var BIG_EVERY:e hop = 8 ms): librosa onset_detect-lika parametrar i sampel a 8 ms:
   *  pre_max 4 (30 ms), pre/post_avg 12 (100 ms), wait 4 (30 ms), delta i dB (librosas 0,07 pa ett dB-envelope). */
  private static readonly BASSON_DELTA = 0.07;
private static readonly BASSON_AVG = 12;private static readonly BASSON_MAX = 4;private static readonly BASSON_WAIT = 4;
private bassOnLastPk = -1e9;specRing: Float32Array | null = null;
specCopy = new Float32Array(0);specN = 0;  aBandLvl = 0;
  /** Stor-FFT-rutor med signal i rad. Onsets hålls tysta tills MAD hunnit byggas
   *  upp — se `ONSET_WARM` och kommentaren vid bandOn. */
  private onsetWarm = 0;
  /** ~1,5 s vid 125 Hz. MAD startar i noll efter tystnad och byggs upp med
   *  `mad ← 1.006·mad + 6e-5`, vilket tar ≈183 rutor att nå ett användbart värde. */
  private static readonly ONSET_WARM = 183;
  /** 2048-bufferten som RING (a7/a8): hoppet skrivs på den äldstas plats i stället för copyWithin (8 kB memmove per hop);
   *  bigStep läser ringen i tidsordning från bigPos -> samma sampel i samma ordning, bit-identiskt. Förutsätter hop <= 2048. */
  bigRingPush(samples: Float32Array): void {
    const B = this.bufferBig, N = B.length, p = this.bigPos, hop = samples.length, first = N - p;
    if (hop <= first) B.set(samples, p);
    else { B.set(samples.subarray(0, first), p); B.set(samples.subarray(first), 0); }
    this.bigPos = (p + hop) % N;
  }

  /** SNABBA BANDEN (FAST_BANDS, se fältet): varje hop, till fb*-uppsättningen. Samma nivå/AGC/onset-räkning som 2048-vägens bandloop
   *  i bigStep, med tidskonstanterna per hop i stället för per stor-FFT (nivå 90 ms, peak-decay 0,9993, onset-steg 0,002, uppvärmning
   *  ONSET_WARM x BIG_EVERY hop). */
  fastBandStep(samples: Float32Array): void {
    const gated = this.a.hGated;
    if (gated) this.fbWarm++; else this.fbWarm = 0;
    const warm = gated && this.fbWarm >= SpectrumBands.ONSET_WARM * Analyser.BIG_EVERY;
    const C = this.fbCoef, S = this.fbState, n = samples.length;
    for (let b = 0; b < 8; b++) {
      let avg: number, fluxN: number;
      if (b < 3) {   // biquad HP + LP i följd, effekten per hop, utjämnad; amplitud = rot ur effekten, skalad till ett bandmedel
        const o1 = b * 10, o2 = o1 + 5, s1 = b * 8, s2 = s1 + 4;
        let x1 = S[s1], x2 = S[s1 + 1], y1 = S[s1 + 2], y2 = S[s1 + 3], u1 = S[s2], u2 = S[s2 + 1], v1 = S[s2 + 2], v2 = S[s2 + 3], pw = 0;
        // Koefficienterna i lokala konstanter (a7): tio typade läsningar per sampel bort, samma tal i samma uttryck.
        const a0 = C[o1], a1 = C[o1 + 1], a2 = C[o1 + 2], a3 = C[o1 + 3], a4 = C[o1 + 4];
        const c0 = C[o2], c1 = C[o2 + 1], c2 = C[o2 + 2], c3 = C[o2 + 3], c4 = C[o2 + 4];
        for (let i = 0; i < n; i++) {
          const x = samples[i];
          const y = a0 * x + a1 * x1 + a2 * x2 - a3 * y1 - a4 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y;
          const v = c0 * y + c1 * u1 + c2 * u2 - c3 * v1 - c4 * v2; u2 = u1; u1 = y; v2 = v1; v1 = v;
          pw += v * v;
        }
        S[s1] = x1; S[s1 + 1] = x2; S[s1 + 2] = y1; S[s1 + 3] = y2; S[s2] = u1; S[s2 + 1] = u2; S[s2 + 2] = v1; S[s2 + 3] = v2;
        this.fbPow[b] += (pw / n - this.fbPow[b]) * this.fbA[b];
        avg = Math.sqrt(this.fbPow[b]) * SpectrumBands.FB_K[b];
        const d = avg - this.fbPrevAmp[b]; fluxN = d > 0 ? d : 0; this.fbPrevAmp[b] = avg;
      } else {       // 512-FFT:ns binnar (fbMag fylls i process()), flux mot förra hoppet
        const lo = this.fbLo[b], hi = this.fbHi[b], m = this.fbMag, pm = this.fbPrevMag;
        let sum = 0, fl = 0;
        for (let i = lo; i < hi; i++) { const v = m[i]; sum += v; const d = v - pm[i]; if (d > 0) fl += d; }
        const nb = hi - lo;
        avg = sum / nb * SpectrumBands.FB_K[b]; fluxN = fl / nb * SpectrumBands.FB_K[b];
      }
      this.fbAbs[b] = avg;
      if (b >= 3) this.fbDbRaw[b] = 20 * Math.log10(avg + 1e-7);   // bara band 3-7 läses (midHiDb)
      const minPeak = this.a.lvlSmooth * 0.15;
      if (gated && avg > this.fbPeak[b]) this.fbPeak[b] = Math.max(avg, minPeak);
      else this.fbPeak[b] = Math.max(this.fbPeak[b] * 0.9993, minPeak);
      const lvlRawB = gated ? Math.min(1, avg / (this.fbPeak[b] + 1e-6)) : 0;
      this.fbLvl[b] += (lvlRawB - this.fbLvl[b]) * this.fbAlvl;
      const oStep = 0.002;
      const dOMed = fluxN - this.fbOnMed[b];
      this.fbOnMed[b] += (dOMed > 0 ? 1 : dOMed < 0 ? -1 : 0) * oStep * (this.fbOnMed[b] + 0.01);
      const dOMad = Math.abs(fluxN - this.fbOnMed[b]) - this.fbOnMad[b];
      this.fbOnMad[b] += (dOMad > 0 ? 1 : dOMad < 0 ? -1 : 0) * oStep * (this.fbOnMad[b] + 0.01);
      if (this.fbOnMed[b] < 0) this.fbOnMed[b] = 0;
      if (this.fbOnMad[b] < 0) this.fbOnMad[b] = 0;
      const oThr = this.fbOnMed[b] + SpectrumBands.ONSET_K * this.fbOnMad[b];
      this.a.fbOn[b] = warm ? Math.max(0, Math.min(1, (fluxN - oThr) / Math.max(1e-6, this.fbOnMad[b] * 3))) : 0;
    }
    { const t = this.fbPrevMag; this.fbPrevMag = this.fbMag; this.fbMag = t; }
  }

  /** Decimerad stor-FFT (var BIG_EVERY:e hop): 2048-magnitud, latminnets spec-sink, basonset-envelope, 8 band (niva/AGC/onset) + swap. */
  bigStep(): void {
    this.a.bigCounter = 0;
    { const buf = this.bufferBig, w = this.windowBig, out = this.windowedBig, B = buf.length, p = this.bigPos, n1 = B - p;
      for (let i = 0; i < n1; i++) out[i] = buf[p + i] * w[i];
      for (let i = n1; i < B; i++) out[i] = buf[i - n1] * w[i]; }
    this.fftBig.realTransform(this.specBig, this.windowedBig);
    // Bara upp till högsta bin som någon läser (band 8 slutar vid 16 kHz ≈ bin 683,
    // låtminnet slutar vid 5 kHz ≈ bin 218). Resterande ~340 sqrt per stor-FFT hade
    // ingen läsare.
    // Hissade referenser: JIT:en slipper verifiera this-formen per varv och kan
    // hålla pekarna i register. Samma aritmetik, samma utfall.
    const specBig = this.specBig, magBig = this.magBig, magMax = this.magBigMax;
    for (let i = 0; i < magMax; i++) {
      const re = specBig[2 * i], im = specBig[2 * i + 1];
      magBig[i] = Math.sqrt(re * re + im * im);
    }

    // LÅTMINNET får samma magnitud (ingen extra FFT). Anropas före swap:en nedan,
    // så bufferten faktiskt innehåller DENNA frames spektrum. Skickas som cachad vy
    // (0..magBigMax) — svansen räknas inte, så ingen läsare kan tyst få nollor.
    if (this.a.bigOn) { const k = ++this.specN, R = this.specRing!, o = (k % SPEC_SLOTS) * SPEC_MAX; R.set(this.magBigView.subarray(0, this.specCopy.length), o); }
    else this.a.specSink?.(this.magBigView, this.a.cfg.audio.rate / this.bufferBig.length);
    const gated = this.a.activeMs > 0;   // brusgrinden ur snabba sidan (B_ACTIVE) - workerns cfg-kopia läses inte

    // Signal i rad? Räknaren driver ONSET_WARM ovan.

    if (gated) this.onsetWarm++; else this.onsetWarm = 0;

    // Samma hissning som magnitud-loopen: pekarna ut ur this före det inre varvet.
    const bandLo = this.bandLo, bandHi = this.bandHi;
    const prevMagBig = this.prevMagBig;
    if (!SECTION_AGG_HOP) {   // a3r: bara SECTION_AGG 'env' laser basonset-ringen (g.bon/g.bpk); i 'hop' (DMX) var den dod - 11 log10 per stor-FFT
      // BASONSET-ENVELOPE (09-23, sektionssardrag): som librosa onset_strength(fmax 220): medel over basbinen (20-250 Hz) av
      // halvvagslikriktad dB-skillnad mot forra stor-FFT:n. Toppplockning som onset_detect (pre_max/avg/post_avg/wait/delta) pa
      // 8 ms-raster med 100 ms fordrojning (post_avg) - toppen raknas i det block som pagar, sa fordrojningen ar harmlos.
      const lo = bandLo[0], hi = bandHi[2]; let o = 0;
      for (let i = lo; i < hi; i++) { const d = 20 * Math.log10((magBig[i] + 1e-6) / (prevMagBig[i] + 1e-6)); if (d > 0) o += d; }
      o /= Math.max(1, hi - lo);
      const L = Analyser.BASSON_LEN, R = this.a.bassOnRing, n = this.a.bassOnN, A = SpectrumBands.BASSON_AVG;
      R[n % L] = o; this.a.bassOnN = n + 1;
      // kandidat c = n - A (100 ms bakat): lokalt max over [c - pre_max, c], >= medel over [c - A, c + A] + delta, wait sedan forra toppen
      if (n >= 2 * A) {
        const c = n - A; const xc = R[c % L]; let ok = true;
        for (let k = 1; k <= SpectrumBands.BASSON_MAX && ok; k++) if (R[(c - k) % L] > xc) ok = false;
        if (ok) { let s = 0; for (let k = c - A; k <= n; k++) s += R[k % L]; if (xc < s / (2 * A + 1) + SpectrumBands.BASSON_DELTA) ok = false; }
        if (ok && c - this.bassOnLastPk > SpectrumBands.BASSON_WAIT) { this.bassOnLastPk = c; this.a.bassOnPeak = true; }
      }
    }
    for (let b = 0; b < 8; b++) {
      const lo = bandLo[b], hi = bandHi[b];
      const nb = Math.max(1, hi - lo);
      let sum = 0, fl = 0;
      for (let i = lo; i < hi; i++) {
        const m = magBig[i];
        sum += m;
        const d = m - prevMagBig[i];
        if (d > 0) fl += d;
      }
      const avg = sum / nb;
      // Lotus-adaptern använder rå bandmagnitud som spektral andel för ljuset.
      // Den får inte ersättas av bandLvl, som är per-band AGC-normaliserad.
      this.a.bandAbs[b] = avg;
      // Obehandlad nivå i dB. Ingen AGC → en stigning syns som stigning (riserns fönster: se riserStep).
      const db = 20 * Math.log10(avg + 1e-7);
      this.a.bandDbRaw[b] = db;   // RA dB (drop-kropp, riser)
      this.a.secSpecDirty = true;
      // Per-band AGC: skala mot egen långsamt sjunkande peak → varje band nyttjar
      // full range oavsett mix (bas dominerar annars alltid rå-magnituden).
      // GOLV (~0.15·lvlSmooth): peaken nollställs INTE i tystnad → när ett tidigare
      // tyst band (t.ex. diskant i ett intro) smäller till blir det en balanserad
      // respons, inte en överstyrd ljus-chock/pump. (Gemini.)
      const minPeak = this.a.lvlSmooth * 0.15;
      // DECAYEN SKALAS MED BIG_EVERY: blocket körs 125/s, inte 375/s. Rå 0.9993 gav
      // τ ≈ 11 s i stället för kalibrerade ~3.8 s (ett hett band höll sin peak in i
      // nästa parti → konstlat låg diskant efter en drop). PEAK_DECAY = 0.9993^BIG_EVERY.
      if (gated && avg > this.bandPeak[b]) this.bandPeak[b] = Math.max(avg, minPeak);
      else this.bandPeak[b] = Math.max(this.bandPeak[b] * Analyser.PEAK_DECAY, minPeak);
      // Nivån smoothas ~90ms PÅ HOP-TAKT → nivå-drivna/lugna effekter (som läser
      // spec via ctx.band) flimrar inte av det råa per-hop-AGC-bruset. onset lämnas
      // skarp (nedan) så transient-drivna effekter behåller sin punch.
      const lvlRawB = gated ? Math.min(1, avg / (this.bandPeak[b] + 1e-6)) : 0;
      // EN array, inte tva. `bandLvlSm` hade exakt en lasare — kopieringen till
      // `bandLvl` — sa tva Float32Array(8) bar identiska varden hela tiden.
      this.a.bandLvl[b] += (lvlRawB - this.a.bandLvl[b]) * this.aBandLvl;
      // Per-band onset: halvvågs-flux mot adaptiv baslinje (som kick-detektorn) →
      // rena anslag oberoende av bandets absoluta energi.
      const fluxN = fl / nb;
      // ROBUST PROMINENS-GRIND (samma som kick-detektorn anvander, banden fick den
      // aldrig). Den gamla grinden var "1.3x en EMA-baslinje x6", vilket slapper
      // igenom varje transient i bandet i stallet for verkliga trumslag.
      //   MATT vid BPM 134: kick 1116 slag/min (borde ~134, 8x for manga),
      //   virvel 429/min (borde ~67, 6x). Darfor kandes trum-envelopen alltid pa
      //   och gav ingen musikalisk accent - den var inte matttad, den overtriggade.
      // Sign-baserad median + MAD ar okanslig for outliers (ett slag ar en outlier
      // och far darfor INTE dra upp sin egen troskel, till skillnad fran en EMA).
      // Steget skalas med BIG_EVERY sa tidskonstanten blir samma som kickens trots
      // att banden uppdateras var tredje hop.
      const oStep = 0.002 * Analyser.BIG_EVERY;
      const dOMed = fluxN - this.onsetMed[b];
      this.onsetMed[b] += (dOMed > 0 ? 1 : dOMed < 0 ? -1 : 0) * oStep * (this.onsetMed[b] + 0.01);
      const dOMad = Math.abs(fluxN - this.onsetMed[b]) - this.onsetMad[b];
      this.onsetMad[b] += (dOMad > 0 ? 1 : dOMad < 0 ? -1 : 0) * oStep * (this.onsetMad[b] + 0.01);
      // Samma klamp som kick-spåraren ovan, av samma skäl: -0.01 är en dödsfälla.
      // Här blir följden att ALLA åtta band låser på bandOn = 1 konstant.
      if (this.onsetMed[b] < 0) this.onsetMed[b] = 0;
      if (this.onsetMad[b] < 0) this.onsetMad[b] = 0;
      const oThr = this.onsetMed[b] + SpectrumBands.ONSET_K * this.onsetMad[b];
      // Skala mot MAD i stallet for en fast faktor -> sjalvskalande per band.
      // UPPVÄRMNING — ANNARS BLIXTRAR ALLA ÅTTA BAND TILL 1,0 EFTER VARJE TYSTNAD.
      // Nämnaren är MAD, och MAD sjunker mot noll under tystnad (τ ≈ 1,3 s). När
      // musiken kommer tillbaka slår `gated` om i samma ögonblick, nämnaren står
      // på golvet 1e-6, och varje positivt flux klampar till 1 — i ~1,5 s, i alla
      // band samtidigt. Alltså en fullskalig ljussmäll vid varje låtgräns med paus.
      // Vi väntar in MAD i stället för att gissa en amplitudtröskel: räknaren mäter
      // exakt den uppbyggnadstid nämnaren behöver.
      this.a.bandOn[b] = (gated && this.onsetWarm >= SpectrumBands.ONSET_WARM)
        ? Math.max(0, Math.min(1, (fluxN - oThr) / Math.max(1e-6, this.onsetMad[b] * 3)))
        : 0;
    }
    { const t = this.prevMagBig; this.prevMagBig = this.magBig; this.magBig = t;
      const v = this.prevMagBigView; this.prevMagBigView = this.magBigView; this.magBigView = v; }
  }
}
