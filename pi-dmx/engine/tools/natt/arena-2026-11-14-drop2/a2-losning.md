# a2 – SVEPET: landningen efter en laddning är droppet

Bara `analyserDrop.ts` är ändrad (+ manifestet). Ingen ny signal: laddningen räknas ur `bandDbRaw`, som drop-delen redan har.

## IDÉN

En LANDNING är att basen slår tillbaka till sitt tak efter en lucka – även en kort (ett fill, drygt en halv sekund) – och att HELA
nivån når låtens nivåtak i samma slag. Landningen blir DROP när spektrats tyngdpunkt ovanför basen (250 Hz–16 kHz) har stigit
ihållande i 8 s (svep, stigande ton, öppnande filter); har basen hållits tillbaka länge räcker det att tyngdpunkten inte har SJUNKIT.
Det stämmer i båda sorterna därför att laddningen mäts ovanför basen: i breakdown laddar basens frånvaro, där basen spelar vidare
laddar svepet, och droppet är i båda det slag där bas och full nivå kommer samtidigt.

## DELAR ("utan" = fritt prov med delen avstängd, resten kvar; filerna i ordningen 160345 / 151659 / 193818)

| del | gör | bär | utan |
|---|---|---|---|
| 1. LADDNING på kort lucka (`SWEEP_ON`, `sweepStep`) | flanken utan längdkrav (basens topp ≥ 10 dB under taket > 0,6 s) är drop om tyngdpunkten stigit ≥ 0,15 oktaver på 8 s | **drop `151659` 0 → 3 av 5**, drop `160345` (137 s). Kostar: mini `151659` 0 → 3 av 9, precision `193818` (9 → 13 motordrop) | 35,6 (47,9 / 22,2 / 76,7) |
| 2. FULL LANDNING (`LAND_UNDER_DB`, `LAND_WAIT_S`) | hela nivån inom 2 dB av nivåtaket inom 0,25 s efter basens flank, annars ingen landning | precision + inte `160345` (207, 222, 409, 423, 438, 500 s bort); drop som de svaga landningarna spärrade: 214 s (`160345`), 445 s (`193818`) | 47,3 (41,4 / 53,7 / 64,4) |
| 3. URLADDNING (`SWEEP_OFF`) | långt break där tyngdpunkten sjunkit ≥ 0,2 oktaver är ingen drop | inte `160345` (529 s), mini + precision `193818` (1475, 1673 s) | 53,0 (49,0 / 54,8 / 67,3) |
| 4. TYSTNAD NOLLAR breaket och laddningen (ersätter "tyst i breaket = ingen drop") | det som byggs EFTER tystnaden räknas | drop `160345` (282 s: låtbyte, 17 s intro, drop). Kostar en omarkerad i `193818` (342 s) | 52,3 (46,5 / 54,8 / 73,3), mätt på ett tidigare bygge |

Slam-kandidaten, minidrop, 12 s-regeln och lyft/nästan-drop/stopp är orörda.

## MARGINALER (fria prov på slutkoden; standard 56,9)

| gräns | värde | −25 % | +25 % |
|---|---|---|---|
| `SWEEP_ON` | 0,15 okt | 56,8 | 59,1 |
| `SWEEP_OFF` | −0,2 okt | 56,9 | 56,1 |
| `LAND_UNDER_DB` | 2 dB | 56,9 | 55,6 |
| `LAND_WAIT_S` | 0,25 s | 56,9 | 56,9 |
| `SWEEP_N` | 64 rutor | 56,9 | 56,8 |
| `SWEEP_S` | 8 s | **47,0** | 53,8 |

Fönstret är den känsliga gränsen: 8–9 s bär, 6 s skiljer inte ett svep från ett fill (`151659` 3 → 2 av 5, `160345` 4 → 3 av 9).
Utanför ±25 %: `SWEEP_ON` har en kant vid 0,22 (304 s i `151659` tappas: 51,3). Rutnätets fas (start 0–0,4 s in): 56,8–56,9.

## SIFFRORNA

| | poäng | `160345` | `151659` | `193818` |
|---|---|---|---|---|
| bas | 29,2 | 23,9: 1/9, 10 motordrop, mini 2/11, inte 3/3 | 22,2: 0/5, 2, mini 0/9 | 62,1: 5/9, 12, mini 1/5, inte 0/3 |
| m1 (med en lucktid 0,1 s som sedan ströks) | 56,9 | 53,4: 4/9, 8, mini 3/11, inte 1/3, tid 0,12 s | 54,8: 3/5, 10, mini 3/9, tid 0,10 s | 72,6: 6/9, 13, mini 0/5, inte 0/3, tid 0,13 s |
| m2 (slutkoden) | 56,9 | samma | samma | samma |

