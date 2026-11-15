# a3 – FRASEN (drop2)

Slutläge **49,8 poäng** (bas 29,2), inga spärrar. Bara `analyserDrop.ts` ändrad (+ manifestet); flanken är ersatt, inte påbyggd.

## IDÉN

En landning är ett drop när basens **bärande** nivå – medlet över exakt ett slag i klockans tempo, så att en ensam kick inte räcker –
slår upp till frasens tak efter att minst 10 av frasens senaste 32 slag varit hållna; färre hållna slag är ett fill inne i frasen,
alltså minidrop. Det stämmer i båda sorterna: i breakdown-sorten är basen borta i takter, i den andra spelar kicken vidare men
basgången saknas – slagmedlet ser båda som en hållen fras, och droppet är där hela slaget fylls igen.

**Kortets dom:** frasens LÄGE (8/16/32 takter) skiljer ingenting här. Klockan ger slagets längd men ingen plats i frasen (`barShift`
−1 hela vägen, ankaret hoppar ±½ slag 156–210 gånger per fil). Avstånden mellan ägarens drop är 160, 188, 48, 152, 100, 144 slag –
bara taktlinjen håller, 16 slag i hälften, 32 i ett fall av sex; `151659` har 9-taktersfraser. Och basens för-återkomster ligger på
samma rutnät som droppen (16/28/28/32/41 slag efter breakets början mot 24/40/44/56/58). Det frasen ger är ENHETEN: slag och takter
i stället för sekunder.

## DELAR

| del | bär |
|---|---|
| slagmedlet (glidande, golv 12 dB under taket) | drop i `151659` 0 → 2 av 5 (304, 359: kicken spelar, basgången saknas) |
| frasens tak (högsta nivå basen hållit en hel takt, 128 slag, glömmer 1,5 dB per fras) | svaga för-återkomster fyrar inte och spärrar inte droppet: 211, 441 i `160345`, 445 i `193818`; precision |
| hållna slag ≥ 10 av 32 | mini i `160345` (8 av 11 rätt; med 8 slag 5 av 11); drop 51, 137, 367 |
| landningen: halvslaget når taket, hela slaget inom 3 dB | tid 0,25–0,35 s (helslag mot taket 0,41–0,43) |
| kvartsslagsprov (`PHRASE_SUB`) | domen beror inte på var i slaget räkningen börjar: fyra startfaser 42–57 → 55–56 (8 slag) |
| tystnadsregeln borta | drop 282 i `160345` (bas utan regeln träffar den också) |

## MARGINALER (fria prov, domarens räkning; standard 49,8 – tappen gav domarens tal i alla tre mätningarna)

| gräns | −25 % | +25 % |
|---|---|---|
| `PHRASE_HELD_MIN` 10 | 55,4 | 56,2 (476 i `151659` kommer med av tur i båda) |
| `PHRASE_HELD_DB` 5 | 48,1 | **30,9 – faller** (`151659` 0 av 5) |
| `PHRASE_LAND_DB` 3 | 40,7 | 49,8 |
| `PHRASE_FLOOR_DB` 12 | 40,6 | 48,8 |
| `PHRASE_FADE_DB` 1,5 | 40,7 | 42,8 |
| `PHRASE_BEATS` 32 | 42,2 | 45,0 |
| `PHRASE_MEM_BEATS` 128 | 51,4 | 49,8 |
| `PHRASE_SUB` 4 | 49,8 | 49,8 |

**`PHRASE_HELD_DB` klarar inte +25 %**: kick-ensam-slagen ligger 5,0–6,6 dB under taket. Platån är 3–5,5 (47,5 / 48,2 vid 4 / 50,0);
4 tål ±25 % men är inte domarmätt – budgeten var slut. Alla 40-tal: ett av de två dropen i `151659` faller.

## SIFFRORNA (drop, motordrop, mini som drop)

