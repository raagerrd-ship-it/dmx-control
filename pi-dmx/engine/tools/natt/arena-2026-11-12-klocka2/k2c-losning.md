# k2c – lagning av k2b:s mix_still (klocka2, lagningsomgången)

## Vad som lagades
k2b föll på kontrollmängden på mix_still (4,22 s mot gränsen 4,02). Orsaken går inte att se därifrån, så k2c stänger alla tre vägar
i min kod som kan röra låsningen efter ett låtbyte, i stället för att lita på övningens siffror:

1. **Låtbytets väg (det snabba minnets byte) hölls mot "kända" tempon – och med en svag regent var allt känt.** k2b mätte utmanarens
   poäng i det långa minnet som rå kvot mot tolkningens. Har låten svag takt ligger tolkningen nära minnets golv, och då når vilket
   tempo som helst 0,5. Nu mäts känt ÖVER golvet (medel över alla hypoteser). Övningsmixens låtbyten: −0,03 till 0,23 (ett 0,37) mot
   tröskeln 0,5; läsningar i samma låt 0,6–1,4. Förr 0,14–0,43 (ett 0,55–0,68) – marginalen är mer än dubblad.
2. **Den vandrande toppen i det långsamma minnet hölls utan villkor.** Nu bara medan regenten lever i det snabba minnet (≥ 0,45 ×
   toppen). Är dess rytm borta går allt som i basen.
3. **Rutnätet rördes i hållet** (sökte bara fas och ±0,5 %, kickgrinden öppen). Borttaget helt: hållet är nu bara att tempot står,
   som hos k1.

## Lånat
- **k1:** "regenten måste leva" (`FAM_ALIVE`) används nu också på mitt håll (punkt 2), och k1:s sätt att hålla – bara låta tempot stå,
  aldrig röra rutnätet (punkt 3). `famStep` är kvar som i k2b.
- **Fusion/k5-bonus:** varningen att fria sonder inte förutsäger mix_still. Därför stängda vägar i stället för trimmade tal.

## Siffrorna (mätning 1 av 2, övning) – poäng **+9,24, OK**

| mått | bas | k2b | k2c | % |
|---|---|---|---|---|
| mix_klocka | 97,88 | 97,91 | 97,93 | +0,1 |
| mix_las | 2,78 | 2,78 | 2,78 | +0,0 |
| mix_hopp | 0,00 | 0,00 | 0,00 | +0,0 |
| mix_still | 2,93 | 2,93 | 2,93 | +0,0 |
| klipp_klocka | 98,32 | 98,32 | 98,32 | +0,0 |
| utfl_min | 0,82 | 0,75 | 0,74 | +9,8 |
| utfl_tid | 2,11 | 1,35 | 1,39 | +34,1 |
| syskon_tid | 2,67 | 1,00 | 1,02 | +61,9 |
| lotus_ratt | 116 | 116 | 115 | −0,9 |
| lotus_syskon | 5 | 5 | 5 | +0,0 |
| lotus_vaxling | 17 | 16 | 16 | +5,9 |
| kallaren | 2,98 | 2,55 | 2,98 | +0,0 |

Spärrarna: syntet 6/8, on-beat 0,40 (bas 0,41), fas 0,91 / 6 / 70 (115) – inom de nya 5 %-gränserna. Alla 16 låtars stilla-tid i
mixen är identiska med basens.

## Vad det kostade
- **DMX-måtten är i praktiken oförändrade mot k2b** (utfl_tid 1,35 → 1,39, syskon_tid 1,00 → 1,02, utfl_min 0,75 → 0,74).
- **Källaren är tillbaka på basen (2,55 → 2,98).** k2b:s vinst där kom från just hållet mot "känt under svag regent" – samma väg som
  punkt 1 stänger. På kontrollmängden var källaren k2b:s största enskilda vinst (+60,7); den är troligen borta.
- **lotus_ratt 116 → 115** (Stora tuttar-klippet), inom den nya 1 %-gränsen.

## Risken
- **Jag vet inte att mix_still håller på kontrollmängden.** Lagningen bygger på den troligaste orsaken, inte på en mätt. Kvar finns
  hållen inne i låtarna, som ändrar klockans historia före nästa låtbyte.
- **Vinsten på kontrollmängden kan ha krympt mer än på övningen.** Där kom nästan allt från mitt håll (k1 ensam +0,65), och k2c håller
  mer sällan. Övningens DMX-siffror säger inte hur mycket av utfl_tid +39 och mix_hopp +23 som finns kvar.
- on-beat 0,40 och lotus_ratt 115 ligger nu på de nya gränsernas rätta sida, men med liten luft på 503 filer.
- En mätning är oanvänd. Ej kört: kontrollmängden, `tvavagar.py`, workerns p99.

Diff: `k2c.diff` (bara `src/analyserClock.ts`, +102/−4 mot bas, +23/−13 mot k2b).
