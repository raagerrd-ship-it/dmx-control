# f0 – finalremixen (jokern): a6r + a8r:s backbeat

## IDÉN
Grunden är a6r. Den räknar glidningen per färdigmätt slag. Relock flyttar inte det inre ankaret, så ettan påverkar aldrig tempo eller fas, och barOff ökar bara, så inget extra tick uppstår. Beslutet är r0:s: andelar, marginal och a2:s återstart med tak. Ovanpå det ligger a8r:s backbeat-term i den form som höll på mellanmängden: diskantens anslag i slagets första fjärdedel, som skiljer {1,3} från {2,4}, och basens diskant-emot-term B borttagen. Övrigt är orört. En mätning är använd av tre, inga sonder.

## DELAR
| del | från vem | mått | med/struken + skäl |
|---|---|---|---|
| Glidräkning per färdigmätt slag (J += Δidx − Δtb/per, ramen byts vid barCommit) | a6 → a6r | a6r övning 83,7 / 0,63 (+54,15), mellan 68,8 / 1,29 (+35,62, bäst) | MED (grunden) |
| Relock utan ankarskifte (barM = barOff & 3, barOff kvar) | a6r | a6r 172432 48,2 → 70,2; tempot oberoende av ettan | MED (grunden) |
| barOff ökar bara (inget extra tick) | fusion (r0) | paslag f0 70,97 (bas 70,36) | MED (grunden) |
| Andelsbeslut + återstart R, tak BAR_R_MAX 2 | a2 + fusion (r0) | i a6r | MED (grunden) |
| **Backbeat-termen** (barBack, barX/barV/barVc/barTi/barTe, BAR_W_BEAT 0,25, BAR_Q 8, BAR_BEAT_Q 2) | a8 → a8r | **f0 m1 mot a6r: etta 83,7 → 86,5, omval 0,63 → 0,48, +3,50**. Alla filer upp eller lika: 151659 91,1 → 97,8 (omval 0,35 → 0,00), 172432 70,2 → 71,3 (0,94 → 0,83), 160345 89,9 → 90,4. a8r mot r0 på mellan: 59,7 → 63,2, omval 1,88 → 1,70 (+4,4). Teori-form med en vikt, inte skattad ur facit | MED. Bär ovanpå a6r på alla tre filerna och höll på osedd musik |
| B bort (BAR_W_BACK, barB/bB) | a8r | a8r m2 mot m1: −0,3 (brus). B:s massa per Beat This-plats är platt eller fel (160345: högst på 1 och 4) | MED, eftersom det är den form av a8r som döms på mellan. Backbeaten ersätter den |
| split.ts: specAbs.treble i taktvägen (H_SA_TREBLE, HOP_REC_LEN 19) | a8 → a8r | inget på bänken (inline), krävs i ladans delade läge (workern) | MED |
| bassNov, bastonens byte (FFT i snabba vägen, H_BNOV) | a3 → a3r | övning +4,26 mot r0, men på mellan bara +0,18 mot r0 (60,7 / 2,05 mot 59,7 / 1,88, omval sämre) | STRUKEN: vinner bara på övningen och kostar en 512-FFT var 4:e hop i snabba vägen (även lotus) plus ca 60 kB |
| Topprestart + halv vikt på R (BAR_R_PEAK 0,8, BAR_W_R 0,5) | a1r | övning +3,67 mot r0, mellan −1,97 mot r0 (58,0 / 1,94) | STRUKEN: föll på osedd musik |
| a8r:s glidräkning per hop (a1) | a8r | ersatt av a6r:s per slag, som höll bättre på mellan | STRUKEN: dubblett (en rättning) |

## SIFFRORNA (ettdom m1; ettdom.json = ettdom-m1.json = koden i src)
| fil | etta bas → a6r → **f0** | omval bas → a6r → **f0** | paslag bas → **f0** | förskjutning f0 0/1/2/3 |
|---|---|---|---|---|
| 151659 | 42,5 → 91,1 → **97,8** | 1,28 → 0,35 → **0,00** | 78,0 → 79,4 | 98/1/0/1 |
| 172432 | 32,0 → 70,2 → **71,3** | 1,51 → 0,94 → **0,83** | 51,2 → 51,0 | 71/5/12/12 |
| 160345 | 25,9 → 89,9 → **90,4** | 1,44 → 0,62 → **0,62** | 81,8 → 82,5 | 90/3/1/5 |
| medel | 33,5 → 83,7 → **86,5** | 1,41 → 0,63 → **0,48** | 70,36 → 70,97 | **poäng +57,65 mot bas (+3,50 mot a6r), OK** |

