# a5r – NY TOPP (FÖRE MOT EFTER, runda 2)

## Vad som var fel i runda 1
Jag dömde drop på HUR LÄNGE basen varit borta (minst 4 av de senaste 8 s). Det är en beskrivning av övningens tre låtar, inte av ett
drop: gränsen låg mellan två takters lucka (ägarens minidrop, 3,8 s) och tre (hans drop, 4,5 s) – 10 % marginal åt vardera hållet –
och på kontrollen gav samma regel 12 drop utan markering och 0 av 5. Flodvakten och "full landning" var plåster på den regeln.

## Mekanismen nu
Analysatorn minns ljudets hela nivå i 25 s och kallar det drop när nivån hoppar minst 2 dB över sitt högsta värde i det fönstret:
det som kommer är större än allt publiken nyss hört. Basens återkomst utan ny topp är minidrop; uppbyggnaden (`inRiser`) är orörd
från runda 1 (basen borta och det tunna är nytt).

**Ser** (oavsett hur det byggdes upp, ingen basåterkomst krävs): breakdown, svep eller rulle över spelande bas, bara en kort paus,
sång över tom bakgrund, tonartshöjning – OM slaget landar starkare än de senaste 25 s.
**Ser inte:** drop som landar på samma nivå som låten hade inom 25 s (övningens 137, 301, stötarna 211/214/218, 51 – sex av nio).
Uppbyggnaden ser bara tillbakahållen bas, inte svep/rullar över spelande bas.

## KORSPROV (delning 290 s; halva 1 har 6 drop, halva 2 har 3)
| gränserna satta på | X, fönster | halva 1: träff / utan markering | halva 2: träff / utan markering |
|---|---|---|---|
| bara halva 1 (X giltig 1,0–5,4 → mitten 3,2; fönster > 21 s → 27 s) | 3,2 dB, 27 s | 1/6 (282) / 0 | **1/3 (441) / 0** – 367 faller (m2) |
| bara halva 2 (X 1,0–2,9 → 1,95; fönster 16–32 → 24 s) | 1,95 dB, 24 s | **1/6 (282) / 0** (simulerat) | 2/3 (367, 441) / 0 |
| slutlig (inom båda intervallen) | 2,0 dB, 25 s | 1/6 / 0 (m1) | 2/3 / 0 (m1) |

Ingen gräns behöver flyttas: 2,0 dB och 25 s ligger i båda halvornas giltiga intervall. Men halva 1 ensam kan inte bestämma X
(ett enda drop, +5,4 dB): mitt i dess intervall tappas 367, som bara ligger 2,9 dB över fönstret. Det är lösningens svaga punkt.

## MARGINALER (simulerat på sondens ramar; simuleringen ger motorns tre drop på hundradelen)
| gräns | värde | −25 % | +25 % | domen ändras först vid |
|---|---|---|---|---|
| PV_HIGH_DB | 2 dB | 1,5: samma | 2,5: samma | 1,0 (två utan markering) / 3,0 (367 bort) |
| PV_HIGH_SLOTS | 25 s | 18,75: **ett drop utan markering (32,8 s)**, markerade lika | 31,25: samma | 21 s / 32,5 s (441 bort: fönstret når förra låten) |
| rutan | 125 ms | 94: samma | 156: samma | – |

Fönstret klarar alltså INTE 25 % nedåt (−12 %). Det är minnets längd och kan inte tas bort; i slag blev marginalen sämre (52–68
slag), så det står i sekunder. Uppbyggnadens gränser rör inte dropdomen: bygg 32–59 %, falsk 5,7–14,4 % vid ±25 % (värst
PV_BUILD_HI +25 %).

## Domaren (övningen)
| | poäng | drop | mini rätt | inte | precision | bygg | falsk | drop/min | tid | |
|---|---|---|---|---|---|---|---|---|---|---|
| m1 slutlig | 67,4 | 3/9 | 100 % | 100 % | 100 % (3) | 41 % | 9,6 % | 0,31 | 0,27 | OK |
| m2 korsprovets halva 1-gränser | 63,0 | 2/9 | 100 % | 100 % | 100 % (2) | 41 % | 9,6 % | 0,21 | 0,29 | OK |

Efter m1 ändrades EN kommentar (bygget omgjort, sonden ger samma tre drop). Kostnaden 238 µs mot bas 177 mättes under andras last
(tillägget är en slinga på 200 värden var 125:e ms) – bör mätas ensam. Känt: en minidrop-look kan komma några tiotal ms före
droplooken vid samma slag (basen når upp före nivån).

