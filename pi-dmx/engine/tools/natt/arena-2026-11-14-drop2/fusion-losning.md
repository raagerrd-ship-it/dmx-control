# fusion (jokern) – drop2: a6:s landning + a8:s fillveto, utan a6:s BORTA

Bara `analyserDrop.ts` är ändrad (+ manifestet). Flanken är ersatt (a6:s kod), slam-kandidaten, minidrop, 12 s-regeln och
lyft/nästan-drop/stopp är basens och orörda.

## IDÉN

En landning är ett drop när basen först hållits tillbaka LÄNGRE ÄN ETT FILL (baskroppens bärande nivå minst 3 dB under sitt tak i
över 4,2 s – a8:s fillveto), sedan STANNAT HELT i mer än ett slag, och det som slår in är FULLT mot minnet av låten och STANNAR
(a6:s stopp och fulla landning). Det stämmer i båda sorterna därför att uppbyggnaden mäts på basens bärande nivå, inte på om basen är
tyst: i breakdown-sorten är hela breaket uppbyggnad; där "basen spelar vidare" slår kicken men basgången ligger tillbakahållen i
9–23 s före dropen (476, 304) och bara 1–4 s före minidropens fill – ägarens egen regel: "är det ingen uppbyggnad, så är det
troligen bara minidrop".

## DELARNA (skakprov på övningen = medel av fem starter, fria prov; standard 68,7 = 65,3 / 66,7 / 84,4)

| del | från | bär (mått, fil) | poäng UTAN delen |
|---|---|---|---|
| UPPBYGGNAD, fillvetot: `HELD_DB` 3, `HELD_FILL_S` 4,2 | a8 (V2) | mini `151659` 4 → 0 av 9 (44, 255, 270, 320), `160345` 4 → 2 av 11 (320, 381), `193818` 1 → 0 av 5 (1475); precision: motordrop 11 / 10 / 11 → 9 / 2 / 9; drop 51 i `160345` (försmaken vid 44 s sköt annars och skuggade) | 47,6 (52,2 / 39,0 / 77,6) |
| STOPPET: basen ≥ 10 dB under taket i ≥ 1,3 slag | a6 | drop 304 och 476 i `151659` (landningar utan stopp vid 295 och 471 sköt annars och skuggade), 291 i `193818`; precision: motordrop `193818` 16 → 9 | 37,3 (64,1 / 22,2 / 70,8) |
| STANNAR: bottnens brist mot långa minnet ≤ `FULL_STAY_DB`, utjämnat 80 ms | a6 (gränsen flyttad 4 → 4,5, se nedan) | drop 304 i `151659` (uppbyggnadens första kick 293 sköt annars och skuggade) | 54,6 (65,3 / 44,4 / 84,4) |
| NIVÅN vid låtens tak (0,5 dB) | a6 | inte-drop 500 i `160345` (1 → 0 av 3; motordrop 10 → 9) | 65,7 (60,8 / 66,7 / 84,4) |
| PROFILEN (sju band ≤ 2 dB under taken) | a6 | en omarkerad i `193818` (1415) | 68,4 (65,3 / 66,7 / 82,9) |
| LÅTENS MINNE (långt tak per band, 1,5 s medel, −0,08 dB/s) | a6 | grunden för de tre ovan | – |
| TYST-REGELN kortad till 1 s (bara landning direkt ur tystnad är låtstart) | a6 (samma idé hos a1, a2, a4, a7) | drop 282 i `160345` | 64,2 (58,6 / 66,7 / 84,4) med tystnad var som helst i 25 s före (basens regel i praktiken) |
| slam-kandidaten, minidrop, 12 s-regeln | bas | ingen slog basen här | – |

`FULL_STAY_DB` 4 → 4,5 är den enda gräns jag rört: a6:s 4 låg vid platåns nedre kant (samma drop på alla femton körningarna från 3,85
till 5,5; under 3,85 tappas 291, över 5,5 tappas 304), och vid kanten hinner 476 i `151659` fram först efter 0,45–0,49 s. Mitten av
platån ger samma drop och tid 0,32 s (0,40 i en ensam körning).

## BORTVALT (mätt; "ELLER" = två detektorer sida vid sida, exakt på händelsenivå; "OCH" = bara fusionens drop som den andre också har)

