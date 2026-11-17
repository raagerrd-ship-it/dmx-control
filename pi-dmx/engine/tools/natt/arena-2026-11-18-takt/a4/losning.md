# a4 FINT TEMPO - lösning

**IDÉN.** Finskanningen (onsetStep, var 250 ms) väljer inte längre bästa bpm bland diskreta steg (0,5 %), utan interpolerar toppen (parabel över de 11 kandidaternas kontrast) till bråkdelssteg, viker en gång till på det fina tempot och spikar fasen på dess slag närmast nu. Klockans bpm följer det fina tempot mjukt (EMA 0,3 inom 0,5 %), och när låsningen hållit 8 skanningar och ettan är känd krymper steget till 0,25 % (±1,25 %), så att klockan går i låtens exakta takt (mätt: 131,0 mot Beat This 130,9 i 160345 220-260 s) i stället för att hoppa ±1 % mellan skanningarna.

**DELARNA**

| del | vad den gör | mått (m2 om inget annat anges) |
|---|---|---|
| D1 interpolerad topp | parabel över scanS[11], bråkdels-bpm | med D2: 151659 glider 10,2 -> 6,1, FEL 32,7 -> 26,5 |
| D2 fasen på fina tempot | extra foldAt(bestBpm), fasen spikas på slaget närmast scanNow, index behålls | ingen leadändring (-53/-60/-60 ms) |
| D3 mjuk bpm | EMA 0,3 om |fint/bpm-1| <= 0,5 %, annars direkt | cbpm-spridning ±1 % -> ±0,3 % (sond 160345) |
| D4 fint steg efter låsning | 0,25 % när fineN >= 8 och barKnown(), annars 0,5 % | sond 4 (utan hold): 151659 FEL 24,5 men etta 84,8 |
| D5 hold-bias även i fint läge | SCAN_HOLD 1,06 på c=0 när tempoBpm > 0 | räddar ettan: 151659 etta 84,8 -> 97,2 |

Prövat och förkastat: 8 s fönster + fint steg alltid utan hold (m1): FEL 28,8 (+1,1), 160345 26,8, men etta 80,2 = DISK. **Fint steg utan hold ger FEL-vinst men sänker ettan systematiskt** (ettan byter plats 120-190 s i 151659 i alla tre sådana körningar). Jokern: D1+D4 utan D5 vinner takten men behöver en ettvakt.

**KOSTNADEN.** Allt i taktvägen (workern, analyserClock BeatFeed). Per skanning (var 250 ms) 12 vikningar i stället för 11 (en extra på ~250 anslag), alltså ~+9 % i onsetStep, försumbart per hopp. Huvudtråden oförändrad. Nytt minne: en Float64Array(11), ~0 MB. Ingen allokering per hopp.

**SIFFRORNA (m2, = koden nu)**: poäng **-0,8**, FEL 30,6 (bas 29,9), motslag 6,4, fel tempo 6,2, glider 14,0, stökigt 4,1, oktav 11,2, etta 84,0 (bas 85,7).

| fil | FEL bas -> a4 | glider | stökigt | etta |
|---|---|---|---|---|
| 151659 | 32,7 -> 26,5 | 10,2 -> 6,1 | 4,1 -> 2,0 | 97,8 -> 97,2 |
| 160345 | 33,9 -> 36,4 | 21,4 -> 21,8 | 1,8 -> 7,3 | 90,4 -> 94,2 |
| 200719 | 23,0 -> 29,0 | 11,0 -> 14,0 | 2,0 -> 3,0 | 68,9 -> 60,5 |

Sämre: 200719 (halvtempopartier, ettan och glider), 160345 stökigt. Ärligt: m2 är netto lite sämre än bas. Mekanismen (fint tempo) håller i stabila partier, men felen är mest fastoppsval i vikningen (fasen låser -150 ms eller ett halvt slag fel med rätt tempo, se 160345 244-252 s, 151659 446-470 s). Det löser inte ett finare tempo.

**RISKEN.** Låtbyten: fint steg stängs av via barKnown() efter relock, så inlåsningen är som förr. Breaks och musik utan trumma: få anslag ger platta kontrastkurvor och då ingen interpolation (kräver båda grannarna > 0). Live-mic: brusigare kontrast ger brusigare bråkdel, men EMA:n dämpar. Ettan är känslig för hur ofta ankaret flyttas (se ovan).

**DIFFEN** (`git diff --no-index src .arena/takt/a4/src`)

