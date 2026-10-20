# Natt-agentens uppdrag

## Från kvällen 2026-10-20 - DEN TVÅDELADE ANALYSATORN (ägaren: nattens uppgift, går före allt annat)
Ägaren: "analysera den tvådelade analysatorn. Kan vi förbättra den och göra fördelningen bättre? Ena med mål snabbaste latens och andra
bästa analys." PRINCIPEN (ägaren): SNABBA DELEN = LJUSSTYRNINGEN (det ljuset reagerar på direkt: kick/onset, basenergi, nivå,
drop/minidrop-smällen, taktens puls) - minsta latens och jitter, inget annat. LÅNGSAMMA DELEN = INPUT TILL DIRIGENTEN (tempo, taktfas,
sektion, karaktär/profil, build/refräng, låtgräns) - bästa analys, får ta tid. Mät varje fält mot den regeln. DMX kör delningen live (analyserProfile.ts ANALYSER_SPLIT 'worker' sedan 09-24): snabba sidan i motorns tråd, långsamma
(tempo/gridfas/sektion) i slowWorker på egen kärna. GÖR:
1. KARTA: vad räknas var i dag (analyser.ts + split.ts + slowWorker.ts + beatFeed.ts), per hop: µs, vilka fält ljuset läser direkt från
   den snabba sidan (kick, onset, bodyDb, nivå, drop/mini) och vilka som kommer från den långsamma (med hur många hop/ms fördröjning).
   Mät med Node 24 (Pi:ns version) i bänken: process() p50/p99 per sida, recordens storlek/frekvens, kö/fördröjning snabb -> långsam -> tillbaka.
2. FELPLACERAT: det som ligger på snabba sidan men inte behövs inom ett hop (flytta ut = lägre latens/jitter), och det som ligger på
   långsamma sidan men borde vara snabbt (drop/onset-beslut som väntar), eller som fick sämre analys för att det tvingades vara billigt
   (kortare fönster, grövre upplösning, färre tempokandidater) - där den långsamma sidan har budget för mer. Även beatFeed.ts (DMX-sidan,
   viker onset.kick var 250 ms i motorns tråd) - hör den hemma på långsamma sidan?
3. FÖRSLAG med siffror: snabba sidans µs/hop och kedjan ljud -> DMX före/efter; analysens kvalitet (tempo/sektion/drop mot facit,
   konsertReplay 24 lang) före/efter. Bit-identiskt där bara platsen byts (splitProof).
REGLER: delade filerna (analyser.ts, split.ts, slowWorker.ts, tempoTracker.ts) ändrar du INTE - förslagen skrivs i analysator-fynd.md
(lotus-morgonagenten bygger dem i båda repona). DMX-sidan (beatFeed.ts, index.ts, analyserProfile.ts) får du prova, med bevis. Rapportera
i artifacten under egen rubrik. Inget deployas.

## LADAN 2026-10-19 KVÄLL
19:21 LÖPANDE TAKT UTE (ladan.py utan env, md5 lika, NRestarts 0). Ägaren: 'takten sitter bra nu' -> GODKÄND, är redan kodens enda väg.
19:27 PROV LIVE (ladan.conf): DMX_SECTION_BODY_HIGH=2000 DMX_SECTION_BODY_HIGH_DB=2 (grundfixen, delade analysatorn de111d4) - väntar på ögat.
19:32 GODKÄND (ägaren: 'refrängen håller efter dropen') -> STANDARD i DMX-profilen (SECTION_BODY_HIGH 2000 / _DB 2, backup-tagg
   backup/fore-section-body-high-2026-10-19), env-provet = profilen byte-identiskt (2 lang), deployat utan env, ladan.conf tom, md5 lika.

## NÄSTA LADAN-BESÖK (ägaren 10-19: vänta till dess)
3. PROV (natt 10-20, 171720b): `python tools/ladan.py --env DMX_DROP_SEC_HIGH=1` - en drop som kommer i samma ruta som build-
   inträdet sparades i build-manuset (dropens basstarka look blev låtens build-look) och refrängen bytte bort droplooken 5-10 s efter
   smällen (10 av 67 drops). Med provet blir dropens look refrängens manus-look och ligger kvar. 24 lang: återseende 68 -> 71 %, hör ihop
   85 -> 89 %, drops/minidrops lika. TITTA: ligger looken kvar genom refrängen efter en drop som kommer direkt ur en uppbyggnad?
   Godkänt -> enda vägen (ta bort flaggan, ingen opt-in kvar). (Punkt 1 nedan är UTE sedan 10-19 19:32.)
4. LOTUS-FIXEN 19bebf7 (10-20 morgon, delade analysatorn, ingen flagga - följer med vilken `ladan.py` som helst): SECTION_BODY_HIGH även
   i intro efter låtgräns. Kontroll 10-20 (24 lang): ensam återseende 68 -> 67 %, hör ihop 85 -> 81 %, drops 67 -> 68, minis 383 -> 388;
   ihop med DMX_DROP_SEC_HIGH=1: 70 % / 85 %, dvs provet ger samma +3/+4 ovanpå. TITTA på båda samtidigt.
1. GRUNDFIXEN (ägaren 10-19, ersätter nattens DMX_DROP_NO_BUILD_S som togs bort): `python tools/ladan.py --env DMX_SECTION_BODY_HIGH=2000
   --env DMX_SECTION_BODY_HIGH_DB=2` (delade analysatorn de111d4). Bänk 24 lang (konsertReplay --delad-cfg --step 5, av -> på): high +2 s
   efter drop 12 -> 33, +8 s 22 -> 36, build 0,5-8 s efter drop 21 -> 14, korta looker 20 -> 16 %, lookbyten 404 -> 413, drops 66 -> 69,
   sektionsbyten 2,64 -> 3,08/min. Nå Pi:n: PC på telefonens hotspot Pixel_9285, Pi:n hamnade där på
   10.38.24.218 senast (port 22-skanning av hotspotnätet hittar den) -> `PI_HOST=<ip> python tools/ladan.py ...`.
0. LÖPANDE TAKT (10-19, i koden, d51f8da; backup-tagg backup/fore-lopande-takt-2026-10-19): rutnätet på kickbandets anslag i stället
   för kick-PLL + tempospärr. Bänk: rutnätets fel mot ljudet 132 -> 28 ms (24 lang), pop 144 -> 6, megamix 198 -> 9. Följer med
   `python tools/ladan.py`. TITTA: sitter gallop/chase/siren/rulle på slagen nu? Backa: deploya taggen.
2. /api/perf efter en kväll: `major` nära 0, `forcedGc` efter pauser (Node 24 + heap-flaggan, ute sedan 10-18).

## NATTEN 2026-10-20 (nattagenten, inget deployat)
KLART 2026-10-20: baslinje natt/2026-10-20.json (a2999d9): pop kick->ljus 99 ms/träff 0,48 r 0,33; mega 37 ms/0,38 r 0,13; korpus 117/0,42
  r 0,30. Mot 10-19: kick->ljus är nu per lampa till topp (showTight a23d4c3, mätfälla 51) + löpande takt + SECTION_BODY_HIGH.
KLART 2026-10-20: 24 lang baslinje (rodTrad): byten 2,77/min, återseende 68 %, kort look 17 %, hör ihop 85 %, drops 67, unika 31/77.
KLART 2026-10-20: opt-in DMX_DROP_SEC_HIGH=1 (171720b), se NÄSTA LADAN-BESÖK punkt 3. Av = 24/24 byte-identiska.
ÖPPET: återseende-missarna (37/116): 24 = sektionsbytet kommer ~4 s in (SECTION_UNIT_MIN_MS 4000, median 4,1 s, p90 7,5) så förra
  sektionens look dominerar korta delar - rörs inte (ägaren backade =0 10-17). 22 av 77 effekter valda i mixarna, 31 på 24 lang.
  Analysatorfynd 10-20: drops i 'intro' efter låtgräns når inte 'high' (12/29).

## NATTEN 2026-10-19 (nattagenten, inget deployat)
KLART 2026-10-19: baslinje natt/2026-10-19.json byte-identisk med 10-18 (pop 125/0,46 r 0,30; mega 150/0,41 r 0,12; korpus 125/0,44 r 0,26).
KLART 2026-10-19: opt-in DMX_DROP_NO_BUILD_S=8 (dc6c64c) - build inom 8 s efter show-drop = dropens landning, ingen build-look förrän
  sektionen lämnat build. 24 lang: kort look 20 -> 17 %, drop->build-korta 12 -> 0, lookbyten 404 -> 377, återseende 80 -> 82 %, hör ihop
  70 -> 74 %, drops 62 lika; mega byten 3,7 -> 3,0/min, ljus full 0,52 -> 0,60. ERSATT 10-19 av grundfixen SECTION_BODY_HIGH (ägaren) - koden borttagen.
ÖPPET: sektionen high bara 4/68 vid show-drop, 22/68 efter 8 s (analysator-fynd 10-19); lugn-effekterna (20) väljs inte i mixarna;
  sektionsfladder 31 av 76 korta looker.

## LADAN-BESÖKET 2026-10-18 15:45-16:20 - ALLT NEDAN ÄR UTE (PC på telefonens hotspot, Pi:n 10.38.24.218, PI_HOST=...)
Resultat: små städningar 15/min -> 8-13/min, längsta liten 4-7 ms på Node 24, render snitt 0,25 -> 0,20 ms. Node 18 (apt nodejs/npm
+ 130 node-paket) AVINSTALLERAD efter ägarens beslut; node/npm/npx = länkar till /opt/node24 i /usr/local/bin. Stora städningar och
mörkerstädningen (forcedGc) ej färdigutvärderade - läs /api/perf nästa gång (efter pauser mellan låtar).

### (checklistan som den var)
1. `python tools/ladan.py` (utan --env; ladan.conf ska vara tom sedan drop-proven blev standard 10-17). Tar med allt sedan 10-17 15:53:
   skräpjakten (render i steg, doubleFields, hsv direkt import + tabell, kalibreringens tal via fält, --interrupt-budget=32768 på Node 18
   i v8Tiering.ts, perfStats skräpfri, BLE borttaget), nattens 10-18-fixar, computeBpm orörd. Ljuset byte-identiskt.
2. Efter 15 min musik: `curl http://<pi>/api/perf` - jämför med 10-16 16:58-17:11 (minor 15/min, längsta 6-10 ms, major ~0, loop max
   14-22 ms). Väntat (bänk Node 18): ~25-45 kB/s skräp -> en liten städning var 1,5-3 min.
3. BLE BORTTAGET UR DMX (10-18, ägaren: 'om det inte är exakt samma BLE-modul som lotus, ta bort den' - DMX hade @abandonware/noble i
   sidovagnen pi-dmx-ble, lotus @stoprocent/noble i motorn). Punkt 1 tar ut motorn utan BLE (bleClient, /setup-sidans BLE-kort, ws-
   meddelandena); sidovagnen + bluetoothd städas bort av punkt 5. Ingen ljusändring - BLE läste bara den färdiga ramen.
4. HEAP-FLAGGAN + STÄDA NÄR RIGGEN ÄR MÖRK (portat från lotus 10-18, där: 0 storstädningar på 28 min med flaggan, tvingad GC ~93 ms):
   EFTER punkt 1: `python tools/ladan_heap.py` (torrkörning) och sedan `--kor` - lägger --heap-growing-percent=200 --expose-gc i heap.conf
   och gc-dark.conf (DMX_GC_DARK=0.6: full GC bara när tystnadsgrinden är stängd >= 1,5 s, ramen helt släckt och gamla minnet >= 60 % av
   gränsen; src/gcDark.ts). Läs /api/perf `forcedGc` (paus, fyllnad) efter en paus mellan låtar + `total.gc.major`. Backa: `--backa`.
5. NODE 24 (10-18, ägaren: 'ta backup och kör på Node 24 i stället för extra kod och toggles'). EFTER punkt 4 (heap-flaggan läggs
   på node-raden oavsett sökväg): `python tools/ladan_node24.py` (torrkörning: arkitektur måste vara aarch64) och sedan `--kor`:
   backup /home/pi/dmx-backup-node18-20261018.tgz (enhetsfil + drop-ins + spi.node) -> Node 24.18.0 i /opt/node24 (tarbollen från
   ~/node24dl på PC:n, sha256-kontrollerad) -> ExecStart pekas om -> spi.node byts mot tools/node24/spi-node24-arm64.node (byggd på
   lotus mot 24.18.0, require + ESM-import provade) -> pi-dmx-ble + bluetooth bort -> omstart, skriver health/perf/journal.
   Stegen provkörda mot en låtsasrot på lotus (backup, byte, sed i drop-ins, återställning). LED-RINGEN ÄR AVSTÄNGD TILLSVIDARE (10-18, ägaren) -
   spi-device laddas inte alls, spi.node-bytet är bara för en framtida påslagning. Kontrollera /api/perf efter 15 min musik mot punkt 2 (bänk: 34 mot 43 kB/s på Node 22 mot 18). v8Tiering.ts väljer själv
   --invocation-count-for-turbofan=100 på V8 >= 12. Backa: `--backa` (packar upp backupen, omstart). Live-allokeringsprofil som på
   lotus (SIGUSR1 + HeapProfiler inkl. bortstädat) går nu även här.

