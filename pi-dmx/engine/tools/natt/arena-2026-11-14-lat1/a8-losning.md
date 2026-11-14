# a8 – MINNET VID GRÄNSEN (klockan)

## Idén
När låtgränsen sägs frågar klockan en sak innan den glömmer: sägs gränsen mitt i ett break som break-hållet redan håller tempot igenom
(baskroppen ≥ TG_BRK_DB under taket i just det hoppet, låten har inte tystnat) och säger breakets rytm inte emot det hållna tempot? Då är
det samma låt och ingenting glöms; annars glöms allt som förut. Musikaliskt: en uppbyggnad tar bort basen men behåller pulsen (och det är
just basens försvinnande som lurar formvägen), medan en ny låt antingen har tystnat först eller har en annan puls i klockans fönster.

## Delar
| del | bär |
|---|---|
| `sameSong()` + villkoret i `update()`: gräns i hållet break → ingen relock | takt, utanfor (följdfelet 200–204 s, +8 halvsekunder) |
| motsägelseprovet i `sameSong()` (snabba minnets topp mot kronan TG_HOLD, TG_SW_STEPS) | lastid: ny låt med baslöst intro släpps som i bas |
| tystnadsvakten (`quietAt`, `pend`, BND_QUIET_BEATS): tyst ett slag = låten tog slut → relock | lastid: tystnadsgränsen, gräns sagd i uttoning |
| `sure` (lotus/Sonos) → alltid relock | – |

Låtgränsdetektorn är orörd (latbyten, falska oförändrade). 171840 är bit-identisk med bas.

## Marginaler (klockan ensam, båda filerna)
| gräns | −25 % | +25 % | domen |
|---|---|---|---|
| BND_QUIET_BEATS 1 (ny) | 0,75 | 1,25 | identisk |
| kronan i `sameSong` (TG_HOLD 1,35, befintlig) | 1,01 | 1,69 | identisk |
| stegen i `sameSong` (TG_SW_STEPS 6, befintlig) | 4,5 | 7,5 | identisk |
| TG_BRK_DB 24 (befintlig, oändrad) | 18 | 30 | 201–204 lagat i båda |

Vid den falska gränsen: baskroppen 32–37 dB under taket, snabba minnets topp = det hållna tempot (×1,00 mot kronans 1,35).

## Siffrorna
| | poäng | takt | fel s | utanför | låstid | låtbyten | falska | us/hopp |
|---|---|---|---|---|---|---|---|---|
| bas | 93,06 | 92,57 | 64,2 | 95,17 | 7,11 | 3/4 | 1 | 105 |
| m1 | 93,30 | 92,80 | 62,2 | 95,54 | 7,11 | 3/4 | 1 | 300 (maskinen fullastad) |
| m2 (samma kod) | 93,30 | 92,80 | 62,2 | 95,54 | 7,11 | 3/4 | 1 | 117 |

Per fil: 160345 takt 93,64 % (1089/1163, bas 1085), låstider 13,2 / 8,6; 171840 91,06 %, 1,9 / 4,7 (= bas). Drop oförändrade. m3 oanvänd.
SÄMRE: 8 halvsekunder i 160345 föll till fel på andra ställen (255–257, 311, 371, 385, 390, 412–414), 4 till rätt: toleranskanten (facit
142,9 är kvantiserat, låten går ~140, fintempot 136–137 mot bas 138–140). Brus, inte mekanism.

Prov utanför domaren (`sond.mjs`, `synt*.mjs`):
- Falsk gräns inlagd i varje djupt break, tre uppsättningar tider: 160345 fel 57,7 → 45,6 / 58,7 → 58,7 / 61,2 → 59,7 s; 171840 37,1 → 32,1 / lika / lika.
- Ny låt med baslöst intro utan tystnad (5 källor, gräns 9 och 12 s in): som bas i 9 av 10. Utan motsägelseprovet: låstid 22–28 s mot 9.
- Gräns sagd i uttoning 3 s före tystnad (28 syntetiska skarvar): låstid 7,07 → 6,32 s; utan tystnadsvakten 8,93.
- Gränsen flyttad −3…+16 s kring skarvarna: som bas.

