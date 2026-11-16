# a4 – FRASENS FÖRVÄNTAN (prior på frasperioden)

## Idén
Sektionsföljaren räknar takter sedan sektionens (frasjusterade) start och har lättare att byta när 8, 16, 24 eller 32 takter har gått (färre block krävs, ingen dwell). Mellan frasgränserna har den svårare (ett block extra). Ett byte som accepteras på frasen får sin start bakåtdaterad till frasgränsen. Då vet dirigenten att delen redan är gammal, väntar inte sina 2 s och lägger bytet på nästa etta (SWITCH_ON 4), eftersom en frasgräns alltid ligger på ettan.

## Var fördröjningen satt (bas, i slag, Beat This, 3 övningsfiler)
- Detektorn: medel 8,1 slag till första sektionsändringen (16 = missad, alla vers->vers-gränser missas av etiketterna).
- Dirigenten: ovanpå det median 4,5 slag mellan sektionsändring och lookbyte (SECTION_UNIT_MIN_MS 2 s + slaget).
- a4: detektorn 7,7 slag, dirigenten median 2,7 slag (där ingår väntan på ettan). Sektionsbyten som ligger på ettan: 15 -> 36 %.

## Delarna
| del | vad den gör | mått den bär |
|---|---|---|
| A frasprior (analyserSection.ts: phAt, runNeed, dwellOk) | fönster [-0,5, +1,5] takter kring start + k·8 takter: runNeed - 2 (5->3, 3->1) och dwell släpps; utanför fönstret runNeed + 1 | detektorns lag 8,1 -> 7,7; lösa byten hålls (1,14 -> 1,21). Med 4-taktsgaller och lättnad 3 (sond 151659): lösa 1,39 -> 1,97, för slappt |
| B bakåtdaterad start (t0) | på frasen: start = frasgränsen; annars nu minus körningens längd (1 s vid kant/drop) | dirigentens 2 s-väntan försvinner (median 4,5 -> 2,7 med C) |
| C SWITCH_ON 1 -> 4 (effects.ts) | sektionens lookbyte väntar in taktklockans etta, högst 5 slag | etta 17,7 -> 33,7 % (cirka +8 poäng). Bär det mesta av poängen |
| D sett sektionsbyte (effects.ts secSeen) | snappet, sectionEntry, ctx.sectionAgeMs och ctx.sectionBars räknas från när dirigenten SÅG bytet, inte från den bakåtdaterade starten | ljus -5,7 (m1, utan D) -> -0,9 (m2). Krävs om B används |

