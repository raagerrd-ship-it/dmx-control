# a7 FRASEN – ettan där nyheterna landar

**IDÉN.** Varje slag får en låg-bands-vektor (log sub, kick, bas, lowMid över hela slaget), och nyheten per slag mäts som skillnaden
mellan 2, 4 och 8 slag efter mot lika många före (en "schackbräde"-nyhet i tre skalor, takt- och frasnivå). Toppen bokförs på sin
plats i takten som en fjärde röst bredvid dagens tre. Nya element, breaks och basgångsbyten kommer in på ettan och frasgränsen, så
platsen där nyheterna toppar är musikens etta.

## DELARNA

| del | vad den gör | mått (m1, övningen) |
|---|---|---|
| D1 NYHETEN (`novB`/`novStep`, `BAR_W_NOV = 1`, `NOV_W = [2,4,8]`) | slagets låg-bands-log-medel i en ring med 16 slag; nyheten 2/4/8 slag efter mot före, toppvald mot grannslagen, läggs på platsens andel med vikt 1 | etta 33,5 -> 40,2 % (+6,7 pe); 172432 32 -> 44, 160345 26 -> 46; 151659 sämre 42,5 -> 30 |
| D2 kontinuitet (`else this.novN = 0`) | ringen nollas när rutnätets slagindex hoppar (inte idx+1) | bär inget eget mått, krävs av D1 |
| (bas) bas-stigning, basgång, backbeat, BAR_DECAY 0,99, BAR_MARGIN 0,06 | oförändrat | - |

Allt annat (tempo, fas, publicering, relock) orört. Ingen allokering per hop: fyra Math.log per hop, ringarna förallokerade.

## DIFFEN

