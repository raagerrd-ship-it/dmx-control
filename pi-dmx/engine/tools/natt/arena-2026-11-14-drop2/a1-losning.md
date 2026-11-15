# a1 – INSATSEN EFTER FILLET: full drop = basen tillbaka efter ett fill OCH landning på full nivå

## Idén

En landning är ett drop när basen varit borta minst ett kort fill (0,7 s, mot förr 4 s break) och de första 0,3 s efter landningen
är lika starka som den starkaste sekunden de senaste 30 s (−1 dB). Det stämmer i båda sorterna: basen klipps 1–2 slag (fill) eller
länge (breakdown), men droppet är i båda stället där HELA ljudet är tillbaka på låtens fulla nivå – en basåterkomst som landar
svagare (vers, mjuk låtstart, för-drop mitt i breaket) är det inte.

Mätt på kortet (övningens ljud, 10 ms-spektrum): i `151659` tystnar BARA 30–250 Hz i sista takten (−20…−60 dB i 0,5–1,3 s),
mellanregister och diskant spelar vidare. Ägarens minidrop där ser likadana ut i sista sekunden; inget jag mätte skiljer dem.
Nivån landningen når skiljer drop från övriga basåterkomster: AUC 0,90 / 0,53 / 0,74 (0,3 s mot 30 s), bästa varianten
0,86 / 0,81 / 0,82 (0,4 s mot 20 s) – breakets längd gör det inte. I `160345` har 6 av ägarens 7 nåbara drop en baslucka på bara 1,8–3,1 s.

## Delar

| del | ändring | bär |
|---|---|---|
| 1 KORT FILL | `FLANK_FILL_S 0,3` ersätter `FLANK_BREAK_S 4` och `FLANK_SHORT_*`; `FLANK_HOLD_S 0,6 → 0,4` (lucka ≥ 0,7 s) | drop: `160345` 51, 137, 214, 441; `151659` 304, 476, 524 (0 → 3 av 5) |
| 2 FULL LANDNING | landningen väntar högst `FLANK_FULL_S`; drop när energin sedan landningen når starkaste sekundrutan senaste `FLANK_REF_S`, minus `FLANK_FULL_DB` | inte: `160345` 3 → 0 av 3 med drop; precision: 207, 222, 347, 409, 423, 438, 500, 529, 591 borta; drop: 441 (`160345`) och 445 (`193818`) blockeras inte längre av för-droppet strax före. Utan del 2 (ensam, `FLANK_FULL_DB=99`): 41,2, träffar 3/3/6, motordrop 19/18/26 |
| 3 LÅTSTART = TYST NYSS | tystnadsregeln gäller tystnad de senaste `FLANK_QUIET_S 4` s, inte var som helst i breaket | drop: `160345` 282 (intro 17 s efter tystnad, landar +6 dB); kostar en omarkerad i `193818` (343) |
| 4 TIDIGT BESLUT | fyrar så fort energin räcker, inte vid fönstrets slut; samma dom | tid 0,44 → 0,33 s |

Slam-kandidat under väntan blir minidrop först om landningen underkänns.

## Marginaler (ensam, tre filer; standard 58,8 = 69,9 / 55,6 / 60,4, träffar 6/3/5)

| gräns | −25 % | +25 % |
|---|---|---|
| `FLANK_FILL_S` 0,3 | 58,7 (6/3/5) | 50,1 (6/2/5) |
| `FLANK_HOLD_S` 0,4 | 58,7 (6/3/5) | 50,1 (6/2/5) |
| `FLANK_FULL_S` 0,3 | 49,1 (6/2/5) | 61,5 (6/3/6), tid 0,39 |
| `FLANK_FULL_DB` 1 | 50,1 (6/2/5) | 57,2 (6/3/6) |
| `FLANK_REF_S` 30 | 55,0 (5/3/5) | 57,3 (6/3/5) |
| `FLANK_QUIET_S` 4 | 58,8 | 58,8 |

Ingen under 49 (bas 29,2). `160345` och `193818` står still; den TREDJE träffen i `151659` (476 eller 524) är skör i fyra av sex
gränser. `FLANK_FULL_DB` ≥ 1,45 ger 177 och 291 i `193818` (7 av 9) men släpper vid ≈ 1,6 igenom för-droppet 438 i `160345` och
kostar en träff i `151659` – smalt fönster, därför 1.

## Siffrorna

