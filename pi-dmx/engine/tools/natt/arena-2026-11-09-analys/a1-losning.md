# a1 – DROP A: effekternas flank blir den enda dropdetektorn

**ÄNDRAT 11-09:** Arenan pausades av orkestratorn innan min enda `--mat` hann starta. Den väntade fortfarande på låset (pid 12148) och stoppades. Därför saknas `tvavagar.json`, och den här varianten är **OMÄTT**. Siffrorna nedan kommer från mina egna korta körningar (ladan-10-10-klippen och lang1021), inte från domaren.

## Idén
Flanken (`flankStep`) är den detektor ljuset redan kör. Den flyttas oförändrad in i analysatorns `dropStep` och publiceras som `frame.dropCount` (full drop) och `frame.miniDropCount` (samma flank efter ett kortare break). Analysatorns gamla dropStep tas bort: 20 dB-stigningen, armeringen, lugn-grinden och minidrop-floden. Effekterna behåller reaktionen: spärrarna, efterkontrollen, lyftet och smällens längd.

## FLYTTAT
| vad | från (src/effects.ts, HEAD) | till (a1/src/analyser.ts) | ramens fält |
|---|---|---|---|
| flankdetektorn (filter 60/350 ms, tak 0,15 dB/s, ringbuffert för topp och min, break, kort break med stor smäll, låtlucka-grinden) | `flankStep` 785–806, fält 780–784 | `dropStep` 3492–3523, fält 943–944 | `dropCount` |
| trösklarna FLANK_* | 352–371 | 225–236 | – |
| "analysatorns drop utan egen flank → minidrop" | `stepDrop` 1590–1594 (anaHit → gapMini) | flankens minigrad (break ≥ 1 s) i `dropStep` | `miniDropCount` |
| gamla dropStep (A) | – | **borttagen** (analyser.ts HEAD 3522–3717, konstanter 220–266) | – |

I effects.ts (a1) läser `stepDrop` 1544–1546 bara `frame.dropCount` och `frame.miniDropCount`, och miniräknaren går till `gapMini`. Ingen drop räknas längre i effects.ts. Det gäller även sektionen: `dropped → 'high'` följer nu samma drop som ljuset. Sektionens kropp-tillbaka-regel (SECTION_BODY_HIGH, profilen 2000) finns kvar och läser samma filter.

## DUBBLETTEN
Jag valde **B (flanken)** med en liten sammanslagning: ett nytt break inom FLANK_GRACE_S (1 s) räknas som en fortsättning på det förra. Förut nollade en kort smäll före dropen breaket. Klipp 0 fångas nu, och ändringen gäller full drop också.
- Dropklippen (övning, 7 st, egen körning): minis vid 15 s ±1,5 i 4/7 (klipp 0, 3, 4, 7). Klipp 1, 6 och 9 har inget basbreak, så flanken kan inte se dem. Bas fångar 7/7, men bara genom minidrop-floden: 81 minis på 5 min av lang1021 och 18 på ett 30-sekundersklipp.
- lang1021, 5 min: bas har 0 drops och 81 minis. a1 har 1 drop (220,6 s) och 0 minis.
- Väntat (omätt): drop_traff 100 → ~57 % och drop_ms 216 → ~360 ms, alltså sämre. drop_falska bör bli bättre, men det är inte mätt.

## SIFFRORNA
- Domarens rad: **saknas** (ingen mätning).
- `--snabb`: md5 på 120 s lang1021 IDENTISK. Där finns ingen drop, så det bevisar bara att inget annat gått sönder.
- Ljusdomaren och spärrarna (upp_s/ned_s, lampspridning, p99): **ej mätta.** md5 kommer att skilja på megamix, eftersom minin nu kommer från flanken i stället för A:s fulla drops.

## Worker
Flanken körs per hop i workern i stället för per render (200 Hz) i huvudtråden. Ringbufferten har 225 värden per hop och två förallokerade Float64Array(1024). Inga nya objekt skapas per hop. A:s loop över bodyHist och dess grenar försvinner. Kostnaden är inte mätt men bör vara ungefär lika.

## RISKEN
1. drop_traff och drop_ms blir sämre på bänken. Floden som gav 100 % finns inte längre, och det är ett ärligt tapp, eftersom ljuset aldrig använde floden.
2. Sektionen tar flankens få drops i stället för A:s, vilket påverkar upp_s/traff. upp_s är en DISK-spärr och inte mätt.
3. Ljuset ändras där A fyrade utan flank (förut gapMini). Nu kommer minin från flankens korta break i stället, så takten för minidrop-looken ändras. Ljusdomaren måste vara ≥ bas −0,5.
4. Flanken samplas per hop i stället för per render, så stigningen vid korsningen kan skilja lite (mätfälla 46).

Idé till idébanken: armera flanken ~150 ms efter korsningen (stigningen fortsätter efter den, som i klipp 6). Det är inte provat.
