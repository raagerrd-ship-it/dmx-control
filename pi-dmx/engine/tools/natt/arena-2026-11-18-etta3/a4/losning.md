# a4 NYHET PÅ ETTAN (etta3)

## IDÉN
Workern gör ett log-spektrum (23 tredjedelsoktavband) per stor-FFT. Klockan jämför varje slags medelspektrum med förra slagets och bokför
nyheten på slagets plats som en ny röst. Loopmusik byter innehåll på ettan (nytt varv, ackord, fill som slutar). Trean ligger mitt i loopen
och är ett av de minst nya slagen, så rösten skiljer 1 från 3, vilket backbeaten inte kan.

Egen analys på övningens WAV och Beat This-rutnät: ackumulerad nyhet väljer 1 framför 3 i 100/98/100 % av slagen (151659/171840/200719).
Chroma (som etta2 a1) gav sämre resultat (fönster om 32 slag: 87/62/67 mot 80/85/86).

## DELARNA
| del | vad den gör | mått | idébank |
|---|---|---|---|
| novTap (analyserSpectrum.ts bigStep) | 23 band 40 Hz - 13 kHz, log med relativt golv (gain-oberoende), en vektor per stor-FFT i en modulvariabel | förutsättning | - |
| barNov + barNv (analyserClock.ts) | slagets medelspektrum mot förra slagets (medel \|skillnad\|), /glidande medel, tak BAR_R_MAX, BAR_DECAY, röst BAR_W_NOV x Nv[i]/sum | m1 (W=2): 171840 ren 75,3 -> 93,0, trean 21,8 -> 3,5 | formen från etta2 a1 (harmonibyte), här bredbandigt och utan taktvägsfält |
| BAR_W_NOV = 4 (m2) | mer vikt där rösterna är oense | 171840 93,0 -> 93,6, trean 3,5 -> 1,1. 151659 och 200719 identiska med W=2 (sonder) | - |

## KOSTNADEN
- Worker: per stor-FFT (125/s) ~550 additioner + 23 log. Per hop 23 additioner, per slag 23 subtraktioner. Långt under 1 % av en kärna.
- Huvudtråden: 0 (bigStep körs i den långsamma sidan). split.ts är orörd. Minne ~1 kB, ingen allokering per hop.

## SIFFRORNA (m2 = levererad kod; ren/trean %)
| fil | bas | m1 | m2 | etta alla bas -> m2 |
|---|---|---|---|---|
| 151659 | 92,8/6,0 | 93,5/5,3 | 93,5/5,3 | 93,9 -> 94,3 |
| 171840 | 75,3/21,8 | 93,0/3,5 | 93,6/1,1 | 74,8 -> 86,8 |
| 200719 | 91,8/4,9 | 91,8/4,9 | 91,8/4,9 | 67,0 -> 70,5 |
| medel | 86,6/10,9 | 92,8/4,6 | 93,0/3,8 | 78,6 -> 83,9 |

Poängen är +6,24 (m1) och +6,43 (m2). Omval 0,74 -> 0,72. FEL, oktav, paslag och lead är oförändrade, och ingen spärr föll.

Det som blev sämre: 171840 förskjutning 1 i ren 0,3 -> 5,1. Kvar på trean är uppvärmningen efter en gräns (151659 15-29 s, 200719 1003-1032 s).
Vinsten bärs av EN fil (171840). På de andra två håller rösten med basen.

## RISKEN
- novTap kräver att klockan och den långsamma analysatorn körs i samma tråd. Det gäller workern 'all' och bänken. Delas de upp ('lane'/'slow')
  tystnar rösten, och basens beteende står kvar.
- Fraser som byter på trean och udda takter: med W=4 kan rösten dra ettan fel. Vikten verkar bara där rösterna är oense, och det syns inte på övningen.
- Live-mic: rumsklangen smetar ut spektrumet, men rösten är relativ och späds bara ut.
- Breaks: brus ger en jämn röst. En drop-landning ger stor nyhet på ettan (kapad på 2).
- Musik utan trumma: rösten fungerar på klang och harmoni.
- Lotus: ANALYSER_SHARED.md5 är inte uppdaterad (två gemensamma filer är ändrade).

## DIFFEN
`git diff --no-index .arena/etta3/bas/src .arena/etta3/a4/src` (också i diff.txt)

