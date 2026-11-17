# g6 – dropen som inte blev drop (stor nästan-drop = landning)

**IDÉN.** När basen kommer tillbaka med ett hopp på minst 20 dB (analysatorns `frame.nearDropDb`, dubbla dess egen tröskel på 10 dB, alltså att basen var borta och inte bara svagare) är det en landning. Dirigenten byter då look genom r0:s landningsväg. Det rättar också en tidig sektionsgissning som kom under de senaste 2 s, och utanför high gäller landningens vanliga hålltid på 6 s. Signalen finns redan och mäts bara på hört ljud. Talet 20 dB härleds ur detektorns egen tröskel och bygger inte på övningens gränser; analyserDrop.ts är orörd.

**Varför de 14 drops missades (bas):** 43,70 och 231,96: sektionsbytet kom 4–6 slag för tidigt, och den riktiga nästan-dropen på 22,9 / 23,4 dB på gränsen spärrades av hålltiden på 8 s. 278,86 och 350,00 (drop->vers): nästan-dropen på 25,5 / 30,4 dB låg på gränsen, men sektionen 'low' fick inte landa. 183,96 och 147,97: analysatorns drop eller landning kom 1,3–1,7 slag för tidigt. 359,21 och 249,74: nästan-dropen var bara 10 dB. 198,17: ingen signal alls.

**TAGNA AV DE 28:** drop 2, refräng 2, vers 2 (43,70 drop+refr, 231,96 refr+drop, 278,86, 350,00). Flyttade närmare: 102,38 drop/refr 6,4 -> -0,9 slag, 261,39 refr 8,9 -> 0,1 och 261,89 drop 7,9 -> -0,8. Förlorade: 171840 vers 16,46 (en landning vid 2,2 s slukade intro->high) och intro 128,75 (lows look låg redan kvar). **Nya lösa byten: 6** (254,6, 344,3, 345,0, 56,5, 137,7, 287,6), lösa 0,98 -> 1,22/min.

**DELARNA**
| del | vad | mått (m2) |
|---|---|---|
| A `nearBigAt` + `NEAR_LAND_DB 20` | stor nästan-drop blir landningssignal (inte i build/break) | bär alla 6 tagna |
| B hålltid 2 s om förra bytet var en gissning (inte drop/landning) | tidig sektion rättas på ettan | 43,70, 231,96, 261,39/261,89 |
| C utanför high: efter 6 s (LAND_HOLD), i high inget | drop->vers i 'low' | 278,86, 350,00, 102,38; kostar 254,6 och 344,3 lösa |
m1 tillät C även i high: +11,03, ljus −5,6 (DISK), 2 lösa till (144,0, 341,7). m2 = utan high: +11,12.

