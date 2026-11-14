# a1 – FORMEN UTAN BASEN (låtgränsen)

## IDÉN
Låtens form jämförs bara ÖVER baskroppen (band från 268 Hz, normerade för sig – samma golv som kroman), så att ett break eller outro
som tar bort basen inte ser ut som en ny låt och skarven hamnar där det ovanför basen byter.
Det som skiljer en uppbyggnad från en ny låt hörs inte i uppbyggnadens egna 8 s (den ÄR nytt material) – det som skiljer är att den
kommer ur ett break och leder tillbaka till låten: därför bär TUNNA block (övre nivån 14 dB under låtens egen median de senaste 80 s)
ingen form, och en skarv prövas bara mellan två fönster med kropp (de 8 s före efter-fönstret och efter-fönstret självt, högst 3
tunna block var). Breaket prövas aldrig, uppbyggnaden direkt efter hoppas över, och när fönstret står på kropp är det droppet = låten.

## DELAR (allt i `src/boundaryDetector.ts`; analyserClock.ts orörd)
| del | vad | mått |
|---|---|---|
| P1 `F_B0 = 8` | formen räknas och normeras på band 8–23 (268 Hz–12 kHz) | **latbyten / skarvens plats**: ~406 sägs 415,2 (skarven 406,2) i st f 400,6 (outrots basfall, 5 s FÖRE skarven) |
| P2 `F_THIN_DB`: tunna block ur medlen, efter-fönstret högst `F_THIN_N` tunna | breaket 193–206 s (övre nivån −12…−27 dB) prövas inte | **falska** 1 → 0, **takt** +3 s (201–204) |
| P3 samma räkning på de 8 s före efter-fönstret | uppbyggnaden 207–211 s (poäng 1,5–1,7) prövas inte | **falska** |
Alla tre behövs (ensam-prov, en del av i taget): utan P1 falsk 221,0 (1,80) och ~406 åter vid 400,6; utan P2 falsk 200,4 (1,40);
utan P3 falsk 217,5 (1,45). Inget bär lastid eller den missade ~272 i 171840 (över basen: form 0,2, kroma 0,13; 3:2-tempot viks bort).

## MARGINALER (ensam-körning, båda filerna)
| gräns | värde | −25 % | +25 % | håller |
|---|---|---|---|---|
| F_B0 (Hz) | 8 (268) | 7 (211): samma | 9 (340): samma (150,6) | 7–10; 6 (166 Hz) ger falsk 221,5 |
| F_THIN_DB | 14 | 10,5: samma | 17,5: samma | 9–18; 8,5 tappar ~406, 20 ger falsk 218 |
| F_THIN_N | 3 | 2: samma | 4: samma | 5 ger en extra gräns 257,8 i uttoningen |
| F_THR / F_TMIN / F_BLK_MS (oförändrade) | 1,3 / 0,3 / 500 | samma | samma (≤ +3 s) | basen har falsk ~200 i alla |
"Samma" = 264,0 (tystnad) + 415,2 och 149,6: träffar 3/4, falska 0.