## Från kvällen 2026-10-17 - SKRÄPJAKTEN (ägaren: nattens ENDA uppgift natten till 10-18, se engångsundantaget i nattagentens SKILL.md)
Läget efter dagen (allt på PC, stabilt läge, med V8-flaggan): DMX-motorn 112 kB/s (effects.js 35, boundaryDetector.js 32, analysatorn 21);
lotus-motorn 203 kB/s (tickInner 75 utspritt över ~20 anropsställen med decimaltal, analysatorn 56 med låtbyten, alsaMic 31).
Klart 10-17: delade analysatorn (dmx 6b4963e / lotus 4e264e9, LIVE på lotus 14:04), v8Tiering.ts i båda (dmx a8966ee, lotus 1a0365a LIVE
14:45), lotus micvägens periodbuffert (LIVE 14:45). Ladan: allt väntar på nästa `python tools/ladan.py`.
GÖR i natt: (A) lotus tickInner + helpers (bassBody.step, subKickDb, pulseSplit, trustSmooth, updateBeatClock, processOnset, processDrop,
emitBands) och (B) DMX effects.ts + effects/*.ts + boundaryDetector.ts med recepten; bevisa byte-identiskt efter varje steg; deploya inte.
+ (ägaren ~15:05) FÖRST: mät båda motorerna med Node 18.20.4 (Pi:ernas version, portabel zip i C:/Users/richa/node18, nedladdningen godkänd
av ägaren - se SKILL-undantaget) mot Node 22 med/utan flagga; gör jakten med Node 18 som huvudmått; rapportera 'skulle Node 22 på Pi:erna
hjälpa?' med siffror och risker. Uppgradera inget på Pi:erna.
LADAN 10-17 14:58: deployat utan env (skräpfixar + FLANK_SHORT/STOP_MINI/SUBKICK standard); 15:00 LIVE prov DMX_SECTION_UNIT_MIN_MS=0
(ladan.conf), väntar på ägarens öga. MÄTFÄLLA 49: Pi:erna kör Node 18 (V8 10.2) - flaggan finns inte där.
15:09 BACKAT (ägaren: 'den missar en hel del minidrops iaf') - ladan kör 14:58-läget utan ladan.conf. Bänken (24 lang) gav inte färre
minidrops med provet (390 -> 395); orsaken okänd tills ägarens öga/inspelning med Mini!-markeringar säger mer. Rör inte SECTION_UNIT i natt.
15:5x LIVE (ladan.conf, väntar på ögat): DMX_DROP_LIFT_MS=8000 DMX_DROP_LIFT_FALL_MS=3000 DMX_DROP_LIFT_HIGH=1 DMX_TEMPO_PERSIST_S=3
DMX_DROP_BASS_LOOK=1 (a653837/80039f8/53156e4). Skräpjakten i natt ska bevisas identisk även MED dessa env (kör konsertReplay-beviset med dem också).
KLART 15:53: ägaren 'dropparna känns bra nu' -> alla fem är KODENS STANDARD (2273bb9) och deployat utan env (ladan.conf tom). Natten jämför
mot den nya standarden (ingen env behövs). Ny baslinje natt/2026-10-17-drop-std.json: pop kick->ljus 125 ms (var 100), r 0,30 (0,33).
KLART 2026-10-18 (nattagenten, skräpjakten, inget deployat): stabilt läge = ANDRA VARVET av materialet (första varvet = deopt vid nya
grenar, en rigg med dagars drift ligger i andra). Node 18 (Pi:ns V8) DMX 113 -> 74 kB/s (79ba733 låtgränsen, 85f650a effekterna,
fb70598 dirigenten), lotus 85 -> 41 (9e6501c, 153f7aa, d3cd59d, pushat). Allt byte-identiskt (DMX 24/24 lang + dropTiming + natt
--snabb; lotus engineReplay). MÄTFÄLLA 50: Node 18:s heap-profilerare visar bara överlevare -> tools/skrap/winAlloc.mjs (+ skrapReplay
--varv/--mode, n18compat, probe.py PROBE_RET). Största orsaken på Node 18: decimaltal i modulvariabler (let) boxas vid varje skrivning.
Kvar: analysatorn 20-27 kB/s (analysator-fynd 10-18, computeBpm 0 % TurboFan på Node 18) och DMX-effekterna ~40 kB/s (billiga som fast
look, 70-145 B/anrop i rotation; V8 slutar inlina hsvToRgb i långkörande processen - olöst, fxLab.mjs/fxHook.mjs). Node 22 på Pi:erna:
bara med flaggan (v8Tiering sätter den) DMX 74 -> 49, lotus 41 -> 39; utan flaggan sämre (lotus 94) - rekommendation i rapporten: inte nu.
Nästa deploy `python tools/ladan.py` tar med skräpfixarna (ljuset byte-identiskt) - titta på GET /api/perf mot 10-17.

## Från kvällen 2026-10-17 - SKRÄPET HITTAT (DMX-sessionen, ägaren: 'målet var att få bort allt skräp analysatorn skapar löpande')
Mätt i stabilt läge (allocProf --fran 300, lang-1014): motorn 450 kB/s, analysatorn 183, effects 146, boundaryDetector 47. Störst: V8 optimerar
om en funktion först efter 3000 anrop - computeBpm (4 Hz) och dropStep deoptas på sällsynta grenar och kör sedan otolkat i minuter (TurboFan bara
44 % av tiden), och då boxas alla tal. Flaggan `--invocation-count-for-turbofan=100`: motorn 450 -> 187 kB/s (effects 146 -> 35, analysatorn
183 -> 95), ljuset byte-identiskt på 3 inspelningar. Analysatorns kodfixar (decimaltal via fält, sällsynta grenar i egna metoder, scratch-
buffertar) -> lotus-morgonagenten (analysator-fynd.md 10-17 kväll + lotus morning-todo); med flaggan + kodfixarna 138 kB/s.
I KODEN SEDAN 10-17 (src/v8Tiering.ts, först i index.ts, följer med nästa `python tools/ladan.py`; 24/24 inspelningar byte-identiska).
Titta efter deployen på GET /api/perf mot 10-16 (minor ~15/min, längsta ~10 ms, major ~0 i stabilt läge).
Nattagenten: mät effects.js i stabilt läge med flaggan (vad som är kvar av 35 kB/s) och boundaryDetector (32 kB/s).

## Från eftermiddagen 2026-10-16 - KORT BREAK + STOPP-MINI GODKÄNDA I LADAN (går före allt annat)
LIVE 15:23/15:3x (main 1d5a3de + ladan.conf DMX_FLANK_SHORT_S=1, DMX_STOP_MINI_S=0.6; deploy med nyckel ~/.ssh/id_pidmx, 97da1f6).
Ägaren: 'dropparna känns bra' (kort break), 'minidropparna känns bra, behåll stopp-minidroppen'. GÖR: lyft båda till kodens standard
i effects.ts (FLANK_SHORT_S 1, STOP_MINI_S 0,6; =0 = av), bevisa natt --snabb + dropTiming --step 5 bit-identiska med env-proven, commit,
och skriv i rapporten att nästa deploy är `python tools/ladan.py` utan --env (tömmer ladan.conf).
+ ~15:5x DMX_BASS_SUBKICK=1 LIVE ihop med de två, ägaren: 'sub+kick känns bättre, behåll den' -> lyft även den till standard (basenergin
ur sub+kick; =0 = bodyDb som förr), samma bevis. (Lotus-omdömet 10-15 gällde gamla koden - bass-body kom aldrig ut på lotus-Pi:n.)
KLART 2026-10-17 (nattagenten, 5ebefe5): FLANK_SHORT_S 1, STOP_MINI_S 0,6, BASS_SUBKICK 1 är kodens standard (=0 = av); natt --snabb json-identisk
med gårdagens env, dropTiming --step 5 lang-1014 byte-identisk. NÄSTA DEPLOY: `python tools/ladan.py` utan --env (tömmer ladan.conf).
NYTT PROV 2026-10-17 (nattagenten, ingen kodändring): `python tools/ladan.py --env DMX_SECTION_UNIT_MIN_MS=0` - looken byts PÅ sektionsgränsen
i stället för 4 s in (24 lang: återseende 84 -> 94 %, kort look 13 -> 9 %, byten 2,55 -> 2,70/min; pop kick->ljus 100 -> 125 ms). Titta: kommer
refrängens look på refrängens första slag, och fladdrar det vid korta sektioner? Förkastat: build före drop ur basen borta (precision ~0,2).

## Från kvällen 2026-10-15 - LOTUS: BASEN SOM DMX, SUB+KICK GODKÄND I KÄLLAREN (porterat, opt-in, ej deployat i ladan)
Lotus fick DMX:s basenergi (LOTUS_BASS_BODY, lotus a5e972d/668ffc3). Ägaren: =1 (baskroppen 20-250 Hz) 'lite mörkare, ok, men följer inte bara
bas'; =2 (bara sub+kick 20-120 Hz) 'känns bättre'. Porterat till DMX som opt-in DMX_BASS_SUBKICK=1 (effects.ts BASENERGIN; flank-dropen läser
fortfarande bodyDb). natt --snabb: av json-identiskt; på: kick->ljus pop 125 -> 100 ms, megamix 150 -> 125 ms, r energi 0,34/0,09 oförändrat,
mörkt 0,02/0,03 oförändrat. Lotus-bänken (samma källa): r mot 250-1200 Hz 0,20 -> 0,15 (ladan-wav). REDO FÖR LADAN:
`python tools/ladan.py --env DMX_BASS_SUBKICK=1`. Nattagenten: mät gärna energiMatt med sub+kick som referens.
KLART 2026-10-16 (nattagenten): konsertReplay --bas-ref subkick (716eefa), 24 lang-*.wav (151 min, energiMatt): med sub+kick som referens
lyfter DMX_BASS_SUBKICK=1 r bara +0,01-0,02 (high r_bas 0,49 -> 0,50, r_bas_hp 0,42 -> 0,44; build hp 0,42 -> 0,44), diskanten ner (high r_disk
0,19 -> 0,17), refrängens dal 0,09 -> 0,07, slagdjup/sving lika. Mot bodyDb-referensen oförändrat. Liten skillnad i bänken - ägarens öga avgör.

## Från kvällen 2026-10-14 - KULÖRTONINGEN GODKÄND I LADAN (går före allt annat)
LIVE ~18:55 via ladan.conf DMX_HUE_GLIDE_MS=400 (commit "Kulörtoning opt-in"). Ägaren: "känns mer polerat nu". GÖR: standard 400 i effects.ts
(DMX_HUE_GLIDE_MS=0 = av), bevisa natt --snabb bit-identisk med --env DMX_HUE_GLIDE_MS=400, commit; rapporten: nästa deploy utan --env.
KLART 2026-10-14 ~19:2x (huvudsessionen): standard 400 + SAMMA LJUS SOM EFFEKTEN (ägaren: 'påverkade även energin ... fade är bara när
det går' -> glidkulören skalas till effektens ljus efter gamman, annars skarpt), deployat utan env, 0 filer skiljer. Nattagenten: mät gärna
skarpa kulörhopp på tända lampor (hue-sond: rgb ur eng.universe, hopp > 1/12 per renderruta) och hur ofta toningen faller till skarpt.
KLART 2026-10-15 (nattagenten): tools/hueSond.mjs (--delad-cfg --step 5) på lang-1014: skarpa hopp 149 -> 69 (14,9 -> 6,9/min) med 400 ms;
toningen faller till skarpt pga ljuskravet i 95 av 4760 glidbara byten (2 %); resten av hoppen = drop/mini/fastLight (38) och nytända (52).

## Från kvällen 2026-10-14 - NY LÅNGINSPELNING MED ÄGARENS MARKERINGAR (går före allt annat)
tools/ladan-2026-10-14/lang-20261014T161434.wav (+ .events.json, marks.jsonl; gitignorerad, ligger lokalt): 18:14:34-18:24:34, 10 min,
ladans nivå, kod = main med sektionsstandarden (RUN 5/RUN_IN 3/CARRY 20), TRUST_REPEAT, flank-drop, manus-return, minidrop-kulören.
Ägarens knappar (s från start): drop 54, mini 67, drop 108, drop 173, mini 181, drop 209, mini 262, drop 273, mini 304, drop 341,
mini 447, drop 530, drop 598. GÖR: kör konsertReplay --delad-cfg --step 5 + dropTiming på filen; jämför showens drops/minidrops mot
markeringarna (träff/miss/falsk, fördröjning) och mot events.json (det som hände live); sektionMatt på filen (fladder, intro-andel).
Rapportera vad markeringarna säger om drop-/minidrop-gränsen (ägaren tryckte Drop! 8 ggr på 10 min - fler än showens ~0,3/min?).
KLART 2026-10-15 (nattagenten): live-takt (dropTiming --step 5). Showen gav full drop vid 2/8 drop-markeringar (273, 597); 5 av de 6 övriga
låg på analysatorns fyrning (±1,1 s) efter bara 1,1-2,0 s basbreak (en takt) och blev minidrop pga flankens 4 s-krav; 341 = minidrop.
Mini-markeringar: 2/5 fick minidrop-look (262 blev drop, 304), 3/5 inget (67, 181 = bara nästan-drop 73 %, 447). Omarkerad show-drop: 333.
Analysatorns miniDropCount räknar i skurar (140 på 10 min) -> analysator-fynd 10-15. Idé byggd: DMX_FLANK_SHORT_S=1 (opt-in, 9f417c0):
break >= 1 s räcker om breaket ligger >= 24 dB under taket -> 7/8 drop-markeringar, 1 mini-markering blir drop; 23 filer 0,31 -> 0,72/min,
rätt 34 -> 87, falska 3 -> 7. REDO FÖR LADAN: `python tools/ladan.py --env DMX_FLANK_SHORT_S=1`. NÄSTA: de 3 missade minidrop-markeringarna.
KLART 2026-10-16 (nattagenten, de 3 missade): alla tre (67, 181, 447) = basen borta ~1 s mitt i refrängen och tillbaka; nästan-dropen
fyrar där men ger inget ljus i konsertläget (V123), energilyftet ser inte en dipp som återgår (67 dessutom blockerad av nästan-dropens 4 s-spärr).
Prov 972feb2 DMX_STOP_MINI_S=0.6 (opt-in): stopp 0,6-3 s i high -> minidrop-looken utan energilyft. Live-takt: mini-markeringar 2/5 -> 4/5
(+ drop-markeringen 341 som mini), 2 nya omarkerade; 151 min: minidrops 2,20 -> 2,73/min, drops identiska. Kostnad: blixt 0,1-0,3 s före
10/62 drops (dropSprångHög mega 0,35 -> 0,29). REDO FÖR LADAN: `python tools/ladan.py --env DMX_STOP_MINI_S=0.6` (ihop med
DMX_FLANK_SHORT_S=1 på lang-1014 live-takt: mini-markeringar 2/5 -> 4/5 även där, +1 omarkerad (291), drops lika).
IHOP MED LOTUS 10-15: lotus föreslog MINI_SPACING_MS 1500 (profilen, i stället för 1) mot skurarna; kört ihop med FLANK_SHORT på lang-1014 i
live-takt: bit-identiskt (konsertläget läser inte miniDropCount) -> ingen ljusvinst, bara läsbara loggar. Inte infört.

## Från kvällen 2026-10-14 - SEKTIONSPROVET GODKÄNT I LADAN (går före allt annat)
LIVE 17:57 (main 983d76b + ladan.conf DMX_SECTION_RUN=5, DMX_SECTION_RUN_IN=3, DMX_SECTION_CARRY=20). Ägaren i ladan: "mycket go känsla nu".
GÖR: lyft de tre till kodens standard i DMX-profilen (src/analyserProfile.ts sys: SECTION_RUN '5', SECTION_RUN_IN '3', SECTION_CARRY '20' -
profilen, inte delad kod), bevisa att natt.py/sektionMatt med standard = gårdagens körning med env (bit-identiskt), commit, och skriv
i rapporten att ladan.conf ska tömmas vid nästa deploy (`python tools/ladan.py` utan --env).
KLART 2026-10-14 ~18:1x (huvudsessionen, ägarens 'gör det till standard direkt'): profilen ändrad, sektionMatt 23/23 bit-identisk med
ladans env, deployat utan env (ladan.conf tom, bara analyserProfile.js skilde). Nattagenten: inget att göra här, bara baslinje.

## ANALYSATORN - ÄGARENS PRIORITERING 10-13 (i denna ordning; mät före/efter på alla lang-*.wav i tools/ladan-2026-10-11/, kör
## även konsertReplay --step 5 = live-takt; den delade analysatorn src/analyser.ts ändras INTE utan att lotus-sidan tar samma sak -
## lös i profilen (analyserProfile.ts) och/eller DMX-sidan (effects.ts/egen modul), eller lägg förslaget i analysator-fynd.md)
1. SEKTIONER SOM HÅLLER + INGA FALSKA LÅTGRÄNSER: sektionen fladdrar (low/build/high/intro byts på 5-20 s) och låtgränsdetektorn
   ger 'ny låt' mitt i låtar. Röd tråd, sektionstaket och build-valen hänger på det. Mål: sektioner >= 8 s (andel byten kortare än
   8 s ner kraftigt), falska låtgränser ~0 mot inspelningarnas riktiga låtbyten (lyssna/räkna dem en gång, spara som facit-fil).
   KLART 2026-10-14 (nattagenten, sektionsdelen, ej deployat, INGEN kodändring - befintliga profilrattar): REDO FÖR LADAN
   `python tools/ladan.py --env DMX_SECTION_RUN=5 --env DMX_SECTION_RUN_IN=3` (ur refrängen/mellanlägen kräver 5 raka 1 s-block i
   stället för 3, IN i refrängen fortfarande 3). 23 lang-*.wav (tools/sektionMatt.mjs + sektionStat.mjs): fladder (kort, ej build, ej
   nollning) 41 -> 17, sektionsbyten 3,12 -> 2,34/min, < 8 s 23 -> 18 % (resten = build 4-7 s före refrängen, avsiktligt kvar), high-start
   oförändrad (medel -0,04 s), tid high 40 -> 45 %, low 24 -> 21 %, build 13 % oförändrad. konsertReplay --delad-cfg --step 5: lookbyten
   3,14 -> 2,58/min, återseende 71 -> 81 %, hör ihop 77 -> 80 %, kort look 16 -> 14 %, variation 26 -> 27 looker 11/15 rutor. Showens drops
   bit-lika (dropTiming 44, rätt 35/sen 5), minidrop-looker 320 -> 312. energiMatt (ladans nivå): r_bas high 0,45 -> 0,48, slagdjup lika.
   Kostnad: megamix (överstyrd) r energi 0,18 -> 0,08, pop 0,37 -> 0,33. Svagare alternativ utan r-kostnad: DMX_SECTION_REPEAT=32
   (fladder 41 -> 28, byten 3,0/min). Prövat och förkastat: SECTION_HYST 0,25 (build 13 -> 10 % = emot prio 2).
   ÖPPET: falska låtgränser - facit saknas (kräver öron: 49 gränser på 141 min, flera 127 -> 127 BPM med grund nivådipp i 15:xx-seten
   är misstänkta). Efter varje gräns är sektionen 'intro' 20 s (17 % av tiden) -> analysator-fynd.md 10-14.
2. UPPBYGGNADEN TIDIGARE: analysatorns buildUp är död på ladans nivå (morgonagenten 10-12: ingen ersättare med AUC > 0,56);
   motorns buildProg börjar först när sektionen säger build. Ägaren (10-11): 'dirigenten skall bli snabbare att byta till BUILD
   innan drops'. Mål: känna igen builden 4-8 takter före dropen (facit = flank-dropparna, tools/dropTiming*.mjs), utan att
   fyra i verser.
3. BASGÅNG SOM SKILJER: profile.bassline ligger 0,62-0,77 i median i ALLA sektioner -> 'tydlig basgång' (toggle-låt, eko
   >= 0,85) är grov. Mål: ett basgångsmått relativt låtens egen nivå som skiljer en vers med melodisk basgång från pumpande sub.
4. TAKTSÄKERHET: beatConf ofta 0,3-0,6 i ladan, tempohopp inom låt (81 -> 144 -> 108). Mål: färre tempohopp inom låt (bänken
   396/503 + ladans inspelningar), högre tillit där takten är tydlig.
   KLART 10-13 (nattagenten, branch, ej deployat): TILLITEN = MÖNSTRET ÅTERKOMMER (beatFeed.ts TRUST_REPEAT, DMX_TRUST_REPEAT=0 = av):
   kick räknas som bevis om den ligger på slaget ELLER upprepar en kick 2 slag tidigare (±6 %). Ladan 141 min (konsertReplay
   --delad-cfg --step 5): tillit > 0,5 52,6 -> 98,8 %, bpmConfidence median 0,41 -> 0,99; tempo/drops bit-lika, minidrop-looker
   321 -> 318, lookbyten 447 -> 438. Korpus (tools/taktKorpus.mjs): klockan 81,5 % oförändrad; gamla måttet gynnade FEL tempo
   (AUC 0,43), nya 0,64. Tempohoppen (2,9/låt) är kvar - två DMX-ersättare förkastade, förslag i analysator-fynd.md.
   MÄTFÄLLA 47 (konsertReplay --delad-cfg: live får analysatorn motorns cfg -> kickgrinden på) och 48 (setVirtualClock(EPOCH+t) =
   dubbel epok, kickarna 1,7e12 ms före Date.now(): effekternas slag satt godtyckligt från kickarna i ALLA bänkar som gör så -
   rättat i konsertReplay/taktKorpus, övriga bänkar (concertBench, showTight, dropTiming, dynBench, ...) har kvar felet).
5. STARTEN EFTER OMSTART (~15 s uppvärmning, ojämnt ljus/snabba lookbyten) - morgonagenten har tagit uppvärmningen (analysator-fynd).
6. RENDERRUTOR -> TID: gå igenom allt i effects.ts (och effekter) som räknar i antal renderingar/rutor i stället för tid
   (mätfälla 46: live 200 Hz, bänk 40 Hz) och jämför konsertReplay --step 25 mot --step 5; allt ska ge samma.


## 10-13 NATT (huvudsessionen, MERGAT I MAIN, EJ DEPLOYAT): RÖD TRÅD + FLANK-DROP + TIDSBASERAD HISTORIK
- RÖD TRÅD (låtmanus, branch 4586c1c mergad): en look per sektionstyp per låt som återkommer, byten bara vid sektion/build/drop,
  en kulörfamilj per låt, refrängen släkt med versen. Kedja 141 min: lookbyten 5,2 -> 3,1/min, unika looker/låt 12 -> 5,
  återseende 2 -> 78 %, variation över kvällen kvar (71 looker, 15/15 rutor). Drops/minidrops oförändrade. Mått: tools/rodTrad.mjs.
- FLANK-DROP (83ce52c mergad, OPT-IN DMX_FLANK_DROP=1, DMX_FLANK_BREAK_S 3): rätt drops 33 % -> 78 % (4 s: 80 %, 0,31/min),
  falska 17 -> 2, median 91 -> 24 ms. Förslag till ägaren: slå på med break 4 s i ladan.
- HISTORIKEN TIDSBASERAD (be586f7): energilyftets/nästan-dropens fönster räknades i renderrutor - live 200 Hz gav 5x kortare
  fönster än bänken (live 3,4 minidrops/min mot bänkens 2,1). MÄTFÄLLA 46: allt som räknar i renderrutor måste vara tidsbaserat;
  konsertReplay --step 5 kör som live.


## NATTEN 2026-10-13 (nattagenten, inget deployat)
KLART 2026-10-13: baslinje natt/2026-10-13.json (pop 125/0,42 r 0,42 byten 3,1/min; mega 125/0,42 r 0,22 3,7/min; korpus 125/0,42 r 0,46;
  kickträff 0,50 -> 0,42 = basenergin följer bodyDb, inte varje kick; 54 aldrig valda i mixarna = röd tråd, kvällen 37 looker/14 rutor).
KLART 2026-10-13: opt-in DMX_MANUS_RETURN=1 - när sektionens look faller (tier 2 steg, ögonblickskrav punch/beat) prövas låtens tidigare
  looker för sektionen först, utan ögonblickskraven. 23 inspelningar: omval inom låt 15 -> 6, återseende 78 -> 83 %, hör ihop 82 -> 79 %,
  drops/mini/ljus oförändrade, av json-identiskt. Redo: ladan.py --env DMX_MANUS_RETURN=1.
ÖPPET: halva resten av återseende-missarna = looken byts först sekunder in i sektionen (fras/raster); refrängens slagdjup 0,56 < vers 0,61
  (dal 0,17); minidrop-kontrasten nu ok (median +0,54, 5/38 svaga, alla i hög refräng).

## ÄGARENS UPPDRAG 10-12 KVÄLL: RÖD TRÅD - "nu känns det bara som olika effekter hoppar hela tiden. Kan man få någon bra röd tråd,
## mer som att den är förprogrammerad?" (går före situationsrutnätet; drop-timingen nedan är lika viktig)
MÅLET I ÄGARENS ORD (tillägg): "så allt mer känns anpassat efter låten och som att de hänger ihop" - looken ska matcha LÅTENS
karaktär (tempo, basgång, energi, lugn/fart/full) och delarna ska höra ihop (samma kulörfamilj/gruppering genom låten, refrängen
en förhöjd version av versen snarare än en helt annan effekt, builden leder in i refrängens look).
Läget (main 41e06a5, LIVE 19:05): 78 effekter, dirigenten byter look 4,9 ggr/min (median ~12 s per look) och väljer ~60 olika looker
per 2 h; orsaker (replay 22 filer): sektion ~40 %, fras ~30 %, basgång, karaktär, drop, build, tempo. Sektionsdetektorn fladdrar
(low/build/high/intro byts ofta på 5-20 s, falska låtgränser -> 'ny låt: glömmer looker'), och varje fladder blir ett lookbyte.
En ljustekniker programmerar en låt: få looker per låt som ÅTERKOMMER (vers-look, build-look, refräng-look, break-look), byten på
riktiga sektionsgränser, en kulörfamilj per låt, variation inom looken (kulör per fras, lampordning) i stället för nya looker.
GÖR: (1) mät 'röd tråd' i bänken (tools/konsertReplay.mjs): lookbyten/min, unika looker per låt, andel byten som sker vid en
sektionsgräns som håller >= 8 s, återseende (samma sektionstyp i samma låt -> samma look), hur ofta en look visas < 8 s; (2) föreslå
EN ersättning som ger tydlig röd tråd, t.ex. 'låtens manus': vid låtstart väljs en liten uppsättning looker per sektionstyp ur
rutnätet (tier x sektion x basgång/kick) som sedan återanvänds hela låten; fras/basgång/karaktär byter inte look (bara kulör/
lampordning/gruppering), sektionsbyte kräver att sektionen hållit sig X s (eller att det är build/drop), nya looker bara vid ny låt;
(3) bevisa i bänken att drops/minidrops/energi är oförändrade och att variationen över en kväll finns kvar (alla rutor används över
många låtar). 'Ersätt, lägg inte till lager/rattar'. Deploya aldrig - 'redo för ladan' med siffror före/efter.


## 10-12 EFTERMIDDAG: NY ENERGIKEDJA I MAIN (ej deployad) - läs först
Ägaren: 'energin kändes inte ... vill att ljuset följer basgången, sub-känslan i ögonen, svänga mycket, taket sänks efter var i låten'.
Tre agenter: granskning (dubbelmodulering: kickdipp 3-4 ggr, SPOT/UNIFORM förbi energin, golv som låser energin, E_CURVE 10 binär,
TAKET TVÅ GÅNGER via dimmern rgb7 -> vers 0,65 blev ~0,42), mätning (branch worktree-agent-aea10e8f12cc72c8a, ej mergad: energin
6-13 % av svingen, lagren tar ut 4/5 av varandra, beatK följer inte basen r~0), prototyp MERGAD (89dde8f via merge): basenergi ur
frame.bodyDb (topp glider 10 s, dal 1 s, min 6 dB, kurva 3), golven/beatK/SPOT/UNIFORM-mdSel/död kod borta, taket bara på färgen.
Bänk 23 filer: följer basen r 0,12-0,18 -> 0,32-0,47 (diskant ~0,1), topp vers 0,40 -> 0,76, refräng 0,80 -> 0,95; drops/mini/
lookbyten identiska. 'Tak i vers' (cfg.verseCeil, /setup, 0,65) justerbart. Öppet: refrängens relativa slagdjup (0,52) < versens
(0,56) - tät bas lyser mellan slagen; uttoningen får inte bli snabbare.


## ÄGARENS UPPDRAG 10-12 (går först): FULL DROP-TIMINGEN - "känns som bara var 3:e träffar rätt"
Ägaren i ladan 10-12 13:0x. Två källor till riktiga drops (live sedan 10-11 kväll / 10-12):
  (a) analysatorns drop ([dropfire] i journalen: rise/underPeak/goneSpan/edgeAgo; edgeAgo = tid från baskroppens stigande flank till
      fyrningen - 10-12 12:45:55 var edgeAgo 2160 ms (!), 12:46:45 224 ms; 10-11 21:52:43 202 ms 'sen'), kräver 2 s bastystnad
      (BODY_GONE_MIN_MS 2000) och kroppen inom 3 dB från toppen (DROP_QUALITY_DB) - väntan på toppen gör den sen;
  (b) LYFT + SPRÅNG (effects.ts DROP_JUMP_DB 17, DROP_PAIR_MS 600): energilyftet (0,6 s-medel >= 10 dB) och nästan-drop-språnget
      samtidigt - kräver 0,6 s medel, alltså byggt för att komma efter flanken.
  + gemensam spärr SHOW_DROP_GAP_MS 12 s; en spärrad drop blir minidrop.
INSPELNING MED FACIT 10-12: tools/ladan-2026-10-11/lang-20261012T110658.wav (13:06:58-13:16:58, 10 min) + journalens [dropfire]/
  [dirigent] 13:06-13:18 (felsökning på). Ägarens rapporter (skrivtid, händelsen ~3-15 s före): 13:06:59 'drop, lite sen', 13:11:13
  'drop, ok', 13:12:31 'drop, full körde mini' (ville full drop, fick minidrop ~13:12:13-26), 13:13:34 'drop, kunde vart mini'
  (lyft+språng-drop 13:13:28), 13:13:57 'drop miss', 13:14:21 'förra skulle dock vara mini', 13:14:30 'minidrop miss', 13:14:46 'fel
  drop skulle vara mini' (lyft+språng 13:14:37), 13:15:07 'drop miss' (fick minidrop 13:15:04), 13:15:32 'sen drop' (dropfire 13:15:29),
  13:15:42 'kunde också vart mini'. Analysatorns drops med edgeAgo 4795 ms (13:17:44) och 13675 ms (13:16:23) = fyrar SEKUNDER efter
  flanken - huvudmisstänkt för 'sen'. EFTER detta (13:21 LIVE): lyft+språng-dropen BORTTAGEN (lyft = minidrop), riktiga drops bara
  från analysatorn, spärr 12 s, spärrad drop -> minidrop. Ägaren: 'hellre öka gränsen till riktig drop, bara minidrops kör vidare'.
GÖR: mät timingen per källa mot ljudet - var är smällen (baskroppens/kickens flank, onset) och när fyrar ljuset (inkl. kedjan:
fade-in 30 ms, BLE/DMX-latens ~0)? Fördelning tidig/rätt/sen per källa på alla långinspelningar (tools/ladan-2026-10-11/, och nya
från 10-12 om de finns), facit = ägarens rapporter (tider i todo ovan: 'sen' 21:29:57, 21:52:5x; 'lite tidig' 10-12 ~12:47;
'rätt' 21:31:12, 12:46:0x; 'fel drop' 12:46:0x) + ihållande baslyft (konsertReplay + analys-2026-10-11.md). Hitta varför 2 av 3
känns fel (för sen? för tidig? fel ställe?) och föreslå EN ersättning bevisad i bänken (t.ex. fyra på flanken när bastystnaden
varit lång nog, i stället för att vänta på toppen). Ändra inte den delade analysatorn (analyser.ts) - profilen (analyserProfile.ts)
och effects.ts går bra. Deploya aldrig; 'redo för ladan' med siffror.
REDO FÖR LADAN 10-12 (agent, ej deployat): DMX_FLANK_DROP=1 (effects.ts 'FULL DROP PÅ FLANKEN'): motorn tar riktiga drops själv på
  frame.bodyDb - break >= 3 s (0,6 s-topp >= 10 dB under taket) och fyr på flanken (taket - 6 dB, >= 12 dB på 0,5 s); analysatorns drop
  utan egen flank = minidrop. Bänk 23 filer/141 min (tools/dropTiming*.mjs): 46 -> 55 drops (0,33 -> 0,39/min), på baslyft 63 -> 96 %,
  rätt 15 -> 43, sen 11 -> 6, falsk 17 -> 2, fördröjning p50 91 -> 24 ms, p75 155 -> 43; 1012-filen: före 264/328 falska, 510 sen (ägaren
  'sen drop'/'kunde vart mini'), 565 5 s efter takten - efter 225,7 + 250,7 ('drop, ok' 13:11:13) + 315,1 ('full körde mini' 13:12:31).
  Lookbyten/ljus oförändrade (+-3 byten, +-0,01), minidrop-looker 277 -> 321. Färre: DMX_FLANK_BREAK_S=4 (44 drops, 0,31/min, 95 %).
  Kvar: 486 s ('drop miss' 13:15:07 - kroppen sjunker gradvis, break < 3 s) och 415 s (bara 5 dB baslyft) fångas inte.


## NATTEN 2026-10-12 (nattagenten, inget deployat)
KLART 2026-10-12: baslinje natt/2026-10-12.json (pop 125/0,50 r 0,42; mega 175/0,50 r 0,07; korpus 150/0,48; 22 aldrig valda).
KLART 2026-10-12: refrängen ljusare än builden -> opt-in DMX_EKO_HIGH=0 (56c6527): eko-förstavalet vid basgång gäller inte i high.
  Ljus high 0,28->0,36 / 0,38->0,42 (ladan 21:17/21:34), pop 0,34->0,45, mega 0,36->0,43; build oförändrad. Redo: ladan.py --env DMX_EKO_HIGH=0.
ÖPPET: minidrop-kontrasten - 4/26 minidrops på kvällens inspelningar har ljus 0,73-0,93 redan före (ingen synlig skillnad);
  förslag blixt på lampans strobe-kanal när DROP_STROBE är kalibrerad. Mega kick->ljus 150<->175 = 25 ms-rastrets kant (ej regression).
  Analysatorfynd: buildUp död (0,000 även i build). Situationsrutnätet (nya effekter) ej påbörjat i natt.

## LADAN 10-11 KVÄLL 21:15-22:15 (allt LIVE, ägarens live-omdömen i parentes)
- V123 live 21:16 (se nedan + analys-2026-10-11.md).
- BODY_GONE_MIN_MS 1000 -> 2000 (analyserProfile): falska drops var 30:e s på pumpande bas ('falsk' x3).
- 'Builden landar i refrängen' BORTTAGEN (falsk 21:42:39) -> LYFT + SPRÅNG = DROP: energilyft och nästan-drop >= 17 dB inom 600 ms
  (DROP_JUMP_DB). Bänk: 0,27/min, 91 % på baslyft. 14 dB provat och backat (ägaren: 'vill inte ha fler riktiga drops').
- Minidrop: energilyft 4 s + 1,5 s uttoning ('perfekt'), looken 600 ms (var 350; 'såg inte att det ens blev minidrop' - energin
  stod redan på max i starka partier -> minidropen syns bara som kulören. NÄSTA: kontrast, t.ex. kort svärta före eller vitare kärna).
- Huvuddropen: max 700 ms (var 1300), energilyft efter 4 s (var 2) - 'energin ska fortsätta efter'.
- Lampordningen växlar framåt/bakåt/utifrån-in/inifrån-ut per look och var 32:a slag (ctx.idx; c.group orörd).
- Uppbyggnaden laddar: motorns buildProg (32 slag från builden start) ersätter analysatorns DÖDA buildUp i build-effekterna
  + energigolvet stiger med förloppet under build-looker ('kändes inte som den laddade'). Bänken visar liten ökning i medelljus -
  mät hellre antal tända lampor/takt mot slutet. Efter: 'träff', 'perfekt', 'nja inte 100'.
- NÄSTA LADAN-BESÖK (ägaren 22:2x): kalibrera ingångsnivån - riktvärde för Flow 8 MON-reglaget till Pi:n (EQ rak, fast nivå;
  10-11 kväll låg ingången ~10 dB under eftermiddagen, fönster -35..-24 dB, ljuset mörkare). Geminis lågpass < 120 Hz AVRÅTT
  (takt, riser, virvel, sektioner, låtgränser behöver hela spektrumet).
- ÖPPET: 'sen' drops (analysatorn väntar tills kroppen är inom 3 dB från toppen, edgeAgo ~200 ms; QUALITY 6,5 gav bara fler
  drops); falska låtgränser mitt i låtar (sektion -> intro, 'ny låt: glömmer looker') ger lookbyte vid refrängen;
  'energi dog efter' 21:31 = sektionen high -> break 7 s efter dropen.
- Inspelningar med ägarens rapporter: lang-20261011T191741 (21:17-21:27), 193430 (21:34-21:40) i tools/ladan-2026-10-11/.
  Rapporttiderna finns i chattloggen (ej marks.jsonl): 21:18:42 falsk (dropfire 21:18:38), 21:20:56 miss, 21:28:36 miss
  (lyft + 27,7 dB), 21:29:11 träff, 21:29:57 sen, 21:31:12 rätt, 21:31:37 falsk, 21:32:26 miss, 21:42:1x miss, 21:42:45 falsk,
  21:49:0x miss, 21:52:5x sen, 22:12:18 'nja' (lyft + 14,6 dB).

## ANALYSEN AV KONSERTLÄGET 10-11 KVÄLL (läs först: tools/natt/konsert/analys-2026-10-11.md)
Showen reagerar 9,3 ggr/min men bara 15 % på riktiga baslyft (nästan-dropen = slump, analysatorns minidrops 17/min); build-looker
32 % av tiden mot sektion build 12 %; refrängen inte ljusare än builden. Provad ersättning V123 (ingen look/blixt från minidrops/
nästan-drop, build bara på sektion build, ny lyftdetektor 0,6 s ≥ 10 dB) -> 2,7 reaktioner/min, 42 % på lyft, build-look 15 %.
GODKÄNT AV ÄGAREN 10-11 kväll ("jag vill testa 123") och INFÖRT i src/effects.ts (bänken identisk med provet: 2,7/min, 42 % på lyft,
build-look 15 %). Nästa: refrängen ljusare än builden (ljus high 0,32 mot build 0,34), sedan drops mot ägarens Drop!-markeringar.

## FACIT FRÅN ÄGAREN: MINIDROP-/DROP-MARKERINGAR (10-11 kväll, går först när det finns markeringar)
Knapparna "Minidrop!"/"Drop!" i /setup (0dc7885): ägaren trycker när hen HÖR en minidrop/drop. Tiderna finns i långinspelningarnas
.events.json ("marks": [{wallMs, kind}]) och i snippets/marks.jsonl. Inspelningarna hämtas till tools/ladan-2026-10-11/ (och senare datum).
GÖR: per markering, vad gjorde detektorerna +-2 s (analysatorns drop/minidrop, DMX-sidans nästan-drop, energilyft, sektionslyft,
'builden landar', minidrop-looken miniColEnv) - träff/för sen/miss, och vilka fyrningar som saknar markering (falska). Ställ in
trösklarna (LIFT_DB, PRE_DROP_*, NEAR_*, BUILD_DROP_*, MINI_GAP_MS, analysatorprofilens drop-krav) mot markeringarna med bänken
(tools/window.mjs-mönstret i scratch: replay av wav med 100 ms-utskrift). Ägarens definition: minidrop = "från lugnt till ett tydligt
energilyft (även om det är lägre) med basslag"; riktiga drops: inga timrar, snävt mål. Allt nytt opt-in, redo för ladan.
Live 10-11 kväll (efter 1cff9df..0dc7885): drops utan timrar (BODY_GONE 1000, RISE 20, QUALITY 3), sektionslyft, energilyft, build
landar i refrängen = drop, energilyft avslutar build, minidrop-look 350 ms + lyft 1 s, basslagen i energilagret KICK_E 0,8,
konsertgolv 0,4, dropen bär in i refrängen (4 s), eko förstaval vid basgång, enhetliga effekter med energi på utvalda lampor,
tide/aurora/andrum bara < 90 BPM, fem nya effekter (fyllning, pingpong, virvel, fyr, rullandning).

## STORA PROJEKTET: SITUATIONSRUTNÄTET, ÖVER 100 EFFEKTER (ägaren i ladan 2026-10-11, går före gallring/rattar)
Ägaren: "den skall ju kunna välja - lugn låt och intro och få några val. Fartfylld låt, refräng, tydlig basgång, och få några val
osv. så kanske över 100 effekter". Dirigenten känner igen LÄGET och har 4-6 effekter byggda för just det läget.
AXLAR (finns redan som taggar/signaler): (1) låtens fart = tier lugn/fart/full (EffectDef.tier, tierEma), (2) del av låten =
section intro/low(vers)/build/high(refräng)/break (EffectDef.section, frame.section), (3) vad musiken gör = tydlig basgång
(bassline >= 0,6, EffectDef.toggle-poolen, eko förstaval), tydlig kick/låst takt (beatTrust >= 0,85), ingen takt (hasBeat falskt).
LÄGET 10-11 (50 effekter, "rumsl" = lamporna lyser olika; tools/effectDyn.mjs spridning >= 0,3):
  tier/sektion | intro       | low(vers)    | build       | high(refräng) | break
  lugn         | 11 (8 rumsl)| 6 (5)        | 0           | 0             | 7 (4)
  fart         | 0           | 14 (11)      | 11 (7)      | 8 (7)         | 1 (0)
  full         | 0           | 2 (2)        | 0           | 15 (12)       | 0
KLART 2026-10-12 (dagsession, ej deployat): 8 nya - svall (lugn x high), gryning (lugn x build), ankomst (fart x intro), glimt
  (fart x break), rulle (full x build), kickregn (full x intro), efterskalv (full x break), motor (full x low). effectDyn spridning
  1,00 alla. Replay 22 ladan-filer: valda 5,8 % av tiden (ankomst 2,2, gryning 0,9, motor 0,9, rulle 0,8, kickregn 0,6, svall 0,4);
  glimt/efterskalv 0 - ladans 'break' har nästan alltid basgång (eko/toggle-poolen tar dem). BUILD_LOOKS + gryning, rulle.
  c.lamp = fysisk lampa (ring-effekterna), c.idx = växlande ordning.
KLART 2026-10-12 (dagsession): BASGÅNGSGRÄNSEN - bassline är hög i ALLA sektioner (median 0,62-0,77, break 0,69) -> eko-förstavalet
  (>= 0,6) tog 30 %. Ny standard: eko förstaval bara >= 0,85 och aldrig i refrängen (nattagentens EKO_HIGH=0 nu standard, brytaren
  borta). De 14 nya effekterna fick FIT/SPATIAL i fit.ts (saknades -> neutral passform, valdes nästan aldrig). Replay 22 filer:
  eko 30 -> 10 %, variation (2^entropi) 21 -> 34, nya 6 -> 16 %, break-effekter valda. Toggle-gränserna (CLEAR_BASS 0,78/0,85)
  spelade nästan ingen roll.
KLART 2026-10-12: REFRÄNGEN STARKAST OCH TYDLIGAST TAKT (ägaren: takten ska kännas mest i refrängen, lamporna ska lysa olika).
  MÅTTET = LJUSASTE LAMPAN + slagdjup (topp/dal i 0,6 s-fönster), INTE medel över riggen (det belönar att tända fler lampor).
  Tak per sektion på ljusaste lampan (vers/intro/break 0,65, build 0,65 -> 0,85 med förloppet, refräng/drop 1), taktdipp 60 % i
  refrängen (50 annars), energigolv 0,8 i refrängen, build laddar halvt, siren 0,25+0,45p. Replay: topp refräng 0,76 / build 0,66 /
  vers 0,62 (före ~0,78 överallt), slagdjup refräng 68 %, tända lampor oförändrade. Förkastat: grundton på mörka lampor, kickblixt på alla.
KLART 2026-10-12 (dagsession): alla rutor >= 2 (ägaren: "gärna att alla har minst 2 st") - flod (lugn x build), famn (lugn x high),
  spaning (fart x intro), startskott (full x intro), siren (full x build), skuggor (full x break). 64 effekter. Närmaste syskon
  flod-rullandning 0,78. effectSimilarity saknade c.lamp/trebleEnv/airEnv (rättat). Replay: 14 nya = 6,3 % av tiden, 47 olika looker;
  break-rutorna (glimt, efterskalv, skuggor) väljs aldrig - ladans 'break' har basgång (eko 30 %). NÄSTA: rutorna till 4-6.
GÖR, några rutor per natt (5-8 nya effekter), tomma rutor först: lugn x high (lugn låts refräng), lugn x build, fart x intro,
fart x break, full x build, full x intro, full x break, full x low. Sedan varje ruta upp till 4-6, och inom rutan minst en per
musikdimension (basgång / kick / ingen takt). REGLER för en ny effekt: egen signal ur rutan (inte en dubblett), rumslig (spridning
>= 0,3 i effectDyn, aldrig alla lampor lika - de enhetliga får energi på utvalda lampor), kulör ur paletten via c.hueIdx (kulörsvansen
vid frasbytet ska finnas kvar - ägaren gillar den), ingen vitning (avmättnad <= 0,35), fastLight bara om stegen är kortare än 150 ms,
strobe <= 3 Hz synkront. ÄGAREN 10-12: INGET SKA KÄNNAS SOM STROBE - högst 1 blink per slag och LAMPA (som rulle: grupper får
turas om), kulörbyten högst 1 per slag. Mät med effectDyn 'blink/slag' (alla 78 <= 0,42 den 10-12). Bevis per effekt: effectDyn (spridning/rörelse/nivå), effectSimilarity mot syskonen i rutan (< 0,9), att
dirigenten väljer den i rätt läge (showTight/concertBench lookTime på mixar + ladan-2026-10-11-inspelningarna). Effekter på tagg
(section/tier/toggle) räcker för att dirigenten ska hitta dem; kontrollera att poolen inte töms (fallbacks i effects.ts).
Deploya aldrig - "redo för ladan" med listan av nya effekter, ägaren tittar.

## LÄGET 2026-10-11 12:31 - KONSERTLÄGET ÄR ENDA LÄGET (LIVE i ladan, ägaren: "mycket bättre, gör det till enda läget")
Live sedan 12:31 (a3ce847, deployad, ingen env utöver DROP_MIN_GAP_S): CONCERT = true i koden = sektionspalett, frasbyten, lamptrappa v2,
kulör per fras, full öppnar 0,6, aldrig enhetliga effekter (UNIFORM), BUILD före drop (kroppen borta 5 dB/1,5 s; build-sektion direkt),
effekten leder (energins golv 0,6), varje slag (dämpning mellan slagen 0,3 i steg 1), energi per lampa (EffectWants.energy, SPOT-regeln).
STÄMNINGARNA chill/fest/galet BORTTAGNA: vredet/slidern = bara ljustak (master 0,2..1). Bänken = live nu (natt.py kör samma kod).
Mått (enda-laget): lampspr 99/74, kickTraff 0,47/0,39, build före drop 0,50/0,47. Ny baslinje: natt/2026-10-11-enda-laget.json.
UPPBYGGNAD + MINIDROPS LIVE 12:5x (3eeab5a): effekten upptakt (en lampa pendlar, farten dubblas var 4:e takt) tar builden, enhetliga
build-effekter ur poolen; minidrop = högst en per 2 s och alla fyra lamporna samma kulör fullt en kort stund. Ägaren hade sett att
"uppbyggnad och mindre drops" var svagast - mät dem på långinspelningen nedan och föreslå förbättringar.
FÖRSTA LÅNGINSPELNINGEN: tools/ladan-2026-10-11/lang-20261011T103310.wav (10 min, 48 kHz, ladans nivå, ägaren spelade låtar med builds
och drops; .events.json har drop/minidrop/sektion/look per 100 ms MED DEN GAMLA build-logiken före 3eeab5a). Inte i git (gitignore
ladan-*). ANDRA: lang-20261011T105428.wav (10 min, MED nya build/minidrop-logiken 3eeab5a - jämför de två). TREDJE: lang-20261011T112342.wav (10 min, MED build som håller och landar 1feda46 - en drop per build, mät att dropen landar på smällen). Kör showTight/concertBench/dropFacit på dem: breaklängd före riktiga drops (4 s-kravet), build före drop, minidrops.
ÄGAREN GILLADE 10-11 ~13:3x: "när den fadar av på sekundära färgen sen byter, det var riktigt snyggt" - MITT I en effekt (inte efter
blink/drop). Troligen kulörbytet per fras (HUE_PHRASE) + uttoningens svans (gamla kulörkanalen tonar 0,25 s, nya tänds direkt). Den
"kulörsvans" som förr räknades som en brist ska BEHÅLLAS. Ta inte bort den, och tänk på den när effekter görs om.
MINIDROPS 08188fc: energilyft (lugnt -> basslag) + lyft som håller 0,5 s; ägaren: minidrop = "från lugnt till ett tydligt energilyft
(även om det är lägre) med basslag". Mät på långinspelningarna om lyften sitter på rätt ställen.
ÖPPET FRÅN ÄGAREN: "mindre drops [minidrops] ska vi kanske justera så att alla lampor då lyser lika iaf eller något, vet ej exakt än" -
förbered förslag med mått (t.ex. minidrop = alla fyra lamporna lyfts lika en kort stund, i steg 1), bygg som opt-in, ägaren avgör.
GALLRING att föreslå: UNIFORM-effekterna (breathe, snap, mono, pulse, party, airglow, hjarta, tyngdlyft, strobe) väljs aldrig längre i
smart-läget - bara manuellt. Föreslå gallring eller omgörning till spatiala varianter; gallra inte utan ägaren.

## (äldre) LÄGET 2026-10-11 eftermiddag (ersätter äldre "LÄGET"-rader nedan där de krockar)
KÖR LIVE i ladan (deploy 10-10 20:27): TRE STEG, Lägsta nivå 0,2, 4 s break före riktig drop, minidrop byter inte look, toggle-effekter
utan grundnivå + föredras vid låst takt, arecord FIFO 60. COMMITTAT MEN EJ DEPLOYAT (identiskt i bänken, ägaren kör `python tools\ladan.py`):
beatFeed.ts, långinspelningen (/setup "Spela in 5 min"), reglagerensningen (döda flaggor, env-brytare, dwell = fast 45 s, gamma en källa,
släckgräns bara /setup). OPT-IN SOM VÄNTAR PÅ ÄGARENS ÖGA (rör inte deras standard; mät gärna mer):
  DMX_SECTION_PALETTE=1, DMX_PHRASE_SWITCH=1, DMX_LAMP_STAIR=1 (v2: glesa lamppar i vers/intro), DMX_HUE_PHRASE=1  = konsertpaketet
  DMX_TIER_OPEN=0.6 (full ljusare än fart)   DMX_DROP_STROBE=<DMX> (lampans strobe-kanal vid drop, ≤ 3 blixtar/s, kalibreras i ladan)
  Siffror: tools/natt/konsert/*.json, rapport-artifacten (tools/natt/artifact.txt). Bänk: tools/concertBench.mjs, lampCount.mjs, knobSweep.py.
NÄSTA FÖR NATTAGENTEN, i ordning:
  1. Om ägaren spelat in lang-*.wav (snippets, hämtas i ladan): lägg dem i bänken (natt.py-mängd), mät drops med historik (dropFacit.mjs),
     breaklängd före riktiga drops (är 4 s rätt?), och om de "döda" rattarna i tools/natt/rattar.md (SECTION_UNIT_RESERVE_MS, SYNC_ERR_FRAC,
     DROP_CALM_BUILD, DROP_LAND_GAIN, E_RELEASE_MS, MIX_UNSEEN_BONUS, NEAR_FULL_DB) är döda även på riktigt material -> ta bort med json-bevis.
  2. Lugn-effekterna (breathe, mono, airglow) väljs aldrig - mixarna har ~60 s lugnt. Mät på långinspelningar/lugna korpusklipp innan gallring.
  3. Kick->ljus 150 ms (bara uppgången får kortas) - ny baslinje sedan beatFeed (mätfälla 43); budgeten i rapporten.
  4. Konsertshowen vidare om ägaren godkänt paketet: fler SPARSAMMA effekter (egna 1-2-lampsvarianter), kulör per sektion i fler effekter.
AGENTERNA 10-11: nattagentens instruktion omskriven (kortare, dagens ljusväg; gamla i tools/natt/agent-backup/). Analysatorfel skrivs till
tools/natt/analysator-fynd.md - lotus-morgonagenten läser den varje morgon (dess steg 4e) och fyller i Status.
Mätfällor sedan 10-10: 43 = bänkens taktmatning (nu beatFeed som live), 44 = korpusens första 15 s (analysatorns uppvärmning; använd energiR15).

## STANDARD ÄNDRAD 2026-10-10 19:50 (ladan): "Lägsta nivå" energyFloor 0 -> 0,2 (låtbyten och tysta intron var svarta 10-15 s: energifönstret mindes förra låten + brant kurva). Ny baslinje i bänken - kör om natt.py-baslinjen före jämförelser.

## LÄGET 2026-10-10 20:30 (ladan, kvällens fem fixar - båda STANDARD, filerna på Pi:n md5-verifierade, aktiva vid nästa omstart)
1. LÅSNINGARNA LÖSTA (e5012f0): "låser sig ibland" var att ljudet slutade komma 0,5-2 s ~15-22 ggr/h (I2S SYNC error efter varje omstart
   av capturen). Orsak: arecord låg på kärna 3 med vanlig prioritet bredvid dmx-helperns FIFO-50-tråd -> 21 ms-bufferten rann över.
   Fix: audio.ts spawnar `chrt -f -p 60` på arecord. Prov 15 min: 0 avbrott (väntat ~5). Kodekens state är rätt (127 kontroller jämförda).
   RÖR INTE: arecords prioritet/kärna, DMX_ALSA_BUFFER eller audio.ts STALL_MS utan nytt ladanprov. Bänken (PC) påverkas inte.
   Rapportera bara om du ser något i koden som kan svälta arecord igen (t.ex. ny realtidstråd på kärna 3).
2. "Svart vid låtbyte" = energifönstret minns förra låten ~10 s + brant kurva (e 0,4 -> md 0) - inte släckgränsen. Därför energyFloor 0,2
   (193beaf, se nedan). Ägaren: "nu är låtbytena bättre, lyser hela tiden". Om du rör energin: låtbyten och tysta intron får inte bli svarta
   igen - mät mörker de första 10 s efter en låtgräns i bänken (mixarna) före/efter.
3. FÄRRE RIKTIGA DROPS (cd1d932, live 20:07): BODY_GONE_MIN_MS 2000 -> 4000 i DMX-profilen (riktig drop kräver 4 s break). Ägaren:
   "hellre färre drops, mini fångar dom", "minidrop gör inget om de blir fler". Bänk: megamix 27->15, pop 4->2, minidrops 23->25.
   OBS drop-facit (uppgift 1b): bänken fyrade 2/10 på ladan-2026-10-10 före, 0/10 nu - mät klippen med 4000 och skriv hur långt
   breaket före varje riktig drop är (fyrade de live med 2 s-kravet bara för att breaket var 2-4 s?). Sänk inte kravet utan ägaren.
4. MINIDROP BYTER INTE LOOK (93bfae1, live 20:18): minidropen lyfter bara ljuset. Ägaren: "minidrop måste ju inte orsaka look-byten".
   Bänk: byten/min oförändrat (pop 6,2->6,0, megamix 6,8) - MIN_HOLD 8 s styr takten, bytena hamnar nu på nästan-drop/sektion/basgång.
   Ägaren: "låt 8 sekunder ligga" - rör inte MIN_HOLD. Minidrops är redan många (pop 11/min, megamix 58/min vid MINI_RISE_DB 10):
   sänk inte minidrop-kravet. showTight.mjs räknar nu minidrops (tajt.minidrops).
5. PARVISA EFFEKTER SYNS (6b8603d, live 20:27): toggle-effekter (EffectDef.toggle, nu även backbeat) får ingen FX_FLOOR - golvet lyfte
   'av'-gruppen till ~55 %, kontrast (max-min)/max bara 0,03-0,12 (tools/pairBench.mjs). Dirigenten tar varannat look-byte ur toggle-
   poolen när takten är låst och beatTrust >= 0,85 (ägaren: "är bpm låst och tydlig takt så vill jag att dirigenten föredrar dom").
   Bänk: toggle-andel pop 0,25->0,44, megamix 0,35->0,48, lampspr 50->64 / 28->40, ljus p50 0,59->0,50 / 0,70->0,64.
   MÄTFÄLLA 43 (gäller ALLA bänkar - showTight/pairBench/dynBench): bänken sätter cfg.beat.anchorMs = fr.beatAnchorMs varje hop, live
   (index.ts) har en PLL som nudgar ankaret. I bänken hoppar ctx.beatFrac 0,00->0,45 på 27 ms varje slag (halverad effektklocka +
   ankarhopp -> halfTick flippar fel), så grupp A:s topp ritas aldrig. UPPGIFT: gör bänkens taktmatning som live (bryt ut PLL-delen
   ur index.ts och använd den i bänkarna, bevisa identisk), mät sedan pairBench igen och skriv kontrasten per toggle-effekt. Kolla
   också om halfTick-flippen kan ske live (beatTick vs beatFrac-wrap när ankaret nudgas). Ändra aldrig den delade analysatorn.

## Från 2026-10-10 eftermiddag — NYA DROP-KLIPP + LÅNG INSPELNING (efter "FÄRRE REGLAGE")
KLART 2026-10-10 natt (8a3f782): (1) tools/dropFacit.mjs - bänken 0/10 fulla drops men minidrop vid dropen 10/10 (±0,4 s, rise 10-27 dB);
klippen börjar 15 s före dropen så analysatorn ser aldrig kropp->borta->tillbaka (live hade minuters historik) - breaklängden går inte
att mäta ur dem. (2) "Spela in 5 min" i /setup (src/longRecord.ts, /api/longrec; egen modul, recorder.ts är delad med lotus), alltid
tillgänglig, ingen kostnad i vila. NÄSTA: när ägaren spelat in lang-*.wav - kör dropFacit/showTight på dem (drops med historik).
Ägaren i ladan 10-10 ("ja, lägg in båda"). LÄGET: kodens standard deployad 10-10 ~14:10 (TRE STEG, dimmern konstant, minsta på-tid
lampa 150 ms / färgkanal 100 ms med EffectDef.fastLight (strobe), Släcktid 3 s, Lägsta nivå 0 % (energins golv), energin släcker aldrig
en tänd lampa). Live-mätning 10-10: 19 looks/3 min, färg DMX p5/50/95 18/75/215, max 242, DIM 255.
1. DROP-FACIT: tools/ladan-2026-10-10/ = 10 klipp à 30 s (recorder, Aux -18 dB, 0 % klippt, RMS p50 -15..-25 dBFS), kind "drop":
   riggen fyrade en RIKTIG drop vid 15,0 s i varje (prerollSamples 720000; motorns live-flaggor i *.events.json "flags").
   (a) Lägg klippen i bänken (dynSet/natt.py, egen mängd "drop1010") och mät ljusets språng 0-2 s efter 15,0 s mot 1 s före,
       drop-looken (blackout före, dropfärg/vit kärna), nästan-drops - oavsett om bänkens detektor fyrar.
   (b) Bänken (showTight, även med DMX_DROP_SONG_HOLD_S=0) fyrar bara 2/10 drops + 3 minidrops: ta reda på varför - för kort
       historik före dropen (15 s; detektorns baslinjer/uppvärmning), låtstartsregler, eller en verklig skillnad mot live
       (jämför med flags i events.json). Ändra ALDRIG den delade analysatorn för att få bänken att träffa; skriv fyndet.
2. LÅNG INSPELNING I APPEN: knapp i /setup "Spela in 5 min" (eller 2-3 min) som tar ett sammanhängande stycke ljud + motorns
   händelser till /var/lib/audio-dmx-engine/snippets (Recorder.startRaw finns: max 150 s full takt / 420 s 16 kHz - bygg det som
   behövs för 5 min 48 kHz mono ≈ 29 MB, eller dela i flera filer). Bara aktiv när DMX_RECORDER=1 (realtidsprincipen) - eller
   föreslå hur den kan vara på utan att belasta showen. Status i UI (spelar in / klar / fil). Deploya aldrig; "redo för ladan".

## Från 2026-10-10 kväll — KONSERTSHOW ⭐ (efter de två ovan; "löser du det får du en stjärna i kanten")
STEG 1+2 KLART 2026-10-10 natt (51c237b, rapport-artifact v4): tools/concertBench.mjs + sektionspalett opt-in DMX_SECTION_PALETTE=1
(paletter/sektion 2->1, palettbyte på gräns 0,1->0,97, återseende 0,23->1,0; av json-identisk; resultat i tools/natt/konsert/).
ÄVEN BYGGT samma natt (opt-in, av json-identisk): DMX_PHRASE_SWITCH=1 frasbundna byten (cf67e68; pop bytePaFras 0,22->0,45,
megamix 0,09->0,18), DMX_LAMP_STAIR=1 lamptrappa via dirigenten (712ee4b; pop allaTanda 0,81->0,69, versRefrang 0,06->0,21,
natt r 0,17->0,34; PRIS 11 aldrig valda mot 5). Alla tre ihop: tools/natt/konsert/*-alla3.json. VÄNTAR PÅ ÄGARENS ÖGA i ladan.
10-11 FÖRMIDDAG (sessionen): (a) KLART a0b4b22 - lamptrappan glesar ut icke-sparsamma effekter till ett lamppar i vers/intro
(steg 1) i st.f. att begränsa poolen: allaTanda pop 0,53, megamix 0,74, versRefrang 0,26/0,29, aldrig valda 4. (b) KLART 24a0109 -
DMX_HUE_PHRASE=1 (ctx.hueIdx): kulörbyten/min 17->13 / 21->16. ALLA FYRA ihop (tools/natt/konsert/*-alla4.json): kulörbyten 11/14,
kulörer/sektion 3, paletter/sektion 1, allaTanda 0,54/0,76, versRefrang 0,25/0,28, aldrig valda 8. (c) KLART 9bca6cd: DMX_DROP_STROBE=<DMX> = lampornas EGEN strobe-kanal under drop-smällen (RGB kan inte strobea -
uttoningen; snabbare fade förbjudet). KALIBRERAS I LADAN med lågt värde, max 3 blixtar/s. Röken var redan rätt (drop + hunger 300 s).
VÄNTAR PÅ ÄGARENS ÖGA i ladan (alla opt-in).
FART->FULL (nattagentens brist) KLART 9bca6cd: DMX_TIER_OPEN=0,6 (energins golv höjs med andelen full): full mot fart korpus
0,29->0,35 (fart 0,28), megamix 0,61->0,66 (fart 0,63), pop 0,56->0,63 (fart 0,50); r upp överallt. Opt-in, redo för ladan.
RATTSVEPET KLART 9bca6cd: tools/knobSweep.py -> tools/natt/rattar.md. Döda på mixarna: DWELL_MS (env-standarden 45 s vinner
alltid över cfg.smartDwellMs -> stämningarnas/UI:ts 'Byter effekt' är verkningslös), SECTION_UNIT_RESERVE_MS, SYNC_ERR_FRAC,
DROP_CALM_BUILD; nära noll DROP_LAND_GAIN/E_RELEASE_MS/MIX_UNSEEN_BONUS/NEAR_FULL_DB/NEAR_MIN. Dubbletter rättade: DMX_GAMMA en källa
(output.ts), DMX_SILENCE_LEVEL bort (/setup enda källan). NÄSTA: avgör per död ratt om den är död även live (lugnt material,
lång-inspelningarna) innan borttagning. DWELL KLART 58fcdff (ägaren: 'kör på vad du rekommenderar'): fast 45 s, smartDwellMs/UI bort.
Ägaren: "Hur kan vi få ljusshowen mer lik en riktig konsert-show?" Riggen: 4 RGB-parlampor (dimmer konstant, R/G/B bär allt),
rökmaskin, inga movers; allt i realtid ur aux (ingen låtlista, inget låtminne). Arkitekturen är fast: TRE STEG (effekt -> energi ->
kalibrering), effekterna äger färg/styrka/lampa, dirigenten väljer look.
1. ANALYS (skriv i rapporten, kort): vad gör en ljusdesigner på en riktig konsert som vår show INTE gör? Tänk t.ex. på: dramaturgi per
   sektion (återhållsam vers, stor refräng, kontrast/blackout i break), EN palett (2-3 kulörer) per låt eller sektion i stället för nya
   färger hela tiden, "hits" på accenter (snare/stab) och tystnad mellan, antal tända lampor som dynamik (1 -> 2 -> 4), symmetri och
   rörelse över riggen (chase/sweep i takt, spegling), bygg-och-släpp kring drops, strobe och rök sparsamt och vid rätt ögonblick,
   att samma sektion ser likadan ut när den kommer tillbaka (igenkänning), och övergångar som följer frasen (4/8/16 takter).
   Mät det som går att mäta i bänken (mixarna + ladan-klippen): t.ex. kulörer per minut, hur ofta riggen är helt tänd, lampspridning,
   skillnad vers/refräng, look-byten mot frasgränser - jämför med vad en konsertshow skulle ha. Döm på kurvan, inte på gehör.
2. EN idé, bevisad, som ger mest "konsert" för ögat - t.ex. sektionspalett (dirigenten låser 2-3 kulörer per sektion och byter palett vid
   sektionsgräns), eller "lamptrappa" (antal tända lampor följer sektionens energi), eller frasbundna byten. Opt-in, json-identisk av,
   före/efter-mått, "redo för ladan" med exakt kommando. Bryt aldrig: inget lager efter effekten får lyfta/vitna, fade-down aldrig
   snabbare, energin släcker aldrig en tänd lampa, ändra aldrig den delade analysatorn. Deploya aldrig.
3. Resten av idéerna som en rangordnad lista (nytta för ögat / insats) i rapporten - ägaren väljer nästa.

## Från 2026-10-10 — FÄRRE REGLAGE (går före allt annat)
KLART 2026-10-11 natt (16e43da): av-brytarna MIX_V2/SECTION_SWITCH/SECTION_UNIT/HALVE_SHOW/BOUNDARY_SOFT + döda DMX_EXPECT_LEAD_MS bort, effects.ts env-läsningar 52 -> 47, json-identisk (mixar + 222 klipp + ladans 20). Kvar som eget spår: inventeringstabellen med mätt effekt per numerisk ratt + dubbletterna.
DELVIS KLART 2026-10-10 kväll (sessionen, allt json-identiskt mot natt/2026-10-10-baslinje-beatfeed.json): 7 döda config-/UI-flaggor
(4177e02: beatPulse, calmDecay, energyCeiling, clubMode, ambientGlow, strobeUnlimited, regiPro), oanvända konstanter (4ed3851),
5 env-brytare (2f0c662), SECTION_REUSE (66d5f5c), ENERGY_FALLBACK. KVAR: av-brytarna för
MIX_V2/SECTION_SWITCH/SECTION_UNIT/HALVE_SHOW/BOUNDARY_SOFT (många användningar - en i taget med json-bevis), inventeringstabellen (steg 1) med
mätt effekt per numerisk ratt, dubbletterna (steg 3). Behåll som prov: DMX_PHASE_FOLLOW (lotus gridfas 0,95 mot kick-PLL 0,49 -
kandidat för bättre takt, kräver GRID_PHASE i DMX-profilen) och DMX_AUDIO_CLOCK (omätt på Pi-DMX). OBS ny baslinje: kick->ljus 125->150 ms
i bänken är MÄTNINGEN (beatFeed som live, mätfälla 43), inte koden.
Ägaren 10-10: "kolla om vi kan minska antal reglage ännu mer, om de inte gör något eller om t.ex. två gör nästan samma sak, går de
kombinera m.m." Ljuset styrs nu på TRE ställen (effekt -> energi + en uttoning -> kalibrering, se pi-dmx/TRIMRATTAR.md); allt annat
som rör ljuset är borta (backup-taggar backup/fore-ett-ljus-2026-10-10, backup/fore-tre-steg-2026-10-10).
GÖR:
1. INVENTERA alla reglage: env-rattar (effects.ts 55, index.ts 10, server.ts 3, output.ts 2, audio.ts 2, analyserProfile DMX-delen),
   config-fält (src/config.ts), stämningarna (src/moods.ts) och /setup (public/index.html). Tabell: namn, standard, var den läses,
   vad den gör, MÄTT effekt (natt.py --snabb + dynSet med ratten på ett annat värde - ger den 0 skillnad = död).
2. STARTLISTA (10-10, grep): config-fält som effects.ts inte läser alls: ambientGlow, energyCeiling, calmDecay, clubMode,
   beatSyncStrength (kolla index.ts/analysator), strobeUnlimited, regiPro, beatPulse (45 träffar i src men 0 som cfg i effects.ts -
   kolla vad som läser den) - och stämningarna/vredet som sätter dem. Om ingen läser dem: bort ur config, moods, server, UI.
3. DUBBLETTER: rattar som gör nästan samma sak (t.ex. flera golv/tak, dropEnv/dropColEnv-vägar, MINI_*/NEAR_*-par, sektionsrattar)
   - föreslå EN, mät att showen blir densamma (eller bättre), slå ihop.
