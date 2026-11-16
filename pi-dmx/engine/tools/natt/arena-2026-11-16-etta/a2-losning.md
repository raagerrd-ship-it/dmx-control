# a2 KICKENS MÖNSTER

**IDÉN.** Ettan väljs där kickens mönster startar om: slaget där kicknivån stiger över det högsta av de två föregående slagen,
normerat mot låtens löpande kicknivå. Kicken kommer tillbaka efter en lucka eller ett svagare slag på ettan, och därför är det musikens etta.
Minnet är kortat (BAR_DECAY 0,99 -> 0,95, ungefär 5 takter) så att valet följer med när rutnätets slagindex hamnar fel mot musiken vid
mixövergångar. Marginalen är höjd (0,06 -> 0,10) för att hålla omvalen nere.

Egen analys före mätningen (Python på övningens wav, facit bara i analysen): särdraget "återstart" har 66/79/53 % av sin massa på
Beat This-ettan (151659/160345/172432). Dagens kickstigning har 30/29/30 %, ungefär slumpen.

## DELARNA

| del | vad den gör | mått den bär |
|---|---|---|
| D1 återstart (barR, bE/bE1/bE2/bEm) | per slag: R += max(0, kickmax - max(förra två slagen)) / löpande medel (1/16 per slag), summeras per plats och väger lika mycket som K | 160345: 31,9 -> 60,3 % (sond B mot m1). Ensam utan D2 ger den ingenting (sond A: 151659 41,2, 160345 27,1 mot bas 42,5 och 25,9) |
| D2 kort minne BAR_DECAY 0,95 | ungefär 20 slag minne i stället för 100 | 151659: 42,5 -> 60,5 % ensam (sond B), 160345 bara +6 pp ensam |
| D3 BAR_MARGIN 0,10 | hysteres mot omval med det kortare minnet | i simuleringen omval -0,1 till -0,2 per min, ej mätt separat |

D1 och D2 hör ihop: D1 behöver det korta minnet och D2 behöver D1 på 160345. Jokern ska ta båda.

## DIFFEN

Bara `src/analyserClock.ts`. Inga nya allokeringar per hop, bara en Float64Array(4) i konstruktorn och fyra tal.

