# a3 SLAG 1 MOT SLAG 3: eget andra steg (etta3)

**IDÉN.** Basens fyrvägsval (K/R/L + backbeat) får nu bara bestämma PARET {1,3}/{2,4}. Inom paret väljer ett eget steg mellan 1 och 3, med eget minne och egen marginal och med två särdrag som bandenergin saknar: klangbytet (ackord-/klangskiftet hamnar på ettan) och basens återkomst efter slutet av förra slaget (första anslaget efter en lucka i basgången). Där kick och bas är lika starka på 1 och 3 (171840 140-190 s: kickens nivå 1 och 3 inom 0,5 dB) bytte klangen på ettan i 85 % av takterna. Därför vänder steget trean till ettan.

**DELARNA** (m1 = levererad kod; ablationerna är offline-simulering på loggade särdrag från tre sonder. Simuleringen återgav basens beslut till 100 % och förutsade m1:s ren 4/4 inom 0,4 pe)

| del | vad den gör | mått den bär | idébanken |
|---|---|---|---|
| D1 tvåsteget (barMb + barW) | basens fyrvägsval -> paret; inom paret u = S[p+2]-S[p] + nya termer, byter vid \|u\| >= BAR_MARGIN | ensam ±0 (bas 86,9 sim) | etta2 a6 (hierarkin), men utan dess nya minne |
| D2 klangbytet barT, BAR_W_TIM 1 | per slag: medel-dB av lowMid/mid/highMid över slagets 8 åttondelar, summa \|Δ\| mot förra slaget, bokförs på slagets plats, minne BAR_DECAY | utan D3 (sim): 171840 77,9 -> 94,5, 151659 92,0 -> 90,5 | etta2 a1 (ackord), här utan chroma/FFT |
| D3 basens återkomst barG, BAR_W_GAP 0,5 | max(0, bas-dB i slagets första 2/8 minus de 3 sista åttondelarna av förra slaget) | utan D2 (sim): 171840 93,5, 151659 91,7 | etta2 a5 (luckan) |
| D2+D3 (m1) | | ren 4/4 86,6 -> 92,4; poäng +5,34 | |

Vikter = basens egna (1 som K, 0,5 som L, marginal och minne som basens). Ingen finjustering: skillnaderna i simuleringen (0,25-2, marginal 0,03-0,15) låg inom ±0,5 pe.

**KOSTNADEN.** Allt ligger i BeatFeed (taktvägen, i ladan workerns klocka). Per hopp blir det 4 additioner. Per slag (~2/s) blir det 32 log10 och några loopar. Inget nytt i huvudtråden och ingen ny FFT. Minnet är ~0,4 kB (fasta Float64Array, inga allokeringar per hopp). split.ts bär redan lowMid/mid/highMid/bass.

**SIFFRORNA** (etta3dom-m1.json, mot bas)

| fil | ren | trean | etta alla | omval | FEL | lead |
|---|---|---|---|---|---|---|
| 151659 | 92,8 -> 91,7 | 6,0 -> 7,0 | 93,9 -> 93,2 | 0,12 -> 0,35 | 10,4 -> 10,2 | −60 (lika) |
| 171840 | 75,3 -> 93,8 | 21,8 -> 3,2 | 74,8 -> 88,6 | 0,64 (lika) | 7,4 | −53 |
| 200719 | 91,8 (lika) | 4,9 | 67,0 -> 69,9 | 1,47 -> 1,53 | 13,0 | −67 |
| medel | 86,6 -> 92,4 | 10,9 -> 5,1 | 78,6 -> 83,9 | 0,74 -> 0,84 | 10,3 -> 10,2 | |

Det här blev sämre: 151659 tappar 1,1 pe. I introt byter klangen oftare på trean, så när basen byter till rätt par vid 30 s dröjer ettan 4 slag och ger ett extra omval. omval kostar 0,5 poäng. 200719:s rester (1000-1030 s) kommer av tre omlåsningar i rad före BAR_MIN och finns redan i basen. Ingen spärr slår till. Jag gjorde ingen m2: ingen spärr behövde lagas, och skillnaderna i simuleringen var brus.

