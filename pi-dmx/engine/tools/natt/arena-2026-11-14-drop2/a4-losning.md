# a4 – NY TOPP MOT LOKALT TAK (drop2)

## IDÉN
En landning (basens topp tillbaka efter att ha varit borta) är ett drop när HELA NIVÅN i samma ögonblick står vid det högsta den varit de senaste 30 sekunderna – låten är tillbaka på sin egen topp, oavsett hur stark låten eller inspelningen är. Det stämmer musikaliskt för breakdown-sorten (break -> full styrka); för sorten där basen spelar vidare visar mätningen att droppet INTE är starkare än det som nyss var, så där ger kortet inget (se "Det som inte bar").

## DELAR (allt i `analyserDrop.ts`, `flankStep` ersatt; slam-kandidaten, minidrop, 12 s-spärren och klassningen orörda)
| del | vad | bär |
|---|---|---|
| 1. Landningen | bastoppen (topphåll, fall 80 dB/s – korta kickar räknas fullt) mot LOKALT bastak (högsta de senaste 45 s, 0,25 s-rutor). Borta = > 10 dB under i minst 4 s och någon gång > 18 dB under; landning = tillbaka inom 6 dB med ett riktigt anslag (inom 0,3 s) | drop i `160345`: 1 -> 7 av 9 (de två kvar ligger inom 12 s-spärren). |
| 2. Domen | hela nivån (rms i dB, 0,1 s utjämning) ska inom 0,3 s nå sitt lokala tak (högsta de senaste 30 s) minus 2 dB | precision `160345` 1/10 -> 7/10, inte-drop med drop 3 -> 1 av 3; `193818` motordrop 12 -> 9 med samma 5 drop, mini som drop 1 -> 0. Nekade landningar är svagare än taket: 347 (−3,1), 500 (−5,7), 558 (−6,8) i `160345`; 365 (−4,9), 838 (−2,8), 1579 (−3,6) i `193818` |
| 3. Tyst-regeln | "helt tyst någon gång i breaket" -> "tyst inom 2 s före landningen" | droppet 282 i `160345` (första droppet efter ett låtbyte; gamla regeln strök det för tystnaden vid låtbytet tidigare i breaket) |

**Det som inte bar (för jokern):** (a) Fill-sorten `151659`: vid fyra av ägarens fem drop står hela nivån −1,4 .. −2,9 dB mot 30 s-taket; "ny topp" mot 10 s-taket (+1 dB) kommer först 0,5–0,6 s efter landningen. Övriga fill ligger i samma spann. En sådan fill-väg gav 2 av 5 (57,5 p i fria prov) men tid 0,59 s = DISK; med 0,3 s väntan 0 av 5. (b) Per register: basens nya topp pekar åt olika håll de två kvällarna (AUC 0,70 / 0,49 / 0,47). Diskantens topp (1,2–16 kHz) mot sitt 30 s-tak såg bra ut offline (AUC 0,78 / 0,82 / 0,78) men gav i koden bara omarkerade drop. (c) Ny topp som utlösare utan landning (fönster 8–24 s, läckande tak): 45–56 p i simulering, bäst när den nästan aldrig fyrar.

## MARGINALER (fria prov på tapparna, ±25 %; standard = 38,9: 7/9, 0/5, 5/9 drop med 10, 2, 9 motordrop)
| gräns | −25 % | +25 % |
|---|---|---|
| BREAK_S 4 | 33,4 (7, 0, 5 drop; 13, 3, 13 motordrop) | 39,7 (7, 0, 5; 9, 1, 8) |
| BACK_DB 2 | 38,1 (7, 0, 4) | 38,9 (7, 0, 5) |
| TOP_S 30 | 38,8 | 38,9 |
| BASS_TOP_S 45 | 38,9 | 38,8 |
| LAND_DEEP_DB 18 | 38,8 | 38,9 |
| LAND_GONE_DB 10 | 38,1 | 38,9 |
| LAND_DB 6 | 38,4 (7, 0, 5; 11, 3, 11) | 37,4 (6, 0, 4) |
| LAND_WAIT_S 0,3 / LVL_TAU_S 0,1 / PK_DB_S 80 / LAND_ATTACK_S 0,3 / QUIET_S 2 | 38,9 | 38,9–39,2 |

