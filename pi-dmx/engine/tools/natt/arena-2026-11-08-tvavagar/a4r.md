# a4r – r-portbar (remix av r0)

## IDÉN
r0 är kärnan, oförändrad i sak. Jag har gått igenom alla rader i de tre delade filerna (analyser.ts, split.ts, slowWorker.ts) mot lotus. lotus har ingen taktväg, FAST_BANDS är av och SECTION_AGG är 'env'. Allt som var lotus-neutralt behölls. Jag lade till två saker som också är lotus-neutrala och inte behöver några profilvärden:
- en bit-identisk snabbare lågbandsfilterbank
- att stora vägens buffertar bara allokeras när stora vägen kan slås på

Beviset är ett eget paritetsprov (`verktyg/paritet.sh`). Det kör lotus egen analysatorprofil mot dagens engine/src. Det jämför md5 över varje ram (JSON), cfg.beat och låtgränsens spektrum, hop för hop med virtuell klocka. Proven:
- **lotus-profil**, engine/src mot a4r, lägena all/inline/synk, lang1021 och lang1011 à 120 s: **identiskt i alla 6 körningar.** Därmed är r0:s alla delar plus mina lotus-neutrala, och lotus ljus ändras inte av en portning.
- **DMX-profil**, r0 mot a4r, inline och synk på samma filer: **identiskt.** a4r gör alltså samma uppgift som r0.

## DELAR
| del | ursprung | mått den bär |
|---|---|---|
| Hela r0 (stora vägen, två trådar, StateReader, a7/a2/a8-småvinster, a5:s etta, GRID_EARLY_MS) | r0 | cpu 0,570, ettan +100, gridfel +59,1, grid40 +3,8, latens +15 (ranking-r1) |
| **Lågbandens tre biquad-kaskader i EN loop** (fastBandStep): tre oberoende beroendekedjor per sampel överlappar, samma uttryck i samma ordning, ingångshistoriken hålls en gång | a4r | cpu: mikroprov 4,33/4,53 → 3,55/3,68 µs/hop (−0,8 µs ≈ 2 % av huvudtråden), bit-identiskt (`verktyg/biquad.mjs`, 2000 hop) |
| **Stora vägens buffertar bara när den kan slås på** (`createSplitBuffers(hopLane, big)`, `Analyser.bigPathPossible()` = konstruktorns eget villkor FAST_BANDS och SECTION_AGG 'hop') | a4r | lotus: −2,3 MB SAB som aldrig lästes; inget mått |
| Lotus-paritetsprov (lotus profil inbyggd i en kopia; frame-md5 i tre lägen) | a4r | ingår inte i domaren; det är beviset för kortet |

## BORTVALT
- **Min r1-väckning** (workern väntar själv: snurra på Windows med lastspärr, futex-tupplurar på Linux). Den är provad på r0 i egna parkörningar och full fart. Med r0:s två trådar räcker det inte att taktvägen snurrar, eftersom analysatortråden också vill väckas varje hop (feed() väcker alla). Notify blev 0,98 mot 0,99 per hop. 1 ms-tupplurar för analysatortråden på Windows gjorde ≥ 2 hop efter **sämre** (17–19 % mot 9–13 %). Linux-tupplurarna kan inte provas här, och på Pi:ns 2 kärnor vore 20 000 väckningar/s en risk för huvudtråden. Därför bort helt: a4r väcker exakt som r0.
- **Utfyllnad av record och kontrollrader till cache-linjer** (r1): ingen mätbar vinst, och den ändrar index som lotus måste porta.
- **a1m2 / taktmatningens nya tempogram**: ligger bara i beatFeed.ts, som lotus inte har. Det är inte kortets sak och skulle krocka med a5:s etta i r0.
- **a6:s låtgräns**: ljusdomaren −1,2 och upp_s −100 %.

## DOMARENS RAD (mätning 1 av 3, övning)
`| a4r | +17.34 | långsamma +10.18 | snabba +28.08 | cpu +41.16 | latens +15.00 | bonus 0 | 41.67 us/hop | 85 ms | p99 4 hop | md5 skiljer | ljusdomaren -0.3 | - |`
- **Marginal mot r0: 17,34 − 17,70 = −0,36.** Ljuset är bit-identiskt med r0, så hela skillnaden är cpu-kvoten: 0,588 mot r0:s 0,570. Basens körningar spred 62,8–77,1 µs/hop i samma mätning, och bruset bas mot bas är 2,5 %, så skillnaden ligger inom bruset. Biquad-vinsten (~2 %) syns inte genom det.
- Realtid: worker p99 **4 hop** (r0: 5 = X, marginal noll). ≥ 2 hop 12,1 %, väckning 52 µs/hop.
- De 16 kvalitetsmåtten och latensen är exakt som r0. Ljusdomaren −0,28 är samma ljus som r0.

## RISKER PÅ PI:N
- Allt r0:s gäller oförändrat: tre trådar på CPUAffinity 1 2, stora vägens fält 1–2 hop sena i realtid, och ettans marginal på riktig musik.
- Den sammanflätade biquad-loopen har ~57 levande flyttal. Det ryms i ARM64:s 32 FP-register med viss spill, och vinsten på Pi:n är inte mätt. Resultatet är bit-identiskt oavsett, eftersom det är samma IEEE-operationer i samma ordning.
- Paritetsprovet är kört på PC (x64, Node 22), inte på Pi:n (ARM, Node 24). md5 bör tas på Pi:n vid portningen.
- **Portning till lotus:** de tre delade filerna går över som de är. Lotus-profilen behöver bara typfälten `slowHopFeedModule?`/`slowHopFeed?` i sitt `AnalyserProfile`-gränssnitt, eftersom DMX:s profilgränssnitt har dem. Inget profilvärde behövs.
- Lotus utcheckade kopia (lotus-light-link) ligger redan efter DMX:s delade filer (md5 skiljer i dag). Portningen tar alltså med allt sedan dess, inte bara arenan.

## DIFFEN
`git diff --no-index src .arena/tvavagar/a4r/src`, med sökvägarna skrivna som `a/src` och `b/src`. Den går att applicera med `git apply` på en kopia av engine/src, och det är provat: resultatet är identiskt med a4r/src.

