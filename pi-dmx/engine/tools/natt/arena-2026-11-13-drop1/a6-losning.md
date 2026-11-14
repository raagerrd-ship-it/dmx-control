# a6 – RELATIVA GRÄNSER (minsta ingreppet)

## IDÉN
Analysatorns egen uppbyggnadslogik (riser -> buildUp, topp-zonen inZone) får gränser relativa mot låten i stället för absoluta
nivåer, och den gamla kedjan slås på: ett lyft är DROP bara om en uppbyggnad (stigande klang ovanför basen) setts strax före OCH
lyftet landar i låtens topp-zon, annars minidrop. Musikaliskt: droppen löser upp en spänning som byggts och slår ända upp till
låtens tak; en baslucka utan stegring före, eller en återkomst som stannar halvvägs, är en minidrop.

## DELAR
1. **Riserns fönster relativt bandets egen topp** (`bandTop`, `RISER_SPAN_DB`; förr absolut -70..-10 dB). FYND: `bandDb` var mättat
   (=1) 88-100 % av tiden i sex av åtta band -> novelty noll. Det, inte bara nivågrindarna, höll risern död. Bär **bygg**.
2. **Nivågrindarna x levelCeil** (0,3 / 0,4 / +0,04 av låtens tak). Bär **bygg**.
3. **inZone utan absolut golv** + `zoneStep()` (en formel, båda trådarna - fungerar på Pi:n). Som landningskrav bär den **inte_ratt
   och precision**: ensam på dagens flank (simulerat; simulatorn i `sond/` träffar domaren på 0,1 p) 22,8 -> 33,4: 6 av basens 9
   falska drop landar på 40-64 % av taket och faller, drop 2/9, precision 33 %.
4. **Kedjan i `dropClassify`** (`lastBuildMs`, `BUILD_HOLD_MS`): flank utan uppbyggnad -> minidrop. Bär **mini_ratt, inte_ratt,
   precision (alla 100 %)**. Ensam utan zon: 30,6 (antar lyftet 207,4, 3 s före ägarens drop; spärren tar sedan 214).
5. **`RISER_BAND0 = 3`** (m2): risern lyssnar ovanför baskroppen. Bär **bygg_falsk** 8,8 -> 2,4 %: i m1 låg 13 av 16
   uppbyggnadsepisoder 0-4 s EFTER ett lyft (basens återkomst var "nyheten") - build-looken hade tänts efter varje drop.

## SIFFRORNA (övningen)
| | poäng | drop | mini | inte | precision | bygg | falsk | drop/min | tid |
|---|---|---|---|---|---|---|---|---|---|
| bas | 22,8 | 1/9 | 82 % | 0 % | 10 % (10) | 0 % | 0,0 % | 1,03 | 0,31 |
| m1 (del 1-4) | 55,2 | 1/9 | 100 % | 100 % | 100 % (1) | 7 % | 8,8 % | 0,10 | 0,12 |
| m2 (+ del 5) SLUTLIG | 55,1 | 1/9 | 100 % | 100 % | 100 % (1) | 6 % | 2,4 % | 0,10 | 0,12 |

Tempo 100 %. Kostnad mätt växelvis i samma process: 1,00-1,02 x bas (domarens 82/111 us togs på lastad maskin).

SÄMRE / ÄRLIGT: drop_ratt står kvar på 1/9 (214,2 i stället för 367,4, som blir minidrop). Motorn säger drop 1 gång på 10 min mot
10 i dag: droplooken blir sällsynt. Risern vaknar, men hittar bara EN av ägarens sex uppbyggnader (svepet 206-212 s); de andra är
breakdowns där basen hålls tillbaka och inget stiger. Det kan relativa gränser inte se - den delen måste komma från ett annat kort.
Poängen vilar på en enda händelse men är okänslig för talen (samma dom för BUILD_HOLD 3-8 s, zon 0,70-0,90, buildUp 0,15-0,60).

## RISKEN
- Musik utan svep/rullar: aldrig drop, allt blir minidrop.
- Långa mixar: taket minns ~65 s; efter ett starkt parti landar nästa låts drop under 85 % och faller (51,0 landade på 36 %).
- Tal/låtstart efter tystnad: mellanregistret stiger ur intet -> falsk uppbyggnad i några sekunder.
- Zonen läses i lyftets ögonblick: en ensam smäll (529,0) når taket en kort stund - här stoppad av riser-kravet.
- Låtar utan bas: ingen flank, ingen drop (som i dag).

