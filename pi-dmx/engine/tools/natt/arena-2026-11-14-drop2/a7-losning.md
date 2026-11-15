# a7 – SPÄNNINGSKONTOT (drop2)

## Idén
Ett drop är en FULL LANDNING – basen slår upp till sitt tak och hela nivån är uppe inom 150 ms – när SPÄNNINGSKONTOT är fullt.
Kontot fylls medan basen hålls tillbaka mer än toppen (djup × tid), läcker med 4 s och töms av varje baslandning: i
breakdown-sorten fyller den långa luckan kontot, i insats-sorten gör två slag HELT utan bas det på en sekund.

## Delar (allt i `analyserDrop.ts`, `flankStep`)
| del | bär | mätt |
|---|---|---|
| KONTOT (`TENS_*`): (basens topp under taket − 10 dB)/20 per s, läcka 4 s, fullt vid 0,3 s; ersätter "≥ 10 dB i ≥ 4 s" | drop i 160345 (137) och 151659 (168) | 151659 0/5 → 1/5; mini som drop 0 → 3 av 9 |
| TOPPENS TECKEN `TENS_TOP_K`: toppen (250 Hz–10 kHz) under sitt tak dras av med hälften | precision i 193818 | utan: 14 motordrop mot 11, 39,0 |
| FULL LANDNING `LAND_FULL` 0,7 × nivåtaket | drop, inte-drop, precision i 160345: basinsatsen mitt i uppbyggnaden (207, 438 s) tar inte 12 s-spärren från 214 och 441 | utan: 34,1 (160345 41,8, inte 3/3) |
| VARJE LANDNING TÖMMER KONTOT, fönster 150 ms | spärren `tid` (m1 kunde fyra på nästa kick, 0,51 s sent) | kostar 302 och 445: m1 42,2 → m2 39,7 |
| `FLANK_LAND_DB` 6 → 10 | tiden: 0,27 → 0,08 s (160345), 0,56 → 0,30 s (151659) | |
| Tyst TÖMMER kontot (förr: aldrig drop) | droppet 282 i 160345 | kostar 342 i 193818 |

BORTVALT efter mätning: "arrangemanget tunnas ut" och "toppen stiger" som egna insättningar (ingen vinst; AUC drop mot mini
0,41–0,65), "slagen tätnar" (`kickHit` är en metronom). I 151659 har kontot 0,48 vid droppet 168 och 0,33–0,43 vid minidroppen
270/319/344 – samma stopp, kontot skiljer dem inte; 304, 476, 524 har ≈ 0 (fill 0,8 s efter en basinsats). De droppen ser kontot inte.

## Marginaler (en gräns i taget; poäng, filerna 160345/151659/193818 där domen flyttar sig)
| gräns | −25 % | +25 % |
|---|---|---|
| standard 39,7 (52,9 / 29,6 / 66,9) | | |
| `TENS_GONE_DB` 10 | 39,1 | 43,2 (44,9 / 38,3 / 61,1) |
| `TENS_SPAN_DB` 20 | 39,2 | 43,3 |
| `TENS_TOP_K` 0,5 | 39,2 | 39,1 |
| `TENS_LEAK_S` 4 | 40,2 | 39,7 |
| `TENS_FULL_S` 0,3 | 39,2 | 43,3 (46,3 / 38,3 / 60,2) |
| `LAND_FULL` (0,3 under taket) | 0,775: 40,9 | 0,625: 38,8 |
| `LAND_ARM_MS` 150 | 38,6 (441 tappas) | 39,7 |
| `FLANK_RISE_DB` 8 | 39,7 | 39,9 |
| `FLANK_LAND_DB` 10 | 39,7 | 37,3 (39,4 / 32,8 / 53,3) |

`lab/marg.py` (numpy, ger domarens tal exakt); nio rader bekräftade med `ensam.mjs --set` (`lab/marginal-ensam.txt`). Tid ≤ 0,32 s,
flod ≤ 1,34/min i alla. Vinsten vid +25 % är EN händelse (168 har högst konto av stoppen i 151659) – ingen platå, inte vald.
Kanter utanför ±25 %: `LAND_FULL` ≥ 0,84 tappar 168 (→ 31); `FLANK_LAND_DB` ≤ 6,5 ger 168 0,55 s sent = `tid`.

