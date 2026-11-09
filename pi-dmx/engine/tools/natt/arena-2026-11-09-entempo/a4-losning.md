# a4 – SNABB OMLÅSNING VID LÅTGRÄNS

## IDÉN
Låtgränsen (boundaryDetector -> `analyser.hintTrackChange`) räknas nu i `analyser.trackBoundaries` och följer med varje hop in i taktvägen som fältet `H_BOUND` i hop-recordet. Det är effektklockans (BeatFeed) ENDA signal om låtbyte: när räknaren ändras låser klockan om (tempogrammet, taktmodellen/ettan, breakets hållning och upptagets tillitsminne släpps), och klockans egen gissning ("> 3 % tempohopp = ny låt -> barReset") är borta. Allt sker på ett ställe, med samma beteende i worker, sync och inline, och index.ts och verktygen anropar fortfarande bara `hintTrackChange`.

## DIFFEN
`.arena/entempo/a4/losning.diff` (133 rader; analyser.ts, split.ts, beatFeed.ts).

## KRAV EN KÄLLA – genomförda punkter (runda 1: kortets punkt 5)
(5) Låtgränsen är enda låtbytessignalen, även i taktvägen:
- analyser.ts:2493–2495: räknaren `trackBoundaries` räknar bara upp vid riktiga låtgränser (externt `hintTrackChange`). Analysatorns egna lågtillits-hintar räknas inte (analyser.ts:2462, `false`), och inte heller workerns spegling av F_HINT (analyser.ts:1876, `false`).
- split.ts:196 (`H_BOUND = 14`, HOP_REC_LEN 15 på rad 193), split.ts:209 (`HopTarget.trackBoundaries`), split.ts:230 (snabba sidan skriver räknaren i recordet), split.ts:269/288 (workern lägger den på sitt mål före `feed.update`).
- beatFeed.ts:317–319: update läser räknaren, och vid ändring körs `relock()` (beatFeed.ts:276).
- beatFeed.ts:204: a8r:s barReset vid > 3 % tempohopp är borttagen. Klockan drar inte längre egna slutsatser om låtbyte.
- beatFeed.ts:376: nollningen vid > 4 % annat tempo efter ett break finns kvar som *breakets slut* (släpper hållet tempo), inte som en låtbytessignal. Se SIFFRORNA för varför.

Punkt 1–4 är inte genomförda (utanför kortet).

## SIFFRORNA (mätning 3 = levererad variant)
Poäng **+0,12**: långsamma −1,49 %, snabba +2,55 % (cpu −0,79 %, latens 80 ms mot 85 = +5,9 %). Ljusdomaren +2,4, inga spärrar, worker p99 7 hop (gränsen 22), upp_s/ned_s 1,35/2,25 = bas.
Bättre: mix_las 3,49 s (+1,6 %), mix_still 3,86 s (+7,1 %).
Sämre: mix_hopp 0,13/min mot 0,08 (−26 %, mot golvet 0,2) och gridfel 16,2 ms mot 15,1 (−7,3 %). grid40 −0,7 %. Resten är oförändrat.
- Mätning 1: hela kortet (även break-nollningen bort) gav −0,80. Mixen var identisk, grid40 57,2 (+2,1 %) och gridfel 15,6, men latensen 85 ms.
- Mätning 2: relock utan att nolla `tempoBpm` blev sämre (gridfel −7,3 %, latens 90 ms). Mixen var identisk, så mix_hopp beror på själva omlåsningen och inte på tempogrammets nollning.
- Mätning 3: break-nollningen tillbaka. Mixen var åter identisk, griden lite sämre än i mätning 1, latensen 80 ms. Skillnaden 85 -> 80 ms i latens ligger troligen i mätbruset (5 ms-steg), så mätning 1 och 3 är i praktiken jämnstarka. Mätning 1 har bättre grid och går längre i kortet.

## DUBBLETTER KVAR
- Punkt 1–4: skuggrutnätet (`this.ana`, kickFold-BeatFeed), tillitens källor, den fria `beatCounter`, de två pulskurvorna och halveringspariteterna. Det är andra kort.
- Analysatorns egna låtbyten: lågtillitshinten (8 s, analyser.ts:2462), sektionsnollningen efter 10 s tystnad (analyser.ts:1334) och skuggrutnätets coast-`resetTempo`. De rör sektionerna, och upp_s/ned_s är en spärr. Därför ingen ändring utan en mätning.
- Tystnadsnollningen `effBpm === 0` (beatFeed.ts) är tystnad, inte låtbyte, och finns kvar.

## RISKEN
- Omlåsningen kommer när boundaryDetector fyrar, ofta flera sekunder in i nya låten. Falska gränser (gr_falska 0,24 per 10 min) nollar tempogrammet mitt i en låt, och det är troligen det som ger mix_hopp. Pop med många falska gränser kan alltså hoppa mer live än i mixen.
- I worker-läget kommer flaggan med hop-recordet, alltså i rätt hop. Det är deterministiskt men fördröjt med workerns eftersläpning. Kostnaden på ARM är ett extra Float64 per hop och försumbar.
- Utan barReset vid tempohopp kan ettan ligga kvar från fel tempo efter ett stort tempobyte inom en låt utan låtgräns (BAR_DECAY 0,99 per slag). ettan-måttet var oförändrat, men det testar bara konstant tempo.
