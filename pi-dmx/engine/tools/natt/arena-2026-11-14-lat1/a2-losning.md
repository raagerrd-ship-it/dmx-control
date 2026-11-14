# a2 – RYTMEN SOM VITTNE (låtgränsen)

## IDÉN
Låtgränsdetektorn mäter själv pulsens period ur spektrum (anslagsstyrkan i 24 band per stor-FFT, dess självlikhet 1–4 slag bort över 6 s) och säger låtgräns när låtens etablerade puls är BORTA och en annan period har stått i 3 s; formen får bara tala när låten aldrig haft en puls. En ny låt har en ny puls, medan break och uppbyggnad behåller låtens period – det kan formen (klang + tonart) inte skilja åt.

## DELAR
| del | fil | bär |
|---|---|---|
| 1. Pulsens vittne (`pushPulse`, `pComb`, `pulseDecide` -> `ny puls a->b`) | boundaryDetector | **latbyten** 3/4 -> 4/4; 130-skarven sägs 6,5 s efter i st f 20 s |
| 2. Formen tiger när låten har en puls (`&& !this.pRef`) | boundaryDetector | **falska** 1 -> 0, **takt** 201–204. Formen fyrar 200–212, 217–226 och 245–250 – tre ställen i SAMMA låt |
| 3. Break-hållet håller tempot som var LÅST ett fönster före breaket (`brkBefore`) – utanför kortet, egen del | analyserClock | **takt, utanfor**: klockan valde skräp medan basen tunnades ut (18–22 dB, under hållets 24) och hållet frös sedan skräpet 5–7 s |

Del 3 kom ur m1: takten efter en låtgräns är KAOTISK. Flyttas gränsen 10–30 ms slår 5–15 s takt om i breaken (klockan ensam, 9 förskjutningar, 171840: 489–510 rätt av 559 med både basens och mina gränser, medel 89,0 % – basens 91,1 % är en lyckosam gren). Medel över förskjutningar, 160345 / 171840: utan del 3 92,88 / 89,05 %, med 93,56 / 90,42 % (spridning 500–510).

## MARGINALER (±25 %, `--set`; domen = träffar, falska)
| gräns | värde | −25 % | +25 % | ändras domen? |
|---|---|---|---|---|
| P_CLEAR | 0,12 | 4/4, 0 | 4/4, 0 | nej |
| P_SAME | 0,03 | 4/4, 0 | 4/4, 0 | nej |
| P_GONE | 0,5 | 4/4, 0 | 4/4, 0 | nej |
| P_EST, P_HOLD | 6 | 4: 4/4, 0 | 8: 4/4, 0 | nej (±1 s) |
| P_FOLLOW | 0,1 | 4/4, 0 | 4/4, 0 | nej |
| P_N, P_ML | 768, 384 | 4/4, 0 | 4/4, 0 | nej (±1,5 s) |
| P_LO (oktaven) | 80 | 60: 4/4, 0 | 100: 4/4, 0 | nej (60: 406 sägs två gånger) |
| TG_BRK_BACK_MS | 5000 | 93,56 / 90,24 % | 93,55 / 90,42 % | nej |

Verklig marginal: i 900 s finns inget block inne i en låt där en annan period är bäst och låtens puls ligger under 0,75 av den (gränsen 0,5); vid bytena faller kvoten under 0,1 på 2 s. Detektorn startad på 75 ställen i filerna: 0 falska.

## SIFFRORNA
| | poäng | takt | fel s | utanför | låstid | låtbyten | falska | takt per fil | us/hopp |
|---|---|---|---|---|---|---|---|---|---|
| bas | 93,06 | 92,57 | 64 | 95,17 | 7,1 | 3/4 | 1 | 93,3 / 91,1 | 105 |
| m1 (del 1+2) | 93,22 | 90,94 | 78 | 94,35 | 7,2 | 4/4 | 0 | 93,5 / 85,7 | 269 |
| m2 (alla delar) | 95,06 | 92,80 | 62 | 95,10 | 7,4 | 4/4 | 0 | 94,2 / 90,0 | 288 |
| m3 (slutbygget = m2, lägre last) | **95,06** | 92,80 | 62 | 95,10 | 7,4 | 4/4 | 0 | 94,2 / 90,0 | 177 |