BORTVALT (mätt, koden i `bortvalt/`): ringklipp/kallstart vid tystnadsgräns – 43 syntetiska skarvar, låstid än bättre än sämre (5,50 / 4,98 /
5,66 s), utfallet avgörs av första valet mellan släktingar (a7). Fönstret är redan nästan fritt från förra låten när gränsen sägs.
Uppskjuten relock till breakets slut: ett hopp efter droppet och 22 s låstid vid baslöst intro.

VARNING (domare/joker): 171840 har ett myntkast vid 217–230 s. Flyttas gränsen 150,64 mindre än ett hopp blir 220–230 fel (10 s = −1,5
%-enheter utanför); 12 av 12 svep har felet, bas har turen. Därför kräver regeln djupet i själva gränshoppet – 150,64 lämnas orörd.

## Risken
- Ny låt som börjar baslöst utan ett slags tystnad, i samma tempo (±3 %) eller med för svag puls: gränsen behålls, ettan nollas inte och ett
  nytt tempo måste klockan bevisa själv när basen kommit (2–5 s).
- Paus ≥ 1 slag före droppet medan en falsk gräns väntar: relock då, som bas.
- Långa mixar, tal, tempobyte mitt i låten: som bas (regeln verkar bara vid en gräns i ett hållet break). Släktingar räknas som motsägelse
  först när de slår kronan.
- Lagar inte de stora felen: uttoningen 255–264 och introt 265–278.

