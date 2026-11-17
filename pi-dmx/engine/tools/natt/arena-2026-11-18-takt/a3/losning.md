# a3 MOTSLAGSVAKTEN

**IDÉN.** Klockan väljer i dag fas ur basens stigning (sub+kick) ensam, och när basen är lika stark på slaget och mitt emellan hoppar rutnätet mellan de två topparna (domaren ser det som glidning och motslag). En egen vakt i workern håller ett minne av anslagen i tre band (sub+kick, bas 120-250 Hz, highMid 1,2-3,5 kHz) per sextondels slag **i musikens egen fas** (rutnätets hopp räknas bort), och när onsetStep vill lägga fasen där banden tillsammans säger "mitt emellan" läggs den ett halvt slag bort, så fasen sitter kvar på slaget.

**DELARNA**

| del | vad den gör | mått (m2, övningen) |
|---|---|---|
| A. highMid i taktvägen (split.ts) | ny post H_SA_HIMID (HOP_REC_LEN 19 -> 20) | förutsättning för C |
| B. fasminnet (msStep) | log-stigning över 6 hopp per band, medel per fasfack (16), EMA över 32 slag, i musikfas (msOff följer varje ankarhopp) | - |
| C. domen (msD) | summa över banden av log(starkaste fack inom +-1/4 slag / starkaste mitt emellan), eps 0,02 | - |
| D. vändningen i onsetStep | efter 32 slag: D(ny fas) < -0,4 -> err +-0,5 (samma riktningsregel som onsetStep, |err| <= 0,5) | FEL 29,9 -> 22,2; glider 14,2 -> 6,1; motslag 6,3 -> 4,4; oktav 10,4 -> 8,3 |

Diskanten (treble) prövades i m1-versionen och togs bort: hihats på offbeat gav falska vändningar (simulerat på motorns egna band: falska 56 -> 23 slag på 200719). Första versionen (m1, vippa mot det ovända rutnätet) gav FEL 31,1: rutnätet hoppade fortare än minnet hann med; därför fasminnet i musikfas.

**KOSTNADEN.** Allt i BeatFeed = workern (slow). Per hop: 3 log, ~15 aritmetik, en fackskrivning; per slag 48 EMA-steg; var 250 ms en msD (3 x 16). Långt under 1 % extra. Minne: fem små Float64Array, < 1 kB. Huvudtråden: en float till per hop i ringen (en skrivning). Ingen allokering per hop.

**SIFFRORNA (taktdom m2)**

| fil | FEL bas -> a3 | motslag | glider | stökigt | lead | etta bas -> a3 |
|---|---|---|---|---|---|---|
| 151659 | 32,6 -> 22,4 | 12,2 -> 10,2 | 10,2 -> 4,1 | 4,1 -> 2,0 | -53 -> -53 | 97,8 -> 97,9 |
| 160345 | 33,9 -> 23,2 | 3,6 -> 0,0 | 21,4 -> 7,1 | 1,8 -> 8,9 | -60 -> -60 | 90,4 -> 91,0 |
| 200719 | 23,0 -> 21,0 | 3,0 -> 3,0 | 11,0 -> 7,0 | 2,0 -> 5,0 | -60 -> -67 | 68,9 -> 61,6 |

Poäng +7,6, ingen spärr. Sämre: stökigt (2,6 -> 5,3), etta medel 85,7 -> 83,5 (-2,2, gränsen -3): på 200719 tappar ettan en hel minut (06:00-07:00) efter en halvslagsvändning, ettans minne lär om långsamt. Lead 200719 flyttade 7 ms (gräns 10).

**RISKEN.** Ettan efter en vändning (ingen omräkning av barOff/barM, bara ommätning). Halvt tempo: virveln på "och" kan vinna (räknas fortfarande som på slaget, men ettan kan flytta). Musik utan trumma / breaks: minnet bleknar inte i tystnad, bara vid hård låtgräns eller 10 s tystnad (msReset); mjuk gräns behåller minnet. Live-mic: highMid är känsligt för rumsljud/tal, kan ge falska vändningar; tröskeln 0,4 är ett mellanläge ur simulering (0,2-0,6 gav alla vinst), inte trimmad på mätningar.

