# Låtgränser: relativ tröskel, känt slut som bevis, och stopp för matchflimret

Claudes mätning visar tre saker. De två första ändringarna finns **inte** i den här kodbasen ännu (verifierat: `NOV_STRONG` är fortfarande en absolut tröskel, och känd låts slut släpper bara matchen utan att sätta gräns). Det tredje — att matchen tappas och flimrar — är ett separat spårningsproblem.

## 1. Relativ klangskiftesröskel

Idag krävs `novPeak >= 0.68` absolut, annars är enda utvägen `MAX_SEG_MS`. En mjuk crossfade i ett jämnt parti kan ligga strax under och då bär 110-sekunderstimern hela beslutet.

- Behåll det absoluta golvet som lägsta krav (skydd mot brus).
- Lägg till att ett skifte som är tydligt större än segmentets egen typiska klangrörelse (löpande median/percentil av `novelty`) räknas som stark gräns även när det absoluta värdet är lägre.
- Nivådipp och tempo är kvar som extrasignaler — aldrig krav.
- Godkänt: facit-inspelningen ger fortsatt 2/2 gränser och noll falska på varv 1.

## 2. Känd låts slut sätter gräns

När en bekräftad match passerar sin lagrade längd vet motorn att låten är slut — det är idag bara ett släpp.

- Vid släpp av en **bekräftad** match på grund av "tidslinjen tog slut": behandla tidpunkten som låtgräns med orsak "känd låt slut", commit och atomisk omstart av nollpunkten (samma väg som igenkänningsgränsen).
- Gäller inte falska matchningar eller släpp på grund av uteblivna färska träffar.

## 3. Matchflimret (nytt arbete)

Mätningen visar korrekta positioner men tre tapp och ~15 s växling mellan låt #1 och #2, båda med konfidens 1,00. Två orsaker att åtgärda:

- **Byte är för billigt.** Ett byte kräver idag bara fler röster än den aktiva matchen. Kräv i stället att utmanaren håller sin övervikt över en kort tid och med marginal, och att den aktiva matchen samtidigt saknar färska positionsenliga träffar. Ett byte till samma id som just släpptes ska respektera karantänen.
- **Tapp genom svaga partier.** `MATCH_FRESH_MS` mäter bara senaste träff. Låt en bekräftad match överleva ett glapp med en förlängd nådetid så länge positionen fortsätter vara konsistent, och rapportera "håller position utan träffar" i state i stället för att falla till realtid direkt.
- **Konfidensen är inte informativ** — den mättar på 1,00 i båda riktningarna. Skala den mot röstmarginal och färskhet så loggen kan skilja stark från svag match.

## Verifiering

- Utöka `tools/testSongMemory.mjs` med ett tvåvarvsfall: samma material två gånger genom samma minne. Varv 2 ska sätta gränsen via igenkänning (< 1 s fel) och **inte** växla låt-id mer än en gång per verklig gräns.
- Nytt mätvärde i testet: antal matchtapp och antal id-växlingar per körning — båda ska vara 0 utanför verkliga gränser.
- Varv 1 (okänd musik) måste förbli 2/2 gränser, noll falska.
- Kör hela regressionen grön innan något deployas.

## Tekniskt

- All logik i `pi-dmx/engine/src/songMemory.ts` (`boundary`, `releaseMatch`, `vote`, `tick`, `state`).
- Inga ändringar i fingerprintformat, lagrade låtar eller den användarägda Pi-UI-filen.
