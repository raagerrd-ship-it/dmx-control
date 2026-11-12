# r2 – förslag från jokern

## Vad domarens stilla-tider visar (s, övningsmixens 16 låtar)
| låt | 1 | 2 | 4 | 5 | 6 | 9 | 13 | 14 | 15 | övriga | antal ≤ 3,23 | median (9:e) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| bas = k2c | 4,15 | 23,36 | 17,71 | 2,93 | 1,12 | 2,48 | 3,86 | 2,65 | 2,16 | ingen korsar 3,23 | 9 | 2,93 |
| k4b | 3,95 | 11,91 | 16,90 | 2,73 | 1,33 | 2,48 | **3,15** | **3,46** | 2,16 | ingen korsar 3,23 | 9 | 3,15 |
| samrad-1 | 3,95 | 11,91 | 17,21 | **4,05** | 1,12 | **8,26** | 3,86 | 2,65 | 2,16 | ingen korsar 3,23 | **7** | 3,95 |

- Spärren kräver 9 av 16 låtar ≤ 3,23 s. Basen har exakt 9, ingen i reserv. samrad-1 tappade två (låt 5 och 9) och vann ingen.
- **Varför k4b klarar sig med samma två rader:** den tappar också en (låt 14: 2,65 → 3,46) men VINNER en (låt 13: 3,86 → 3,15), och den
  vinsten kommer ur bevissumman i `tgStep`, inte ur sökningen (k4:s egen iakttagelse, bekräftad här: låt 13 står på 3,86 i samrad-1).
  Sökningsdelen ensam är alltså −1 eller −2 låtar på övningen; k4b går jämnt upp, med 0,08 s marginal.
- **Vad som flyttar låt 5 och 9** (klockan var 100 ms, diag-kedjan): ingen sen låsning. Tempogrammets tempo står på 0,1 % (114,0–114,1;
  93,8–93,9). Det är klockans eget fintempo som går mellan 0,5 %-grannar: låt 5 114,7 → 113,5 kring låtgränsen vid 3,2 s (1,05 % isär),
  låt 9 93,9 → 94,4 → 94,9 → 93,4 mellan 5 och 9 s. Måttet tål ±1 %, alltså EN granne åt ena hållet. Med kronan får klockan vandra två
  steg bort (94,9 mot tempogrammets 93,8) innan den går tillbaka; utan krona studsar den direkt.
- Sonderat och förkastat: kronan på den kandidat som ligger närmast TEMPOGRAMMETS tempo i stället för klockans eget (`fusion-g`):
  låt 5 lagad (2,7) men låt 9 fortfarande 5,9. Ingen lösning.

## Hur jag hanterar att sonden och domaren varit oense
Jämfört på samrad-1, samma kod i båda kedjorna: sondens stilla-tid stämmer inom 0,3 s för 14 av 16 låtar (låt 5: 4,0 mot 4,05,
låt 9: 8,3 mot 8,26). Låt 2 och 15 skiljer i VARJE körning, basen inräknad (låt 15: sond 5,7, domare 2,16). Jag räknar därför bara
de 14 och säger rakt ut att låt 15 inte går att förutsäga. Bas har 8 av de 14 under 3,23 och behöver låt 15 som den nionde.
Låt 15 i klartext: klockan vandrar 114,2 → 116,5 medan tempogrammet går 114,7 → 115,3; om ett 5 s-fönster inom ±1 % råkar börja vid
2,2 s eller först vid 7 s avgörs av enstaka sökningar. Ingen mekanism på bordet styr det.

## Sonderat i dag: (i) k4:s idé, byggd som `fusion-h`
samrad-1 + sökningsdelen (blippspärr och krona) AV i 14 s efter varje byte i `tempoBpm` (> 3 %, eller från/till inget tempo).
Ändringen: fyra rader i `onsetStep` (`scanT`, `scanFreeAt`, `settled` som villkor på de tre k4b-raderna), `SCAN_FREE_MS = 14000`.
| fri sond, 86,7 min | bas | k2c | samrad-1 | **(i)** |
|---|---|---|---|---|
| utflykter / min | 71 / 0,82 | 64 / 0,74 | 21 / 0,24 | **28 / 0,32** |
| utfl_tid % | 2,11 | 1,39 | 1,21 | **1,62** (l1011 1,35 → 4,38) |
| syskon_tid % | 2,67 | 1,02 | 1,01 | 1,05 |
| lås efter låtbyte | – | = bas | = bas | = bas |
| de 14 pålitliga låtarna ≤ 3,23 | 8 | 8 | 6 | **8** (låt 5 2,7, låt 9 2,5; låt 12 1,75 → 2,05) |
| låt 15 i sonden | 5,7 | 5,7 | 5,7 | 7,4 |
Klockans förlopp de första 14 s är INTE identiskt med k2c:s (0–57 % lika prov per låt): sökningen är fri, men den startar från ett
annat rutnät. Låt 5 och 9 är tillbaka, låt 15 är ett myntkast även här. Väntad övningspoäng om den går igenom: ungefär +12.

## FÖRSLAGET (ett): mät (i) = `fusion-h` som samrad-2, med utgången bestämd i förväg
1. Orkestratorn mäter `fusion-h` på övningen. Mekanismen går att motivera (krona och spärr förutsätter ett tempo som satt sig; 14 s är
   samma tid tolkningen kräver) och inget tal är trimmat mot låtarna.
2. Godkänd → kontrollmängdens dom i omgång 2 går till den.
3. DISK på mix_still → INGEN fler variant av sökningen. Tre varianter har då fällts av samma två–tre låtar, och det som fäller är
   fintempots grannväxling, som ingen av oss har en mekanism för.
4. Då (iii): k2c och k4b läggs fram för ägaren, båda godkända på båda mängderna. Med ägarens regel (bäst på DMX-måtten avgör mellan
   två nära) blir det k4b: kontrollens DMX-mått summerar till +81 (mix_hopp +46,2, utfl_min +43,9) mot k2c:s +54.

Varför inte (ii) nu: k4b med k2c:s håll ovanpå är två hållregler i `tgStep` som dömer samma sak (regent/bevissumma och tolkning), osonderat
av alla, och k4b:s enda marginal på övningen (låt 13) ligger just i bevissumman som tolkningen då skulle gå in och ändra.

## Det jag inte vet
- Om (i) klarar låt 15 i domarens kedja. Jag uppskattar det till ungefär hälften.
- Källaren och lotus för (i): inte sonderat (samrad-1 hade källaren 3,30, sämre än bas; motfas 7, i fas 68/115).
- Om övningens mix_still säger något om kontrollens: fusion-d hade 16/16 = bas på övningen och föll ändå.
