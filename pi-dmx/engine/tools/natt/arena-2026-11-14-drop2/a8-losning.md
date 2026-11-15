# a8 – DET SOM INTE ÄR ETT DROP (vetot)

## IDÉN

En baslandning är ett drop bara när basen hållits tillbaka längre än ett fill (över ungefär två takter), HELA botten slår in tillsammans (sub, bas och låg-mitt når vart och ett sitt eget tak) och låten når sin fulla nivå. Det som faller på något av dem är det ägaren inte kallar drop – en ny låt som börjar svagare, basen som kommer tillbaka utan sub efter en lugn vers, fillet i fullt groove – och därför kan även korta luckor (0,8 s i stället för 4 s) få bli kandidater.

**Den andra sorten löser vetot inte:** i `151659` (basen spelar vidare) finns ingen flank att döma. 0 av 5 drop, samma 22,2 p som bas, och det är den filen som håller poängen nere.

## DELAR

| del | tar bort / släpper fram | mått, fil |
|---|---|---|
| **V1 nivåtaket** `VETO_FULL` | landningen når inte 84 % av låtens nivåtak inom 0,3 s | inte: `160345` 500. precision: `193818` 365, 1415, 1642 |
| **V3 hela botten** `VETO_BOTTOM_DB` | något av band 0–3 (20–500 Hz) når inte inom 4,5 dB av sitt eget tak | inte: `160345` 529 (sub utan bas). mini: `160345` 347 (bas utan sub). precision: `193818` 1226 (låtbyte), 1322, 1657 |
| V1 + V3 (båda tar dem) | halva återkomster före det riktiga droppet | precision: `160345` 207, 408, 423, 438; `193818` 437. drop: 441 och 445 kommer ur 12 s-skuggan |
| **V2 fillet** `VETO_FILL_S`, `VETO_HELD_DB` | basen under taket − 3 dB kortare än 4,2 s | mini: `160345` 463, 590 (+ inte 593); `193818` 1475; `151659` 269, 319, 445 |
| **öppningen** `FLANK_BREAK_S` 4 → 0,8 | kort lucka räcker som kandidat (bara ihop med V2) | drop: `160345` 51, 137, 441; `193818` 291 |
| eget nivåtak `lvCeil` | `levelCeil` startar på 0,5 och vetade allt första minuten | drop: `160345` 51 |

En del i taget avstängd (ensam-körning; drop, motordrop, mini som drop, inte med drop):

| | poäng | 160345 | 151659 | 193818 |
|---|---|---|---|---|
| allt på | **40,3** | 5/9, 8, 2, 0 | 0/5, 2, 0, 0 | 7/9, 8, 0, 0 |
| utan nivåtaket (VETO_FULL=0) | **39.3** | 5/9, 8, 1, 1 | 0/5, 2, 0, 0 | 7/9, 11, 0, 0 |
| utan hela botten (VETO_BOTTOM_DB=99) | **38.7** | 5/9, 9, 2, 1 | 0/5, 2, 0, 0 | 7/9, 11, 0, 0 |
| utan fillet (VETO_FILL_S=0) | **32.1** | 5/9, 12, 4, 1 | 0/5, 6, 3, 0 | 7/9, 11, 1, 0 |

## MARGINALER (±25 %, `--set`; i parentes 160345 · 193818)

| gräns | värde | −25 % | +25 % |
|---|---|---|---|
| VETO_FULL (nivåtaket, ±25 % av avståndet i dB) | 0,84 | 0.878: **40.3** (5/9, 8, 2, 0 · 7/9, 8, 0, 0) | 0.806: **40.3** (5/9, 8, 2, 0 · 7/9, 8, 0, 0) |
| VETO_BOTTOM_DB (hela botten) | 4,5 dB | 3.375: **40.6** (5/9, 7, 2, 0 · 7/9, 8, 0, 0) | 5.625: **40.0** (5/9, 8, 2, 0 · 7/9, 9, 0, 0) |
| VETO_FILL_S (fillet) | 4,2 s | 3.15: **37.3** (5/9, 11, 4, 1 · 7/9, 10, 1, 0) | 5.25: **38.7** (3/9, 5, 1, 0 · 7/9, 8, 0, 0) |
| VETO_HELD_DB (hållen tillbaka) | 3 dB | 2.25: **38.7** (5/9, 8, 2, 0 · 7/9, 8, 0, 0) | 3.75: **39.6** (5/9, 7, 2, 0 · 6/9, 7, 0, 0) |
| VETO_LAND_MS (landningens fönster) | 300 ms | 225: **40.6** (5/9, 7, 2, 0 · 7/9, 8, 0, 0) | 375: **40.3** (5/9, 8, 2, 0 · 7/9, 8, 0, 0) |
| FLANK_BREAK_S (luckan före smällen, var 4) | 0,8 s | 0.6: **40.0** (5/9, 8, 2, 0 · 7/9, 9, 0, 0) | 1.0: **40.3** (5/9, 8, 2, 0 · 7/9, 8, 0, 0) |

