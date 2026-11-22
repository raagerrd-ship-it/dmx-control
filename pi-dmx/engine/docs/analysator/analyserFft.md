# analyserFft.ts - anteckningar

LILLA FFT:N, utbruten ur `analyser.ts` 2026-11-22 (flytten steg 26). Koden har bara korta etiketter; förklaringarna står här.

## Vad stenen gör

Ett anrop per hopp, `fft.hopStep(samples)`, först i `process` (huvudtråden; workern kör den aldrig):

1. **Fönstret** (`buffer`, 512 sampel): hoppets sampel skjuts in, löpande kvadratsumma `sumSq` (räknas om från grunden var 400:e hopp
   eller om den blivit negativ av avrundning) -> `rms`.
2. **512-FFT:n** (Hann-fönster, `fft.js`): basbinen 0..15 ger `energy` (medelmagnitud × 0,02 × nivåns `gain`, taket 1), `flux`
   (halvvågsflöde, normerat 0,005 eller 0,08 med `onsetEnhancements`) och `kickFlux` (bin 0). Hela spektrumet ger centroiden.
3. **Snabba bandens magnitud**: bin 0..`fbMax`-1 skrivs i `fbMag`; `fbPrevMag` är förra hoppets. Spektrumets `fastBandStep` läser båda
   (band 3–7). Stenen byter plats på dem först i hoppet (förr gjorde spektrumet det sist i `fastBandStep`, samma värden).
4. **Utjämningen**: `engSmooth` (ramens `energy`) och `centSmooth` (ramens `centroid`, workerns uppbyggnad och sektion), asymmetrisk:
   stiger med 15 ms, faller med 400 ms (`aAtt`/`aRel` ur `init`).

`energy` läser nivåns `gain` från FÖRRA hoppet (stenen kör före `levels.hopStep()`), som före flytten.

## Facket `FftOut` (analyserFack.ts)

| fält | tagg | läsare |
|---|---|---|
| `rms` | `IN` | nivån (AGC, rå nivå), kärnan (`gated`), sektionen (workern via hopprecordet), kickens felsökning |
| `energy`, `kickFlux` | `S` | kicken |
| `flux` | `S` | ramen (`flux`) |
| `engSmooth` | `S` | ramen (`energy`) |
| `centSmooth` | `IN` | ramen (`centroid`), uppbyggnaden och sektionen (workern via hopprecordet) |
| `fbMag`, `fbPrevMag` | `S` | spektrumets snabba band |

## init(fbTop)

Anropas i Analysers konstruktor när `cfg` och `dtHop` finns. `fbTop` = spektrumets högsta snabba bin + 1 (`bands.fbHi[7] + 1`), så
FFT:n räknar magnitud bara så långt någon läser. Växer `fft.size` över 512 görs `fbMag`/`fbPrevMag` större (som förr i kärnan).

## Döda rester (kandidat, inte rörda)

`mag512`/`prevMag` skrivs varje hopp men läses aldrig (byts bara). `onsetPeakDecay` är alltid 0, så `onsetPeak` blir bara hoppets egen
topp med `onsetEnhancements`. Kvar för att flytten ska vara en ren flytt.

## Anteckningarna som stod i koden (fälten)

- `buffer`: sliding FFT window
- `prevMag`: transformed magnitude from the previous hop
- `onsetPeak`: per-bin whitening peak history
- `onsetPrev`: previous raw magnitude for onset differencing
- `windowed512`, `spectrum512`, `mag512`: pre-allokerade scratchpads för 512-FFT + utdata (fft.js komplex-spektrum, magnitud denna hop)
- `sumSq`: löpande kvadratsumma över `buffer`
