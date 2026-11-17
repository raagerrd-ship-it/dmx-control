# a3 CYMBALEN, etta2: negativt resultat (poäng -3,13, OK)

## IDÉN
Ett cymbalvittne letar efter slag med bredbandigt diskantanslag (treble+air), där diskanten fortfarande är över 1,5 x föregående slags slutnivå i slutet av slaget OCH i nästa slag. Det ska alltså vara lång avklingning, inte hihattens korta. Samtidigt ska kickens/basens topp vara över 1,22 x de två föregående slagens. Tanken var att crash plus kick betyder frasstart, alltså musikens etta. Vittnet avgör bara 1 mot 3 (CY[i] - CY[i+2]), eftersom backbeaten redan skiljer {1,3} från {2,4}.

## DELARNA
| del | vad den gör | mått (m2 mot bas) |
|---|---|---|
| D1 detektorn | profilen barA (air per åttondel, bredvid barV) ger anslag, svans och slutnivå per slag. Beslutet tas ett slag i efterhand (bara hört ljud) | ingen egen siffra |
| D2 kickgrinden | cyK = bE / max(bE1, bE2) från barCommit, måste vara > 1,22 | m1 utan D3: etta -2,6, omval +0,19 |
| D3 bara 1 mot 3 | rösten W 0,5 x (C[i] - C[i+2]) / max(2, summa C) | m2: etta -2,4, omval +0,15. 200719 +1,3, 171840 -7,9 |

Ingen del bör tas av jokern. D3 (bara inom paret) var bättre än en fri röst (m1), men båda förlorar mot bas.

## SIFFRORNA (ettdom, övningen)
| | etta | omval | paslag | 151659 | 171840 | 200719 |
|---|---|---|---|---|---|---|
| bas | 76,7 | 0,93 | 78,2 | 98/1/0/1 | 63/13/17/6 | 69/10/16/6 |
| m1 (fri röst) | 74,1 | 1,12 | 78,2 | 98 | 56/14/24/6 | 68 |
| m2 (1 mot 3) | 74,3 | 1,08 | 78,2 | 97/0/0/2 | 56/14/25/6 | 70/9/14/6 |

Sämre: 171840. Där förskjutning 2 steg från 17 till 25 %, och omvalen steg från 1,33 till 1,77 per minut. Paslag är oförändrat.

## VAD JAG LÄRDE MIG (för runda 2 och jokern)
- Egen analys av övningens wav med Beat This-slagen (scratchpad, ingen motorkod) visar att diskantnyhet med lång svans INTE hamnar på ettan i 151659 och 171840. Där faller den på slag 3 eller 2, troligen claps/virvel med eko och öppna hihattar. Bara 200719 har tydliga crash-ettor (pos0/pos2 = 19/5 med kickgrind).
- En sond med loggning på 171840 i motorn gav 7 vittnen: 3 på ettan, 3 på fyran och 1 på trean. Fyran fyrar slaget före en crash (fill/uppbyggnad in i ettan), och alltså fel slag. En sällsynt och tung röst blir då en omvalsmotor: med bara 1-2 händelser är andelen 1,0, och den vände ettan vid 12, 49, 88 och 102 s.
- Kravet att nästa slags anslag ska vara svagare (lokalt max) tog bort de riktiga ettorna offline. Det förkastades.
- Slutsats: i ladans mic-inspelningar är cymbalen ett för svagt och för sällsynt vittne, så det ska inte väga tungt. Behövs det alls, då som en lätt tie-breaker (W ca 0,1, N ca 6), men jag har inte mätt det.

## RISKEN
Live-mic: diskanten dämpas olika beroende på rum och avstånd, så tröskeln 1,5x är skör. Uppbyggnader och virvelrullar ger falska vittnen på fyran. I breaks utan trumma stänger kickgrinden, så vittnet tiger (ofarligt). Vid låtbyte nollställs det med barReset. Ingen ny allokering per hop och ingen FFT: två Float64Array(4), en Float64Array(8) och åtta tal.

## DIFFEN
`git diff --no-index src .arena/etta2/a3/src` (hela) ligger i `.arena/etta2/a3/a3.diff`. Bara analyserClock.ts är ändrad: +BAR_CYM-konstanter, barA/barC/cyK/cyKI, ett block i barBack, cyK i barCommit, och termen `+ BAR_W_CYM * (CY[i] - CY[(i + 2) & 3]) / sC` i röstningen.

