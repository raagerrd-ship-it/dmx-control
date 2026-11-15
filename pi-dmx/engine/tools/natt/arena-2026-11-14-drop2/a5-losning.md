# a5 – LANDNINGENS SIGNATUR

## Idén

En landning blir full drop när själva smällen har tre drag inom en kvarts sekund: basen har klivit minst 12 dB över sitt medel
strax före OCH STÅR KVAR där (hållets LÄGSTA värde räknas, så ett slag som klingar av faller), hela spektrat har klivit med
(medel av de åtta bandens lägsta värde i hållet), och hela nivån ligger vid låtens eget tak. Det stämmer i båda sorterna därför
att mätningen aldrig frågar hur länge basen varit borta: efter en lång breakdown och efter ett kort fill ser insatsen likadan ut –
en full sektion som börjar står kvar brett och starkt, ett fill-slag eller en kick i ett pumpande parti gör det inte.

Flanken (lång basfrånvaro -> återkomst) ger inte längre full drop; utan signatur blir den minidrop.

## Delar (allt i `analyserDrop.ts`; "utan" = `--set` -99/99 i fria prov)

| del | bär | utan delen: poäng; drop 160345/151659/193818; motordrop |
|---|---|---|
| bassteget som står (`LAND_BASS_DB`, `LAND_HOLD_S`, `LAND_PRE_S`) | precision i 193818 | 55,1; 5/4/6; 14/13/**44** |
| bredden (`LAND_WIDE_DB`) | precision + mini i 151659, håller floden nere | 52,7; 5/4/6; 14/17/27, flod **1,99/min** |
| nivån vid taket (`LAND_FULL_DB`, läser `levelCeil`) | drop i 160345 och 151659 (tar bort landningar i uppbyggnaden som låser droppet i 12 s) | 42,7; 4/2/5; 17/16/22 |
| `dropClassify`: landningen = full drop, flank/slam utan signatur = minidrop | precision och inte-drop i 160345 | – |
| `fdLow` -> `dropRiseDb` | samma betydelse som förr | – |

Tyst strax före (`activeMs`, `fdQuietAt` – flankens egna regler) = låtstart, ingen drop.

EJ INLAGD, till jokern (`analyserDrop-bred.ts.txt`): en BRED väg – bredd ≥ 5 dB räcker utan bassteg. Fria prov 56,4: tar 359
i 151659 (basen spelar vidare, 4/5) och 1201 i 193818 (6/9), men 33 motordrop i 193818 mot 19 och 1,7/min i filens sista fem
minuter. Kontrollfilen 200719 börjar där 193818 slutar – flodrisken avgjorde.

## Marginaler (fria prov, ±25 %; mitt 54,1)

| gräns | −25 % | +25 % |
|---|---|---|
| `LAND_HOLD_S` 0,16 | 52,3 | 55,1 |
| `LAND_PRE_S` 0,6 | 50,5 | 52,1 |
| `LAND_SKIP_S` 0,05 | 54,2 | 54,1 |
| `LAND_BASS_DB` 12 | 53,1 | 55,1 |
| `LAND_WIDE_DB` 4 | 53,1 | 50,3 |
| `LAND_FULL_DB` 2 | 55,2 | 49,1 |

Lägst 49,1 (bas 29,2); tid 0,18–0,28 s, flod högst 1,64/min. Utanför ±25 %: hållet 0,22–0,25 s ger 48–49.

## Siffrorna (drop, motordrop, mini som drop, inte-drop med drop)

| | poäng | 160345 | 151659 | 193818 |
|---|---|---|---|---|
| bas | 29,2 | 23,9: 1/9, 10, 2/11, 3/3 | 22,2: 0/5, 2, 0/9 | 62,1: 5/9, 12, 1/5, 0/3 |
| m1 (håll 0,2, bredd 3,5) | 54,0 | 51,5: 5/9, 13, 4/11, 2/3 | 54,2: 3/5, 11, 3/9 | 63,7: 5/9, 17, 0/5, 0/3 |
| m2 (slutlig) | **54,1** | 52,2: 5/9, 12, 4/11, 2/3 | 56,7: 3/5, 11, 2/9 | 59,0: 5/9, 19, 1/5, 0/3 |

m2: tid 0,24/0,27/0,22 s, flod högst 1,29/min, tempo 100 % = bas, kostnad x1,77 med andra igång (60 läsningar per hopp, 480 till
bara när bassteg och nivå redan är uppfyllda). m3 inte använd. Fria prov gav samma tal som domaren båda gångerna.

Sämre än bas: mini som drop 2 -> 4 av 11 (160345) och 0 -> 2 av 9 (151659); 193818 har 19 motordrop mot 12 och tappar 177 och
248 som bas tog (177 låses av en landning 9 s före, 248 har bredd 3,5 dB). Ljuset slår ~0,1 s senare än flanken.

Missade: 51 i 160345 (`levelCeil` startar på 0,5 och gör första minuten blind), 211 och 218 (12 s-regeln efter 214), 302
(markeringen 1 s före landningen), 359 i 151659 samt 51 och 1201 i 193818 (basen spelar vidare, bassteg 3–5 dB), 524 (en
kickrad börjar, inget står kvar).

## Risken

- Landningen skiljer INTE drop från minidrop (7 av 25 minidrop blir drop) – det avgörs före smällen. Bäst som grind till en
  annan deltagares laddning.
- Pop utan break: en hållen baston efter en lucka i ett pumpande parti ger signaturen (193818 vid 61, 110, 181, 208 s). Då
  begränsar bara 12 s-regeln; 160345 har 1,8/min i sina tätaste fem minuter.
- Taktmixade mixar: varje basbyte är en landning. Nivåtaket minns ~1 min, så drop i ett svagare spår efter ett starkt missas.
- Tal ger inget bassteg som står, men en låt som börjar med full bas direkt efter tal blir drop.
- Tyst/stark inspelning: allt är dB-steg och kvot mot eget tak; nära brusgolvet fladdrar de övre banden och bredden blir osäker.
- Poängen svänger ±3 mellan granngränser: en landning i uppbyggnaden låser droppet i 12 s.

## Diffen

`git diff --no-index src .arena/drop2/a5/src` (analyserDrop.ts; därtill en rad i `ANALYSER_SHARED.md5` från `analyser_shared.py --write`):

```diff
diff --git a/src/analyserDrop.ts b/.arena/drop2/a5/src/analyserDrop.ts
index f582cb3..32cf393 100644
--- a/src/analyserDrop.ts
+++ b/.arena/drop2/a5/src/analyserDrop.ts
@@ -21,8 +21,11 @@ const DROP_ESCALATE_DB = 3;   // tatare drops maste vara TYDLIGT starkare for a
 const FLANK_GONE_DB = 10, FLANK_BREAK_S = 4, FLANK_LAND_DB = 6, FLANK_RISE_DB = 12, FLANK_HOLD_S = 0.6, FLANK_GRACE_S = 1;   // FULL DROP PÅ FLANKEN
 const FLANK_SHORT_S = 2, FLANK_SHORT_RISE_DB = 24, FLANK_SILENT_LV = 0.005;
 const SHOW_DROP_GAP_MS = 12000;   // spärr mellan full drops
+const LAND_HOLD_S = 0.16, LAND_PRE_S = 0.6, LAND_SKIP_S = 0.05;   // LANDNINGENS SIGNATUR: hållet efter smällen, fönstret före, glappet emellan
+const LAND_BASS_DB = 12, LAND_WIDE_DB = 4, LAND_FULL_DB = 2;   // basens steg, hela spektrats steg, nivån högst så här långt under sitt eget tak (dB)
+const LAND_RING = 512, LAND_W = 10;   // ringen: 8 band + baskroppen + bandmedlet per hopp
 const NEAR_RISE_DB = 10, NEAR_DIP_DB = 8, LIFT_DB = 10, STOP_MINI_S = 0.6;   // LYFT/NÄSTAN-DROP/STOPP
-const DOUBLE_FROM_START = ['bodyEnv', 'bodyFast', 'bodyCeil', 'bodyPeak', 'lastGoneSpanMs', 'lastDropMs', 'lastMiniGoneMs', 'lastMiniMs', 'miniGoneMs', 'bodyGoneMs', 'lastBodyGoneMs', 'dropArmUntil', 'dropArmAt', 'fdGone', 'fdSpan', 'fdEnd', 'fdAt', 'fdQuietAt', 'lastShowDropMs', 'dropRiseDb', 'nearB', 'nearNorm', 'nearFloor', 'liftCalm', 'liftLift', 'liftHistAt', 'stopRunS', 'nearDropDb', 'nearDipDb', 'liftDb', 'stopS'] as const;   // Talfält som ska vara flyttal från start
+const DOUBLE_FROM_START = ['bodyEnv', 'bodyFast', 'bodyCeil', 'bodyPeak', 'lastGoneSpanMs', 'lastDropMs', 'lastMiniGoneMs', 'lastMiniMs', 'miniGoneMs', 'bodyGoneMs', 'lastBodyGoneMs', 'dropArmUntil', 'dropArmAt', 'fdGone', 'fdSpan', 'fdEnd', 'fdAt', 'fdQuietAt', 'lastShowDropMs', 'dropRiseDb', 'nearB', 'nearNorm', 'nearFloor', 'liftCalm', 'liftLift', 'liftHistAt', 'stopRunS', 'nearDropDb', 'nearDipDb', 'liftDb', 'stopS', 'ldSumB', 'ldSumA', 'ldAt', 'fdLow'] as const;   // Talfält som ska vara flyttal från start
 
 export class DropDetector {
   a: Analyser;   // analysatorn som äger den här delen
@@ -57,6 +60,8 @@ export class DropDetector {
   private liftHist = new Float64Array(240); private liftW = 0; private liftN = 0; private liftHistAt = -1e12; private stopRunS = -0;
   nearDropDb = -0; nearDipDb = -0; liftDb = -0; stopCount = 0; stopS = -0;
   lastDropMs = -1.5e9;   // utanfor Smi-intervallet
+  private ldE = new Float32Array(8); private ldR = new Float32Array(LAND_RING * LAND_W); private ldW = 0; private ldN = 0;   // LANDNINGENS SIGNATUR
+  private ldSumB = -0; private ldSumA = -0; private ldOn = false; private ldFull = Math.pow(10, -LAND_FULL_DB / 20); private ldAt = -1e12; private fdLow = -0;
 
   /** Drop-detektionen. */
   dropStep(): void {
@@ -69,6 +74,7 @@ export class DropDetector {
     this.bodyPeak = Math.max(this.bodyEnv, this.bodyPeak - dtHop * 0.04);
     this.a.bodyUnderDb = this.bodyCeil - this.bodyEnv;
     const flank = this.flankStep(nowWallA, dtHop);
+    const land = this.landStep(nowWallA, dtHop);
     this.liftStep(nowWallA, dtHop, bodyNow);
 
     if (this.bodyEnv < this.bodyCeil - BODY_GONE_DB) {
@@ -145,15 +151,39 @@ export class DropDetector {
       this.dropCand++; this.lastDropMs = nowWallA; this.lastDropRise = bodyRise;
       console.log(`[dropfire] wall ${this.a.wallNow()}${fireTag} rise ${bodyRise.toFixed(1)} fast ${this.bodyFast.toFixed(1)} peak ${this.bodyPeak.toFixed(1)} ceil ${this.bodyCeil.toFixed(1)} underPeak ${(this.bodyPeak - this.bodyFast).toFixed(1)} sinceDrop ${(sinceDrop/1000).toFixed(1)}s goneAgo ${((nowWallA - this.lastBodyGoneMs)/1000).toFixed(1)}s goneSpan ${(this.lastGoneSpanMs/1000).toFixed(1)}s edgeAgo ${(nowWallA - this.dropArmAt).toFixed(0)}ms`);
     }
-    this.dropClassify(flank, fireNow, nowWallA);
+    this.dropClassify(land, flank, fireNow, nowWallA);
   }
 
   /** EN DROPDETEKTOR. */
-  private dropClassify(flank: boolean, cand: boolean, nowWallA: number): void {
-    if (flank) {
+  private dropClassify(land: boolean, flank: boolean, cand: boolean, nowWallA: number): void {
+    if (land) {
       if (nowWallA - this.lastShowDropMs < SHOW_DROP_GAP_MS) { this.dropSpaced++; this.miniDropCount++; }
       else { this.lastShowDropMs = nowWallA; this.dropCount++; }
-    } else if (cand && nowWallA - this.fdAt > 2000) { this.dropDemoted++; this.miniDropCount++; }
+    } else if ((flank || cand) && nowWallA - this.ldAt > 2000 && (flank || nowWallA - this.fdAt > 2000)) { this.dropDemoted++; this.miniDropCount++; }
+  }
+
+  /** LANDNINGENS SIGNATUR. */
+  private landStep(now: number, dt: number): boolean {
+    const raw = this.a.bandDbRaw, e = this.ldE, R = this.ldR, k = Math.min(1, dt / BODY_FAST_S);
+    const nH = Math.max(2, Math.round(LAND_HOLD_S / dt)), nD = Math.round((LAND_HOLD_S + LAND_SKIP_S) / dt), nP = Math.min(LAND_RING - 1 - nD, Math.max(2, Math.round(LAND_PRE_S / dt)));
+    if (this.ldN === 0) for (let b = 0; b < 8; b++) e[b] = raw[b];
+    let all = 0; for (let b = 0; b < 8; b++) { e[b] += (raw[b] - e[b]) * k; all += e[b]; }
+    all /= 8;
+    const w = this.ldW, o = w * LAND_W; for (let b = 0; b < 8; b++) R[o + b] = e[b]; R[o + 8] = this.bodyFast; R[o + 9] = all;
+    this.ldW = (w + 1) & (LAND_RING - 1); if (this.ldN < LAND_RING) this.ldN++;
+    if (this.ldN > nD) { const i = ((w - nD) & (LAND_RING - 1)) * LAND_W; this.ldSumB += R[i + 8]; this.ldSumA += R[i + 9]; }
+    if (this.ldN > nD + nP) { const i = ((w - nD - nP) & (LAND_RING - 1)) * LAND_W; this.ldSumB -= R[i + 8]; this.ldSumA -= R[i + 9]; }
+    if (this.ldN <= nD + nP) return false;
+    let mB = 1e9, mA = 0;
+    for (let q = 0, i = ((w - nH + 1) & (LAND_RING - 1)) * LAND_W; q < nH; q++) { const v = R[i + 8]; if (v < mB) mB = v; i += LAND_W; if (i === LAND_RING * LAND_W) i = 0; }
+    const bass = mB - this.ldSumB / nP;
+    if (bass < LAND_BASS_DB || this.a.lvlSmooth < this.ldFull * this.a.levelCeil) { this.ldOn = false; return false; }
+    for (let b = 0; b < 8; b++) { let m = 1e9; for (let q = 0, i = ((w - nH + 1) & (LAND_RING - 1)) * LAND_W + b; q < nH; q++) { const v = R[i]; if (v < m) m = v; i += LAND_W; if (i >= LAND_RING * LAND_W) i -= LAND_RING * LAND_W; } mA += m; }
+    const wide = mA / 8 - this.ldSumA / nP, on = wide >= LAND_WIDE_DB, edge = on && !this.ldOn; this.ldOn = on;
+    if (!edge || this.a.activeMs <= 2000 || now - this.fdQuietAt < (LAND_HOLD_S + LAND_SKIP_S + LAND_PRE_S) * 1000 + 500) return false;
+    this.ldAt = now; this.dropRiseDb = this.bodyFast - this.fdLow;
+    if (DROP_TRACE) console.log(`[land] full drop: basens steg ${bass.toFixed(1)} dB, hela spektrat ${wide.toFixed(1)} dB, nivå ${(this.a.lvlSmooth / this.a.levelCeil).toFixed(2)} av taket`);
+    return true;
   }
 
   /** FULL DROP PÅ FLANKEN. */
@@ -163,13 +193,14 @@ export class DropDetector {
     { const w = (this.fdS0 + this.fdN) & (CAP - 1); T[w] = now; V[w] = f; this.fdN++; }
     while (this.fdN > 1 && now - T[this.fdS0] > FLANK_HOLD_S * 1000) { this.fdS0 = (this.fdS0 + 1) & (CAP - 1); this.fdN--; }
     let top = -1e9, low = 1e9; for (let q = 0; q < this.fdN; q++) { const i = (this.fdS0 + q) & (CAP - 1); if (V[i] > top) top = V[i]; if (now - T[i] <= 500 && V[i] < low) low = V[i]; }
+    this.fdLow = low;
     if (top < ceil - FLANK_GONE_DB) this.fdGone += dt; else { if (this.fdGone > 0) { this.fdSpan = this.fdGone; this.fdEnd = now; } this.fdGone = 0; }
     const above = f > ceil - FLANK_LAND_DB, edge = above && !this.fdAbove; this.fdAbove = above;
     const span = this.fdGone > 0 ? this.fdGone : now - this.fdEnd < FLANK_GRACE_S * 1000 ? this.fdSpan : 0;
     if (this.a.lvlSmooth <= FLANK_SILENT_LV) this.fdQuietAt = now;
     if (!edge || f - low < FLANK_RISE_DB || (span < FLANK_BREAK_S && !(span >= FLANK_SHORT_S && ceil - low >= FLANK_SHORT_RISE_DB))) return false;
     if (now - this.fdQuietAt < span * 1000 + 500) { this.fdGone = 0; this.fdSpan = 0; if (DROP_TRACE) console.log(`[flank] ingen drop: helt tyst i breaket (latstart), break ${span.toFixed(1)} s`); return false; }
-    this.fdGone = 0; this.fdSpan = 0; this.fdAt = now; this.dropRiseDb = f - low;
+    this.fdGone = 0; this.fdSpan = 0; this.fdAt = now;
     if (DROP_TRACE) console.log(`[flank] full drop pa flanken: break ${span.toFixed(1)} s, stigning ${(f - low).toFixed(1)} dB`);
     return true;
   }
```

Den breda vägen (EJ inlagd) mot slutlig kod:

```diff
diff --git a/.arena/drop2/a5/src/analyserDrop.ts b/.arena/drop2/a5/analyserDrop-bred.ts.txt
index 32cf393..ff39d02 100644
--- a/.arena/drop2/a5/src/analyserDrop.ts
+++ b/.arena/drop2/a5/analyserDrop-bred.ts.txt
@@ -22,7 +22,7 @@ const FLANK_GONE_DB = 10, FLANK_BREAK_S = 4, FLANK_LAND_DB = 6, FLANK_RISE_DB =
 const FLANK_SHORT_S = 2, FLANK_SHORT_RISE_DB = 24, FLANK_SILENT_LV = 0.005;
 const SHOW_DROP_GAP_MS = 12000;   // spärr mellan full drops
 const LAND_HOLD_S = 0.16, LAND_PRE_S = 0.6, LAND_SKIP_S = 0.05;   // LANDNINGENS SIGNATUR: hållet efter smällen, fönstret före, glappet emellan
-const LAND_BASS_DB = 12, LAND_WIDE_DB = 4, LAND_FULL_DB = 2;   // basens steg, hela spektrats steg, nivån högst så här långt under sitt eget tak (dB)
+const LAND_BASS_DB = 12, LAND_WIDE_DB = 4, LAND_BROAD_DB = 5, LAND_FULL_DB = 2;   // basens steg, hela spektrats steg med och utan bassteg, nivån högst så här långt under sitt eget tak (dB)
 const LAND_RING = 512, LAND_W = 10;   // ringen: 8 band + baskroppen + bandmedlet per hopp
 const NEAR_RISE_DB = 10, NEAR_DIP_DB = 8, LIFT_DB = 10, STOP_MINI_S = 0.6;   // LYFT/NÄSTAN-DROP/STOPP
 const DOUBLE_FROM_START = ['bodyEnv', 'bodyFast', 'bodyCeil', 'bodyPeak', 'lastGoneSpanMs', 'lastDropMs', 'lastMiniGoneMs', 'lastMiniMs', 'miniGoneMs', 'bodyGoneMs', 'lastBodyGoneMs', 'dropArmUntil', 'dropArmAt', 'fdGone', 'fdSpan', 'fdEnd', 'fdAt', 'fdQuietAt', 'lastShowDropMs', 'dropRiseDb', 'nearB', 'nearNorm', 'nearFloor', 'liftCalm', 'liftLift', 'liftHistAt', 'stopRunS', 'nearDropDb', 'nearDipDb', 'liftDb', 'stopS', 'ldSumB', 'ldSumA', 'ldAt', 'fdLow'] as const;   // Talfält som ska vara flyttal från start
@@ -174,12 +174,12 @@ export class DropDetector {
     if (this.ldN > nD) { const i = ((w - nD) & (LAND_RING - 1)) * LAND_W; this.ldSumB += R[i + 8]; this.ldSumA += R[i + 9]; }
     if (this.ldN > nD + nP) { const i = ((w - nD - nP) & (LAND_RING - 1)) * LAND_W; this.ldSumB -= R[i + 8]; this.ldSumA -= R[i + 9]; }
     if (this.ldN <= nD + nP) return false;
-    let mB = 1e9, mA = 0;
-    for (let q = 0, i = ((w - nH + 1) & (LAND_RING - 1)) * LAND_W; q < nH; q++) { const v = R[i + 8]; if (v < mB) mB = v; i += LAND_W; if (i === LAND_RING * LAND_W) i = 0; }
-    const bass = mB - this.ldSumB / nP;
-    if (bass < LAND_BASS_DB || this.a.lvlSmooth < this.ldFull * this.a.levelCeil) { this.ldOn = false; return false; }
+    let mB = 1e9, mU = 1e9, mA = 0;
+    for (let q = 0, i = ((w - nH + 1) & (LAND_RING - 1)) * LAND_W; q < nH; q++) { const v = R[i + 8], u = R[i + 9]; if (v < mB) mB = v; if (u < mU) mU = u; i += LAND_W; if (i === LAND_RING * LAND_W) i = 0; }
+    const bass = mB - this.ldSumB / nP, preA = this.ldSumA / nP;
+    if (mU - preA < LAND_WIDE_DB || this.a.lvlSmooth < this.ldFull * this.a.levelCeil) { this.ldOn = false; return false; }   // bandmedlets lägsta är ett tak för bredden
     for (let b = 0; b < 8; b++) { let m = 1e9; for (let q = 0, i = ((w - nH + 1) & (LAND_RING - 1)) * LAND_W + b; q < nH; q++) { const v = R[i]; if (v < m) m = v; i += LAND_W; if (i >= LAND_RING * LAND_W) i -= LAND_RING * LAND_W; } mA += m; }
-    const wide = mA / 8 - this.ldSumA / nP, on = wide >= LAND_WIDE_DB, edge = on && !this.ldOn; this.ldOn = on;
+    const wide = mA / 8 - preA, on = wide >= LAND_BROAD_DB || (wide >= LAND_WIDE_DB && bass >= LAND_BASS_DB), edge = on && !this.ldOn; this.ldOn = on;
     if (!edge || this.a.activeMs <= 2000 || now - this.fdQuietAt < (LAND_HOLD_S + LAND_SKIP_S + LAND_PRE_S) * 1000 + 500) return false;
     this.ldAt = now; this.dropRiseDb = this.bodyFast - this.fdLow;
     if (DROP_TRACE) console.log(`[land] full drop: basens steg ${bass.toFixed(1)} dB, hela spektrat ${wide.toFixed(1)} dB, nivå ${(this.a.lvlSmooth / this.a.levelCeil).toFixed(2)} av taket`);
```
