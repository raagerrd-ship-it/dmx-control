# a8 MALLARNA – losning

## IDÉN
Ettan väljs nu som den av taktens fyra platser vars uppmätta bandprofil (sub, kick och diskant i 8 delar per slag) ger högst samlad
log-likelihood mot taktmallar: tung sub/kick på 1, sub/kick-dip på 4, diskant (virvel/clap) i slagets början på 2 och 4 och lågt på 1 och 3.
Bevisen räknas i en ram som följer rutnätets ackumulerade fasrättningar, så när rutnätet glider ett helt slag följer ettan med i stället
för att väljas om. Det var den glidningen som gjorde dagens etta fel och omvald.

## DELARNA (allt i analyserClock.ts, ETTAN)
| del | vad den gör | mått den bär (m1 -> m2, övningen) |
|---|---|---|
| A MALLARNA (BAR_T, BAR_Q, BAR_EMA, BAR_FLOOR, barStep-binning, barCommit) | per slag medelnivå i 8 fasdelar för specAbs sub/kick/treble, log mot kausalt EMA-medel (golv 0,3), skalärprodukt mot 3x4x8-mallen per hypotes, avklingning per slag; mallen skattad på övningens Beat This (heltal x0,1) | **m1 ensam: etta 33,5 -> 63,9 %** (poäng +29,3), omval 1,41 -> 1,65 |
| B FASRÄKNAREN (barD/barKs/barU, BAR_JUMP 0,6, BAR_HYST 0,7) | summerar rutnätets fasrättningar (du = ändring i slagposition utöver tidens gång, hopp > 0,6 slag räknas inte), heltalet k (hysteres 0,7) roterar bevisramen och publiceras i barOff = (h + k) & 3 | **m2: etta 63,9 -> 77,9 %, omval 1,65 -> 0,84** (poäng +29,3 -> +47,3). Offline: sanna ettans byten i ramen 8/13/27 -> 2/8/13 |
| C BAR_DECAY 0,98 -> 0,99 | längre minne när ramen är stabil | ingår i m2 (offline ca +1,5 etta) |
| D split.ts: specAbs.treble i taktvägen | hop-lane bär diskanten till workern (HOP_REC_LEN 19) | ingen siffra på bänken (bänken kör feeden inline), krävs för att A ska fungera i worker-läget live |

Del B fungerar utan A (den roterar bara ramen) och bör kunna lyftas in i andra varianters beslut.

## SIFFRORNA (ettdom, m2)
| fil | etta % (bas) | omval /min (bas) | paslag % (bas) | förskjutning 0/1/2/3 |
|---|---|---|---|---|
| 151659 | 92,5 (42,5) | 0,35 (1,28) | 77,7 (78,0) | 92/3/1/4 |
| 172432 | 55,8 (32,0) | 1,35 (1,51) | 50,5 (51,2) | 56/15/13/16 |
| 160345 | 85,4 (25,9) | 0,82 (1,44) | 81,1 (81,8) | 85/5/2/8 |
| medel | 77,9 (33,5) | 0,84 (1,41) | 69,7 (70,4) | **poäng +47,29, OK** |

Sämre: paslag -0,3 till -0,7 pe per fil (inom spärren, ettan rör inte fasen). 172432 är svagast: rutnätet träffar bara 51 % av slagen där,
så ramen glider i hopp som inte syns som fasrättningar. m1 (bara A) hade högre omval än bas (+0,24/min).

## RISKEN
- Mallen är skattad på tre inspelningar från samma kväll (four-on-the-floor/EDM). Musik utan sub på ettan eller utan backbeat (halvtakt,
  trap, akustiskt) ger svaga eller fel bevis. Utan trumma blir bevisen svaga och ettan står kvar (avklingning 0,99, ca 100 slag).
- Fasräknaren litar på att varje rättning går mot närmaste slag. Halvtakts- eller oktavbyten (tempot x2) och stora ankarhopp (> 0,6 slag)
  räknas inte och kräver nya bevis (16+ slag).
- Live-mic: nivå-log mot eget EMA tål förstärkningen, men rumseko i sub kan platta till 1-mot-4-kontrasten.
- Låtbyten: relock nollställer som förr (barOff 0, bevisen bort, k = 0).
- Kostnad: 24 log per slag, inga allokeringar per hop. barOff-kontraktet (hela slag bara i det publicerade ankaret) är som förr, så tempo
  och fas är orörda.
- ANALYSER_SHARED.md5 är inte omskriven (görs med analyser_shared.py --write vid inläggning; lotus behöver samma split.ts-ändring).

