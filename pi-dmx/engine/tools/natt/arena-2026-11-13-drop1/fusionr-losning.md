# fusionr (jokern, runda 2) – RÖRELSEN MOT LÅTENS EGET SNITT

## Vad som var fel i runda 1
r0 krävde TVÅ saker med gränser lästa ur övningens nio drop: basen tillbakahållen minst 4 s OCH rörelse över en fast dB-gräns.
Tidskravet beskrev övningens breakdown-drop, inte drop i allmänhet: kontrollens drop har kortare luckor (ingen variant som kräver
> 3 s frånvaro såg ens uppbyggnaden där). Dropserien (inget nollas, 2 s-spärr) bars av EN episod och gav sex drop utan markering på
kontrollen (fusion 7, fusion-b 1). Flera av a8:s tal låg dessutom på kanten utan att jag prövade dem (settle 0,8 -> 0,5 gör en
minidrop till drop).

## Mekanismen nu
Ett drop är basens hela återkomst efter en lucka där RESTEN av musiken (250 Hz–16 kHz) rört sig mer än den här låten brukar gunga
när basen spelar; står resten kvar som den stod är luckan en minidrop. Hur länge basen var borta avgör ingenting, och "stilla" är
låtens eget snitt, inte ett dB-tal.

Borttaget mot r0: hela tidsaxeln (`heldS`, 5 gränser), fasta stillhetsgolvet, tyst-band- och takvillkoren, dropserien (ägarens
12 s-spärr är tillbaka). Kvar: EN dom-gräns (`TENSION_DROP`).

**Ser:** breakdown med svep/rulle/element som kommer och går · kort paus (från ~1,5 s) där något händer efter att basen gått ·
sång eller ensamt instrument över tom bakgrund, om det rör sig mer än låtens gång.
**Ser INTE:** basen spelar vidare under svepet (inget räknas förrän basen gått 0,8 s) · bastrumman rullar tätare · paus under ~1 s ·
stilla breakdown (övningens 367: bassvep, övre banden orörda) · tonartshöjning utan att något tystnar. Är kontrollens uppbyggnader
av de sorterna tar den här varianten dem inte heller – det finns inget sådant exempel i övningen att bygga på, och rörelse mätt
MEDAN basen spelar skiljer inget (prövat: över gränsen 50–90 % av tiden).

## KORSPROV (övningen delad vid 290 s; spänning vid hel återkomst, dB x s över eget snitt)
| gränsen bestämd på | lucka (högsta övriga / lägsta drop) | gräns | första halvan (6 drop) | andra halvan (3 drop) |
|---|---|---|---|---|
| bara första halvan | 1,29 / 2,21 | 1,70 | 4 träffar, 0 fel | 2 träffar, 1 fel (mini 319,7) |
| bara andra halvan | 1,23 / 2,68 | 1,82 | 4 träffar, 0 fel | 2 träffar, 1 fel (mini 319,7) |
| vald: 1,75 (domaren m1) | | | 51 / 137 / 210,6 / 281,8 · miss 214, 218 | 301,6 / 441,2 · miss 367 · fel 319,7 |

Gränsen behöver inte flyttas mellan halvorna (1,70 mot 1,82). Missarna är desamma hur den än sätts: 214/218 är spärren (omslag
3,7 s efter ett drop), 367 har 0,69 (under minidropen 536 på 0,92), och minidropen 319,7 har 5,2 (ett filtersvep över hela musiken
i en 3 s-lucka – mer rörelse än fyra av dropen).

## MARGINALER (± 25 %, övningen)
| gräns | värde | −25 % | +25 % |
|---|---|---|---|
| `TENSION_DROP` | 1,75 | samma dom | samma dom |
| `UP_FAST_S` / `UP_SLOW_S` / `UP_NORM_S` | 0,25 / 2 / 30 s | samma | samma |
| `LAND_OVER_DB` / `LAND_STEP_DB` | 2 / 3 dB | samma | samma |
| `SHOW_DROP_GAP_MS` | 12 s | samma | samma |
| `AWAY_CAP_S`, `TENSION_BUILD` (bara uppbyggnaden) | 10 s, halva | bygg 32–37 %, falsk 3,5–4,3 % | 34–40 %, 3,5–4,0 % |
| `TENSION_TAU_S` | 4 s | **tappar 281,8** | samma |
| `UP_SETTLE_S` | 0,8 s | samma | **tappar 51** |
| `BODY_GONE_DB` (befintlig, drop-detektorns) | 5 dB | **tappar 51, 137** | **tappar 441** |
| snittet självt (ingen ratt; skalat) | x1 | en omarkerad (36,4) blir drop | **tappar 51, 137** |

