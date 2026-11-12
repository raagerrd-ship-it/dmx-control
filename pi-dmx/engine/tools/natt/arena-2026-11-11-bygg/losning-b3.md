# b3 – sektionen ur basens nivå

## Idén
**Sektionen.** 'high' sätts per slag av TAKTENS BASNIVÅ (näst starkaste slaget av de fyra senaste; 0,25 x sub + 0,75 x kick i dB ur
sektionens bandsummor) mot två referenser: refrängens (nivån i 'high', mindes utanför) och partiets egen (16 slags medel). In: inom
3 dB från refrängens referens eller 6 dB över partiets nivå, tre slag i rad. Ut: en takt där högst ett slag når inom 6 dB från
refrängens referens. Det ersätter rangens tier 2 (2 s-fönster + 3–5 block), uppehållstiderna kring 'high', låtstartsregeln, dropens
håll och 'basen tillbaka = high': en mätning i stället för fem lappar.

**Uppbyggnaden.** `buildUp` = var taktens basnivå ligger mellan partiets och refrängens referens medan den är på väg: 0 på partiets
nivå, 0 när den är framme (höjningen har skett), 0 i refrängen. Ingen ramp eller hålltid; räknas om varje slag.

## Var snittet går
Analysatorn (`bassStep`, `sectionSet`): slag ur klockan (4 = takten, 3 i rad in, 5 ut, 16 partiets minne, 8/32 refrängens referens
upp/ned, 240 = bassLevels minne) och dB mellan partier (3 in, 6 ut = bassLevel 0,5, 6 steg, 4 minsta avstånd mellan referenserna).
De säger hur länge ett mönster hållit och hur långt partier ligger isär; inget är valt för ljuset. Rangens tier finns kvar för
low/break/build (8 s, som förr) och `sectionTier`. Riserns ramp (3,5 s upp/1 s ner) är borta ur `riserStep`; `inRiser` orörd.
Ur effects.ts: `buildProg`, `buildSecAt`, `buildSecSeen` och blocket som räknade slag sedan 'build'; `ctx.buildUp`, showTime och
sektionens tak läser `frame.buildUp`, liksom `inBuild` redan gjorde.

## Siffrorna (övning; värde och % mot bas)
mix_klocka 97.88 (+0.0) | mix_las 2.78 (+0.0) | mix_hopp 0.00 (+0.0) | mix_still 2.93 (+0.0) | klipp_klocka 98.32 (+0.0) | ettan 100.00 (+0.0) | grid40 53.38 (+0.0) | gridfel 20.00 (+0.0) | upp_s 1.00 (+93.5) | ned_s 0.50 (+81.1) | traff 94.12 (+25.5) | korta 51.20 (-50.4) | bygg 10.68 (+93.0) | drop_traff 100.00 (+0.0) | drop_falska 0.00 (+0.0) | drop_ms 216.00 (+0.0) | gr_ratt 73.33 (+0.0) | gr_falska 0.00 (+0.0)

Poäng **+8.09** (långsamma +13.48 %, latens 80 mot 80 ms). md5 skiljer; ljusdomaren +1.36, inga spärrar. Worker p99
5 hop (parets bas 5). Dropjobbet byte-identiskt, hela drops lika i alla lang-filer (minidrops pop 113 -> 114).
Sämre: `korta` 34 -> 51 % – en till två takters svackor i basen blir egna 'break'.

Tre mätningar: (1) buildUp = 1 när nivån var framme men obekräftad: +5,82 (latens 85, ljusdomaren −0,06). (2) en hel takt in +
ögonblicklig tystnad lämnar inte 'high': långsamma +15,3 % men ljusdomaren −3,40 = DISK (pulsdjup pop −36 %, megamix −30 %) –
förkastad. (3) levererad: som (1) men buildUp = 0 när nivån är framme: t90 25 -> 20 ms, ljusdomaren +1,36. buildUp = 1 i takten
EFTER smällen la build-looken på refrängens första takt.

## Risken
- 'high' sitter för ofta på pop/megamix (84/88 % av tiden mot basens 45/72 %): referensen följer musiken ned och 4–6 dB räcker in.
  Ljusdomaren är känslig för det (mätning 2); ladans ljus kan bli plattare på sådant material än bänken visar.
- Basen bär inte alltid formen: refräng som bara är ljusare, eller glesa kickar mot klockans slag (kick på 1 och 3 under 100 bpm)
  fladdrar high/break – sett i megamixen.
- Tvär höjning utan stigande bas ger buildUp 0 (kortet ser nivån, inte risern/virveln); värdet går stegvis per slag.
- Referenserna bärs över låtgränser: en svagare mastrad låt når 'high' först via 6 dB-steget.
- Domarens tidsaxlar glider isär (38 hop = 101,3 ms räknas som 100; nivåblock 501,3 ms som 500): sena skiften blir 'redan' för en
  snabb etikett, så upp_s/ned_s vilar på 8–9 tidiga skiften och bygg-fönstret hamnar delvis EFTER skiftet. Gäller alla deltagare.
- Kvar att städa: oanvända platser R_DROPS/R_BUILD/BS_BUILD (split.ts), profilens SECTION_BODY_HIGH*/SECTION_EARLY_DB (förbjuden
  fil), ANALYSER_SHARED.md5. Lotus-vägarna (odelad, utan stora vägen) är röktestade, inte bänkade.

## Diffen
`git diff --no-index src .arena/bygg/b3/src` (även `diff.patch`; `patch -p1` på en kopia av src ger identiska filer):

