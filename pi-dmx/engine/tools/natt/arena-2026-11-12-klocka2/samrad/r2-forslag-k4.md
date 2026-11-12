# r2-förslag k4

## Vad domarens stilla-tider visar (mix.still, s)

| låt | bas = k2c | k4b | samrad-1 | lås (alla fyra) |
|---|---|---|---|---|
| 5 | 2,93 | 2,73 | **4,05** | 0,0 |
| 9 | 2,48 | 2,48 | **8,26** | 2,5 |
| 13 | 3,86 | **3,15** | 3,86 | 3,9 (k4b 3,2) |
| 14 | 2,65 | **3,46** | 2,65 | 2,6 |
| 2 | 23,36 | 11,91 | 11,91 | 3,0 |
| median | 2,93 | 3,15 | 3,95 | |

Övriga 11 låtar skiljer högst 0,8 s. samrad-1 faller på två låtar: 5 och 9.

## Varför k4b klarar och samrad-1 inte – det är inte mekanismen

Läst ur diag-körningarna (`<variant>/klockdom/ovn.json`, kolumn 1 = klockan, kolumn 3 = `tempoBpm`):
- **`tempoBpm` är identiskt i bas, k4b och samrad-1 genom låt 5 (114,0–114,1) och låt 9 (93,8–94,3), prov för prov.** Tempovalet (regent eller tolkning) spelar ingen roll där.
- Det som skiljer är klockans EGET fintempo i `onsetStep`. Låt 9: bas 93,2–95,1, k4b 93,5–94,9, samrad-1 93,4–94,9 – alla tre växlar ±0,8 % kring ett tempogram som står still, och ±1 % i 5 s klaras eller spricker på ett enda prov. Låt 5: klockan vandrar 111,2–114,7 genom övertoningen i alla tre; vilket 0,5 %-steg den landar på beror på historien före skarven.
- k4b:s enda riktiga vinst är låt 13: bevissumman byter 0,7 s före basens snabba byte (lås 3,9 → 3,2). Den räcker inte: samrad-1 med låt 13 = 3,15 hade ändå haft median (3,15 + 3,95)/2 = 3,55.
- k4b fick alltså låt 5 och 9 rätt på samma sätt som basen får låt 15 rätt (2,16 s i domaren, 5,7 s i diag-körningen av samma kod): slumpen i vilket steg fintempot står på.

## Sonderat i den här omgången

- **Idé (i), sökningsdelen av ~14 s efter tempobyte > 3 %: dras tillbaka utan sond.** Låt 5 har inget tempobyte (114 → 114), och klockan skiljer sig från basen redan under övertoningen, före låtgränsen. Spärren skulle inte lösa ut där.
- **Ny: fintempot mellan stegen** (parabel genom sökningens vinnare och dess grannar, som i `tgStep`; `k4b/r2prov/`). Övningsmixen: låt 5 4,0 → 3,2, låt 9 8,3 → 4,2, utflykter oförändrat 3, lås = bas. Bättre, men väntad median (3,2 + 3,86)/2 = 3,53 = fortfarande DISK. Inte nog.

**Sond mot domare:** för samrad-1 förutsade sonden låt 5 och 9 på 0,05 s när (4,0 / 8,3 mot 4,05 / 8,26). De har varit oense om låt 2, 8 och 15 (och låt 9 i k4b). Jag drar bara slutsatser ur låtar där de är överens och ur `tempoBpm`-kolumnen, som är deterministisk.

## FÖRSLAG (ett): ingen ny gemensam variant – k2c läggs fram som den säkra, k4b:s sökningsdel som eget prov senare

Skäl i siffror:
- Ingen av oss har en mekanism som gör fintempot stadigt; allt som rör `onsetStep` kastar om 2–4 låtar med 0,3–25 s. Övningens marginal är i bästa fall 0,08 s (k4b). (ii) "k4b + k2c:s håll ovanpå" ändrar `tempoBpm`-historien och drar samma lott en gång till – jag drar tillbaka den.
- k2c rör bara `tempoBpm`: mixens 16 stilla-tider och lås = basens, kontroll mix_still 3,41 (bättre än bas).
- DMX-måtten (summa % mot bas av mix_*, klipp_klocka, utfl_*, syskon_tid): övning k2c +105,9 / k4b +70,4; kontroll k2c +54,0 / k4b +81,4. Poäng: övning 9,24 / 8,51, kontroll 7,72 / 8,25. Det är oavgjort mellan mängderna.
- k4b har mer emot sig: mix_hopp 0,05 på övningen (−26 %), kontroll utfl_tid −7,9 och syskon_tid −2,9, lotus motfas +1 fil, fasmedian 0,89.

Konkret:
1. **k2c** är samrådets variant (godkänd på båda mängderna, ingen ny dom behövs).
2. **k4b** redovisas som alternativet för den som värderar blippar och hopp högst (utfl_min kontroll +43,9, mix_hopp +46,2). Valet mellan 1 och 2 är ägarens.
3. Till todo, inte till arenan: blippspärren + parabeln i `onsetStep` ovanpå k2c (övning utfl_min 0,74 → 0,24) prövas när mix_still mäts så att ett enda prov inte avgör – i dag klarar basen själv spärren på en låts tur.

## Det jag inte vet
- Om k4b:s mix_still = bas på kontrollmängden är samma tur; jag ser bara medianen där.
- Om parabeln kostar rutnätets fas (gridfel, ettan, lotusfasen): omätt.