4. Varje borttagning: json-identisk (natt.py --snabb) om ratten var död; annars mät före/efter och skriv i rapporten. En commit per
   grupp. Deploya aldrig. TRIMRATTAR.md uppdateras. Markera "KLART <datum>: <antal före -> efter>".

## Från 2026-10-10 — RENSA DEN DÖDA PULSKODEN (EN VÄG FÖR LJUSET)
KLART 2026-10-10 (i dagsessionen): -196 rader, json-identisk.
Ägaren 10-10: "kör ren kod utan massa toggels" - dimmern är en konstant och dimmerpulsen är borta (backup: git-taggen
backup/fore-ett-ljus-2026-10-10). Kvar i effects.ts är koden som RÄKNAR pulsen (beatMulNow: ENERGY_FB/transientpuls, ENERGY_RISE_K
'energi direkt', PULSE_GAP_*, BEAT_MIN, BEAT_FLUTTER_RELEASE, HEARTBEAT/hbEnvelope, BEAT_LIFT) men den når inga lampor längre.
Ta bort det som inte läses av något annat (kolla index.ts telemetri frame.beatMul, effekternas ctx.beatPulse/heartPulse - de är
EFFEKTENS puls och ska vara kvar). Bevis: natt.py --snabb json-identisk före/efter, dynSet identiskt. En commit per block.
Markera "KLART <datum>".