```diff
diff --git a/src/analyser.ts b/.arena/bygg/b3/src/analyser.ts
index 2207dcf..19dee91 100644
--- a/src/analyser.ts
+++ b/.arena/bygg/b3/src/analyser.ts
@@ -21,15 +21,15 @@ import { PROFILE } from './analyserProfile.js';
 export const BASS_SPAN_DB = 36;
 import {
   REC_LEN, RING_N, R_SEQ, R_PERF, R_WALL, R_ENV, R_BASS, R_HIGH, R_FLAGS, R_HINT_MS, R_VCLOCK, R_SEC_N, R_SEC_INT, R_SEC_KICKS, R_SEC_BREAK,
-  R_SEC_RMS2, R_SEC_CENT, R_SEC_DT, R_DROPS, R_ACTIVE, R_BUILD, R_SEC_SPEC0, R_SEC_WALL, R_TS, R_FLAGCNT, RING_MARGIN, FLAG_BITS, R_SEC_BON, R_SEC_BPK, R_SEC_FLUX, R_SEC_RMS4,
+  R_SEC_RMS2, R_SEC_CENT, R_SEC_DT, R_ACTIVE, R_SEC_SPEC0, R_SEC_WALL, R_TS, R_FLAGCNT, RING_MARGIN, FLAG_BITS, R_SEC_BON, R_SEC_BPK, R_SEC_FLUX, R_SEC_RMS4,
   packFlagCounts, lostFlags, seqLow, seqDelta, C_WAITING, C_STATE_SEQ, S_LOST_FLAGS,
   F_SIL350, F_SIL10, F_RESET_TEMPO, F_HINT, F_RESET_BAR, F_VCLOCK_SET, F_VCLOCK_NULL,
   C_WRITE, C_READ, S_REC_SEQ, S_BPM, S_CONF, S_BPMF, S_PHASE_MS, S_PHASE_CONF, S_SECTION, S_SEC_START, S_SEC_INDEX, S_SEC_TIER,
-  S_REP_SIM, S_REP_AGO, S_REP_SEC, S_EXPECT_MS, S_EXPECT_SRC, S_PREV_SEC, S_LVL_HIGH, S_PROCESSED, S_LAG_MS, S_LAG_MAX, S_BUSY_US, S_BUSY_MAX_US, S_SKIPPED, STATE_LEN,
+  S_REP_SIM, S_REP_AGO, S_REP_SEC, S_EXPECT_MS, S_EXPECT_SRC, S_PREV_SEC, S_LVL_HIGH, S_BUILD, S_PROCESSED, S_LAG_MS, S_LAG_MAX, S_BUSY_US, S_BUSY_MAX_US, S_SKIPPED, STATE_LEN,
   SECTIONS, sectionCode, viewsOf, stateWrite, stateRead, createSplitBuffers, type SplitBuffers, type WorkerData,
   C_WAKE, syncWait, HopLaneFast, HopLaneSlow, StateReader, type HopFeed,
   R_BIGSEQ, R_CLOCK, R_CLOCK_CONF, BIG_REC_LEN, BIG_RING_N, BIG_HOP_MAX, B_SEQ, B_N, B_RMS, B_LVL, B_CENT, B_ACTIVE, B_WALL, B_KICK, B_KICKHIT, B_INT, B_BREAK, B_SEC, B_LVH, B_CONF,
-  B_ENVF, B_ENVBPM, C_WAITING_B, C_BIG_WRITE, C_BIG_READ, C_BIG_SEQ, BS_SEQ, BS_BODY, BS_DROPS, BS_MINI, BS_BUILD, BS_RISER, BS_PUNCH, BS_BASS, BS_BRIGHT, BS_BEAT,
+  B_ENVF, B_ENVBPM, C_WAITING_B, C_BIG_WRITE, C_BIG_READ, C_BIG_SEQ, BS_SEQ, BS_BODY, BS_DROPS, BS_MINI, BS_RISER, BS_PUNCH, BS_BASS, BS_BRIGHT, BS_BEAT,
   BS_BASSLINE, BS_SPEC_N, BS_SKIPPED, BS_CAND, BS_DEMOTED, BS_SPACED, BS_DROPRISE, BS_NEAR, BS_NEARDIP, BS_LIFT, BS_STOPS, BS_STOPSEC, BIG_STATE_LEN, SPEC_SLOTS, SPEC_MAX,
 } from './split.js';
 import FFT from "fft.js";
@@ -171,8 +171,9 @@ export interface Frame {
   nearDropDb: number; nearDipDb: number; liftDb: number; stopCount: number; stopS: number;
   inZone: boolean;      // nivån är i låtens topp-zon (ihållande tillstånd, hysteres)
   breaking: boolean;    // nivån är i en svacka/break (ihållande tillstånd)
-  /** UPPBYGGNAD (riser): 0..1 tension som ramsar upp mot en drop. Mjuk signal →
-   *  sampling-säker. Show-REAKTIONERNA (strobe, swell) ligger i effekt-motorn. */
+  /** UPPBYGGNADEN (0..1), en MÄTNING: hur långt taktens basnivå hunnit från partiets egen nivå (versens referens) mot refrängens
+   *  referens, medan den är på väg. 0 när nivån ligger på partiets egen, 0 när den är framme vid refrängens referens (höjningen har
+   *  skett) och i refrängen. Ingen ramp och ingen hålltid - se bassStep. Vad ljuset gör av den ligger i effekt-motorn. */
   buildUp: number;
   inRiser: boolean;
   /** KARAKTÄRSPROFIL (~8s glidande) — vad SLAGS musik är detta? Dirigenten väljer
@@ -593,12 +594,7 @@ export class Analyser {
    *  LOTUS_SECTION_HOLD_BARS = N (0 = av): uppehallet i high (REPEAT bit 16/32) ersatts av TAKTSTRUKTUR - minst N takter fran high-starten,
    *  sedan slapps high bara pa en 4-taktsgrans (fas +-1 takt) nar rangen inte langre sager high. */
   private static readonly RANK_RUN_IN = Analyser.secEnv('SECTION_RUN_IN', 0);
-  /** BASEN TILLBAKA = HIGH (2026-10-19, DMX-fyndet: 12/68 show-drops gick in i 'build' 2-8 s EFTER smallen): <prefix>SECTION_BODY_HIGH = ms
-   *  kroppen (bodyEnv) maste ha varit borta (under taket - BODY_GONE_DB), 0 = av. Nar den kommer tillbaka och inom 2 s nar
-   *  bodyPeak - SECTION_BODY_HIGH_DB raknas det som en drop for sektionen: 'high' direkt, forbi uppehallstiden. */
-  private static readonly BODY_HIGH_MS = Analyser.secEnv('SECTION_BODY_HIGH', 0);
-  private static readonly BODY_HIGH_DB = Analyser.secEnv('SECTION_BODY_HIGH_DB', 3);
-  private secBodyRet = 0; private secBodyArmMs = 0;
+
 
   /** ATERINTRADE (09-22, agent-sec5): efter forsta refrangen ar refrangnivan kand (lastHighDb). Ar 2-blocksmedlet tillbaka pa den nivan
    *  (>= lastHighDb - REENTRY_DB) och 4 s-fonstrets rang >= REENTRY_PCT (under RANK_HI 0,67) -> 'high' DIREKT utan 3-blocks-run.
@@ -643,8 +639,28 @@ export class Analyser {
   private secLog: Array<{ label: string; startMs: number; endMs: number; db: number; dens: number }> = [];
   private secCurDbSum = 0; private secCurDbN = 0; private secCurDens = 0; private lastHighDb = NaN;
   private secBlkMs = 0; private secBlkN = 0; private secBlkInt = 0; private secBlkKicks = 0; private secBlkCent = 0; private secBlkSpec = new Float32Array(8);
-  private secTierRun = 0; private secTierCand = 1; private secRiseRun = 0; private secSongStartMs = 0; private secDropSeen = 0; private secSilentBlocks = 0; private secDropHoldUntil = 0;
+  private secTierRun = 0; private secTierCand = 1; private secRiseRun = 0; private secSongStartMs = 0; private secSilentBlocks = 0;
   private secHist = new Float32Array(16); private secHistPos = 0; private secHistN = 0;
+  /** SEKTIONEN UR BASENS NIVÅ (arenan bygg 2026-11-11; ersätter rangens tier 2, uppehållstiderna in i/ur 'high', låtstartsregeln,
+   *  dropens håll och 'basen tillbaka = high'). Etiketten in i och ut ur 'high' följer TAKTENS BASNIVÅ mot två referenser, allt i slag
+   *  ur klockan (slagets längd som i bassEnergyStep) och i dB-skillnader (oberoende av ingångsnivån):
+   *    taktens nivå  = det näst starkaste slaget av de BS_BAR senaste (slagets styrka = basens topp under slaget, 0,25 x sub + 0,75 x
+   *                    kick i dB ur sektionens bandsummor) - ett ensamt anslag räknas inte, två på en takt gör det.
+   *    refrängens referens (bsHi) = taktens nivå i 'high': följer den på BS_HI_UP slag uppåt och BS_HI_DN slag nedåt; utanför 'high'
+   *                    minns den refrängen (glöms mot nuet på BE_MEM_BEATS slag, som bassLevel) och följer en ny topp direkt.
+   *    partiets referens (bsLo) = taktens nivå utjämnad över BS_PART slag utanför 'high' (versens/breakets egen nivå); börjar om
+   *                    på den nivå musiken föll till när refrängen lämnades.
+   *  IN i 'high': taktens nivå är tillbaka inom BS_IN_DB från refrängens referens (och referenserna skiljer sig BS_SPAN_DB), eller har
+   *  stigit BS_RISE_DB över partiets egen nivå (då blir den nya nivån refrängens referens) - i BS_IN_BEATS slag i rad (ca en takt).
+   *  UT: på de BS_OUT_BEATS senaste slagen når högst ett slag upp inom BS_OUT_DB från refrängens referens (6 dB = halva amplituden,
+   *  samma mått som bassLevel 0,5) - en takt utan refrängens bas. Tystnad lämnar direkt. Talen beskriver musiken (hur många slag ett
+   *  mönster måste ha hållit, hur många dB som skiljer partier åt), inget av dem är valt för ljuset.
+   *  UPPBYGGNADEN (frame.buildUp) = var taktens nivå ligger mellan partiets och refrängens referens utanför 'high', så länge den
+   *  inte är framme (inom BS_IN_DB från refrängens referens). */
+  private static readonly BS_BAR = 4; private static readonly BS_IN_BEATS = 3; private static readonly BS_OUT_BEATS = 5;
+  private static readonly BS_IN_DB = 3; private static readonly BS_OUT_DB = 6; private static readonly BS_RISE_DB = 6; private static readonly BS_SPAN_DB = 4;
+  private static readonly BS_HI_UP = 8; private static readonly BS_HI_DN = 32; private static readonly BS_PART = 16;
+  private bsBeat = new Float64Array(8).fill(-140); private bsN = 0; private bsAccMs = 0.5; private bsMax = -140.5; private bsHi = NaN; private bsLo = NaN; private bsInRun = 0; private secHigh = false;
   private static readonly FP_DIM = 11; private static readonly FP_MAX = 96;
   private secFp = new Float32Array(Analyser.FP_MAX * Analyser.FP_DIM); private secFpT = new Float64Array(Analyser.FP_MAX); private secFpLab: string[] = [];
   private secFpN = 0; private secFpPos = 0; private secFpAcc = new Float32Array(Analyser.FP_DIM); private secFpAccN = 0;
@@ -734,7 +750,7 @@ export class Analyser {
   private hInZone = false; private hBreaking = false; private hInRiser = false; private hKickAt = 0.5;
   /** sectionHop:s summor (samma skäl): anroparen fyller, sectionHop läser. */
   private shIn = { hops: 0.5, intSum: 0.5, kicks: 0.5, breaking: false, nowMs: 0.5, dtMs: 0.5, rms2Sum: 0.5, centSum: 0.5, specOff: 0.5, bonSum: 0.5, bpk: 0.5, fluxSum: 0.5, rms4Sum: 0.5 };
-  private secAgg = { n: 0, int: 0, kicks: 0, breaking: 0, rms2: 0, cent: 0, dt: 0, wall: 0, drops: 0, active: 0, build: 0, spec: new Float64Array(8), bon: 0, bpk: 0, flux: 0, rms4: 0 };
+  private secAgg = { n: 0, int: 0, kicks: 0, breaking: 0, rms2: 0, cent: 0, dt: 0, wall: 0, active: 0, spec: new Float64Array(8), bon: 0, bpk: 0, flux: 0, rms4: 0 };
   private inlinePeer: Analyser | null = null;
   /** STORA VÄGEN (split.ts, a3): 2048-FFT, drop, riser, profil, basgång och sektionsaggregat i långsamma tråden, ett record per hop.
    *  fast: skriver recordet och läser tillbaka; slow: kör stegen. Bara med FAST_BANDS + SECTION_AGG 'hop' och split-buffertarna. */
@@ -744,8 +760,6 @@ export class Analyser {
   private bigEnvFlag = 0; private bigEnvBpm = 0.5;
   /** Snabba sidans syn på långsamma värden vid hoppet (drop/profil/basgång läser dessa i stället för de levande fälten). */
   private dSec = 'intro'; private dLvh = 0.5; private dConf = 0.5; private dBpm = 0.5;
-  /** slow + stora vägen: sektionens syn på drop-räknaren (som R_DROPS förr: värdet vid förra env-recordet). */
-  private secVDrops = 0;
   /** PI:NS VERKLIGHET (a3r): EN worker-tråd (motorn är låst till 2 kärnor). Anropas efter varje behandlat env- och hop-record, så
    *  taktvägen (det motorn läser varje hop) körs mellan dem och aldrig köar bakom en hel 2048-backlog. null i bänkens inline/synk-läge
    *  (taktvägen är oberoende av analysatorn, så ordningen påverkar inga värden). */
@@ -797,12 +811,6 @@ export class Analyser {
    *  musiksnuttar dar facit (PC = Beat This!) och analysatorn skiljer 1,25/0,80 (3 Doors Down, Ricky Rose, Wailers). Standard AV. */
   private static readonly TEMPO_FIVE4 = sysEnv('TEMPO_FIVE4') === '1';
   private static readonly FIVE4_MARGIN = 0.15;
-  /** TIDIG REFRANG KRAVER NIVA (2026-09-24, drejboken i ladan: varje lat fick intro -> build -> high vid 20-28 s): direkt efter 20 s-
-   *  uppvarmningen rangordnas nuet mot bara introt, sa forsta starkare parti blir 'high' aven om det ar en vers. De forsta
-   *  <prefix>SECTION_EARLY_S sekunderna (0 = av) far 'high' bara om de senaste 4 blockens medel ligger >= SECTION_EARLY_DB over
-   *  latens blockmedian hittills; annars 'build' (pa vag upp) / kvar. Drop far alltid ge high. */
-  private static readonly SECTION_EARLY_S = 45;
-  private static readonly SECTION_EARLY_DB = Number(sysEnv('SECTION_EARLY_DB')) || 3;
   /** KICKDETEKTOR-RATTAR (09-20, korbank banken (bench.mjs), BENCH_GRID=1, 107 latar med PC-basonsets/slag):
    *  troskelfaktor mot MAD (4,5), grinden mot eget grid (pa), cooldown (170 ms) och energigolv (0,06). Env for A/B.
    *  Svep 2026-09-20 (tempot orort i alla): baslinje kick-recall 0,48 / precision 0,84 / on-beat-recall 0,63;
@@ -1182,13 +1190,11 @@ export class Analyser {
    *  mot 8 s tidigare. Upprepning: ett klangavtryck per 4 s (8 band normerade + centroid + kicktathet + intensitet, L2)
    *  jamfors med alla avtryck >= 16 s tillbaka (max 96 = 6,4 min); bast cosinus -> repeatSim/repeatAgoMs/repeatSection.
    *  Kostnad: nagra adds per hop, ~100 punktprodukter a 11 var fjarde sekund. Referens for bansken: all-in-one pa hela latar. */
-  /** Sektionens drop-evidens: levande i roll 'all'/'fast'; i workern med stora vägen värdet vid förra env-recordet (som R_DROPS förr). */
-  private secDropsNow(): number { return this.role === 'slow' && this.bigOn ? this.secVDrops : this.dropCand + this.secBodyRet; }
   private sectionReset(): void {
-    this.section = 'intro'; this.sectionStartMs = 0; this.sectionIndex = 0; this.sectionTier = 1; this.repeatSim = 0; this.repeatAgoMs = 0; this.repeatSection = '';
+    this.section = this.secHigh ? 'high' : 'intro'; this.sectionStartMs = 0; this.sectionIndex = this.secHigh ? 1 : 0; this.sectionTier = 1; this.repeatSim = 0; this.repeatAgoMs = 0; this.repeatSection = '';   // basens läge och referenser bärs över nollningen
     this.secBlkMs = 0; this.secBlkN = 0; this.secBlkInt = 0; this.secBlkKicks = 0; this.secBlkCent = 0; this.secBlkSpec.fill(0);
     this.secBlkBon = 0; this.secBlkBpk = 0; this.secBlkFlux = 0; this.secBlkRms4 = 0; const H = this.secBlkH; H.bon.length = 0; H.bpk.length = 0; H.high.length = 0; H.flat.length = 0; H.flux.length = 0; H.dyn.length = 0;
-    this.secTierRun = 0; this.secTierCand = 1; this.secRiseRun = 0; this.secSongStartMs = 0; this.secBlkRms2 = 0; this.secBlkDb.length = 0; this.secBlkDens.length = 0; this.secBlkCentH.length = 0; this.secDropSeen = this.secDropsNow(); this.secSilentBlocks = 0; this.secDropHoldUntil = 0;
+    this.secTierRun = 0; this.secTierCand = 1; this.secRiseRun = 0; this.secSongStartMs = 0; this.secBlkRms2 = 0; this.secBlkDb.length = 0; this.secBlkDens.length = 0; this.secBlkCentH.length = 0; this.secSilentBlocks = 0;
     this.secHistN = 0; this.secHistPos = 0; this.secFpN = 0; this.secFpPos = 0; this.secFpLab.length = 0; this.secFpAcc.fill(0); this.secFpAccN = 0;
     this.secLog.length = 0; this.secCurDbSum = 0; this.secCurDbN = 0; this.secCurDens = 0; this.lastHighDb = NaN; this.expectHighMs = 0; this.expectSource = 0; this.prevSection = ''; this.levelVsHighDb = 0;
     
@@ -1205,14 +1211,57 @@ export class Analyser {
   private sectionHop(spec: ArrayLike<number>): void {
     const I = this.shIn, hops = I.hops, intSum = I.intSum, kicks = I.kicks, breaking = I.breaking, nowMs = I.nowMs, dtMs = I.dtMs, rms2Sum = I.rms2Sum, centSum = I.centSum,
       specOff = I.specOff, bonSum = I.bonSum, bpk = I.bpk, fluxSum = I.fluxSum, rms4Sum = I.rms4Sum;
-    if (this.secSongStartMs === 0) { this.secSongStartMs = nowMs; this.sectionStartMs = nowMs; this.secDropSeen = this.secDropsNow(); }
+    if (this.secSongStartMs === 0) { this.secSongStartMs = nowMs; this.sectionStartMs = nowMs; }
     this.secBlkMs += dtMs; this.secBlkN += hops; this.secBlkInt += intSum; this.secBlkKicks += kicks; this.secBlkCent += centSum; this.secBlkRms2 += rms2Sum;
     this.secBlkBon += bonSum; this.secBlkBpk += bpk; this.secBlkFlux += fluxSum; this.secBlkRms4 += rms4Sum;
     for (let i = 0; i < 8; i++) this.secBlkSpec[i] += spec[specOff + i];
+    this.bassStep(5 * Math.log10(spec[specOff] / hops + 1e-7) + 15 * Math.log10(spec[specOff + 1] / hops + 1e-7), dtMs, nowMs);
     if (this.secBlkMs < 1000) return;
     this.sectionBlock(nowMs, breaking);
   }
 
+  /** Basens steg (se SEKTIONEN UR BASENS NIVÅ): x = basens dB i sampeln. Räknar slagets topp; vid varje slaggräns taktens nivå,
+   *  referenserna, 'high' in/ut och uppbyggnaden. Inga objekt, ett tiotal tal per slag. */
+  private bassStep(x: number, dtMs: number, nowMs: number): void {
+    if (x > this.bsMax) this.bsMax = x;
+    let per = this.localBpm > 40 ? 60000 / this.localBpm : Analyser.BE_FALLBACK_MS;   // slagets längd ur klockan
+    per = per < Analyser.BE_BEAT_MIN_MS ? Analyser.BE_BEAT_MIN_MS : per > Analyser.BE_BEAT_MAX_MS ? Analyser.BE_BEAT_MAX_MS : per;
+    if ((this.bsAccMs += dtMs) < per) return;
+    this.bsAccMs -= per; const B = this.bsBeat, n = ++this.bsN; B[(n - 1) & 7] = this.bsMax; this.bsMax = -140;
+    if (n < 8) return;
+    const was = this.secHigh;
+    if (this.activeMs === 0) { this.secHigh = false; this.bsInRun = 0; this.buildUp = 0; }   // tyst: ingen bas, referenserna står kvar
+    else {
+      let a = -140, b = -140, L = -140;   // näst starkaste slaget: L över takten (BS_BAR), b över ut-fönstret (BS_OUT_BEATS)
+      for (let i = 1; i <= Analyser.BS_OUT_BEATS; i++) { const v = B[(n - i) & 7]; if (v > a) { b = a; a = v; } else if (v > b) b = v; if (i === Analyser.BS_BAR) L = b; }
+      let hi = this.bsHi, lo = this.bsLo; if (!(hi === hi)) hi = lo = L;
+      if (!was) {
+        const back = L >= hi - Analyser.BS_IN_DB && hi - lo >= Analyser.BS_SPAN_DB;
+        this.bsInRun = back || L >= lo + Analyser.BS_RISE_DB ? this.bsInRun + 1 : 0;
+        if (this.bsInRun >= Analyser.BS_IN_BEATS) { this.secHigh = true; if (!back) hi = L; }
+      } else if (b <= hi - Analyser.BS_OUT_DB) { this.secHigh = false; this.bsInRun = 0; lo = L; }
+      if (this.secHigh) hi += (L - hi) / (L > hi ? Analyser.BS_HI_UP : Analyser.BS_HI_DN);
+      else { hi = L > hi ? L : hi + (L - hi) / Analyser.BE_MEM_BEATS; lo += (L - lo) / Analyser.BS_PART; }
+      if (lo > hi) lo = hi;
+      this.bsHi = hi; this.bsLo = lo;
+      const u = !this.secHigh && hi - lo >= Analyser.BS_SPAN_DB && L < hi - Analyser.BS_IN_DB ? (L - lo) / (hi - lo) : 0;   // framme vid refrängens referens = höjningen har skett
+      this.buildUp = u > 1 ? 1 : u > 0 ? u : 0;
+    }
+    if (this.secHigh !== was) this.sectionSet(this.secHigh ? 'high' : this.sectionTier === 0 ? 'low' : 'break', nowMs);
+  }
+
+  /** Byter sektion: den avslutade till minnet (medel-dB, kickar/s); refrängens dB blir referensen för levelVsHighDb. */
+  private sectionSet(label: string, nowMs: number): void {
+    const prev = this.section; if (label === prev) return;
+    const n = this.secCurDbN + (this.secBlkN > 0 ? 1 : 0);
+    const dbMean = n ? (this.secCurDbSum + (this.secBlkN > 0 ? 10 * Math.log10(this.secBlkRms2 / this.secBlkN + 1e-10) : 0)) / n : this.lastHighDb;
+    this.secLog.push({ label: prev, startMs: this.sectionStartMs, endMs: nowMs, db: dbMean, dens: this.secCurDbN ? this.secCurDens / this.secCurDbN : 0 });
+    if (this.secLog.length > 48) this.secLog.shift();
+    if (prev === 'high' && n) this.lastHighDb = dbMean;
+    this.prevSection = prev; this.secCurDbSum = 0; this.secCurDbN = 0; this.secCurDens = 0;
+    this.sectionStartMs = nowMs; if (label === 'high') { this.sectionIndex++; this.secHiStartMs = nowMs; } this.section = label;
+  }
+
   /** Blockets sardrag och etikett (1 s): den kalla delen av sectionHop, egen funktion sa att dess sallan korda grenar inte deoptimerar 100 Hz-ackumuleringen. */
   private sectionBlock(nowMs: number, breaking: boolean): void {
     const n = this.secBlkN || 1; const bInt = this.secBlkInt / n; const bKicks = this.secBlkKicks; const bCent = this.secBlkCent / n;
@@ -1246,67 +1295,17 @@ export class Analyser {
     this.secHist[this.secHistPos] = bInt; this.secHistPos = (this.secHistPos + 1) & 15; if (this.secHistN < 16) this.secHistN++;
     const rise = this.secHistN >= 9 ? bInt - this.secHist[(this.secHistPos - 9 + 16) & 15] : 0;
     this.secRiseRun = rise >= 0.10 ? this.secRiseRun + 1 : 0;
-    const sinceStart = nowMs - this.secSongStartMs; const dropEv = this.secDropsNow(); const dropped = dropEv !== this.secDropSeen; this.secDropSeen = dropEv;
-    const prev = this.section; let label: string;
-    {
-      // rang-lage: tier 2 = high, tier 0 = low, mitten = 'break' pa vag ner fran high, 'build' pa vag upp fran low/intro, annars kvar
-      // SECTION_BODY_HIGH aven i intro (DMX-fyndet 10-20: latgransen 0,1-7 s fore dropen nollade till intro, smallen nadde aldrig high):
-      // basen tillbaka = 'high' direkt och kvar tills rangen har 20 block.
-      if (this.secBlkDb.length < 20) label = Analyser.BODY_HIGH_MS > 0 && (dropped || prev === 'high') ? 'high' : 'intro';
-      else if (dropped || st === 2) label = 'high';
-      else if (st === 0) label = 'low';
-      else label = prev === 'high' || prev === 'break' ? 'break' : (prev === 'low' || prev === 'intro' || prev === 'build') ? 'build' : prev;
-      if (label === 'high' && !dropped && prev !== 'high' && sinceStart < Analyser.SECTION_EARLY_S * 1000 && this.secBlkDb.length >= 4) {
-        const D = this.secBlkDb, nb = D.length; const srt = D.slice().sort((a, b) => a - b); const med = srt[nb >> 1];
-        const m4 = (D[nb - 1] + D[nb - 2] + D[nb - 3] + D[nb - 4]) / 4;
-        if (m4 < med + Analyser.SECTION_EARLY_DB) label = prev === 'intro' || prev === 'low' || prev === 'build' ? 'build' : prev;
-      }
-      // MINNET (bit 2/8): nuet liknar ett tidigare parti -> det partiets tier (omrankad med dagens kunskap) vager in.
-      // INTRADE VIA LAG (bit 64): det forflutnas high-start + lag ar NU (-1,5..+1 s) -> high direkt, utan rangens 2-blocks-hysteres + 4 s-fonster
-      if ((Analyser.REPEAT & 64) && this.repeatSim >= Analyser.REPEAT_THR && this.repeatHighAtMs > 0 && st >= 1 && label !== 'high' && !dropped) {
-        const d = this.repeatHighAtMs - nowMs; if (d >= -1500 && d <= 1000) label = 'high';
-      }
-      // ATERINTRADE (REENTRY_PCT): nivan ar tillbaka pa refrangens och rangen nastan uppe -> high direkt (refrang 2 <= 4 s)
-      // KLANGMALL IN (bit 256): blocket later som refrangen hittills (och inte som resten) och rangen ar inte tydligt lag -> high direkt
-      // UPPEHALL I HIGH (bit 16 minne / bit 32 prior 8 takter): rangen dippar till mellan mitt i refrangen (4 s-fonster) -> high -> break -> high
-      // var 4 s (baslinjen: joaquinphoenix 24h 28b 32h 36b 45h mot referens high 27-102 s). Sa lange forra refrangen varade halls high; tier 0 slapper.
-      if ((Analyser.REPEAT & 48) && prev === 'high' && label === 'break' && st === 1) {
-        {
-          let hold = (Analyser.REPEAT & 16) ? Math.min(40000, this.secHighRunMs) : 0;
-          if ((Analyser.REPEAT & 32) && this.localBpm > 0) hold = Math.max(hold, 8 * 240000 / this.localBpm);
-          if (nowMs - this.sectionStartMs < hold) label = 'high';
-        }
-      }
-      // DROPEN HALLER HIGH (2026-11-03, DMX-fyndet 11-02: break med full bas efter dropen, high 66,2 -> break -> high 71,3 i ladan):
-      // dropped ger high i ett block, men rangens 4 s-fonster bar breakets block i RANK_WIN + RANK_RUN block till - sa lange halls
-      // 'high' efter en drop om tier >= 1; tier 0 slapper. Standard i koden sedan 11-03 (agaren; backup/fore-drop-hold-20261103).
-      if (dropped && label === 'high') this.secDropHoldUntil = nowMs + (Analyser.RANK_WIN + Analyser.RANK_RUN) * 1000;
-      else if (prev === 'high' && label !== 'high' && st >= 1 && nowMs < this.secDropHoldUntil) label = 'high';
-      // UTGANG VIA LAG (bit 128): det forflutnas high-SLUT + lag. Sa lange det forflutna fortfarande ar high halls high (st 1);
-      // nar slutet ar NU (-1,5..+1,5 s) och rangen inte langre sager high -> 'break' direkt (minnets grans i stallet for uppehallets slut).
-      // NIVAMINNE (LEVELREF, se flaggan): absolut referens fran refrang 1 i stallet for den troga percentilrangen. Drop vinner alltid.
-      // KLANGMALL UT (bit 512): high som bara halls (rangen sager inte high) men blocket later som icke-refrangen i TEMPL_RUN raka block -> break
-    }
-    // UPPEHALLSTID (09-20, forsta forsta hela laten: build/intro/low bytte var 1-3 s): ett byte kravs ha statt >= 4 s i nuvarande
-    // sektion, utom in i 'high' (drop/topp ska synas direkt) och ur 'high' till 'break' (svackan ar en flank).
-    // uppehallstid 8 s (var 4: build/low/high bytte var 4 s pa pop 14:30), utom in i 'high' (4 s) och high -> break (direkt)
-    const dwellMs = label === 'high' ? 4000 : 8000;
-    const dwellOk = nowMs - this.sectionStartMs >= dwellMs || (prev === 'high' && label === 'break') || (Analyser.BODY_HIGH_MS > 0 && dropped && label === 'high');
-    if (label !== prev && dwellOk) {
-      // MINNE: avslutad sektion till loggen (medel-dB, kickar/s); refrangens dB blir referensen for levelVsHighDb.
-      const dbMean = this.secCurDbN ? this.secCurDbSum / this.secCurDbN : blkDb;
-      this.secLog.push({ label: prev, startMs: this.sectionStartMs, endMs: nowMs, db: dbMean, dens: this.secCurDbN ? this.secCurDens / this.secCurDbN : 0 });
-      if (this.secLog.length > 48) this.secLog.shift();
-      if (prev === 'high') { this.lastHighDb = dbMean; }
-      this.prevSection = prev; this.secCurDbSum = 0; this.secCurDbN = 0; this.secCurDens = 0;
-      this.sectionStartMs = nowMs; if (label === 'high') { this.sectionIndex++; this.secHiStartMs = nowMs; } this.section = label;
-    }
+    // ETIKETTEN: in i och ut ur 'high' sätts av basens nivå (bassStep, per slag). Här bara partierna utanför refrängen ur rangens
+    // tier: 0 = 'low', annars 'break' efter en refräng och 'build' efter low/intro. Ett sådant byte kräver att partiet stått 8 s
+    // (09-20: build/intro/low bytte annars var 1-3 s) och minst 20 block historik (innan dess 'intro' eller det refrängen lämnade).
+    const prev = this.section;
+    if (!this.secHigh && this.secBlkDb.length >= 20 && nowMs - this.sectionStartMs >= 8000) this.sectionSet(st === 0 ? 'low' : prev === 'break' ? 'break' : 'build', nowMs);
     this.secCurDbSum += blkDb; this.secCurDbN++; this.secCurDens += bKicks;
-    if (this.secDump) { const row = [(nowMs - this.secSongStartMs) / 1000, blkDb, bKicks, bCent, bInt, breaking ? 1 : 0, dropped ? 1 : 0]; for (let i = 0; i < 8; i++) row.push(this.secBlkSpec[i] / n); row.push(st, ['intro', 'low', 'build', 'high', 'break'].indexOf(this.section)); this.secDump.push(row); }
+    if (this.secDump) { const row = [(nowMs - this.secSongStartMs) / 1000, blkDb, bKicks, bCent, bInt, breaking ? 1 : 0, 0]; for (let i = 0; i < 8; i++) row.push(this.secBlkSpec[i] / n); row.push(st, ['intro', 'low', 'build', 'high', 'break'].indexOf(this.section)); this.secDump.push(row); }
     if (this.section === 'high') { this.lastHighDb = this.secCurDbSum / this.secCurDbN; }   // pagaende refrang = farskaste referensen
     this.levelVsHighDb = Number.isFinite(this.lastHighDb) ? blkDb - this.lastHighDb : 0;
     this.predictHigh(nowMs, bInt);
-    if (this.dbgSecBlock) this.dbgSecBlock({ nowMs, section: this.section, sectionStartMs: this.sectionStartMs, prev, label, bpm: this.localBpm, bInt, bKicks, bCent, blkDb, buildUp: this.buildUp, riseRun: this.secRiseRun, rise, dropped, breaking, tier: this.sectionTier, repeatSim: this.repeatSim, repeatAgoMs: this.repeatAgoMs, repeatSection: this.repeatSection, spec: Array.from(this.secBlkSpec, (v) => v / n), lastHighDb: this.lastHighDb, expectHighMs: this.expectHighMs, expectSource: this.expectSource, beatPhaseMs: this.beatPhaseMs, secLogN: this.secLog.length, secLogLast: this.secLog[this.secLog.length - 1] ?? null, bBon, bBpk, bFlux, bDyn, bHigh, bFlat, pct: this.secPct });
+    if (this.dbgSecBlock) this.dbgSecBlock({ nowMs, section: this.section, sectionStartMs: this.sectionStartMs, prev, label: this.section, bpm: this.localBpm, bInt, bKicks, bCent, blkDb, buildUp: this.buildUp, riseRun: this.secRiseRun, rise, dropped: false, breaking, tier: this.sectionTier, repeatSim: this.repeatSim, repeatAgoMs: this.repeatAgoMs, repeatSection: this.repeatSection, spec: Array.from(this.secBlkSpec, (v) => v / n), lastHighDb: this.lastHighDb, expectHighMs: this.expectHighMs, expectSource: this.expectSource, beatPhaseMs: this.beatPhaseMs, secLogN: this.secLog.length, secLogLast: this.secLog[this.secLog.length - 1] ?? null, bBon, bBpk, bFlux, bDyn, bHigh, bFlat, pct: this.secPct });
     if (Analyser.REPEAT & 1) { this.repeatStep(nowMs, blkDb, bKicks, bCent, bInt); this.secBlkMs = 0; this.secBlkN = 0; this.secBlkInt = 0; this.secBlkKicks = 0; this.secBlkCent = 0; this.secBlkSpec.fill(0); this.secBlkRms2 = 0; this.secBlkBon = 0; this.secBlkBpk = 0; this.secBlkFlux = 0; this.secBlkRms4 = 0; return; }
     // klangavtryck var 4:e sekund
     let sum = 0; for (let i = 0; i < 8; i++) sum += this.secBlkSpec[i];
@@ -1518,8 +1517,7 @@ export class Analyser {
     for (let i = 0; i < 8; i++) r[o + R_SEC_SPEC0 + i] = g.spec[i];
     r[o + R_SEC_BON] = g.bon; r[o + R_SEC_BPK] = g.bpk; r[o + R_SEC_FLUX] = g.flux; r[o + R_SEC_RMS4] = g.rms4;
     // SECTION_AGG 'hop': fakta fran sista aggregerade hoppet (som sectionHop sag dem i odelat lage); 'env': vid skrivningen.
-    if (SECTION_AGG_HOP) { r[o + R_DROPS] = g.drops; r[o + R_ACTIVE] = g.active; r[o + R_BUILD] = g.build; }
-    else { r[o + R_DROPS] = this.dropCand + this.secBodyRet; r[o + R_ACTIVE] = this.activeMs; r[o + R_BUILD] = this.buildUp; }
+    r[o + R_ACTIVE] = SECTION_AGG_HOP ? g.active : this.activeMs;
     r[o + R_FLAGCNT] = packFlagCounts(this.flagCnt);
     r[o + R_CLOCK] = this.localBpm; r[o + R_CLOCK_CONF] = this.localBpmConfidence;   // EN KÄLLA (r0): klockans tempo/tillit till långsamma sidan
     r[o + R_BIGSEQ] = this.bigSeq;                         // stora vägen: hop-record före detta (workern kör dem först)
@@ -1544,7 +1542,7 @@ export class Analyser {
     this.beatPhaseMs = s[S_PHASE_MS]; this.beatPhaseConf = s[S_PHASE_CONF];
     this.section = SECTIONS[s[S_SECTION]] || 'intro'; this.sectionStartMs = s[S_SEC_START]; this.sectionIndex = s[S_SEC_INDEX]; this.sectionTier = s[S_SEC_TIER];
     this.repeatSim = s[S_REP_SIM]; this.repeatAgoMs = s[S_REP_AGO]; this.repeatSection = SECTIONS[s[S_REP_SEC]] || '';
-    this.expectHighMs = s[S_EXPECT_MS]; this.expectSource = s[S_EXPECT_SRC]; this.prevSection = SECTIONS[s[S_PREV_SEC]] || ''; this.levelVsHighDb = s[S_LVL_HIGH];
+    this.expectHighMs = s[S_EXPECT_MS]; this.expectSource = s[S_EXPECT_SRC]; this.prevSection = SECTIONS[s[S_PREV_SEC]] || ''; this.levelVsHighDb = s[S_LVL_HIGH]; this.buildUp = s[S_BUILD];
   }
   setInlinePeer(slow: Analyser | null): void { this.inlinePeer = slow; }
   /** Halsa for /api/live: hur langt efter workern ligger (records och ms), dess kostnad per record, tappade records. */
@@ -1596,7 +1594,7 @@ export class Analyser {
         s[S_PHASE_MS] = this.beatPhaseMs; s[S_PHASE_CONF] = this.beatPhaseConf;
         s[S_SECTION] = sectionCode(this.section); s[S_SEC_START] = this.sectionStartMs; s[S_SEC_INDEX] = this.sectionIndex; s[S_SEC_TIER] = this.sectionTier;
         s[S_REP_SIM] = this.repeatSim; s[S_REP_AGO] = this.repeatAgoMs; s[S_REP_SEC] = sectionCode(this.repeatSection);
-        s[S_EXPECT_MS] = this.expectHighMs; s[S_EXPECT_SRC] = this.expectSource; s[S_PREV_SEC] = sectionCode(this.prevSection); s[S_LVL_HIGH] = this.levelVsHighDb;
+        s[S_EXPECT_MS] = this.expectHighMs; s[S_EXPECT_SRC] = this.expectSource; s[S_PREV_SEC] = sectionCode(this.prevSection); s[S_LVL_HIGH] = this.levelVsHighDb; s[S_BUILD] = this.buildUp;
         s[S_PROCESSED] = this.slowProcessed; s[S_LAG_MS] = lagMs; s[S_LAG_MAX] = this.slowLagMaxMs; s[S_BUSY_US] = this.slowBusyEmaUs; s[S_BUSY_MAX_US] = this.slowBusyMaxUs; s[S_SKIPPED] = this.slowSkipped; s[S_LOST_FLAGS] = this.slowLostFlags;
       });
       if (this.syncWorker) Atomics.notify(ctrl, C_STATE_SEQ);
@@ -1623,7 +1621,7 @@ export class Analyser {
     const s = this.bigCopy;
     if (!this.bigRd.read(ctrl, this.bigState!, s, C_BIG_SEQ) || s[BS_SEQ] === 0) return;
     this.hBody = s[BS_BODY]; this.dropCount = s[BS_DROPS]; this.miniDropCount = s[BS_MINI];
-    this.dropDemoted = s[BS_DEMOTED]; this.dropSpaced = s[BS_SPACED]; this.dropRiseDb = s[BS_DROPRISE]; this.nearDropDb = s[BS_NEAR]; this.nearDipDb = s[BS_NEARDIP]; this.liftDb = s[BS_LIFT]; this.stopCount = s[BS_STOPS]; this.stopS = s[BS_STOPSEC]; this.buildUp = s[BS_BUILD]; this.hInRiser = s[BS_RISER] === 1;
+    this.dropDemoted = s[BS_DEMOTED]; this.dropSpaced = s[BS_SPACED]; this.dropRiseDb = s[BS_DROPRISE]; this.nearDropDb = s[BS_NEAR]; this.nearDipDb = s[BS_NEARDIP]; this.liftDb = s[BS_LIFT]; this.stopCount = s[BS_STOPS]; this.stopS = s[BS_STOPSEC]; this.hInRiser = s[BS_RISER] === 1;
     const p = this.outProfile; p.punch = s[BS_PUNCH]; p.bass = s[BS_BASS]; p.bright = s[BS_BRIGHT]; p.beat = s[BS_BEAT]; p.bassline = s[BS_BASSLINE];
     const sn = s[BS_SPEC_N];
     if (sn > this.specDelivered) {
@@ -1667,7 +1665,7 @@ export class Analyser {
       const p = this.outProfile;
       stateWrite(ctrl, this.bigState!, (s) => {
         s[BS_SEQ] = this.bigSeq; s[BS_BODY] = this.hBody; s[BS_DROPS] = this.dropCount; s[BS_MINI] = this.miniDropCount; s[BS_CAND] = this.dropCand;
-        s[BS_DEMOTED] = this.dropDemoted; s[BS_SPACED] = this.dropSpaced; s[BS_DROPRISE] = this.dropRiseDb; s[BS_NEAR] = this.nearDropDb; s[BS_NEARDIP] = this.nearDipDb; s[BS_LIFT] = this.liftDb; s[BS_STOPS] = this.stopCount; s[BS_STOPSEC] = this.stopS; s[BS_BUILD] = this.buildUp; s[BS_RISER] = this.hInRiser ? 1 : 0;
+        s[BS_DEMOTED] = this.dropDemoted; s[BS_SPACED] = this.dropSpaced; s[BS_DROPRISE] = this.dropRiseDb; s[BS_NEAR] = this.nearDropDb; s[BS_NEARDIP] = this.nearDipDb; s[BS_LIFT] = this.liftDb; s[BS_STOPS] = this.stopCount; s[BS_STOPSEC] = this.stopS; s[BS_RISER] = this.hInRiser ? 1 : 0;
         s[BS_PUNCH] = p.punch; s[BS_BASS] = p.bass; s[BS_BRIGHT] = p.bright; s[BS_BEAT] = p.beat; s[BS_BASSLINE] = p.bassline; s[BS_SPEC_N] = this.specN; s[BS_SKIPPED] = this.bigSkipped;
       }, C_BIG_SEQ);
       if (this.syncWorker) Atomics.notify(ctrl, C_BIG_SEQ);
@@ -1690,7 +1688,7 @@ export class Analyser {
     const sp = this.secSpecHop;   // bandDbRaw ändras bara i bigStep (var 3:e hop): räkna om då, samma värden
     if (this.secSpecDirty) { this.secSpecDirty = false; for (let i = 0; i < 8; i++) sp[i] = Math.pow(10, this.bandDbRaw[i] / 20); }
     const g = this.secAgg; g.n++; g.int += intensity; if (kick) g.kicks++; g.rms2 += rms * rms; g.cent += this.centSmooth; g.dt += this.dtHop * 1000;
-    g.breaking = breaking ? 1 : 0; g.wall = wall; g.drops = this.dropCand + this.secBodyRet; g.active = this.activeMs; g.build = this.buildUp;
+    g.breaking = breaking ? 1 : 0; g.wall = wall; g.active = this.activeMs;
     for (let i = 0; i < 8; i++) g.spec[i] += sp[i];
   }
   /** Snabba sidans kommandon i exakt den ordning de restes (virtuell klocka forst: den nollar ankare som resten skriver). */
@@ -1722,7 +1720,6 @@ export class Analyser {
     this.envFilled = Math.min(this.envFilled + 1, Analyser.ENV_LEN);
     if (this.bigOn) {   // stora vägen: sektionens fakta och blocksummor ur den egna hopvägen (hoppen före recordet är redan körda)
       const g = this.secAgg;
-      if (g.n > 0) this.secVDrops = g.drops;
       this.envStep();
       if (g.n > 0) {
         const I = this.shIn; I.hops = g.n; I.intSum = g.int; I.kicks = g.kicks; I.breaking = g.breaking > 0; I.nowMs = g.wall; I.dtMs = g.dt; I.rms2Sum = g.rms2; I.centSum = g.cent;
@@ -1733,7 +1730,7 @@ export class Analyser {
       return;
     }
     const secN = r[o + R_SEC_N] > 0;
-    if (!SECTION_AGG_HOP || secN) { this.dropCand = r[o + R_DROPS]; this.activeMs = r[o + R_ACTIVE]; this.buildUp = r[o + R_BUILD]; }
+    if (!SECTION_AGG_HOP || secN) this.activeMs = r[o + R_ACTIVE];
     this.envStep();
     if (secN)
     { const I = this.shIn; I.hops = r[o + R_SEC_N]; I.intSum = r[o + R_SEC_INT]; I.kicks = r[o + R_SEC_KICKS]; I.breaking = r[o + R_SEC_BREAK] > 0; I.nowMs = r[o + R_SEC_WALL];
@@ -1956,7 +1953,7 @@ export class Analyser {
         this.bigRing = new Float64Array(splitBuf.big); this.bigPcm = new Float32Array(splitBuf.bigPcm); this.bigState = new Float64Array(splitBuf.bigState); this.specRing = new Float32Array(splitBuf.spec);
         if (this.role === 'slow') {   // omstart av workern: fortsätt i sekvensen, med räknarna (en drop-räknare som hoppar bakåt vore en ny 'drop')
           const sq = Atomics.load(v.ctrl, C_BIG_SEQ); if (sq & 1) Atomics.store(v.ctrl, C_BIG_SEQ, sq + 1);
-          const st = this.bigState; this.bigSeq = st[BS_SEQ]; this.dropCount = st[BS_DROPS]; this.miniDropCount = st[BS_MINI]; this.specN = st[BS_SPEC_N]; this.dropCand = st[BS_CAND]; this.secVDrops = this.dropCand;
+          const st = this.bigState; this.bigSeq = st[BS_SEQ]; this.dropCount = st[BS_DROPS]; this.miniDropCount = st[BS_MINI]; this.specN = st[BS_SPEC_N]; this.dropCand = st[BS_CAND];
           this.dropDemoted = st[BS_DEMOTED]; this.dropSpaced = st[BS_SPACED]; this.stopCount = st[BS_STOPS];
         }
       }
@@ -2775,9 +2772,7 @@ export class Analyser {
         this.lastBodyGoneMs = nowWallA;
       }
     } else {
-      if (Analyser.BODY_HIGH_MS > 0 && this.bodyGoneMs >= Analyser.BODY_HIGH_MS) this.secBodyArmMs = nowWallA;
       if (this.bodyGoneMs > 0) this.lastGoneSpanMs = this.bodyGoneMs; this.bodyGoneMs = 0;
-      if (this.secBodyArmMs > 0) { if (nowWallA - this.secBodyArmMs > 2000) this.secBodyArmMs = 0; else if (this.bodyEnv >= this.bodyPeak - Analyser.BODY_HIGH_DB) { this.secBodyRet++; this.secBodyArmMs = 0; } }
     }
     // STIGNINGSTAKT över 0.5 s (ringbuffert, ingen allokering).
     const hist = this.bodyHist, HL = hist.length;
@@ -3001,7 +2996,7 @@ export class Analyser {
     }
   }
 
-  /** Uppbyggnad/riser (spektral novelty + klang/niva). Returnerar inRiser och uppdaterar buildUp. */
+  /** Riser (spektral novelty + klang/niva). Returnerar inRiser. (Uppbyggnadens förlopp, frame.buildUp, mäts i bassStep.) */
   private riserStep(): boolean {
     const nowWallA = this.hNowWall;
     const dtHop = this.dtHop;
@@ -3025,14 +3020,6 @@ export class Analyser {
         novRiser
         || (this.centSmooth > this.centSlow + 0.06 && this.lvlSmooth > this.lvlSlowR + 0.04 && this.lvlSmooth > 0.4)
       );
-    // Stampla uppbyggnaden. OBS: drop-villkoret ovan kraver INTE en riser — det
-    // kravet ar avstangt (se dar). Stampeln halls uppdaterad for att kravet ska
-    // kunna aterinforas nu nar riser-signalen faktiskt lever (se `bandDb`).
-    // Nagot "4000 ms-fonster" finns inte i filen; den formuleringen var kvar
-    // fran en tidigare version av villkoret.
-    const bTarget = inRiser ? 1 : 0;
-    const bRate = bTarget > this.buildUp ? dtHop / 3.5 : dtHop / 1.0;   // bygg ~3.5s, klinga ~1s
-    this.buildUp += Math.max(-bRate, Math.min(bRate, bTarget - this.buildUp));
     return inRiser;
   }
 
@@ -3074,7 +3061,7 @@ export class Analyser {
         if (this.secSpecDirty) { this.secSpecDirty = false; for (let i = 0; i < 8; i++) sp[i] = Math.pow(10, this.bandDbRaw[i] / 20); }
         if (this.role === 'fast') {
           const g = this.secAgg; g.n++; g.int += intensity; if (kick) g.kicks++; g.rms2 += rms * rms; g.cent += this.centSmooth; g.dt += this.dtHop * 1000;
-          g.breaking = breaking ? 1 : 0; g.wall = this.wallNow(); g.drops = this.dropCand + this.secBodyRet; g.active = this.activeMs; g.build = this.buildUp;
+          g.breaking = breaking ? 1 : 0; g.wall = this.wallNow(); g.active = this.activeMs;
           for (let i = 0; i < 8; i++) g.spec[i] += sp[i];
         } else { const I = this.shIn; I.hops = 1; I.intSum = intensity; I.kicks = kick ? 1 : 0; I.breaking = breaking; I.nowMs = this.wallNow(); I.dtMs = this.dtHop * 1000;
           I.rms2Sum = rms * rms; I.centSum = this.centSmooth; I.specOff = 0; I.bonSum = 0; I.bpk = 0; I.fluxSum = 0; I.rms4Sum = 0; this.sectionHop(sp); }
diff --git a/src/effects.ts b/.arena/bygg/b3/src/effects.ts
index 8e0561d..937cedd 100644
--- a/src/effects.ts
+++ b/.arena/bygg/b3/src/effects.ts
@@ -596,7 +596,7 @@ export class EffectEngine {
    private tickNow = false; private rNowP = 0; private rNowWall = 0; private rDt = 0; private rDtT = 0; private rBeatMs = 0; private rBeatEnv = 0; private rDTarget = 0; private rMd = 0; private rT = 0; private rAnchorHue = 0; private rDrive = 0; private rInputGate = 0;   // RUTANS TAL (se EN KLOCKA PER RUTA): fält i stället för argument - ett decimaltal som skickas till en metod packas in (GC-jakten 10-16)
   private anaDropAt = -1e12;   // analysatorns drop som blev minidrop (se REFRÄNGEN DIREKT EFTER EN MINIDROP-DROP)
   private nearAt = -1e12; nearCount = 0;   // NASTAN-DROP
-  private secCeil = 1; private histAt = -1e12; private rampLvl = 0; private levelRamp = 1; private buildLookAt = 0; private buildSecAt = 0; private buildSecSeen = 0; buildProg = 0; buildUpgrades = 0;   // BUILD SOM HÅLLER OCH LANDAR
+  private secCeil = 1; private histAt = -1e12; private rampLvl = 0; private levelRamp = 1; private buildLookAt = 0; buildUpgrades = 0;   // BUILD SOM HÅLLER OCH LANDAR
   private miniBodyFast = -90; private miniBodySlow = -90; private miniPre = -90; private miniPeak = -200;   // minidrop efter energin
   private miniBangUntil = 0; private lastMiniWall = -1e12; private miniColEnv = 0; private miniLiftUntil = 0; private dropLiftUntil = 0; private liftAt = -1e12; liftCount = 0; private prevRawSec = ''; private lastHighWall = -1e12;   // ENERGILYFT + SEKTIONSLYFT   // minidrop-flank + kort stot
   private dropBangUntil = 0;     // drop-fönster (max-håll upp till ~8s efter träff)
@@ -1622,7 +1622,7 @@ export class EffectEngine {
     this.showVel = Math.min(5, this.showVel * friction + this.pendingKick * 2.0);
     this.pendingKick = 0;
     // upp till 2.5× snabbare vid full uppbyggnad + kick-ryck ovanpå
-    this.showTime += _dtT * (1 + Math.max(frame.buildUp, this.buildProg) * 1.5 + this.showVel);
+    this.showTime += _dtT * (1 + frame.buildUp * 1.5 + this.showVel);
     const t = this.showTime;
     if (kickHit) this.lastKickBoost = nowP;
 
@@ -2000,14 +2000,9 @@ export class EffectEngine {
     // 32:a slag som grupperingen. Svep, pendlar och ekon går då åt olika håll; c.group (två grupper) är oförändrad.
     const ordSel = (this.smartCount * 3 + (beatIdx >> 5)) & 3;
     ctx.beatHit = beatHit; ctx.hasBeat = hasBeat;
-    // UPPBYGGNADENS FÖRLOPP (ladan 10-11 22:05: "kändes inte som den laddade för en drop"): analysatorns buildUp är död på ladans
-    // material (max 0,17 på 115 min), så build-effekterna trappade aldrig upp. buildProg = slag sedan sektionen blev build / 32
-    // (0..1), räknat från uppbyggnadens START (inte lookens - looken kan bytas mitt i), håller över < 2 s sektionsfladder.
-    { const nw = nowWall;
-      if (frame.section === 'build') { if (this.buildSecAt === 0 || nw - this.buildSecSeen > 2000) this.buildSecAt = nw; this.buildSecSeen = nw; }
-      const beatMs = rawBeatMs > 0 ? rawBeatMs : 500;
-      this.buildProg = this.buildSecAt > 0 && nw - this.buildSecSeen <= 2000 ? Math.min(1, (nw - this.buildSecAt) / (32 * beatMs)) : 0; }
-    ctx.wavePhase = this.wavePhase; ctx.buildUp = Math.max(frame.buildUp, this.buildProg);
+    // UPPBYGGNADENS FÖRLOPP: analysatorn mäter det (frame.buildUp = basens nivå på väg från partiets mot refrängens referens);
+    // effekterna läser c.buildUp och trappar upp efter det. Motorn räknar inget eget förlopp.
+    ctx.wavePhase = this.wavePhase; ctx.buildUp = frame.buildUp;
     ctx.phaseSpread = 1 + ctx.buildUp * 2.5; ctx.punchFloor = punchFloor;
     ctx.chasePos = this.chasePos; ctx.dropFired = this.dropFired;
     ctx.dropHue = this.dropHue; ctx.now = nowP;
@@ -2075,7 +2070,7 @@ export class EffectEngine {
     {
       const sec = frame.section ?? '';
       const vc = Math.max(0.3, Math.min(1, this.cfg.verseCeil ?? SEC_CEIL)), bc = Math.max(vc, SEC_CEIL_BUILD);   // "Tak i vers" i /setup
-      let tgt = sec === 'high' || sec === '' ? 1 : sec === 'build' ? vc + (bc - vc) * this.buildProg : vc;
+      let tgt = sec === 'high' || sec === '' ? 1 : sec === 'build' ? vc + (bc - vc) * frame.buildUp : vc;
       if (nowWall < this.dropBangUntil) { tgt = 1; this.secCeil = 1; }                       // dropen direkt till fullt som minidropen (ladan 10-30: 'lyfter först som en minidrop, sen drop' = taket klättrade 0,3 s)
       else if (this.dropColEnv > 0.005 || nowWall < this.dropLiftUntil + DROP_LIFT_FALL_MS) tgt = 1;   // dropen alltid fullt
       else if (nowWall < this.miniBangUntil) { tgt = 1; this.secCeil = 1; }                   // minidrop-looken alltid till 95 % (ägaren 10-12), direkt
diff --git a/src/split.ts b/.arena/bygg/b3/src/split.ts
index 8e50741..4b39494 100644
--- a/src/split.ts
+++ b/.arena/bygg/b3/src/split.ts
@@ -87,8 +87,9 @@ export function seqDelta(ctrlLow: number, mySeq: number): number { return (ctrlL
 export const S_REC_SEQ = 0, S_BPM = 1, S_CONF = 2, S_BPMF = 3, S_PHASE_MS = 4, S_PHASE_CONF = 5, S_SECTION = 6, S_SEC_START = 7,
   S_SEC_INDEX = 8, S_SEC_TIER = 9, S_REP_SIM = 10, S_REP_AGO = 11, S_REP_SEC = 12, S_PROCESSED = 13, S_LAG_MS = 14, S_LAG_MAX = 15,
   S_BUSY_US = 16, S_BUSY_MAX_US = 17, S_SKIPPED = 18, S_EXPECT_MS = 19, S_EXPECT_SRC = 20, S_PREV_SEC = 21, S_LVL_HIGH = 22,
-  S_LOST_FLAGS = 23 /* flaggor aterskapade ur raknarna efter tapp */;
-export const STATE_LEN = 24;
+  S_LOST_FLAGS = 23 /* flaggor aterskapade ur raknarna efter tapp */,
+  S_BUILD = 24 /* uppbyggnaden (frame.buildUp): mäts i sektionssteget ur basens nivå mellan partiets och refrängens referens */;
+export const STATE_LEN = 25;
 
 export const SECTIONS = ['', 'intro', 'low', 'build', 'high', 'break'];
 export function sectionCode(s: string): number { const i = SECTIONS.indexOf(s); return i < 0 ? 0 : i; }
```