| del | från | mätning | varför bort |
|---|---|---|---|
| BORTA (höjdpunkten inte hörd på ~4 s, `AWAY_DB` 6, kort minne per band) | a6 | med: 67,0 (start 70 / 63 / 70 / 63 / 70); utan: 68,7 (69 i alla fem) | bär inget när fillvetot finns (tar bara omarkerade 29 i `160345`), och 218 ligger PÅ gränsen (6,0 dB): tappas i två starter av fem |
| flanken med hela vetot (nivåtak + hela botten + fill) som andra väg | a8 | ELLER: 63,1 (71,7 / 55,6 / 84,4) | ger 441 i `160345` men två omarkerade i `151659` (416, 430) |
| hela botten (V3) som veto | a8 | OCH: 62,3 (65,3 / 55,6 / 86,4), rättat för a8-byggets gamla tystnadsregel | tar omarkerade 1226 i `193818` men också droppet 476 (låg-mitten 7 dB under sitt tak) |
| nivåtaket (V1) som veto | a8 | OCH: 68,7 (rättat som ovan) | tar ingenting av fusionens drop – bär inget ovanpå a6:s nivå |
| kort fill + full landning mot 30 s | a1 | ELLER: 59,4 (61,4 / 55,6 / 72,7); OCH: 68,3 (68,4 / 66,7 / 74,4) | ELLER: 524 kommer med (3 av 5) men 9 motordrop i `151659`, 18 i `193818`; OCH: tar omarkerade 29 och 303 i `160345` men dropen 177 och 291 i `193818` |
| svepets laddning | a2 | ELLER: 58,9 (55,5 / 54,8 / 78,9); OCH: 68,4 (66,4 / 66,7 / 78,3) | laddningen skiljer inte fusionens drop (ägarens −0,11 .. +1,07 okt, övriga −0,15 .. +0,94); OCH tar 29, 303 och minidroppet 536 men dropen 51 och 291 |
| ny topp mot lokalt tak | a4 | ELLER: 62,8 (74,6 / 55,6 / 79,7) | 7/9 i `160345` men 2 omarkerade i `151659`, 4 i `193818` |
| landningens signatur | a5 | ELLER: 58,2 (57,4 / 56,7 / 65,3); OCH: 65,4 (61,9 / 66,7 / 78,3) | ELLER: 168 kommer med (3 av 5) men 15 / 11 / 20 motordrop; OCH tar 29 och 303 men dropen 51 och 248 |
| frasen, spänningskontot | a3, a7 | ELLER: 49,2 / 59,4 | 14 / 14 / 24 respektive 14 / 8 / 13 motordrop |
| snabbare bandföljare (`MEM_FAST_S` 0,06 = basens `BODY_FAST_S`) för tiden | – | 54,6, tid 0,21 | 293 klarar STANNAR och skuggar 304 |

Ingen del som tar 168, 359 eller 524 i `151659` gör det utan att ta fler minidrop och omarkerade än drop; 441 i `160345` ligger
1,6 dB under långa minnets nivå (tystare låt efter starkare) och kommer bara med om nivå- och profilgränserna släpps mot just den.

## MARGINALER (±25 %, skakprov, fria prov; standard 68,7)

