# k2 – TVÅ TIDSSKALOR (klocka2)

## Idén
Ett långt fönster väljer TOLKNINGEN: den sätts när tempogrammets val stått inom ±3 % i 38 varv i följd (~15 s), och ett tredje
minne i samma tempogram (`tgAccL`, ~10 s) bär bevisen för varje hypotes. Därefter följer det korta bara tempot inom ±3 %; ett tempo
utanför bandet tas bara om det slår tolkningen i det långa minnet (×1,2) eller om det långa minnet inte känner det OCH det snabba
minnets kvot stiger förbi 1,7 (ny låt: förra låtens bevis dör; ett syskon i samma låt står och väger på 1,4–1,65). Det är musikanalys:
inget tempo jämnas ut, klockan kräver bara bevis över fraser i stället för över ett fill, och låtgränsen (relock) öppnar valet helt.

Bara `src/analyserClock.ts` (+65/−5 rader, en Float64Array(139) vid start, inget per hop).

## Siffrorna (mätning 3, övning, OK – ingen spärr)
poäng **+8,03**

| mått | bas | k2 | % |
|---|---|---|---|
| mix_klocka | 97,88 | 97,90 | +0,0 |
| mix_las | 2,78 | 2,78 | +0,0 |
| mix_hopp | 0,00 | 0,03 | −13,0 |
| mix_still | 2,93 | 2,93 | +0,0 |
| klipp_klocka | 98,32 | 98,32 | +0,0 |
| utfl_min | 0,82 | 0,68 | +17,1 |
| utfl_tid | 2,11 | 2,10 | +0,5 |
| syskon_tid | 2,67 | 1,68 | +37,2 |
| lotus_ratt | 116 | 116 | +0,0 |
| lotus_syskon | 5 | 5 | +0,0 |
| lotus_vaxling | 17 | 15 | +11,8 |
| kallaren | 2,98 | 1,70 | +42,9 |

Spärrarna: syntet 6/8, on-beat 0,41, fas 0,91 / 6 / 70 (115). Sämre: mix_hopp (ett tempobyte i mixen, 0 → 1). utfl_tid står still
för att lang1028 500–530 s (kaotiskt hos båda) nu räknas som utflykter: klockan kommer TILLBAKA till 140 i stället för att vandra vidare.

## Vad som inte gick
- Bara långa minnet, inget snabbt byte (sond): källaren 2,98 → 0,21, men låset efter låtbyte 3 → 6–12 s. Låtgränsen kommer 3–10 s
  EFTER att basen redan bytt; den kan inte bära låtbytet.
- Kickarnas tillit, regentens poäng och det långa minnet i bytesögonblicket skiljer INTE låtbyte från utflykt (mätt per varv). Bara
  kvotens förlopp gör det.
- Mätning 1 och 2 (31 varv, bara tröskeln 1,7): **+9,84 / +11,68 men DISK** – on-beat 0,40, i fas 69/115, mix_still 3,24 (0,004 s
  över). Källaren var då 0,53, syskon_tid 1,45.
- Marginal i klockans finskanning (1,05): ingen stadigare klocka, borttagen.

## Risken
- Tre spärrar passerade på knivseggen (mix_still exakt = bas, i fas 70/115, on-beat 0,41). Kontrollmängden kan falla åt andra hållet.
- TL_OPEN är en avvägning jag inte löst: 31 varv låser källarklippet v-141037 direkt (0 byten), 38 varv först efter 92 s (9 byten),
  men 31 fäller lotusbankens fasspärrar. Källarens +43 vilar därför på tre av fyra klipp.
- TL_ESC 1,7 och TL_NEW 0,3 är satta på 11 låtbyten och 13 utflykter; marginalen mellan dem är liten (1,68 mot 1,72).
- En ny låt utan låtgräns med svag start väntar på låtgränsen (mixen: lås 3,5 → 7,8 s och 7,5 → 8,7 s på två låtar).
- Fel tolkning som stått stadigt i 15 s sitter kvar tills det långa minnet vänt (~10 s) – lotus med Sonos-låtbyte öppnar valet, en
  radiomix utan gräns gör det inte.
- Oktaven är låst i tolkningen: en låt som går från halvtempo till fullt får vänta på det långa minnet, som inte skiljer 80 från 160.
- Ej kört: tvavagar.py (sektion, drop, kick, upp_s/ned_s), workerns p99. Kickgrinden står öppen medan tolkningen hålls mot en
  utmanare, så kickarna ändras där.
