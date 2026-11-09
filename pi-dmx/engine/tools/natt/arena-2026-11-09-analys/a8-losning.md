# a8 – MINSTA DIFF HELA LISTAN (OMÄTT: arenan pausad innan mätningen fick låset)

## Idén
Allt låtanalytiskt i effects.ts flyttas ordagrant in i analysatorns huvudtrådsdel (`fillFrame` → ny `songStep`, en gång per hop) och publiceras i ramen. Effekterna behåller bara reaktionen: spärrar, refraktärtider, `!dropActive`, dropens längd, uttoning och lyftets form. Diffen är 93+/74− i två filer. Varje ny rad i effects.ts läser ett fält i ramen eller tar bort en kopia.

## FLYTTAT
| vad | från (src/effects.ts) | till (a8/src/analyser.ts) | ramens fält |
|---|---|---|---|
| Full drop på flanken (flankStep, fd*-tillstånd, FLANK_*-konstanter, FLANK_SILENT_LV) | 361–371, 780–805, 1588–1594 | 128–131 (konst.), 3822 flankStep, 3842 songStep | `dropCount` (= flanken; dropStep:s egen räknare publiceras inte längre som drop) |
| Analysatordrop utan egen flank inom 2 s → minidrop (anaHit-grenen) | 1590–1593 | songStep 3846–3849 | `dropDeniedCount` (effekterna gör gapMini, a8 effects.ts:1541) |
| Nästan-drop/stopp/energilyft: kropp 120 ms, norm 8 s, 25 ms-historik, botten 1,5 s, lugn 6..2 s | 1209–1230, 1262 (liftN) | songStep 3850–3865 | `bodyNearDb`, `bodyNormDb`, `bodyFloorDb`, `liftDb`, `liftCalmDb` (−1e9 innan 6 s) – a8 effects.ts:1175 |
| Basnot-anslag (onset.bass-flank, 90 ms) | 2076–2080, 501–502 | songStep 3866–3868 | `bassNoteCount`, `bassNoteAgeS` – a8 effects.ts:2022 |
| Tystnad (INPUT_OFF_LEVEL 0,02, inputLowSince, de fyra fönster-grindarna) | 153, 656, 1383/1385/1403/1404, 1897–1899 | SILENT_LEVEL 131, songStep 3869–3871 | `silentMs` – a8 effects.ts:1845 och stepEnergy |

Finalspärren: i a8/src/effects.ts finns inte längre flankStep, fd*, FLANK_*, liftHist/histAt, prevBassOnset/lastBassNoteMs, INPUT_OFF_LEVEL eller inputLowSince (grep ger bara (a8)-kommentarerna).

## DUBBLETTEN
Drop: jag valde **A+B sammanslagna i den kedja ljuset redan kör**. Flanken (B) är den enda dropen ut i `frame.dropCount`. dropStep (A) finns kvar inne i analysatorn, men bara som kandidat. Den matar sektionen (`secDropsNow`) och "nekad kandidat → minidrop", alltså samma logik som effekterna hade. Effekterna har ingen egen detektor kvar. Bänkens drop-mått läser nu flanken, det vill säga det ljuset faktiskt gör. **Siffror saknas**: mätningen startades men stod i kö på låset när arenan pausades och stoppades innan den började.

## SIFFRORNA
- `--snabb`: bygget går igenom (bygg.py BYGGT). md5 på 120 s lang1021 SKILJER (sync och moment), vilket var väntat: flanken och lyftmåtten räknas per hop (~375 Hz) i stället för per renderruta (40 Hz i bänken, 200 Hz live).
- `--mat`: **ej körd** (0 av 3). Ingen tvavagar.json, ingen ljusdomare och ingen poäng.

## Worker
Workern får inget nytt. All ny kod körs i huvudtrådens fillFrame. Workerns µs/hop och p99 bör därför vara oförändrade (inte mätt). Inga nya objekt per hop: bara skalärer och två Float64Array(1024) plus en Float64Array(240), som skapas en gång i konstruktorn. Huvudtråden får en loop på ≤ ~225 element per hop (flankens 0,6 s-fönster), mot förut ≤ 24 per renderruta.

## RISKEN
1. **Takten ändras**: tidskonstanterna är dt-baserade, men hop- i stället för rutsampling ger andra flanker. Live (200 Hz) ligger närmare än bänken (40 Hz), och mätfälla 46 beskriver just den skillnaden. Drop-måtten byter dessutom källa från dropStep till flanken. drop_traff och drop_falska kan alltså gå åt båda hållen, och ljusdomaren avgör om varianten är DISK.
2. Stopp-minins varaktighet (`stopRunS`), tierEma och subdivEnergy (sektionsenergin) är inte flyttade. De står kvar i effects.ts som rest av listan.
3. boundaryDetectors egen tystnadsgräns (0,02 i 3 s) läser ännu inte `silentMs`.
4. analyser.ts är delad med lotus (ANALYSER_SHARED.md5) och måste portas efteråt.

Diffen: `.arena/analys/a8/losning.diff`.
