# a6 - dirigentens spärrar (bara effects.ts)

**IDÉN.** Sektionsbytet väntar inte längre 2 s på att sektionen ska bli "gammal". I stället väntar det in analysatorns nästa etta (beatIdx % 4 = 0, högst 5 slag). Builden in, builden ut och ALLA_BUILD väntar också på ettan. Bytet kommer alltså på första takt-ettan efter detektorns beslut, inte på ett godtyckligt slag drygt 2 s senare. Drop och dropEntry byter fortfarande direkt.

**VAR FÖRDRÖJNINGEN SATT (bas, 83 ägargränser).** Detektorn kom median **3,1 slag** efter gränsen. 58 av 83 gränser fick ett detektorbyte inom 24 slag. Dirigenten lade på median **4,6 slag** (medel 5,5) från detektorn till lookbytet. Spärrarna en och en:
- SECTION_UNIT_MIN_MS 2 s: cirka 4 slag på VARJE sektionsbyte (byte +2,0 till 2,5 s efter detektorn när looken var hållen).
- MIN_HOLD 8 s: kostar 8 s minus hålltiden när detektorn byter tätt (cirka 1/3 av bytena, +4 till 6,7 s). Behölls, eftersom den skyddar byten/min.
- slaggrinden SWITCH_ON 1: högst 1 slag.
- phraseOk: gratis (sectionBars > 0).
- I LUCKAN och buildLock: kostar bara i uppbyggnader och skyddar drop-dramaturgin. Orörda.

**DELARNA**

| del | vad den gör | mått |
|---|---|---|
| A | tar bort sektionens 2 s-ålder (`secOldEnough`) | lag. Simulerat på bas-jsonen: ensam med SWITCH_ON 1 ger cirka +3,9 (lag -1,3 slag) |
| B | SWITCH_ON 1 -> 4: väntar in analysatorns etta, högst 5 slag | etta. A+B = m1: **+10,55**, etta 17,7 -> 32,3 %, lag 10,0 -> 9,25, gräns 12,7 -> 14,9 |
| C | allaBuild, concertBuild och buildExit går genom slaggrinden (ettan). buildEntry hålls via pendingSecSwitch i stället för att gälla en enda ruta | m2 - m1: +0,85, etta 32,3 -> 34,1 %, 193040 gräns 32 -> 35 %, 151659 gräns 3 -> 0 % |

B utan A är det gamla prov som föll (SWITCH_ON 4 ovanpå 2 s-åldern). A är det som gör B billig.

**SIFFRORNA (m2 = levererad)**: poäng **+11,40**, ljusdomaren **+0,8**, ingen DISK. Medel: gräns 14,9 %, lag 9,28 slag, etta 34,1 %, lösa 1,11/min (bas 1,14), byten 3,41/min (bas 3,52).

| fil | gräns % bas -> m2 | lag slag | etta % | lösa | byten |
|---|---|---|---|---|---|
| 151659 | 3,3 -> 0,0 | 11,6 -> 11,6 | 7,1 -> 40,7 | 1,4 -> 1,5 | 3,3 -> 3,1 |
| 171840 | 9,1 -> 9,1 | 10,0 -> 8,9 | 25,0 -> 20,0 | 1,05 -> 0,8 | 3,4 -> 3,2 |
| 193040 | 25,8 -> 35,5 | 8,4 -> 7,3 | 20,8 -> 41,7 | 0,98 -> 1,0 | 3,9 -> 3,9 |

Det som blev sämre:
- 171840 etta 25 -> 20 %. Där sitter analysatorns etta bara på musikens etta till 45 %, och bytet följer analysatorns etta.
- 151659 förlorade sin enda gränsträff. Bytet build -> high vid 40 s väntar nu in ettan (0,8 -> cirka 4 slag).
- Resten av lagen är detektorns (151659 sitter fast i high 40 -> 214 s). Det kan dirigenten inte laga.