```diff
diff --git a/src/analyser.ts b/src/analyser.ts
index fe534dd..b3c1f57 100644
--- a/src/analyser.ts
+++ b/src/analyser.ts
@@ -24,7 +24,10 @@ import {
   C_WRITE, C_READ, S_REC_SEQ, S_BPM, S_CONF, S_BPMF, S_PHASE_MS, S_PHASE_CONF, S_SECTION, S_SEC_START, S_SEC_INDEX, S_SEC_TIER,
   S_REP_SIM, S_REP_AGO, S_REP_SEC, S_EXPECT_MS, S_EXPECT_SRC, S_PREV_SEC, S_LVL_HIGH, S_PROCESSED, S_LAG_MS, S_LAG_MAX, S_BUSY_US, S_BUSY_MAX_US, S_SKIPPED, STATE_LEN,
   SECTIONS, sectionCode, viewsOf, stateWrite, stateRead, createSplitBuffers, type SplitBuffers, type WorkerData,
-  C_WAKE, syncWait, HopLaneFast, HopLaneSlow, type HopFeed,
+  C_WAKE, syncWait, HopLaneFast, HopLaneSlow, StateReader, type HopFeed,
+  R_BIGSEQ, BIG_REC_LEN, BIG_RING_N, BIG_HOP_MAX, B_SEQ, B_N, B_RMS, B_LVL, B_CENT, B_ACTIVE, B_WALL, B_KICK, B_KICKHIT, B_INT, B_BREAK, B_SEC, B_LVH, B_CONF,
+  B_ENVF, B_ENVBPM, C_WAITING_B, C_BIG_WRITE, C_BIG_READ, C_BIG_SEQ, BS_SEQ, BS_BODY, BS_DROPS, BS_MINI, BS_BUILD, BS_RISER, BS_PUNCH, BS_BASS, BS_BRIGHT, BS_BEAT,
+  BS_BASSLINE, BS_SPEC_N, BS_SKIPPED, BIG_STATE_LEN, SPEC_SLOTS, SPEC_MAX,
 } from './split.js';
 import FFT from "fft.js";
 
@@ -330,7 +333,8 @@ export class Analyser {
   private fftBig!: FFT;
   private windowBig!: Float32Array;
   private windowedBig!: Float32Array;   // scratch (återanvänds, ingen alloc/frame)
-  private bufferBig!: Float32Array;     // egen glidande buffert (matas samma hops)
+  private bufferBig!: Float32Array;     // egen glidande buffert (matas samma hops) - RING (a7): äldsta sampel vid bigPos
+  private bigPos = 0;
   private prevMagBig!: Float32Array;    // för per-band flux
   private magBig!: Float32Array;        // scratch magnitud
   private magBigMax = 0;                // högsta bin någon läser (band 8-taket)
@@ -366,12 +370,15 @@ export class Analyser {
    *  onset-medianens steg, uppvärmning), räknade per hop. Mätt 10-21 (faltLatens, 2 filer): specAbs.kick 21 -> 5 ms, onset.kick 27 -> 5,
    *  onset.treble 21 -> 3 ms efter ljudet. */
   private static readonly FAST_BANDS = sysEnv('FAST_BANDS') === '1';
+  /** Kan stora vägen slås på (konstruktorns villkor utan buffertarna)? createAnalyser allokerar bara då dess buffertar (a4r). */
+  static bigPathPossible(): boolean { return Analyser.FAST_BANDS && SECTION_AGG_HOP; }
   private static readonly FB_TAU_MS = [12, 6, 3];
   private static readonly FB_K = [385, 475, 313, 1.46, 1.62, 1.8, 2.03, 2.12];   // 2048-medel / snabbt medel, median över 4 ladan-inspelningar (+-2 dB mellan filerna)
   private fbMag = new Float32Array(256); private fbPrevMag = new Float32Array(256);
   private fbLo = new Int32Array(8); private fbHi = new Int32Array(8);
   private fbCoef = new Float64Array(3 * 2 * 5);   // per lågband: HP-biquad + LP-biquad (b0 b1 b2 a1 a2)
   private fbState = new Float64Array(3 * 2 * 4); // x1 x2 y1 y2 per biquad
+  private fbPw = new Float64Array(3);            // lågbandens effektsumma i hoppet (fastBandStep, de tre banden i en loop)
   private fbPow = new Float64Array(3); private fbPrevAmp = new Float64Array(3); private fbA = new Float64Array(3);
   private fbAbs = new Float32Array(8); private fbDbRaw = new Float32Array(8); private fbLvl = new Float32Array(8); private fbOn = new Float32Array(8);
   private fbPeak = new Float32Array(8).fill(1e-4); private fbOnMed = new Float32Array(8); private fbOnMad = new Float32Array(8);
@@ -626,7 +633,7 @@ export class Analyser {
   // ── DELAD ANALYSATOR (split.ts) ─────────────────────────────────────────────────────────────
   readonly role: 'all' | 'fast' | 'slow';
   private splitCtrl: Int32Array | null = null; private splitRing: Float64Array | null = null; private splitState: Float64Array | null = null;
-  private stateCopy = new Float64Array(STATE_LEN);
+  private stateCopy = new Float64Array(STATE_LEN); private stateRd = new StateReader();   // a7: kopian bara när blocket ändrats
   private recSeq = 0;              // fast: senast skrivna record; slow: senast lasta. JS-tal, wrap-sakert (split.ts seqDelta)
   private barrierSeq = 0;          // fast: tillstand aldre an detta record ignoreras (en flagga ar pa vag)
   private pendFlags = 0; private pendHintMs = 0; private pendVclock = 0;
@@ -648,6 +655,17 @@ export class Analyser {
   private shIn = { hops: 0.5, intSum: 0.5, kicks: 0.5, breaking: false, nowMs: 0.5, dtMs: 0.5, rms2Sum: 0.5, centSum: 0.5, specOff: 0.5, bonSum: 0.5, bpk: 0.5, fluxSum: 0.5, rms4Sum: 0.5 };
   private secAgg = { n: 0, int: 0, kicks: 0, breaking: 0, rms2: 0, cent: 0, dt: 0, wall: 0, drops: 0, active: 0, build: 0, spec: new Float64Array(8), bon: 0, bpk: 0, flux: 0, rms4: 0 };
   private inlinePeer: Analyser | null = null;
+  /** STORA VÄGEN (split.ts, a3): 2048-FFT, drop, riser, profil, basgång och sektionsaggregat i långsamma tråden, ett record per hop.
+   *  fast: skriver recordet och läser tillbaka; slow: kör stegen. Bara med FAST_BANDS + SECTION_AGG 'hop' och split-buffertarna. */
+  readonly bigOn: boolean = false;
+  private bigRing: Float64Array | null = null; private bigPcm: Float32Array | null = null; private bigState: Float64Array | null = null; private specRing: Float32Array | null = null;
+  private bigSeq = 0; private bigCopy = new Float64Array(BIG_STATE_LEN); private bigRd = new StateReader(); private specCopy = new Float32Array(0); private specDelivered = 0; private specN = 0; private bigSkipped = 0;
+  private bigEnvFlag = 0; private bigEnvBpm = 0.5;
+  /** Snabba sidans syn på långsamma värden vid hoppet (drop/profil/basgång läser dessa i stället för de levande fälten). */
+  private dSec = 'intro'; private dLvh = 0.5; private dConf = 0.5; private dBpm = 0.5;
+  /** slow + stora vägen: sektionens syn på drop-räknaren (som R_DROPS förr: värdet vid förra env-recordet). */
+  private secVDrops = 0;
+  private secSpecDirty = true;
   private slowBusyEmaUs = 0; private slowBusyMaxUs = 0; private slowLagMaxMs = 0; private slowSkipped = 0; private slowProcessed = 0;
   private localBpm = 0;
   private localBpmConfidence = 0;
@@ -1271,11 +1289,13 @@ export class Analyser {
    *  mot 8 s tidigare. Upprepning: ett klangavtryck per 4 s (8 band normerade + centroid + kicktathet + intensitet, L2)
    *  jamfors med alla avtryck >= 16 s tillbaka (max 96 = 6,4 min); bast cosinus -> repeatSim/repeatAgoMs/repeatSection.
    *  Kostnad: nagra adds per hop, ~100 punktprodukter a 11 var fjarde sekund. Referens for bansken: all-in-one pa hela latar. */
+  /** Sektionens drop-evidens: levande i roll 'all'/'fast'; i workern med stora vägen värdet vid förra env-recordet (som R_DROPS förr). */
+  private secDropsNow(): number { return this.role === 'slow' && this.bigOn ? this.secVDrops : this.dropCount + this.secBodyRet; }
   private sectionReset(): void {
     this.section = 'intro'; this.sectionStartMs = 0; this.sectionIndex = 0; this.sectionTier = 1; this.repeatSim = 0; this.repeatAgoMs = 0; this.repeatSection = '';
     this.secBlkMs = 0; this.secBlkN = 0; this.secBlkInt = 0; this.secBlkKicks = 0; this.secBlkCent = 0; this.secBlkSpec.fill(0);
     this.secBlkBon = 0; this.secBlkBpk = 0; this.secBlkFlux = 0; this.secBlkRms4 = 0; const H = this.secBlkH; H.bon.length = 0; H.bpk.length = 0; H.high.length = 0; H.flat.length = 0; H.flux.length = 0; H.dyn.length = 0;
-    this.secTierRun = 0; this.secTierCand = 1; this.secRiseRun = 0; this.secSongStartMs = 0; this.secBlkRms2 = 0; this.secBlkDb.length = 0; this.secBlkDens.length = 0; this.secBlkCentH.length = 0; this.secDropSeen = this.dropCount + this.secBodyRet; this.secSilentBlocks = 0; this.secDropHoldUntil = 0;
+    this.secTierRun = 0; this.secTierCand = 1; this.secRiseRun = 0; this.secSongStartMs = 0; this.secBlkRms2 = 0; this.secBlkDb.length = 0; this.secBlkDens.length = 0; this.secBlkCentH.length = 0; this.secDropSeen = this.secDropsNow(); this.secSilentBlocks = 0; this.secDropHoldUntil = 0;
     this.secHistN = 0; this.secHistPos = 0; this.secFpN = 0; this.secFpPos = 0; this.secFpLab.length = 0; this.secFpAcc.fill(0); this.secFpAccN = 0;
     this.secLog.length = 0; this.secCurDbSum = 0; this.secCurDbN = 0; this.secCurDens = 0; this.lastHighDb = NaN; this.expectHighMs = 0; this.expectSource = 0; this.prevSection = ''; this.levelVsHighDb = 0;
     
@@ -1292,7 +1312,7 @@ export class Analyser {
   private sectionHop(spec: ArrayLike<number>): void {
     const I = this.shIn, hops = I.hops, intSum = I.intSum, kicks = I.kicks, breaking = I.breaking, nowMs = I.nowMs, dtMs = I.dtMs, rms2Sum = I.rms2Sum, centSum = I.centSum,
       specOff = I.specOff, bonSum = I.bonSum, bpk = I.bpk, fluxSum = I.fluxSum, rms4Sum = I.rms4Sum;
-    if (this.secSongStartMs === 0) { this.secSongStartMs = nowMs; this.sectionStartMs = nowMs; this.secDropSeen = this.dropCount + this.secBodyRet; }
+    if (this.secSongStartMs === 0) { this.secSongStartMs = nowMs; this.sectionStartMs = nowMs; this.secDropSeen = this.secDropsNow(); }
     this.secBlkMs += dtMs; this.secBlkN += hops; this.secBlkInt += intSum; this.secBlkKicks += kicks; this.secBlkCent += centSum; this.secBlkRms2 += rms2Sum;
     this.secBlkBon += bonSum; this.secBlkBpk += bpk; this.secBlkFlux += fluxSum; this.secBlkRms4 += rms4Sum;
     for (let i = 0; i < 8; i++) this.secBlkSpec[i] += spec[specOff + i];
@@ -1333,7 +1353,7 @@ export class Analyser {
     this.secHist[this.secHistPos] = bInt; this.secHistPos = (this.secHistPos + 1) & 15; if (this.secHistN < 16) this.secHistN++;
     const rise = this.secHistN >= 9 ? bInt - this.secHist[(this.secHistPos - 9 + 16) & 15] : 0;
     this.secRiseRun = rise >= 0.10 ? this.secRiseRun + 1 : 0;
-    const sinceStart = nowMs - this.secSongStartMs; const dropEv = this.dropCount + this.secBodyRet; const dropped = dropEv !== this.secDropSeen; this.secDropSeen = dropEv;
+    const sinceStart = nowMs - this.secSongStartMs; const dropEv = this.secDropsNow(); const dropped = dropEv !== this.secDropSeen; this.secDropSeen = dropEv;
     const prev = this.section; let label: string;
     {
       // rang-lage: tier 2 = high, tier 0 = low, mitten = 'break' pa vag ner fran high, 'build' pa vag upp fran low/intro, annars kvar
@@ -1643,7 +1663,7 @@ export class Analyser {
     } else if (this.blRef > 0.05) this.blRef *= 0.999;
     this.blPrev2 = p1; this.blPrev1 = v;
     let n = 0; for (let i = 0; i < 32; i++) if (seq - this.blOnsets[i] <= 200 && this.blOnsets[i] > 0) n++;
-    const beats2s = (this.localBpm > 0 ? this.localBpm : 120) / 30;
+    const beats2s = (this.dBpm > 0 ? this.dBpm : 120) / 30;
     const opb = n / beats2s;
     this.bassOnsetsPerBeat = opb;
     const raw = Math.max(0, Math.min(1, (opb - 0.4) / 0.8));
@@ -1679,18 +1699,23 @@ export class Analyser {
     if (SECTION_AGG_HOP) { r[o + R_DROPS] = g.drops; r[o + R_ACTIVE] = g.active; r[o + R_BUILD] = g.build; }
     else { r[o + R_DROPS] = this.dropCount + this.secBodyRet; r[o + R_ACTIVE] = this.activeMs; r[o + R_BUILD] = this.buildUp; }
     r[o + R_FLAGCNT] = packFlagCounts(this.flagCnt);
+    r[o + R_BIGSEQ] = this.bigSeq;                         // stora vägen: hop-record före detta (workern kör dem först)
     r[o + R_SEQ] = seq;                                    // sist: seq = recordet ar komplett
     g.n = 0; g.int = 0; g.kicks = 0; g.breaking = 0; g.rms2 = 0; g.cent = 0; g.dt = 0; g.spec.fill(0); g.bon = 0; g.bpk = 0; g.flux = 0; g.rms4 = 0;
     this.pendFlags = 0;
     Atomics.store(ctrl, C_WRITE, seqLow(seq));             // laga 32 bitarna; workern rekonstruerar via seqDelta (wrap-sakert)
-    if (Atomics.load(ctrl, C_WAITING)) Atomics.notify(ctrl, C_WRITE, 1);   // Dekker: workern satter C_WAITING fore wait-jamforelsen
-    if (this.hopLane) { Atomics.add(ctrl, C_WAKE, 1); if (Atomics.load(ctrl, C_WAITING)) Atomics.notify(ctrl, C_WAKE, 1); }   // taktvägen: workern väntar på C_WAKE
+    if (this.bigOn) {   // stora vägen: analysatortråden väntar på C_WAKE (C_WAITING_B); med taktväg väcker feed() i samma hop
+      Atomics.add(ctrl, C_WAKE, 1);
+      if ((this.syncWorker || !this.hopLane) && Atomics.load(ctrl, C_WAITING_B)) Atomics.notify(ctrl, C_WAKE);
+    } else if (!this.hopLane) { if (Atomics.load(ctrl, C_WAITING)) Atomics.notify(ctrl, C_WRITE, 1); }   // Dekker: workern satter C_WAITING fore wait-jamforelsen
+    // a7: MED taktvägen väntar workern bara på C_WAKE - en notify på C_WRITE vore ett anrop i onödan.
+    else { Atomics.add(ctrl, C_WAKE, 1); if (Atomics.load(ctrl, C_WAITING)) Atomics.notify(ctrl, C_WAKE, 1); }   // taktvägen: workern väntar på C_WAKE
     if (this.inlinePeer) { this.inlinePeer.drainRecords(); this.pullSlowState(); }   // inline-lage (korbank): synkront har, tillstandet hamtas direkt
-    else if (this.syncWorker) { syncWait(ctrl, C_STATE_SEQ, () => stateRead(ctrl, this.splitState!, this.stateCopy) && this.stateCopy[S_REC_SEQ] >= seq); this.pullSlowState(); }
+    else if (this.syncWorker) { syncWait(ctrl, C_STATE_SEQ, () => this.stateRd.read(ctrl, this.splitState!, this.stateCopy) && this.stateCopy[S_REC_SEQ] >= seq); this.pullSlowState(); }
   }
   /** Hamta tempo/gridfas/sektion ur tillstandsblocket (varje hop, ~20 doubles). Aldre an barrierSeq ignoreras. */
   private pullSlowState(): void {
-    if (!stateRead(this.splitCtrl!, this.splitState!, this.stateCopy)) return;
+    if (!this.stateRd.read(this.splitCtrl!, this.splitState!, this.stateCopy)) return;
     const s = this.stateCopy; if (s[S_REC_SEQ] < this.barrierSeq) return;
     this.localBpm = s[S_BPM]; this.localBpmConfidence = s[S_CONF]; this.localBpmF = s[S_BPMF];
     this.beatPhaseMs = s[S_PHASE_MS]; this.beatPhaseConf = s[S_PHASE_CONF];
@@ -1731,6 +1756,7 @@ export class Analyser {
         }
         this.slowGap = false;
       }
+      if (this.bigOn) this.drainBig(r[o + R_BIGSEQ]);   // stora vägen: hoppen före recordet först (sektionsaggregatet, drop-räknaren)
       this.slowStep(o); this.slowLastCnt = r[o + R_FLAGCNT];
       const us = (performance.now() - t0) * 1000;
       this.slowBusyEmaUs = this.slowBusyEmaUs === 0 ? us : this.slowBusyEmaUs + 0.02 * (us - this.slowBusyEmaUs);
@@ -1751,8 +1777,95 @@ export class Analyser {
       });
       if (this.syncWorker) Atomics.notify(ctrl, C_STATE_SEQ);
     }
+    if (this.bigOn) this.drainBig(Infinity);
     return n;
   }
+
+  // ── STORA VÄGEN (split.ts) ────────────────────────────────────────────────────────────────────
+  /** fast: hoppets record (sampel + snabba sidans fakta) till långsamma tråden; hämta drop/riser/profil/kropp/spektrum tillbaka. */
+  private pushBig(samples: Float32Array): void {
+    const r = this.bigRing!, ctrl = this.splitCtrl!, seq = ++this.bigSeq, slot = seq % BIG_RING_N, o = slot * BIG_REC_LEN, n = samples.length;
+    this.bigPcm!.set(samples, slot * BIG_HOP_MAX);
+    r[o + B_N] = n; r[o + B_RMS] = this.hRms; r[o + B_LVL] = this.lvlSmooth; r[o + B_CENT] = this.centSmooth; r[o + B_ACTIVE] = this.activeMs;
+    r[o + B_WALL] = this.hNowWall; r[o + B_KICK] = this.hKick ? 1 : 0; r[o + B_KICKHIT] = this.kickHit; r[o + B_INT] = this.hIntensity; r[o + B_BREAK] = this.hBreaking ? 1 : 0;
+    r[o + B_SEC] = sectionCode(this.section); r[o + B_LVH] = this.levelVsHighDb; r[o + B_CONF] = this.localBpmConfidence;
+    r[o + B_ENVF] = this.bigEnvFlag; r[o + B_ENVBPM] = this.bigEnvBpm; this.bigEnvFlag = 0;
+    r[o + B_SEQ] = seq;                                    // sist: recordet ar komplett
+    Atomics.store(ctrl, C_BIG_WRITE, seqLow(seq)); Atomics.add(ctrl, C_WAKE, 1);
+    // Väckning: taktvägens feed() följer i samma hop och väcker workern - här bara i synk-läget eller utan taktväg.
+    if ((this.syncWorker || !this.hopLane) && Atomics.load(ctrl, C_WAITING_B)) Atomics.notify(ctrl, C_WAKE);
+    if (this.inlinePeer) this.inlinePeer.drainBig(Infinity);
+    else if (this.syncWorker) syncWait(ctrl, C_BIG_SEQ, () => this.bigRd.read(ctrl, this.bigState!, this.bigCopy, C_BIG_SEQ) && this.bigCopy[BS_SEQ] >= seq);
+    const s = this.bigCopy;
+    if (!this.bigRd.read(ctrl, this.bigState!, s, C_BIG_SEQ) || s[BS_SEQ] === 0) return;
+    this.hBody = s[BS_BODY]; this.dropCount = s[BS_DROPS]; this.miniDropCount = s[BS_MINI]; this.buildUp = s[BS_BUILD]; this.hInRiser = s[BS_RISER] === 1;
+    const p = this.outProfile; p.punch = s[BS_PUNCH]; p.bass = s[BS_BASS]; p.bright = s[BS_BRIGHT]; p.beat = s[BS_BEAT]; p.bassline = s[BS_BASSLINE];
+    const sn = s[BS_SPEC_N];
+    if (sn > this.specDelivered) {
+      const sink = this.specSink, binHz = this.cfg.audio.rate / this.bufferBig.length, R = this.specRing!, c = this.specCopy;
+      for (let k = Math.max(this.specDelivered + 1, sn - SPEC_SLOTS + 1); k <= sn; k++) {
+        if (sink) { const o2 = (k % SPEC_SLOTS) * SPEC_MAX; c.set(R.subarray(o2, o2 + c.length)); sink(c, binHz); }
+      }
+      this.specDelivered = sn;
+    }
+  }
+
+  /** slow: behandla hop-recorden t.o.m. `limit` (full seq) i exakt snabba sidans gamla ordning, publicera. */
+  drainBig(limit: number): number {
+    const ctrl = this.splitCtrl!, r = this.bigRing!, pcm = this.bigPcm!;
+    let w = this.bigSeq + seqDelta(Atomics.load(ctrl, C_BIG_WRITE), this.bigSeq); if (limit < w) w = limit;
+    if (w - this.bigSeq > BIG_RING_N - RING_MARGIN) { this.bigSkipped += (w - this.bigSeq) - (BIG_RING_N - RING_MARGIN); this.bigSeq = w - (BIG_RING_N - RING_MARGIN); }
+    let n = 0;
+    while (this.bigSeq < w) {
+      const seq = ++this.bigSeq, slot = seq % BIG_RING_N, o = slot * BIG_REC_LEN;
+      if (r[o + B_SEQ] !== seq) { this.bigSkipped++; continue; }
+      const hn = r[o + B_N];
+      // basgången (process(): ackumulatorn med förra 2048-bandens nivå och förra hoppets kick, sedan env-sampelns steg)
+      { const bl = this.bandLvl[1] + this.bandLvl[2]; if (bl > this.blAccum) this.blAccum = bl; if (this.kickHit >= 1) this.blKickSeq = this.envSeq; }
+      if (r[o + B_ENVF] === 1) { this.dBpm = r[o + B_ENVBPM]; this.stepBassline(); }
+      this.hRms = r[o + B_RMS]; this.lvlSmooth = r[o + B_LVL]; this.centSmooth = r[o + B_CENT]; this.activeMs = r[o + B_ACTIVE]; this.kickHit = r[o + B_KICKHIT];
+      const wall = r[o + B_WALL];
+      { const po = slot * BIG_HOP_MAX; this.bigRingPush(pcm.subarray(po, po + hn)); }
+      if (++this.bigCounter >= Analyser.BIG_EVERY) this.bigStep();
+      this.hNowWall = wall; this.hBody = (this.bandDbRaw[0] + this.bandDbRaw[1] + this.bandDbRaw[2]) / 3;
+      this.dSec = SECTIONS[r[o + B_SEC]]; this.dLvh = r[o + B_LVH];
+      this.dropStep();
+      this.hInRiser = this.riserStep();
+      this.dConf = r[o + B_CONF];
+      this.profileStep();
+      this.bigAgg(r[o + B_INT], r[o + B_KICK] === 1, r[o + B_BREAK] === 1, wall);
+      n++;
+    }
+    if (n > 0) {
+      Atomics.store(ctrl, C_BIG_READ, seqLow(this.bigSeq));
+      const p = this.outProfile;
+      stateWrite(ctrl, this.bigState!, (s) => {
+        s[BS_SEQ] = this.bigSeq; s[BS_BODY] = this.hBody; s[BS_DROPS] = this.dropCount; s[BS_MINI] = this.miniDropCount; s[BS_BUILD] = this.buildUp; s[BS_RISER] = this.hInRiser ? 1 : 0;
+        s[BS_PUNCH] = p.punch; s[BS_BASS] = p.bass; s[BS_BRIGHT] = p.bright; s[BS_BEAT] = p.beat; s[BS_BASSLINE] = p.bassline; s[BS_SPEC_N] = this.specN; s[BS_SKIPPED] = this.bigSkipped;
+      }, C_BIG_SEQ);
+      if (this.syncWorker) Atomics.notify(ctrl, C_BIG_SEQ);
+    }
+    return n;
+  }
+  /** 2048-bufferten som RING (a7/a8): hoppet skrivs på den äldstas plats i stället för copyWithin (8 kB memmove per hop);
+   *  bigStep läser ringen i tidsordning från bigPos -> samma sampel i samma ordning, bit-identiskt. Förutsätter hop <= 2048. */
+  private bigRingPush(samples: Float32Array): void {
+    const B = this.bufferBig, N = B.length, p = this.bigPos, hop = samples.length, first = N - p;
+    if (hop <= first) B.set(samples, p);
+    else { B.set(samples.subarray(0, first), p); B.set(samples.subarray(first), 0); }
+    this.bigPos = (p + hop) % N;
+  }
+  /** slow: alla hop-record lästa? (workerns sömnvillkor) */
+  bigIdle(): boolean { return seqLow(this.bigSeq) === Atomics.load(this.splitCtrl!, C_BIG_WRITE); }
+  /** slow: sektionens hopaggregat (som snabba sidans SECTION_AGG 'hop'-gren förr, samma summeringsordning). */
+  private bigAgg(intensity: number, kick: boolean, breaking: boolean, wall: number): void {
+    const rms = this.hRms;
+    const sp = this.secSpecHop;   // bandDbRaw ändras bara i bigStep (var 3:e hop): räkna om då, samma värden
+    if (this.secSpecDirty) { this.secSpecDirty = false; for (let i = 0; i < 8; i++) sp[i] = Math.pow(10, this.bandDbRaw[i] / 20); }
+    const g = this.secAgg; g.n++; g.int += intensity; if (kick) g.kicks++; g.rms2 += rms * rms; g.cent += this.centSmooth; g.dt += this.dtHop * 1000;
+    g.breaking = breaking ? 1 : 0; g.wall = wall; g.drops = this.dropCount + this.secBodyRet; g.active = this.activeMs; g.build = this.buildUp;
+    for (let i = 0; i < 8; i++) g.spec[i] += sp[i];
+  }
   /** Snabba sidans kommandon i exakt den ordning de restes (virtuell klocka forst: den nollar ankare som resten skriver). */
   private applyFlags(flags: number, hintMs: number, vclock: number): void {
     if (flags & F_VCLOCK_NULL) this.setVirtualClock(null); else if (flags & F_VCLOCK_SET) this.setVirtualClock(vclock);
@@ -1780,6 +1893,18 @@ export class Analyser {
     this.envPos = (this.envPos + 1) % Analyser.ENV_LEN;
     this.envLastWallMs = r[o + R_WALL];
     this.envFilled = Math.min(this.envFilled + 1, Analyser.ENV_LEN);
+    if (this.bigOn) {   // stora vägen: sektionens fakta och blocksummor ur den egna hopvägen (hoppen före recordet är redan körda)
+      const g = this.secAgg;
+      if (g.n > 0) this.secVDrops = g.drops;
+      this.envStep();
+      if (g.n > 0) {
+        const I = this.shIn; I.hops = g.n; I.intSum = g.int; I.kicks = g.kicks; I.breaking = g.breaking > 0; I.nowMs = g.wall; I.dtMs = g.dt; I.rms2Sum = g.rms2; I.centSum = g.cent;
+        I.specOff = 0; I.bonSum = g.bon; I.bpk = g.bpk; I.fluxSum = g.flux; I.rms4Sum = g.rms4;
+        this.sectionHop(g.spec);
+        g.n = 0; g.int = 0; g.kicks = 0; g.breaking = 0; g.rms2 = 0; g.cent = 0; g.dt = 0; g.spec.fill(0); g.bon = 0; g.bpk = 0; g.flux = 0; g.rms4 = 0;
+      }
+      return;
+    }
     const secN = r[o + R_SEC_N] > 0;
     if (!SECTION_AGG_HOP || secN) { this.dropCount = r[o + R_DROPS]; this.activeMs = r[o + R_ACTIVE]; this.buildUp = r[o + R_BUILD]; }
     this.envStep();
@@ -2530,6 +2655,14 @@ export class Analyser {
         // i taget, sa det ar sakert att jamna till har.
         const sq = Atomics.load(v.ctrl, C_STATE_SEQ); if (sq & 1) Atomics.store(v.ctrl, C_STATE_SEQ, sq + 1);
       }
+      if (Analyser.FAST_BANDS && SECTION_AGG_HOP && splitBuf.big && splitBuf.bigPcm && splitBuf.bigState && splitBuf.spec) {
+        (this as { bigOn: boolean }).bigOn = true;
+        this.bigRing = new Float64Array(splitBuf.big); this.bigPcm = new Float32Array(splitBuf.bigPcm); this.bigState = new Float64Array(splitBuf.bigState); this.specRing = new Float32Array(splitBuf.spec);
+        if (this.role === 'slow') {   // omstart av workern: fortsätt i sekvensen, med räknarna (en drop-räknare som hoppar bakåt vore en ny 'drop')
+          const sq = Atomics.load(v.ctrl, C_BIG_SEQ); if (sq & 1) Atomics.store(v.ctrl, C_BIG_SEQ, sq + 1);
+          const st = this.bigState; this.bigSeq = st[BS_SEQ]; this.dropCount = st[BS_DROPS]; this.miniDropCount = st[BS_MINI]; this.specN = st[BS_SPEC_N]; this.secVDrops = this.dropCount;
+        }
+      }
     }
     const cfg = this.cfg = {
       audio: { rate: cfgIn.audio?.rate ?? cfgIn.sampleRate ?? 48000 },
@@ -2591,6 +2724,7 @@ export class Analyser {
     this.magBigMax = Math.min(BIG / 2, this.bandHi[7] + 1);
     this.magBigView = this.magBig.subarray(0, this.magBigMax);
     this.prevMagBigView = this.prevMagBig.subarray(0, this.magBigMax);
+    if (this.bigOn) this.specCopy = new Float32Array(Math.min(SPEC_MAX, this.magBigMax));
 
     // FÖRBERÄKNADE EMA-ALFOR. dtHop och alla tidskonstanter är fasta, så de 11
     // Math.exp()-anropen per hop (~4000/s vid 375 Hz) hörde inte hemma i tick-vägen.
@@ -2662,7 +2796,7 @@ export class Analyser {
 
     // Windowed FFT (pre-allokerade scratchpads → ingen alloc/hop)
     const windowed = this.windowed512;
-    for (let i = 0; i < windowed.length; i++) windowed[i] = this.buffer[i] * this.window[i];
+    { const buf = this.buffer, win = this.window; for (let i = 0; i < windowed.length; i++) windowed[i] = buf[i] * win[i]; }
     const spectrum = this.spectrum512;
     this.fft.realTransform(spectrum, windowed);
 
@@ -2680,31 +2814,44 @@ export class Analyser {
     // Ljusets nivå använder fortfarande rå magnitud. Onset-vägen kan däremot
     // komprimeras och vitbalanseras per FFT-bin, så en högljudd/tonal källa inte
     // sväljer svagare transienter i tempogrammet.
-    for (let i = 0; i < half; i++) {
+    // TRE LOOPAR I STÄLLET FÖR EN (a7, samma aritmetik i samma ordning): basbinnen (onset + snabba bandens magnitud = samma
+    // sqrt som m), binnen upp till de snabba bandens tak (sqrt) och resten (bara centroidens summor). Fälten hissade ut ur
+    // loopen (ingen this-läsning per varv); powSum/powW summeras fortfarande i stigande bin-ordning.
+    const fbMax = Analyser.FAST_BANDS ? this.fbMax : 0, fbMag = this.fbMag;
+    const onsetPeak = this.onsetPeak, onsetPrev = this.onsetPrev, peakDecay = this.onsetPeakDecay, peakReady = this.onsetPeakReady, PFLOOR = Analyser.ONSET_PEAK_FLOOR;
+    for (let i = 0; i < bassBins; i++) {
       const re = spectrum[2 * i];
       const im = spectrum[2 * i + 1];
       const p = re * re + im * im;
-      if (i < bassBins) {
-        const m = Math.sqrt(p);
-        bassEnergy += m;
-        let onsetMag = m;
-        if (enhancedOnset) {
-          // Log-kompression före differensen + SuperFlux-liknande långsam
-          // per-bin-whitening. Peak uppdateras före division så varje bin börjar
-          // på en stabil skala även när signalen startar från tystnad.
-          const compressed = Math.log1p(m);
-          let peak = this.onsetPeak[i] * this.onsetPeakDecay;
-          if (compressed > peak) peak = compressed;
-          this.onsetPeak[i] = peak;
-          onsetMag = this.onsetPeakReady ? compressed / Math.max(Analyser.ONSET_PEAK_FLOOR, peak) : 0;
-        }
-        mag[i] = m;
-        const dd = onsetMag - this.onsetPrev[i];
-        this.onsetPrev[i] = onsetMag;
-        if (dd > 0) { flux += dd; if (i < kickBins) kickFlux += dd; }   // half-wave rectified
+      const m = Math.sqrt(p);
+      bassEnergy += m;
+      let onsetMag = m;
+      if (enhancedOnset) {
+        // Log-kompression före differensen + SuperFlux-liknande långsam
+        // per-bin-whitening. Peak uppdateras före division så varje bin börjar
+        // på en stabil skala även när signalen startar från tystnad.
+        const compressed = Math.log1p(m);
+        let peak = onsetPeak[i] * peakDecay;
+        if (compressed > peak) peak = compressed;
+        onsetPeak[i] = peak;
+        onsetMag = peakReady ? compressed / Math.max(PFLOOR, peak) : 0;
       }
+      mag[i] = m;
+      const dd = onsetMag - onsetPrev[i];
+      onsetPrev[i] = onsetMag;
+      if (dd > 0) { flux += dd; if (i < kickBins) kickFlux += dd; }   // half-wave rectified
+      powSum += p; powW += i * p;
+      if (i < fbMax) fbMag[i] = m;
+    }
+    const fbEnd = Math.max(bassBins, Math.min(fbMax, half));
+    for (let i = bassBins; i < fbEnd; i++) {
+      const re = spectrum[2 * i], im = spectrum[2 * i + 1], p = re * re + im * im;
+      powSum += p; powW += i * p;
+      fbMag[i] = Math.sqrt(p);
+    }
+    for (let i = fbEnd; i < half; i++) {
+      const re = spectrum[2 * i], im = spectrum[2 * i + 1], p = re * re + im * im;
       powSum += p; powW += i * p;
-      if (Analyser.FAST_BANDS && i < this.fbMax) this.fbMag[i] = Math.sqrt(p);
     }
     this.onsetPeakReady = true;
     if (enhancedOnset) {
@@ -2768,7 +2915,8 @@ export class Analyser {
     const bassFluxNorm = Math.min(1, kickFlux * (this.cfg.onset.enhancements ? 0.5 : 0.02));
     if (bassFluxNorm > this.envBassAccum) this.envBassAccum = bassFluxNorm;
     // TYDLIG BASGANG: basnivans topp per env-sampel + senaste kick (se stepBassline).
-    { const bl = this.bandLvl[1] + this.bandLvl[2]; if (bl > this.blAccum) this.blAccum = bl; if (this.kickHit >= 1) this.blKickSeq = this.envSeq; }
+    const big = this.bigOn;   // STORA VÄGEN (fast): basgången, 2048-vägen, drop, riser, profil och sektionsaggregatet körs i långsamma tråden
+    if (!big) { const bl = this.bandLvl[1] + this.bandLvl[2]; if (bl > this.blAccum) this.blAccum = bl; if (this.kickHit >= 1) this.blKickSeq = this.envSeq; }
     if (HIGH_ON) { const hi = this.bandOn[6] > this.bandOn[7] ? this.bandOn[6] : this.bandOn[7]; if (hi > this.envHighAccum) this.envHighAccum = hi; }
     this.envAccumT += hopMs;
     if (this.envAccumT >= 1000 / Analyser.ENV_HZ) this.envSampleStep();
@@ -2807,14 +2955,15 @@ export class Analyser {
     // Egen glidande 2048-buffert, matas samma hop. Ger 23 Hz/bin i botten så
     // sub/kick/bas separeras. Per-band AGC-nivå + per-band adaptiv onset.
     // Bufferten matas VARJE hop (glidande fönster måste vara obrutet)...
-    this.bufferBig.copyWithin(0, hop);   // skjut vänster med en hop
-    this.bufferBig.set(samples, this.bufferBig.length - hop);
+    if (!big) {
+    this.bigRingPush(samples);
     // ...men själva FFT:n + band-analysen körs bara var BIG_EVERY:e hop. 2048-FFT:n
     // är analysatorns dyraste steg och spec-NIVÅERNA smoothas ändå ~90ms — de behöver
     // inte 375Hz. MÄTT: analysen tog 3.8ms/hop mot 2.67ms budget → ljud droppades och
     // ljuset låg 40–140ms efter. Decimeringen får den att rymmas i realtid.
     // Tidssteget skalas (bigDt) så smoothing-tidskonstanterna blir oförändrade.
     if (++this.bigCounter >= Analyser.BIG_EVERY) this.bigStep();
+    }
     if (Analyser.FAST_BANDS) this.fastBandStep(samples);
     // TRUM-KIT peak-hold-envelopes PÅ HOP-TAKT (var 2.7ms) → fångar varje anslag,
     // aldrig missat mellan två render-frames (100Hz). tau bevarade från effects.ts:
@@ -2855,12 +3004,21 @@ export class Analyser {
     // BASKROPPEN — drop-detektionens egen signal (tak + frånvaro + stigningstakt).
     // `inZone` lämnas orörd: effektlagret använder den som "musiken ligger högt".
 
-    const bodyNow = (this.bandDbRaw[0] + this.bandDbRaw[1] + this.bandDbRaw[2]) / 3;   // ra dB
-    this.hKick = kick; this.hNowWall = nowWallA; this.hBody = bodyNow;
-    this.dropStep();
-
-    const inRiser = this.riserStep();
-    this.profileStep();
+    this.hKick = kick; this.hNowWall = nowWallA;
+    let inRiser: boolean;
+    if (big) {
+      this.hIntensity = intensity; this.hBreaking = breaking;
+      this.pushBig(samples);
+      inRiser = this.hInRiser;
+    } else {
+      const bodyNow = (this.bandDbRaw[0] + this.bandDbRaw[1] + this.bandDbRaw[2]) / 3;   // ra dB
+      this.hBody = bodyNow;
+      this.dSec = this.section; this.dLvh = this.levelVsHighDb;
+      this.dropStep();
+      inRiser = this.riserStep();
+      this.dConf = this.localBpmConfidence;
+      this.profileStep();
+    }
     this.hLevel = level; this.hFlux = fluxNorm; this.hIntensity = intensity; this.hInZone = inZone; this.hBreaking = breaking; this.hInRiser = inRiser;
     this.hKickAt = kickAtMs; this.hBarShift = barShift;
     return this.fillFrame();
@@ -3036,7 +3194,7 @@ export class Analyser {
       const _b = this.envBassAccum, _h = this.envHighAccum;
       this.envRing[this.envPos] = _e;
       this.envBassRing[this.envPos] = _b;
-      this.stepBassline();
+      if (this.bigOn) { this.bigEnvFlag = 1; this.bigEnvBpm = this.localBpm; } else { this.dBpm = this.localBpm; this.stepBassline(); }
       if (HIGH_ON) this.envHighRing[this.envPos] = _h;
       this.envPos = (this.envPos + 1) % Analyser.ENV_LEN;
       if (Analyser.GRID_PHASE_ON) this.envLastWallMs = this.wallNow();
@@ -3148,18 +3306,40 @@ export class Analyser {
     if (gated) this.fbWarm++; else this.fbWarm = 0;
     const warm = gated && this.fbWarm >= Analyser.ONSET_WARM * Analyser.BIG_EVERY;
     const C = this.fbCoef, S = this.fbState, n = samples.length;
+    // DE TRE LÅGBANDEN I EN LOOP (a4r, bit-identiskt): varje biquad är en beroendekedja (y beror på förra y) och väntar på sin
+    // egen latens per sampel; tre oberoende kedjor i samma varv överlappar i processorn. Samma uttryck i samma ordning per band,
+    // så varje tal blir exakt detsamma. Ingångens historik (x1, x2) är densamma för alla tre (samma sampel, nollstart, återställs
+    // aldrig per band) och hålls en gång; den skrivs tillbaka till alla tre platserna.
+    {
+      let x1 = S[0], x2 = S[1];
+      let ay1 = S[2], ay2 = S[3], au1 = S[4], au2 = S[5], av1 = S[6], av2 = S[7];
+      let by1 = S[10], by2 = S[11], bu1 = S[12], bu2 = S[13], bv1 = S[14], bv2 = S[15];
+      let cy1 = S[18], cy2 = S[19], cu1 = S[20], cu2 = S[21], cv1 = S[22], cv2 = S[23];
+      const A0 = C[0], A1 = C[1], A2 = C[2], A3 = C[3], A4 = C[4], AC0 = C[5], AC1 = C[6], AC2 = C[7], AC3 = C[8], AC4 = C[9];
+      const B0 = C[10], B1 = C[11], B2 = C[12], B3 = C[13], B4 = C[14], BC0 = C[15], BC1 = C[16], BC2 = C[17], BC3 = C[18], BC4 = C[19];
+      const D0 = C[20], D1 = C[21], D2 = C[22], D3 = C[23], D4 = C[24], DC0 = C[25], DC1 = C[26], DC2 = C[27], DC3 = C[28], DC4 = C[29];
+      let p0 = 0, p1 = 0, p2 = 0;
+      for (let i = 0; i < n; i++) {
+        const x = samples[i];
+        const ya = A0 * x + A1 * x1 + A2 * x2 - A3 * ay1 - A4 * ay2;
+        const yb = B0 * x + B1 * x1 + B2 * x2 - B3 * by1 - B4 * by2;
+        const yc = D0 * x + D1 * x1 + D2 * x2 - D3 * cy1 - D4 * cy2;
+        x2 = x1; x1 = x; ay2 = ay1; ay1 = ya; by2 = by1; by1 = yb; cy2 = cy1; cy1 = yc;
+        const va = AC0 * ya + AC1 * au1 + AC2 * au2 - AC3 * av1 - AC4 * av2;
+        const vb = BC0 * yb + BC1 * bu1 + BC2 * bu2 - BC3 * bv1 - BC4 * bv2;
+        const vc = DC0 * yc + DC1 * cu1 + DC2 * cu2 - DC3 * cv1 - DC4 * cv2;
+        au2 = au1; au1 = ya; av2 = av1; av1 = va; bu2 = bu1; bu1 = yb; bv2 = bv1; bv1 = vb; cu2 = cu1; cu1 = yc; cv2 = cv1; cv1 = vc;
+        p0 += va * va; p1 += vb * vb; p2 += vc * vc;
+      }
+      S[0] = x1; S[1] = x2; S[2] = ay1; S[3] = ay2; S[4] = au1; S[5] = au2; S[6] = av1; S[7] = av2;
+      S[8] = x1; S[9] = x2; S[10] = by1; S[11] = by2; S[12] = bu1; S[13] = bu2; S[14] = bv1; S[15] = bv2;
+      S[16] = x1; S[17] = x2; S[18] = cy1; S[19] = cy2; S[20] = cu1; S[21] = cu2; S[22] = cv1; S[23] = cv2;
+      const P = this.fbPw; P[0] = p0; P[1] = p1; P[2] = p2;
+    }
     for (let b = 0; b < 8; b++) {
       let avg: number, fluxN: number;
       if (b < 3) {   // biquad HP + LP i följd, effekten per hop, utjämnad; amplitud = rot ur effekten, skalad till ett bandmedel
-        const o1 = b * 10, o2 = o1 + 5, s1 = b * 8, s2 = s1 + 4;
-        let x1 = S[s1], x2 = S[s1 + 1], y1 = S[s1 + 2], y2 = S[s1 + 3], u1 = S[s2], u2 = S[s2 + 1], v1 = S[s2 + 2], v2 = S[s2 + 3], pw = 0;
-        for (let i = 0; i < n; i++) {
-          const x = samples[i];
-          const y = C[o1] * x + C[o1 + 1] * x1 + C[o1 + 2] * x2 - C[o1 + 3] * y1 - C[o1 + 4] * y2; x2 = x1; x1 = x; y2 = y1; y1 = y;
-          const v = C[o2] * y + C[o2 + 1] * u1 + C[o2 + 2] * u2 - C[o2 + 3] * v1 - C[o2 + 4] * v2; u2 = u1; u1 = y; v2 = v1; v1 = v;
-          pw += v * v;
-        }
-        S[s1] = x1; S[s1 + 1] = x2; S[s1 + 2] = y1; S[s1 + 3] = y2; S[s2] = u1; S[s2 + 1] = u2; S[s2 + 2] = v1; S[s2 + 3] = v2;
+        const pw = this.fbPw[b];
         this.fbPow[b] += (pw / n - this.fbPow[b]) * this.fbA[b];
         avg = Math.sqrt(this.fbPow[b]) * Analyser.FB_K[b];
         const d = avg - this.fbPrevAmp[b]; fluxN = d > 0 ? d : 0; this.fbPrevAmp[b] = avg;
@@ -3171,7 +3351,7 @@ export class Analyser {
         avg = sum / nb * Analyser.FB_K[b]; fluxN = fl / nb * Analyser.FB_K[b];
       }
       this.fbAbs[b] = avg;
-      this.fbDbRaw[b] = 20 * Math.log10(avg + 1e-7);
+      if (b >= 3) this.fbDbRaw[b] = 20 * Math.log10(avg + 1e-7);   // bara band 3-7 läses (midHiDb)
       const minPeak = this.lvlSmooth * 0.15;
       if (gated && avg > this.fbPeak[b]) this.fbPeak[b] = Math.max(avg, minPeak);
       else this.fbPeak[b] = Math.max(this.fbPeak[b] * 0.9993, minPeak);
@@ -3194,7 +3374,9 @@ export class Analyser {
   private bigStep(): void {
     const rms = this.hRms;
     this.bigCounter = 0;
-    for (let i = 0; i < this.bufferBig.length; i++) this.windowedBig[i] = this.bufferBig[i] * this.windowBig[i];
+    { const buf = this.bufferBig, w = this.windowBig, out = this.windowedBig, B = buf.length, p = this.bigPos, n1 = B - p;
+      for (let i = 0; i < n1; i++) out[i] = buf[p + i] * w[i];
+      for (let i = n1; i < B; i++) out[i] = buf[i - n1] * w[i]; }
     this.fftBig.realTransform(this.specBig, this.windowedBig);
     // Bara upp till högsta bin som någon läser (band 8 slutar vid 16 kHz ≈ bin 683,
     // låtminnet slutar vid 5 kHz ≈ bin 218). Resterande ~340 sqrt per stor-FFT hade
@@ -3210,7 +3392,8 @@ export class Analyser {
     // LÅTMINNET får samma magnitud (ingen extra FFT). Anropas före swap:en nedan,
     // så bufferten faktiskt innehåller DENNA frames spektrum. Skickas som cachad vy
     // (0..magBigMax) — svansen räknas inte, så ingen läsare kan tyst få nollor.
-    this.specSink?.(this.magBigView, this.cfg.audio.rate / this.bufferBig.length);
+    if (this.bigOn) { const k = ++this.specN, R = this.specRing!, o = (k % SPEC_SLOTS) * SPEC_MAX; R.set(this.magBigView.subarray(0, this.specCopy.length), o); }
+    else this.specSink?.(this.magBigView, this.cfg.audio.rate / this.bufferBig.length);
     const gated = rms > this.cfg.detection.noiseFloor * 1.5;
 
     // Signal i rad? Räknaren driver ONSET_WARM ovan.
@@ -3255,6 +3438,7 @@ export class Analyser {
       // Ingen AGC, inget tak som följer med uppåt → en stigning syns som stigning.
       const db = 20 * Math.log10(avg + 1e-7);
       this.bandDbRaw[b] = db;   // RA dB (drop-kropp)
+      this.secSpecDirty = true;
       this.bandDb[b] = Math.max(0, Math.min(1, (db + 70) / 60));
       // Per-band AGC: skala mot egen långsamt sjunkande peak → varje band nyttjar
       // full range oavsett mix (bas dominerar annars alltid rå-magnituden).
@@ -3348,7 +3532,13 @@ export class Analyser {
     const hist = this.bodyHist, HL = hist.length;
     const oldest = hist[(this.bodyHistPos + HL - this.bodyHistLen) % HL];
     let riseRef = oldest;
-    { let mn = oldest; for (let k = 1; k <= this.bodyHistLen; k++) { const v = hist[(this.bodyHistPos + HL - k) % HL]; if (v < mn) mn = v; } riseRef = mn; }
+    // MINIMUM UTAN MODULO (a7): fönstret pos-1 .. pos-len läses som högst två raka bitar (var en heltalsdivision per varv,
+    // ~188 varv per hop). Samma mängd värden -> samma minimum.
+    { const pos = this.bodyHistPos, len = this.bodyHistLen; let mn = oldest;
+      const n1 = len < pos ? len : pos;   // pos-1 .. pos-n1
+      for (let j = pos - n1; j < pos; j++) { const v = hist[j]; if (v < mn) mn = v; }
+      for (let j = HL - (len - n1); j < HL; j++) { const v = hist[j]; if (v < mn) mn = v; }   // resten från slutet
+      riseRef = mn; }
     let bodyRise = bodyPeek - riseRef;   // let: CALMLAND/KICKLOCK bar kandidatens lyft vidare till fyrningen
     hist[this.bodyHistPos] = this.bodyFast;
     this.bodyHistPos = (this.bodyHistPos + 1) % HL;
@@ -3458,7 +3648,9 @@ export class Analyser {
     if (MINI_SPACING_MS > 0) {
       if (this.bodyEnv < this.bodyCeil - MINI_GONE_DB) { this.miniGoneMs += dtHop * 1000; if (this.miniGoneMs >= MINI_GONE_MS) this.lastMiniGoneMs = nowWallA; }
       else this.miniGoneMs = 0;
-      let mnRef = oldest; for (let k = 1; k <= this.bodyHistLen; k++) { const v = hist[(this.bodyHistPos + HL - k) % HL]; if (v < mnRef) mnRef = v; }
+      // Samma fönster som riseRef plus det nyss skrivna värdet (minus inget: den äldsta platsen ingår via `oldest`) -> en jämförelse
+      // i stället för en andra genomläsning (a7).
+      const nv = hist[(this.bodyHistPos + HL - 1) % HL]; const mnRef = nv < riseRef ? nv : riseRef;
       const miniOnset = (bodyPeek - mnRef) > MINI_RISE_DB && bodyPeek > this.bodyPeak - MINI_PEAK_DB && nowWallA - this.lastMiniGoneMs < 4000;
       const miniEdge = miniOnset && !this.wasMiniOnset; this.wasMiniOnset = miniOnset;
       if (miniEdge && this.activeMs > 2000 && nowWallA - this.lastDropMs > MINI_SPACING_MS && nowWallA - this.lastMiniMs > MINI_SPACING_MS
@@ -3479,14 +3671,14 @@ export class Analyser {
     const underNow = this.bodyPeak - bodyPeek;
     // LUGN-SEKTIONS-GRINDEN (se DROP_CALM_GATE). Domen tas per kandidat-hop; den hallna kandidaten (DROP_CALM_LAND_MS) foljs nedan.
     if (fireNow) {
-      const calm = (this.section === 'low' || this.section === 'intro') || this.levelVsHighDb <= -DROP_CALM_DB;
+      const calm = (this.dSec === 'low' || this.dSec === 'intro') || this.dLvh <= -DROP_CALM_DB;
       let strong = this.buildUp >= DROP_CALM_BUILD || underNow < DROP_CALM_Q || bodyRise >= BODY_RISE_DB + DROP_CALM_RISE_DB;
       // STRIKT INTRO (ladan 09-24: 'den gjorde fortfarande drop i intro'): landning vid toppen racker inte i intro - bara en riktig riser.
-      if (this.section === 'intro') strong = this.buildUp >= DROP_CALM_BUILD;
+      if (this.dSec === 'intro') strong = this.buildUp >= DROP_CALM_BUILD;
       if (calm && !strong) {
         fireNow = false;
         if (DROP_CALM_LAND_MS > 0 && this.calmHoldStart === 0) { this.calmHoldStart = nowWallA; this.calmHoldRise = bodyRise; }
-        if (DROP_TRACE && bodyOnsetEdge) console.log(`[dropcalm] wall ${this.wallNow()} ${DROP_CALM_LAND_MS > 0 ? 'HALLS' : 'NEKAD'} sect ${this.section} lvh ${this.levelVsHighDb.toFixed(1)} build ${this.buildUp.toFixed(2)} underPeak ${underNow.toFixed(1)} rise ${bodyRise.toFixed(1)}`);
+        if (DROP_TRACE && bodyOnsetEdge) console.log(`[dropcalm] wall ${this.wallNow()} ${DROP_CALM_LAND_MS > 0 ? 'HALLS' : 'NEKAD'} sect ${this.dSec} lvh ${this.dLvh.toFixed(1)} build ${this.buildUp.toFixed(2)} underPeak ${underNow.toFixed(1)} rise ${bodyRise.toFixed(1)}`);
       }
     }
     if (this.calmHoldStart > 0) {   // verifierad landning: kroppen maste ligga kvar vid toppen hela DROP_CALM_LAND_MS
@@ -3553,7 +3745,7 @@ export class Analyser {
     this.profPunch += (punchNow - this.profPunch) * pr;
     this.profBass += (bassW - this.profBass) * pr;
     this.profBright += (brightW - this.profBright) * pr;
-    this.profBeat += (this.localBpmConfidence - this.profBeat) * pr;
+    this.profBeat += (this.dConf - this.profBeat) * pr;
     // Skala råvärdena till användbara 0..1-spann (typiska musikvärden → full range).
     // Skalningen är KALIBRERAD mot uppmätta råvärden på riktig musik (annars
     // mättar punch på 1.00 och bright ligger konstant högt → ingen diskriminering).
@@ -3568,9 +3760,11 @@ export class Analyser {
   private sectionAggStep(): void {
     const intensity = this.hIntensity, kick = this.hKick, breaking = this.hBreaking, rms = this.hRms, fluxNorm = this.hFlux, nowWallA = this.hNowWall;
     const dtHop = this.dtHop;
+      if (this.bigOn) return;   // stora vägen: aggregatet byggs i långsamma tråden (bigAgg)
       if (SECTION_AGG_HOP) {
         // Aldre vagen: bandens magnitud ur band-dB; odelad analysator kor sectionHop per hop, snabba sidan aggregerar.
-        const sp = this.secSpecHop; for (let i = 0; i < 8; i++) sp[i] = Math.pow(10, this.bandDbRaw[i] / 20);
+        const sp = this.secSpecHop;   // bandDbRaw ändras bara i bigStep (var BIG_EVERY:e hop): potensen räknas om då, samma värden (a7/a8)
+        if (this.secSpecDirty) { this.secSpecDirty = false; for (let i = 0; i < 8; i++) sp[i] = Math.pow(10, this.bandDbRaw[i] / 20); }
         if (this.role === 'fast') {
           const g = this.secAgg; g.n++; g.int += intensity; if (kick) g.kicks++; g.rms2 += rms * rms; g.cent += this.centSmooth; g.dt += this.dtHop * 1000;
           g.breaking = breaking ? 1 : 0; g.wall = this.wallNow(); g.drops = this.dropCount + this.secBodyRet; g.active = this.activeMs; g.build = this.buildUp;
@@ -3674,7 +3868,7 @@ export function createAnalyser(cfg: AnalyserConfig, modeIn?: 'worker' | 'inline'
   if (mode !== 'worker' && mode !== 'inline' && mode !== 'sync') return new Analyser(cfg);
   const sync = mode === 'sync';
   const feedMk = hopFeedFactory();
-  const buffers = createSplitBuffers(!!feedMk);
+  const buffers = createSplitBuffers(!!feedMk, Analyser.bigPathPossible());
   const fast = new Analyser(cfg, { role: 'fast', split: buffers, sync });
   if (feedMk) fast.hopLane = new HopLaneFast(buffers, sync);
   if (mode === 'inline') {
@@ -3688,8 +3882,11 @@ export function createAnalyser(cfg: AnalyserConfig, modeIn?: 'worker' | 'inline'
   const withWorker = ({ Worker }: typeof import('node:worker_threads')) => {
     let stopped = false;
     const attempts: number[] = [];   // tidpunkter for omstarter inom fonstret
-    const start = (resumeSeq: number, why: string) => {
-      const data: WorkerData = { cfg: { ...cfg }, buffers, resumeSeq, sync };
+    // STORA VÄGEN + TAKTVÄG (a3): två trådar - 'lane' (bara taktmatningen) och 'slow' (analysatorn: env + stora vägen). Annars en.
+    const parts: Array<'all' | 'lane' | 'slow'> = feedMk && fast.bigOn ? ['lane', 'slow'] : ['all'];
+    const workers: Array<{ postMessage: (m: unknown) => void }> = [];
+    const start = (part: 'all' | 'lane' | 'slow', resumeSeq: number, why: string) => {
+      const data: WorkerData = { cfg: { ...cfg }, buffers, resumeSeq, sync, part };
       // Pekar pa den BYGGDA filen (slowWorker.js bredvid denna).
       const w = new Worker(new URL('./slowWorker.js', import.meta.url), { workerData: data });
       w.on('error', (e) => console.error('[analyser-split] worker FEL:', e?.message ?? e));
@@ -3704,18 +3901,19 @@ export function createAnalyser(cfg: AnalyserConfig, modeIn?: 'worker' | 'inline'
         const delay = WORKER_RESTART_BACKOFF_MS[Math.min(attempts.length, WORKER_RESTART_BACKOFF_MS.length - 1)];
         attempts.push(now);
         console.warn(`[analyser-split] worker dog (kod ${code}) — omstart #${attempts.length} om ${delay} ms, aterupptar vid record ${fast.fastReadSeq()} (skrivet ${fast.fastWriteSeq()})`);
