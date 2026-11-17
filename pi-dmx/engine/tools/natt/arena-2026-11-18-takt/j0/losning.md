# j0 JOKERN, arenan takt

## Idén
a6:s bandvikning (fasen ur sex band vägda efter regelbundenhet) är grunden. Den vann på alla tre filerna och höll på mellanmängden. Ingen annan deltagare vann ett fönster som a6 missade på mer än en fil. Ovanpå den har jag provat de två fasvakterna som höll ettan: a5:s trötta lås (j0) och a2:s lokala fasvakt (j0b). **Rekommendationen är j0b = a6 + a2 D1-D4 på a6:s bandvikning.** Den har samma FEL som a6 men bättre etta och mindre glidning.

## Vad som togs och vad som valdes bort
| deltagare | del | beslut | varför |
|---|---|---|---|
| a6 | A bandvikningen, B lead-ankaret, C split.ts (3 fält) | **med i båda** | +19,1, lyfter alla tre filerna, mellan 14,8 -> 7,4 |
| a2 | D1 lokal topp ±5 fack, D2 förstärkning efter tydlighet, D3 fjärrtopp 1,3x i 8 sökningar, D4 infångning vid låtgräns/nytt slag/tempohopp >3 % | **j0b**, körs på a6:s vägda vikning C (och lead-ankaret räknas in) | a2 sänkte glider på alla filer. Ettan föll i a2 men inte här |
| a5 | trött lås + färsk återlåsning 8 s | **j0**. Fasminnet matas med a6:s vägda bandstigning, inte basens dB | lyfte bara 200719 och kostade ettan -> förkastat |
| a7 | DP | nej | DP:n tar över fasen från vikningen, så a6:s vinst skulle gå förlorad. Sämre än a6 på alla filer, och DP_PHASE_MS är skattad på en fil |
| a3, a8 | motslagsvakter | nej | a6 har redan motslag 0,7 -> 0,3. Båda sänkte ettan |
| a1 | fasbank | nej | samma mekanism som a2 men mer kod. Motslaget blev sämre |
| a4 | fint tempo | nej | -0,8 |

## Lead-spärren (analys utan mätning)
a6 flyttade medianen 7 ms på alla filer, så marginalen ser ut att vara 3 ms. Det är kvantisering och inte en flytt av tidsreferensen. Leadvärdena kommer i steg om ~6,7 ms. I fönster där bas och varianten båda är "på slaget" är medelleaden bas/a6/j0b -56,5/-57,0/-57,9, -62,8/-64,1/-64,2 och -68,6/-68,6/-68,8 ms. Den verkliga flytten är alltså ≤1,4 ms. Medianen över hela filen hoppar ett steg därför att färre glidfönster finns med. Två steg (13 ms) kräver en verklig flytt på ~7 ms, och den finns inte.

## Siffrorna (taktdom m1)
| | FEL | motslag | fel tempo | glider | stökigt | oktav | etta | 151659 | 160345 | 200719 | lead |
|---|---|---|---|---|---|---|---|---|---|---|---|
| bas | 29,9 | 6,3 | 6,8 | 14,2 | 2,6 | 10,4 | 85,7 | 32,7 | 33,9 | 23,0 | -53/-60/-60 |
| a6 | 10,8 | 0,7 | 4,9 | 3,8 | 1,4 | 4,9 | 84,2 | 10,4 | 8,9 | 13,0 | -60/-67/-67 |
| **j0b** | **10,8 (+19,1)** | 0,3 | 5,8 | **2,6** | 2,0 | 5,0 | **86,3** | 10,2 | 9,1 | 13,0 | -60/-67/-67 |
| j0 | 9,8 (+20,0) | 0,3 | 4,3 | 3,2 | 2,0 | 5,3 | 83,0 | 10,4 | 9,1 | 10,0 | -60/-67/-67 |

Ettan per fil i j0b är 93,9 / 95,8 / 69,2 (a6: 93,9 / 91,9 / 67,0; bas: 97,8 / 90,4 / 68,9). Omvalen av ettan sjönk från 0,69 till 0,55 och "på slaget" (ettdom) steg från 93,4 till 95,4. Den lugnare fasen gör taktmodellen stabilare. Spärren för ettan har nu 3,6 procentenheters marginal (a6 hade 1,5).

Sämre i j0b: fel tempo 4,9 -> 5,8. Det gäller fyra fönster mitt i DJ-övergångar (160345 15, 200719 475/975/995) där a6 också felar (G/d -> T). Bara 200719 475 var ett icke-fel i a6 ("dubbelt"). Glider sjunker mest på 160345 (5,4 -> 1,8).

j0 vinner 0,9 poäng, men allt sitter på 200719 och ettan där faller 67,0 -> 62,6 (medel 83,0, 0,3 över spärren). Det är exakt den sortens enfilsvinst briefen varnar för. Jag lämnar j0 som referens, inte som kandidat.

## Kostnaden (j0b)
Allt i workern (taktvägen, BeatFeed). a6:s del: sex bandstigningar per hopp, sex additioner per anslag i vikningen och phFold (6 x 48 x 2) per kandidat. a2:s del: en kopia av 48 fack när en kandidat blir bäst och 11 jämförelser per sökning (4 Hz). Minne ~28 kB. Huvudtråden skriver 3 doubles till per hopp (split.ts 19 -> 22 fält). Ingen allokering per hopp, ingen ny FFT. Pi-budgeten är inte mätt av mig (orkestratorn).

## Risken
- En verklig fasändring utan låtgräns och utan tempohopp >3 % tar ~2 s (8 sökningar) i stället för 0,25 s.
- Mjuk förstärkning (k <= 0,7) gör att fasen följer något långsammare i övergångar, därav fel tempo +0,9.
- a6:s risker gäller fortfarande: musik utan trumma (låg regelbundenhet -> ingen rättning), rumsbrus i diskantbandet (låg vikt), och att lotus (FAST_BANDS av) får grövre specAbs. Inget av det är mätt.
- analyserClock.ts och split.ts är delade med lotus. Lotus-porten och ANALYSER_SHARED.md5 är inte gjorda.

