# a7 OMVALEN - mjuk låtgräns i taktmodellen

**Idén.** Ettan väljs som förut efter basens stigning, kickens återstart, basgången och backbeaten, men vid en OSÄKER låtgräns
(relock med soft = true: varken boundSure eller tystnad) glöms taktmodellens minne inte helt: 10 % av röstsummorna förs över,
vridna med glidräkningen jr så att platserna stämmer i det nya slagindexet. En falsk gräns i samma låt fortsätter då på samma
etta, medan en riktig gräns (säker eller tystnad) nollställer som förr och väljer efter 16 slag precis som i bas.

**Vad omvalen beror på (mätt med loggade barM/jr/reset på 200719 och 171840, 2 sonder).** Av 25 + 6 omval:
- ~9 är facit: Beat This lägger 2-slagstakter (200719: 313-355, 488-508, 595-608 s) eller udda takter (44-70 s), så måttet flippar 0/2.
- ~6 är fel tempo: 200719 119-180 s står motorn på 89 bpm mot Beat This 130 (2/3), paren blir slump. Utanför ettan.
- ~7 ligger vid låtgränser (relock + nytt beslut efter BAR_MIN), varav flera i mixens gränskluster (629-684, 987-1037 s).
- bara 2 är taktmodellens egna falska byten (171840 180,3 s 0->3 och tillbaka 183,4 s). Övriga barM-byten mitt i låt
  (171840 49,8 s efter Beat This 5-slagstakt, 195,7 s; 200719 184,1 s, 823,7 s) är RÄTTELSER.
Slutsats: en trögare röst (håll) kostar mer än den sparar.

**DELARNA**

| del | vad den gör | mått |
|---|---|---|
| BAR_KEEP = 0.1 + barRot (barReset(keep)) | 10 % av K/L/R/X förs över en mjuk låtgräns, vridna med jr | m2: etta +0,15 (171840 +0,47, 151659 +0,13, 200719 -0,13), omval -0,02 (200719 1,47->1,41) |
| PRÖVAT, STRUKET: håll BAR_HOLD = 8 | utmanaren måste vinna 8 slag i rad (första bytet efter gräns fritt) | m1 (med KEEP): 171840 omval 1,33->0,89 men etta 63,4->60,0 (49,8 s-rättelsen 7 s sen), 200719 rättelsen 184 s försenad 29 s; poäng -0,6 |

**DIFFEN** (`git diff --no-index src .arena/etta2/a7/src`; originalfilen har ensamma CR före en del kommentarer, se a7/src för exakt byte)