**RISKEN**
- Bytet ärver analysatorns etta. Fel etta i ladan ger byten på trean, men aldrig senare än 5 slag.
- Utan 2 s-åldern ger ett detektorfladder A -> B -> A ett extra byte (MIN_HOLD 8 s sätter taket). Fladder under 2 s var ovanligt i bänken (1 av 68).
- Långa uppbyggnader: build-looken kommer upp till en takt senare än i dag.
- Live-mic med beatTrust < 0,5 byter direkt som förr.
- Workern och dropvägen är orörda.

**DIFFEN** (`git diff --no-index src .arena/fras/a6/src`, bara effects.ts ändrad)

```diff
diff --git a/src/effects.ts b/.arena/fras/a6/src/effects.ts
--- a/src/effects.ts
+++ b/.arena/fras/a6/src/effects.ts
@@ -259,7 +259,7 @@ const MANUS_TOP = 2;
  *  SECTION_UNIT_MIN_MS gammal - phraseOk:s reserv (held > MIN_HOLD + en fras) är nästan alltid sann efter en hållen look, så bytet landade
  *  var som helst i takten (konsertReplay --slag). Med N väntar bytet (wantSwitch/buildEntry, inte drop/build-händelserna) in nästa
  *  taktklocka-tick med beatIdx % N = 0 (1 = nästa slag, 4 = ettan), högst N slag x 1,25. */
-const SWITCH_ON = 1;
+const SWITCH_ON = 4;   // fras a6 (11-16): 4 = ettan, sektionens 2 s-ålder borttagen (bytet väntar ettan i stället)
@@ -308,7 +308,6 @@ const PULSE_IDX_INIT = -2e9;
 const GAP_HOLD_MS = 4000;   // I LUCKAN: spärren efter uppbyggnadssignalen släpper senast efter 4 s (signal -> landning median 1,8 s)
-const SECTION_UNIT_MIN_MS = 2000;   // 4000 -> 2000 (ladan 10-21: ny look 4-6 s efter sektionsbytet; replay 4,0 -> 2,0 s, korta looker 3 -> 2)
@@ -1066,7 +1065,6 @@ export class EffectEngine {
         if (liveSecChanged) this.pendingSecSwitch = true;
-        const secOldEnough = (frame.sectionAgeMs ?? 1e9) >= SECTION_UNIT_MIN_MS;   // SECTION_UNIT: ingen switch pa en sektion yngre an SECTION_UNIT_MIN_MS (detektorflapp)
         const memSection = liveSecChanged;   // (latminnets sektionsgrans mem* borttagen 11-09 - sattes aldrig)
@@ -1085,7 +1083,7 @@ export class EffectEngine {
         const wantSwitch = liveSec
-            ? ((memSection || this.pendingSecSwitch) && secOldEnough)
+            ? (memSection || this.pendingSecSwitch)
             : (tierChanged || memSection || now > this.smartDwellUntil);
@@ -1127,8 +1125,8 @@ export class EffectEngine {
         const tierS = tier;
-        const buildEntry = liveSecChanged && liveSec === 'build';   // MIX_V2 (2): ett byte IN i build-poolen tillats
-        const secEntry = this.pendingSecSwitch && secOldEnough && liveSec !== 'build';   // SECTION_UNIT: ...
+        const buildEntry = this.pendingSecSwitch && liveSec === 'build';   // MIX_V2 (2): ett byte IN i build-poolen tillats
+        const secEntry = this.pendingSecSwitch && liveSec !== 'build';   // SECTION_UNIT: ...
@@ -1136,14 +1134,14 @@ export class EffectEngine {
-        const ready = (wantSwitch || buildEntry) && held > MIN_HOLD && phraseOk;
+        const ready = ((wantSwitch || buildEntry) && held > MIN_HOLD && phraseOk) || allaBuild || concertBuild || buildExit;
@@
-        if (!buildLock && (!inGap || dropEntry) && (dropSwitch || dropEntry || allaBuild || concertBuild || buildExit || (ready && slagOk))) {
+        if (!buildLock && (!inGap || dropEntry) && (dropSwitch || dropEntry || (ready && slagOk))) {
```

Hela diffen går att applicera ordagrant: `.arena/fras/a6/effects-a6.diff`. m1-varianten (bara A+B) ligger i `effects-m1.ts.bak` och `bank-m1.json`.