**RISKEN.** Vinsten bärs mest av en fil (171840), men två oberoende särdrag gav var för sig samma lyft. Klangen kan lura steget: sång som går in på trean, fills, risers, och intron där klangen byter på trean (151659). I halftime/trap kan bassens återkomst ligga på trean. Live-mic påverkar inte: bara dB-skillnader används, så gain spelar ingen roll. Låtbyten: allt nollställs i barReset. Breaks utan trummor: K/R blir brus, och klangen bär då steget, vilket troligen hjälper. Udda takter: paret är fortfarande basens.

**DIFFEN** (`git diff --no-index .arena/etta3/bas/src .arena/etta3/a3/src`, även i `diff.txt`; bara analyserClock.ts)

```diff
diff --git a/.arena/etta3/bas/src/analyserClock.ts b/.arena/etta3/a3/src/analyserClock.ts
index 0832641..8e195d9 100644
--- a/.arena/etta3/bas/src/analyserClock.ts
+++ b/.arena/etta3/a3/src/analyserClock.ts
@@ -26,7 +26,7 @@ const FEED_RISE_HOPS = 6;   // BASENS STIGNING
 const PH_B = 6, PH_W = 4, PH_LAG_A = 0.05, PH_LAG_MAX = 30;   // FASEN UR BANDEN (a6)
 const BREAK_HOLD_MS = 20000;   // TVÅ RUTNÄT
 const BREAK_RESTORE_MS = Number(process.env.DMX_BREAK_RESTORE_MS ?? String(BREAK_HOLD_MS));
-const BAR_DECAY = 0.99, BAR_MIN = 16, BAR_MARGIN = 0.06, BAR_W_BASS = 0.5, BAR_WIN0 = -0.2, BAR_WIN1 = 0.3, BAR_RISE_HOPS = 6, BAR_R_MAX = 2, BAR_W_BEAT = 0.25, BAR_Q = 8, BAR_BEAT_Q = 2;   // ETTAN I EFFEKTKLOCKANS RUTNÄT
+const BAR_DECAY = 0.99, BAR_MIN = 16, BAR_MARGIN = 0.06, BAR_W_BASS = 0.5, BAR_WIN0 = -0.2, BAR_WIN1 = 0.3, BAR_RISE_HOPS = 6, BAR_R_MAX = 2, BAR_W_BEAT = 0.25, BAR_Q = 8, BAR_BEAT_Q = 2, BAR_W_TIM = 1, BAR_W_GAP = 0.5;   // ETTAN I EFFEKTKLOCKANS RUTNÄT
 const TG_HOLD = 1.35;   // HELA TEMPOOMRÅDET
 const TG_SIB = [Math.round(Math.log2(4 / 3) * 139), Math.round(Math.log2(3 / 2) * 139)];   // 4:3 och 3:2 i rutnätets steg
 const TG_SNAP = 0.03, TG_EDGE = 1.03, TG_OCT_UP = 0.85, TG_OCT_DN = 0.4, TG_OCT_A = 0.1;
@@ -91,6 +91,8 @@ export class BeatFeed {
   private barM = 0; private barJ = 0; private barJr = 0; private barPT = 0; private barPI = NaN;   // ettan räknas i musikens slag (a1, per slag a6)
   private readonly barR = new Float64Array(4); private bE = 0; private bE1 = 0; private bE2 = 0; private bEm = 0;   // kickens återstart (a2)
   private readonly barX = new Float64Array(4); private readonly barV = new Float64Array(BAR_Q); private readonly barVc = new Float64Array(BAR_Q); private barTi = NaN; private barTe = 0;   // backbeaten (a8r)
+  private readonly barT = new Float64Array(4); private readonly barG = new Float64Array(4); private readonly barZ = new Float64Array(4 * BAR_Q); private readonly barP = new Float64Array(4); private barPok = false;   // 1 mot 3 (a3)
+  private readonly barS = new Float64Array(4); private readonly barW = new Int8Array(2); private barMb = 0;
   private readonly linK = new Float64Array(BAR_RISE_HOPS); private readonly linL = new Float64Array(BAR_RISE_HOPS); private linPos = 0;
   private innerAnchor = 0; private innerBpm = 0; private innerValid = false;
   private readonly anaGrid = { anchorMs: 0, bpm: 0, confidence: 0 };   // EN KÄLLA
@@ -412,7 +414,8 @@ export class BeatFeed {
     return false;
   }
 
-  private barReset(): void { this.barK.fill(0); this.barL.fill(0); this.barR.fill(0); this.barX.fill(0); this.barTi = NaN; this.bE1 = 0; this.bE2 = 0; this.bEm = 0; this.barN = 0; this.barIdx = NaN; this.barM = this.barOff & 3; this.barJ = 0; this.barJr = 0; this.barPI = NaN; }
+  private barReset(): void { this.barK.fill(0); this.barL.fill(0); this.barR.fill(0); this.barX.fill(0); this.barTi = NaN; this.bE1 = 0; this.bE2 = 0; this.bEm = 0; this.barN = 0; this.barIdx = NaN; this.barM = this.barOff & 3; this.barJ = 0; this.barJr = 0; this.barPI = NaN;
+    this.barT.fill(0); this.barG.fill(0); this.barPok = false; this.barMb = this.barM; this.barW[this.barM & 1] = this.barM >> 1; this.barW[(this.barM & 1) ^ 1] = 0; }
 
   /** ETTAN (se BAR_DECAY). */
   private barStep(frame: Frame, beat: NonNullable<EngineConfig["beat"]>, now: number): void {
@@ -430,8 +433,9 @@ export class BeatFeed {
       if (rl > this.bL) this.bL = rl;
     }
     { const ti = Math.floor(pos);
-      if (ti !== this.barTi) { if (ti === this.barTi + 1) this.barBack(); this.barTi = ti; this.barV.fill(0); this.barVc.fill(0); }
-      const q = Math.min(BAR_Q - 1, Math.floor((pos - ti) * BAR_Q)); this.barV[q] += sa?.treble ?? 0; this.barVc[q]++; }
+      if (ti !== this.barTi) { if (ti === this.barTi + 1) this.barBack(); this.barTi = ti; this.barV.fill(0); this.barVc.fill(0); this.barZ.fill(0); }
+      const q = Math.min(BAR_Q - 1, Math.floor((pos - ti) * BAR_Q)); this.barV[q] += sa?.treble ?? 0; this.barVc[q]++;
+      const Z = this.barZ; Z[q] += sa?.lowMid ?? 0; Z[BAR_Q + q] += sa?.mid ?? 0; Z[2 * BAR_Q + q] += sa?.highMid ?? 0; Z[3 * BAR_Q + q] += l; }
     { const d = ((((this.barM + this.barJr - this.barOff) % 4) + 4) % 4); if (d) this.barOff += d; }
   }
 
@@ -440,6 +444,7 @@ export class BeatFeed {
     const V = this.barV, C = this.barVc, e = this.barTe; let m = 0, a = 0, b = 0;
     for (let q = 0; q < BAR_Q; q++) { if (!(C[q] > 0)) return; m += V[q] / C[q]; }
     m /= BAR_Q;
+    this.barTim();
     if (e > 0) {
       for (let q = 0; q < BAR_Q; q++) { const v = V[q] / C[q], z = Math.log((v > 0.3 * e ? v : 0.3 * e) / e); if (q < BAR_BEAT_Q) a += z; else b += z; }
       this.barX[(((this.barTi - this.barJr) % 4) + 4) % 4] += a / BAR_BEAT_Q - b / (BAR_Q - BAR_BEAT_Q);
@@ -447,12 +452,25 @@ export class BeatFeed {
     this.barTe = e > 0 ? e + 0.05 * (m - e) : m;
   }
 
+  /** 1 mot 3: klangbytet mot förra slaget (lowMid/mid/highMid) och basens återkomst efter slutet av förra slaget. */
+  private barTim(): void {
+    const Z = this.barZ, C = this.barVc, P = this.barP, s = (((this.barTi - this.barJr) % 4) + 4) % 4;
+    let d = 0, l0 = 0, l1 = 0;
+    for (let b = 0; b < 4; b++) {
+      let a = 0; for (let q = 0; q < BAR_Q; q++) { const v = 20 * Math.log10(Z[b * BAR_Q + q] / C[q] + 1e-7); a += v; if (b === 3) { if (q < 2) l0 += v; else if (q >= 5) l1 += v; } }
+      if (b < 3) { a /= BAR_Q; d += Math.abs(a - P[b]); P[b] = a; }
+    }
+    l0 /= 2; l1 /= 3;
+    if (this.barPok) { this.barT[s] += d; const g = l0 - P[3]; if (g > 0) this.barG[s] += g; }
+    P[3] = l1; this.barPok = true;
+  }
+
   /** Slaget barIdx är färdigmätt. */
   private barCommit(tb: number, per: number): void {
     if (this.barPI === this.barPI) { const j = this.barJ + (this.barIdx - this.barPI) - (tb - this.barPT) / per; this.barJ = j - 4 * Math.floor(j / 4); }
     this.barPT = tb; this.barPI = this.barIdx; const jr = this.barJr = Math.floor(this.barJ + 0.5);
     const K = this.barK, L = this.barL, R = this.barR, slot = (((this.barIdx - jr) % 4) + 4) % 4;
-    for (let i = 0; i < 4; i++) { K[i] *= BAR_DECAY; L[i] *= BAR_DECAY; R[i] *= BAR_DECAY; this.barX[i] *= BAR_DECAY; }
+    for (let i = 0; i < 4; i++) { K[i] *= BAR_DECAY; L[i] *= BAR_DECAY; R[i] *= BAR_DECAY; this.barX[i] *= BAR_DECAY; this.barT[i] *= BAR_DECAY; this.barG[i] *= BAR_DECAY; }
     K[slot] += this.bK; L[slot] += this.bL;
     { const e = this.bE, pm = this.bE1 > this.bE2 ? this.bE1 : this.bE2;
       if (this.bEm > 0 && e > pm) R[slot] += Math.min(BAR_R_MAX, (e - pm) / this.bEm);
@@ -462,13 +480,20 @@ export class BeatFeed {
     const sK = K[0] + K[1] + K[2] + K[3], sL = L[0] + L[1] + L[2] + L[3], sR = R[0] + R[1] + R[2] + R[3], X = this.barX;
     const sX = Math.abs(X[0]) + Math.abs(X[1]) + Math.abs(X[2]) + Math.abs(X[3]);
     if (!(sK > 0)) return;
-    let bi = 0, best = -1e9, second = -1e9;
+    let bi = 0, best = -1e9, second = -1e9; const S = this.barS, T = this.barT, G = this.barG, W = this.barW;
     for (let i = 0; i < 4; i++) {
-      const v = K[i] / sK + (sR > 0 ? R[i] / sR : 0) + (sL > 0 ? BAR_W_BASS * L[i] / sL : 0)
+      const v = S[i] = K[i] / sK + (sR > 0 ? R[i] / sR : 0) + (sL > 0 ? BAR_W_BASS * L[i] / sL : 0)
         + (sX > 0 ? BAR_W_BEAT * (X[(i + 1) & 3] + X[(i + 3) & 3] - X[i] - X[(i + 2) & 3]) / sX : 0);
       if (v > best) { second = best; best = v; bi = i; } else if (v > second) second = v;
     }
-    if (bi !== this.barM && best - second >= BAR_MARGIN) { this.barM = bi; this.barShifts++; }
+    if (bi !== this.barMb && best - second >= BAR_MARGIN) this.barMb = bi;
+    for (let p = 0; p < 2; p++) {
+      const a = T[p] + T[p + 2], g = G[p] + G[p + 2];
+      const u = S[p + 2] - S[p] + (a > 0 ? BAR_W_TIM * (T[p + 2] - T[p]) / a : 0) + (g > 0 ? BAR_W_GAP * (G[p + 2] - G[p]) / g : 0);
+      if ((u > 0 ? 1 : 0) !== W[p] && Math.abs(u) >= BAR_MARGIN) W[p] ^= 1;
+    }
+    const m = (this.barMb & 1) + 2 * W[this.barMb & 1];
+    if (m !== this.barM) { this.barM = m; this.barShifts++; }
   }
 
   /** LÅTGRÄNSEN. */
```
