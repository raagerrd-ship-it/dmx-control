# a5 BACKBEATEN - losning (arenan etta)

## IDÉN
Ettan väljs nu efter ett eget backbeat-särdrag: rå linjär flux i 512-FFT:ns 3,5-10 kHz (egen detektor, ej onset.highMid+treble), mätt i ett smalt fönster (-0,06..+0,12 slag) per slag. Backbeaten ligger på 2+4 (paritet: ettan är en av platserna FÖRE en backbeat), och den STARKASTE backbeaten är i den här musiken fyran (open hat/clap/fill in mot ettan) - alltså läggs ettan på platsen efter den starkaste backbeaten, dvs. före den svagare (tvåan). Kickens/basens stigning (oförändrad) skiljer kvar 1 från 3, och minnet är kortare (BAR_DECAY 0,97) så ettan följer låtbyten och udda takter.

Obs om kortet: offline mot Beat This på övningen fanns ingen virvel-paritet i 1,2-6 kHz (~50 %), bara i diskanten 3,5-10 kHz, och fyran var starkare än tvåan. Därför "efter den starkaste" i stället för "före".

## DELARNA
| del | vad den gör | mått den bär |
|---|---|---|
| D1 detektorn (analyser.ts `BACK_HZ`, `bbPrev/bbFlux`, `frame.backbeat`; split.ts `H_BACK`, HOP_REC_LEN 19) | egen linjär flux 3,5-10 kHz per hop, transporteras i taktvägen | grunden för D2+D3 |
| D2 paritetstermen (`BAR_W_PAIR`, ersätter `BAR_W_BACK`) + smalt fönster `BAR_BB_WIN0/1` | +andel backbeat på i+1,i+3, - på i,i+2 | m1 (D1+D2+D3, decay 0,99): etta 33,5 -> 42,7 |
| D3 fyrantermen (`BAR_W_FOUR`) | belönar platsen efter starkaste backbeaten | sond 160345: 53,8 med, 39,8 utan (-14 pe) |
| D4 kortare minne `BAR_DECAY` 0,99 -> 0,97 | ettan följer fasbyten (låtbyte, udda takt) | m1 -> m2: etta 42,7 -> 51,2 (+8,5 pe) |

Jokern: D4 är en ren konstant och kan lyftas ensam; D3 kräver D1.

## SIFFRORNA (ettdom, mot bas)
| | etta | omval | paslag | förskj. 0/1/2/3 |
|---|---|---|---|---|
| bas | 33,5 | 1,41 | 70,4 | |
| m1 | 42,7 | 1,59 | 69,8 | poäng ~ +8,4 |
| **m2** | **51,2** | **1,60** | **70,1** | **poäng +16,83** |
| m2 151659 | 53,0 (bas 42,5) | 1,28 (1,28) | 78,1 (78,0) | 53/15/16/16 |
| m2 172432 | 46,9 (bas 32,0) | 1,46 (1,51) | 50,4 (51,2) | 47/20/16/16 |
| m2 160345 | 53,8 (bas 25,9) | 2,05 (1,44) | 81,9 (81,8) | 54/17/12/18 |

Sämre: omval +0,19/min i medel, helt från 160345 (+0,61). Paslag oförändrat inom 0,8 pe.

## RISKEN
- Musik utan diskant-trumma (ballad, break): särdraget blir brus i andelarna; med 0,97 kan ettan vandra mer i långa breaks (omval).
- Låtar där cymbalen på ETTAN är starkaste diskanten: fyrantermen lägger ettan på tvåan (kvarvarande förskjutning 1, 15-20 %).
- Live-mic: rumsbrus/eko i 3,5-10 kHz sänker kontrasten; fönstret är smalt (±0,1 slag), så en rutnätsfas som ligger fel mot ljudet tappar särdraget.
- Lotus: detektorn läser 512-FFT:n direkt (fungerar utan FAST_BANDS), ~70 sqrt per hop, ingen allokering per hop.

## DIFFEN
`git diff --no-index --ignore-cr-at-eol src .arena/etta/a5/src` (applicera med `git apply --ignore-whitespace`):

