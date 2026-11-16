# a6r (runda 2, remix av r0): landningen räknad i takter, och den slår detektorn

**IDÉN.** Efter en landning räknas uppslukningen i takter (6 takter med låtens tempo) i stället för 24 s, och samma fönster spärrar nästa landning. Om detektorn bytte look strax före gränsen får landningen ta över efter en takt. Basens återkomst sitter på musikens etta, och det gör inte detektorns tidiga gissning.

**VAR DET STÖRDE I r0** (fri analys av r0:s json). 24 s-uppslukningen svalde 5 äkta gränser: 151659 226,0 intro, 256,4 refräng, 332,6 break och 385,4 intro, samt 193040 350,0 vers. De låg 28-42 slag efter landningen. Detektorns eko av själva landningsgränsen kom inom 2-8 slag, och fladdret kom efter 11-31 slag. Därför valde jag 6 takter. Täta landningar förekom inte i övningen: kortaste intervallet mellan två landningar var 12,9 s, ungefär 31 slag. Däremot blockerade `held > 6 s` fyra träffar, eftersom ett tidigt eller löst sektionsbyte 2-4 s innan nollställde hålltiden: 151659 239,9 vers och 475,8 drop/refräng, 193040 261,4 refräng, och 151659 43,7 drop/refräng (den sista fångas inte ens i m2). MIN_HOLD i takter (c): 16 slag motsvarar 6,6-8,5 s vid 113-145 BPM. I m1 flyttade det de 15 MIN_HOLD-spärrade bytena högst ±1 s, och de flesta av dem är lösa. Jag rörde det inte.

**DELARNA** (bara effects.ts, ovanpå r0)
| del | vad den gör | mått |
|---|---|---|
| U1 uppslukning 6 takter | `landAbsorbUntil = landning + 6 × 4 slag` (bpm 0 räknas som 120) | m1 mot r0: lag 8,48 -> 8,12, etta 41,7 -> 43,2, gräns 22,7 -> 22,7 (151659 -1 träff, 193040 +1), byten 3,39 -> 3,70, +1,27 p |
| U2 landning högst var 6:e takt (b) | `nowWall >= landAbsorbUntil` i landningsvillkoret. En lucka var 4:e takt landar då var 8:e takt i stället för var 7-8:e sekund | ändrar inget i övningen (ingen landning blockerad) |
| U3 landningen slår detektorn | om förra bytet var 'sektion' räcker hålltiden 1 takt (4 slag) i stället för 6 s | m2 mot m1: gräns 22,7 -> 28,2, lag 8,12 -> 7,60, +5,9 p; +5 träffar (landningar 239,9 / 475,9 / 261,5 m.fl.), 1 extra landning 453,4 (ej lös) |

**SIFFRORNA** (poäng / gräns / lag / etta / lösa / byten / ljus)
- r0: +24,21 / 22,7 / 8,48 / 41,7 / 0,98 / 3,39 / +1,5
- m1 (U1+U2): +25,48 / 22,7 / 8,12 / 43,2 / 1,02 / 3,70 / +3,9
- **m2 = levererad** (U1+U2+U3): **+31,39** / 28,2 / 7,60 / 42,5 / 0,98 / 3,67 / **+3,3**, ingen DISK
- Per fil m2 (gräns/lag/etta/lösa/byten): 151659 36,7/7,8/61,3/1,3/3,6 · 171840 9,1/8,9/20,0/0,8/3,2 (orörd, inga landningar) · 193040 38,7/6,1/46,2/0,8/4,3 (spärren 5,4).

**Sämre än r0:** byten +0,28/min. 193040 etta 47,8 -> 46,2. U1 släpper fram detektorfladder (151659 235,8 och 345,0 lösa). Ljus +3,3 mot m1:s +3,9.

**RISKEN.**
- U3 kan ge två byten med 1-2 takters mellanrum: detektorns byte och sedan landningen. Det händer bara i high/intro och bara på en minidrop.
- Fel tempo i ladan (halvtakt) dubblar fönstret till ungefär 12 takter. Det blir ändå kortare än gamla 24 s vid 120+ BPM.
- Live-mic: fönstret följer bpm, inte väggklockan. Ett fladder 7+ takter efter landningen blir ett löst byte.
- Workern, dropvägen och lookvalet är orörda, och ingen allokering tillkommer.

**DIFFEN.** Hela diffen mot engine/src finns i `.arena/fras/a6r/effects-a6r.diff` (`git diff --no-index src/effects.ts .arena/fras/a6r/src/effects.ts`). Den är r0:s diff plus det här:
```diff
--- a/.arena/fras/r0/src/effects.ts
+++ b/.arena/fras/a6r/src/effects.ts
@@ -307,7 +307,7 @@
-const LAND_HOLD_MS = 6000, LAND_ABSORB_MS = 24000;   // LANDNINGEN (a7): minsta hålltid före landningsbytet; sektionsbyten inom fönstret efter tas inte
+const LAND_HOLD_MS = 6000, LAND_TAKTER = 6;   // LANDNINGEN (a7): minsta hålltid före landningsbytet; 6 takter efter landningen tas inga sektionsbyten och ingen ny landning
@@ -1146,10 +1146,10 @@
-      } else if (landHit && held > LAND_HOLD_MS && (liveSec === 'high' || liveSec === 'intro')) {
+      } else if (landHit && held > (this.switchWhy === 'sektion' ? 4 * 60000 / bpm : LAND_HOLD_MS) && nowWall >= this.landAbsorbUntil && (liveSec === 'high' || liveSec === 'intro')) {   // detektorns byte strax före gränsen: landningen tar över efter en takt
-        this.landForce = false; this.landAbsorbUntil = nowWall + LAND_ABSORB_MS;
+        this.landForce = false; this.landAbsorbUntil = nowWall + LAND_TAKTER * 4 * 60000 / (bpm > 0 ? bpm : 120);
```
m1-varianten ligger i `effects-m1.ts.bak`, `bank-m1.json` och `m1-frasdom/`.
