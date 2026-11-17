# a2 VARAKTIGHETEN (etta2)

## Idén
Ettan väljs nu också efter hur mycket bas (sub+kick+bass) slaget BÄR genom hela slaget (medelnivån över slaget i log, mot de
senaste slagens nivå), inte bara efter anslagets stigning: på ettan ligger basen och ackordet kvar, trean är kortare/lättare.
Kortets rena form (håll = sen nivå / anslag) är FALSK på materialet: 1 mot 3 skiljs till 45-55 % (slump), trean håller t.o.m. relativt
längre i 200719. Det som bär är den absoluta ihållande energin: ettan över trean i samma takt 63-70 % av takterna i alla tre filer.

## Delarna
| del | vad den gör | mått (m1) |
|---|---|---|
| barH-rösten | per slag z = log(medel(sub+kick+bass) över slaget), bokförs som z - EMA(z, 0,3) på slagets plats (samma plats/minne/decay som backbeaten) | 171840 etta 63,4 -> 74,2, förskjutning 2 17 -> 7 % |
| vikten BAR_W_HOLD 0,4 | (H[i] - medel H) / sum|H| i plats-poängen | omval 0,93 -> 0,75 /min |
| BAR_HOLD_A 0,3 | snabb referens (~3 slag): tar bort nivådrift (uppbyggnader), kvar blir slagets nivå mot grannarna | utan (0,05): poäng ~+3,3 i simulering |

Inget nytt FFT, ingen allokering per hop (4 tal + en Float64Array(4) i konstruktorn). Tempo/fas orörda (paslag 78,1 mot 78,2).

## Hur det valdes (fritt, utan extra mätningar)
Tre sonder: `dump.mjs` (kör konsertReplay oförändrad med bas-dist, lyssnar på barStep/barCommit) skrev per slag basens nivå i 8
delar + röstvektorerna. `sim.py` återskapar basens barM/barOff exakt (0 avvikelser, samma etta per fil) och prövade 12 särdrag x
vikt x referens. Platå: W 0,3-0,5, A 0,15-0,3 ger +3,2 ... +4,3. Över W 0,7 rasar 171840. m1 träffade simuleringen (74,2 / 67,6).
Andra mätningen användes inte (ingen spärr att laga, och ytterligare finjustering vore anpassning).

## Siffrorna (m1, ettdom)
| fil | etta bas -> a2 | förskj 0/1/2/3 | omval | paslag |
|---|---|---|---|---|
| 151659 | 97,8 -> 97,6 | 98/1/0/1 | 0 -> 0 | 79,4 |
| 171840 | 63,4 -> 74,2 | 74/11/7/8 | 1,33 -> 0,89 | 74,2 |
| 200719 | 68,9 -> 67,6 | 68/11/15/6 | 1,47 -> 1,35 | 80,7 |
| medel | 76,7 -> 79,8 | | 0,93 -> 0,75 | 78,1 |

POÄNG +4,07. Sämre: 200719 -1,3 (dess fel sitter i låtstarter efter relock och i ett par låtar där fel etta låst; rösten flyttar dem
inte) och 151659 -0,1. Vinsten bärs nästan helt av EN fil (171840) - var misstänksam: särdragets 1-mot-3-skillnad är dock lika stark i
200719 (66 %) som i 171840 (63 %), så det är inte en anpassning till en låt, men effekten på okänd musik kan bli liten.

## Risken
- Live-mic: nivån är log och relativ till de senaste slagen, så gain spelar ingen roll; rumsbrus/basresonans som håller jämnt tar ut sig.
- Låtbyten: barH nollas i barReset; EMA-referensen lever vidare men är snabb (3 slag).
- Breaks/uppbyggnader: en stigande nivå ger en svag röst mot det SENARE slaget (fyra i takten) - A 0,3 dämpar men tar inte bort det.
- Musik utan trumma / pumpande sidechain: sidechain sänker nivån precis efter varje kick lika på alla slag (neutralt); en basgång som
  slår an på 3 och håller därifrån drar mot trean.

