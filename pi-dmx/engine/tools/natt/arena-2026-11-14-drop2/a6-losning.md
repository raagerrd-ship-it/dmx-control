# a6 – ÅTERKOMST ELLER NÅGOT NYTT: drop = låtens höjdpunkt landar igen efter ett stopp

## IDÉN

En landning är ett drop när basen slår till efter ett STOPP (mer än ett slag helt utan bas), låtens höjdpunkt inte har hörts på
ungefär fyra sekunder (BORTA: det korta minnet av sub/kick/bas ligger minst 6 dB under det långa minnet av samma band) och det som
landar är FULLT mot minnet av låten och STANNAR. Det stämmer i båda sorterna för att jämförelsen görs mot minnet av låten, inte mot
sekunderna före: i breakdown-sorten är stoppet hela breaket; i den andra är stoppet det korta fillet och "borta" är uppbyggnaden, där
kickarna slår lika hårt som förr men bas och sub saknas mellan slagen. En minidrop är samma groove som fortsätter efter ett fill –
höjdpunkten hördes nyss.

## DELAR (bara `analyserDrop.ts`; flanken är ERSATT, 12 s-regeln, slam-kandidaten och ramens fält orörda)

| del | bär (ensam-körning med delen avstängd) |
|---|---|
| MINNET + BORTA: per band ett långt tak (1,5 s medel, −0,08 dB/s) och ett kort (0,5 s medel, −1,5 dB/s) | mini: 160345 (320, 381), 151659 (269, 319), 193818 (1475); drop 51 i 160345 (försmakerna vid 40/44 s räknas som nyss hörd höjdpunkt och skuggar inte). Utan: 47,6 |
| STOPPET: basen ≥ 10 dB under sitt tak i ≥ 1,3 slag (en kick per slag ger aldrig det) | drop 476 i 151659, 291 i 193818; precision (motordrop 8 -> 4 och 12 -> 9). Utan: 43,9 |
| STANNAR: basens brist mot långa minnet ≤ 4 dB, utjämnat 80 ms (en ensam kick når toppen men stannar inte) | drop 304 i 151659 (uppbyggnadens första kick sköt annars och skuggade). Utan: 47,8 |
| NIVÅN vid låtens tak (0,5 dB), PROFILEN (sju band ≤ 2 dB under taken) | mini 347 i 160345; en omarkerad motordrop i 193818. Utan: 58,4 / 58,7 |
| TYST-regeln kortad: bara landning DIREKT ur tystnad (1 s) är låtstart | drop 282 i 160345. Gamla regeln: 57,8 |

## MARGINALER (±25 %, ensam-körning; standard 58,9 = 66,6 / 50,6 / 84,4)

| gräns | −25 % | +25 % | ändring |
|---|---|---|---|
| AWAY_DB 6 | 57,0 | 55,9 | +: 51, 137, 218 bort, mini 44 och 254 rätt |
| STOP_BEATS 1,3 | 58,4 | 49,0 | +: 476 bort (stoppet där är 1,4 slag) |
| STOP_GONE_DB 10 | 46,5 | 49,3 | 476 bort åt båda håll, 643 vid 7,5 |
| FULL_STAY_DB 4 / FULL_STAY_S 0,08 | 52,1 / 58,9 | 58,9 / 57,9 | 476 och 291 bort / 291 bort |
| FULL_LEVEL_DB 0,5, FULL_PROFILE_DB 2, MEM_LVL_S, SILENT_MS | 58,9 | 58,9 | inget |
| MEM_BURST_S 0,5 | 61,7 | 56,1 | −: 218 bort, mini 44 rätt; +: 51 bort |
| MEM_SHORT_DB_S 1,5 | 57,1 | 55,9 | −: 137, 218 bort; +: 51 bort |
| MEM_TAU_S 1,5 / MEM_LONG_DB_S 0,08 | 56,1 / 47,8 | 61,4 / 59,7 | 51 bort / 476 bort; +: 218 bort, mini 44 rätt |
| MEM_FAST_S 0,1, LAND_MS 400, STOP_GRACE_MS 500 | 58,9 / 53,2 / 58,1 | 57,9 / 58,9 / 58,9 | 291 / 476 / 367 bort |

