# a5 etta3: asymmetrisk tröghet + taktminnet över låtgränsen

**IDÉN.** Ettan får bara flyttas 2 slag (till trean) om utmanaren leder med 3 x marginalen 8 slag i rad, när valet är "fast" (64 slag där det vunnit med marginal); 1-slagsbyten är billiga som förut. Och en mjuk låtgräns (utan tystnad) nollar inte längre taktmodellens röster utan halverar dem, så det starka beviset från förra låten (en DJ mixar fras mot fras) väger mot den nya låtens svaga intro, som annars väljer trean.

## DELARNA
| del | vad den gör | mått (m2, övning) | varifrån |
|---|---|---|---|
| A tröghet (BAR_M2 3, BAR_P2 8, BAR_FIRM 64) | 2-slagsbyte dyrare än 1-slag, bara när valet är fast; fasthet nollas vid tystnad > 10 s | ensam (m1, FIRM 16, M2 2,5): ren 86,6 -> 85,7 (151659 -2,7, försenad första rättelse), övrigt ±0. Sond 3 (A + fasthet över gränsen, utan B): 171840 75 -> 55 | kortet |
| B minnet över gränsen (BAR_BND_KEEP 0,5) | relock utan tystnad: K/L/R/X x 0,5, barM/barJ/fasthet behålls (ingen omvridning behövs, jr nollas inte) | sond 4: 171840 75,3 -> 99,5. m2 totalt: 171840 +24,2, 200719 +1,0, 151659 -10,3 | etta2 a7 (behöll 10 %, med vridning) |

Jokern: B är delen som bär poängen. A ensam är ±0 till negativ; ska bara följa med om B står kvar (A skyddar B:s val mot att intro-bevisen vänder det).

## KOSTNADEN
Allt i barCommit (en gång per slag, i den tråd BeatFeed redan kör): ~6 jämförelser per slag, 16 multiplikationer per låtgräns. Ingen ny FFT, ingen allokering per hop (en Float64Array(4) per instans). Nytt minne ~0 MB.

## SIFFRORNA (etta3dom, m2 = levererad)
| fil | bas ren/trean | m2 ren/trean | etta alla | omval | paslag | FEL |
|---|---|---|---|---|---|---|
| 151659 | 92,8/6,0 | 82,5/6,9 | 93,9 -> 88,0 | 0,12 -> 0,58 | 96,4 | 10,4 -> 10,2 |
| 171840 | 75,3/21,8 | 99,5/0,0 | 74,8 -> 92,6 | 0,64 -> 0,21 | 89,1 -> 89,0 | 7,4 |
| 200719 | 91,8/4,9 | 92,8/1,6 | 67,0 -> 70,3 | 1,47 -> 1,11 | 90,1 -> 89,7 | 13,0 -> 15,0 |
Medel: ren 86,6 -> 91,6, trean 10,9 -> 2,8, omval 0,74 -> 0,64. **Poäng +5,50, ingen spärr.**
Sämre: 151659 423-484 s (en ny låt som inte ligger fras mot fras, förskjuten 1 slag; det halverade gamla minnet tar ~60 s att glömma), 200719 FEL +2,0 (inom spärren +2, men på gränsen).

## RISKEN
- Vinsten är EN gräns i 171840 och förlusten EN gräns i 151659: övningsvinsten är tunn, kan falla på okänd musik.
- Låtbyten som inte är frasmixade (radio, Spotify-växling utan tystnad): fel etta upp till ~1 min efter bytet.
- A gör en riktig rättelse 2 slag långsammare (8 slag + 3 x marginal), t.ex. efter en 2-slagstakt i musiken.
- Tystnad > 10 s nollar allt som förut, så spellistor med paus påverkas inte.

## ÄRLIGHET
Tidigt körde jag mitt tidslinjeskript (Beat This-facit) också på basens kr-json för 193040, 193818 och 160345, innan jag läst regeln färdigt. Inget av det användes: alla val ovan bygger på övningsfilerna 151659/171840/200719 och deras sonder.

