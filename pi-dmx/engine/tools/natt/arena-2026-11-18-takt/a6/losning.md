# a6 BANDEN - fasen ur flera band, vägda efter regelbundenhet

## Idén
Klockans fas (onsetStep) vek bara EN signal: dB-stigningen i sub+kick. dB är skalfritt, så en svag offbeat-basnot ger lika stor topp som kicken, och vikningen får två lika höga toppar (slag + motslag) som klockan hoppar mellan (motslag, glider). Nu viks sex band (sub, kick, bas, lågmid, mid, diskant = highMid+treble) som LINJÄR amplitudstigning var för sig. Varje vikning normeras till sitt medel och vägs efter sin regelbundenhet (topp/medel - 1), sedan summeras de. Det band som bär slaget styr fasen, och ett band som är tvetydigt mellan slag och motslag väger lite.

## Delarna
| del | vad den gör | mått (m1) |
|---|---|---|
| A bandvikningen (`phV/phF/phFold`, onsetStep) | sex linjära bandstigningar per hop, vikta i samma slinga som förr, vägd summa ger fas och poäng för fintempot | FEL 29,9 -> 10,8; motslag 6,3 -> 0,7; glider 14,2 -> 3,8 |
| B lead-ankaret (`bestLag/phLag`) | när subk-vikningens topp ligger inom 4 fack från bandtoppen lärs skillnaden (EMA 0,05, tak 30 ms) och läggs på, så fasens tidsreferens förblir subk (som lead är kalibrerad mot). Bara ljud, inget facit | lead 151659: utan B -67 ms (sond, 14 ms från bas = DISK), med B -60 (7 ms) |
| C split.ts | taktvägens record får lowMid/mid/highMid (19 -> 22 fält) | krävs för A i delat läge |

Tempot (tgScore/peakVote/pwJudge) och ettan är orörda.

## Kostnaden
Allt nytt räknande ligger i workern (BeatFeed). Per hop: 6 bandstigningar, och i onsetStep sex extra additioner per onset (~940 st i 5 s-fönstret) plus phFold (6 x 48 x 2). Uppskattat +30-50 % på workern, långt under x4. Huvudtråden skriver 3 doubles till per hop. Nytt minne ~27 kB (phV 24 kB). Ingen allokering per hop.

## Siffrorna (m1, övningen)
| fil | FEL bas -> a6 | motslag | glider | fel tempo | lead bas -> a6 | etta bas -> a6 |
|---|---|---|---|---|---|---|
| 151659 | 32,7 -> 10,4 | 12,2 -> 0 | 10,2 -> 2,1 | 6,1 -> 4,2 | -53 -> -60 | 97,8 -> 93,9 |
| 160345 | 33,9 -> 8,9 | 3,6 -> 0 | 21,4 -> 5,4 | 7,1 -> 3,6 | -60 -> -67 | 90,4 -> 91,9 |
| 200719 | 23,0 -> 13,0 | 3,0 -> 2,0 | 11,0 -> 4,0 | 7,0 -> 7,0 | -60 -> -67 | 68,9 -> 67,0 |

Medel: FEL 10,8 (poäng **+19,1**), oktav 4,9 (bas 10,4), etta 84,2 (bas 85,7). Lyftet gäller alla tre filerna, inte en.
Sämre: ettan på 151659 (-3,9) och 200719 (-1,9), och lead ligger 7 ms tidigare på alla tre filer (spärren är 10).

Offline-förprov (fri analys av analysatorns bandfält mot Beat This, bara övningen): fasens träff inom +-60 ms gick från 0,74 (subk dB) till 0,90 (sex band, reg-vägda). Lika vikt gav 0,89, så linjär stigning och fler band bär det mesta. Regelbundenhetsvikten ger bara lite till.

## Risken
- **Lead-marginalen är 3 ms.** Bandsumman ligger ~10-14 ms före subk (låga IIR-band har grupplöptid). B tar bort det mesta men inte allt. Jokern kan behöva ett starkare ankare.
- Musik utan trumma eller med bara pad: regelbundenheten blir låg i alla band, poängen faller under ONSET_MIN_PEAK och fasen rättas inte (som förr i brus).
- Live-mic: diskantbandet tar upp rumsbrus och prat, men det får låg vikt eftersom det inte är regelbundet.
- Låtbyten och breaks: ankaret phLag nollställs aldrig. Det är kedjans fördröjning och inte låtens, men en låt med lång ansats kan dra det upp till 30 ms.
- Lotus (FAST_BANDS av): specAbs uppdateras där bara var BIG_EVERY hop, så den linjära stigningen blir grövre. Det är inte mätt.