Lägst 46,5 (bas 29,2): domen faller inte ihop men hänger på enstaka drop (476 i 151659 nära fyra gränser; 51/137/218 ligger 0–1,5 dB
över BORTA-gränsen). Talen över 59 är byten av ett drop mot en mini, inget jag trimmat efter.

## SIFFRORNA (m1 = m2 = 58,9; m2 är slutkoden, m3 oanvänd; bas 29,2)

| fil | bas | a6 | drop | motordrop | mini som drop | inte-drop | tid |
|---|---|---|---|---|---|---|---|
| 160345 | 23,9 | 66,6 | 5/9 | 8 | 2/11 | 0/3 | 0,22 s |
| 151659 | 22,2 | 50,6 | 2/5 | 4 | 2/9 | – | 0,45 s |
| 193818 | 62,1 | 84,4 | 7/9 | 9 | 0/5 | 0/3 | 0,33 s |

Tempo 100 % = bas, kostnad x1,58 (under last). Inget mått sämre än bas; ljuset slår 0,2–0,45 s efter markeringen (STANNAR kostar
~0,1 s). Missade: 211/214 (tre drop inom 7 s), 302 (1,04 s sent), 441 (tystare låt efter starkare), 168 (markeringen 2 s före basens
återkomst), 359 (höjdpunkten hördes 2 s före fillet), 524 (gles låt), 51 och 1201 i 193818 (bara mellanregistret kommer tillbaka).
Mini som blir drop (507, 536, 44, 254) är fulla återkomster efter 7–30 s.

## RISKEN

- Drop utan stopp i basen (pop, bara mellanregister/sång tillbaka): ingen kandidat.
- Glesa/halvtaktsmönster och fel tempo (halva/dubbla): stoppvillkoret blir för lätt eller för hårt.
- Tystare låt efter starkare i långa mixar: långa minnet sjunker 0,08 dB/s (upp till en minut); låtgränsen läses inte.
- Låtstart med full bas stoppas bara direkt ur tystnad (1 s); efter tal eller svagt intro blir den drop (254, 1226).
- Tyst/stark inspelning: allt relativt bandens egna tak; bara flankens gamla `SILENT_LV` är absolut.
- Tiden: upp till 0,4 s efter slam-kanten; med två träffar i en fil är domarens median den senaste (0,45 s i 151659, spärr 0,5).

## DIFFEN (`git diff --no-index src .arena/drop2/a6/src`, byte-exakt även i `a6.diff`)

