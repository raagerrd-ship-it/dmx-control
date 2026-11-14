# a5 – KLOCKAN HITTAR BYTET SJÄLV (klockan)

## IDÉN
Klockan släpper redan själv ett hållet tempo för nytt material, men dömde bara mot regentens egen färska poäng – och när regenten
tystnar (låtens sista slag, ett break) vinner vilken topp som helst, även i ett varv där hela tempogrammet är uppblåst av en enda
transient. Nu är ett färskt varv bevis bara när toppen står över varvets brustak, och regenten släpps först efter fyra sådana varv i
följd (~1,5 s, en takt): en ny låt är en puls som sticker ut och STÅR KVAR, ett slutackord eller ett break är en puls som försvinner.

## DELAR
| del (allt i `tgStep`) | bär |
|---|---|
| 1. brustaket på regentens släpp, k4b-vägen (`&& any && W[fk] > nc`) | **takt** +8 s, **utanfor** +0,5: 136–142 (131 -> 80 före droppet) och 256–264 (sista slaget) borta |
| 2. `TG_NEW_N = 4` varv i stället för 2 på samma väg | marginalen + 228–230 i 171840; kostar **lastid** +0,1 s (406-skarven 0,5 s senare) |
| 3. samma brustak på START-lägets snabba byte | **takt** +2 s (265–267), klockans byten 29 -> 24 i 160345 |

Låtgränser, falska och drop är orörda (200/264/401 och 151 som bas).

## MARGINALER (klockan ensam, fel s 160345 + 171840; bas 39 + 23, a5 30 + 22)
| gräns | −25 % | vald | +25 % |
|---|---|---|---|
| `TG_NEW_N` (ny) | 3: 29 + 22 | 4: 30 + 22 | 5: 30 + 22 |
| brustaket `TG_NOISE` (befintlig, används nu på två ställen till) | 0,45: 28 + 23 | 0,6: 30 + 22 | 0,75: 31 + 21 |

Utan del 2 tål del 1 inte −25 % (slutackordets svans ligger 0,05 under brustaket, 258–265 kommer tillbaka: +4 s). Utan del 1 ger fyra
varv ingenting. Brustaket bär, varven håller marginalen.

## SIFFRORNA
| | poäng | takt % | fel s | utanför | låstid | låtbyten | falska | 160345 | 171840 |
|---|---|---|---|---|---|---|---|---|---|
| bas | 93,06 | 92,6 | 64 | 95,2 | 7,1 | 3/4 | 1 | | |
| m1 (del 1 + 3) | 94,22 | 93,7 | 54 | 95,5 | 7,1 | 3/4 | 1 | 95,0 %, lås 13 / 9 | 91,1 %, lås 2 / 5 |
| **m2 (slutlig)** | **94,27** | 93,8 | 54 | 95,7 | 7,2 | 3/4 | 1 | 94,9 %, lås 13 / 9 | 91,4 %, lås 2 / 5 |

Sämre: låstiden +0,1 s. Kostnad x1,44 (m1 x3,1 under full maskinlast; ändringen är två jämförelser per varv). m3 oanvänd.

## RISKEN
- En ny låt som i dag tas på snabba vägen kommer 0,7 s senare; bevissumman (som tog 130- och 272-skarvarna) är orörd. En ny låt med
  mycket svag puls (toppen under 1,8 x varvets median) tas bara av bevissumman eller låtgränsen.
- Släktingar (85/105 i st f 141 i introt 270–278, 100/108 i st f 146 vid 32–39) är START-lägets syskonval – orört (a7).
- Mixar och tempobyte mitt i låt: samma väg, fyra varv. Tyst intro, tal: inget nytt, break-hållet orört.

## PROVAT OCH FÖRKASTAT (idébanken; koden i `prov-hallslapp.ts.txt`, `prov-flaggor.ts.txt`)
- **Släpp ur break-hållet i en ny låts baslösa intro** (kortets andra halva: färsk topp tydlig, ingen 4:3/3:2-släkting, 3,5 s). Utan
  låtgränser fryser hållet klockan 258–286, men släppet kom först 282,4 (141 syns varken i bas eller diskant före 276,9) och fantomer
  i vanliga break nådde 2,7–3,0 s (105 vid 368–371, 80 vid 299). Knivsegg, ingen effekt med gränser.
- **Gränsen nollar inte en levande regent**: räddar inte 201–204 (basen digitalt tyst = inget bevis alls) och gav 218–230 fel i 171840.
- Fynd: bevissummans golv faller till 1 när regenten tystnar; ett enda varv räcker då, och 2:3-släktingen 89 vinner i breaket vid 217
  på knivsegg (summan −0,54 med nollningen vid 151, 0,00 utan). Långsam hälsa och två varv i följd på summan: 0 till −2 s.
- Fysisk gräns vid 406: färska minnet visar 86 (2/3 av 130) till 413, 130 först 413,2; klockan byter 414,3.

