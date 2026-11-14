# a4 – TONINGEN (låtgränsen)

## IDÉN
En ny låt börjar med en toning: nivån faller under låtens eget tak och är strax tillbaka (uttoning, kort glapp, intoning), så formvägen får bara säga en låtgräns vid en skarv som ligger i en sådan toning. Ett fall som inte är tillbaka inom några sekunder är ett hål (break) och ger aldrig en gräns, och ett formskifte utan nivåhändelse (delen efter ett break, vers/refräng – de sker på slaget) räknas inte heller.

Taket = nivåns max som faller 0,15 dB/s och nollas vid varje gräns; ingen absolut nivå. Tystnad 3 s under släckgränsen är kvar.

## DELAR
- `toning()` + `toned()` + villkoret i `formDecide` (hela ändringen, bara `boundaryDetector.ts`): bär **falska** 1 -> 0 (uppbyggnaden vid 200 s är ett hål på 11,3 s) och **takt** +4 s i fil 1 (ingen omlåsning 200–204 s).
- **latbyten** 3/4 och **lastid** oförändrade, drop oförändrade. Klockan är orörd.
- Kostnad: tre jämförelser per hopp, formjämförelsen hoppas över utan toning. 213 us/hopp i m1 är maskinlast (låtgränsen ensam: ingen mätbar skillnad mot bas).

## MARGINALER (låtgränsen ensam, `--set`)
| gräns | värde | −25 % | +25 % | domen ändras? | håller i spannet |
|---|---|---|---|---|---|
| T_DB djup under taket | 12 dB | 9: samma | 15: samma | nej | 9–15 (8: falsk 221 s; 16: fil 2 tappar träffen) |
| T_MAX_MS längsta toning | 6000 | 4500: samma | 7500: samma | nej | 4000–11000 (3000: fil 2 tappar; 12000: falsk 206 s) |
| T_FALL takets fall | 0,15 dB/s | samma | samma | nej | 0,05–0,5 |
| T_RING minne | 4 | – | – | nej | 1–4 |

"Samma" = samma träffar, 0 falska, gränsen flyttas högst 0,5 s. Men klockans svar på den halva sekunden är inte stabilt (klockan ensam med gränserna för T_DB 9/12/15: fil 1 90,3 / 93,3 / 92,8 %, fil 2 91,2 / 91,2 / 87,3 %) – klockans lotteri efter en omlåsning, inte toningens dom.

## SIFFRORNA (1 av 3 mätningar använd)
| | poäng | takt | fel s | utanför | låstid | låtbyten | falska |
|---|---|---|---|---|---|---|---|
| bas | 93,06 | 92,57 | 64 | 95,17 | 7,1 | 3/4 | 1 |
| m1 | 93,51 | 91,99 | 69 | 94,58 | 7,2 | 3/4 | 0 |

- 160345: takt 93,3 -> 93,6 %, låstid 13,2 / 9,1, gränser 262,85 + 415,57 (bas: 199,85 falsk, 263,97, 400,58).
- 171840: takt 91,1 -> 88,6 %, låstid 1,9 / 4,7, gräns 152,65 (bas 150,64).
- SÄMRE: fil 2 tappar 7 s i breaket 220–229 s (basen 17–23 dB under taket, break-hållet kräver 24, klockan fri). Klockan ensam med gränsen var som helst 137–160 s: 16 av 24 ger det dåliga utfallet, bas råkade få det goda. Utanför-spärren har 0,4 %-enheter kvar.
- Träffen i fil 2 är sen: skarven 128 s har en toning men form 1,12; gränsen sägs vid stoppet 144,5 s (form 1,61). Skarven 272 s missas (dipp 10 dB, form 1,25).

## RISKEN
- Skarvar utan nivådipp (dj-mix, megamix, crossfade): formvägen ensam kunde träffa dem, nu tiger den. Störst risk, inte mätbar här.
- Ny låt som börjar mer än 6 dB under förra låtens tak utan ett anslag ser ut som ett hål och missas (406-skarven klarade sig på ett basslag).
- Kort break (< 6 s) följt av annan klang kan ge en gräns inne i låten.
- Tal mellan låtar: hål, ingen gräns före 3 s tystnad. Tyst intro, tempobyte och släktingar rörs inte.

