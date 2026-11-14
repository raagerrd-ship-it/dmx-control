# a1 – BASENS FRÅNVARO I TID

## Idén
Analysatorn räknar hur många sekunder basens topp legat under låtens eget tak (`heldS`: +1 s/s när toppen är minst 3 dB under
`bodyCeil`, −2 s/s annars, tak 10 s). En uppbyggnad håller basen tillbaka i takter, en minidrop är en glugg på ett par slag: kommer
basen tillbaka HEL med minst 4 s på måttet är det ett drop, annars en minidrop – och samma mått ÄR uppbyggnaden.

## Delar (allt i `src/analyser.ts`, långsamma vägen)
- `flankStep`: `heldS >= FLANK_BREAK_S` (4 s) i stället för flankens "10 dB i 4 s" – **drop_ratt** 1/9 → 7/9, **mini_ratt** 82 → 91 %
  (ägarens drop 4,4–10 s, hans minidrop högst 3,3 s).
- Hel återkomst (`LAND_OVER_DB`: över taket + 2 dB, `LAND_STEP_DB`); ett drop nollar måttet – **inte_ratt** 0/3 → 3/3, **precision**
  10 → 88 %: de halva återkomsterna (347, 423, 500, 529 s, där bas sköt drop) faller bort.
- `bodyLand` (kroppen med 30 ms, bara landningsprovet; mätning 2) – tid 0,21 → 0,17 s, droppen 301,56 in i fönstret (drop 6/9 → 7/9).
- `riserStep`: `inRiser` = basen hålls tillbaka och `heldS` i 3..10 s, `buildUp = heldS/10` – **bygg** 0 → 58 %; `HELD_BUILD_S` och
  `HELD_CAP_S` håller bygg_falsk på 8,7 %. Den döda risern (absoluta nivåer) är borttagen.
- `QUIET_GAP_S` (tyst 1 s = låtlucka, nollar måttet) och `CAND_WAIT_MS` (ingen minidrop-look strax före droppen): inget domarmått.

## Siffrorna (övningen)
| | poäng | drop | mini rätt | inte | precision | bygg | falsk | drop/min | tid |
|---|---|---|---|---|---|---|---|---|---|
| bas | 22,8 | 1/9 | 82 % | 0 % | 10 % (10) | 0 % | 0,0 % | 1,03 | 0,31 |
| m1 (rå) | 75,7 | 6/9 | 91 % | 100 % | 75 % (8) | 58 % | 8,7 % | 0,82 | 0,21 |
| m2 (bodyLand) | 82,6 | 7/9 | 91 % | 100 % | 88 % (8) | 58 % | 8,7 % | 0,82 | 0,17 |

Tempo och sektion = bas 100 %. Kostnad rygg mot rygg: bas 84–100, a1 78 µs/hopp (domarens 105 mättes under andras last).
Sämre/olöst: bygg_falsk 0 → 8,7 % (mest där ägaren själv tryckt Uppbyggnad utan drop efter). Drop 214,23 och 217,91 (stopp-och-gå
efter det stora droppet, 2 s gluggar) blir inte drop. Mini 536,12 blir drop (10 s tillbakahållen, hel landning). Droppen 301,56
träffar med 0,01 s marginal (motorn 302,55, ägarens tryck 302,54).
Känslighet (simulerat; simulatorn = motorn på hundradelen): `HELD_DB` 3,5 tappar två drop, 2,5 gör två minidrop till drop; 4 s-gränsen
har ~0,5 s luft åt båda håll. Smal marginal på nio drop.

## Risken
- Långsam musik: gränsen är sekunder, inte takter (tempot är 0 i bänken) – under ~100 bpm blir en tvåtakters glugg ett drop.
- Liggande bas utan anslag: landningen kräver taket + 2 dB; efter korta uppehåll har taket (−0,15 dB/s) inte sjunkit → missat drop.
- Långa mixar: varje övergång där basen skärs ger upp till 7 s uppbyggnad, och basbytet blir drop om det slår hårdare än taket.
- Tal mellan låtar (inte helt tyst): måttet fylls, nästa låts första basslag kan bli drop.
- Lugna låtar med ojämn bas: toppen ofta 3 dB under taket → falsk uppbyggnad; bygg_falsk-spärren (15 %) är hotet i finalen.

## Diffen
Appliceras från `engine/` med `patch -p1 < .arena/drop1/a1/a1.diff` (samma innehåll som nedan).

