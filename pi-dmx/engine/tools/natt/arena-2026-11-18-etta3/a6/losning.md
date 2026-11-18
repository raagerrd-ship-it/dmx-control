# a6 etta3: tillit per röst (K, R, L) mot backbeatens par

## Idén
Varje röst för slag 1 mot 3 (kickens stigning K, kickens återstart R, basgångens stigning L) får per låt en tillit T: ett glidande medel (1/8 per slag, start 0,5, nollas vid låtgräns) av om röstens starkaste plats ligger i samma par som backbeaten X utpekar som {1,3}. Rösten vägs med T. En röst som säger "ettan är på 2 eller 4" mäter synkoper, inte ettan, och får då mindre att säga om 1 mot 3. X väger som förut.

Varför tilliten mäts mot X:s par och inte mot den valda ettan: jag mätte offline (exakt omspelning av ettbeslutet ur loggade särdrag, samma siffror som domaren för basen) att tillit mot den valda ettan låser fast fel val. Rösterna som håller med ett felval får mer vikt (ren 86,6 -> 45-73). X:s par stämmer i 89-98 % av fallen och avgörs inte av K/R/L. Därför är X en oberoende domare.
Förprovet på övningen (facit bara i analysen): "röstens starkaste plats ligger i X:s par" förutsäger att röstens 1-mot-3 stämmer. K stämmer 89 % i paret och 70 % utanför, R 93 mot 57 %, L 86 mot 67 %. Under de första 60 s av en låt gäller R 75 mot 8 %.
Alla fel i ren 4/4 på övningen ligger inom 60 s efter en låtstart.

## DELARNA
| del | vad | mått (m1) | varifrån |
|---|---|---|---|
| A parhållningens tillit `barT` (barCommit) | T per röst, EMA av [argmax i X:s par], vikt ×T | ren 86,6 -> 87,6; 171840 75,3 -> 78,3, trean 21,8 -> 11,3 | kortet; backbeaten är f0/a8r |
| (start 0,5) | ny låt: K/R/L börjar på halv vikt, X relativt starkare tills rösterna visat sig | kontroll offline: bara "X×2" ger 87,3, A ger 87,7 | – |

Förkastat offline (ingen mätning): tillit mot vald etta (taktröster, långa röster), självmotsägelse per takt, t-värde ur parade taktskillnader, R efter antal återstarter, kontinuerlig parandel. Alla var ±0 eller sämre, och flera var knivsegg.

## KOSTNADEN
Allt ligger i barCommit (BeatFeed, alltså worker i delat läge). Det körs en gång per slag, inte per hop: 3 × 4 jämförelser och 3 EMA. Huvudtråden får ingenting nytt. Minnet är 24 byte (Float64Array(3)). Ingen allokering.

## SIFFRORNA (m1, övning)
| fil | ren bas -> a6 | trean | etta alla | omval | paslag | FEL | lead |
|---|---|---|---|---|---|---|---|
| 151659 | 92,8 -> 92,8 | 6,0 -> 6,0 | 93,9 = | 0,12 = | 96,4 = | 10,4 = | -60 = |
| 171840 | 75,3 -> 78,3 | 21,8 -> 11,3 | 74,8 -> 75,3 | 0,64 -> 0,85 | 89,1 = | 7,4 = | -53 = |
| 200719 | 91,8 -> 91,8 | 4,9 = | 67,0 -> 68,7 | 1,47 -> 1,35 | 90,1 = | 13,0 = | -67 = |

Poängen är +0,85 och inga spärrar slår till. Sämre: omvalet ökar på 171840 (+0,21/min), och där flyttas en del av trean till slag 4 (förskjutning 3: 2,7 -> 10,2 %). Vinsten kommer från EN incident (171840 låt 2, 137-185 s). Den är liten och troligen delvis tur. Den bevisar inget om kontrollmängden.

## RISKEN
- Om X tar fel par (backbeaten är svag eller saknas, t.ex. musik utan virvel/clap, halvtidsgroove) straffar tilliten de röster som har rätt. När sX = 0 rör sig inte tilliten.
- Låtbyten: tilliten nollas till 0,5 vid barReset. De första takterna avgörs då mer av X, och 1 mot 3 kan stå kvar på föregående låts barOff&3 längre.
- Udda takter/breaks: ändras inte (samma beslutsregel, samma marginal).
- Live-mic: oförändrat beroende av diskanten för X.

