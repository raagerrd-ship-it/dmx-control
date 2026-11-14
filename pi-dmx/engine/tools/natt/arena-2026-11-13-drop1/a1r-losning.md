# a1r – UPPBYGGNAD I SLAG: BOTTEN HÅLLS ELLER TOPPEN STIGER (drop1 runda 2)

## Vad som var fel med runda 1
- EN sorts uppbyggnad: basen under taket i minst 4 s. I kontrollen spelar basen genom uppbyggnaden (bygg 0 %, 0 av 5).
- Gränsen 4 s låg mitt i en sammanhängande fördelning (minidrop 3,3 s, drop 4,4 s) och var sekunder, inte takt.
- Landningen krävde taket + 2 dB på en egen 30 ms-kropp – vald så att droppet 301,56 hamnade 0,01 s innanför domarens fönster.

## Mekanismen nu
Analysatorn räknar i SLAG hur länge musiken varit i uppbyggnad på ett av två sätt: botten hålls tillbaka (basens topp minst 3 dB
under sitt eget tak) eller toppen stiger medan basen spelar (taktens medelnivå i 250 Hz–16 kHz över takten före, åtta slag i rad).
En HEL återkomst (bodyFast över sitt eget tak i ett språng) är drop när botten hållits i 9 slag eller stigningen intygats inom de
senaste 8; samma mått är inRiser/buildUp.

SER: breakdown och bassvep · sång/ensamt instrument över tom bakgrund (= botten borta) · svep, rulle eller crescendo över spelande
bas i minst ~tre takter – det sista är BARA belagt syntetiskt (svep lagda på övningens musik: 8 takter +10 dB 91 %, 4 takter 54 %;
aldrig falskt i övningens stadiga partier). Övningen har inget riktigt exempel; ingen drop på riktig musik har kommit den vägen.
SER INTE: bara en kort paus före slaget (blir minidrop, med flit) · svep kortare än tre takter · bastrumma som rullar utan att
nivån över 250 Hz stiger takt för takt · tonartshöjning/full refräng utan att något tystnar (ingen baskant) · musik utan bas.

Borttaget mot runda 1: sekundgränserna, 30 ms-kroppen (`bodyLand`) och "taket + 2 dB" (nu: över taket + språng 3 dB, samma dom för
2–6 dB). Tempot fryses medan basen hålls (klockan visade 80 i stället för 130 bpm sekunden före droppet 137).

## KORSPROV (delat vid 290 s; simulatorn `r4.py` = motorn på hundradelen, se `kors.txt`)
Slutvarianten per halva (domarens json): **H1 4 av 6** (51, 137, 211, 282; inte 214/218), 0 drop utan markering ·
**H2 3 av 3**, 1 drop utan markering (536,3 = ägarens minidrop).

| gräns | bäst på H1 | låst mitt → H2 | bäst på H2 | låst mitt → H1 | slutvärde |
|---|---|---|---|---|---|
| BUILD_BEATS | 6,5–9,5 | 8 → 3/3, minifel 507 + 536 (en mer) | 8,5–9,5 | 9 → 4/6, inga fel | 9 (i båda) |
| HELD_DB | 2,5–3 | 2,75 → 3/3, minifel 507 + 536 (en mer) | 3–4,5 | 3,75 → **3/6 (51 tappas)** | 3 (ENDA värdet i båda) |
| HELD_DRAIN | 1,5–4 | 2,5 → 3/3, minifel 536 | 2–4 | 3 → 4/6 | 2 |
| HOLD_BEATS | 1,25–2 | 1,5 → oförändrat | 1,25–2 | 1,5 → oförändrat | 1,5 |
| LAND_STEP_DB | 0–10 | 5 → oförändrat | 2,5–6 | 4 → oförändrat | 3 |
| HELD_CAP_B | 20–40 | 28 → oförändrat | 12–40 | 24 → oförändrat | 32 |

HELD_DB måste i praktiken flyttas mellan halvorna: droppet 51 kräver <= 3,3, minidroppen 507 kräver >= 3. Den borde bort; jag har
inte hittat ersättaren. RISE_* går inte att korspröva – inget drop i övningen hänger på dem.

