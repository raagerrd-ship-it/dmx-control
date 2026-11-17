# a1 HARMONIN (etta2)

## IDÉN
Ettan väljs nu också efter var ackordet byter: varje slags tonklasser (chroma, 12 klasser, 150-2000 Hz ur den stora FFT:n som redan finns)
jämförs med förra slagets (1 - cos), och bytet röstar på slagets plats bredvid basens stigning, kickens återstart och backbeaten. Ackordet
byter oftast på taktens etta (fras/ackordföljd), mer sällan på trean, så rösten skiljer 1 från 3, vilket backbeaten inte kan.

Egen analys före bygget (WAV + Beat This, bara övningen): medelbytet per plats 1/2/3/4 är 151659 .021/.016/.016/.015, 171840
.024/.014/.014/.014, 200719 .011/.007/.009/.010. Rösten ensam på Beat This-rutnätet pekar på ettan 94/95/88 % av tiden.

## DELARNA
| del | vad den gör | mått den bär |
|---|---|---|
| chromaStep (analyser.ts, analyserSpectrum.ts) | 12 tonklasser (sqrt-magnitud, 80 bins) ur senaste stora spektrumet; snabba sidan läser specRing, odelad läser magBig. Ingen ny FFT, inga allokeringar per hop | förutsättning |
| barHarm + barH (analyserClock.ts) | summerar chroma över slaget [-0,2, 0,8), 1 - cos mot förra slaget, normerat mot glidande medel och kapat på BAR_R_MAX (som R), avklingar med BAR_DECAY, röstar med BAR_W_HARM = 2 | 171840 etta 63,4 -> 73,8 (förskjutning 2: 16,9 -> 8,3), omval 0,93 -> 0,89 |
| taktvägens fält H_CH_A/B/M (split.ts) | chroma packad i 6 x 8 bitar per fält + största värdet, så att workerns klocka (ladan, BEAT_FEED slow) får samma chroma som bänkens inline-klocka | 0 på bänken (konsertReplay matar klockan direkt), behövs i ladan |

Vikten: W=1 (sond 171840) 65,4; W=2 (m1) 73,8 / 200719 68,1; W=4 (sond 200719) 66,9. W=2 valdes, inget finare sökt.

## SIFFRORNA (m2 = m1, deterministiskt; m2 är levererad kod)
| fil | bas etta | a1 etta | förskj. 0/1/2/3 | omval bas -> a1 | paslag bas -> a1 |
|---|---|---|---|---|---|
| 151659 | 97,8 | 97,8 | 98/1/0/1 | 0,00 -> 0,00 | 79,4 -> 79,4 |
| 171840 | 63,4 | 73,8 | 74/8/8/9 | 1,33 -> 1,33 | 74,5 -> 74,3 |
| 200719 | 68,9 | 68,1 | 68/8/16/8 | 1,47 -> 1,35 | 80,7 -> 80,7 |
| medel | 76,7 | 79,9 | | 0,93 -> 0,89 | 78,2 -> 78,1 |

Poäng +3,41, ingen spärr. Sämre: 200719 -0,8 (förskjutning 2 kvar på 16 %, rösten ensam är bra där offline, så felet där sitter troligen
i omstarterna efter låtgränser/BAR_MIN snarare än i rösten). Vinsten bärs av EN fil (171840): misstänk den på okänd musik.

## RISKEN
- Musik utan harmoni (ren trumma, techno-loopar med ett ackord): bytet blir brus, normeringen gör det till en jämn röst på alla fyra platser,
  så den ska mest späda ut, men W=2 kan ge något fler omval där.
- Låtbyten: barReset nollställer rösten; första slagen efter gränsen jämförs inte mot förra låten.
- Breaks/drops: stora klangbyten kapas på 2 x medel, men en drop som landar fel i rutnätet ger en kapad felröst.
- Live-mic: rumsklang smetar chroma mellan slag (mindre byten, svagare röst). Worker-läget: chroma kommer med spektrumets fördröjning
  (några ms, oviktigt mot ett slag); 8-bitarskvantiseringen i taktvägen är prövad bara i tanken, inte på bänken (bänken kör klockan inline).
