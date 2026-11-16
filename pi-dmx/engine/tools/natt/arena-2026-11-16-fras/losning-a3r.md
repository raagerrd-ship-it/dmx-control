# a3r (runda 2): r0 + den daterade gränsen släpper uppslukningen

**IDÉN.** Lookbytet kommer som i r0: på analysatorns nästa etta, eller direkt när basen landar efter en lucka. Nytt är att uppslukningen efter en landning bara sväljer detektorns sena eko av samma del. Ett sektionsbeslut mot en ANNAN sektion än landningens, vars daterade gräns (`sectionBackMs`, a3) ligger mer än 1 s efter landningen, är en ny del. Det byter då på ettan, med sektionens egen manuslook.

**MÄTT FÖRST (r0:s json, fri analys).** 17 landningar svalde 19 sektionsbeslut. 9 låg 0-3,6 slag efter en ägargräns. 4 av dem var eko av en gräns som landningen redan träffat, men **5 ägargränser blev helt utan byte (lag 16)**: 151659 226,00 intro, 256,42 refräng, 332,62 break, 385,36 intro och 193040 350,00 vers. Med regeln släpps exakt de fem. Ekona (dateras före landningen eller går tillbaka in i landningens sektion) sväljs fortfarande, även flappen low->high 220,19 och 293,47, som skulle ha blivit lösa byten.

**VAR FÖRDRÖJNINGEN SITTER NU.** De släppta besluten kommer 0-3,6 slag efter gränsen. 332,62 och 385,36 väntar sedan 4 s i LUCKAN (uppbyggnadssignalen) plus ettan, och hamnar på 15,9 resp. 9,6 slag. Den spärren rörde jag inte (dropvägen).

**DELARNA**
| del | vad den gör | mått |
|---|---|---|
| D2 daterad gräns (a3: analyserSection.ts datedBack, analyser.ts/split.ts S_SEC_BACK, md5) | analysatorn säger hur långt bakåt skiftet började | används bara av D5 |
| D5 släppt uppslukning (effects.ts `landEcho`, `landAt`/`landSec`) | sväljer inte ett beslut mot en annan sektion än landningens, daterat > 1 s efter landningen (back > 0, så låtbyten sväljs som förr) | lag 8,48 -> 7,99, gräns 22,7 -> 23,8 (350,00 träffad), lösa +0,11, byten +0,32 |
| (b) etta närmast fraslaget från daterad gräns | EJ inlagd: daterad gräns ligger median 4,1 slag från närmaste ägargräns (19 % inom 1 slag), mot 3,5 slag för själva beslutet. 1 s-block är grövre än träffönstret. Utan extra lag blir det samma etta som SWITCH_ON 4 redan väljer | - |

**SIFFRORNA** (m1 = levererad, 1 mätning)
| | poäng | gräns | lag | etta | lösa | byten | ljus |
|---|---|---|---|---|---|---|---|
| r0 | +24,21 | 22,7 | 8,48 | 41,7 | 0,98 | 3,39 | +1,5 |
| a3r | **+26,75** | 23,8 | 7,99 | 43,1 | 1,09 | 3,71 | **+1,9** |

Per fil (gräns/lag/etta/lösa/byten): 151659 30,0/8,0/59,4/1,3/3,7 · 171840 9,1/8,9/20,0/0,8/3,2 (orörd, inga landningar) · 193040 32,3/7,1/50,0/1,1/4,3.
Sämre: lösa +0,11/min och byten +0,32/min (193040: släppt high->low 307,04 utan ägargräns -> 310,6. Därför blev minidropen 316,2 ett drop-byte i stället för en landning och tog inte uppslukningen, så 322,19 gav ett löst byte 325,6). Långt under spärrarna.

**RISKEN.** Dateringen är grov (1 s-block, 2000 ms vanligast), så marginalen 1 s avgör nära landningen. Live-mic flyttar landningen, och då kan ett eko daterat strax efter släppas (ett extra byte, MIN_HOLD 8 s är taket). Fältet bärs i tillståndsblocket (STATE_LEN 26 -> 27), så fast- och slow-sidan måste deployas ihop, och lotus måste porta analyser.ts/analyserSection.ts/split.ts (läser inte fältet). Ingen allokering per hop. Låtbyten: back = 0, oförändrat mot r0.