## Diffen
```diff
diff --git a/src/ANALYSER_SHARED.md5 b/.arena/fras/a4/src/ANALYSER_SHARED.md5
index f6ba712..df06796 100644
--- a/src/ANALYSER_SHARED.md5
+++ b/.arena/fras/a4/src/ANALYSER_SHARED.md5
@@ -1,7 +1,7 @@
 # md5 (CRLF->LF) av de gemensamma filerna - samma i lotus-light-link och dmx-control. Skrivs av analyser_shared.py --write
 1e5942108e88af6bfe857ef56a7429b8 analyser.ts
 b5485714f88c45ec0f55f21b9d5ab20e analyserDrop.ts
-692befa55e7fd906cdc3652af3f27baa analyserSection.ts
+129670d91117e9125359d8237c57290c analyserSection.ts
 879ba2122d2a1d3e0eea4082adfd2355 analyserSpectrum.ts
 e92d0d6b4f8dc36abfb8135004260806 analyserLevel.ts
 3b5c715739b3ce3b8668a3a2f0576a6a analyserKick.ts
diff --git a/src/analyserSection.ts b/.arena/fras/a4/src/analyserSection.ts
index d86d2b9..3fa82ee 100644
--- a/src/analyserSection.ts
+++ b/.arena/fras/a4/src/analyserSection.ts
@@ -14,6 +14,7 @@ export class SectionTracker {
 
   private static readonly PREDICT_LAT = 4;   // Frasregel
   private static readonly PREDICT_RISE = 4;
+  private static readonly PHRASE_BARS = 8; private static readonly PHRASE_EASE = 2;
 
   private static readonly RANK_HI = 0.67;
   private static readonly RANK_LO = 0.33;
@@ -117,7 +118,11 @@ export class SectionTracker {
       } else { tier = 1; this.secPct = 0; }
     }
     if (tier === this.secTierCand) this.secTierRun++; else { this.secTierCand = tier; this.secTierRun = 1; }
-    const runNeed = (Analyser.RANK_RUN_IN > 0 && this.secTierCand === 2 && this.a.sectionTier < 2) ? Analyser.RANK_RUN_IN : Analyser.RANK_RUN;
+    let phAt = 0;   // FRASENS FÖRVÄNTAN
+    { const bar = this.a.localBpm > 40 ? 240000 / this.a.localBpm : 0, s0 = this.a.sectionStartMs;
+      if (bar > 0 && s0 > 0) { const P = SectionTracker.PHRASE_BARS * bar, k = Math.round((nowMs - s0 - 0.5 * bar) / P), d = (nowMs - s0 - k * P) / bar; if (k >= 1 && d >= -0.5 && d <= 1.5) phAt = s0 + k * P; } }
+    let runNeed = (Analyser.RANK_RUN_IN > 0 && this.secTierCand === 2 && this.a.sectionTier < 2) ? Analyser.RANK_RUN_IN : Analyser.RANK_RUN;
+    runNeed = phAt > 0 ? Math.max(1, runNeed - SectionTracker.PHRASE_EASE) : runNeed + 1;
     if (this.secTierRun >= runNeed) this.a.sectionTier = this.secTierCand;
     let edgeUp = false, edgeDown = false, fallen = false;
     {
@@ -167,14 +172,15 @@ export class SectionTracker {
       label = prev === 'break' ? 'break' : 'build'; this.a.sectionTier = 1;
     }
     const dwellMs = label === 'high' ? 4000 : 8000;
-    const dwellOk = nowMs - this.a.sectionStartMs >= dwellMs || (prev === 'high' && label === 'break') || (Analyser.BODY_HIGH_MS > 0 && dropped && label === 'high') || edgeUp || edgeDown;
+    const dwellOk = nowMs - this.a.sectionStartMs >= dwellMs || (prev === 'high' && label === 'break') || (Analyser.BODY_HIGH_MS > 0 && dropped && label === 'high') || edgeUp || edgeDown || phAt > 0;
     if (label !== prev && dwellOk) {
       const dbMean = this.secCurDbN ? this.secCurDbSum / this.secCurDbN : blkDb;
-      this.secLog.push({ label: prev, startMs: this.a.sectionStartMs, endMs: nowMs, db: dbMean, dens: this.secCurDbN ? this.secCurDens / this.secCurDbN : 0 });
+      const t0 = Math.min(nowMs, phAt > 0 ? phAt : Math.max(this.a.sectionStartMs + 1000, nowMs - 1000 * (edgeUp || edgeDown || dropped ? 1 : Math.max(1, Math.min(this.secTierRun, runNeed)))));
+      this.secLog.push({ label: prev, startMs: this.a.sectionStartMs, endMs: t0, db: dbMean, dens: this.secCurDbN ? this.secCurDens / this.secCurDbN : 0 });
       if (this.secLog.length > 48) this.secLog.shift();
       if (prev === 'high') { this.lastHighDb = dbMean; this.secHiEndMs = nowMs; }
       this.a.prevSection = prev; this.secCurDbSum = 0; this.secCurDbN = 0; this.secCurDens = 0;
-      this.a.sectionStartMs = nowMs; if (label === 'high') { this.a.sectionIndex++; this.secHiStartMs = nowMs; } this.a.section = label;
+      this.a.sectionStartMs = t0; if (label === 'high') { this.a.sectionIndex++; this.secHiStartMs = this.a.sectionStartMs; } this.a.section = label;
     }
     if (prev === 'build' || this.a.section === 'build') { if (this.a.section === 'build' && (this.a.secBuildAt === 0 || nowMs - this.a.secBuildSeen > 2000)) this.a.secBuildAt = nowMs; this.a.secBuildSeen = nowMs; }
     this.secCurDbSum += blkDb; this.secCurDbN++; this.secCurDens += bKicks;
diff --git a/src/effects.ts b/.arena/fras/a4/src/effects.ts
index ff4645c..b0e3f34 100644
--- a/src/effects.ts
+++ b/.arena/fras/a4/src/effects.ts
@@ -259,7 +259,7 @@ const MANUS_TOP = 2;
  *  SECTION_UNIT_MIN_MS gammal - phraseOk:s reserv (held > MIN_HOLD + en fras) är nästan alltid sann efter en hållen look, så bytet landade
  *  var som helst i takten (konsertReplay --slag). Med N väntar bytet (wantSwitch/buildEntry, inte drop/build-händelserna) in nästa
  *  taktklocka-tick med beatIdx % N = 0 (1 = nästa slag, 4 = ettan), högst N slag x 1,25. */
-const SWITCH_ON = 1;
+const SWITCH_ON = 4;
 /** HIGH-VARV (standard 2026-11-04, ägaren: 'pröva b'; megamix tryckvag 36 % = manusets återseende): när refrängen (high) kommer tillbaka
  *  för 4:e gången eller fler i samma låt får den NÄSTA look - minst spelad ur sektionens manusHist, annars ny ur poolen - i stället för
  *  manusets. 1:a-3:e gången oförändrade (refrängen känns igen). Drop-bytet orört. natt --snabb: mega tryckvag 36 -> 21 %, lampspr 83 -> 88,
@@ -575,6 +575,7 @@ export class EffectEngine {
   private dropEnv = 0;           // drop-envelope: full attack → håll → mjuk fade
   private dropColEnv = 0;        // BARA full drop: dropfarg + vit karna (minidrop/nastan-drop lyfter bara ljusstyrkan)
   private lastLiveSection = '';   // DMX_SECTION_SWITCH
+  private secSeen = ''; private secSeenAt = 0;   // FRASENS FÖRVÄNTAN: sektionsbytet sett (sectionStartMs kan ligga bakåt på frasen)
   dropCalmDenied = 0; dropFalse = 0; private dropCheckAt = 0; private preDropLevel = 0; private preDropTier = 0;
   private eSm = 0; eSimple = 0; private eBass = 0; private bLo = 0; private bPart = 1; private eHi = NaN; private eLo = NaN; private fxPeak = 0; private fxPeakNow = 0; private fxNorm = 1; private spreadM0 = new Float64Array(64);   // ENERGIN (se E_WIN_S); spreadM0 = BASGANG
   private trebleEnv = 0; private airEnv = 0; private punchEnv = 0; private belowSince = 0;   // glitter-enveloper (ctx.trebleEnv/airEnv)
@@ -991,7 +992,8 @@ export class EffectEngine {
       // SEKTIONEN AR BEVISET (DMX_SECTION_SWITCH, 2026-09-21): analysatorns 'high' = topp-tredjedelen av latens EGEN energi
       // (rank-lage), sa vid en high-grans vet dirigenten redan att refrangen ar har - gasa direkt (som vid drop), vanta inte
       // pa 5 s-medelvardet + hallstid. 'break'/'low' vid gransen: slapp ner direkt (musiken slapper -> showen foljer).
-      if ((frame.sectionAgeMs ?? 1e9) < 1500) {
+      if (frame.section !== this.secSeen) { this.secSeen = frame.section; this.secSeenAt = nowWall; }
+      if (nowWall - this.secSeenAt < 1500) {
         // KRASEN (ladan 19:55: 'gasade pa i lugnt parti'): bara nar analysatorns egen energitier ocksa sager topp (sectionTier 2).
         if ((frame.section === 'high' && (frame.sectionTier ?? 0) >= 2) && this.tierEma < SECTION_HIGH_SNAP) this.tierEma = SECTION_HIGH_SNAP;
         else if ((frame.section === 'break' || frame.section === 'low') && this.tierEma > SECTION_LOW_SNAP) this.tierEma = SECTION_LOW_SNAP;
@@ -1917,8 +1919,9 @@ export class EffectEngine {
       this.rXw = this.xfFrom ? (nowWall - this.xfAt) / ms : 1; }
     const ctx = this.ctx;
     ctx.cfg = this.cfg; ctx.frame = frame; ctx.t = t; ctx.count = count;
-    ctx.section = frame.section || 'intro'; ctx.sectionAgeMs = frame.sectionAgeMs || 0; ctx.sectionIndex = frame.sectionIndex || 0;
-    ctx.sectionEntry = Math.max(0, 1 - (frame.sectionAgeMs || 1e9) / 400); ctx.sectionTier = frame.sectionTier ?? 1; ctx.expectHighInMs = frame.expectHighInMs ?? -1; ctx.levelVsHighDb = frame.levelVsHighDb ?? 0; ctx.repeatSim = frame.repeatSim || 0;
+    if (frame.section !== this.secSeen) { this.secSeen = frame.section; this.secSeenAt = this.rNowWall; }
+    ctx.section = frame.section || 'intro'; ctx.sectionAgeMs = this.rNowWall - this.secSeenAt; ctx.sectionIndex = frame.sectionIndex || 0;
+    ctx.sectionEntry = Math.max(0, 1 - (this.rNowWall - this.secSeenAt) / 400); ctx.sectionTier = frame.sectionTier ?? 1; ctx.expectHighInMs = frame.expectHighInMs ?? -1; ctx.levelVsHighDb = frame.levelVsHighDb ?? 0; ctx.repeatSim = frame.repeatSim || 0;
     // PUNCH MED AVKLINGNING (2026-10-10): bassPunch spikade ruta for ruta och gav fladder rakt in i ljuset (chase 39 -> 4 utan den).
     // Upp direkt, ~120 ms avklingning - dunken behaller sin skarpa uppgang men blir EN puls i stallet for ett flimmer.
     this.punchEnv = Math.max(bassPunch, this.punchEnv * Math.exp(-dtSec / 0.12));
@@ -1951,7 +1954,7 @@ export class EffectEngine {
     { const bo = frame.onset?.bass ?? 0;
       if (bo >= 0.30 && bo - this.prevBassOnset >= 0.10 && now - this.lastBassNoteMs >= 90) { this.bassNoteIdx++; this.lastBassNoteMs = now; }
       this.prevBassOnset = bo; }
-    ctx.sectionBars = frame.sectionBars ?? 0; ctx.bassline = frame.profile?.bassline ?? 0;
+    ctx.sectionBars = (frame.bpm ?? 0) > 0 ? (this.rNowWall - this.secSeenAt) * frame.bpm / 240000 : 0; ctx.bassline = frame.profile?.bassline ?? 0;
     ctx.bassNoteIdx = this.bassNoteIdx; ctx.bassNoteAge = Math.min(9, (now - this.lastBassNoteMs) / 1000);
     ctx.want.strobe = undefined; ctx.want.blinder = undefined;
     ctx.want.uv = undefined; ctx.want.laser = undefined; ctx.want.fog = undefined;
```