```diff
diff --git a/src/analyser.ts b/src/analyser.ts
index 1529918..494ebc1 100644
--- a/src/analyser.ts
+++ b/src/analyser.ts
@@ -157,9 +157,10 @@ export interface Frame {
   dropCount: number;    // monoton räknare — +1 per drop
   /** MINIDROP: mindre lyft (stigning MINI_RISE_DB efter kort svacka) som inte ar en full drop. Monoton. 0 nar MINI_SPACING_MS=0 (av). */
   miniDropCount: number;
-  /** EN DROPDETEKTOR (a3, 11-09: förr effects.ts flankStep bredvid dropStep). dropCount = full drop på FLANKEN (break + smäll, efter
-   *  spärren SHOW_DROP_GAP_MS). Detektorns lägre steg är minidrops: dropDemoted = slam-kandidat utan egen flank (inom 2 s),
-   *  dropSpaced = flank inom spärren. Båda räknas också i miniDropCount. dropRiseDb = senaste flankens stigning (styrka). */
+  /** EN DROPDETEKTOR (a3, 11-09: förr effects.ts flankStep bredvid dropStep). dropCount = full drop: basen kommer tillbaka HEL efter
+   *  att ha hållits tillbaka i minst FLANK_BREAK_S (drop1 a1, 11-13; efter spärren SHOW_DROP_GAP_MS). Detektorns lägre steg är minidrops:
+   *  dropDemoted = slam-kandidat utan full drop (inom 2 s), dropSpaced = full drop inom spärren. Båda räknas också i miniDropCount.
+   *  dropRiseDb = senaste droppens stigning (styrka). */
   dropDemoted: number; dropSpaced: number; dropRiseDb: number;
   /** LYFT/NÄSTAN-DROP/STOPP (a3, förr effects.ts stepLifts): VAD (> 0 medan villkoret håller) + STYRKA (dB).
    *  nearDropDb = språnget från dippens botten (dipp nearDipDb under 8 s-normalen), liftDb = kroppen 0,6 s över lugnet 6..2 s sedan,
@@ -167,8 +168,8 @@ export interface Frame {
   nearDropDb: number; nearDipDb: number; liftDb: number; stopCount: number; stopS: number;
   inZone: boolean;      // nivån är i låtens topp-zon (ihållande tillstånd, hysteres)
   breaking: boolean;    // nivån är i en svacka/break (ihållande tillstånd)
-  /** UPPBYGGNAD (riser): 0..1 tension som ramsar upp mot en drop. Mjuk signal →
-   *  sampling-säker. Show-REAKTIONERNA (strobe, swell) ligger i effekt-motorn. */
+  /** UPPBYGGNAD: 0..1 = hur länge basen hållits tillbaka under låtens tak (heldS / HELD_CAP_S) medan inRiser, annars 0.
+   *  inRiser = basen hålls tillbaka och har gjort det i HELD_BUILD_S..HELD_CAP_S. Show-REAKTIONERNA ligger i effekt-motorn. */
   buildUp: number;
   /** UPPBYGGNADENS FÖRLOPP 0..1 (ägaren 11-12: 'Uppbyggnaden borde flyttas till långsamma analysatorn'; förr effects.ts buildProg):
    *  slag sedan sektionen blev 'build' / 32, räknat från uppbyggnadens START, och hålls över sektionsfladder kortare än 2 s.
@@ -294,13 +295,27 @@ const DROP_SHORT_MS = 4000;    // minsta drop-avstand nar dropen ESKALERAR
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
+// FULL DROP = BASEN KOMMER TILLBAKA EFTER ATT HA HÅLLITS TILLBAKA LÄNGE (drop1 a1, ladan 2026-11-13: ägarens 9 drop har alla en
+// uppbyggnad före, inget av hans minidrop har det; i själva ögonblicket skiljer inget - skillnaden är TIDEN före). EN storhet,
+// heldS = hur många sekunder basens topp (bodyFast över FLANK_HOLD_S) legat under låtens eget tak (bodyCeil), driver både sorten
+// och uppbyggnaden. Samma filter som slam-kandidaten (bodyFast 60 ms, bodyEnv 350 ms, bodyCeil -0,15 dB/s). Allt relativt taket.
+//   HELD_DB       toppen >= 3 dB under taket (under halva effekten) = basen hålls tillbaka: heldS fylls 1 s/s. Annars rinner den
+//                 HELD_DRAIN s/s - ett kort återbesök av basen tömmer inte en lång uppbyggnad, men 2 s gluggar laddar aldrig.
+//   FLANK_BREAK_S 4 s tillbakahållen bas (två takter vid 120 bpm) = laddat: återkomsten är ett drop. Samma 4 s som flankens gamla
+//                 break-krav (ägaren 10-12). Mätt 11-13: ägarens drop 4,4-10 s, hans minidrop (en glugg på 1-3 s) <= 3,3 s.
+//   HELD_CAP_S    10 s: där slutar måttet räkna. En bas som varit borta längre är ett lugnt parti/intro/övergång, inte en
+//                 uppbyggnad (inRiser släpper) - men återkomsten är fortfarande ett drop.
+//   HELD_BUILD_S  uppbyggnad (inRiser) = basen hålls tillbaka och har gjort det i 3 s (en glugg på ett par slag är ingen uppbyggnad).
+//   LAND_*        återkomsten ska vara HEL: kroppen över taket + LAND_OVER_DB (slagen minst lika hårda som de som satte taket;
+//                 taket har sjunkit under uppehållet) och LAND_STEP_DB över allt basen gjort de senaste 0,6 s (äldre än LAND_OLD_MS,
+//                 dvs. före själva anslaget). Prövas på bodyLand = kroppen med LAND_FAST_S (30 ms): bodyFast:s 60 ms lägger
+//                 ~0,05 s på anslaget, och droppen ska komma NÄR det händer. En halv återkomst (basen tillbaka men svagare: 11-13
+//                 +1,8 dB som mest på bodyLand, ägarens drop +4,3 och uppåt) är ingen drop och tömmer inte måttet fortare än HELD_DRAIN.
+//   QUIET_GAP_S   helt tyst (lvlSmooth <= FLANK_SILENT_LV) i 1 s = låtlucka: musiken är borta, basen är inte tillbakahållen.
+const HELD_DB = 3, HELD_DRAIN = 2, FLANK_BREAK_S = 4, HELD_CAP_S = 10, HELD_BUILD_S = 3, FLANK_HOLD_S = 0.6;
+const LAND_OVER_DB = 2, LAND_STEP_DB = 3, LAND_OLD_MS = 150, LAND_FAST_S = 0.03, QUIET_GAP_S = 1, FLANK_SILENT_LV = 0.005;
+const BUILD_FALL_S = 0.5;   // buildUp släpper på en halv sekund när basen är tillbaka (uppbyggnaden är över då, inte en sekund senare)
+const CAND_WAIT_MS = 300;   // en slam-kandidat medan måttet är laddat väntar så här länge på den hela återkomsten innan den blir minidrop
 const SHOW_DROP_GAP_MS = 12000;   // spärr mellan full drops (ägaren 10-12): flank inom spärren = minidrop (dropSpaced)
 // LYFT/NÄSTAN-DROP/STOPP (flyttade ur effects.ts stepLifts 11-09): kroppen 120 ms (nearB), normalnivån 8 s, historik i 25 ms-rutor.
 const NEAR_RISE_DB = 10, NEAR_DIP_DB = 8, LIFT_DB = 10, STOP_MINI_S = 0.6;
@@ -310,13 +325,13 @@ const NEAR_RISE_DB = 10, NEAR_DIP_DB = 8, LIFT_DB = 10, STOP_MINI_S = 0.6;
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
+  'heldS', 'quietS', 'candWaitMs', 'fdAt', 'lastShowDropMs', 'dropRiseDb', 'nearB', 'nearNorm', 'nearFloor', 'liftCalm', 'liftLift', 'liftHistAt', 'stopRunS',
   'nearDropDb', 'nearDipDb', 'liftDb', 'stopS',   // byter forst vid forsta drop-episoden (sags i andra matningen)
 ] as const;
 /** TYPSTABILA TALFALT (2026-09-27, realtidsprincipen): skriv ett icke-heltal och sedan ursprungsvardet, sa V8 ger faltet
@@ -767,7 +782,7 @@ export class Analyser {
   private aAtt = 0; private aRel = 0; private aVU = 0;
   private aIUp = 0; private aIDown = 0; private aBandLvl = 0;
   private dHat = 0; private dSnare = 0; private dKick = 0;
-  private aSpecSlow = 0; private aNovSlow = 0; private aProf = 0;
+  private aProf = 0;
   /** BASBANDETS onset-envelope (kick-flux), samma raster och position som envRing. */
   private envBassRing = new Float32Array(Analyser.ENV_LEN);
   private envBassAccum = 0;
@@ -828,6 +843,7 @@ export class Analyser {
    *  bodyEnv (0.35 s) styr tak och franvaro. Blandar man ihop dem dampas
    *  stigningen och trosklarna slutar motsvara det som mattes i banken. */
   private bodyFast = -120;
+  private bodyLand = -120;   // kroppen med LAND_FAST_S: bara den hela återkomstens prövning (se LAND_*)
   private bodyCeil = -300;   // dB
   private bodyPeak = -300;   // SEG topp (loud-referens i minuter) for landa-hogt
   private lastGoneSpanMs = 0;
@@ -855,7 +871,7 @@ export class Analyser {
   private dropCount = 0;         // monoton drop-räknare (edge-säker för konsumenter) - full drop på flanken
   private dropCand = 0;          // slam-kandidaterna (förr dropCount): sektionens drop-evidens och minidrop utan flank
   private dropDemoted = 0; private dropSpaced = 0; private dropRiseDb = -0;
-  private fdGone = -0; private fdSpan = -0; private fdEnd = -1e12; private fdAbove = true; private fdAt = -1e12; private fdQuietAt = -1e12; private lastShowDropMs = -1e12;
+  private heldS = -0; private heldNow = false; private quietS = -0; private candWaitMs = -0; private fdAbove = true; private fdAt = -1e12; private lastShowDropMs = -1e12;
   private fdT = new Float64Array(1024); private fdV = new Float64Array(1024); private fdS0 = 0; private fdN = 0;   // (tid, bodyFast) för toppens fönster
   private nearOn = false; private nearB = -0; private nearNorm = -0; private nearFloor = 1e9; private liftCalm = -0; private liftLift = -0;
   private liftHist = new Float64Array(240); private liftW = 0; private liftN = 0; private liftHistAt = -1e12; private stopRunS = -0;
@@ -883,11 +899,6 @@ export class Analyser {
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
@@ -1796,8 +1807,6 @@ export class Analyser {
     this.dHat = Math.exp(-dtHop / 0.06);
     this.dSnare = Math.exp(-dtHop / 0.11);
     this.dKick = Math.exp(-dtHop / 0.15);
-    this.aSpecSlow = 1 - Math.exp(-dtHop / 2.0);
-    this.aNovSlow = 1 - Math.exp(-dtHop / 1.5);
     this.aProf = 1 - Math.exp(-dtHop / 8.0);
     // Ett återanvänt Frame (spec/onset pekar på de pre-allokerade objekten).
     this.outFrame = {
@@ -2487,6 +2496,7 @@ export class Analyser {
     const dtHop = this.dtHop;
     this.bodyEnv += (bodyNow - this.bodyEnv) * Math.min(1, dtHop / 0.35);
     this.bodyFast += (bodyNow - this.bodyFast) * Math.min(1, dtHop / BODY_FAST_S);
+    this.bodyLand += (bodyNow - this.bodyLand) * Math.min(1, dtHop / LAND_FAST_S);
     const bodyPeek = this.bodyFast;   // (DROP_PEEK forkastad 09-08: ra-min oppnade falska klassen)   // 0.06 testat men gav falsklarm live utan att fixa beat-lagget (det sitter i lamp-vagen/energin, inte har)
     // TAKET SJUNKER I dB PER SEKUND, inte i procent. Kroppen ar nu ett dB-tal
     // (negativt), och "1,5 % av ett negativt tal" gor taket STORRE, inte mindre —
@@ -2494,7 +2504,7 @@ export class Analyser {
     this.bodyCeil = Math.max(this.bodyEnv, this.bodyCeil - dtHop * BODY_CEIL_DB_S);
     this.bodyPeak = Math.max(this.bodyEnv, this.bodyPeak - dtHop * 0.04);   // ~0.04 dB/s ≈ haller loud-referensen i minuter
     this.bodyUnderDb = this.bodyCeil - this.bodyEnv;
-    const flank = this.flankStep(nowWallA, dtHop);   // EN DROPDETEKTOR: flanken på samma filter (se FLANK_GONE_DB)
+    const flank = this.flankStep(nowWallA, dtHop);   // EN DROPDETEKTOR: hel återkomst efter tillbakahållen bas, på samma filter (se HELD_DB)
     this.liftStep(nowWallA, dtHop, bodyNow);
 
     // BAS-FRÅNVARO med VARAKTIGHETSKRAV: under 40 % av taket i ≥2 s i sträck.
@@ -2682,29 +2692,41 @@ export class Analyser {
     this.dropClassify(flank, fireNow, nowWallA);
   }
 
-  /** EN DROPDETEKTOR - klassningen (a3): flanken är full drop (efter spärren), slam-kandidaten utan egen flank inom 2 s är minidrop. */
+  /** EN DROPDETEKTOR - klassningen (a3): den hela återkomsten med laddat mått är full drop (efter spärren), slam-kandidaten utan den är
+   *  minidrop. Kandidaten kommer ofta några hopp FÖRE den hela återkomsten (den nöjer sig med toppen - 3,5 dB): är måttet laddat väntar
+   *  den CAND_WAIT_MS på droppen i stället för att ge en minidrop strax före den. */
   private dropClassify(flank: boolean, cand: boolean, nowWallA: number): void {
     if (flank) {
+      this.candWaitMs = 0;
       if (nowWallA - this.lastShowDropMs < SHOW_DROP_GAP_MS) { this.dropSpaced++; this.miniDropCount++; }
       else { this.lastShowDropMs = nowWallA; this.dropCount++; }
-    } else if (cand && nowWallA - this.fdAt > 2000) { this.dropDemoted++; this.miniDropCount++; }
+      return;
+    }
+    if (cand && nowWallA - this.fdAt > 2000) {
+      if (this.heldS >= FLANK_BREAK_S) this.candWaitMs = nowWallA; else { this.dropDemoted++; this.miniDropCount++; }
+    }
+    if (this.candWaitMs > 0 && nowWallA - this.candWaitMs >= CAND_WAIT_MS) { this.candWaitMs = 0; this.dropDemoted++; this.miniDropCount++; }
   }
 
-  /** FULL DROP PÅ FLANKEN (se FLANK_GONE_DB): på dropStep:s egna filter (bodyFast/bodyEnv/bodyCeil), per hop. */
+  /** FULL DROP = HEL ÅTERKOMST EFTER LÄNGE TILLBAKAHÅLLEN BAS (se HELD_DB): på dropStep:s egna filter (bodyFast/bodyCeil), per hop.
+   *  Håller heldS (sekunder tillbakahållen bas) och heldNow åt uppbyggnaden (riserStep). */
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
+    // top = basens topp över hela fönstret, old = toppen FÖRE anslaget (äldre än LAND_OLD_MS), low = botten senaste 0,5 s (styrkan)
+    let top = -1e9, old = -1e9, low = 1e9;
+    for (let q = 0; q < this.fdN; q++) { const i = (this.fdS0 + q) & (CAP - 1), v = V[i], age = now - T[i]; if (v > top) top = v; if (age > LAND_OLD_MS && v > old) old = v; if (age <= 500 && v < low) low = v; }
+    const held = top < ceil - HELD_DB; this.heldNow = held;
+    if (this.lvlSmooth <= FLANK_SILENT_LV) this.quietS += dt; else this.quietS = 0;
+    if (this.quietS >= QUIET_GAP_S) this.heldS = 0;
+    else if (held) { this.heldS += dt; if (this.heldS > HELD_CAP_S) this.heldS = HELD_CAP_S; }
+    else { this.heldS -= dt * HELD_DRAIN; if (this.heldS < 0) this.heldS = 0; }
+    const g = this.bodyLand, land = g > ceil + LAND_OVER_DB && g - old >= LAND_STEP_DB, edge = land && !this.fdAbove; this.fdAbove = land;
+    if (!edge || this.heldS < FLANK_BREAK_S) return false;
+    if (DROP_TRACE) console.log(`[flank] full drop: basen tillbakahallen ${this.heldS.toFixed(1)} s, over taket ${(g - ceil).toFixed(1)} dB, steg ${(g - old).toFixed(1)} dB`);
+    this.heldS = 0; this.fdAt = now; this.dropRiseDb = f - low;
     return true;
   }
 
@@ -2737,38 +2759,13 @@ export class Analyser {
     }
   }
 
-  /** Uppbyggnad/riser (spektral novelty + klang/niva). Returnerar inRiser och uppdaterar buildUp. */
+  /** Uppbyggnad = basen hålls tillbaka (se HELD_DB): samma mått (heldS) som avgör drop eller minidrop. Returnerar inRiser och
+   *  uppdaterar buildUp = hur långt in i det längsta en uppbyggnad varar (heldS / HELD_CAP_S, 0..1). Den gamla risern (spektral
+   *  novelty + klang/nivå) hade absoluta nivågränser (lvlSmooth > 0,3/0,4) och var död vid ren nivå: 0 % av tiden 11-13. */
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
+    const inRiser = this.heldNow && this.heldS >= HELD_BUILD_S && this.heldS < HELD_CAP_S;
+    if (inRiser) this.buildUp = this.heldS / HELD_CAP_S;
+    else { this.buildUp -= this.dtHop / BUILD_FALL_S; if (this.buildUp < 0) this.buildUp = 0; }
     return inRiser;
   }
 
```