## Från kvällen 2026-10-09 — KVÄLLENS LADAN-ENV BLIR KODENS STANDARD (går före allt annat)
KLART 2026-10-10: tolv prov → kodens standard (TEMPO_* via DMX-profilen), E_SLOW_MS/HUE_CUT_MS/DIM_PULS/CH_MAP borta; mixar + effektval json-identiska mot ladans env, ladans 20 klipp identiska i allt ljus; TRIMRATTAR uppdaterad. Nästa ladan: `python tools\ladan.py` utan --env.
Ägaren i ladan 10-09 ("nu kör!" → "ja, gör dem till standard i natt"). Det som kör på Pi:n nu (ladan.conf, deployat ~10-09 kväll)
utöver SHOW_ENV (DMX_DROP_MIN_GAP_S=15):

  DMX_HUE_CUT=1  DMX_ALLA_LOOKER=1  DMX_E_CURVE=10  DMX_E_TOP=0.95  DMX_E_WIN_S=10  DMX_E_GATE=1
  DMX_GAMMA=1.6  DMX_E_NORM_S=2  DMX_E_LIN=1  DMX_FX_FLOOR=0.6  DMX_TEMPO_SHIFT=1  DMX_TEMPO_HOLD=1

GÖR (ägarens princip: ersätt, lägg inte till lager - flaggan försvinner, den gamla vägen tas BORT, värdet blir koden):
1. BASLINJE FÖRST: `python tools\natt.py --snabb --tag fore-standard --env <alla tolv ovan>` + `python tools\dynSet.py --env <alla tolv>`
   (spara json). Det är facit: efter varje steg ska `python tools\natt.py --snabb` UTAN --env ge json-identiska mixar mot den.