| | poäng | 160345 | 151659 | 193818 |
|---|---|---|---|---|
| bas | 29,2 | 23,9: 1/9, 10 motordrop, mini 2/11, inte 3/3 | 22,2: 0/5, 2, mini 0/9 | 62,1: 5/9, 12, mini 1/5, inte 0/3 |
| m1 | 58,8 | 69,9: 6/9, 10, mini 3/11, inte 0/3, tid 0,33 | 55,6: 3/5, 9, mini 3/9, tid 0,34 | 60,4: 5/9, 15, mini 1/5, inte 0/3, tid 0,32 |
| m2 | 58,8 | samma | samma | samma |

m1 fick kostnad ×2,53 (DISK-flagga) – mina egna fria prov gick samtidigt. m2 är samma kod mätt utan dem: ×1,86, OK i rankingen
(andras last kvar). Drop-delen ensam: bas 5,1–5,9 s, a1 4,1–5,2 s per tapp, alltså inte dyrare. m3 inte använd. Tempo 100 % = bas.

Sämre: minidrop som drop 2 → 3 (`160345`) och 0 → 3 (`151659`); `193818` tappar 177 (1,4 dB under gränsen) och får 3 fler
omarkerade. Missade: 211/218 (12 s-regeln), 302 (fönsterkanten), 168 (landar svagt; subben kommer en takt senare), 359, 51 och
1201 (ingen baslucka).

## Risken

- Gles bas (halvtakt, 808 med 1 s luckor som slutet av `151659`): varje baston är en landning på full nivå, upp till ett drop
  var 12:e s. Flodspärren 2,0/min kan nås i en hel sådan inspelning.
- För-drop i uppbyggnaden (basstötar varannan takt, `160345` 36–44 s) fyrar; 12 s-regeln avgör om det riktiga hinns med.
- Hårt klipp till en starkare låt blir drop (1412 i `193818`), låt med intro efter tystnad likaså.
- Pop utan break: få basluckor ≥ 0,7 s, få drop. Fyrtakt under ~80 BPM: luckan mellan kickarna närmar sig 0,7 s.
- Taktmixad mix som stiger långsamt: referensen är 30 s, varje landning i stigande nivå klarar gränsen.
- Tyst/stark inspelning: allt är relativt; bara `FLANK_SILENT_LV` är absolut, som förr.

## Diffen (`git diff --no-index src .arena/drop2/a1/src`)

