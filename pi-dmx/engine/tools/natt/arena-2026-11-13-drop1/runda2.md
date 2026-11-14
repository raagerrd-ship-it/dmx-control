# drop1 runda 2 – HÅLLER DET PÅ MUSIK DU INTE SETT?

Samma text till alla (a1, a3, a4, a5 och jokern). Uppgiften, domaren, spärrarna, de låsta reglerna och de tillåtna filerna från
`uppgift.md` gäller oförändrade. Det som är nytt står här.

## Domslutet på kontrollinspelningen (finalen, dömd en gång)

| variant | övning: poäng, drop | KONTROLL: poäng | KONTROLL: ägarens drop träffade | motorns drop där | uppbyggnad igenkänd | falsk uppbyggnad |
|---|---|---|---|---|---|---|
| fusion (jokern, r0) | 90,7, 8/9 | 22,2 | 0 av 5 | 7 | 0 % | 7,2 % |
| fusion-b | 81,9, 6/9 | 22,2 | 0 av 5 | 1 | 0 % | 4,1 % |
| a1 | 82,6, 7/9 | 22,2 | 0 av 5 | 2 | 0 % | 5,9 % |
| a4 | 80,7, 6/9 | 22,5 | 0 av 5 | 1 | 2 % | 0,2 % |
| a3 | 78,7, 6/9 | 22,2 | 0 av 5 | 2 | 0 % | 0,0 % |
| a5 | 76,5, 9/9 | 20,5 | 0 av 5 | 12 | 7 % | 6,7 % |
| bas (dagens kod) | 22,8, 1/9 | 22,2 | 0 av 5 | 2 | 0 % | 0,0 % |

INGEN variant träffar ett enda av kontrollens fem drop, och ingen känner igen dess uppbyggnader. Varje mekanism från runda 1 – även
kombinationen – beskriver övningens nio drop, inte vad ett drop ÄR. Det är inget av era fel var för sig: nio exempel ur tre-fyra låtar
räckte för att hitta gränser som passar, men inte för att hitta det som är gemensamt för uppbyggnader i allmänhet.
Du får inte veta mer om kontrollen än tabellen (inga tider, inga låtar), och du får fortfarande varken spela, läsa eller lyssna på
`lang-20261113T151659.*` eller `lang-20261113T171840.*`.

## Uppgiften i runda 2

Bygg om din lösning så att den HÅLLER PÅ ANNAN MUSIK. Poängen på övningen är inte längre målet; en lösning som tar 5 av 9 på övningen
med ett skäl som gäller dansmusik i allmänhet är värd mer än en som tar 9 av 9 med gränser som hänger på enskilda händelser.

1. **Ny mapp** `.arena/drop1/<id>r/` (jokern: `fusionr`). Utgå från din egen kod, från r0 (`.arena/drop1/fusion/src`) eller från bas (`src`).
   Idébanken är öppen: `.arena/drop1/idebank/` (allas `losning.md` och diff + `ranking-r1.md`) och jokerns `fusion/losning.md`.
2. **Tänk utanför övningen innan du rör koden.** Skriv upp vilka SORTERS uppbyggnad som finns i dans-, pop- och schlagermusik och fråga
   för var och en om din mekanism ser den: basen tyst länge (breakdown) · basen spelar vidare under ett svep · bastrumman själv rullar
   tätare och tätare · bara en kort paus före slaget · sång eller ett ensamt instrument över tom bakgrund · tonartshöjning och full
   refräng utan att något tystnar. Ägaren tryckte Uppbyggnad allt från 0,7 till 26 s före droppen. En mekanism som kräver EN sorts
   uppbyggnad är den som föll.
3. **KORSPROV inom övningen (obligatoriskt, redovisas):** dela övningen vid 290 s. Första halvan har ägarens drop 51,0 / 137,2 / 210,6 /
   214,2 / 217,9 / 281,8; andra halvan 301,6 / 367,4 / 441,2. Bestäm dina gränser genom att bara titta på EN halva, lås dem, och läs av
   den andra halvan – och sedan tvärtom. Redovisa båda (träffar, drop utan markering, per halva). Per halva räknar du ur domarens json:
   `detalj.dropDt` (ägarens drop i tidsordning, null = miss) och `detalj.motorDrop` (alla motorns drop). En gräns som måste flyttas
   mellan halvorna ska bort eller ersättas av något som inte behöver flyttas.
4. **MARGINALER:** varje gräns ska kunna flyttas minst 25 % åt båda håll utan att domen på övningen ändras. Klarar den inte det: ta
   bort villkoret eller gör det relativt mot något låten själv ger (takt i slag i stället för sekunder, nivå mot eget tak, täthet mot
   eget snitt). Färre gränser är bättre än fler.
5. **Budget:** högst 2 domarmätningar på övningen (`dropdom.py .arena/drop1/<id>r --mat`, spara som `dropdom-m1.json`, `-m2.json`) och
   högst 4 fria sondkörningar. Samma regler i övrigt (inget utanför din mapp, inga git-kommandon som ändrar, inga env-rattar).
6. **Finalen:** orkestratorn dömer din slutvariant EN gång på kontrollen. Du får veta domslutet, inget mer.

## Leverans

`.arena/drop1/<id>r/losning.md` (svenska, högst ~500 ord): vad som var fel med din runda 1-lösning ur allmängiltighetens synvinkel ·
mekanismen nu, i två meningar, och vilka sorters uppbyggnad den ser respektive INTE ser · tabellen KORSPROV · tabellen MARGINALER ·
din rad ur domaren · hela diffen mot `src`. Svara sist med raden `KLAR <id>r poäng <x> <DISK|OK>`.
