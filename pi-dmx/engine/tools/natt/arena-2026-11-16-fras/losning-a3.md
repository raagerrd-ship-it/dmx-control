# a3 DATERA BAKÅT - lösning

**IDÉN.** När sektionsdetektorn bestämmer sig talar den också om hur långt bakåt skiftet började (`frame.sectionBackMs`, ett stegsök över blockpoängen). Dirigenten räknar sektionens ålder från den daterade gränsen, så att 2 s-spärren (SECTION_UNIT) nästan alltid redan är uppfylld när beslutet kommer, och byter på första takt-ettan efter beslutet (SWITCH_ON 4, även build-bytena). Bytet hamnar därmed på musikens takt-etta, där frasen börjar, i stället för på ett godtyckligt slag.

**VAR FÖRDRÖJNINGEN SATT i bas** (min analys av bas-json, 83 ägargränser): detektorn beslutar median **3,0 slag** efter gränsen, men för 27 av 83 gränser kommer inget beslut alls inom 16 slag (då blir lag = 16). Dirigenten lade på median **3,3 slag** (medel 2,0): SECTION_UNIT 2 s räknat från beslutet, I LUCKAN 4 s efter uppbyggnadssignalen och MIN_HOLD 8 s. I a3 är dirigentens del median 0,6 slag (medel 1,3). Det som är kvar sitter i LUCKAN och MIN_HOLD (en debug-sond på 171840 visade luckan 43,4 -> 47,2 s och hold 185,0 -> 191,4 s). Dem rörde jag inte, eftersom de skyddar dropbytet.

**DELARNA**

| del | vad den gör | mått den bär (m2 mot bas) |
|---|---|---|
| D1 ETTAN (effects.ts) | `SWITCH_ON = 4`. Grinden gäller även allaBuild/concertBuild/buildExit. Väntklockan går bara när bytet faktiskt är tillåtet (`want` = !buildLock && !inGap && ...), så ett byte som släpps efter luckan väntar ändå in ettan. Taket är 5 slag. Drop/dropEntry är orörda. | etta 17,7 -> 42,0 % (151659 7 -> 56, 193040 21 -> 50, 171840 25 -> 20). Ger ~+12 av poängen |
| D2 DATERAD GRÄNS (analyserSection.ts datedBack + fältet i analyser.ts/split.ts S_SEC_BACK) | Stegsök (t-mått, 8 block före) över rangpoängen (dB före 20 block). Kanterna dateras ur sin egen definition: edgeDown 2 block, edgeUp/drop 1 block. Rangbeslut daterar minst RANK_RUN block tillbaka, högst 12. Fördelning: 2000 ms 26 st, 5-12 s 23 st. Ingen allokering per hop, och det körs bara vid sektionsbyte. | m1 -> m2 lag 9,60 -> 9,49 |
| D3 ÅLDER FRÅN DATERAD GRÄNS (effects.ts secOldEnough) | `sectionAgeMs + sectionBackMs >= 2000`. tierEma-snäppet och effekternas sectionAgeMs/sectionBars är orörda. | lag 10,0 -> 9,5 slag (tillsammans med D2) |

**SIFFRORNA** (m2 = standard i kopian; m1 = D1+D3 med enklare datering: +12,70, ljus +0,6)

| fil | gräns % | lag | etta % | lösa | byten |
|---|---|---|---|---|---|
| 151659 | 3,3 -> 0,0 | 11,6 -> 12,0 | 7,1 -> 56,0 | 1,4 -> 1,3 | 3,3 -> 2,9 |
| 171840 | 9,1 -> 9,1 | 10,0 -> 8,9 | 25,0 -> 20,0 | 1,1 -> 0,8 | 3,4 -> 3,2 |
| 193040 | 25,8 -> 29,0 | 8,4 -> 7,6 | 20,8 -> 50,0 | 1,0 -> 1,0 | 3,9 -> 3,9 |

**Poäng +12,87**, ljusdomaren **+0,43** (takt +1,08, kontrast -0,03, koreografi +0,66, inga spärrar). Det som blev sämre: 151659 tappade sin enda gränsträff (40,0 s: beslutet kom 0,8 slag efter gränsen, och bytet väntar nu in nästa etta, 3,7 slag), och dess lag ökade 0,4 slag. På 171840 sjönk etta till 20 %, eftersom klockans etta där bara stämmer på 45 % av ticken (mod 0 mot Beat This). Det kan inte lagas i tillåtna filer.