## Diffen j0b (rekommenderad): `git diff --no-index src .arena/takt/j0b/src`
```diff
diff --git a/src/analyserClock.ts b/.arena/takt/j0b/src/analyserClock.ts
index 0bbcb78..65794e9 100644
--- a/src/analyserClock.ts
+++ b/.arena/takt/j0b/src/analyserClock.ts
@@ -23,6 +23,7 @@ const TRUST_REPEAT_BEATS = 2, TRUST_REPEAT_TOL = 0.06;   // TILLITEN
 const TRUST_UP = Number(process.env.DMX_TRUST_UP || '0.12'), TRUST_LEAK_MS = Number(process.env.DMX_TRUST_LEAK_MS || '4000');   // PROVRATTAR 2026-11-07
 const ONSET_WIN_MS = 5000, ONSET_EVERY_MS = 250, ONSET_BINS = 48, ONSET_RING = 1024, ONSET_MIN_PEAK = 1.5;   // LÖPANDE TAKT
 const FEED_RISE_HOPS = 6;   // BASENS STIGNING
+const PH_B = 6, PH_W = 4, PH_LAG_A = 0.05, PH_LAG_MAX = 30;   // FASEN UR BANDEN (a6)
 const BREAK_HOLD_MS = 20000;   // TVÅ RUTNÄT
 const BREAK_RESTORE_MS = Number(process.env.DMX_BREAK_RESTORE_MS ?? String(BREAK_HOLD_MS));
 const BAR_DECAY = 0.99, BAR_MIN = 16, BAR_MARGIN = 0.06, BAR_W_BASS = 0.5, BAR_WIN0 = -0.2, BAR_WIN1 = 0.3, BAR_RISE_HOPS = 6, BAR_R_MAX = 2, BAR_W_BEAT = 0.25, BAR_Q = 8, BAR_BEAT_Q = 2;   // ETTAN I EFFEKTKLOCKANS RUTNÄT
@@ -41,6 +42,7 @@ const HV_R = [4 / 3, 3 / 4, 3 / 2, 2 / 3, 5 / 4, 4 / 5], HV_K = 1.25, HV_N = 5,
 const PW_RING = 4096, PW_WIN_MS = 10000, PW_MIN = 0.5, PW_Q = [4 / 3, 3 / 4, 3 / 2, 2 / 3];   // TAKTENS SJÄLVLIKHET
 const TG_K = 139, TG_STEP = Math.pow(2, 1 / TG_K), TG_PER_HOP = 1, TG_A = 0.21, TG_MIN_N = 300, TG_FINE = 0.0025, TG_HALF = ONSET_BINS >> 1;
 const TG_FINE_MAX = 0.0125;   // FINTEMPOTS BAND
+const PL_CAP = 5, PL_HOLD = 1.3, PL_N = 8, PL_KS = 0.25, PL_KMAX = 0.7, PL_JUMP = 0.03;   // FASVAKTEN (a2)
 
 /** FAS-PREDIKTIONSTILLIT. */
 export function publishPhase(f: { beatPhaseMs: number; beatPhaseConf: number; barShift: number }, b: ClockCfg["beat"], barKnown: boolean,
@@ -67,6 +69,8 @@ export class BeatFeed {
   private readonly onT = new Float64Array(ONSET_RING); private readonly onV = new Float32Array(ONSET_RING); private readonly hiV = new Float32Array(ONSET_RING); private hiPrev = 0; private onPos = 0; private onN = 0; private onHalf = false; private onPrev = 0;   // LÖPANDE TAKT
   private readonly foldS = new Float64Array(ONSET_BINS); private readonly foldN = new Float64Array(ONSET_BINS); private onNext = 0;
   onsetFixes = 0;
+  private readonly phV = new Float32Array(ONSET_RING * PH_B); private readonly phA = new Float64Array(FEED_RISE_HOPS * PH_B); private readonly phP = new Float64Array(PH_B);   // FASEN UR BANDEN
+  private readonly phF = new Float64Array(ONSET_BINS * PH_B); private readonly phC = new Float64Array(ONSET_BINS);
   private readonly riseDb = new Float64Array(FEED_RISE_HOPS); private risePos = 0;
   private readonly fullS = new Float64Array(ONSET_BINS); private readonly fullN = new Float64Array(ONSET_BINS);   // HELA TEMPOOMRÅDET
   private readonly tgAcc = new Float64Array(TG_K).fill(-1); private readonly tgH = new Float64Array(ONSET_BINS); private tgK = 0; private tgN = 0;
@@ -98,9 +102,24 @@ export class BeatFeed {
   static analyserCfg<T extends object>(cfg: T): T { return { ...cfg, beat: null }; }
 
   private foldMean(k: number): number { const q = (k + ONSET_BINS) % ONSET_BINS; return this.foldN[q] ? this.foldS[q] / this.foldN[q] : 0; }
+  /** FASEN UR BANDEN. */
+  private phFold(): number {
+    const F = this.phF, N = this.foldN, C = this.phC; C.fill(0); let any = false;
+    for (let k = 0; k < PH_B; k++) {
+      let mu = 0, mx = 0;
+      for (let b = 0; b < ONSET_BINS; b++) { const v = N[b] ? F[b * PH_B + k] / N[b] : 0; mu += v; if (v > mx) mx = v; }
+      mu /= ONSET_BINS; if (!(mu > 0)) continue;
+      const w = (mx / mu - 1) / mu; any = true;
+      for (let b = 0; b < ONSET_BINS; b++) if (N[b]) C[b] += w * F[b * PH_B + k] / N[b];
+    }
+    if (!any) return 0;
+    let m = 0; for (let b = 0; b < ONSET_BINS; b++) m += C[b];
+    return m / ONSET_BINS;
+  }
 
   private scanStep = 0.005; private scanC = 99; private scanEnd = 0; private scanRef = 0; private scanNow = 0; private scanC0 = 0;   // Sökningen sprids över hoppen
-  private bestScore = 0; private bestBpm = 0; private bestPh = 0; private scanFar = 0;
+  private bestScore = 0; private bestBpm = 0; private bestPh = 0; private scanFar = 0; private bestLag = NaN; private phLag = 0;
+  private readonly foldB = new Float64Array(ONSET_BINS); private bestMean = 0; private bestPk = 0; private phAcq = true; private phFar = 0; private phFarE = 0;   // FASVAKTEN
 
   /** LÖPANDE TAKT. */
   private onsetStep(cfg: EngineConfig, now: number): void {
@@ -118,33 +137,50 @@ export class BeatFeed {
     }
     const c = this.scanC++, ref = this.scanRef;
     const bpm = this.scanC0 * (1 + c * this.scanStep), bm = 60000 / bpm;
-    this.foldS.fill(0); this.foldN.fill(0);
-    let tot = 0, n = 0;
+    this.foldS.fill(0); this.foldN.fill(0); this.phF.fill(0);
+    let tot = 0, n = 0; const PV = this.phV, PF = this.phF;
     for (let i = 0; i < this.onN; i++) {
       const j = (this.onPos - 1 - i + ONSET_RING) % ONSET_RING, t = this.onT[j];
       if (t > this.scanNow) continue;
       if (this.scanNow - t > ONSET_WIN_MS) break;
       const r = (t - ref) % bm, b = Math.floor(((r < 0 ? r + bm : r) / bm) * ONSET_BINS) % ONSET_BINS;
       this.foldS[b] += this.onV[j]; this.foldN[b]++; tot += this.onV[j]; n++;
+      const o = b * PH_B, q = j * PH_B; for (let k = 0; k < PH_B; k++) PF[o + k] += PV[q + k];
     }
     if (n >= 100 && tot > 0) {
-      const mean = tot / n; let mx = 0, mb = 0;
-      for (let b = 0; b < ONSET_BINS; b++) { const v = this.foldN[b] ? this.foldS[b] / this.foldN[b] : 0; if (v > mx) { mx = v; mb = b; } }
-      const score = (mx / mean) * (c === 0 && this.scanStep === 0.005 ? SCAN_HOLD : 1);
+      const mean = this.phFold(), C = this.phC; let mx = 0, mb = 0;
+      for (let b = 0; b < ONSET_BINS; b++) { const v = C[b]; if (v > mx) { mx = v; mb = b; } }
+      const score = mean > 0 ? (mx / mean) * (c === 0 && this.scanStep === 0.005 ? SCAN_HOLD : 1) : 0;
       if (score > this.bestScore) {
-        const a = this.foldMean(mb - 1), cc = this.foldMean(mb), d = this.foldMean(mb + 1), den = a - 2 * cc + d;
+        const a = C[(mb + ONSET_BINS - 1) % ONSET_BINS], cc = C[mb], d = C[(mb + 1) % ONSET_BINS], den = a - 2 * cc + d;
         const off = den < 0 ? 0.5 * (a - d) / den : 0;
-        this.bestScore = score; this.bestBpm = bpm; this.bestPh = (mb + 0.5 + off) / ONSET_BINS;
+        this.bestScore = score; this.bestBpm = bpm; this.bestPh = (mb + 0.5 + off) / ONSET_BINS; this.bestMean = mean; this.bestPk = mx; this.foldB.set(C);
+        let sx = 0, sb = 0; for (let b = 0; b < ONSET_BINS; b++) { const v = this.foldMean(b); if (v > sx) { sx = v; sb = b; } }
+        const dd = Math.abs(sb - mb), dk = dd < ONSET_BINS - dd ? dd : ONSET_BINS - dd;
+        if (dk <= PH_W && sx > 0) { const a2 = this.foldMean(sb - 1), d2 = this.foldMean(sb + 1), de = a2 - 2 * sx + d2; let l = (sb + 0.5 + (de < 0 ? 0.5 * (a2 - d2) / de : 0)) / ONSET_BINS - this.bestPh; l -= Math.round(l); this.bestLag = l; }
+        else this.bestLag = NaN;
       }
     }
     if (c < this.scanEnd || this.bestScore < ONSET_MIN_PEAK) return;
     if (this.tempoBpm > 0) this.bestBpm = Math.min(159.9, Math.max(80, this.bestBpm));
     if (this.tempoBpm > 0 && Math.abs(this.bestBpm / this.tempoBpm - 1) > TG_FINE_MAX) { this.scanFar = this.bestBpm; return; }
     const oldMs = 60000 / beat.bpm, idx = Math.floor((now - beat.anchorMs) / oldMs), fr = (now - beat.anchorMs) / oldMs - idx;
-    const nb = 60000 / this.bestBpm;
+    const nb = 60000 / this.bestBpm, jump = Math.abs(this.bestBpm / beat.bpm - 1) > PL_JUMP;
     beat.bpm = this.bestBpm; beat.anchorMs = now - (idx + fr) * nb;
     const shift = ((((beat.anchorMs - ref) % nb) + nb) % nb) / nb;
-    let err = this.bestPh - shift; err -= Math.round(err);
+    if (this.bestLag === this.bestLag) { const l = this.phLag + PH_LAG_A * (this.bestLag * nb - this.phLag); this.phLag = l > PH_LAG_MAX ? PH_LAG_MAX : l < -PH_LAG_MAX ? -PH_LAG_MAX : l; }
+    const lag = this.phLag / nb; let err = this.bestPh + lag - shift; err -= Math.round(err);
+    if (this.phAcq || jump) { this.phAcq = false; this.phFar = 0; }
+    else {
+      const F = this.foldB, s0 = shift - lag, c0 = Math.floor((s0 - Math.floor(s0)) * ONSET_BINS); let lb = c0, lv = -1;
+      for (let d = -PL_CAP; d <= PL_CAP; d++) { const q = (c0 + d + ONSET_BINS) % ONSET_BINS; if (F[q] > lv) { lv = F[q]; lb = c0 + d; } }
+      const a = F[(lb - 1 + ONSET_BINS) % ONSET_BINS], cc = F[(lb + ONSET_BINS) % ONSET_BINS], d2 = F[(lb + 1 + ONSET_BINS) % ONSET_BINS], den = a - 2 * cc + d2;
+      let le = (lb + 0.5 + (den < 0 ? 0.5 * (a - d2) / den : 0)) / ONSET_BINS + lag - shift; le -= Math.round(le);
+      const far = Math.abs(err) * ONSET_BINS > PL_CAP + 0.5 && this.bestPk >= lv * PL_HOLD;
+      if (far) { this.phFar = this.phFar > 0 && Math.abs(err - this.phFarE) * ONSET_BINS <= PL_CAP ? this.phFar + 1 : 1; this.phFarE = err; } else this.phFar = 0;
+      if (far && this.phFar >= PL_N) this.phFar = 0;
+      else { const k = (lv / this.bestMean - ONSET_MIN_PEAK) * PL_KS; err = le * (k > PL_KMAX ? PL_KMAX : k > 0 ? k : 0); }
+    }
     beat.anchorMs += err * nb;
     this.onsetFixes++;
   }
@@ -450,7 +486,7 @@ export class BeatFeed {
 
   /** LÅTGRÄNSEN. */
   private relock(soft: boolean): void {
-    this.tgReset(soft); this.barReset(); this.goodRep = 0; this.goodOn = 0; this.onNext = 0;
+    this.tgReset(soft); this.barReset(); this.goodRep = 0; this.goodOn = 0; this.onNext = 0; this.phAcq = true;
   }
 
   /** MINNET VID GRÄNSEN. */
@@ -522,6 +558,13 @@ export class BeatFeed {
     if (frame.kickAtMs > 0 && frame.kickAtMs !== this.kickRingLast) { this.kickRingLast = frame.kickAtMs; this.kickRing[this.kickRingPos] = frame.kickAtMs; this.kickRingPos = (this.kickRingPos + 1) & 63; if (this.kickRingN < 64) this.kickRingN++; }
     {
       const sa = frame.specAbs, db = 20 * Math.log10((sa?.sub ?? 0) + (sa?.kick ?? 0) + 1e-7);
+      { const H = this.phA, P = this.phP, o = this.risePos * PH_B, w = this.onPos * PH_B, V = this.phV;
+        for (let k = 0; k < PH_B; k++) {
+          const x = k === 0 ? sa?.sub ?? 0 : k === 1 ? sa?.kick ?? 0 : k === 2 ? sa?.bass ?? 0 : k === 3 ? sa?.lowMid ?? 0 : k === 4 ? sa?.mid ?? 0 : (sa?.highMid ?? 0) + (sa?.treble ?? 0);
+          const r = x - H[o + k], u = r > 0 ? r : 0; H[o + k] = x;
+          if (this.onHalf) V[w + k] = u > P[k] ? u : P[k];
+          P[k] = u;
+        } }
       const old = this.riseDb[this.risePos]; this.riseDb[this.risePos] = db; this.risePos = (this.risePos + 1) % FEED_RISE_HOPS;
       const ok = old !== 0 && db > old ? db - old : 0;
       const hi = (frame.onset?.highMid ?? 0) + (frame.onset?.treble ?? 0);
@@ -529,7 +572,7 @@ export class BeatFeed {
         this.onPos = (this.onPos + 1) % ONSET_RING; if (this.onN < ONSET_RING) this.onN++; }
       this.onPrev = ok; this.hiPrev = hi; this.onHalf = !this.onHalf;
       this.tgStep(now);
-      if (!cfg.beat && this.tempoBpm > 0) cfg.beat = { anchorMs: frame.beatAnchorMs || now, bpm: this.tempoBpm, confidence: 0 };
+      if (!cfg.beat && this.tempoBpm > 0) { cfg.beat = { anchorMs: frame.beatAnchorMs || now, bpm: this.tempoBpm, confidence: 0 }; this.phAcq = true; }
       this.onsetStep(cfg, now);
     }
     if (cfg.beat) this.barStep(frame, cfg.beat, now);
diff --git a/src/split.ts b/.arena/takt/j0b/src/split.ts
index 3997f13..082039d 100644
--- a/src/split.ts
+++ b/.arena/takt/j0b/src/split.ts
@@ -137,12 +137,12 @@ export const BS_SEQ = 0, BS_BODY = 1, BS_DROPS = 2, BS_MINI = 3, BS_BUILD = 4, B
 export const BIG_STATE_LEN = 24;
 export const SPEC_SLOTS = 16, SPEC_MAX = 1024;   // 16 spektra
 
-export const HOP_REC_LEN = 19;   // TAKTVÄGEN
+export const HOP_REC_LEN = 22;   // TAKTVÄGEN
 export const HOP_RING_N = 4096;
 export const H_SEQ = 0, H_NOW = 1 , H_TS = 2 ,
   H_BPM = 3, H_CONF = 4, H_ANCHOR = 5, H_KICKAT = 6, H_BARSHIFT = 7, H_ON_KICK = 8, H_ON_HIMID = 9, H_ON_TREBLE = 10, H_SA_SUB = 11, H_SA_KICK = 12, H_SA_BASS = 13 ,
   H_BOUND = 14 , H_QUIET = 15 ,
-  H_SURE = 16 , H_UNDER = 17 , H_SA_TREBLE = 18;
+  H_SURE = 16 , H_UNDER = 17 , H_SA_TREBLE = 18, H_SA_LOWMID = 19, H_SA_MID = 20, H_SA_HIMID = 21;
 export const C_HOP_WRITE = 4, C_HOP_READ = 5, C_FEED_SEQ = 6 , C_WAKE = 7 ;
 export const FS_HOP_SEQ = 0, FS_BEAT = 1 , FS_ANCHOR = 2, FS_BPM = 3, FS_BCONF = 4,
   FS_BEATERR = 5 , FS_FCONF = 6 , FS_GRID = 7 ,
@@ -153,7 +153,7 @@ export const FEED_STATE_LEN = 20;
 
 /** Det taktmatningen läser ur ramen, och det den skriver. */
 export interface HopFrame { bpm: number; bpmConfidence: number; beatAnchorMs: number; kickAtMs: number; barShift: number; beatTrust?: number;
-  onset: { kick: number; highMid: number; treble: number }; specAbs: { sub: number; kick: number; bass: number; treble: number } }
+  onset: { kick: number; highMid: number; treble: number }; specAbs: { sub: number; kick: number; bass: number; treble: number; lowMid: number; mid: number; highMid: number } }
 export interface HopGrid { anchorMs: number; bpm: number; confidence?: number }
 export interface HopCfg { beat?: HopGrid | null; beatErr?: number }
 export interface HopTarget { resetTempo(): void; resetBar(): void; setClockGrid?(g: HopGrid | null): void; trackBoundaries?: number; quietMs?: number; boundSure?: boolean; bodyUnderDb?: number;
@@ -181,6 +181,7 @@ export class HopLaneFast {
     r[o + H_BPM] = f.bpm; r[o + H_CONF] = f.bpmConfidence; r[o + H_ANCHOR] = f.beatAnchorMs; r[o + H_KICKAT] = f.kickAtMs; r[o + H_BARSHIFT] = f.barShift;
     r[o + H_ON_KICK] = f.onset?.kick ?? 0; r[o + H_ON_HIMID] = f.onset?.highMid ?? 0; r[o + H_ON_TREBLE] = f.onset?.treble ?? 0;
     r[o + H_SA_SUB] = f.specAbs?.sub ?? 0; r[o + H_SA_KICK] = f.specAbs?.kick ?? 0; r[o + H_SA_BASS] = f.specAbs?.bass ?? 0; r[o + H_SA_TREBLE] = f.specAbs?.treble ?? 0;
+    r[o + H_SA_LOWMID] = f.specAbs?.lowMid ?? 0; r[o + H_SA_MID] = f.specAbs?.mid ?? 0; r[o + H_SA_HIMID] = f.specAbs?.highMid ?? 0;
     r[o + H_BOUND] = an.trackBoundaries ?? 0; r[o + H_QUIET] = an.quietMs ?? 0; r[o + H_SURE] = an.boundSure ? 1 : 0; r[o + H_UNDER] = an.bodyUnderDb ?? 0;
     r[o + H_SEQ] = seq;
     Atomics.store(ctrl, C_HOP_WRITE, seqLow(seq)); Atomics.add(ctrl, C_WAKE, 1);
@@ -222,7 +223,7 @@ export class HopLaneSlow {
   private seq: number; private rt: number; private rb: number; private processed: number;
   private skipped = 0; private lagMaxMs = 0; private busyEmaUs = 0; private busyMaxUs = 0; private fconf = NaN;
   private readonly fr = { bpm: 0.5, bpmConfidence: 0.5, beatAnchorMs: 0.5, kickAtMs: 0.5, barShift: 0.5,
-    onset: { kick: 0.5, highMid: 0.5, treble: 0.5 }, specAbs: { sub: 0.5, kick: 0.5, bass: 0.5, treble: 0.5 } };
+    onset: { kick: 0.5, highMid: 0.5, treble: 0.5 }, specAbs: { sub: 0.5, kick: 0.5, bass: 0.5, treble: 0.5, lowMid: 0.5, mid: 0.5, highMid: 0.5 } };
   private readonly cfg: HopCfg = { beat: undefined, beatErr: undefined };
   private grid: HopGrid | null = null;
   private readonly target: HopTarget = { trackBoundaries: 0, quietMs: 0, resetTempo: () => { this.rt++; }, resetBar: () => { this.rb++; }, setClockGrid: (g) => { this.grid = g; } };
@@ -245,6 +246,7 @@ export class HopLaneSlow {
       fr.bpm = r[o + H_BPM]; fr.bpmConfidence = r[o + H_CONF]; fr.beatAnchorMs = r[o + H_ANCHOR]; fr.kickAtMs = r[o + H_KICKAT]; fr.barShift = r[o + H_BARSHIFT];
       fr.onset.kick = r[o + H_ON_KICK]; fr.onset.highMid = r[o + H_ON_HIMID]; fr.onset.treble = r[o + H_ON_TREBLE];
       fr.specAbs.sub = r[o + H_SA_SUB]; fr.specAbs.kick = r[o + H_SA_KICK]; fr.specAbs.bass = r[o + H_SA_BASS]; fr.specAbs.treble = r[o + H_SA_TREBLE];
+      fr.specAbs.lowMid = r[o + H_SA_LOWMID]; fr.specAbs.mid = r[o + H_SA_MID]; fr.specAbs.highMid = r[o + H_SA_HIMID];
       const cin = fr.bpmConfidence;
       this.feed.update(fr, this.cfg, this.target, r[o + H_NOW]);
       this.fconf = fr.bpmConfidence !== cin ? fr.bpmConfidence : NaN;
```