## DIFFEN
`git diff --no-index src .arena/drop1/a6/src` (samma som `diff.patch` i mappen):

```diff
diff --git a/src/ANALYSER_SHARED.md5 b/.arena/drop1/a6/src/ANALYSER_SHARED.md5
index a35bdb2..82a3908 100644
--- a/src/ANALYSER_SHARED.md5
+++ b/.arena/drop1/a6/src/ANALYSER_SHARED.md5
@@ -1,5 +1,5 @@
 # md5 (CRLF->LF) av de gemensamma filerna - samma i lotus-light-link och dmx-control. Skrivs av analyser_shared.py --write
-f93bc245699cc547f8b1926d5cba6219 analyser.ts
+1356bd01ba8519921604866539973c2b analyser.ts
 bd23979ae9882d48c6fc8924f137dd09 split.ts
 ab875f44c6cdc8a687c9ed8805d7501e slowWorker.ts
 b78ab7295bb4303a9976b57b329586e3 analyserClock.ts
diff --git a/src/analyser.ts b/.arena/drop1/a6/src/analyser.ts
index 1529918..0d33bc8 100644
--- a/src/analyser.ts
+++ b/.arena/drop1/a6/src/analyser.ts
@@ -302,6 +302,16 @@ const BODY_CEIL_DB_S = 0.15;   // taket haller latens loud-referens lange
 const FLANK_GONE_DB = 10, FLANK_BREAK_S = 4, FLANK_LAND_DB = 6, FLANK_RISE_DB = 12, FLANK_HOLD_S = 0.6, FLANK_GRACE_S = 1;
 const FLANK_SHORT_S = 2, FLANK_SHORT_RISE_DB = 24, FLANK_SILENT_LV = 0.005;
 const SHOW_DROP_GAP_MS = 12000;   // spärr mellan full drops (ägaren 10-12): flank inom spärren = minidrop (dropSpaced)
+// KEDJAN UPPBYGGNAD -> DROP (drop1 a6): så länge efter att uppbyggnaden senast sågs får lyftet räknas som dess drop. Uppbyggnaden
+// slutar ofta med en paus på en till två takter före smällen (2-4 s vid 120 bpm); längre än så hör lyftet inte till den.
+const BUILD_HOLD_MS = 4000;
+// RISERNS FÖNSTER: bandets nivå räknas 0..1 över så här många dB under bandets egen topp (förr absolut -70..-10 dB, samma spann).
+const RISER_SPAN_DB = 60;
+// RISERN LYSSNAR OVANFÖR BASKROPPEN (band 3-7, >= 250 Hz; kroppen = band 0-2 är drop-detektorns signal). Med alla åtta band blev
+// basens ÅTERKOMST den största "nyheten": mätt (övningen, m1) låg 13 av 16 uppbyggnadsepisoder 0-4 s EFTER ett lyft, alltså efter
+// droppen. Ett svep eller en virvelrulle stiger ovanför basen; basens återkomst är droppen själv. (I det absoluta fönstret var
+// basbanden mättade och bidrog aldrig - så här var novelty-talen 0,15 / 0,45 en gång satta.)
+const RISER_BAND0 = 3;
 // LYFT/NÄSTAN-DROP/STOPP (flyttade ur effects.ts stepLifts 11-09): kroppen 120 ms (nearB), normalnivån 8 s, historik i 25 ms-rutor.
 const NEAR_RISE_DB = 10, NEAR_DIP_DB = 8, LIFT_DB = 10, STOP_MINI_S = 0.6;
 
@@ -873,9 +883,12 @@ export class Analyser {
    *   DET är förklaringen till den uppmätta `buildUp` p50 = p90 = 0.00. Signalen
    *   var inte feljusterad, den var BORTKALIBRERAD av sin egen normalisering.
    * `bandLvl` lämnas orörd — hela effektlagret är kalibrerat mot den. Riser och
-   * novelty läser i stället den här, i dB, där en ramp är en ramp oavsett nivå.
+   * novelty läser i stället rå dB (`bandDbRaw`), där en ramp är en ramp oavsett nivå.
+   * RELATIVT FÖNSTER (drop1 a6, 2026-11-13): förr låg dB-talet i ett ABSOLUT fönster (-70..-10 dB -> 0..1). Ladans rena ljud
+   * ligger över -10 dB i sex av åtta band (mätt: mättat i 88-100 % av tiden) -> novelty var noll och risern död. Fönstret hänger
+   * nu under BANDETS EGEN TOPP (`bandTop`, sjunker som bodyCeil): 1 = vid toppen, 0 = RISER_SPAN_DB under den. Se riserStep.
    */
-  private bandDb = new Float32Array(8);
+  private bandTop = new Float32Array(8).fill(-140);
   private bandDbRaw = new Float32Array(8);   // RA dB per band (drop-detektorns kropp) — synk fran DMX-master 2026-09-03
   /** Stor-FFT-rutor med signal i rad. Onsets hålls tysta tills MAD hunnit byggas
    *  upp — se `ONSET_WARM` och kommentaren vid bandOn. */
@@ -889,6 +902,7 @@ export class Analyser {
   private centSlow = 0.3;
   private lvlSlowR = 0.3;
   private buildUp = 0;           // 0..1 uppbyggnads-envelope
+  private lastBuildMs = -1.5e9;  // uppbyggnaden senast sedd (buildUp >= DROP_CALM_BUILD), kedjan uppbyggnad -> drop (Double fran start)
   // KARAKTÄRSPROFIL (långsam, ~8s)
   private profPunch = 0.4;
   private profBass = 0.5;
@@ -1453,6 +1467,7 @@ export class Analyser {
       { const bl = this.bandLvl[1] + this.bandLvl[2]; if (bl > this.blAccum) this.blAccum = bl; if (this.kickHit >= 1) this.blKickSeq = this.envSeq; }
       if (r[o + B_ENVF] === 1) { this.dBpm = r[o + B_ENVBPM]; this.stepBassline(); }
       this.hRms = r[o + B_RMS]; this.lvlSmooth = r[o + B_LVL]; this.centSmooth = r[o + B_CENT]; this.activeMs = r[o + B_ACTIVE]; this.kickHit = r[o + B_KICKHIT];
+      this.zoneStep();
       const wall = r[o + B_WALL];
       { const po = slot * BIG_HOP_MAX; this.bigRingPush(pcm.subarray(po, po + hn)); }
       if (++this.bigCounter >= Analyser.BIG_EVERY) this.bigStep();
@@ -2043,17 +2058,11 @@ export class Analyser {
     // läses som en drop. Resultatet exponeras som en MONOTON räknare → en konsument
     // på lägre takt kan aldrig missa flanken.
     const nowWallA = this.wallNow();
-    this.levelCeil = Math.max(this.lvlSmooth, this.levelCeil - dtHop * 0.015 * this.levelCeil);   // tak, decay ~65s
+    this.zoneStep();
     // `breaking` = nivån ligger i en svacka. Exponeras till effektlagret (lugnt läge).
     // Den GAMLA svack-stämpeln (breakAtMs, 400 ms ihållande) grindade drop-villkoret
     // innan flanken flyttades till baskroppen; den är borttagen med sitt villkor.
     const breaking = this.lvlSmooth < this.levelCeil * 0.65;
-
-    // TRE villkor, inte tva: utover hysteresen (85 % in / 70 % ut) finns ett
-    // ABSOLUT golv pa 0.65 som saknar motsvarighet pa vagen ut. Det kan ensamt
-    // halla inZone falsk genom en hel tyst lat. Odokumenterat tidigare.
-    if (this.lvlSmooth > this.levelCeil * 0.85 && this.lvlSmooth > 0.65) this.inZoneState = true;
-    else if (this.lvlSmooth < this.levelCeil * 0.70) this.inZoneState = false;
     const inZone = this.inZoneState;
     // BASKROPPEN — drop-detektionens egen signal (tak + frånvaro + stigningstakt).
     // `inZone` lämnas orörd: effektlagret använder den som "musiken ligger högt".
@@ -2418,12 +2427,10 @@ export class Analyser {
       // Lotus-adaptern använder rå bandmagnitud som spektral andel för ljuset.
       // Den får inte ersättas av bandLvl, som är per-band AGC-normaliserad.
       this.bandAbs[b] = avg;
-      // Obehandlad nivå i dB, normaliserad till 0..1 över ett 60 dB-spann.
-      // Ingen AGC, inget tak som följer med uppåt → en stigning syns som stigning.
+      // Obehandlad nivå i dB. Ingen AGC → en stigning syns som stigning (riserns fönster: se riserStep).
       const db = 20 * Math.log10(avg + 1e-7);
-      this.bandDbRaw[b] = db;   // RA dB (drop-kropp)
+      this.bandDbRaw[b] = db;   // RA dB (drop-kropp, riser)
       this.secSpecDirty = true;
-      this.bandDb[b] = Math.max(0, Math.min(1, (db + 70) / 60));
       // Per-band AGC: skala mot egen långsamt sjunkande peak → varje band nyttjar
       // full range oavsett mix (bas dominerar annars alltid rå-magnituden).
       // GOLV (~0.15·lvlSmooth): peaken nollställs INTE i tystnad → när ett tidigare
@@ -2481,6 +2488,16 @@ export class Analyser {
       const v = this.prevMagBigView; this.prevMagBigView = this.magBigView; this.magBigView = v; }
   }
 
+  /** NIVÅTAKET OCH TOPP-ZONEN (drop1 a6): låtens eget tak (sjunker 1,5 %/s, ~65 s) och zonen med hysteres (in vid 85 % av taket, ut vid
+   *  70 %). Det ABSOLUTA golvet 0,65 är borta: ren musik i ladan når nivå 0,25 som mest, så zonen var falsk 100 % av tiden. EN formel,
+   *  körd där nivån finns: snabba sidan i process(), långsamma tråden i drainBig på samma lvlSmooth-följd (kedjan uppbyggnad -> drop
+   *  och riserns nivågrindar läser taket där). */
+  private zoneStep(): void {
+    this.levelCeil = Math.max(this.lvlSmooth, this.levelCeil - this.dtHop * 0.015 * this.levelCeil);
+    if (this.lvlSmooth > this.levelCeil * 0.85) this.inZoneState = true;
+    else if (this.lvlSmooth < this.levelCeil * 0.70) this.inZoneState = false;
+  }
+
   /** Drop-detektionen (baskropp, franvaro, stigning, armering, minidrop, lugn-grind, kick-las, fyrning). Manga kalla grenar: egen funktion sa att en deopt bara kostar den har, inte hetslingan. */
   private dropStep(): void {
     const nowWallA = this.hNowWall, bodyNow = this.hBody;
@@ -2610,9 +2627,8 @@ export class Analyser {
     //   p50/p90=0 ar forvantat — en riser SKA vara sallsynt. I ett brusigt rum
     //   fyrar den nastan aldrig (0.6%, max 0.04), sa ett hart riser-krav skulle
     //   sla av drop-detektionen just dar mikrofonen sitter.
-    // Kravet ar fortfarande avstangt tills det matts om mot bodyOnset pa akta
-    // material (se nedan) — men grunden ar nu grindens kalibrering, inte en dod
-    // signal.
+    // Kravet ar avstangt HAR (kandidaten); sedan drop1 (2026-11-13) stalls det i
+    // klassningen i stallet: se dropClassify (kedjan uppbyggnad -> drop).
 
     // FLANKEN TAS PÅ BASKROPPEN, inte på nivån. Nivå-zonen var sann 80 % av tiden
     // i ägarens musik → dess flanker låg godtyckligt, och 8-takters-spärren blev
@@ -2682,10 +2698,14 @@ export class Analyser {
     this.dropClassify(flank, fireNow, nowWallA);
   }
 
-  /** EN DROPDETEKTOR - klassningen (a3): flanken är full drop (efter spärren), slam-kandidaten utan egen flank inom 2 s är minidrop. */
+  /** EN DROPDETEKTOR - klassningen (a3): flanken är full drop (efter spärren), slam-kandidaten utan egen flank inom 2 s är minidrop.
+   *  KEDJAN UPPBYGGNAD -> DROP AVGÖR SORTEN (drop1 a6; ägaren 11-13: "är det ingen uppbyggnad, så är det troligen bara minidrop"):
+   *  flanken är full drop bara om en uppbyggnad (buildUp >= DROP_CALM_BUILD) setts inom BUILD_HOLD_MS och lyftet landar i låtens
+   *  topp-zon (inZone, relativ); annars minidrop (dropDemoted). Riser-kravet stod avstängt medan risern var död. */
   private dropClassify(flank: boolean, cand: boolean, nowWallA: number): void {
     if (flank) {
-      if (nowWallA - this.lastShowDropMs < SHOW_DROP_GAP_MS) { this.dropSpaced++; this.miniDropCount++; }
+      if (nowWallA - this.lastBuildMs > BUILD_HOLD_MS || !this.inZoneState) { this.dropDemoted++; this.miniDropCount++; }
+      else if (nowWallA - this.lastShowDropMs < SHOW_DROP_GAP_MS) { this.dropSpaced++; this.miniDropCount++; }
       else { this.lastShowDropMs = nowWallA; this.dropCount++; }
     } else if (cand && nowWallA - this.fdAt > 2000) { this.dropDemoted++; this.miniDropCount++; }
   }
@@ -2748,27 +2768,33 @@ export class Analyser {
     // skilt från bara-busy (ihållande → baslinjen kommer ikapp). Gammal väg
     // (klang+nivå stiger) ligger kvar som OR. Inte direkt efter en drop.
     let nov = 0; const sr = this.aSpecSlow;
-    // NOVELTY PÅ `bandDb`, INTE `bandLvl` — se fältets dokumentation. Med den
+    // NOVELTY PÅ RÅ dB (`bandDbRaw`), INTE `bandLvl` — se `bandTop`. Med den
     // AGC-normaliserade nivån var det här uttrycket matematiskt tvunget att gå
     // mot noll under exakt de förlopp det skulle upptäcka.
-    for (let b = 0; b < 8; b++) { this.specSlow[b] += (this.bandDb[b] - this.specSlow[b]) * sr; nov += Math.max(0, this.bandDb[b] - this.specSlow[b]); }
+    // Fönstret är RELATIVT bandets egen topp (0..1 över RISER_SPAN_DB under den), inte absoluta dB: oberoende av ingångsnivån.
+    // BARA BANDEN OVANFÖR BASKROPPEN (RISER_BAND0..7): se RISER_BAND0.
+    for (let b = RISER_BAND0; b < 8; b++) {
+      const raw = this.bandDbRaw[b], top = this.bandTop[b] = Math.max(raw, this.bandTop[b] - dtHop * BODY_CEIL_DB_S);
+      const x = Math.max(0, 1 + (raw - top) * (1 / RISER_SPAN_DB));
+      this.specSlow[b] += (x - this.specSlow[b]) * sr; nov += Math.max(0, x - this.specSlow[b]);
+    }
     this.novSlow += (nov - this.novSlow) * this.aNovSlow;
     this.novBaseline += (this.novSlow - this.novBaseline) * (dtHop / 8);
     const novRiser = this.novSlow > this.novBaseline + 0.15 && this.novSlow > 0.45;
     this.centSlow += (this.centSmooth - this.centSlow) * (dtHop / 2.5);
     this.lvlSlowR += (this.lvlSmooth - this.lvlSlowR) * (dtHop / 2.5);
-    const inRiser = this.activeMs > 2500 && this.lvlSmooth > 0.3 && nowWallA - this.lastDropMs > 1500 && (
+    // NIVÅGRINDARNA ÄR ANDELAR AV LÅTENS EGET TAK (levelCeil), inte absoluta nivåer: 0,3 / 0,4 / +0,04 trimmades när taket låg vid 1
+    // (sönderklippt ljud); rent ljud i ladan har taket vid 0,1-0,25 och nådde aldrig dit (inRiser 0 % av tiden). Samma tal, nu x taket.
+    const lc = this.levelCeil;
+    const inRiser = this.activeMs > 2500 && this.lvlSmooth > 0.3 * lc && nowWallA - this.lastDropMs > 1500 && (
         novRiser
-        || (this.centSmooth > this.centSlow + 0.06 && this.lvlSmooth > this.lvlSlowR + 0.04 && this.lvlSmooth > 0.4)
+        || (this.centSmooth > this.centSlow + 0.06 && this.lvlSmooth > this.lvlSlowR + 0.04 * lc && this.lvlSmooth > 0.4 * lc)
       );
-    // Stampla uppbyggnaden. OBS: drop-villkoret ovan kraver INTE en riser — det
-    // kravet ar avstangt (se dar). Stampeln halls uppdaterad for att kravet ska
-    // kunna aterinforas nu nar riser-signalen faktiskt lever (se `bandDb`).
-    // Nagot "4000 ms-fonster" finns inte i filen; den formuleringen var kvar
-    // fran en tidigare version av villkoret.
+    // Stampla uppbyggnaden: kedjan uppbyggnad -> drop (dropClassify) kraver den igen nu nar riser-signalen lever (se `bandTop`).
     const bTarget = inRiser ? 1 : 0;
     const bRate = bTarget > this.buildUp ? dtHop / 3.5 : dtHop / 1.0;   // bygg ~3.5s, klinga ~1s
     this.buildUp += Math.max(-bRate, Math.min(bRate, bTarget - this.buildUp));
+    if (this.buildUp >= DROP_CALM_BUILD) this.lastBuildMs = nowWallA;
     return inRiser;
   }
 
```
