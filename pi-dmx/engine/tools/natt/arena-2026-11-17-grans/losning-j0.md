# j0 (jokern): g6:s nästan-drop-landning + landningen släpper detektorn efter 8 s + landningen rättar en gissning

**IDÉN.** Basen som kommer tillbaka med ett hopp på minst 20 dB (g6, `frame.nearDropDb`) räknas som landning. Landningen tar nu också över efter en gissning, alltså ett byte som varken var drop eller landning (sektion, build, fras), när det gått 2 s, på samma sätt för r0:s minidrop-landning och för nästan-dropen. Uppslukningen efter en landning är 8 s (= MIN_HOLD) i stället för 24 s. Det är realtid och inte anpassat till övningen: på bas och g6 kom detektorns sena byte efter en landning 0,8-3,2 s efter den (7 av 7), medan de verkliga nya delarna kom 11-17 s efter (6 av 6). Varje värde mellan 4 och 11 s skiljer dem åt, och 8 s är motorns egen hålltid.

**AV DE 28 MISSADE** tar jag 9: drop 2, refräng 2, intro 2, vers 2, break 1 (43,70 ×2, 231,96 ×2, 226,00, 385,36, 332,62, 278,86, 350,00). Dessutom är 171840 16,46 tillbaka (g6 tappade den) och sex fångade gränser sitter nu närmare. Två förlorades mot bas: 171840 128,75 intro och 151659 495,83 vers. Lösa byten: 25 mot basens 20 (g6 också 25), 1,24/min.

**DELARNA** (lyft ut en del i taget)
| del | vad | mått |
|---|---|---|
| A g6 `nearBigAt`/`NEAR_LAND_DB 20` | stor nästan-drop blir landning (inte i build/break, i high bara efter en gissning) | g6 m2: +11,12 |
| B `LAND_ABSORB_MS 24000 -> 8000` | detektorns sektionsbyte mer än 8 s efter landningen blir ett lookbyte | m1: +10,90, lag 7,35 -> 7,00, lösa 1,22 -> 1,33. 16,46, 226,00, 385,36 tagna; tappade 151659 239,77 (introbytet vid låtbytet 235,84 spärrade landningen 239,87) |
| C `guessed` gäller båda landningarna | minidrop-landningen får komma 2 s efter en gissning (förr 6 s) | m2: +15,16, 151659 gräns 33,3 -> 43,3 %, lösa 1,33 -> 1,24 |
| (prövad, bortvald) g4 frasnyhet A+B+C | analyser.ts phraseNovZ + frasbyte | m3: +19,55, men 193040 gräns 41,9 -> 35,5 % (drop/refräng 90,6 och 191,0 tappade igen: frasbytet 88,75 i low, och 171,15 sväljde 172,03 high->low, så dropen 191,09 fick "manus samma look"). Ljuset −12,4. Uppfyller inte villkoret, så jag tog bort den |

**SIFFRORNA** (frasdom, poäng / gräns / lag / etta / lösa / byten / ljus)
- m1 (A+B): +10,90 / 31,2 / 7,00 / 42,1 / 1,33 / 4,06 / −7,2
- m2 (A+B+C): +15,16 / 34,5 / 6,81 / 43,4 / 1,24 / 3,99 / −7,4
- m3 (m2 + g4): +19,55 / 36,1 / 6,50 / 48,1 / 1,30 / 4,23 / −12,4 (bortvald)
- **m4 = m2:s kod, mätt igen för att bank.json/frasdom.json ska höra till leveransen: bit-identisk med m2, +15,16, ljus −7,4**
- per fil m4 (gräns/lag/etta/lösa/byten): 151659 43,3/7,1/66,7/1,5/3,8 · 171840 18,2/7,4/18,8/1,1/3,4 · 193040 41,9/5,8/44,8/1,1/4,8. Missade 34,1 -> 26,0 %.
- Sämre: ljuset −7,4 i en ensam bänk (under −5,6). Nästan allt sitter i l171840: jitter 17,6 -> 37 ms, betoning 0,45 -> 0,32. Där är den enda verkliga ändringen mot g6 bytet 17,73 (intro->high, som är rätt mot 16,46). Efter det glider lookvalet, så backbeat/linjalen spelar i stället för kickregn/pump. Det är bruset från ljusbrus-2026-11-17, där l171840 bär std 4,1. Det behöver dömas på fyra frön. Lösa +5 mot bas. 128,75 och 495,83 tappade.