```diff
diff --git a/src/analyserClock.ts b/.arena/etta2/a7/src/analyserClock.ts
index 0bbcb78..787ee6b 100644
--- a/src/analyserClock.ts
+++ b/.arena/etta2/a7/src/analyserClock.ts
@@ -25,7 +25,7 @@ const ONSET_WIN_MS = 5000, ONSET_EVERY_MS = 250, ONSET_BINS = 48, ONSET_RING = 1
 const FEED_RISE_HOPS = 6;   // BASENS STIGNING
 const BREAK_HOLD_MS = 20000;   // TVÅ RUTNÄT
 const BREAK_RESTORE_MS = Number(process.env.DMX_BREAK_RESTORE_MS ?? String(BREAK_HOLD_MS));
-const BAR_DECAY = 0.99, BAR_MIN = 16, BAR_MARGIN = 0.06, BAR_W_BASS = 0.5, BAR_WIN0 = -0.2, BAR_WIN1 = 0.3, BAR_RISE_HOPS = 6, BAR_R_MAX = 2, BAR_W_BEAT = 0.25, BAR_Q = 8, BAR_BEAT_Q = 2;   // ETTAN I EFFEKTKLOCKANS RUTNÄT
+const BAR_DECAY = 0.99, BAR_MIN = 16, BAR_MARGIN = 0.06, BAR_W_BASS = 0.5, BAR_WIN0 = -0.2, BAR_WIN1 = 0.3, BAR_RISE_HOPS = 6, BAR_R_MAX = 2, BAR_W_BEAT = 0.25, BAR_Q = 8, BAR_BEAT_Q = 2, BAR_KEEP = 0.1;   // ETTAN I EFFEKTKLOCKANS RUTNÄT
 const TG_HOLD = 1.35;   // HELA TEMPOOMRÅDET
 const TG_SIB = [Math.round(Math.log2(4 / 3) * 139), Math.round(Math.log2(3 / 2) * 139)];   // 4:3 och 3:2 i rutnätets steg
 const TG_SNAP = 0.03, TG_EDGE = 1.03, TG_OCT_UP = 0.85, TG_OCT_DN = 0.4, TG_OCT_A = 0.1;
@@ -85,7 +85,7 @@ export class BeatFeed {
   private goodOn = 0; private goodRep = 0; private goodAt = 0;   // TAKTEN GENOM BREAKET
   private readonly barK = new Float64Array(4); private readonly barL = new Float64Array(4);   // ETTAN (a5)
   private barN = 0; private barIdx = NaN; private bK = 0; private bL = 0; private barOff = 0; barShifts = 0;
-  private barM = 0; private barJ = 0; private barJr = 0; private barPT = 0; private barPI = NaN;   // ettan räknas i musikens slag (a1, per slag a6)
+  private barM = 0; private readonly barTmp = new Float64Array(4); private barJ = 0; private barJr = 0; private barPT = 0; private barPI = NaN;   // ettan räknas i musikens slag (a1, per slag a6)
   private readonly barR = new Float64Array(4); private bE = 0; private bE1 = 0; private bE2 = 0; private bEm = 0;   // kickens återstart (a2)
   private readonly barX = new Float64Array(4); private readonly barV = new Float64Array(BAR_Q); private readonly barVc = new Float64Array(BAR_Q); private barTi = NaN; private barTe = 0;   // backbeaten (a8r)
   private readonly linK = new Float64Array(BAR_RISE_HOPS); private readonly linL = new Float64Array(BAR_RISE_HOPS); private linPos = 0;
@@ -389,7 +389,8 @@ export class BeatFeed {
     return false;
   }
 
-  private barReset(): void { this.barK.fill(0); this.barL.fill(0); this.barR.fill(0); this.barX.fill(0); this.barTi = NaN; this.bE1 = 0; this.bE2 = 0; this.bEm = 0; this.barN = 0; this.barIdx = NaN; this.barM = this.barOff & 3; this.barJ = 0; this.barJr = 0; this.barPI = NaN; }
+  private barRot(A: Float64Array, r: number, f: number): void { const T = this.barTmp; T.set(A); for (let c = 0; c < 4; c++) A[c] = f * T[(c - r) & 3]; }
+  private barReset(keep = false): void { const r = this.barJr & 3, f = keep ? BAR_KEEP : 0; this.barRot(this.barK, r, f); this.barRot(this.barL, r, f); this.barRot(this.barR, r, f); this.barRot(this.barX, r, f); this.barTi = NaN; this.bE1 = 0; this.bE2 = 0; this.bEm = 0; this.barN = 0; this.barIdx = NaN; this.barM = this.barOff & 3; this.barJ = 0; this.barJr = 0; this.barPI = NaN; }
 
   /** ETTAN (se BAR_DECAY). */
   private barStep(frame: Frame, beat: NonNullable<EngineConfig["beat"]>, now: number): void {
@@ -450,7 +451,7 @@ export class BeatFeed {
 
   /** LÅTGRÄNSEN. */
   private relock(soft: boolean): void {
-    this.tgReset(soft); this.barReset(); this.goodRep = 0; this.goodOn = 0; this.onNext = 0;
+    this.tgReset(soft); this.barReset(soft); this.goodRep = 0; this.goodOn = 0; this.onNext = 0;
   }
 
   /** MINNET VID GRÄNSEN. */
```

**SIFFRORNA** (m2, poäng +0,25 mot bas, ingen spärr)

| fil | etta | omval | paslag | förskj 0/1/2/3 |
|---|---|---|---|---|
| 151659 | 97,9 (bas 97,8) | 0,00 (0,00) | 79,4 | 98/0/0/1 |
| 171840 | 63,8 (63,4) | 1,33 (1,33) | 74,5 | 64/13/17/6 |
| 200719 | 68,8 (68,9) | 1,41 (1,47) | 80,8 | 69/7/18/6 |

Sämre: 200719 etta -0,13 och förskjutning 2 15,5 -> 18,0 % (1/3-felet är kvar och ett par minnen bär det över gränsen).

**RISKEN.** Liten effekt (+0,25), knappt mer än en ren omfördelning. Vid en riktig låtbyte som gränsdetektorn bara tror på
(soft) väger förra låtens etta ~10 slag mot de 16 nya; är nya låtens bevis svaga (intro utan trumma, break) kan förra
ettan dröja kvar några takter. Säkra gränser och tystnad nollställer som förr. Inget nytt per hop (barTmp förallokerad,
vridningen körs bara vid relock). Den verkliga omvalskällan på okänd musik är tempot (2/3-fel) och Beat This 2/4-tolkning,
inte taktmodellen - det är där nästa runda bör leta, inte i en trögare röst.
