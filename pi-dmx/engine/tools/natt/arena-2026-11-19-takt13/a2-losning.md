# a2 PARET UR TRUMMORNA - losning (arenan takt13)

## IDÉN
Ettans beslut har nu två tillstånd i stället för fyra. Paret (1/3 mot 2/4) väljs ur kontrasten mellan låga anslag (kickens stigning K, kickens återstart R, basen L) och diskantens backbeat (X, virvel/clap på 2 och 4), vikta över halvtakten. Bara ett parbyte flyttar barOff (+1 slag), så 1<->3-hoppen och de felpar som uppstod mitt i dem är borta. Takten (tickens tider) rörs inte, så FEL är i stort sett oförändrat (10,27 -> 10,20). Paret håller sig inom spärren men blir inte bättre än basens (96,3 mot 97,5).

## DELARNA
| del | vad den gör | mått den bär | varifrån |
|---|---|---|---|
| D1 tvåtillståndsbeslut (m2, levereras) | basens poäng v[i] summeras per par (p0 = v0+v2, p1 = v1+v3); byter paret när det andra leder med BAR_MARGIN; barM += 1 | par 96,3 (bas 97,5), FEL 10,20 (bas 10,27); 171840 sämre (93,5 mot 97,1) | basens särdrag (a5/a2/a8r i etta) |
| D2 log-kontrast kick mot diskant (m1, EJ levererad, `m1.diff`) | ln(kickstigning/medel) − ln(diskantstigning/medel) per slag, medel per par (decay 0,99), marginal 0,15; ersatte K/L/R/X helt | par 94,3 = DISK (151659 91,6) | nytt; offline mot Beat This: diskanten 3,5-10 kHz bär virveln, mid/highMid gör det inte (samma fynd som a5 i etta) |

Lärdom för jokern: D2 ensam är för långsam vid låtstart. Vid 151659 423 s låg paret fel i 37 tick och vid 171840 143 s i 18. Där tar basens accent på ettan (K) och återstarten (R) beslutet på några få slag. D1 blir intressant först om något annat gör basens särdrag snabbare.

## KOSTNADEN
D1: allt körs i workern som förut och huvudtråden rörs inte. Räkningen per färdigt slag är densamma (fyra v[i]) och en sortering mindre. Inget nytt minne.
D2 (om den lyfts): workern, två log per slag och en ring om 6 värden; fem gamla arrayer tas bort, så minnet minskar netto.

## DIFFEN (m2 = det som ligger i src)
```diff
diff --git a/.arena/takt13/bas/src/analyserClock.ts b/.arena/takt13/a2/src/analyserClock.ts
index 0832641..f9245d8 100644
--- a/.arena/takt13/bas/src/analyserClock.ts
+++ b/.arena/takt13/a2/src/analyserClock.ts
@@ -462,13 +462,13 @@ export class BeatFeed {
     const sK = K[0] + K[1] + K[2] + K[3], sL = L[0] + L[1] + L[2] + L[3], sR = R[0] + R[1] + R[2] + R[3], X = this.barX;
     const sX = Math.abs(X[0]) + Math.abs(X[1]) + Math.abs(X[2]) + Math.abs(X[3]);
     if (!(sK > 0)) return;
-    let bi = 0, best = -1e9, second = -1e9;
+    let p0 = 0, p1 = 0;
     for (let i = 0; i < 4; i++) {
       const v = K[i] / sK + (sR > 0 ? R[i] / sR : 0) + (sL > 0 ? BAR_W_BASS * L[i] / sL : 0)
         + (sX > 0 ? BAR_W_BEAT * (X[(i + 1) & 3] + X[(i + 3) & 3] - X[i] - X[(i + 2) & 3]) / sX : 0);
-      if (v > best) { second = best; best = v; bi = i; } else if (v > second) second = v;
+      if (i & 1) p1 += v; else p0 += v;
     }
-    if (bi !== this.barM && best - second >= BAR_MARGIN) { this.barM = bi; this.barShifts++; }
+    if ((this.barM & 1 ? p0 - p1 : p1 - p0) >= BAR_MARGIN) { this.barM = (this.barM + 1) & 3; this.barShifts++; }   // PARET: två tillstånd, ettan flyttas bara mellan paren
   }
 
   /** LÅTGRÄNSEN. */
```
(hela diffen, appliceras på basen; m1:s diff ligger i `a2/m1.diff`)

## SIFFRORNA (FEL / par / oktav / paslag / lead)
| fil | bas | m1 (DISK) | m2 |
|---|---|---|---|
| 151659 | 10,4 / 98,8 / 0 / 96,4 / −60 | 10,4 / 91,6 / 0 / 96,4 / −60 | 10,2 / 98,4 / 0 / 96,4 / −60 |
| 171840 | 7,4 / 97,1 / 3,7 / 89,1 / −53 | 7,4 / 94,7 / 3,7 / 89,2 / −53 | 7,4 / 93,5 / 3,7 / 89,1 / −53 |
| 200719 | 13,0 / 96,7 / 13,0 / 90,1 / −67 | 13,0 / 96,7 / 13,0 / 90,1 / −67 | 13,0 / 96,9 / 13,0 / 90,1 / −67 |
| medel | 10,27 / 97,53 | 10,27 / 94,33 | 10,20 / 96,27 → poäng −0,56 |

Sämre: 171840 144-153 s (sektionsbyte och drop 148,5). Paret låg fel i 21 tick, mot basens 9. Basens fyrtillståndsval råkade gå via trean (rätt par) innan det landade. I tvåtillståndsbeslutet ligger bevisen kvar i fel par tills droppen har bokförts.

## RISKEN
- Låtstart och drop: tvåtillståndsbeslutet kan bara byta par en gång. Leder det gamla paret kvar i minnet (decay 0,99) blir det långsammare än basens fyrtillståndsval, som syns i 171840.
- Halvtakt (virveln på 3): kick och virvel hamnar i samma par, kontrasten blir nära noll och paret hålls där det står (inget fladder, men heller ingen rättning).
- Aux från mixer: diskanten blir renare än via mic, så X väger troligen mer än i ladans inspelningar. Det är bra för paret.
- Udda takter och musik utan trumma: samma som basen, eftersom särdragen är oförändrade.

KLAR a2 poäng -0.56 OK