Fyra klarar inte kravet. De är måttets definition (när basen räknas som borta, hur länge spänningen minns), inte dom-gränser, och
går inte att stryka: utan `UP_SETTLE_S` räknas själva utträdet som uppbyggnad. Det är den ärliga bilden – 51 och 137 ligger nära
gränsen (2,6 och 2,2 mot 1,75).

## Domaren (övningen)
| mätning | poäng | drop | mini rätt | inte | precision | bygg | falsk | drop/min | tid | tempo = bas | |
|---|---|---|---|---|---|---|---|---|---|---|---|
| fusionr m1 | 75,7 | 6/9 | 91 % | 100 % | 86 % (7) | 37 % | 6,3 % | 0,72 | 0,17 | 100 % | OK |

En domarmätning av två, tre sonder av fyra (motorn = simulatorn; samma sju drop vid ljudet x0,5 och x2). Kostnad 1,06 x bas.
Kontrollfilerna är inte öppnade.

## DIFFEN (`git diff --no-index src .arena/drop1/fusionr/src`, även `fusionr.diff`)

~~~~diff
diff --git a/src/ANALYSER_SHARED.md5 b/.arena/drop1/fusionr/src/ANALYSER_SHARED.md5
index a35bdb2..e15c477 100644
--- a/src/ANALYSER_SHARED.md5
+++ b/.arena/drop1/fusionr/src/ANALYSER_SHARED.md5
@@ -1,5 +1,5 @@
 # md5 (CRLF->LF) av de gemensamma filerna - samma i lotus-light-link och dmx-control. Skrivs av analyser_shared.py --write
-f93bc245699cc547f8b1926d5cba6219 analyser.ts
+838debed6b5be6cf34bba68a412b2b01 analyser.ts
 bd23979ae9882d48c6fc8924f137dd09 split.ts
 ab875f44c6cdc8a687c9ed8805d7501e slowWorker.ts
 b78ab7295bb4303a9976b57b329586e3 analyserClock.ts