Fem av sex gränser rör poängen högst 1,6 p (störst: `VETO_HELD_DB` 2,25, där en minidrop i `151659` blir drop, 19,8 p på den filen). **Fillgränsen tål inte ±25 %:** fillen är högst 3,7 s, den kortaste uppbyggnaden 4,8 s (två takter mot två och en halv). Vid 3,15 s blir minidropen 463, 590 och 1475 drop igen; vid 5,25 s försvinner dropen 137 och 367. Domen faller inte under bas, men avståndet är smalt i musiken själv.

## SIFFRORNA

- **bas** 29,2 – 160345: 23,9 p, drop 1/9, motordrop 10 · 151659: 22,2 p, 0/5, 2 · 193818: 62,1 p, 5/9, 12.
- **m1** 39.5 (medel 56.8, sämst 22.2) – 160345: 61.9 p, drop 4/9, motordrop 6, mini som drop 2/11, inte med drop 0/3, tid 0.37 s · 151659: 22.2 p, drop 0/5, motordrop 2, mini som drop 0/9, inte med drop 0/0, tid 0.00 s · 193818: 86.4 p, drop 7/9, motordrop 8, mini som drop 0/5, inte med drop 0/3, tid 0.15 s
- **m2** 40.3 (medel 58.4, sämst 22.2) – 160345: 66.6 p, drop 5/9, motordrop 8, mini som drop 2/11, inte med drop 0/3, tid 0.19 s · 151659: 22.2 p, drop 0/5, motordrop 2, mini som drop 0/9, inte med drop 0/0, tid 0.00 s · 193818: 86.4 p, drop 7/9, motordrop 8, mini som drop 0/5, inte med drop 0/3, tid 0.15 s
- m3 inte använd. m2 = m1 + eget nivåtak och toppnivån i fönstret.

Inget mått blev sämre än bas. Kvar som fel: minidropen 507 och 536 i `160345` (536 låg förr i skuggan av det falska droppet 529), omarkerade 29, 407, 416, 430. Missade drop: 211/214 (subben slår in ovanpå en bas som redan är tillbaka, ingen flank), 282 (befintliga tystnadsregeln), 302 (mjuk landning), 51 och 1201 i `193818` (inget syns i basen).

Kostnad: domaren visade ×2,59 (m1, mina egna svep gick samtidigt) och ×1,79 (m2, andra mätte). Drop-delen ensam (m1-bygget) skiljer sig inte från bas utöver lastbruset (7,4–9,9 s mot 7,2–8,6 s per körning); tillägget är en slinga över fyra band per hopp, inga allokeringar.

## RISKEN

- **Insats-sorten / pop utan break:** ingen flank, inget drop. Till jokern: i `151659` ligger SUBBEN (band 0) 10–20 dB under sitt tak i 12–20 s före tre av fem drop medan bas och kick spelar; samma klocka per band kan bli kandidaten där. V3 med band 3 skulle då veta droppet 476.
- **Svagare låt efter starkare:** taken minns förra låten (0,13–0,15 dB/s); första droppet i en låt mer än 1,5 dB svagare vetas, cirka 8 s per dB.
- **Taktmixad ny låt** med full botten efter mer än 4,2 s utan bas blir drop (407 i `193818`). **Tal mellan låtar** likaså, om inte tystnadsregeln tar det.
- **Tempo:** fillgränsen är i sekunder. Vid 100 BPM släpps ett tvåtaktsfill (4,8 s); vid 174 BPM vetas en uppbyggnad på tre takter.
- **Klippt, stark inspelning:** allt når nivåtaket, V1 blir tandlös; V2 och V3 står kvar.
- **Tiden:** vetot väntar upp till 0,3 s på botten (median 0,15–0,19 s på övningen).

## DIFFEN

Byte-exakt i `losning.diff` (källfilen har lösa CR mitt i raderna: `git -c core.autocrlf=false apply` eller `patch --binary`).

