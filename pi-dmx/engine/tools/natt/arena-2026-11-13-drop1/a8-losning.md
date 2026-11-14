# a8 – MINIDROPENS SIGNATUR (uteslutning)

## IDÉN
Analysatorn lyssnar på vad RESTEN av musiken (band 3–7, 250 Hz–16 kHz) gör medan basen är borta: står de övre banden stilla är luckan en minidrop, rör de sig (riser, rulle, svep, element som kommer och går) är det en uppbyggnad, och rörelsen samlas i en spänning (dB x s) som klingar av på 4 s. Fullt drop = baskroppen LANDAR vid sin topp medan spänningen finns; allt är dB-skillnader mot låtens egna nivåer (ljudet x0,5, x1, x2: samma 7 drop, 6 träffar).

## DELAR (allt i src/analyser.ts)
- **tensionStep + UP_*/TENSION_*** (spänningen; ankare 0,8 s efter att basen gått, tysta band räknas inte): bär **mini_ratt 91 %, inte_ratt 100 %, precision 86 %** – utan rörelse där uppe, inget drop.
- **dropClassify + `landing`** (drop = kroppen når bodyPeak - DROP_QUALITY_DB med spänning >= 3,4; landningen tömmer spänningen; flank utan spänning = minidrop; flank med spänning väntar på landningen): bär **drop_ratt 6/9, tid 0,19 s**. Väntan ger 210,58 (basen kom mjukt 207,4 där basens flank fyrade; smällen 3 s senare).
- **riserStep** (inRiser = basen >= 5 dB under taket och spänning >= 2; novelty-vägen bakom absoluta 0,3/0,4 borttagen): bär **bygg 44 %, bygg_falsk 6,2 %**.
- **upCold** (helt tyst 0,8 s = låtlucka, spänningen nollas): skydd, bär inget mått på övningen.

## SIFFRORNA
| | poäng | drop | mini rätt | inte | precision | bygg | falsk | drop/min | tid |
|---|---|---|---|---|---|---|---|---|---|
| bas | 22,8 | 1/9 | 82 % | 0 % | 10 % (10) | 0 % | 0,0 % | 1,03 | 0,31 |
| a8 m1 | 76,4 | 6/9 | 91 % | 100 % | 86 % (7) | 44 % | 6,2 % | 0,72 | 0,19 |

EN domarmätning (dropdom-m1.json). m2 användes inte: inget jag kunde belägga offline breddade luckan (27 filterkombinationer: lägsta drop / högsta övriga 1,2–1,5; vald 1,4). Sonder: 5 av 6. dist är ombyggd efter m1 med ändrad KOMMENTAR; kodraderna identiska.
Spänning vid landningen: drop 5,8 / 3,9 / 7,3 / 4,9 / 4,1 / 7,0; mini och "inte drop" <= 2,0; omarkerade <= 2,8.
Sämre/kvar: missar 214,23 och 217,91 (upprepningar 3,7 s efter ett drop: spänningen tömd, 12 s-spärren) och 367,36 (bassvep med stilla övre band); 319,6 blev drop (filtersvep över HELA musiken, 5,4); sektion = bas 96 % (buildUp lever). Kostnad 144,5 µs mot bas 61,8 är störd mätning (egen körning i rad: bas 157, a8 83, bas 112); ändringen byter en 8-bandsslinga mot en 5-bands.

## RISKEN
- Gränsen 3,4 ligger i en smal lucka (2,8–3,9). ETT element som kommer in i två band under en baslucka ger ~3 dB x s: sång/ackordbyten över korta luckor (pop) kan bli drop.
- Landningen mäts mot bodyPeak (minuter): tystare låt efter starkare landar aldrig; rampad återkomst landar sent (302: +0,98 s, 441: +0,57 s) – flera sådana och tid-spärren ryker.
- Långa baslösa intron och tal: uppbyggnaden ligger på (256–283 och 407–425 s är nästan hela 6,2 %), och slår basen sedan in fullt blir det drop. Låtar utan bas: aldrig drop.
- Flank med spänning som aldrig landar ger ingenting, inte ens minidrop. Stutter-drop i mixar: bara det första.

## DIFFEN
`git diff --no-index src .arena/drop1/a8/src` (även a8.diff; appliceras på engine/src med b/.arena/drop1/a8/src/ -> b/src/):

