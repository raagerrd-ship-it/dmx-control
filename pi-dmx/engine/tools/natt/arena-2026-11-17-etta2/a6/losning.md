# a6 HIERARKIN - losning

**IDÉN.** Ettan väljs i två steg: först vilket par {1,3} eller {2,4} som bär ettan (dagens särdrag summerade per par, dagens minne 0,99, egen marginal 0,1), sedan 1 mot 3 inom paret med ett eget, långsammare minne (0,995, ~60 takter) och egen marginal (0,08), där diskantens anslag på slaget ingår som eget bevis. Backbeaten säger inget om 1 mot 3, men cymbal/stab-anslaget hamnar oftare på ettan än på trean (5 av 6 genomgångna låtavsnitt i övningen), och det långsamma minnet låter kickens återstart R och basstigningen K väga över fler takter innan ettan flyttas två slag.

**DELARNA** (domarens mätning m1 för helheten; ablationerna är offline-simulering på loggade särdrag från tre sonder, som återger basens beslut exakt och förutsade m1 inom 0,2 pe)

| del | vad den gör | mått den bär |
|---|---|---|
| hierarkin (par -> inom par), BAR_MARGIN 0,06 -> 0,1 på parbeslutet | parpoäng = summan av dagens platspoäng över paret | ensam ~0 (+0,2 pe etta sim); marginalen 0,1 i stället för 0,06: +0,3 pe |
| långsamt inre minne BAR_DECAY_IN 0,995 + BAR_MARGIN_IN 0,08 | 1 mot 3 dömt på K, R, L i egna ackumulatorer | utan det: 200719 70,0 -> 67,1 % (sim) |
| diskanttoppen BAR_W_TOP 1 | (X2[p+2] - X2[p]) / summa abs(X2): diskantens anslag på den ena platsen i paret mot den andra, bara i inre steget | 171840 65 -> 71 % sim, 63,4 -> 72,9 % mätt; utan den är allt ~bas |

Prövat och struket offline: snabbt parminne 0,95 (kortets förslag) -2 pe etta, 151659 -1,6, 171840 -3; tyngre R eller backbeat i parsteget, ingen vinst.

**DIFFEN**

