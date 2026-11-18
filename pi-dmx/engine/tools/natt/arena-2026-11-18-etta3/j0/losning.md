# j0 JOKERN etta3: två oberoende vittnen för 1 mot 3

**IDÉN.** Basens fyrvägsval (K/R/L + backbeat) avgör fortfarande paret {1,3}/{2,4}. Inom paret avgör d = basens skillnad + nyheten (a4) + basens återkomst (a7): två vittnen som bygger på olika ljud (spektrumbyte mot energilucka) och på musikteori ("nytt varv och ny del börjar på ettan", "en återkomst landar på ettan"). Nyheten röstar bara 1 mot 3. Den kan alltså aldrig flytta ettan till 2 eller 4.

## DELAR
| del | från | mått den bär | med/struken + skäl |
|---|---|---|---|
| nyhetsröst (novTap + barNov) | a4 | ensam 171840 75->94; i j0 151659 trean 2 s kortare | MED, men bara i 1-mot-3-steget (a4 hade den i fyrvägsvalet, och där flyttade den 171840 146-154 s till förskjutning 1) |
| basens återkomst, sen placering, 1-mot-3-dom | a7 | ensam 171840 75->94 (52/54 återkomster på ettan offline) | MED oförändrad |
| grinden: står ettan på bi^2, avgör d ensam | ny (j0) | krävs för att nyheten ska verka när 1 och 3 är nästan lika i fyrvägsvalet | MED |
| BAR_W_NOV 4 mot 2 | a4 m2 | j0c (W 2): ren identisk 93,03, omval +0,04 | 4: okänslig på övningen; nyheten väljer 1 före 3 i 98-100 % (a4 offline), basens röster bara i 56-72 % (a1) |
| klangbyte + basluckan | a3 | samma ställe | STRUKEN: samma mekanismer som a4/a7, inga nya vittnen; omval 0,84 |
| taktminnet över gränsen (B) | a5 | 171840 99,5 | STRUKEN: lyfter bara 171840 (fras-mixning) och 151659 -10; skyddet mot icke-frasmixade byten kräver vridning av rösterna, och det är en ny osedd mekanism |
| tröghet (A) | a5 | ±0 till minus | STRUKEN |
| HMM i andra worker | a8 | 200719 92->85 | STRUKEN: samma vittne som a4, dyrare |
| tillit per röst | a6 | +0,85, en incident | STRUKEN |
| alla platser mätta | a1 | ±0 | STRUKEN (skydd utan mått) |
| internt rutnät | a2 | +0,12 | STRUKEN |

## KOSTNADEN
Worker (klockan och den långsamma analysatorn i samma tråd, `parts ['all']` i ladan): per stor-FFT ~550 additioner och 23 log, per hopp 23 additioner och 2 jämförelser, per slag ~50 flyttal. Huvudtråden: 0. Nytt minne under 2 kB, ingen allokering per hopp.

## SIFFRORNA (m4 = levererad kod; ren/trean %, etta alla, omval)
| fil | bas | j0 |
|---|---|---|
| 151659 | 92,8/6,0, 93,9, 0,12 | 93,5/5,3, 94,3, 0,12 |
| 171840 | 75,3/21,8, 74,8, 0,64 | 93,8/3,2, 88,6, 0,64 |
| 200719 | 91,8/4,9, 67,0, 1,47 | 91,8/4,9, 69,5, 1,29 |
| medel | 86,6/10,9, 78,6, 0,74 | 93,0/4,5, 84,1, 0,68 |
**Poäng +6,72**, FEL 10,3->10,2, oktav 5,6, paslag 91,9, lead lika, ingen spärr.
Mätningarna: m1 = a4+a7 rakt ihop (nyheten i fyrvägsvalet): +6,63, trean 3,8 (koden i `m1-a4a7/`). m2 = j0b = levererad: +6,72. m3 = j0c (W 2): +6,52. m4 = j0 (samma kod som j0b, bänken deterministisk: identiska siffror).
Sämre: trean 3,8 (m1) -> 4,5 (171840 143-148 s står kvar på trean tills vittnena räcker, sedan 149-153 förskjutning 1 från fyrvägsvalet, ettan vid 154 s). Kvar på trean i alla varianter: 151659 15-28 s (inspelningens början) och 200719 1002-1016 s (omlåsningar före BAR_MIN).