- Lotus: delar analysatorn; ny kostnad är 80 sqrt per stort spektrum + 12 adds per hop, hopringen växer 4096 x 3 x 8 B = 96 kB.

## DIFFEN
```diff
diff --git a/src/analyser.ts b/.arena/etta2/a1/src/analyser.ts
index 5dcd901..428a12f 100644
--- a/src/analyser.ts
+++ b/.arena/etta2/a1/src/analyser.ts
@@ -196,6 +196,12 @@ export class Analyser {
    private fbMax = 0;   // Valfri avlyssnare på den stora magnituden
   specSink: ((mag: Float32Array, binHz: number) => void) | null = null;
   setSpectrumSink(fn: ((mag: Float32Array, binHz: number) => void) | null): void { this.specSink = fn; }
+  readonly chroma = new Float32Array(12); private chPc = new Int8Array(0); private chLo = 0;   // HARMONIN: tonklasserna 150-2000 Hz ur stor-FFT:n
+  /** Tonklasserna ur ett stort spektrum (m[o + bin]). */
+  chromaStep(m: Float32Array, o: number): void {
+    const c = this.chroma, P = this.chPc, lo = this.chLo; c.fill(0);
+    for (let i = 0; i < P.length; i++) { const v = m[o + lo + i]; if (v > 0) c[P[i]] += Math.sqrt(v); }
+  }
   private static readonly ENV_HZ = 100;
   private static readonly ONSET_PEAK_FLOOR = 0.05;
   private static readonly ENV_LEN = 100 * Math.max(3, Math.min(20, Number(sysEnv('TEMPO_ENV_S')) || 5));   // Onset-ringens langd i sekunder x 100 Hz
@@ -446,6 +452,7 @@ export class Analyser {
     const sn = s[BS_SPEC_N];
     if (sn > this.specDelivered) {
       const sink = this.specSink, binHz = this.cfg.audio.rate / this.bands.bufferBig.length, R = this.bands.specRing!, c = this.bands.specCopy;
+      this.chromaStep(R, (sn % SPEC_SLOTS) * SPEC_MAX);
       for (let k = Math.max(this.specDelivered + 1, sn - SPEC_SLOTS + 1); k <= sn; k++) {
         if (sink) { const o2 = (k % SPEC_SLOTS) * SPEC_MAX; c.set(R.subarray(o2, o2 + c.length)); sink(c, binHz); }
       }
@@ -686,6 +693,8 @@ export class Analyser {
     this.bands.magBig = new Float32Array(BIG / 2);
     this.bands.specBig = this.bands.fftBig.createComplexArray();
     const binHzBig = cfg.audio.rate / BIG;
+    { const lo = Math.round(150 / binHzBig), hi = Math.round(2000 / binHzBig); this.chLo = lo; this.chPc = new Int8Array(hi - lo);
+      for (let i = 0; i < hi - lo; i++) this.chPc[i] = ((Math.round(12 * Math.log2((lo + i) * binHzBig / 440)) % 12) + 12) % 12; }
     for (let b = 0; b < 8; b++) {
       this.bands.bandLo[b] = Math.max(1, Math.round(Analyser.BAND_HZ[b] / binHzBig));
       this.bands.bandHi[b] = Math.min(BIG / 2, Math.round(Analyser.BAND_HZ[b + 1] / binHzBig));
diff --git a/src/analyserClock.ts b/.arena/etta2/a1/src/analyserClock.ts
index 0bbcb78..44b6817 100644
--- a/src/analyserClock.ts
+++ b/.arena/etta2/a1/src/analyserClock.ts
@@ -25,7 +25,7 @@ const ONSET_WIN_MS = 5000, ONSET_EVERY_MS = 250, ONSET_BINS = 48, ONSET_RING = 1
 const FEED_RISE_HOPS = 6;   // BASENS STIGNING
 const BREAK_HOLD_MS = 20000;   // TVÅ RUTNÄT
 const BREAK_RESTORE_MS = Number(process.env.DMX_BREAK_RESTORE_MS ?? String(BREAK_HOLD_MS));
-const BAR_DECAY = 0.99, BAR_MIN = 16, BAR_MARGIN = 0.06, BAR_W_BASS = 0.5, BAR_WIN0 = -0.2, BAR_WIN1 = 0.3, BAR_RISE_HOPS = 6, BAR_R_MAX = 2, BAR_W_BEAT = 0.25, BAR_Q = 8, BAR_BEAT_Q = 2;   // ETTAN I EFFEKTKLOCKANS RUTNÄT
+const BAR_DECAY = 0.99, BAR_MIN = 16, BAR_MARGIN = 0.06, BAR_W_BASS = 0.5, BAR_WIN0 = -0.2, BAR_WIN1 = 0.3, BAR_RISE_HOPS = 6, BAR_R_MAX = 2, BAR_W_BEAT = 0.25, BAR_Q = 8, BAR_BEAT_Q = 2, BAR_W_HARM = 2;   // ETTAN I EFFEKTKLOCKANS RUTNÄT
 const TG_HOLD = 1.35;   // HELA TEMPOOMRÅDET
 const TG_SIB = [Math.round(Math.log2(4 / 3) * 139), Math.round(Math.log2(3 / 2) * 139)];   // 4:3 och 3:2 i rutnätets steg
 const TG_SNAP = 0.03, TG_EDGE = 1.03, TG_OCT_UP = 0.85, TG_OCT_DN = 0.4, TG_OCT_A = 0.1;
@@ -88,6 +88,7 @@ export class BeatFeed {
   private barM = 0; private barJ = 0; private barJr = 0; private barPT = 0; private barPI = NaN;   // ettan räknas i musikens slag (a1, per slag a6)
   private readonly barR = new Float64Array(4); private bE = 0; private bE1 = 0; private bE2 = 0; private bEm = 0;   // kickens återstart (a2)
   private readonly barX = new Float64Array(4); private readonly barV = new Float64Array(BAR_Q); private readonly barVc = new Float64Array(BAR_Q); private barTi = NaN; private barTe = 0;   // backbeaten (a8r)
+  private readonly barH = new Float64Array(4); private readonly hCur = new Float64Array(12); private readonly hPrev = new Float64Array(12); private hOk = false; private bH = -1; private bHm = 0;   // harmonins byte (a1 etta2)
   private readonly linK = new Float64Array(BAR_RISE_HOPS); private readonly linL = new Float64Array(BAR_RISE_HOPS); private linPos = 0;
   private innerAnchor = 0; private innerBpm = 0; private innerValid = false;
   private readonly anaGrid = { anchorMs: 0, bpm: 0, confidence: 0 };   // EN KÄLLA
@@ -389,18 +390,20 @@ export class BeatFeed {
     return false;
   }
 
-  private barReset(): void { this.barK.fill(0); this.barL.fill(0); this.barR.fill(0); this.barX.fill(0); this.barTi = NaN; this.bE1 = 0; this.bE2 = 0; this.bEm = 0; this.barN = 0; this.barIdx = NaN; this.barM = this.barOff & 3; this.barJ = 0; this.barJr = 0; this.barPI = NaN; }
+  private barReset(): void { this.barH.fill(0); this.hCur.fill(0); this.hOk = false; this.bH = -1; this.bHm = 0; this.barK.fill(0); this.barL.fill(0); this.barR.fill(0); this.barX.fill(0); this.barTi = NaN; this.bE1 = 0; this.bE2 = 0; this.bEm = 0; this.barN = 0; this.barIdx = NaN; this.barM = this.barOff & 3; this.barJ = 0; this.barJr = 0; this.barPI = NaN; }
 
   /** ETTAN (se BAR_DECAY). */
-  private barStep(frame: Frame, beat: NonNullable<EngineConfig["beat"]>, now: number): void {
+  private barStep(frame: Frame, beat: NonNullable<EngineConfig["beat"]>, now: number, ch?: Float32Array): void {
     const sa = frame.specAbs, p = this.linPos, k = (sa?.sub ?? 0) + (sa?.kick ?? 0), l = sa?.bass ?? 0;
     const rk = k - this.linK[p], rl = l - this.linL[p]; this.linK[p] = k; this.linL[p] = l; this.linPos = (p + 1) % BAR_RISE_HOPS;
     if (!(beat.bpm > 40)) return;
     const per = 60000 / beat.bpm, pos = (now - beat.anchorMs) / per, idx = Math.floor(pos - BAR_WIN0);
     if (idx !== this.barIdx) {
+      this.barHarm(idx === this.barIdx + 1);
       if (idx === this.barIdx + 1) this.barCommit(beat.anchorMs + this.barIdx * per, per);
       this.barIdx = idx; this.bK = 0; this.bL = 0; this.bE = 0;
     }
+    if (ch) { const H = this.hCur; for (let i = 0; i < 12; i++) H[i] += ch[i]; }
     if (pos - idx <= BAR_WIN1) {
       if (rk > this.bK) this.bK = rk;
       if (k > this.bE) this.bE = k;
@@ -412,6 +415,14 @@ export class BeatFeed {
     { const d = ((((this.barM + this.barJr - this.barOff) % 4) + 4) % 4); if (d) this.barOff += d; }
   }
 
+  /** Harmonins byte: slagets tonklasser mot förra slagets (1 - cos), -1 när något av dem saknas. */
+  private barHarm(next: boolean): void {
+    const C = this.hCur, P = this.hPrev; let cc = 0, pp = 0, cp = 0;
+    for (let i = 0; i < 12; i++) { cc += C[i] * C[i]; pp += P[i] * P[i]; cp += C[i] * P[i]; }
+    this.bH = next && this.hOk && cc > 0 && pp > 0 ? 1 - cp / Math.sqrt(cc * pp) : -1;
+    this.hOk = cc > 0; P.set(C); C.fill(0);
+  }
+
   /** Backbeaten: diskantens anslag i slagets första fjärdedel mot resten av slaget, bokfört på slagets plats (virvel/clap på 2 och 4). */
   private barBack(): void {
     const V = this.barV, C = this.barVc, e = this.barTe; let m = 0, a = 0, b = 0;
@@ -430,19 +441,20 @@ export class BeatFeed {
     this.barPT = tb; this.barPI = this.barIdx; const jr = this.barJr = Math.floor(this.barJ + 0.5);
     const K = this.barK, L = this.barL, R = this.barR, slot = (((this.barIdx - jr) % 4) + 4) % 4;
     for (let i = 0; i < 4; i++) { K[i] *= BAR_DECAY; L[i] *= BAR_DECAY; R[i] *= BAR_DECAY; this.barX[i] *= BAR_DECAY; }
-    K[slot] += this.bK; L[slot] += this.bL;
+    K[slot] += this.bK; L[slot] += this.bL; this.barH[slot] *= BAR_DECAY;
+    if (this.bH >= 0) { if (this.bHm > 0) this.barH[slot] += Math.min(BAR_R_MAX, this.bH / this.bHm); this.bHm += (this.bH - this.bHm) / 16; }
     { const e = this.bE, pm = this.bE1 > this.bE2 ? this.bE1 : this.bE2;
       if (this.bEm > 0 && e > pm) R[slot] += Math.min(BAR_R_MAX, (e - pm) / this.bEm);
       this.bE2 = this.bE1; this.bE1 = e; this.bEm += (e - this.bEm) / 16; }
     if (this.barN < 1000) this.barN++;
     if (this.barN < BAR_MIN) return;
     const sK = K[0] + K[1] + K[2] + K[3], sL = L[0] + L[1] + L[2] + L[3], sR = R[0] + R[1] + R[2] + R[3], X = this.barX;
-    const sX = Math.abs(X[0]) + Math.abs(X[1]) + Math.abs(X[2]) + Math.abs(X[3]);
+    const sX = Math.abs(X[0]) + Math.abs(X[1]) + Math.abs(X[2]) + Math.abs(X[3]), H = this.barH, sH = H[0] + H[1] + H[2] + H[3];
     if (!(sK > 0)) return;
     let bi = 0, best = -1e9, second = -1e9;
     for (let i = 0; i < 4; i++) {
       const v = K[i] / sK + (sR > 0 ? R[i] / sR : 0) + (sL > 0 ? BAR_W_BASS * L[i] / sL : 0)
-        + (sX > 0 ? BAR_W_BEAT * (X[(i + 1) & 3] + X[(i + 3) & 3] - X[i] - X[(i + 2) & 3]) / sX : 0);
+        + (sX > 0 ? BAR_W_BEAT * (X[(i + 1) & 3] + X[(i + 3) & 3] - X[i] - X[(i + 2) & 3]) / sX : 0) + (sH > 0 ? BAR_W_HARM * H[i] / sH : 0);
       if (v > best) { second = best; best = v; bi = i; } else if (v > second) second = v;
     }
     if (bi !== this.barM && best - second >= BAR_MARGIN) { this.barM = bi; this.barShifts++; }
@@ -463,14 +475,14 @@ export class BeatFeed {
   }
 
   /** EN KÄLLA. */
-  update(frame: Frame, cfg: EngineConfig, an: { resetTempo(): void; resetBar(): void; setClockGrid?(g: EngineConfig["beat"]): void; trackBoundaries?: number; quietMs?: number; boundSure?: boolean; bodyUnderDb?: number; setClock?(bpm: number, conf: number): void }, now = Date.now()): void {
+  update(frame: Frame, cfg: EngineConfig, an: { resetTempo(): void; resetBar(): void; setClockGrid?(g: EngineConfig["beat"]): void; trackBoundaries?: number; quietMs?: number; boundSure?: boolean; bodyUnderDb?: number; setClock?(bpm: number, conf: number): void; chroma?: Float32Array }, now = Date.now()): void {
     this.sure = !!an.boundSure; if ((an.bodyUnderDb ?? 0) >= TG_BRK_DB) this.brkAt = now;
     const nb = an.trackBoundaries ?? 0;
     const q = (an.quietMs ?? 0) >= BND_QUIET_BEATS * 60000 / (this.innerBpm > 80 ? this.innerBpm : 80); if (q) this.quietAt = now;
     if (nb !== this.boundSeen) { this.boundSeen = nb; this.pend = this.sameSong(now); if (!this.pend) this.relock(!this.sure && !((an.quietMs ?? 0) > 0)); }
     else if (this.pend && (q || now - this.brkAt >= TG_WIN_MS)) { this.pend = false; if (q) this.relock(false); }   // tystnar låten i breaket var gränsen sann
     if (cfg.beat && this.innerValid) { cfg.beat.anchorMs = this.innerAnchor; cfg.beat.bpm = this.innerBpm; }
-    this.updateInner(frame, cfg, now, an.quietMs ?? 0);
+    this.updateInner(frame, cfg, now, an.quietMs ?? 0, an.chroma);
     const b = cfg.beat;
     if (b) {
       this.innerAnchor = b.anchorMs; this.innerBpm = b.bpm; this.innerValid = true;
@@ -483,7 +495,7 @@ export class BeatFeed {
     { const dt = this.trustAt > 0 ? now - this.trustAt : 0; this.trustAt = now; frame.beatTrust = this.trustSm = trustStep(this.trustSm, frame.bpmConfidence, cfg.beatErr ?? 0, dt > 250 ? 250 : dt); }
   }
 
-  private updateInner(frame: Frame, cfg: EngineConfig, now: number, quietMs: number): void {
+  private updateInner(frame: Frame, cfg: EngineConfig, now: number, quietMs: number, ch?: Float32Array): void {
     if (cfg.beat && this.lastPllKickMs) {
       const quiet = now - this.lastPllKickMs;
       if (quiet > 1500) {
@@ -532,7 +544,7 @@ export class BeatFeed {
       if (!cfg.beat && this.tempoBpm > 0) cfg.beat = { anchorMs: frame.beatAnchorMs || now, bpm: this.tempoBpm, confidence: 0 };
       this.onsetStep(cfg, now);
     }
-    if (cfg.beat) this.barStep(frame, cfg.beat, now);
+    if (cfg.beat) this.barStep(frame, cfg.beat, now, ch);
     if (cfg.beat) {
       if (pllConf >= GRID_ON_CONF) { this.gridWeakSince = 0; this.gridCoasting = false; }
       else if (pllConf < MIN_BEAT_CONFIDENCE) {
diff --git a/src/analyserSpectrum.ts b/.arena/etta2/a1/src/analyserSpectrum.ts
index c8cf16a..312435a 100644
--- a/src/analyserSpectrum.ts
+++ b/.arena/etta2/a1/src/analyserSpectrum.ts
@@ -113,7 +113,7 @@ specCopy = new Float32Array(0);specN = 0;  aBandLvl = 0;
     }
 
     if (this.a.bigOn) { const k = ++this.specN, R = this.specRing!, o = (k % SPEC_SLOTS) * SPEC_MAX; R.set(this.magBigView.subarray(0, this.specCopy.length), o); }
-    else this.a.specSink?.(this.magBigView, this.a.cfg.audio.rate / this.bufferBig.length);
+    else { this.a.chromaStep(this.magBigView, 0); this.a.specSink?.(this.magBigView, this.a.cfg.audio.rate / this.bufferBig.length); }
     const gated = this.a.activeMs > 0;
 
 
diff --git a/src/split.ts b/.arena/etta2/a1/src/split.ts
index 3997f13..6b9bae1 100644
--- a/src/split.ts
+++ b/.arena/etta2/a1/src/split.ts
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
+  H_SURE = 16 , H_UNDER = 17 , H_SA_TREBLE = 18, H_CH_A = 19, H_CH_B = 20, H_CH_M = 21;   // HARMONIN: tonklasserna, 6 x 8 bitar per fält + största
 export const C_HOP_WRITE = 4, C_HOP_READ = 5, C_FEED_SEQ = 6 , C_WAKE = 7 ;
 export const FS_HOP_SEQ = 0, FS_BEAT = 1 , FS_ANCHOR = 2, FS_BPM = 3, FS_BCONF = 4,
   FS_BEATERR = 5 , FS_FCONF = 6 , FS_GRID = 7 ,
@@ -156,7 +156,7 @@ export interface HopFrame { bpm: number; bpmConfidence: number; beatAnchorMs: nu
   onset: { kick: number; highMid: number; treble: number }; specAbs: { sub: number; kick: number; bass: number; treble: number } }
 export interface HopGrid { anchorMs: number; bpm: number; confidence?: number }
 export interface HopCfg { beat?: HopGrid | null; beatErr?: number }
-export interface HopTarget { resetTempo(): void; resetBar(): void; setClockGrid?(g: HopGrid | null): void; trackBoundaries?: number; quietMs?: number; boundSure?: boolean; bodyUnderDb?: number;
+export interface HopTarget { resetTempo(): void; resetBar(): void; setClockGrid?(g: HopGrid | null): void; trackBoundaries?: number; quietMs?: number; boundSure?: boolean; bodyUnderDb?: number; chroma?: Float32Array;
    setClock?(bpm: number, conf: number): void }   // EN KÄLLA
 /** Systemets taktmatning. */
 export interface HopFeed { update(frame: HopFrame, cfg: HopCfg, an: HopTarget, now: number): void;  barKnown?(): boolean }   // EN ETTA
@@ -182,6 +182,9 @@ export class HopLaneFast {
     r[o + H_ON_KICK] = f.onset?.kick ?? 0; r[o + H_ON_HIMID] = f.onset?.highMid ?? 0; r[o + H_ON_TREBLE] = f.onset?.treble ?? 0;
     r[o + H_SA_SUB] = f.specAbs?.sub ?? 0; r[o + H_SA_KICK] = f.specAbs?.kick ?? 0; r[o + H_SA_BASS] = f.specAbs?.bass ?? 0; r[o + H_SA_TREBLE] = f.specAbs?.treble ?? 0;
     r[o + H_BOUND] = an.trackBoundaries ?? 0; r[o + H_QUIET] = an.quietMs ?? 0; r[o + H_SURE] = an.boundSure ? 1 : 0; r[o + H_UNDER] = an.bodyUnderDb ?? 0;
+    { const c = an.chroma; let mx = 0, a = 0, b = 0; if (c) for (let k = 0; k < 12; k++) if (c[k] > mx) mx = c[k];
+      if (c && mx > 0) for (let k = 5; k >= 0; k--) { a = a * 256 + Math.round(255 * c[k] / mx); b = b * 256 + Math.round(255 * c[k + 6] / mx); }
+      r[o + H_CH_A] = a; r[o + H_CH_B] = b; r[o + H_CH_M] = mx; }
     r[o + H_SEQ] = seq;
     Atomics.store(ctrl, C_HOP_WRITE, seqLow(seq)); Atomics.add(ctrl, C_WAKE, 1);
     if (Atomics.load(ctrl, C_WAITING) || Atomics.load(ctrl, C_WAITING_B)) Atomics.notify(ctrl, C_WAKE);
@@ -225,7 +228,7 @@ export class HopLaneSlow {
     onset: { kick: 0.5, highMid: 0.5, treble: 0.5 }, specAbs: { sub: 0.5, kick: 0.5, bass: 0.5, treble: 0.5 } };
   private readonly cfg: HopCfg = { beat: undefined, beatErr: undefined };
   private grid: HopGrid | null = null;
-  private readonly target: HopTarget = { trackBoundaries: 0, quietMs: 0, resetTempo: () => { this.rt++; }, resetBar: () => { this.rb++; }, setClockGrid: (g) => { this.grid = g; } };
+  private readonly target: HopTarget = { trackBoundaries: 0, quietMs: 0, chroma: new Float32Array(12), resetTempo: () => { this.rt++; }, resetBar: () => { this.rb++; }, setClockGrid: (g) => { this.grid = g; } };
   constructor(b: SplitBuffers, private readonly feed: HopFeed, private readonly notify = false) {
     this.ctrl = new Int32Array(b.ctrl); this.ring = new Float64Array(b.hop!); this.state = new Float64Array(b.hopState!);
     const sq = Atomics.load(this.ctrl, C_FEED_SEQ); if (sq & 1) Atomics.store(this.ctrl, C_FEED_SEQ, sq + 1);
@@ -245,6 +248,7 @@ export class HopLaneSlow {
       fr.bpm = r[o + H_BPM]; fr.bpmConfidence = r[o + H_CONF]; fr.beatAnchorMs = r[o + H_ANCHOR]; fr.kickAtMs = r[o + H_KICKAT]; fr.barShift = r[o + H_BARSHIFT];
       fr.onset.kick = r[o + H_ON_KICK]; fr.onset.highMid = r[o + H_ON_HIMID]; fr.onset.treble = r[o + H_ON_TREBLE];
       fr.specAbs.sub = r[o + H_SA_SUB]; fr.specAbs.kick = r[o + H_SA_KICK]; fr.specAbs.bass = r[o + H_SA_BASS]; fr.specAbs.treble = r[o + H_SA_TREBLE];
+      { const c = this.target.chroma!; let a = r[o + H_CH_A], b = r[o + H_CH_B]; const m = r[o + H_CH_M] / 255; for (let k = 0; k < 6; k++) { const x = a % 256, y = b % 256; c[k] = x * m; c[k + 6] = y * m; a = (a - x) / 256; b = (b - y) / 256; } }
       const cin = fr.bpmConfidence;
       this.feed.update(fr, this.cfg, this.target, r[o + H_NOW]);
       this.fconf = fr.bpmConfidence !== cin ? fr.bpmConfidence : NaN;
```
