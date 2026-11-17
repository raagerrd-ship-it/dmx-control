# a5 ÅTERKOMSTEN (etta2)

## Idén
När basen försvinner (break, lucka, låtgräns) fryses taktmodellen: inga röster, inget avklingande, inget omval, så ettan hålls
som den var. Där basen kommer tillbaka med ett språng röstar slaget tungt som etta (en droppe/landning läggs nästan alltid på ettan).

## Delarna
| del | vad den gör | mått (m2, övningen) |
|---|---|---|
| A frysen | slag vars basmax över HELA slaget (bA) < 0,35 x basnivån bLv räknas som lucka: barCommit returnerar före avklingning, röster och omval | bär hållet: 151659 97,5 (bas 97,75), omval 0,93 (bas 0,93) |
| B återkomströsten | efter >= 4 luckslag: slag med bE >= 0,6 bLv och bE >= 2 x förra slagets bA får T[slot] += 1; T klingar som K (0,99/slag) och läggs ABSOLUT i poängen med vikt 0,5 | 171840 +0,5 (m2) / +4,4 (m1), 200719 +0,3 (m2) / -3,8 (m1) |
| C basnivån bLv | lär sig 1/32 per närvarande slag, sjunker 0,995/slag i lucka (släpper en tystare ny låt) | stöd för A och B |

m1 (rå idé, inte kvar): luckan mätt på fönstret bE i stället för helslaget bA, och T som ANDEL (T[i]/sT, en enda röst = full andel för
alltid). Poäng +0,34 (etta 76,5, omval 0,82): 171840 67,8 men 200719 65,2 och 151659 96,5. Felen i m1 var falska återkomster när
klockan själv hackade (200719 ~420 s: rutnätet tappade fas, fönstret missade kicken -> "lucka" -> "återkomst" på slag 3 som låg kvar
i 50 s; 151659 ~423 s: break med ostadiga tick). m2 lagade detta med helslagsmax (en fasglidning ger ingen lucka) och absolut avklingande
vikt (en felröst läker på ~25 s) - då försvann både vinsten och förlusten.