**DIFFEN** (`git diff --no-index src .arena/takt/a3/src`)

```diff
diff --git a/src/analyserClock.ts b/.arena/takt/a3/src/analyserClock.ts
index 0bbcb78..236b153 100644
--- a/src/analyserClock.ts
+++ b/.arena/takt/a3/src/analyserClock.ts
@@ -41,6 +41,7 @@ const HV_R = [4 / 3, 3 / 4, 3 / 2, 2 / 3, 5 / 4, 4 / 5], HV_K = 1.25, HV_N = 5,
 const PW_RING = 4096, PW_WIN_MS = 10000, PW_MIN = 0.5, PW_Q = [4 / 3, 3 / 4, 3 / 2, 2 / 3];   // TAKTENS SJÄLVLIKHET
 const TG_K = 139, TG_STEP = Math.pow(2, 1 / TG_K), TG_PER_HOP = 1, TG_A = 0.21, TG_MIN_N = 300, TG_FINE = 0.0025, TG_HALF = ONSET_BINS >> 1;
 const TG_FINE_MAX = 0.0125;   // FINTEMPOTS BAND
+const MS_NB = 16, MS_N = 32, MS_T = 0.4, MS_EPS = 0.02, MS_RISE = 6, MS_B = 3;   // MOTSLAGSVAKTEN (a3)
 
 /** FAS-PREDIKTIONSTILLIT. */
 export function publishPhase(f: { beatPhaseMs: number; beatPhaseConf: number; barShift: number }, b: ClockCfg["beat"], barKnown: boolean,
@@ -92,6 +93,8 @@ export class BeatFeed {
   private innerAnchor = 0; private innerBpm = 0; private innerValid = false;
   private readonly anaGrid = { anchorMs: 0, bpm: 0, confidence: 0 };   // EN KÄLLA
   private boundSeen = 0;
+  private readonly msR = new Float64Array(MS_B * MS_RISE); private readonly msH = new Float64Array(MS_B * MS_NB); private readonly msC = new Float64Array(MS_NB); private readonly msS = new Float64Array(MS_B * MS_NB);   // MOTSLAGSVAKTEN (a3)
+  private msP = 0; private msW = 0; private msIdx = NaN; private msN = 0; private msOff = 0; private msU = NaN; private msT = 0; msFlips = 0;
   private quietAt = -1e12; private pend = false;   // MINNET VID GRÄNSEN
   /** Det cfg analysatorn ska byggas med. */
   barKnown(): boolean { return this.barN >= BAR_MIN; }
@@ -145,6 +148,7 @@ export class BeatFeed {
     beat.bpm = this.bestBpm; beat.anchorMs = now - (idx + fr) * nb;
     const shift = ((((beat.anchorMs - ref) % nb) + nb) % nb) / nb;
     let err = this.bestPh - shift; err -= Math.round(err);
+    if (this.msN >= MS_N && this.msD(err - this.msOff) < -MS_T) { err += err < 0 ? 0.5 : -0.5; this.msFlips++; }
     beat.anchorMs += err * nb;
     this.onsetFixes++;
   }
@@ -448,9 +452,42 @@ export class BeatFeed {
     if (bi !== this.barM && best - second >= BAR_MARGIN) { this.barM = bi; this.barShifts++; }
   }
 
+  private msReset(): void { this.msS.fill(0); this.msN = 0; this.msIdx = NaN; this.msOff = 0; this.msU = NaN; }
+
+  /** MOTSLAGSVAKTEN (a3): anslagen per fasfack i musikens egen fas (rutnätets hopp räknas bort). */
+  private msStep(frame: Frame, beat: NonNullable<EngineConfig["beat"]>, now: number): void {
+    const sa = frame.specAbs, R = this.msR, p = this.msP, H = this.msH, C = this.msC;
+    const v0 = Math.log((sa?.sub ?? 0) + (sa?.kick ?? 0) + 1e-7), v1 = Math.log((sa?.bass ?? 0) + 1e-7), v2 = Math.log((sa?.highMid ?? 0) + 1e-7);
+    const r0 = v0 - R[p], r1 = v1 - R[MS_RISE + p], r2 = v2 - R[2 * MS_RISE + p];
+    R[p] = v0; R[MS_RISE + p] = v1; R[2 * MS_RISE + p] = v2; this.msP = (p + 1) % MS_RISE;
+    if (this.msW < MS_RISE) { this.msW++; return; }
+    if (!(beat.bpm > 40)) { this.msU = NaN; return; }
+    const per = 60000 / beat.bpm, u = (now - beat.anchorMs) / per;
+    if (this.msU === this.msU) { let d = u - this.msU - (now - this.msT) / per; d -= Math.floor(d + 0.5); this.msOff += d; this.msOff -= Math.floor(this.msOff); }
+    this.msU = u; this.msT = now;
+    const ua = u - this.msOff + 0.5 / MS_NB, idx = Math.floor(ua);
+    if (idx !== this.msIdx) {
+      if (idx === this.msIdx + 1) { for (let q = 0; q < MS_NB; q++) if (C[q] > 0) for (let b = 0; b < MS_B; b++) { const i = b * MS_NB + q; this.msS[i] += (H[i] / C[q] - this.msS[i]) / MS_N; } if (this.msN < MS_N) this.msN++; }
+      this.msIdx = idx; H.fill(0); C.fill(0);
+    }
+    const q = Math.min(MS_NB - 1, Math.floor((ua - idx) * MS_NB));
+    H[q] += r0 > 0 ? r0 : 0; H[MS_NB + q] += r1 > 0 ? r1 : 0; H[2 * MS_NB + q] += r2 > 0 ? r2 : 0; C[q]++;
+  }
+
+  /** Slaget på fasen x (musikens fas) mot mitt emellan: summan över banden av log(starkaste facket nära x / nära x + 0,5). */
+  private msD(x: number): number {
+    const S = this.msS; let c = 0;
+    for (let b = 0; b < MS_B; b++) {
+      let on = 0, off = 0;
+      for (let q = 0; q < MS_NB; q++) { let d = q / MS_NB - x; d -= Math.round(d); const v = S[b * MS_NB + q]; if (d < 0.25 && d > -0.25) { if (v > on) on = v; } else if ((d > 0.25 || d < -0.25) && v > off) off = v; }
+      c += Math.log((on + MS_EPS) / (off + MS_EPS));
+    }
+    return c;
+  }
+
   /** LÅTGRÄNSEN. */
   private relock(soft: boolean): void {
-    this.tgReset(soft); this.barReset(); this.goodRep = 0; this.goodOn = 0; this.onNext = 0;
+    this.tgReset(soft); this.barReset(); if (!soft) this.msReset(); this.goodRep = 0; this.goodOn = 0; this.onNext = 0;
   }
 
   /** MINNET VID GRÄNSEN. */
@@ -495,7 +532,7 @@ export class BeatFeed {
     if (now - this.lastTrustLog > 4000) { this.lastTrustLog = now; if (isLogOn()) console.log(`[tillit] mönster ${this.repeatRate.toFixed(2)} · fasträff ${this.onBeatRate.toFixed(2)} · bpm ${cfg.beat ? cfg.beat.bpm.toFixed(1) : 0}`); }
     const pllConf = this.pllKicks >= 12 ? this.onBeatRate : 0;
     if (quietMs > 10000) {
-      if (cfg.beat || this.onN > 0) { this.barReset(); cfg.beat = null; cfg.beatErr = 0; this.onN = 0; this.scanC = 99; this.tgReset(); }
+      if (cfg.beat || this.onN > 0) { this.barReset(); this.msReset(); cfg.beat = null; cfg.beatErr = 0; this.onN = 0; this.scanC = 99; this.tgReset(); }
       return;
     }
     const beat0 = cfg.beat;
@@ -532,7 +569,7 @@ export class BeatFeed {
       if (!cfg.beat && this.tempoBpm > 0) cfg.beat = { anchorMs: frame.beatAnchorMs || now, bpm: this.tempoBpm, confidence: 0 };
       this.onsetStep(cfg, now);
     }
-    if (cfg.beat) this.barStep(frame, cfg.beat, now);
+    if (cfg.beat) { this.msStep(frame, cfg.beat, now); this.barStep(frame, cfg.beat, now); } else this.msU = NaN;
     if (cfg.beat) {
       if (pllConf >= GRID_ON_CONF) { this.gridWeakSince = 0; this.gridCoasting = false; }
       else if (pllConf < MIN_BEAT_CONFIDENCE) {
diff --git a/src/split.ts b/.arena/takt/a3/src/split.ts
index 3997f13..bdf8a28 100644
--- a/src/split.ts
+++ b/.arena/takt/a3/src/split.ts
@@ -137,12 +137,12 @@ export const BS_SEQ = 0, BS_BODY = 1, BS_DROPS = 2, BS_MINI = 3, BS_BUILD = 4, B
 export const BIG_STATE_LEN = 24;
 export const SPEC_SLOTS = 16, SPEC_MAX = 1024;   // 16 spektra
 
-export const HOP_REC_LEN = 19;   // TAKTVÄGEN
+export const HOP_REC_LEN = 20;   // TAKTVÄGEN
 export const HOP_RING_N = 4096;
 export const H_SEQ = 0, H_NOW = 1 , H_TS = 2 ,
   H_BPM = 3, H_CONF = 4, H_ANCHOR = 5, H_KICKAT = 6, H_BARSHIFT = 7, H_ON_KICK = 8, H_ON_HIMID = 9, H_ON_TREBLE = 10, H_SA_SUB = 11, H_SA_KICK = 12, H_SA_BASS = 13 ,
   H_BOUND = 14 , H_QUIET = 15 ,
-  H_SURE = 16 , H_UNDER = 17 , H_SA_TREBLE = 18;
+  H_SURE = 16 , H_UNDER = 17 , H_SA_TREBLE = 18, H_SA_HIMID = 19;
 export const C_HOP_WRITE = 4, C_HOP_READ = 5, C_FEED_SEQ = 6 , C_WAKE = 7 ;
 export const FS_HOP_SEQ = 0, FS_BEAT = 1 , FS_ANCHOR = 2, FS_BPM = 3, FS_BCONF = 4,
   FS_BEATERR = 5 , FS_FCONF = 6 , FS_GRID = 7 ,
@@ -153,7 +153,7 @@ export const FEED_STATE_LEN = 20;
 
 /** Det taktmatningen läser ur ramen, och det den skriver. */
 export interface HopFrame { bpm: number; bpmConfidence: number; beatAnchorMs: number; kickAtMs: number; barShift: number; beatTrust?: number;
-  onset: { kick: number; highMid: number; treble: number }; specAbs: { sub: number; kick: number; bass: number; treble: number } }
+  onset: { kick: number; highMid: number; treble: number }; specAbs: { sub: number; kick: number; bass: number; highMid: number; treble: number } }
 export interface HopGrid { anchorMs: number; bpm: number; confidence?: number }
 export interface HopCfg { beat?: HopGrid | null; beatErr?: number }
 export interface HopTarget { resetTempo(): void; resetBar(): void; setClockGrid?(g: HopGrid | null): void; trackBoundaries?: number; quietMs?: number; boundSure?: boolean; bodyUnderDb?: number;
@@ -180,7 +180,7 @@ export class HopLaneFast {
     r[o + H_NOW] = now; r[o + H_TS] = performance.timeOrigin + performance.now();
     r[o + H_BPM] = f.bpm; r[o + H_CONF] = f.bpmConfidence; r[o + H_ANCHOR] = f.beatAnchorMs; r[o + H_KICKAT] = f.kickAtMs; r[o + H_BARSHIFT] = f.barShift;
     r[o + H_ON_KICK] = f.onset?.kick ?? 0; r[o + H_ON_HIMID] = f.onset?.highMid ?? 0; r[o + H_ON_TREBLE] = f.onset?.treble ?? 0;
-    r[o + H_SA_SUB] = f.specAbs?.sub ?? 0; r[o + H_SA_KICK] = f.specAbs?.kick ?? 0; r[o + H_SA_BASS] = f.specAbs?.bass ?? 0; r[o + H_SA_TREBLE] = f.specAbs?.treble ?? 0;
+    r[o + H_SA_SUB] = f.specAbs?.sub ?? 0; r[o + H_SA_KICK] = f.specAbs?.kick ?? 0; r[o + H_SA_BASS] = f.specAbs?.bass ?? 0; r[o + H_SA_TREBLE] = f.specAbs?.treble ?? 0; r[o + H_SA_HIMID] = f.specAbs?.highMid ?? 0;
     r[o + H_BOUND] = an.trackBoundaries ?? 0; r[o + H_QUIET] = an.quietMs ?? 0; r[o + H_SURE] = an.boundSure ? 1 : 0; r[o + H_UNDER] = an.bodyUnderDb ?? 0;
     r[o + H_SEQ] = seq;
     Atomics.store(ctrl, C_HOP_WRITE, seqLow(seq)); Atomics.add(ctrl, C_WAKE, 1);
@@ -222,7 +222,7 @@ export class HopLaneSlow {
   private seq: number; private rt: number; private rb: number; private processed: number;
   private skipped = 0; private lagMaxMs = 0; private busyEmaUs = 0; private busyMaxUs = 0; private fconf = NaN;
   private readonly fr = { bpm: 0.5, bpmConfidence: 0.5, beatAnchorMs: 0.5, kickAtMs: 0.5, barShift: 0.5,
-    onset: { kick: 0.5, highMid: 0.5, treble: 0.5 }, specAbs: { sub: 0.5, kick: 0.5, bass: 0.5, treble: 0.5 } };
+    onset: { kick: 0.5, highMid: 0.5, treble: 0.5 }, specAbs: { sub: 0.5, kick: 0.5, bass: 0.5, highMid: 0.5, treble: 0.5 } };
   private readonly cfg: HopCfg = { beat: undefined, beatErr: undefined };
   private grid: HopGrid | null = null;
   private readonly target: HopTarget = { trackBoundaries: 0, quietMs: 0, resetTempo: () => { this.rt++; }, resetBar: () => { this.rb++; }, setClockGrid: (g) => { this.grid = g; } };
@@ -244,7 +244,7 @@ export class HopLaneSlow {
       this.target.trackBoundaries = r[o + H_BOUND]; this.target.quietMs = r[o + H_QUIET]; this.target.boundSure = r[o + H_SURE] === 1; this.target.bodyUnderDb = r[o + H_UNDER];
       fr.bpm = r[o + H_BPM]; fr.bpmConfidence = r[o + H_CONF]; fr.beatAnchorMs = r[o + H_ANCHOR]; fr.kickAtMs = r[o + H_KICKAT]; fr.barShift = r[o + H_BARSHIFT];
       fr.onset.kick = r[o + H_ON_KICK]; fr.onset.highMid = r[o + H_ON_HIMID]; fr.onset.treble = r[o + H_ON_TREBLE];
-      fr.specAbs.sub = r[o + H_SA_SUB]; fr.specAbs.kick = r[o + H_SA_KICK]; fr.specAbs.bass = r[o + H_SA_BASS]; fr.specAbs.treble = r[o + H_SA_TREBLE];
+      fr.specAbs.sub = r[o + H_SA_SUB]; fr.specAbs.kick = r[o + H_SA_KICK]; fr.specAbs.bass = r[o + H_SA_BASS]; fr.specAbs.treble = r[o + H_SA_TREBLE]; fr.specAbs.highMid = r[o + H_SA_HIMID];
       const cin = fr.bpmConfidence;
       this.feed.update(fr, this.cfg, this.target, r[o + H_NOW]);
       this.fconf = fr.bpmConfidence !== cin ? fr.bpmConfidence : NaN;
```
