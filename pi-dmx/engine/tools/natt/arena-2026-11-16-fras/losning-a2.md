# a2 SNABBARE DETEKTOR (inlämnad = m1, DISK på ljuset)

**IDÉN:** Detektorn beslutar på kortare bevis: en snabb kant på de senaste 500 ms (2 x 250 ms, +6 dB mot förra taktens median i båda
kvartarna) stänger blocket direkt, tiern kräver 4/2 block i st f 5/3, och dirigentens 2 s-väntan är borta (detektorns dwell är kontrollen).
Lookbytet kommer median 2,8 slag efter ägarens gräns i st f 6,5, så fler byten landar på frasens etta.

**VAR FÖRDRÖJNINGEN SATT (bas, 83 gränser, ur kr-*.json):** detektorn median 3,0 slag efter gränsen (27 gränser utan sektionsbyte inom
16 slag, mest vers/refräng inne i 'high'); dirigenten +3,2 slag (SECTION_UNIT_MIN_MS + nästa slag). m1: detektorn 2,5, dirigenten 0,25.

| del | vad den gör | mått den bär |
|---|---|---|
| A snabb kant upp (analyserSection.ts: qd0/qd1, fastEdgeCheck, prevMed, bKicks per s i korta block) | edgeUp på 500 ms | m2 (A+C) +4,75; detektorn 3,0 -> 2,5 slag |
| A2 snabb kant ned (750 ms <= high - 6 dB) | edgeDown utan andra blocket | liten: sond utan A2 gav samma sektionsbyten i 151659 till 393 s |
| B tröskel (analyserProfile.ts SECTION_RUN 5->4, RUN_IN 3->2, bara DMX) | tiern byter tidigare | m1-m2 = +10 poäng (gräns 16,4->20,6, etta 17,5->27,9) men 5 korta 'low'-dippar i 151659 |
| C dirigenten (effects.ts SECTION_UNIT_MIN_MS 2000->0) | byte på nästa slag | dirigentens del 3,2 -> 0,25 slag |

**SIFFROR:**

| | gräns % | lag | etta % | lösa | byten | ljus | poäng |
|---|---|---|---|---|---|---|---|
| bas | 12,7 | 10,0 | 17,7 | 1,14 | 3,52 | - | - |
| m1 A+A2+B+C (inlämnad) | 20,6 | 8,6 | 27,9 | 1,51 | 4,20 | -2,7 DISK | +15,02 |
| m2 A+C | 16,4 | 9,2 | 17,5 | 1,17 | 3,63 | -3,9 DISK | +4,75 |

m1 per fil gräns/lag/etta/lösa/byten: 151659 6,7/10,2/20,0/1,63/4,07; 171840 22,7/8,4/22,2/1,26/3,79; 193040 32,3/7,2/41,4/1,64/4,75.
Ljuset m1: koreografi -4,8 (l151659 jitter 33,3 -> 40,7 ms), kontrast -1,8, takt -1,0. m2: koreografi -10,7 (nu l171840 jitter 18,5 -> 29,6,
l151659 identisk med bas). Sämre: lösa +0,37/min, byten +0,7/min, ljuset.

**TILL JOKERN:** ljusspärren föll på jitter i EN fil och bytte fil när looktajmingen ändrades - den följer vilken look som råkar spela.
A+C är billiga men inte ensamma säkra; kombinera med en grind som håller lookvalet stilla.

**RISKEN:** live-mic: kvartsfönstret är brusigare än blocket (6 dB är skyddet). Låtbyten: kanten kräver nb >= 4 och ett refrängankare,
som förut. Breaks/stopp: B ger korta 'low' i långa refränger. Uppbyggnader: kanten kan fyra före smällen om de stiger 6 dB nära
refrängnivån. Workern: inga nya ramfält, split.ts orört; åtta tal i SectionTracker, ingen allokering per hop.

## DIFFEN (`git diff --no-index src .arena/fras/a2/src`)

