# Chroma-novelty som andra, oberoende gränssignal

Målet: låtgränser ska kunna fyra på **två olika sorters bevis** (klangfärg + tonart) i stället för två varianter av samma spektralmått. Först då kan minsta låtlängd sänkas utan att kaskaden av falska gränser återkommer.

Claudes mätning delas: kaskadtabellen (110 s → 2 gränser/2 låtar, 60 s → 4/0, 30 s → 7/0) visar att spärren i dag bär hela beslutet. Vi rör därför **inte** spärren i detta steg.

## Vad som byggs

1. **Chroma-profil ur befintlig FFT**
   Samma 2048-magnitud som redan matas in mappas till 12 halvtoner (bin → MIDI-not → not mod 12), energinormaliserad per fönster. Ingen ny FFT, ingen ny CPU-tråd — bara en extra loop i samma 1,5-sekundersfönster som klangprofilen.

2. **Chroma-novelty mot samma ringbuffert-horisont**
   Cosinus-avstånd mellan nuvarande chroma-profil och profilen 8 s bakåt, med **rotationsinvariant** jämförelse avstängd (vi vill just se tonartsbyte). Nytt fält `chromaAt` / `chromaPeak` vid sidan av `novAt` / `novPeak`, nollställs i samma `resetNovelty()`.

3. **Evidensregeln blir tvåsorts**
   - Klangskifte ≥ `NOV_STRONG` fyrar fortfarande ensamt (mätt 2/2, 0 falska — får inte försämras).
   - Nytt: klangskifte ≥ `NOV_WEAK` **plus** chroma-novelty över sin tröskel = gräns. Det är två oberoende bevis.
   - Nivådipp och tempo förblir svaga extrasignaler.

4. **Kalibrering mot facit, inte gissning**
   Chroma-tröskeln sätts från mätning på facit3 (kända gränser 165 s / 317 s): vi loggar chroma-avståndets percentil vid de verkliga gränserna och vid alla falska klangskiftesträffar, och väljer tröskeln i platån där båda gränserna fångas med noll falska.

## Verifiering (grön innan deploy)

- `tools/testSongMemory.mjs` varv 1 måste stå kvar på 2/2 gränser, 0 falska.
- Ny mätutskrift: chroma-percentil vid facitgräns vs vid varje icke-gräns-topp.
- Först när tvåsorts-regeln ger 2/2 med 0 falska **och** klarar en sänkning av `MIN_SEG_MS` till 60 s utan kaskad, föreslås spärrsänkningen som ett separat steg.

## Vad som INTE görs nu

- `MIN_SEG_MS` sänks inte i detta steg.
- Igenkänningen förblir den exakta gränsen (0,2 s fel mot noveltyns 9 s); chroma förbättrar bara reservplanen.
- Glappandet/flimret mellan låt-id är ett separat problem och ligger kvar orört.

## Tekniskt

Berörd fil: `pi-dmx/engine/src/songMemory.ts` (+ `dist` för offlinetestet) och `tools/testSongMemory.mjs` för mätutskriften. Ingen ändring i `index.ts` — chroma matas ur `pushSpectrum` som redan finns. Inget rör Pi-ägda `engine/public/index.html`.