Gränser: 264 tystnad, 415 `140->130` / 137 `145->135`, 281 `135->90`. Drop som bas.
Sämre: m1 föll 15 s i 171840 (146–153, 219–229, olycklig gren). Låstiden vid 406: 8,6 -> 9,6 s. Ett anrop före m1 avbröts med felkod utan mätning. Kostnaden är maskinens last (CPU 100 %): mikrobänk 5,2 -> 9,3 us per spektrum = +1,4 us/hopp, inga allokeringar, 14 kB.

## RISKEN
- Låtbyte UTAN tempobyte (taktmixad mix): ingen gräns före maxlängden – klockan behöver ingen, men manuset byts inte. Formen tillbaka = ta bort `&& !this.pRef`, då återkommer breakets falska.
- Tempobyte mitt i en låt blir en låtgräns.
- 3:2/halvtempo: kravet är att låtens puls är borta, inte att bästa perioden bytts; lämnar en låt helt sitt rutnät i >3 s blir det en falsk gräns. Byte med exakt 2:1 syns inte.
- Tyst intro/tal: gränsen kommer först när nya pulsen stått 3 s (7–9 s efter skarven).
- Del 3: nya låtens baslösa intro inom 5 s efter klockans eget byte håller förra tempot tills gränsen kommer.

Förkastat: profilkorrelation (mönsterbyte i låten = 3:2-byte), formveto på 8 s (hårfint 214–226), kortare fönster, håll utan kravet LÅST (frös fel tempo 44–61).