2. Gör standard, ett steg i taget, en commit per steg, json-identisk efter varje:
   - effects.ts: HUE_CUT (postprocess.ts: per-lampa-vägen blir enda vägen, kanalvisa ballistiken för färg bort), ALLA_LOOKER
     (registry.ts: REQ_ALLA blir REQUIREMENTS; effects.ts: build-inträdet + minst-spelad blir enda vägen, gyllene snittet bort),
     E_CURVE 10, E_TOP 0,95, E_WIN_S 10, E_GATE (fönstret uppdateras bara över ingångsgränsen), E_NORM_S 2, E_LIN, FX_FLOOR 0,6.
   - output.ts: GAMMA 1,6 som standard i LUT:en (ratten kan bli konstant).
   - TEMPO_SHIFT och TEMPO_HOLD ligger i den DELADE analysatorn: sätt dem i DMX:s egen PROFIL (src/analyserProfile.ts, sys:
     TEMPO_SHIFT '1', TEMPO_HOLD '1') - INTE som ändrad standard i analyser.ts (då ändras lotus). analyser.ts orörd ⇒ md5 orört.
3. TA BORT rattar som provats 10-09 och inte används: DMX_E_SLOW_MS, DMX_HUE_CUT_MS (och hueRatio), DMX_DIM_PULS (förkastad i ögat),
   DMX_CH_MAP + output.intent om HUE_CUT gör den onödig (mät ofrivBlink i dynSet före/efter - ska vara 0 kvar), E_STAT finns inte.
   Bevisa json-identitet mot steg 1 efter borttagningen.
