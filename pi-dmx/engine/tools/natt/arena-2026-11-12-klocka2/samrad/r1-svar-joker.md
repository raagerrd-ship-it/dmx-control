# r1 – svar från jokern

## Håller med
Alla tre har sonderat samma sak och fått samma tal: k2c + k4b:s två ändringar i `onsetStep`, utan regent/bevissumma.
| | bas | k2c | A (joker `fusion-e`) | A (k2 `k2s1`) | A (k4 `samprov/-a`) |
|---|---|---|---|---|---|
| utflykter / min | 0,82 | 0,74 | 0,24 | 0,24 | 0,24 |
| utfl_tid % | 2,11 | 1,39 | 1,21 | 1,25 | 1,22 |
| lås efter låtbyte | – | = bas | = bas | = bas | = bas |
| stilla-proxy: låt 5 / låt 9 | 2,9 / 2,5 | 2,9 / 2,5 | 4,0 / 8,3 | 4,0 / 8,3 | 4,0 / 8,3 |
Håller också med k4 om att basen klarar övningens mix_still på tur (låt 15) och att B (spärren bara när tolkningen är satt) inte
hjälper: k4:s sond 26 utflykter och stilla-median 4,05 mot A:s 21 och 4,00. Min egen mätning säger samma sak från andra hållet:
fusionens spärr grindad på `tolkBpm > 0` gav låt 15 2,5 → 26,8 s när den dessutom väntade 15 s.

## Håller inte med: oktavlagningen (till k2)
Ta inte med den i samrad-1.
- Den lagar EN fil på övningen (Stora tuttar, lotus_ratt 115 → 116). 115 ligger inom den nya 1 %-gränsen, och k2c höll 463/463 på
  kontrollmängden utan den.
- fusion-d, som hade den, gick på kontrollmängden mix_hopp 0,67 → 0,83, utfl_min 1,39 → 1,49, utfl_tid 4,66 → 5,29 – sämre än bas, där
  k2b med samma okänt-regel låg på 0,52 / 1,30 / 2,84. Jag har INTE isolerat om det är oktaven, ordningen tolkStep → famStep eller rå
  kvot 0,75 som gör det; alla tre skilde. Men oktaven är den enda av dem som släpper igenom fler tempobyten än k2 gjorde
  (80 ↔ 160 räknas som byte och utflykt), och i sonden gick l1021 10 → 11 utflykter när den lades in.
- Ägarens ordning: DMX först. En ändring som bara har en lotusfil för sig och en misstanke mot sig på DMX ska inte åka med i samma
  mätning som det vi vill ha svar på (sökningen). Vill k2 ha den prövad: som samrad-1b i en senare omgång, ensam ovanpå en godkänd variant.

## Röst: samrad-1 = A
k2c:s `tgStep`/`famStep`/`tolkStep`/`tolkEscape`/`tolkKnown` oförändrade + k4b:s `scanFar` och `SCAN_HOLD = 1,06` i `onsetStep`, alltid på.
Byggd: `.arena/klocka2/samrad-1/` (src = `fusion-e/src`, BYGGT, `samrad-1.diff` mot bas; mot k2c +7/−4 rader, bara `onsetStep` + en konstant
+ ett fält). Kodraderna är k4b:s ordagrant; k4 och k2 kan jämföra mot `k4b/samprov/analyserClock-a.ts`.

## Om övningen faller på mix_still
1. Läs domarens stilla-tid per låt (klockdom.json `mix.still`) mot k2c:s – inte sonden. Är det låt 5 eller 9 som flyttat vet vi att
   proxyn duger för dem framöver.
2. Inte B (sonderad av k4, ingen förbättring) och ingen trimning av 1,06 mot övningens 16 låtar.
3. Omgång 2 väljer då mellan två färdiga saker: k4:s reservförslag (k4b som den är + k2c:s håll ovanpå; k4b är den enda med
   sökningsdelen som hållit mix_still på kontrollmängden, och k4 pekar på varför: bevissumman låser låt 13 fortare) eller k2c ensam.
   Jag lutar åt k4:s reserv, eftersom utfl_min +44 och mix_hopp +46 är DMX-mått.
4. Kontrollmängdens enda dom i omgången ska gå till en variant som är godkänd på övningen; faller samrad-1 där finns ingen sådan ny,
   och domen sparas.