```diff
diff --git a/src/ANALYSER_SHARED.md5 b/.arena/drop1/a8/src/ANALYSER_SHARED.md5
index a35bdb2..5a16ee3 100644
--- a/src/ANALYSER_SHARED.md5
+++ b/.arena/drop1/a8/src/ANALYSER_SHARED.md5
@@ -1,5 +1,5 @@
 # md5 (CRLF->LF) av de gemensamma filerna - samma i lotus-light-link och dmx-control. Skrivs av analyser_shared.py --write
-f93bc245699cc547f8b1926d5cba6219 analyser.ts
+2c7c6f3750eeacf7ff39c72ceaa511ce analyser.ts
 bd23979ae9882d48c6fc8924f137dd09 split.ts
 ab875f44c6cdc8a687c9ed8805d7501e slowWorker.ts
 b78ab7295bb4303a9976b57b329586e3 analyserClock.ts
diff --git a/src/analyser.ts b/.arena/drop1/a8/src/analyser.ts
index 1529918..f0fe0d3 100644
--- a/src/analyser.ts
+++ b/.arena/drop1/a8/src/analyser.ts
@@ -302,6 +302,26 @@ const BODY_CEIL_DB_S = 0.15;   // taket haller latens loud-referens lange
 const FLANK_GONE_DB = 10, FLANK_BREAK_S = 4, FLANK_LAND_DB = 6, FLANK_RISE_DB = 12, FLANK_HOLD_S = 0.6, FLANK_GRACE_S = 1;
 const FLANK_SHORT_S = 2, FLANK_SHORT_RISE_DB = 24, FLANK_SILENT_LV = 0.005;
 const SHOW_DROP_GAP_MS = 12000;   // spärr mellan full drops (ägaren 10-12): flank inom spärren = minidrop (dropSpaced)
+// UPPBYGGNADEN = DE ÖVRE BANDEN RÖR SIG MEDAN BASEN ÄR BORTA (drop1 a8, ladan 11-13; ägaren: "är det ingen uppbyggnad, så är det
+// troligen bara minidrop"). En MINIDROP är en lucka i basen där resten av musiken (band 3-7, 250 Hz-16 kHz) står kvar som den stod.
+// I en uppbyggnad händer det saker där uppe under luckan: riser, virvelrulle, filtersvep, element som kommer och går.
+// MÅTTET (tensionStep): varje övre bands nivå i dB, snabbt medel (UP_FAST_S) mot långsamt (UP_SLOW_S) - skillnaden är rörelsen. När
+// basen varit borta UP_SETTLE_S ställs det långsamma medlet på det snabba (banden "som de står när basen väl är borta": själva
+// utträdet är inte uppbyggnad). Rörelse över UP_STILL_DB (vanlig musik gungar ~1 dB i snitt över banden) samlas i `tension` (dB x s)
+// medan basen är borta och klingar av med TENSION_TAU_S (två takter: en uppbyggnad kulminerar, den ligger inte 10 s bakåt).
+// Ett band som ligger UP_QUIET_DB under det starkaste övre bandet är tyst (golvbrus rör sig inte); UP_CLIP_DB = ett band räknas högst
+// så här mycket (ett band som faller ur helt är inte fem gånger mer uppbyggnad än ett svep). Allt är dB-skillnader mot låtens egna
+// nivåer - ingen absolut nivå, samma dom vid ljudet x1, x2, x3. Helt tyst (lvlSmooth <= FLANK_SILENT_LV, flankens låtlucka) i
+// UP_SETTLE_S = låtlucka: spänningen nollas, och musiken som kommer igång räknas inte som rörelse (medlen följs åt lika länge efteråt).
+// En kortare tystnad är pausen före droppet och rör inte spänningen.
+//   FULL DROP = kroppen LANDAR vid sin topp (bodyFast inom DROP_QUALITY_DB av bodyPeak) med tension >= TENSION_DROP; landningen löser
+//   ut spänningen. Flank eller slam utan spänning är minidrop. frame.inRiser = basen borta och tension >= TENSION_BUILD.
+// MÄTT på lang-20261113T160345 (ägarens markeringar, DMX-profilen: DROP_QUALITY_DB 3): hans drop 3,9-7,3 vid landningen (sex av nio;
+// de tre övriga = två upprepningar 3,7 s efter ett drop och ett bassvep där övre banden står stilla), allt han kallat mini eller
+// "inte drop" <= 2,0 utom en (filtersvep över hela musiken, 5,4), omarkerade landningar <= 2,8. TENSION_DROP ligger mitt i luckan
+// 2,8-3,9; TENSION_BUILD lägre så att uppbyggnaden syns medan den pågår (uppbyggnad utanför ägarens 6,2 % av tiden, mest låtintron).
+const UP_FAST_S = 0.25, UP_SLOW_S = 2, UP_SETTLE_S = 0.8, UP_STILL_DB = 1, UP_CLIP_DB = 12, UP_QUIET_DB = 30;
+const TENSION_TAU_S = 4, TENSION_DROP = 3.4, TENSION_BUILD = 2;
 // LYFT/NÄSTAN-DROP/STOPP (flyttade ur effects.ts stepLifts 11-09): kroppen 120 ms (nearB), normalnivån 8 s, historik i 25 ms-rutor.
 const NEAR_RISE_DB = 10, NEAR_DIP_DB = 8, LIFT_DB = 10, STOP_MINI_S = 0.6;
 
@@ -310,7 +330,7 @@ const NEAR_RISE_DB = 10, NEAR_DIP_DB = 8, LIFT_DB = 10, STOP_MINI_S = 0.6;
 const DOUBLE_FROM_START = [
   'secHiStartMs', 'secHiEndMs', 'expectHighMs', 'levelVsHighDb',
   'sumSq', 'lastT', 'dbgRms', 'lastKick', 'envAccum', 'envAccumT', 'envBassAccum', 'blAccum', 'lvlSmooth', 'lvlVU', 'engSmooth', 'activeMs',
-  'buildUp', 'novSlow', 'kickHit', 'snareHit', 'hatHit', 'bodyEnv', 'bodyFast', 'bodyCeil', 'bodyPeak', 'lastGoneSpanMs', 'lastDropMs',
+  'buildUp', 'kickHit', 'snareHit', 'hatHit', 'bodyEnv', 'bodyFast', 'bodyCeil', 'bodyPeak', 'lastGoneSpanMs', 'lastDropMs',
   'lastMiniGoneMs', 'lastMiniMs', 'pendingKickMs', 'kfPrev', 'kfPrev2', 'beatAnchorMs',
   'blPrev1', 'blPrev2', 'blTrough', 'profBassline', 'bassOnsetsPerBeat',
   'rawBpmLast', 'localBpmConfidence',
@@ -767,7 +787,7 @@ export class Analyser {
   private aAtt = 0; private aRel = 0; private aVU = 0;
   private aIUp = 0; private aIDown = 0; private aBandLvl = 0;
   private dHat = 0; private dSnare = 0; private dKick = 0;
-  private aSpecSlow = 0; private aNovSlow = 0; private aProf = 0;
+  private aProf = 0;
   /** BASBANDETS onset-envelope (kick-flux), samma raster och position som envRing. */
   private envBassRing = new Float32Array(Analyser.ENV_LEN);
   private envBassAccum = 0;
@@ -883,11 +903,10 @@ export class Analyser {
   /** ~1,5 s vid 125 Hz. MAD startar i noll efter tystnad och byggs upp med
    *  `mad ← 1.006·mad + 6e-5`, vilket tar ≈183 rutor att nå ett användbart värde. */
   private static readonly ONSET_WARM = 183;
-  private specSlow = new Float32Array(8);
-  private novSlow = 0;           // ihållande spektral novelty (~1.5s)
-  private novBaseline = 0.2;     // ~8s baslinje → riser = novelty STIGER över den
-  private centSlow = 0.3;
-  private lvlSlowR = 0.3;
+  private upFast = new Float64Array(5).fill(-70); private upSlow = new Float64Array(5).fill(-70);   // övre banden (3-7) i dB, snabbt/långsamt medel (se UP_*)
+  private bassAwayS = -0; private tension = -0;   // basen borta sedan (s) och uppbyggnadens spänning (dB x s)
+  private upCold = UP_SETTLE_S;   // s: växer i tystnad (tak UP_SETTLE_S = låtlucka), krymper med musik; > 0 = musiken har inte hunnit sätta sig
+  private wasLanded = true; private landAt = -1e12;   // kroppen vid toppen förra hoppet; senaste landningen med spänning
   private buildUp = 0;           // 0..1 uppbyggnads-envelope
   // KARAKTÄRSPROFIL (långsam, ~8s)
   private profPunch = 0.4;
@@ -1796,8 +1815,6 @@ export class Analyser {
     this.dHat = Math.exp(-dtHop / 0.06);
     this.dSnare = Math.exp(-dtHop / 0.11);
     this.dKick = Math.exp(-dtHop / 0.15);
-    this.aSpecSlow = 1 - Math.exp(-dtHop / 2.0);
-    this.aNovSlow = 1 - Math.exp(-dtHop / 1.5);
     this.aProf = 1 - Math.exp(-dtHop / 8.0);
     // Ett återanvänt Frame (spec/onset pekar på de pre-allokerade objekten).
     this.outFrame = {
@@ -2494,6 +2511,7 @@ export class Analyser {
     this.bodyCeil = Math.max(this.bodyEnv, this.bodyCeil - dtHop * BODY_CEIL_DB_S);
     this.bodyPeak = Math.max(this.bodyEnv, this.bodyPeak - dtHop * 0.04);   // ~0.04 dB/s ≈ haller loud-referensen i minuter
     this.bodyUnderDb = this.bodyCeil - this.bodyEnv;
+    this.tensionStep(dtHop);
     const flank = this.flankStep(nowWallA, dtHop);   // EN DROPDETEKTOR: flanken på samma filter (se FLANK_GONE_DB)
     this.liftStep(nowWallA, dtHop, bodyNow);
 
@@ -2647,6 +2665,7 @@ export class Analyser {
       }
     }
     const fullSlam = this.bodyPeak - bodyPeek < DROP_QUALITY_DB;
+    const landing = fullSlam && !this.wasLanded; this.wasLanded = fullSlam;   // kroppen NÅR toppen (en gång per landning); låtstarten har ingen spänning (upCold)
     // DMX_DROP_TRACE=1: logga KONSUMERADE edges (kandidat som INTE fyrade) — var ligger kroppen vid
     // forsta takten? Matdata for DROP_QUALITY_DB pa mjukare material (pop) dar inget referens finns.
     if (DROP_TRACE && bodyOnsetEdge && !(dropSpacingOk && fullSlam)) console.log(`[dropedge] rise ${bodyRise.toFixed(1)} underPeak ${(this.bodyPeak - this.bodyFast).toFixed(1)} fast ${this.bodyFast.toFixed(1)} peak ${this.bodyPeak.toFixed(1)} goneAgo ${((nowWallA - this.lastBodyGoneMs)/1000).toFixed(1)}s spacingOk ${dropSpacingOk} sinceDrop ${(sinceDrop/1000).toFixed(1)}s`);
@@ -2679,15 +2698,45 @@ export class Analyser {
       this.dropCand++; this.lastDropMs = nowWallA; this.lastDropRise = bodyRise;
       console.log(`[dropfire] wall ${this.wallNow()}${fireTag} rise ${bodyRise.toFixed(1)} fast ${this.bodyFast.toFixed(1)} peak ${this.bodyPeak.toFixed(1)} ceil ${this.bodyCeil.toFixed(1)} underPeak ${(this.bodyPeak - this.bodyFast).toFixed(1)} sinceDrop ${(sinceDrop/1000).toFixed(1)}s goneAgo ${((nowWallA - this.lastBodyGoneMs)/1000).toFixed(1)}s goneSpan ${(this.lastGoneSpanMs/1000).toFixed(1)}s edgeAgo ${(nowWallA - this.dropArmAt).toFixed(0)}ms`);
     }
-    this.dropClassify(flank, fireNow, nowWallA);
+    this.dropClassify(flank, fireNow, landing, nowWallA);
   }
 
-  /** EN DROPDETEKTOR - klassningen (a3): flanken är full drop (efter spärren), slam-kandidaten utan egen flank inom 2 s är minidrop. */
-  private dropClassify(flank: boolean, cand: boolean, nowWallA: number): void {
-    if (flank) {
+  /** EN DROPDETEKTOR - klassningen (a3, drop1 a8): FULL DROP = landningen vid toppen EFTER UPPBYGGNAD (tension >= TENSION_DROP, efter
+   *  spärren). Utan uppbyggnad är flanken och slam-kandidaten (utan egen flank inom 2 s) minidrop. En flank med spänning väntar på
+   *  landningen (basen kan komma mjukt först och slå till några sekunder senare); kommer ingen landning blev det inget drop. */
+  private dropClassify(flank: boolean, cand: boolean, landing: boolean, nowWallA: number): void {
+    const built = this.tension >= TENSION_DROP;
+    if (landing && built) {
+      if (DROP_TRACE) console.log(`[landning] full drop efter uppbyggnad: spänning ${this.tension.toFixed(1)}`);
+      this.tension = 0; this.landAt = nowWallA;   // landningen löser ut spänningen: nästa drop kräver ny uppbyggnad
       if (nowWallA - this.lastShowDropMs < SHOW_DROP_GAP_MS) { this.dropSpaced++; this.miniDropCount++; }
       else { this.lastShowDropMs = nowWallA; this.dropCount++; }
-    } else if (cand && nowWallA - this.fdAt > 2000) { this.dropDemoted++; this.miniDropCount++; }
+    } else if (nowWallA - this.landAt <= 2000) return;   // samma händelse som landningen
+    else if (flank) { if (!built) { this.dropSpaced++; this.miniDropCount++; } }
+    else if (cand && nowWallA - this.fdAt > 2000) { this.dropDemoted++; this.miniDropCount++; }
+  }
+
+  /** UPPBYGGNADENS SPÄNNING (se UP_*): de övre bandens rörelse medan basen är borta -> this.tension (dB x s). Per hop, inga
+   *  allokeringar: fem band, två medel var. */
+  private tensionStep(dt: number): void {
+    const gone = this.bodyCeil - BODY_GONE_DB, away = this.bodyEnv < gone && this.bodyFast < gone;
+    const was = this.bassAwayS; this.bassAwayS = away ? was + dt : 0;
+    const cold = this.upCold = this.lvlSmooth <= FLANK_SILENT_LV ? Math.min(UP_SETTLE_S, this.upCold + dt) : Math.max(0, this.upCold - dt);
+    if (cold >= UP_SETTLE_S) this.tension = 0;   // låtlucka
+    const settled = this.bassAwayS >= UP_SETTLE_S, anchor = cold > 0 || (settled && was < UP_SETTLE_S);
+    const F = this.upFast, S = this.upSlow, raw = this.bandDbRaw, aF = dt / UP_FAST_S, aS = dt / UP_SLOW_S;
+    let top = S[0]; for (let b = 1; b < 5; b++) if (S[b] > top) top = S[b];
+    const quiet = top - UP_QUIET_DB; let mv = 0;
+    for (let b = 0; b < 5; b++) {
+      const x = raw[b + 3] > -70 ? raw[b + 3] : -70;   // -70 dB = analysatorns eget golv (bandDb)
+      const f = F[b] += (x - F[b]) * aF;
+      const s = anchor ? (S[b] = f) : (S[b] += (x - S[b]) * aS);
+      if (f < quiet && s < quiet) continue;
+      const d = f > s ? f - s : s - f; mv += d < UP_CLIP_DB ? d : UP_CLIP_DB;
+    }
+    mv /= 5;
+    if (settled && cold === 0 && mv > UP_STILL_DB) this.tension += (mv - UP_STILL_DB) * dt;
+    this.tension -= this.tension * dt / TENSION_TAU_S;
   }
 
   /** FULL DROP PÅ FLANKEN (se FLANK_GONE_DB): på dropStep:s egna filter (bodyFast/bodyEnv/bodyCeil), per hop. */
@@ -2737,35 +2786,11 @@ export class Analyser {
     }
   }
 
-  /** Uppbyggnad/riser (spektral novelty + klang/niva). Returnerar inRiser och uppdaterar buildUp. */
+  /** Uppbyggnad: basen är borta och de övre banden rör sig (tension, se UP_*) - relativt låtens egna nivåer (förr spektral novelty
+   *  bakom absoluta nivågränser 0,3/0,4: död på rent ljud, buildUp max 0,00 i ladan 11-13). Returnerar inRiser, uppdaterar buildUp. */
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
+    const inRiser = this.activeMs > 2500 && this.bodyUnderDb > BODY_GONE_DB && this.tension >= TENSION_BUILD;
     const bTarget = inRiser ? 1 : 0;
     const bRate = bTarget > this.buildUp ? dtHop / 3.5 : dtHop / 1.0;   // bygg ~3.5s, klinga ~1s
     this.buildUp += Math.max(-bRate, Math.min(bRate, bTarget - this.buildUp));
```