Ingen gräns välter domen; känsligast är LAND_DB uppåt (en upptaktsnot äter breaket) och BREAK_S nedåt (fler omarkerade).

## SIFFRORNA
| mätning | poäng | `160345` | `151659` | `193818` |
|---|---|---|---|---|
| bas | 29,2 | 23,9: 1/9 drop, 10 motordrop, 2/11 mini, 3/3 inte | 22,2: 0/5, 2 motordrop | 62,1: 5/9, 12 motordrop, 1/5 mini |
| m1 | 38,9 | 75,9: 7/9, 10 motordrop, 2/11 mini, 1/3 inte, tid 0,15 s | 22,2: 0/5, 2 motordrop, 0/9 mini | 68,9: 5/9, 9 motordrop, 0/5 mini, 0/3 inte, tid 0,16 s |
| m2 | 38,9 | samma bygge som m1, identiska drop (mätt om för kostnadens skull) | 22,2 | 68,9 |

m3 användes inte.

Tempo = bas 100 % i alla filer, högst 1,03 drop/min. Inget blev sämre än bas i någon fil; `151659` står kvar på 22,2 (noll träffar). Kostnad: m1 x1,91 och m2 x2,03 i rankingen, men alla deltagare ligger på x1,8–2,3 där (mätningarna går medan andras prov kör; bas mättes ensam). Drop-delen ensam på tappen tar lika lång tid som bas (4,9–6,5 s mot 5,1–5,9 s för 226 000 steg); slingan över 225 värden per hopp är borta, kvar en log10 per hopp. Buffertar: 2 x 1024 tal bort, 120 + 240 in.

## RISKEN
- **Basen spelar vidare / pop utan break:** inga landningar, inga drop (som `151659`). Olöst här.
- **Låtstart efter intro utan bas** blir drop (223, 343 i `193818` ligger strax efter låtbyten; ägarens 282 i `160345` är samma sak).
- **Långa mixar:** en enstaka stark händelse höjer taket i 30 s och kan neka ett drop. Break över 45 s: bastaket glömmer, ingen landning.
- **Sen landning:** når första basslaget inte inom 6 dB från bastaket fyrar droppet på ett senare slag (177 i `193818`, 1,7 s sent); i en fil med få träffar kan det dra tid-medianen.
- **Tal mellan låtar / tyst eller stark inspelning:** ingen bas ger ingen landning; allt mäts mot egna tak, inga nya absoluta gränser.
- `dropRiseDb` är nu basens lyft från breakets djupaste punkt (30–60 dB), förr lyftet på 0,5 s.

## DIFFEN (`git diff --no-index src .arena/drop2/a4/src`, hela i `diff.patch`)