## DIFFEN (`git diff --no-index src .arena/fras/a3r/src`)
```diff
diff --git a/src/ANALYSER_SHARED.md5 b/.arena/fras/a3r/src/ANALYSER_SHARED.md5
index f6ba712..aa86961 100644
--- a/src/ANALYSER_SHARED.md5
+++ b/.arena/fras/a3r/src/ANALYSER_SHARED.md5
@@ -1,14 +1,14 @@
 # md5 (CRLF->LF) av de gemensamma filerna - samma i lotus-light-link och dmx-control. Skrivs av analyser_shared.py --write
-1e5942108e88af6bfe857ef56a7429b8 analyser.ts
+1ebc638f87074a1ceeed20767338c681 analyser.ts
 b5485714f88c45ec0f55f21b9d5ab20e analyserDrop.ts
-692befa55e7fd906cdc3652af3f27baa analyserSection.ts
+aff8e5bbcabecbfdcb325146f96c1985 analyserSection.ts
 879ba2122d2a1d3e0eea4082adfd2355 analyserSpectrum.ts
 e92d0d6b4f8dc36abfb8135004260806 analyserLevel.ts
 3b5c715739b3ce3b8668a3a2f0576a6a analyserKick.ts
 5df88304c8c1a18eb7d0ba60f20b0dba analyserRiser.ts
 9fce7e5efedd8fa4c773e2487da1c3e1 analyserBass.ts
 dbb860c7483c4e7e938d610712337b96 analyserCharacter.ts
-c091aa771b1d34b880f3e855fdaafd85 split.ts
+6121e666d25ccc24bcd5f0e5ee0e1361 split.ts
 c7a59a6760df39770f3aca2332dac5c2 slowWorker.ts
 3b3d27c56178c07dffba81f4b20417c5 analyserClock.ts
 d94c850c565827c9075e63127132213f recorder.ts
diff --git a/src/analyser.ts b/.arena/fras/a3r/src/analyser.ts
index 5dcd901..e00d98d 100644
--- a/src/analyser.ts
+++ b/.arena/fras/a3r/src/analyser.ts
@@ -8,7 +8,7 @@ import {
   packFlagCounts, lostFlags, seqLow, seqDelta, C_WAITING, C_STATE_SEQ, S_LOST_FLAGS,
   F_SIL350, F_SIL10, F_RESET_TEMPO, F_HINT, F_RESET_BAR, F_VCLOCK_SET, F_VCLOCK_NULL,
   C_WRITE, C_READ, S_REC_SEQ, S_BPM, S_CONF, S_BPMF, S_PHASE_MS, S_PHASE_CONF, S_SECTION, S_SEC_START, S_SEC_INDEX, S_SEC_TIER, S_BUILD_AT, S_BUILD_SEEN,
-  S_REP_SIM, S_REP_AGO, S_REP_SEC, S_EXPECT_MS, S_EXPECT_SRC, S_PREV_SEC, S_LVL_HIGH, S_PROCESSED, S_LAG_MS, S_LAG_MAX, S_BUSY_US, S_BUSY_MAX_US, S_SKIPPED, STATE_LEN,
+  S_REP_SIM, S_REP_AGO, S_REP_SEC, S_EXPECT_MS, S_EXPECT_SRC, S_PREV_SEC, S_LVL_HIGH, S_SEC_BACK, S_PROCESSED, S_LAG_MS, S_LAG_MAX, S_BUSY_US, S_BUSY_MAX_US, S_SKIPPED, STATE_LEN,
   SECTIONS, sectionCode, viewsOf, stateWrite, stateRead, createSplitBuffers, type SplitBuffers, type WorkerData,
   C_WAKE, syncWait, HopLaneFast, HopLaneSlow, StateReader, type HopFeed,
   R_BIGSEQ, R_CLOCK, R_CLOCK_CONF, BIG_REC_LEN, BIG_RING_N, BIG_HOP_MAX, B_SEQ, B_N, B_RMS, B_LVL, B_CENT, B_ACTIVE, B_WALL, B_KICK, B_KICKHIT, B_INT, B_BREAK, B_SEC, B_LVH, B_CONF,
@@ -126,7 +126,7 @@ export interface Frame {
   beatPhaseConf: number;   // Gridfasens on/half-kvot
   beatTrust: number;   // TILLITEN TILL TAKTEN 0..1
   section: string;   // SEKTION
-  sectionAgeMs: number;   // ms sedan sektionen borjade
+  sectionAgeMs: number; sectionBackMs: number;   // ms sedan sektionen borjade
   sectionIndex: number;   // antal 'high'-partier hittills i laten
   sectionTier: number;   // 0 lag / 1 mellan / 2 hog
   repeatSim: number; repeatAgoMs: number; repeatSection: string;   // UPPREPNING
@@ -152,7 +152,7 @@ export const BODY_CEIL_DB_S = 0.15;   // taket haller latens loud-referens lang
 const DOUBLE_FROM_START = [
   'expectHighMs', 'levelVsHighDb', 'sumSq', 'lastT', 'dbgRms', 'envAccum', 'envAccumT', 'envBassAccum', 'blAccum', 'lvlSmooth',
   'lvlVU', 'engSmooth', 'activeMs', 'buildUp', 'kickHit', 'snareHit', 'hatHit', 'pendingKickMs', 'kfPrev', 'kfPrev2',
-  'beatAnchorMs', 'profBassline', 'bassOnsetsPerBeat', 'rawBpmLast', 'localBpmConfidence', 'sectionStartMs', 'secBuildAt', 'secBuildSeen', 'repeatSim', 'repeatAgoMs',
+  'beatAnchorMs', 'profBassline', 'bassOnsetsPerBeat', 'rawBpmLast', 'localBpmConfidence', 'sectionStartMs', 'sectionBackMs', 'secBuildAt', 'secBuildSeen', 'repeatSim', 'repeatAgoMs',
 ] as const;   // Instansfalt som MATT
 /** TYPSTABILA TALFALT. */
 function stabiliseNumbers(o: object): void {
@@ -219,7 +219,7 @@ export class Analyser {
   secSpecHop = new Float64Array(8);   // Bandens absoluta magnitud for sektionsblocket
   secDump: number[][] | null = sysEnv('SECTION_DUMP') === '1' ? [] : null;   // Korbanks-dump
   secBuildAt = 0; secBuildSeen = 0;   // uppbyggnadens start och senast sedd
-  section = 'intro'; sectionStartMs = 0; sectionIndex = 0; sectionTier = 1; repeatSim = 0; repeatAgoMs = 0; repeatSection = '';
+  section = 'intro'; sectionStartMs = 0; sectionBackMs = 0; sectionIndex = 0; sectionTier = 1; repeatSim = 0; repeatAgoMs = 0; repeatSection = '';
   expectHighMs = 0; expectSource = 0; prevSection = ''; levelVsHighDb = 0;   // Sektionsminne
   static readonly REPEAT = Number(sysEnv('SECTION_REPEAT')) || 0;   // UPPREPNINGSMINNE v2
 
@@ -364,7 +364,7 @@ export class Analyser {
     if (!this.stateRd.read(this.splitCtrl!, this.splitState!, this.stateCopy)) return;
     const s = this.stateCopy; if (s[S_REC_SEQ] < this.barrierSeq) return;
     this.beatPhaseMs = s[S_PHASE_MS]; this.beatPhaseConf = s[S_PHASE_CONF];
-    this.section = SECTIONS[s[S_SECTION]] || 'intro'; this.sectionStartMs = s[S_SEC_START]; this.sectionIndex = s[S_SEC_INDEX]; this.sectionTier = s[S_SEC_TIER]; this.secBuildAt = s[S_BUILD_AT]; this.secBuildSeen = s[S_BUILD_SEEN];
+    this.section = SECTIONS[s[S_SECTION]] || 'intro'; this.sectionStartMs = s[S_SEC_START]; this.sectionBackMs = s[S_SEC_BACK]; this.sectionIndex = s[S_SEC_INDEX]; this.sectionTier = s[S_SEC_TIER]; this.secBuildAt = s[S_BUILD_AT]; this.secBuildSeen = s[S_BUILD_SEEN];
     this.repeatSim = s[S_REP_SIM]; this.repeatAgoMs = s[S_REP_AGO]; this.repeatSection = SECTIONS[s[S_REP_SEC]] || '';
     this.expectHighMs = s[S_EXPECT_MS]; this.expectSource = s[S_EXPECT_SRC]; this.prevSection = SECTIONS[s[S_PREV_SEC]] || ''; this.levelVsHighDb = s[S_LVL_HIGH];
   }
@@ -414,7 +414,7 @@ export class Analyser {
       stateWrite(ctrl, this.splitState!, (s) => {
         s[S_REC_SEQ] = this.recSeq; s[S_BPM] = this.localBpm; s[S_CONF] = this.localBpmConfidence; s[S_BPMF] = this.localBpmF;
         s[S_PHASE_MS] = this.beatPhaseMs; s[S_PHASE_CONF] = this.beatPhaseConf;
-        s[S_SECTION] = sectionCode(this.section); s[S_SEC_START] = this.sectionStartMs; s[S_SEC_INDEX] = this.sectionIndex; s[S_SEC_TIER] = this.sectionTier; s[S_BUILD_AT] = this.secBuildAt; s[S_BUILD_SEEN] = this.secBuildSeen;
+        s[S_SECTION] = sectionCode(this.section); s[S_SEC_START] = this.sectionStartMs; s[S_SEC_BACK] = this.sectionBackMs; s[S_SEC_INDEX] = this.sectionIndex; s[S_SEC_TIER] = this.sectionTier; s[S_BUILD_AT] = this.secBuildAt; s[S_BUILD_SEEN] = this.secBuildSeen;
         s[S_REP_SIM] = this.repeatSim; s[S_REP_AGO] = this.repeatAgoMs; s[S_REP_SEC] = sectionCode(this.repeatSection);
         s[S_EXPECT_MS] = this.expectHighMs; s[S_EXPECT_SRC] = this.expectSource; s[S_PREV_SEC] = sectionCode(this.prevSection); s[S_LVL_HIGH] = this.levelVsHighDb;
         s[S_PROCESSED] = this.slowProcessed; s[S_LAG_MS] = lagMs; s[S_LAG_MAX] = this.slowLagMaxMs; s[S_BUSY_US] = this.slowBusyEmaUs; s[S_BUSY_MAX_US] = this.slowBusyMaxUs; s[S_SKIPPED] = this.slowSkipped; s[S_LOST_FLAGS] = this.slowLostFlags;
@@ -735,7 +735,7 @@ export class Analyser {
       silent: true, level: 0, levelRaw: 0, levelVU: 0, energy: 0, centroid: 0, flux: 0,
       kick: false, gain: 1, bpm: 0, bpmConfidence: 0, intensity: 0.5,
       dropCount: 0, miniDropCount: 0, buildStartCount: 0, dropDemoted: 0, dropSpaced: 0, dropRiseDb: 0, nearDropDb: 0, nearDipDb: 0, liftDb: 0, stopCount: 0, stopS: 0, bodyDb: 0, bassEnergy: 0, bassEnergyShort: 0, bassLevel: 1, midHiDb: -120, inZone: false, breaking: false, buildUp: 0, buildProg: 0, inRiser: false, profile: this.character.outProfile, beatAnchorMs: 0,
-      kickAtMs: 0, barShift: -1, beatPhaseMs: 0, beatPhaseConf: 0, beatTrust: 0, section: 'intro', sectionAgeMs: 0, sectionIndex: 0, sectionTier: 1, repeatSim: 0, repeatAgoMs: 0, repeatSection: '', expectHighInMs: -1, prevSection: '', levelVsHighDb: 0, sectionBars: 0,
+      kickAtMs: 0, barShift: -1, beatPhaseMs: 0, beatPhaseConf: 0, beatTrust: 0, section: 'intro', sectionAgeMs: 0, sectionBackMs: 0, sectionIndex: 0, sectionTier: 1, repeatSim: 0, repeatAgoMs: 0, repeatSection: '', expectHighInMs: -1, prevSection: '', levelVsHighDb: 0, sectionBars: 0,
       spec: this.outSpec, specAbs: this.outSpecAbs, onset: this.outOnset, drum: this.outDrum,
     };
     for (const o of [this.outFrame, this.character.outProfile, this.outSpec, this.outSpecAbs, this.outOnset, this.outDrum]) stabiliseNumbers(o);
@@ -955,7 +955,7 @@ export class Analyser {
     this.sections.sectionAggStep();
     const nowS = SECTION_AGG_HOP ? this.wallNow() : nowWallA;
     f.buildProg = this.secBuildAt > 0 && nowS - this.secBuildSeen <= 2000 ? Math.min(1, (nowS - this.secBuildAt) / (32 * (this.localBpm > 0 ? 60000 / this.localBpm : Analyser.BE_FALLBACK_MS))) : 0;
-    f.section = this.section; f.sectionAgeMs = this.sectionStartMs > 0 ? nowS - this.sectionStartMs : 0; f.sectionIndex = this.sectionIndex; f.sectionTier = this.sectionTier;
+    f.section = this.section; f.sectionAgeMs = this.sectionStartMs > 0 ? nowS - this.sectionStartMs : 0; f.sectionBackMs = this.sectionBackMs; f.sectionIndex = this.sectionIndex; f.sectionTier = this.sectionTier;
     f.repeatSim = this.repeatSim; f.repeatAgoMs = this.repeatAgoMs; f.repeatSection = this.repeatSection;
     f.expectHighInMs = this.section === 'high' ? 0 : this.expectHighMs > 0 ? Math.max(0, this.expectHighMs - nowS) : -1;
     f.prevSection = this.prevSection; f.levelVsHighDb = this.levelVsHighDb;
diff --git a/src/analyserSection.ts b/.arena/fras/a3r/src/analyserSection.ts
index d86d2b9..d589d13 100644
--- a/src/analyserSection.ts
+++ b/.arena/fras/a3r/src/analyserSection.ts
@@ -69,7 +69,7 @@ export class SectionTracker {
   private secDropsNow(): number { return this.a.role === 'slow' && this.a.bigOn ? this.secVDrops : this.a.drop.dropCand + this.a.drop.secBodyRet; }
   sectionReset(): void {
     this.a.secBuildAt = 0; this.a.secBuildSeen = 0;
-    this.a.section = 'intro'; this.a.sectionStartMs = 0; this.a.sectionIndex = 0; this.a.sectionTier = 1; this.a.repeatSim = 0; this.a.repeatAgoMs = 0; this.a.repeatSection = '';
+    this.a.section = 'intro'; this.a.sectionStartMs = 0; this.a.sectionBackMs = 0; this.a.sectionIndex = 0; this.a.sectionTier = 1; this.a.repeatSim = 0; this.a.repeatAgoMs = 0; this.a.repeatSection = '';
     this.secBlkMs = 0; this.secBlkN = 0; this.secBlkInt = 0; this.secBlkKicks = 0; this.secBlkCent = 0; this.secBlkSpec.fill(0);
     this.secBlkBon = 0; this.secBlkBpk = 0; this.secBlkFlux = 0; this.secBlkRms4 = 0; const H = this.secBlkH; H.bon.length = 0; H.bpk.length = 0; H.high.length = 0; H.flat.length = 0; H.flux.length = 0; H.dyn.length = 0;
     this.secTierRun = 0; this.secTierCand = 1; this.secRiseRun = 0; this.secSongStartMs = 0; this.secBlkRms2 = 0; this.secBlkDb.length = 0; this.secBlkDens.length = 0; this.secBlkCentH.length = 0; this.secDropSeen = this.secDropsNow(); this.secSilentBlocks = 0; this.secDropHoldUntil = 0;
@@ -174,7 +174,7 @@ export class SectionTracker {
       if (this.secLog.length > 48) this.secLog.shift();
       if (prev === 'high') { this.lastHighDb = dbMean; this.secHiEndMs = nowMs; }
       this.a.prevSection = prev; this.secCurDbSum = 0; this.secCurDbN = 0; this.secCurDens = 0;
-      this.a.sectionStartMs = nowMs; if (label === 'high') { this.a.sectionIndex++; this.secHiStartMs = nowMs; } this.a.section = label;
+      this.a.sectionBackMs = this.datedBack(nowMs, edgeDown ? 2 : edgeUp || dropped ? 1 : 0); this.a.sectionStartMs = nowMs; if (label === 'high') { this.a.sectionIndex++; this.secHiStartMs = nowMs; } this.a.section = label;
     }
     if (prev === 'build' || this.a.section === 'build') { if (this.a.section === 'build' && (this.a.secBuildAt === 0 || nowMs - this.a.secBuildSeen > 2000)) this.a.secBuildAt = nowMs; this.a.secBuildSeen = nowMs; }
     this.secCurDbSum += blkDb; this.secCurDbN++; this.secCurDens += bKicks;
@@ -205,6 +205,20 @@ export class SectionTracker {
     this.secBlkMs = 0; this.secBlkN = 0; this.secBlkInt = 0; this.secBlkKicks = 0; this.secBlkCent = 0; this.secBlkSpec.fill(0); this.secBlkRms2 = 0; this.secBlkBon = 0; this.secBlkBpk = 0; this.secBlkFlux = 0; this.secBlkRms4 = 0;
   }
 
+  /** DATERAD GRANS. */
+  private static readonly DATE_MAX = 12; private static readonly DATE_REF = 8;
+  private datedBack(nowMs: number, quick: number): number {
+    const D = this.secBlkDb, nb = D.length, S = this.secScoreBuf, z = nb >= 20;
+    const K = Math.min(quick ? quick + 1 : SectionTracker.DATE_MAX, Math.floor((nowMs - this.a.sectionStartMs) / 1000), nb - 2);
+    const k0 = Math.max(1, Math.min(quick || Analyser.RANK_RUN, K)); let best = -1, bk = k0;
+    for (let k = k0; k <= K; k++) {
+      const M = Math.min(SectionTracker.DATE_REF, nb - k); if (M < 2) break;
+      let a = 0, b = 0; for (let i = nb - k; i < nb; i++) a += z ? S[i] : D[i]; for (let i = nb - k - M; i < nb - k; i++) b += z ? S[i] : D[i];
+      const t = Math.abs(a / k - b / M) * Math.sqrt(k * M / (k + M)); if (t > best) { best = t; bk = k; }
+    }
+    return bk * 1000;
+  }
+
   /** RANGBERÄKNINGEN. */
   private rankTier(nb: number): number {
     const D = this.secBlkDb, K = this.secBlkDens, C = this.secBlkCentH, wk = SectionTracker.RANK_W_DENS, wc = SectionTracker.RANK_W_CENT;
diff --git a/src/effects.ts b/.arena/fras/a3r/src/effects.ts
index ff4645c..6e134e6 100644
--- a/src/effects.ts
+++ b/.arena/fras/a3r/src/effects.ts
@@ -259,7 +259,7 @@ const MANUS_TOP = 2;
  *  SECTION_UNIT_MIN_MS gammal - phraseOk:s reserv (held > MIN_HOLD + en fras) är nästan alltid sann efter en hållen look, så bytet landade
  *  var som helst i takten (konsertReplay --slag). Med N väntar bytet (wantSwitch/buildEntry, inte drop/build-händelserna) in nästa
  *  taktklocka-tick med beatIdx % N = 0 (1 = nästa slag, 4 = ettan), högst N slag x 1,25. */
-const SWITCH_ON = 1;
+const SWITCH_ON = 4;   // fras r0: ettan
 /** HIGH-VARV (standard 2026-11-04, ägaren: 'pröva b'; megamix tryckvag 36 % = manusets återseende): när refrängen (high) kommer tillbaka
  *  för 4:e gången eller fler i samma låt får den NÄSTA look - minst spelad ur sektionens manusHist, annars ny ur poolen - i stället för
  *  manusets. 1:a-3:e gången oförändrade (refrängen känns igen). Drop-bytet orört. natt --snabb: mega tryckvag 36 -> 21 %, lampspr 83 -> 88,
@@ -307,8 +307,8 @@ const PULSE_IDX_INIT = -2e9;
  *      detektorn da satt fast pa high; rotorsaken (ingen nollning vid latbyte) ar rattad 09-23. Sedan 10-12: LÅTMANUS. */
 /** SECTION_UNIT (ladan 16:45): forvarningens 'high' 600 ms fore en forutsedd refrang och drop-fonstrets 'high' raknas INTE som sektionsgrans
  *  (de gav high<->low-hopp pa 1-2 s nar refrangen uteblev). Bara den raa sektionen, och den maste vara minst DMX_SECTION_UNIT_MIN_MS gammal. */
+const LAND_HOLD_MS = 6000, LAND_ABSORB_MS = 24000;   // LANDNINGEN (a7): minsta hålltid före landningsbytet; sektionsbyten inom fönstret efter tas inte
 const GAP_HOLD_MS = 4000;   // I LUCKAN: spärren efter uppbyggnadssignalen släpper senast efter 4 s (signal -> landning median 1,8 s)
-const SECTION_UNIT_MIN_MS = 2000;   // 4000 -> 2000 (ladan 10-21: ny look 4-6 s efter sektionsbytet; replay 4,0 -> 2,0 s, korta looker 3 -> 2)
 /** LÅTMANUS (10-12 kväll, ägaren: "olika effekter hoppar hela tiden ... mer som att den är förprogrammerad" + "allt mer känns anpassat
  *  efter låten och som att de hänger ihop"). ERSÄTTER frasväxlingen (A/B-look var 8:e takt), basgångs-, karaktärs- och tempobytet,
  *  reservklockan och 'ny låt' på sektionen intro. Låten får ETT manus: första gången en sektionstyp (intro/low/build/high/break) kommer
@@ -566,6 +566,7 @@ export class EffectEngine {
   private lastDemoted = 0; private lastSpaced = 0; private lastStopCount = 0;   // analysatorns monotona räknare (a3: dropDemoted/dropSpaced/stopCount)
    private tickNow = false; private rNowP = 0; private rNowWall = 0; private rDt = 0; private rDtT = 0; private rBeatMs = 0; private rBeatEnv = 0; private rDTarget = 0; private rMd = 0; private rT = 0; private rAnchorHue = 0; private rDrive = 0; private rInputGate = 0;   // RUTANS TAL (se EN KLOCKA PER RUTA): fält i stället för argument - ett decimaltal som skickas till en metod packas in (GC-jakten 10-16)
   private anaDropAt = -1e12;   // analysatorns drop som blev minidrop (se REFRÄNGEN DIREKT EFTER EN MINIDROP-DROP)
+  private landForce = false; private landAbsorbUntil = -1; private landAt = -1; private landSec = '';   // LANDNINGEN (a7)
   private lastBuildStart = 0; private lastMiniSeen = 0; private gapUntil = -1;   // I LUCKAN (11-16): inget lookbyte från uppbyggnadssignalen tills basen är tillbaka
   private nearAt = -1e12; nearCount = 0;   // NASTAN-DROP
   private secCeil = 1; private histAt = -1e12; private rampLvl = 0; private levelRamp = 1; private buildLookAt = 0; buildProg = 0; buildUpgrades = 0;   // BUILD SOM HÅLLER OCH LANDAR
@@ -797,7 +798,7 @@ export class EffectEngine {
         const req = (m: Mode) => meetsRequirements(m, bpm, frame.profile);
         // LÅTMANUS: vilken del av manuset bytet galler. Builden (aven ALLA_LOOKER-builden) -> build; drop och build som slutar ->
         // refrangens look (dropen landar i refrangen); annars sektionen. Utan sektion (ingen analys an) finns inget manus.
-        const secKey = allaBuild && !(dropSwitch && liveSec !== 'break') ? 'build' : (dropSwitch || buildExit) && liveSec !== 'break' ? 'high' : liveSec;
+        const secKey = this.landForce ? liveSec : allaBuild && !(dropSwitch && liveSec !== 'break') ? 'build' : (dropSwitch || buildExit) && liveSec !== 'break' ? 'high' : liveSec;
         const calm = secKey === 'break';   // breakdown -> lugna poolen (var wantCalm)
         const tierRank = (m: Mode) => { const t = EFFECT_MAP.get(m)?.tier; return t === 'lugn' ? 0 : t === 'full' ? 2 : 1; };
         const tierNow = tierS === LUGN ? 0 : tierS === FART ? 1 : 2;
@@ -809,15 +810,15 @@ export class EffectEngine {
         if (secKey && this.carryKey && secKey !== this.carryKey) { this.manus.delete(this.carryKey); this.carryKey = ''; }   // burna looken släpps (softenRange)
         if (secKey && secKey !== this.visitKey) { varv = (this.secVisits.get(secKey) ?? 0) + 1; this.secVisits.set(secKey, varv); this.visitKey = secKey; }
         const nextLook = HIGH_VARV > 0 && secKey === 'high' && varv >= HIGH_VARV && !dropSwitch && !!kept;
-        let keep = !nextLook && !!kept && fits(kept) && !(dropSwitch && !this.bassStrong(kept));   // DROP_BASS_LOOK: refrängslooken bara om den är basstark
+        let keep = !nextLook && !!kept && fits(kept) && !(dropSwitch && !this.bassStrong(kept)) && !(this.landForce && (kept === this.smartMode || tierRank(kept) === 0));   // DROP_BASS_LOOK: refrängslooken bara om den är basstark; landningen byter alltid
         const avoid = nextLook ? kept : undefined;
         if (nextLook) { const h = (this.manusHist.get(secKey) ?? []).filter((m) => m !== kept && m !== this.smartMode && fits(m)); if (h.length) { kept = this.pickLook(h.map((m) => ({ m }))); keep = true; this.manus.set(secKey, kept); console.log(`[dirigent] high-varv ${varv}: nasta look "${kept}"`); } }
-        if (!keep && secKey && !(dropSwitch) && !nextLook) { const back = this.manusHist.get(secKey)?.find((m) => m !== kept && fits(m)); if (back) { kept = back; keep = true; this.manus.set(secKey, back); } }
+        if (!keep && secKey && !(dropSwitch) && !nextLook) { const back = this.manusHist.get(secKey)?.find((m) => m !== kept && fits(m) && !(this.landForce && (m === this.smartMode || tierRank(m) === 0))); if (back) { kept = back; keep = true; this.manus.set(secKey, back); } }
         if (keep && kept === this.smartMode) { this.pendingSecSwitch = false; if (allaBuild) this.buildEntered = true; }   // manuset sager samma look - inget byte
         else {
         this.lastSmartSwitchMs = now; this.pendingSecSwitch = false; if (allaBuild) this.buildEntered = true;
         // DIAGNOSTIK (se switchWhy): starkaste orsaken forst. 'dwell' sist = klockan var det enda skalet.
-        this.switchWhy = dropSwitch ? 'drop'
+        this.switchWhy = dropSwitch ? 'drop' : this.landForce ? 'landning'
           : (memSection || secEntry) ? 'sektion'
           : (buildEntry || allaBuild) ? 'build' : buildExit ? 'build-slut' : tierChanged ? 'tier' : 'dwell';
         this.switchCount++;
@@ -1064,10 +1065,10 @@ export class EffectEngine {
         // (FLANK_SHORT_S), sektionen gick high 0,7 s senare men lookbytet väntade in frasen till 17:48:20,2 = 'dropen blir sen'): går
         // sektionen in i high inom 2 s efter en sådan drop byts looken direkt, som vid en full drop (ingen MIN_HOLD/fras/slag-väntan).
         const dropEntry = liveSecChanged && liveSec === 'high' && nowWall - this.anaDropAt < 2000;
-        if (liveSec !== '' && liveSec !== this.lastLiveSection) { if (this.lastLiveSection !== '') console.log(`[dirigent] sektion ${this.lastLiveSection} -> ${liveSec} (nr ${frame.sectionIndex ?? 0}, tier ${frame.sectionTier ?? '-'})`); this.lastLiveSection = liveSec; }   // (intro glommer inte lookerna langre - LÅTMANUS glomms bara pa en verklig latgrans)
-        if (liveSecChanged) this.pendingSecSwitch = true;
-        const secOldEnough = (frame.sectionAgeMs ?? 1e9) >= SECTION_UNIT_MIN_MS;   // SECTION_UNIT: ingen switch pa en sektion yngre an SECTION_UNIT_MIN_MS (detektorflapp)
-        const memSection = liveSecChanged;   // (latminnets sektionsgrans mem* borttagen 11-09 - sattes aldrig)
+        if (liveSec !== '' && liveSec !== this.lastLiveSection) { if (this.lastLiveSection !== '') console.log(`[dirigent] sektion ${this.lastLiveSection} -> ${liveSec} (nr ${frame.sectionIndex ?? 0}, tier ${frame.sectionTier ?? '-'}, daterad ${frame.sectionBackMs ?? 0} ms)`); this.lastLiveSection = liveSec; }   // (intro glommer inte lookerna langre - LÅTMANUS glomms bara pa en verklig latgrans)
+        const landEcho = nowWall < this.landAbsorbUntil && !(liveSec !== this.landSec && (frame.sectionBackMs ?? 0) > 0 && nowWall - this.landAt > (frame.sectionAgeMs ?? 0) + (frame.sectionBackMs ?? 0) + 1000);   // LANDNINGEN: ny del daterad efter landningen sväljs inte
+        if (liveSecChanged) this.pendingSecSwitch = !landEcho;   // LANDNINGEN: detektorns sena byte efter landningen är redan gjort
+        const memSection = liveSecChanged && !landEcho;   // (latminnets sektionsgrans mem* borttagen 11-09 - sattes aldrig)
         const phraseMs = this.cfg.beat && this.cfg.beat.bpm > 0 ? 16 * 60000 / this.cfg.beat.bpm : 0;
         // LÅTMANUS: sektionsbytet landar på sektionens EGET taktraster (början av takt 2, 4, 6 ... sedan sektionsstart) i stället för
         // effektklockans 16-slagsfras, vars fas är godtycklig mot låten (bänken: bytet väntade upp till 24 s efter en hållen sektion).
@@ -1085,7 +1086,7 @@ export class EffectEngine {
         // LÅTMANUS: med sektioner byts looken bara pa sektionsgrans (+ build/drop nedan); fras, basgang, karaktar, tempo och
         // reservklockan byter inte langre. Utan sektion (ingen analys an) galler tier/halvering/dwell som forut.
         const wantSwitch = liveSec
-            ? ((memSection || this.pendingSecSwitch) && secOldEnough)
+            ? (memSection || this.pendingSecSwitch)
             : (tierChanged || memSection || now > this.smartDwellUntil);
 
         // STRUKTUR: analysatorn vet VAR i låten vi är — dirigenten ska lyssna på
@@ -1096,6 +1097,7 @@ export class EffectEngine {
         //    kvar genom hela risern — då landar bytet i stället PÅ dropen, vilket
         //    är det enda ögonblick där ett byte förstärker musiken.
         // I LUCKAN (11-16): spärren följer analysatorns uppbyggnadssignal (25 av ägarens 29, den gamla riser/build-regeln 0 av 29) och släpper på drop/minidrop
+        const landHit = frame.miniDropCount !== this.lastMiniSeen && !dropHit;   // LANDNINGEN (a7): basen tillbaka efter luckan = ny del, på ettan
         if (frame.buildStartCount !== this.lastBuildStart) { this.lastBuildStart = frame.buildStartCount; this.gapUntil = nowWall + GAP_HOLD_MS; }
         if (dropHit || frame.miniDropCount !== this.lastMiniSeen) this.gapUntil = -1;
         this.lastMiniSeen = frame.miniDropCount;
@@ -1127,8 +1129,8 @@ export class EffectEngine {
         //      hållen. Etiketten far darfor styra IDENTITET (samma look aterkommer)
         //      och NAR bytet sker (sektionsgransen), men inte hur starkt det lyser.
         const tierS = tier;
-        const buildEntry = liveSecChanged && liveSec === 'build';   // MIX_V2 (2): ett byte IN i build-poolen tillats
-        const secEntry = this.pendingSecSwitch && secOldEnough && liveSec !== 'build';   // SECTION_UNIT: sektionen sager att risern ar over -> inBuild far inte halla kvar build-looken i refrangen
+        const buildEntry = this.pendingSecSwitch && liveSec === 'build';   // MIX_V2 (2): ett byte IN i build-poolen tillats (hålls tills ettan)
+        const secEntry = this.pendingSecSwitch && liveSec !== 'build';   // SECTION_UNIT: sektionen sager att risern ar over -> inBuild far inte halla kvar build-looken i refrangen
         const concertBuild = buildEntry && held > 2000;   // konsertläget: in i build direkt
         // refrängen kom utan drop -> lämna builden direkt; även ett energilyft/sektionslyft (ladan 16:05: virvel hängde kvar i 'low' efter lyftet)
         // + intensiteten på topp (ladan 17:09 'miss': upptakt låg kvar 10 s i int 0,9-1,0 - sektionen gick low -> build -> intro, aldrig high)
@@ -1136,15 +1138,19 @@ export class EffectEngine {
         const buildExit = BUILD_LOOKS.includes(this.smartMode) && (frame.section === 'high' || (this.buildLookAt > 0 && nowWall - this.buildLookAt > 2000 && (frame.intensity ?? 0) >= 0.95));
         // (BUILDEN LANDAR I REFRÄNGEN - sektionen high efter >= 4 s build = drop - borttagen 10-11 kväll: 'falsk' 21:42:39, 17 % på baslyft; se DROP_JUMP_DB)
         const buildLock = frame.section === 'build' && this.buildLookAt > 0 && BUILD_LOOKS.includes(this.smartMode) && nowWall - this.buildLookAt < 30000 && !dropSwitch && !buildExit;   // BUILD SOM HÅLLER - V123: bara så länge sektionen ÄR build
-        const ready = (wantSwitch || buildEntry) && held > MIN_HOLD && phraseOk;
+        const ready = ((wantSwitch || buildEntry) && held > MIN_HOLD && phraseOk) || allaBuild || concertBuild || buildExit;
         let slagOk = true;   // BYTE PÅ SLAGET (SWITCH_ON)
         if (SWITCH_ON > 0) {
-          if (!ready) this.slagWaitAt = -1; else if (this.slagWaitAt < 0) this.slagWaitAt = now;
+          if (!ready || buildLock || (inGap && !dropEntry)) this.slagWaitAt = -1; else if (this.slagWaitAt < 0) this.slagWaitAt = now;
           if (ready && hasBeat && bpm > 0 && this.beatTrust >= 0.5 && !(this.tickNow && this.lastBeatIdx % SWITCH_ON === 0))
             slagOk = now - this.slagWaitAt > SWITCH_ON * 1.25 * 60000 / bpm;
         }
-        if (!buildLock && (!inGap || dropEntry) && (dropSwitch || dropEntry || allaBuild || concertBuild || buildExit || (ready && slagOk))) {
+        if (!buildLock && (!inGap || dropEntry) && (dropSwitch || dropEntry || (ready && slagOk))) {
         this.switchLook(frame, bpm, tierS, tierName, bassClear, allaBuild, buildEntry, buildExit, dropSwitch, liveSec, memSection, secEntry, tierChanged);
+      } else if (landHit && held > LAND_HOLD_MS && (liveSec === 'high' || liveSec === 'intro')) {
+        this.landForce = true;   // basen är tillbaka: aldrig lugna poolen (tierEma bär fortfarande luckan)
+        this.switchLook(frame, bpm, tier === LUGN ? FART : tier, tier === LUGN ? 'fart' : tierName, bassClear, false, false, false, false, liveSec, false, false, tierChanged);
+        this.landForce = false; this.landAbsorbUntil = nowWall + LAND_ABSORB_MS; this.landAt = nowWall; this.landSec = liveSec;
       }
       return this.smartMode;
   }
diff --git a/src/split.ts b/.arena/fras/a3r/src/split.ts
index 3997f13..a1ae4b9 100644
--- a/src/split.ts
+++ b/.arena/fras/a3r/src/split.ts
@@ -49,8 +49,8 @@ export function seqDelta(ctrlLow: number, mySeq: number): number { return (ctrlL
 export const S_REC_SEQ = 0, S_BPM = 1, S_CONF = 2, S_BPMF = 3, S_PHASE_MS = 4, S_PHASE_CONF = 5, S_SECTION = 6, S_SEC_START = 7,
   S_SEC_INDEX = 8, S_SEC_TIER = 9, S_REP_SIM = 10, S_REP_AGO = 11, S_REP_SEC = 12, S_PROCESSED = 13, S_LAG_MS = 14, S_LAG_MAX = 15,
   S_BUSY_US = 16, S_BUSY_MAX_US = 17, S_SKIPPED = 18, S_EXPECT_MS = 19, S_EXPECT_SRC = 20, S_PREV_SEC = 21, S_LVL_HIGH = 22,
-  S_LOST_FLAGS = 23 , S_BUILD_AT = 24, S_BUILD_SEEN = 25 ;   // Tillståndsblock
-export const STATE_LEN = 26;
+  S_LOST_FLAGS = 23 , S_BUILD_AT = 24, S_BUILD_SEEN = 25, S_SEC_BACK = 26 ;   // Tillståndsblock
+export const STATE_LEN = 27;
 
 export const SECTIONS = ['', 'intro', 'low', 'build', 'high', 'break'];
 export function sectionCode(s: string): number { const i = SECTIONS.indexOf(s); return i < 0 ? 0 : i; }
```