| gräns | värde | −25 % | +25 % | vad som flyttar sig |
|---|---|---|---|---|
| `HELD_FILL_S` | 4,2 s | 61,2 (62,3 / 56,8 / 77,6), tid 0,32 | 61,8 (54,8 / 66,7 / 84,4), tid 0,32 | −: minidrop 320 (`160345`), 44 (`151659`), 1475 och omarkerade 1583 (`193818`) blir drop; +: dropen 137 och 367 (`160345`, hållna 5,0 och 4,8 s) faller |
| `HELD_DB` | 3 dB | 68,7 (65,3 / 66,7 / 84,4), tid 0,32 | 69,0 (66,6 / 66,7 / 80,5), tid 0,32 | +: 291 bort, omarkerade 29 och 1226 bort |
| `STOP_BEATS` | 1,3 slag | 67,7 (64,1 / 66,7 / 82,9), tid 0,32 | 62,0 (65,3 / 55,6 / 84,4), tid 0,25 | −: omarkerade 575 (`160345`) och 939 (`193818`) till; +: 476 bort (1,42 slag) |
| `STOP_GONE_DB` | 10 dB | 52,9 (65,3 / 44,4 / 74,1), tid 0,25 | 62,2 (66,6 / 55,6 / 84,4), tid 0,25 | 476 bort åt båda håll; −: även 1–2 drop i `193818` |
| `FULL_STAY_DB` | 4,5 dB | 67,7 (65,3 / 66,7 / 78,3), tid 0,49 | 54,6 (65,3 / 44,4 / 84,4), tid 0,22 | −: 291 bort, 476 fyrar 0,49 s sent; +: 293 klarar sig och skuggar 304 |
| `FULL_LEVEL_DB` | 0,5 dB | 68,7 (65,3 / 66,7 / 84,4), tid 0,32 | 68,7 (65,3 / 66,7 / 84,4), tid 0,32 | inget |
| `FULL_PROFILE_DB` | 2 dB | 69,6 (66,6 / 66,7 / 84,4), tid 0,32 | 68,7 (65,3 / 66,7 / 84,4), tid 0,32 | −: en omarkerad bort i `160345` |
| `LAND_MS` | 400 ms | 68,7 (65,3 / 66,7 / 84,4), tid 0,32 | 68,7 (65,3 / 66,7 / 84,4), tid 0,32 | inget (med a6:s 4 dB föll 476 vid 300 ms) |
| `FULL_STAY_S` | 0,08 s | 68,7 (65,3 / 66,7 / 84,4), tid 0,24 | 68,7 (65,3 / 66,7 / 84,4), tid 0,42 | bara tiden |
| `MEM_TAU_S` | 1,5 s | 69,6 (66,6 / 66,7 / 84,4), tid 0,46 | 68,7 (65,3 / 66,7 / 84,4), tid 0,25 | −: omarkerade 29 bort, 476 senare; +: 476 tidigare |
| `MEM_LONG_DB_S` | 0,08 dB/s | 62,2 (66,6 / 55,6 / 84,4), tid 0,26 | 66,7 (62,3 / 66,7 / 84,4), tid 0,25 | −: 476 bort (minnet glömmer för långsamt, landningen blir inte full); +: en minidrop till i `160345` |
| `MEM_FAST_S` | 0,1 s | 68,7 (65,3 / 66,7 / 84,4), tid 0,24 | 69,6 (66,6 / 66,7 / 84,4), tid 0,45 | −: bara tiden; +: en omarkerad bort i `160345`, 476 senare |
| `MEM_LVL_S` | 0,25 s | 66,7 (62,3 / 66,7 / 84,4), tid 0,32 | 68,7 (65,3 / 66,7 / 84,4), tid 0,32 | −: minidroppet 348 (`160345`) blir drop |
| `STOP_GRACE_MS` | 500 ms | 65,2 (60,0 / 66,7 / 84,4), tid 0,32 | 68,7 (65,3 / 66,7 / 84,4), tid 0,32 | −: droppet 367 och omarkerade 303 bort |
| `SILENT_MS` | 1000 ms | 68,7 (65,3 / 66,7 / 84,4), tid 0,32 | 68,7 (65,3 / 66,7 / 84,4), tid 0,32 | inget |

Lägst 52,9 (bas 29,2; a6 i skakprovet 58,3); tiden är `151659` (den känsliga filen: två träffar). Allt under 65 är ETT drop i
`151659` – 476, eller 304 i skuggan av 293 – eller fillgränsen: fillen som klarar övriga grindar är hållna högst 3,9 s, den kortaste uppbyggnaden
före ett drop 4,8 s, så `HELD_FILL_S` tål −7 .. +12 % utan ändring men inte ±25 %. `STOP_BEATS` ligger mellan 1,17 (nekade) och 1,42 (476).

## SIFFRORNA

