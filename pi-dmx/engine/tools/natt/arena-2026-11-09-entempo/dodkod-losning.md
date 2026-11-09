# Död kod i DMX-motorn: md5-identisk städning (2026-11-09)

Kopian ligger i `.arena/dodkod/src` och är byggd med `python tools/arena/bygg.py .arena/dodkod` (BYGGT). Utgångsläget är HEAD 03cd1c1, med samma kod som e451800 (03cd1c1 är bara rapporten). Jag har inte rört engine/src, engine/dist, git eller lotus-light-link.

**Delade filer (analyser.ts, split.ts, slowWorker.ts, analyserClock.ts, recorder/): ingen är ändrad.** Alla är byte-identiska med engine/src. Orkestratorn bad om det mitt i arbetet eftersom paritetsfixen pågår. Inget behövde återställas, för ingen av filerna hade ändrats.

Ändrade filer: `effects.ts`, `boundaryDetector.ts`, `effects/ripple.ts`, `effects/siren.ts`, `effects/twin.ts`, `effects/vidga.ts`.

## Poster

Radnumren gäller engine/src (före ändringen).

| post | fil:rad | borttagen/kvar | skäl |
|---|---|---|---|
| `frame.kickRise` | analyser.ts:205, 3067–3070 (ringen 363–364) | **kvar**: delad fil | Den har noll läsare i dmx-control. Den ligger i analyser.ts och tas därför efter paritetsfixen. lotus-light-link har fältet i sin analyser.ts och måste kontrolleras vid porten. |
| `linK` / `riseDb` (samma 6-hopsring två gånger) | analyserClock.ts:150, 164, 326, 432–434 | **kvar**: delad fil | Ligger i analyserClock.ts och tas efter paritetsfixen. (Granskningen pekade på beatFeed.ts, men den filen är nu 6 rader. Ringarna har flyttat till analyserClock.ts.) |
| boundaryDetector `pushNovelty` | boundaryDetector.ts:204–259 | **kvar** | Den är den enda källan till `charShiftCount`, och det fältet läser verktygen (se nästa rad). |
| `tempoShiftCount` / `charShiftCount` | boundaryDetector.ts:80, 100, 250, 293 | **kvar** | Ingen läsare i src, men 8 verktyg läser dem (concertBench, dropTiming, dynBench, efterDropTrace, hueSond, konsertReplay, showStory och tempoShiftBench via trace). Deras anrop `eng.noteCharShift?.()` är i dag en no-op, eftersom metoden inte finns. Regeln var att inte ta bort fält som verktygen läser. |
| `novAt` / `novPeak` / `NOV_WEAK` (fanns inte i listan, hittades i pushNovelty) | boundaryDetector.ts:24, 101–102, 246, 268 | **borttagen** | Privata fält som skrevs men aldrig lästes. NOV_WEAK användes bara för dem. |
| Oanvänd `BeatFeed` i index.ts (~115) | index.ts:29, 95 | **redan borta** (entempo) | index.ts skapar ingen BeatFeed längre. Bara den statiska `BeatFeed.analyserCfg(cfg)` används (r0), och den är levande. |
| `upgradeHit` ("BUILD SOM LANDAR") | effects.ts:602, 1635 | **borttagen** | Sattes aldrig till true, så hela rad 1635 var död. `buildUpgrades` (alltid 0) är **kvar**, eftersom concertBench, efterDropTrace och konsertReplay läser den. |
| `nearLevel` (+ `NEAR_FULL_DB`, `NEAR_MIN`, `NEAR_MAX`, `g`) | effects.ts:240–243, 601, 1264–1266 | **borttagen** | Värdet lästes aldrig. Konstanterna användes bara för att räkna ut det. Nästan-dropen ger bara lookbyte och nearAt/nearCount, som finns kvar. Lograden har också ändrats: den saknar nu den falska delen "-> ljus X % av en drop". |
| `DROP_LIFT_FLOOR` | effects.ts:89, 1446 | **borttagen** | Konstanten var 0, så `lift = max(lift, 0·…)` och dropEnv ≥ 0 gör raden till en no-op. Den ersattes av en kommentarsrad. |
| `miniSector` | effects.ts:604, 847 | **borttagen** | Skrevs men lästes aldrig. `mixedSector` behövs fortfarande på andra ställen. `miniColEnv` är kvar eftersom hueGlide läser den. |
| `mem*` (memSectionAt, memPhraseAt, memHasGrid, memPart, memSongId, memPartEnergy) | effects.ts:622–645, 1059, 1151–1153, 1171–1172, 1220 | **borttagen** | Sattes aldrig, varken i src eller i tools. Låtminnet togs ur driften 09-23. Läsarna förenklades till sina konstanta grenar: `iNow = frame.intensity`, `memSection = liveSecChanged`, `gridOk` (alltid true) togs bort och `wantSwitch` tappade grenen för `memPart`. En nyans gäller bänken: med `performance.now()=0` vid start var `now - 0 < 300` sant de första 300 ms, men md5 visar att det inte påverkade något. Live tar uppstarten mer än 300 ms. |
| PROV `DMX_FX_BASS` / `_PUNCH` / `_CURVE` | effects.ts:225, 2079–2080, 2089 (+ doc 222–224) | **borttagen** | Standardvärdet var 0 = av och ingen satte flaggan (ladan.py SHOW_ENV, deploy och tools har den inte). `bassP` och blandningarna är borta, så ctx.kickEnv/punch/beatPulse/heartPulse = de rena värdena. |
| PROV `DMX_FX_FLOOR` | effects.ts:412 | **borttagen** (env-läsningen) | Blev `const FX_FLOOR = 0.6`. Själva golvet är levande och finns kvar. Bara tools/knobSweep.py nämner flaggan, och det verktyget fungerar ändå (ratten mäter då 0, precis som andra borttagna rattar i dess lista). |
| PROV `DMX_E_NORM_S` | effects.ts:403 | **borttagen** (env-läsningen) | Blev `const E_NORM_S = 2`. Normeringen är levande och finns kvar. Om knobSweep gäller samma sak som ovan. |
| PROV `DMX_FX_REN` / `DMX_FX_REN_SIREN` | effects/ripple.ts:3, 27; twin.ts:3, 27–34; vidga.ts:3, 27; siren.ts:3, 24 | **borttagen** | Standardvärdet var av och flaggan sattes ingenstans. Bara grenarna från efter 11-02 är kvar. I siren är `hue` nu const. |
| moment.ts `SHOW_TOP` (ett andra tak) | moment.ts:50, 169 | **kvar** | Det här är inte död kod. Faktorn 0,95 skalar ljuset i stunderna, så om den togs bort skulle DMX ändras (beteendebyte, inte städning). Ägaren får avgöra om taket ska bort. |
| dynBench `eSimple^10` mot motorns `eBass^3` | tools/dynBench.mjs:110, 146 | **kvar**: noterad | Det är inte entydigt. Motorn kör `max(eFloor + (1-eFloor)·eBass^B_CURVE(3), lift)` med eFloor från cfg (0,2) plus dropens lyft. Bänken mäter `eSimple^E_CURVE(10)` med golvet 1/64. Om bara exponenten byttes skulle det fortfarande vara fel kurva. Byts hela formeln flyttas dessutom mdSteg-baslinjen i natt.py-historiken ("nollställ aldrig jämförelsen själv"). Ägaren bör välja: (a) exponenten B_CURVE, (b) motorns hela md, eller (c) låta det vara och döpa om måttet. |