## Siffrorna (domaren; tempo = bas 100 %)
| | poäng | 160345 | 151659 | 193818 |
|---|---|---|---|---|
| bas | 29,2 | 23,9: 1/9, 10 motordrop, mini 2/11, inte 3/3 | 22,2: 0/5, 2, 0/9 | 62,1: 5/9, 12, 1/5 |
| m1 (kontot kvar efter ofull landning, 400 ms, `LAND_FULL` 0,8) | 42,2 | 59,4: 6/9, 12, 4/11, inte 2/3 | 29,6: 1/5, 6, 3/9 | 75,3: 6/9, 10, 0/5 |
| m2 = STANDARD (m3 oanvänd) | 39,7 | 52,9: 5/9, 11, 4/11, inte 2/3, tid 0,08 | 29,6: 1/5, 6, 3/9, tid 0,30 | 66,9: 5/9, 11, 0/5, tid 0,08 |

Sämre än bas: mini som drop (160345 2 → 4, 151659 0 → 3). Missade: 51 (41 % av nivåtaket), 211/218 (12 s-regeln), 302, 304, 359,
476, 524, 291 (kontot 0,2), 445 (insatsen 437 tog den), 51 och 1201 i 193818 (ingen baslucka).

## Risken
- Pop utan break: varje totalstopp på drygt två slag blir drop (4 av 6 motordrop i 151659); täta stopp → `flod`. Två slag vid
  130 BPM ligger på gränsen (hålltiden 0,6 s) – tempoberoende.
- Taktmix/låtstart: bas in efter starkt baslöst intro = drop (342). Basinsats före droppet på ≥ 70 % nivå tar droppet (437 → 445).
- Tal över ett basuppehåll fyller kontot (tyst tömmer det).
- Efter ett starkt parti ligger nivåtaket kvar (1,5 %/s): drop i en tystare låt blir ofullt (51 i 160345).
- Mjuk baslandning fyrar sent (168: +0,30 s); med en enda träff i filen är det hela `tid`-spärren.