-        const t = setTimeout(() => { if (stopped) return; fast.splitRestarts++; start(fast.fastReadSeq(), 'omstart'); }, delay);
+        const t = setTimeout(() => { if (stopped) return; fast.splitRestarts++; start(part, part === 'lane' ? 0 : fast.fastReadSeq(), 'omstart'); }, delay);
         t.unref();
       });
       w.unref();
-      (fast as unknown as { __worker: unknown }).__worker = w;
-      console.log(`[analyser-split] langsam analysator i worker startad (tempo/gridfas/sektion) — ${why}, fran record ${resumeSeq}`);
+      workers[parts.indexOf(part)] = w;
+      if (part !== 'lane') (fast as unknown as { __worker: unknown }).__worker = w;
+      console.log(`[analyser-split] langsam analysator i worker startad (${part}) — ${why}, fran record ${resumeSeq}`);
     };
     (fast as unknown as { __stopWorker: () => void }).__stopWorker = () => {
       stopped = true;
-      (fast as unknown as { __worker?: { postMessage: (m: unknown) => void } }).__worker?.postMessage({ type: 'stop' });
+      for (const w of workers) w?.postMessage({ type: 'stop' });
     };
-    start(0, 'start');
+    for (const p of parts) start(p, 0, 'start');
   };
   if (sync) withWorker((process as unknown as { getBuiltinModule(id: string): typeof import('node:worker_threads') }).getBuiltinModule('node:worker_threads'));
   else import('node:worker_threads').then(withWorker).catch((e) => console.error('[analyser-split] kunde inte starta worker:', e?.message ?? e));
