# a6r (remixkort r-stabil): ettan sitter still. Glidräkning per färdigmätt slag + relock som inte rör tempot

## IDÉN
Utgångspunkten är r0. Två delar byts, inga läggs till. (1) Glidrättningen räknas per färdigmätt slag ur rutnätets egna slagtider (a6) i stället för per hopp (a1): J += Δidx − Δtb/per vid varje barCommit, och ramen (jr) byts bara där. (2) Relock flyttar inte längre det inre ankaret. barOff behåller hela förskjutningen och barM startar på barOff & 3, så den publicerade ettan fortsätter utan extra tick. Ettan kan därmed aldrig putta tempot eller fasen efter en låtgräns. Beslutet (andelar + marginal + a2:s återstart med tak) och "barOff ökar bara" är r0:s och orörda.

## DELAR
| del | från vem | mått den bär (siffra) |
|---|---|---|
| Glidrättning per slag (barJ, barJr, barPT, barPI i barCommit) | a6 (r1:s D1), ersätter a1:s per-hopp-J | sim på r0:s egen körning (samma rutnät, sond 1-2): 160345 77,1 → 88,0 %, omval 1,54 → 0,62; 172432 66,8 → 66,1 (oförändrad). Mätt m1 (bara den här): 160345 78,7 → 89,9, omval 1,03 → 0,62, men 172432 67,5 → 48,2 (se nästa rad) |
| Relock utan ankarskifte (barM = barOff & 3, barOff kvar) | a6 (r1:s m2-prov), ersätter r0:s `innerAnchor += (barOff & 3)·per` | m1 → m2: 172432 48,2 → 70,2 %, omval 1,20 → 0,94; summan +7,8 poäng mot m1. Skäl: skiftet gör tempot efter varje relock beroende av ettans val (cbpm r0 mot a6r m1 skiljer i 30-37 % av raderna efter första relocken), så varje ettbyte gav ett nytt rutnät. Nu beror tempot inte på ettan alls |
| Andelsbeslutet + a2:s återstart R (BAR_R_MAX 2) | r0 (bas/a2/fusion) | orört; simen fann inget bättre: hold 2-32, marginal 0,04-0,15, decay 0,98-0,995, rmax 1/4 gav −0,6 till −10 eller brus (+1) |
| barOff ökar bara (inget extra tick) | fusion | orört; gäller nu även vid relock (d = 0). Tick a6r/bas: 1035/1064, 2054/2098, 1109/1173 |

## VALT BORT
- **Håll på beslutet (barM byts först efter H slag i rad):** simen på r0:s körning gav −0,8 (H 2) till −6,7 (H 16). Omvalen kommer inte från barM. Bara 30 av 246 barOff-ändringar i 172432 och 12 av 142 i 160345 kom från barM, resten från ramen.
- **Håll på ramen (jr publiceras först efter H stabila slag):** −0,9 till −12. Ramens snabba byten är mest rätt.
- **Dödzon på små ankarhopp (0,15-0,45):** −4 till −22. Små fasrättningar måste räknas.
- Större marginal eller längre minne: inget som bär (−0,6 till −2,8).

## SIFFRORNA (ettdom; ettdom.json = ettdom-m2.json = koden i src; m1-koden i m1-analyserClock.ts.txt)
| fil | etta r0 → m1 → **m2** | omval r0 → m2 | paslag bas → m2 |
|---|---|---|---|
| 151659 | 93,2 → 91,1 → **91,1** | 0,12 → 0,35 | 78,0 → 79,4 |
| 172432 | 67,5 → 48,2 → **70,2** | 1,20 → 0,94 | 51,2 → 50,9 |
| 160345 | 78,7 → 89,9 → **89,9** | 1,03 → 0,62 | 81,8 → 82,6 |
| medel | 79,8 → 76,4 → **83,7** | 0,78 → 0,63 | 70,36 → 70,98 |
Poäng m2: **+4,66 mot r0**, +54,15 mot bas (m1: −3,09 mot r0). Sämre: 151659 −2,1 pe etta och omval 0,12 → 0,35, eftersom ramen byts en takt senare än per hopp. 172432 paslag −0,3 mot bas.

## RISKER
- Ramen byts vid barCommit (0,2 slag före nästa slag). Ett ankarhopp mitt i slaget syns ett slag senare än i r0. En takt fel i 151659.
- barOff nollas inte vid relock (växer ~+2 per ettbyte). Det är ett heltal gånger per i ankaret och tål många tusen byten. beatIdx % 16 är inte förankrad i musiken, som i r0.
- Tempot efter relock är fortfarande inte bit-identiskt med BAS (bas skiftar med sin egen barOff), men det är nu samma oavsett vad ettan väljer. 151659 är identiskt med bas (cbpm 0 %).
- 172432-svängningen (48 → 70 av en ändring som inte rör beslutet) visar att mätningen efter relockar är kaotisk, ±10-20 pe per fil. Mellanmängdens 200719 kan landa åt båda hållen. Delen som bär oavsett kaos är ramen per slag (samma rutnät i simen: 160345 +11, 172432 ±0).
- Musik utan trumma, breaks och live-mic: som r0 (samma särdrag och beslut).
- Sonder: 2 (dump2.mjs på r0-dist, 172432 och 160345). Simulatorer: simr.py (exakt mot r0, 100 % barM), simj.py, simh.py.

