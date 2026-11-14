# a6 – BREAKET ÄR SAMMA LÅT: bevisets kvalitet avgör om regenten får bytas

## IDÉN
Klockans hållna tempo (regenten) byts bara på bevis av kvalitet: det SNABBA bytet (två varv) kräver att utmanarens mönster
faktiskt upprepar sig 2 och 4 slag bort i de senaste 5 s, och bevissumman kräver samma mönster eller en ledning på ett helt golv till.
I ett break försvinner regentens rytm men ingen ny puls upprepar sig – en ny låt har däremot ett eget mönster eller samlar bevis varv
efter varv – så breaket hålls oavsett hur djupt basen sjunker (17–19 dB räcker), och en ny låt släpps igenom som förr.

**Fyndet bakom:** alla tre break-felen (136 s: 131 -> 80 före dropet, 227 s i `171840`, uttoningen 255–264 s) kom genom det snabba
bytet (k4b), inte genom bevissumman. Vid 136 och 255 hade bevissumman regenten i ledning hela vägen (vid 227 ledde fantomen med högst
0,31); det snabba bytet jämför bara två varv i det snabba minnet, där regentens poäng rasar i breaket och en fantom vinner med 1,35.

## DELAR (bara `analyserClock.ts`; `boundaryDetector.ts` orörd)
| del | rad | bär |
|---|---|---|
| D1 snabba bytet kräver mönster | `lf < TG_KNOWN * lr && this.pwReal(fk, now)` | takt (136–142 och 256–264 = 15 s), utanfor (+0,5) |
| D2 bevissumman utan mönster kräver ett golv till | `-D[r0] >= TG_Q_LEAD \|\| this.pwReal(nk, now)` | takt (227–230 = 3 s), utanfor |
| hjälparen `pwReal` | vittnets självlikhet (`pwSim`) på senare halvan av fönstret | delas av D1 och D2 |

lastid, latbyten, falska: ingen del bär dem (låtgränser och drop identiska med bas). 24 dB-hållet står kvar: det skyddar klockan när
den saknar regent (utan det kommer 223–230 och 261–264 tillbaka).

## MARGINALER (klockan ensam, fel sekunder `160345` + `171840`; bas 39 + 23 = 62)
| gräns | −25 % | vald | +25 % | utanför ±25 % |
|---|---|---|---|---|
| `TG_Q_SIM` 0,5 (= PW_MIN, "mönstret finns") | 0,375: 31 + 21 | 31 + 22 | 0,625: 31 + 22 | 99 (aldrig mönster): 32 + 23 |
| `TG_Q_LEAD` 1 (= TG_SW_P, ett golv) | 0,75: 32 + 22 | 31 + 22 | 1,25: 29 + 22 | 0: 31 + 23, 0,5: 28 + 22, 2: 30 + 22 |

Samma felavsnitt i alla (201–204, 265–278, 410–415 / 20–24, 27–29, 32–39, 129–131, 273–277); ändarna rör sig högst 1 s.

## SIFFRORNA
| | poäng | takt | fel s | utanför | låstid | låtbyten | falska | `160345` takt, låstider | `171840` takt, låstider |
|---|---|---|---|---|---|---|---|---|---|
| bas | 93,06 | 92,57 | 64 | 95,17 | 7,11 | 3/4 | 1 | 93,3 %, 13,2 / 8,6 | 91,1 %, 1,9 / 4,7 |
| m1 (förkastad form, se nedan) | 94,20 | 93,73 | 54 | 95,84 | 7,36 | 3/4 | 1 | 94,8 %, 13,2 / 9,1 | 91,6 %, 1,9 / 5,2 |
| **m2 (slutlösningen)** | **94,14** | 93,67 | 55 | 95,69 | 7,36 | 3/4 | 1 | 94,7 %, 13,2 / 9,1 | 91,6 %, 1,9 / 5,2 |

m3 oanvänd. **Sämre:** låstiden +0,25 s (skarvarna 406 och 272 låser 0,5 s senare: mönstret låg på 0,45 resp. 0,40 vid första
försöket och bytet gick ett–två varv senare). **Kostnaden** 222 µs i m2 är maskinens last (alla deltagare mätte ×2–4 samtidigt):
klockan ensam 64–74 µs/hopp mot 68–73 för bas; `pwReal` anropas 25 gånger på 15 min (0,004–0,016 µs/hopp i snitt), inga
allokeringar, inga nya buffertar. Bör mätas ensam.

