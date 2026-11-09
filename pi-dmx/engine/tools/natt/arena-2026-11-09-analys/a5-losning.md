# a5 – BASNOT-ANSLAG: en anslagsräknare i analysatorn

**STATUS: OMÄTT.** Arenan pausades (orkestratorn, ny prioritet från ägaren) medan mätning 1 fortfarande stod i kö på bänklåset
(`väntar på låset (pid 12148)`, se mat1.log). Den hann aldrig starta, så jag stoppade den i kön enligt ordern ("starta inga fler").
Därför finns ingen tvavagar.json och inga domarsiffror. Varianten bygger (bygg.py: BYGGT). `--snabb` visar att md5 SKILJER
(sync + moment, lang1021 120 s), vilket var väntat eftersom basnotsflanken nu räknas per hop i stället för var 25:e ms. Ljusdomaren
måste därför döma varianten när arenan återupptas.

## IDÉN
Analysatorn har nu EN räknare för basnot-anslag, `Analyser.bassNoteStep`. Den räknar varje hop på snabba vägen och publiceras som
`frame.bassNoteIdx`. Effekterna stegar på den räknaren. Basgångens tydlighet (`profile.bassline`) är SAMMA anslag räknade per slag
i den långsamma vägen, så det finns inte längre någon egen topp-plockare för det.

## FLYTTAT
| vad | förr | nu (a5/src) | ramens fält |
|---|---|---|---|
| basnotsflanken (onset.bass >= 0,30, steg >= 0,10, 90 ms) | effects.ts:2075-2078 (`prevBassOnset`, `bassNoteIdx++`), effects.ts:502 `prevBassOnset` borttagen | analyser.ts:1680 `bassNoteStep()` (anropas i process analyser.ts:3057) | `frame.bassNoteIdx` (analyser.ts:198, fylls analyser.ts:3841) |
| stepBassline:s egen topp-plockare (blAccum/blPrev1/blPrev2/blRef/blTrough/blLastOnset på bandLvl[1]+[2]) | analyser.ts:1674-1687, 1848, 2956 (bas) | borttagen. stepBassline räknar `blNote()` (analyser.ts:1690), som matas av samma anslag: B_BNOTE i recordet (split.ts:179, BIG_REC_LEN 16 -> 17, skrivs analyser.ts:1827, läses analyser.ts:1860), och utan split direkt (analyser.ts:3057) | `profile.bassline` (samma formel (opb−0,4)/0,8, kick-undantaget 60 ms kvar) |

Effects.ts räknar inte längre någonting. På effects.ts:2076-2077 speglas bara `frame.bassNoteIdx`, och ålderns klocka
(`lastBassNoteMs`) stämplas när rutan SER en ny not. Det är reaktion, inte analys, och den ligger i effekternas egen tidsdomän
(performance.now), så den aldrig blandas med analysatorns väggklocka.

## DUBBLETTEN
Det fanns tre detektorer: A = effekternas onset.bass-flank (40 Hz), B = stepBassline:s topp på bandnivån (100 Hz, i workern),
C = klockans basgångsstigning (analyserClock.ts:325).

Jag valde A, flyttad in i analysatorn och körd per hop. Skälet är att ljuset behöver anslaget direkt på snabba vägen, medan B gick
genom workern med en extra hop-fördröjning. B ersattes med A:s anslag. Kriteriet per hop ser ut så här: lägsta värdet sedan förra
fallet som golv, ett läckage på 0,004 per hop och "skjuten" fram till nästa fall. Det ersätter "mot förra rutans värde", som gav
dubbla noter på långa stigningar.

C behölls. Den är en kontinuerlig amplitud (stigning i dB på slaget) för taktmodellens etta och ingen räknare. Att byta den mot ett
binärt anslag i fönstret var tänkt som mätning 2, men den hann aldrig köras. Siffror saknas.

## SIFFRORNA
Inga. Ingen mätning hann köras (pausen). Inte heller ljusdomaren, spärrarna eller p99.

## WORKERN
Workern gör mindre än förr: topp-plockaren är borta och ersatt av en flaggläsning och en ring-skrivning per anslag. Snabba vägen fick
en jämförelse med tre grenar per hop. Inga nya objekt skapas per hop (bara skalära fält och den befintliga Int32Array-ringen).
Inget av detta är uppmätt.

## RISKEN
Hastigheten i `profile.bassline` ändras när anslagen kommer från onset.bass i stället för bandnivåns toppar. Trösklarna CLEAR_BASS
0,7, CLEAR_BASS_HARD 0,85 och EKO_BASS 0,6 är kalibrerade på den gamla detektorn. Dirigentens lookval är kaotiskt (RAPPORT entempo),
så ett ändrat tidigt val flyttar allt efteråt. Ljusdomaren kan alltså falla utan att analysen blivit sämre. Om den gör det är nästa
steg att kalibrera om (opb−0,4)/0,8 mot basslineProbe och inte att ta tillbaka den andra detektorn.