Sämre än bas: paslag i 172432 −0,2 pe (inom spärren). Inget mått är sämre än i a6r. Kvarvarande fel sitter mest i 172432 på förskjutning 2/3. Där har Beat This 98 takter om 2 slag (a8r:s fynd), och där finns de första slagen efter varje relock.

## RISKER
- Backbeaten kräver virvel, clap eller hihat på 2 och 4. Four-on-the-floor med jämn diskant ger X ≈ 0, och då avgör K, R och L som i a6r. Halvtakt (virvel på 3) röstar fel, men vikten 0,25 håller rösten under K+R.
- Utan B kan en låt med tyst diskant och starkt bas-anslag på 3 ge 0/2-förväxling.
- Ramen byts vid barCommit (0,2 slag före nästa slag). Ett ankarhopp mitt i slaget syns ett slag senare (a6r).
- barOff växer utan tak (ca +2 per ettbyte). beatIdx % 16 (frasen) ligger inte där den låg i bas.
- Tempot efter relock är inte bit-identiskt med bas (bas skiftar med sin egen barOff), men det är detsamma oavsett vad ettan väljer.
- Mellan- och kontrollmängden är inte körda på f0. Båda delarna har var för sig hållit på mellan (a6r +35,6, backbeaten +4,4 ovanpå r0), men aldrig tillsammans.
- Kostnad: inga allokeringar per hop. Klockan får 3 Float64Array (4/8/8) och 8 log per slag. Taktvägens hop-ring växer med ett tal per hop (+32 kB). ANALYSER_SHARED.md5 är inte omräknad, och lotus behöver split.ts-ändringen.