| | poäng | `160345` | `151659` | `193818` | tid s | drop/min |
|---|---|---|---|---|---|---|
| bas | 29,2 | 23,9 (1/9, 10, 2) | 22,2 (0/5, 2, 0) | 62,1 (5/9, 12, 1) | 0,31 / – / 0,13 | 1,03 / 0,23 / 0,42 |
| m1 prototyp: helslag mot taket, 8 slag | 57,2 | 58,4 (6/9, 16, 5) | 53,3 (3/5, 13, 3) | 71,6 (7/9, 23, 0) | 0,42 / 0,41 / 0,43 | 1,65 / 1,52 / 0,81 |
| m2 slutkod, 8 slag | 47,8 | 55,8 (6/9, 18, 6) | 40,2 (2/5, 14, 3) | 70,4 (7/9, 29, 0) | 0,35 / 0,25 / 0,33 | 1,85 / 1,64 / 1,02 |
| **m3 slutkod, 10 slag** | **49,8** | 66,5 (6/9, 14, 3) | 40,2 (2/5, 14, 3) | 71,4 (7/9, 24, 0) | 0,35 / 0,25 / 0,33 | 1,44 / 1,64 / 0,84 |

m1 är inte bättre än m3: tredje droppet i `151659` var tur (fyra startfaser av samma kod: 57 / 48 / 49 / 42) och tiden låg 0,07 s
från spärren. Räkna med 48–50.

Sämre än bas: fler motordrop (14 / 14 / 24 mot 10 / 2 / 12), mini som drop i `151659` 3 av 9 (bas 0), "inte drop" i `193818` 1 av 3
(bas 0). **Olöst: 168 och 476 i `151659` – basen kommer tillbaka på taket 8 resp. 5 s före droppet, motorn fyrar där och
12 s-regeln tar droppet.** Missade i övrigt: 214, 218 (12 s-regeln), 302 (fyrar 1,2 s efter markeringen), 51 och 1201 i `193818`
samt 524 (ingen lucka alls i basen).

## RISKEN

- Pop utan break: aldrig 10 hållna slag → inga drop, bara minidrop.
- Uppbyggnad där basen kommer in på full nivå före droppet: fyrar för tidigt (ovan).
- Låtstart efter tystnad eller tal: första basinsatsen som når det gamla taket blir drop; en svagare låt efter en stark får färre
  drop första minuten (taket glömmer 6 dB på 128 slag).
- Långa mixar: break över 128 slag tappar taket → insatsen efter blir inget drop.
- Klockan i fel oktav: halvt tempo dubblar slaget och landningen kommer senare (tid mot 0,5 s); dubbelt gör att kicken ensam fyller slaget.
- Tyst eller stark inspelning: allt är relativt bandets eget tak, ingen absolut nivå.
- Drop/min 1,64 i `151659` mot spärren 2,0.

## DIFFEN

`git diff --no-index src .arena/drop2/a3/src` (= `diff.patch`; `forsk/` har mätskripten och `final.py` som bygger filen ur originalet):