```diff
diff --git a/src/ANALYSER_SHARED.md5 b/.arena/drop2/a6/src/ANALYSER_SHARED.md5
index be5b2ff..f169929 100644
--- a/src/ANALYSER_SHARED.md5
+++ b/.arena/drop2/a6/src/ANALYSER_SHARED.md5
@@ -1,6 +1,6 @@
 # md5 (CRLF->LF) av de gemensamma filerna - samma i lotus-light-link och dmx-control. Skrivs av analyser_shared.py --write
 28fc97e76fe696e3c2716ee86eb03585 analyser.ts
-36803a2cf2affe308e43456b313b4dad analyserDrop.ts
+67df551f419e101e7374e8cffce7edd5 analyserDrop.ts
 692befa55e7fd906cdc3652af3f27baa analyserSection.ts
 879ba2122d2a1d3e0eea4082adfd2355 analyserSpectrum.ts
 e92d0d6b4f8dc36abfb8135004260806 analyserLevel.ts
diff --git a/src/analyserDrop.ts b/.arena/drop2/a6/src/analyserDrop.ts
index f582cb3..96222b0 100644
--- a/src/analyserDrop.ts
+++ b/.arena/drop2/a6/src/analyserDrop.ts
@@ -18,11 +18,14 @@ const MINI_PEAK_DB = 10;
 const DROP_SHORT_MS = 4000;   // minsta drop-avstand nar dropen ESKALERAR
 const DROP_LONG_MS = 20000;   // annars maste sa har lang tid ga
 const DROP_ESCALATE_DB = 3;   // tatare drops maste vara TYDLIGT starkare for att fyra
-const FLANK_GONE_DB = 10, FLANK_BREAK_S = 4, FLANK_LAND_DB = 6, FLANK_RISE_DB = 12, FLANK_HOLD_S = 0.6, FLANK_GRACE_S = 1;   // FULL DROP PÅ FLANKEN
-const FLANK_SHORT_S = 2, FLANK_SHORT_RISE_DB = 24, FLANK_SILENT_LV = 0.005;
+const MEM_TAU_S = 1.5, MEM_LONG_DB_S = 0.08, MEM_SHORT_DB_S = 1.5, MEM_FAST_S = 0.1, MEM_LVL_S = 0.25, MEM_BURST_S = 0.5;   // LÅTENS MINNE
+const AWAY_DB = 6;   // BORTA
+const STOP_GONE_DB = 10, STOP_BEATS = 1.3, STOP_BEAT_S = 0.5, STOP_GRACE_MS = 500, SILENT_MS = 1000;   // STOPPET
+const FULL_STAY_DB = 4, FULL_STAY_S = 0.08, FULL_PROFILE_DB = 2, FULL_LEVEL_DB = 0.5, LAND_MS = 400, SILENT_LV = 0.005;   // FULL LANDNING
+const MEM_LN = Math.LN10 / 10;
 const SHOW_DROP_GAP_MS = 12000;   // spärr mellan full drops
 const NEAR_RISE_DB = 10, NEAR_DIP_DB = 8, LIFT_DB = 10, STOP_MINI_S = 0.6;   // LYFT/NÄSTAN-DROP/STOPP
-const DOUBLE_FROM_START = ['bodyEnv', 'bodyFast', 'bodyCeil', 'bodyPeak', 'lastGoneSpanMs', 'lastDropMs', 'lastMiniGoneMs', 'lastMiniMs', 'miniGoneMs', 'bodyGoneMs', 'lastBodyGoneMs', 'dropArmUntil', 'dropArmAt', 'fdGone', 'fdSpan', 'fdEnd', 'fdAt', 'fdQuietAt', 'lastShowDropMs', 'dropRiseDb', 'nearB', 'nearNorm', 'nearFloor', 'liftCalm', 'liftLift', 'liftHistAt', 'stopRunS', 'nearDropDb', 'nearDipDb', 'liftDb', 'stopS'] as const;   // Talfält som ska vara flyttal från start
+const DOUBLE_FROM_START = ['bodyEnv', 'bodyFast', 'bodyCeil', 'bodyPeak', 'lastGoneSpanMs', 'lastDropMs', 'lastMiniGoneMs', 'lastMiniMs', 'miniGoneMs', 'bodyGoneMs', 'lastBodyGoneMs', 'dropArmUntil', 'dropArmAt', 'fdAt', 'fdQuietAt', 'lastShowDropMs', 'stopRun', 'stopLast', 'stopEnd', 'landUntil', 'landGap', 'landStop', 'lvMid', 'lvFast', 'lvLong', 'memGap', 'memStay', 'dropRiseDb', 'nearB', 'nearNorm', 'nearFloor', 'liftCalm', 'liftLift', 'liftHistAt', 'stopRunS', 'nearDropDb', 'nearDipDb', 'liftDb', 'stopS'] as const;   // Talfält som ska vara flyttal från start
 
 export class DropDetector {
   a: Analyser;   // analysatorn som äger den här delen
@@ -51,8 +54,10 @@ export class DropDetector {
   dropCount = 0;   // monoton drop-räknare
   dropCand = 0;   // slam-kandidaterna
   dropDemoted = 0; dropSpaced = 0; dropRiseDb = -0;
-  private fdGone = -0; private fdSpan = -0; private fdEnd = -1e12; private fdAbove = true; private fdAt = -1e12; private fdQuietAt = -1e12; private lastShowDropMs = -1e12;
-  private fdT = new Float64Array(1024); private fdV = new Float64Array(1024); private fdS0 = 0; private fdN = 0;
+  private fdAt = -1e12; private fdQuietAt = -1e12; private lastShowDropMs = -1e12;
+  private mMid = new Float64Array(8); private mLong = new Float64Array(8); private mShort = new Float64Array(8); private mFast = new Float64Array(8); private mQ = new Float64Array(8);   // LÅTENS MINNE per band
+  private mTop = new Float64Array(8); private memOn = false; private memGap = -0; private memStay = -0; private lvMid = -0; private lvFast = -0; private lvLong = -0;
+  private stopRun = -0; private stopLast = -0; private stopEnd = -1e12; private wasSlam = false; private landUntil = -0; private landGap = -0; private landStop = -0;
   private nearOn = false; private nearB = -0; private nearNorm = -0; private nearFloor = 1e9; private liftCalm = -0; private liftLift = -0;
   private liftHist = new Float64Array(240); private liftW = 0; private liftN = 0; private liftHistAt = -1e12; private stopRunS = -0;
   nearDropDb = -0; nearDipDb = -0; liftDb = -0; stopCount = 0; stopS = -0;
@@ -68,7 +73,8 @@ export class DropDetector {
     this.bodyCeil = Math.max(this.bodyEnv, this.bodyCeil - dtHop * BODY_CEIL_DB_S);
     this.bodyPeak = Math.max(this.bodyEnv, this.bodyPeak - dtHop * 0.04);
     this.a.bodyUnderDb = this.bodyCeil - this.bodyEnv;
-    const flank = this.flankStep(nowWallA, dtHop);
+    this.memStep(dtHop);
+    if (this.bodyFast < this.bodyCeil - STOP_GONE_DB) this.stopRun += dtHop; else { if (this.stopRun > 0 && (nowWallA - this.stopEnd >= STOP_GRACE_MS || this.stopRun >= this.stopLast)) { this.stopLast = this.stopRun; this.stopEnd = nowWallA; } this.stopRun = 0; }
     this.liftStep(nowWallA, dtHop, bodyNow);
 
     if (this.bodyEnv < this.bodyCeil - BODY_GONE_DB) {
@@ -107,10 +113,11 @@ export class DropDetector {
     this.wasBodyOnset = bodyOnset;
     if (bodyOnsetEdge && this.goneEpisodeMs !== this.dropArmGoneMs) { this.dropArmUntil = nowWallA + DROP_ARM_MS; this.dropArmAt = nowWallA; this.dropArmGoneMs = this.goneEpisodeMs; }
     const armed = bodyOnsetEdge || nowWallA < this.dropArmUntil;
+    const nv = hist[(this.bodyHistPos + HL - 1) % HL]; const mnRef = nv < riseRef ? nv : riseRef;
+    const flank = this.landStep(nowWallA, bodyPeek, bodyPeek - mnRef);
     if (MINI_SPACING_MS > 0) {
       if (this.bodyEnv < this.bodyCeil - MINI_GONE_DB) { this.miniGoneMs += dtHop * 1000; if (this.miniGoneMs >= MINI_GONE_MS) this.lastMiniGoneMs = nowWallA; }
       else this.miniGoneMs = 0;
-      const nv = hist[(this.bodyHistPos + HL - 1) % HL]; const mnRef = nv < riseRef ? nv : riseRef;
       const miniOnset = (bodyPeek - mnRef) > MINI_RISE_DB && bodyPeek > this.bodyPeak - MINI_PEAK_DB && nowWallA - this.lastMiniGoneMs < 4000;
       const miniEdge = miniOnset && !this.wasMiniOnset; this.wasMiniOnset = miniOnset;
       if (miniEdge && this.a.activeMs > 2000 && nowWallA - this.lastDropMs > MINI_SPACING_MS && nowWallA - this.lastMiniMs > MINI_SPACING_MS
@@ -156,21 +163,42 @@ export class DropDetector {
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
+  /** LÅTENS MINNE. */
+  private memStep(dt: number): void {
+    const bd = this.a.bandDbRaw, M = this.mMid, L = this.mLong, S = this.mShort, F = this.mFast, p = this.a.hRms * this.a.hRms;
+    if (!this.memOn) { this.memOn = true; for (let b = 0; b < 8; b++) { const x = bd[b] > -60 ? bd[b] : -60; M[b] = x; L[b] = x; S[b] = x; F[b] = x; this.mQ[b] = x; } this.lvMid = p; this.lvFast = p; this.lvLong = p; }
+    const aM = Math.min(1, dt / MEM_TAU_S), aF = Math.min(1, dt / MEM_FAST_S), aQ = Math.min(1, dt / MEM_BURST_S), Q = this.mQ, dL = dt * MEM_LONG_DB_S, dS = dt * MEM_SHORT_DB_S;
+    for (let b = 0; b < 8; b++) {
+      const x = bd[b] > -60 ? bd[b] : -60, m = M[b] += (x - M[b]) * aM;
+      F[b] += (x - F[b]) * aF;
+      const q = Q[b] += (x - Q[b]) * aQ, l = L[b] - dL, s = S[b] - dS; L[b] = m > l ? m : l; S[b] = q > s ? q : s;
+    }
+    this.memGap = (L[0] - S[0] + L[1] - S[1] + L[2] - S[2]) / 3;
+    let d3 = 0; for (let b = 0; b < 3; b++) { const d = L[b] - F[b]; if (d > 0) d3 += d; }
+    d3 /= 3; this.memStay += ((d3 < STOP_GONE_DB ? d3 : STOP_GONE_DB) - this.memStay) * Math.min(1, dt / FULL_STAY_S);
+    this.lvMid += (p - this.lvMid) * aM; this.lvFast += (p - this.lvFast) * Math.min(1, dt / MEM_LVL_S);
+    const ll = this.lvLong * (1 - MEM_LN * dL); this.lvLong = this.lvMid > ll ? this.lvMid : ll;
+  }
+
+  /** DROP = STOPP + BORTA + FULL LANDNING. */
+  private landStep(now: number, f: number, rise: number): boolean {
+    const slam = rise > MINI_RISE_DB && f > this.bodyPeak - MINI_PEAK_DB, edge = slam && !this.wasSlam; this.wasSlam = slam;
+    if (this.a.lvlSmooth <= SILENT_LV) this.fdQuietAt = now;
+    const F = this.mFast, T = this.mTop, R = this.mLong;
+    if (edge) {
+      this.landUntil = now + LAND_MS; this.landGap = this.memGap;
+      this.landStop = this.stopRun > 0 ? this.stopRun : now - this.stopEnd < STOP_GRACE_MS ? this.stopLast : 0;
+      for (let b = 0; b < 8; b++) T[b] = F[b];
+    }
+    if (now >= this.landUntil) return false;
+    let miss = 0; for (let b = 0; b < 7; b++) { if (F[b] > T[b]) T[b] = F[b]; const d = R[b] - T[b]; if (d > 0) miss += d; }
+    const bpm = this.a.dBpm, need = STOP_BEATS * (bpm > 0 ? 60 / bpm : STOP_BEAT_S);
+    if (this.landGap < AWAY_DB || this.landStop < need || this.a.activeMs <= 2000) return false;
+    if (this.memStay > FULL_STAY_DB || miss > FULL_PROFILE_DB * 7 || this.lvFast < this.lvLong * Math.pow(10, -FULL_LEVEL_DB / 10)) return false;
+    this.landUntil = 0;
+    if (now - this.fdQuietAt < SILENT_MS) { if (DROP_TRACE) console.log(`[drop] ingen drop: helt tyst i stoppet (latstart), stopp ${this.landStop.toFixed(1)} s`); return false; }
+    this.fdAt = now; this.dropRiseDb = rise;
+    if (DROP_TRACE) console.log(`[drop] full landning: borta ${this.landGap.toFixed(1)} dB, stopp ${this.landStop.toFixed(2)} s, stigning ${rise.toFixed(1)} dB`);
     return true;
   }
 
```