## DIFFEN (git diff --no-index --ignore-cr-at-eol .arena/etta/bas/src .arena/etta/f0/src)
```diff
diff --git a/.arena/etta/bas/src/analyserClock.ts b/.arena/etta/f0/src/analyserClock.ts
index 384c61c..0bbcb78 100644
--- a/.arena/etta/bas/src/analyserClock.ts
+++ b/.arena/etta/f0/src/analyserClock.ts
@@ -25,7 +25,7 @@ const ONSET_WIN_MS = 5000, ONSET_EVERY_MS = 250, ONSET_BINS = 48, ONSET_RING = 1
 const FEED_RISE_HOPS = 6;   // BASENS STIGNING
 const BREAK_HOLD_MS = 20000;   // TVÅ RUTNÄT
 const BREAK_RESTORE_MS = Number(process.env.DMX_BREAK_RESTORE_MS ?? String(BREAK_HOLD_MS));
-const BAR_DECAY = 0.99, BAR_MIN = 16, BAR_MARGIN = 0.06, BAR_W_BASS = 0.5, BAR_W_BACK = 0.5, BAR_WIN0 = -0.2, BAR_WIN1 = 0.3, BAR_RISE_HOPS = 6;   // ETTAN I EFFEKTKLOCKANS RUTNÄT
+const BAR_DECAY = 0.99, BAR_MIN = 16, BAR_MARGIN = 0.06, BAR_W_BASS = 0.5, BAR_WIN0 = -0.2, BAR_WIN1 = 0.3, BAR_RISE_HOPS = 6, BAR_R_MAX = 2, BAR_W_BEAT = 0.25, BAR_Q = 8, BAR_BEAT_Q = 2;   // ETTAN I EFFEKTKLOCKANS RUTNÄT
 const TG_HOLD = 1.35;   // HELA TEMPOOMRÅDET
 const TG_SIB = [Math.round(Math.log2(4 / 3) * 139), Math.round(Math.log2(3 / 2) * 139)];   // 4:3 och 3:2 i rutnätets steg
 const TG_SNAP = 0.03, TG_EDGE = 1.03, TG_OCT_UP = 0.85, TG_OCT_DN = 0.4, TG_OCT_A = 0.1;
@@ -83,8 +83,11 @@ export class BeatFeed {
   private pwWn = 0; private pwDt = 0; private pwCand = 0; private pwRun = 0; private pwQuietAt = 0; pwVetos = 0; pwFixes = 0;
   private tgHalfR = 0; octR = 0; private octN = 0; private octHi = false;   // OKTAVKANTEN
   private goodOn = 0; private goodRep = 0; private goodAt = 0;   // TAKTEN GENOM BREAKET
-  private readonly barK = new Float64Array(4); private readonly barL = new Float64Array(4); private readonly barB = new Float64Array(4);   // ETTAN (a5)
-  private barN = 0; private barIdx = NaN; private bK = 0; private bL = 0; private bB = 0; private barOff = 0; barShifts = 0;
+  private readonly barK = new Float64Array(4); private readonly barL = new Float64Array(4);   // ETTAN (a5)
+  private barN = 0; private barIdx = NaN; private bK = 0; private bL = 0; private barOff = 0; barShifts = 0;
+  private barM = 0; private barJ = 0; private barJr = 0; private barPT = 0; private barPI = NaN;   // ettan räknas i musikens slag (a1, per slag a6)
+  private readonly barR = new Float64Array(4); private bE = 0; private bE1 = 0; private bE2 = 0; private bEm = 0;   // kickens återstart (a2)
+  private readonly barX = new Float64Array(4); private readonly barV = new Float64Array(BAR_Q); private readonly barVc = new Float64Array(BAR_Q); private barTi = NaN; private barTe = 0;   // backbeaten (a8r)
   private readonly linK = new Float64Array(BAR_RISE_HOPS); private readonly linL = new Float64Array(BAR_RISE_HOPS); private linPos = 0;
   private innerAnchor = 0; private innerBpm = 0; private innerValid = false;
   private readonly anaGrid = { anchorMs: 0, bpm: 0, confidence: 0 };   // EN KÄLLA
@@ -386,45 +389,67 @@ export class BeatFeed {
     return false;
   }
 
-  private barReset(): void { this.barK.fill(0); this.barL.fill(0); this.barB.fill(0); this.barN = 0; this.barIdx = NaN; this.barOff = 0; }
+  private barReset(): void { this.barK.fill(0); this.barL.fill(0); this.barR.fill(0); this.barX.fill(0); this.barTi = NaN; this.bE1 = 0; this.bE2 = 0; this.bEm = 0; this.barN = 0; this.barIdx = NaN; this.barM = this.barOff & 3; this.barJ = 0; this.barJr = 0; this.barPI = NaN; }
 
   /** ETTAN (se BAR_DECAY). */
   private barStep(frame: Frame, beat: NonNullable<EngineConfig["beat"]>, now: number): void {
     const sa = frame.specAbs, p = this.linPos, k = (sa?.sub ?? 0) + (sa?.kick ?? 0), l = sa?.bass ?? 0;
     const rk = k - this.linK[p], rl = l - this.linL[p]; this.linK[p] = k; this.linL[p] = l; this.linPos = (p + 1) % BAR_RISE_HOPS;
     if (!(beat.bpm > 40)) return;
-    const pos = (now - beat.anchorMs) / (60000 / beat.bpm), idx = Math.floor(pos - BAR_WIN0);
+    const per = 60000 / beat.bpm, pos = (now - beat.anchorMs) / per, idx = Math.floor(pos - BAR_WIN0);
     if (idx !== this.barIdx) {
-      if (idx === this.barIdx + 1) this.barCommit();
-      this.barIdx = idx; this.bK = 0; this.bL = 0; this.bB = 0;
+      if (idx === this.barIdx + 1) this.barCommit(beat.anchorMs + this.barIdx * per, per);
+      this.barIdx = idx; this.bK = 0; this.bL = 0; this.bE = 0;
     }
     if (pos - idx <= BAR_WIN1) {
       if (rk > this.bK) this.bK = rk;
+      if (k > this.bE) this.bE = k;
       if (rl > this.bL) this.bL = rl;
-      const hb = (frame.onset?.highMid ?? 0) + (frame.onset?.treble ?? 0); if (hb > this.bB) this.bB = hb;
     }
+    { const ti = Math.floor(pos);
+      if (ti !== this.barTi) { if (ti === this.barTi + 1) this.barBack(); this.barTi = ti; this.barV.fill(0); this.barVc.fill(0); }
+      const q = Math.min(BAR_Q - 1, Math.floor((pos - ti) * BAR_Q)); this.barV[q] += sa?.treble ?? 0; this.barVc[q]++; }
+    { const d = ((((this.barM + this.barJr - this.barOff) % 4) + 4) % 4); if (d) this.barOff += d; }
+  }
+
+  /** Backbeaten: diskantens anslag i slagets första fjärdedel mot resten av slaget, bokfört på slagets plats (virvel/clap på 2 och 4). */
+  private barBack(): void {
+    const V = this.barV, C = this.barVc, e = this.barTe; let m = 0, a = 0, b = 0;
+    for (let q = 0; q < BAR_Q; q++) { if (!(C[q] > 0)) return; m += V[q] / C[q]; }
+    m /= BAR_Q;
+    if (e > 0) {
+      for (let q = 0; q < BAR_Q; q++) { const v = V[q] / C[q], z = Math.log((v > 0.3 * e ? v : 0.3 * e) / e); if (q < BAR_BEAT_Q) a += z; else b += z; }
+      this.barX[(((this.barTi - this.barJr) % 4) + 4) % 4] += a / BAR_BEAT_Q - b / (BAR_Q - BAR_BEAT_Q);
+    }
+    this.barTe = e > 0 ? e + 0.05 * (m - e) : m;
   }
 
   /** Slaget barIdx är färdigmätt. */
-  private barCommit(): void {
-    const K = this.barK, L = this.barL, B = this.barB, slot = ((this.barIdx % 4) + 4) % 4;
-    for (let i = 0; i < 4; i++) { K[i] *= BAR_DECAY; L[i] *= BAR_DECAY; B[i] *= BAR_DECAY; }
-    K[slot] += this.bK; L[slot] += this.bL; B[slot] += this.bB;
+  private barCommit(tb: number, per: number): void {
+    if (this.barPI === this.barPI) { const j = this.barJ + (this.barIdx - this.barPI) - (tb - this.barPT) / per; this.barJ = j - 4 * Math.floor(j / 4); }
+    this.barPT = tb; this.barPI = this.barIdx; const jr = this.barJr = Math.floor(this.barJ + 0.5);
+    const K = this.barK, L = this.barL, R = this.barR, slot = (((this.barIdx - jr) % 4) + 4) % 4;
+    for (let i = 0; i < 4; i++) { K[i] *= BAR_DECAY; L[i] *= BAR_DECAY; R[i] *= BAR_DECAY; this.barX[i] *= BAR_DECAY; }
+    K[slot] += this.bK; L[slot] += this.bL;
+    { const e = this.bE, pm = this.bE1 > this.bE2 ? this.bE1 : this.bE2;
+      if (this.bEm > 0 && e > pm) R[slot] += Math.min(BAR_R_MAX, (e - pm) / this.bEm);
+      this.bE2 = this.bE1; this.bE1 = e; this.bEm += (e - this.bEm) / 16; }
     if (this.barN < 1000) this.barN++;
     if (this.barN < BAR_MIN) return;
-    const sK = K[0] + K[1] + K[2] + K[3], sL = L[0] + L[1] + L[2] + L[3], sB = B[0] + B[1] + B[2] + B[3];
+    const sK = K[0] + K[1] + K[2] + K[3], sL = L[0] + L[1] + L[2] + L[3], sR = R[0] + R[1] + R[2] + R[3], X = this.barX;
+    const sX = Math.abs(X[0]) + Math.abs(X[1]) + Math.abs(X[2]) + Math.abs(X[3]);
     if (!(sK > 0)) return;
     let bi = 0, best = -1e9, second = -1e9;
     for (let i = 0; i < 4; i++) {
-      const v = K[i] / sK + (sL > 0 ? BAR_W_BASS * L[i] / sL : 0) - (sB > 0 ? BAR_W_BACK * B[i] / sB : 0);
+      const v = K[i] / sK + (sR > 0 ? R[i] / sR : 0) + (sL > 0 ? BAR_W_BASS * L[i] / sL : 0)
+        + (sX > 0 ? BAR_W_BEAT * (X[(i + 1) & 3] + X[(i + 3) & 3] - X[i] - X[(i + 2) & 3]) / sX : 0);
       if (v > best) { second = best; best = v; bi = i; } else if (v > second) second = v;
     }
-    if (bi !== this.barOff && best - second >= BAR_MARGIN) { this.barOff = bi; this.barShifts++; }
+    if (bi !== this.barM && best - second >= BAR_MARGIN) { this.barM = bi; this.barShifts++; }
   }
 
   /** LÅTGRÄNSEN. */
   private relock(soft: boolean): void {
-    if (this.innerValid && this.innerBpm > 0) this.innerAnchor += this.barOff * (60000 / this.innerBpm);
     this.tgReset(soft); this.barReset(); this.goodRep = 0; this.goodOn = 0; this.onNext = 0;
   }
 
diff --git a/.arena/etta/bas/src/split.ts b/.arena/etta/f0/src/split.ts
index 1a44e95..3997f13 100644
--- a/.arena/etta/bas/src/split.ts
+++ b/.arena/etta/f0/src/split.ts
@@ -137,12 +137,12 @@ export const BS_SEQ = 0, BS_BODY = 1, BS_DROPS = 2, BS_MINI = 3, BS_BUILD = 4, B
 export const BIG_STATE_LEN = 24;
 export const SPEC_SLOTS = 16, SPEC_MAX = 1024;   // 16 spektra
 
-export const HOP_REC_LEN = 18;   // TAKTVÄGEN
+export const HOP_REC_LEN = 19;   // TAKTVÄGEN
 export const HOP_RING_N = 4096;
 export const H_SEQ = 0, H_NOW = 1 , H_TS = 2 ,
   H_BPM = 3, H_CONF = 4, H_ANCHOR = 5, H_KICKAT = 6, H_BARSHIFT = 7, H_ON_KICK = 8, H_ON_HIMID = 9, H_ON_TREBLE = 10, H_SA_SUB = 11, H_SA_KICK = 12, H_SA_BASS = 13 ,
   H_BOUND = 14 , H_QUIET = 15 ,
-  H_SURE = 16 , H_UNDER = 17 ;
+  H_SURE = 16 , H_UNDER = 17 , H_SA_TREBLE = 18;
 export const C_HOP_WRITE = 4, C_HOP_READ = 5, C_FEED_SEQ = 6 , C_WAKE = 7 ;
 export const FS_HOP_SEQ = 0, FS_BEAT = 1 , FS_ANCHOR = 2, FS_BPM = 3, FS_BCONF = 4,
   FS_BEATERR = 5 , FS_FCONF = 6 , FS_GRID = 7 ,
@@ -153,7 +153,7 @@ export const FEED_STATE_LEN = 20;
 
 /** Det taktmatningen läser ur ramen, och det den skriver. */
 export interface HopFrame { bpm: number; bpmConfidence: number; beatAnchorMs: number; kickAtMs: number; barShift: number; beatTrust?: number;
-  onset: { kick: number; highMid: number; treble: number }; specAbs: { sub: number; kick: number; bass: number } }
+  onset: { kick: number; highMid: number; treble: number }; specAbs: { sub: number; kick: number; bass: number; treble: number } }
 export interface HopGrid { anchorMs: number; bpm: number; confidence?: number }
 export interface HopCfg { beat?: HopGrid | null; beatErr?: number }
 export interface HopTarget { resetTempo(): void; resetBar(): void; setClockGrid?(g: HopGrid | null): void; trackBoundaries?: number; quietMs?: number; boundSure?: boolean; bodyUnderDb?: number;
@@ -180,7 +180,7 @@ export class HopLaneFast {
     r[o + H_NOW] = now; r[o + H_TS] = performance.timeOrigin + performance.now();
     r[o + H_BPM] = f.bpm; r[o + H_CONF] = f.bpmConfidence; r[o + H_ANCHOR] = f.beatAnchorMs; r[o + H_KICKAT] = f.kickAtMs; r[o + H_BARSHIFT] = f.barShift;
     r[o + H_ON_KICK] = f.onset?.kick ?? 0; r[o + H_ON_HIMID] = f.onset?.highMid ?? 0; r[o + H_ON_TREBLE] = f.onset?.treble ?? 0;
-    r[o + H_SA_SUB] = f.specAbs?.sub ?? 0; r[o + H_SA_KICK] = f.specAbs?.kick ?? 0; r[o + H_SA_BASS] = f.specAbs?.bass ?? 0;
+    r[o + H_SA_SUB] = f.specAbs?.sub ?? 0; r[o + H_SA_KICK] = f.specAbs?.kick ?? 0; r[o + H_SA_BASS] = f.specAbs?.bass ?? 0; r[o + H_SA_TREBLE] = f.specAbs?.treble ?? 0;
     r[o + H_BOUND] = an.trackBoundaries ?? 0; r[o + H_QUIET] = an.quietMs ?? 0; r[o + H_SURE] = an.boundSure ? 1 : 0; r[o + H_UNDER] = an.bodyUnderDb ?? 0;
     r[o + H_SEQ] = seq;
     Atomics.store(ctrl, C_HOP_WRITE, seqLow(seq)); Atomics.add(ctrl, C_WAKE, 1);
@@ -222,7 +222,7 @@ export class HopLaneSlow {
   private seq: number; private rt: number; private rb: number; private processed: number;
   private skipped = 0; private lagMaxMs = 0; private busyEmaUs = 0; private busyMaxUs = 0; private fconf = NaN;
   private readonly fr = { bpm: 0.5, bpmConfidence: 0.5, beatAnchorMs: 0.5, kickAtMs: 0.5, barShift: 0.5,
-    onset: { kick: 0.5, highMid: 0.5, treble: 0.5 }, specAbs: { sub: 0.5, kick: 0.5, bass: 0.5 } };
+    onset: { kick: 0.5, highMid: 0.5, treble: 0.5 }, specAbs: { sub: 0.5, kick: 0.5, bass: 0.5, treble: 0.5 } };
   private readonly cfg: HopCfg = { beat: undefined, beatErr: undefined };
   private grid: HopGrid | null = null;
   private readonly target: HopTarget = { trackBoundaries: 0, quietMs: 0, resetTempo: () => { this.rt++; }, resetBar: () => { this.rb++; }, setClockGrid: (g) => { this.grid = g; } };
@@ -244,7 +244,7 @@ export class HopLaneSlow {
       this.target.trackBoundaries = r[o + H_BOUND]; this.target.quietMs = r[o + H_QUIET]; this.target.boundSure = r[o + H_SURE] === 1; this.target.bodyUnderDb = r[o + H_UNDER];
       fr.bpm = r[o + H_BPM]; fr.bpmConfidence = r[o + H_CONF]; fr.beatAnchorMs = r[o + H_ANCHOR]; fr.kickAtMs = r[o + H_KICKAT]; fr.barShift = r[o + H_BARSHIFT];
       fr.onset.kick = r[o + H_ON_KICK]; fr.onset.highMid = r[o + H_ON_HIMID]; fr.onset.treble = r[o + H_ON_TREBLE];
-      fr.specAbs.sub = r[o + H_SA_SUB]; fr.specAbs.kick = r[o + H_SA_KICK]; fr.specAbs.bass = r[o + H_SA_BASS];
+      fr.specAbs.sub = r[o + H_SA_SUB]; fr.specAbs.kick = r[o + H_SA_KICK]; fr.specAbs.bass = r[o + H_SA_BASS]; fr.specAbs.treble = r[o + H_SA_TREBLE];
       const cin = fr.bpmConfidence;
       this.feed.update(fr, this.cfg, this.target, r[o + H_NOW]);
       this.fconf = fr.bpmConfidence !== cin ? fr.bpmConfidence : NaN;
```