Alla 25 anrop på övningen (`node .arena/lat1/a6/anrop.mjs <tap> <dist>`): 3 break/uttoning hållna, 3 riktiga låtbyten släppta, resten
skärmytslingar med 3:4-släktingen (104 mot 139) som hölls, utom en med tydligt mönster (367 s, släppt som i bas).

## FÖRKASTAT (för idébanken)
- Mönsterkrav på ALLA tempoval, även utan regent: `160345` fastnade på fel första val 20–72 s. Rätt tempo saknar upprepat mönster i
  39 % av alla varv (låtens första 90 s nästan alltid) – mönstret får därför aldrig ensamt sista ordet.
- m1: mönsterkrav + nödutgång "färska toppen samma tempo 8 varv". Samma poäng, men i mönstersvag musik står toppen aldrig 8 varv
  (30–75 s: längsta svit 2–5) – klockan kunde hålla förra låtens tempo utan gräns. Ersatt av ledningen i bevissumman.
- Ta bort 24 dB-hållet: 38 + 21 s. Sänka det till 18: 51 + 28 s. Mönsterkrav på snabba bytet utan regent: −3 s men nytt fel 310–312.

## RISKEN
- Ny låt utan upprepat mönster (synkoperad bas, långa basnoter): snabba bytet uteblir och bevissumman behöver ett golv till =
  ett–tre varv (0,4–1,1 s) senare än i dag. Aldrig längre: ledningen växer 0,6–1,2 per varv i en riktig ny låt.
- Break med en stadig fantom som upprepar sig (virvelrulle i jämna 16-delar): mönstret finns, bytet går som i dag.
- Tempobyte mitt i låt och 3:2/4:3-släktingar: som en ny låt; släktingarnas egna regler (kronan, vittnet) orörda. Halvtempo: orört.
- Tal mellan låtar, tyst intro: klockan utan regent är orörd; 24 dB-hållet och tystnaden som förr.
- Lotus delar filen: `song`-läget (Sonos) har ingen regent och berörs inte; mixläget får samma spärr. Inte bänkat på lotus.

## DIFFEN
Filen har blandade radslut; `a6.diff` i mappen är den råa diffen och `node .arena/lat1/a6/patch.mjs` bygger filen ur originalet.

