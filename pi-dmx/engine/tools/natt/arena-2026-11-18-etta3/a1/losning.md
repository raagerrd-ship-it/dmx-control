# a1 MÄTFÖNSTRET - orsaken var inte fönstret

## Idén
Kortets hypotes (a6 flyttade var i slaget K/R/L och backbeat samplas) håller inte: anslaget ligger fortfarande mitt på rutnätets punkt, och i ren 4/4 är beslutet bit-identiskt om man flyttar eller smalnar fönstret. Det som levereras är en liten lagning av samplingen: ettan väljs först när alla fyra slagplatser har mätts minst 4 gånger sedan låtgränsen, så ett ensidigt samplat minne (tempohopp efter relock) inte kan välja trean.

## Orsaken (mätt)
- Ticken mot Beat This: median -53/-60/-67 ms före och efter a6, IQR lika (151659 -53 -> -60, övriga 0-7 ms). Referensen flyttades högst 7 ms.
- Diagnos-sonder (alla tre övningsfilerna, loggade per hopp) + en Python-simulator av barStep/barCommit (exakt på 151659, 0 av 1135 beslut fel): kickens anslag ligger på +0,007..+0,012 slag från punkten; 64-75 % av slagen inom +-0,05.
- K-fönstret +-0,12 i stället för -0,2..+0,3: noll ändrade tick i ren 4/4 på alla tre filerna.
- 151659 (a6:s förlust 98,9 -> 92,8): första beslutet vid 9,9 s i introt (16 slag), där slag 3:s kick är starkare än slag 1:s. Före a6 gav en extra tick vid 2,13 s en annan räkning och då blev myntet rätt. Ett myntkast, inte fönstret.
- Övriga förluster: a6 parar fler tick i svåra partier (151659 800 -> 976), där ettan redan var fel.

## Delarna
| del | vad den gör | mått (m2) | varifrån |
|---|---|---|---|
| A varje slag mätt (`barC`) | inget val förrän alla fyra platserna har >= BAR_MIN/4 slag sedan barReset | ren 86,61 (bas 86,61), omval 0,74 -> 0,72, poäng +0,10 | ny |
| (förkastad) anslagsgrind | slag vars största kickstigning ligger > 0,15 slag från punkten röstar inte | m1 -1,56 DISK (etta alla 75,4); 200719 92 -> 87 | ny |

Varför grinden föll: 200719 vid 300 s, 94 bpm. Ettans kick kommer 0,176 slag FÖRE punkten (upptakt), slag 3:s precis på. Grinden kastade ettans röst och valde trean, som sedan satt kvar i 180 s. Fönstrets främre del (-0,2) fångar upptakten till ettan. Den ska vara kvar.

## Kostnaden
Bara workern (BeatFeed): en Float64Array(4), en addition per slag och fyra jämförelser per slag. Huvudtråden rörs inte. Nytt minne 32 byte.

## Siffrorna (m2, övningen)
| fil | ren | trean | etta alla | omval | paslag | FEL | lead |
|---|---|---|---|---|---|---|---|
| 151659 | 92,8 (=) | 6,0 | 93,9 | 0,12 | 96,4 | 10,4 | -60 |
| 171840 | 75,3 (=) | 21,8 | 74,8 | 0,64 | 89,1 | 7,4 | -53 |
| 200719 | 91,8 (=) | 4,9 | 66,2 (bas 67,0) | 1,41 (bas 1,47) | 90,1 | 13,0 | -67 |
Sämre: etta alla 78,6 -> 78,3 (200719 -0,8), inom spärren.

## Risken
Efter en låtgräns med tempohopp dröjer ettan tills alla fyra platserna har mätts; under tiden gäller förra ettan (barOff & 3). Breaks och musik utan trumma påverkas inte, för slaget räknas oavsett styrka. Udda takter förändras inte. Effekten är liten: delen ändrar inte ren 4/4 på övningen och är ett skydd, ingen vinst.

Till jokern: fönstret är inte vägen till ettan. Diagnos-loggarna `sond/diag-*.txt` (hopp: now pos rk rl k treble, commit: idx tb per barJ jr slot barM barN barOff) räcker för att simulera taktmodellen offline. Rösterna skiljer 1 från 3 med P(1 > 3) = 0,56-0,72 i ren 4/4 (L bäst på 151659).

