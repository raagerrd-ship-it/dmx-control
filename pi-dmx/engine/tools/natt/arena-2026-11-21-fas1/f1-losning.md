# f1 - uthållighet med säkerhet

## Idén
Ett hopp som a3c:s minne nekar tas ändå när det har samlat nog styrka: varje sökning (var 250:e ms) lägger till vikningstoppens övertag mot
andra toppen (topp/tvåa minus 1,3, tak 4) gånger hur still felet står mot körningens början, och kravet skalas med minnets underläge
(1/(1,2 x lm-kvot) - 1), så ett hopp som minnet nästan stöder tas efter två sökningar medan ett som minnet starkt säger emot måste stå länge.
En kort falsk topp är svag, vandrar (felet flyttar sig > 0,06 slag), dyker upp ur en kedja av andra nekade hopp i stället för ur lugn,
eller ligger på halvslaget (offbeat-basen, |fel| >= 0,44) - då samlar den inget och bara a3c:s minne kan släppa igenom den.

## Diffen
```diff
diff --git a/src/analyserClock.ts b/.arena/fas1/f1/src/analyserClock.ts
index 7ab0642..5ed87a7 100644
--- a/src/analyserClock.ts
+++ b/.arena/fas1/f1/src/analyserClock.ts
@@ -43,6 +43,7 @@ const PW_RING = 4096, PW_WIN_MS = 10000, PW_MIN = 0.5, PW_Q = [4 / 3, 3 / 4, 3 /
 const TG_K = 139, TG_STEP = Math.pow(2, 1 / TG_K), TG_PER_HOP = 1, TG_A = 0.21, TG_MIN_N = 300, TG_FINE = 0.0025, TG_HALF = ONSET_BINS >> 1;
 const TG_FINE_MAX = 0.0125;   // FINTEMPOTS BAND
 const FRESH_MS = 8000, FRESH_TEMPO = 0.04, JUMP_FRAC = 0.12, LM_TAU_MS = 10000, LM_K = 1.2;   // DET TRÖTTA LÅSET (a5)
+const PJ_TOL = 0.06, PJ_HALF = 0.44, PJ_S0 = 1.3, PJ_EV = 2, PJ_SEC_MAX = 4;   // UTHÅLLIGHET: nekat hopp tas när styrka x stillhet når PJ_EV x minnets underläge
 
 /** FAS-PREDIKTIONSTILLIT. */
 export function publishPhase(f: { beatPhaseMs: number; beatPhaseConf: number; barShift: number }, b: ClockCfg["beat"], barKnown: boolean,
@@ -119,7 +120,7 @@ export class BeatFeed {
   }
 
   private scanStep = 0.005; private scanC = 99; private scanEnd = 0; private scanRef = 0; private scanNow = 0; private scanC0 = 0;   // Sökningen sprids över hoppen
-  private bestScore = 0; private bestBpm = 0; private bestPh = 0; private scanFar = 0; private bestLag = NaN; private phLag = 0;
+  private bestScore = 0; private bestBpm = 0; private bestPh = 0; private scanFar = 0; private bestLag = NaN; private phLag = 0; private bestSec = 99; private pjE = NaN; private pjEv = 0; private pjN = 0; private pjCalm = true;
   private freshTo = 0; jumpVetos = 0; private readonly lm = new Float64Array(ONSET_BINS); private readonly lmTmp = new Float64Array(ONSET_BINS); private lmT = 0; private lmS = 1;   // DET TRÖTTA LÅSET
 
   /** LÖPANDE TAKT. */
@@ -156,7 +157,7 @@ export class BeatFeed {
       if (score > this.bestScore) {
         const a = C[(mb + ONSET_BINS - 1) % ONSET_BINS], cc = C[mb], d = C[(mb + 1) % ONSET_BINS], den = a - 2 * cc + d;
         const off = den < 0 ? 0.5 * (a - d) / den : 0;
-        this.bestScore = score; this.bestBpm = bpm; this.bestPh = (mb + 0.5 + off) / ONSET_BINS; this.phWb.set(this.phWt);
+        this.bestScore = score; this.bestBpm = bpm; this.bestPh = (mb + 0.5 + off) / ONSET_BINS; this.phWb.set(this.phWt); { let s2 = 0; for (let b = 0; b < ONSET_BINS; b++) { const dd = Math.abs(b - mb), dk = dd < ONSET_BINS - dd ? dd : ONSET_BINS - dd; if (dk > PH_W && C[b] > s2) s2 = C[b]; } this.bestSec = s2 > 0 ? cc / s2 : 99; }
         let sx = 0, sb = 0; for (let b = 0; b < ONSET_BINS; b++) { const v = this.foldMean(b); if (v > sx) { sx = v; sb = b; } }
         const dd = Math.abs(sb - mb), dk = dd < ONSET_BINS - dd ? dd : ONSET_BINS - dd;
         if (dk <= PH_W && sx > 0) { const a2 = this.foldMean(sb - 1), d2 = this.foldMean(sb + 1), de = a2 - 2 * sx + d2; let l = (sb + 0.5 + (de < 0 ? 0.5 * (a2 - d2) / de : 0)) / ONSET_BINS - this.bestPh; l -= Math.round(l); this.bestLag = l; }
@@ -173,7 +174,15 @@ export class BeatFeed {
     if (this.bestLag === this.bestLag) { const l = this.phLag + PH_LAG_A * (this.bestLag * nb - this.phLag); this.phLag = l > PH_LAG_MAX ? PH_LAG_MAX : l < -PH_LAG_MAX ? -PH_LAG_MAX : l; }
     const lag = this.phLag / nb; let err = this.bestPh + lag - shift; err -= Math.round(err);
     const big = err >= JUMP_FRAC || err <= -JUMP_FRAC; this.phWc.set(this.phWb);
-    if (!big || now < this.freshTo || this.lmAt(err - lag) * LM_K >= this.lmAt(-lag)) { beat.anchorMs += err * nb; if (big) this.lmTurn(err); } else this.jumpVetos++;
+    const ln = this.lmAt(err - lag), lc = this.lmAt(-lag); let ok = !big || now < this.freshTo || ln * LM_K >= lc;
+    if (!ok && err < PJ_HALF && err > -PJ_HALF) {   // uthållighet (ej halvslag = offbeat-basen): ett nekat hopp ur lugn som står still samlar styrka, tas när den täcker minnets underläge
+      const r = lc > 0 ? ln / lc : 0, d = err - this.pjE, still = 1 - Math.abs(d - Math.round(d)) / PJ_TOL;
+      if (!(still > 0)) { this.pjE = this.pjCalm ? err : NaN; this.pjEv = 0; this.pjN = 0; }
+      if (this.pjE === this.pjE) { this.pjN++; this.pjEv += this.bestSec > PJ_S0 ? (Math.min(this.bestSec, PJ_SEC_MAX) - PJ_S0) * (still > 0 ? still : 1) : 0; }
+      ok = this.pjN >= 2 && this.pjEv >= PJ_EV * (1 / (LM_K * (r > 0.01 ? r : 0.01)) - 1);
+    } else if (!ok) this.pjE = NaN;
+    this.pjCalm = ok;
+    if (ok) { this.pjE = NaN; beat.anchorMs += err * nb; if (big) this.lmTurn(err); } else this.jumpVetos++;
     this.onsetFixes++;
   }
 
```
(Bara `src/analyserClock.ts`. `ANALYSER_SHARED.md5` är inte omräknad - görs vid inläggning.)