4. ladan.py: SHOW_ENV oförändrad (bara DROP_MIN_GAP_S). Deploya ALDRIG - ägaren kör `python tools\ladan.py` (utan --env) nästa
   gång; då skrivs ladan.conf om och showen ska se exakt likadan ut som i kväll. Skriv det i rapporten.
5. TRIMRATTAR.md + ARKITEKTUR.md: uppdatera energin (fönster 10 s, tystnad räknas inte, topp 0,95, kurva 10 i DMX-procent efter
   gamma 1,6, effektens topp normerad 2 s, grundnivå 0,6), färgen (kulör direkt, ljusstyrkan tonar), dirigenten (alla 44 nås).
   Markera detta avsnitt "KLART <datum>: <en rad>".
Mätfällor från kvällen: bänkens nivå är -17 dBFS sedan 10-09 (mätfälla 42); dynBench mäter med cal.on 16 (standardconfigen saknar
cal); jämför json, inte scoreboardrader; ingen ändring i analyser.ts (lotus-agentens fil, md5-spärr).


## Från kvällen 2026-10-08 — LEVANDE DYNAMIK UTAN FLADDER (går före kodoptimeringen nedan)
KLART 2026-10-09: instrument dynBench/dynSet (+ natt.py -> dynamik.md); R/G/B = DMX_CH_MAP=1 (ofrivillig blink 4,3 -> 0/min/lampa, alla3 0,022 -> 0,038, json-identisk av); dynamik-kandidat DMX_E_CURVE=3 (spann 0,78 -> 1,18 steg, kontrast 1,50 -> 1,68, fladder 1,6 -> 1,1/min, ljus p50 -6 %); pulsen pa foljande fonstret = ingen matbar skillnad (kan bytas som ren forenkling). Redo for ladan, EN i taget.
Ägaren i ladan, ordagrant: "jag vill att nattagenten kollar över detta med dynamiken så ljuset känns levande, börjar bli bra.
Men tror vi kan göra det bättre. Då utan att de fladdrar."