| mätning | poäng | `160345` | `151659` | `193818` |
|---|---|---|---|---|
| bas (skakprov) | 29,2 | 23,9: 1/9, 10 motordrop, mini 2/11, inte 3/3, tid 0,31 | 22,2: 0/5, 2 motordrop, mini 0/9, inte 0/0, tid 0,00 | 62,1: 5/9, 12 motordrop, mini 1/5, inte 0/3, tid 0,13 |
| a6 (skakprov, bäst i runda 1) | 58,3 | 62,7: 4,6/9, 8 motordrop, mini 2,4/11, inte 0/3, tid 0,22 | 50,6: 2/5, 4 motordrop, mini 2/9, inte 0/0, tid 0,45 | 84,4: 7/9, 9 motordrop, mini 0/5, inte 0/3, tid 0,33 |
| m1 (en körning; `FULL_STAY_DB` 4) | 68,7 | 65,3: 5/9, 9 motordrop, mini 2/11, inte 0/3, tid 0,22 | 66,7: 2/5, 2 motordrop, mini 0/9, inte 0/0, tid 0,45 | 84,4: 7/9, 9 motordrop, mini 0/5, inte 0/3, tid 0,33 |
| m2 = SLUTKODEN, skakprov (medel av fem) | 68,7 | 65,3: 5/9, 9 motordrop, mini 2/11, inte 0/3, tid 0,21 | 66,7: 2/5, 2 motordrop, mini 0/9, inte 0/0, tid 0,32 | 84,4: 7/9, 9 motordrop, mini 0/5, inte 0/3, tid 0,30 |

m1 och m2 är samma kod så när som på `FULL_STAY_DB` (4 → 4,5: samma drop, tiden i `151659` 0,45 → 0,32 s). 2 av 4 mätningar använda.
Skakprovet ger samma drop i alla fem starter (69 / 69 / 69 / 69 / 69; a6 59 / 57 / 59 / 57 / 59, a1 59 / 57 / 48 / 48 / 49). Fria prov på
tapparna gav domarens tal exakt, även skakprovets (tappar av övningsfilerna med 0,1–0,4 s bortklippt: `skak/trim.py` + `skak/tappa.sh`;
a6 58,3 och a1 52,2 som i `skak-r1.md`). Tempo 100 % = bas, kostnad ×0,72–0,76 (flankens slinga per hopp är borta), flod högst 0,93/min.

Mot a6: `151659` 50,6 → 66,7 (minidropen 44 och 254 är inte längre drop), `160345` 62,7 → 65,3 (218 håller i alla starter; omarkerade
29 tillkommer), `193818` lika. Sämre än bas: inget mått i någon fil. Under rundans bästa per fil: drop i `160345` 5 av 9 (a4 7, a1 6),
i `151659` 2 av 5 (a1, a2, a5 3 – med 9–11 motordrop mot 2 här).

Missade: 211/214 (inom 7 s från 218), 302 (fyrar 1,0 s efter markeringen), 441 (tystare låt efter starkare), 168, 359, 524 (ingen
uppbyggnad i basen), 51 och 1201 i `193818` (ingen baslucka). Omarkerade: 29, 303, 407, 1226. Minidrop som blir drop: 507 och 536 i
`160345` – fulla återkomster efter 4,7 och 16 s uppbyggnad; 507 kallas drop av alla åtta deltagare, 536 av fyra.

Mappar: `fusion` = slutkoden (src + dist), `fusion-c` = m1-koden, `fusion-b` = labb-bygget som skriver alla deltagares mätvärden per
kandidat (`lab/kand.py`, `lab/sim.py`); `lab/prov.py` = fria prov med domarens formel (även skakprov och marginaler), `lab/ev.py` = ELLER/OCH.

## RISKEN

- **Drop utan uppbyggnad i basen** (168, 524 i `151659`: fill på 1,8–2,7 s; 359: ingen lucka alls; 51 och 1201 i `193818`): blir
  aldrig drop. I sorten där basen spelar vidare tar lösningen de drop som har en uppbyggnad (2 av 5), inte fler. Pop utan break: inga drop.
- **Klockan:** stoppet räknas i klockans slag. I `151659` visar klockan 96 BPM runt 476 (145 vid 304 – troligen 2/3-läge): droppet
  har 1,42 klockslag stopp, grannarna 436 och 471 nekas på 1,17 och 0,95. Är tempot i själva verket 145 hade de klarat stoppet och
  471 skuggat droppet. Samma i alla fem starter, men domen i den filen hänger på klockans läge där.
- **Tempo:** fillgränsen är i sekunder (a8). Under ~100 BPM är ett tvåtaktsfill 4,8 s och blir uppbyggnad; över ~170 BPM vetas en
  uppbyggnad på tre takter. I slag (10) ger den samma dom på övningen (räknat på kandidattabellen, inte byggt); inte vald, klockan är inte pålitlig nog.