**10 poster borttagna**: novAt/novPeak, upgradeHit, nearLevel, DROP_LIFT_FLOOR, miniSector, mem*, DMX_FX_BASS*, DMX_FX_FLOOR, DMX_E_NORM_S och DMX_FX_REN(_SIREN).

## md5-bevis (DMX-md5 per lampa, hela filerna, `100000` s)

dist = `engine/dist` (bas) och `.arena/dodkod/dist` (ny). Rådata finns i `.arena/dodkod/bevis/*.txt`.

| läge | fil | rutor | bas md5 | ny md5 | |
|---|---|---|---|---|---|
| `DUMP_SPLIT=sync dmxDump` | lang-20261021T203952.wav | 11250 | 46fb14899f bf878647d9 5290728035 d1c2b95f02 | 46fb14899f bf878647d9 5290728035 d1c2b95f02 | IDENTISK |
| `DUMP_SPLIT=sync dmxDump` | megamix_ladan.wav* | 22500 | e613724126 ef7de8460c ec5cfb3a18 1fe58b3654 | e613724126 ef7de8460c ec5cfb3a18 1fe58b3654 | IDENTISK |
| `DUMP_MOMENTS=1 DUMP_SPLIT=inline dmxDumpMoment` | lang-20261021T203952.wav | 11250 | 58709931ba 84aea23a0e 5c29b4f653 41def0ef39 | 58709931ba 84aea23a0e 5c29b4f653 41def0ef39 | IDENTISK |
| `DUMP_MOMENTS=1 DUMP_SPLIT=inline dmxDumpMoment` | megamix_ladan.wav* | 22500 | 3eb89c0297 6a1eae9f82 019a7da349 13ff6f883e | 3eb89c0297 6a1eae9f82 019a7da349 13ff6f883e | IDENTISK |

Det är 4 lägen/filer gånger 2 dist, alltså 8 körningar och 4 parvisa jämförelser. Alla 16 lampjämförelser är lika.

\* **Mätfälla i megamix_ladan.wav:** filens WAV-huvud har `data`-storleken 0 (huvudet skrevs aldrig klart). dmxDump.mjs och dmxDumpMoment.mjs läser då **0 sampel**. De ger `frames 0` och den tomma md5:an `d41d8cd98f` för både bas och ny, alltså en falsk "identisk". Jag körde därför mega på en kopia med rättat huvud (`C:\Users\richa\AppData\Local\Temp\claude\60d245907d1be17d\b12d7224-611b-41f1-93ab-65236edc99c3\scratchpad\megamix_ladan_fix.wav`). Kopian skiljer sig bara i 6 byte, nämligen RIFF- och data-storleken, och ljudbytesen är desamma: 600,0 s. Verktygen bör räkna `dataLen` från filstorleken när `sz` är 0. Det är inte gjort här, eftersom det inte ingick i uppdraget.

`PYTHONIOENCODING=utf-8 python tools/arena/tvavagar.py --snabb .arena/dodkod`:
`SNABBKOLL .arena\dodkod 37 s: md5 120 s lang1021 IDENTISK`

KLAR dodkod md5 IDENTISK poster 10