```diff
diff --git a/src/ANALYSER_SHARED.md5 b/.arena/drop2/a8/src/ANALYSER_SHARED.md5
index be5b2ff..8e12b32 100644
--- a/src/ANALYSER_SHARED.md5
+++ b/.arena/drop2/a8/src/ANALYSER_SHARED.md5
@@ -1,6 +1,6 @@
 # md5 (CRLF->LF) av de gemensamma filerna - samma i lotus-light-link och dmx-control. Skrivs av analyser_shared.py --write
 28fc97e76fe696e3c2716ee86eb03585 analyser.ts
-36803a2cf2affe308e43456b313b4dad analyserDrop.ts
+dcc26a5ef30e369e45f835c3a8db3589 analyserDrop.ts
 692befa55e7fd906cdc3652af3f27baa analyserSection.ts
 879ba2122d2a1d3e0eea4082adfd2355 analyserSpectrum.ts
 e92d0d6b4f8dc36abfb8135004260806 analyserLevel.ts
diff --git a/src/analyserDrop.ts b/.arena/drop2/a8/src/analyserDrop.ts
index f582cb3..af893a6 100644
--- a/src/analyserDrop.ts
+++ b/.arena/drop2/a8/src/analyserDrop.ts
@@ -18,11 +18,13 @@ const MINI_PEAK_DB = 10;
 const DROP_SHORT_MS = 4000;   // minsta drop-avstand nar dropen ESKALERAR
 const DROP_LONG_MS = 20000;   // annars maste sa har lang tid ga
 const DROP_ESCALATE_DB = 3;   // tatare drops maste vara TYDLIGT starkare for att fyra
-const FLANK_GONE_DB = 10, FLANK_BREAK_S = 4, FLANK_LAND_DB = 6, FLANK_RISE_DB = 12, FLANK_HOLD_S = 0.6, FLANK_GRACE_S = 1;   // FULL DROP PÅ FLANKEN
-const FLANK_SHORT_S = 2, FLANK_SHORT_RISE_DB = 24, FLANK_SILENT_LV = 0.005;
+const FLANK_GONE_DB = 10, FLANK_BREAK_S = 0.8, FLANK_LAND_DB = 6, FLANK_RISE_DB = 12, FLANK_HOLD_S = 0.6, FLANK_GRACE_S = 1;   // FULL DROP PÅ FLANKEN
+const FLANK_SILENT_LV = 0.005;
+const VETO_FULL = 0.84, VETO_BOTTOM_DB = 4.5, VETO_LAND_MS = 300;   // VETO: landar under låtens nivåtak (lvCeil, 1,5 %/s som levelCeil) / utan hela botten (band 0-3 mot egna tak) = inte drop
+const VETO_HELD_DB = 3, VETO_FILL_S = 4.2;   // VETO: basen hållen tillbaka kortare än så = fill, inte uppbyggnad
 const SHOW_DROP_GAP_MS = 12000;   // spärr mellan full drops
 const NEAR_RISE_DB = 10, NEAR_DIP_DB = 8, LIFT_DB = 10, STOP_MINI_S = 0.6;   // LYFT/NÄSTAN-DROP/STOPP
-const DOUBLE_FROM_START = ['bodyEnv', 'bodyFast', 'bodyCeil', 'bodyPeak', 'lastGoneSpanMs', 'lastDropMs', 'lastMiniGoneMs', 'lastMiniMs', 'miniGoneMs', 'bodyGoneMs', 'lastBodyGoneMs', 'dropArmUntil', 'dropArmAt', 'fdGone', 'fdSpan', 'fdEnd', 'fdAt', 'fdQuietAt', 'lastShowDropMs', 'dropRiseDb', 'nearB', 'nearNorm', 'nearFloor', 'liftCalm', 'liftLift', 'liftHistAt', 'stopRunS', 'nearDropDb', 'nearDipDb', 'liftDb', 'stopS'] as const;   // Talfält som ska vara flyttal från start
+const DOUBLE_FROM_START = ['bodyEnv', 'bodyFast', 'bodyCeil', 'bodyPeak', 'lastGoneSpanMs', 'lastDropMs', 'lastMiniGoneMs', 'lastMiniMs', 'miniGoneMs', 'bodyGoneMs', 'lastBodyGoneMs', 'dropArmUntil', 'dropArmAt', 'fdGone', 'fdSpan', 'fdEnd', 'fdAt', 'fdQuietAt', 'heldS', 'lvCeil', 'landUntil', 'landCeil', 'landLv', 'landRise', 'lastShowDropMs', 'dropRiseDb', 'nearB', 'nearNorm', 'nearFloor', 'liftCalm', 'liftLift', 'liftHistAt', 'stopRunS', 'nearDropDb', 'nearDipDb', 'liftDb', 'stopS'] as const;   // Talfält som ska vara flyttal från start
 
 export class DropDetector {
   a: Analyser;   // analysatorn som äger den här delen
@@ -52,6 +54,8 @@ export class DropDetector {
   dropCand = 0;   // slam-kandidaterna
   dropDemoted = 0; dropSpaced = 0; dropRiseDb = -0;
   private fdGone = -0; private fdSpan = -0; private fdEnd = -1e12; private fdAbove = true; private fdAt = -1e12; private fdQuietAt = -1e12; private lastShowDropMs = -1e12;
+  private heldS = -0; private lvCeil = -0; private landUntil = -1e12; private landCeil = -0; private landLv = -0; private landRise = -0;   // vetots tillstånd
+  private btEnv = new Float64Array(4).fill(-120); private btFast = new Float64Array(4).fill(-120); private btCeil = new Float64Array(4).fill(-300); private landTop = new Float64Array(4); private landBt = new Float64Array(4);
   private fdT = new Float64Array(1024); private fdV = new Float64Array(1024); private fdS0 = 0; private fdN = 0;
   private nearOn = false; private nearB = -0; private nearNorm = -0; private nearFloor = 1e9; private liftCalm = -0; private liftLift = -0;
   private liftHist = new Float64Array(240); private liftW = 0; private liftN = 0; private liftHistAt = -1e12; private stopRunS = -0;
@@ -167,10 +171,21 @@ export class DropDetector {
     const above = f > ceil - FLANK_LAND_DB, edge = above && !this.fdAbove; this.fdAbove = above;
     const span = this.fdGone > 0 ? this.fdGone : now - this.fdEnd < FLANK_GRACE_S * 1000 ? this.fdSpan : 0;
     if (this.a.lvlSmooth <= FLANK_SILENT_LV) this.fdQuietAt = now;
-    if (!edge || f - low < FLANK_RISE_DB || (span < FLANK_BREAK_S && !(span >= FLANK_SHORT_S && ceil - low >= FLANK_SHORT_RISE_DB))) return false;
-    if (now - this.fdQuietAt < span * 1000 + 500) { this.fdGone = 0; this.fdSpan = 0; if (DROP_TRACE) console.log(`[flank] ingen drop: helt tyst i breaket (latstart), break ${span.toFixed(1)} s`); return false; }
-    this.fdGone = 0; this.fdSpan = 0; this.fdAt = now; this.dropRiseDb = f - low;
-    if (DROP_TRACE) console.log(`[flank] full drop pa flanken: break ${span.toFixed(1)} s, stigning ${(f - low).toFixed(1)} dB`);
+    const raw = this.a.bandDbRaw, bE = this.btEnv, bF = this.btFast, bC = this.btCeil, lT = this.landTop, kE = Math.min(1, dt / 0.35), kF = Math.min(1, dt / BODY_FAST_S);
+    for (let b = 0; b < 4; b++) { const x = raw[b]; bE[b] += (x - bE[b]) * kE; bF[b] += (x - bF[b]) * kF; bC[b] = Math.max(bE[b], bC[b] - dt * BODY_CEIL_DB_S); if (bF[b] > lT[b]) lT[b] = bF[b]; }
+    const lv = this.a.lvlSmooth; this.lvCeil = Math.max(lv, this.lvCeil - dt * 0.015 * this.lvCeil); if (lv > this.landLv) this.landLv = lv;
+    const held = this.heldS; if (this.bodyEnv < ceil - VETO_HELD_DB) this.heldS += dt; else this.heldS = 0;
+    if (edge && f - low >= FLANK_RISE_DB && span >= FLANK_BREAK_S) {
+      this.fdGone = 0; this.fdSpan = 0;
+      if (now - this.fdQuietAt < span * 1000 + 500) { if (DROP_TRACE) console.log(`[flank] ingen drop: helt tyst i breaket (latstart), break ${span.toFixed(1)} s`); return false; }
+      if (held < VETO_FILL_S) { if (DROP_TRACE) console.log(`[flank] ingen drop: fill, basen hallen tillbaka ${held.toFixed(1)} s`); return false; }
+      this.landUntil = now + VETO_LAND_MS; this.landCeil = this.lvCeil; this.landLv = lv; this.landRise = f - low;
+      for (let b = 0; b < 4; b++) { this.landBt[b] = bC[b] - VETO_BOTTOM_DB; lT[b] = bF[b]; }
+    }
+    if (now > this.landUntil || this.landLv < this.landCeil * VETO_FULL) return false;
+    for (let b = 0; b < 4; b++) if (lT[b] < this.landBt[b]) return false;
+    this.landUntil = -1e12; this.fdAt = now; this.dropRiseDb = this.landRise;
+    if (DROP_TRACE) console.log(`[flank] full drop pa flanken: stigning ${this.landRise.toFixed(1)} dB`);
     return true;
   }
 
```