## PROVAT OCH FÖRKASTAT (fria prov)
- Gränsens tidpunkt som spak för klockan (svep runt alla fyra skarvar, slut + början som två gränser): ingen systematisk vinst.
- Håll i klockan medan baskroppen faller: 1085 -> 1036 och 509 -> 459 rätt. Återställt.
- Nivån ensam som gräns: skarvarna 128/407 går inte att skilja från stopp inne i låten (alla 24–29 dB djupa). Lägre formtröskel vid toning: stopp i låten når 0,98, skarven 1,12 – ingen marginal.

## DIFFEN
Byte-exakt (filen har blandade radslut): `.arena/lat1/a4/losning.diff`. Samma utan CR:

```diff
diff --git a/src/boundaryDetector.ts b/.arena/lat1/a4/src/boundaryDetector.ts
index 04cdb7c..f869c1c 100644
--- a/src/boundaryDetector.ts
+++ b/.arena/lat1/a4/src/boundaryDetector.ts
@@ -27,6 +27,8 @@ const F_WC = 6, F_WB = 1;   // vikter kroma, tempo
 const F_THR = 1.3;   // MATT (med F_TMIN)
 const F_TMIN = 0.3;   // en falsk grans nollar tempolaset och byter manus, en missad kostar bara...
 const F_RING = 256;
+const T_DB = 12, T_MAX_MS = 6000, T_FALL = 0.15;   // TONINGEN: djup under latens tak (dB), langsta toning, takets fall (dB/s)
+const T_LO = Math.pow(10, -T_DB / 20), T_HI = Math.pow(10, -T_DB / 40), T_K = T_FALL * Math.LN10 / 20000, T_RING = 4;
 
 /** Median. */
 function median(a: Float64Array): number {
@@ -122,7 +124,7 @@ export class BoundaryDetector {
     const j = this.fCount - 1 - F_G - F_LA, a0 = j - F_G - F_LB, b0 = j + F_G;
     if (a0 < 0 || this.fCount - a0 > F_RING) return;
     const R = F_RING, sAt = this.fT[j % R];
-    if (sAt - this.playStart < MIN_SEG_MS || this.fT[a0 % R] <= this.playStart) return;
+    if (sAt - this.playStart < MIN_SEG_MS || this.fT[a0 % R] <= this.playStart || !this.toned(sAt)) return;
     const ma = this.fMa, ca = this.fCa, cb = this.fCb; ma.fill(0); ca.fill(0); cb.fill(0);
     for (let q = 0; q < F_LB; q++) { const k = (a0 + q) % R, o = k * F_NB, oc = k * 12;
       for (let b = 0; b < F_NB; b++) ma[b] += this.fLb[o + b];
@@ -157,9 +159,27 @@ export class BoundaryDetector {
       return;
     }
     if (now - this.lastLoud > SILENCE_END_MS) { this.commit(); return; }
+    this.toning(now, o.level);
     this.boundary(now, now - this.playStart, o);
   }
 
+  private tak = 0; private takAt = 0; private dipAt = 0; private readonly ton = new Float64Array(2 * T_RING); private tonN = 0;   // TONINGEN
+  /** TONINGEN: nivan mot latens tak. */
+  private toning(now: number, lv: number): void {
+    const dt = now - this.takAt; this.takAt = now;
+    const c = dt > 0 && dt < 1000 ? this.tak - this.tak * T_K * dt : this.tak; this.tak = lv > c ? lv : c;
+    if (!this.dipAt) { if (lv < this.tak * T_LO) this.dipAt = now; return; }
+    if (lv < this.tak * T_HI) return;
+    if (now - this.dipAt <= T_MAX_MS) { const i = 2 * (this.tonN++ % T_RING); this.ton[i] = this.dipAt; this.ton[i + 1] = now; }
+    this.dipAt = 0;
+  }
+  /** Ligger skarven i en toning. */
+  private toned(at: number): boolean {
+    const w = F_G * F_BLK_MS, t = this.ton;
+    for (let i = 0; i < 2 * T_RING; i += 2) if (t[i + 1] > 0 && at >= t[i] - w && at <= t[i + 1] + w) return true;
+    return false;
+  }
+
   /** KLANGSKIFTE. */
   private pushNovelty(mag: Float32Array, binHz: number): void {
     const now = this.clock();
@@ -272,5 +292,6 @@ export class BoundaryDetector {
     this.boundaryCount++;
     this.playStart = 0;
     this.resetNovelty(); this.fPendAt = 0; this.loudSince = 0;
+    this.tak = 0; this.dipAt = 0; this.ton.fill(0);
   }
 }
```