## Siffrorna (m2 = leveransen; m1 gav samma frasmått)
| fil | gräns % | lag slag | etta % | lösa /min | byten /min |
|---|---|---|---|---|---|
| bas medel | 12,7 | 10,0 | 17,7 | 1,14 | 3,52 |
| a4 medel | 14,9 | 9,2 | 33,7 | 1,21 | 3,67 |
| 151659 | 6,7 (bas 3,3) | 10,6 (11,6) | 34,4 (7,1) | 1,6 (1,4) | 3,7 |
| 171840 | 9,1 (9,1) | 9,5 (10,0) | 25,0 (25,0) | 0,8 (1,05) | 3,4 |
| 193040 | 29,0 (25,8) | 7,4 (8,4) | 41,7 (20,8) | 1,1 (0,98) | 3,9 |

Poäng **+11,43**, ljusdomaren **-0,9** (takt -3,6, dynamik -2,1, koreografi +2,2, lampspr +18,8/-9,9/+1,9 %). Ingen spärr bröts. Sämre: ljusets takt -3,6 %, lösa byten +0,07/min, och på 151659 +0,2/min.

## Risken
- Fasen i frasgallret är bara så bra som det första ankaret. Missar detektorn en gräns, eller tar den en falsk gräns utanför fönstret, så flyttas gallret och nästa fras blir svårare (+1 block) i stället för lättare.
- Tempofel eller oktavfel (localBpm) skalar gallret fel. Vid ett låtbyte kan det gamla gallret leva kvar tills första sektionsändringen.
- Långa uppbyggnader och breaks: dwellen släpps på frasfönstret, så high->break->high kan flippa på en fras (lösa 1,6/min på 151659).
- SWITCH_ON 4 föll två gånger tidigare med den gamla ettan. Här håller ljuset (-0,9), men en felvald etta live ger upp till 5 slags väntan.
- Workern: sectionStartMs bärs redan i tillståndsblocket (S_SEC_START), så inget nytt fält och ingen allokering. Lotus delar analysatorn och får också den bakåtdaterade starten (sectionAgeMs/sectionBars skiftar 1-3 s) och frasprioren. Lotus konsumenter av sectionAgeMs bör kollas innan porten.