## MARGINALER (±25 %, domen = träffar + fel på övningen; `marg.txt`)
| gräns | värde | −25 % | +25 % |
|---|---|---|---|
| BUILD_BEATS | 9 slag | **ÄNDRAD**: mini 320, 507 blir drop | **ÄNDRAD**: drop 137, 367 tappas |
| HELD_DB | 3 dB | **ÄNDRAD**: mini 225, 507 blir drop | **ÄNDRAD**: drop 51, 367 tappas |
| HELD_DRAIN | 2 | **ÄNDRAD**: mini 507 blir drop | samma |
| HOLD_BEATS | 1,5 slag | samma | **ÄNDRAD**: drop 367 tappas |
| HELD_CAP_B | 32 slag | samma | samma (falsk 11,0 %) |
| HELD_FLAG_B | 8 slag | samma (bygg 68 %, falsk 11,2 %) | samma (bygg 38 %, falsk 8,3 %) |
| LAND_STEP_DB | 3 dB | samma | samma |
| LAND_OLD_MS | 150 | samma | samma |
| RISE_DB | 0,5 dB | samma | samma |
| RISE_BEATS (längd + minne) | 8 slag | samma | samma |
| QUIET_GAP_S | 1 s | samma | samma |

Fyra gränser klarar INTE kravet, alla av samma skäl: fem händelser ligger inom 6,4–9,9 slag (mini 225/320/507, drop 367/137).
Ägarens egen gräns går mellan en tvåtakterslucka och en uppbyggnad på två och en halv takt; ingen längdgräns får 25 % luft där
(jag prövade sekunder, slag, djupvägt mått och rangmått). BUILD_BEATS 12 ger 5/9 med samma svaghet.

## Domarens rad (m1 = m2, m2 är bekräftelse efter ändrad kommentar)
| id | poäng | drop | mini rätt | inte | precision | bygg | falsk | drop/min | tid | tempo = bas | DISK |
|---|---|---|---|---|---|---|---|---|---|---|---|
| a1r | 82,1 | 7/9 | 91 % | 100 % | 88 % (8) | 53 % | 9,6 % | 0,82 | 0,20 | 100 % | OK |

Mot runda 1 (82,6): bygg 58 → 53 %, falsk 8,7 → 9,6 %, tid 0,17 → 0,20. Droppet 301,56 träffar på exakt +1,00 s (fönstrets kant).
Kostnad 0,97 × bas. Sonder 4 av 4, mätningar 2 av 2.

## Diffen mot `src`
Appliceras från `engine/` med `patch -p1 < .arena/drop1/a1r/a1r.diff` (samma innehåll som nedan).

