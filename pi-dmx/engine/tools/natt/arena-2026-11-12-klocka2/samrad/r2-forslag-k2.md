# r2 – förslag från k2

## Vad domarens stilla-tider per låt visar (övning, s)
| låt | bas = k2c | k4b | samrad-1 |
|---|---|---|---|
| 5 (114 → 114, inget tempobyte) | 2,93 | 2,73 | **4,05** |
| 9 (129 → 94) | 2,48 | 2,48 | **8,26** |
| 13 | 3,86 | 3,15 | 3,86 |
| 14 | 2,65 | 3,46 | 2,65 |
| 1, 2, 4, 8 | 4,15 / 23,36 / 17,71 / 9,46 | 3,95 / 11,91 / 16,90 / 9,66 | 3,95 / 11,91 / 17,21 / 9,66 |
| övriga 8 | – | = bas | = bas |
| median (9:e värdet) | 2,93 | 3,15 | **3,95** |

Två låtar fällde samrad-1, och ingen av dem låste senare – låsen är basens i alla 16.

- **Låt 9:** tempot sätts på samma varv som i basen (+2,2 s, 93,9). Efteråt växlar klockan 93,4 / 93,9 / 94,4. Stegen är 0,53 %, så
  ytterlägena ligger 1,06 % isär – över måttets ±1 %. Basen växlar lika brett (93,2–94,6) men råkar få ett 5 s-fönster som börjar
  på ett mittvärde. Det är fintempots raster mot måttets tolerans, inte låsningen.
- **Låt 5:** tempogrammet står på 114 hela tiden. Klockans egen sökning gör en svacka till ~112 under övertoningen i alla varianter.
  Basen är tillbaka på 114 vid +3,0 s, samrad-1 vid +3,6 s: kronan håller klockan kvar i svackan en sökning till.
- **k4b klarade sig på låt 13** (3,86 → 3,15, bevissumman), inte för att sökningen var ofarlig. Det sade k4 i omgång 1, och det stämde.

## Sond och domare – hur jag hanterar oenigheten
Sondens stilla-tider för samrad-1 mot domarens, låt för låt: 14 av 16 inom 0,1 s. De två som skiljer är låt 2 (20,45 mot 11,91) och
låt 15 (5,7 mot 2,16), samma två som alltid. Låt 5 och 9 har sonden träffat i varje jämförelse (4,0 / 8,3 mot 4,05 / 8,26).
Jag läser därför sonden bara för låt 5 och 9 och räknar låt 15 som domarens 2,16.

## Sonderat i dag (fri sond, `k2s1/`, 86,7 min)
En ändring ovanpå samrad-1: kronan gäller bara mot ett granntempo som ligger LÄNGRE från tempogrammets topp än klockans eget.
Ett steg tillbaka mot toppen tävlar som i basen. (En riktning, inget nytt tal.)

| | samrad-1 | med riktad krona |
|---|---|---|
| utflykter / min | 0,24 | 0,23 (20 st) |
| utfl_tid % | 1,21 | 1,24 |
| lås efter låtbyte | = bas | = bas |
| låt 9 | 8,3 | **2,5** (= bas) |
| låt 5 | 4,0 | **3,5** |
| väntad median i domaren | 3,95 | 3,5 – fortfarande över gränsen 3,23 |

Den lagar låt 9 helt och låt 5 till hälften. Svackan i låt 5 börjar 0,6 s senare än i basen och slutar 0,2 s senare; det är
tidpunkten för en svacka under en övertoning, och den kan jag inte styra med en mekanism.

## Om förslag (i) – sökningsdelen av i ~14 s efter varje tempobyte över 3 %
Den kan inte laga låt 5: där byts inget tempo (114 → 114), så sökningsdelen står på och kronan håller kvar svackan som nu.
Låt 9 lagas (tempobyte 129 → 94). Med låt 5 kvar på 4,05 blir nionde värdet 3,86 = DISK. Jag räknar alltså med att (i) faller på
övningen och vill inte lägga en mätning på den.

## FÖRSLAGET: (iii) – ingen ny variant, ägaren väljer mellan k2c och k4b, och jag pekar på k4b
Skäl, i ägarens ordning (DMX först), kontrollmängden i % mot bas:

| | mix_hopp | utfl_min | mix_klocka | klipp_klocka | utfl_tid | syskon_tid | mix_still | summa DMX |
|---|---|---|---|---|---|---|---|---|
| k4b | +46,2 | +43,9 | +1,3 | +0,8 | −7,9 | −2,9 | 0,0 | **+81** |
| k2c | +7,7 | +15,8 | −0,4 | +0,6 | +16,7 | +5,4 | +8,2 | +54 |

- Båda är godkända på båda mängderna. k4b är bäst på DMX-måtten sammanlagt och har poängen (+8,25 mot +7,72).
- k2c är bättre på tid i fel tolkning (utfl_tid, syskon_tid) och har inget DMX-mått klart under bas; k4b har två.
- Kombinationen ger på övningen utfl_min 0,24 och utfl_tid 1,21 samtidigt – vinsterna adderar – men den faller på ett mått som
  avgörs av EN låt med 0,3 s marginal. Tre sonder och en mätning säger samma sak. Jag ser ingen mekanism som flyttar den låten
  tillbaka utan att trimma mot övningens 16 låtar.

**Mot (ii)** (k4b + k2c:s håll ovanpå): k4b:s regent och min tolkning dömer samma sak (`tempoBpm`) med två olika bevis. Jag har inte
sonderat dem tillsammans och kan inte säga vilken som vinner när de är oense. Vill k4 sondera den är jag för, men det är ett nytt
bygge, inte en lagning.

## Det jag lämnar efter mig
- Den riktade kronan (en rad i `onsetStep`, koden i `k2s1/src`) är värd att ha med nästa gång sökningsdelen prövas: låt 9 = bas,
  utflykterna oförändrade.
- mix_still på övningen vilar hos basen själv på låt 15 (2,16 s i domaren, 5,7 s i sonden av samma kod). Måttet mäter i dag
  fintempots 0,5 %-raster mot en tolerans på 1 %. Det är en fråga om domaren, och den är ägarens.
