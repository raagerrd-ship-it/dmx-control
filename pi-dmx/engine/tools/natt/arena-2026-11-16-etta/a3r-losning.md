# a3r: r0 + bastonens byte (billig skalär)

## IDÉN
r0 (a1:s glidrättning + a2:s kick-omstart med tak + barOff bara uppåt) är orört. Ovanpå det ligger bastonen som femte term: analysatorn mäter hur mycket basens tonklasser (chroma 40-250 Hz) har ändrats mot ETT SLAG tidigare (`frame.bassNov`, ett tal per hop), och klockan bokför medlet från 0,3 slag efter slaget på slagets plats i musikens numrering (r0:s `slot`), med vikt 2. Basgången byter ton på ettan. Det kompletterar kickens omstart, som bara ger bevis vid luckor i kicken, och ersätter den inte: utan omstarten (wr = 0) faller simuleringen från 75,5 till 69,1.

## DELAR
| del | från vem | mått den bär (siffra) |
|---|---|---|
| Glidrättning (J, slot = idx − round J) | a1 via r0 | r0: övning 79,8 / omval 0,78 |
| Kick-omstart R, tak BAR_R_MAX 2 | a2 + jokern via r0 | i r0 |
| barOff ökar bara (inga extra tick) | jokern via r0 | paslag 70,40 (i r0), här 70,45 |
| BassTone: decimerad 512-FFT, chroma, nyhet mot chroma ett slag tidigare (historik 128 rutor) -> `frame.bassNov` (analyserBass.ts, analyser.ts) | a3 (ny, billigare form) | bär nästa rad |
| Tontermen BAR_W_TONE 2, BAR_TONE0 0,3 (analyserClock.ts) | a3 | m1 mot r0: etta 79,8 -> 83,1, omval 0,78 -> 0,59, **+4,26** (151659 93,2 -> 95,2, 172432 67,5 -> 71,3, 160345 78,7 -> 82,9) |
| H_BNOV: ett tal i taktvägens hop-record (split.ts, HOP_REC_LEN 18 -> 19) | a3 | krävs live (BEAT_FEED slow), inget mått på bänken |

Bevis för att tontermen bär (2 sonder, offline-simulering av r0:s beslut, som stämmer med r0 live till 99,4/100 % av slagen):
- r0 i sim: 66,1 / 77,2 (172432 / 160345). Med tonen, vikt 2: 73,0 / 78,1. Alla vikter 0,25-4 och alla fyra tonvarianter ger plus.
- Delat på kickens omstartsbevis, med tredjedelar av R-summan över 32 slag, gav tonen i 172432: låg R 72,4 -> 80,7, mellan R 72,9 -> 75,0, hög R 53,1 -> 63,3. I 160345: 85,0 -> 85,0, 75,7 -> 76,0, 70,9 -> 73,2. Tonen bär alltså mest i 172432, och där i alla tredjedelar, inte bara där R saknas.

## VALT BORT
- Runda 1:s form (12 chroma-tal per hop i taktvägen, +393 kB): ersatt av en skalär, +32 kB i hop-ringen och cirka 30 kB i BassTone. Sim: skalären (73,0 / 78,1) slår chroma-summan per slag (69,0 / 77,8).
- BAR_DECAY 0,97 från runda 1: jokern visade att den skadar r0. 0,98 gav +0,8 i sim på två filer, men jag lade ingen mätning på den (151659 och mellan saknas, risk för överanpassning).
- Tonvikt styrd av omstartsbevisets storlek ("tonen bara där R saknas"): sämre i alla prov (bästa 74,3 mot 75,5).
- Max i stället för medel, och hela slaget i stället för från 0,3: sämre eller lika.

## SIFFROR (ettdom m1 = ettdom.json; m2 inte använd)
| fil | etta bas / r0 / a3r | omval bas / r0 / a3r | paslag bas / r0 / a3r |
|---|---|---|---|
| 151659 | 42,5 / 93,2 / 95,2 | 1,28 / 0,12 / 0,12 | 78,0 / 78,6 / 78,6 |
| 172432 | 32,0 / 67,5 / 71,3 | 1,51 / 1,20 / 1,04 | 51,2 / 50,7 / 50,7 |
| 160345 | 25,9 / 78,7 / 82,9 | 1,44 / 1,03 / 0,62 | 81,8 / 81,9 / 82,1 |
| medel | 33,5 / 79,8 / 83,1 | 1,41 / 0,78 / 0,59 | 70,36 / 70,40 / 70,45 |