**RISKEN.** Landningen i low väljer fortfarande versens look vid en drop (g6:s risk; 171840 102,03 -> 128,75 tappas, eftersom manus low redan spelar). Med 8 s uppslukning kan en detektor som fladdrar 8-12 s efter en landning ge ett byte till; 5 lösa extra på övningen. 2 s-regeln gör att en landning snabbt kan följa ett introbyte vid ett låtbyte. I live-mic och prat kan ett 20 dB-hopp efter en paus bli en landning. Workern påverkas inte, och ingen ny allokering eller split-fält behövs. Dropvägen är orörd, och analysatorn är orörd (lotus berörs inte).

**DIFFEN** (`git diff --no-index src .arena/grans/j0/src`)
```diff
diff --git a/src/effects.ts b/.arena/grans/j0/src/effects.ts
index 8957bb7..982d4ff 100644
--- a/src/effects.ts
+++ b/.arena/grans/j0/src/effects.ts
@@ -217,6 +217,7 @@ const MINI_BANG_MS = 600;   // 350 -> 600 (ladan 10-11 22:14: 'jag såg inte att
 // (NEAR_RISE_DB 10 / NEAR_DIP_DB 8 och nästan-dropens mätning i analysatorn sedan 11-09, a3: frame.nearDropDb/nearDipDb)
 // (NEAR_FULL_DB/NEAR_MIN/NEAR_MAX - nastan-dropens ljusgolv nearLevel - borttagna 11-09: nivan lastes aldrig, nastan-dropen ger inget ljus, bara lookbyte.)
 const NEAR_REFRACT_MS = 4000;
+const NEAR_LAND_DB = 20, NEAR_LAND_HOLD_MS = 2000;   // STOR NÄSTAN-DROP = LANDNING (grans g6)
 /** NASTAN-DROP BYTER LOOK (alltid; av-brytaren DMX_NEAR_DROP_SWITCH borttagen 10-10) (agaren i ladan 10-07: "far aven dirigenten denna info och kan byta direkt"): en nastan-drop
  *  ar ocksa ett bytesskal - looken byts direkt, med samma regel som minidropen (looken maste ha hallits MIN_HOLD 8 s). */
 /** (MINI_DELAY_MS borttagen 2026-10-08, agaren: 'varfor, bara vaxla till full annars?' - minidropen lyfter direkt; kommer en riktig
@@ -307,7 +308,7 @@ const PULSE_IDX_INIT = -2e9;
  *      detektorn da satt fast pa high; rotorsaken (ingen nollning vid latbyte) ar rattad 09-23. Sedan 10-12: LÅTMANUS. */
 /** SECTION_UNIT (ladan 16:45): forvarningens 'high' 600 ms fore en forutsedd refrang och drop-fonstrets 'high' raknas INTE som sektionsgrans
  *  (de gav high<->low-hopp pa 1-2 s nar refrangen uteblev). Bara den raa sektionen, och den maste vara minst DMX_SECTION_UNIT_MIN_MS gammal. */
-const LAND_HOLD_MS = 6000, LAND_ABSORB_MS = 24000;   // LANDNINGEN (a7): minsta hålltid före landningsbytet; sektionsbyten inom fönstret efter tas inte
+const LAND_HOLD_MS = 6000, LAND_ABSORB_MS = 8000;   // LANDNINGEN (a7): minsta hålltid före landningsbytet; sektionsbyten inom fönstret efter tas inte
 const GAP_HOLD_MS = 4000;   // I LUCKAN: spärren efter uppbyggnadssignalen släpper senast efter 4 s (signal -> landning median 1,8 s)
 /** LÅTMANUS (10-12 kväll, ägaren: "olika effekter hoppar hela tiden ... mer som att den är förprogrammerad" + "allt mer känns anpassat
  *  efter låten och som att de hänger ihop"). ERSÄTTER frasväxlingen (A/B-look var 8:e takt), basgångs-, karaktärs- och tempobytet,
@@ -568,7 +569,7 @@ export class EffectEngine {
   private anaDropAt = -1e12;   // analysatorns drop som blev minidrop (se REFRÄNGEN DIREKT EFTER EN MINIDROP-DROP)
   private landForce = false; private landAbsorbUntil = -1;   // LANDNINGEN (a7)
   private lastBuildStart = 0; private lastMiniSeen = 0; private gapUntil = -1;   // I LUCKAN (11-16): inget lookbyte från uppbyggnadssignalen tills basen är tillbaka
-  private nearAt = -1e12; nearCount = 0;   // NASTAN-DROP
+  private nearAt = -1e12; nearCount = 0; private nearBigAt = -1;   // NASTAN-DROP
   private secCeil = 1; private histAt = -1e12; private rampLvl = 0; private levelRamp = 1; private buildLookAt = 0; buildProg = 0; buildUpgrades = 0;   // BUILD SOM HÅLLER OCH LANDAR
   private miniBodyFast = -90; private miniBodySlow = -90; private miniPre = -90; private miniPeak = -200;   // minidrop efter energin
   private miniBangUntil = 0; private lastMiniWall = -1e12; private miniColEnv = 0; private miniLiftUntil = 0; private dropLiftUntil = 0; private liftAt = -1e12; liftCount = 0; private prevRawSec = ''; private lastHighWall = -1e12;   // ENERGILYFT + SEKTIONSLYFT   // minidrop-flank + kort stot
@@ -1096,6 +1097,8 @@ export class EffectEngine {
         //    kvar genom hela risern — då landar bytet i stället PÅ dropen, vilket
         //    är det enda ögonblick där ett byte förstärker musiken.
         // I LUCKAN (11-16): spärren följer analysatorns uppbyggnadssignal (25 av ägarens 29, den gamla riser/build-regeln 0 av 29) och släpper på drop/minidrop
+        const guessed = this.switchWhy !== 'drop' && this.switchWhy !== 'landning' && held > NEAR_LAND_HOLD_MS;   // förra bytet var en gissning: landningen rättar den efter 2 s (grans j0)
+        const nearLand = this.nearBigAt === nowWall && !dropHit && liveSec !== 'build' && liveSec !== 'break' && (guessed || (held > LAND_HOLD_MS && liveSec !== 'high'));
         const landHit = frame.miniDropCount !== this.lastMiniSeen && !dropHit;   // LANDNINGEN (a7): basen tillbaka efter luckan = ny del, på ettan
         if (frame.buildStartCount !== this.lastBuildStart) { this.lastBuildStart = frame.buildStartCount; this.gapUntil = nowWall + GAP_HOLD_MS; }
         if (dropHit || frame.miniDropCount !== this.lastMiniSeen) this.gapUntil = -1;
@@ -1146,7 +1149,7 @@ export class EffectEngine {
         }
         if (!buildLock && (!inGap || dropEntry) && (dropSwitch || dropEntry || (ready && slagOk))) {
         this.switchLook(frame, bpm, tierS, tierName, bassClear, allaBuild, buildEntry, buildExit, dropSwitch, liveSec, memSection, secEntry, tierChanged);
-      } else if (landHit && held > LAND_HOLD_MS && (liveSec === 'high' || liveSec === 'intro')) {
+      } else if ((landHit && (held > LAND_HOLD_MS || guessed) && (liveSec === 'high' || liveSec === 'intro')) || nearLand) {
         this.landForce = true;   // basen är tillbaka: aldrig lugna poolen (tierEma bär fortfarande luckan)
         this.switchLook(frame, bpm, tier === LUGN ? FART : tier, tier === LUGN ? 'fart' : tierName, bassClear, false, false, false, false, liveSec, false, false, tierChanged);
         this.landForce = false; this.landAbsorbUntil = nowWall + LAND_ABSORB_MS;
@@ -1160,7 +1163,7 @@ export class EffectEngine {
     {   // NASTAN-DROP: analysatorns frame.nearDropDb (VAD + styrka, a3 11-09); här reaktionens refraktärtid och dropgrind
       const nd = frame.nearDropDb;
       if (nd > 0 && nowWall - this.nearAt > NEAR_REFRACT_MS && !dropActive) {
-        this.nearAt = nowWall; this.nearCount++;
+        this.nearAt = nowWall; this.nearCount++; if (nd >= NEAR_LAND_DB) this.nearBigAt = nowWall;
         console.log(`[dirigent] nastan-drop: sprang ${nd.toFixed(1)} dB efter dipp ${frame.nearDipDb.toFixed(1)} dB`);
       }
     }
```

KLAR j0 poäng 15,16 DISK (ljus −7,4 < −5,6 i en ensam bänk; övriga spärrar OK; behöver dömas på fyra frön)