- **Taktmixad ny låt** med full botten efter mer än 4,2 s utan bas blir drop (407, 1226 i `193818`); tal mellan låtar likaså.
  Låtstart stoppas bara direkt ur tystnad (1 s).
- **Tystare låt efter starkare:** långa minnet sjunker 0,08 dB/s; ett drop mer än 0,5 dB under förra låtens nivå missas (441).
- **Filens första halvminut:** minnet är tomt, allt är "fullt" (omarkerade 29 i `160345`).
- **Tiden:** domen väntar på att bottnen stannar, upp till 0,4 s efter slam-kanten. En långsam landning (subben en takt efter)
  fyrar sent; med få träffar i en fil är det hela `tid`-spärren.
- **Tyst/stark inspelning:** allt mäts mot bandens egna tak; bara `SILENT_LV` är absolut, som förr (−60 dB är minnets räknegolv).

## DIFFEN

`git diff --no-index src .arena/drop2/fusion/src` – två filer; byte-exakt i `fusion.diff` (källan har lösa CR mitt i raderna:
`git -c core.autocrlf=false apply`).

```diff
diff --git a/src/ANALYSER_SHARED.md5 b/.arena/drop2/fusion/src/ANALYSER_SHARED.md5
index be5b2ff..ee207d5 100644
--- a/src/ANALYSER_SHARED.md5
+++ b/.arena/drop2/fusion/src/ANALYSER_SHARED.md5
@@ -1,6 +1,6 @@
 # md5 (CRLF->LF) av de gemensamma filerna - samma i lotus-light-link och dmx-control. Skrivs av analyser_shared.py --write
 28fc97e76fe696e3c2716ee86eb03585 analyser.ts
-36803a2cf2affe308e43456b313b4dad analyserDrop.ts
+bbc1390669f0c9726b30a1033e09bfc8 analyserDrop.ts
 692befa55e7fd906cdc3652af3f27baa analyserSection.ts
 879ba2122d2a1d3e0eea4082adfd2355 analyserSpectrum.ts
 e92d0d6b4f8dc36abfb8135004260806 analyserLevel.ts
diff --git a/src/analyserDrop.ts b/.arena/drop2/fusion/src/analyserDrop.ts
index f582cb3..4a09993 100644
--- a/src/analyserDrop.ts
+++ b/.arena/drop2/fusion/src/analyserDrop.ts
@@ -18,11 +18,14 @@ const MINI_PEAK_DB = 10;
 const DROP_SHORT_MS = 4000;   // minsta drop-avstand nar dropen ESKALERAR
 const DROP_LONG_MS = 20000;   // annars maste sa har lang tid ga
 const DROP_ESCALATE_DB = 3;   // tatare drops maste vara TYDLIGT starkare for att fyra
-const FLANK_GONE_DB = 10, FLANK_BREAK_S = 4, FLANK_LAND_DB = 6, FLANK_RISE_DB = 12, FLANK_HOLD_S = 0.6, FLANK_GRACE_S = 1;   // FULL DROP PÅ FLANKEN
-const FLANK_SHORT_S = 2, FLANK_SHORT_RISE_DB = 24, FLANK_SILENT_LV = 0.005;
+const MEM_TAU_S = 1.5, MEM_LONG_DB_S = 0.08, MEM_FAST_S = 0.1, MEM_LVL_S = 0.25;   // LÅTENS MINNE
+const HELD_DB = 3, HELD_FILL_S = 4.2;   // UPPBYGGNAD: basen hållen tillbaka kortare än så = fill, inte drop
+const STOP_GONE_DB = 10, STOP_BEATS = 1.3, STOP_BEAT_S = 0.5, STOP_GRACE_MS = 500, SILENT_MS = 1000;   // STOPPET
+const FULL_STAY_DB = 4.5, FULL_STAY_S = 0.08, FULL_PROFILE_DB = 2, FULL_LEVEL_DB = 0.5, LAND_MS = 400, SILENT_LV = 0.005;   // FULL LANDNING
+const MEM_LN = Math.LN10 / 10;
 const SHOW_DROP_GAP_MS = 12000;   // spärr mellan full drops
 const NEAR_RISE_DB = 10, NEAR_DIP_DB = 8, LIFT_DB = 10, STOP_MINI_S = 0.6;   // LYFT/NÄSTAN-DROP/STOPP
-const DOUBLE_FROM_START = ['bodyEnv', 'bodyFast', 'bodyCeil', 'bodyPeak', 'lastGoneSpanMs', 'lastDropMs', 'lastMiniGoneMs', 'lastMiniMs', 'miniGoneMs', 'bodyGoneMs', 'lastBodyGoneMs', 'dropArmUntil', 'dropArmAt', 'fdGone', 'fdSpan', 'fdEnd', 'fdAt', 'fdQuietAt', 'lastShowDropMs', 'dropRiseDb', 'nearB', 'nearNorm', 'nearFloor', 'liftCalm', 'liftLift', 'liftHistAt', 'stopRunS', 'nearDropDb', 'nearDipDb', 'liftDb', 'stopS'] as const;   // Talfält som ska vara flyttal från start
+const DOUBLE_FROM_START = ['bodyEnv', 'bodyFast', 'bodyCeil', 'bodyPeak', 'lastGoneSpanMs', 'lastDropMs', 'lastMiniGoneMs', 'lastMiniMs', 'miniGoneMs', 'bodyGoneMs', 'lastBodyGoneMs', 'dropArmUntil', 'dropArmAt', 'fdAt', 'fdQuietAt', 'lastShowDropMs', 'stopRun', 'stopLast', 'stopEnd', 'landUntil', 'landHeld', 'landStop', 'heldS', 'lvMid', 'lvFast', 'lvLong', 'memStay', 'dropRiseDb', 'nearB', 'nearNorm', 'nearFloor', 'liftCalm', 'liftLift', 'liftHistAt', 'stopRunS', 'nearDropDb', 'nearDipDb', 'liftDb', 'stopS'] as const;   // Talfält som ska vara flyttal från start
 
 export class DropDetector {
   a: Analyser;   // analysatorn som äger den här delen
@@ -51,8 +54,10 @@ export class DropDetector {
   dropCount = 0;   // monoton drop-räknare
   dropCand = 0;   // slam-kandidaterna
   dropDemoted = 0; dropSpaced = 0; dropRiseDb = -0;
-  private fdGone = -0; private fdSpan = -0; private fdEnd = -1e12; private fdAbove = true; private fdAt = -1e12; private fdQuietAt = -1e12; private lastShowDropMs = -1e12;
-  private fdT = new Float64Array(1024); private fdV = new Float64Array(1024); private fdS0 = 0; private fdN = 0;
+  private fdAt = -1e12; private fdQuietAt = -1e12; private lastShowDropMs = -1e12;
+  private mMid = new Float64Array(8); private mLong = new Float64Array(8); private mFast = new Float64Array(8);   // LÅTENS MINNE per band
+  private mTop = new Float64Array(8); private memOn = false; private memStay = -0; private lvMid = -0; private lvFast = -0; private lvLong = -0;
+  private stopRun = -0; private stopLast = -0; private stopEnd = -1e12; private wasSlam = false; private landUntil = -0; private landHeld = -0; private landStop = -0; private heldS = -0;
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
@@ -107,10 +113,12 @@ export class DropDetector {
     this.wasBodyOnset = bodyOnset;
     if (bodyOnsetEdge && this.goneEpisodeMs !== this.dropArmGoneMs) { this.dropArmUntil = nowWallA + DROP_ARM_MS; this.dropArmAt = nowWallA; this.dropArmGoneMs = this.goneEpisodeMs; }
     const armed = bodyOnsetEdge || nowWallA < this.dropArmUntil;
+    const nv = hist[(this.bodyHistPos + HL - 1) % HL]; const mnRef = nv < riseRef ? nv : riseRef;
+    const flank = this.landStep(nowWallA, bodyPeek, bodyPeek - mnRef);
+    if (this.bodyEnv < this.bodyCeil - HELD_DB) this.heldS += dtHop; else this.heldS = 0;
     if (MINI_SPACING_MS > 0) {
       if (this.bodyEnv < this.bodyCeil - MINI_GONE_DB) { this.miniGoneMs += dtHop * 1000; if (this.miniGoneMs >= MINI_GONE_MS) this.lastMiniGoneMs = nowWallA; }
       else this.miniGoneMs = 0;
-      const nv = hist[(this.bodyHistPos + HL - 1) % HL]; const mnRef = nv < riseRef ? nv : riseRef;
       const miniOnset = (bodyPeek - mnRef) > MINI_RISE_DB && bodyPeek > this.bodyPeak - MINI_PEAK_DB && nowWallA - this.lastMiniGoneMs < 4000;
       const miniEdge = miniOnset && !this.wasMiniOnset; this.wasMiniOnset = miniOnset;
       if (miniEdge && this.a.activeMs > 2000 && nowWallA - this.lastDropMs > MINI_SPACING_MS && nowWallA - this.lastMiniMs > MINI_SPACING_MS
@@ -156,21 +164,41 @@ export class DropDetector {
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
+    const bd = this.a.bandDbRaw, M = this.mMid, L = this.mLong, F = this.mFast, p = this.a.hRms * this.a.hRms;
+    if (!this.memOn) { this.memOn = true; for (let b = 0; b < 8; b++) { const x = bd[b] > -60 ? bd[b] : -60; M[b] = x; L[b] = x; F[b] = x; } this.lvMid = p; this.lvFast = p; this.lvLong = p; }
+    const aM = Math.min(1, dt / MEM_TAU_S), aF = Math.min(1, dt / MEM_FAST_S), dL = dt * MEM_LONG_DB_S;
+    for (let b = 0; b < 8; b++) {
+      const x = bd[b] > -60 ? bd[b] : -60, m = M[b] += (x - M[b]) * aM;
+      F[b] += (x - F[b]) * aF;
+      const l = L[b] - dL; L[b] = m > l ? m : l;
+    }
+    let d3 = 0; for (let b = 0; b < 3; b++) { const d = L[b] - F[b]; if (d > 0) d3 += d; }
+    d3 /= 3; this.memStay += ((d3 < STOP_GONE_DB ? d3 : STOP_GONE_DB) - this.memStay) * Math.min(1, dt / FULL_STAY_S);
+    this.lvMid += (p - this.lvMid) * aM; this.lvFast += (p - this.lvFast) * Math.min(1, dt / MEM_LVL_S);
+    const ll = this.lvLong * (1 - MEM_LN * dL); this.lvLong = this.lvMid > ll ? this.lvMid : ll;
+  }
+
+  /** DROP = UPPBYGGNAD + STOPP + FULL LANDNING. */
+  private landStep(now: number, f: number, rise: number): boolean {
+    const slam = rise > MINI_RISE_DB && f > this.bodyPeak - MINI_PEAK_DB, edge = slam && !this.wasSlam; this.wasSlam = slam;
+    if (this.a.lvlSmooth <= SILENT_LV) this.fdQuietAt = now;
+    const F = this.mFast, T = this.mTop, R = this.mLong;
+    if (edge) {
+      this.landUntil = now + LAND_MS; this.landHeld = this.heldS;
+      this.landStop = this.stopRun > 0 ? this.stopRun : now - this.stopEnd < STOP_GRACE_MS ? this.stopLast : 0;
+      for (let b = 0; b < 8; b++) T[b] = F[b];
+    }
+    if (now >= this.landUntil) return false;
+    let miss = 0; for (let b = 0; b < 7; b++) { if (F[b] > T[b]) T[b] = F[b]; const d = R[b] - T[b]; if (d > 0) miss += d; }
+    const bpm = this.a.dBpm, need = STOP_BEATS * (bpm > 0 ? 60 / bpm : STOP_BEAT_S);
+    if (this.landHeld < HELD_FILL_S || this.landStop < need || this.a.activeMs <= 2000) return false;
+    if (this.memStay > FULL_STAY_DB || miss > FULL_PROFILE_DB * 7 || this.lvFast < this.lvLong * Math.pow(10, -FULL_LEVEL_DB / 10)) return false;
+    this.landUntil = 0;
+    if (now - this.fdQuietAt < SILENT_MS) { if (DROP_TRACE) console.log(`[drop] ingen drop: helt tyst i stoppet (latstart), stopp ${this.landStop.toFixed(1)} s`); return false; }
+    this.fdAt = now; this.dropRiseDb = rise;
+    if (DROP_TRACE) console.log(`[drop] full landning: hallen ${this.landHeld.toFixed(1)} s, stopp ${this.landStop.toFixed(2)} s, stigning ${rise.toFixed(1)} dB`);
     return true;
   }
 
```