m3 är inte använd. Tempo 100 % = bas, flod högst 1,17/min. Kostnad: rankingen visar ×1,91 / ×1,80, men det är maskinens last (bas
mättes ensam) – bas och a2 körda samtidigt på `151659` ger 290 mot 278 µs/hopp (×0,96).
SÄMRE än bas: mini som drop `151659` 0 → 3 av 9, `160345` 2 → 3 av 11; motordrop `151659` 2 → 10.
MISSAS fortfarande: drop utan svep efter kort lucka (441 s, 291 s), utan baslucka alls (359 s, 1201 s, 51 s i `193818`), 51 s i
`160345` (nivåtaket uppblåst av filens början), 304 s (spärrad av en omarkerad landning 11,6 s före).

## RISKEN

- Laddningen är ett SVAGT mått (AUC ~0,7 bland landningarna): den lyfter träffarna men gör också refrängstarter efter ett
  ljusnande fill till drop. På övningen är var fjärde kort landning med laddning ägarens drop, var fjärde hans minidrop.
- Pop utan break: få landningar (basen sällan borta 0,6 s); en cymbalupptakt in i refrängen kan bli drop, högst en per 12 s.
- Taktmixade mixar: DJ:ns filtersvep + basbyte ÄR laddning + landning → drop vid övergången.
- Tal mellan låtar är inte tystnad: första basen efter ≥ 4 s tal är ett långt break → drop om nivån når taket. Som i dag.
- Låt som börjar med full bas efter tystnad: ingen drop. Låtstart → basfritt intro ≥ 4 s → bas är NU drop (del 4; stryk den om det stör).
- Mycket tyst inspelning: `FLANK_SILENT_LV` är absolut, som förut. Mycket stark/klippt: nivån står i taket och del 2 skyddar inte.
- Fönstret räknas i sekunder, inte takter (16 slag i tempo prövat offline: inte bättre).

## DIFFEN

`git diff --no-index src .arena/drop2/a2/src` (finns också som `a2.diff`):