## DIFFEN
```diff
diff --git a/.arena/etta3/bas/src/analyserClock.ts b/.arena/etta3/a6/src/analyserClock.ts
index 0832641..e340620 100644
--- a/.arena/etta3/bas/src/analyserClock.ts
+++ b/.arena/etta3/a6/src/analyserClock.ts
@@ -26,7 +26,7 @@ const FEED_RISE_HOPS = 6;   // BASENS STIGNING
 const PH_B = 6, PH_W = 4, PH_LAG_A = 0.05, PH_LAG_MAX = 30;   // FASEN UR BANDEN (a6)
 const BREAK_HOLD_MS = 20000;   // TVÅ RUTNÄT
 const BREAK_RESTORE_MS = Number(process.env.DMX_BREAK_RESTORE_MS ?? String(BREAK_HOLD_MS));
-const BAR_DECAY = 0.99, BAR_MIN = 16, BAR_MARGIN = 0.06, BAR_W_BASS = 0.5, BAR_WIN0 = -0.2, BAR_WIN1 = 0.3, BAR_RISE_HOPS = 6, BAR_R_MAX = 2, BAR_W_BEAT = 0.25, BAR_Q = 8, BAR_BEAT_Q = 2;   // ETTAN I EFFEKTKLOCKANS RUTNÄT
+const BAR_DECAY = 0.99, BAR_MIN = 16, BAR_MARGIN = 0.06, BAR_W_BASS = 0.5, BAR_WIN0 = -0.2, BAR_WIN1 = 0.3, BAR_RISE_HOPS = 6, BAR_R_MAX = 2, BAR_W_BEAT = 0.25, BAR_Q = 8, BAR_BEAT_Q = 2, BAR_T0 = 0.5, BAR_T_A = 0.125;   // ETTAN I EFFEKTKLOCKANS RUTNÄT
 const TG_HOLD = 1.35;   // HELA TEMPOOMRÅDET
 const TG_SIB = [Math.round(Math.log2(4 / 3) * 139), Math.round(Math.log2(3 / 2) * 139)];   // 4:3 och 3:2 i rutnätets steg
 const TG_SNAP = 0.03, TG_EDGE = 1.03, TG_OCT_UP = 0.85, TG_OCT_DN = 0.4, TG_OCT_A = 0.1;
@@ -91,6 +91,7 @@ export class BeatFeed {
   private barM = 0; private barJ = 0; private barJr = 0; private barPT = 0; private barPI = NaN;   // ettan räknas i musikens slag (a1, per slag a6)
   private readonly barR = new Float64Array(4); private bE = 0; private bE1 = 0; private bE2 = 0; private bEm = 0;   // kickens återstart (a2)
   private readonly barX = new Float64Array(4); private readonly barV = new Float64Array(BAR_Q); private readonly barVc = new Float64Array(BAR_Q); private barTi = NaN; private barTe = 0;   // backbeaten (a8r)
+  private readonly barT = new Float64Array(3).fill(BAR_T0);   // tillit per röst K, R, L (etta3 a6)
   private readonly linK = new Float64Array(BAR_RISE_HOPS); private readonly linL = new Float64Array(BAR_RISE_HOPS); private linPos = 0;
   private innerAnchor = 0; private innerBpm = 0; private innerValid = false;
   private readonly anaGrid = { anchorMs: 0, bpm: 0, confidence: 0 };   // EN KÄLLA
@@ -412,7 +413,7 @@ export class BeatFeed {
     return false;
   }
 
-  private barReset(): void { this.barK.fill(0); this.barL.fill(0); this.barR.fill(0); this.barX.fill(0); this.barTi = NaN; this.bE1 = 0; this.bE2 = 0; this.bEm = 0; this.barN = 0; this.barIdx = NaN; this.barM = this.barOff & 3; this.barJ = 0; this.barJr = 0; this.barPI = NaN; }
+  private barReset(): void { this.barK.fill(0); this.barL.fill(0); this.barR.fill(0); this.barX.fill(0); this.barT.fill(BAR_T0); this.barTi = NaN; this.bE1 = 0; this.bE2 = 0; this.bEm = 0; this.barN = 0; this.barIdx = NaN; this.barM = this.barOff & 3; this.barJ = 0; this.barJr = 0; this.barPI = NaN; }
 
   /** ETTAN (se BAR_DECAY). */
   private barStep(frame: Frame, beat: NonNullable<EngineConfig["beat"]>, now: number): void {
@@ -460,11 +461,16 @@ export class BeatFeed {
     if (this.barN < 1000) this.barN++;
     if (this.barN < BAR_MIN) return;
     const sK = K[0] + K[1] + K[2] + K[3], sL = L[0] + L[1] + L[2] + L[3], sR = R[0] + R[1] + R[2] + R[3], X = this.barX;
-    const sX = Math.abs(X[0]) + Math.abs(X[1]) + Math.abs(X[2]) + Math.abs(X[3]);
+    const sX = Math.abs(X[0]) + Math.abs(X[1]) + Math.abs(X[2]) + Math.abs(X[3]), T = this.barT;
+    if (sX > 0) { const xp = X[0] + X[2] < X[1] + X[3] ? 0 : 1;
+      for (let v = 0; v < 3; v++) { const A = v === 0 ? K : v === 1 ? R : L; let am = 0;
+        if (!(A[0] + A[1] + A[2] + A[3] > 0)) continue;
+        for (let i = 1; i < 4; i++) if (A[i] > A[am]) am = i;
+        T[v] += BAR_T_A * (((am & 1) === xp ? 1 : 0) - T[v]); } }
     if (!(sK > 0)) return;
     let bi = 0, best = -1e9, second = -1e9;
     for (let i = 0; i < 4; i++) {
-      const v = K[i] / sK + (sR > 0 ? R[i] / sR : 0) + (sL > 0 ? BAR_W_BASS * L[i] / sL : 0)
+      const v = T[0] * K[i] / sK + (sR > 0 ? T[1] * R[i] / sR : 0) + (sL > 0 ? T[2] * BAR_W_BASS * L[i] / sL : 0)
         + (sX > 0 ? BAR_W_BEAT * (X[(i + 1) & 3] + X[(i + 3) & 3] - X[i] - X[(i + 2) & 3]) / sX : 0);
       if (v > best) { second = best; best = v; bi = i; } else if (v > second) second = v;
     }
```