## Diffen
```diff
diff --git a/src/analyserClock.ts b/.arena/etta2/a5/src/analyserClock.ts
index 0bbcb78..965b282 100644
--- a/src/analyserClock.ts
+++ b/.arena/etta2/a5/src/analyserClock.ts
@@ -26,6 +26,7 @@ const FEED_RISE_HOPS = 6;   // BASENS STIGNING
 const BREAK_HOLD_MS = 20000;   // TVÅ RUTNÄT
 const BREAK_RESTORE_MS = Number(process.env.DMX_BREAK_RESTORE_MS ?? String(BREAK_HOLD_MS));
 const BAR_DECAY = 0.99, BAR_MIN = 16, BAR_MARGIN = 0.06, BAR_W_BASS = 0.5, BAR_WIN0 = -0.2, BAR_WIN1 = 0.3, BAR_RISE_HOPS = 6, BAR_R_MAX = 2, BAR_W_BEAT = 0.25, BAR_Q = 8, BAR_BEAT_Q = 2;   // ETTAN I EFFEKTKLOCKANS RUTNÄT
+const BAR_GAP_LO = 0.35, BAR_GAP_N = 4, BAR_RET_HI = 0.6, BAR_W_RET = 0.5, BAR_LV_A = 1 / 32, BAR_LV_DN = 0.995;   // ATERKOMSTEN (etta2 a5)
 const TG_HOLD = 1.35;   // HELA TEMPOOMRÅDET
 const TG_SIB = [Math.round(Math.log2(4 / 3) * 139), Math.round(Math.log2(3 / 2) * 139)];   // 4:3 och 3:2 i rutnätets steg
 const TG_SNAP = 0.03, TG_EDGE = 1.03, TG_OCT_UP = 0.85, TG_OCT_DN = 0.4, TG_OCT_A = 0.1;
@@ -87,6 +88,7 @@ export class BeatFeed {
   private barN = 0; private barIdx = NaN; private bK = 0; private bL = 0; private barOff = 0; barShifts = 0;
   private barM = 0; private barJ = 0; private barJr = 0; private barPT = 0; private barPI = NaN;   // ettan räknas i musikens slag (a1, per slag a6)
   private readonly barR = new Float64Array(4); private bE = 0; private bE1 = 0; private bE2 = 0; private bEm = 0;   // kickens återstart (a2)
+  private readonly barT = new Float64Array(4); private bLv = 0; private barGap = 0; private bA = 0; private bA1 = 0;   // återkomsten (etta2 a5)
   private readonly barX = new Float64Array(4); private readonly barV = new Float64Array(BAR_Q); private readonly barVc = new Float64Array(BAR_Q); private barTi = NaN; private barTe = 0;   // backbeaten (a8r)
   private readonly linK = new Float64Array(BAR_RISE_HOPS); private readonly linL = new Float64Array(BAR_RISE_HOPS); private linPos = 0;
   private innerAnchor = 0; private innerBpm = 0; private innerValid = false;
@@ -389,7 +391,7 @@ export class BeatFeed {
     return false;
   }
 
-  private barReset(): void { this.barK.fill(0); this.barL.fill(0); this.barR.fill(0); this.barX.fill(0); this.barTi = NaN; this.bE1 = 0; this.bE2 = 0; this.bEm = 0; this.barN = 0; this.barIdx = NaN; this.barM = this.barOff & 3; this.barJ = 0; this.barJr = 0; this.barPI = NaN; }
+  private barReset(): void { this.barT.fill(0); this.barK.fill(0); this.barL.fill(0); this.barR.fill(0); this.barX.fill(0); this.barTi = NaN; this.bE1 = 0; this.bE2 = 0; this.bEm = 0; this.barN = 0; this.barIdx = NaN; this.barM = this.barOff & 3; this.barJ = 0; this.barJr = 0; this.barPI = NaN; }
 
   /** ETTAN (se BAR_DECAY). */
   private barStep(frame: Frame, beat: NonNullable<EngineConfig["beat"]>, now: number): void {
@@ -399,8 +401,9 @@ export class BeatFeed {
     const per = 60000 / beat.bpm, pos = (now - beat.anchorMs) / per, idx = Math.floor(pos - BAR_WIN0);
     if (idx !== this.barIdx) {
       if (idx === this.barIdx + 1) this.barCommit(beat.anchorMs + this.barIdx * per, per);
-      this.barIdx = idx; this.bK = 0; this.bL = 0; this.bE = 0;
+      this.barIdx = idx; this.bK = 0; this.bL = 0; this.bE = 0; this.bA = 0;
     }
+    if (k > this.bA) this.bA = k;
     if (pos - idx <= BAR_WIN1) {
       if (rk > this.bK) this.bK = rk;
       if (k > this.bE) this.bE = k;
@@ -428,8 +431,12 @@ export class BeatFeed {
   private barCommit(tb: number, per: number): void {
     if (this.barPI === this.barPI) { const j = this.barJ + (this.barIdx - this.barPI) - (tb - this.barPT) / per; this.barJ = j - 4 * Math.floor(j / 4); }
     this.barPT = tb; this.barPI = this.barIdx; const jr = this.barJr = Math.floor(this.barJ + 0.5);
-    const K = this.barK, L = this.barL, R = this.barR, slot = (((this.barIdx - jr) % 4) + 4) % 4;
-    for (let i = 0; i < 4; i++) { K[i] *= BAR_DECAY; L[i] *= BAR_DECAY; R[i] *= BAR_DECAY; this.barX[i] *= BAR_DECAY; }
+    const K = this.barK, L = this.barL, R = this.barR, T = this.barT, slot = (((this.barIdx - jr) % 4) + 4) % 4;
+    { const e = this.bE, a = this.bA, a1 = this.bA1, lv = this.bLv, gone = a < BAR_GAP_LO * lv; this.bA1 = a;
+      this.bLv = gone ? lv * BAR_LV_DN : lv + (a - lv) * BAR_LV_A;
+      if (gone) { if (this.barGap < 1000) this.barGap++; this.bE2 = this.bE1; this.bE1 = e; return; }
+      if (e >= BAR_RET_HI * lv) { if (this.barGap >= BAR_GAP_N && e >= 2 * a1) T[slot] += 1; this.barGap = 0; } }
+    for (let i = 0; i < 4; i++) { T[i] *= BAR_DECAY; K[i] *= BAR_DECAY; L[i] *= BAR_DECAY; R[i] *= BAR_DECAY; this.barX[i] *= BAR_DECAY; }
     K[slot] += this.bK; L[slot] += this.bL;
     { const e = this.bE, pm = this.bE1 > this.bE2 ? this.bE1 : this.bE2;
       if (this.bEm > 0 && e > pm) R[slot] += Math.min(BAR_R_MAX, (e - pm) / this.bEm);
@@ -441,7 +448,7 @@ export class BeatFeed {
     if (!(sK > 0)) return;
     let bi = 0, best = -1e9, second = -1e9;
     for (let i = 0; i < 4; i++) {
-      const v = K[i] / sK + (sR > 0 ? R[i] / sR : 0) + (sL > 0 ? BAR_W_BASS * L[i] / sL : 0)
+      const v = K[i] / sK + (sR > 0 ? R[i] / sR : 0) + (sL > 0 ? BAR_W_BASS * L[i] / sL : 0) + BAR_W_RET * T[i]
         + (sX > 0 ? BAR_W_BEAT * (X[(i + 1) & 3] + X[(i + 3) & 3] - X[i] - X[(i + 2) & 3]) / sX : 0);
       if (v > best) { second = best; best = v; bi = i; } else if (v > second) second = v;
     }
```

## Siffrorna (m2 = ettdom.json)
| fil | etta | omval | paslag | förskj 0/1/2/3 |
|---|---|---|---|---|
| 151659 | 97,5 (bas 97,75) | 0,00 | 79,4 | 97,5/0,6/0,6/1,2 |
| 171840 | 63,9 (bas 63,4) | 1,55 (bas 1,33) | 74,7 | 63,9/22,5/4,7/8,9 |
| 200719 | 69,2 (bas 68,9) | 1,23 (bas 1,47) | 80,8 | 69,2/6,2/18,2/6,3 |
| medel | 76,9 (bas 76,7) | 0,93 (bas 0,93) | 78,3 (bas 78,2) | poäng +0,23, OK |

Sämre: 171840 omval 1,33 -> 1,55 och förskjutning 1 13 -> 22 % (förskjutning 2 17 -> 5 %: rätt dragning efter låtgränsen 136 s men
landar ett slag fel); 151659 -0,25. Paslag oförändrat (ettan rör inte fasen).

## Risken
- Live-mic: basnivån följer rummet; en låg kickrumsnivå kan ge luckor som inte finns (frysen är ofarlig, återkomströsten mindre).
- Breaks utan bas men med virvel: frysen stoppar även backbeat-domen (barX ackumuleras men döms inte förrän basen är tillbaka).
- Återkomst på upptakt/fill (basen in på slag 4 eller 3 före ettan): rösten hamnar fel, läker på ~25 s.
- Musik utan trumma: få luckor/återkomster, varianten = bas.
- Kort sagt: kortet bär inte på den här övningen. Delarna är små och lätta att lyfta ut; B är värd att prova bara tillsammans
  med något som skiljer ett återkomstslag från en upptakt.
