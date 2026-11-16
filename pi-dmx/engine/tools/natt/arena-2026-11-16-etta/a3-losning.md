# a3 BASTONEN: ettan väljs där basgången byter ton

## IDÉN
Ettan väljs nu främst efter tonbytet i basbandet: en chroma (12 tonklasser) ur 40-250 Hz summeras per slag i rutnätet, och slagets "nyhet" = cosinusavståndet till föregående slags chroma bokförs på slagets plats i takten (vikt 4 mot kickens 1). Basgången byter ton på taktens etta (ackordbyten sitter på ettan), medan kicken i fyra-takt är lika på alla fyra slag, och chroma är oberoende av energi/sidechain-pumpen.

## DELARNA
| del | vad den gör | mått (övningen) |
|---|---|---|
| D1 BassTone (analyserBass.ts) + frame.bassChroma (analyser.ts) | 48 kHz boxcar-decimerat /16 -> ring 512 (171 ms, 5,9 Hz/bin), Hann + 512-FFT var 4:e hop, bin -> tonklass 40-250 Hz. Förallokerat, ingen allokering per hop | bär D2 (ensam inget mått) |
| D2 tontermen BAR_W_TONE = 4 (analyserClock.ts barStep/barCommit) | chroma summeras från 0,3 slag efter slaget till slagets slut; nyhet mot föregående slag (bara konsekutiva idx, nollas vid barReset); T[plats] med samma minne som K/L/B; +4·T/ΣT i poängen | m1: etta 33,5 -> 61,0 %, omval 1,41 -> 1,47, poäng +27,2 |
| D3 BAR_DECAY 0,99 -> 0,97 | kortare minne (~33 slag) så ettan följer när rutnätets slagnumrering/musikens etta flyttas (mix, låtbyte) | m2: etta 61,0 -> 68,1 %, omval 1,47 -> 1,52, poäng +27,2 -> +34,0 |
| D4 split.ts taktvägen | bassChroma (12 tal) i hop-recordet (HOP_REC_LEN 18 -> 30, H_CHROMA 18) så live-workern (BEAT_FEED slow) får samma data som bänken | ingen (bänken kör inline); krävs för ladan |

Jokern: D2 kräver D1 (+D4 live). D3 är fristående och kan provas ovanpå andras termer.

## DIFFEN
Hela patchen (med originalens radslut, appliceras): `.arena/etta/a3/a3.patch`. Samma innehåll:

```diff
diff --git a/src/analyser.ts b/.arena/etta/a3/src/analyser.ts
index 5dcd901..06700b3 100644
--- a/src/analyser.ts
+++ b/.arena/etta/a3/src/analyser.ts
@@ -22,7 +22,7 @@ import { SectionTracker } from "./analyserSection.js";
 import { RiserDetector } from "./analyserRiser.js";
 import { CharacterProfile } from "./analyserCharacter.js";
 import { KickDetector } from "./analyserKick.js";
-import { BassTracker } from "./analyserBass.js";
+import { BassTracker, BassTone } from "./analyserBass.js";
 import { LevelTracker } from "./analyserLevel.js";
 import { SpectrumBands } from "./analyserSpectrum.js";
 
@@ -138,6 +138,7 @@ export interface Frame {
   midHiDb: number;   // ABSOLUT mid+diskant-niva i dB
   onset: Spectrum;   // per-band ONSET/anslag
   drum: { kick: number; snare: number; hat: number; bass: number };   // TRUM-KIT-envelopes
+  bassChroma: Float32Array;   // BASTONEN
 }
 
 export const BODY_RISE_DB = Number(env('BODY_RISE_DB') ?? 17);   // DROP-DETEKTOR
@@ -736,7 +737,7 @@ export class Analyser {
       kick: false, gain: 1, bpm: 0, bpmConfidence: 0, intensity: 0.5,
       dropCount: 0, miniDropCount: 0, buildStartCount: 0, dropDemoted: 0, dropSpaced: 0, dropRiseDb: 0, nearDropDb: 0, nearDipDb: 0, liftDb: 0, stopCount: 0, stopS: 0, bodyDb: 0, bassEnergy: 0, bassEnergyShort: 0, bassLevel: 1, midHiDb: -120, inZone: false, breaking: false, buildUp: 0, buildProg: 0, inRiser: false, profile: this.character.outProfile, beatAnchorMs: 0,
       kickAtMs: 0, barShift: -1, beatPhaseMs: 0, beatPhaseConf: 0, beatTrust: 0, section: 'intro', sectionAgeMs: 0, sectionIndex: 0, sectionTier: 1, repeatSim: 0, repeatAgoMs: 0, repeatSection: '', expectHighInMs: -1, prevSection: '', levelVsHighDb: 0, sectionBars: 0,
-      spec: this.outSpec, specAbs: this.outSpecAbs, onset: this.outOnset, drum: this.outDrum,
+      spec: this.outSpec, specAbs: this.outSpecAbs, onset: this.outOnset, drum: this.outDrum, bassChroma: this.tone.chroma,
     };
     for (const o of [this.outFrame, this.character.outProfile, this.outSpec, this.outSpecAbs, this.outOnset, this.outDrum]) stabiliseNumbers(o);
     for (const k of DOUBLE_FROM_START) { const v = (this as unknown as Record<string, number>)[k]; if (typeof v === 'number') { (this as unknown as Record<string, number>)[k] = 0.5; (this as unknown as Record<string, number>)[k] = v; } }
@@ -871,6 +872,7 @@ export class Analyser {
     if (++this.bigCounter >= Analyser.BIG_EVERY) this.bands.bigStep();
     }
     if (Analyser.FAST_BANDS) this.bands.fastBandStep(samples);
+    this.tone.step(samples, this.cfg.audio.rate);
     const ON = Analyser.FAST_BANDS ? this.fbOn : this.bandOn;
     const hatOnset = ON[6] > ON[7] ? ON[6] : ON[7];
     this.hatHit = Math.max(this.hatHit * this.dHat, hatOnset);
@@ -976,6 +978,7 @@ export class Analyser {
   readonly riser = new RiserDetector(this);   // UPPBYGGNAD
   readonly character = new CharacterProfile(this);   // KARAKTÄR
   readonly kicks = new KickDetector(this);   // KICK: anslag i snabba vägen
+  readonly tone = new BassTone();   // BASTONEN
   readonly bass = new BassTracker(this);   // BAS: basenergin per slag och basgången
   readonly levels = new LevelTracker(this);   // NIVÅ: förstärkning/AGC, tystnad, intensitet, nivåtak och topp-zon
   readonly bands = new SpectrumBands(this);   // SPEKTRUM
diff --git a/src/analyserBass.ts b/.arena/etta/a3/src/analyserBass.ts
index 9e80d73..e624b82 100644
--- a/src/analyserBass.ts
+++ b/.arena/etta/a3/src/analyserBass.ts
@@ -1,5 +1,6 @@
 /**  BASEN (utbruten ur analyser.ts 2026-11-14). Anteckningar (kommentarerna som stod i koden): docs/analysator/analyserBass.md */
 import { Analyser } from "./analyser.js";
+import FFT from "fft.js";
 
 const DOUBLE_FROM_START = ['blPrev1', 'blPrev2', 'blTrough'] as const;   // Talfält som ska vara flyttal från start
 
@@ -46,3 +47,31 @@ export class BassTracker {
     this.a.profBassline += (raw - this.a.profBassline) * 0.01;
   }
 }
+
+/** BASTONEN: basbandets chroma 40-250 Hz (decimerad 512-FFT, ~171 ms). */
+export class BassTone {
+  private static readonly DEC = 16; private static readonly N = 512; private static readonly EVERY = 4; private static readonly LO_HZ = 40; private static readonly HI_HZ = 250;
+  readonly chroma = new Float32Array(12);
+  private readonly ring = new Float32Array(BassTone.N); private readonly x = new Float32Array(BassTone.N); private readonly win = new Float32Array(BassTone.N);
+  private readonly fft = new FFT(BassTone.N); private readonly spec = this.fft.createComplexArray() as number[];
+  private pc = new Int8Array(0); private lo = 0; private pos = 0; private acc = 0; private accN = 0; private hops = 0;
+  /** Ett hop. */
+  step(samples: Float32Array, rate: number): void {
+    const N = BassTone.N, D = BassTone.DEC, R = this.ring;
+    if (this.pc.length === 0) {
+      const hz = rate / D / N; this.lo = Math.max(1, Math.round(BassTone.LO_HZ / hz)); const hi = Math.round(BassTone.HI_HZ / hz);
+      this.pc = new Int8Array(hi - this.lo + 1);
+      for (let k = this.lo; k <= hi; k++) this.pc[k - this.lo] = ((Math.round(12 * Math.log2(k * hz / 440)) + 69) % 12 + 12) % 12;
+      for (let i = 0; i < N; i++) this.win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);
+    }
+    let a = this.acc, n = this.accN, p = this.pos;
+    for (let i = 0; i < samples.length; i++) { a += samples[i]; if (++n === D) { R[p] = a; p = (p + 1) & (N - 1); a = 0; n = 0; } }
+    this.acc = a; this.accN = n; this.pos = p;
+    if (++this.hops < BassTone.EVERY) return;
+    this.hops = 0;
+    const x = this.x, w = this.win; for (let i = 0; i < N; i++) x[i] = R[(p + i) & (N - 1)] * w[i];
+    this.fft.realTransform(this.spec, x);
+    const c = this.chroma, s = this.spec, pc = this.pc, lo = this.lo; c.fill(0);
+    for (let j = 0; j < pc.length; j++) { const re = s[2 * (j + lo)], im = s[2 * (j + lo) + 1]; c[pc[j]] += Math.sqrt(re * re + im * im); }
+  }
+}
diff --git a/src/analyserClock.ts b/.arena/etta/a3/src/analyserClock.ts
index 384c61c..bff61df 100644
--- a/src/analyserClock.ts
+++ b/.arena/etta/a3/src/analyserClock.ts
@@ -25,7 +25,7 @@ const ONSET_WIN_MS = 5000, ONSET_EVERY_MS = 250, ONSET_BINS = 48, ONSET_RING = 1
 const FEED_RISE_HOPS = 6;   // BASENS STIGNING
 const BREAK_HOLD_MS = 20000;   // TVÅ RUTNÄT
 const BREAK_RESTORE_MS = Number(process.env.DMX_BREAK_RESTORE_MS ?? String(BREAK_HOLD_MS));
-const BAR_DECAY = 0.99, BAR_MIN = 16, BAR_MARGIN = 0.06, BAR_W_BASS = 0.5, BAR_W_BACK = 0.5, BAR_WIN0 = -0.2, BAR_WIN1 = 0.3, BAR_RISE_HOPS = 6;   // ETTAN I EFFEKTKLOCKANS RUTNÄT
+const BAR_DECAY = 0.97, BAR_MIN = 16, BAR_MARGIN = 0.06, BAR_W_BASS = 0.5, BAR_W_BACK = 0.5, BAR_WIN0 = -0.2, BAR_WIN1 = 0.3, BAR_RISE_HOPS = 6, BAR_W_TONE = 4, BAR_TONE0 = 0.3;   // ETTAN I EFFEKTKLOCKANS RUTNÄT
 const TG_HOLD = 1.35;   // HELA TEMPOOMRÅDET
 const TG_SIB = [Math.round(Math.log2(4 / 3) * 139), Math.round(Math.log2(3 / 2) * 139)];   // 4:3 och 3:2 i rutnätets steg
 const TG_SNAP = 0.03, TG_EDGE = 1.03, TG_OCT_UP = 0.85, TG_OCT_DN = 0.4, TG_OCT_A = 0.1;
@@ -85,6 +85,7 @@ export class BeatFeed {
   private goodOn = 0; private goodRep = 0; private goodAt = 0;   // TAKTEN GENOM BREAKET
   private readonly barK = new Float64Array(4); private readonly barL = new Float64Array(4); private readonly barB = new Float64Array(4);   // ETTAN (a5)
   private barN = 0; private barIdx = NaN; private bK = 0; private bL = 0; private bB = 0; private barOff = 0; barShifts = 0;
+  private readonly barT = new Float64Array(4); private readonly bC = new Float64Array(12); private readonly pC = new Float64Array(12); private pOk = false; private bT = 0;   // BASTONEN
   private readonly linK = new Float64Array(BAR_RISE_HOPS); private readonly linL = new Float64Array(BAR_RISE_HOPS); private linPos = 0;
   private innerAnchor = 0; private innerBpm = 0; private innerValid = false;
   private readonly anaGrid = { anchorMs: 0, bpm: 0, confidence: 0 };   // EN KÄLLA
@@ -386,7 +387,7 @@ export class BeatFeed {
     return false;
   }
 
-  private barReset(): void { this.barK.fill(0); this.barL.fill(0); this.barB.fill(0); this.barN = 0; this.barIdx = NaN; this.barOff = 0; }
+  private barReset(): void { this.barT.fill(0); this.pOk = false; this.barK.fill(0); this.barL.fill(0); this.barB.fill(0); this.barN = 0; this.barIdx = NaN; this.barOff = 0; }
 
   /** ETTAN (se BAR_DECAY). */
   private barStep(frame: Frame, beat: NonNullable<EngineConfig["beat"]>, now: number): void {
@@ -395,9 +396,12 @@ export class BeatFeed {
     if (!(beat.bpm > 40)) return;
     const pos = (now - beat.anchorMs) / (60000 / beat.bpm), idx = Math.floor(pos - BAR_WIN0);
     if (idx !== this.barIdx) {
-      if (idx === this.barIdx + 1) this.barCommit();
-      this.barIdx = idx; this.bK = 0; this.bL = 0; this.bB = 0;
+      const c = this.bC, q = this.pC; let cc = 0, qq = 0, cq = 0;
+      for (let i = 0; i < 12; i++) { cc += c[i] * c[i]; qq += q[i] * q[i]; cq += c[i] * q[i]; }
+      if (idx === this.barIdx + 1) { this.bT = this.pOk && cc > 0 && qq > 0 ? 1 - cq / Math.sqrt(cc * qq) : 0; this.barCommit(); this.pOk = cc > 0; q.set(c); } else this.pOk = false;
+      this.barIdx = idx; this.bK = 0; this.bL = 0; this.bB = 0; c.fill(0);
     }
+    { const ch = frame.bassChroma; if (ch && pos - idx >= BAR_TONE0) for (let i = 0; i < 12; i++) this.bC[i] += ch[i]; }
     if (pos - idx <= BAR_WIN1) {
       if (rk > this.bK) this.bK = rk;
       if (rl > this.bL) this.bL = rl;
@@ -407,16 +411,16 @@ export class BeatFeed {
 
   /** Slaget barIdx är färdigmätt. */
   private barCommit(): void {
-    const K = this.barK, L = this.barL, B = this.barB, slot = ((this.barIdx % 4) + 4) % 4;
-    for (let i = 0; i < 4; i++) { K[i] *= BAR_DECAY; L[i] *= BAR_DECAY; B[i] *= BAR_DECAY; }
-    K[slot] += this.bK; L[slot] += this.bL; B[slot] += this.bB;
+    const K = this.barK, L = this.barL, B = this.barB, T = this.barT, slot = ((this.barIdx % 4) + 4) % 4;
+    for (let i = 0; i < 4; i++) { K[i] *= BAR_DECAY; L[i] *= BAR_DECAY; B[i] *= BAR_DECAY; T[i] *= BAR_DECAY; }
+    K[slot] += this.bK; L[slot] += this.bL; B[slot] += this.bB; T[slot] += this.bT;
     if (this.barN < 1000) this.barN++;
     if (this.barN < BAR_MIN) return;
-    const sK = K[0] + K[1] + K[2] + K[3], sL = L[0] + L[1] + L[2] + L[3], sB = B[0] + B[1] + B[2] + B[3];
+    const sK = K[0] + K[1] + K[2] + K[3], sL = L[0] + L[1] + L[2] + L[3], sB = B[0] + B[1] + B[2] + B[3], sT = T[0] + T[1] + T[2] + T[3];
     if (!(sK > 0)) return;
     let bi = 0, best = -1e9, second = -1e9;
     for (let i = 0; i < 4; i++) {
-      const v = K[i] / sK + (sL > 0 ? BAR_W_BASS * L[i] / sL : 0) - (sB > 0 ? BAR_W_BACK * B[i] / sB : 0);
+      const v = K[i] / sK + (sL > 0 ? BAR_W_BASS * L[i] / sL : 0) - (sB > 0 ? BAR_W_BACK * B[i] / sB : 0) + (sT > 0 ? BAR_W_TONE * T[i] / sT : 0);
       if (v > best) { second = best; best = v; bi = i; } else if (v > second) second = v;
     }
     if (bi !== this.barOff && best - second >= BAR_MARGIN) { this.barOff = bi; this.barShifts++; }
diff --git a/src/split.ts b/.arena/etta/a3/src/split.ts
index 1a44e95..75c078d 100644
--- a/src/split.ts
+++ b/.arena/etta/a3/src/split.ts
@@ -137,12 +137,12 @@ export const BS_SEQ = 0, BS_BODY = 1, BS_DROPS = 2, BS_MINI = 3, BS_BUILD = 4, B
 export const BIG_STATE_LEN = 24;
 export const SPEC_SLOTS = 16, SPEC_MAX = 1024;   // 16 spektra
 
-export const HOP_REC_LEN = 18;   // TAKTVÄGEN
+export const HOP_REC_LEN = 30;   // TAKTVÄGEN
 export const HOP_RING_N = 4096;
 export const H_SEQ = 0, H_NOW = 1 , H_TS = 2 ,
   H_BPM = 3, H_CONF = 4, H_ANCHOR = 5, H_KICKAT = 6, H_BARSHIFT = 7, H_ON_KICK = 8, H_ON_HIMID = 9, H_ON_TREBLE = 10, H_SA_SUB = 11, H_SA_KICK = 12, H_SA_BASS = 13 ,
   H_BOUND = 14 , H_QUIET = 15 ,
-  H_SURE = 16 , H_UNDER = 17 ;
+  H_SURE = 16 , H_UNDER = 17 , H_CHROMA = 18 ;
 export const C_HOP_WRITE = 4, C_HOP_READ = 5, C_FEED_SEQ = 6 , C_WAKE = 7 ;
 export const FS_HOP_SEQ = 0, FS_BEAT = 1 , FS_ANCHOR = 2, FS_BPM = 3, FS_BCONF = 4,
   FS_BEATERR = 5 , FS_FCONF = 6 , FS_GRID = 7 ,
@@ -153,7 +153,7 @@ export const FEED_STATE_LEN = 20;
 
 /** Det taktmatningen läser ur ramen, och det den skriver. */
 export interface HopFrame { bpm: number; bpmConfidence: number; beatAnchorMs: number; kickAtMs: number; barShift: number; beatTrust?: number;
-  onset: { kick: number; highMid: number; treble: number }; specAbs: { sub: number; kick: number; bass: number } }
+  onset: { kick: number; highMid: number; treble: number }; specAbs: { sub: number; kick: number; bass: number }; bassChroma?: Float32Array }
 export interface HopGrid { anchorMs: number; bpm: number; confidence?: number }
 export interface HopCfg { beat?: HopGrid | null; beatErr?: number }
 export interface HopTarget { resetTempo(): void; resetBar(): void; setClockGrid?(g: HopGrid | null): void; trackBoundaries?: number; quietMs?: number; boundSure?: boolean; bodyUnderDb?: number;
@@ -181,6 +181,7 @@ export class HopLaneFast {
     r[o + H_BPM] = f.bpm; r[o + H_CONF] = f.bpmConfidence; r[o + H_ANCHOR] = f.beatAnchorMs; r[o + H_KICKAT] = f.kickAtMs; r[o + H_BARSHIFT] = f.barShift;
     r[o + H_ON_KICK] = f.onset?.kick ?? 0; r[o + H_ON_HIMID] = f.onset?.highMid ?? 0; r[o + H_ON_TREBLE] = f.onset?.treble ?? 0;
     r[o + H_SA_SUB] = f.specAbs?.sub ?? 0; r[o + H_SA_KICK] = f.specAbs?.kick ?? 0; r[o + H_SA_BASS] = f.specAbs?.bass ?? 0;
+    { const c = f.bassChroma; for (let i = 0; i < 12; i++) r[o + H_CHROMA + i] = c ? c[i] : 0; }
     r[o + H_BOUND] = an.trackBoundaries ?? 0; r[o + H_QUIET] = an.quietMs ?? 0; r[o + H_SURE] = an.boundSure ? 1 : 0; r[o + H_UNDER] = an.bodyUnderDb ?? 0;
     r[o + H_SEQ] = seq;
     Atomics.store(ctrl, C_HOP_WRITE, seqLow(seq)); Atomics.add(ctrl, C_WAKE, 1);
@@ -222,7 +223,7 @@ export class HopLaneSlow {
   private seq: number; private rt: number; private rb: number; private processed: number;
   private skipped = 0; private lagMaxMs = 0; private busyEmaUs = 0; private busyMaxUs = 0; private fconf = NaN;
   private readonly fr = { bpm: 0.5, bpmConfidence: 0.5, beatAnchorMs: 0.5, kickAtMs: 0.5, barShift: 0.5,
-    onset: { kick: 0.5, highMid: 0.5, treble: 0.5 }, specAbs: { sub: 0.5, kick: 0.5, bass: 0.5 } };
+    onset: { kick: 0.5, highMid: 0.5, treble: 0.5 }, specAbs: { sub: 0.5, kick: 0.5, bass: 0.5 }, bassChroma: new Float32Array(12) };
   private readonly cfg: HopCfg = { beat: undefined, beatErr: undefined };
   private grid: HopGrid | null = null;
   private readonly target: HopTarget = { trackBoundaries: 0, quietMs: 0, resetTempo: () => { this.rt++; }, resetBar: () => { this.rb++; }, setClockGrid: (g) => { this.grid = g; } };
@@ -245,6 +246,7 @@ export class HopLaneSlow {
       fr.bpm = r[o + H_BPM]; fr.bpmConfidence = r[o + H_CONF]; fr.beatAnchorMs = r[o + H_ANCHOR]; fr.kickAtMs = r[o + H_KICKAT]; fr.barShift = r[o + H_BARSHIFT];
       fr.onset.kick = r[o + H_ON_KICK]; fr.onset.highMid = r[o + H_ON_HIMID]; fr.onset.treble = r[o + H_ON_TREBLE];
       fr.specAbs.sub = r[o + H_SA_SUB]; fr.specAbs.kick = r[o + H_SA_KICK]; fr.specAbs.bass = r[o + H_SA_BASS];
+      for (let i = 0; i < 12; i++) fr.bassChroma[i] = r[o + H_CHROMA + i];
       const cin = fr.bpmConfidence;
       this.feed.update(fr, this.cfg, this.target, r[o + H_NOW]);
       this.fconf = fr.bpmConfidence !== cin ? fr.bpmConfidence : NaN;
```