## RISKEN
- Hela vinsten ligger på ett ställe (171840 efter gränsen ~136 s), men båda vittnena räcker var för sig där. På kontrollmängden bär den som hörs: musik utan luckor ger bara nyheten, en jämn loop utan byten ger bara återkomsten.
- Nyheten tystnar om klockan och den långsamma vägen delas på två trådar (`lane`/`slow`, a8:s D3). Då blir det a7 ensam. I workern kan stor-FFT:n släpa några ms mot hoppen, men slagets fönster är -0,2..0,8 slag.
- Fraser som byter på trean (sång, fills, risers) eller en upptakt där basen landar på 3: d kan vända till trean. Marginalen 0,06 och minnet (0,99/slag) gör det trögt.
- Udda takter och halvtid: paret är basens.
- Lotus: två delade filer har ändrats, och ANALYSER_SHARED.md5 måste räknas om.

## DIFFEN
`git diff --no-index .arena/etta3/bas/src .arena/etta3/j0/src`, hela i `diff.txt` (133 rader, analyserClock.ts + analyserSpectrum.ts).
```diff
diff --git a/.arena/etta3/bas/src/analyserClock.ts b/.arena/etta3/j0/src/analyserClock.ts
index 0832641..62d103b 100644
--- a/.arena/etta3/bas/src/analyserClock.ts
+++ b/.arena/etta3/j0/src/analyserClock.ts
@@ -27,6 +27,9 @@ const PH_B = 6, PH_W = 4, PH_LAG_A = 0.05, PH_LAG_MAX = 30;   // FASEN UR BANDEN
 const BREAK_HOLD_MS = 20000;   // TVÅ RUTNÄT
 const BREAK_RESTORE_MS = Number(process.env.DMX_BREAK_RESTORE_MS ?? String(BREAK_HOLD_MS));
 const BAR_DECAY = 0.99, BAR_MIN = 16, BAR_MARGIN = 0.06, BAR_W_BASS = 0.5, BAR_WIN0 = -0.2, BAR_WIN1 = 0.3, BAR_RISE_HOPS = 6, BAR_R_MAX = 2, BAR_W_BEAT = 0.25, BAR_Q = 8, BAR_BEAT_Q = 2;   // ETTAN I EFFEKTKLOCKANS RUTNÄT
+const BAR_W_NOV = 4;   // NYHETEN PÅ ETTAN (a4 etta3)
+const EV_GAP_LO = 0.35, EV_GAP_N = 2, EV_RET_HI = 0.6, EV_LV_A = 1 / 32, EV_LV_DN = 0.995, EV_W = 1, EV_DECAY = 0.997, EV_MAX = 3, EV_LATE = 4;   // HÄNDELSEN SOM ANKARE (etta3 a7)
+export const NOV_B = 24; export const novTap = { seq: 0, n: 0, v: new Float32Array(NOV_B) };   // långsamma vägens spektrum i log-band, en per stor-FFT
 const TG_HOLD = 1.35;   // HELA TEMPOOMRÅDET
 const TG_SIB = [Math.round(Math.log2(4 / 3) * 139), Math.round(Math.log2(3 / 2) * 139)];   // 4:3 och 3:2 i rutnätets steg
 const TG_SNAP = 0.03, TG_EDGE = 1.03, TG_OCT_UP = 0.85, TG_OCT_DN = 0.4, TG_OCT_A = 0.1;
@@ -91,6 +94,8 @@ export class BeatFeed {
   private barM = 0; private barJ = 0; private barJr = 0; private barPT = 0; private barPI = NaN;   // ettan räknas i musikens slag (a1, per slag a6)
   private readonly barR = new Float64Array(4); private bE = 0; private bE1 = 0; private bE2 = 0; private bEm = 0;   // kickens återstart (a2)
   private readonly barX = new Float64Array(4); private readonly barV = new Float64Array(BAR_Q); private readonly barVc = new Float64Array(BAR_Q); private barTi = NaN; private barTe = 0;   // backbeaten (a8r)
+  private readonly barNv = new Float64Array(4); private readonly nCur = new Float64Array(NOV_B); private readonly nPrev = new Float64Array(NOV_B); private nCn = 0; private nOk = false; private nSeq = -1; private bNv = -1; private bNm = 0;   // nyheten (a4 etta3)
+  private readonly barT = new Float64Array(4); private readonly barVs = new Float64Array(4); private bA = 0; private bLv = 0; private barGap = 0; private evT = 0; private evN = 0;   // händelsen som ankare (a7 etta3)
   private readonly linK = new Float64Array(BAR_RISE_HOPS); private readonly linL = new Float64Array(BAR_RISE_HOPS); private linPos = 0;
   private innerAnchor = 0; private innerBpm = 0; private innerValid = false;
   private readonly anaGrid = { anchorMs: 0, bpm: 0, confidence: 0 };   // EN KÄLLA
@@ -412,7 +417,7 @@ export class BeatFeed {
     return false;
   }
 
-  private barReset(): void { this.barK.fill(0); this.barL.fill(0); this.barR.fill(0); this.barX.fill(0); this.barTi = NaN; this.bE1 = 0; this.bE2 = 0; this.bEm = 0; this.barN = 0; this.barIdx = NaN; this.barM = this.barOff & 3; this.barJ = 0; this.barJr = 0; this.barPI = NaN; }
+  private barReset(): void { this.barT.fill(0); this.barGap = 0; this.evT = 0; this.barNv.fill(0); this.nCur.fill(0); this.nCn = 0; this.nOk = false; this.bNv = -1; this.bNm = 0; this.barK.fill(0); this.barL.fill(0); this.barR.fill(0); this.barX.fill(0); this.barTi = NaN; this.bE1 = 0; this.bE2 = 0; this.bEm = 0; this.barN = 0; this.barIdx = NaN; this.barM = this.barOff & 3; this.barJ = 0; this.barJr = 0; this.barPI = NaN; }
 
   /** ETTAN (se BAR_DECAY). */
   private barStep(frame: Frame, beat: NonNullable<EngineConfig["beat"]>, now: number): void {
@@ -421,9 +426,13 @@ export class BeatFeed {
     if (!(beat.bpm > 40)) return;
     const per = 60000 / beat.bpm, pos = (now - beat.anchorMs) / per, idx = Math.floor(pos - BAR_WIN0);
     if (idx !== this.barIdx) {
+      this.barNov(idx === this.barIdx + 1);
       if (idx === this.barIdx + 1) this.barCommit(beat.anchorMs + this.barIdx * per, per);
-      this.barIdx = idx; this.bK = 0; this.bL = 0; this.bE = 0;
+      this.barIdx = idx; this.bK = 0; this.bL = 0; this.bE = 0; this.bA = 0;
     }
+    if (k > this.bA) this.bA = k;
+    if (this.barGap >= EV_GAP_N && k >= EV_RET_HI * this.bLv) { this.evT = now; this.evN = 0; this.barGap = 0; }
+    if (novTap.seq !== this.nSeq) { this.nSeq = novTap.seq; const v = novTap.v, C = this.nCur; for (let i = 0; i < novTap.n; i++) C[i] += v[i]; this.nCn++; }
     if (pos - idx <= BAR_WIN1) {
       if (rk > this.bK) this.bK = rk;
       if (k > this.bE) this.bE = k;
@@ -435,6 +444,14 @@ export class BeatFeed {
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
@@ -452,23 +469,31 @@ export class BeatFeed {
     if (this.barPI === this.barPI) { const j = this.barJ + (this.barIdx - this.barPI) - (tb - this.barPT) / per; this.barJ = j - 4 * Math.floor(j / 4); }
     this.barPT = tb; this.barPI = this.barIdx; const jr = this.barJr = Math.floor(this.barJ + 0.5);
     const K = this.barK, L = this.barL, R = this.barR, slot = (((this.barIdx - jr) % 4) + 4) % 4;
-    for (let i = 0; i < 4; i++) { K[i] *= BAR_DECAY; L[i] *= BAR_DECAY; R[i] *= BAR_DECAY; this.barX[i] *= BAR_DECAY; }
+    for (let i = 0; i < 4; i++) { K[i] *= BAR_DECAY; L[i] *= BAR_DECAY; R[i] *= BAR_DECAY; this.barX[i] *= BAR_DECAY; this.barNv[i] *= BAR_DECAY; this.barT[i] *= EV_DECAY; }
     K[slot] += this.bK; L[slot] += this.bL;
+    { const a = this.bA, lv = this.bLv;
+      if (lv > 0 && a < EV_GAP_LO * lv) { if (this.barGap < 1000) this.barGap++; this.bLv = lv * EV_LV_DN; }
+      else { if (a >= EV_RET_HI * lv) this.barGap = 0; this.bLv = lv > 0 ? lv + (a - lv) * EV_LV_A : a; }
+      if (this.evT > 0 && ++this.evN >= EV_LATE) {
+        const s = ((((Math.round((this.evT - tb) / per) + this.barIdx - jr) % 4) + 4) % 4), t = this.barT[s] + 1; this.barT[s] = t > EV_MAX ? EV_MAX : t; this.evT = 0; } }
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
-    let bi = 0, best = -1e9, second = -1e9;
+    let bi = 0, best = -1e9, second = -1e9; const VS = this.barVs, T = this.barT;
     for (let i = 0; i < 4; i++) {
-      const v = K[i] / sK + (sR > 0 ? R[i] / sR : 0) + (sL > 0 ? BAR_W_BASS * L[i] / sL : 0)
+      const v = VS[i] = K[i] / sK + (sR > 0 ? R[i] / sR : 0) + (sL > 0 ? BAR_W_BASS * L[i] / sL : 0)
         + (sX > 0 ? BAR_W_BEAT * (X[(i + 1) & 3] + X[(i + 3) & 3] - X[i] - X[(i + 2) & 3]) / sX : 0);
       if (v > best) { second = best; best = v; bi = i; } else if (v > second) second = v;
     }
-    if (bi !== this.barM && best - second >= BAR_MARGIN) { this.barM = bi; this.barShifts++; }
+    const o = bi ^ 2, d = VS[bi] - VS[o] + EV_W * (T[bi] - T[o]) + (sN > 0 ? BAR_W_NOV * (Nv[bi] - Nv[o]) / sN : 0);
+    if (d >= 0) { if (bi !== this.barM && (this.barM === o ? d >= BAR_MARGIN : best - second >= BAR_MARGIN)) { this.barM = bi; this.barShifts++; } }
+    else if (o !== this.barM && -d >= BAR_MARGIN && (((o ^ this.barM) & 1) === 0 || best - Math.max(VS[(bi + 1) & 3], VS[(bi + 3) & 3]) >= BAR_MARGIN)) { this.barM = o; this.barShifts++; }
   }
 
   /** LÅTGRÄNSEN. */
diff --git a/.arena/etta3/bas/src/analyserSpectrum.ts b/.arena/etta3/j0/src/analyserSpectrum.ts
index c8cf16a..fe800f6 100644
--- a/.arena/etta3/bas/src/analyserSpectrum.ts
+++ b/.arena/etta3/j0/src/analyserSpectrum.ts
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
   private onsetWarm = 0;   // Stor-FFT-rutor med signal i rad
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
