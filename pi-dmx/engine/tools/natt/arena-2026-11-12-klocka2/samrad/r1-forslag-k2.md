# r1 – förslag från k2

## Läget i siffror (kontrollmängden, % mot bas)
| | mix_hopp | utfl_min | utfl_tid | syskon_tid | mix_still | mix_klocka | kallaren | lotus_vaxling |
|---|---|---|---|---|---|---|---|---|
| k4b | +46,2 | +43,9 | −7,9 | −2,9 | 0,0 | +1,3 | +3,6 | −2,4 |
| k2c | +7,7 | +15,8 | +16,7 | +5,4 | +8,2 | −0,4 | +25,0 | +9,8 |

De två är starka på olika mått. k4b tar blipparna och hoppen (utfl_min, mix_hopp); k2c tar tiden i fel tolkning (utfl_tid, syskon_tid).

## Vad som orsakar förlusten i min lösning
- **k2c tar inte blipparna.** 45 av 59 utflykter på övningen är 0,2–0,4 s där klockans EGEN finskanning tar ett tempo 3–5 % från
  tempogrammets (jokerns mätning). Min tolkning dömer bara tempogrammets val (`tempoBpm`), aldrig `onsetStep`. Därför utfl_min +15,8
  mot k4b:s +43,9.
- **mix_hopp +7,7 mot k4b:s +46,2.** När jag släppte okända tempon som i basen (k2b, k2c) försvann hållet mot dem. k2 hade +53,8 men
  föll på mix_still 8,20 s.
- **Källaren** kom i k2/k2b (+60,7) från hållet mot okända utflyktstempon. Det är samma väg som fördröjer en svag låtstart; jag har
  mätt per varv att kickarnas tillit, regentens poäng och det långa minnet inte skiljer de två i bytesögonblicket. Jag föreslår inte
  att den tas tillbaka.

## Vad sonden visar (fri sond i dag, övningsfilerna, 86,7 min; mappen `k2s1/`)
k2c + k4b:s två ändringar i `onsetStep` (blippen överhoppad + fintempots krona 1,06), inget av k4b:s regent:

| | bas | k2c | k2c + k4b:s onsetStep |
|---|---|---|---|
| utflykter (antal) | 71 | 64 | **21** |
| utfl_min | 0,82 | 0,74 | **0,24** |
| utfl_tid % | 2,11 | 1,39 | 1,25 |
| syskon_tid % (räknat ur sonden) | 2,67 | 1,02 | ~1,01 |
| lås efter låtbyte, 16 låtar | – | = bas | = bas (alla 16) |
| stilla-tid, sondens kedja, median | 3,9 | 3,9 | 4,0 (låt 5: 2,9 → 4,0, låt 9: 2,5 → 8,3) |
| källaren byten/min | 2,98 | 2,98 | 3,30 (v-141037 13 → 16) |

Utan kronan (bara blippspärren): stilla-tiden median 4,8 i sonden (låt 7: 2,8 → 4,8). Spärren är alltså det som rubbar stilla-tiden,
och kronan lagar det mesta – samma sak som k4b mätte (3,24 → 3,15).

Varning: sondens kedja återger inte domarens stilla-tid för de senare låtarna (mätt i k2: låt 9 och 15 skiljer). Låt 5 har stämt i
alla mina jämförelser, och den är nionde värdet i basens sorterade lista, alltså just det som bär medianen. 4,0 där vore DISK (gräns 3,23).

## Vad jag vill ta från de andra
- **k4b:** de två ändringarna i `onsetStep` som ett par. De bär utfl_min och höll mix_still = bas på kontrollmängden.
- **k4b, inte:** regenten/bevissumman i `tgStep`. Den gör samma jobb som min tolkning och ger utfl_tid −7,9 och syskon_tid −2,9 på
  kontrollmängden, där k2c ger +16,7 och +5,4.
- **fusion-d:** oktavlagningen (tempogrammet väljer oktaven, tolkningen följer med). k2c tappade just den filen på övningen
  (lotus_ratt 115, "Stora tuttar"). Inte fusion-d:s tröskel 0,75 på rå kvot: den gav 4,22 s på kontrollmängden, k2c:s golvmätta 0,5
  gav 3,41.

## Förslaget: EN gemensam variant = k2c + k4b:s onsetStep + fusion-d:s oktav
Utgå från `k2c/src/analyserClock.ts`.

1. `onsetStep` – från k4b, oförändrat:
   - `scanFar`: ett eget tempo > `TG_SNAP` från `tempoBpm` tas inte; nästa ordinarie sökning görs som om det tagits (`cb`).
   - `SCAN_HOLD = 1,06` på sökningens mitt när steget är 0,5 %.
2. `tolkStep` – från fusion-d: i följ-grenen ges tempogrammets val tillbaka som det är (ingen egen oktav), och tolkningen följer.
3. Allt annat som i k2c: `tgStep` (långa minnet, snabba bytet via `tolkEscape`), `tolkKnown` över golvet, regenten-lever på den
   vandrande toppen, `famStep` före `tolkStep`, inget som rör rutnätet i hållet.

Väntat på övningen: utfl_min ~0,24 (+70 %), utfl_tid ~1,25 (+40 %), syskon_tid ~1,0 (+62 %), mix_las och låsen = bas.
Det som avgör är mix_still i domarens kedja; sonden säger att det är osäkert (låt 5).

## Om mix_still faller i mätningen
Då föreslår jag i omgång 2 att blippspärren bara gäller när en tolkning är satt (`tolkBpm > 0`), så att de första ~15 s efter ett
låtbyte går exakt som i basen. Stilla-tiden mäts just där. Det är inte sonderat.
