# a7 TYSTNAD – en tröskel i analysatorn

## Idén
Analysatorn avgör "tyst" på ett enda ställe. Den publicerar `frame.silent = level <= cfg.silenceLevel`, där gränsen sätts live med `setSilenceLevel` från /setup-ratten. Brusgrinden (`rms >= noiseFloor·1,5`) räknas en gång per hop på snabba sidan, och workern läser den via `activeMs > 0` (B_ACTIVE) i stället för sin inaktuella cfg-kopia. Effekternas släckgrind och INPUT_OFF, energifönstren och låtgränsens 3 s-tystnad läser alla samma flagga.

## FLYTTAT
| vad | från (bas) | till (a7/src) | ramens fält |
|---|---|---|---|
| INPUT_OFF_LEVEL 0,02 (ingång av) | effects.ts:153, 1897 | analyser.ts:3832 (`f.silent`) | frame.silent |
| släckgrinden `level > silenceLevel` | effects.ts:1912 | analyser.ts:3832 | frame.silent (effects.ts:1911 läser bara flaggan; gränsen skalar bara rampen) |
| "tystnad flyttar inte fönstret" ×4 (0,02) | effects.ts:1383, 1385, 1403, 1404 | analyser.ts:3832 | frame.silent |
| låtgränsens tystnad `level > 0,02` | boundaryDetector.ts:185 | analyser.ts:133 `silentLevel()` + index.ts:187 `boundsArg.silent` | frame.silent |
| brusgrinden ×4 | analyser.ts:3171, 3312, 3346, 3419 | analyser.ts:2950 `hGated` (snabba sidan); worker analyser.ts:3434 `activeMs > 0` | B_ACTIVE |
| live-gränsen till analysatorn | (shallow copy, aldrig uppdaterad) | index.ts (`analyser.setSilenceLevel(cfg.silenceLevel)` före process) | – |

## DUBBLETTEN
Det fanns fem trösklar för "tyst": 0,02 (INPUT_OFF), 0,02 (låtgränsen), cfg.silenceLevel 0,05 (släckgrinden), noiseFloor·1,5 på fyra ställen och FLANK_SILENT_LV 0,005. Jag valde **B = cfg.silenceLevel** som enda nivåtröskel, eftersom det är ägarens ratt och den enda som går att justera. 0,02 går bort helt. Brusgrinden är en annan storhet (rå rms, "finns det signal", före gain) och står kvar, men räknas nu på EN rad. FLANK_SILENT_LV 0,005 (effects.ts:371) rör jag inte, eftersom den hör till flankStep som ett annat kort flyttar. Byter man den till 0,05 kan riktiga drops efter tysta breaks spärras.

## SIFFRORNA
- Snabbkollen gav md5 IDENTISK på 120 s lang1021: brusgrinden är bit-identisk, och 0,02→0,05 slår inte till i normal musik.
- --mat (1 av 3, klar efter pausbeskedet, ingen ny lagd): **poäng +0,79** (plats 2), långsamma +1,31 %, snabba +0,00 %. Ingen DISK.
- Måtten mot bas: ned_s 2,05 s (+31,7 %), grid40 −1,0 %, gridfel −7,0 %, korta −1,4 %, resten 0,0. Inget mått på tempo, ettan, drop eller låtgräns rörde sig (gr_ratt 73,33 / gr_falska 0,00).
- md5 skiljer på de hela filerna. Ljusdomaren ger −0,15, över gränsen −0,5, och inga spärrar slog till.
- Huvudtrådens cpu var 44,80 µs/hop mot bas 45,13 (kvot 0,993). Latensen är 80 ms, lika med bas.
- Worker-p99 blev 8 hop. Det är över rankingens X = 7, men domaren gav ingen DISK, eftersom gränsen räknas mot det samtidigt körda parets bas. Andelen ≥ 2 hop efter var 42,6 %, väckningen 38,7 µs/hop.

## Worker µs/hop och allokering
Workern gör mindre: en jämförelse mot en cfg-läsning tas bort, och `activeMs > 0` är en fältläsning. Snabba sidan räknar en jämförelse per hop i stället för tre. Varje ram muterar en boolean, och inga nya objekt skapas per hop. `setSilenceLevel` är en tilldelning per tick. Huvudtråden mättes till 44,80 µs/hop mot bas 45,13. Workerns egen µs/hop finns i tvavagar.json.

## RISKEN
1. Mellan nivå 0,02 och 0,05 ändrar tre saker beteende:
   - INPUT_OFF (mörkt efter 2 s) kan nu slå till i mycket tysta partier. Det sker före släcktidens 3 s och ger mörker i stället för glöd, och det kan läsas som en snabbare nedtoning. Faller ljusdomaren rättas det enklast med `inputOff` först efter `max(INPUT_OFF_MS, släcktid)`.
   - Låtgränsen gör commit efter 3 s under 0,05, inte under 0,02, och kan därmed ge fler gränser i tysta intron och outron (gr_falska).
   - Energifönstren fryser vid 0,05.
2. `silentLevel()` är en modulvariabel som sätts av den senast skapade analysatorn. Det behövs för verktygen, som matar BoundaryDetector med bara `level`. I motorn används ramens flagga.
3. AGC:ns `rms > noiseFloor` (utan 1,5) är en egen gräns för mic-gain och står kvar.

Diffen finns i `losning.diff`.
