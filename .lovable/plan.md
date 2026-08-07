# Nästa steg: strunta i chroma, stabilisera igenkänningen

Mätningen är entydig: chroma-avståndet vid verkliga crossfade-gränser överlappar helt med falska kandidater (0,0000 vid en riktig gräns). Chroma byggs inte in — den skulle kosta CPU på Zero 2 W utan beslutsvärde.

Slutsatsen är att heuristik på crossfade är en återvändsgränd. Den signal som faktiskt mätts som exakt är igenkänningen (0,2 s fel mot klangskiftets 9–10 s). Därför lägger vi kraften där.

## Vad som byggs

### 1. Känd låt slut = gränsbevis
Idag släpps matchen när positionen passerar `durationMs` (rad 746) utan att någon gräns sätts. Det är det starkaste kända gränsbeviset vi har och det kastas bort. En bekräftad match vars lagrade tidslinje tar slut ska committa segmentet och starta en ny tidslinje på samma tick.

### 2. Sluta flimra mellan låt-ID
Loggen visar att motorn växlar mellan låt #1 och #2 under ~15 s, båda med konfidens 1,00.
- Byte av aktiv låt kräver både röstmarginal och att utmanaren lett en viss tid — inte bara flest röster på ett enskilt tick.
- En bekräftad match behåller sitt lås genom svaga passager så länge positionen fortsätter vara tidslinjeenlig (glidande position, inte hoppande).

### 3. Konfidens som säger något
`confidence` mättas idag på 1 så snart matchen är bekräftad (rad 1067). Den skalas istället efter röstmarginal och färskhet, så att flimmer syns i mätningarna och kan användas som villkor.

### 4. Relativ klangskiftesröskel — bara som reserv
`NOV_STRONG` är absolut (0,68). Den kompletteras med en relativ jämförelse mot segmentets typiska rörelse, med kvar absolut golv. `MIN_SEG_MS` (110 s) sänks INTE i detta steg — mätningen visade att spärren fortfarande bär beslutet för okända låtar.

## Så verifieras det
Tvåvarvstest mot facit3 i `tools/testSongMemory.mjs`:
- Varv 1 (okänd musik): oförändrat 2/2 gränser, noll falska.
- Varv 2 (inlärt): gränser via igenkänning med < 1 s fel, och noll ID-växlingar utanför verkliga byten.

Deploy sker först när båda varven är gröna.

## Tekniskt
Allt sker i `pi-dmx/engine/src/songMemory.ts` plus mätning i `pi-dmx/engine/tools/testSongMemory.mjs`. Ingen ny CPU-tung DSP tillkommer. `index.html` på Pi:n berörs inte.