```diff
diff --git a/src/ANALYSER_SHARED.md5 b/.arena/drop2/a1/src/ANALYSER_SHARED.md5
index be5b2ff..0e122de 100644
--- a/src/ANALYSER_SHARED.md5
+++ b/.arena/drop2/a1/src/ANALYSER_SHARED.md5
@@ -1,6 +1,6 @@
 # md5 (CRLF->LF) av de gemensamma filerna - samma i lotus-light-link och dmx-control. Skrivs av analyser_shared.py --write
 28fc97e76fe696e3c2716ee86eb03585 analyser.ts
-36803a2cf2affe308e43456b313b4dad analyserDrop.ts
+9541cca26fa15582377b4f170f665526 analyserDrop.ts
 692befa55e7fd906cdc3652af3f27baa analyserSection.ts
 879ba2122d2a1d3e0eea4082adfd2355 analyserSpectrum.ts
 e92d0d6b4f8dc36abfb8135004260806 analyserLevel.ts
diff --git a/src/analyserDrop.ts b/.arena/drop2/a1/src/analyserDrop.ts
index f582cb3..ec2bf7e 100644
--- a/src/analyserDrop.ts
+++ b/.arena/drop2/a1/src/analyserDrop.ts
@@ -18,11 +18,11 @@ const MINI_PEAK_DB = 10;
 const DROP_SHORT_MS = 4000;   // minsta drop-avstand nar dropen ESKALERAR
 const DROP_LONG_MS = 20000;   // annars maste sa har lang tid ga
 const DROP_ESCALATE_DB = 3;   // tatare drops maste vara TYDLIGT starkare for att fyra
-const FLANK_GONE_DB = 10, FLANK_BREAK_S = 4, FLANK_LAND_DB = 6, FLANK_RISE_DB = 12, FLANK_HOLD_S = 0.6, FLANK_GRACE_S = 1;   // FULL DROP PÅ FLANKEN
-const FLANK_SHORT_S = 2, FLANK_SHORT_RISE_DB = 24, FLANK_SILENT_LV = 0.005;
+const FLANK_GONE_DB = 10, FLANK_FILL_S = 0.3, FLANK_LAND_DB = 6, FLANK_RISE_DB = 12, FLANK_HOLD_S = 0.4, FLANK_GRACE_S = 1;   // FULL DROP PÅ FLANKEN
+const FLANK_FULL_S = 0.3, FLANK_FULL_DB = 1, FLANK_REF_S = 30, FLANK_SILENT_LV = 0.005, FLANK_QUIET_S = 4;   // FULL LANDNING
 const SHOW_DROP_GAP_MS = 12000;   // spärr mellan full drops
 const NEAR_RISE_DB = 10, NEAR_DIP_DB = 8, LIFT_DB = 10, STOP_MINI_S = 0.6;   // LYFT/NÄSTAN-DROP/STOPP
-const DOUBLE_FROM_START = ['bodyEnv', 'bodyFast', 'bodyCeil', 'bodyPeak', 'lastGoneSpanMs', 'lastDropMs', 'lastMiniGoneMs', 'lastMiniMs', 'miniGoneMs', 'bodyGoneMs', 'lastBodyGoneMs', 'dropArmUntil', 'dropArmAt', 'fdGone', 'fdSpan', 'fdEnd', 'fdAt', 'fdQuietAt', 'lastShowDropMs', 'dropRiseDb', 'nearB', 'nearNorm', 'nearFloor', 'liftCalm', 'liftLift', 'liftHistAt', 'stopRunS', 'nearDropDb', 'nearDipDb', 'liftDb', 'stopS'] as const;   // Talfält som ska vara flyttal från start
+const DOUBLE_FROM_START = ['bodyEnv', 'bodyFast', 'bodyCeil', 'bodyPeak', 'lastGoneSpanMs', 'lastDropMs', 'lastMiniGoneMs', 'lastMiniMs', 'miniGoneMs', 'bodyGoneMs', 'lastBodyGoneMs', 'dropArmUntil', 'dropArmAt', 'fdGone', 'fdSpan', 'fdEnd', 'fdAt', 'fdQuietAt', 'fdPendAt', 'fdPendSum', 'fdPendRef', 'fdPendRise', 'lvSum', 'lvT', 'lastShowDropMs', 'dropRiseDb', 'nearB', 'nearNorm', 'nearFloor', 'liftCalm', 'liftLift', 'liftHistAt', 'stopRunS', 'nearDropDb', 'nearDipDb', 'liftDb', 'stopS'] as const;   // Talfält som ska vara flyttal från start
 
 export class DropDetector {
   a: Analyser;   // analysatorn som äger den här delen
@@ -53,6 +53,8 @@ export class DropDetector {
   dropDemoted = 0; dropSpaced = 0; dropRiseDb = -0;
   private fdGone = -0; private fdSpan = -0; private fdEnd = -1e12; private fdAbove = true; private fdAt = -1e12; private fdQuietAt = -1e12; private lastShowDropMs = -1e12;
   private fdT = new Float64Array(1024); private fdV = new Float64Array(1024); private fdS0 = 0; private fdN = 0;
+  private lvRing = new Float64Array(64); private lvW = 0; private lvN = 0; private lvSum = -0; private lvT = -0;   // nivån i sekundrutor
+  private fdPendAt = -1e12; private fdPendSum = -0; private fdPendRef = -0; private fdPendRise = -0; private fdPendCand = false;   // landning som väntar på nivådomen
   private nearOn = false; private nearB = -0; private nearNorm = -0; private nearFloor = 1e9; private liftCalm = -0; private liftLift = -0;
   private liftHist = new Float64Array(240); private liftW = 0; private liftN = 0; private liftHistAt = -1e12; private stopRunS = -0;
   nearDropDb = -0; nearDipDb = -0; liftDb = -0; stopCount = 0; stopS = -0;
@@ -153,25 +155,41 @@ export class DropDetector {
     if (flank) {
       if (nowWallA - this.lastShowDropMs < SHOW_DROP_GAP_MS) { this.dropSpaced++; this.miniDropCount++; }
       else { this.lastShowDropMs = nowWallA; this.dropCount++; }
-    } else if (cand && nowWallA - this.fdAt > 2000) { this.dropDemoted++; this.miniDropCount++; }
+    } else if (cand && nowWallA - this.fdAt > 2000) { if (this.fdPendAt > -1e11) this.fdPendCand = true; else { this.dropDemoted++; this.miniDropCount++; } }
   }
 
   /** FULL DROP PÅ FLANKEN. */
   private flankStep(now: number, dt: number): boolean {
-    const CAP = 1024, T = this.fdT, V = this.fdV, f = this.bodyFast, ceil = this.bodyCeil;
+    const CAP = 1024, T = this.fdT, V = this.fdV, f = this.bodyFast, ceil = this.bodyCeil, pw = this.a.hRms * this.a.hRms, holdMs = FLANK_HOLD_S * 1000;
     if (this.fdN === CAP) { this.fdS0 = (this.fdS0 + 1) & (CAP - 1); this.fdN--; }
     { const w = (this.fdS0 + this.fdN) & (CAP - 1); T[w] = now; V[w] = f; this.fdN++; }
-    while (this.fdN > 1 && now - T[this.fdS0] > FLANK_HOLD_S * 1000) { this.fdS0 = (this.fdS0 + 1) & (CAP - 1); this.fdN--; }
-    let top = -1e9, low = 1e9; for (let q = 0; q < this.fdN; q++) { const i = (this.fdS0 + q) & (CAP - 1); if (V[i] > top) top = V[i]; if (now - T[i] <= 500 && V[i] < low) low = V[i]; }
+    while (this.fdN > 1 && now - T[this.fdS0] > 500 && now - T[this.fdS0] > holdMs) { this.fdS0 = (this.fdS0 + 1) & (CAP - 1); this.fdN--; }
+    let top = -1e9, low = 1e9; for (let q = 0; q < this.fdN; q++) { const i = (this.fdS0 + q) & (CAP - 1), age = now - T[i]; if (age <= holdMs && V[i] > top) top = V[i]; if (age <= 500 && V[i] < low) low = V[i]; }
     if (top < ceil - FLANK_GONE_DB) this.fdGone += dt; else { if (this.fdGone > 0) { this.fdSpan = this.fdGone; this.fdEnd = now; } this.fdGone = 0; }
     const above = f > ceil - FLANK_LAND_DB, edge = above && !this.fdAbove; this.fdAbove = above;
     const span = this.fdGone > 0 ? this.fdGone : now - this.fdEnd < FLANK_GRACE_S * 1000 ? this.fdSpan : 0;
     if (this.a.lvlSmooth <= FLANK_SILENT_LV) this.fdQuietAt = now;
-    if (!edge || f - low < FLANK_RISE_DB || (span < FLANK_BREAK_S && !(span >= FLANK_SHORT_S && ceil - low >= FLANK_SHORT_RISE_DB))) return false;
-    if (now - this.fdQuietAt < span * 1000 + 500) { this.fdGone = 0; this.fdSpan = 0; if (DROP_TRACE) console.log(`[flank] ingen drop: helt tyst i breaket (latstart), break ${span.toFixed(1)} s`); return false; }
-    this.fdGone = 0; this.fdSpan = 0; this.fdAt = now; this.dropRiseDb = f - low;
-    if (DROP_TRACE) console.log(`[flank] full drop pa flanken: break ${span.toFixed(1)} s, stigning ${(f - low).toFixed(1)} dB`);
-    return true;
+    let fire = false;
+    if (this.fdPendAt > -1e11) {
+      this.fdPendSum += pw * dt;
+      fire = this.fdPendSum >= this.fdPendRef * Math.pow(10, -FLANK_FULL_DB / 10) * FLANK_FULL_S;
+      if (fire || now - this.fdPendAt >= FLANK_FULL_S * 1000) {
+        this.fdPendAt = -1e12;
+        if (fire) { this.fdAt = now; this.dropRiseDb = this.fdPendRise; }
+        else if (this.fdPendCand) { this.dropDemoted++; this.miniDropCount++; }
+        if (DROP_TRACE) console.log(`[flank] ${fire ? 'full drop' : 'ingen drop: landar under full nivå'}, ${(10 * Math.log10((this.fdPendSum / FLANK_FULL_S + 1e-12) / (this.fdPendRef + 1e-12))).toFixed(1)} dB mot starkaste sekunden`);
+      }
+    } else if (edge && f - low >= FLANK_RISE_DB && span >= FLANK_FILL_S) {
+      if (now - this.fdQuietAt < FLANK_QUIET_S * 1000) { if (DROP_TRACE) console.log(`[flank] ingen drop: landar ur tystnad (latstart), break ${span.toFixed(1)} s`); }
+      else {
+        let ref = 0; const R = this.lvRing; for (let q = 0, n = Math.min(64, Math.round(FLANK_REF_S)); q < n; q++) { const v = R[(this.lvW + 63 - q) & 63]; if (v > ref) ref = v; }
+        this.fdPendAt = now; this.fdPendSum = 0; this.fdPendRef = ref; this.fdPendRise = f - low; this.fdPendCand = false;
+      }
+      this.fdGone = 0; this.fdSpan = 0;
+    }
+    this.lvSum += pw; this.lvN++; this.lvT += dt;
+    if (this.lvT >= 1) { this.lvRing[this.lvW] = this.lvSum / this.lvN; this.lvW = (this.lvW + 1) & 63; this.lvSum = 0; this.lvN = 0; this.lvT = 0; }
+    return fire;
   }
 
   /** NÄSTAN-DROP, ENERGILYFT, STOPP. */
```