## SIFFRORNA
| | poäng | takt | fel s | utanför | låstid | låtbyten | falska | 160345 | 171840 |
|---|---|---|---|---|---|---|---|---|---|
| bas | 93,06 | 92,6 | 64 | 95,2 | 7,1 | 3/4 | 1 | 93,3 %, 13/9 s, gränser 200 264 401 | 91,1 %, 2/5 s, gräns 151 |
| m1 (F_THIN_DB 12) | 93,45 | 91,9 | 70 | 94,6 | 7,2 | 3/4 | 0 | 93,5 %, 13/9 s, gränser 264 415 | 88,7 %, 2/5 s, gräns 150 |
| m2 (slutkoden, 14) | 93,45 | 91,9 | 70 | 94,6 | 7,2 | 3/4 | 0 | samma | samma |
m3 oanvänd. Drop oförändrade i båda filerna.
SÄMRE: 171840 220–228 s (klockan 83 i st f 136 bpm i ett break med basen 15–22 dB under taket) = −0,9 poäng. Det är ett MYNTKAST i
klockan, inte låtgränsens logik: klockan ensam (lab/klockaGrans.mjs, klock-tappen med gränsen flyttad) går rätt med gränsen vid
140/143/147/151/153 s och fel i 8–11 s vid 145/148/150/152/155/158 s eller utan gräns (basens 150,637 rätt, ett hopp senare fel).
Samma kaos efter tystnaden 264 s. Varje ändrad gränstid kastar om ±8 s takt (±0,9 poäng, ±1,2 %-enheter `utanfor`).
KOSTNAD: inget nytt per hopp (en median över 160 tal per halvsekund); 229–289 us/hopp är väggklocka med fyra kärnor på 100 %
(åtta deltagare) – låtgränsen ensam tar 5–8 us/hopp i både bas och a1.

## RISKEN
- Ny låt med TYST intro (> 14 dB under förra låtens övre nivå; övningens ligger −5…−11): gränsen kommer först när låten fått
  kropp – sen eller missad. Medvetet enligt F_TMIN-regeln: hellre missad än falsk.
- Uttoning + kort glapp utan 3 s tystnad: P3 väntar på 8 s kropp → gränsen ~14 s efter nya låtens start i st f 9.
- Ny låt som bara skiljer sig i basen (~272): missas. Basens form för sig provades: varierar mer INOM låtar (0,5–1,2) än vid skarven (0,55).
- Break med annan klang på −9…−13 dB (pad/sång), tal mellan låtar: prövas som förr och kan bli falsk gräns.
- Långa mixar: som i dag (80 s mot 8 s). Tempobyte mitt i låt, halvtempo/3:2: orört (tempotermen viks som förr).