**RISKEN.** Bytet blir aldrig bättre än klockans etta (fel takt-etta ger systematiskt fel byte, som på 171840). Själva dateringen har grov upplösning (1 s-block). Bakåtdaterad gräns ligger median 4,9 slag från närmaste ägargräns, alltså inte bättre än beslutet, och den duger därför till åldersspärren men inte till att flytta frasgittret. Vid låtbyten är back 0 (sectionReset), så spärren är som förr. Workern: fältet bärs i tillståndsblocket (STATE_LEN 26 -> 27), så fast- och slow-sidan måste deployas tillsammans. Lotus får fältet men läser det inte. ANALYSER_SHARED.md5 är uppdaterad för analyser.ts, analyserSection.ts och split.ts, och lotus måste porta samma tre filer. Väntan på ettan kan låta ett byte glida upp till 5 slag om klockans tillit faller (tick saknas). Långa uppbyggnader och breaks: build-bytena väntar nu också in ettan (högst 4 slag), och LUCKAN och buildLock gäller som förr.

## DIFFEN

```diff
diff --git a/src/ANALYSER_SHARED.md5 b/.arena/fras/a3/src/ANALYSER_SHARED.md5
index f6ba712..aa86961 100644
--- a/src/ANALYSER_SHARED.md5
+++ b/.arena/fras/a3/src/ANALYSER_SHARED.md5
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
diff --git a/src/analyser.ts b/.arena/fras/a3/src/analyser.ts
index 5dcd901..e00d98d 100644
--- a/src/analyser.ts
+++ b/.arena/fras/a3/src/analyser.ts
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
diff --git a/src/analyserSection.ts b/.arena/fras/a3/src/analyserSection.ts
index d86d2b9..d589d13 100644
--- a/src/analyserSection.ts
+++ b/.arena/fras/a3/src/analyserSection.ts
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
diff --git a/src/effects.ts b/.arena/fras/a3/src/effects.ts
index ff4645c..ac578c2 100644
--- a/src/effects.ts
+++ b/.arena/fras/a3/src/effects.ts
@@ -259,7 +259,7 @@ const MANUS_TOP = 2;
  *  SECTION_UNIT_MIN_MS gammal - phraseOk:s reserv (held > MIN_HOLD + en fras) är nästan alltid sann efter en hållen look, så bytet landade
  *  var som helst i takten (konsertReplay --slag). Med N väntar bytet (wantSwitch/buildEntry, inte drop/build-händelserna) in nästa
  *  taktklocka-tick med beatIdx % N = 0 (1 = nästa slag, 4 = ettan), högst N slag x 1,25. */
-const SWITCH_ON = 1;
+const SWITCH_ON = 4;   // DATERAD GRANS (arenan fras a3): ettan
 /** HIGH-VARV (standard 2026-11-04, ägaren: 'pröva b'; megamix tryckvag 36 % = manusets återseende): när refrängen (high) kommer tillbaka
  *  för 4:e gången eller fler i samma låt får den NÄSTA look - minst spelad ur sektionens manusHist, annars ny ur poolen - i stället för
  *  manusets. 1:a-3:e gången oförändrade (refrängen känns igen). Drop-bytet orört. natt --snabb: mega tryckvag 36 -> 21 %, lampspr 83 -> 88,
@@ -1064,9 +1064,9 @@ export class EffectEngine {
         // (FLANK_SHORT_S), sektionen gick high 0,7 s senare men lookbytet väntade in frasen till 17:48:20,2 = 'dropen blir sen'): går
         // sektionen in i high inom 2 s efter en sådan drop byts looken direkt, som vid en full drop (ingen MIN_HOLD/fras/slag-väntan).
         const dropEntry = liveSecChanged && liveSec === 'high' && nowWall - this.anaDropAt < 2000;
-        if (liveSec !== '' && liveSec !== this.lastLiveSection) { if (this.lastLiveSection !== '') console.log(`[dirigent] sektion ${this.lastLiveSection} -> ${liveSec} (nr ${frame.sectionIndex ?? 0}, tier ${frame.sectionTier ?? '-'})`); this.lastLiveSection = liveSec; }   // (intro glommer inte lookerna langre - LÅTMANUS glomms bara pa en verklig latgrans)
+        if (liveSec !== '' && liveSec !== this.lastLiveSection) { if (this.lastLiveSection !== '') console.log(`[dirigent] sektion ${this.lastLiveSection} -> ${liveSec} (nr ${frame.sectionIndex ?? 0}, tier ${frame.sectionTier ?? '-'}, daterad ${frame.sectionBackMs ?? 0} ms)`); this.lastLiveSection = liveSec; }   // (intro glommer inte lookerna langre - LÅTMANUS glomms bara pa en verklig latgrans)
         if (liveSecChanged) this.pendingSecSwitch = true;
-        const secOldEnough = (frame.sectionAgeMs ?? 1e9) >= SECTION_UNIT_MIN_MS;   // SECTION_UNIT: ingen switch pa en sektion yngre an SECTION_UNIT_MIN_MS (detektorflapp)
+        const secOldEnough = (frame.sectionAgeMs ?? 1e9) + (frame.sectionBackMs ?? 0) >= SECTION_UNIT_MIN_MS;   // SECTION_UNIT: ingen switch pa en sektion yngre an SECTION_UNIT_MIN_MS (detektorflapp)
         const memSection = liveSecChanged;   // (latminnets sektionsgrans mem* borttagen 11-09 - sattes aldrig)
         const phraseMs = this.cfg.beat && this.cfg.beat.bpm > 0 ? 16 * 60000 / this.cfg.beat.bpm : 0;
         // LÅTMANUS: sektionsbytet landar på sektionens EGET taktraster (början av takt 2, 4, 6 ... sedan sektionsstart) i stället för
@@ -1137,13 +1137,14 @@ export class EffectEngine {
         // (BUILDEN LANDAR I REFRÄNGEN - sektionen high efter >= 4 s build = drop - borttagen 10-11 kväll: 'falsk' 21:42:39, 17 % på baslyft; se DROP_JUMP_DB)
         const buildLock = frame.section === 'build' && this.buildLookAt > 0 && BUILD_LOOKS.includes(this.smartMode) && nowWall - this.buildLookAt < 30000 && !dropSwitch && !buildExit;   // BUILD SOM HÅLLER - V123: bara så länge sektionen ÄR build
         const ready = (wantSwitch || buildEntry) && held > MIN_HOLD && phraseOk;
+        const want = !buildLock && !inGap && (ready || allaBuild || concertBuild || buildExit);
         let slagOk = true;   // BYTE PÅ SLAGET (SWITCH_ON)
         if (SWITCH_ON > 0) {
-          if (!ready) this.slagWaitAt = -1; else if (this.slagWaitAt < 0) this.slagWaitAt = now;
-          if (ready && hasBeat && bpm > 0 && this.beatTrust >= 0.5 && !(this.tickNow && this.lastBeatIdx % SWITCH_ON === 0))
+          if (!want) this.slagWaitAt = -1; else if (this.slagWaitAt < 0) this.slagWaitAt = now;
+          if (want && hasBeat && bpm > 0 && this.beatTrust >= 0.5 && !(this.tickNow && this.lastBeatIdx % SWITCH_ON === 0))
             slagOk = now - this.slagWaitAt > SWITCH_ON * 1.25 * 60000 / bpm;
         }
-        if (!buildLock && (!inGap || dropEntry) && (dropSwitch || dropEntry || allaBuild || concertBuild || buildExit || (ready && slagOk))) {
+        if (!buildLock && (!inGap || dropEntry) && (dropSwitch || dropEntry || (want && slagOk))) {
         this.switchLook(frame, bpm, tierS, tierName, bassClear, allaBuild, buildEntry, buildExit, dropSwitch, liveSec, memSection, secEntry, tierChanged);
       }
       return this.smartMode;
diff --git a/src/split.ts b/.arena/fras/a3/src/split.ts
index 3997f13..a1ae4b9 100644
--- a/src/split.ts
+++ b/.arena/fras/a3/src/split.ts
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