```diff
diff --git a/src/ANALYSER_SHARED.md5 b/.arena/drop2/a3/src/ANALYSER_SHARED.md5
index be5b2ff..fc36db5 100644
--- a/src/ANALYSER_SHARED.md5
+++ b/.arena/drop2/a3/src/ANALYSER_SHARED.md5
@@ -1,6 +1,6 @@
 # md5 (CRLF->LF) av de gemensamma filerna - samma i lotus-light-link och dmx-control. Skrivs av analyser_shared.py --write
 28fc97e76fe696e3c2716ee86eb03585 analyser.ts
-36803a2cf2affe308e43456b313b4dad analyserDrop.ts
+f1c21797b0fce5b3cf7681b516b7b65f analyserDrop.ts
 692befa55e7fd906cdc3652af3f27baa analyserSection.ts
 879ba2122d2a1d3e0eea4082adfd2355 analyserSpectrum.ts
 e92d0d6b4f8dc36abfb8135004260806 analyserLevel.ts
diff --git a/src/analyserDrop.ts b/.arena/drop2/a3/src/analyserDrop.ts
index f582cb3..5ad13e7 100644
--- a/src/analyserDrop.ts
+++ b/.arena/drop2/a3/src/analyserDrop.ts
@@ -18,11 +18,10 @@ const MINI_PEAK_DB = 10;
 const DROP_SHORT_MS = 4000;   // minsta drop-avstand nar dropen ESKALERAR
 const DROP_LONG_MS = 20000;   // annars maste sa har lang tid ga
 const DROP_ESCALATE_DB = 3;   // tatare drops maste vara TYDLIGT starkare for att fyra
-const FLANK_GONE_DB = 10, FLANK_BREAK_S = 4, FLANK_LAND_DB = 6, FLANK_RISE_DB = 12, FLANK_HOLD_S = 0.6, FLANK_GRACE_S = 1;   // FULL DROP PÅ FLANKEN
-const FLANK_SHORT_S = 2, FLANK_SHORT_RISE_DB = 24, FLANK_SILENT_LV = 0.005;
+const PHRASE_BEATS = 32, PHRASE_MEM_BEATS = 128, PHRASE_SUB = 4, PHRASE_HELD_DB = 5, PHRASE_HELD_MIN = 10, PHRASE_LAND_DB = 3, PHRASE_FLOOR_DB = 12, PHRASE_FADE_DB = 1.5;   // FRASEN
 const SHOW_DROP_GAP_MS = 12000;   // spärr mellan full drops
 const NEAR_RISE_DB = 10, NEAR_DIP_DB = 8, LIFT_DB = 10, STOP_MINI_S = 0.6;   // LYFT/NÄSTAN-DROP/STOPP
-const DOUBLE_FROM_START = ['bodyEnv', 'bodyFast', 'bodyCeil', 'bodyPeak', 'lastGoneSpanMs', 'lastDropMs', 'lastMiniGoneMs', 'lastMiniMs', 'miniGoneMs', 'bodyGoneMs', 'lastBodyGoneMs', 'dropArmUntil', 'dropArmAt', 'fdGone', 'fdSpan', 'fdEnd', 'fdAt', 'fdQuietAt', 'lastShowDropMs', 'dropRiseDb', 'nearB', 'nearNorm', 'nearFloor', 'liftCalm', 'liftLift', 'liftHistAt', 'stopRunS', 'nearDropDb', 'nearDipDb', 'liftDb', 'stopS'] as const;   // Talfält som ska vara flyttal från start
+const DOUBLE_FROM_START = ['bodyEnv', 'bodyFast', 'bodyCeil', 'bodyPeak', 'lastGoneSpanMs', 'lastDropMs', 'lastMiniGoneMs', 'lastMiniMs', 'miniGoneMs', 'bodyGoneMs', 'lastBodyGoneMs', 'dropArmUntil', 'dropArmAt', 'fdAt', 'lastShowDropMs', 'phSum', 'phSum2', 'phAcc', 'phBpm', 'phCeil', 'dropRiseDb', 'nearB', 'nearNorm', 'nearFloor', 'liftCalm', 'liftLift', 'liftHistAt', 'stopRunS', 'nearDropDb', 'nearDipDb', 'liftDb', 'stopS'] as const;   // Talfält som ska vara flyttal från start
 
 export class DropDetector {
   a: Analyser;   // analysatorn som äger den här delen
@@ -51,8 +50,9 @@ export class DropDetector {
   dropCount = 0;   // monoton drop-räknare
   dropCand = 0;   // slam-kandidaterna
   dropDemoted = 0; dropSpaced = 0; dropRiseDb = -0;
-  private fdGone = -0; private fdSpan = -0; private fdEnd = -1e12; private fdAbove = true; private fdAt = -1e12; private fdQuietAt = -1e12; private lastShowDropMs = -1e12;
-  private fdT = new Float64Array(1024); private fdV = new Float64Array(1024); private fdS0 = 0; private fdN = 0;
+  private fdAt = -1e12; private lastShowDropMs = -1e12;
+  private phHop = new Float32Array(512); private phW = 0; private phN = 1; private phSum = 0; private phSum2 = 0; private phAcc = 0; private phBpm = 120;   // FRASEN: glidande slag
+  private phBeat = new Float32Array(PHRASE_MEM_BEATS * PHRASE_SUB); private phBW = 0; private phBN = 0; private phCeil = -300; private phHeld = 0; private phArmed = false;   // slagens minne
   private nearOn = false; private nearB = -0; private nearNorm = -0; private nearFloor = 1e9; private liftCalm = -0; private liftLift = -0;
   private liftHist = new Float64Array(240); private liftW = 0; private liftN = 0; private liftHistAt = -1e12; private stopRunS = -0;
   nearDropDb = -0; nearDipDb = -0; liftDb = -0; stopCount = 0; stopS = -0;
@@ -68,7 +68,7 @@ export class DropDetector {
     this.bodyCeil = Math.max(this.bodyEnv, this.bodyCeil - dtHop * BODY_CEIL_DB_S);
     this.bodyPeak = Math.max(this.bodyEnv, this.bodyPeak - dtHop * 0.04);
     this.a.bodyUnderDb = this.bodyCeil - this.bodyEnv;
-    const flank = this.flankStep(nowWallA, dtHop);
+    const flank = this.phraseStep(nowWallA, dtHop, bodyNow);
     this.liftStep(nowWallA, dtHop, bodyNow);
 
     if (this.bodyEnv < this.bodyCeil - BODY_GONE_DB) {
@@ -156,21 +156,37 @@ export class DropDetector {
     } else if (cand && nowWallA - this.fdAt > 2000) { this.dropDemoted++; this.miniDropCount++; }
   }
 
-  /** FULL DROP PÅ FLANKEN. */
-  private flankStep(now: number, dt: number): boolean {
-    const CAP = 1024, T = this.fdT, V = this.fdV, f = this.bodyFast, ceil = this.bodyCeil;
-    if (this.fdN === CAP) { this.fdS0 = (this.fdS0 + 1) & (CAP - 1); this.fdN--; }
-    { const w = (this.fdS0 + this.fdN) & (CAP - 1); T[w] = now; V[w] = f; this.fdN++; }
-    while (this.fdN > 1 && now - T[this.fdS0] > FLANK_HOLD_S * 1000) { this.fdS0 = (this.fdS0 + 1) & (CAP - 1); this.fdN--; }
-    let top = -1e9, low = 1e9; for (let q = 0; q < this.fdN; q++) { const i = (this.fdS0 + q) & (CAP - 1); if (V[i] > top) top = V[i]; if (now - T[i] <= 500 && V[i] < low) low = V[i]; }
-    if (top < ceil - FLANK_GONE_DB) this.fdGone += dt; else { if (this.fdGone > 0) { this.fdSpan = this.fdGone; this.fdEnd = now; } this.fdGone = 0; }
-    const above = f > ceil - FLANK_LAND_DB, edge = above && !this.fdAbove; this.fdAbove = above;
-    const span = this.fdGone > 0 ? this.fdGone : now - this.fdEnd < FLANK_GRACE_S * 1000 ? this.fdSpan : 0;
-    if (this.a.lvlSmooth <= FLANK_SILENT_LV) this.fdQuietAt = now;
-    if (!edge || f - low < FLANK_RISE_DB || (span < FLANK_BREAK_S && !(span >= FLANK_SHORT_S && ceil - low >= FLANK_SHORT_RISE_DB))) return false;
-    if (now - this.fdQuietAt < span * 1000 + 500) { this.fdGone = 0; this.fdSpan = 0; if (DROP_TRACE) console.log(`[flank] ingen drop: helt tyst i breaket (latstart), break ${span.toFixed(1)} s`); return false; }
-    this.fdGone = 0; this.fdSpan = 0; this.fdAt = now; this.dropRiseDb = f - low;
-    if (DROP_TRACE) console.log(`[flank] full drop pa flanken: break ${span.toFixed(1)} s, stigning ${(f - low).toFixed(1)} dB`);
+  /** FRASEN: full drop när basen landar på frasens tak efter en hållen fras. */
+  private phraseStep(now: number, dt: number, body: number): boolean {
+    const H = this.phHop, B = this.phBeat, bpm = this.a.dBpm;
+    if (bpm > 40) this.phBpm = bpm < 60 ? 60 : bpm > 200 ? 200 : bpm;
+    const n = Math.min(511, Math.max(8, Math.round(60 / this.phBpm / dt))), floor = this.phCeil - PHRASE_FLOOR_DB, x = body > floor ? body : floor;
+    H[this.phW] = x; this.phW = (this.phW + 1) & 511;
+    const n2 = n >> 1;
+    if (n !== this.phN) { let s = 0, s2 = 0; for (let q = 1; q <= n; q++) { s += H[(this.phW - q) & 511]; if (q === n2) s2 = s; } this.phSum = s; this.phSum2 = s2; this.phN = n; }
+    else { this.phSum += x - H[(this.phW - 1 - n) & 511]; this.phSum2 += x - H[(this.phW - 1 - n2) & 511]; }
+    const mean = this.phSum / n, half = this.phSum2 / n2;
+    this.phAcc += dt * this.phBpm / 60 * PHRASE_SUB;
+    if (this.phAcc >= 1) {
+      const M = PHRASE_MEM_BEATS * PHRASE_SUB, fade = PHRASE_FADE_DB / (PHRASE_BEATS * PHRASE_SUB);
+      this.phAcc -= 1; B[this.phBW] = mean; this.phBW = (this.phBW + 1) % M; if (this.phBN < M) this.phBN++;
+      const N = this.phBN; let c = -300, held = 0;
+      for (let a = 0, j = this.phBW; a < N - 3 * PHRASE_SUB; a++) {
+        if (--j < 0) j = M - 1;
+        let bar = B[j]; for (let k = 1, i = j; k < 4; k++) { i -= PHRASE_SUB; if (i < 0) i += M; if (B[i] < bar) bar = B[i]; }
+        bar -= a * fade; if (bar > c) c = bar;
+      }
+      if (N > 3 * PHRASE_SUB) this.phCeil = c;
+      for (let a = Math.min(N, PHRASE_BEATS * PHRASE_SUB), j = this.phBW; a > 0; a--) { if (--j < 0) j = M - 1; if (B[j] < c - PHRASE_HELD_DB) held++; }
+      this.phHeld = held / PHRASE_SUB;
+    }
+    if (mean < this.phCeil - PHRASE_HELD_DB) { this.phArmed = true; return false; }
+    if (!this.phArmed || half < this.phCeil || mean < this.phCeil - PHRASE_LAND_DB) return false;
+    this.phArmed = false;
+    if (this.phHeld < PHRASE_HELD_MIN || this.phBN < PHRASE_BEATS * PHRASE_SUB || this.a.activeMs <= 2000) return false;
+    { let lo = this.bodyFast, hi = lo; const h = this.bodyHist, HL = h.length; for (let q = 1; q <= this.bodyHistLen; q++) { const v = h[(this.bodyHistPos - q + HL) % HL]; if (v < lo) lo = v; else if (v > hi) hi = v; } this.dropRiseDb = hi - lo; }
+    this.fdAt = now;
+    if (DROP_TRACE) console.log(`[fras] full drop: ${this.phHeld} hållna slag av ${PHRASE_BEATS}, tak ${this.phCeil.toFixed(1)}`);
     return true;
   }
 
```