```diff
diff --git a/src/analyserClock.ts b/.arena/etta2/a6/src/analyserClock.ts
index 0bbcb78..27c4946 100644
--- a/src/analyserClock.ts
+++ b/.arena/etta2/a6/src/analyserClock.ts
@@ -25,7 +25,8 @@ const ONSET_WIN_MS = 5000, ONSET_EVERY_MS = 250, ONSET_BINS = 48, ONSET_RING = 1
 const FEED_RISE_HOPS = 6;   // BASENS STIGNING
 const BREAK_HOLD_MS = 20000;   // TVÅ RUTNÄT
 const BREAK_RESTORE_MS = Number(process.env.DMX_BREAK_RESTORE_MS ?? String(BREAK_HOLD_MS));
-const BAR_DECAY = 0.99, BAR_MIN = 16, BAR_MARGIN = 0.06, BAR_W_BASS = 0.5, BAR_WIN0 = -0.2, BAR_WIN1 = 0.3, BAR_RISE_HOPS = 6, BAR_R_MAX = 2, BAR_W_BEAT = 0.25, BAR_Q = 8, BAR_BEAT_Q = 2;   // ETTAN I EFFEKTKLOCKANS RUTNÄT
+const BAR_DECAY = 0.99, BAR_MIN = 16, BAR_MARGIN = 0.1, BAR_W_BASS = 0.5, BAR_WIN0 = -0.2, BAR_WIN1 = 0.3, BAR_RISE_HOPS = 6, BAR_R_MAX = 2, BAR_W_BEAT = 0.25, BAR_Q = 8, BAR_BEAT_Q = 2,
+  BAR_DECAY_IN = 0.995, BAR_MARGIN_IN = 0.08, BAR_W_TOP = 1;   // ETTAN I EFFEKTKLOCKANS RUTNÄT
 const TG_HOLD = 1.35;   // HELA TEMPOOMRÅDET
 const TG_SIB = [Math.round(Math.log2(4 / 3) * 139), Math.round(Math.log2(3 / 2) * 139)];   // 4:3 och 3:2 i rutnätets steg
 const TG_SNAP = 0.03, TG_EDGE = 1.03, TG_OCT_UP = 0.85, TG_OCT_DN = 0.4, TG_OCT_A = 0.1;
@@ -89,6 +90,7 @@ export class BeatFeed {
   private readonly barR = new Float64Array(4); private bE = 0; private bE1 = 0; private bE2 = 0; private bEm = 0;   // kickens återstart (a2)
   private readonly barX = new Float64Array(4); private readonly barV = new Float64Array(BAR_Q); private readonly barVc = new Float64Array(BAR_Q); private barTi = NaN; private barTe = 0;   // backbeaten (a8r)
   private readonly linK = new Float64Array(BAR_RISE_HOPS); private readonly linL = new Float64Array(BAR_RISE_HOPS); private linPos = 0;
+  private readonly bK2 = new Float64Array(4); private readonly bL2 = new Float64Array(4); private readonly bR2 = new Float64Array(4); private readonly bX2 = new Float64Array(4); private readonly barW = new Int8Array(2);   // 1 mot 3 (a6 hierarkin)
   private innerAnchor = 0; private innerBpm = 0; private innerValid = false;
   private readonly anaGrid = { anchorMs: 0, bpm: 0, confidence: 0 };   // EN KÄLLA
   private boundSeen = 0;
@@ -389,7 +391,8 @@ export class BeatFeed {
     return false;
   }
 
-  private barReset(): void { this.barK.fill(0); this.barL.fill(0); this.barR.fill(0); this.barX.fill(0); this.barTi = NaN; this.bE1 = 0; this.bE2 = 0; this.bEm = 0; this.barN = 0; this.barIdx = NaN; this.barM = this.barOff & 3; this.barJ = 0; this.barJr = 0; this.barPI = NaN; }
+  private barReset(): void { this.barK.fill(0); this.barL.fill(0); this.barR.fill(0); this.barX.fill(0); this.barTi = NaN; this.bE1 = 0; this.bE2 = 0; this.bEm = 0; this.barN = 0; this.barIdx = NaN; this.barM = this.barOff & 3; this.barJ = 0; this.barJr = 0; this.barPI = NaN;
+    this.bK2.fill(0); this.bL2.fill(0); this.bR2.fill(0); this.bX2.fill(0); this.barW[this.barM & 1] = this.barM >> 1; this.barW[(this.barM & 1) ^ 1] = 0; }
 
   /** ETTAN (se BAR_DECAY). */
   private barStep(frame: Frame, beat: NonNullable<EngineConfig["beat"]>, now: number): void {
@@ -419,7 +422,7 @@ export class BeatFeed {
     m /= BAR_Q;
     if (e > 0) {
       for (let q = 0; q < BAR_Q; q++) { const v = V[q] / C[q], z = Math.log((v > 0.3 * e ? v : 0.3 * e) / e); if (q < BAR_BEAT_Q) a += z; else b += z; }
-      this.barX[(((this.barTi - this.barJr) % 4) + 4) % 4] += a / BAR_BEAT_Q - b / (BAR_Q - BAR_BEAT_Q);
+      const s = (((this.barTi - this.barJr) % 4) + 4) % 4, x = a / BAR_BEAT_Q - b / (BAR_Q - BAR_BEAT_Q); this.barX[s] += x; this.bX2[s] += x;
     }
     this.barTe = e > 0 ? e + 0.05 * (m - e) : m;
   }
@@ -429,23 +432,30 @@ export class BeatFeed {
     if (this.barPI === this.barPI) { const j = this.barJ + (this.barIdx - this.barPI) - (tb - this.barPT) / per; this.barJ = j - 4 * Math.floor(j / 4); }
     this.barPT = tb; this.barPI = this.barIdx; const jr = this.barJr = Math.floor(this.barJ + 0.5);
     const K = this.barK, L = this.barL, R = this.barR, slot = (((this.barIdx - jr) % 4) + 4) % 4;
-    for (let i = 0; i < 4; i++) { K[i] *= BAR_DECAY; L[i] *= BAR_DECAY; R[i] *= BAR_DECAY; this.barX[i] *= BAR_DECAY; }
-    K[slot] += this.bK; L[slot] += this.bL;
+    const K2 = this.bK2, L2 = this.bL2, R2 = this.bR2, X2 = this.bX2;
+    for (let i = 0; i < 4; i++) { K[i] *= BAR_DECAY; L[i] *= BAR_DECAY; R[i] *= BAR_DECAY; this.barX[i] *= BAR_DECAY; K2[i] *= BAR_DECAY_IN; L2[i] *= BAR_DECAY_IN; R2[i] *= BAR_DECAY_IN; X2[i] *= BAR_DECAY_IN; }
+    K[slot] += this.bK; L[slot] += this.bL; K2[slot] += this.bK; L2[slot] += this.bL;
     { const e = this.bE, pm = this.bE1 > this.bE2 ? this.bE1 : this.bE2;
-      if (this.bEm > 0 && e > pm) R[slot] += Math.min(BAR_R_MAX, (e - pm) / this.bEm);
+      if (this.bEm > 0 && e > pm) { const r = Math.min(BAR_R_MAX, (e - pm) / this.bEm); R[slot] += r; R2[slot] += r; }
       this.bE2 = this.bE1; this.bE1 = e; this.bEm += (e - this.bEm) / 16; }
     if (this.barN < 1000) this.barN++;
     if (this.barN < BAR_MIN) return;
     const sK = K[0] + K[1] + K[2] + K[3], sL = L[0] + L[1] + L[2] + L[3], sR = R[0] + R[1] + R[2] + R[3], X = this.barX;
     const sX = Math.abs(X[0]) + Math.abs(X[1]) + Math.abs(X[2]) + Math.abs(X[3]);
     if (!(sK > 0)) return;
-    let bi = 0, best = -1e9, second = -1e9;
-    for (let i = 0; i < 4; i++) {
-      const v = K[i] / sK + (sR > 0 ? R[i] / sR : 0) + (sL > 0 ? BAR_W_BASS * L[i] / sL : 0)
-        + (sX > 0 ? BAR_W_BEAT * (X[(i + 1) & 3] + X[(i + 3) & 3] - X[i] - X[(i + 2) & 3]) / sX : 0);
-      if (v > best) { second = best; best = v; bi = i; } else if (v > second) second = v;
+    const v0 = K[0] + K[2], v1 = K[1] + K[3], xd = sX > 0 ? 2 * BAR_W_BEAT * (X[1] + X[3] - X[0] - X[2]) / sX : 0;
+    const d = (v0 - v1) / sK + (sR > 0 ? (R[0] + R[2] - R[1] - R[3]) / sR : 0) + (sL > 0 ? BAR_W_BASS * (L[0] + L[2] - L[1] - L[3]) / sL : 0) + 2 * xd;
+    let pr = this.barM & 1; if ((d >= 0 ? 0 : 1) !== pr && Math.abs(d) >= BAR_MARGIN) pr ^= 1;
+    const sX2 = Math.abs(X2[0]) + Math.abs(X2[1]) + Math.abs(X2[2]) + Math.abs(X2[3]);
+    for (let p = 0; p < 2; p++) {
+      const a0 = K2[p] + K2[p + 2], a1 = L2[p] + L2[p + 2], a2 = R2[p] + R2[p + 2];
+      if (!(a0 > 0)) continue;
+      const u = (K2[p + 2] - K2[p]) / a0 + (a2 > 0 ? (R2[p + 2] - R2[p]) / a2 : 0) + (a1 > 0 ? BAR_W_BASS * (L2[p + 2] - L2[p]) / a1 : 0)
+        + (sX2 > 0 ? BAR_W_TOP * (X2[p + 2] - X2[p]) / sX2 : 0);
+      if ((u > 0 ? 1 : 0) !== this.barW[p] && Math.abs(u) >= BAR_MARGIN_IN) this.barW[p] ^= 1;
     }
-    if (bi !== this.barM && best - second >= BAR_MARGIN) { this.barM = bi; this.barShifts++; }
+    const bi = pr + 2 * this.barW[pr];
+    if (bi !== this.barM) { this.barM = bi; this.barShifts++; }
   }
 
   /** LÅTGRÄNSEN. */
```