## DIFFEN
```diff
diff --git a/src/analyserClock.ts b/.arena/etta/a8/src/analyserClock.ts
index 384c61c..7091afc 100644
--- a/src/analyserClock.ts
+++ b/.arena/etta/a8/src/analyserClock.ts
@@ -25,7 +25,10 @@ const ONSET_WIN_MS = 5000, ONSET_EVERY_MS = 250, ONSET_BINS = 48, ONSET_RING = 1
 const FEED_RISE_HOPS = 6;
   // BASENS STIGNING
 const BREAK_HOLD_MS = 20000;
   // TVÅ RUTNÄT
 const BREAK_RESTORE_MS = Number(process.env.DMX_BREAK_RESTORE_MS ?? String(BREAK_HOLD_MS));
-const BAR_DECAY = 0.99, BAR_MIN = 16, BAR_MARGIN = 0.06, BAR_W_BASS = 0.5, BAR_W_BACK = 0.5, BAR_WIN0 = -0.2, BAR_WIN1 = 0.3, BAR_RISE_HOPS = 6;
   // ETTAN I EFFEKTKLOCKANS RUTNÄT
+const BAR_DECAY = 0.99, BAR_MIN = 16, BAR_Q = 8, BAR_EMA = 0.05, BAR_FLOOR = 0.3, BAR_JUMP = 0.6, BAR_HYST = 0.7;   // ETTAN I EFFEKTKLOCKANS RUTNÄT (a8 MALLARNA)
+const BAR_T = [2, 2, 3, 4, 2, 2, 2, 2, 0, 0, -1, -1, 2, 2, 2, 2, 0, 0, 0, 0, -1, -2, -2, -2, -2, -1, -2, -3, -3, -3, -2, -2,   // sub: takt 1-4 x 8 delar av slaget
+  2, 3, 4, 4, 2, 2, 2, 1, -1, -1, -1, 0, 3, 3, 2, 2, 0, 0, 0, 0, -2, -2, -2, -2, -2, -2, -3, -4, -3, -3, -3, -1,   // kick
+  -4, -1, 0, -1, 0, -1, 0, 1, 5, 2, 1, 0, -1, -2, -1, -4, -7, -5, -1, 0, 1, 1, 0, 3, 7, 4, 1, 1, 1, 1, 1, -1];   // treble
 const TG_HOLD = 1.35;
   // HELA TEMPOOMRÅDET
 const TG_SIB = [Math.round(Math.log2(4 / 3) * 139), Math.round(Math.log2(3 / 2) * 139)];
   // 4:3 och 3:2 i rutnätets steg
 const TG_SNAP = 0.03, TG_EDGE = 1.03, TG_OCT_UP = 0.85, TG_OCT_DN = 0.4, TG_OCT_A = 0.1;
@@ -83,9 +86,8 @@ export class BeatFeed {
   private pwWn = 0; private pwDt = 0; private pwCand = 0; private pwRun = 0; private pwQuietAt = 0; pwVetos = 0; pwFixes = 0;
   private tgHalfR = 0; octR = 0; private octN = 0; private octHi = false;
   // OKTAVKANTEN
   private goodOn = 0; private goodRep = 0; private goodAt = 0;
   // TAKTEN GENOM BREAKET
-  private readonly barK = new Float64Array(4); private readonly barL = new Float64Array(4); private readonly barB = new Float64Array(4);
   // ETTAN (a5)
-  private barN = 0; private barIdx = NaN; private bK = 0; private bL = 0; private bB = 0; private barOff = 0; barShifts = 0;
-  private readonly linK = new Float64Array(BAR_RISE_HOPS); private readonly linL = new Float64Array(BAR_RISE_HOPS); private linPos = 0;
+  private readonly barSc = new Float64Array(4); private readonly barS = new Float64Array(3 * BAR_Q); private readonly barC = new Float64Array(BAR_Q); private readonly barE = new Float64Array(3);   // ETTAN (a8)
+  private barN = 0; private barIdx = NaN; private barOff = 0; barShifts = 0; private barH = 0; private barD = 0; private barKs = 0; private barU = NaN; private barT = 0;
   private innerAnchor = 0; private innerBpm = 0; private innerValid = false;
   private readonly anaGrid = { anchorMs: 0, bpm: 0, confidence: 0 };
   // EN KÄLLA
   private boundSeen = 0;
@@ -386,40 +388,40 @@ export class BeatFeed {
     return false;
   }
 
-  private barReset(): void { this.barK.fill(0); this.barL.fill(0); this.barB.fill(0); this.barN = 0; this.barIdx = NaN; this.barOff = 0; }
+  private barReset(): void { this.barSc.fill(0); this.barN = 0; this.barIdx = NaN; this.barOff = 0; this.barH = 0; this.barD = 0; this.barKs = 0; this.barU = NaN; }
 
-  /** ETTAN (se BAR_DECAY). */
+  /** ETTAN (se BAR_DECAY). */
   private barStep(frame: Frame, beat: NonNullable<EngineConfig["beat"]>, now: number): void {
-    const sa = frame.specAbs, p = this.linPos, k = (sa?.sub ?? 0) + (sa?.kick ?? 0), l = sa?.bass ?? 0;
-    const rk = k - this.linK[p], rl = l - this.linL[p]; this.linK[p] = k; this.linL[p] = l; this.linPos = (p + 1) % BAR_RISE_HOPS;
-    if (!(beat.bpm > 40)) return;
-    const pos = (now - beat.anchorMs) / (60000 / beat.bpm), idx = Math.floor(pos - BAR_WIN0);
+    if (!(beat.bpm > 40)) { this.barU = NaN; return; }
+    const per = 60000 / beat.bpm, pos = (now - beat.anchorMs) / per, idx = Math.floor(pos);
+    if (this.barU === this.barU) { const du = pos - this.barU - (now - this.barT) / per; if (du < BAR_JUMP && du > -BAR_JUMP) this.barD += du; }
+    this.barU = pos; this.barT = now;
+    if (Math.abs(this.barD - this.barKs) > BAR_HYST) this.barKs = Math.round(this.barD);
+    const off = (this.barH + this.barKs) & 3; if (off !== this.barOff) { this.barOff = off; this.barShifts++; }
     if (idx !== this.barIdx) {
       if (idx === this.barIdx + 1) this.barCommit();
-      this.barIdx = idx; this.bK = 0; this.bL = 0; this.bB = 0;
-    }
-    if (pos - idx <= BAR_WIN1) {
-      if (rk > this.bK) this.bK = rk;
-      if (rl > this.bL) this.bL = rl;
-      const hb = (frame.onset?.highMid ?? 0) + (frame.onset?.treble ?? 0); if (hb > this.bB) this.bB = hb;
+      this.barIdx = idx; this.barS.fill(0); this.barC.fill(0);
     }
+    const sa = frame.specAbs, q = Math.min(BAR_Q - 1, Math.floor((pos - idx) * BAR_Q));
+    this.barS[q] += sa?.sub ?? 0; this.barS[BAR_Q + q] += sa?.kick ?? 0; this.barS[2 * BAR_Q + q] += sa?.treble ?? 0; this.barC[q]++;
   }
 
-  /** Slaget barIdx är färdigmätt. */
+  /** Slaget barIdx är färdigmätt: lägg dess bandprofil mot taktmallarna för de fyra platserna. */
   private barCommit(): void {
-    const K = this.barK, L = this.barL, B = this.barB, slot = ((this.barIdx % 4) + 4) % 4;
-    for (let i = 0; i < 4; i++) { K[i] *= BAR_DECAY; L[i] *= BAR_DECAY; B[i] *= BAR_DECAY; }
-    K[slot] += this.bK; L[slot] += this.bL; B[slot] += this.bB;
+    const S = this.barS, C = this.barC, E = this.barE, Sc = this.barSc, slot = (((this.barIdx - this.barKs) % 4) + 4) % 4;
+    for (let q = 0; q < BAR_Q; q++) if (!(C[q] > 0)) return;
+    for (let h = 0; h < 4; h++) Sc[h] *= BAR_DECAY;
+    for (let b = 0; b < 3; b++) {
+      const e = E[b]; let m = 0;
+      for (let q = 0; q < BAR_Q; q++) {
+        const v = S[b * BAR_Q + q] / C[q]; m += v;
+        if (e > 0) { const z = Math.log((v > BAR_FLOOR * e ? v : BAR_FLOOR * e) / e); for (let h = 0; h < 4; h++) Sc[h] += BAR_T[(b * 4 + ((slot - h + 4) & 3)) * BAR_Q + q] * z; }
+      }
+      m /= BAR_Q; E[b] = e > 0 ? e + BAR_EMA * (m - e) : m;
+    }
     if (this.barN < 1000) this.barN++;
     if (this.barN < BAR_MIN) return;
-    const sK = K[0] + K[1] + K[2] + K[3], sL = L[0] + L[1] + L[2] + L[3], sB = B[0] + B[1] + B[2] + B[3];
-    if (!(sK > 0)) return;
-    let bi = 0, best = -1e9, second = -1e9;
-    for (let i = 0; i < 4; i++) {
-      const v = K[i] / sK + (sL > 0 ? BAR_W_BASS * L[i] / sL : 0) - (sB > 0 ? BAR_W_BACK * B[i] / sB : 0);
-      if (v > best) { second = best; best = v; bi = i; } else if (v > second) second = v;
-    }
-    if (bi !== this.barOff && best - second >= BAR_MARGIN) { this.barOff = bi; this.barShifts++; }
+    for (let h = 0; h < 4; h++) if (Sc[h] > Sc[this.barH]) this.barH = h;
   }
 
   /** LÅTGRÄNSEN. */
diff --git a/src/split.ts b/.arena/etta/a8/src/split.ts
index 1a44e95..3997f13 100644
--- a/src/split.ts
+++ b/.arena/etta/a8/src/split.ts
@@ -137,12 +137,12 @@ export const BS_SEQ = 0, BS_BODY = 1, BS_DROPS = 2, BS_MINI = 3, BS_BUILD = 4, B
 export const BIG_STATE_LEN = 24;
 export const SPEC_SLOTS = 16, SPEC_MAX = 1024;
   // 16 spektra
 
-export const HOP_REC_LEN = 18;
   // TAKTVÄGEN
+export const HOP_REC_LEN = 19;
   // TAKTVÄGEN
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