```diff
diff --git a/src/ANALYSER_SHARED.md5 b/.arena/drop2/a4/src/ANALYSER_SHARED.md5
index be5b2ff..6c911aa 100644
--- a/src/ANALYSER_SHARED.md5
+++ b/.arena/drop2/a4/src/ANALYSER_SHARED.md5
@@ -1,6 +1,6 @@
 # md5 (CRLF->LF) av de gemensamma filerna - samma i lotus-light-link och dmx-control. Skrivs av analyser_shared.py --write
 28fc97e76fe696e3c2716ee86eb03585 analyser.ts
-36803a2cf2affe308e43456b313b4dad analyserDrop.ts
+7dffff796f7674944b34d4c64c08d2c5 analyserDrop.ts
 692befa55e7fd906cdc3652af3f27baa analyserSection.ts
 879ba2122d2a1d3e0eea4082adfd2355 analyserSpectrum.ts
 e92d0d6b4f8dc36abfb8135004260806 analyserLevel.ts
diff --git a/src/analyserDrop.ts b/.arena/drop2/a4/src/analyserDrop.ts
index f582cb3..dea6884 100644
--- a/src/analyserDrop.ts
+++ b/.arena/drop2/a4/src/analyserDrop.ts
@@ -18,11 +18,13 @@ const MINI_PEAK_DB = 10;
 const DROP_SHORT_MS = 4000;   // minsta drop-avstand nar dropen ESKALERAR
 const DROP_LONG_MS = 20000;   // annars maste sa har lang tid ga
 const DROP_ESCALATE_DB = 3;   // tatare drops maste vara TYDLIGT starkare for att fyra
-const FLANK_GONE_DB = 10, FLANK_BREAK_S = 4, FLANK_LAND_DB = 6, FLANK_RISE_DB = 12, FLANK_HOLD_S = 0.6, FLANK_GRACE_S = 1;   // FULL DROP PÅ FLANKEN
-const FLANK_SHORT_S = 2, FLANK_SHORT_RISE_DB = 24, FLANK_SILENT_LV = 0.005;
+const PK_DB_S = 80, LAND_GONE_DB = 10, LAND_DEEP_DB = 18, LAND_DB = 6, LAND_ATTACK_S = 0.3;   // LANDNING: bastoppen borta (och riktigt nere), sedan tillbaka vid sitt lokala tak
+const TOP_BLK_MS = 250, TOP_S = 30, BASS_TOP_S = 45, LVL_TAU_S = 0.1;   // LOKALA TAK (rutornas toppar): hela nivån 30 s, basen 45 s
+const BREAK_S = 4, BACK_DB = 2, LAND_WAIT_S = 0.3, QUIET_S = 2;   // DOMEN: efter ett break ska hela nivån landa vid sitt lokala tak
+const FLANK_SILENT_LV = 0.005;
 const SHOW_DROP_GAP_MS = 12000;   // spärr mellan full drops
 const NEAR_RISE_DB = 10, NEAR_DIP_DB = 8, LIFT_DB = 10, STOP_MINI_S = 0.6;   // LYFT/NÄSTAN-DROP/STOPP
-const DOUBLE_FROM_START = ['bodyEnv', 'bodyFast', 'bodyCeil', 'bodyPeak', 'lastGoneSpanMs', 'lastDropMs', 'lastMiniGoneMs', 'lastMiniMs', 'miniGoneMs', 'bodyGoneMs', 'lastBodyGoneMs', 'dropArmUntil', 'dropArmAt', 'fdGone', 'fdSpan', 'fdEnd', 'fdAt', 'fdQuietAt', 'lastShowDropMs', 'dropRiseDb', 'nearB', 'nearNorm', 'nearFloor', 'liftCalm', 'liftLift', 'liftHistAt', 'stopRunS', 'nearDropDb', 'nearDipDb', 'liftDb', 'stopS'] as const;   // Talfält som ska vara flyttal från start
+const DOUBLE_FROM_START = ['bodyEnv', 'bodyFast', 'bodyCeil', 'bodyPeak', 'lastGoneSpanMs', 'lastDropMs', 'lastMiniGoneMs', 'lastMiniMs', 'miniGoneMs', 'bodyGoneMs', 'lastBodyGoneMs', 'dropArmUntil', 'dropArmAt', 'fdAt', 'fdQuietAt', 'ldBp', 'ldLvl', 'ldGone', 'ldGoneAt', 'ldGoneBp', 'ldDeep', 'ldSpan', 'ldUntil', 'ldCx', 'ldRise', 'tpX', 'tpB', 'tpAt', 'tpTopX', 'tpTopB', 'lastShowDropMs', 'dropRiseDb', 'nearB', 'nearNorm', 'nearFloor', 'liftCalm', 'liftLift', 'liftHistAt', 'stopRunS', 'nearDropDb', 'nearDipDb', 'liftDb', 'stopS'] as const;   // Talfält som ska vara flyttal från start
 
 export class DropDetector {
   a: Analyser;   // analysatorn som äger den här delen
@@ -51,8 +53,11 @@ export class DropDetector {
   dropCount = 0;   // monoton drop-räknare
   dropCand = 0;   // slam-kandidaterna
   dropDemoted = 0; dropSpaced = 0; dropRiseDb = -0;
-  private fdGone = -0; private fdSpan = -0; private fdEnd = -1e12; private fdAbove = true; private fdAt = -1e12; private fdQuietAt = -1e12; private lastShowDropMs = -1e12;
-  private fdT = new Float64Array(1024); private fdV = new Float64Array(1024); private fdS0 = 0; private fdN = 0;
+  private fdAt = -1e12; private fdQuietAt = -1e12; private lastShowDropMs = -1e12;
+  private ldBp = -300; private ldLvl = -300; private ldGone = -0; private ldGoneAt = -1e12; private ldGoneBp = -300; private ldDeep = -0;   // landningen
+  private ldSpan = -0; private ldUntil = -1e12; private ldCx = -0; private ldRise = -0; private ldQuiet = false;
+  private tpVX = new Float64Array(120); private tpVB = new Float64Array(240); private tpW = 0; private tpN = 0;   // lokala tak: rutornas toppar
+  private tpX = -300; private tpB = -300; private tpAt = -1e12; private tpTopX = -300; private tpTopB = -300;
   private nearOn = false; private nearB = -0; private nearNorm = -0; private nearFloor = 1e9; private liftCalm = -0; private liftLift = -0;
   private liftHist = new Float64Array(240); private liftW = 0; private liftN = 0; private liftHistAt = -1e12; private stopRunS = -0;
   nearDropDb = -0; nearDipDb = -0; liftDb = -0; stopCount = 0; stopS = -0;
@@ -156,21 +161,34 @@ export class DropDetector {
     } else if (cand && nowWallA - this.fdAt > 2000) { this.dropDemoted++; this.miniDropCount++; }
   }
 
-  /** FULL DROP PÅ FLANKEN. */
+  /** FULL DROP = LANDNING VID LOKALT TAK: basen tillbaka efter ett break, hela nivån uppe vid det högsta de senaste TOP_S s. */
   private flankStep(now: number, dt: number): boolean {
-    const CAP = 1024, T = this.fdT, V = this.fdV, f = this.bodyFast, ceil = this.bodyCeil;
-    if (this.fdN === CAP) { this.fdS0 = (this.fdS0 + 1) & (CAP - 1); this.fdN--; }
-    { const w = (this.fdS0 + this.fdN) & (CAP - 1); T[w] = now; V[w] = f; this.fdN++; }
-    while (this.fdN > 1 && now - T[this.fdS0] > FLANK_HOLD_S * 1000) { this.fdS0 = (this.fdS0 + 1) & (CAP - 1); this.fdN--; }
-    let top = -1e9, low = 1e9; for (let q = 0; q < this.fdN; q++) { const i = (this.fdS0 + q) & (CAP - 1); if (V[i] > top) top = V[i]; if (now - T[i] <= 500 && V[i] < low) low = V[i]; }
-    if (top < ceil - FLANK_GONE_DB) this.fdGone += dt; else { if (this.fdGone > 0) { this.fdSpan = this.fdGone; this.fdEnd = now; } this.fdGone = 0; }
-    const above = f > ceil - FLANK_LAND_DB, edge = above && !this.fdAbove; this.fdAbove = above;
-    const span = this.fdGone > 0 ? this.fdGone : now - this.fdEnd < FLANK_GRACE_S * 1000 ? this.fdSpan : 0;
+    const body = this.a.hBody, fall = this.ldBp - PK_DB_S * dt, bp = this.ldBp = body > fall ? body : fall;
+    const raw = 20 * Math.log10(this.a.hRms + 1e-9), x = this.ldLvl = this.ldLvl < -200 ? raw : this.ldLvl + (raw - this.ldLvl) * Math.min(1, dt / LVL_TAU_S);
+    const u = Math.max(this.tpTopB, this.tpB) - bp;
     if (this.a.lvlSmooth <= FLANK_SILENT_LV) this.fdQuietAt = now;
-    if (!edge || f - low < FLANK_RISE_DB || (span < FLANK_BREAK_S && !(span >= FLANK_SHORT_S && ceil - low >= FLANK_SHORT_RISE_DB))) return false;
-    if (now - this.fdQuietAt < span * 1000 + 500) { this.fdGone = 0; this.fdSpan = 0; if (DROP_TRACE) console.log(`[flank] ingen drop: helt tyst i breaket (latstart), break ${span.toFixed(1)} s`); return false; }
-    this.fdGone = 0; this.fdSpan = 0; this.fdAt = now; this.dropRiseDb = f - low;
-    if (DROP_TRACE) console.log(`[flank] full drop pa flanken: break ${span.toFixed(1)} s, stigning ${(f - low).toFixed(1)} dB`);
+    if (u > LAND_GONE_DB) { this.ldGone += dt; this.ldGoneAt = now; this.ldGoneBp = bp; if (u > this.ldDeep) this.ldDeep = u; }
+    else if (u <= LAND_DB) {
+      if (this.ldGone >= BREAK_S && this.ldDeep >= LAND_DEEP_DB && now - this.ldGoneAt <= LAND_ATTACK_S * 1000 && bp - this.ldGoneBp >= LAND_GONE_DB - LAND_DB) {
+        this.ldSpan = this.ldGone; this.ldUntil = now + LAND_WAIT_S * 1000; this.ldRise = this.ldDeep - u; this.ldQuiet = now - this.fdQuietAt < QUIET_S * 1000;
+        this.ldCx = Math.max(this.tpTopX, this.tpX);
+      }
+      this.ldGone = 0; this.ldDeep = 0;
+    }
+    if (bp > this.tpB) this.tpB = bp;
+    if (x > this.tpX) this.tpX = x;
+    if (now - this.tpAt >= TOP_BLK_MS) {
+      const VX = this.tpVX, VB = this.tpVB, N = VB.length, M = VX.length, nB = Math.min(N, Math.round(BASS_TOP_S * 1000 / TOP_BLK_MS)), nX = Math.min(M, Math.round(TOP_S * 1000 / TOP_BLK_MS));
+      const w = this.tpW; VB[w] = this.tpB; VX[w % M] = this.tpX; this.tpW = (w + 1) % N; if (this.tpN < nB) this.tpN++;
+      let mB = -300, mX = -300;
+      for (let q = 0, j = w; q < this.tpN; q++) { if (VB[j] > mB) mB = VB[j]; if (q < nX && VX[j % M] > mX) mX = VX[j % M]; if (--j < 0) j = N - 1; }
+      this.tpTopB = mB; this.tpTopX = mX; this.tpB = bp; this.tpX = x; this.tpAt = now;
+    }
+    if (now >= this.ldUntil || x < this.ldCx - BACK_DB) return false;
+    this.ldUntil = -1e12;
+    if (this.ldQuiet) { if (DROP_TRACE) console.log(`[flank] ingen drop: tyst strax fore landningen (latstart), basen borta ${this.ldSpan.toFixed(1)} s`); return false; }
+    this.fdAt = now; this.dropRiseDb = this.ldRise;
+    if (DROP_TRACE) console.log(`[flank] full drop: basen borta ${this.ldSpan.toFixed(1)} s, hela nivan ${(x - this.ldCx).toFixed(1)} dB mot sitt lokala tak`);
     return true;
   }
 
```