## Diffen
```diff
diff --git a/src/analyserClock.ts b/.arena/takt/a6/src/analyserClock.ts
index 0bbcb78..0832641 100644
--- a/src/analyserClock.ts
+++ b/.arena/takt/a6/src/analyserClock.ts
@@ -23,6 +23,7 @@ const TRUST_REPEAT_BEATS = 2, TRUST_REPEAT_TOL = 0.06;   // TILLITEN
 const TRUST_UP = Number(process.env.DMX_TRUST_UP || '0.12'), TRUST_LEAK_MS = Number(process.env.DMX_TRUST_LEAK_MS || '4000');   // PROVRATTAR 2026-11-07
 const ONSET_WIN_MS = 5000, ONSET_EVERY_MS = 250, ONSET_BINS = 48, ONSET_RING = 1024, ONSET_MIN_PEAK = 1.5;   // LÖPANDE TAKT
 const FEED_RISE_HOPS = 6;   // BASENS STIGNING
+const PH_B = 6, PH_W = 4, PH_LAG_A = 0.05, PH_LAG_MAX = 30;   // FASEN UR BANDEN (a6)
 const BREAK_HOLD_MS = 20000;   // TVÅ RUTNÄT
 const BREAK_RESTORE_MS = Number(process.env.DMX_BREAK_RESTORE_MS ?? String(BREAK_HOLD_MS));
 const BAR_DECAY = 0.99, BAR_MIN = 16, BAR_MARGIN = 0.06, BAR_W_BASS = 0.5, BAR_WIN0 = -0.2, BAR_WIN1 = 0.3, BAR_RISE_HOPS = 6, BAR_R_MAX = 2, BAR_W_BEAT = 0.25, BAR_Q = 8, BAR_BEAT_Q = 2;   // ETTAN I EFFEKTKLOCKANS RUTNÄT
@@ -67,6 +68,8 @@ export class BeatFeed {
   private readonly onT = new Float64Array(ONSET_RING); private readonly onV = new Float32Array(ONSET_RING); private readonly hiV = new Float32Array(ONSET_RING); private hiPrev = 0; private onPos = 0; private onN = 0; private onHalf = false; private onPrev = 0;   // LÖPANDE TAKT
   private readonly foldS = new Float64Array(ONSET_BINS); private readonly foldN = new Float64Array(ONSET_BINS); private onNext = 0;
   onsetFixes = 0;
+  private readonly phV = new Float32Array(ONSET_RING * PH_B); private readonly phA = new Float64Array(FEED_RISE_HOPS * PH_B); private readonly phP = new Float64Array(PH_B);   // FASEN UR BANDEN
+  private readonly phF = new Float64Array(ONSET_BINS * PH_B); private readonly phC = new Float64Array(ONSET_BINS);
   private readonly riseDb = new Float64Array(FEED_RISE_HOPS); private risePos = 0;
   private readonly fullS = new Float64Array(ONSET_BINS); private readonly fullN = new Float64Array(ONSET_BINS);   // HELA TEMPOOMRÅDET
   private readonly tgAcc = new Float64Array(TG_K).fill(-1); private readonly tgH = new Float64Array(ONSET_BINS); private tgK = 0; private tgN = 0;
@@ -98,9 +101,23 @@ export class BeatFeed {
   static analyserCfg<T extends object>(cfg: T): T { return { ...cfg, beat: null }; }
 
   private foldMean(k: number): number { const q = (k + ONSET_BINS) % ONSET_BINS; return this.foldN[q] ? this.foldS[q] / this.foldN[q] : 0; }
+  /** FASEN UR BANDEN. */
+  private phFold(): number {
+    const F = this.phF, N = this.foldN, C = this.phC; C.fill(0); let any = false;
+    for (let k = 0; k < PH_B; k++) {
+      let mu = 0, mx = 0;
+      for (let b = 0; b < ONSET_BINS; b++) { const v = N[b] ? F[b * PH_B + k] / N[b] : 0; mu += v; if (v > mx) mx = v; }
+      mu /= ONSET_BINS; if (!(mu > 0)) continue;
+      const w = (mx / mu - 1) / mu; any = true;
+      for (let b = 0; b < ONSET_BINS; b++) if (N[b]) C[b] += w * F[b * PH_B + k] / N[b];
+    }
+    if (!any) return 0;
+    let m = 0; for (let b = 0; b < ONSET_BINS; b++) m += C[b];
+    return m / ONSET_BINS;
+  }
 
   private scanStep = 0.005; private scanC = 99; private scanEnd = 0; private scanRef = 0; private scanNow = 0; private scanC0 = 0;   // Sökningen sprids över hoppen
-  private bestScore = 0; private bestBpm = 0; private bestPh = 0; private scanFar = 0;
+  private bestScore = 0; private bestBpm = 0; private bestPh = 0; private scanFar = 0; private bestLag = NaN; private phLag = 0;
 
   /** LÖPANDE TAKT. */
   private onsetStep(cfg: EngineConfig, now: number): void {
@@ -118,23 +135,28 @@ export class BeatFeed {
     }
     const c = this.scanC++, ref = this.scanRef;
     const bpm = this.scanC0 * (1 + c * this.scanStep), bm = 60000 / bpm;
-    this.foldS.fill(0); this.foldN.fill(0);
-    let tot = 0, n = 0;
+    this.foldS.fill(0); this.foldN.fill(0); this.phF.fill(0);
+    let tot = 0, n = 0; const PV = this.phV, PF = this.phF;
     for (let i = 0; i < this.onN; i++) {
       const j = (this.onPos - 1 - i + ONSET_RING) % ONSET_RING, t = this.onT[j];
       if (t > this.scanNow) continue;
       if (this.scanNow - t > ONSET_WIN_MS) break;
       const r = (t - ref) % bm, b = Math.floor(((r < 0 ? r + bm : r) / bm) * ONSET_BINS) % ONSET_BINS;
       this.foldS[b] += this.onV[j]; this.foldN[b]++; tot += this.onV[j]; n++;
+      const o = b * PH_B, q = j * PH_B; for (let k = 0; k < PH_B; k++) PF[o + k] += PV[q + k];
     }
     if (n >= 100 && tot > 0) {
-      const mean = tot / n; let mx = 0, mb = 0;
-      for (let b = 0; b < ONSET_BINS; b++) { const v = this.foldN[b] ? this.foldS[b] / this.foldN[b] : 0; if (v > mx) { mx = v; mb = b; } }
-      const score = (mx / mean) * (c === 0 && this.scanStep === 0.005 ? SCAN_HOLD : 1);
+      const mean = this.phFold(), C = this.phC; let mx = 0, mb = 0;
+      for (let b = 0; b < ONSET_BINS; b++) { const v = C[b]; if (v > mx) { mx = v; mb = b; } }
+      const score = mean > 0 ? (mx / mean) * (c === 0 && this.scanStep === 0.005 ? SCAN_HOLD : 1) : 0;
       if (score > this.bestScore) {
-        const a = this.foldMean(mb - 1), cc = this.foldMean(mb), d = this.foldMean(mb + 1), den = a - 2 * cc + d;
+        const a = C[(mb + ONSET_BINS - 1) % ONSET_BINS], cc = C[mb], d = C[(mb + 1) % ONSET_BINS], den = a - 2 * cc + d;
         const off = den < 0 ? 0.5 * (a - d) / den : 0;
         this.bestScore = score; this.bestBpm = bpm; this.bestPh = (mb + 0.5 + off) / ONSET_BINS;
+        let sx = 0, sb = 0; for (let b = 0; b < ONSET_BINS; b++) { const v = this.foldMean(b); if (v > sx) { sx = v; sb = b; } }
+        const dd = Math.abs(sb - mb), dk = dd < ONSET_BINS - dd ? dd : ONSET_BINS - dd;
+        if (dk <= PH_W && sx > 0) { const a2 = this.foldMean(sb - 1), d2 = this.foldMean(sb + 1), de = a2 - 2 * sx + d2; let l = (sb + 0.5 + (de < 0 ? 0.5 * (a2 - d2) / de : 0)) / ONSET_BINS - this.bestPh; l -= Math.round(l); this.bestLag = l; }
+        else this.bestLag = NaN;
       }
     }
     if (c < this.scanEnd || this.bestScore < ONSET_MIN_PEAK) return;
@@ -144,7 +166,8 @@ export class BeatFeed {
     const nb = 60000 / this.bestBpm;
     beat.bpm = this.bestBpm; beat.anchorMs = now - (idx + fr) * nb;
     const shift = ((((beat.anchorMs - ref) % nb) + nb) % nb) / nb;
-    let err = this.bestPh - shift; err -= Math.round(err);
+    if (this.bestLag === this.bestLag) { const l = this.phLag + PH_LAG_A * (this.bestLag * nb - this.phLag); this.phLag = l > PH_LAG_MAX ? PH_LAG_MAX : l < -PH_LAG_MAX ? -PH_LAG_MAX : l; }
+    let err = this.bestPh + this.phLag / nb - shift; err -= Math.round(err);
     beat.anchorMs += err * nb;
     this.onsetFixes++;
   }
@@ -522,6 +545,13 @@ export class BeatFeed {
     if (frame.kickAtMs > 0 && frame.kickAtMs !== this.kickRingLast) { this.kickRingLast = frame.kickAtMs; this.kickRing[this.kickRingPos] = frame.kickAtMs; this.kickRingPos = (this.kickRingPos + 1) & 63; if (this.kickRingN < 64) this.kickRingN++; }
     {
       const sa = frame.specAbs, db = 20 * Math.log10((sa?.sub ?? 0) + (sa?.kick ?? 0) + 1e-7);
+      { const H = this.phA, P = this.phP, o = this.risePos * PH_B, w = this.onPos * PH_B, V = this.phV;
+        for (let k = 0; k < PH_B; k++) {
+          const x = k === 0 ? sa?.sub ?? 0 : k === 1 ? sa?.kick ?? 0 : k === 2 ? sa?.bass ?? 0 : k === 3 ? sa?.lowMid ?? 0 : k === 4 ? sa?.mid ?? 0 : (sa?.highMid ?? 0) + (sa?.treble ?? 0);
+          const r = x - H[o + k], u = r > 0 ? r : 0; H[o + k] = x;
+          if (this.onHalf) V[w + k] = u > P[k] ? u : P[k];
+          P[k] = u;
+        } }
       const old = this.riseDb[this.risePos]; this.riseDb[this.risePos] = db; this.risePos = (this.risePos + 1) % FEED_RISE_HOPS;
       const ok = old !== 0 && db > old ? db - old : 0;
       const hi = (frame.onset?.highMid ?? 0) + (frame.onset?.treble ?? 0);
diff --git a/src/split.ts b/.arena/takt/a6/src/split.ts
index 3997f13..082039d 100644
--- a/src/split.ts
+++ b/.arena/takt/a6/src/split.ts
@@ -137,12 +137,12 @@ export const BS_SEQ = 0, BS_BODY = 1, BS_DROPS = 2, BS_MINI = 3, BS_BUILD = 4, B
 export const BIG_STATE_LEN = 24;
 export const SPEC_SLOTS = 16, SPEC_MAX = 1024;   // 16 spektra
 
-export const HOP_REC_LEN = 19;   // TAKTVÄGEN
+export const HOP_REC_LEN = 22;   // TAKTVÄGEN
 export const HOP_RING_N = 4096;
 export const H_SEQ = 0, H_NOW = 1 , H_TS = 2 ,
   H_BPM = 3, H_CONF = 4, H_ANCHOR = 5, H_KICKAT = 6, H_BARSHIFT = 7, H_ON_KICK = 8, H_ON_HIMID = 9, H_ON_TREBLE = 10, H_SA_SUB = 11, H_SA_KICK = 12, H_SA_BASS = 13 ,
   H_BOUND = 14 , H_QUIET = 15 ,
-  H_SURE = 16 , H_UNDER = 17 , H_SA_TREBLE = 18;
+  H_SURE = 16 , H_UNDER = 17 , H_SA_TREBLE = 18, H_SA_LOWMID = 19, H_SA_MID = 20, H_SA_HIMID = 21;
 export const C_HOP_WRITE = 4, C_HOP_READ = 5, C_FEED_SEQ = 6 , C_WAKE = 7 ;
 export const FS_HOP_SEQ = 0, FS_BEAT = 1 , FS_ANCHOR = 2, FS_BPM = 3, FS_BCONF = 4,
   FS_BEATERR = 5 , FS_FCONF = 6 , FS_GRID = 7 ,
@@ -153,7 +153,7 @@ export const FEED_STATE_LEN = 20;
 
 /** Det taktmatningen läser ur ramen, och det den skriver. */
 export interface HopFrame { bpm: number; bpmConfidence: number; beatAnchorMs: number; kickAtMs: number; barShift: number; beatTrust?: number;
-  onset: { kick: number; highMid: number; treble: number }; specAbs: { sub: number; kick: number; bass: number; treble: number } }
+  onset: { kick: number; highMid: number; treble: number }; specAbs: { sub: number; kick: number; bass: number; treble: number; lowMid: number; mid: number; highMid: number } }
 export interface HopGrid { anchorMs: number; bpm: number; confidence?: number }
 export interface HopCfg { beat?: HopGrid | null; beatErr?: number }
 export interface HopTarget { resetTempo(): void; resetBar(): void; setClockGrid?(g: HopGrid | null): void; trackBoundaries?: number; quietMs?: number; boundSure?: boolean; bodyUnderDb?: number;
@@ -181,6 +181,7 @@ export class HopLaneFast {
     r[o + H_BPM] = f.bpm; r[o + H_CONF] = f.bpmConfidence; r[o + H_ANCHOR] = f.beatAnchorMs; r[o + H_KICKAT] = f.kickAtMs; r[o + H_BARSHIFT] = f.barShift;
     r[o + H_ON_KICK] = f.onset?.kick ?? 0; r[o + H_ON_HIMID] = f.onset?.highMid ?? 0; r[o + H_ON_TREBLE] = f.onset?.treble ?? 0;
     r[o + H_SA_SUB] = f.specAbs?.sub ?? 0; r[o + H_SA_KICK] = f.specAbs?.kick ?? 0; r[o + H_SA_BASS] = f.specAbs?.bass ?? 0; r[o + H_SA_TREBLE] = f.specAbs?.treble ?? 0;
+    r[o + H_SA_LOWMID] = f.specAbs?.lowMid ?? 0; r[o + H_SA_MID] = f.specAbs?.mid ?? 0; r[o + H_SA_HIMID] = f.specAbs?.highMid ?? 0;
     r[o + H_BOUND] = an.trackBoundaries ?? 0; r[o + H_QUIET] = an.quietMs ?? 0; r[o + H_SURE] = an.boundSure ? 1 : 0; r[o + H_UNDER] = an.bodyUnderDb ?? 0;
     r[o + H_SEQ] = seq;
     Atomics.store(ctrl, C_HOP_WRITE, seqLow(seq)); Atomics.add(ctrl, C_WAKE, 1);
@@ -222,7 +223,7 @@ export class HopLaneSlow {
   private seq: number; private rt: number; private rb: number; private processed: number;
   private skipped = 0; private lagMaxMs = 0; private busyEmaUs = 0; private busyMaxUs = 0; private fconf = NaN;
   private readonly fr = { bpm: 0.5, bpmConfidence: 0.5, beatAnchorMs: 0.5, kickAtMs: 0.5, barShift: 0.5,
-    onset: { kick: 0.5, highMid: 0.5, treble: 0.5 }, specAbs: { sub: 0.5, kick: 0.5, bass: 0.5, treble: 0.5 } };
+    onset: { kick: 0.5, highMid: 0.5, treble: 0.5 }, specAbs: { sub: 0.5, kick: 0.5, bass: 0.5, treble: 0.5, lowMid: 0.5, mid: 0.5, highMid: 0.5 } };
   private readonly cfg: HopCfg = { beat: undefined, beatErr: undefined };
   private grid: HopGrid | null = null;
   private readonly target: HopTarget = { trackBoundaries: 0, quietMs: 0, resetTempo: () => { this.rt++; }, resetBar: () => { this.rb++; }, setClockGrid: (g) => { this.grid = g; } };
@@ -245,6 +246,7 @@ export class HopLaneSlow {
       fr.bpm = r[o + H_BPM]; fr.bpmConfidence = r[o + H_CONF]; fr.beatAnchorMs = r[o + H_ANCHOR]; fr.kickAtMs = r[o + H_KICKAT]; fr.barShift = r[o + H_BARSHIFT];
       fr.onset.kick = r[o + H_ON_KICK]; fr.onset.highMid = r[o + H_ON_HIMID]; fr.onset.treble = r[o + H_ON_TREBLE];
       fr.specAbs.sub = r[o + H_SA_SUB]; fr.specAbs.kick = r[o + H_SA_KICK]; fr.specAbs.bass = r[o + H_SA_BASS]; fr.specAbs.treble = r[o + H_SA_TREBLE];
+      fr.specAbs.lowMid = r[o + H_SA_LOWMID]; fr.specAbs.mid = r[o + H_SA_MID]; fr.specAbs.highMid = r[o + H_SA_HIMID];
       const cin = fr.bpmConfidence;
       this.feed.update(fr, this.cfg, this.target, r[o + H_NOW]);
       this.fconf = fr.bpmConfidence !== cin ? fr.bpmConfidence : NaN;
```