```diff
diff --git a/src/ANALYSER_SHARED.md5 b/.arena/lat1/a6/src/ANALYSER_SHARED.md5
index dbe0948..6eb984f 100644
--- a/src/ANALYSER_SHARED.md5
+++ b/.arena/lat1/a6/src/ANALYSER_SHARED.md5
@@ -10,5 +10,5 @@ e92d0d6b4f8dc36abfb8135004260806 analyserLevel.ts
 dbb860c7483c4e7e938d610712337b96 analyserCharacter.ts
 a8846ca6595ddef8409a6ab432acf375 split.ts
 c7a59a6760df39770f3aca2332dac5c2 slowWorker.ts
-d0a49e4f782e81bdfdf8293eb0b45bf4 analyserClock.ts
+2d1f3bc7904c71a589e0c7fdaf09f079 analyserClock.ts
 d94c850c565827c9075e63127132213f recorder.ts
diff --git a/src/analyserClock.ts b/.arena/lat1/a6/src/analyserClock.ts
index cea56ed..5ee999f 100644
--- a/src/analyserClock.ts
+++ b/.arena/lat1/a6/src/analyserClock.ts
@@ -35,6 +35,7 @@ const TG_WIN_MS = 5000, TG_FULL_N = 900, TG_FWIN_MS = 3500, TG_FFULL_N = 630, TG
 const TG_NOISE = 0.6, TG_NB = 2, TG_SW_P = 1, TG_SW_G = 2, TG_HL_A = 0.5, TG_LOCK_N = 8, TG_LA = 0.04, TG_KNOWN = 0.5, SCAN_HOLD = 1.06;   // HÅLLEN TOLKNING EFTER SÄKER LÅSNING
 const TG_SONG_A = 1 / 160;   // LÅTENS MINNE
 const TG_BRK_DB = 24, TG_BRK_MAX_MS = 30000;   // BREAK OCH DROP ÄR SAMMA LÅT
+const TG_Q_SIM = 0.5, TG_Q_LEAD = 1;   // BEVISETS KVALITET: utmanarens mönster finns (= PW_MIN), annars ska bevissumman leda med ett helt golv (= TG_SW_P)
 const HV_R = [4 / 3, 3 / 4, 3 / 2, 2 / 3, 5 / 4, 4 / 5], HV_K = 1.25, HV_N = 5, HV_AGE = 30, TG_OCT_LO = 79.6, TG_OCT_LO_N = 8;   // a3 TOPPRÖSTEN
 const PW_RING = 4096, PW_WIN_MS = 10000, PW_MIN = 0.5, PW_Q = [4 / 3, 3 / 4, 3 / 2, 2 / 3];   // TAKTENS SJÄLVLIKHET
 const TG_K = 139, TG_STEP = Math.pow(2, 1 / TG_K), TG_PER_HOP = 1, TG_A = 0.21, TG_MIN_N = 300, TG_FINE = 0.0025, TG_HALF = ONSET_BINS >> 1;
@@ -203,10 +204,10 @@ export class BeatFeed {
         for (let i = 0; i < TG_K; i++) { if (i === r0) continue; const d = Math.max(D[i], fl) + W[i] - nc; D[i] = d; if (d > mx) { mx = d; nk = i; } }
         for (let i = 0; i < TG_K; i++) D[i] -= mx;
         const d0 = Math.abs(nk - r0);
-        if (Math.min(d0, TG_K - d0) > 2) {
+        if (Math.min(d0, TG_K - d0) > 2 && (-D[r0] >= TG_Q_LEAD || this.pwReal(nk, now))) {
           for (let i = 0; i < TG_K; i++) if (F[i] > 0) { acc[i] = F[i]; accF[i] = F[i]; }
           this.tgR = -1; this.tgLk = 0; this.tgLkK = -1; this.tgSw = 0; this.tgSwitches++;
-        } else this.tgR = nk;
+        } else if (Math.min(d0, TG_K - d0) <= 2) this.tgR = nk;
       }
       if (this.tgR >= 0) {
         const r = this.tgR, L = this.tgAccL; let fk = -1, fv = 0; for (let i = 0; i < TG_K; i++) if (accF[i] > fv) { fv = accF[i]; fk = i; }
@@ -215,7 +216,7 @@ export class BeatFeed {
         if (fk >= 0 && dd > TG_SW_STEPS && fv >= fc * TG_HOLD) {
           if (++this.tgSw >= TG_SW_N) {
             let lf = 0, lr = 0; for (let d = -2; d <= 2; d++) { const a = L[(fk + d + TG_K) % TG_K], b = L[(r + d + TG_K) % TG_K]; if (a > lf) lf = a; if (b > lr) lr = b; }
-            if (lf < TG_KNOWN * lr) { acc.set(accF); this.tgSwitches++; this.tgR = -1; this.tgLk = 0; this.tgLkK = -1; }
+            if (lf < TG_KNOWN * lr && this.pwReal(fk, now)) { acc.set(accF); this.tgSwitches++; this.tgR = -1; this.tgLk = 0; this.tgLkK = -1; }
             this.tgSw = 0;
           }
         } else this.tgSw = 0;
@@ -354,6 +355,14 @@ export class BeatFeed {
     } else this.pwRun = 0;
     return cand;
   }
+  /** BEVISETS KVALITET: upprepar sig mönstret på hypotesen k i vittnets senare halva? */
+  private pwReal(k: number, now: number): boolean {
+    const M = PW_RING - 1; let lo = 0, hi = this.pwN;
+    while (lo < hi) { const m = (lo + hi) >> 1; if (now - this.pwT[(this.pwPos - 1 - m + 2 * PW_RING) & M] > PW_WIN_MS) hi = m; else lo = m + 1; }
+    if (lo < 1000) return true;
+    this.pwDt = (this.pwT[(this.pwPos - 1 + PW_RING) & M] - this.pwT[(this.pwPos - lo + 2 * PW_RING) & M]) / (lo - 1); if (!(this.pwDt > 0)) return true;
+    this.pwWn = lo >> 1; return this.pwSim(80 * Math.pow(TG_STEP, k)) >= TG_Q_SIM;
+  }
   private tgReset(): void { this.pwN = 0; this.pwRun = 0; this.tgAcc.fill(-1); this.tgAccF.fill(-1); this.tgSw = 0; this.tgR = -1; this.brkArm = false; this.brkFrom = 0; this.tgLk = 0; this.tgLkK = -1; this.tgHl = 0; this.tgAccL.fill(-1); this.tgLN = 0; this.tgK = 0; this.tempoBpm = 0; this.octN = 0; this.hvRun = 0; this.hvAge = 0; this.hvVoted = false; this.hvKeep = 0; this.hvEver = false; }
 
   /** Kom en tidigare kick. */
```