```diff
diff --git a/src/analyserClock.ts b/.arena/etta/a7/src/analyserClock.ts
index 384c61c..11ab5ba 100644
--- a/src/analyserClock.ts
+++ b/.arena/etta/a7/src/analyserClock.ts
@@ -25,7 +25,7 @@ const ONSET_WIN_MS = 5000, ONSET_EVERY_MS = 250, ONSET_BINS = 48, ONSET_RING = 1
 const FEED_RISE_HOPS = 6;   // BASENS STIGNING
 const BREAK_HOLD_MS = 20000;   // TVÅ RUTNÄT
 const BREAK_RESTORE_MS = Number(process.env.DMX_BREAK_RESTORE_MS ?? String(BREAK_HOLD_MS));
-const BAR_DECAY = 0.99, BAR_MIN = 16, BAR_MARGIN = 0.06, BAR_W_BASS = 0.5, BAR_W_BACK = 0.5, BAR_WIN0 = -0.2, BAR_WIN1 = 0.3, BAR_RISE_HOPS = 6;   // ETTAN I EFFEKTKLOCKANS RUTNÄT
+const BAR_DECAY = 0.99, BAR_MIN = 16, BAR_MARGIN = 0.06, BAR_W_BASS = 0.5, BAR_W_BACK = 0.5, BAR_WIN0 = -0.2, BAR_WIN1 = 0.3, BAR_RISE_HOPS = 6, BAR_W_NOV = 1, NOV_W = [2, 4, 8], NOV_RING = 16;   // ETTAN I EFFEKTKLOCKANS RUTNÄT
 const TG_HOLD = 1.35;   // HELA TEMPOOMRÅDET
 const TG_SIB = [Math.round(Math.log2(4 / 3) * 139), Math.round(Math.log2(3 / 2) * 139)];   // 4:3 och 3:2 i rutnätets steg
 const TG_SNAP = 0.03, TG_EDGE = 1.03, TG_OCT_UP = 0.85, TG_OCT_DN = 0.4, TG_OCT_A = 0.1;
@@ -86,6 +86,7 @@ export class BeatFeed {
   private readonly barK = new Float64Array(4); private readonly barL = new Float64Array(4); private readonly barB = new Float64Array(4);   // ETTAN (a5)
   private barN = 0; private barIdx = NaN; private bK = 0; private bL = 0; private bB = 0; private barOff = 0; barShifts = 0;
   private readonly linK = new Float64Array(BAR_RISE_HOPS); private readonly linL = new Float64Array(BAR_RISE_HOPS); private linPos = 0;
+  private readonly barV = new Float64Array(4); private readonly novX = new Float64Array(NOV_RING * 4); private readonly novB = new Float64Array(4); private readonly novC = new Float64Array(3 * NOV_W.length); private novBn = 0; private novN = 0;
   private innerAnchor = 0; private innerBpm = 0; private innerValid = false;
   private readonly anaGrid = { anchorMs: 0, bpm: 0, confidence: 0 };   // EN KÄLLA
   private boundSeen = 0;
@@ -386,7 +387,7 @@ export class BeatFeed {
     return false;
   }
 
-  private barReset(): void { this.barK.fill(0); this.barL.fill(0); this.barB.fill(0); this.barN = 0; this.barIdx = NaN; this.barOff = 0; }
+  private barReset(): void { this.barK.fill(0); this.barL.fill(0); this.barB.fill(0); this.barN = 0; this.barIdx = NaN; this.barOff = 0; this.barV.fill(0); this.novN = 0; this.novBn = 0; this.novB.fill(0); }
 
   /** ETTAN (se BAR_DECAY). */
   private barStep(frame: Frame, beat: NonNullable<EngineConfig["beat"]>, now: number): void {
@@ -395,9 +396,10 @@ export class BeatFeed {
     if (!(beat.bpm > 40)) return;
     const pos = (now - beat.anchorMs) / (60000 / beat.bpm), idx = Math.floor(pos - BAR_WIN0);
     if (idx !== this.barIdx) {
-      if (idx === this.barIdx + 1) this.barCommit();
-      this.barIdx = idx; this.bK = 0; this.bL = 0; this.bB = 0;
+      if (idx === this.barIdx + 1) this.barCommit(); else this.novN = 0;
+      this.barIdx = idx; this.bK = 0; this.bL = 0; this.bB = 0; this.novB.fill(0); this.novBn = 0;
     }
+    { const nb = this.novB; nb[0] += Math.log((sa?.sub ?? 0) + 1e-7); nb[1] += Math.log((sa?.kick ?? 0) + 1e-7); nb[2] += Math.log(l + 1e-7); nb[3] += Math.log((sa?.lowMid ?? 0) + 1e-7); this.novBn++; }
     if (pos - idx <= BAR_WIN1) {
       if (rk > this.bK) this.bK = rk;
       if (rl > this.bL) this.bL = rl;
@@ -410,18 +412,38 @@ export class BeatFeed {
     const K = this.barK, L = this.barL, B = this.barB, slot = ((this.barIdx % 4) + 4) % 4;
     for (let i = 0; i < 4; i++) { K[i] *= BAR_DECAY; L[i] *= BAR_DECAY; B[i] *= BAR_DECAY; }
     K[slot] += this.bK; L[slot] += this.bL; B[slot] += this.bB;
+    this.novStep(slot);
     if (this.barN < 1000) this.barN++;
     if (this.barN < BAR_MIN) return;
-    const sK = K[0] + K[1] + K[2] + K[3], sL = L[0] + L[1] + L[2] + L[3], sB = B[0] + B[1] + B[2] + B[3];
+    const V = this.barV, sK = K[0] + K[1] + K[2] + K[3], sL = L[0] + L[1] + L[2] + L[3], sB = B[0] + B[1] + B[2] + B[3], sV = V[0] + V[1] + V[2] + V[3];
     if (!(sK > 0)) return;
     let bi = 0, best = -1e9, second = -1e9;
     for (let i = 0; i < 4; i++) {
-      const v = K[i] / sK + (sL > 0 ? BAR_W_BASS * L[i] / sL : 0) - (sB > 0 ? BAR_W_BACK * B[i] / sB : 0);
+      const v = K[i] / sK + (sL > 0 ? BAR_W_BASS * L[i] / sL : 0) - (sB > 0 ? BAR_W_BACK * B[i] / sB : 0) + (sV > 0 ? BAR_W_NOV * V[i] / sV : 0);
       if (v > best) { second = best; best = v; bi = i; } else if (v > second) second = v;
     }
     if (bi !== this.barOff && best - second >= BAR_MARGIN) { this.barOff = bi; this.barShifts++; }
   }
 
+  /** a7 FRASEN: nyheten i lågbanden per slag (2/4/8 slag före mot efter), toppen bokförs på sin plats. */
+  private novStep(slot: number): void {
+    const V = this.barV, X = this.novX, C = this.novC; for (let i = 0; i < 4; i++) V[i] *= BAR_DECAY;
+    if (!(this.novBn > 0)) { this.novN = 0; return; }
+    const o = (this.novN % NOV_RING) * 4; for (let b = 0; b < 4; b++) X[o + b] = this.novB[b] / this.novBn;
+    if (++this.novN < NOV_RING) return;
+    const c = this.novN - 8;
+    for (let s = 0; s < NOV_W.length; s++) {
+      const w = NOV_W[s], q = s * 3; let d = 0;
+      for (let b = 0; b < 4; b++) {
+        let a = 0, z = 0;
+        for (let j = 0; j < w; j++) { a += X[((c + j) % NOV_RING) * 4 + b]; z += X[((c - 1 - j) % NOV_RING) * 4 + b]; }
+        d += Math.abs(a - z) / w;
+      }
+      C[q] = C[q + 1]; C[q + 1] = C[q + 2]; C[q + 2] = d;
+      if (this.novN >= NOV_RING + 2 && C[q + 1] > C[q] && C[q + 1] >= C[q + 2]) V[slot] += C[q + 1] - Math.min(C[q], C[q + 2]);
+    }
+  }
+
   /** LÅTGRÄNSEN. */
   private relock(soft: boolean): void {
     if (this.innerValid && this.innerBpm > 0) this.innerAnchor += this.barOff * (60000 / this.innerBpm);
```