## Diffen
```diff
diff --git a/src/analyserClock.ts b/.arena/etta2/a2/src/analyserClock.ts
index 0bbcb78..dbca189 100644
--- a/src/analyserClock.ts
+++ b/.arena/etta2/a2/src/analyserClock.ts
@@ -25,7 +25,7 @@ const ONSET_WIN_MS = 5000, ONSET_EVERY_MS = 250, ONSET_BINS = 48, ONSET_RING = 1
 const FEED_RISE_HOPS = 6;   // BASENS STIGNING
 const BREAK_HOLD_MS = 20000;   // TVÅ RUTNÄT
 const BREAK_RESTORE_MS = Number(process.env.DMX_BREAK_RESTORE_MS ?? String(BREAK_HOLD_MS));
-const BAR_DECAY = 0.99, BAR_MIN = 16, BAR_MARGIN = 0.06, BAR_W_BASS = 0.5, BAR_WIN0 = -0.2, BAR_WIN1 = 0.3, BAR_RISE_HOPS = 6, BAR_R_MAX = 2, BAR_W_BEAT = 0.25, BAR_Q = 8, BAR_BEAT_Q = 2;   // ETTAN I EFFEKTKLOCKANS RUTNÄT
+const BAR_DECAY = 0.99, BAR_MIN = 16, BAR_MARGIN = 0.06, BAR_W_BASS = 0.5, BAR_WIN0 = -0.2, BAR_WIN1 = 0.3, BAR_RISE_HOPS = 6, BAR_R_MAX = 2, BAR_W_BEAT = 0.25, BAR_Q = 8, BAR_BEAT_Q = 2, BAR_W_HOLD = 0.4, BAR_HOLD_A = 0.3;   // ETTAN I EFFEKTKLOCKANS RUTNÄT
 const TG_HOLD = 1.35;   // HELA TEMPOOMRÅDET
 const TG_SIB = [Math.round(Math.log2(4 / 3) * 139), Math.round(Math.log2(3 / 2) * 139)];   // 4:3 och 3:2 i rutnätets steg
 const TG_SNAP = 0.03, TG_EDGE = 1.03, TG_OCT_UP = 0.85, TG_OCT_DN = 0.4, TG_OCT_A = 0.1;
@@ -88,6 +88,7 @@ export class BeatFeed {
   private barM = 0; private barJ = 0; private barJr = 0; private barPT = 0; private barPI = NaN;   // ettan räknas i musikens slag (a1, per slag a6)
   private readonly barR = new Float64Array(4); private bE = 0; private bE1 = 0; private bE2 = 0; private bEm = 0;   // kickens återstart (a2)
   private readonly barX = new Float64Array(4); private readonly barV = new Float64Array(BAR_Q); private readonly barVc = new Float64Array(BAR_Q); private barTi = NaN; private barTe = 0;   // backbeaten (a8r)
+  private readonly barH = new Float64Array(4); private bH = 0; private bHc = 0; private bHm = NaN;   // varaktigheten (etta2 a2)
   private readonly linK = new Float64Array(BAR_RISE_HOPS); private readonly linL = new Float64Array(BAR_RISE_HOPS); private linPos = 0;
   private innerAnchor = 0; private innerBpm = 0; private innerValid = false;
   private readonly anaGrid = { anchorMs: 0, bpm: 0, confidence: 0 };   // EN KÄLLA
@@ -389,7 +390,7 @@ export class BeatFeed {
     return false;
   }
 
-  private barReset(): void { this.barK.fill(0); this.barL.fill(0); this.barR.fill(0); this.barX.fill(0); this.barTi = NaN; this.bE1 = 0; this.bE2 = 0; this.bEm = 0; this.barN = 0; this.barIdx = NaN; this.barM = this.barOff & 3; this.barJ = 0; this.barJr = 0; this.barPI = NaN; }
+  private barReset(): void { this.barK.fill(0); this.barL.fill(0); this.barR.fill(0); this.barX.fill(0); this.barH.fill(0); this.barTi = NaN; this.bE1 = 0; this.bE2 = 0; this.bEm = 0; this.barN = 0; this.barIdx = NaN; this.barM = this.barOff & 3; this.barJ = 0; this.barJr = 0; this.barPI = NaN; }
 
   /** ETTAN (se BAR_DECAY). */
   private barStep(frame: Frame, beat: NonNullable<EngineConfig["beat"]>, now: number): void {
@@ -407,7 +408,8 @@ export class BeatFeed {
       if (rl > this.bL) this.bL = rl;
     }
     { const ti = Math.floor(pos);
-      if (ti !== this.barTi) { if (ti === this.barTi + 1) this.barBack(); this.barTi = ti; this.barV.fill(0); this.barVc.fill(0); }
+      if (ti !== this.barTi) { if (ti === this.barTi + 1) this.barBack(); this.barTi = ti; this.barV.fill(0); this.barVc.fill(0); this.bH = 0; this.bHc = 0; }
+      this.bH += k + l; this.bHc++;
       const q = Math.min(BAR_Q - 1, Math.floor((pos - ti) * BAR_Q)); this.barV[q] += sa?.treble ?? 0; this.barVc[q]++; }
     { const d = ((((this.barM + this.barJr - this.barOff) % 4) + 4) % 4); if (d) this.barOff += d; }
   }
@@ -417,6 +419,8 @@ export class BeatFeed {
     const V = this.barV, C = this.barVc, e = this.barTe; let m = 0, a = 0, b = 0;
     for (let q = 0; q < BAR_Q; q++) { if (!(C[q] > 0)) return; m += V[q] / C[q]; }
     m /= BAR_Q;
+    { const z = Math.log(this.bH / this.bHc + 1e-6), hm = this.bHm;
+      if (hm === hm) { this.barH[(((this.barTi - this.barJr) % 4) + 4) % 4] += z - hm; this.bHm = hm + BAR_HOLD_A * (z - hm); } else this.bHm = z; }
     if (e > 0) {
       for (let q = 0; q < BAR_Q; q++) { const v = V[q] / C[q], z = Math.log((v > 0.3 * e ? v : 0.3 * e) / e); if (q < BAR_BEAT_Q) a += z; else b += z; }
       this.barX[(((this.barTi - this.barJr) % 4) + 4) % 4] += a / BAR_BEAT_Q - b / (BAR_Q - BAR_BEAT_Q);
@@ -429,7 +433,7 @@ export class BeatFeed {
     if (this.barPI === this.barPI) { const j = this.barJ + (this.barIdx - this.barPI) - (tb - this.barPT) / per; this.barJ = j - 4 * Math.floor(j / 4); }
     this.barPT = tb; this.barPI = this.barIdx; const jr = this.barJr = Math.floor(this.barJ + 0.5);
     const K = this.barK, L = this.barL, R = this.barR, slot = (((this.barIdx - jr) % 4) + 4) % 4;
-    for (let i = 0; i < 4; i++) { K[i] *= BAR_DECAY; L[i] *= BAR_DECAY; R[i] *= BAR_DECAY; this.barX[i] *= BAR_DECAY; }
+    for (let i = 0; i < 4; i++) { K[i] *= BAR_DECAY; L[i] *= BAR_DECAY; R[i] *= BAR_DECAY; this.barX[i] *= BAR_DECAY; this.barH[i] *= BAR_DECAY; }
     K[slot] += this.bK; L[slot] += this.bL;
     { const e = this.bE, pm = this.bE1 > this.bE2 ? this.bE1 : this.bE2;
       if (this.bEm > 0 && e > pm) R[slot] += Math.min(BAR_R_MAX, (e - pm) / this.bEm);
@@ -437,12 +441,13 @@ export class BeatFeed {
     if (this.barN < 1000) this.barN++;
     if (this.barN < BAR_MIN) return;
     const sK = K[0] + K[1] + K[2] + K[3], sL = L[0] + L[1] + L[2] + L[3], sR = R[0] + R[1] + R[2] + R[3], X = this.barX;
-    const sX = Math.abs(X[0]) + Math.abs(X[1]) + Math.abs(X[2]) + Math.abs(X[3]);
+    const sX = Math.abs(X[0]) + Math.abs(X[1]) + Math.abs(X[2]) + Math.abs(X[3]), H = this.barH;
+    const sH = Math.abs(H[0]) + Math.abs(H[1]) + Math.abs(H[2]) + Math.abs(H[3]), mH = (H[0] + H[1] + H[2] + H[3]) / 4;
     if (!(sK > 0)) return;
     let bi = 0, best = -1e9, second = -1e9;
     for (let i = 0; i < 4; i++) {
       const v = K[i] / sK + (sR > 0 ? R[i] / sR : 0) + (sL > 0 ? BAR_W_BASS * L[i] / sL : 0)
-        + (sX > 0 ? BAR_W_BEAT * (X[(i + 1) & 3] + X[(i + 3) & 3] - X[i] - X[(i + 2) & 3]) / sX : 0);
+        + (sX > 0 ? BAR_W_BEAT * (X[(i + 1) & 3] + X[(i + 3) & 3] - X[i] - X[(i + 2) & 3]) / sX : 0) + (sH > 0 ? BAR_W_HOLD * (H[i] - mH) / sH : 0);
       if (v > best) { second = best; best = v; bi = i; } else if (v > second) second = v;
     }
     if (bi !== this.barM && best - second >= BAR_MARGIN) { this.barM = bi; this.barShifts++; }
```