## DIFFEN (`git diff --no-index src .arena/lat1/a5/src`)
```diff
diff --git a/src/ANALYSER_SHARED.md5 b/.arena/lat1/a5/src/ANALYSER_SHARED.md5
index dbe0948..8701374 100644
--- a/src/ANALYSER_SHARED.md5
+++ b/.arena/lat1/a5/src/ANALYSER_SHARED.md5
@@ -10,5 +10,5 @@ e92d0d6b4f8dc36abfb8135004260806 analyserLevel.ts
 dbb860c7483c4e7e938d610712337b96 analyserCharacter.ts
 a8846ca6595ddef8409a6ab432acf375 split.ts
 c7a59a6760df39770f3aca2332dac5c2 slowWorker.ts
-d0a49e4f782e81bdfdf8293eb0b45bf4 analyserClock.ts
+9b07230235b993a7a942534262fd1d82 analyserClock.ts
 d94c850c565827c9075e63127132213f recorder.ts
diff --git a/src/analyserClock.ts b/.arena/lat1/a5/src/analyserClock.ts
index cea56ed..44ff562 100644
--- a/src/analyserClock.ts
+++ b/.arena/lat1/a5/src/analyserClock.ts
@@ -35,6 +35,7 @@ const TG_WIN_MS = 5000, TG_FULL_N = 900, TG_FWIN_MS = 3500, TG_FFULL_N = 630, TG
 const TG_NOISE = 0.6, TG_NB = 2, TG_SW_P = 1, TG_SW_G = 2, TG_HL_A = 0.5, TG_LOCK_N = 8, TG_LA = 0.04, TG_KNOWN = 0.5, SCAN_HOLD = 1.06;
   // HÅLLEN TOLKNING EFTER SÄKER LÅSNING
 const TG_SONG_A = 1 / 160;
   // LÅTENS MINNE
 const TG_BRK_DB = 24, TG_BRK_MAX_MS = 30000;
   // BREAK OCH DROP ÄR SAMMA LÅT
+const TG_NEW_N = 4;   // SLÄPPET: tydliga varv i följd innan regenten släpps för nytt material
 const HV_R = [4 / 3, 3 / 4, 3 / 2, 2 / 3, 5 / 4, 4 / 5], HV_K = 1.25, HV_N = 5, HV_AGE = 30, TG_OCT_LO = 79.6, TG_OCT_LO_N = 8;
   // a3 TOPPRÖSTEN
 const PW_RING = 4096, PW_WIN_MS = 10000, PW_MIN = 0.5, PW_Q = [4 / 3, 3 / 4, 3 / 2, 2 / 3];
   // TAKTENS SJÄLVLIKHET
 const TG_K = 139, TG_STEP = Math.pow(2, 1 / TG_K), TG_PER_HOP = 1, TG_A = 0.21, TG_MIN_N = 300, TG_FINE = 0.0025, TG_HALF = ONSET_BINS >> 1;
@@ -212,8 +213,8 @@ export class BeatFeed {
         const r = this.tgR, L = this.tgAccL; let fk = -1, fv = 0; for (let i = 0; i < TG_K; i++) if (accF[i] > fv) { fv = accF[i]; fk = i; }
         const d0 = fk < 0 ? 0 : Math.abs(fk - r), dd = Math.min(d0, TG_K - d0);
         const fc = Math.max(accF[r], accF[(r + 1) % TG_K], accF[(r + TG_K - 1) % TG_K]);
-        if (fk >= 0 && dd > TG_SW_STEPS && fv >= fc * TG_HOLD) {
-          if (++this.tgSw >= TG_SW_N) {
+        if (fk >= 0 && dd > TG_SW_STEPS && fv >= fc * TG_HOLD && any && W[fk] > nc) {
+          if (++this.tgSw >= TG_NEW_N) {
             let lf = 0, lr = 0; for (let d = -2; d <= 2; d++) { const a = L[(fk + d + TG_K) % TG_K], b = L[(r + d + TG_K) % TG_K]; if (a > lf) lf = a; if (b > lr) lr = b; }
             if (lf < TG_KNOWN * lr) { acc.set(accF); this.tgSwitches++; this.tgR = -1; this.tgLk = 0; this.tgLkK = -1; }
             this.tgSw = 0;
@@ -228,7 +229,7 @@ export class BeatFeed {
         const kc0 = ((Math.round(Math.log(this.tempoBpm / 80) / Math.log(TG_STEP)) % TG_K) + TG_K) % TG_K;
         const d0 = fk < 0 ? 0 : ((fk - kc0) % TG_K + TG_K) % TG_K, dd = Math.min(d0, TG_K - d0);
         const fc = Math.max(accF[kc0], accF[(kc0 + 1) % TG_K], accF[(kc0 + TG_K - 1) % TG_K]);
-        if (fk >= 0 && dd > TG_SW_STEPS && fv >= fc * TG_HOLD) { if (++this.tgSw >= TG_SW_N) { acc.set(accF); this.tgSw = 0; this.tgSwitches++; } } else this.tgSw = 0;
+        if (fk >= 0 && dd > TG_SW_STEPS && fv >= fc * TG_HOLD && any && W[fk] > nc) { if (++this.tgSw >= TG_SW_N) { acc.set(accF); this.tgSw = 0; this.tgSwitches++; } } else this.tgSw = 0;
       }
       let bk = -1, bv = 0;
       if (held) { bk = this.tgR; bv = acc[bk]; for (let d = -2, c0 = bk; d <= 2; d++) { const j = (c0 + d + TG_K) % TG_K; if (acc[j] > bv) { bv = acc[j]; bk = j; } } if (!(bv > 0)) bk = -1; }
```