diff --git a/src/beatClock.ts b/src/beatClock.ts
index 74fd725..e56f94f 100644
--- a/src/beatClock.ts
+++ b/src/beatClock.ts
@@ -29,6 +29,12 @@ export interface Beat {
  *  alltid följer musiken även om det inte följer ett rutnät. */
 export const MIN_BEAT_CONFIDENCE = 0.20;
 
+/** RUTNÄTET PÅ ANSATSEN (a5, arenan tvavagar 2026-11-08): taktmatningens vikningstopp (basens dB-stigning över 6 hop) ligger
+ *  efter anslagets början - sektionLag-gridfasen mot basansatserna, signerat fel median +18..23 ms på alla fyra lang-filerna.
+ *  Effektklockan (cfg.beat) publiceras därför så mycket tidigare (beatFeed.ts), och ljusets försprång (effects.ts showLead)
+ *  är lika mycket kortare: ljuset landar som förr, rutnätet sitter på slaget. */
+export const GRID_EARLY_MS = 20;
+
 /**
  * Är takten låst OCH pålitlig?
  * Tempot måste vara rimligt (> 40 BPM) och mätningen säker nog. Konfidensgrinden bor
diff --git a/src/beatFeed.ts b/src/beatFeed.ts
index af3b862..685deb5 100644
--- a/src/beatFeed.ts
+++ b/src/beatFeed.ts
@@ -6,7 +6,7 @@
  */
 import { isLogOn } from "./quiet.js";
 import { PROFILE } from "./analyserProfile.js";
-import { MIN_BEAT_CONFIDENCE } from "./beatClock.js";
+import { MIN_BEAT_CONFIDENCE, GRID_EARLY_MS } from "./beatClock.js";
 import type { Frame } from "./analyser.js";
 import type { EngineConfig } from "./config.js";
 
@@ -60,6 +60,20 @@ const FEED_RISE_HOPS = 6;
 const BREAK_HOLD_MS = 20000;   // STANDARD 2026-11-08 (ladan 11-07: godkänt; backup-tagg backup/fore-tio-standard-20261108); förr opt-in DMX_BREAK_HOLD_MS
 const BREAK_RESTORE_MS = Number(process.env.DMX_BREAK_RESTORE_MS ?? String(BREAK_HOLD_MS));   // (2) för sig (prov: hållet av, bara dropens upptag)
 const NO_AN = { resetTempo(): void {}, resetBar(): void {} };
+/** ETTAN I EFFEKTKLOCKANS RUTNÄT (a5, arenan tvavagar 2026-11-08). Förr flyttades effektklockan med analysatorns barShift, men den
+ *  räknas mot ANALYSATORNS rutnät (TVÅ RUTNÄT, skuggan) - de två rutnätens slagindex skiljer ett godtyckligt antal slag, så ettan
+ *  satt rätt bara när skillnaden råkade vara hela takter (testDownbeat-signalen: 23 % rätt, slumpen 25 %). Nu har effektklockan
+ *  en EGEN taktmodell i den långsamma vägen: fyra hypoteser (taktens fyra platser i rutnätets slagindex) körs parallellt med långt
+ *  minne (BAR_DECAY per slag, ~25 takter). Varje slag mäts i fönstret BAR_WIN0..BAR_WIN1 slag runt rutnätets slag: basens (sub+kick)
+ *  linjära stigning (tyngsta slaget = ettan), basgångens stigning (specAbs.bass: basnoten byts på ettan) och virveln/diskanten
+ *  (backbeat på 2 och 4 talar MOT platsen). Platsens andel av varje särdrag summeras; vinner en annan plats med marginalen BAR_MARGIN
+ *  efter minst BAR_MIN slag blir den ettan. Ettan läggs bara i det PUBLICERADE ankaret (cfg.beat = inre rutnät + barOff hela slag):
+ *  rutnätets egen sökning (onsetStep, vikningen mot ankaret) körs på det inre ankaret precis som förr, så tempo och fas är
+ *  oförändrade - en flyttad etta stör aldrig vikningen. */
+const BAR_DECAY = 0.99, BAR_MIN = 16, BAR_MARGIN = 0.06, BAR_W_BASS = 0.5, BAR_W_BACK = 0.5, BAR_WIN0 = -0.2, BAR_WIN1 = 0.3, BAR_RISE_HOPS = 6;
+const ROT_TMP = new Float64Array(4);
+/** a[i] = a[(i + n) & 3] (taktens fyra platser vrids med ankaret, ingen allokering). */
+const rot4 = (a: Float64Array, n: number): void => { ROT_TMP.set(a); for (let i = 0; i < 4; i++) a[i] = ROT_TMP[(i + n) & 3]; };
 /** HELA TEMPOOMRÅDET (2026-10-30, ägaren: 'få rutnätet att ha rätt tempo'): effektklockans andra sökcentrum var analysatorns bpm, som
  *  i en mix står fel länge efter ett låtbyte (tempoMix: rätt 63 %, icke-harmoniskt fel 20 %, lås median 6 s). Nu viks basens stigning
  *  över ALLA tempon 80-160 (1 %-steg, ett tempo var FULL_EVERY:e hop = ett varv per 0,6 s, minst FULL_MIN_N värden = 3 s ljud); vinnaren
@@ -111,6 +125,11 @@ export class BeatFeed {
   private fullK = 0; private fullHop = 0; private fullBest = 0; private fullBestBpm = 0; private fullBase = 0; private fullW = 0; private fullWV = 0; fullBpm = 0;
   /** kickFold = vik onset.kick som före 10-27 (analysatorns skugga, se TVÅ RUTNÄT). Standard = basens stigning. */
   private holdSince = 0; private goodOn = 0; private goodRep = 0; private goodAt = 0;   // TAKTEN GENOM BREAKET
+  // ETTAN (a5): fyra platsers särdrag (inre slagindex & 3), pågående slagets max, linjära ringar för stigningen, publicerat ankare
+  private readonly barK = new Float64Array(4); private readonly barL = new Float64Array(4); private readonly barB = new Float64Array(4);
+  private barN = 0; private barIdx = NaN; private bK = 0; private bL = 0; private bB = 0; private barOff = 0; barShifts = 0;
+  private readonly linK = new Float64Array(BAR_RISE_HOPS); private readonly linL = new Float64Array(BAR_RISE_HOPS); private linPos = 0;
+  private innerAnchor = 0; private innerBpm = 0; private innerValid = false;
   private readonly ana: BeatFeed | null; private readonly anaGrid = { beat: null } as unknown as EngineConfig;
   constructor(private readonly kickFold = false) { this.ana = kickFold ? null : new BeatFeed(true); }
   /** Det cfg analysatorn ska byggas med: en grund kopia med eget rutnät (sätts via setBeatGrid i update). */
@@ -214,6 +233,42 @@ export class BeatFeed {
     return false;
   }
 
+  private barReset(): void { this.barK.fill(0); this.barL.fill(0); this.barB.fill(0); this.barN = 0; this.barIdx = NaN; this.barOff = 0; }
+
+  /** ETTAN (se BAR_DECAY): ett hop av effektklockans taktmodell, på det inre rutnätet. */
+  private barStep(frame: Frame, beat: NonNullable<EngineConfig["beat"]>, now: number): void {
+    const sa = frame.specAbs, p = this.linPos, k = (sa?.sub ?? 0) + (sa?.kick ?? 0), l = sa?.bass ?? 0;
+    const rk = k - this.linK[p], rl = l - this.linL[p]; this.linK[p] = k; this.linL[p] = l; this.linPos = (p + 1) % BAR_RISE_HOPS;
+    if (!(beat.bpm > 40)) return;
+    const pos = (now - beat.anchorMs) / (60000 / beat.bpm), idx = Math.floor(pos - BAR_WIN0);
+    if (idx !== this.barIdx) {
+      if (idx === this.barIdx + 1) this.barCommit();
+      this.barIdx = idx; this.bK = 0; this.bL = 0; this.bB = 0;
+    }
+    if (pos - idx <= BAR_WIN1) {
+      if (rk > this.bK) this.bK = rk;
+      if (rl > this.bL) this.bL = rl;
+      const hb = (frame.onset?.highMid ?? 0) + (frame.onset?.treble ?? 0); if (hb > this.bB) this.bB = hb;
+    }
+  }
+
+  /** Slaget barIdx är färdigmätt: bokför det på sin plats och döm de fyra hypoteserna (vinnaren med marginal blir ettan). */
+  private barCommit(): void {
+    const K = this.barK, L = this.barL, B = this.barB, slot = ((this.barIdx % 4) + 4) % 4;
+    for (let i = 0; i < 4; i++) { K[i] *= BAR_DECAY; L[i] *= BAR_DECAY; B[i] *= BAR_DECAY; }
+    K[slot] += this.bK; L[slot] += this.bL; B[slot] += this.bB;
+    if (this.barN < 1000) this.barN++;
+    if (this.barN < BAR_MIN) return;
+    const sK = K[0] + K[1] + K[2] + K[3], sL = L[0] + L[1] + L[2] + L[3], sB = B[0] + B[1] + B[2] + B[3];
+    if (!(sK > 0)) return;
+    let bi = 0, best = -1e9, second = -1e9;
+    for (let i = 0; i < 4; i++) {
+      const v = K[i] / sK + (sL > 0 ? BAR_W_BASS * L[i] / sL : 0) - (sB > 0 ? BAR_W_BACK * B[i] / sB : 0);
+      if (v > best) { second = best; best = v; bi = i; } else if (v > second) second = v;
+    }
+    if (bi !== this.barOff && best - second >= BAR_MARGIN) { this.barOff = bi; this.barShifts++; }
+  }
+
   /** En hop: tilliten (kan skriva frame.bpmConfidence) och taktklockan (cfg.beat). Anropas efter dropraknaren, fore effekterna.
    *  `now` = hoppets klocka (2026-11-08: i analysatorns långsamma väg körs hoppet senare än det kom - klockan följer med recordet;
    *  förr läste varje ställe Date.now() för sig, i bänken samma tal). */
@@ -222,7 +277,16 @@ export class BeatFeed {
       const bc = frame.bpmConfidence; this.ana.update(frame, this.anaGrid, an, now); frame.bpmConfidence = bc;
       an.setBeatGrid?.(this.anaGrid.beat);
       an = NO_AN;
+      if (cfg.beat && this.innerValid) { cfg.beat.anchorMs = this.innerAnchor; cfg.beat.bpm = this.innerBpm; }   // ETTAN: matningen räknar på det inre ankaret
+      this.updateInner(frame, cfg, an, now);
+      if (cfg.beat) { this.innerAnchor = cfg.beat.anchorMs; this.innerBpm = cfg.beat.bpm; this.innerValid = true; cfg.beat.anchorMs += this.barOff * (60000 / cfg.beat.bpm) - GRID_EARLY_MS; }
+      else this.innerValid = false;
+      return;
     }
+    this.updateInner(frame, cfg, an, now);
+  }
+
+  private updateInner(frame: Frame, cfg: EngineConfig, an: { resetTempo(): void; resetBar(): void; setBeatGrid?(g: EngineConfig["beat"]): void }, now: number): void {
     // TILLITEN KOMMER FRAN FASPREDIKTIONEN, inte fran tempogrammets form.
     // Coast: utan kickar finns inga nya bevis, sa tilliten lacker ner over ~4 s i
     // stallet for att falla direkt. Det ar det som far pulsen att dra sig undan i
@@ -265,11 +329,11 @@ export class BeatFeed {
     if (BREAK_HOLD_MS > 0 && !this.kickFold && cfg.beat) {   // TAKTEN GENOM BREAKET (se BREAK_HOLD_MS)
       if (effBpm === 0) { if (this.holdSince === 0) this.holdSince = now; if (now - this.holdSince < BREAK_HOLD_MS) effBpm = cfg.beat.bpm; }
       else {
-        if (this.holdSince !== 0 && Math.abs(sameOctave(effBpm, cfg.beat.bpm) / cfg.beat.bpm - 1) > 0.04) { cfg.beat = null; cfg.beatErr = 0; this.clockDetBpm = 0; this.onN = 0; this.scanC = 99; this.fullBpm = 0; this.fullK = 0; this.fullBest = 0; }
+        if (this.holdSince !== 0 && Math.abs(sameOctave(effBpm, cfg.beat.bpm) / cfg.beat.bpm - 1) > 0.04) { this.barReset(); cfg.beat = null; cfg.beatErr = 0; this.clockDetBpm = 0; this.onN = 0; this.scanC = 99; this.fullBpm = 0; this.fullK = 0; this.fullBest = 0; }
         this.holdSince = 0;
       }
     }
-    if (effBpm === 0) { cfg.beat = null; cfg.beatErr = 0; this.clockDetBpm = 0; this.onN = 0; this.scanC = 99; this.fullBpm = 0; this.fullK = 0; this.fullBest = 0; }   // tyst → stoppa beat-effekter direkt
+    if (effBpm === 0) { this.barReset(); cfg.beat = null; cfg.beatErr = 0; this.clockDetBpm = 0; this.onN = 0; this.scanC = 99; this.fullBpm = 0; this.fullK = 0; this.fullBest = 0; }   // tyst → stoppa beat-effekter direkt
     if (effBpm > 0) {
       if (!cfg.beat) cfg.beat = { anchorMs: frame.beatAnchorMs || now, bpm: effBpm, confidence: frame.bpmConfidence };
       this.clockDetBpm = effBpm;
@@ -317,7 +381,9 @@ export class BeatFeed {
       if (frame.barShift > 0 && cfg.beat) {
         cfg.beat.anchorMs += frame.barShift * (60000 / cfg.beat.bpm);
         an.resetBar();
+        if (!this.kickFold) { rot4(this.barK, frame.barShift); rot4(this.barL, frame.barShift); rot4(this.barB, frame.barShift); this.barIdx -= frame.barShift; this.barOff = (this.barOff - frame.barShift + 4) & 3; }   // ETTAN följer det inre ankaret
       }
+      if (!this.kickFold && cfg.beat) this.barStep(frame, cfg.beat, now);   // ETTAN: effektklockans taktmodell
       // LEVANDE KONFIDENS + COAST. Tidigare skrevs confidence bara vid (om)låsning →
       // grinden nedströms stod och tittade på ett gammalt värde. Nu uppdateras den varje
       // ruta, men med hysteres: faller takt-tydligheten (eller taktfasen aldrig blir
diff --git a/src/effects.ts b/src/effects.ts
index bad4a2a..ce9cbbd 100644
--- a/src/effects.ts
+++ b/src/effects.ts
@@ -15,7 +15,7 @@ import { isLogOn } from "./quiet.js";
 import type { ChannelRole, EngineConfig, Mode } from "./config.js";
 import { fixtureRoles } from "./config.js";
 import { FixtureOutput, keepLit, lampFadeK, lampLevel, sameLight, type SpecialtyValues } from "./output.js";
-import { beatPhase, beatMs as beatPeriod, beatIndex, hasBeat as beatLocked, MIN_BEAT_CONFIDENCE } from "./beatClock.js";
+import { beatPhase, beatMs as beatPeriod, beatIndex, hasBeat as beatLocked, MIN_BEAT_CONFIDENCE, GRID_EARLY_MS } from "./beatClock.js";
 import type { Frame } from "./analyser.js";
 import { EFFECT_MAP, TIER, sectionPool, meetsRequirements, TOGGLE_POOL, modulateOf } from "./effects/registry.js";
 import { fitScore, fitDistance, FIT } from "./effects/fit.js";
@@ -480,7 +480,8 @@ export class EffectEngine {
   private universe = new Uint8Array(512);
   /** Utjamnad tilltro till takten (0..1) — styr beatPulse-djupet. */
   /** Showens försprång i ms — läses ur config varje frame så ratten biter live. */
-  private get showLead(): number { return this.cfg.showLeadMs ?? SHOW_LEAD_DEFAULT; }
+  /** Försprånget räknas mot rutnätet; effektklockan ligger GRID_EARLY_MS före vikningstoppen (beatClock.ts) -> lika mycket kortare. */
+  private get showLead(): number { return (this.cfg.showLeadMs ?? SHOW_LEAD_DEFAULT) - GRID_EARLY_MS; }
   private beatTrust = 0;
   // SKRAPJAKTEN 10-01: objekt/arrayer som render() fyller i stallet for att skapa nya varje ruta (200 Hz). Lases bara synkront.
   private bandsBuf: number[] = [0.5, 0.5, 0.5, 0.5, 0.5];
@@ -1241,11 +1242,12 @@ export class EffectEngine {
       if (nowWall - this.histAt >= 25) {
         this.histAt = nowWall; h[this.liftW] = this.nearB; this.liftW = (this.liftW + 1) % 240; if (this.liftN < 240) this.liftN++;
         const n = this.liftN, o0 = this.liftW - n + 240;   // h[(o0 + q) % 240] = q:e äldsta
-        let f = 1e9; for (let q = Math.max(0, n - 60); q < n; q++) { const v = h[(o0 + q) % 240]; if (v < f) f = v; }
+        // Index med omslag i stället för en modulo per varv (a7): samma rutor i samma ordning, så summorna blir bit-identiska.
+        let f = 1e9; for (let q = Math.max(0, n - 60), j = (o0 + q) % 240; q < n; q++) { const v = h[j]; if (v < f) f = v; if (++j === 240) j = 0; }
         this.nearFloor = f;
         if (n >= 240) {
-          let sum = 0; for (let q = 0; q < 160; q++) sum += h[(o0 + q) % 240];
-          let now6 = 0; for (let q = n - 24; q < n; q++) now6 += h[(o0 + q) % 240];
+          let sum = 0; for (let q = 0, j = o0 % 240; q < 160; q++) { sum += h[j]; if (++j === 240) j = 0; }
+          let now6 = 0; for (let q = n - 24, j = (o0 + q) % 240; q < n; q++) { now6 += h[j]; if (++j === 240) j = 0; }
           this.liftCalm = sum / 160; this.liftLift = now6 / 24 - this.liftCalm;   // senaste 0,6 s mot 6..2 s sedan
         }
       }
diff --git a/src/slowWorker.ts b/src/slowWorker.ts
index 93efa4a..48025d7 100644
--- a/src/slowWorker.ts
+++ b/src/slowWorker.ts
@@ -18,20 +18,24 @@
 import { workerData, parentPort, receiveMessageOnPort } from 'node:worker_threads';
 import { Analyser, type AnalyserConfig } from './analyser.js';
 import { PROFILE } from './analyserProfile.js';
-import { C_WRITE, C_WAITING, C_WAKE, C_HOP_WRITE, seqLow, HopLaneSlow, type HopFeed, type WorkerData, type WorkerMsg } from './split.js';
+import { C_WRITE, C_WAITING, C_WAITING_B, C_WAKE, C_HOP_WRITE, seqLow, HopLaneSlow, type HopFeed, type WorkerData, type WorkerMsg } from './split.js';
 
-const { cfg, buffers, resumeSeq, sync } = workerData as WorkerData & { cfg: AnalyserConfig };
+// TVÅ TRÅDAR (a3, stora vägen): part 'lane' = bara taktvägen (systemets taktmatning, det motorn läser varje hop) - den väntar
+// aldrig bakom en 2048-FFT eller ett computeBpm; part 'slow' = analysatorns långsamma sida (env-recorden + stora vägens hop-record).
+// part 'all' (osatt) = båda i samma tråd som förr (utan stora vägen, t.ex. lotus).
+const { cfg, buffers, resumeSeq, sync, part = 'all' } = workerData as WorkerData & { cfg: AnalyserConfig };
 const ctrl = new Int32Array(buffers.ctrl);
-const an = new Analyser(cfg, { role: 'slow', split: buffers, resumeSeq, sync });
+const an = part === 'lane' ? null : new Analyser(cfg, { role: 'slow', split: buffers, resumeSeq, sync });
 const P = PROFILE as { slowHopFeed?: () => HopFeed; slowHopFeedModule?: string };
-if (buffers.hop && !P.slowHopFeed && P.slowHopFeedModule) {   // systemets taktmatning laddas bara med taktvagen (modulen registrerar fabriken)
+const wantLane = !!buffers.hop && part !== 'slow';
+if (wantLane && !P.slowHopFeed && P.slowHopFeedModule) {   // systemets taktmatning laddas bara med taktvagen (modulen registrerar fabriken)
   const log = console.log, info = console.info;
   await import(new URL(P.slowHopFeedModule, import.meta.url).href);
   console.log = log; console.info = info;   // modulen far inte andra trådens loggning (DMX beatFeed.ts drar in quiet.ts)
 }
 const feedMk = P.slowHopFeed;
-if (buffers.hop && !feedMk) throw new Error('analyser-split: taktvagen utan slowHopFeed i profilen');
-const lane = buffers.hop && feedMk ? new HopLaneSlow(buffers, feedMk(), sync === true) : null;
+if (wantLane && !feedMk) throw new Error('analyser-split: taktvagen utan slowHopFeed i profilen');
+const lane = wantLane && feedMk ? new HopLaneSlow(buffers, feedMk(), sync === true) : null;
 const TEST_CRASH = process.env[PROFILE.envPrefix + 'SPLIT_TEST_CRASH'] === '1';
 let stop = false;
 
@@ -46,25 +50,29 @@ function pollMessages(): void {
   }
 }
 
-// Sov aldrig langre an 200 ms sa ett 'stop' hinner fram; i drift vacks vi var 10 ms av notify.
-// DEKKER-VAKNING: C_WAITING satts FORE wait-jamforelsen (mot skrivarens store->load): antingen ser skrivaren
-// flaggan och notify:ar, eller sa ser wait ett nytt C_WRITE och returnerar direkt.
-// TAKTVAGEN: C_WAKE okas av varje env- och hop-record; lases FORE tomhetskollen, sa ett record som skrivs efter kollen
-// andrar ordet och wait returnerar direkt.
-if (lane) while (!stop) {
+// Sov aldrig langre an 200 ms sa ett 'stop' hinner fram; i drift vacks vi av notify.
+// DEKKER-VAKNING: vantflaggan satts FORE wait-jamforelsen (mot skrivarens store->load): antingen ser skrivaren
+// flaggan och notify:ar, eller sa ser wait ett nytt C_WAKE och returnerar direkt.
+// C_WAKE okas av varje env-, hop- och stor-record; lases FORE tomhetskollen, sa ett record som skrivs efter kollen
+// andrar ordet och wait returnerar direkt. Varje tråd har egen väntflagga (lane: C_WAITING, slow: C_WAITING_B); skrivaren
+// väcker alla väntare på C_WAKE med ett anrop.
+const idleSlow = (): boolean => !an || (seqLow(an.slowReadSeq()) === Atomics.load(ctrl, C_WRITE) && (!an.bigOn || an.bigIdle()));
+const idleLane = (): boolean => !lane || seqLow(lane.readSeq()) === Atomics.load(ctrl, C_HOP_WRITE);
+const WAIT_FLAG = part === 'slow' ? C_WAITING_B : C_WAITING;
+if (lane || an?.bigOn) while (!stop) {
   const k = Atomics.load(ctrl, C_WAKE);
-  if (seqLow(an.slowReadSeq()) === Atomics.load(ctrl, C_WRITE) && seqLow(lane.readSeq()) === Atomics.load(ctrl, C_HOP_WRITE)) {
-    Atomics.store(ctrl, C_WAITING, 1);
+  if (idleSlow() && idleLane()) {
+    Atomics.store(ctrl, WAIT_FLAG, 1);
     Atomics.wait(ctrl, C_WAKE, k, 200);
-    Atomics.store(ctrl, C_WAITING, 0);
+    Atomics.store(ctrl, WAIT_FLAG, 0);
     pollMessages();
     continue;
   }
-  an.drainRecords();
-  lane.drain();
+  lane?.drain();
+  an?.drainRecords();
   pollMessages();
 }
-while (!stop) {
+while (!stop && an) {
   const w = Atomics.load(ctrl, C_WRITE);
   if (seqLow(an.slowReadSeq()) === w) {
     Atomics.store(ctrl, C_WAITING, 1);
diff --git a/src/split.ts b/src/split.ts
index 7295d9e..b0d68a2 100644
--- a/src/split.ts
+++ b/src/split.ts
@@ -19,7 +19,7 @@
  * createAnalyser) ger BIT-IDENTISKT tempo mot den odelade analysatorn, vilket körbänken bevisar.
  */
 
-export const REC_LEN = 34;
+export const REC_LEN = 35;
 export const RING_N = 1024;                    // ~10 s vid 100 Hz — workern får ligga efter utan att tappa
 export const RING_MARGIN = 8;                  // records workern lämnar orörda mot skrivaren (80 ms) — läses aldrig närmare kanten
 
@@ -30,7 +30,8 @@ export const R_SEQ = 0, R_PERF = 1, R_WALL = 2, R_ENV = 3, R_BASS = 4, R_FLAGS =
   R_FLAGCNT = 28 /* packade flaggräknare (se packFlagCounts): hur många gånger varje flagga rests t.o.m. detta record */,
   R_SEC_BON = 29 /* NYA SEKTIONSSARDRAG (09-23): basonset-envelope (dB-flux 20-250 Hz, summa per hop) */, R_SEC_BPK = 30 /* basonset-toppar (librosa-lik toppplockning, antal) */,
   R_SEC_FLUX = 31 /* helbandsflux (fluxNorm, summa) */, R_SEC_RMS4 = 32 /* summa rms^4 (dynamik inom blocket) */,
-  R_HIGH = 33 /* diskant-onset-ringens sampel (bara med <prefix>HIGH_DIAG/HIGH_VOTE) */;
+  R_HIGH = 33 /* diskant-onset-ringens sampel (bara med <prefix>HIGH_DIAG/HIGH_VOTE) */,
+  R_BIGSEQ = 34 /* STORA VÄGEN: antal hop-record (stora ringen) skrivna före detta env-record - workern kör dem först */;
 
 // Flaggor (bitmask i R_FLAGS)
 export const F_SIL350 = 1, F_SIL10 = 2, F_RESET_TEMPO = 4, F_HINT = 8, F_RESET_BAR = 16, F_VCLOCK_SET = 32, F_VCLOCK_NULL = 64;
@@ -90,22 +91,30 @@ export const STATE_LEN = 24;
 export const SECTIONS = ['', 'intro', 'low', 'build', 'high', 'break'];
 export function sectionCode(s: string): number { const i = SECTIONS.indexOf(s); return i < 0 ? 0 : i; }
 
-export interface SplitBuffers { ctrl: SharedArrayBuffer; ring: SharedArrayBuffer; state: SharedArrayBuffer; hop?: SharedArrayBuffer; hopState?: SharedArrayBuffer /* taktvägen */ }
+export interface SplitBuffers { ctrl: SharedArrayBuffer; ring: SharedArrayBuffer; state: SharedArrayBuffer; hop?: SharedArrayBuffer; hopState?: SharedArrayBuffer /* taktvägen */;
+  big?: SharedArrayBuffer; bigPcm?: SharedArrayBuffer; bigState?: SharedArrayBuffer; spec?: SharedArrayBuffer /* stora vägen */ }
 
 /** Meddelanden main ↔ worker (bara utanför driftvägen). `crash` finns ENBART bakom <prefix>SPLIT_TEST_CRASH=1 (stresstest). */
 export type WorkerMsg = { type: 'stop' } | { type: 'crash' };
 /** cfg ar en KOPIA (structured clone) fran workerns start: den langsamma sidan ser aldrig motorns senare andringar (cfg.beat,
  *  UI-andrade detection-varden). Las darfor aldrig cfg efter start i den langsamma sidan - behovs ett levande varde, skicka det i recorden
  *  (bankens inline-lage ger samma kopia, structuredClone, sedan 10-19). */
-export interface WorkerData { cfg: unknown; buffers: SplitBuffers; resumeSeq: number /* senast lästa record (full seq) — 0 vid första start */; sync?: boolean /* bänkens synk-läge */ }
+export interface WorkerData { cfg: unknown; buffers: SplitBuffers; resumeSeq: number /* senast lästa record (full seq) — 0 vid första start */; sync?: boolean /* bänkens synk-läge */;
+  part?: 'all' | 'lane' | 'slow' /* två trådar med stora vägen: taktvägen resp. analysatorn (slowWorker.ts) */ }
 
-export function createSplitBuffers(hopLane = false): SplitBuffers {
+/** `big` = stora vägens buffertar (~2,3 MB SAB). createAnalyser ger dem bara när stora vägen kan slås på (Analyser.bigPathPossible:
+ *  ljusets band kommer ur snabba vägen) - lotus (FAST_BANDS av) allokerar dem inte längre (a4r). Utan argument som förr (bänkens verktyg). */
+export function createSplitBuffers(hopLane = false, big = true): SplitBuffers {
   const b: SplitBuffers = {
     ctrl: new SharedArrayBuffer(16 * 4),
     ring: new SharedArrayBuffer(RING_N * REC_LEN * 8),
     state: new SharedArrayBuffer(STATE_LEN * 8),
   };
   if (hopLane) { b.hop = new SharedArrayBuffer(HOP_RING_N * HOP_REC_LEN * 8); b.hopState = new SharedArrayBuffer(FEED_STATE_LEN * 8); }
+  if (big) {
+    b.big = new SharedArrayBuffer(BIG_RING_N * BIG_REC_LEN * 8); b.bigPcm = new SharedArrayBuffer(BIG_RING_N * BIG_HOP_MAX * 4);
+    b.bigState = new SharedArrayBuffer(BIG_STATE_LEN * 8); b.spec = new SharedArrayBuffer(SPEC_SLOTS * SPEC_MAX * 4);
+  }
   return b;
 }
 
@@ -133,6 +142,23 @@ export function stateRead(ctrl: Int32Array, state: Float64Array, out: Float64Arr
   return false;
 }
 
+/** stateRead med minne (a7): står seqlock-ordet kvar på samma jämna värde som vid förra lyckade läsningen har ingen skrivning
+ *  börjat sedan dess, och `out` håller redan exakt det blocket - då hoppas kopian över. Annars som stateRead. Ett minne per `out`. */
+export class StateReader {
+  private w = -1;   // ordet vid senaste lyckade läsningen (-1: ingen; udda värden matchar aldrig)
+  read(ctrl: Int32Array, state: Float64Array, out: Float64Array, word = C_STATE_SEQ): boolean {
+    if (Atomics.load(ctrl, word) === this.w) return true;
+    for (let tries = 0; tries < 4; tries++) {
+      const s1 = Atomics.load(ctrl, word);
+      if (s1 & 1) continue;
+      out.set(state);
+      const s2 = Atomics.load(ctrl, word);
+      if (s1 === s2) { this.w = s1; return true; }
+    }
+    return false;
+  }
+}
+
 /** SYNK-LÄGET (bara bänken, createAnalyser(cfg, 'sync')): den snabba sidan väntar tills workern publicerat (workern notify:ar `word`
  *  efter varje publicering) - den RIKTIGA workern i lås-steg med ljudet, så den kan jämföras hop för hop mot inline-läget. */
 export function syncWait(ctrl: Int32Array, word: number, ready: () => boolean): void {
@@ -144,6 +170,22 @@ export function syncWait(ctrl: Int32Array, word: number, ready: () => boolean):
   throw new Error('analyser-split sync: workern svarar inte (30 s)');
 }
 
+// ── STORA VÄGEN (arena tvavagar a3, 2026-11-08): allt i analysatorns hop som inte är ljusets direkta signal ──────────────────────
+// Snabba vägen behåller 512-FFT:n, nivån/AGC:n, kicken, snabba banden (FAST_BANDS) och trumenveloperna. 2048-FFT:n med sina 8 band,
+// drop-detektorn (baskroppen), risern/buildUp, karaktärsprofilen, basgången och sektionsaggregatet körs i den långsamma tråden på
+// ett record PER HOP (hoppets 128 sampel + ~15 fakta från snabba sidan). Resultatet (dropCount, bodyDb, buildUp, profilen och
+// 2048-spektrumet till låtgränsens sink) går tillbaka i ett eget tillståndsblock. I inline/synk-läget körs recordet inom samma
+// process() -> bit-identiskt; i realtid ligger de här fälten workerns fördröjning efter (p50 ~1 hop).
+// Bara med FAST_BANDS + SECTION_AGG 'hop' (DMX); annars kör snabba sidan allt som förr.
+export const BIG_REC_LEN = 16, BIG_RING_N = 2048, BIG_HOP_MAX = 256;
+export const B_SEQ = 0, B_N = 1, B_RMS = 2, B_LVL = 3, B_CENT = 4, B_ACTIVE = 5, B_WALL = 6, B_KICK = 7, B_KICKHIT = 8, B_INT = 9, B_BREAK = 10,
+  B_SEC = 11, B_LVH = 12, B_CONF = 13, B_ENVF = 14, B_ENVBPM = 15;
+export const C_BIG_WRITE = 8, C_BIG_READ = 9, C_BIG_SEQ = 10 /* stora vägens seqlock */, C_WAITING_B = 11 /* analysatortråden väntar (två trådar, se slowWorker) */;
+export const BS_SEQ = 0, BS_BODY = 1, BS_DROPS = 2, BS_MINI = 3, BS_BUILD = 4, BS_RISER = 5, BS_PUNCH = 6, BS_BASS = 7, BS_BRIGHT = 8, BS_BEAT = 9,
+  BS_BASSLINE = 10, BS_SPEC_N = 11 /* antal 2048-spektra skrivna */, BS_SKIPPED = 12;
+export const BIG_STATE_LEN = 13;
+export const SPEC_SLOTS = 16, SPEC_MAX = 1024;   // 16 spektra = 48 hop: en sen worker tappar inget till låtgränsens sink
+
 // ── TAKTVÄGEN (2026-11-08, ägaren: 'en analysator, två vägar - den snabba och den som ger dirigenten information') ─────────────
 // Systemets TAKTMATNING (DMX: src/beatFeed.ts, ~20 % av motorns CPU) körs i den långsamma tråden i stället för i hop-loopen.
 // Bara när systemets profil har BEAT_FEED 'slow' OCH en slowHopFeed-fabrik (DMX); lotus profil saknar båda = inget av detta finns.
@@ -152,10 +194,10 @@ export function syncWait(ctrl: Int32Array, word: number, ready: () => boolean):
 // i ett eget tillståndsblock med egen seqlock. Den snabba sidan lägger resultatet i motorns cfg/ram och utför kommandona på SIN
 // analysator (som förr - flaggorna går sedan i env-recorden som vanligt), så kommandoordningen är exakt den gamla i inline-läget.
 // Taktmatningen läser inget ur den långsamma analysatorn: de två körs oberoende i workern.
-export const HOP_REC_LEN = 13;
+export const HOP_REC_LEN = 14;
 export const HOP_RING_N = 4096;                // ~11 s vid 375 Hz
 export const H_SEQ = 0, H_NOW = 1 /* Date.now() vid hoppet = taktmatningens klocka */, H_TS = 2 /* timeOrigin+performance.now(), fördröjningsmått */,
-  H_BPM = 3, H_CONF = 4, H_ANCHOR = 5, H_KICKAT = 6, H_BARSHIFT = 7, H_ON_KICK = 8, H_ON_HIMID = 9, H_ON_TREBLE = 10, H_SA_SUB = 11, H_SA_KICK = 12;
+  H_BPM = 3, H_CONF = 4, H_ANCHOR = 5, H_KICKAT = 6, H_BARSHIFT = 7, H_ON_KICK = 8, H_ON_HIMID = 9, H_ON_TREBLE = 10, H_SA_SUB = 11, H_SA_KICK = 12, H_SA_BASS = 13 /* a5: basgången (ettan) */;
 export const C_HOP_WRITE = 4, C_HOP_READ = 5, C_FEED_SEQ = 6 /* taktvägens seqlock */, C_WAKE = 7 /* väckningsord: env- OCH hop-record (bara med taktvägen) */;
 export const FS_HOP_SEQ = 0, FS_BEAT = 1 /* cfg.beat: 0 undefined, -1 null, 1 objekt */, FS_ANCHOR = 2, FS_BPM = 3, FS_BCONF = 4,
   FS_BEATERR = 5 /* NaN = osatt */, FS_FCONF = 6 /* frame.bpmConfidence efter matningen, NaN = orörd */, FS_GRID = 7 /* analysatorns rutnät 0 null/1 */,
@@ -165,7 +207,7 @@ export const FEED_STATE_LEN = 19;
 
 /** Det taktmatningen läser ur ramen, och det den skriver (cfg.beat/beatErr, frame.bpmConfidence, analysatorns rutnät/kommandon). */
 export interface HopFrame { bpm: number; bpmConfidence: number; beatAnchorMs: number; kickAtMs: number; barShift: number;
-  onset: { kick: number; highMid: number; treble: number }; specAbs: { sub: number; kick: number } }
+  onset: { kick: number; highMid: number; treble: number }; specAbs: { sub: number; kick: number; bass: number } }
 export interface HopGrid { anchorMs: number; bpm: number; confidence?: number }
 export interface HopCfg { beat?: HopGrid | null; beatErr?: number }
 export interface HopTarget { resetTempo(): void; resetBar(): void; setBeatGrid?(g: HopGrid | null): void }
@@ -175,7 +217,7 @@ export interface HopFeed { update(frame: HopFrame, cfg: HopCfg, an: HopTarget, n
 /** Taktvägen, snabba sidan (motorns tråd): skriv hoppet, hämta senaste resultatet och lägg det i motorns cfg/ram/analysator. */
 export class HopLaneFast {
   private readonly ctrl: Int32Array; private readonly ring: Float64Array; private readonly state: Float64Array;
-  private readonly s = new Float64Array(FEED_STATE_LEN);
+  private readonly s = new Float64Array(FEED_STATE_LEN); private readonly sr = new StateReader();
   private seq = 0; private applied = 0; private rt = 0; private rb = 0;
   private readonly grid = { anchorMs: 0.5, bpm: 0.5, confidence: 0.5 };
   /** inline-läget (bänken): den långsamma sidan körs synkront här. */
@@ -189,14 +231,14 @@ export class HopLaneFast {
     r[o + H_NOW] = Date.now(); r[o + H_TS] = performance.timeOrigin + performance.now();
     r[o + H_BPM] = f.bpm; r[o + H_CONF] = f.bpmConfidence; r[o + H_ANCHOR] = f.beatAnchorMs; r[o + H_KICKAT] = f.kickAtMs; r[o + H_BARSHIFT] = f.barShift;
     r[o + H_ON_KICK] = f.onset?.kick ?? 0; r[o + H_ON_HIMID] = f.onset?.highMid ?? 0; r[o + H_ON_TREBLE] = f.onset?.treble ?? 0;
-    r[o + H_SA_SUB] = f.specAbs?.sub ?? 0; r[o + H_SA_KICK] = f.specAbs?.kick ?? 0;
+    r[o + H_SA_SUB] = f.specAbs?.sub ?? 0; r[o + H_SA_KICK] = f.specAbs?.kick ?? 0; r[o + H_SA_BASS] = f.specAbs?.bass ?? 0;
     r[o + H_SEQ] = seq;                                    // sist: seq = recordet ar komplett
     Atomics.store(ctrl, C_HOP_WRITE, seqLow(seq)); Atomics.add(ctrl, C_WAKE, 1);
-    if (Atomics.load(ctrl, C_WAITING)) Atomics.notify(ctrl, C_WAKE, 1);
+    if (Atomics.load(ctrl, C_WAITING) || Atomics.load(ctrl, C_WAITING_B)) Atomics.notify(ctrl, C_WAKE);   // alla väntare (en eller två trådar)
     if (this.peer) this.peer.drain();
-    else if (this.sync) syncWait(ctrl, C_FEED_SEQ, () => stateRead(ctrl, this.state, this.s, C_FEED_SEQ) && this.s[FS_HOP_SEQ] >= seq);
+    else if (this.sync) syncWait(ctrl, C_FEED_SEQ, () => this.sr.read(ctrl, this.state, this.s, C_FEED_SEQ) && this.s[FS_HOP_SEQ] >= seq);
     const s = this.s;
-    if (!stateRead(ctrl, this.state, s, C_FEED_SEQ) || s[FS_HOP_SEQ] === 0) return;   // inget resultat an (eller mitt i skrivning: behall forra)
+    if (!this.sr.read(ctrl, this.state, s, C_FEED_SEQ) || s[FS_HOP_SEQ] === 0) return;   // inget resultat an (eller mitt i skrivning: behall forra)
     const fc = s[FS_FCONF]; if (fc === fc) f.bpmConfidence = fc;   // tilliten (bara om matningen andrade den)
     if (s[FS_HOP_SEQ] === this.applied) return;
     this.applied = s[FS_HOP_SEQ];
@@ -225,7 +267,7 @@ export class HopLaneSlow {
   private seq: number; private rt: number; private rb: number; private processed: number;
   private skipped = 0; private lagMaxMs = 0; private busyEmaUs = 0; private busyMaxUs = 0; private fconf = NaN;
   private readonly fr = { bpm: 0.5, bpmConfidence: 0.5, beatAnchorMs: 0.5, kickAtMs: 0.5, barShift: 0.5,
-    onset: { kick: 0.5, highMid: 0.5, treble: 0.5 }, specAbs: { sub: 0.5, kick: 0.5 } };
+    onset: { kick: 0.5, highMid: 0.5, treble: 0.5 }, specAbs: { sub: 0.5, kick: 0.5, bass: 0.5 } };
   private readonly cfg: HopCfg = { beat: undefined, beatErr: undefined };
   private grid: HopGrid | null = null;
   private readonly target: HopTarget = { resetTempo: () => { this.rt++; }, resetBar: () => { this.rb++; }, setBeatGrid: (g) => { this.grid = g; } };
@@ -247,7 +289,7 @@ export class HopLaneSlow {
       const t0 = performance.now();
       fr.bpm = r[o + H_BPM]; fr.bpmConfidence = r[o + H_CONF]; fr.beatAnchorMs = r[o + H_ANCHOR]; fr.kickAtMs = r[o + H_KICKAT]; fr.barShift = r[o + H_BARSHIFT];
       fr.onset.kick = r[o + H_ON_KICK]; fr.onset.highMid = r[o + H_ON_HIMID]; fr.onset.treble = r[o + H_ON_TREBLE];
-      fr.specAbs.sub = r[o + H_SA_SUB]; fr.specAbs.kick = r[o + H_SA_KICK];
+      fr.specAbs.sub = r[o + H_SA_SUB]; fr.specAbs.kick = r[o + H_SA_KICK]; fr.specAbs.bass = r[o + H_SA_BASS];
       const cin = fr.bpmConfidence;
       this.feed.update(fr, this.cfg, this.target, r[o + H_NOW]);
       this.fconf = fr.bpmConfidence !== cin ? fr.bpmConfidence : NaN;
```