## SIFFRORNA (ettdom, övningen)

| | etta | omval /min | paslag | 151659 | 172432 | 160345 |
|---|---|---|---|---|---|---|
| bas | 33,5 | 1,41 | 70,4 | 42,5 (42/23/23/11) | 32,0 | 25,9 |
| **m1 = lösningen** | **40,2** | 1,66 | 70,5 | 30,0 (30/20/27/24) | 44,3 (44/16/20/20) | 46,2 (46/20/7/27) |
| m2 (förkastad) | 35,4 | 2,67 | 69,5 | 43,5 | 27,9 | 34,8 |

Poäng m1 **+5,45** (etta +6,7, omval +0,25/min = -1,25). Sämre: 151659 (-12,5 pe) och omvalen.
m2 = m1 + eget tidsräknat slagindex (ackumulatorerna följer musiken genom rutnätets slagglidningar) + BAR_DECAY 0,96 / MARGIN 0,10:
poäng -4,37 (omval 2,67/min). Koden lades tillbaka till m1 och ettdom.json = ettdom-m1.json (m2 sparad som ettdom-m2.json och
analyserClock-m2.ts.txt).

## VAD JAG LÄRDE (till jokern)

- Offline på Beat This-rutnätet (python, övningens wav + facit, aldrig i koden) ger samma särdrag 74 % etta (bas-särdragen 45 %).
  På motorns verkliga rutnät (tickens tider) faller båda till 26-35 %. **Felet sitter mest i rutnätet, inte i särdragen**: rutnätet
  låser långa stunder på offbeat med full konfidens (151659 75-105 s och 435 s ->, fas +0,38 slag, conf 1,00), och då hamnar varje
  särdrag på fel plats i det långa minnet. Den som fixar fasen (eller grindar bokföringen på fasen) lyfter alla deltagares ettor.
- Kortare minne hjälper i emulatorn men inte i motorn (m2): omvalen äter vinsten.

## RISKEN

- Breaks och tysta partier: log-banden ger stor nyhet vid in- och utgång; de landar oftast på ettan men en fill före droppen kan dra
  mot slag 4.
- Musik utan trumma eller med jämn bas (ambient, liveband): få toppar, då styr dagens tre röster som förr.
- Låtbyten: ringen nollas med relock, nyheten behöver 18 slag innan den röstar (BAR_MIN är 16).
- Live-mic: rumsbrus i sub-bandet höjer golvet i log-medlet men är stationärt, så skillnaden påverkas lite.
- ANALYSER_SHARED.md5 är inte uppdaterad (bänken kräver det inte; lotus-porten måste göra det).
