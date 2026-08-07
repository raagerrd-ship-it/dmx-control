# Stabil låtgräns, identifiering och synk

## Mål

En inspelad låt ska kännas igen robust, låtbytet ska få rätt nollpunkt och minnesshowens drops ska fortsätta ligga rätt även om den första positionsmätningen är osäker. Den tvättade showens drops, energi, risers och sektioner ändras inte.

## Genomförande

1. **Samordna tidslinjens nollpunkt**
   - Låt fingerprint, live-tidslinje och temp-WAV börja från exakt samma ljudruta.
   - Ta bort dagens startförskjutning där `playStart` bakdateras en sekund medan WAV-inspelningen börjar först efter volymgrinden.
   - Vid låtgräns ska nästa segments fingerprint, WAV och showposition återställas atomiskt till samma start.

2. **Gör identifieringen stabilare utan högre CPU-belastning**
   - Behåll befintliga landmark-hashar och det kompakta indexet.
   - Bedöm matchen från ett rullande konsensus av röster för samma låt och närliggande offset, i stället för att låta ett enda offsetfack avgöra.
   - Kräv fortsatt tydlig marginal mot andra låtar innan en ny match etableras eller ersätter den aktiva.
   - Behåll en etablerad korrekt match genom svaga partier, men tillåt ett tydligt nytt låt-ID att markera låtbyte.

3. **Korrigera synken kontinuerligt**
   - Samla fortlöpande offsetmätningar från hashträffar för den aktiva låten.
   - Använd robust median/konsensus för att förfina positionen efter första låset; undvik dagens permanenta 250 ms-kvantisering.
   - Små fel korrigeras mjukt och begränsat så en redan korrekt show inte börjar vandra.
   - Ett stort, uthålligt positionshopp behandlas som seek/ny position: flytta showklockan kontrollerat och räkna om nästa drop-index så gamla drops inte avfyras.

4. **Förbättra låtbytesbeslutet med matchdata**
   - Behåll nuvarande min/max-vakter och kombinationen av nivå, klang och BPM för okända låtar.
   - När en annan känd låt får stabilt matchkonsensus nära sin början används dess uppmätta position som exakt gräns och nollpunkt.
   - Separera möjlig gräns från bekräftad gräns så ett kort klang- eller nivåskifte inte återställer inspelningen innan match/evidens är stabil.

5. **Mätbar diagnostik och regressionstest**
   - Utöka befintligt state med aktivt låt-ID, röststyrka och marginal, rå och korrigerad offset samt senaste gränsorsak; ingen ändring görs i den användarägda Pi-UI-filen.
   - Utöka den simulerade låtminnestesten med två gaplösa låtar, återidentifiering med nivåskillnad, korrekt startposition, gradvis offsetfel, seek samt drop-replay före och efter korrigering.
   - Godkänt när samma låt identifieras utan dubblettinlärning, endast rätt låtgräns skapas och replay-drops håller en snäv, dokumenterad tolerans även efter korrigering.

## Tekniskt

- Berör främst `songMemory.ts`, startkopplingen i `index.ts` och befintligt testverktyg.
- Fingerprintformatet och sparade låtar behålls kompatibla; ingen ominlärning ska krävas.
- Ingen extra FFT eller tung sidoprocess införs på ljudvägen.