```diff
diff --git a/src/analyserClock.ts b/.arena/etta2/a3/src/analyserClock.ts
index 0bbcb78..1cc7623 100644
--- a/src/analyserClock.ts
+++ b/.arena/etta2/a3/src/analyserClock.ts
@@ -26,6 +26,7 @@ const FEED_RISE_HOPS = 6;   // BASENS STIGNING
 const BREAK_HOLD_MS = 20000;   // TVÅ RUTNÄT
 const BREAK_RESTORE_MS = Number(process.env.DMX_BREAK_RESTORE_MS ?? String(BREAK_HOLD_MS));
 const BAR_DECAY = 0.99, BAR_MIN = 16, BAR_MARGIN = 0.06, BAR_W_BASS = 0.5, BAR_WIN0 = -0.2, BAR_WIN1 = 0.3, BAR_RISE_HOPS = 6, BAR_R_MAX = 2, BAR_W_BEAT = 0.25, BAR_Q = 8, BAR_BEAT_Q = 2;   // ETTAN I EFFEKTKLOCKANS RUTNÄT
+const BAR_CYM = 1.5, BAR_CYM_K = 1.22, BAR_W_CYM = 0.5, BAR_CYM_N = 2;   // CYMBALEN (a3 etta2)
 const TG_HOLD = 1.35;   // HELA TEMPOOMRÅDET
 const TG_SIB = [Math.round(Math.log2(4 / 3) * 139), Math.round(Math.log2(3 / 2) * 139)];   // 4:3 och 3:2 i rutnätets steg
 const TG_SNAP = 0.03, TG_EDGE = 1.03, TG_OCT_UP = 0.85, TG_OCT_DN = 0.4, TG_OCT_A = 0.1;
@@ -88,6 +89,8 @@ export class BeatFeed {
   private barM = 0; private barJ = 0; private barJr = 0; private barPT = 0; private barPI = NaN;   // ettan räknas i musikens slag (a1, per slag a6)
   private readonly barR = new Float64Array(4); private bE = 0; private bE1 = 0; private bE2 = 0; private bEm = 0;   // kickens återstart (a2)
   private readonly barX = new Float64Array(4); private readonly barV = new Float64Array(BAR_Q); private readonly barVc = new Float64Array(BAR_Q); private barTi = NaN; private barTe = 0;   // backbeaten (a8r)
+  private readonly barA = new Float64Array(BAR_Q); private readonly barC = new Float64Array(4); private readonly cyK = new Float64Array(4); private readonly cyKI = new Float64Array(4).fill(NaN);
+  private cyE = 0; private cyT = 0; private cyP = 0; private cyI = NaN; private cyPP = 0; private cyPI = NaN;   // cymbalen (a3)
   private readonly linK = new Float64Array(BAR_RISE_HOPS); private readonly linL = new Float64Array(BAR_RISE_HOPS); private linPos = 0;
   private innerAnchor = 0; private innerBpm = 0; private innerValid = false;
   private readonly anaGrid = { anchorMs: 0, bpm: 0, confidence: 0 };   // EN KÄLLA
@@ -389,7 +392,7 @@ export class BeatFeed {
     return false;
   }
 
-  private barReset(): void { this.barK.fill(0); this.barL.fill(0); this.barR.fill(0); this.barX.fill(0); this.barTi = NaN; this.bE1 = 0; this.bE2 = 0; this.bEm = 0; this.barN = 0; this.barIdx = NaN; this.barM = this.barOff & 3; this.barJ = 0; this.barJr = 0; this.barPI = NaN; }
+  private barReset(): void { this.barK.fill(0); this.barL.fill(0); this.barR.fill(0); this.barX.fill(0); this.barC.fill(0); this.cyKI.fill(NaN); this.cyI = NaN; this.cyPI = NaN; this.barTi = NaN; this.bE1 = 0; this.bE2 = 0; this.bEm = 0; this.barN = 0; this.barIdx = NaN; this.barM = this.barOff & 3; this.barJ = 0; this.barJr = 0; this.barPI = NaN; }
 
   /** ETTAN (se BAR_DECAY). */
   private barStep(frame: Frame, beat: NonNullable<EngineConfig["beat"]>, now: number): void {
@@ -407,8 +410,8 @@ export class BeatFeed {
       if (rl > this.bL) this.bL = rl;
     }
     { const ti = Math.floor(pos);
-      if (ti !== this.barTi) { if (ti === this.barTi + 1) this.barBack(); this.barTi = ti; this.barV.fill(0); this.barVc.fill(0); }
-      const q = Math.min(BAR_Q - 1, Math.floor((pos - ti) * BAR_Q)); this.barV[q] += sa?.treble ?? 0; this.barVc[q]++; }
+      if (ti !== this.barTi) { if (ti === this.barTi + 1) this.barBack(); this.barTi = ti; this.barV.fill(0); this.barA.fill(0); this.barVc.fill(0); }
+      const q = Math.min(BAR_Q - 1, Math.floor((pos - ti) * BAR_Q)); this.barV[q] += sa?.treble ?? 0; this.barA[q] += sa?.air ?? 0; this.barVc[q]++; }
     { const d = ((((this.barM + this.barJr - this.barOff) % 4) + 4) % 4); if (d) this.barOff += d; }
   }
 
@@ -417,6 +420,14 @@ export class BeatFeed {
     const V = this.barV, C = this.barVc, e = this.barTe; let m = 0, a = 0, b = 0;
     for (let q = 0; q < BAR_Q; q++) { if (!(C[q] > 0)) return; m += V[q] / C[q]; }
     m /= BAR_Q;
+    { const A = this.barA, c = this.barTi; let e0 = 0, t = 0, p = 0;
+      for (let q = 0; q < BAR_Q; q++) { const h = (V[q] + A[q]) / C[q]; if (q < BAR_BEAT_Q && h > e0) e0 = h; if (q >= BAR_Q - 3) t += h; if (q >= BAR_Q - 2) p += h; }
+      t /= 3; p /= 2;
+      if (this.cyI === c - 1 && this.cyPI === c - 2 && this.cyPP > 0) {
+        const lim = BAR_CYM * this.cyPP, j = (c - 1) & 3;
+        if (this.cyE > lim && this.cyT > lim && t > lim && this.cyKI[j] === c - 1 && this.cyK[j] > BAR_CYM_K) this.barC[(((c - 1 - this.barJr) % 4) + 4) % 4] += 1;
+      }
+      this.cyPP = this.cyP; this.cyPI = this.cyI; this.cyE = e0; this.cyT = t; this.cyP = p; this.cyI = c; }
     if (e > 0) {
       for (let q = 0; q < BAR_Q; q++) { const v = V[q] / C[q], z = Math.log((v > 0.3 * e ? v : 0.3 * e) / e); if (q < BAR_BEAT_Q) a += z; else b += z; }
       this.barX[(((this.barTi - this.barJr) % 4) + 4) % 4] += a / BAR_BEAT_Q - b / (BAR_Q - BAR_BEAT_Q);
@@ -429,20 +440,21 @@ export class BeatFeed {
     if (this.barPI === this.barPI) { const j = this.barJ + (this.barIdx - this.barPI) - (tb - this.barPT) / per; this.barJ = j - 4 * Math.floor(j / 4); }
     this.barPT = tb; this.barPI = this.barIdx; const jr = this.barJr = Math.floor(this.barJ + 0.5);
     const K = this.barK, L = this.barL, R = this.barR, slot = (((this.barIdx - jr) % 4) + 4) % 4;
-    for (let i = 0; i < 4; i++) { K[i] *= BAR_DECAY; L[i] *= BAR_DECAY; R[i] *= BAR_DECAY; this.barX[i] *= BAR_DECAY; }
+    for (let i = 0; i < 4; i++) { K[i] *= BAR_DECAY; L[i] *= BAR_DECAY; R[i] *= BAR_DECAY; this.barX[i] *= BAR_DECAY; this.barC[i] *= BAR_DECAY; }
     K[slot] += this.bK; L[slot] += this.bL;
     { const e = this.bE, pm = this.bE1 > this.bE2 ? this.bE1 : this.bE2;
+      this.cyK[this.barIdx & 3] = pm > 0 ? e / pm : 0; this.cyKI[this.barIdx & 3] = this.barIdx;
       if (this.bEm > 0 && e > pm) R[slot] += Math.min(BAR_R_MAX, (e - pm) / this.bEm);
       this.bE2 = this.bE1; this.bE1 = e; this.bEm += (e - this.bEm) / 16; }
     if (this.barN < 1000) this.barN++;
     if (this.barN < BAR_MIN) return;
     const sK = K[0] + K[1] + K[2] + K[3], sL = L[0] + L[1] + L[2] + L[3], sR = R[0] + R[1] + R[2] + R[3], X = this.barX;
-    const sX = Math.abs(X[0]) + Math.abs(X[1]) + Math.abs(X[2]) + Math.abs(X[3]);
+    const sX = Math.abs(X[0]) + Math.abs(X[1]) + Math.abs(X[2]) + Math.abs(X[3]), CY = this.barC, sC = Math.max(BAR_CYM_N, CY[0] + CY[1] + CY[2] + CY[3]);
     if (!(sK > 0)) return;
     let bi = 0, best = -1e9, second = -1e9;
     for (let i = 0; i < 4; i++) {
       const v = K[i] / sK + (sR > 0 ? R[i] / sR : 0) + (sL > 0 ? BAR_W_BASS * L[i] / sL : 0)
-        + (sX > 0 ? BAR_W_BEAT * (X[(i + 1) & 3] + X[(i + 3) & 3] - X[i] - X[(i + 2) & 3]) / sX : 0);
+        + (sX > 0 ? BAR_W_BEAT * (X[(i + 1) & 3] + X[(i + 3) & 3] - X[i] - X[(i + 2) & 3]) / sX : 0) + BAR_W_CYM * (CY[i] - CY[(i + 2) & 3]) / sC;
       if (v > best) { second = best; best = v; bi = i; } else if (v > second) second = v;
     }
     if (bi !== this.barM && best - second >= BAR_MARGIN) { this.barM = bi; this.barShifts++; }
```