**SIFFRORNA** (m1, `ettdom-m1.json`; poäng +3,45 mot bas)

| fil | etta % (bas) | förskjutning 0/1/2/3 | omval/min (bas) | paslag (bas) |
|---|---|---|---|---|
| 151659 | 97,8 (97,8) | 98/1/0/1 | 0,00 (0,00) | 79,4 (79,4) |
| 171840 | 72,9 (63,4) | 73/16/4/7 | 1,33 (1,33) | 74,3 (74,5) |
| 200719 | 69,1 (68,9) | 69/7/15/8 | 1,35 (1,47) | 80,7 (80,7) |
| medel | 79,9 (76,7) | | 0,89 (0,93) | 78,2 (78,2) |

Sämre: 171840 förskjutning 1 13 -> 16 %, 3 6 -> 7 %; 200719 förskjutning 3 6 -> 8,5 %. **Varning:** vinsten kommer nästan helt från en fil (171840). 200719 står still, så det här kan vara anpassning. Resten av 200719:s fel ligger där Beat This-ettan själv flyttar sig i motorns slagram (mönster som 3210 och 0022, och ett hopp 0 -> 2 vid 595 s mitt i låten). Där kan ingen taktlogik vinna.

**RISKEN.** Det långsamma inre minnet gör att en fel etta efter låtbyte (om de första 16 slagen pekar fel) sitter kvar längre. Diskanttoppen kan luras av musik där hi-hat/cymbal eller vokalstarter ligger på trean (half-time, trap). Utan trumma blir X brus och K/R bär som förr. Breaks: minnet håller ettan, det är avsiktligt. Ingen ny FFT och ingen allokering per hop: fyra Float64Array(4) och en Int8Array(2) skapas en gång.