## DIFFEN (`git diff --no-index src .arena/drop1/a5r/src`)
```diff
diff --git a/src/ANALYSER_SHARED.md5 b/.arena/drop1/a5r/src/ANALYSER_SHARED.md5
index a35bdb2..2a5f817 100644
--- a/src/ANALYSER_SHARED.md5
+++ b/.arena/drop1/a5r/src/ANALYSER_SHARED.md5
@@ -1,5 +1,5 @@
 # md5 (CRLF->LF) av de gemensamma filerna - samma i lotus-light-link och dmx-control. Skrivs av analyser_shared.py --write
-f93bc245699cc547f8b1926d5cba6219 analyser.ts
+db5dab0c4c5f715a429a9e4dc2675bcc analyser.ts
 bd23979ae9882d48c6fc8924f137dd09 split.ts
 ab875f44c6cdc8a687c9ed8805d7501e slowWorker.ts
 b78ab7295bb4303a9976b57b329586e3 analyserClock.ts
diff --git a/src/analyser.ts b/.arena/drop1/a5r/src/analyser.ts
index 1529918..b7c6e63 100644
--- a/src/analyser.ts
+++ b/.arena/drop1/a5r/src/analyser.ts
@@ -157,9 +157,10 @@ export interface Frame {
   dropCount: number;    // monoton räknare — +1 per drop
   /** MINIDROP: mindre lyft (stigning MINI_RISE_DB efter kort svacka) som inte ar en full drop. Monoton. 0 nar MINI_SPACING_MS=0 (av). */
   miniDropCount: number;
-  /** EN DROPDETEKTOR (a3, 11-09: förr effects.ts flankStep bredvid dropStep). dropCount = full drop på FLANKEN (break + smäll, efter
-   *  spärren SHOW_DROP_GAP_MS). Detektorns lägre steg är minidrops: dropDemoted = slam-kandidat utan egen flank (inom 2 s),
-   *  dropSpaced = flank inom spärren. Båda räknas också i miniDropCount. dropRiseDb = senaste flankens stigning (styrka). */
+  /** EN DROPDETEKTOR (a3, 11-09; sorten sedan 2026-11-14 ur FÖRE MOT EFTER, se PV_SLOT_MS). dropCount = NY TOPP: nivån hoppar över
+   *  allt de senaste 25 s. Detektorns lägre steg är minidrops: dropSpaced = basen kommer tillbaka utan ny topp (samma arrangemang
+   *  som före luckan), dropDemoted = slam-kandidat utan återkomst (inom 2 s). Båda räknas också i miniDropCount. dropRiseDb = senaste
+   *  händelsens styrka i dB (drop: över fönstrets topp; minidrop: basens lyft över sekunden före). */
   dropDemoted: number; dropSpaced: number; dropRiseDb: number;
   /** LYFT/NÄSTAN-DROP/STOPP (a3, förr effects.ts stepLifts): VAD (> 0 medan villkoret håller) + STYRKA (dB).
    *  nearDropDb = språnget från dippens botten (dipp nearDipDb under 8 s-normalen), liftDb = kroppen 0,6 s över lugnet 6..2 s sedan,
@@ -167,8 +168,8 @@ export interface Frame {
   nearDropDb: number; nearDipDb: number; liftDb: number; stopCount: number; stopS: number;
   inZone: boolean;      // nivån är i låtens topp-zon (ihållande tillstånd, hysteres)
   breaking: boolean;    // nivån är i en svacka/break (ihållande tillstånd)
-  /** UPPBYGGNAD (riser): 0..1 tension som ramsar upp mot en drop. Mjuk signal →
-   *  sampling-säker. Show-REAKTIONERNA (strobe, swell) ligger i effekt-motorn. */
+  /** UPPBYGGNAD: 0..1 envelope över inRiser (stiger på ~3,5 s, klingar på ~1 s). inRiser = basen är borta och det tunna är nytt mot
+   *  de senaste 8 s (FÖRE MOT EFTER, se PV_SLOT_MS). Mjuk signal → sampling-säker. Show-REAKTIONERNA ligger i effekt-motorn. */
   buildUp: number;
   /** UPPBYGGNADENS FÖRLOPP 0..1 (ägaren 11-12: 'Uppbyggnaden borde flyttas till långsamma analysatorn'; förr effects.ts buildProg):
    *  slag sedan sektionen blev 'build' / 32, räknat från uppbyggnadens START, och hålls över sektionsfladder kortare än 2 s.
@@ -294,14 +295,27 @@ const DROP_SHORT_MS = 4000;    // minsta drop-avstand nar dropen ESKALERAR
 const DROP_LONG_MS = 20000;    // annars maste sa har lang tid ga (mot falska upprepningar)
 const DROP_ESCALATE_DB = 3;    // tatare drops maste vara TYDLIGT starkare for att fyra
 const BODY_CEIL_DB_S = 0.15;   // taket haller latens loud-referens lange
-// FULL DROP PÅ FLANKEN (flyttad ur effects.ts 11-09, a3 - historiken: ägarens ladan 10-12..10-30, se git-historiken för effects.ts):
-// baskroppens topp (bodyFast över FLANK_HOLD_S) har legat >= FLANK_GONE_DB under taket (bodyCeil) i >= FLANK_BREAK_S (eller
-// >= FLANK_SHORT_S med >= FLANK_SHORT_RISE_DB djup), och fyrar när bodyFast går upp till taket - FLANK_LAND_DB med >= FLANK_RISE_DB
-// stigning på 0,5 s. Helt tyst (lvlSmooth <= FLANK_SILENT_LV) i breaket = låtlucka, ingen drop. Samma filter som slam-kandidaten
-// (bodyFast 60 ms, bodyEnv 350 ms, bodyCeil -0,15 dB/s) - förr en egen kopia i effekterna.
-const FLANK_GONE_DB = 10, FLANK_BREAK_S = 4, FLANK_LAND_DB = 6, FLANK_RISE_DB = 12, FLANK_HOLD_S = 0.6, FLANK_GRACE_S = 1;
-const FLANK_SHORT_S = 2, FLANK_SHORT_RISE_DB = 24, FLANK_SILENT_LV = 0.005;
-const SHOW_DROP_GAP_MS = 12000;   // spärr mellan full drops (ägaren 10-12): flank inom spärren = minidrop (dropSpaced)
+// FÖRE MOT EFTER (arenan drop1 a5, runda 2 2026-11-14; ersätter FULL DROP PÅ FLANKEN 11-09, som kallade 1 av ägarens 14 drop för drop).
+// Runda 1 dömde drop på HUR LÄNGE basen varit borta. Det passade övningens nio drop men inget av kontrollens fem (alla mekanismer
+// som mätte tyst bas kände igen 0-7 % av dess uppbyggnader - slutsats, inte mätt: basen spelar där under uppbyggnaden), och gränsen
+// låg mellan två takter lucka (minidrop) och tre (drop) - ingen marginal. Nu döms det som KOMMER mot det som VAR, i hela nivån:
+//   DROP       nivån (lvlSmooth) hoppar minst PV_HIGH_DB över sitt högsta värde de senaste PV_HIGH_SLOTS rutorna (25 s, ungefär
+//              tolv takter): det som kommer är större än allt publiken nyss hört. Vad som byggde upp dit (tyst bas, svep
+//              över spelande bas, rulle, bara en paus) spelar ingen roll, och ingen basåterkomst krävs.
+//   MINIDROP   basen kommer tillbaka (bodyFast inte längre BORTA och >= BODY_GONE_DB över toppen under sekunden före) utan ny topp:
+//              samma arrangemang som före luckan (dropSpaced).
+//   BORTA      baskroppens topp ligger mer än BODY_GONE_DB under låtens tak (bodyCeil) - samma mått som bas-frånvaron i dropStep.
+//   UPPBYGGNAD basen är borta just nu (hela sista sekunden) och andelen borta de senaste PV_SLOTS rutorna (8 s) STIGER genom
+//              PV_BUILD_LO..PV_BUILD_HI: det tunna är nytt. Är hela fönstret tunt är det ett lugnt parti (intro, outro). Den ser
+//              BARA uppbyggnader där basen hålls tillbaka - svep och rullar över spelande bas ser den inte.
+// Bara kvoter mot låtens egna nivåer (oberoende av ingångsnivån). En ny topp fyller fönstret själv: nästa drop måste slå även den
+// (ingen flodvakt behövs). Fönstret börjar fullt (Infinity): ingen drop förrän analysatorn hört ett helt fönster.
+// Rutor med brusgrinden stängd hela rutan räknas som fulla i basfönstret (tystnad mellan låtar är inget tunt arrangemang), och
+// ingen dom tas förrän musiken gått 2 s (activeMs): en låt som börjar ur tystnad är varken drop eller återkomst.
+const PV_SLOT_MS = 125, PV_SLOTS = 64, PV_GONE_SLOTS = 8;
+const PV_HIGH_SLOTS = 200;                            // nivåns minne: 25 s
+const PV_HIGH_K = Math.pow(10, 2 / 20);             // PV_HIGH_DB = 2: så mycket över fönstrets topp är en ny topp
+const PV_BUILD_LO = 0.25, PV_BUILD_HI = 0.7;    // 2 s .. 5,6 s av fönstret borta
 // LYFT/NÄSTAN-DROP/STOPP (flyttade ur effects.ts stepLifts 11-09): kroppen 120 ms (nearB), normalnivån 8 s, historik i 25 ms-rutor.
 const NEAR_RISE_DB = 10, NEAR_DIP_DB = 8, LIFT_DB = 10, STOP_MINI_S = 0.6;
 
@@ -310,13 +324,13 @@ const NEAR_RISE_DB = 10, NEAR_DIP_DB = 8, LIFT_DB = 10, STOP_MINI_S = 0.6;
 const DOUBLE_FROM_START = [
   'secHiStartMs', 'secHiEndMs', 'expectHighMs', 'levelVsHighDb',
   'sumSq', 'lastT', 'dbgRms', 'lastKick', 'envAccum', 'envAccumT', 'envBassAccum', 'blAccum', 'lvlSmooth', 'lvlVU', 'engSmooth', 'activeMs',
-  'buildUp', 'novSlow', 'kickHit', 'snareHit', 'hatHit', 'bodyEnv', 'bodyFast', 'bodyCeil', 'bodyPeak', 'lastGoneSpanMs', 'lastDropMs',
+  'buildUp', 'kickHit', 'snareHit', 'hatHit', 'bodyEnv', 'bodyFast', 'bodyCeil', 'bodyPeak', 'lastGoneSpanMs', 'lastDropMs',
   'lastMiniGoneMs', 'lastMiniMs', 'pendingKickMs', 'kfPrev', 'kfPrev2', 'beatAnchorMs',
   'blPrev1', 'blPrev2', 'blTrough', 'profBassline', 'bassOnsetsPerBeat',
   'rawBpmLast', 'localBpmConfidence',
   'secPct', 'secSongStartMs', 'sectionStartMs', 'secBuildAt', 'secBuildSeen', 'secBlkMs', 'secBlkInt', 'secBlkCent', 'secBlkRms2', 'secCurDbSum', 'repeatSim', 'repeatAgoMs',
   'miniGoneMs', 'bodyGoneMs', 'lastBodyGoneMs', 'dropArmUntil', 'dropArmAt',
-  'fdGone', 'fdSpan', 'fdEnd', 'fdAt', 'fdQuietAt', 'lastShowDropMs', 'dropRiseDb', 'nearB', 'nearNorm', 'nearFloor', 'liftCalm', 'liftLift', 'liftHistAt', 'stopRunS',
+  'fdAt', 'pvSlotAt', 'pvTop', 'pvFrac', 'pvGoneTop', 'pvHoldUntil', 'pvLvTop', 'pvHighAt', 'dropRiseDb', 'nearB', 'nearNorm', 'nearFloor', 'liftCalm', 'liftLift', 'liftHistAt', 'stopRunS',
   'nearDropDb', 'nearDipDb', 'liftDb', 'stopS',   // byter forst vid forsta drop-episoden (sags i andra matningen)
 ] as const;
 /** TYPSTABILA TALFALT (2026-09-27, realtidsprincipen): skriv ett icke-heltal och sedan ursprungsvardet, sa V8 ger faltet
@@ -767,7 +781,7 @@ export class Analyser {
   private aAtt = 0; private aRel = 0; private aVU = 0;
   private aIUp = 0; private aIDown = 0; private aBandLvl = 0;
   private dHat = 0; private dSnare = 0; private dKick = 0;
-  private aSpecSlow = 0; private aNovSlow = 0; private aProf = 0;
+  private aProf = 0;
   /** BASBANDETS onset-envelope (kick-flux), samma raster och position som envRing. */
   private envBassRing = new Float32Array(Analyser.ENV_LEN);
   private envBassAccum = 0;
@@ -855,8 +869,11 @@ export class Analyser {
   private dropCount = 0;         // monoton drop-räknare (edge-säker för konsumenter) - full drop på flanken
   private dropCand = 0;          // slam-kandidaterna (förr dropCount): sektionens drop-evidens och minidrop utan flank
   private dropDemoted = 0; private dropSpaced = 0; private dropRiseDb = -0;
-  private fdGone = -0; private fdSpan = -0; private fdEnd = -1e12; private fdAbove = true; private fdAt = -1e12; private fdQuietAt = -1e12; private lastShowDropMs = -1e12;
-  private fdT = new Float64Array(1024); private fdV = new Float64Array(1024); private fdS0 = 0; private fdN = 0;   // (tid, bodyFast) för toppens fönster
+  private fdAt = -1e12;   // senaste återkomst (FÖRE MOT EFTER): slam-kandidaten inom 2 s är samma händelse
+  // FÖRE MOT EFTER (se PV_SLOT_MS): baskroppens topp per ruta (1e9 = tyst ruta, räknas som full), andelen borta, toppen sekunden före.
+  private pvRing = new Float32Array(PV_SLOTS).fill(1e9); private pvW = 0; private pvSlotAt = -1e12; private pvTop = -1e9; private pvSound = false; private pvBack = false;
+  private pvFrac = -0; private pvGoneTop = 1e9; private pvBuild = false; private pvHoldUntil = -1e12;
+  private pvHigh = new Float32Array(PV_HIGH_SLOTS).fill(Infinity); private pvHighW = 0; private pvLvTop = -0; private pvHighMax = Infinity; private pvHighWait = 0; private pvHighAt = -1e12;   // nivåns topp per ruta, fönstrets topp, senaste nya topp
   private nearOn = false; private nearB = -0; private nearNorm = -0; private nearFloor = 1e9; private liftCalm = -0; private liftLift = -0;
   private liftHist = new Float64Array(240); private liftW = 0; private liftN = 0; private liftHistAt = -1e12; private stopRunS = -0;
   private nearDropDb = -0; private nearDipDb = -0; private liftDb = -0; private stopCount = 0; private stopS = -0;
@@ -883,11 +900,6 @@ export class Analyser {
   /** ~1,5 s vid 125 Hz. MAD startar i noll efter tystnad och byggs upp med
    *  `mad ← 1.006·mad + 6e-5`, vilket tar ≈183 rutor att nå ett användbart värde. */
   private static readonly ONSET_WARM = 183;
-  private specSlow = new Float32Array(8);
-  private novSlow = 0;           // ihållande spektral novelty (~1.5s)
-  private novBaseline = 0.2;     // ~8s baslinje → riser = novelty STIGER över den
-  private centSlow = 0.3;
-  private lvlSlowR = 0.3;
   private buildUp = 0;           // 0..1 uppbyggnads-envelope
   // KARAKTÄRSPROFIL (långsam, ~8s)
   private profPunch = 0.4;
@@ -1796,8 +1808,6 @@ export class Analyser {
     this.dHat = Math.exp(-dtHop / 0.06);
     this.dSnare = Math.exp(-dtHop / 0.11);
     this.dKick = Math.exp(-dtHop / 0.15);
-    this.aSpecSlow = 1 - Math.exp(-dtHop / 2.0);
-    this.aNovSlow = 1 - Math.exp(-dtHop / 1.5);
     this.aProf = 1 - Math.exp(-dtHop / 8.0);
     // Ett återanvänt Frame (spec/onset pekar på de pre-allokerade objekten).
     this.outFrame = {
@@ -2494,7 +2504,7 @@ export class Analyser {
     this.bodyCeil = Math.max(this.bodyEnv, this.bodyCeil - dtHop * BODY_CEIL_DB_S);
     this.bodyPeak = Math.max(this.bodyEnv, this.bodyPeak - dtHop * 0.04);   // ~0.04 dB/s ≈ haller loud-referensen i minuter
     this.bodyUnderDb = this.bodyCeil - this.bodyEnv;
-    const flank = this.flankStep(nowWallA, dtHop);   // EN DROPDETEKTOR: flanken på samma filter (se FLANK_GONE_DB)
+    const ret = this.foreEfterStep(nowWallA, dtHop);   // EN DROPDETEKTOR: 0 ingen, 1 minidrop, 2 drop (se PV_SLOT_MS)
     this.liftStep(nowWallA, dtHop, bodyNow);
 
     // BAS-FRÅNVARO med VARAKTIGHETSKRAV: under 40 % av taket i ≥2 s i sträck.
@@ -2679,33 +2689,54 @@ export class Analyser {
       this.dropCand++; this.lastDropMs = nowWallA; this.lastDropRise = bodyRise;
       console.log(`[dropfire] wall ${this.wallNow()}${fireTag} rise ${bodyRise.toFixed(1)} fast ${this.bodyFast.toFixed(1)} peak ${this.bodyPeak.toFixed(1)} ceil ${this.bodyCeil.toFixed(1)} underPeak ${(this.bodyPeak - this.bodyFast).toFixed(1)} sinceDrop ${(sinceDrop/1000).toFixed(1)}s goneAgo ${((nowWallA - this.lastBodyGoneMs)/1000).toFixed(1)}s goneSpan ${(this.lastGoneSpanMs/1000).toFixed(1)}s edgeAgo ${(nowWallA - this.dropArmAt).toFixed(0)}ms`);
     }
-    this.dropClassify(flank, fireNow, nowWallA);
+    this.dropClassify(ret, fireNow, nowWallA);
   }
 
-  /** EN DROPDETEKTOR - klassningen (a3): flanken är full drop (efter spärren), slam-kandidaten utan egen flank inom 2 s är minidrop. */
-  private dropClassify(flank: boolean, cand: boolean, nowWallA: number): void {
-    if (flank) {
-      if (nowWallA - this.lastShowDropMs < SHOW_DROP_GAP_MS) { this.dropSpaced++; this.miniDropCount++; }
-      else { this.lastShowDropMs = nowWallA; this.dropCount++; }
-    } else if (cand && nowWallA - this.fdAt > 2000) { this.dropDemoted++; this.miniDropCount++; }
+  /** EN DROPDETEKTOR - klassningen: FÖRE MOT EFTER avgör sorten (2 = ny topp = drop, 1 = basens återkomst = minidrop); slam-kandidaten
+   *  utan återkomst eller ny topp inom 2 s är minidrop. */
+  private dropClassify(ret: number, cand: boolean, nowWallA: number): void {
+    if (ret === 2) this.dropCount++;
+    else if (ret === 1) { this.dropSpaced++; this.miniDropCount++; }
+    else if (cand && nowWallA - this.fdAt > 2000) { this.dropDemoted++; this.miniDropCount++; }
   }
 
-  /** FULL DROP PÅ FLANKEN (se FLANK_GONE_DB): på dropStep:s egna filter (bodyFast/bodyEnv/bodyCeil), per hop. */
-  private flankStep(now: number, dt: number): boolean {
-    const CAP = 1024, T = this.fdT, V = this.fdV, f = this.bodyFast, ceil = this.bodyCeil;
-    if (this.fdN === CAP) { this.fdS0 = (this.fdS0 + 1) & (CAP - 1); this.fdN--; }
-    { const w = (this.fdS0 + this.fdN) & (CAP - 1); T[w] = now; V[w] = f; this.fdN++; }
-    while (this.fdN > 1 && now - T[this.fdS0] > FLANK_HOLD_S * 1000) { this.fdS0 = (this.fdS0 + 1) & (CAP - 1); this.fdN--; }
-    let top = -1e9, low = 1e9; for (let q = 0; q < this.fdN; q++) { const i = (this.fdS0 + q) & (CAP - 1); if (V[i] > top) top = V[i]; if (now - T[i] <= 500 && V[i] < low) low = V[i]; }
-    if (top < ceil - FLANK_GONE_DB) this.fdGone += dt; else { if (this.fdGone > 0) { this.fdSpan = this.fdGone; this.fdEnd = now; } this.fdGone = 0; }
-    const above = f > ceil - FLANK_LAND_DB, edge = above && !this.fdAbove; this.fdAbove = above;
-    const span = this.fdGone > 0 ? this.fdGone : now - this.fdEnd < FLANK_GRACE_S * 1000 ? this.fdSpan : 0;
-    if (this.lvlSmooth <= FLANK_SILENT_LV) this.fdQuietAt = now;
-    if (!edge || f - low < FLANK_RISE_DB || (span < FLANK_BREAK_S && !(span >= FLANK_SHORT_S && ceil - low >= FLANK_SHORT_RISE_DB))) return false;
-    if (now - this.fdQuietAt < span * 1000 + 500) { this.fdGone = 0; this.fdSpan = 0; if (DROP_TRACE) console.log(`[flank] ingen drop: helt tyst i breaket (latstart), break ${span.toFixed(1)} s`); return false; }
-    this.fdGone = 0; this.fdSpan = 0; this.fdAt = now; this.dropRiseDb = f - low;
-    if (DROP_TRACE) console.log(`[flank] full drop pa flanken: break ${span.toFixed(1)} s, stigning ${(f - low).toFixed(1)} dB`);
-    return true;
+  /** FÖRE MOT EFTER (se PV_SLOT_MS): per hop på dropStep:s egna filter (bodyFast/bodyCeil) och nivån (lvlSmooth). Rutan (125 ms)
+   *  räknar om nivåfönstrets topp, andelen borta, toppen sekunden före och uppbyggnaden. Returnerar 0 ingen, 1 minidrop, 2 drop. */
+  private foreEfterStep(now: number, dt: number): number {
+    const f = this.bodyFast, lv = this.lvlSmooth, R = this.pvRing, H = this.pvHigh;
+    if (f > this.pvTop) this.pvTop = f;
+    if (lv > this.pvLvTop) this.pvLvTop = lv;
+    if (this.activeMs > 0) this.pvSound = true;
+    if (now - this.pvSlotAt >= PV_SLOT_MS) {
+      R[this.pvW] = this.pvSound ? this.pvTop : 1e9; this.pvW = (this.pvW + 1) % PV_SLOTS; this.pvSlotAt = now; this.pvTop = -1e9; this.pvSound = false;
+      H[this.pvHighW] = this.pvLvTop; this.pvHighW = (this.pvHighW + 1) % PV_HIGH_SLOTS; this.pvLvTop = 0;
+      // Nivåfönstrets topp. Den nyaste rutan hoppas över (ett hopp som korsar en rutgräns ska mätas mot det som var före det), och
+      // efter en ny topp väntar domen tills den toppen själv står i fönstret.
+      if (this.pvHighWait > 0) { this.pvHighWait--; this.pvHighMax = Infinity; }
+      else { let m = 0; const skip = (this.pvHighW + PV_HIGH_SLOTS - 1) % PV_HIGH_SLOTS; for (let i = 0; i < PV_HIGH_SLOTS; i++) if (i !== skip && H[i] > m) m = H[i]; this.pvHighMax = m; }
+      const thr = this.bodyCeil - BODY_GONE_DB; let n = 0;
+      for (let i = 0; i < PV_SLOTS; i++) if (R[i] < thr) n++;
+      this.pvFrac = n / PV_SLOTS;
+      // Sekunden före: den nyaste rutan hoppas över i toppen (en landning som korsar en rutgräns ska mätas mot det som var före den).
+      let gt = -1e9, gone = R[(this.pvW + PV_SLOTS - 1) % PV_SLOTS] < thr;
+      for (let k = 2; k <= PV_GONE_SLOTS + 1; k++) { const v = R[(this.pvW + PV_SLOTS - k) % PV_SLOTS]; if (v > gt) gt = v; if (k <= PV_GONE_SLOTS && v >= thr) gone = false; }
+      this.pvGoneTop = gt;
+      this.pvBuild = gone && this.pvFrac >= PV_BUILD_LO && this.pvFrac <= PV_BUILD_HI;
+    }
+    if (this.activeMs <= 2000) { this.pvBack = false; return 0; }
+    if (lv >= this.pvHighMax * PV_HIGH_K) {   // NY TOPP = drop
+      this.dropRiseDb = 20 * Math.log10(lv / (this.pvHighMax + 1e-9)); this.pvHighMax = Infinity; this.pvHighWait = 2; this.pvHighAt = now; this.fdAt = now;
+      if (DROP_TRACE) console.log(`[foreefter] wall ${this.wallNow()} DROP: ny topp, ${this.dropRiseDb.toFixed(1)} dB över fönstrets`);
+      return 2;
+    }
+    const back = now >= this.pvHoldUntil && f >= this.bodyCeil - BODY_GONE_DB && f - this.pvGoneTop >= BODY_GONE_DB;
+    const edge = back && !this.pvBack; this.pvBack = back;
+    if (!edge) return 0;
+    this.pvHoldUntil = now + PV_GONE_SLOTS * PV_SLOT_MS; this.fdAt = now;   // nästa återkomst kan tidigast dömas när sekunden före är ny
+    if (now - this.pvHighAt < 2000) return 0;   // samma händelse som den nya toppen
+    this.dropRiseDb = f - this.pvGoneTop;
+    if (DROP_TRACE) console.log(`[foreefter] wall ${this.wallNow()} minidrop: basen tillbaka, lyft ${this.dropRiseDb.toFixed(1)} dB, andel borta ${this.pvFrac.toFixed(2)}`);
+    return 1;
   }
 
   /** NÄSTAN-DROP, ENERGILYFT, STOPP (a3, förr effects.ts stepLifts): VAD + STYRKA ut i ramen; effekterna avgör reaktionen. */
@@ -2737,35 +2768,12 @@ export class Analyser {
     }
   }
 
-  /** Uppbyggnad/riser (spektral novelty + klang/niva). Returnerar inRiser och uppdaterar buildUp. */
+  /** Uppbyggnaden: inRiser = FÖRE MOT EFTER säger att basen är borta och det tunna är nytt (se PV_SLOT_MS); buildUp är dess envelope.
+   *  (Förr spektral novelty + klang/nivå med ABSOLUTA nivågränser - lvlSmooth > 0,3/0,4 - som ren musik, nivå ~0,16, aldrig nådde:
+   *  buildUp max 0,00 i ladan 2026-11-13.) */
   private riserStep(): boolean {
-    const nowWallA = this.hNowWall;
     const dtHop = this.dtHop;
-    // ── UPPBYGGNAD / RISER (flyttad hit) ──
-    // Spektral NOVELTY = summan av bandens POSITIVA avvikelse från en ~2s baslinje,
-    // ihållande ~1.5s. Mätt validerad: ramsar 0.25→0.78 in i en drop. Relativt en
-    // ~8s baslinje → RISER = novelty STIGER över den (filter-sweep/snare-roll),
-    // skilt från bara-busy (ihållande → baslinjen kommer ikapp). Gammal väg
-    // (klang+nivå stiger) ligger kvar som OR. Inte direkt efter en drop.
-    let nov = 0; const sr = this.aSpecSlow;
-    // NOVELTY PÅ `bandDb`, INTE `bandLvl` — se fältets dokumentation. Med den
-    // AGC-normaliserade nivån var det här uttrycket matematiskt tvunget att gå
-    // mot noll under exakt de förlopp det skulle upptäcka.
-    for (let b = 0; b < 8; b++) { this.specSlow[b] += (this.bandDb[b] - this.specSlow[b]) * sr; nov += Math.max(0, this.bandDb[b] - this.specSlow[b]); }
-    this.novSlow += (nov - this.novSlow) * this.aNovSlow;
-    this.novBaseline += (this.novSlow - this.novBaseline) * (dtHop / 8);
-    const novRiser = this.novSlow > this.novBaseline + 0.15 && this.novSlow > 0.45;
-    this.centSlow += (this.centSmooth - this.centSlow) * (dtHop / 2.5);
-    this.lvlSlowR += (this.lvlSmooth - this.lvlSlowR) * (dtHop / 2.5);
-    const inRiser = this.activeMs > 2500 && this.lvlSmooth > 0.3 && nowWallA - this.lastDropMs > 1500 && (
-        novRiser
-        || (this.centSmooth > this.centSlow + 0.06 && this.lvlSmooth > this.lvlSlowR + 0.04 && this.lvlSmooth > 0.4)
-      );
-    // Stampla uppbyggnaden. OBS: drop-villkoret ovan kraver INTE en riser — det
-    // kravet ar avstangt (se dar). Stampeln halls uppdaterad for att kravet ska
-    // kunna aterinforas nu nar riser-signalen faktiskt lever (se `bandDb`).
-    // Nagot "4000 ms-fonster" finns inte i filen; den formuleringen var kvar
-    // fran en tidigare version av villkoret.
+    const inRiser = this.pvBuild;   // (musik finns: rutorna i fönstret bär ljud, se pvSound - ett nästan tyst break före en drop är en uppbyggnad)
     const bTarget = inRiser ? 1 : 0;
     const bRate = bTarget > this.buildUp ? dtHop / 3.5 : dtHop / 1.0;   // bygg ~3.5s, klinga ~1s
     this.buildUp += Math.max(-bRate, Math.min(bRate, bTarget - this.buildUp));
```
