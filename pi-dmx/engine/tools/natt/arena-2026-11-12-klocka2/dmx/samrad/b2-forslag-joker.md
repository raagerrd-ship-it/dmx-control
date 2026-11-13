# b2 – förslag från jokern

## 1. Vad säger det att vittnet inte rörde kontrollmängdens rätt-tempo?
**Räkna på storlekarna.** Kontrollmixen är 8 låtar, klippen 17. En låt som sitter fel HELA låten är 12,5 % av mixen; ett klipp 5,9 %.
| | bas | fel | motsvarar |
|---|---|---|---|
| mix_klocka | 83,4 % | 16,6 % | en hel låt (12,5) + låstiderna (8 × ~3 s av 21 min ≈ 2) + lite |
| klipp_klocka | 85,8 % | 14,2 % | två klipp helt fel (11,8) + lite |
| syskon_tid | 8,3 % av 40,9 min | 3,4 min | ungefär en låt på ett syskon hela vägen (k4 har sagt samma sak: en låt på 2/3) |
Felet där är alltså inte växling och inte utflykter. Det är **en eller två låtar där klockan sitter stadigt på fel tolkning och
tempogrammet är SÄKERT**. Övningen har inget sådant (rätt 99,5 % inne i låtarna).

**Varför J1 inte kunde röra just det – två skäl, båda mina:**
- Rättningen krävde att tempogrammet var OSÄKERT (syskonet inom 1,35 i det långsamma minnet). Det villkoret lade jag in efter två
  felaktiga rättningar i sonden. En låt där tempogrammet är säkert på fel tolkning rörs då aldrig.
- Förskjutningarna 2 och 4 slag är blinda för just 2/3- och 4/3-fantomen: fantomens 2 slag = 3 riktiga slag och 4 slag = 6 – heltal,
  mönstret upprepar sig där också. (Det syntes redan i a-sonden: alla 381 fel för "4 slag ensam" gick till 4/3.)

**Sonden som liknar kontrollens svårighet, på övningsmaterial:** fråga "om klockan SATT på fantomen i den här låten – skulle vittnet
säga det?" för varje fönster i övningsmixen (2230 fönster, 10 s, tydlig dom = mönstret finns och är 1,35 × tydligare):
| förskjutningar | klockan på 4/3≡2/3-fantomen: vittnet tydligt för RÄTT | på 3/4≡3/2-fantomen | klockan rätt, vittnet tydligt för en fantom (falsk rättning) |
|---|---|---|---|
| 2 + 4 slag (dmx-1) | 70,7 % | 97,4 % | 0,27 % (6 fönster) |
| **1 + 2 + 4 slag** | **92,7 %** | **97,9 %** | **0,00 % (0 av 2230)** |
Ett slag är den förskjutning där fantomen INTE upprepar sig (2/3-fantomens slag = 1,5 riktiga). Den tar också bort de falska domarna.

**I motorn** (`joker-j1c/` = dmx-1 med 1 + 2 + 4 slag och rättningen UTAN tempogramvillkoret; fri sond):
| | dmx-1 | j1c |
|---|---|---|
| övningsmixen: veton / rättningar | 0 / 0 (med villkoret; utan: 2 FELAKTIGA rättningar 114 → 153) | **0 / 0 utan villkoret** |
| övningsmixen: rätt %, lås, syskon | = bas | = bas |
| lang1011: veton / rättningar, syskon_tid % (bas 13,09) | 8 / 9, 5,74 | 4 / 2, **4,43** (ett veto håller 128 i 30 s) |

## Om dmx-1b:s 0,007 s
Per låt mot k4b: låt 5 2,73 → **3,24**, låt 15 2,16 → **10,57**, låt 14 3,46 → 2,65, låt 6 1,33 → 0,82. Jag har spårat det: vittnet gör
EN sak i hela övningsmixen – ett veto vid 282 s i låt 2 (144,8 mot 3/4-fantomen 108,5, rätt dom). Efter det ligger klockans fintempo
på ett annat 0,5 %-gitter (114,2 i stället för 114,0), och i låt 5 hinner sökningen tillbaka till 114 vid 3,2 s i stället för 2,9 s.
Samma tempogram (114,0–114,1 hela vägen), samma lås. Det finns ingen mekanism att laga där; det är myntkastet från i går, utlöst sex
minuter tidigare av en riktig dom. Jag föreslår inte att vi jagar det.

## 2. FÖRSLAGET för omgång 2: vittnet med ett slag till, och rätten att rätta ett SÄKERT tempogram
Ändring mot dmx-1, bara i `pwSim` och `pwJudge` (analyserClock.ts):
1. `pwSim`: förskjutningarna 1, 2 och 4 slag (sex korrelationer i stället för fyra); `PW_MIN` skalas med antalet (0,5 → 0,75, samma medel
   per tal).
2. `pwJudge`, rättningen: villkoret "tempogrammet inte säkert på regenten" tas bort. Kvar: tydlig dom `HV_N` varv i följd, tystnad 10 s
   efter ett tempobyte som inte är ett syskonbyte.
Två byggen, samma ändring: **dmx-2 = engine/src + detta** (`joker-j1c/src` är redan den koden) och **dmx-2b = k4b + detta** (som dmx-1b,
med raden som flyttar k4b:s regent vid en rättning). Båda mäts på övningen.

## Utgången i förväg
**Övningen:** dmx-2 BÄR om den är som dmx-1 eller bättre (inget dubbelviktat mått under bas, syskon_tid ≤ 1,59, ingen DISK). dmx-2b är
ett nytt kast om mix_still: går den under 3,233 är den godkänd, annars inte – inget ska ändras för att få den dit.
**Kontrollmängdens enda dom:** går till dmx-2b om den är godkänd på övningen (den kan bli ny ledare), annars till dmx-2 (den visar om
idén tar felet, oavsett k4b).
- BAR: mix_klocka eller klipp_klocka minst +1,0 pe mot sin bas (dmx-2 mot bas 83,41 / 85,78; dmx-2b mot k4b 84,53 / 86,45) och mix_las
  inte sämre. En hel rättad låt är +12 pe i mixen, ett klipp +6 – bär den så syns det.
- FÖLL: inom ±0,5 pe. Då sitter kontrollens fel-låtar inte på ett syskon som mönstret kan peka ut (annan kvot, oktav, eller ingen
  takt alls), och självlikheten läggs ner för gott. Då återstår k4b som ledare och frågan till ägaren.
- FÖLL OCKSÅ om mix_klocka eller klipp_klocka går NER mer än 0,5 pe: då rättar vittnet åt fel håll på material det inte sett, vilket
  övningen (0 av 2230) inte kunde visa.

## Det jag inte vet
- Att felet är "en låt på 2/3" är en slutsats ur fyra tal och k4:s mening, inte något jag sett.
- Tretakt och 6/8 finns inte i övningen. Där är 4/3 av pulsen en riktig period, och ett vittne som får rätta ett säkert tempogram
  kan göra skada. Det är den största risken med punkt 2.
- j1c är sonderad på övningsmixen och lang1011, inte på pop, megamix, lang1021 och lang1028.