```diff
diff --git a/src/ANALYSER_SHARED.md5 b/.arena/fras/a2/src/ANALYSER_SHARED.md5
index f6ba712..6891aa2 100644
--- a/src/ANALYSER_SHARED.md5
+++ b/.arena/fras/a2/src/ANALYSER_SHARED.md5
@@ -1,7 +1,7 @@
 # md5 (CRLF->LF) av de gemensamma filerna - samma i lotus-light-link och dmx-control. Skrivs av analyser_shared.py --write
 1e5942108e88af6bfe857ef56a7429b8 analyser.ts
 b5485714f88c45ec0f55f21b9d5ab20e analyserDrop.ts
-692befa55e7fd906cdc3652af3f27baa analyserSection.ts
+a3d272002b98872837e7622e0f458680 analyserSection.ts
 879ba2122d2a1d3e0eea4082adfd2355 analyserSpectrum.ts
 e92d0d6b4f8dc36abfb8135004260806 analyserLevel.ts
 3b5c715739b3ce3b8668a3a2f0576a6a analyserKick.ts
diff --git a/src/analyserProfile.ts b/.arena/fras/a2/src/analyserProfile.ts
index 7814195..b0fa377 100644
--- a/src/analyserProfile.ts
+++ b/.arena/fras/a2/src/analyserProfile.ts
@@ -34,8 +34,8 @@ export const PROFILE: AnalyserProfile = {
     BEAT_FEED: 'slow',            // a7r: VAR ANALYSATORNS KLOCKA KÖRS (analyser.ts clockMode): 'slow' taktvägen, 'inline' i process(); lotus: osatt (analysatorn matar taktvägen själv, hopSelf)
     // SEKTIONER SOM HALLER (agaren i ladan 10-14: 'mycket go kansla nu'; 23 lang-*.wav: intro 17 -> 10 % av tiden, < 8 s 23 -> 15 %,
     // fladder 41 -> 22, sektionsbyten 3,12 -> 2,44/min, refrangstart oforandrad). Ur refrang/mellanlage kravs 5 raka block, in i refrangen 3.
-    SECTION_RUN: '5',             // var 3
-    SECTION_RUN_IN: '3',          // var 0 (= RUN)
+    SECTION_RUN: '4',             // var 5 (a2 fras); 3 fore 10-14
+    SECTION_RUN_IN: '2',          // var 3 (a2 fras)
     SECTION_CARRY: '40',          // block som bars over latgransen (lotus 4a008a5); var 0. 20 -> 40 (a5r, tvavagar runda 2): latens-form-gransen
                                   // fyrar ~9 s in i nya laten mitt i en sektion; 20 block gav sena etiketter (upp 2,6 -> 3,8 s), ingen nollning gav lampspr pop -6 %
     // BASEN TILLBAKA = HIGH (agaren i ladan 10-19: 'refrangen haller efter dropen'; 24 lang: high +2 s efter drop 12 -> 33, build
diff --git a/src/analyserSection.ts b/.arena/fras/a2/src/analyserSection.ts
index d86d2b9..e40515d 100644
--- a/src/analyserSection.ts
+++ b/.arena/fras/a2/src/analyserSection.ts
@@ -1,7 +1,7 @@
 /**  SEKTIONSFÖLJAREN (utbruten ur analyser.ts 2026-11-14). Anteckningar (kommentarerna som stod i koden): docs/analysator/analyserSection.md */
 import { Analyser, SECTION_AGG_HOP, SECTION_SCORE_F32 } from "./analyser.js";
 
-const DOUBLE_FROM_START = ['secHiStartMs', 'secHiEndMs', 'secPct', 'secSongStartMs', 'secBlkMs', 'secBlkInt', 'secBlkCent', 'secBlkRms2', 'secCurDbSum'] as const;
   // Talfält som ska vara flyttal från start
+const DOUBLE_FROM_START = ['secHiStartMs', 'secHiEndMs', 'secPct', 'secSongStartMs', 'secBlkMs', 'secBlkInt', 'secBlkCent', 'secBlkRms2', 'secCurDbSum', 'qR2', 'qMs', 'qd0', 'qd1', 'qd2'] as const;
   // Talfält som ska vara flyttal från start
 
 export class SectionTracker {
   a: Analyser;
   // analysatorn som äger den här delen
@@ -41,6 +41,8 @@ export class SectionTracker {
   private secLog: Array<{ label: string; startMs: number; endMs: number; db: number; dens: number }> = [];
   private secCurDbSum = 0; private secCurDbN = 0; private secCurDens = 0; lastHighDb = NaN;
   private static readonly SEC_EDGE_DB = 4;
   // SNABBA KANTER
+  private static readonly FAST_EDGE_DB = 2;   // SNABB KANT
+  private qR2 = 0; private qN = 0; private qMs = 0; private qd0 = 0; private qd1 = 0; private qd2 = 0; private qOk = 0; private fastEdge = 0;
   secCarryHighDb = NaN; private secHiEndMs = 0; private secEdgeBuf = new Float64Array(16);
   private secBlkMs = 0; private secBlkN = 0; private secBlkInt = 0; private secBlkKicks = 0; private secBlkCent = 0; private secBlkSpec = new Float32Array(8);
   private secTierRun = 0; private secTierCand = 1; private secRiseRun = 0; private secSongStartMs = 0; private secDropSeen = 0; private secSilentBlocks = 0; private secDropHoldUntil = 0;
@@ -82,6 +84,7 @@ export class SectionTracker {
     this.secBlkFeat.length = 0; this.secBlkHi.length = 0; this.secPct = 0;
 
     this.secBlkHighH.length = 0; this.bndRef.fill(0); this.a.boundaryNov = 0;
+    this.qR2 = 0; this.qN = 0; this.qMs = 0; this.qOk = 0; this.fastEdge = 0;
   }
 
   /** Tar BLOCKSUMMOR. */
@@ -92,13 +95,39 @@ export class SectionTracker {
     this.secBlkMs += dtMs; this.secBlkN += hops; this.secBlkInt += intSum; this.secBlkKicks += kicks; this.secBlkCent += centSum; this.secBlkRms2 += rms2Sum;
     this.secBlkBon += bonSum; this.secBlkBpk += bpk; this.secBlkFlux += fluxSum; this.secBlkRms4 += rms4Sum;
     for (let i = 0; i < 8; i++) this.secBlkSpec[i] += spec[specOff + i];
+    this.qMs += dtMs; this.qR2 += rms2Sum; this.qN += hops;
+    if (this.qMs >= 250) {
+      this.qd2 = this.qd1; this.qd1 = this.qd0; this.qd0 = 10 * Math.log10(this.qR2 / (this.qN || 1) + 1e-10); if (this.qOk < 3) this.qOk++; this.qMs = 0; this.qR2 = 0; this.qN = 0;
+      if (this.secBlkMs >= 250 && this.secBlkMs < 1000 && this.fastEdgeCheck()) { this.sectionBlock(nowMs, breaking); return; }
+    }
     if (this.secBlkMs < 1000) return;
     this.sectionBlock(nowMs, breaking);
   }
 
+  /** Median av de m senaste blocken fore index end. */
+  private prevMed(end: number): number {
+    const D = this.secBlkDb, barMs = this.a.localBpm > 40 ? 240000 / this.a.localBpm : 4 * Analyser.BE_FALLBACK_MS;
+    const m = Math.min(end, 4 * Math.max(2, Math.min(4, Math.round(barMs / 1000)))), w = this.secEdgeBuf;
+    if (m < 4) return NaN;
+    for (let i = 0; i < m; i++) { const v = D[end - 1 - i]; let k = i; while (k > 0 && w[k - 1] > v) { w[k] = w[k - 1]; k--; } w[k] = v; }
+    return w[m >> 1];
+  }
+
+  /** SNABB KANT. */
+  private fastEdgeCheck(): boolean {
+    const E = SectionTracker.SEC_EDGE_DB, F = E + SectionTracker.FAST_EDGE_DB, nb = this.secBlkDb.length;
+    if (nb < 4 || this.qOk < 3 || this.a.activeMs === 0) return false;
+    if (this.a.section === 'high') { if (Math.max(this.qd0, this.qd1, this.qd2) <= this.lastHighDb - F) this.fastEdge = -1; }
+    else {
+      const ref = this.lastHighDb === this.lastHighDb ? this.lastHighDb : this.secCarryHighDb, lo = Math.min(this.qd0, this.qd1);
+      if (lo >= ref - E && lo - this.prevMed(nb) >= F) this.fastEdge = 1;
+    }
+    return this.fastEdge !== 0;
+  }
+
   /** Blockets sardrag och etikett. */
   private sectionBlock(nowMs: number, breaking: boolean): void {
-    const n = this.secBlkN || 1; const bInt = this.secBlkInt / n; const bKicks = this.secBlkKicks; const bCent = this.secBlkCent / n;
+    const n = this.secBlkN || 1; const bInt = this.secBlkInt / n; const bKicks = this.secBlkMs < 950 ? this.secBlkKicks * 1000 / this.secBlkMs : this.secBlkKicks; const bCent = this.secBlkCent / n;
     const blkDb = 10 * Math.log10(this.secBlkRms2 / n + 1e-10);
     const bBon = this.secBlkBon / n, bBpk = this.secBlkBpk / Math.max(0.25, this.secBlkMs / 1000), bFlux = this.secBlkFlux / n;
     const m2 = this.secBlkRms2 / n, v2 = this.secBlkRms4 / n - m2 * m2; const bDyn = m2 > 1e-12 ? Math.sqrt(Math.max(0, v2)) / m2 : 0;
@@ -121,17 +150,11 @@ export class SectionTracker {
     if (this.secTierRun >= runNeed) this.a.sectionTier = this.secTierCand;
     let edgeUp = false, edgeDown = false, fallen = false;
     {
-      const D = this.secBlkDb, nb = D.length, E = SectionTracker.SEC_EDGE_DB, ref = this.lastHighDb === this.lastHighDb ? this.lastHighDb : this.secCarryHighDb;
-      fallen = nb >= 2 && blkDb <= this.lastHighDb - E && D[nb - 2] <= this.lastHighDb - E / 2;
+      const D = this.secBlkDb, nb = D.length, E = SectionTracker.SEC_EDGE_DB, ref = this.lastHighDb === this.lastHighDb ? this.lastHighDb : this.secCarryHighDb, fe = this.fastEdge; this.fastEdge = 0;
+      fallen = fe < 0 || (nb >= 2 && blkDb <= this.lastHighDb - E && D[nb - 2] <= this.lastHighDb - E / 2);
       if (this.a.section === 'high') edgeDown = fallen;
-      else if (blkDb >= ref - E) {
-        const barMs = this.a.localBpm > 40 ? 240000 / this.a.localBpm : 4 * Analyser.BE_FALLBACK_MS;
-        const m = Math.min(nb - 1, 4 * Math.max(2, Math.min(4, Math.round(barMs / 1000)))), w = this.secEdgeBuf;
-        if (m >= 4) {
-          for (let i = 0; i < m; i++) { const v = D[nb - 2 - i]; let k = i; while (k > 0 && w[k - 1] > v) { w[k] = w[k - 1]; k--; } w[k] = v; }
-          edgeUp = blkDb - w[m >> 1] >= E;
-        }
-      }
+      else if (fe > 0) edgeUp = true;
+      else if (blkDb >= ref - E) { const md = this.prevMed(nb - 1); if (md === md) edgeUp = blkDb - md >= E; }
       if (edgeUp || edgeDown) { this.a.sectionTier = edgeUp ? 2 : 0; this.secTierCand = this.a.sectionTier; this.secTierRun = 0; }
     }
     const st = this.a.sectionTier;
diff --git a/src/effects.ts b/.arena/fras/a2/src/effects.ts
index ff4645c..905613b 100644
--- a/src/effects.ts
+++ b/.arena/fras/a2/src/effects.ts
@@ -308,7 +308,7 @@ const PULSE_IDX_INIT = -2e9;
 /** SECTION_UNIT (ladan 16:45): forvarningens 'high' 600 ms fore en forutsedd refrang och drop-fonstrets 'high' raknas INTE som sektionsgrans
  *  (de gav high<->low-hopp pa 1-2 s nar refrangen uteblev). Bara den raa sektionen, och den maste vara minst DMX_SECTION_UNIT_MIN_MS gammal. */
 const GAP_HOLD_MS = 4000;   // I LUCKAN: spärren efter uppbyggnadssignalen släpper senast efter 4 s (signal -> landning median 1,8 s)
-const SECTION_UNIT_MIN_MS = 2000;   // 4000 -> 2000 (ladan 10-21: ny look 4-6 s efter sektionsbytet; replay 4,0 -> 2,0 s, korta looker 3 -> 2)
+const SECTION_UNIT_MIN_MS = 0;   // 4000 -> 2000 (ladan 10-21) -> 0 (fras a2: detektorns dwell + snabba kanten bär kontrollen)
 /** LÅTMANUS (10-12 kväll, ägaren: "olika effekter hoppar hela tiden ... mer som att den är förprogrammerad" + "allt mer känns anpassat
  *  efter låten och som att de hänger ihop"). ERSÄTTER frasväxlingen (A/B-look var 8:e takt), basgångs-, karaktärs- och tempobytet,
  *  reservklockan och 'ny låt' på sektionen intro. Låten får ETT manus: första gången en sektionstyp (intro/low/build/high/break) kommer
```