## Diffen
```diff
diff --git a/.arena/etta3/bas/src/analyserClock.ts b/.arena/etta3/a1/src/analyserClock.ts
index 0832641..e254e78 100644
--- a/.arena/etta3/bas/src/analyserClock.ts
+++ b/.arena/etta3/a1/src/analyserClock.ts
@@ -86,7 +86,7 @@ export class BeatFeed {
   private pwWn = 0; private pwDt = 0; private pwCand = 0; private pwRun = 0; private pwQuietAt = 0; pwVetos = 0; pwFixes = 0;
   private tgHalfR = 0; octR = 0; private octN = 0; private octHi = false;   // OKTAVKANTEN
   private goodOn = 0; private goodRep = 0; private goodAt = 0;   // TAKTEN GENOM BREAKET
-  private readonly barK = new Float64Array(4); private readonly barL = new Float64Array(4);   // ETTAN (a5)
+  private readonly barK = new Float64Array(4); private readonly barL = new Float64Array(4); private readonly barC = new Float64Array(4);   // ETTAN (a5)
   private barN = 0; private barIdx = NaN; private bK = 0; private bL = 0; private barOff = 0; barShifts = 0;
   private barM = 0; private barJ = 0; private barJr = 0; private barPT = 0; private barPI = NaN;   // ettan räknas i musikens slag (a1, per slag a6)
   private readonly barR = new Float64Array(4); private bE = 0; private bE1 = 0; private bE2 = 0; private bEm = 0;   // kickens återstart (a2)
@@ -412,7 +412,7 @@ export class BeatFeed {
     return false;
   }
 
-  private barReset(): void { this.barK.fill(0); this.barL.fill(0); this.barR.fill(0); this.barX.fill(0); this.barTi = NaN; this.bE1 = 0; this.bE2 = 0; this.bEm = 0; this.barN = 0; this.barIdx = NaN; this.barM = this.barOff & 3; this.barJ = 0; this.barJr = 0; this.barPI = NaN; }
+  private barReset(): void { this.barC.fill(0); this.barK.fill(0); this.barL.fill(0); this.barR.fill(0); this.barX.fill(0); this.barTi = NaN; this.bE1 = 0; this.bE2 = 0; this.bEm = 0; this.barN = 0; this.barIdx = NaN; this.barM = this.barOff & 3; this.barJ = 0; this.barJr = 0; this.barPI = NaN; }
 
   /** ETTAN (se BAR_DECAY). */
   private barStep(frame: Frame, beat: NonNullable<EngineConfig["beat"]>, now: number): void {
@@ -453,12 +453,13 @@ export class BeatFeed {
     this.barPT = tb; this.barPI = this.barIdx; const jr = this.barJr = Math.floor(this.barJ + 0.5);
     const K = this.barK, L = this.barL, R = this.barR, slot = (((this.barIdx - jr) % 4) + 4) % 4;
     for (let i = 0; i < 4; i++) { K[i] *= BAR_DECAY; L[i] *= BAR_DECAY; R[i] *= BAR_DECAY; this.barX[i] *= BAR_DECAY; }
-    K[slot] += this.bK; L[slot] += this.bL;
+    K[slot] += this.bK; L[slot] += this.bL; this.barC[slot]++;
     { const e = this.bE, pm = this.bE1 > this.bE2 ? this.bE1 : this.bE2;
       if (this.bEm > 0 && e > pm) R[slot] += Math.min(BAR_R_MAX, (e - pm) / this.bEm);
       this.bE2 = this.bE1; this.bE1 = e; this.bEm += (e - this.bEm) / 16; }
     if (this.barN < 1000) this.barN++;
     if (this.barN < BAR_MIN) return;
+    { const C = this.barC; if (C[0] < BAR_MIN >> 2 || C[1] < BAR_MIN >> 2 || C[2] < BAR_MIN >> 2 || C[3] < BAR_MIN >> 2) return; }   // varje slag mätt (a1)
     const sK = K[0] + K[1] + K[2] + K[3], sL = L[0] + L[1] + L[2] + L[3], sR = R[0] + R[1] + R[2] + R[3], X = this.barX;
     const sX = Math.abs(X[0]) + Math.abs(X[1]) + Math.abs(X[2]) + Math.abs(X[3]);
     if (!(sK > 0)) return;
```