## Siffrorna (övningen, mätt på exakt den här koden)
| | poäng | inom3 % | median s | medel s | ifas % | FEL | par |
|---|---|---|---|---|---|---|---|
| f1 | +0,4 | 5,3 | 6,46 | 8,94 | 85,7 | 9,20 | 98,6 |
| bas (a3c) | 0 | 7,9 | 7,98 | 9,00 | 86,1 | 9,27 | 98,2 |

Bättre på 12 skarvar (t.ex. 200719 826: 12,7 -> 4,9 s, 151659 449: 11,0 -> 2,9 s, 160345 468: 7,0 -> 3,9 s), sämre på 8: 160345 374
(7,9 -> 25,9 s), 200719 577 (1,5 -> 11,5 s), 151659 290 (6,4 -> 11,3 s), 171840 195 (10,2 -> 13,3 s), 200719 488 (2,3 -> 3,5 s, därav
inom3 8 -> 5 %). ifas -0,4. pardom: FEL 9,20, par 98,6, oktav 5,7 (bas 5,3), lead oförändrad.

Det jag lärde mig på vägen (8 mätningar): snabbare varianter (median 5,2-5,4 s, inom3 upp till 10,5 %) föll alla på FEL (10,6-10,9):
200719 vid ~90 s tog en vandrande topp (halvslag -> -0,33) och resten av filen kaskaderade (85, 285, 525, 975 blev fel). "Ur lugn"-kravet
och minst två sökningar räddade FEL men åt det mesta av farten. Topp/tvåa skiljer INTE säkert verkliga hopp från falska i början av ett hopp
(båda ~1,0-1,5 när nya toppen just passerat gamla i 5 s-vikningen) - det är därför inom3 inte går att nå utan kortare fönster.

## Risken
- Vinsten är liten och delvis kaotisk: ett taget hopp ändrar minnet (lmTurn) och allt efter, så per-skarv-följtiderna hoppar åt båda hållen.
  Kontrollmängden kan mycket väl hamna under bas.
- Ladan: rena halvslagshopp (DJ-övergång en halv takt fel) följs som förut (a3c, 5-8 s). Ett hopp som kommer mitt i stökig takt (inte ur
  lugn) följs också bara av a3c.
- cpu: en extra 48-facksslinga när en sökkandidat blir bäst (högst 11 per 250 ms) + några tal per beslut; inga allokeringar, ingen ny FFT.