```diff
diff --git a/src/ANALYSER_SHARED.md5 b/.arena/drop2/a2/src/ANALYSER_SHARED.md5
index be5b2ff..fd2f9d4 100644
--- a/src/ANALYSER_SHARED.md5
+++ b/.arena/drop2/a2/src/ANALYSER_SHARED.md5
@@ -1,6 +1,6 @@
 # md5 (CRLF->LF) av de gemensamma filerna - samma i lotus-light-link och dmx-control. Skrivs av analyser_shared.py --write
 28fc97e76fe696e3c2716ee86eb03585 analyser.ts
-36803a2cf2affe308e43456b313b4dad analyserDrop.ts
+d1b32a296c5462c041311905976377f5 analyserDrop.ts
 692befa55e7fd906cdc3652af3f27baa analyserSection.ts
 879ba2122d2a1d3e0eea4082adfd2355 analyserSpectrum.ts
 e92d0d6b4f8dc36abfb8135004260806 analyserLevel.ts
diff --git a/src/analyserDrop.ts b/.arena/drop2/a2/src/analyserDrop.ts
index f582cb3..f7cc8a9 100644
--- a/src/analyserDrop.ts
+++ b/.arena/drop2/a2/src/analyserDrop.ts
@@ -20,9 +20,13 @@ const DROP_LONG_MS = 20000;   // annars maste sa har lang tid ga
 const DROP_ESCALATE_DB = 3;   // tatare drops maste vara TYDLIGT starkare for att fyra
 const FLANK_GONE_DB = 10, FLANK_BREAK_S = 4, FLANK_LAND_DB = 6, FLANK_RISE_DB = 12, FLANK_HOLD_S = 0.6, FLANK_GRACE_S = 1;   // FULL DROP PÅ FLANKEN
 const FLANK_SHORT_S = 2, FLANK_SHORT_RISE_DB = 24, FLANK_SILENT_LV = 0.005;
+const LAND_UNDER_DB = 2, LAND_WAIT_S = 0.25;   // LANDNINGEN: hela nivån högst så långt under sitt tak, väntan på det efter basens flank
+const SWEEP_OCT = [0.5, 1.63, 3.04, 4.56, 5.66], SWEEP_S = 8, SWEEP_N = 64;   // SVEPET: bandens lägen i oktaver över 250 Hz, fönstret och dess rutor
+const LAND_FULL = Math.pow(10, -LAND_UNDER_DB / 20), SWEEP_BLOCK_S = SWEEP_S / SWEEP_N;
+const SWEEP_ON = 0.15, SWEEP_OFF = -0.2;   // LADDNINGEN: oktaver stigning över fönstret som gör en kort lucka till drop / sjunkande som tar droppet från ett långt break
 const SHOW_DROP_GAP_MS = 12000;   // spärr mellan full drops
 const NEAR_RISE_DB = 10, NEAR_DIP_DB = 8, LIFT_DB = 10, STOP_MINI_S = 0.6;   // LYFT/NÄSTAN-DROP/STOPP
-const DOUBLE_FROM_START = ['bodyEnv', 'bodyFast', 'bodyCeil', 'bodyPeak', 'lastGoneSpanMs', 'lastDropMs', 'lastMiniGoneMs', 'lastMiniMs', 'miniGoneMs', 'bodyGoneMs', 'lastBodyGoneMs', 'dropArmUntil', 'dropArmAt', 'fdGone', 'fdSpan', 'fdEnd', 'fdAt', 'fdQuietAt', 'lastShowDropMs', 'dropRiseDb', 'nearB', 'nearNorm', 'nearFloor', 'liftCalm', 'liftLift', 'liftHistAt', 'stopRunS', 'nearDropDb', 'nearDipDb', 'liftDb', 'stopS'] as const;   // Talfält som ska vara flyttal från start
+const DOUBLE_FROM_START = ['bodyEnv', 'bodyFast', 'bodyCeil', 'bodyPeak', 'lastGoneSpanMs', 'lastDropMs', 'lastMiniGoneMs', 'lastMiniMs', 'miniGoneMs', 'bodyGoneMs', 'lastBodyGoneMs', 'dropArmUntil', 'dropArmAt', 'fdGone', 'fdSpan', 'fdEnd', 'fdAt', 'lastShowDropMs', 'dropRiseDb', 'nearB', 'nearNorm', 'nearFloor', 'liftCalm', 'liftLift', 'liftHistAt', 'stopRunS', 'nearDropDb', 'nearDipDb', 'liftDb', 'stopS', 'ldAt', 'ldSpan', 'ldDeep', 'ldRise', 'swAcc', 'swT', 'sweepOct'] as const;   // Talfält som ska vara flyttal från start
 
 export class DropDetector {
   a: Analyser;   // analysatorn som äger den här delen
@@ -51,7 +55,10 @@ export class DropDetector {
   dropCount = 0;   // monoton drop-räknare
   dropCand = 0;   // slam-kandidaterna
   dropDemoted = 0; dropSpaced = 0; dropRiseDb = -0;
-  private fdGone = -0; private fdSpan = -0; private fdEnd = -1e12; private fdAbove = true; private fdAt = -1e12; private fdQuietAt = -1e12; private lastShowDropMs = -1e12;
+  private fdGone = -0; private fdSpan = -0; private fdEnd = -1e12; private fdAbove = true; private fdAt = -1e12; private lastShowDropMs = -1e12;
+  private ldAt = -0; private ldSpan = -0; private ldDeep = -0; private ldRise = -0;   // landningen som väntar på full nivå
+  private swRing = new Float64Array(SWEEP_N); private swW = 0; private swN = 0; private swAcc = -0; private swT = -0;
+  sweepOct = -0;   // laddningen: tyngdpunktens stigning ovanför basen, oktaver på 8 s
   private fdT = new Float64Array(1024); private fdV = new Float64Array(1024); private fdS0 = 0; private fdN = 0;
   private nearOn = false; private nearB = -0; private nearNorm = -0; private nearFloor = 1e9; private liftCalm = -0; private liftLift = -0;
   private liftHist = new Float64Array(240); private liftW = 0; private liftN = 0; private liftHistAt = -1e12; private stopRunS = -0;
@@ -68,6 +75,7 @@ export class DropDetector {
     this.bodyCeil = Math.max(this.bodyEnv, this.bodyCeil - dtHop * BODY_CEIL_DB_S);
     this.bodyPeak = Math.max(this.bodyEnv, this.bodyPeak - dtHop * 0.04);
     this.a.bodyUnderDb = this.bodyCeil - this.bodyEnv;
+    this.sweepStep(dtHop);
     const flank = this.flankStep(nowWallA, dtHop);
     this.liftStep(nowWallA, dtHop, bodyNow);
 
@@ -166,14 +174,33 @@ export class DropDetector {
     if (top < ceil - FLANK_GONE_DB) this.fdGone += dt; else { if (this.fdGone > 0) { this.fdSpan = this.fdGone; this.fdEnd = now; } this.fdGone = 0; }
     const above = f > ceil - FLANK_LAND_DB, edge = above && !this.fdAbove; this.fdAbove = above;
     const span = this.fdGone > 0 ? this.fdGone : now - this.fdEnd < FLANK_GRACE_S * 1000 ? this.fdSpan : 0;
-    if (this.a.lvlSmooth <= FLANK_SILENT_LV) this.fdQuietAt = now;
-    if (!edge || f - low < FLANK_RISE_DB || (span < FLANK_BREAK_S && !(span >= FLANK_SHORT_S && ceil - low >= FLANK_SHORT_RISE_DB))) return false;
-    if (now - this.fdQuietAt < span * 1000 + 500) { this.fdGone = 0; this.fdSpan = 0; if (DROP_TRACE) console.log(`[flank] ingen drop: helt tyst i breaket (latstart), break ${span.toFixed(1)} s`); return false; }
-    this.fdGone = 0; this.fdSpan = 0; this.fdAt = now; this.dropRiseDb = f - low;
-    if (DROP_TRACE) console.log(`[flank] full drop pa flanken: break ${span.toFixed(1)} s, stigning ${(f - low).toFixed(1)} dB`);
+    if (this.a.lvlSmooth <= FLANK_SILENT_LV) { this.fdGone = 0; this.fdSpan = 0; }
+    if (edge && f - low >= FLANK_RISE_DB && span > 0) { this.fdGone = 0; this.fdSpan = 0; this.ldAt = now; this.ldSpan = span; this.ldDeep = ceil - low; this.ldRise = f - low; }
+    if (this.ldAt === 0) return false;
+    if (now - this.ldAt > LAND_WAIT_S * 1000) { this.ldAt = 0; return false; }
+    if (this.a.lvlSmooth < LAND_FULL * this.a.levelCeil) return false;
+    const long = this.ldSpan >= FLANK_BREAK_S || (this.ldSpan >= FLANK_SHORT_S && this.ldDeep >= FLANK_SHORT_RISE_DB);
+    this.ldAt = 0;
+    if (DROP_TRACE) console.log(`[flank] landning: break ${this.ldSpan.toFixed(2)} s, stigning ${this.ldRise.toFixed(1)} dB, laddning ${this.sweepOct.toFixed(2)} okt`);
+    if (this.sweepOct < (long ? SWEEP_OFF : SWEEP_ON)) return false;
+    this.fdAt = now; this.dropRiseDb = this.ldRise;
     return true;
   }
 
+  /** SVEPET: laddningen ur tyngdpunktens stigning ovanför baskroppen. */
+  private sweepStep(dt: number): void {
+    if (this.a.lvlSmooth <= FLANK_SILENT_LV) { this.swN = 0; this.swAcc = 0; this.swT = 0; this.sweepOct = 0; return; }
+    const B = this.a.bandDbRaw; let sw = 0, so = 0;
+    for (let b = 0; b < 5; b++) { const w = Math.exp(B[b + 3] * 0.115129); sw += w; so += w * SWEEP_OCT[b]; }
+    this.swAcc += so / sw * dt; this.swT += dt;
+    if (this.swT < SWEEP_BLOCK_S) return;
+    const R = this.swRing; R[this.swW] = this.swAcc / this.swT; this.swW = (this.swW + 1) % SWEEP_N; this.swAcc = 0; this.swT = 0;
+    if (this.swN < SWEEP_N) { this.swN++; if (this.swN < SWEEP_N) return; }
+    let num = 0; const mid = (SWEEP_N - 1) / 2;
+    for (let k = 0, j = this.swW; k < SWEEP_N; k++) { num += (k - mid) * R[j]; if (++j === SWEEP_N) j = 0; }
+    this.sweepOct = num * 12 / (SWEEP_N * SWEEP_N - 1);
+  }
+
   /** NÄSTAN-DROP, ENERGILYFT, STOPP. */
   private liftStep(now: number, dt: number, body: number): void {
     const x = Math.max(-90, body);
```