```diff
diff --git a/src/analyser.ts b/src/analyser.ts
index 1529918..067c9df 100644
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
+   *  en uppbyggnad - botten hållen i BUILD_BEATS slag eller toppen stigande i tre takter (drop1 a1r, 11-14; efter spärren
+   *  SHOW_DROP_GAP_MS). Detektorns lägre steg är minidrops: dropDemoted = slam-kandidat utan full drop (inom 2 s), dropSpaced = full drop
+   *  inom spärren. Båda räknas också i miniDropCount. dropRiseDb = senaste droppens stigning (styrka). */
   dropDemoted: number; dropSpaced: number; dropRiseDb: number;
   /** LYFT/NÄSTAN-DROP/STOPP (a3, förr effects.ts stepLifts): VAD (> 0 medan villkoret håller) + STYRKA (dB).
    *  nearDropDb = språnget från dippens botten (dipp nearDipDb under 8 s-normalen), liftDb = kroppen 0,6 s över lugnet 6..2 s sedan,
@@ -167,8 +168,9 @@ export interface Frame {
   nearDropDb: number; nearDipDb: number; liftDb: number; stopCount: number; stopS: number;
   inZone: boolean;      // nivån är i låtens topp-zon (ihållande tillstånd, hysteres)
   breaking: boolean;    // nivån är i en svacka/break (ihållande tillstånd)
-  /** UPPBYGGNAD (riser): 0..1 tension som ramsar upp mot en drop. Mjuk signal →
-   *  sampling-säker. Show-REAKTIONERNA (strobe, swell) ligger i effekt-motorn. */
+  /** UPPBYGGNAD: 0..1 = hur länge botten hållits tillbaka (heldB / HELD_CAP_B) eller toppen stigit (slag / 16) medan inRiser, annars 0.
+   *  inRiser = basen hålls tillbaka (HELD_FLAG_B..HELD_CAP_B slag) eller toppen stiger medan basen spelar. Show-REAKTIONERNA ligger i
+   *  effekt-motorn. */
   buildUp: number;
   /** UPPBYGGNADENS FÖRLOPP 0..1 (ägaren 11-12: 'Uppbyggnaden borde flyttas till långsamma analysatorn'; förr effects.ts buildProg):
    *  slag sedan sektionen blev 'build' / 32, räknat från uppbyggnadens START, och hålls över sektionsfladder kortare än 2 s.
@@ -294,13 +296,29 @@ const DROP_SHORT_MS = 4000;    // minsta drop-avstand nar dropen ESKALERAR
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
+// FULL DROP = BASEN KOMMER TILLBAKA HEL EFTER EN UPPBYGGNAD (drop1 a1 11-13, omgjord i runda 2 = a1r efter att ingen variant träffade
+// kontrollens drop: där spelar basen vidare genom uppbyggnaden). Två sorters uppbyggnad, räknade i SLAG (dBpm, 120 om klockan saknar
+// tempo) och relativt låtens egna nivåer; samma filter som slam-kandidaten (bodyFast 60 ms, bodyEnv 350 ms, bodyCeil -0,15 dB/s).
+//   1. BOTTEN HÅLLS TILLBAKA (breakdown, bassvep): heldB = slag som basens topp (bodyFast över HOLD_BEATS slag) legat minst HELD_DB
+//      under taket. Fylls ett slag per slag, rinner HELD_DRAIN slag per slag när basen är tillbaka, stannar vid HELD_CAP_B. Tempot
+//      fryses medan basen hålls (klockan tappar takten i breaket: 11-13 80 bpm i stället för 130 sekunden före ett drop).
+//      Laddat vid BUILD_BEATS: en lucka på två takter mäter 5,6-8,3 slag här, ägarens kortaste uppbyggnader 9,8. Gränsen har
+//      inte 25 % marginal åt något håll (runda 2:s marginalprov): fem händelser i övningen ligger inom 6,4-9,9 slag.
+//   2. TOPPEN STIGER MEDAN BASEN SPELAR (svep, rulle, crescendo): medelnivån i band 3-7 (250 Hz-16 kHz) per slag; taktens medel
+//      (4 slag) minst RISE_DB över takten före, i RISE_BEATS slag i rad = stigningen har pågått i tre takter. Ett ensamt nivåsteg
+//      (ett instrument kommer in) klarar aldrig 8 slag i rad. Intyget gäller RISE_BEATS slag framåt (pausen före slaget).
+//      Mätt 11-13: aldrig sant i övningens stadiga partier; syntetiska svep över samma musik: 8 takter +10 dB 91 %, 4 takter 54 %.
+//   HEL ÅTERKOMST: bodyFast över sitt eget tak OCH minst LAND_STEP_DB över allt basen gjort de senaste HOLD_BEATS slagen (äldre än
+//      LAND_OLD_MS = före själva anslaget). En halv återkomst börjar under taket och kryper sedan över det i små steg (11-13:
+//      högst 1,7 dB per steg) - ingen drop; en hel slår över taket i ett språng (11-13: domen densamma för 2-6 dB).
+//   HELD_FLAG_B   uppbyggnad (inRiser) = basen hålls och har gjort det i HELD_FLAG_B..HELD_CAP_B slag, eller stigningen pågår.
+//      Längre än HELD_CAP_B (åtta takter) är ett lugnt parti/intro/övergång - återkomsten är fortfarande ett drop.
+//   QUIET_GAP_S   helt tyst (lvlSmooth <= FLANK_SILENT_LV) i 1 s = låtlucka: musiken är borta, ingenting hålls tillbaka.
+const HELD_DB = 3, HELD_DRAIN = 2, BUILD_BEATS = 9, HELD_CAP_B = 32, HELD_FLAG_B = 8, HOLD_BEATS = 1.5;
+const RISE_DB = 0.5, RISE_BEATS = 8;
+const LAND_STEP_DB = 3, LAND_OLD_MS = 150, QUIET_GAP_S = 1, FLANK_SILENT_LV = 0.005;
+const BUILD_FALL_S = 0.5;   // buildUp släpper på en halv sekund när uppbyggnaden är över
+const CAND_WAIT_MS = 300;   // en slam-kandidat medan måttet är laddat väntar så här länge på den hela återkomsten innan den blir minidrop
 const SHOW_DROP_GAP_MS = 12000;   // spärr mellan full drops (ägaren 10-12): flank inom spärren = minidrop (dropSpaced)
 // LYFT/NÄSTAN-DROP/STOPP (flyttade ur effects.ts stepLifts 11-09): kroppen 120 ms (nearB), normalnivån 8 s, historik i 25 ms-rutor.
 const NEAR_RISE_DB = 10, NEAR_DIP_DB = 8, LIFT_DB = 10, STOP_MINI_S = 0.6;
@@ -310,13 +328,13 @@ const NEAR_RISE_DB = 10, NEAR_DIP_DB = 8, LIFT_DB = 10, STOP_MINI_S = 0.6;
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
+  'heldB', 'quietS', 'candWaitMs', 'beatAcc', 'beatSum', 'fdAt', 'lastShowDropMs', 'dropRiseDb', 'nearB', 'nearNorm', 'nearFloor', 'liftCalm', 'liftLift', 'liftHistAt', 'stopRunS',
   'nearDropDb', 'nearDipDb', 'liftDb', 'stopS',   // byter forst vid forsta drop-episoden (sags i andra matningen)
 ] as const;
 /** TYPSTABILA TALFALT (2026-09-27, realtidsprincipen): skriv ett icke-heltal och sedan ursprungsvardet, sa V8 ger faltet
@@ -767,7 +785,7 @@ export class Analyser {
   private aAtt = 0; private aRel = 0; private aVU = 0;
   private aIUp = 0; private aIDown = 0; private aBandLvl = 0;
   private dHat = 0; private dSnare = 0; private dKick = 0;
-  private aSpecSlow = 0; private aNovSlow = 0; private aProf = 0;
+  private aProf = 0;
   /** BASBANDETS onset-envelope (kick-flux), samma raster och position som envRing. */
   private envBassRing = new Float32Array(Analyser.ENV_LEN);
   private envBassAccum = 0;
@@ -855,7 +873,9 @@ export class Analyser {
   private dropCount = 0;         // monoton drop-räknare (edge-säker för konsumenter) - full drop på flanken
   private dropCand = 0;          // slam-kandidaterna (förr dropCount): sektionens drop-evidens och minidrop utan flank
   private dropDemoted = 0; private dropSpaced = 0; private dropRiseDb = -0;
-  private fdGone = -0; private fdSpan = -0; private fdEnd = -1e12; private fdAbove = true; private fdAt = -1e12; private fdQuietAt = -1e12; private lastShowDropMs = -1e12;
+  private heldB = -0; private heldNow = false; private quietS = -0; private candWaitMs = -0; private fdAbove = true; private fdAt = -1e12; private lastShowDropMs = -1e12;
+  private tensBpm = 120.5; private beatAcc = -0; private beatSum = -0; private beatCnt = 0; private beatFill = 0; private riseRun = 0; private riseAgoB = 1e9 + 0.5; private risingNow = false;
+  private beatLv = new Float64Array(8);   // toppens (band 3-7) medelnivå de åtta senaste slagen medan basen spelar
   private fdT = new Float64Array(1024); private fdV = new Float64Array(1024); private fdS0 = 0; private fdN = 0;   // (tid, bodyFast) för toppens fönster
   private nearOn = false; private nearB = -0; private nearNorm = -0; private nearFloor = 1e9; private liftCalm = -0; private liftLift = -0;
   private liftHist = new Float64Array(240); private liftW = 0; private liftN = 0; private liftHistAt = -1e12; private stopRunS = -0;
@@ -883,11 +903,6 @@ export class Analyser {
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
@@ -1796,8 +1811,6 @@ export class Analyser {
     this.dHat = Math.exp(-dtHop / 0.06);
     this.dSnare = Math.exp(-dtHop / 0.11);
     this.dKick = Math.exp(-dtHop / 0.15);
-    this.aSpecSlow = 1 - Math.exp(-dtHop / 2.0);
-    this.aNovSlow = 1 - Math.exp(-dtHop / 1.5);
     this.aProf = 1 - Math.exp(-dtHop / 8.0);
     // Ett återanvänt Frame (spec/onset pekar på de pre-allokerade objekten).
     this.outFrame = {
@@ -2494,7 +2507,7 @@ export class Analyser {
     this.bodyCeil = Math.max(this.bodyEnv, this.bodyCeil - dtHop * BODY_CEIL_DB_S);
     this.bodyPeak = Math.max(this.bodyEnv, this.bodyPeak - dtHop * 0.04);   // ~0.04 dB/s ≈ haller loud-referensen i minuter
     this.bodyUnderDb = this.bodyCeil - this.bodyEnv;
-    const flank = this.flankStep(nowWallA, dtHop);   // EN DROPDETEKTOR: flanken på samma filter (se FLANK_GONE_DB)
+    const flank = this.flankStep(nowWallA, dtHop);   // EN DROPDETEKTOR: hel återkomst efter en uppbyggnad, på samma filter (se HELD_DB)
     this.liftStep(nowWallA, dtHop, bodyNow);
 
     // BAS-FRÅNVARO med VARAKTIGHETSKRAV: under 40 % av taket i ≥2 s i sträck.
@@ -2682,29 +2695,58 @@ export class Analyser {
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
+      if (this.heldB >= BUILD_BEATS || this.riseAgoB <= RISE_BEATS) this.candWaitMs = nowWallA; else { this.dropDemoted++; this.miniDropCount++; }
+    }
+    if (this.candWaitMs > 0 && nowWallA - this.candWaitMs >= CAND_WAIT_MS) { this.candWaitMs = 0; this.dropDemoted++; this.miniDropCount++; }
   }
 
-  /** FULL DROP PÅ FLANKEN (se FLANK_GONE_DB): på dropStep:s egna filter (bodyFast/bodyEnv/bodyCeil), per hop. */
+  /** FULL DROP = HEL ÅTERKOMST EFTER EN UPPBYGGNAD (se HELD_DB): på dropStep:s egna filter (bodyFast/bodyCeil), per hop.
+   *  Håller heldB (slag som botten hållits tillbaka), risingNow (toppen stiger medan basen spelar) och heldNow åt riserStep. */
   private flankStep(now: number, dt: number): boolean {
     const CAP = 1024, T = this.fdT, V = this.fdV, f = this.bodyFast, ceil = this.bodyCeil;
+    const holdMs = HOLD_BEATS * 60000 / this.tensBpm;
     if (this.fdN === CAP) { this.fdS0 = (this.fdS0 + 1) & (CAP - 1); this.fdN--; }
     { const w = (this.fdS0 + this.fdN) & (CAP - 1); T[w] = now; V[w] = f; this.fdN++; }
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
+    while (this.fdN > 1 && now - T[this.fdS0] > holdMs) { this.fdS0 = (this.fdS0 + 1) & (CAP - 1); this.fdN--; }
+    // top = basens topp över hela fönstret, old = toppen FÖRE anslaget (äldre än LAND_OLD_MS), low = botten senaste 0,5 s (styrkan)
+    let top = -1e9, old = -1e9, low = 1e9;
+    for (let q = 0; q < this.fdN; q++) { const i = (this.fdS0 + q) & (CAP - 1), v = V[i], age = now - T[i]; if (v > top) top = v; if (age > LAND_OLD_MS && v > old) old = v; if (age <= 500 && v < low) low = v; }
+    const held = top < ceil - HELD_DB; this.heldNow = held;
+    if (!held) this.tensBpm = this.dBpm > 0 ? this.dBpm : 120;
+    const db = this.tensBpm / 60 * dt;   // slag per hopp
+    if (this.lvlSmooth <= FLANK_SILENT_LV) this.quietS += dt; else this.quietS = 0;
+    if (this.quietS >= QUIET_GAP_S) this.heldB = 0;
+    else if (held) { this.heldB += db; if (this.heldB > HELD_CAP_B) this.heldB = HELD_CAP_B; }
+    else { this.heldB -= db * HELD_DRAIN; if (this.heldB < 0) this.heldB = 0; }
+    // 2. toppen stiger medan basen spelar: en nivåruta per slag, takten mot takten före
+    this.riseAgoB += db;
+    if (held || this.quietS > 0) { this.beatFill = 0; this.riseRun = 0; this.beatAcc = 0; this.beatSum = 0; this.beatCnt = 0; }
+    else {
+      const R = this.bandDbRaw; this.beatSum += (R[3] + R[4] + R[5] + R[6] + R[7]) / 5; this.beatCnt++; this.beatAcc += db;
+      if (this.beatAcc >= 1) {
+        const L = this.beatLv; this.beatAcc -= 1;
+        for (let k = 0; k < 7; k++) L[k] = L[k + 1];
+        L[7] = this.beatSum / this.beatCnt; this.beatSum = 0; this.beatCnt = 0; this.beatFill++;
+        if (this.beatFill >= 8) this.riseRun = (L[4] + L[5] + L[6] + L[7] - L[0] - L[1] - L[2] - L[3]) / 4 >= RISE_DB ? this.riseRun + 1 : 0;
+      }
+    }
+    this.risingNow = this.riseRun >= RISE_BEATS;
+    if (this.risingNow) this.riseAgoB = 0;
+    const land = f > ceil && f - old >= LAND_STEP_DB, edge = land && !this.fdAbove; this.fdAbove = land;
+    if (!edge || (this.heldB < BUILD_BEATS && this.riseAgoB > RISE_BEATS)) return false;
+    if (DROP_TRACE) console.log(`[flank] full drop: botten hallen ${this.heldB.toFixed(1)} slag, stigning for ${this.riseAgoB < 1e6 ? this.riseAgoB.toFixed(1) : '-'} slag sedan, over taket ${(f - ceil).toFixed(1)} dB, steg ${(f - old).toFixed(1)} dB`);
+    this.heldB = 0; this.riseAgoB = 1e9; this.riseRun = 0; this.beatFill = 0; this.risingNow = false; this.fdAt = now; this.dropRiseDb = f - low;
     return true;
   }
 
@@ -2737,38 +2779,13 @@ export class Analyser {
     }
   }
 
-  /** Uppbyggnad/riser (spektral novelty + klang/niva). Returnerar inRiser och uppdaterar buildUp. */
+  /** Uppbyggnad = botten hålls tillbaka eller toppen stiger medan basen spelar (se HELD_DB): samma mått som avgör drop eller
+   *  minidrop. Returnerar inRiser och uppdaterar buildUp (heldB / HELD_CAP_B, eller stigningens längd / 16 slag; 0..1). Den gamla
+   *  risern (spektral novelty + klang/nivå) hade absoluta nivågränser (lvlSmooth > 0,3/0,4) och var död vid ren nivå: 0 % av tiden. */
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
+    const inRiser = (this.heldNow && this.heldB >= HELD_FLAG_B && this.heldB < HELD_CAP_B) || this.risingNow;
+    if (inRiser) { const a = this.heldB / HELD_CAP_B, b = this.risingNow ? Math.min(1, this.riseRun / 16) : 0; this.buildUp = a > b ? a : b; }
+    else { this.buildUp -= this.dtHop / BUILD_FALL_S; if (this.buildUp < 0) this.buildUp = 0; }
     return inRiser;
   }
 
```