## SIFFRORNA (ettdom, m2 = slutlig)
| fil | etta % (bas) | förskjutning 0/1/2/3 | omval /min (bas) | paslag (bas) |
|---|---|---|---|---|
| 151659 | 74,5 (42,5) | 74/10/4/11 | 1,17 (1,28) | 78,1 (78,0) |
| 172432 | 64,7 (32,0) | 65/9/16/10 | 1,25 (1,51) | 51,4 (51,2) |
| 160345 | 65,0 (25,9) | 65/6/18/11 | 2,15 (1,44) | 81,3 (81,8) |
| medel | 68,1 (33,5) | | 1,52 (1,41) | 70,3 (70,4) |

Poäng +34,04, ingen spärr. Sämre: omval i 160345 (1,44 -> 2,15) och medlet +0,11/min; kvarvarande fel är mest förskjutning 2 (halvtakts-ackordbyten på slag 3).

Metod: 3 sonder (egen node-dump av varje bokfört slag: K/L/B, chroma, plats) + offline-simulering av barCommit mot Beat This (simuleringen gav m1 61,1 %, mätt 61,0 %). Vikten 4 och decay 0,97 valda där, 0,95 gav något mer men valdes bort som för kort minne.

## RISKEN
- Musik utan tonal bas (trumsolo, break, tal): chroma blir brus och nyheten slumpmässig; med kortare minne (0,97) kan ettan vandra i långa breaks. Ingen energigrind på nyheten.
- Basgångar som byter ton varje slag (walking bass, arpeggio) eller på slag 3 ger tvetydighet 0/2 (syns: 16-18 % förskjutning 2).
- Live-mic: rumsresonanser i 40-120 Hz påverkar chroma, men lika på alla slag; ladans mic oprövad.
- Låtbyten: barReset nollar T; kortare minne ger snabbare omval efter mixar men fler omval/min.
- CPU: en 512-FFT var 4:e hop + 128 additioner/hop i snabba sidan (även lotus). Minne: hop-ringen +393 kB (4096 x 12 x 8 B).