## Diffen
```diff
diff --git a/src/analyserClock.ts b/.arena/lat1/a8/src/analyserClock.ts
index cea56ed..228c85a 100644
--- a/src/analyserClock.ts
+++ b/.arena/lat1/a8/src/analyserClock.ts
@@ -35,6 +35,7 @@ const TG_WIN_MS = 5000, TG_FULL_N = 900, TG_FWIN_MS = 3500, TG_FFULL_N = 630, TG
 const TG_NOISE = 0.6, TG_NB = 2, TG_SW_P = 1, TG_SW_G = 2, TG_HL_A = 0.5, TG_LOCK_N = 8, TG_LA = 0.04, TG_KNOWN = 0.5, SCAN_HOLD = 1.06;   // HÅLLEN TOLKNING EFTER SÄKER LÅSNING
 const TG_SONG_A = 1 / 160;   // LÅTENS MINNE
 const TG_BRK_DB = 24, TG_BRK_MAX_MS = 30000;   // BREAK OCH DROP ÄR SAMMA LÅT
+const BND_QUIET_BEATS = 1;   // MINNET VID GRÄNSEN: så många slag tyst = låten tog slut
 const HV_R = [4 / 3, 3 / 4, 3 / 2, 2 / 3, 5 / 4, 4 / 5], HV_K = 1.25, HV_N = 5, HV_AGE = 30, TG_OCT_LO = 79.6, TG_OCT_LO_N = 8;   // a3 TOPPRÖSTEN
 const PW_RING = 4096, PW_WIN_MS = 10000, PW_MIN = 0.5, PW_Q = [4 / 3, 3 / 4, 3 / 2, 2 / 3];   // TAKTENS SJÄLVLIKHET
 const TG_K = 139, TG_STEP = Math.pow(2, 1 / TG_K), TG_PER_HOP = 1, TG_A = 0.21, TG_MIN_N = 300, TG_FINE = 0.0025, TG_HALF = ONSET_BINS >> 1;
@@ -86,6 +87,7 @@ export class BeatFeed {
   private innerAnchor = 0; private innerBpm = 0; private innerValid = false;
   private readonly anaGrid = { anchorMs: 0, bpm: 0, confidence: 0 };   // EN KÄLLA
   private boundSeen = 0;
+  private quietAt = -1e12; private pend = false;   // MINNET VID GRÄNSEN
   /** Det cfg analysatorn ska byggas med. */
   barKnown(): boolean { return this.barN >= BAR_MIN; }
   static analyserCfg<T extends object>(cfg: T): T { return { ...cfg, beat: null }; }
@@ -409,11 +411,22 @@ export class BeatFeed {
     this.tgReset(); this.barReset(); this.goodRep = 0; this.goodOn = 0; this.onNext = 0;
   }
 
+  /** MINNET VID GRÄNSEN. */
+  private sameSong(now: number): boolean {
+    if (this.sure || this.brkAt !== now || !this.brkArm || !(this.tempoBpm > 0) || this.quietAt >= (this.brkFrom || now)) return false;   // inte i ett hållet break, eller låten tystnade
+    const F = this.tgAccF, kc = ((Math.round(Math.log(this.tempoBpm / 80) / Math.log(TG_STEP)) % TG_K) + TG_K) % TG_K; let fk = kc, fv = 0;
+    for (let i = 0; i < TG_K; i++) if (F[i] > fv) { fv = F[i]; fk = i; }
+    const d0 = Math.abs(fk - kc);
+    return Math.min(d0, TG_K - d0) <= TG_SW_STEPS || fv < Math.max(F[kc], F[(kc + 1) % TG_K], F[(kc + TG_K - 1) % TG_K]) * TG_HOLD;   // breakets rytm säger inte emot det hållna tempot
+  }
+
   /** EN KÄLLA. */
   update(frame: Frame, cfg: EngineConfig, an: { resetTempo(): void; resetBar(): void; setClockGrid?(g: EngineConfig["beat"]): void; trackBoundaries?: number; quietMs?: number; boundSure?: boolean; bodyUnderDb?: number; setClock?(bpm: number, conf: number): void }, now = Date.now()): void {
     this.sure = !!an.boundSure; if ((an.bodyUnderDb ?? 0) >= TG_BRK_DB) this.brkAt = now;
     const nb = an.trackBoundaries ?? 0;
-    if (nb !== this.boundSeen) { this.boundSeen = nb; this.relock(); }
+    const q = (an.quietMs ?? 0) >= BND_QUIET_BEATS * 60000 / (this.innerBpm > 80 ? this.innerBpm : 80); if (q) this.quietAt = now;
+    if (nb !== this.boundSeen) { this.boundSeen = nb; this.pend = this.sameSong(now); if (!this.pend) this.relock(); }
+    else if (this.pend && (q || now - this.brkAt >= TG_WIN_MS)) { this.pend = false; if (q) this.relock(); }   // tystnar låten i breaket var gränsen sann
     if (cfg.beat && this.innerValid) { cfg.beat.anchorMs = this.innerAnchor; cfg.beat.bpm = this.innerBpm; }
     this.updateInner(frame, cfg, now, an.quietMs ?? 0);
     const b = cfg.beat;
diff --git a/src/ANALYSER_SHARED.md5 b/.arena/lat1/a8/src/ANALYSER_SHARED.md5
index dbe0948..2253dec 100644
--- a/src/ANALYSER_SHARED.md5
+++ b/.arena/lat1/a8/src/ANALYSER_SHARED.md5
@@ -10,5 +10,5 @@ e92d0d6b4f8dc36abfb8135004260806 analyserLevel.ts
 dbb860c7483c4e7e938d610712337b96 analyserCharacter.ts
 a8846ca6595ddef8409a6ab432acf375 split.ts
 c7a59a6760df39770f3aca2332dac5c2 slowWorker.ts
-d0a49e4f782e81bdfdf8293eb0b45bf4 analyserClock.ts
+d94eba428eda60f7cdfbce5ed7de1db9 analyserClock.ts
 d94c850c565827c9075e63127132213f recorder.ts
```
