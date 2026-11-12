# fusion-d – jokerns lagning (klocka2, 2026-11-12)

## Vad som lagades
fusion föll på kontrollmängden på mix_still 8,20 s (gräns 4,02) och lotus fasmedian. Båda kom ur k2-delen: tolkningen hölls mot ALLA utmanare, också en ny låts tempo. fusion-d låter tolkningen bara hålla mot en annan LÄSNING AV SAMMA LÅT och tar bort allt annat den rörde. Resultat på övningen: mixens 16 stilla-tider, alla lås och mix_las är identiska med basens siffra för siffra, lotus 116 med n = 114 som bas. **Poäng +8,62, OK** (mätning 2 av 2).

## Hur (tre ändringar mot fusion, bara `src/analyserClock.ts`, +108/−5 mot bas)
| ändring | lånat av | varför |
|---|---|---|
| Okänd utmanare (långa minnets poäng < 0,75 × tolkningens) går exakt som i basen, valet öppnas | k2b (regeln); tröskeln 0,75 är min | k2b:s 0,5 höll övningen men gav 4,22 på kontrollmängden: ett syskonnära tempo får hög poäng i det långa minnet utan att ha spelats. Mätta lägen (k2b): låtbyten 0,14–0,43, ett 0,55–0,68; läsningar i samma låt 0,8–1,35. 0,75 ligger i luckan. |
| Regel (5) borttagen: under håll sökte rutnätet bara fas ±0,5 % och kickgrinden stod öppen | koordinatorns tips; k1/k5 har ingen sådan väg | Enda vägen där tolkningen rörde rutnätets fas och kickarna. Nu rör den bara `tempoBpm`. |
| Oktaven väljs av tempogrammet som i basen; tolkningen följer med | egen, funnen i mätning 1 | Tolkningen gav sin egen oktav: lotusbankens "Stora tuttar" (157) stod kvar på 80 efter en utflykt medan basen gick tillbaka (lotus_ratt 115). Efter lagningen 116. Samma väg kan låsa fel oktav efter ett låtbyte. |
Oförändrat från fusion: k1:s syskonfamilj sist, valet efter 38 stadiga varv, backningen när familjen håller.

## Siffrorna (övning, bas → fusion → fusion-d)
| mått | bas | fusion | fusion-d | % |
|---|---|---|---|---|
| mix_klocka / las / hopp / still | 97,88 / 2,78 / 0,00 / 2,93 | 97,90 / 2,78 / 0,03 / 2,93 | = bas | 0 |
| klipp_klocka | 98,32 | 98,32 | 98,32 | 0 |
| utfl_min | 0,82 | 0,68 | 0,77 | +6,1 |
| utfl_tid | 2,11 | 1,82 | 1,65 | +21,8 |
| syskon_tid | 2,67 | 0,67 | 1,10 | +58,9 |
| lotus_ratt / syskon | 116 / 5 | 116 / 5 | 116 / 5 | 0 |
| lotus_vaxling | 17 | 14 | 16 | +5,9 |
| kallaren | 2,98 | 1,70 | 2,66 | +10,7 |
Spärrar: syntet 6/8, on-beat 0,40 (bas 0,41, inom 5 %), fas 0,91 / 6 / 70 (114).

## Vad det kostade
Källaren 1,70 → 2,66 och syskon_tid 0,67 → 1,10, alltså ungefär k1:s nivå (+8,17) plus lite. Källarklippens utflykter går till tempon som inte hörts förut och ser i bytesögonblicket ut som en svag låtstart; k2 mätte att varken kickarnas tillit, regentens poäng eller det långa minnet skiljer dem. Vinsten där och basens låsning efter låtbyte går inte att få samtidigt utan låtgränsen. Jag valde DMX (ägarens besked 22:16).

## Risker
- mix_still på kontrollmängden är omätt. Argumentet är att övningsmixen är identisk med basen, inte bara medianen – men ett låtbyte med långa-minnet-kvot ≥ 0,75 hålls fortfarande.
- 0,75 är satt på k2b:s mätningar, luckan 0,68–0,80 är smal.
- Mätning 1 (utan oktavlagningen) hade lotus_ratt 115; "Stora tuttar" vandrar 80–157 och kan vända igen på 503.
- k1:s risker följer med (fel medlem sitter 16 slag netto, tröskeln 0,45).
- Skanningsspärren (utfl_min 0,24) är inte med: den flyttar enskilda låtars stilla-tid ±0,3 s och låt 15 till 26,8 s.
- Ej kört: kontrollmängden, tvavagar.py.