## Diffen (`git diff --no-index src .arena/drop2/a7/src`; med radslut orörda i `a7.diff`)
```diff
diff --git a/src/ANALYSER_SHARED.md5 b/.arena/drop2/a7/src/ANALYSER_SHARED.md5
index be5b2ff..591b331 100644
--- a/src/ANALYSER_SHARED.md5
+++ b/.arena/drop2/a7/src/ANALYSER_SHARED.md5
@@ -1,6 +1,6 @@
 # md5 (CRLF->LF) av de gemensamma filerna - samma i lotus-light-link och dmx-control. Skrivs av analyser_shared.py --write
 28fc97e76fe696e3c2716ee86eb03585 analyser.ts
-36803a2cf2affe308e43456b313b4dad analyserDrop.ts
+86cf173bf987c5b0bc765825a09319c6 analyserDrop.ts
 692befa55e7fd906cdc3652af3f27baa analyserSection.ts
 879ba2122d2a1d3e0eea4082adfd2355 analyserSpectrum.ts
 e92d0d6b4f8dc36abfb8135004260806 analyserLevel.ts
diff --git a/src/analyserDrop.ts b/.arena/drop2/a7/src/analyserDrop.ts
index f582cb3..e9fa7ae 100644
--- a/src/analyserDrop.ts
+++ b/.arena/drop2/a7/src/analyserDrop.ts
@@ -18,11 +18,12 @@ const MINI_PEAK_DB = 10;
 const DROP_SHORT_MS = 4000;
   // minsta drop-avstand nar dropen ESKALERAR
 const DROP_LONG_MS = 20000;
   // annars maste sa har lang tid ga
 const DROP_ESCALATE_DB = 3;
   // tatare drops maste vara TYDLIGT starkare for att fyra
-const FLANK_GONE_DB = 10, FLANK_BREAK_S = 4, FLANK_LAND_DB = 6, FLANK_RISE_DB = 12, FLANK_HOLD_S = 0.6, FLANK_GRACE_S = 1;
   // FULL DROP PÅ FLANKEN
-const FLANK_SHORT_S = 2, FLANK_SHORT_RISE_DB = 24, FLANK_SILENT_LV = 0.005;
+const FLANK_LAND_DB = 10, FLANK_RISE_DB = 8, FLANK_HOLD_S = 0.6, FLANK_SILENT_LV = 0.005;   // LANDNINGEN: basen upp till taket
+const LAND_FULL = 0.7, LAND_ARM_MS = 150;   // FULL LANDNING: hela nivån vid sitt tak inom fönstret
+const TENS_GONE_DB = 10, TENS_SPAN_DB = 20, TENS_TOP_K = 0.5, TENS_LEAK_S = 4, TENS_FULL_S = 0.3;   // SPÄNNINGSKONTOT
 const SHOW_DROP_GAP_MS = 12000;
   // spärr mellan full drops
 const NEAR_RISE_DB = 10, NEAR_DIP_DB = 8, LIFT_DB = 10, STOP_MINI_S = 0.6;
   // LYFT/NÄSTAN-DROP/STOPP
-const DOUBLE_FROM_START = ['bodyEnv', 'bodyFast', 'bodyCeil', 'bodyPeak', 'lastGoneSpanMs', 'lastDropMs', 'lastMiniGoneMs', 'lastMiniMs', 'miniGoneMs', 'bodyGoneMs', 'lastBodyGoneMs', 'dropArmUntil', 'dropArmAt', 'fdGone', 'fdSpan', 'fdEnd', 'fdAt', 'fdQuietAt', 'lastShowDropMs', 'dropRiseDb', 'nearB', 'nearNorm', 'nearFloor', 'liftCalm', 'liftLift', 'liftHistAt', 'stopRunS', 'nearDropDb', 'nearDipDb', 'liftDb', 'stopS'] as const;
   // Talfält som ska vara flyttal från start
+const DOUBLE_FROM_START = ['bodyEnv', 'bodyFast', 'bodyCeil', 'bodyPeak', 'lastGoneSpanMs', 'lastDropMs', 'lastMiniGoneMs', 'lastMiniMs', 'miniGoneMs', 'bodyGoneMs', 'lastBodyGoneMs', 'dropArmUntil', 'dropArmAt', 'tens', 'topEnv', 'topCeil', 'landUntil', 'landRise', 'landTens', 'fdAt', 'lastShowDropMs', 'dropRiseDb', 'nearB', 'nearNorm', 'nearFloor', 'liftCalm', 'liftLift', 'liftHistAt', 'stopRunS', 'nearDropDb', 'nearDipDb', 'liftDb', 'stopS'] as const;
   // Talfält som ska vara flyttal från start
 
 export class DropDetector {
   a: Analyser;
   // analysatorn som äger den här delen
@@ -51,7 +52,8 @@ export class DropDetector {
   dropCount = 0;
   // monoton drop-räknare
   dropCand = 0;
   // slam-kandidaterna
   dropDemoted = 0; dropSpaced = 0; dropRiseDb = -0;
-  private fdGone = -0; private fdSpan = -0; private fdEnd = -1e12; private fdAbove = true; private fdAt = -1e12; private fdQuietAt = -1e12; private lastShowDropMs = -1e12;
+  private tens = -0; private topEnv = -120; private topCeil = -300; private landUntil = -1e12; private landRise = -0; private landTens = -0;   // kontot, toppen (250 Hz-10 kHz), landningsfönstret
+  private fdAbove = true; private fdAt = -1e12; private lastShowDropMs = -1e12;
   private fdT = new Float64Array(1024); private fdV = new Float64Array(1024); private fdS0 = 0; private fdN = 0;
   private nearOn = false; private nearB = -0; private nearNorm = -0; private nearFloor = 1e9; private liftCalm = -0; private liftLift = -0;
   private liftHist = new Float64Array(240); private liftW = 0; private liftN = 0; private liftHistAt = -1e12; private stopRunS = -0;
@@ -156,21 +158,28 @@ export class DropDetector {
     } else if (cand && nowWallA - this.fdAt > 2000) { this.dropDemoted++; this.miniDropCount++; }
   }
 
-  /** FULL DROP PÅ FLANKEN. */
+  /** FULL DROP = FULL LANDNING MED FULLT SPÄNNINGSKONTO (varje landning tömmer kontot). */
   private flankStep(now: number, dt: number): boolean {
-    const CAP = 1024, T = this.fdT, V = this.fdV, f = this.bodyFast, ceil = this.bodyCeil;
+    const CAP = 1024, T = this.fdT, V = this.fdV, f = this.bodyFast, ceil = this.bodyCeil, B = this.a.bandDbRaw, lv = this.a.lvlSmooth;
     if (this.fdN === CAP) { this.fdS0 = (this.fdS0 + 1) & (CAP - 1); this.fdN--; }
     { const w = (this.fdS0 + this.fdN) & (CAP - 1); T[w] = now; V[w] = f; this.fdN++; }
     while (this.fdN > 1 && now - T[this.fdS0] > FLANK_HOLD_S * 1000) { this.fdS0 = (this.fdS0 + 1) & (CAP - 1); this.fdN--; }
     let top = -1e9, low = 1e9; for (let q = 0; q < this.fdN; q++) { const i = (this.fdS0 + q) & (CAP - 1); if (V[i] > top) top = V[i]; if (now - T[i] <= 500 && V[i] < low) low = V[i]; }
-    if (top < ceil - FLANK_GONE_DB) this.fdGone += dt; else { if (this.fdGone > 0) { this.fdSpan = this.fdGone; this.fdEnd = now; } this.fdGone = 0; }
+    this.topEnv += ((B[3] + B[4] + B[5] + B[6]) / 4 - this.topEnv) * Math.min(1, dt / 0.35);
+    this.topCeil = Math.max(this.topEnv, this.topCeil - dt * BODY_CEIL_DB_S);
+    const held = ceil - top - TENS_GONE_DB - TENS_TOP_K * (this.topCeil - this.topEnv);
+    this.tens += dt * ((held > TENS_SPAN_DB ? 1 : held > 0 ? held / TENS_SPAN_DB : 0) - this.tens / TENS_LEAK_S);
+    if (lv <= FLANK_SILENT_LV) this.tens = 0;
     const above = f > ceil - FLANK_LAND_DB, edge = above && !this.fdAbove; this.fdAbove = above;
-    const span = this.fdGone > 0 ? this.fdGone : now - this.fdEnd < FLANK_GRACE_S * 1000 ? this.fdSpan : 0;
-    if (this.a.lvlSmooth <= FLANK_SILENT_LV) this.fdQuietAt = now;
-    if (!edge || f - low < FLANK_RISE_DB || (span < FLANK_BREAK_S && !(span >= FLANK_SHORT_S && ceil - low >= FLANK_SHORT_RISE_DB))) return false;
-    if (now - this.fdQuietAt < span * 1000 + 500) { this.fdGone = 0; this.fdSpan = 0; if (DROP_TRACE) console.log(`[flank] ingen drop: helt tyst i breaket (latstart), break ${span.toFixed(1)} s`); return false; }
-    this.fdGone = 0; this.fdSpan = 0; this.fdAt = now; this.dropRiseDb = f - low;
-    if (DROP_TRACE) console.log(`[flank] full drop pa flanken: break ${span.toFixed(1)} s, stigning ${(f - low).toFixed(1)} dB`);
+    if (edge && f - low >= FLANK_RISE_DB) {
+      if (now > this.landUntil) { this.landUntil = now + LAND_ARM_MS; this.landRise = f - low; this.landTens = this.tens; }
+      this.tens = 0;
+    }
+    if (now > this.landUntil || lv < LAND_FULL * this.a.levelCeil) return false;
+    this.landUntil = -1e12;
+    if (DROP_TRACE) console.log(`[konto] full landning, kontot ${this.landTens.toFixed(2)} s: ${this.landTens >= TENS_FULL_S ? 'drop' : 'ingen drop'}`);
+    if (this.landTens < TENS_FULL_S) return false;
+    this.fdAt = now; this.dropRiseDb = this.landRise;
     return true;
   }
 
```