## DIFFEN (`git diff --no-index src .arena/lat1/a2/src`; byte-exakt i `losning.diff`, källan har blandade radslut)
```diff
diff --git a/src/ANALYSER_SHARED.md5 b/.arena/lat1/a2/src/ANALYSER_SHARED.md5
index dbe0948..bbf0efa 100644
--- a/src/ANALYSER_SHARED.md5
+++ b/.arena/lat1/a2/src/ANALYSER_SHARED.md5
@@ -10,5 +10,5 @@ e92d0d6b4f8dc36abfb8135004260806 analyserLevel.ts
 dbb860c7483c4e7e938d610712337b96 analyserCharacter.ts
 a8846ca6595ddef8409a6ab432acf375 split.ts
 c7a59a6760df39770f3aca2332dac5c2 slowWorker.ts
-d0a49e4f782e81bdfdf8293eb0b45bf4 analyserClock.ts
+af4a7df27833e46cb1f429d3c8db969e analyserClock.ts
 d94c850c565827c9075e63127132213f recorder.ts
diff --git a/src/analyserClock.ts b/.arena/lat1/a2/src/analyserClock.ts
index cea56ed..167b842 100644
--- a/src/analyserClock.ts
+++ b/.arena/lat1/a2/src/analyserClock.ts
@@ -34,7 +34,7 @@ const TG_GRID_EXTRA_MS = 5;   // a8r (ladan-provet 11-08, punkt 3)
 const TG_WIN_MS = 5000, TG_FULL_N = 900, TG_FWIN_MS = 3500, TG_FFULL_N = 630, TG_FA = 0.4, TG_SW_STEPS = 6, TG_SW_N = 2;   // TEMPOGRAMMETS FÖNSTER OCH MINNE
 const TG_NOISE = 0.6, TG_NB = 2, TG_SW_P = 1, TG_SW_G = 2, TG_HL_A = 0.5, TG_LOCK_N = 8, TG_LA = 0.04, TG_KNOWN = 0.5, SCAN_HOLD = 1.06;   // HÅLLEN TOLKNING EFTER SÄKER LÅSNING
 const TG_SONG_A = 1 / 160;   // LÅTENS MINNE
-const TG_BRK_DB = 24, TG_BRK_MAX_MS = 30000;   // BREAK OCH DROP ÄR SAMMA LÅT
+const TG_BRK_DB = 24, TG_BRK_MAX_MS = 30000, TG_BRK_BACK_MS = 5000;   // BREAK OCH DROP ÄR SAMMA LÅT
 const HV_R = [4 / 3, 3 / 4, 3 / 2, 2 / 3, 5 / 4, 4 / 5], HV_K = 1.25, HV_N = 5, HV_AGE = 30, TG_OCT_LO = 79.6, TG_OCT_LO_N = 8;   // a3 TOPPRÖSTEN
 const PW_RING = 4096, PW_WIN_MS = 10000, PW_MIN = 0.5, PW_Q = [4 / 3, 3 / 4, 3 / 2, 2 / 3];   // TAKTENS SJÄLVLIKHET
 const TG_K = 139, TG_STEP = Math.pow(2, 1 / TG_K), TG_PER_HOP = 1, TG_A = 0.21, TG_MIN_N = 300, TG_FINE = 0.0025, TG_HALF = ONSET_BINS >> 1;
@@ -69,7 +69,7 @@ export class BeatFeed {
   private readonly tgAcc = new Float64Array(TG_K).fill(-1); private readonly tgH = new Float64Array(ONSET_BINS); private tgK = 0; private tgN = 0;
   private readonly tgAccF = new Float64Array(TG_K).fill(-1); private tgSw = 0; tgSwitches = 0;   // TVÅ MINNEN
   private readonly tgF = new Float64Array(TG_K); private readonly tgW = new Float64Array(TG_K); private readonly tgQ = new Float64Array(TG_K);   // HÅLLEN TOLKNING
-  private brkAt = -1e12; private brkArm = false; private brkFrom = 0;   // BREAK-HÅLLET
+  private brkAt = -1e12; private brkArm = false; private brkFrom = 0; private readonly brkT = new Float64Array(32); private readonly brkV = new Float64Array(32); private brkPos = 0;   // BREAK-HÅLLET
   private sure = false;   // LÅTENS MINNE
   private readonly tgD = new Float64Array(TG_K); private tgR = -1; private tgHl = 0; private tgLk = 0; private tgLkK = -1;
   private readonly tgAccL = new Float64Array(TG_K).fill(-1); private tgLN = 0;   // k4b (lånat av k2b)
@@ -181,9 +181,10 @@ export class BeatFeed {
       if (s > 0) { const L = this.tgAccL; L[k] = L[k] < 0 ? s : L[k] + (this.tgLN * TG_LA < 1 ? 1 / (this.tgLN + 1) : this.sure ? Math.max(1 / (this.tgLN + 1), TG_SONG_A) : TG_LA) * (s - L[k]); if (k === TG_K - 1) this.tgLN++; }
       if (++this.tgK < TG_K) continue;
       this.tgK = 0;
+      { const p = this.brkPos; this.brkT[p] = now; this.brkV[p] = this.tgR >= 0 ? this.tempoBpm : 0; this.brkPos = (p + 1) & 31; }
       if (now - this.brkAt >= TG_WIN_MS) { this.brkArm = true; this.brkFrom = 0; }
       else if (this.brkArm && this.tempoBpm > 0) {
-        if (this.brkFrom === 0) this.brkFrom = now;
+        if (this.brkFrom === 0) { this.brkFrom = now; this.brkBefore(now); }
         if (now - this.brkFrom < TG_BRK_MAX_MS) return;
         this.brkArm = false;
       }
@@ -263,6 +264,14 @@ export class BeatFeed {
       return;
     }
   }
+  /** Breaket haller tempot som gallde ett fonster FORE det. */
+  private brkBefore(now: number): void {
+    let t = 0, v = 0;
+    for (let i = 0; i < 32; i++) { const a = this.brkT[i]; if (a > t && now - a >= TG_BRK_BACK_MS) { t = a; v = this.brkV[i]; } }
+    if (!(v > 0) || Math.abs(v / this.tempoBpm - 1) <= TG_SNAP) return;
+    this.tempoBpm = v;
+    if (this.tgR >= 0) { this.tgR = ((Math.round(Math.log(v / 80) / Math.log(TG_STEP)) % TG_K) + TG_K) % TG_K; this.tgD.fill(0); }
+  }
   /** a3 TOPPRÖSTEN. */
   private peakVote(t0: number, now: number): number {
     const open = this.hvAge++ < HV_AGE;
@@ -354,7 +363,7 @@ export class BeatFeed {
     } else this.pwRun = 0;
     return cand;
   }
-  private tgReset(): void { this.pwN = 0; this.pwRun = 0; this.tgAcc.fill(-1); this.tgAccF.fill(-1); this.tgSw = 0; this.tgR = -1; this.brkArm = false; this.brkFrom = 0; this.tgLk = 0; this.tgLkK = -1; this.tgHl = 0; this.tgAccL.fill(-1); this.tgLN = 0; this.tgK = 0; this.tempoBpm = 0; this.octN = 0; this.hvRun = 0; this.hvAge = 0; this.hvVoted = false; this.hvKeep = 0; this.hvEver = false; }
+  private tgReset(): void { this.brkT.fill(0); this.pwN = 0; this.pwRun = 0; this.tgAcc.fill(-1); this.tgAccF.fill(-1); this.tgSw = 0; this.tgR = -1; this.brkArm = false; this.brkFrom = 0; this.tgLk = 0; this.tgLkK = -1; this.tgHl = 0; this.tgAccL.fill(-1); this.tgLN = 0; this.tgK = 0; this.tempoBpm = 0; this.octN = 0; this.hvRun = 0; this.hvAge = 0; this.hvVoted = false; this.hvKeep = 0; this.hvEver = false; }
 
   /** Kom en tidigare kick. */
   private kickRepeats(t: number, lag: number, tol: number): boolean {
diff --git a/src/boundaryDetector.ts b/.arena/lat1/a2/src/boundaryDetector.ts
index 04cdb7c..1be6cb5 100644
--- a/src/boundaryDetector.ts
+++ b/.arena/lat1/a2/src/boundaryDetector.ts
@@ -27,6 +27,14 @@ const F_WC = 6, F_WB = 1;   // vikter kroma, tempo
 const F_THR = 1.3;   // MATT (med F_TMIN)
 const F_TMIN = 0.3;   // en falsk grans nollar tempolaset och byter manus, en missad kostar bara...
 const F_RING = 256;
+const P_N = 768, P_ML = 384, P_RING = 2048;   // RYTMEN SOM VITTNE: anslagsfonster och langsta avstand i spektrum (6 s, 3 s)
+const P_LO = 80, P_HI = 2 * P_LO;   // pulsens omfang: en oktav (bpm)
+const P_CLEAR = 0.12;   // sa stark sjalvlikhet = en puls hors
+const P_SAME = 0.03;   // inom sa mycket ar det samma period
+const P_GONE = 0.5;   // gamla pulsen ar borta nar den ar svagare an sa mot den nya
+const P_EST = 6, P_HOLD = 6;   // block: sa lange for att etablera en puls, sa lange maste bytet sta
+const P_FINE = 2 / 3;   // punkterad puls: hors aven den 1,5 ganger snabbare ar DET pulsen
+const P_FOLLOW = 0.1;   // referensen foljer latens egen drift
 
 /** Median. */
 function median(a: Float64Array): number {
@@ -80,6 +88,59 @@ export class BoundaryDetector {
     this.pushForm(mag, binHz);
   }
 
+  private pX = new Float32Array(P_RING); private pR = new Float64Array(P_ML + 1); private pA = new Float64Array(P_ML + 2);   // RYTMEN SOM VITTNE
+  private pB = new Float64Array(F_NB); private pL = new Float64Array(F_NB); private pS = 0; private pCnt = 0; private pPos = 0; private pT0 = 0;
+  private pRef = 0; private pCand = 0; private pRun = 0; private pNew = 0; private pNewRun = 0; private pRefS = 0; private pBestS = 0; private pMs = 8;   // perioder i spektrum
+  private pPend = 0;
+
+  /** Anslagsstyrkan i ett spektrum och dess lopande sjalvlikhet. */
+  private pushPulse(now: number): void {
+    const B = this.pB, L = this.pL; let o = 0;
+    for (let b = 0; b < F_NB; b++) { const l = Math.log(B[b] + 1e-6), d = l - L[b]; if (d > 0) o += d; L[b] = l; }
+    if (this.pCnt === 0) { this.pT0 = now; o = 0; }
+    const M = P_RING - 1, p = this.pPos, X = this.pX, R = this.pR;
+    X[p] = o; const x = X[p];
+    if (this.pCnt >= P_N) {
+      const q = (p - P_N) & M, y = X[q]; this.pS += x - y;
+      for (let l = 0; l <= P_ML; l++) R[l] += x * X[(p - l) & M] - y * X[(q - l) & M];
+    } else { this.pS += x; for (let l = 0; l <= P_ML; l++) R[l] += x * X[(p - l) & M]; }
+    this.pPos = (p + 1) & M; this.pCnt++;
+  }
+
+  /** Sjalvlikheten pa perioden lag (spektrum) och dess 2, 3 och 4 slag. */
+  private pComb(lag: number): number {
+    const A = this.pA; let s = 0, n = 0;
+    for (let m = 1; m <= 4; m++) { const x = lag * m; if (x >= P_ML) break; const k = x | 0; s += A[k] + (A[k + 1] - A[k]) * (x - k); n++; }
+    return n ? s / n : 0;
+  }
+
+  /** Pulsens period i de senaste sekunderna mot latens etablerade; ett ihallande byte = ny lat. */
+  private pulseDecide(now: number): void {
+    this.pBestS = 0; this.pRefS = 0;
+    if (this.pCnt < P_N + P_ML) return;
+    const dt = (now - this.pT0) / (this.pCnt - 1), R = this.pR, A = this.pA, m2 = this.pS * this.pS / P_N, v0 = R[0] - m2;
+    if (!(v0 > 0) || !(dt > 0)) { this.pRun = 0; this.pNewRun = 0; return; }
+    for (let l = 0; l <= P_ML; l++) A[l] = (R[l] - m2) / v0;
+    const l0 = 60000 / P_HI / dt, l1 = 60000 / P_LO / dt; let bs = 0, bl = 0;
+    for (let lag = l0; lag < l1; lag += 0.25) { const s = this.pComb(lag); if (s > bs) { bs = s; bl = lag; } }
+    if (bl * P_FINE >= l0) {
+      let fs = 0, fl = 0; for (let lag = bl * P_FINE * (1 - P_SAME), e = bl * P_FINE * (1 + P_SAME); lag <= e; lag += 0.25) { const s = this.pComb(lag); if (s > fs) { fs = s; fl = lag; } }
+      if (fs >= P_GONE * bs) bl = fl;
+    }
+    const clear = bs >= P_CLEAR; this.pBestS = bs; this.pMs = dt;
+    if (!this.pRef) {
+      if (clear && this.pCand > 0 && Math.abs(bl / this.pCand - 1) <= P_SAME) { if (++this.pRun >= P_EST) { this.pRef = bl; this.pRun = 0; } }
+      else { this.pCand = clear ? bl : 0; this.pRun = clear ? 1 : 0; }
+      return;
+    }
+    const rs = this.pComb(this.pRef); this.pRefS = rs;
+    if (clear && Math.abs(bl / this.pRef - 1) <= P_SAME) { this.pRef += P_FOLLOW * (bl - this.pRef); this.pNewRun = 0; return; }
+    if (clear && rs <= P_GONE * bs) {
+      if (this.pNewRun > 0 && Math.abs(bl / this.pNew - 1) <= P_SAME) this.pNewRun++; else { this.pNew = bl; this.pNewRun = 1; }
+      if (this.pNewRun >= P_HOLD) { this.pPend = bl; this.pNewRun = 0; }
+    } else this.pNewRun = 0;
+  }
+
   private fBand: Int8Array | null = null; private fPc: Int8Array | null = null; private fHz = 0;   // LATENS FORM
   private fAcc = new Float64Array(F_NB); private fCh = new Float64Array(12); private fN = 0; private fStart = 0;
   private fLb = new Float32Array(F_RING * F_NB); private fC = new Float32Array(F_RING * 12);
@@ -99,9 +160,12 @@ export class BoundaryDetector {
       }
     }
     const band = this.fBand, pc = this.fPc!, acc = this.fAcc, ch = this.fCh;
-    for (let i = 1; i < mag.length; i++) { const m = mag[i], b = band[i], p = pc[i]; if (b >= 0) acc[b] += m; if (p >= 0) ch[p] += m * m; }
+    const pb = this.pB; pb.fill(0);
+    for (let i = 1; i < mag.length; i++) { const m = mag[i], b = band[i], p = pc[i]; if (b >= 0) pb[b] += m; if (p >= 0) ch[p] += m * m; }
+    for (let b = 0; b < F_NB; b++) acc[b] += pb[b];
     this.fN++;
     const now = this.clock();
+    this.pushPulse(now);
     if (!this.fStart) this.fStart = now;
     if (now - this.fStart < F_BLK_MS) return;
     this.fStart = now;
@@ -113,6 +177,7 @@ export class BoundaryDetector {
     for (let p = 0; p < 12; p++) this.fC[oc + p] = (ch[p] / n) / (cs + 1e-12);
     this.fT[k] = now; this.fBpm[k] = this.fLastBpm; this.fCount++;
     acc.fill(0); ch.fill(0); this.fN = 0;
+    this.pulseDecide(now);
     this.formDecide();
   }
 
@@ -140,7 +205,7 @@ export class BoundaryDetector {
     const dC = 1 - dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
     const dB = foldBpm(median(this.fMedA), median(this.fMedB));
     const sc = dT + F_WC * dC + F_WB * dB;
-    if (sc >= F_THR && dT >= F_TMIN) { this.fPendAt = sAt; this.fPendScore = sc; }
+    if (sc >= F_THR && dT >= F_TMIN && !this.pRef) { this.fPendAt = sAt; this.fPendScore = sc; }
   }
 
   /** Matas varje hop med ramens niva/tempo. */
@@ -152,7 +217,7 @@ export class BoundaryDetector {
     if (!this.playStart) {
       if (loud) {
         if (!this.loudSince) this.loudSince = now;
-        else if (now - this.loudSince >= START_HOLD_MS) { this.playStart = now; this.lastLoud = now; this.loudSince = 0; }
+        else if (now - this.loudSince >= START_HOLD_MS) { this.playStart = now; this.lastLoud = now; this.loudSince = 0; this.pulseReset(); }
       } else this.loudSince = 0;
       return;
     }
@@ -253,7 +318,9 @@ export class BoundaryDetector {
 
     let why = "";
     let back = 0;
-    if (this.fPendAt) { why = `latform ${this.fPendScore.toFixed(2)}`; back = Math.max(0, now - this.fPendAt); this.fPendAt = 0; }
+    const np = this.pPend;
+    if (np) { why = `ny puls ${(60000 / this.pRef / this.pMs).toFixed(0)}->${(60000 / np / this.pMs).toFixed(0)}`; this.pPend = 0; }
+    else if (this.fPendAt) { why = `latform ${this.fPendScore.toFixed(2)}`; back = Math.max(0, now - this.fPendAt); this.fPendAt = 0; }
     else if (tLive > MAX_SEG_MS) why = "maxlängd";
     if (!why) return false;
 
@@ -264,6 +331,7 @@ export class BoundaryDetector {
     this.commit();
     this.playStart = bAt;
     this.lastLoud = now;
+    this.pRef = np;
     return true;
   }
 
@@ -272,5 +340,9 @@ export class BoundaryDetector {
     this.boundaryCount++;
     this.playStart = 0;
     this.resetNovelty(); this.fPendAt = 0; this.loudSince = 0;
+    this.pRef = 0; this.pCand = 0; this.pRun = 0; this.pNewRun = 0; this.pPend = 0; this.pRefS = 0;
   }
+
+  /** Nytt segment efter tystnad: anslagsringen borjar om. */
+  private pulseReset(): void { this.pX.fill(0); this.pR.fill(0); this.pS = 0; this.pCnt = 0; this.pPos = 0; }
 }
```
