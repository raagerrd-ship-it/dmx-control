# k2b – två tidsskalor, men bara mot läsningar av SAMMA låt (klocka2, extra omgång)

## Idén
k2 höll tolkningen mot ALLA utmanare och krävde att regenten var död (kvot ≥ 1,7) för ett snabbt byte – det fördröjde svaga
låtstarter, och det var det som föll på kontrollmängden. k2b frågar först om utmanaren är en annan LÄSNING AV SAMMA LÅT eller NYTT
MATERIAL: är tempot okänt för det långa minnet (dess poäng < 0,5 × tolkningens) går allt exakt som i basen; bara en känd läsning
måste vinna över fraser. Det är musikanalys: det långa fönstret dömer mellan tempon det faktiskt har hört i låten, och ett tempo det
aldrig hört är en ny låt, inte en utflykt.

## Lånat
- **k1, tanken:** "syskon är samma rytm läst på olika sätt" och "regenten måste leva". I k2b avgör det långa minnet vad som är samma låt.
- **k1, koden:** `famStep` portad i sin helhet (exakta 4:3, 3:2, 2:1 ±1 %, kröning 16 slag, byte efter 16 slag netto, regenten lever
  ≥ 0,45), lagd FÖRE `tolkStep`. Den bär hållet i lang1011 (96 ↔ 128), där mitt 10 s-minne bytte läsning med låtens partier.
- **k5 och k4 (mätning 1):** lästa, inget taget. k4:s egen slutsats är att låtstarten inte löstes.

## Ändrat mot k2
- Okänd utmanare (långa minnet < 0,5): snabba bytet som i basen (1,35 i två varv), valet öppnas. Tröskeln 1,6 för "helt okänt" är borta.
- Känd utmanare (≥ 0,5): som k2 – långa minnet × 1,2, eller regenten död (≥ 1,7) och utmanaren inte jämstark (< 0,85).
- k1:s familjeregel tillagd. Oförändrat: valet efter 38 stadiga varv, oktaven i tolkningen, rutnätet ±0,5 % och öppen kickgrind i hållet.
- Bara `src/analyserClock.ts`, +94/−6 mot bas. Inget nytt per hop.

## Siffrorna (mätning 1 av 3, övning) – poäng **+10,62, OK**

| mått | bas | k2 | k2b | % |
|---|---|---|---|---|
| mix_klocka | 97,88 | 97,90 | 97,91 | +0,0 |
| mix_las | 2,78 | 2,78 | 2,78 | +0,0 |
| mix_hopp | 0,00 | 0,03 | 0,00 | +0,0 |
| mix_still | 2,93 | 2,93 | 2,93 | +0,0 |
| klipp_klocka | 98,32 | 98,32 | 98,32 | +0,0 |
| utfl_min | 0,82 | 0,68 | 0,75 | +8,5 |
| utfl_tid | 2,11 | 2,10 | 1,35 | +36,0 |
| syskon_tid | 2,67 | 1,68 | 1,00 | +62,7 |
| lotus_ratt | 116 | 116 | 116 | +0,0 |
| lotus_syskon | 5 | 5 | 5 | +0,0 |
| lotus_vaxling | 17 | 15 | 16 | +5,9 |
| kallaren | 2,98 | 1,70 | 2,55 | +14,3 |

Spärrarna: syntet 6/8, on-beat 0,41, fas 0,91 / 6 / 70 (115).

**Marginalen på låtbytet:** alla 16 låtars stilla-tid i mixen är identiska med basens, siffra för siffra (k2: 6 av 16 flyttade).
Alla låsningar efter låtbyte i sonden är också basens. Övningsmixens 15 låtbyten har långa-minnet-kvot 0,14–0,43 mot tröskeln 0,5;
det enda över (0,55–0,68) går ändå på samma varv som basen eftersom regenten är död där.

## Vad som blev sämre mot k2
- **Källaren 1,70 → 2,55.** Tre av fyra klipp är nu som basen. Klippen är inte växlingar fram och tillbaka: de har ETT varaktigt
  tempobyte plus korta utflykter till tempon som inte hörts förut. De utflykterna ser i bytesögonblicket ut precis som en svag
  låtstart, så vinsten där och ett snabbt låtbyte går inte att få samtidigt utan låtgränsen.
- utfl_min 0,68 → 0,75 och lotus_vaxling 15 → 16 av samma skäl.

## Förkastat i den här omgången (sonder)
- Bara "okänt går som basen", utan k1:s regel: mixen identisk men syskon_tid ~2,1 och lang1011 11,8 %.
- Längre långt minne (16 s): ingen skillnad i källaren, lang1021 sämre.
- Minne av låtens tidigare tolkningar som "kända": ingen verkan på källarklippen.

## Risken
- Tröskeln 0,5 har liten luft mot övningens högsta låtbyte (0,43). Ett missat fall kostar dock bara att bytet väntar på kvot 1,7.
- i fas 70/115 mot gränsen 60,4 % ligger 0,5 procentenheter över – samma läge som k2, som höll där på kontrollmängden.
- k1:s risker följer med: fel medlem som överlever kröningen sitter kvar tills den rätta vunnit 16 slag netto, och 0,45 är satt på få fall.
- Två hållregler i följd (familjen, sedan tolkningen) är mer kod än k1 ensam; vad min del ger utöver k1 på övningen är litet
  (lotus_vaxling −1, ett källarklipp, utfl_tid 1,48 → 1,35, syskon_tid 1,05 → 1,00).
- Ej kört: kontrollmängden, `tvavagar.py`, workerns p99.