## DIFFEN (git diff --no-index --ignore-cr-at-eol .arena/etta/bas/src .arena/etta/a6r/src)
```diff
diff --git a/.arena/etta/bas/src/analyserClock.ts b/.arena/etta/a6r/src/analyserClock.ts
index 384c61c..1f2d67d 100644
--- a/.arena/etta/bas/src/analyserClock.ts
+++ b/.arena/etta/a6r/src/analyserClock.ts
@@ -25,7 +25,7 @@ const ONSET_WIN_MS = 5000, ONSET_EVERY_MS = 250, ONSET_BINS = 48, ONSET_RING = 1
 const FEED_RISE_HOPS = 6;   // BASENS STIGNING
 const BREAK_HOLD_MS = 20000;   // TVÅ RUTNÄT
 const BREAK_RESTORE_MS = Number(process.env.DMX_BREAK_RESTORE_MS ?? String(BREAK_HOLD_MS));
-const BAR_DECAY = 0.99, BAR_MIN = 16, BAR_MARGIN = 0.06, BAR_W_BASS = 0.5, BAR_W_BACK = 0.5, BAR_WIN0 = -0.2, BAR_WIN1 = 0.3, BAR_RISE_HOPS = 6;   // ETTAN I EFFEKTKLOCKANS RUTNÄT
+const BAR_DECAY = 0.99, BAR_MIN = 16, BAR_MARGIN = 0.06, BAR_W_BASS = 0.5, BAR_W_BACK = 0.5, BAR_WIN0 = -0.2, BAR_WIN1 = 0.3, BAR_RISE_HOPS = 6, BAR_R_MAX = 2;   // ETTAN I EFFEKTKLOCKANS RUTNÄT
 const TG_HOLD = 1.35;   // HELA TEMPOOMRÅDET
 const TG_SIB = [Math.round(Math.log2(4 / 3) * 139), Math.round(Math.log2(3 / 2) * 139)];   // 4:3 och 3:2 i rutnätets steg
 const TG_SNAP = 0.03, TG_EDGE = 1.03, TG_OCT_UP = 0.85, TG_OCT_DN = 0.4, TG_OCT_A = 0.1;
@@ -85,6 +85,8 @@ export class BeatFeed {
   private goodOn = 0; private goodRep = 0; private goodAt = 0;   // TAKTEN GENOM BREAKET
   private readonly barK = new Float64Array(4); private readonly barL = new Float64Array(4); private readonly barB = new Float64Array(4);   // ETTAN (a5)
   private barN = 0; private barIdx = NaN; private bK = 0; private bL = 0; private bB = 0; private barOff = 0; barShifts = 0;
+  private barM = 0; private barJ = 0; private barJr = 0; private barPT = 0; private barPI = NaN;   // ettan räknas i musikens slag (a1, per slag a6)
+  private readonly barR = new Float64Array(4); private bE = 0; private bE1 = 0; private bE2 = 0; private bEm = 0;   // kickens återstart (a2)
   private readonly linK = new Float64Array(BAR_RISE_HOPS); private readonly linL = new Float64Array(BAR_RISE_HOPS); private linPos = 0;
   private innerAnchor = 0; private innerBpm = 0; private innerValid = false;
   private readonly anaGrid = { anchorMs: 0, bpm: 0, confidence: 0 };   // EN KÄLLA
@@ -386,45 +388,51 @@ export class BeatFeed {
     return false;
   }
 
-  private barReset(): void { this.barK.fill(0); this.barL.fill(0); this.barB.fill(0); this.barN = 0; this.barIdx = NaN; this.barOff = 0; }
+  private barReset(): void { this.barK.fill(0); this.barL.fill(0); this.barB.fill(0); this.barR.fill(0); this.bE1 = 0; this.bE2 = 0; this.bEm = 0; this.barN = 0; this.barIdx = NaN; this.barM = this.barOff & 3; this.barJ = 0; this.barJr = 0; this.barPI = NaN; }
 
   /** ETTAN (se BAR_DECAY). */
   private barStep(frame: Frame, beat: NonNullable<EngineConfig["beat"]>, now: number): void {
     const sa = frame.specAbs, p = this.linPos, k = (sa?.sub ?? 0) + (sa?.kick ?? 0), l = sa?.bass ?? 0;
     const rk = k - this.linK[p], rl = l - this.linL[p]; this.linK[p] = k; this.linL[p] = l; this.linPos = (p + 1) % BAR_RISE_HOPS;
     if (!(beat.bpm > 40)) return;
-    const pos = (now - beat.anchorMs) / (60000 / beat.bpm), idx = Math.floor(pos - BAR_WIN0);
+    const per = 60000 / beat.bpm, pos = (now - beat.anchorMs) / per, idx = Math.floor(pos - BAR_WIN0);
     if (idx !== this.barIdx) {
-      if (idx === this.barIdx + 1) this.barCommit();
-      this.barIdx = idx; this.bK = 0; this.bL = 0; this.bB = 0;
+      if (idx === this.barIdx + 1) this.barCommit(beat.anchorMs + this.barIdx * per, per);
+      this.barIdx = idx; this.bK = 0; this.bL = 0; this.bB = 0; this.bE = 0;
     }
     if (pos - idx <= BAR_WIN1) {
       if (rk > this.bK) this.bK = rk;
+      if (k > this.bE) this.bE = k;
       if (rl > this.bL) this.bL = rl;
       const hb = (frame.onset?.highMid ?? 0) + (frame.onset?.treble ?? 0); if (hb > this.bB) this.bB = hb;
     }
+    { const d = ((((this.barM + this.barJr - this.barOff) % 4) + 4) % 4); if (d) this.barOff += d; }
   }
 
   /** Slaget barIdx är färdigmätt. */
-  private barCommit(): void {
-    const K = this.barK, L = this.barL, B = this.barB, slot = ((this.barIdx % 4) + 4) % 4;
-    for (let i = 0; i < 4; i++) { K[i] *= BAR_DECAY; L[i] *= BAR_DECAY; B[i] *= BAR_DECAY; }
+  private barCommit(tb: number, per: number): void {
+    if (this.barPI === this.barPI) { const j = this.barJ + (this.barIdx - this.barPI) - (tb - this.barPT) / per; this.barJ = j - 4 * Math.floor(j / 4); }
+    this.barPT = tb; this.barPI = this.barIdx; const jr = this.barJr = Math.floor(this.barJ + 0.5);
+    const K = this.barK, L = this.barL, B = this.barB, R = this.barR, slot = (((this.barIdx - jr) % 4) + 4) % 4;
+    for (let i = 0; i < 4; i++) { K[i] *= BAR_DECAY; L[i] *= BAR_DECAY; B[i] *= BAR_DECAY; R[i] *= BAR_DECAY; }
     K[slot] += this.bK; L[slot] += this.bL; B[slot] += this.bB;
+    { const e = this.bE, pm = this.bE1 > this.bE2 ? this.bE1 : this.bE2;
+      if (this.bEm > 0 && e > pm) R[slot] += Math.min(BAR_R_MAX, (e - pm) / this.bEm);
+      this.bE2 = this.bE1; this.bE1 = e; this.bEm += (e - this.bEm) / 16; }
     if (this.barN < 1000) this.barN++;
     if (this.barN < BAR_MIN) return;
-    const sK = K[0] + K[1] + K[2] + K[3], sL = L[0] + L[1] + L[2] + L[3], sB = B[0] + B[1] + B[2] + B[3];
+    const sK = K[0] + K[1] + K[2] + K[3], sL = L[0] + L[1] + L[2] + L[3], sB = B[0] + B[1] + B[2] + B[3], sR = R[0] + R[1] + R[2] + R[3];
     if (!(sK > 0)) return;
     let bi = 0, best = -1e9, second = -1e9;
     for (let i = 0; i < 4; i++) {
-      const v = K[i] / sK + (sL > 0 ? BAR_W_BASS * L[i] / sL : 0) - (sB > 0 ? BAR_W_BACK * B[i] / sB : 0);
+      const v = K[i] / sK + (sR > 0 ? R[i] / sR : 0) + (sL > 0 ? BAR_W_BASS * L[i] / sL : 0) - (sB > 0 ? BAR_W_BACK * B[i] / sB : 0);
       if (v > best) { second = best; best = v; bi = i; } else if (v > second) second = v;
     }
-    if (bi !== this.barOff && best - second >= BAR_MARGIN) { this.barOff = bi; this.barShifts++; }
+    if (bi !== this.barM && best - second >= BAR_MARGIN) { this.barM = bi; this.barShifts++; }
   }
 
   /** LÅTGRÄNSEN. */
   private relock(soft: boolean): void {
-    if (this.innerValid && this.innerBpm > 0) this.innerAnchor += this.barOff * (60000 / this.innerBpm);
     this.tgReset(soft); this.barReset(); this.goodRep = 0; this.goodOn = 0; this.onNext = 0;
   }
 
```
