# Offline-tvätt av inlärda låtar (refiner)

Realtidsanalysen är kausal — den kan inte se framåt, så drops släpar och BPM/energi blir grova. Planen: spela in råljudet till en temp-WAV medan en ny låt lärs in (bara aux), och när låten tystnat köra en **separat process** som analyserar filen framåtblickande och ersätter låtens tidslinje med tvättade värden. Fingeravtrycket rörs aldrig.

Allt lokalt. Inget ljud lämnar lådan, ingen internetuppkoppling.

## Så fungerar det

1. Ny låt spelas på aux → motorn skriver samtidigt råljudet till `/var/lib/audio-dmx-engine/learn.wav` (strömmande, en låt i taget).
2. Låten tystnar → låten committas som idag, och refinern spawnas i tystnaden.
3. Refinern kör ~50× realtid (en 4-minuterslåt ≈ 5 s) och skriver en liten sidecar-JSON.
4. Motorn plockar upp JSON:en, ersätter låtens drops/BPM/energi, sparar `songs.bin`, raderar WAV + JSON.
5. Nästa gång låten spelas är dropsen redan rätt-centrerade — och `mergeInto` fortsätter förbättra över repriser precis som nu.

Kör låten på mik: ingen inspelning, ingen tvätt. Igenkänning fungerar som förut.

## Teknik

### A. Temp-WAV (`src/learnRecorder.ts`, nytt)
- `createWriteStream` + WAV-header som patchas med rätt längd vid stängning. 48 kHz **mono** int16 → ~5,8 MB/min, ~17 MB för en 3-minuterslåt.
- Matas från `capture.on("chunk")` med samma Float32-mono som analysatorn får (`f * 32768`), så refinern ser exakt samma signal som realtid såg — inga kanal-/skalningsskillnader.
- Backpressure respekteras (`write()` returnerar false → hoppa över chunk och räkna det i loggen; hellre lucka än att bygga kö i RAM).
- Startar bara när: `audioInput === "aux"`, låten lärs in (ny låt, ej igenkänd), och det finns ≥100 MB ledigt på disken (`statfs`). Hård tak-gräns 10 min ljud → sen stängs skrivningen.
- Loggar filstorlek vid stängning.

### B. Refinern (`tools/refineSong.mjs`, nytt)
- Fristående process, körs som `nice -n 19 node tools/refineSong.mjs <wav> <songId> <outJson>`. **Aldrig** på huvudtråden — inget `await` i renderloopen.
- Återanvänder `replay(path)` ur `tools/replay.mjs` (riktiga `Analyser` + `setVirtualClock`), ingen ny analysator.
- Ur de deterministiska ramarna räknas:
  - **Drops, icke-kausalt**: baskropp = `sub+kick+bass`. Kandidat = skarpt lyft efter en period med borta bas; bekräftas mot ett **framtidsfönster** (~1,5 s) — lyftet måste hålla. Tidpunkten sätts på anslagets flank, inte där realtid hann reagera.
  - **BPM över hela låten**: autokorrelation på hela onset-kurvan + oktavval, plus `beatPhaseMs` ur bästa fasläge → ett stabilt tempo i stället för ett glidande medel.
  - **Energikurva**: 1 värde/sekund, lätt utjämnad.
- Skriver `<songId>.refined.json`: `{ v, songId, drops:[{t,s}], bpm, beatPhaseMs, intensity:[…] }`. Rör **inte** `songs.bin` (två skrivare på samma fil = korrupt minne).
- Skriver egen CPU-tid + ljudlängd till stdout (`process.cpuUsage()`), som motorn loggar.

### C. Trigger och applicering
- `src/refineQueue.ts` (nytt): `spawn` när en låt committats med en färdig WAV, en åt gången, med en enkel retry-räknare (max 2 försök). Vid fel eller överskriden gräns: radera WAV + JSON — aldrig hoarda ljud.
- `songMemory.ts` får två små tillägg (index och hashformat orörda):
  - `commit()` returnerar id:t på låten som lärdes in/uppdaterades.
  - `applyRefined(songId, data)` ersätter `drops`/`bpm`/`beatPhaseMs`/`intensity`, markerar dirty och sparar. Hashar och `plays` behålls.
- Motorn kollar var 5:e sekund efter sidecar-filer, applicerar, och städar båda filerna.
- WS-state får `refining: boolean` så UI:t kan visa "tvättar…".

### D. Städning och säkerhet
- Vid uppstart: radera kvarglömda `*.refined.json` och `learn.wav` (strömavbrott mitt i en låt).
- Vid SIGTERM: stäng WAV-strömmen, döda ev. refiner-process, `songs.flush()` som nu.
- Refinern är en läsare av WAV + skrivare av JSON; motorn är enda skrivaren av `songs.bin`.

## UI
`src/pages/DmxController.tsx` (mocken): låtminnes-raden får ett tredje läge — "Tvättar inspelning…". Samma ändring levereras som diff för `pi-dmx/engine/public/index.html`, som din Pi-agent äger.

## Ordning
1. `learnRecorder.ts` + inkoppling i `index.ts` → verifiera: WAV skapas bara på aux, storleken matchar låtlängden, filen är spelbar och `replay.mjs` kan läsa den.
2. `refineSong.mjs` → verifiera: kör på en inspelad WAV, drops ligger tidigare/centrerat jämfört med realtidens, BPM stabilt, JSON korrekt.
3. `refineQueue.ts` + `applyRefined` → verifiera: efter tystnad tvättas låten, `songs.bin` uppdateras, temp-filerna är borta.
4. Mätning på Pi:n: temp-storlek, refinerns CPU-tid, inga ALSA-överskridningar under tvätten (den körs i tystnad med `nice 19`).
5. UI-läge i mocken + diff för Pi-filen.