```diff
diff --git a/src/analyserClock.ts b/.arena/etta/a2/src/analyserClock.ts
index 384c61c..b57dd70 100644
--- a/src/analyserClock.ts
+++ b/.arena/etta/a2/src/analyserClock.ts
@@ -25,7 +25,7 @@ const ONSET_WIN_MS = 5000, ONSET_EVERY_MS = 250, ONSET_BINS = 48, ONSET_RING = 1
 const FEED_RISE_HOPS = 6;
   // BASENS STIGNING
 const BREAK_HOLD_MS = 20000;
   // TVÅ RUTNÄT
 const BREAK_RESTORE_MS = Number(process.env.DMX_BREAK_RESTORE_MS ?? String(BREAK_HOLD_MS));
-const BAR_DECAY = 0.99, BAR_MIN = 16, BAR_MARGIN = 0.06, BAR_W_BASS = 0.5, BAR_W_BACK = 0.5, BAR_WIN0 = -0.2, BAR_WIN1 = 0.3, BAR_RISE_HOPS = 6;
   // ETTAN I EFFEKTKLOCKANS RUTNÄT
+const BAR_DECAY = 0.95, BAR_MIN = 16, BAR_MARGIN = 0.1, BAR_W_BASS = 0.5, BAR_W_BACK = 0.5, BAR_WIN0 = -0.2, BAR_WIN1 = 0.3, BAR_RISE_HOPS = 6;
   // ETTAN I EFFEKTKLOCKANS RUTNÄT
 const TG_HOLD = 1.35;
   // HELA TEMPOOMRÅDET
 const TG_SIB = [Math.round(Math.log2(4 / 3) * 139), Math.round(Math.log2(3 / 2) * 139)];
   // 4:3 och 3:2 i rutnätets steg
 const TG_SNAP = 0.03, TG_EDGE = 1.03, TG_OCT_UP = 0.85, TG_OCT_DN = 0.4, TG_OCT_A = 0.1;
@@ -85,6 +85,7 @@ export class BeatFeed {
   private goodOn = 0; private goodRep = 0; private goodAt = 0;
   // TAKTEN GENOM BREAKET
   private readonly barK = new Float64Array(4); private readonly barL = new Float64Array(4); private readonly barB = new Float64Array(4);
   // ETTAN (a5)
   private barN = 0; private barIdx = NaN; private bK = 0; private bL = 0; private bB = 0; private barOff = 0; barShifts = 0;
+  private readonly barR = new Float64Array(4); private bE = 0; private bE1 = 0; private bE2 = 0; private bEm = 0;   // a2 KICKENS MÖNSTER
   private readonly linK = new Float64Array(BAR_RISE_HOPS); private readonly linL = new Float64Array(BAR_RISE_HOPS); private linPos = 0;
   private innerAnchor = 0; private innerBpm = 0; private innerValid = false;
   private readonly anaGrid = { anchorMs: 0, bpm: 0, confidence: 0 };
   // EN KÄLLA
@@ -386,7 +387,7 @@ export class BeatFeed {
     return false;
   }
 
-  private barReset(): void { this.barK.fill(0); this.barL.fill(0); this.barB.fill(0); this.barN = 0; this.barIdx = NaN; this.barOff = 0; }
+  private barReset(): void { this.barK.fill(0); this.barL.fill(0); this.barB.fill(0); this.barR.fill(0); this.bE1 = 0; this.bE2 = 0; this.bEm = 0; this.barN = 0; this.barIdx = NaN; this.barOff = 0; }
 
   /** ETTAN (se BAR_DECAY). */
   private barStep(frame: Frame, beat: NonNullable<EngineConfig["beat"]>, now: number): void {
@@ -396,10 +397,11 @@ export class BeatFeed {
     const pos = (now - beat.anchorMs) / (60000 / beat.bpm), idx = Math.floor(pos - BAR_WIN0);
     if (idx !== this.barIdx) {
       if (idx === this.barIdx + 1) this.barCommit();
-      this.barIdx = idx; this.bK = 0; this.bL = 0; this.bB = 0;
+      this.barIdx = idx; this.bK = 0; this.bL = 0; this.bB = 0; this.bE = 0;
     }
     if (pos - idx <= BAR_WIN1) {
       if (rk > this.bK) this.bK = rk;
+      if (k > this.bE) this.bE = k;
       if (rl > this.bL) this.bL = rl;
       const hb = (frame.onset?.highMid ?? 0) + (frame.onset?.treble ?? 0); if (hb > this.bB) this.bB = hb;
     }
@@ -407,16 +409,19 @@ export class BeatFeed {
 
   /** Slaget barIdx är färdigmätt. */
   private barCommit(): void {
-    const K = this.barK, L = this.barL, B = this.barB, slot = ((this.barIdx % 4) + 4) % 4;
-    for (let i = 0; i < 4; i++) { K[i] *= BAR_DECAY; L[i] *= BAR_DECAY; B[i] *= BAR_DECAY; }
+    const K = this.barK, L = this.barL, B = this.barB, R = this.barR, slot = ((this.barIdx % 4) + 4) % 4;
+    for (let i = 0; i < 4; i++) { K[i] *= BAR_DECAY; L[i] *= BAR_DECAY; B[i] *= BAR_DECAY; R[i] *= BAR_DECAY; }
     K[slot] += this.bK; L[slot] += this.bL; B[slot] += this.bB;
+    { const e = this.bE, pm = this.bE1 > this.bE2 ? this.bE1 : this.bE2;
+      if (this.bEm > 0 && e > pm) R[slot] += (e - pm) / this.bEm;
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
     if (bi !== this.barOff && best - second >= BAR_MARGIN) { this.barOff = bi; this.barShifts++; }
```

Ovan är hela `git diff --no-index src .arena/etta/a2/src`. Radsluten är bevarade, så diffen går att applicera.

## SIFFRORNA (m1 = ettdom.json = ettdom-m1.json; m2 inte använd)

| fil | etta bas -> a2 | förskjutning 0/1/2/3 | omval bas -> a2 | paslag bas -> a2 |
|---|---|---|---|---|
| 151659 | 42,5 -> 62,8 | 63/13/12/13 | 1,28 -> 1,17 | 78,0 -> 78,0 |
| 172432 | 32,0 -> 49,2 | 49/29/8/14 | 1,51 -> **2,09** | 51,2 -> 50,8 |
| 160345 | 25,9 -> 60,3 | 60/11/19/10 | 1,44 -> 1,33 | 81,8 -> 82,1 |
| medel | 33,5 -> 57,4 | | 1,41 -> 1,53 | 70,4 -> 70,3 |

**Poäng +23,35, ingen spärr.** Det som blev sämre: omvalen i 172432 (+0,57 per min). Där står 29 % på förskjutning 1, alltså att
slaget före ettan väljs. Det tyder på en upptakt där kicken kommer tillbaka på fyran.

## RISKEN

- Med det korta minnet (cirka 5 takter) kan en fill eller en upptaktskick på fyran flytta ettan ett slag. Det syns i 172432.
- Musik utan trumma, eller four-on-the-floor helt utan luckor: där ger D1 nästan ingenting och valet faller tillbaka på K/L/B med kort minne, så det kan bli fler omval.
- Breaks: bE1/bE2 håller det sista slaget före breaket, så att kicken kommer tillbaka på ettan efter ett break blir ett starkt och korrekt vittne. Hamnar rutnätet ett slag fel i breaket väljs ettan om i stället inom ungefär 2 takter.
- Live-mic: särdraget är normerat mot den löpande nivån, så det tål gain. Rumsbas som brummar sänker kontrasten.
- Tempo och fas är orörda (paslag oförändrat), men drop- och klockdomarnas kontroller är inte körda.
