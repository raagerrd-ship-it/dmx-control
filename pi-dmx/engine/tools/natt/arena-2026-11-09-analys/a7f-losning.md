# a7f – finalen: r0 levereras oförändrad, båda mina delar föll eller är omätta

## Idén
Jag ville göra klart "EN tystnad". r0 har fortfarande två egna gränser för "helt tyst": FLANK_SILENT_LV 0,005 i flanken, och INPUT_OFF
som ligger på släckgränsen 0,05 och kan ge mörker före släcktiden. Båda skulle läsa analysatorns brusgrind ("ingen signal"), så att det
bara finns två storheter: "tyst" (cfg.silenceLevel) och "ingen signal" (noiseFloor·1,5), och var och en räknas en gång.

## DELAR mot r0
| del | mekanism | FLYTTAT fil:rad | mätt |
|---|---|---|---|
| D1 | flankens "helt tyst i breaket" = brusgrinden (`activeMs === 0`) i stället för `lvlSmooth <= FLANK_SILENT_LV 0,005` | r0 analyser.ts:292, 2923 → `if (this.activeMs === 0) this.fdQuietAt = now` | mätning 2: **DISK**, ljusdomaren −0,85 (lampspr medel −6,5 %, megamix −19,5 %) |
| D2 | INPUT_OFF = analysatorns räknare utan signal: `frame.quietMs` (= silentMs, brusgrinden) > 2 s. effects.ts:s inputLowSince tas bort | r0 effects.ts:651, 1835–1837 → effects.ts `this.inputOff = frame.quietMs > INPUT_OFF_MS`; analysatorn `f.quietMs = this.silentMs` (ramen) | mätning 1 (D1+D2) och mätning 2 (bara D1) har **byte för byte samma bank.json och samma 17 mått**, alltså gav D2 noll effekt på övningsmängden. D2 ensam är inte mätt. |

**Levererat:** `src` = r0 exakt. `mot-r0.diff` är tom, och `tvavagar.json` och `bank.json` är r0:s egen mätning (samma kod).
Diffarna för D1+D2 finns i `v1/mot-r0.diff` (mätningen i `v1/tvavagar-mat1.json`) och för bara D1 i `v2/mot-r0.diff` (mätningen i `v2/`).

## SIFFRORNA
| variant | poäng | långsamma | ljusdomaren | spärrar | cpu µs/hop (kvot) | p99 | workerUs |
|---|---|---|---|---|---|---|---|
| r0 (levererad) | **+4,32** | +7,20 % | +0,02 | – | 45,82 (0,992) | 6 | 50,1 |
| D1+D2 (mätning 1) | +4,32 | +7,20 % | −0,85 | lampspr | 39,22 (0,983) | 5 | – |
| D1 (mätning 2) | +4,32 | +7,20 % | −0,85 | lampspr | 41,67 (0,952) | 6 | 35 |

Alla 17 mått är identiska med r0. D1 rör inte bänkens drop-, sektions- eller tempomått, bara ljuset.

## Varför D1 föll
Brusgrinden mäter rå rms per hop, medan FLANK_SILENT_LV läser den släta nivån med 400 ms release. Megamixen har korta luckor där den råa
rms:en går under 0,003 mitt i breaket, men den släta nivån gör det aldrig. Där sätts fdQuietAt, flanken spärras och de hela dropsen blir
färre. Effekten i megamixen:
- lampspr 0,373 → 0,300
- rAbest 0,431 → 0,408
- pulsHz 1,89 → 1,75

"Helt tyst" och "ingen signal" är alltså inte samma storhet i tid. Flankens fråga gäller en låtlucka i sekunder, och den kräver ett
utjämnat mått. Lärdomen till idébanken: slå bara ihop D1 med en version av brusgrinden som hålls utjämnad över hela luckan, till exempel
att silentMs > 300 ms någon gång i spannet. Det är inte mätt.

## Workerns µs/hop och allokering
Den levererade varianten är r0 med workerUs 50,1 µs/hop (gränsen 130) och inga nya objekt per hop. D2 skulle lägga till ett tal i det
återanvända Frame:t och ta bort ett fält i effekterna, så inga nya objekt där heller.

## RISKEN
- Den levererade varianten har r0:s risker oförändrade. Den viktigaste för ägaren: INPUT_OFF räknas från 0,05 i 2 s, så en mycket tyst
  passage (nivå 0,003–0,05) kan bli helt mörk före släcktidens 3 s och utan glöd. Övningsmängden har ingen sådan passage, eftersom D2 gav
  bit-identisk bank.
- Rekommendation till nästa runda: mät D2 ensam (`v1/mot-r0.diff` minus D1-hunken i analyser.ts:292/2926) på kontrollmängden. lang1014
  och lang1107 har pauser, och det är där D2 skiljer sig.
- Poängen är r0:s egen. Finalen tillför ingen mätt förbättring, bara ett bortvalt prov (D1) och ett omätt men säkrare förslag (D2).