## DIFFEN (`git diff --no-index src .arena/lat1/a1/src`; samma byte för byte i `a1.diff`, provad med `patch -p1 --binary` → identisk fil)
```diff
diff --git a/src/boundaryDetector.ts b/.arena/lat1/a1/src/boundaryDetector.ts
index 04cdb7c..a204d8c 100644
--- a/src/boundaryDetector.ts
+++ b/.arena/lat1/a1/src/boundaryDetector.ts
@@ -27,6 +27,9 @@ const F_WC = 6, F_WB = 1;   // vikter kroma, tempo
 const F_THR = 1.3;   // MATT (med F_TMIN)
 const F_TMIN = 0.3;   // en falsk grans nollar tempolaset och byter manus, en missad kostar bara...
 const F_RING = 256;
+const F_B0 = 8;   // formens forsta band (268 Hz): over baskroppen, dar kroman borjar
+const F_THIN_DB = 14;   // tunt block: ovre nivan sa langt under latens egen
+const F_THIN_N = 3;   // sa manga tunna block tal vart fonster runt skarven (8 s fore, 8 s efter)
 
 /** Median. */
 function median(a: Float64Array): number {
@@ -88,6 +91,7 @@ export class BoundaryDetector {
   private fPendAt = 0; private fPendScore = 0;
   private fMa = new Float64Array(F_NB); private fMb = new Float64Array(F_NB); private fCa = new Float64Array(12); private fCb = new Float64Array(12);
   private fMedA = new Float64Array(F_LB); private fMedB = new Float64Array(F_LA);
+  private fU = new Float32Array(F_RING); private fMedU = new Float64Array(F_LB);
 
   private pushForm(mag: Float32Array, binHz: number): void {
     if (!this.fBand || this.fHz !== binHz || this.fBand.length !== mag.length) {
@@ -106,9 +110,10 @@ export class BoundaryDetector {
     if (now - this.fStart < F_BLK_MS) return;
     this.fStart = now;
     const k = this.fCount % F_RING, o = k * F_NB, oc = k * 12, n = this.fN;
-    let mean = 0;
-    for (let b = 0; b < F_NB; b++) { const v = Math.log(acc[b] / n + 1e-6); this.fLb[o + b] = v; mean += v; }
-    mean /= F_NB; for (let b = 0; b < F_NB; b++) this.fLb[o + b] -= mean;
+    let mean = 0, up = 0;
+    for (let b = F_B0; b < F_NB; b++) { const v = Math.log(acc[b] / n + 1e-6); this.fLb[o + b] = v; mean += v; up += acc[b]; }
+    mean /= F_NB - F_B0; for (let b = F_B0; b < F_NB; b++) this.fLb[o + b] -= mean;
+    this.fU[k] = 20 * Math.log10(up / n + 1e-6);
     let cs = 0; for (let p = 0; p < 12; p++) cs += ch[p] / n;
     for (let p = 0; p < 12; p++) this.fC[oc + p] = (ch[p] / n) / (cs + 1e-12);
     this.fT[k] = now; this.fBpm[k] = this.fLastBpm; this.fCount++;
@@ -123,19 +128,25 @@ export class BoundaryDetector {
     if (a0 < 0 || this.fCount - a0 > F_RING) return;
     const R = F_RING, sAt = this.fT[j % R];
     if (sAt - this.playStart < MIN_SEG_MS || this.fT[a0 % R] <= this.playStart) return;
+    for (let q = 0; q < F_LB; q++) this.fMedU[q] = this.fU[(a0 + q) % R];
+    const thin = median(this.fMedU) - F_THIN_DB;
+    let nT = 0; for (let q = 1; q <= F_LA; q++) if (this.fU[(b0 - q) % R] < thin) nT++;
+    if (nT > F_THIN_N) return;
     const ma = this.fMa, ca = this.fCa, cb = this.fCb; ma.fill(0); ca.fill(0); cb.fill(0);
+    let nA = 0, nB = 0;
     for (let q = 0; q < F_LB; q++) { const k = (a0 + q) % R, o = k * F_NB, oc = k * 12;
-      for (let b = 0; b < F_NB; b++) ma[b] += this.fLb[o + b];
-      for (let p = 0; p < 12; p++) ca[p] += this.fC[oc + p];
-      this.fMedA[q] = this.fBpm[k]; }
+      this.fMedA[q] = this.fBpm[k]; if (this.fU[k] < thin) continue; nA++;
+      for (let b = F_B0; b < F_NB; b++) ma[b] += this.fLb[o + b];
+      for (let p = 0; p < 12; p++) ca[p] += this.fC[oc + p]; }
     let dT = 0;
     const mb = this.fMb; mb.fill(0);
     for (let q = 0; q < F_LA; q++) { const k = (b0 + q) % R, o = k * F_NB, oc = k * 12;
-      for (let b = 0; b < F_NB; b++) mb[b] += this.fLb[o + b];
-      for (let p = 0; p < 12; p++) cb[p] += this.fC[oc + p];
-      this.fMedB[q] = this.fBpm[k]; }
-    for (let b = 0; b < F_NB; b++) dT += Math.abs(ma[b] / F_LB - mb[b] / F_LA);
-    dT /= F_NB;
+      this.fMedB[q] = this.fBpm[k]; if (this.fU[k] < thin) continue; nB++;
+      for (let b = F_B0; b < F_NB; b++) mb[b] += this.fLb[o + b];
+      for (let p = 0; p < 12; p++) cb[p] += this.fC[oc + p]; }
+    if (F_LA - nB > F_THIN_N) return;
+    for (let b = F_B0; b < F_NB; b++) dT += Math.abs(ma[b] / nA - mb[b] / nB);
+    dT /= F_NB - F_B0;
     let dot = 0, na = 0, nb = 0; for (let p = 0; p < 12; p++) { dot += ca[p] * cb[p]; na += ca[p] * ca[p]; nb += cb[p] * cb[p]; }
     const dC = 1 - dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
     const dB = foldBpm(median(this.fMedA), median(this.fMedB));
```