LÄGET (godkänt och live 10-08 kväll, läs pi-dmx/TRIMRATTAR.md och memory/pi-dmx.md sista avsnitten):
- Ingången: Aux −18 dB (klippte förut - ALLA gamla ladan-inspelningar är klippta, nivåspann ~5 dB; mät INTE dynamik mot dem).
- Energin: ingångens volym (levelVU) i dB i ett FÖLJANDE fönster (E_WIN_S 20, E_MIN_DB 4) → kurva E_CURVE 2 → avklingning 100 ms →
  EN dämpningsfaktor på effektens RGB (aldrig > 1). Ägaren: "mycket bättre nu".
- Minidrop: lyft 0,9 i MINI_BANG_MS 150, ingen spärr. Nästan-drop 0,5–0,85. Ägaren: "drop-lyftet hjälper dynamiken".
- Utgång: en mappning (färg 1 % → släck+1; DIM golv+1..0,95 × fullpunkt 255; bara full drop till 255).
- Puls: effekternas c.heart + energipulsen ("energi direkt") som fortfarande läser det GAMLA dB-fönstret (liveLevelSm/lightLoud) -
  samma sak mäts alltså på två ställen. Kandidat: låt pulsen läsa samma följande fönster (en signal).

GÖR:
1. INSTRUMENT FÖRST: skriv/utöka en bänk som mäter (a) LEVANDE: energifaktorns spann i STEG (log2(p90/p10) av md), ljusets
   1 s-envelopp mot ingångens dB (r), och lugnt-mot-högt-kontrast; (b) FLADDER: per lampa antal riktningsbyten i ljuset med
   amplitud > 5 % av fullt inom < 150 ms som INTE ligger på ett slag/kick (±60 ms) - det är fladder, slagpuls är inte fladder;
   rapportera fladder/min. Kontrollera instrumentet: en konstant ton ska ge ~0 fladder, en ren kickloop fladder ~0 och puls = kickar.