diff --git a/src/analyser.ts b/.arena/drop1/fusionr/src/analyser.ts
index 1529918..3b84062 100644
--- a/src/analyser.ts
+++ b/.arena/drop1/fusionr/src/analyser.ts
@@ -157,9 +157,10 @@ export interface Frame {
   dropCount: number;    // monoton räknare — +1 per drop
   /** MINIDROP: mindre lyft (stigning MINI_RISE_DB efter kort svacka) som inte ar en full drop. Monoton. 0 nar MINI_SPACING_MS=0 (av). */
   miniDropCount: number;
-  /** EN DROPDETEKTOR (a3, 11-09: förr effects.ts flankStep bredvid dropStep). dropCount = full drop på FLANKEN (break + smäll, efter
-   *  spärren SHOW_DROP_GAP_MS). Detektorns lägre steg är minidrops: dropDemoted = slam-kandidat utan egen flank (inom 2 s),
-   *  dropSpaced = flank inom spärren. Båda räknas också i miniDropCount. dropRiseDb = senaste flankens stigning (styrka). */
+  /** EN DROPDETEKTOR (a3, 11-09: förr effects.ts flankStep bredvid dropStep). dropCount = full drop: basen kommer tillbaka HEL efter
+   *  en UPPBYGGNAD = resten av musiken har rört sig mer än låtens eget snitt medan basen var borta (drop1 runda 2, 11-14, se UP_FAST_S).
+   *  Detektorns lägre steg är minidrops: dropDemoted = slam-kandidat utan full drop (inom DROP_SAME_MS), dropSpaced = full drop inom
+   *  spärren SHOW_DROP_GAP_MS. Båda räknas också i miniDropCount. dropRiseDb = senaste droppens stigning (styrka). */
   dropDemoted: number; dropSpaced: number; dropRiseDb: number;
   /** LYFT/NÄSTAN-DROP/STOPP (a3, förr effects.ts stepLifts): VAD (> 0 medan villkoret håller) + STYRKA (dB).
    *  nearDropDb = språnget från dippens botten (dipp nearDipDb under 8 s-normalen), liftDb = kroppen 0,6 s över lugnet 6..2 s sedan,
@@ -167,8 +168,8 @@ export interface Frame {
   nearDropDb: number; nearDipDb: number; liftDb: number; stopCount: number; stopS: number;
   inZone: boolean;      // nivån är i låtens topp-zon (ihållande tillstånd, hysteres)
   breaking: boolean;    // nivån är i en svacka/break (ihållande tillstånd)
-  /** UPPBYGGNAD (riser): 0..1 tension som ramsar upp mot en drop. Mjuk signal →
-   *  sampling-säker. Show-REAKTIONERNA (strobe, swell) ligger i effekt-motorn. */
+  /** UPPBYGGNAD: 0..1 = spänningen (tension / TENSION_DROP) medan inRiser, annars 0. inRiser = basen är borta (UP_SETTLE_S..AWAY_CAP_S)
+   *  och spänningen är halvvägs till ett drop (TENSION_BUILD). Show-REAKTIONERNA ligger i effekt-motorn. */
   buildUp: number;
   /** UPPBYGGNADENS FÖRLOPP 0..1 (ägaren 11-12: 'Uppbyggnaden borde flyttas till långsamma analysatorn'; förr effects.ts buildProg):
    *  slag sedan sektionen blev 'build' / 32, räknat från uppbyggnadens START, och hålls över sektionsfladder kortare än 2 s.
@@ -294,14 +295,36 @@ const DROP_SHORT_MS = 4000;    // minsta drop-avstand nar dropen ESKALERAR
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
+// FULL DROP = BASEN KOMMER TILLBAKA HEL EFTER EN UPPBYGGNAD (drop1 runda 2, 2026-11-14; ägaren: "är det ingen uppbyggnad, så är det
+// troligen bara minidrop"). I själva ögonblicket skiljer inget drop från minidrop - skillnaden är det som hänt FÖRE. En MINIDROP är en
+// lucka i basen där resten av musiken (band 3-7, 250 Hz-16 kHz) står kvar som den stod; i en UPPBYGGNAD händer det saker där uppe
+// medan basen är borta (riser, virvelrulle, filtersvep, element som kommer och går). Hur LÄNGE basen är borta avgör inget: runda 1
+// krävde 4 s och föll på kontrollinspelningen (0 av 5 - de dropen har kortare luckor). Allt mäts mot låten själv: basen mot sitt tak,
+// rörelsen mot låtens eget snitt.
+//   RÖRELSEN (a8, tensionStep): varje övre bands nivå i dB, snabbt medel (UP_FAST_S) mot långsamt (UP_SLOW_S) - skillnaden, i snitt
+//     över banden, är rörelsen. När basen varit borta (BODY_GONE_DB under taket, drop-detektorns eget mått) i UP_SETTLE_S ställs det
+//     långsamma på det snabba: själva utträdet är inte uppbyggnad.
+//   EGET SNITT: medan basen SPELAR följs rörelsens medel (UP_NORM_S) = så mycket gungar den här låten när inget byggs. Medan basen är
+//     borta samlas bara det som går ÖVER snittet i tension (dB x s), som klingar av med TENSION_TAU_S (två takter). Ingen fast dB-gräns
+//     för "stilla" (runda 1 hade 1 dB): en stökig låt och en ren låt döms mot sig själva.
+//   TENSION_DROP 1,75 dB x s över eget snitt = laddat. Korsprov 11-13 (övningen delad vid 290 s): första halvan ensam ger 1,70
+//     (omarkerade återkomster <= 1,30, ägarens drop >= 2,23), andra halvan ensam 1,82 (<= 1,23, >= 2,69). Samma dom för 1,31-2,19.
+//   TENSION_BUILD = halvvägs: uppbyggnaden syns (inRiser) medan spänningen samlas. AWAY_CAP_S: en bas som varit borta längre än så
+//     är ett lugnt parti/intro/övergång, ingen uppbyggnad (inRiser släpper; återkomsten kan fortfarande vara ett drop).
+//   Helt tyst (lvlSmooth <= FLANK_SILENT_LV) i UP_SETTLE_S = låtlucka: spänningen nollas, och musiken som kommer igång räknas inte som
+//     rörelse (medlen följs åt lika länge efteråt).
+// ÅTERKOMSTEN ska vara HEL (a1, LAND_*): kroppen över taket + LAND_OVER_DB (slagen minst lika hårda som de som satte taket) och
+//   LAND_STEP_DB över allt basen gjort de senaste FLANK_HOLD_S (äldre än LAND_OLD_MS, dvs. före själva anslaget). Prövas på bodyLand =
+//   kroppen med LAND_FAST_S (30 ms): droppen ska komma NÄR det händer. En halv återkomst (basen tillbaka men svagare) är ingen drop.
+// DROP_SAME_MS = samma smäll: en landning eller slam-kandidat så tätt efter ett drop är samma händelse. SHOW_DROP_GAP_MS = ägarens spärr
+//   mellan full drops (10-12): full drop inom spärren = minidrop (dropSpaced). Runda 1 tog bort den för dropserier och sköt sex drop
+//   utan markering på kontrollen.
+const UP_FAST_S = 0.25, UP_SLOW_S = 2, UP_SETTLE_S = 0.8, UP_NORM_S = 30;
+const TENSION_TAU_S = 4, TENSION_DROP = 1.75, TENSION_BUILD = TENSION_DROP / 2, AWAY_CAP_S = 10;
+const LAND_OVER_DB = 2, LAND_STEP_DB = 3, LAND_OLD_MS = 150, LAND_FAST_S = 0.03, FLANK_HOLD_S = 0.6, FLANK_SILENT_LV = 0.005;
+const DROP_SAME_MS = 2000, SHOW_DROP_GAP_MS = 12000;
+const BUILD_FALL_S = 0.5;   // buildUp släpper på en halv sekund när basen är tillbaka (uppbyggnaden är över då, inte en sekund senare)
+const CAND_WAIT_MS = 300;   // en slam-kandidat medan uppbyggnaden är laddad väntar så här länge på den hela återkomsten innan den blir minidrop
 // LYFT/NÄSTAN-DROP/STOPP (flyttade ur effects.ts stepLifts 11-09): kroppen 120 ms (nearB), normalnivån 8 s, historik i 25 ms-rutor.
 const NEAR_RISE_DB = 10, NEAR_DIP_DB = 8, LIFT_DB = 10, STOP_MINI_S = 0.6;
 
@@ -310,13 +333,13 @@ const NEAR_RISE_DB = 10, NEAR_DIP_DB = 8, LIFT_DB = 10, STOP_MINI_S = 0.6;
 const DOUBLE_FROM_START = [
   'secHiStartMs', 'secHiEndMs', 'expectHighMs', 'levelVsHighDb',
   'sumSq', 'lastT', 'dbgRms', 'lastKick', 'envAccum', 'envAccumT', 'envBassAccum', 'blAccum', 'lvlSmooth', 'lvlVU', 'engSmooth', 'activeMs',
-  'buildUp', 'novSlow', 'kickHit', 'snareHit', 'hatHit', 'bodyEnv', 'bodyFast', 'bodyCeil', 'bodyPeak', 'lastGoneSpanMs', 'lastDropMs',
+  'buildUp', 'kickHit', 'snareHit', 'hatHit', 'bodyEnv', 'bodyFast', 'bodyLand', 'bodyCeil', 'bodyPeak', 'lastGoneSpanMs', 'lastDropMs',
   'lastMiniGoneMs', 'lastMiniMs', 'pendingKickMs', 'kfPrev', 'kfPrev2', 'beatAnchorMs',
   'blPrev1', 'blPrev2', 'blTrough', 'profBassline', 'bassOnsetsPerBeat',
   'rawBpmLast', 'localBpmConfidence',
   'secPct', 'secSongStartMs', 'sectionStartMs', 'secBuildAt', 'secBuildSeen', 'secBlkMs', 'secBlkInt', 'secBlkCent', 'secBlkRms2', 'secCurDbSum', 'repeatSim', 'repeatAgoMs',
   'miniGoneMs', 'bodyGoneMs', 'lastBodyGoneMs', 'dropArmUntil', 'dropArmAt',
-  'fdGone', 'fdSpan', 'fdEnd', 'fdAt', 'fdQuietAt', 'lastShowDropMs', 'dropRiseDb', 'nearB', 'nearNorm', 'nearFloor', 'liftCalm', 'liftLift', 'liftHistAt', 'stopRunS',
+  'upNorm', 'candWaitMs', 'fdAt', 'lastShowDropMs', 'dropRiseDb', 'nearB', 'nearNorm', 'nearFloor', 'liftCalm', 'liftLift', 'liftHistAt', 'stopRunS',
   'nearDropDb', 'nearDipDb', 'liftDb', 'stopS',   // byter forst vid forsta drop-episoden (sags i andra matningen)
 ] as const;
 /** TYPSTABILA TALFALT (2026-09-27, realtidsprincipen): skriv ett icke-heltal och sedan ursprungsvardet, sa V8 ger faltet
@@ -767,7 +790,7 @@ export class Analyser {
   private aAtt = 0; private aRel = 0; private aVU = 0;
   private aIUp = 0; private aIDown = 0; private aBandLvl = 0;
   private dHat = 0; private dSnare = 0; private dKick = 0;
-  private aSpecSlow = 0; private aNovSlow = 0; private aProf = 0;
+  private aProf = 0;
   /** BASBANDETS onset-envelope (kick-flux), samma raster och position som envRing. */
   private envBassRing = new Float32Array(Analyser.ENV_LEN);
   private envBassAccum = 0;
@@ -828,6 +851,7 @@ export class Analyser {
    *  bodyEnv (0.35 s) styr tak och franvaro. Blandar man ihop dem dampas
    *  stigningen och trosklarna slutar motsvara det som mattes i banken. */
   private bodyFast = -120;
+  private bodyLand = -120;   // kroppen med LAND_FAST_S: bara den hela återkomstens prövning (se LAND_*)
   private bodyCeil = -300;   // dB
   private bodyPeak = -300;   // SEG topp (loud-referens i minuter) for landa-hogt
   private lastGoneSpanMs = 0;
@@ -855,7 +879,10 @@ export class Analyser {
   private dropCount = 0;         // monoton drop-räknare (edge-säker för konsumenter) - full drop på flanken
   private dropCand = 0;          // slam-kandidaterna (förr dropCount): sektionens drop-evidens och minidrop utan flank
   private dropDemoted = 0; private dropSpaced = 0; private dropRiseDb = -0;
-  private fdGone = -0; private fdSpan = -0; private fdEnd = -1e12; private fdAbove = true; private fdAt = -1e12; private fdQuietAt = -1e12; private lastShowDropMs = -1e12;
+  private candWaitMs = -0; private fdAbove = true; private fdAt = -1e12; private lastShowDropMs = -1e12;
+  private upFast = new Float64Array(5).fill(-70); private upSlow = new Float64Array(5).fill(-70);   // övre banden (3-7) i dB, snabbt/långsamt medel (se UP_*)
+  private bassAwayS = -0; private tension = -0; private upNorm = 1;   // basen borta sedan (s), uppbyggnadens spänning (dB x s över snittet), rörelsens eget snitt (dB)
+  private upCold = UP_SETTLE_S;   // s: växer i tystnad (tak UP_SETTLE_S = låtlucka), krymper med musik; > 0 = musiken har inte hunnit sätta sig
   private fdT = new Float64Array(1024); private fdV = new Float64Array(1024); private fdS0 = 0; private fdN = 0;   // (tid, bodyFast) för toppens fönster
   private nearOn = false; private nearB = -0; private nearNorm = -0; private nearFloor = 1e9; private liftCalm = -0; private liftLift = -0;
   private liftHist = new Float64Array(240); private liftW = 0; private liftN = 0; private liftHistAt = -1e12; private stopRunS = -0;
@@ -883,11 +910,6 @@ export class Analyser {
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
@@ -1796,8 +1818,6 @@ export class Analyser {
     this.dHat = Math.exp(-dtHop / 0.06);
     this.dSnare = Math.exp(-dtHop / 0.11);
     this.dKick = Math.exp(-dtHop / 0.15);
-    this.aSpecSlow = 1 - Math.exp(-dtHop / 2.0);
-    this.aNovSlow = 1 - Math.exp(-dtHop / 1.5);
     this.aProf = 1 - Math.exp(-dtHop / 8.0);
     // Ett återanvänt Frame (spec/onset pekar på de pre-allokerade objekten).
     this.outFrame = {
@@ -2487,6 +2507,7 @@ export class Analyser {
     const dtHop = this.dtHop;
     this.bodyEnv += (bodyNow - this.bodyEnv) * Math.min(1, dtHop / 0.35);
     this.bodyFast += (bodyNow - this.bodyFast) * Math.min(1, dtHop / BODY_FAST_S);
+    this.bodyLand += (bodyNow - this.bodyLand) * Math.min(1, dtHop / LAND_FAST_S);
     const bodyPeek = this.bodyFast;   // (DROP_PEEK forkastad 09-08: ra-min oppnade falska klassen)   // 0.06 testat men gav falsklarm live utan att fixa beat-lagget (det sitter i lamp-vagen/energin, inte har)
     // TAKET SJUNKER I dB PER SEKUND, inte i procent. Kroppen ar nu ett dB-tal
     // (negativt), och "1,5 % av ett negativt tal" gor taket STORRE, inte mindre —
@@ -2494,7 +2515,8 @@ export class Analyser {
     this.bodyCeil = Math.max(this.bodyEnv, this.bodyCeil - dtHop * BODY_CEIL_DB_S);
     this.bodyPeak = Math.max(this.bodyEnv, this.bodyPeak - dtHop * 0.04);   // ~0.04 dB/s ≈ haller loud-referensen i minuter
     this.bodyUnderDb = this.bodyCeil - this.bodyEnv;
-    const flank = this.flankStep(nowWallA, dtHop);   // EN DROPDETEKTOR: flanken på samma filter (se FLANK_GONE_DB)
+    this.tensionStep(dtHop);
+    const flank = this.flankStep(nowWallA, dtHop);   // EN DROPDETEKTOR: hel återkomst efter uppbyggnad, på samma filter (se UP_FAST_S)
     this.liftStep(nowWallA, dtHop, bodyNow);
 
     // BAS-FRÅNVARO med VARAKTIGHETSKRAV: under 40 % av taket i ≥2 s i sträck.
@@ -2682,32 +2704,64 @@ export class Analyser {
     this.dropClassify(flank, fireNow, nowWallA);
   }
 
-  /** EN DROPDETEKTOR - klassningen (a3): flanken är full drop (efter spärren), slam-kandidaten utan egen flank inom 2 s är minidrop. */
+  /** EN DROPDETEKTOR - klassningen (a3): den hela återkomsten efter uppbyggnad är full drop (efter spärren), slam-kandidaten utan den
+   *  är minidrop. Kandidaten kommer ofta några hopp FÖRE den hela återkomsten (den nöjer sig med toppen - 3,5 dB): är uppbyggnaden
+   *  laddad väntar den CAND_WAIT_MS på droppen i stället för att ge en minidrop strax före den. */
   private dropClassify(flank: boolean, cand: boolean, nowWallA: number): void {
     if (flank) {
+      this.candWaitMs = 0;
       if (nowWallA - this.lastShowDropMs < SHOW_DROP_GAP_MS) { this.dropSpaced++; this.miniDropCount++; }
       else { this.lastShowDropMs = nowWallA; this.dropCount++; }
-    } else if (cand && nowWallA - this.fdAt > 2000) { this.dropDemoted++; this.miniDropCount++; }
+      return;
+    }
+    if (cand && nowWallA - this.fdAt > DROP_SAME_MS) {
+      if (this.tension >= TENSION_DROP) this.candWaitMs = nowWallA; else { this.dropDemoted++; this.miniDropCount++; }
+    }
+    if (this.candWaitMs > 0 && nowWallA - this.candWaitMs >= CAND_WAIT_MS) { this.candWaitMs = 0; this.dropDemoted++; this.miniDropCount++; }
   }
 
-  /** FULL DROP PÅ FLANKEN (se FLANK_GONE_DB): på dropStep:s egna filter (bodyFast/bodyEnv/bodyCeil), per hop. */
+  /** FULL DROP = HEL ÅTERKOMST EFTER UPPBYGGNAD (se UP_FAST_S): på dropStep:s egna filter (bodyFast/bodyCeil), per hop. */
   private flankStep(now: number, dt: number): boolean {
     const CAP = 1024, T = this.fdT, V = this.fdV, f = this.bodyFast, ceil = this.bodyCeil;
     if (this.fdN === CAP) { this.fdS0 = (this.fdS0 + 1) & (CAP - 1); this.fdN--; }
     { const w = (this.fdS0 + this.fdN) & (CAP - 1); T[w] = now; V[w] = f; this.fdN++; }
     while (this.fdN > 1 && now - T[this.fdS0] > FLANK_HOLD_S * 1000) { this.fdS0 = (this.fdS0 + 1) & (CAP - 1); this.fdN--; }
-    let top = -1e9, low = 1e9; for (let q = 0; q < this.fdN; q++) { const i = (this.fdS0 + q) & (CAP - 1); if (V[i] > top) top = V[i]; if (now - T[i] <= 500 && V[i] < low) low = V[i]; }
-    if (top < ceil - FLANK_GONE_DB) this.fdGone += dt; else { if (this.fdGone > 0) { this.fdSpan = this.fdGone; this.fdEnd = now; } this.fdGone = 0; }
-    const above = f > ceil - FLANK_LAND_DB, edge = above && !this.fdAbove; this.fdAbove = above;
-    const span = this.fdGone > 0 ? this.fdGone : now - this.fdEnd < FLANK_GRACE_S * 1000 ? this.fdSpan : 0;
-    if (this.lvlSmooth <= FLANK_SILENT_LV) this.fdQuietAt = now;
-    if (!edge || f - low < FLANK_RISE_DB || (span < FLANK_BREAK_S && !(span >= FLANK_SHORT_S && ceil - low >= FLANK_SHORT_RISE_DB))) return false;
-    if (now - this.fdQuietAt < span * 1000 + 500) { this.fdGone = 0; this.fdSpan = 0; if (DROP_TRACE) console.log(`[flank] ingen drop: helt tyst i breaket (latstart), break ${span.toFixed(1)} s`); return false; }
-    this.fdGone = 0; this.fdSpan = 0; this.fdAt = now; this.dropRiseDb = f - low;
-    if (DROP_TRACE) console.log(`[flank] full drop pa flanken: break ${span.toFixed(1)} s, stigning ${(f - low).toFixed(1)} dB`);
+    // old = basens topp FÖRE anslaget (äldre än LAND_OLD_MS), low = botten senaste 0,5 s (styrkan)
+    let old = -1e9, low = 1e9;
+    for (let q = 0; q < this.fdN; q++) { const i = (this.fdS0 + q) & (CAP - 1), v = V[i], age = now - T[i]; if (age > LAND_OLD_MS && v > old) old = v; if (age <= 500 && v < low) low = v; }
+    const g = this.bodyLand, land = g > ceil + LAND_OVER_DB && g - old >= LAND_STEP_DB, edge = land && !this.fdAbove; this.fdAbove = land;
+    if (!edge || now - this.fdAt < DROP_SAME_MS) return false;
+    const built = this.tension >= TENSION_DROP;
+    if (DROP_TRACE) console.log(`[flank] wall ${this.wallNow()} hel aterkomst: spanning ${this.tension.toFixed(2)} over snittet ${this.upNorm.toFixed(2)} dB, over taket ${(g - ceil).toFixed(1)} dB, steg ${(g - old).toFixed(1)} dB -> ${built ? 'DROP' : 'ingen uppbyggnad'}`);
+    if (!built) return false;
+    this.fdAt = now; this.dropRiseDb = f - low;
     return true;
   }
 
+  /** UPPBYGGNADENS SPÄNNING (se UP_FAST_S): de övre bandens rörelse över låtens eget snitt medan basen är borta -> this.tension
+   *  (dB x s). Per hop, inga allokeringar: fem band, två medel var. */
+  private tensionStep(dt: number): void {
+    const gone = this.bodyCeil - BODY_GONE_DB, away = this.bodyEnv < gone && this.bodyFast < gone;
+    const was = this.bassAwayS; this.bassAwayS = away ? was + dt : 0;
+    const cold = this.upCold = this.lvlSmooth <= FLANK_SILENT_LV ? Math.min(UP_SETTLE_S, this.upCold + dt) : Math.max(0, this.upCold - dt);
+    if (cold >= UP_SETTLE_S) this.tension = 0;   // låtlucka
+    const settled = this.bassAwayS >= UP_SETTLE_S, anchor = cold > 0 || (settled && was < UP_SETTLE_S);
+    const F = this.upFast, S = this.upSlow, raw = this.bandDbRaw, aF = dt / UP_FAST_S, aS = dt / UP_SLOW_S;
+    let mv = 0;
+    for (let b = 0; b < 5; b++) {
+      const x = raw[b + 3] > -70 ? raw[b + 3] : -70;   // -70 dB = analysatorns eget golv (bandDb)
+      const f = F[b] += (x - F[b]) * aF;
+      const s = anchor ? (S[b] = f) : (S[b] += (x - S[b]) * aS);
+      mv += f > s ? f - s : s - f;
+    }
+    mv /= 5;
+    if (cold === 0) {
+      if (!away) this.upNorm += (mv - this.upNorm) * (dt / UP_NORM_S);                    // basen spelar: låtens eget snitt
+      else if (settled && mv > this.upNorm) this.tension += (mv - this.upNorm) * dt;      // basen borta: bara det över snittet
+    }
+    this.tension -= this.tension * dt / TENSION_TAU_S;
+  }
+
   /** NÄSTAN-DROP, ENERGILYFT, STOPP (a3, förr effects.ts stepLifts): VAD + STYRKA ut i ramen; effekterna avgör reaktionen. */
   private liftStep(now: number, dt: number, body: number): void {
     const x = Math.max(-90, body);
@@ -2737,38 +2791,13 @@ export class Analyser {
     }
   }
 
-  /** Uppbyggnad/riser (spektral novelty + klang/niva). Returnerar inRiser och uppdaterar buildUp. */
+  /** Uppbyggnad = basen är borta och resten av musiken rör sig mer än låtens eget snitt (se UP_FAST_S): samma mått (tension) som
+   *  avgör drop eller minidrop. Returnerar inRiser och uppdaterar buildUp = hur laddat det är (tension / TENSION_DROP, 0..1). Den
+   *  gamla risern (spektral novelty + klang/nivå) hade absoluta nivågränser (lvlSmooth > 0,3/0,4) och var död vid ren nivå. */
   private riserStep(): boolean {
-    const nowWallA = this.hNowWall;
-    const dtHop = this.dtHop;
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
-    const bTarget = inRiser ? 1 : 0;
-    const bRate = bTarget > this.buildUp ? dtHop / 3.5 : dtHop / 1.0;   // bygg ~3.5s, klinga ~1s
-    this.buildUp += Math.max(-bRate, Math.min(bRate, bTarget - this.buildUp));
+    const inRiser = this.bassAwayS >= UP_SETTLE_S && this.bassAwayS < AWAY_CAP_S && this.tension >= TENSION_BUILD;
+    if (inRiser) this.buildUp = Math.min(1, this.tension / TENSION_DROP);
+    else { this.buildUp -= this.dtHop / BUILD_FALL_S; if (this.buildUp < 0) this.buildUp = 0; }
     return inRiser;
   }
 
~~~~