## DIFFEN
Hela diffen (mot .arena/etta3/bas/src, appliceras på basen): `.arena/etta3/a5/a5.diff`, nedan.
```diff
diff --git a/.arena/etta3/bas/src/analyserClock.ts b/.arena/etta3/a5/src/analyserClock.ts
index 0832641..790562f 100644
--- a/.arena/etta3/bas/src/analyserClock.ts
+++ b/.arena/etta3/a5/src/analyserClock.ts
@@ -30,6 +30,7 @@ const BAR_DECAY = 0.99, BAR_MIN = 16, BAR_MARGIN = 0.06, BAR_W_BASS = 0.5, BAR_W
 const TG_HOLD = 1.35;   // HELA TEMPOOMRÅDET
 const TG_SIB = [Math.round(Math.log2(4 / 3) * 139), Math.round(Math.log2(3 / 2) * 139)];   // 4:3 och 3:2 i rutnätets steg
 const TG_SNAP = 0.03, TG_EDGE = 1.03, TG_OCT_UP = 0.85, TG_OCT_DN = 0.4, TG_OCT_A = 0.1;
+const BAR_M2 = 3, BAR_P2 = 8, BAR_FIRM = 64, BAR_BND_KEEP = 0.5;   // ASYMMETRISK TRÖGHET (a5 etta3)
 const KICK_PHASE_MS = 45;   // EN KÄLLA
 const TG_GRID_EXTRA_MS = 5;   // a8r (ladan-provet 11-08, punkt 3)
 const TG_WIN_MS = 5000, TG_FULL_N = 900, TG_FWIN_MS = 3500, TG_FFULL_N = 630, TG_FA = 0.4, TG_SW_STEPS = 6, TG_SW_N = 2;   // TEMPOGRAMMETS FÖNSTER OCH MINNE
@@ -91,6 +92,7 @@ export class BeatFeed {
   private barM = 0; private barJ = 0; private barJr = 0; private barPT = 0; private barPI = NaN;   // ettan räknas i musikens slag (a1, per slag a6)
   private readonly barR = new Float64Array(4); private bE = 0; private bE1 = 0; private bE2 = 0; private bEm = 0;   // kickens återstart (a2)
   private readonly barX = new Float64Array(4); private readonly barV = new Float64Array(BAR_Q); private readonly barVc = new Float64Array(BAR_Q); private barTi = NaN; private barTe = 0;   // backbeaten (a8r)
+  private readonly barS = new Float64Array(4); private barFirm = 0; private barC2 = -1; private barC2n = 0;   // tröghet
   private readonly linK = new Float64Array(BAR_RISE_HOPS); private readonly linL = new Float64Array(BAR_RISE_HOPS); private linPos = 0;
   private innerAnchor = 0; private innerBpm = 0; private innerValid = false;
   private readonly anaGrid = { anchorMs: 0, bpm: 0, confidence: 0 };   // EN KÄLLA
@@ -412,7 +414,7 @@ export class BeatFeed {
     return false;
   }
 
-  private barReset(): void { this.barK.fill(0); this.barL.fill(0); this.barR.fill(0); this.barX.fill(0); this.barTi = NaN; this.bE1 = 0; this.bE2 = 0; this.bEm = 0; this.barN = 0; this.barIdx = NaN; this.barM = this.barOff & 3; this.barJ = 0; this.barJr = 0; this.barPI = NaN; }
+  private barReset(): void { this.barK.fill(0); this.barL.fill(0); this.barR.fill(0); this.barX.fill(0); this.barTi = NaN; this.bE1 = 0; this.bE2 = 0; this.bEm = 0; this.barN = 0; this.barIdx = NaN; this.barM = this.barOff & 3; this.barJ = 0; this.barJr = 0; this.barPI = NaN; this.barC2 = -1; this.barC2n = 0; }
 
   /** ETTAN (se BAR_DECAY). */
   private barStep(frame: Frame, beat: NonNullable<EngineConfig["beat"]>, now: number): void {
@@ -459,21 +461,27 @@ export class BeatFeed {
       this.bE2 = this.bE1; this.bE1 = e; this.bEm += (e - this.bEm) / 16; }
     if (this.barN < 1000) this.barN++;
     if (this.barN < BAR_MIN) return;
-    const sK = K[0] + K[1] + K[2] + K[3], sL = L[0] + L[1] + L[2] + L[3], sR = R[0] + R[1] + R[2] + R[3], X = this.barX;
+    const sK = K[0] + K[1] + K[2] + K[3], sL = L[0] + L[1] + L[2] + L[3], sR = R[0] + R[1] + R[2] + R[3], X = this.barX, S = this.barS;
     const sX = Math.abs(X[0]) + Math.abs(X[1]) + Math.abs(X[2]) + Math.abs(X[3]);
     if (!(sK > 0)) return;
     let bi = 0, best = -1e9, second = -1e9;
     for (let i = 0; i < 4; i++) {
-      const v = K[i] / sK + (sR > 0 ? R[i] / sR : 0) + (sL > 0 ? BAR_W_BASS * L[i] / sL : 0)
+      const v = S[i] = K[i] / sK + (sR > 0 ? R[i] / sR : 0) + (sL > 0 ? BAR_W_BASS * L[i] / sL : 0)
         + (sX > 0 ? BAR_W_BEAT * (X[(i + 1) & 3] + X[(i + 3) & 3] - X[i] - X[(i + 2) & 3]) / sX : 0);
       if (v > best) { second = best; best = v; bi = i; } else if (v > second) second = v;
     }
-    if (bi !== this.barM && best - second >= BAR_MARGIN) { this.barM = bi; this.barShifts++; }
+    if (bi === this.barM) { this.barC2n = 0; if (best - second >= BAR_MARGIN && this.barFirm < BAR_FIRM) this.barFirm++; return; }
+    if (((bi - this.barM) & 3) !== 2 || this.barFirm < BAR_FIRM) { this.barC2n = 0; if (best - second >= BAR_MARGIN) { this.barM = bi; this.barShifts++; } return; }
+    if (best - S[this.barM] >= BAR_MARGIN * BAR_M2) { if (bi === this.barC2) this.barC2n++; else { this.barC2 = bi; this.barC2n = 1; } }
+    else this.barC2n = 0;
+    if (this.barC2n >= BAR_P2) { this.barM = bi; this.barShifts++; this.barC2n = 0; }
   }
 
   /** LÅTGRÄNSEN. */
-  private relock(soft: boolean): void {
-    this.tgReset(soft); this.barReset(); this.goodRep = 0; this.goodOn = 0; this.onNext = 0;
+  private relock(soft: boolean, keep = false): void {
+    this.tgReset(soft);
+    if (keep) { for (let i = 0; i < 4; i++) { this.barK[i] *= BAR_BND_KEEP; this.barL[i] *= BAR_BND_KEEP; this.barR[i] *= BAR_BND_KEEP; this.barX[i] *= BAR_BND_KEEP; } this.barC2n = 0; }
+    else { this.barReset(); this.barFirm = 0; } this.goodRep = 0; this.goodOn = 0; this.onNext = 0;
   }
 
   /** MINNET VID GRÄNSEN. */
@@ -490,7 +498,7 @@ export class BeatFeed {
     this.sure = !!an.boundSure; if ((an.bodyUnderDb ?? 0) >= TG_BRK_DB) this.brkAt = now;
     const nb = an.trackBoundaries ?? 0;
     const q = (an.quietMs ?? 0) >= BND_QUIET_BEATS * 60000 / (this.innerBpm > 80 ? this.innerBpm : 80); if (q) this.quietAt = now;
-    if (nb !== this.boundSeen) { this.boundSeen = nb; this.pend = this.sameSong(now); if (!this.pend) this.relock(!this.sure && !((an.quietMs ?? 0) > 0)); }
+    if (nb !== this.boundSeen) { this.boundSeen = nb; this.pend = this.sameSong(now); if (!this.pend) this.relock(!this.sure && !((an.quietMs ?? 0) > 0), !((an.quietMs ?? 0) > 0)); }
     else if (this.pend && (q || now - this.brkAt >= TG_WIN_MS)) { this.pend = false; if (q) this.relock(false); }   // tystnar låten i breaket var gränsen sann
     if (cfg.beat && this.innerValid) { cfg.beat.anchorMs = this.innerAnchor; cfg.beat.bpm = this.innerBpm; }
     this.updateInner(frame, cfg, now, an.quietMs ?? 0);
@@ -518,7 +526,7 @@ export class BeatFeed {
     if (now - this.lastTrustLog > 4000) { this.lastTrustLog = now; if (isLogOn()) console.log(`[tillit] mönster ${this.repeatRate.toFixed(2)} · fasträff ${this.onBeatRate.toFixed(2)} · bpm ${cfg.beat ? cfg.beat.bpm.toFixed(1) : 0}`); }
     const pllConf = this.pllKicks >= 12 ? this.onBeatRate : 0;
     if (quietMs > 10000) {
-      if (cfg.beat || this.onN > 0) { this.barReset(); cfg.beat = null; cfg.beatErr = 0; this.onN = 0; this.scanC = 99; this.tgReset(); }
+      if (cfg.beat || this.onN > 0) { this.barReset(); this.barFirm = 0; cfg.beat = null; cfg.beatErr = 0; this.onN = 0; this.scanC = 99; this.tgReset(); }
       return;
     }
     const beat0 = cfg.beat;
```