```diff
diff --git a/src/analyserClock.ts b/.arena/takt/a4/src/analyserClock.ts
index 0bbcb78..521cbdd 100644
--- a/src/analyserClock.ts
+++ b/.arena/takt/a4/src/analyserClock.ts
@@ -40,7 +40,7 @@ const BND_QUIET_BEATS = 1;   // MINNET VID GRÄNSEN: så många slag tyst = låt
 const HV_R = [4 / 3, 3 / 4, 3 / 2, 2 / 3, 5 / 4, 4 / 5], HV_K = 1.25, HV_N = 5, HV_AGE = 30, TG_OCT_LO = 79.6, TG_OCT_LO_N = 8;   // a3 TOPPRÖSTEN
 const PW_RING = 4096, PW_WIN_MS = 10000, PW_MIN = 0.5, PW_Q = [4 / 3, 3 / 4, 3 / 2, 2 / 3];   // TAKTENS SJÄLVLIKHET
 const TG_K = 139, TG_STEP = Math.pow(2, 1 / TG_K), TG_PER_HOP = 1, TG_A = 0.21, TG_MIN_N = 300, TG_FINE = 0.0025, TG_HALF = ONSET_BINS >> 1;
-const TG_FINE_MAX = 0.0125;   // FINTEMPOTS BAND
+const TG_FINE_MAX = 0.0125, FINE_A = 0.3, FINE_JUMP = 0.005, FINE_N = 8;   // FINTEMPOTS BAND
 
 /** FAS-PREDIKTIONSTILLIT. */
 export function publishPhase(f: { beatPhaseMs: number; beatPhaseConf: number; barShift: number }, b: ClockCfg["beat"], barKnown: boolean,
@@ -101,6 +101,25 @@ export class BeatFeed {
 
   private scanStep = 0.005; private scanC = 99; private scanEnd = 0; private scanRef = 0; private scanNow = 0; private scanC0 = 0;   // Sökningen sprids över hoppen
   private bestScore = 0; private bestBpm = 0; private bestPh = 0; private scanFar = 0;
+  private readonly scanS = new Float64Array(11); private bestC = 0; private foldMb = 0; private fineN = 0;   // FINT TEMPO (a4)
+
+  /** Vik anslagen i fönstret på bpm; ger toppens kontrast (0 = för få anslag), toppens fack i foldMb. */
+  private foldAt(bpm: number): number {
+    const bm = 60000 / bpm, ref = this.scanRef;
+    this.foldS.fill(0); this.foldN.fill(0);
+    let tot = 0, n = 0;
+    for (let i = 0; i < this.onN; i++) {
+      const j = (this.onPos - 1 - i + ONSET_RING) % ONSET_RING, t = this.onT[j];
+      if (t > this.scanNow) continue;
+      if (this.scanNow - t > ONSET_WIN_MS) break;
+      const r = (t - ref) % bm, b = Math.floor(((r < 0 ? r + bm : r) / bm) * ONSET_BINS) % ONSET_BINS;
+      this.foldS[b] += this.onV[j]; this.foldN[b]++; tot += this.onV[j]; n++;
+    }
+    if (n < 100 || !(tot > 0)) return 0;
+    let mx = 0, mb = 0;
+    for (let b = 0; b < ONSET_BINS; b++) { const v = this.foldN[b] ? this.foldS[b] / this.foldN[b] : 0; if (v > mx) { mx = v; mb = b; } }
+    this.foldMb = mb; return mx / (tot / n);
+  }
 
   /** LÖPANDE TAKT. */
   private onsetStep(cfg: EngineConfig, now: number): void {
@@ -111,40 +130,30 @@ export class BeatFeed {
       this.scanRef = beat.anchorMs; this.scanNow = now;
       const cb = this.scanFar > 0 ? this.scanFar : beat.bpm; this.scanFar = 0;
       if (this.tempoBpm > 0 && Math.abs(cb / this.tempoBpm - 1) > TG_FINE_MAX) { this.scanC0 = this.tempoBpm; this.scanStep = TG_FINE; this.scanEnd = 5; }
-      else if (this.tempoBpm > 0) { this.scanC0 = cb; this.scanStep = 0.005; this.scanEnd = 5; }
+      else if (this.tempoBpm > 0) { this.scanC0 = cb; this.scanStep = this.fineN >= FINE_N && this.barKnown() ? TG_FINE : 0.005; this.scanEnd = 5; }
       else { this.scanC0 = beat.bpm; this.scanStep = 0.005; this.scanEnd = 5; }
 
-      this.scanC = -5; this.bestScore = 0;
-    }
-    const c = this.scanC++, ref = this.scanRef;
-    const bpm = this.scanC0 * (1 + c * this.scanStep), bm = 60000 / bpm;
-    this.foldS.fill(0); this.foldN.fill(0);
-    let tot = 0, n = 0;
-    for (let i = 0; i < this.onN; i++) {
-      const j = (this.onPos - 1 - i + ONSET_RING) % ONSET_RING, t = this.onT[j];
-      if (t > this.scanNow) continue;
-      if (this.scanNow - t > ONSET_WIN_MS) break;
-      const r = (t - ref) % bm, b = Math.floor(((r < 0 ? r + bm : r) / bm) * ONSET_BINS) % ONSET_BINS;
-      this.foldS[b] += this.onV[j]; this.foldN[b]++; tot += this.onV[j]; n++;
-    }
-    if (n >= 100 && tot > 0) {
-      const mean = tot / n; let mx = 0, mb = 0;
-      for (let b = 0; b < ONSET_BINS; b++) { const v = this.foldN[b] ? this.foldS[b] / this.foldN[b] : 0; if (v > mx) { mx = v; mb = b; } }
-      const score = (mx / mean) * (c === 0 && this.scanStep === 0.005 ? SCAN_HOLD : 1);
-      if (score > this.bestScore) {
-        const a = this.foldMean(mb - 1), cc = this.foldMean(mb), d = this.foldMean(mb + 1), den = a - 2 * cc + d;
-        const off = den < 0 ? 0.5 * (a - d) / den : 0;
-        this.bestScore = score; this.bestBpm = bpm; this.bestPh = (mb + 0.5 + off) / ONSET_BINS;
-      }
+      this.scanC = -5; this.bestScore = 0; this.scanS.fill(0);
     }
+    const c = this.scanC++;
+    const s = this.foldAt(this.scanC0 * (1 + c * this.scanStep)); this.scanS[c + 5] = s;
+    { const h = s * (c === 0 && this.tempoBpm > 0 ? SCAN_HOLD : 1); if (h > this.bestScore) { this.bestScore = h; this.bestC = c; } }
     if (c < this.scanEnd || this.bestScore < ONSET_MIN_PEAK) return;
+    const S = this.scanS, i = this.bestC + 5; let cf = this.bestC;
+    if (i > 0 && i < 10 && S[i - 1] > 0 && S[i + 1] > 0) { const den = S[i - 1] - 2 * S[i] + S[i + 1]; if (den < 0) cf += Math.max(-0.5, Math.min(0.5, 0.5 * (S[i - 1] - S[i + 1]) / den)); }
+    this.bestBpm = this.scanC0 * (1 + cf * this.scanStep);
     if (this.tempoBpm > 0) this.bestBpm = Math.min(159.9, Math.max(80, this.bestBpm));
-    if (this.tempoBpm > 0 && Math.abs(this.bestBpm / this.tempoBpm - 1) > TG_FINE_MAX) { this.scanFar = this.bestBpm; return; }
+    this.fineN = this.bestC > -5 && this.bestC < 5 ? this.fineN + 1 : 0;
+    if (this.tempoBpm > 0 && Math.abs(this.bestBpm / this.tempoBpm - 1) > TG_FINE_MAX) { this.fineN = 0; this.scanFar = this.bestBpm; return; }
+    if (!(this.foldAt(this.bestBpm) > 0)) return;
+    { const mb = this.foldMb, a = this.foldMean(mb - 1), cc = this.foldMean(mb), d = this.foldMean(mb + 1), den = a - 2 * cc + d;
+      this.bestPh = (mb + 0.5 + (den < 0 ? 0.5 * (a - d) / den : 0)) / ONSET_BINS; }
+    const fm = 60000 / this.bestBpm, ref = this.scanRef, tb = ref + (this.bestPh + Math.round((this.scanNow - ref) / fm - this.bestPh)) * fm;
+    const nbpm = Math.abs(this.bestBpm / beat.bpm - 1) > FINE_JUMP ? this.bestBpm : beat.bpm + FINE_A * (this.bestBpm - beat.bpm);
     const oldMs = 60000 / beat.bpm, idx = Math.floor((now - beat.anchorMs) / oldMs), fr = (now - beat.anchorMs) / oldMs - idx;
-    const nb = 60000 / this.bestBpm;
-    beat.bpm = this.bestBpm; beat.anchorMs = now - (idx + fr) * nb;
-    const shift = ((((beat.anchorMs - ref) % nb) + nb) % nb) / nb;
-    let err = this.bestPh - shift; err -= Math.round(err);
+    const nb = 60000 / nbpm;
+    beat.bpm = nbpm; beat.anchorMs = now - (idx + fr) * nb;
+    let err = (tb - beat.anchorMs) / nb; err -= Math.round(err);
     beat.anchorMs += err * nb;
     this.onsetFixes++;
   }
```