```diff
diff --git a/.arena/etta3/bas/src/analyserClock.ts b/.arena/etta3/a4/src/analyserClock.ts
index 0832641..f3f64ca 100644
--- a/.arena/etta3/bas/src/analyserClock.ts
+++ b/.arena/etta3/a4/src/analyserClock.ts
@@ -27,6 +27,8 @@ const PH_B = 6, PH_W = 4, PH_LAG_A = 0.05, PH_LAG_MAX = 30;   // FASEN UR BANDEN
 const BREAK_HOLD_MS = 20000;   // TVÅ RUTNÄT
 const BREAK_RESTORE_MS = Number(process.env.DMX_BREAK_RESTORE_MS ?? String(BREAK_HOLD_MS));
 const BAR_DECAY = 0.99, BAR_MIN = 16, BAR_MARGIN = 0.06, BAR_W_BASS = 0.5, BAR_WIN0 = -0.2, BAR_WIN1 = 0.3, BAR_RISE_HOPS = 6, BAR_R_MAX = 2, BAR_W_BEAT = 0.25, BAR_Q = 8, BAR_BEAT_Q = 2;   // ETTAN I EFFEKTKLOCKANS RUTNÄT
+const BAR_W_NOV = 4;   // NYHETEN PÅ ETTAN (a4 etta3)
+export const NOV_B = 24; export const novTap = { seq: 0, n: 0, v: new Float32Array(NOV_B) };   // långsamma vägens spektrum i log-band, en per stor-FFT
 const TG_HOLD = 1.35;   // HELA TEMPOOMRÅDET
 const TG_SIB = [Math.round(Math.log2(4 / 3) * 139), Math.round(Math.log2(3 / 2) * 139)];   // 4:3 och 3:2 i rutnätets steg
 const TG_SNAP = 0.03, TG_EDGE = 1.03, TG_OCT_UP = 0.85, TG_OCT_DN = 0.4, TG_OCT_A = 0.1;
@@ -91,6 +93,7 @@ export class BeatFeed {
   private barM = 0; private barJ = 0; private barJr = 0; private barPT = 0; private barPI = NaN;   // ettan räknas i musikens slag (a1, per slag a6)
   private readonly barR = new Float64Array(4); private bE = 0; private bE1 = 0; private bE2 = 0; private bEm = 0;   // kickens återstart (a2)
   private readonly barX = new Float64Array(4); private readonly barV = new Float64Array(BAR_Q); private readonly barVc = new Float64Array(BAR_Q); private barTi = NaN; private barTe = 0;   // backbeaten (a8r)
+  private readonly barNv = new Float64Array(4); private readonly nCur = new Float64Array(NOV_B); private readonly nPrev = new Float64Array(NOV_B); private nCn = 0; private nOk = false; private nSeq = -1; private bNv = -1; private bNm = 0;   // nyheten (a4 etta3)
   private readonly linK = new Float64Array(BAR_RISE_HOPS); private readonly linL = new Float64Array(BAR_RISE_HOPS); private linPos = 0;
   private innerAnchor = 0; private innerBpm = 0; private innerValid = false;
   private readonly anaGrid = { anchorMs: 0, bpm: 0, confidence: 0 };   // EN KÄLLA
@@ -412,7 +415,7 @@ export class BeatFeed {
     return false;
   }
 
-  private barReset(): void { this.barK.fill(0); this.barL.fill(0); this.barR.fill(0); this.barX.fill(0); this.barTi = NaN; this.bE1 = 0; this.bE2 = 0; this.bEm = 0; this.barN = 0; this.barIdx = NaN; this.barM = this.barOff & 3; this.barJ = 0; this.barJr = 0; this.barPI = NaN; }
+  private barReset(): void { this.barNv.fill(0); this.nCur.fill(0); this.nCn = 0; this.nOk = false; this.bNv = -1; this.bNm = 0; this.barK.fill(0); this.barL.fill(0); this.barR.fill(0); this.barX.fill(0); this.barTi = NaN; this.bE1 = 0; this.bE2 = 0; this.bEm = 0; this.barN = 0; this.barIdx = NaN; this.barM = this.barOff & 3; this.barJ = 0; this.barJr = 0; this.barPI = NaN; }
 
   /** ETTAN (se BAR_DECAY). */
   private barStep(frame: Frame, beat: NonNullable<EngineConfig["beat"]>, now: number): void {
@@ -421,9 +424,11 @@ export class BeatFeed {
     if (!(beat.bpm > 40)) return;
     const per = 60000 / beat.bpm, pos = (now - beat.anchorMs) / per, idx = Math.floor(pos - BAR_WIN0);
     if (idx !== this.barIdx) {
+      this.barNov(idx === this.barIdx + 1);
       if (idx === this.barIdx + 1) this.barCommit(beat.anchorMs + this.barIdx * per, per);
       this.barIdx = idx; this.bK = 0; this.bL = 0; this.bE = 0;
     }
+    if (novTap.seq !== this.nSeq) { this.nSeq = novTap.seq; const v = novTap.v, C = this.nCur; for (let i = 0; i < novTap.n; i++) C[i] += v[i]; this.nCn++; }
     if (pos - idx <= BAR_WIN1) {
       if (rk > this.bK) this.bK = rk;
       if (k > this.bE) this.bE = k;
@@ -435,6 +440,14 @@ export class BeatFeed {
     { const d = ((((this.barM + this.barJr - this.barOff) % 4) + 4) % 4); if (d) this.barOff += d; }
   }
 
+  /** Nyheten: slagets log-spektrum mot förra slagets (medel av |skillnad|), -1 när något av dem saknas. */
+  private barNov(next: boolean): void {
+    const C = this.nCur, P = this.nPrev, n = novTap.n, c = this.nCn; let d = 0;
+    if (c > 0) for (let i = 0; i < n; i++) { const x = C[i] / c, e = x - P[i]; d += e < 0 ? -e : e; P[i] = x; }
+    this.bNv = next && this.nOk && c > 0 && n > 0 ? d / n : -1;
+    this.nOk = c > 0; C.fill(0); this.nCn = 0;
+  }
+
   /** Backbeaten: diskantens anslag i slagets första fjärdedel mot resten av slaget, bokfört på slagets plats (virvel/clap på 2 och 4). */
   private barBack(): void {
     const V = this.barV, C = this.barVc, e = this.barTe; let m = 0, a = 0, b = 0;
@@ -452,20 +465,21 @@ export class BeatFeed {
     if (this.barPI === this.barPI) { const j = this.barJ + (this.barIdx - this.barPI) - (tb - this.barPT) / per; this.barJ = j - 4 * Math.floor(j / 4); }
     this.barPT = tb; this.barPI = this.barIdx; const jr = this.barJr = Math.floor(this.barJ + 0.5);
     const K = this.barK, L = this.barL, R = this.barR, slot = (((this.barIdx - jr) % 4) + 4) % 4;
-    for (let i = 0; i < 4; i++) { K[i] *= BAR_DECAY; L[i] *= BAR_DECAY; R[i] *= BAR_DECAY; this.barX[i] *= BAR_DECAY; }
+    for (let i = 0; i < 4; i++) { K[i] *= BAR_DECAY; L[i] *= BAR_DECAY; R[i] *= BAR_DECAY; this.barX[i] *= BAR_DECAY; this.barNv[i] *= BAR_DECAY; }
     K[slot] += this.bK; L[slot] += this.bL;
+    if (this.bNv >= 0) { if (this.bNm > 0) this.barNv[slot] += Math.min(BAR_R_MAX, this.bNv / this.bNm); this.bNm += (this.bNv - this.bNm) / 16; }
     { const e = this.bE, pm = this.bE1 > this.bE2 ? this.bE1 : this.bE2;
       if (this.bEm > 0 && e > pm) R[slot] += Math.min(BAR_R_MAX, (e - pm) / this.bEm);
       this.bE2 = this.bE1; this.bE1 = e; this.bEm += (e - this.bEm) / 16; }
     if (this.barN < 1000) this.barN++;
     if (this.barN < BAR_MIN) return;
     const sK = K[0] + K[1] + K[2] + K[3], sL = L[0] + L[1] + L[2] + L[3], sR = R[0] + R[1] + R[2] + R[3], X = this.barX;
-    const sX = Math.abs(X[0]) + Math.abs(X[1]) + Math.abs(X[2]) + Math.abs(X[3]);
+    const sX = Math.abs(X[0]) + Math.abs(X[1]) + Math.abs(X[2]) + Math.abs(X[3]), Nv = this.barNv, sN = Nv[0] + Nv[1] + Nv[2] + Nv[3];
     if (!(sK > 0)) return;
     let bi = 0, best = -1e9, second = -1e9;
     for (let i = 0; i < 4; i++) {
       const v = K[i] / sK + (sR > 0 ? R[i] / sR : 0) + (sL > 0 ? BAR_W_BASS * L[i] / sL : 0)
-        + (sX > 0 ? BAR_W_BEAT * (X[(i + 1) & 3] + X[(i + 3) & 3] - X[i] - X[(i + 2) & 3]) / sX : 0);
+        + (sX > 0 ? BAR_W_BEAT * (X[(i + 1) & 3] + X[(i + 3) & 3] - X[i] - X[(i + 2) & 3]) / sX : 0) + (sN > 0 ? BAR_W_NOV * Nv[i] / sN : 0);
       if (v > best) { second = best; best = v; bi = i; } else if (v > second) second = v;
     }
     if (bi !== this.barM && best - second >= BAR_MARGIN) { this.barM = bi; this.barShifts++; }
diff --git a/.arena/etta3/bas/src/analyserSpectrum.ts b/.arena/etta3/a4/src/analyserSpectrum.ts
index c8cf16a..fe800f6 100644
--- a/.arena/etta3/bas/src/analyserSpectrum.ts
+++ b/.arena/etta3/a4/src/analyserSpectrum.ts
@@ -1,6 +1,7 @@
 /**  SPEKTRUM (utbruten ur analyser.ts 2026-11-14). Anteckningar (kommentarerna som stod i koden): docs/analysator/analyserSpectrum.md */
 import { Analyser, SECTION_AGG_HOP } from "./analyser.js";
 import { SPEC_SLOTS, SPEC_MAX } from './split.js';
+import { novTap, NOV_B } from "./analyserClock.js";
 import FFT from "fft.js";
 
 
@@ -39,6 +40,7 @@ export class SpectrumBands {
   private static readonly BASSON_AVG = 12; private static readonly BASSON_MAX = 4; private static readonly BASSON_WAIT = 4;
   private bassOnLastPk = -1e9;specRing: Float32Array | null = null;
 specCopy = new Float32Array(0);specN = 0;  aBandLvl = 0;
+  private readonly novLo = new Int32Array(NOV_B + 1); private novN = -1;   // NYHETEN: log-bandens kanter (tredjedelsoktav 40 Hz - 13 kHz)
   private onsetWarm = 0;   // Stor-FFT-rutor med signal i rad
   private static readonly ONSET_WARM = 183;
   /** 2048-bufferten som RING. */
@@ -112,6 +114,13 @@ specCopy = new Float32Array(0);specN = 0;  aBandLvl = 0;
       magBig[i] = Math.sqrt(re * re + im * im);
     }
 
+    { let n = this.novN; const E = this.novLo, v = novTap.v;
+      if (n < 0) { const hz = this.a.cfg.audio.rate / this.bufferBig.length; n = 0; E[0] = Math.round(40 / hz);
+        for (let j = 1; j < 26 && n < NOV_B; j++) { const b = Math.min(magMax, Math.round(40 * Math.pow(2, j / 3) / hz)); if (b > E[n]) E[++n] = b; }
+        this.novN = n; }
+      let s = 0; for (let k = 0; k < n; k++) { let a = 0; for (let i = E[k]; i < E[k + 1]; i++) a += magBig[i]; a /= E[k + 1] - E[k]; v[k] = a; s += a; }
+      const e = 1e-3 * s / (n > 0 ? n : 1) + 1e-7; for (let k = 0; k < n; k++) v[k] = Math.log(v[k] + e);
+      novTap.n = n; novTap.seq++; }
     if (this.a.bigOn) { const k = ++this.specN, R = this.specRing!, o = (k % SPEC_SLOTS) * SPEC_MAX; R.set(this.magBigView.subarray(0, this.specCopy.length), o); }
     else this.a.specSink?.(this.magBigView, this.a.cfg.audio.rate / this.bufferBig.length);
     const gated = this.a.activeMs > 0;
```