Mot bas: +53,76. Mot r0: +4,26. Ingen spärr. Inget mått blev sämre än i r0.

## RISKER
- Musik utan tonal bas (break, trumsolo, tal): `bassNov` blir brus. Tonen har vikt 2 bland fem andelar, så den kan inte ensam vända ett säkert beslut, men den kan fördröja ett.
- Basgång som byter ton på varje slag, eller på slag 3: tvetydighet mellan 0 och 2.
- Nyheten använder analysatorns `localBpm` (klockans publicerade tempo). Står tempot fel en oktav jämförs fel slag. Efter ett låtbyte är historiken förra låtens i ungefär ett slag.
- CPU: en 512-FFT var 4:e hop plus 128 additioner per hop i snabba vägen, även i lotus. Ingen allokering per hop.
- Mellanmängden är inte körd. Tonen höll där i runda 1 (a3: 57,7 mot bas 34,6), men aldrig ihop med r0.
- ANALYSER_SHARED.md5 är inte omräknad.

## DIFFEN (git diff --no-index --ignore-cr-at-eol .arena/etta/bas/src .arena/etta/a3r/src; även i a3r.diff)
```diff
diff --git a/.arena/etta/bas/src/analyser.ts b/.arena/etta/a3r/src/analyser.ts
index 5dcd901..93e1e73 100644
--- a/.arena/etta/bas/src/analyser.ts
+++ b/.arena/etta/a3r/src/analyser.ts
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
+  bassNov: number;   // BASTONEN
 }
 
 export const BODY_RISE_DB = Number(env('BODY_RISE_DB') ?? 17);   // DROP-DETEKTOR
@@ -736,7 +737,7 @@ export class Analyser {
       kick: false, gain: 1, bpm: 0, bpmConfidence: 0, intensity: 0.5,
       dropCount: 0, miniDropCount: 0, buildStartCount: 0, dropDemoted: 0, dropSpaced: 0, dropRiseDb: 0, nearDropDb: 0, nearDipDb: 0, liftDb: 0, stopCount: 0, stopS: 0, bodyDb: 0, bassEnergy: 0, bassEnergyShort: 0, bassLevel: 1, midHiDb: -120, inZone: false, breaking: false, buildUp: 0, buildProg: 0, inRiser: false, profile: this.character.outProfile, beatAnchorMs: 0,
       kickAtMs: 0, barShift: -1, beatPhaseMs: 0, beatPhaseConf: 0, beatTrust: 0, section: 'intro', sectionAgeMs: 0, sectionIndex: 0, sectionTier: 1, repeatSim: 0, repeatAgoMs: 0, repeatSection: '', expectHighInMs: -1, prevSection: '', levelVsHighDb: 0, sectionBars: 0,
-      spec: this.outSpec, specAbs: this.outSpecAbs, onset: this.outOnset, drum: this.outDrum,
+      spec: this.outSpec, specAbs: this.outSpecAbs, onset: this.outOnset, drum: this.outDrum, bassNov: 0,
     };
     for (const o of [this.outFrame, this.character.outProfile, this.outSpec, this.outSpecAbs, this.outOnset, this.outDrum]) stabiliseNumbers(o);
     for (const k of DOUBLE_FROM_START) { const v = (this as unknown as Record<string, number>)[k]; if (typeof v === 'number') { (this as unknown as Record<string, number>)[k] = 0.5; (this as unknown as Record<string, number>)[k] = v; } }
@@ -871,6 +872,7 @@ export class Analyser {
     if (++this.bigCounter >= Analyser.BIG_EVERY) this.bands.bigStep();
     }
     if (Analyser.FAST_BANDS) this.bands.fastBandStep(samples);
+    this.tone.step(samples, this.cfg.audio.rate, this.localBpm);
     const ON = Analyser.FAST_BANDS ? this.fbOn : this.bandOn;
     const hatOnset = ON[6] > ON[7] ? ON[6] : ON[7];
     this.hatHit = Math.max(this.hatHit * this.dHat, hatOnset);
@@ -949,7 +951,7 @@ export class Analyser {
     { let s2 = 1e-12; for (let b = 3; b < 8; b++) { const lin = Math.pow(10, (FB ? this.bands.fbDbRaw : this.bandDbRaw)[b] / 20); s2 += lin * lin; } f.midHiDb = 20 * Math.log10(Math.sqrt(s2)); }
     f.dropCount = this.drop.dropCount; f.miniDropCount = this.drop.miniDropCount; f.buildStartCount = this.drop.buildStartCount; f.dropDemoted = this.drop.dropDemoted; f.dropSpaced = this.drop.dropSpaced; f.dropRiseDb = this.drop.dropRiseDb;
     f.nearDropDb = this.drop.nearDropDb; f.nearDipDb = this.drop.nearDipDb; f.liftDb = this.drop.liftDb; f.stopCount = this.drop.stopCount; f.stopS = this.drop.stopS; f.inZone = inZone; f.breaking = breaking; f.buildUp = this.buildUp; f.inRiser = inRiser;
-    f.kickAtMs = kickAtMs; f.barShift = -1;
+    f.kickAtMs = kickAtMs; f.barShift = -1; f.bassNov = this.tone.nov;
     f.beatPhaseMs = this.beatPhaseMs > 0 ? this.beatPhaseMs - Analyser.GRID_PHASE_OFFSET_MS : this.beatPhaseMs;
     f.beatPhaseConf = this.beatPhaseConf;
     this.sections.sectionAggStep();
@@ -976,6 +978,7 @@ export class Analyser {
   readonly riser = new RiserDetector(this);   // UPPBYGGNAD
   readonly character = new CharacterProfile(this);   // KARAKTÄR
   readonly kicks = new KickDetector(this);   // KICK: anslag i snabba vägen
+  readonly tone = new BassTone();   // BASTONEN
   readonly bass = new BassTracker(this);   // BAS: basenergin per slag och basgången
   readonly levels = new LevelTracker(this);   // NIVÅ: förstärkning/AGC, tystnad, intensitet, nivåtak och topp-zon
   readonly bands = new SpectrumBands(this);   // SPEKTRUM
diff --git a/.arena/etta/bas/src/analyserBass.ts b/.arena/etta/a3r/src/analyserBass.ts
index 9e80d73..5bb2a47 100644
--- a/.arena/etta/bas/src/analyserBass.ts
+++ b/.arena/etta/a3r/src/analyserBass.ts
@@ -1,5 +1,6 @@
 /**  BASEN (utbruten ur analyser.ts 2026-11-14). Anteckningar (kommentarerna som stod i koden): docs/analysator/analyserBass.md */
 import { Analyser } from "./analyser.js";
+import FFT from "fft.js";
 
 const DOUBLE_FROM_START = ['blPrev1', 'blPrev2', 'blTrough'] as const;   // Talfält som ska vara flyttal från start
 
@@ -46,3 +47,40 @@ export class BassTracker {
     this.a.profBassline += (raw - this.a.profBassline) * 0.01;
   }
 }
+
+/** BASTONEN: basbandets chroma 40-250 Hz (decimerad 512-FFT, ~171 ms) och dess byte mot ett slag tidigare. */
+export class BassTone {
+  private static readonly DEC = 16; private static readonly N = 512; private static readonly EVERY = 4; private static readonly LO_HZ = 40; private static readonly HI_HZ = 250; private static readonly HIST = 128;
+  readonly chroma = new Float32Array(12); nov = 0;
+  private readonly ring = new Float32Array(BassTone.N); private readonly x = new Float32Array(BassTone.N); private readonly win = new Float32Array(BassTone.N);
+  private readonly fft = new FFT(BassTone.N); private readonly spec = this.fft.createComplexArray() as number[];
+  private readonly hist = new Float32Array(BassTone.HIST * 12); private hPos = 0; private hN = 0; private frameMs = 0;
+  private pc = new Int8Array(0); private lo = 0; private pos = 0; private acc = 0; private accN = 0; private hops = 0;
+  /** Ett hop. */
+  step(samples: Float32Array, rate: number, bpm: number): void {
+    const N = BassTone.N, D = BassTone.DEC, R = this.ring;
+    if (this.pc.length === 0) {
+      const hz = rate / D / N; this.lo = Math.max(1, Math.round(BassTone.LO_HZ / hz)); const hi = Math.round(BassTone.HI_HZ / hz);
+      this.pc = new Int8Array(hi - this.lo + 1); this.frameMs = 1000 * samples.length * BassTone.EVERY / rate;
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
+    const H = this.hist, Hn = BassTone.HIST, lag = bpm > 40 ? Math.round(60000 / bpm / this.frameMs) : 0;
+    this.nov = 0;
+    if (lag > 0 && lag < Hn && this.hN >= lag) {
+      const o = ((this.hPos - lag + Hn) % Hn) * 12; let cc = 0, qq = 0, cq = 0;
+      for (let i = 0; i < 12; i++) { const u = c[i], v = H[o + i]; cc += u * u; qq += v * v; cq += u * v; }
+      if (cc > 0 && qq > 0) this.nov = 1 - cq / Math.sqrt(cc * qq);
+    }
+    H.set(c, this.hPos * 12); this.hPos = (this.hPos + 1) % Hn; if (this.hN < Hn) this.hN++;
+  }
+}
diff --git a/.arena/etta/bas/src/analyserClock.ts b/.arena/etta/a3r/src/analyserClock.ts
index 384c61c..9f9a4bd 100644
--- a/.arena/etta/bas/src/analyserClock.ts
+++ b/.arena/etta/a3r/src/analyserClock.ts
@@ -25,7 +25,7 @@ const ONSET_WIN_MS = 5000, ONSET_EVERY_MS = 250, ONSET_BINS = 48, ONSET_RING = 1
 const FEED_RISE_HOPS = 6;   // BASENS STIGNING
 const BREAK_HOLD_MS = 20000;   // TVÅ RUTNÄT
 const BREAK_RESTORE_MS = Number(process.env.DMX_BREAK_RESTORE_MS ?? String(BREAK_HOLD_MS));
-const BAR_DECAY = 0.99, BAR_MIN = 16, BAR_MARGIN = 0.06, BAR_W_BASS = 0.5, BAR_W_BACK = 0.5, BAR_WIN0 = -0.2, BAR_WIN1 = 0.3, BAR_RISE_HOPS = 6;   // ETTAN I EFFEKTKLOCKANS RUTNÄT
+const BAR_DECAY = 0.99, BAR_MIN = 16, BAR_MARGIN = 0.06, BAR_W_BASS = 0.5, BAR_W_BACK = 0.5, BAR_WIN0 = -0.2, BAR_WIN1 = 0.3, BAR_RISE_HOPS = 6, BAR_R_MAX = 2, BAR_W_TONE = 2, BAR_TONE0 = 0.3;   // ETTAN I EFFEKTKLOCKANS RUTNÄT
 const TG_HOLD = 1.35;   // HELA TEMPOOMRÅDET
 const TG_SIB = [Math.round(Math.log2(4 / 3) * 139), Math.round(Math.log2(3 / 2) * 139)];   // 4:3 och 3:2 i rutnätets steg
 const TG_SNAP = 0.03, TG_EDGE = 1.03, TG_OCT_UP = 0.85, TG_OCT_DN = 0.4, TG_OCT_A = 0.1;
@@ -85,6 +85,9 @@ export class BeatFeed {
   private goodOn = 0; private goodRep = 0; private goodAt = 0;   // TAKTEN GENOM BREAKET
   private readonly barK = new Float64Array(4); private readonly barL = new Float64Array(4); private readonly barB = new Float64Array(4);   // ETTAN (a5)
   private barN = 0; private barIdx = NaN; private bK = 0; private bL = 0; private bB = 0; private barOff = 0; barShifts = 0;
+  private barM = 0; private barJ = 0; private barPos = NaN; private barAt = 0;   // ettan räknas i musikens slag (a1)
+  private readonly barR = new Float64Array(4); private bE = 0; private bE1 = 0; private bE2 = 0; private bEm = 0;   // kickens återstart (a2)
+  private readonly barT = new Float64Array(4); private bT = 0; private bTn = 0;   // BASTONEN (a3)
   private readonly linK = new Float64Array(BAR_RISE_HOPS); private readonly linL = new Float64Array(BAR_RISE_HOPS); private linPos = 0;
   private innerAnchor = 0; private innerBpm = 0; private innerValid = false;
   private readonly anaGrid = { anchorMs: 0, bpm: 0, confidence: 0 };   // EN KÄLLA
@@ -386,45 +389,54 @@ export class BeatFeed {
     return false;
   }
 
-  private barReset(): void { this.barK.fill(0); this.barL.fill(0); this.barB.fill(0); this.barN = 0; this.barIdx = NaN; this.barOff = 0; }
+  private barReset(): void { this.barK.fill(0); this.barL.fill(0); this.barB.fill(0); this.barR.fill(0); this.barT.fill(0); this.bE1 = 0; this.bE2 = 0; this.bEm = 0; this.barN = 0; this.barIdx = NaN; this.barOff -= this.barOff & 3; this.barM = 0; this.barJ = 0; this.barPos = NaN; }
 
   /** ETTAN (se BAR_DECAY). */
   private barStep(frame: Frame, beat: NonNullable<EngineConfig["beat"]>, now: number): void {
     const sa = frame.specAbs, p = this.linPos, k = (sa?.sub ?? 0) + (sa?.kick ?? 0), l = sa?.bass ?? 0;
     const rk = k - this.linK[p], rl = l - this.linL[p]; this.linK[p] = k; this.linL[p] = l; this.linPos = (p + 1) % BAR_RISE_HOPS;
     if (!(beat.bpm > 40)) return;
-    const pos = (now - beat.anchorMs) / (60000 / beat.bpm), idx = Math.floor(pos - BAR_WIN0);
+    const per = 60000 / beat.bpm, pos = (now - beat.anchorMs) / per, idx = Math.floor(pos - BAR_WIN0);
+    if (this.barPos === this.barPos) this.barJ += pos - this.barPos - (now - this.barAt) / per;
+    this.barPos = pos; this.barAt = now; const jr = Math.floor(this.barJ + 0.5);
     if (idx !== this.barIdx) {
-      if (idx === this.barIdx + 1) this.barCommit();
-      this.barIdx = idx; this.bK = 0; this.bL = 0; this.bB = 0;
+      if (idx === this.barIdx + 1) this.barCommit(jr);
+      this.barIdx = idx; this.bK = 0; this.bL = 0; this.bB = 0; this.bE = 0; this.bT = 0; this.bTn = 0;
     }
+    if (pos - idx >= BAR_TONE0) { this.bT += frame.bassNov ?? 0; this.bTn++; }
     if (pos - idx <= BAR_WIN1) {
       if (rk > this.bK) this.bK = rk;
+      if (k > this.bE) this.bE = k;
       if (rl > this.bL) this.bL = rl;
       const hb = (frame.onset?.highMid ?? 0) + (frame.onset?.treble ?? 0); if (hb > this.bB) this.bB = hb;
     }
+    { const d = ((((this.barM + jr - this.barOff) % 4) + 4) % 4); if (d) this.barOff += d; }
   }
 
   /** Slaget barIdx är färdigmätt. */
-  private barCommit(): void {
-    const K = this.barK, L = this.barL, B = this.barB, slot = ((this.barIdx % 4) + 4) % 4;
-    for (let i = 0; i < 4; i++) { K[i] *= BAR_DECAY; L[i] *= BAR_DECAY; B[i] *= BAR_DECAY; }
+  private barCommit(jr: number): void {
+    const K = this.barK, L = this.barL, B = this.barB, R = this.barR, T = this.barT, slot = (((this.barIdx - jr) % 4) + 4) % 4;
+    for (let i = 0; i < 4; i++) { K[i] *= BAR_DECAY; L[i] *= BAR_DECAY; B[i] *= BAR_DECAY; R[i] *= BAR_DECAY; T[i] *= BAR_DECAY; }
+    if (this.bTn > 0) T[slot] += this.bT / this.bTn;
     K[slot] += this.bK; L[slot] += this.bL; B[slot] += this.bB;
+    { const e = this.bE, pm = this.bE1 > this.bE2 ? this.bE1 : this.bE2;
+      if (this.bEm > 0 && e > pm) R[slot] += Math.min(BAR_R_MAX, (e - pm) / this.bEm);
+      this.bE2 = this.bE1; this.bE1 = e; this.bEm += (e - this.bEm) / 16; }
     if (this.barN < 1000) this.barN++;
     if (this.barN < BAR_MIN) return;
-    const sK = K[0] + K[1] + K[2] + K[3], sL = L[0] + L[1] + L[2] + L[3], sB = B[0] + B[1] + B[2] + B[3];
+    const sK = K[0] + K[1] + K[2] + K[3], sL = L[0] + L[1] + L[2] + L[3], sB = B[0] + B[1] + B[2] + B[3], sR = R[0] + R[1] + R[2] + R[3], sT = T[0] + T[1] + T[2] + T[3];
     if (!(sK > 0)) return;
     let bi = 0, best = -1e9, second = -1e9;
     for (let i = 0; i < 4; i++) {
-      const v = K[i] / sK + (sL > 0 ? BAR_W_BASS * L[i] / sL : 0) - (sB > 0 ? BAR_W_BACK * B[i] / sB : 0);
+      const v = K[i] / sK + (sR > 0 ? R[i] / sR : 0) + (sL > 0 ? BAR_W_BASS * L[i] / sL : 0) - (sB > 0 ? BAR_W_BACK * B[i] / sB : 0) + (sT > 0 ? BAR_W_TONE * T[i] / sT : 0);
       if (v > best) { second = best; best = v; bi = i; } else if (v > second) second = v;
     }
-    if (bi !== this.barOff && best - second >= BAR_MARGIN) { this.barOff = bi; this.barShifts++; }
+    if (bi !== this.barM && best - second >= BAR_MARGIN) { this.barM = bi; this.barShifts++; }
   }
 
   /** LÅTGRÄNSEN. */
   private relock(soft: boolean): void {
-    if (this.innerValid && this.innerBpm > 0) this.innerAnchor += this.barOff * (60000 / this.innerBpm);
+    if (this.innerValid && this.innerBpm > 0) this.innerAnchor += (this.barOff & 3) * (60000 / this.innerBpm);
     this.tgReset(soft); this.barReset(); this.goodRep = 0; this.goodOn = 0; this.onNext = 0;
   }
 
diff --git a/.arena/etta/bas/src/split.ts b/.arena/etta/a3r/src/split.ts
index 1a44e95..47446a7 100644
--- a/.arena/etta/bas/src/split.ts
+++ b/.arena/etta/a3r/src/split.ts
@@ -137,12 +137,12 @@ export const BS_SEQ = 0, BS_BODY = 1, BS_DROPS = 2, BS_MINI = 3, BS_BUILD = 4, B
 export const BIG_STATE_LEN = 24;
 export const SPEC_SLOTS = 16, SPEC_MAX = 1024;   // 16 spektra
 
-export const HOP_REC_LEN = 18;   // TAKTVÄGEN
+export const HOP_REC_LEN = 19;   // TAKTVÄGEN
 export const HOP_RING_N = 4096;
 export const H_SEQ = 0, H_NOW = 1 , H_TS = 2 ,
   H_BPM = 3, H_CONF = 4, H_ANCHOR = 5, H_KICKAT = 6, H_BARSHIFT = 7, H_ON_KICK = 8, H_ON_HIMID = 9, H_ON_TREBLE = 10, H_SA_SUB = 11, H_SA_KICK = 12, H_SA_BASS = 13 ,
   H_BOUND = 14 , H_QUIET = 15 ,
-  H_SURE = 16 , H_UNDER = 17 ;
+  H_SURE = 16 , H_UNDER = 17 , H_BNOV = 18 ;
 export const C_HOP_WRITE = 4, C_HOP_READ = 5, C_FEED_SEQ = 6 , C_WAKE = 7 ;
 export const FS_HOP_SEQ = 0, FS_BEAT = 1 , FS_ANCHOR = 2, FS_BPM = 3, FS_BCONF = 4,
   FS_BEATERR = 5 , FS_FCONF = 6 , FS_GRID = 7 ,
@@ -153,7 +153,7 @@ export const FEED_STATE_LEN = 20;
 
 /** Det taktmatningen läser ur ramen, och det den skriver. */
 export interface HopFrame { bpm: number; bpmConfidence: number; beatAnchorMs: number; kickAtMs: number; barShift: number; beatTrust?: number;
-  onset: { kick: number; highMid: number; treble: number }; specAbs: { sub: number; kick: number; bass: number } }
+  onset: { kick: number; highMid: number; treble: number }; specAbs: { sub: number; kick: number; bass: number }; bassNov?: number }
 export interface HopGrid { anchorMs: number; bpm: number; confidence?: number }
 export interface HopCfg { beat?: HopGrid | null; beatErr?: number }
 export interface HopTarget { resetTempo(): void; resetBar(): void; setClockGrid?(g: HopGrid | null): void; trackBoundaries?: number; quietMs?: number; boundSure?: boolean; bodyUnderDb?: number;
@@ -180,7 +180,7 @@ export class HopLaneFast {
     r[o + H_NOW] = now; r[o + H_TS] = performance.timeOrigin + performance.now();
     r[o + H_BPM] = f.bpm; r[o + H_CONF] = f.bpmConfidence; r[o + H_ANCHOR] = f.beatAnchorMs; r[o + H_KICKAT] = f.kickAtMs; r[o + H_BARSHIFT] = f.barShift;
     r[o + H_ON_KICK] = f.onset?.kick ?? 0; r[o + H_ON_HIMID] = f.onset?.highMid ?? 0; r[o + H_ON_TREBLE] = f.onset?.treble ?? 0;
-    r[o + H_SA_SUB] = f.specAbs?.sub ?? 0; r[o + H_SA_KICK] = f.specAbs?.kick ?? 0; r[o + H_SA_BASS] = f.specAbs?.bass ?? 0;
+    r[o + H_SA_SUB] = f.specAbs?.sub ?? 0; r[o + H_SA_KICK] = f.specAbs?.kick ?? 0; r[o + H_SA_BASS] = f.specAbs?.bass ?? 0; r[o + H_BNOV] = f.bassNov ?? 0;
     r[o + H_BOUND] = an.trackBoundaries ?? 0; r[o + H_QUIET] = an.quietMs ?? 0; r[o + H_SURE] = an.boundSure ? 1 : 0; r[o + H_UNDER] = an.bodyUnderDb ?? 0;
     r[o + H_SEQ] = seq;
     Atomics.store(ctrl, C_HOP_WRITE, seqLow(seq)); Atomics.add(ctrl, C_WAKE, 1);
@@ -222,7 +222,7 @@ export class HopLaneSlow {
   private seq: number; private rt: number; private rb: number; private processed: number;
   private skipped = 0; private lagMaxMs = 0; private busyEmaUs = 0; private busyMaxUs = 0; private fconf = NaN;
   private readonly fr = { bpm: 0.5, bpmConfidence: 0.5, beatAnchorMs: 0.5, kickAtMs: 0.5, barShift: 0.5,
-    onset: { kick: 0.5, highMid: 0.5, treble: 0.5 }, specAbs: { sub: 0.5, kick: 0.5, bass: 0.5 } };
+    onset: { kick: 0.5, highMid: 0.5, treble: 0.5 }, specAbs: { sub: 0.5, kick: 0.5, bass: 0.5 }, bassNov: 0.5 };
   private readonly cfg: HopCfg = { beat: undefined, beatErr: undefined };
   private grid: HopGrid | null = null;
   private readonly target: HopTarget = { trackBoundaries: 0, quietMs: 0, resetTempo: () => { this.rt++; }, resetBar: () => { this.rb++; }, setClockGrid: (g) => { this.grid = g; } };
@@ -244,7 +244,7 @@ export class HopLaneSlow {
       this.target.trackBoundaries = r[o + H_BOUND]; this.target.quietMs = r[o + H_QUIET]; this.target.boundSure = r[o + H_SURE] === 1; this.target.bodyUnderDb = r[o + H_UNDER];
       fr.bpm = r[o + H_BPM]; fr.bpmConfidence = r[o + H_CONF]; fr.beatAnchorMs = r[o + H_ANCHOR]; fr.kickAtMs = r[o + H_KICKAT]; fr.barShift = r[o + H_BARSHIFT];
       fr.onset.kick = r[o + H_ON_KICK]; fr.onset.highMid = r[o + H_ON_HIMID]; fr.onset.treble = r[o + H_ON_TREBLE];
-      fr.specAbs.sub = r[o + H_SA_SUB]; fr.specAbs.kick = r[o + H_SA_KICK]; fr.specAbs.bass = r[o + H_SA_BASS];
+      fr.specAbs.sub = r[o + H_SA_SUB]; fr.specAbs.kick = r[o + H_SA_KICK]; fr.specAbs.bass = r[o + H_SA_BASS]; fr.bassNov = r[o + H_BNOV];
       const cin = fr.bpmConfidence;
       this.feed.update(fr, this.cfg, this.target, r[o + H_NOW]);
       this.fconf = fr.bpmConfidence !== cin ? fr.bpmConfidence : NaN;
```
