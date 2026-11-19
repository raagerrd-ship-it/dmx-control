# a8, takt13: mönster vikta modulo två (kort: 1 = 3, 2 = 4)

## IDÉN
Ettans taktmall (kickstigning K, återstart R, bas L, backbeat X över fyra platser) viks till två platser: jämn (1+3) mot udda (2+4). Analysatorn
väljer bara PARITETEN och flyttar ettan ett slag framåt när pariteten byter. 1 och 3 slåss inte längre om ettan, och varje mall får dubbelt så mycket data.
Takten (fasen) ändras inte. Kortets andra halva, att fasen ska använda en vikt mall, provade jag offline och förkastade den (se nedan).

## DELARNA
| del | vad den gör | mått (m2) | varifrån |
|---|---|---|---|
| D1 paritetsvalet | v(i) som förr, summeras till v0 = v(0)+v(2) och v1 = v(1)+v(3); byte när den andra pariteten leder med BAR_MARGIN; barM += 1 (minsta framåtflytt) | par 97,5 -> 96,3 (SÄMRE), FEL 10,27 -> 10,2 (151659 10,4 -> 10,2) | kortet |
| (m1) D1 + BAR_MIN 8 + marginal x sqrt2 | snabbare första beslut, strängare byte | par 96,4, FEL 10,2 | kortet ("snabbare") |
| D2 FÖRKASTAD, ej i koden | fasvakt: en tvåslagsmall skiljer slag (kick/virvel växlar) från offbeat (lika varje gång) | offline i python på övningens ljud mot Beat This: falsklarm i 10-25 % av rätta 5-10 s-fönster, träff i ~50 % av motslagsfönstren -> går inte att skilja | kortet |

## KOSTNADEN
Mindre räkning än basen: samma fyra v(i) per slag, två summor i stället för en topp-tvåa-sökning. Körs i workern (taktvägen). Nytt minne 0 MB, huvudtråden orörd.

## DIFFEN
```diff
--- a/.arena/takt13/bas/src/analyserClock.ts
+++ b/.arena/takt13/a8/src/analyserClock.ts
@@ -462,13 +462,14 @@ export class BeatFeed {
     if (!(sK > 0)) return;
-    let bi = 0, best = -1e9, second = -1e9;
+    let v0 = 0, v1 = 0;
     for (let i = 0; i < 4; i++) {
       const v = K[i] / sK + (sR > 0 ? R[i] / sR : 0) + (sL > 0 ? BAR_W_BASS * L[i] / sL : 0)
         + (sX > 0 ? BAR_W_BEAT * (X[(i + 1) & 3] + X[(i + 3) & 3] - X[i] - X[(i + 2) & 3]) / sX : 0);
-      if (v > best) { second = best; best = v; bi = i; } else if (v > second) second = v;
+      if (i & 1) v1 += v; else v0 += v;
     }
-    if (bi !== this.barM && best - second >= BAR_MARGIN) { this.barM = bi; this.barShifts++; }
+    const pb = v1 > v0 ? 1 : 0, dv = v1 > v0 ? v1 - v0 : v0 - v1;
+    if (pb !== (this.barM & 1) && dv >= BAR_MARGIN) { this.barM = (this.barM + 1) & 3; this.barShifts++; }
   }
```
(Varning för den som applicerar: analyserClock.ts har ensamma CR mitt i raderna. Läs/skriv med newline='' så att de inte blir radbrytningar.)

## SIFFRORNA (pardom, FEL/par per fil)
| | FEL | par | oktav | paslag | 151659 | 171840 | 200719 | poäng |
|---|---|---|---|---|---|---|---|---|
| bas | 10,27 | 97,5 | 5,6 | 91,9 | 10,4/98,8 | 7,4/97,1 | 13,0/96,7 | |
| m1 | 10,2 | 96,4 | 5,6 | 91,9 | 10,2/98,4 | 7,4/93,9 | 13,0/96,9 | -0,48 |
| m2 | 10,2 | 96,3 | 5,6 | 91,9 | 10,2/98,4 | 7,4/93,5 | 13,0/96,9 | -0,56 |
Lead oförändrad (-60/-53/-67). Sämre: par i 171840 (förskjutning 3: 2,7 -> 5,9 %), mest i två stråk (40 s och 145 s) där basen hoppade direkt 3 -> 0
medan paritetsvalet tar två byten, eller byter senare. Parfelet försvann nästan på förskjutning 1 (0,9/0,3/1,7 -> 0,0/0,5/1,4).
FEL-vinsten är ett fönster i 151659 och är inte att lita på.

## SLUTSATS OCH RISK
Att vika mallen ger inte stadigare paritet. Fyraplatsmallens skillnad mellan 1 och 3 (K/R/L) gör att "bästa platsen" sticker ut tydligare,
och då hittar basen också rätt paritet snabbare. Jokern ska INTE ta D1. I ladan blir risken liten (samma tal i samma tid), men paritetsfelen blir fler
efter fasbyten och breaks. Musik utan virvel ger lika jämna och udda platser. Då står pariteten still, precis som förr.
