# Strategikort – arenan bygg (uppbyggnad + sektion, 2026-11-11). Fyra MEKANISMER, inte fyra rattvärden.

## b1 – UPPBYGGNADEN UR KLANGENS RÖRELSE
En uppbyggnad hörs som att klangen rör sig åt ett håll över flera takter: diskanten/bruset stiger (risern), centroiden klättrar,
nivån växer. Dagens riser-villkor är momentana trösklar (nyhet över baslinje, centroid över långsam centroid) som nästan aldrig slår
till. Mät i stället LUTNINGEN över 4–8 slag (klockans slag som tidsenhet) i klang och nivå, och låt `buildUp` vara hur tydligt och hur
länge den lutningen hållit. Sektionsdelen: använd samma lutning åt andra hållet för att lämna 'high' när musiken faller.

## b2 – UPPBYGGNADEN UR RYTMEN
En uppbyggnad hörs i trummorna: virvelrullen förtätas (fjärdedelar -> åttondelar -> sextondelar), kicken faller bort eller dubblas,
och strax före höjningen blir det ofta ett "sug" (basen/kicken tystnar ett slag eller en takt). Mät anslagstätheten per slag med
klockan (onset/drum-fälten finns per band) och låt `buildUp` följa förtätningen och suget. Sektionsdelen: 'high' kräver att
kicken/basen faktiskt går; faller den bort i mer än en takt är det inte refräng längre.

## b3 – SEKTIONEN UR BASENS NIVÅ (nya fälten)
Analysatorn har sedan i kväll `bassEnergy` (basens nivå under frasens tak) och `bassLevel` (partiets bastak mot refrängens). Dagens
sektionsetikett bygger på rangfönster om 4 s plus uppehållstider (4–8 s) och håller därför kvar 'high' länge efter att musiken fallit
(mätt i dag i lotus: 12 s 'high' genom ett tyst parti). Låt etiketten ut ur 'high' följa basens nivå mot refrängens referens inom 1–2
takter, och in i 'high' likaså. Uppbyggnadsdelen: `buildUp` = hur långt partiets nivå hunnit från versens mot refrängens referens
medan den stiger.

## b4 – FRASEN OCH MINNET
Musik byter parti på frasgränser (4, 8, 16 takter). Analysatorn har klockan, ettan, ett sektionsminne (`secLog`, `repeatSim`) och
en förutsägelse (`expectHighInMs`). Lägg sektionsbytena på frasgränserna: ett nivåfall som håller över en frasgräns lämnar 'high' där,
inte efter ett uppehåll i sekunder. Låt `buildUp` vara FÖRLOPPET mot nästa väntade höjning: frasens sista takter före den förutsagda
'high'-starten när energin samtidigt stiger (minnet: förra versen var N takter). Måste fungera i låtens första varv, utan minne.