```diff
diff --git a/src/analyser.ts b/.arena/etta/a5/src/analyser.ts
index 5dcd901..f0f47ac 100644
--- a/src/analyser.ts
+++ b/.arena/etta/a5/src/analyser.ts
@@ -138,6 +138,7 @@ export interface Frame {
   midHiDb: number;   // ABSOLUT mid+diskant-niva i dB
   onset: Spectrum;   // per-band ONSET/anslag
   drum: { kick: number; snare: number; hat: number; bass: number };   // TRUM-KIT-envelopes
+  backbeat: number;   // BACKBEATEN
 }
 
 export const BODY_RISE_DB = Number(env('BODY_RISE_DB') ?? 17);   // DROP-DETEKTOR
@@ -177,6 +178,8 @@ export class Analyser {
   private outOnset: Spectrum = { sub: 0, kick: 0, bass: 0, lowMid: 0, mid: 0, highMid: 0, treble: 0, air: 0 };
   private outDrum = { kick: 0, snare: 0, hat: 0, bass: 0 };   // trum-envelopes
   private outFrame!: Frame;   // ETT återanvänt Frame
+  private static readonly BACK_HZ = [3500, 10000];   // BACKBEATEN
+  private bbLo = 0; private bbPrev = new Float32Array(0); private bbFlux = 0;
   private hatHit = 0;   // TRUM-KIT peak-hold-envelopes
   private snareHit = 0;
   kickHit = 0;
@@ -709,6 +712,8 @@ export class Analyser {
       }
       this.bands.fbAlvl = 1 - Math.exp(-dtMs / 90);
     }
+    { const binHz = cfg.audio.rate / cfg.fft.size, half = cfg.fft.size / 2;
+      this.bbLo = Math.max(1, Math.round(Analyser.BACK_HZ[0] / binHz)); this.bbPrev = new Float32Array(Math.max(1, Math.min(half, Math.round(Analyser.BACK_HZ[1] / binHz)) - this.bbLo)); }
     this.bands.magBigMax = Math.min(BIG / 2, this.bands.bandHi[7] + 1);
     this.bands.magBigView = this.bands.magBig.subarray(0, this.bands.magBigMax);
     this.bands.prevMagBigView = this.bands.prevMagBig.subarray(0, this.bands.magBigMax);
@@ -736,7 +741,7 @@ export class Analyser {
       kick: false, gain: 1, bpm: 0, bpmConfidence: 0, intensity: 0.5,
       dropCount: 0, miniDropCount: 0, buildStartCount: 0, dropDemoted: 0, dropSpaced: 0, dropRiseDb: 0, nearDropDb: 0, nearDipDb: 0, liftDb: 0, stopCount: 0, stopS: 0, bodyDb: 0, bassEnergy: 0, bassEnergyShort: 0, bassLevel: 1, midHiDb: -120, inZone: false, breaking: false, buildUp: 0, buildProg: 0, inRiser: false, profile: this.character.outProfile, beatAnchorMs: 0,
       kickAtMs: 0, barShift: -1, beatPhaseMs: 0, beatPhaseConf: 0, beatTrust: 0, section: 'intro', sectionAgeMs: 0, sectionIndex: 0, sectionTier: 1, repeatSim: 0, repeatAgoMs: 0, repeatSection: '', expectHighInMs: -1, prevSection: '', levelVsHighDb: 0, sectionBars: 0,
-      spec: this.outSpec, specAbs: this.outSpecAbs, onset: this.outOnset, drum: this.outDrum,
+      spec: this.outSpec, specAbs: this.outSpecAbs, onset: this.outOnset, drum: this.outDrum, backbeat: 0,
     };
     for (const o of [this.outFrame, this.character.outProfile, this.outSpec, this.outSpecAbs, this.outOnset, this.outDrum]) stabiliseNumbers(o);
     for (const k of DOUBLE_FROM_START) { const v = (this as unknown as Record<string, number>)[k]; if (typeof v === 'number') { (this as unknown as Record<string, number>)[k] = 0.5; (this as unknown as Record<string, number>)[k] = v; } }
@@ -808,6 +813,9 @@ export class Analyser {
       const re = spectrum[2 * i], im = spectrum[2 * i + 1], p = re * re + im * im;
       powSum += p; powW += i * p;
     }
+    { const P = this.bbPrev, lo = this.bbLo; let s = 0;
+      for (let j = 0; j < P.length; j++) { const re = spectrum[2 * (lo + j)], im = spectrum[2 * (lo + j) + 1], m = Math.sqrt(re * re + im * im), d = m - P[j]; if (d > 0) s += d; P[j] = m; }
+      this.bbFlux = s; }
     this.onsetPeakReady = true;
     if (enhancedOnset) {
       for (let i = 0; i < bassBins; i++) this.prevMag[i] = this.onsetPrev[i];
@@ -949,7 +957,7 @@ export class Analyser {
     { let s2 = 1e-12; for (let b = 3; b < 8; b++) { const lin = Math.pow(10, (FB ? this.bands.fbDbRaw : this.bandDbRaw)[b] / 20); s2 += lin * lin; } f.midHiDb = 20 * Math.log10(Math.sqrt(s2)); }
     f.dropCount = this.drop.dropCount; f.miniDropCount = this.drop.miniDropCount; f.buildStartCount = this.drop.buildStartCount; f.dropDemoted = this.drop.dropDemoted; f.dropSpaced = this.drop.dropSpaced; f.dropRiseDb = this.drop.dropRiseDb;
     f.nearDropDb = this.drop.nearDropDb; f.nearDipDb = this.drop.nearDipDb; f.liftDb = this.drop.liftDb; f.stopCount = this.drop.stopCount; f.stopS = this.drop.stopS; f.inZone = inZone; f.breaking = breaking; f.buildUp = this.buildUp; f.inRiser = inRiser;
-    f.kickAtMs = kickAtMs; f.barShift = -1;
+    f.kickAtMs = kickAtMs; f.barShift = -1; f.backbeat = this.bbFlux;
     f.beatPhaseMs = this.beatPhaseMs > 0 ? this.beatPhaseMs - Analyser.GRID_PHASE_OFFSET_MS : this.beatPhaseMs;
     f.beatPhaseConf = this.beatPhaseConf;
     this.sections.sectionAggStep();
diff --git a/src/analyserClock.ts b/.arena/etta/a5/src/analyserClock.ts
index 384c61c..5f71a69 100644
--- a/src/analyserClock.ts
+++ b/.arena/etta/a5/src/analyserClock.ts
@@ -25,7 +25,7 @@ const ONSET_WIN_MS = 5000, ONSET_EVERY_MS = 250, ONSET_BINS = 48, ONSET_RING = 1
 const FEED_RISE_HOPS = 6;   // BASENS STIGNING
 const BREAK_HOLD_MS = 20000;   // TVÅ RUTNÄT
 const BREAK_RESTORE_MS = Number(process.env.DMX_BREAK_RESTORE_MS ?? String(BREAK_HOLD_MS));
-const BAR_DECAY = 0.99, BAR_MIN = 16, BAR_MARGIN = 0.06, BAR_W_BASS = 0.5, BAR_W_BACK = 0.5, BAR_WIN0 = -0.2, BAR_WIN1 = 0.3, BAR_RISE_HOPS = 6;   // ETTAN I EFFEKTKLOCKANS RUTNÄT
+const BAR_DECAY = 0.97, BAR_MIN = 16, BAR_MARGIN = 0.06, BAR_W_BASS = 0.5, BAR_W_PAIR = 0.25, BAR_W_FOUR = 0.25, BAR_WIN0 = -0.2, BAR_WIN1 = 0.3, BAR_BB_WIN0 = -0.06, BAR_BB_WIN1 = 0.12, BAR_RISE_HOPS = 6;   // ETTAN I EFFEKTKLOCKANS RUTNÄT
 const TG_HOLD = 1.35;   // HELA TEMPOOMRÅDET
 const TG_SIB = [Math.round(Math.log2(4 / 3) * 139), Math.round(Math.log2(3 / 2) * 139)];   // 4:3 och 3:2 i rutnätets steg
 const TG_SNAP = 0.03, TG_EDGE = 1.03, TG_OCT_UP = 0.85, TG_OCT_DN = 0.4, TG_OCT_A = 0.1;
@@ -398,10 +398,11 @@ export class BeatFeed {
       if (idx === this.barIdx + 1) this.barCommit();
       this.barIdx = idx; this.bK = 0; this.bL = 0; this.bB = 0;
     }
-    if (pos - idx <= BAR_WIN1) {
+    const ph = pos - idx;
+    if (ph <= BAR_WIN1) {
       if (rk > this.bK) this.bK = rk;
       if (rl > this.bL) this.bL = rl;
-      const hb = (frame.onset?.highMid ?? 0) + (frame.onset?.treble ?? 0); if (hb > this.bB) this.bB = hb;
+      const hb = frame.backbeat ?? 0; if (ph >= BAR_BB_WIN0 && ph <= BAR_BB_WIN1 && hb > this.bB) this.bB = hb;
     }
   }
 
@@ -416,7 +417,7 @@ export class BeatFeed {
     if (!(sK > 0)) return;
     let bi = 0, best = -1e9, second = -1e9;
     for (let i = 0; i < 4; i++) {
-      const v = K[i] / sK + (sL > 0 ? BAR_W_BASS * L[i] / sL : 0) - (sB > 0 ? BAR_W_BACK * B[i] / sB : 0);
+      const v = K[i] / sK + (sL > 0 ? BAR_W_BASS * L[i] / sL : 0) + (sB > 0 ? (BAR_W_PAIR * (B[(i + 1) & 3] + B[(i + 3) & 3] - B[i] - B[(i + 2) & 3]) + BAR_W_FOUR * (B[(i + 3) & 3] - B[(i + 1) & 3])) / sB : 0);
       if (v > best) { second = best; best = v; bi = i; } else if (v > second) second = v;
     }
     if (bi !== this.barOff && best - second >= BAR_MARGIN) { this.barOff = bi; this.barShifts++; }
diff --git a/src/split.ts b/.arena/etta/a5/src/split.ts
index 1a44e95..d36d2f3 100644
--- a/src/split.ts
+++ b/.arena/etta/a5/src/split.ts
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
+  H_SURE = 16 , H_UNDER = 17 , H_BACK = 18 ;
 export const C_HOP_WRITE = 4, C_HOP_READ = 5, C_FEED_SEQ = 6 , C_WAKE = 7 ;
 export const FS_HOP_SEQ = 0, FS_BEAT = 1 , FS_ANCHOR = 2, FS_BPM = 3, FS_BCONF = 4,
   FS_BEATERR = 5 , FS_FCONF = 6 , FS_GRID = 7 ,
@@ -152,7 +152,7 @@ export const FS_HOP_SEQ = 0, FS_BEAT = 1 , FS_ANCHOR = 2, FS_BPM = 3, FS_BCONF =
 export const FEED_STATE_LEN = 20;
 
 /** Det taktmatningen läser ur ramen, och det den skriver. */
-export interface HopFrame { bpm: number; bpmConfidence: number; beatAnchorMs: number; kickAtMs: number; barShift: number; beatTrust?: number;
+export interface HopFrame { bpm: number; bpmConfidence: number; beatAnchorMs: number; kickAtMs: number; barShift: number; beatTrust?: number; backbeat?: number;
   onset: { kick: number; highMid: number; treble: number }; specAbs: { sub: number; kick: number; bass: number } }
 export interface HopGrid { anchorMs: number; bpm: number; confidence?: number }
 export interface HopCfg { beat?: HopGrid | null; beatErr?: number }
@@ -181,7 +181,7 @@ export class HopLaneFast {
     r[o + H_BPM] = f.bpm; r[o + H_CONF] = f.bpmConfidence; r[o + H_ANCHOR] = f.beatAnchorMs; r[o + H_KICKAT] = f.kickAtMs; r[o + H_BARSHIFT] = f.barShift;
     r[o + H_ON_KICK] = f.onset?.kick ?? 0; r[o + H_ON_HIMID] = f.onset?.highMid ?? 0; r[o + H_ON_TREBLE] = f.onset?.treble ?? 0;
     r[o + H_SA_SUB] = f.specAbs?.sub ?? 0; r[o + H_SA_KICK] = f.specAbs?.kick ?? 0; r[o + H_SA_BASS] = f.specAbs?.bass ?? 0;
-    r[o + H_BOUND] = an.trackBoundaries ?? 0; r[o + H_QUIET] = an.quietMs ?? 0; r[o + H_SURE] = an.boundSure ? 1 : 0; r[o + H_UNDER] = an.bodyUnderDb ?? 0;
+    r[o + H_BOUND] = an.trackBoundaries ?? 0; r[o + H_QUIET] = an.quietMs ?? 0; r[o + H_SURE] = an.boundSure ? 1 : 0; r[o + H_UNDER] = an.bodyUnderDb ?? 0; r[o + H_BACK] = f.backbeat ?? 0;
     r[o + H_SEQ] = seq;
     Atomics.store(ctrl, C_HOP_WRITE, seqLow(seq)); Atomics.add(ctrl, C_WAKE, 1);
     if (Atomics.load(ctrl, C_WAITING) || Atomics.load(ctrl, C_WAITING_B)) Atomics.notify(ctrl, C_WAKE);
@@ -221,7 +221,7 @@ export class HopLaneSlow {
   private readonly ctrl: Int32Array; private readonly ring: Float64Array; private readonly state: Float64Array;
   private seq: number; private rt: number; private rb: number; private processed: number;
   private skipped = 0; private lagMaxMs = 0; private busyEmaUs = 0; private busyMaxUs = 0; private fconf = NaN;
-  private readonly fr = { bpm: 0.5, bpmConfidence: 0.5, beatAnchorMs: 0.5, kickAtMs: 0.5, barShift: 0.5,
+  private readonly fr = { bpm: 0.5, bpmConfidence: 0.5, beatAnchorMs: 0.5, kickAtMs: 0.5, barShift: 0.5, backbeat: 0.5,
     onset: { kick: 0.5, highMid: 0.5, treble: 0.5 }, specAbs: { sub: 0.5, kick: 0.5, bass: 0.5 } };
   private readonly cfg: HopCfg = { beat: undefined, beatErr: undefined };
   private grid: HopGrid | null = null;
@@ -242,7 +242,7 @@ export class HopLaneSlow {
       if (r[o + H_SEQ] !== seq) { this.skipped++; continue; }
       const t0 = performance.now();
       this.target.trackBoundaries = r[o + H_BOUND]; this.target.quietMs = r[o + H_QUIET]; this.target.boundSure = r[o + H_SURE] === 1; this.target.bodyUnderDb = r[o + H_UNDER];
-      fr.bpm = r[o + H_BPM]; fr.bpmConfidence = r[o + H_CONF]; fr.beatAnchorMs = r[o + H_ANCHOR]; fr.kickAtMs = r[o + H_KICKAT]; fr.barShift = r[o + H_BARSHIFT];
+      fr.bpm = r[o + H_BPM]; fr.bpmConfidence = r[o + H_CONF]; fr.beatAnchorMs = r[o + H_ANCHOR]; fr.kickAtMs = r[o + H_KICKAT]; fr.barShift = r[o + H_BARSHIFT]; fr.backbeat = r[o + H_BACK];
       fr.onset.kick = r[o + H_ON_KICK]; fr.onset.highMid = r[o + H_ON_HIMID]; fr.onset.treble = r[o + H_ON_TREBLE];
       fr.specAbs.sub = r[o + H_SA_SUB]; fr.specAbs.kick = r[o + H_SA_KICK]; fr.specAbs.bass = r[o + H_SA_BASS];
       const cin = fr.bpmConfidence;
```