2. MÄT läget med de NYA inspelningarna: tools/ladan-2026-10-08/*.wav (20 klipp à 30 s, 48 kHz mono, inspelade av motorns recorder
   i ladan 10-08 med Aux −18 dB: 0 % klippta sampel, 100 ms-RMS p10/p50/p90 −25,8/−17,4/−12,7 dBFS = 13 dB spann; .events.json/.json
   bredvid). Kör showTight på dem UTAN --norm (de ÄR ladans nivå). De gamla pop/megamix_ladan är klippta - räkna dem inte för dynamik.
   Lägg gärna till klippen i natt.py som en tredje mängd ("ladan10-08") så dynamiken följs natt mot natt.
3. EN idé, bevisad: mer levande (spann i steg upp, r upp) med fladder/min inte upp. Kandidater: pulsen på samma följande fönster;
   E_WIN_S/E_MIN_DB/E_CURVE; energins uppgång (attack) när volymen stiger; per-lampa-dynamik (inre/yttre). Fallhastighet får INTE
   ökas för lampan (DMX_FADE_MIN_S); energins egen avklingning ägs av ägaren (100 ms nu).
4. Allt som opt-in env, "redo för ladan" med exakt kommando. Ägarens princip: ersätt, lägg inte till lager.
5. STABILARE R/G/B (ägaren 10-08: "få lamporna att köra stabilare på r g b dioderna. nu kan tex R lysa och B fladdra till"):
   TROLIG ORSAK: en svag SIDOKANAL (t.ex. B i en rödaktig kulör) skalas med lampans ljusstyrka (energi/puls via colK i
   output.ts calibrate) och passerar diodens fysiska tändpunkt (~16) upp och ner -> B tänds/släcks i takt med LJUSSTYRKAN, inte
   med färgen. Förr fanns DISTINKTA FÄRGER (HUE_RATIO_ON 0,25 / OFF 0,15: sidokanal tänd/släckt efter sin ANDEL av starkaste
   kanalen, med hysteres) - den låg på !LOW_PURE-vägen och togs bort i steg 1 10-08 som död. Återinför DEN REGELN på den levande
   vägen i output.ts (färggrenen): sidokanalens andel avgör på/av med hysteres; tänd sidokanal hålls minst på sin tändpunkt+1 så
   den inte blinkar vid låg ljusstyrka; släckt = 0. Kulörens förhållande bevaras i övrigt. Mät med colorBench (per kanal) + ett
   nytt mått: antal på/av-växlingar per sidokanal och minut (ska ner mot 0 när färgen står still). Opt-in först, redo för ladan.
   FÖRSTAHANDSVAL (ägaren 10-08: "den skall ju kunna köra 50% blå och 30% röd") = PER-KANAL-MAPPNING: i output.ts färggren mappas
   VARJE färgkanal för sig: 0 = släckt, 1..255 -> den kanalens tändpunkt+1 (onR/onG/onB, annars on) .. tak - i stället för att
   alla kanaler skalas med den starkaste kanalens faktor (colK). Då kan ingen kanal som effekten säger är PÅ hamna under sin
   tändpunkt, och 50 % B + 30 % R lyser båda stabilt. Ägarens regel "1 % = släck+1" per diod. Ingen hysteres/andelsregel behövs.
   Bevaka: (a) avrundning - energi/puls kan skala en svag kanal till raw 0 (8 bitar) -> av/på nära botten; mät och räkna i
   flyttal hela vägen till mappningen om det fladdrar; (b) kulören blir något ljusare nära botten (ej proportionell) - acceptabelt.
   (Alternativ B, kvantiserad kulör, STRUKEN: klarar inte blandningar som 50/30.) Alternativ A (andelsregeln) bara om
   per-kanal-mappningen mäter sämre.

## Från kvällen 2026-10-07 — KODOPTIMERING AV LJUSVÄGEN

PÅGÅR 2026-10-08 (körd i dagsessionen, datorn sov i natt): steg 1 klart (output.ts 19→3 rattar, 467→335 rader), steg 2 klart
(gamla energins döda delar + DIM-taket/LiveRange bort; dB-fönstret KVAR - det matar pulsens 'energi direkt' och drop-landningen),
steg 3 väntar på ägarens beslut om HARD_GATE, steg 4 ej påbörjat, steg 5 klart (pi-dmx/TRIMRATTAR.md). Alla steg json-identiska
mot baslinjen 10-08 (mixar + 222 klipp). Render 62→55 µs/ruta (timeProbe.mjs). Nästa: steg 4 (effects.ts 98 env-rattar).

Ägarens mål (ordagrant): "allt jag vill med detta är att koden skall bli snabbare, tydligare och enklare att trimma till rätt"
och "vi skall inte lägga massa olika spärrar på ljuset, blir ju till slut omöjligt att styra".

GRUNDKRAV (ägaren 10-07): "så simpelt och snabbt som möjligt, men få ut effekten". Ersätt vägar, lägg aldrig till lager.
Kvällens opt-in-prov (HARD_GATE, DIM_MAX, PULSE_GAP_BEAT, MINI_FULL, ENERGY_SRC, ENERGY_GAMMA, ALSA_BUFFER, FAST_RECOVER, NEAR_*) ska
antingen bli standard med gamla vägen BORTTAGEN, eller tas bort helt - de får inte bli kvar som parallella rattar.

ÄGARENS LJUSKONTRAKT (bestämt i ladan 10-07, går före allt äldre):
- Ända till output kör vi 0–100 %. Effekter/dirigent/energi vet INGET om hårdvaran (tändpunkt, golv, DIM-mättnad).
- 0 % = släckt, och det är dirigentens/effektens beslut. Effektens 1 % mappas till lampans SLÄCK+1.
- Mappningen är SISTA steget i output (`output.ts` LIN_MAP, standard sedan 10-07). Ingen annan modul känner till den.
- Effekt 100 % = 95 %; bara drop (dropEnv som tal till calibrate) öppnar de sista 5 %.
- Energilagret får bara MINSKA. Snabbare fade-down är fortfarande förbjudet.
- Ingångens lägsta: EN hård, justerbar gräns (Släckgräns i /setup) på analysatorns nivå, inga tider (prov DMX_HARD_GATE=1).

REGEL FÖR VARJE STEG: showen ska vara BIT-IDENTISK med kodens standard + ladans SHOW_ENV före och efter
(`python tools\natt.py --snabb` + korpus, jämför json, inte bara scoreboardraden). Ett steg = en commit. Faller identiteten:
revertera och skriv varför. Deploya aldrig (ägaren kör ladan.py). Rör aldrig analysatorn.

STEG I ORDNING (gör så många som hinns, ett i taget):
1. `output.ts`: ta bort de vägar som är döda med LIN_MAP som standard — CAL_V2 + dess 8 rattar (förkastat prov 10-06),
   klampningsgrenen (LIN_MAP=0), 10 %-regeln LOW_ON/OFF_CH, HUE_LIFT/HUE_RATIO (gäller bara utan LOW_PURE), MIN_DIM,
   LOW_PURE-flaggan om den nu alltid är på. Mål: ~3 rattar kvar (golv FLOOR_CH, MAP_TOP, DIM_MAX) och en calibrate
   som går att läsa på en skärm. Kolla att tools/ (calProbe m.fl.) inte bryts — gallra verktyg som bara mätte döda vägar.
2. ÄGARENS MODELL (10-07 kväll, ordagrant): "energilagret, följer det inte bara inputs energinivå med liten fade out?" - JA, så
   ska det vara. I dag: basens dB (LIVE_BASS_W 1 = bara bodyDb) -> 10 dB-fönster mot 120 s-ankare med särregler -> 3 utjämningar i
   rad (350 ms, 25/150 ms, log-release) -> TVÅ vägar (md på RGB golv 0,25 + uppbyggnad/drop/sektionsgas; vu på DIM golv 0,20, 0,45/1,2 s)
   -> sektionsdämpning. Bygg den enkla vägen: en energisignal, direkt upp, EN kort avklingning, ETT golv, applicerad EN gång (DIM).
   PROV LIVE 10-07: DMX_ENERGY_SRC=intensity (analysatorns frame.intensity 0,05..0,85 -> 0..1 i stället för dB-fönstret) gav i bänken
   pop r 0,20 -> 0,48, megamix 0,09 -> 0,45 - läs memory/pi-dmx.md om ägaren godkänt den; då är intensity energisignalen.
   GODKÄNT 10-07 ~20:20 ("mycket bättre energiföljning nu"): ENERGY_SIMPLE är STANDARD. Steg 2 = TA BORT den gamla energikedjan
   som nu är död: LIVE_LEVEL-fönstret/ankaret (LIVE_WIN_DB, LIVE_OFFSET_DB, LIVE_ANCHOR_*, LIVE_RELEASE_MS, LIVE_BASS_W, LIVE_CEIL),
   lightShapeSm/lightLoud/log-release/soft-snap, md0 med LIGHT_FLOOR/buildUp/dropEnv-påslag, sektionsgas (secGain/dynGain/RANK/
   EXPECT_LIFT), vu/range/CEIL_FLOOR/ceilMul-vägen, ENERGY_GAMMA, ENERGY_SRC - allt som bara matade md/ceilMul. Kolla vad ANNAT
   som läser samma fält (lightLoud används t.ex. av dirigent/tier? tierEma?) innan något tas bort; bevisa med natt.py att showen
   är bit-identisk med ENERGY_SIMPLE före och efter borttagningen.
   (Historik) Energin på ETT ställe med EN ratt: i dag multiplicerar energin både effektens RGB (md, golv LIGHT_FLOOR 0,25) och DIM
   (ceilMul, golv CEIL_FLOOR 0,20) — två golv som multipliceras. Effekterna äger RGB enligt kontraktet, så energin hör
   hemma på DIM. Kartlägg först (siffror), föreslå i rapporten, bygg som opt-in om det inte kan vara bit-identiskt.
   OBS ladans stegtest 10-01: DIM mättar vid ~85 (prov DMX_DIM_MAX=85 live 10-07 kväll, ägarens öga avgör).
3. Ingångsgränsen: om ägaren godkänt DMX_HARD_GATE (står det i memory/pi-dmx.md) — ta bort gamla tystnadsgrinden
   (SILENCE_MS, SILENCE_RELEASE_S, gain-skalning, START_FADE_MS, låtstartsflanken). Annars: lämna.
4. `effects.ts` (101 env-rattar, 2 114 rader): gallra rattar som aldrig blivit standard och vars standard gör grenen död.
   Lista först alla rattar med standardvärde + om grenen körs med SHOW_ENV; ta bort döda grenar några per natt.
5. Skriv/uppdatera EN tabell över trimrattarna som finns kvar på ljusvägen (fil, ratt, standard, vad den gör) i
   pi-dmx/ARKITEKTUR.md eller en egen TRIMRATTAR.md — det är ägarens trimyta.

Mät också: rader och env-rattar per fil före/efter, och process()/render-tid per ruta (snabbare = ett av målen).
HÄNG (ägaren i ladan 10-07 ~20:55: "känns som motorn hängde sig ett tag"): Pi-loggen visade 0 krascher/watchdog/OOM - bara
kvällens 5 deploy-omstarter (efter omstart 10-20 s utan taktlås/nivå). Mät ändå på PC:n i bänken: max och p99 för
render()-tid per ruta och för analyser.process per hop över hela mixarna, och vilka steg som kostar (effekter, dirigent,
postprocess, output). Ta bort onödiga beräkningar i ljusvägen (allokering per ruta, strängbyggen, döda grenar) - ägaren tror
att det är där hänget försvinner. Rapportera före/efter i ms.
Rapportera under egen rubrik. Markera detta avsnitt "KLART <datum>: <en rad>" när steg 1–5 är gjorda
(annars "PÅGÅR <datum>: steg X klart").

## Från kvällen 2026-10-07 (sent) — INGÅNGEN VAR ÖVERSTYRD
Ladans inspelningar pop_ladan.wav/megamix_ladan.wav är tagna med en ÖVERSTYRD ingång (22–29 % klippta sampel, 97–99 % av
sekunderna i 0 dBFS, nivåspann 5 dB). Ingången är sänkt 13,5 dB som standard (server.ts: Aux 49, Mixin PGA 3) och ägaren:
"mycket bättre nu". Konsekvens för bänken: mixarna motsvarar inte längre riggen för energi/nivå/tystnad — skriv det i
rapporten, jämför inte energimått mot gamla rader, och be ägaren spela in nya ladan-mixar (DMX_RECORDER=1) nästa gång.
Simulera inte nivåsänkningen på de klippta filerna (klippningen går inte att ta bort i efterhand).