**DIFFEN** (`git diff --no-index src .arena/grans/g6/src`)
```diff
diff --git a/src/effects.ts b/.arena/grans/g6/src/effects.ts
index 8957bb7..0ab1b3f 100644
--- a/src/effects.ts
+++ b/.arena/grans/g6/src/effects.ts
@@ -217,6 +217,7 @@ const MINI_BANG_MS = 600;   // 350 -> 600 (ladan 10-11 22:14: 'jag såg inte att
 // (NEAR_RISE_DB 10 / NEAR_DIP_DB 8 och nästan-dropens mätning i analysatorn sedan 11-09, a3: frame.nearDropDb/nearDipDb)
 // (NEAR_FULL_DB/NEAR_MIN/NEAR_MAX - nastan-dropens ljusgolv nearLevel - borttagna 11-09: nivan lastes aldrig, nastan-dropen ger inget ljus, bara lookbyte.)
 const NEAR_REFRACT_MS = 4000;
+const NEAR_LAND_DB = 20, NEAR_LAND_HOLD_MS = 2000;   // STOR NÄSTAN-DROP = LANDNING (grans g6)
 /** NASTAN-DROP BYTER LOOK (alltid; av-brytaren DMX_NEAR_DROP_SWITCH borttagen 10-10) (agaren i ladan 10-07: "far aven dirigenten denna info och kan byta direkt"): en nastan-drop
  *  ar ocksa ett bytesskal - looken byts direkt, med samma regel som minidropen (looken maste ha hallits MIN_HOLD 8 s). */
 /** (MINI_DELAY_MS borttagen 2026-10-08, agaren: 'varfor, bara vaxla till full annars?' - minidropen lyfter direkt; kommer en riktig
@@ -568,7 +569,7 @@ export class EffectEngine {
   private anaDropAt = -1e12;   // analysatorns drop som blev minidrop (se REFRÄNGEN DIREKT EFTER EN MINIDROP-DROP)
   private landForce = false; private landAbsorbUntil = -1;   // LANDNINGEN (a7)
   private lastBuildStart = 0; private lastMiniSeen = 0; private gapUntil = -1;   // I LUCKAN (11-16): inget lookbyte från uppbyggnadssignalen tills basen är tillbaka
-  private nearAt = -1e12; nearCount = 0;   // NASTAN-DROP
+  private nearAt = -1e12; nearCount = 0; private nearBigAt = -1;   // NASTAN-DROP
   private secCeil = 1; private histAt = -1e12; private rampLvl = 0; private levelRamp = 1; private buildLookAt = 0; buildProg = 0; buildUpgrades = 0;   // BUILD SOM HÅLLER OCH LANDAR
   private miniBodyFast = -90; private miniBodySlow = -90; private miniPre = -90; private miniPeak = -200;   // minidrop efter energin
   private miniBangUntil = 0; private lastMiniWall = -1e12; private miniColEnv = 0; private miniLiftUntil = 0; private dropLiftUntil = 0; private liftAt = -1e12; liftCount = 0; private prevRawSec = ''; private lastHighWall = -1e12;   // ENERGILYFT + SEKTIONSLYFT   // minidrop-flank + kort stot
@@ -1096,6 +1097,7 @@ export class EffectEngine {
         //    kvar genom hela risern — då landar bytet i stället PÅ dropen, vilket
         //    är det enda ögonblick där ett byte förstärker musiken.
         // I LUCKAN (11-16): spärren följer analysatorns uppbyggnadssignal (25 av ägarens 29, den gamla riser/build-regeln 0 av 29) och släpper på drop/minidrop
+        const nearLand = this.nearBigAt === nowWall && !dropHit && liveSec !== 'build' && liveSec !== 'break' && (this.switchWhy !== 'drop' && this.switchWhy !== 'landning' ? held > NEAR_LAND_HOLD_MS : held > LAND_HOLD_MS && liveSec !== 'high');
         const landHit = frame.miniDropCount !== this.lastMiniSeen && !dropHit;   // LANDNINGEN (a7): basen tillbaka efter luckan = ny del, på ettan
         if (frame.buildStartCount !== this.lastBuildStart) { this.lastBuildStart = frame.buildStartCount; this.gapUntil = nowWall + GAP_HOLD_MS; }
         if (dropHit || frame.miniDropCount !== this.lastMiniSeen) this.gapUntil = -1;
@@ -1146,7 +1148,7 @@ export class EffectEngine {
         }
         if (!buildLock && (!inGap || dropEntry) && (dropSwitch || dropEntry || (ready && slagOk))) {
         this.switchLook(frame, bpm, tierS, tierName, bassClear, allaBuild, buildEntry, buildExit, dropSwitch, liveSec, memSection, secEntry, tierChanged);
-      } else if (landHit && held > LAND_HOLD_MS && (liveSec === 'high' || liveSec === 'intro')) {
+      } else if ((landHit && held > LAND_HOLD_MS && (liveSec === 'high' || liveSec === 'intro')) || nearLand) {
         this.landForce = true;   // basen är tillbaka: aldrig lugna poolen (tierEma bär fortfarande luckan)
         this.switchLook(frame, bpm, tier === LUGN ? FART : tier, tier === LUGN ? 'fart' : tierName, bassClear, false, false, false, false, liveSec, false, false, tierChanged);
         this.landForce = false; this.landAbsorbUntil = nowWall + LAND_ABSORB_MS;
@@ -1160,7 +1162,7 @@ export class EffectEngine {
     {   // NASTAN-DROP: analysatorns frame.nearDropDb (VAD + styrka, a3 11-09); här reaktionens refraktärtid och dropgrind
       const nd = frame.nearDropDb;
       if (nd > 0 && nowWall - this.nearAt > NEAR_REFRACT_MS && !dropActive) {
-        this.nearAt = nowWall; this.nearCount++;
+        this.nearAt = nowWall; this.nearCount++; if (nd >= NEAR_LAND_DB) this.nearBigAt = nowWall;
         console.log(`[dirigent] nastan-drop: sprang ${nd.toFixed(1)} dB efter dipp ${frame.nearDipDb.toFixed(1)} dB`);
       }
     }
```

**SIFFRORNA (m2)** g6 +11,12 | gräns 31,2 % (bas 22,7) | lag 7,35 (8,48) | etta 43,5 (41,7) | lösa 1,22 (0,98) | byten 3,77 (3,39) | missade 29,7 % (34,1) | ljus +0,7.
Per fil gräns/lag/lösa/byten: 151659 36,7/7,9/1,6/3,7 (bas 30/8,9/1,28/3,25); 171840 18,2/8,1/1,1/3,2 (9,1/8,9/0,84/3,16); 193040 38,7/6,1/1,0/4,4 (29/7,6/0,82/3,77).
Sämre: lösa +0,24/min, 171840 förlorar 2 gränser, 193040 uppbyggnad 257,74 −0,7 -> 7,0 (nästan-dropen 261,5 tog över). Ljuset i m1 visade bruset (−5,6 för nästan samma kod).

**RISKEN.** Landningen i 'low' väljer lows manuslook även när det är en drop (102,03 gav "basgang" genom refrängen, och sektionsbytet efter slukades av LAND_ABSORB i 24 s). En stor nästan-drop i låtens första sekunder slukar introbytet. Live-mic, prat och tystnad mellan låtar kan ge hopp på 20 dB när basen kommer in efter en paus (det kan rentav vara rätt vid ett låtbyte). Långa uppbyggnader skyddas av att build och break är undantagna. Workern påverkas inte: nearDropDb bärs redan i split.ts (BS_NEAR), och inget nytt allokeras per hop.