## Diffen j0 (referens, förkastad): `git diff --no-index src .arena/takt/j0/src`
```diff
diff --git a/src/analyserClock.ts b/.arena/takt/j0/src/analyserClock.ts
index 0bbcb78..9ec9191 100644
--- a/src/analyserClock.ts
+++ b/.arena/takt/j0/src/analyserClock.ts
@@ -23,6 +23,7 @@ const TRUST_REPEAT_BEATS = 2, TRUST_REPEAT_TOL = 0.06;   // TILLITEN
 const TRUST_UP = Number(process.env.DMX_TRUST_UP || '0.12'), TRUST_LEAK_MS = Number(process.env.DMX_TRUST_LEAK_MS || '4000');   // PROVRATTAR 2026-11-07
 const ONSET_WIN_MS = 5000, ONSET_EVERY_MS = 250, ONSET_BINS = 48, ONSET_RING = 1024, ONSET_MIN_PEAK = 1.5;   // LÖPANDE TAKT
 const FEED_RISE_HOPS = 6;   // BASENS STIGNING
+const PH_B = 6, PH_W = 4, PH_LAG_A = 0.05, PH_LAG_MAX = 30;   // FASEN UR BANDEN (a6)
 const BREAK_HOLD_MS = 20000;   // TVÅ RUTNÄT
 const BREAK_RESTORE_MS = Number(process.env.DMX_BREAK_RESTORE_MS ?? String(BREAK_HOLD_MS));
 const BAR_DECAY = 0.99, BAR_MIN = 16, BAR_MARGIN = 0.06, BAR_W_BASS = 0.5, BAR_WIN0 = -0.2, BAR_WIN1 = 0.3, BAR_RISE_HOPS = 6, BAR_R_MAX = 2, BAR_W_BEAT = 0.25, BAR_Q = 8, BAR_BEAT_Q = 2;   // ETTAN I EFFEKTKLOCKANS RUTNÄT
@@ -41,6 +42,7 @@ const HV_R = [4 / 3, 3 / 4, 3 / 2, 2 / 3, 5 / 4, 4 / 5], HV_K = 1.25, HV_N = 5,
 const PW_RING = 4096, PW_WIN_MS = 10000, PW_MIN = 0.5, PW_Q = [4 / 3, 3 / 4, 3 / 2, 2 / 3];   // TAKTENS SJÄLVLIKHET
 const TG_K = 139, TG_STEP = Math.pow(2, 1 / TG_K), TG_PER_HOP = 1, TG_A = 0.21, TG_MIN_N = 300, TG_FINE = 0.0025, TG_HALF = ONSET_BINS >> 1;
 const TG_FINE_MAX = 0.0125;   // FINTEMPOTS BAND
+const FRESH_MS = 8000, FRESH_TEMPO = 0.04, JUMP_FRAC = 0.12, LM_TAU_MS = 10000, LM_K = 1.2;   // DET TRÖTTA LÅSET (a5)
 
 /** FAS-PREDIKTIONSTILLIT. */
 export function publishPhase(f: { beatPhaseMs: number; beatPhaseConf: number; barShift: number }, b: ClockCfg["beat"], barKnown: boolean,
@@ -67,6 +69,9 @@ export class BeatFeed {
   private readonly onT = new Float64Array(ONSET_RING); private readonly onV = new Float32Array(ONSET_RING); private readonly hiV = new Float32Array(ONSET_RING); private hiPrev = 0; private onPos = 0; private onN = 0; private onHalf = false; private onPrev = 0;   // LÖPANDE TAKT
   private readonly foldS = new Float64Array(ONSET_BINS); private readonly foldN = new Float64Array(ONSET_BINS); private onNext = 0;
   onsetFixes = 0;
+  private readonly phV = new Float32Array(ONSET_RING * PH_B); private readonly phA = new Float64Array(FEED_RISE_HOPS * PH_B); private readonly phP = new Float64Array(PH_B);   // FASEN UR BANDEN
+  private readonly phF = new Float64Array(ONSET_BINS * PH_B); private readonly phC = new Float64Array(ONSET_BINS);
+  private readonly phWt = new Float64Array(PH_B); private readonly phWb = new Float64Array(PH_B); private readonly phWc = new Float64Array(PH_B);   // bandvikterna: senaste, bästa, lagda
   private readonly riseDb = new Float64Array(FEED_RISE_HOPS); private risePos = 0;
   private readonly fullS = new Float64Array(ONSET_BINS); private readonly fullN = new Float64Array(ONSET_BINS);   // HELA TEMPOOMRÅDET
   private readonly tgAcc = new Float64Array(TG_K).fill(-1); private readonly tgH = new Float64Array(ONSET_BINS); private tgK = 0; private tgN = 0;
@@ -98,9 +103,24 @@ export class BeatFeed {
   static analyserCfg<T extends object>(cfg: T): T { return { ...cfg, beat: null }; }
 
   private foldMean(k: number): number { const q = (k + ONSET_BINS) % ONSET_BINS; return this.foldN[q] ? this.foldS[q] / this.foldN[q] : 0; }
+  /** FASEN UR BANDEN. */
+  private phFold(): number {
+    const F = this.phF, N = this.foldN, C = this.phC; C.fill(0); this.phWt.fill(0); let any = false;
+    for (let k = 0; k < PH_B; k++) {
+      let mu = 0, mx = 0;
+      for (let b = 0; b < ONSET_BINS; b++) { const v = N[b] ? F[b * PH_B + k] / N[b] : 0; mu += v; if (v > mx) mx = v; }
+      mu /= ONSET_BINS; if (!(mu > 0)) continue;
+      const w = (mx / mu - 1) / mu; any = true; this.phWt[k] = w;
+      for (let b = 0; b < ONSET_BINS; b++) if (N[b]) C[b] += w * F[b * PH_B + k] / N[b];
+    }
+    if (!any) return 0;
+    let m = 0; for (let b = 0; b < ONSET_BINS; b++) m += C[b];
+    return m / ONSET_BINS;
+  }
 
   private scanStep = 0.005; private scanC = 99; private scanEnd = 0; private scanRef = 0; private scanNow = 0; private scanC0 = 0;   // Sökningen sprids över hoppen
-  private bestScore = 0; private bestBpm = 0; private bestPh = 0; private scanFar = 0;
+  private bestScore = 0; private bestBpm = 0; private bestPh = 0; private scanFar = 0; private bestLag = NaN; private phLag = 0;
+  private freshTo = 0; jumpVetos = 0; private readonly lm = new Float64Array(ONSET_BINS); private readonly lmTmp = new Float64Array(ONSET_BINS); private lmT = 0;   // DET TRÖTTA LÅSET
 
   /** LÖPANDE TAKT. */
   private onsetStep(cfg: EngineConfig, now: number): void {
@@ -110,6 +130,7 @@ export class BeatFeed {
       this.onNext = now + ONSET_EVERY_MS;
       this.scanRef = beat.anchorMs; this.scanNow = now;
       const cb = this.scanFar > 0 ? this.scanFar : beat.bpm; this.scanFar = 0;
+      if (this.tempoBpm > 0 && Math.abs(cb / this.tempoBpm - 1) > FRESH_TEMPO) this.freshTo = now + FRESH_MS;
       if (this.tempoBpm > 0 && Math.abs(cb / this.tempoBpm - 1) > TG_FINE_MAX) { this.scanC0 = this.tempoBpm; this.scanStep = TG_FINE; this.scanEnd = 5; }
       else if (this.tempoBpm > 0) { this.scanC0 = cb; this.scanStep = 0.005; this.scanEnd = 5; }
       else { this.scanC0 = beat.bpm; this.scanStep = 0.005; this.scanEnd = 5; }
@@ -118,23 +139,28 @@ export class BeatFeed {
     }
     const c = this.scanC++, ref = this.scanRef;
     const bpm = this.scanC0 * (1 + c * this.scanStep), bm = 60000 / bpm;
-    this.foldS.fill(0); this.foldN.fill(0);
-    let tot = 0, n = 0;
+    this.foldS.fill(0); this.foldN.fill(0); this.phF.fill(0);
+    let tot = 0, n = 0; const PV = this.phV, PF = this.phF;
     for (let i = 0; i < this.onN; i++) {
       const j = (this.onPos - 1 - i + ONSET_RING) % ONSET_RING, t = this.onT[j];
       if (t > this.scanNow) continue;
       if (this.scanNow - t > ONSET_WIN_MS) break;
       const r = (t - ref) % bm, b = Math.floor(((r < 0 ? r + bm : r) / bm) * ONSET_BINS) % ONSET_BINS;
       this.foldS[b] += this.onV[j]; this.foldN[b]++; tot += this.onV[j]; n++;
+      const o = b * PH_B, q = j * PH_B; for (let k = 0; k < PH_B; k++) PF[o + k] += PV[q + k];
     }
     if (n >= 100 && tot > 0) {
-      const mean = tot / n; let mx = 0, mb = 0;
-      for (let b = 0; b < ONSET_BINS; b++) { const v = this.foldN[b] ? this.foldS[b] / this.foldN[b] : 0; if (v > mx) { mx = v; mb = b; } }
-      const score = (mx / mean) * (c === 0 && this.scanStep === 0.005 ? SCAN_HOLD : 1);
+      const mean = this.phFold(), C = this.phC; let mx = 0, mb = 0;
+      for (let b = 0; b < ONSET_BINS; b++) { const v = C[b]; if (v > mx) { mx = v; mb = b; } }
+      const score = mean > 0 ? (mx / mean) * (c === 0 && this.scanStep === 0.005 ? SCAN_HOLD : 1) : 0;
       if (score > this.bestScore) {
-        const a = this.foldMean(mb - 1), cc = this.foldMean(mb), d = this.foldMean(mb + 1), den = a - 2 * cc + d;
+        const a = C[(mb + ONSET_BINS - 1) % ONSET_BINS], cc = C[mb], d = C[(mb + 1) % ONSET_BINS], den = a - 2 * cc + d;
         const off = den < 0 ? 0.5 * (a - d) / den : 0;
-        this.bestScore = score; this.bestBpm = bpm; this.bestPh = (mb + 0.5 + off) / ONSET_BINS;
+        this.bestScore = score; this.bestBpm = bpm; this.bestPh = (mb + 0.5 + off) / ONSET_BINS; this.phWb.set(this.phWt);
+        let sx = 0, sb = 0; for (let b = 0; b < ONSET_BINS; b++) { const v = this.foldMean(b); if (v > sx) { sx = v; sb = b; } }
+        const dd = Math.abs(sb - mb), dk = dd < ONSET_BINS - dd ? dd : ONSET_BINS - dd;
+        if (dk <= PH_W && sx > 0) { const a2 = this.foldMean(sb - 1), d2 = this.foldMean(sb + 1), de = a2 - 2 * sx + d2; let l = (sb + 0.5 + (de < 0 ? 0.5 * (a2 - d2) / de : 0)) / ONSET_BINS - this.bestPh; l -= Math.round(l); this.bestLag = l; }
+        else this.bestLag = NaN;
       }
     }
     if (c < this.scanEnd || this.bestScore < ONSET_MIN_PEAK) return;
@@ -144,11 +170,30 @@ export class BeatFeed {
     const nb = 60000 / this.bestBpm;
     beat.bpm = this.bestBpm; beat.anchorMs = now - (idx + fr) * nb;
     const shift = ((((beat.anchorMs - ref) % nb) + nb) % nb) / nb;
-    let err = this.bestPh - shift; err -= Math.round(err);
-    beat.anchorMs += err * nb;
+    if (this.bestLag === this.bestLag) { const l = this.phLag + PH_LAG_A * (this.bestLag * nb - this.phLag); this.phLag = l > PH_LAG_MAX ? PH_LAG_MAX : l < -PH_LAG_MAX ? -PH_LAG_MAX : l; }
+    const lag = this.phLag / nb; let err = this.bestPh + lag - shift; err -= Math.round(err);
+    const big = err >= JUMP_FRAC || err <= -JUMP_FRAC; this.phWc.set(this.phWb);
+    if (!big || now < this.freshTo || this.lmAt(err - lag) * LM_K >= this.lmAt(-lag)) { beat.anchorMs += err * nb; if (big) this.lmTurn(err); } else this.jumpVetos++;
     this.onsetFixes++;
   }
 
+  /** DET TRÖTTA LÅSET: fasminnet röstar mellan nuvarande fas och hoppet. */
+  private lmAt(ph: number): number {
+    const c = Math.round(ph * ONSET_BINS); let v = 0;
+    for (let d = -2; d <= 2; d++) { const x = this.lm[(((c + d) % ONSET_BINS) + ONSET_BINS) % ONSET_BINS]; if (x > v) v = x; }
+    return v;
+  }
+  private lmTurn(err: number): void {
+    const r = Math.round(err * ONSET_BINS), L = this.lm, T = this.lmTmp; T.set(L);
+    for (let b = 0; b < ONSET_BINS; b++) L[b] = T[(((b + r) % ONSET_BINS) + ONSET_BINS) % ONSET_BINS];
+  }
+  private lmAdd(now: number, b: { anchorMs: number; bpm: number }, v: number): void {
+    const per = 60000 / b.bpm; let p = (now - b.anchorMs) / per; p -= Math.floor(p);
+    const dec = this.lmT > 0 && now > this.lmT ? Math.exp(-(now - this.lmT) / LM_TAU_MS) : 1; this.lmT = now;
+    const L = this.lm; for (let i = 0; i < ONSET_BINS; i++) L[i] *= dec;
+    L[Math.floor(p * ONSET_BINS) % ONSET_BINS] += v;
+  }
+
   /** EN TEMPOSÖKNING. */
   private tgScore(bpm: number, now: number, win = TG_WIN_MS): number {
     const S = this.fullS, N = this.fullN, Hs = this.tgH, oT = this.onT, oV = this.onV, oH = this.hiV; S.fill(0); N.fill(0); Hs.fill(0);
@@ -449,8 +494,8 @@ export class BeatFeed {
   }
 
   /** LÅTGRÄNSEN. */
-  private relock(soft: boolean): void {
-    this.tgReset(soft); this.barReset(); this.goodRep = 0; this.goodOn = 0; this.onNext = 0;
+  private relock(soft: boolean, now: number): void {
+    this.freshTo = now + FRESH_MS; this.lm.fill(0); this.tgReset(soft); this.barReset(); this.goodRep = 0; this.goodOn = 0; this.onNext = 0;
   }
 
   /** MINNET VID GRÄNSEN. */
@@ -467,8 +512,8 @@ export class BeatFeed {
     this.sure = !!an.boundSure; if ((an.bodyUnderDb ?? 0) >= TG_BRK_DB) this.brkAt = now;
     const nb = an.trackBoundaries ?? 0;
     const q = (an.quietMs ?? 0) >= BND_QUIET_BEATS * 60000 / (this.innerBpm > 80 ? this.innerBpm : 80); if (q) this.quietAt = now;
-    if (nb !== this.boundSeen) { this.boundSeen = nb; this.pend = this.sameSong(now); if (!this.pend) this.relock(!this.sure && !((an.quietMs ?? 0) > 0)); }
-    else if (this.pend && (q || now - this.brkAt >= TG_WIN_MS)) { this.pend = false; if (q) this.relock(false); }   // tystnar låten i breaket var gränsen sann
+    if (nb !== this.boundSeen) { this.boundSeen = nb; this.pend = this.sameSong(now); if (!this.pend) this.relock(!this.sure && !((an.quietMs ?? 0) > 0), now); }
+    else if (this.pend && (q || now - this.brkAt >= TG_WIN_MS)) { this.pend = false; if (q) this.relock(false, now); }   // tystnar låten i breaket var gränsen sann
     if (cfg.beat && this.innerValid) { cfg.beat.anchorMs = this.innerAnchor; cfg.beat.bpm = this.innerBpm; }
     this.updateInner(frame, cfg, now, an.quietMs ?? 0);
     const b = cfg.beat;
@@ -522,14 +567,21 @@ export class BeatFeed {
     if (frame.kickAtMs > 0 && frame.kickAtMs !== this.kickRingLast) { this.kickRingLast = frame.kickAtMs; this.kickRing[this.kickRingPos] = frame.kickAtMs; this.kickRingPos = (this.kickRingPos + 1) & 63; if (this.kickRingN < 64) this.kickRingN++; }
     {
       const sa = frame.specAbs, db = 20 * Math.log10((sa?.sub ?? 0) + (sa?.kick ?? 0) + 1e-7);
+      { const H = this.phA, P = this.phP, o = this.risePos * PH_B, w = this.onPos * PH_B, V = this.phV;
+        for (let k = 0; k < PH_B; k++) {
+          const x = k === 0 ? sa?.sub ?? 0 : k === 1 ? sa?.kick ?? 0 : k === 2 ? sa?.bass ?? 0 : k === 3 ? sa?.lowMid ?? 0 : k === 4 ? sa?.mid ?? 0 : (sa?.highMid ?? 0) + (sa?.treble ?? 0);
+          const r = x - H[o + k], u = r > 0 ? r : 0; H[o + k] = x;
+          if (this.onHalf) V[w + k] = u > P[k] ? u : P[k];
+          P[k] = u;
+        } }
       const old = this.riseDb[this.risePos]; this.riseDb[this.risePos] = db; this.risePos = (this.risePos + 1) % FEED_RISE_HOPS;
       const ok = old !== 0 && db > old ? db - old : 0;
       const hi = (frame.onset?.highMid ?? 0) + (frame.onset?.treble ?? 0);
-      if (this.onHalf) { this.onT[this.onPos] = now; this.onV[this.onPos] = ok > this.onPrev ? ok : this.onPrev; this.hiV[this.onPos] = hi > this.hiPrev ? hi : this.hiPrev; this.pwT[this.pwPos] = now; this.pwE[this.pwPos] = this.onV[this.onPos]; this.pwH[this.pwPos] = this.hiV[this.onPos]; this.pwPos = (this.pwPos + 1) & (PW_RING - 1); if (this.pwN < PW_RING) this.pwN++;
+      if (this.onHalf) { this.onT[this.onPos] = now; this.onV[this.onPos] = ok > this.onPrev ? ok : this.onPrev; this.hiV[this.onPos] = hi > this.hiPrev ? hi : this.hiPrev; this.pwT[this.pwPos] = now; this.pwE[this.pwPos] = this.onV[this.onPos]; this.pwH[this.pwPos] = this.hiV[this.onPos]; if (cfg.beat && cfg.beat.bpm > 0) { let v = 0; for (let k = 0; k < PH_B; k++) v += this.phWc[k] * this.phV[this.onPos * PH_B + k]; this.lmAdd(now, cfg.beat, v); } this.pwPos = (this.pwPos + 1) & (PW_RING - 1); if (this.pwN < PW_RING) this.pwN++;
         this.onPos = (this.onPos + 1) % ONSET_RING; if (this.onN < ONSET_RING) this.onN++; }
       this.onPrev = ok; this.hiPrev = hi; this.onHalf = !this.onHalf;
       this.tgStep(now);
-      if (!cfg.beat && this.tempoBpm > 0) cfg.beat = { anchorMs: frame.beatAnchorMs || now, bpm: this.tempoBpm, confidence: 0 };
+      if (!cfg.beat && this.tempoBpm > 0) { cfg.beat = { anchorMs: frame.beatAnchorMs || now, bpm: this.tempoBpm, confidence: 0 }; this.freshTo = now + FRESH_MS; this.lm.fill(0); }
       this.onsetStep(cfg, now);
     }
     if (cfg.beat) this.barStep(frame, cfg.beat, now);
diff --git a/src/split.ts b/.arena/takt/j0/src/split.ts
index 3997f13..082039d 100644
--- a/src/split.ts
+++ b/.arena/takt/j0/src/split.ts
@@ -137,12 +137,12 @@ export const BS_SEQ = 0, BS_BODY = 1, BS_DROPS = 2, BS_MINI = 3, BS_BUILD = 4, B
 export const BIG_STATE_LEN = 24;
 export const SPEC_SLOTS = 16, SPEC_MAX = 1024;   // 16 spektra
 
-export const HOP_REC_LEN = 19;   // TAKTVÄGEN
+export const HOP_REC_LEN = 22;   // TAKTVÄGEN
 export const HOP_RING_N = 4096;
 export const H_SEQ = 0, H_NOW = 1 , H_TS = 2 ,
   H_BPM = 3, H_CONF = 4, H_ANCHOR = 5, H_KICKAT = 6, H_BARSHIFT = 7, H_ON_KICK = 8, H_ON_HIMID = 9, H_ON_TREBLE = 10, H_SA_SUB = 11, H_SA_KICK = 12, H_SA_BASS = 13 ,
   H_BOUND = 14 , H_QUIET = 15 ,
-  H_SURE = 16 , H_UNDER = 17 , H_SA_TREBLE = 18;
+  H_SURE = 16 , H_UNDER = 17 , H_SA_TREBLE = 18, H_SA_LOWMID = 19, H_SA_MID = 20, H_SA_HIMID = 21;
 export const C_HOP_WRITE = 4, C_HOP_READ = 5, C_FEED_SEQ = 6 , C_WAKE = 7 ;
 export const FS_HOP_SEQ = 0, FS_BEAT = 1 , FS_ANCHOR = 2, FS_BPM = 3, FS_BCONF = 4,
   FS_BEATERR = 5 , FS_FCONF = 6 , FS_GRID = 7 ,
@@ -153,7 +153,7 @@ export const FEED_STATE_LEN = 20;
 
 /** Det taktmatningen läser ur ramen, och det den skriver. */
 export interface HopFrame { bpm: number; bpmConfidence: number; beatAnchorMs: number; kickAtMs: number; barShift: number; beatTrust?: number;
-  onset: { kick: number; highMid: number; treble: number }; specAbs: { sub: number; kick: number; bass: number; treble: number } }
+  onset: { kick: number; highMid: number; treble: number }; specAbs: { sub: number; kick: number; bass: number; treble: number; lowMid: number; mid: number; highMid: number } }
 export interface HopGrid { anchorMs: number; bpm: number; confidence?: number }
 export interface HopCfg { beat?: HopGrid | null; beatErr?: number }
 export interface HopTarget { resetTempo(): void; resetBar(): void; setClockGrid?(g: HopGrid | null): void; trackBoundaries?: number; quietMs?: number; boundSure?: boolean; bodyUnderDb?: number;
@@ -181,6 +181,7 @@ export class HopLaneFast {
     r[o + H_BPM] = f.bpm; r[o + H_CONF] = f.bpmConfidence; r[o + H_ANCHOR] = f.beatAnchorMs; r[o + H_KICKAT] = f.kickAtMs; r[o + H_BARSHIFT] = f.barShift;
     r[o + H_ON_KICK] = f.onset?.kick ?? 0; r[o + H_ON_HIMID] = f.onset?.highMid ?? 0; r[o + H_ON_TREBLE] = f.onset?.treble ?? 0;
     r[o + H_SA_SUB] = f.specAbs?.sub ?? 0; r[o + H_SA_KICK] = f.specAbs?.kick ?? 0; r[o + H_SA_BASS] = f.specAbs?.bass ?? 0; r[o + H_SA_TREBLE] = f.specAbs?.treble ?? 0;
+    r[o + H_SA_LOWMID] = f.specAbs?.lowMid ?? 0; r[o + H_SA_MID] = f.specAbs?.mid ?? 0; r[o + H_SA_HIMID] = f.specAbs?.highMid ?? 0;
     r[o + H_BOUND] = an.trackBoundaries ?? 0; r[o + H_QUIET] = an.quietMs ?? 0; r[o + H_SURE] = an.boundSure ? 1 : 0; r[o + H_UNDER] = an.bodyUnderDb ?? 0;
     r[o + H_SEQ] = seq;
     Atomics.store(ctrl, C_HOP_WRITE, seqLow(seq)); Atomics.add(ctrl, C_WAKE, 1);
@@ -222,7 +223,7 @@ export class HopLaneSlow {
   private seq: number; private rt: number; private rb: number; private processed: number;
   private skipped = 0; private lagMaxMs = 0; private busyEmaUs = 0; private busyMaxUs = 0; private fconf = NaN;
   private readonly fr = { bpm: 0.5, bpmConfidence: 0.5, beatAnchorMs: 0.5, kickAtMs: 0.5, barShift: 0.5,
-    onset: { kick: 0.5, highMid: 0.5, treble: 0.5 }, specAbs: { sub: 0.5, kick: 0.5, bass: 0.5, treble: 0.5 } };
+    onset: { kick: 0.5, highMid: 0.5, treble: 0.5 }, specAbs: { sub: 0.5, kick: 0.5, bass: 0.5, treble: 0.5, lowMid: 0.5, mid: 0.5, highMid: 0.5 } };
   private readonly cfg: HopCfg = { beat: undefined, beatErr: undefined };
   private grid: HopGrid | null = null;
   private readonly target: HopTarget = { trackBoundaries: 0, quietMs: 0, resetTempo: () => { this.rt++; }, resetBar: () => { this.rb++; }, setClockGrid: (g) => { this.grid = g; } };
@@ -245,6 +246,7 @@ export class HopLaneSlow {
       fr.bpm = r[o + H_BPM]; fr.bpmConfidence = r[o + H_CONF]; fr.beatAnchorMs = r[o + H_ANCHOR]; fr.kickAtMs = r[o + H_KICKAT]; fr.barShift = r[o + H_BARSHIFT];
       fr.onset.kick = r[o + H_ON_KICK]; fr.onset.highMid = r[o + H_ON_HIMID]; fr.onset.treble = r[o + H_ON_TREBLE];
       fr.specAbs.sub = r[o + H_SA_SUB]; fr.specAbs.kick = r[o + H_SA_KICK]; fr.specAbs.bass = r[o + H_SA_BASS]; fr.specAbs.treble = r[o + H_SA_TREBLE];
+      fr.specAbs.lowMid = r[o + H_SA_LOWMID]; fr.specAbs.mid = r[o + H_SA_MID]; fr.specAbs.highMid = r[o + H_SA_HIMID];
       const cin = fr.bpmConfidence;
       this.feed.update(fr, this.cfg, this.target, r[o + H_NOW]);
       this.fconf = fr.bpmConfidence !== cin ? fr.bpmConfidence : NaN;
```
