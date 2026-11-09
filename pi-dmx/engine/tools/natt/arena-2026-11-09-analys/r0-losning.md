# r0 – a3 + a7 på den nya basen (e047c6f, "EN KLOCKA FÖR BÅDA")

## Idén
Varianten bygger på två delar ur runda 1. Den första är EN dropdetektor i analysatorn (a3): flanken ligger i dropStep på samma filter, och
12 s-spärren är en del av klassningen. Den andra är EN tystnadströskel (a7): `frame.silent` kommer från cfg.silenceLevel, och brusgrinden
räknas en gång. Lyft, nästan-drop och basstopp mäts i analysatorn (VAD + styrka). Effekterna behåller bara reaktionen.

Delarna fördes in med patch från idébankens diffar mot `cp -r src`. Två hunkar las in för hand: ramens publicering (`f.dropCount = …`)
och klassens fält, eftersom barShiftOut är borta i nya basen. Resten gick in med offset.

## FLYTTAT (räknas inte längre i effects.ts)
Basens effects.ts är src/effects.ts. Analysatorn är r0/src/analyser.ts.

| vad | förr: effects.ts fil:rad | nu: analysatorn fil:rad | ramens fält |
|---|---|---|---|
| flanken (full drop), egen kopia av filtren fdF/fdS/fdC | effects.ts:785 flankStep, anrop :1592 | analyser.ts:2914 flankStep (anrop :2717, på bodyFast/bodyCeil) | dropCount, dropRiseDb |
| FLANK_* + FLANK_SILENT_LV | effects.ts:361, 367, 371 | analyser.ts:291 | – |
| slam utan flank inom 2 s → minidrop | effects.ts:1590–1594 | analyser.ts:2906 dropClassify (anrop :2902) | dropDemoted (+ miniDropCount) |
| spärren SHOW_DROP_GAP_MS 12 s | effects.ts:372, 1602–1603 | analyser.ts:293, :2906 | dropSpaced (+ miniDropCount) |
| nästan-drop (nearB/nearNorm/botten, NEAR_RISE/DIP) | effects.ts:1207–1237, 238–239 | analyser.ts:2932 liftStep, :295 | nearDropDb, nearDipDb |
| energilyft (LIFT_DB, lugn 6..2 s mot 0,6 s) | effects.ts:1260–1266, 57 | analyser.ts:2932, :295 | liftDb |
| basstopp (STOP_MINI_S) | effects.ts:1250–1259, 61 | analyser.ts:2932, :295 | stopCount, stopS |
| INPUT_OFF_LEVEL 0,02 | effects.ts:153, 1897 | analyser.ts:3058 | silent |
| "tystnad flyttar inte fönstret" ×4 | effects.ts:1383, 1385, 1403, 1404 | analyser.ts:3058 | silent |
| släckgrinden `level > silenceLevel` | effects.ts:1912 | analyser.ts:3058 (+ setSilenceLevel :930, index.ts:168) | silent |
| låtgränsens tystnad 0,02 | boundaryDetector.ts:185 | analyser.ts:132 silentLevel, index.ts:187 boundsArg.silent | silent |
| brusgrinden ×4 (noiseFloor·1,5) | analyser.ts:2341, 2450, 2484, 2557 (bas) | analyser.ts:2152 hGated; workern :2602 activeMs > 0 | (B_ACTIVE) |

Transporten från workern sker via split.ts:184 (BS_CAND..BS_STOPSEC, BIG_STATE_LEN 22) och analyser.ts:1582/1625.

effects.ts läser nu bara ramen:
- :1177 nearDropDb, :1194 stopCount och :1202 liftDb. Där ligger refraktärtiderna, MINI_GAP, !dropActive, BUILD_LOOKS och kravet på sektion high.
- :1532–1533 dropDemoted och dropSpaced, som går till gapMini.
- :1323–1344, 1835 och 1850 läser !frame.silent.

Kvar i effekterna, som reaktion enligt gränsen: dropens längd och uttoning, efterkontrollen (:1552), miniBody (:1763, minidropens
energisläpp) och silenceLevel. Den sista används bara till rampens skala (:1849).

## DELAR
| del | vem | mått (runda 1 → r0) |
|---|---|---|
| EN dropdetektor (flank i dropStep, spärren i klassningen) | a3 | drop_falska 5,71 → 0,00 (+100 %), drop_traff och drop_ms oförändrade |
| lyft, nästan-drop och stopp i analysatorn | a3 | – (ljusdomaren) |
| EN tystnadströskel och brusgrinden en gång | a7 | ned_s 3,00 → 1,90 s (+36,7 %; a7 ensam gav +31,7 %) |
| basnotsräknaren (bassNoteStep, frame.bassNoteIdx) | a5 | PRÖVAD i mätning 2 och BORTVALD: latensen 80 → 85 ms (t90 20 → 25), poäng +1,82 mot +4,32. Ljusdomaren gav +1,47. Finns i r0/v2 (losning-a5.diff, tvavagar.json). |

## SIFFRORNA (mätning 1 av 3 – den levererade; mätning 2 = a5-provet; mätning 3 oanvänd)
- Domarens rad: **+4,32**, långsamma +7,20 %, snabba ±0, latens 80 ms (samma som bas). Ingen DISK.
- Måtten: drop_falska +100 %, ned_s +36,7 % (1,90 s), grid40 −1,0 % (52,39), gridfel −7,0 % (22,9 ms), korta −6,3 % (32,26).
  Alla övriga är ±0: upp_s 1,35 (= bas), mix_*, klipp, ettan, gr_ratt 73,33 och gr_falska 0.
- md5: 120 s-snabbkollen är IDENTISK, men de hela filerna skiljer. Ljusdomaren ger **+0,02** (gränsen är −0,5) och inga spärrar slog till.
- Pi-budgeten: worker p99 6 hop (X = 7), **workerUs 50,1 µs/hop** mot parets bas 50,6 (gränsen 130). Huvudtrådens cpu var 45,82 mot
  46,20 µs/hop (kvot 0,992). Väckningen var 18,2 µs/hop, och ≥ 2 hop efter låg på 47,9 %.
- Allokering: inga nya objekt per hop. Ringarna fdT/fdV (1024) och liftHist (240) är förallokerade Float64Array. Talfälten står i
  DOUBLE_FROM_START, och `silent` är en boolean i det återanvända Frame:t.

## RISKEN
- Flanken körs per hop (375 Hz) i stället för per renderruta (200 Hz live, 40 Hz i bänken). Fönstren blir finare, så det kan finnas
  millisekundskillnader mot ägarens godkända flank. Ljusdomaren +0,02 säger inget om ladans öga.
- Sektionen läser fortfarande slam-kandidaten (dropCand), inte full drop. Det är medvetet, så att upp_s inte riskeras: a2 visade att
  sektionen faller (−4,7) när dropen stramas.
- Tystnaden 0,02 → 0,05 påverkar tre saker i mycket tysta partier:
  - INPUT_OFF kan slå till tidigare.
  - Låtgränsens 3 s-tystnad räknas från en högre nivå (gr_falska höll sig 0 på övningen).
  - Energifönstren fryser vid en högre nivå.
- `silentLevel()` är en modulvariabel som bara finns för verktygen. Motorn läser ramens flagga.
- Domarens måttbrus: korta −6,3 % och gridfel −7 % bär samma tecken som hos a7. De kommer troligen från tystnadsbytet, inte från dropen.
- Diffen: `losning.diff` (mot engine/src).
