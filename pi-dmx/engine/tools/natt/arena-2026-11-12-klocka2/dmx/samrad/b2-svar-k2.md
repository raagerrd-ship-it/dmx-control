# b2 – svar från k2

## Först: min gissning var fel
Jag skrev att dmx-1b på kontrollmängden troligen blev "k4b minus en poäng". Den blev +8,44 mot k4b:s +7,59. Vittnet gav −1,29
ovanpå basen men +0,85 ovanpå k4b (utfl_tid 5,03 → 4,77, syskon_tid 8,52 → 8,32). Delarnas verkan adderar alltså inte från en bas
till en annan; jag ska inte räkna så igen.

## Håller med
- **k4:s och jokerns räkning av kontrollens fel**, som är skarpare än min: 8 låtar à 12,5 %, så 16,6 % fel = EN låt som står fel hela
  vägen + låstiderna. Jag skrev "minst 12 % stadigt fel"; de visar att det är en låt, och k4 har den ur en öppen rapport (lås 153,85 s,
  "står på ~100 hela låten"). Följden är k4:s: varje tolkningsidé döms där på n = 1.
- **Jokerns förklaring av dmx-1b:s 0,007 s:** vittnet gör ETT veto i hela övningsmixen (282 s, rätt dom), och sex minuter senare
  ligger fintempot på ett annat 0,5 %-gitter. Det stämmer med det jag såg i låt 5 i går. Inget att laga i vittnet.
- **Jokerns skäl till att vittnet var blint:** 2 och 4 slag upprepar sig också för 2/3- och 4/3-fantomen (3 och 6 riktiga slag).
  Ett slag gör det inte. 70,7 → 92,7 % och falska rättningar 6 → 0 av 2230 fönster är en mätt skillnad, inte ett nytt tal.

## Parabeln eller den riktade kronan? Parabeln.
Båda rör `onsetStep`, och de är alternativ i den här omgången – en ändring i sökningen i taget.

| sond på dmx-1b | dmx-1b | riktad krona (k2) | parabel (k4) |
|---|---|---|---|
| låt 5 | 3,20 | 2,9 | 2,90 |
| låt 10 | 8,55 | 8,25 | **3,55** |
| låt 8 | 9,45 | **19,45** (sämre) | 7,95 |
| låt 15 | 11,3 | 8,4 | 9,00 |
| övriga | – | låt 6 0,85 → 0,15 | oförändrade |
| utflykter / min | 0,24 | 0,23 | oförändrat per fil |
| klockans avstånd till tempogrammet, median | 0,20 % | ej mätt | **0,10 %** |

Min krona flyttar samma låt 5 lika mycket, men den gör låt 8 sämre och har inget mått som säger att klockan blivit bättre i
allmänhet. Parabeln har det: avståndet halveras över hela mixen, och den använder samma räkning som `tgStep` redan gör för
tempogrammets topp. Den tar bort rastret i stället för att styra hur klockan rör sig på det. **Jag drar tillbaka den riktade kronan
till förmån för parabeln.** Vill någon pröva dem ihop är det en sak för omgång 3, efter att parabeln är mätt ensam.

Det jag vill ha bevakat i parabeln är k4:s egen osäkerhet: fasen sätts fortfarande på vinnarens steg medan tempot läggs mellan
stegen. Det syns inte i klockdom; det syns i tvavagar.

## Röst: två varianter, en ändring var ovanpå ledaren
- **dmx-2 = dmx-1b + parabeln** (k4:s `k4-parabel/`, bara `onsetStep` + två fält).
- **dmx-2b = k4b + vittnet med 1 + 2 + 4 slag och rätten att rätta ett säkert tempogram** (jokerns ändring i `pwSim` och `pwJudge`,
  plus raden som flyttar k4b:s regent vid en rättning, som i dmx-1b).

Jag röstar INTE på jokerns dmx-2 på `engine/src`: ledaren står på k4b, och dmx-1 mot dmx-1b visade att vittnet beter sig olika på de
två baserna.

## Utgången i förväg
- **dmx-2 (parabeln) bär på övningen** om mix_still ≤ 3,24 (inte sämre än dmx-1b), mix_las = 2,78, utfl_min ≤ 0,26 och mix_klocka
  ≥ 98,2. Den faller om något av dem är sämre – då ingen fler variant av sökningen.
- **dmx-2b (vittnet) bär på övningen** om inget dubbelviktat mått ligger under dmx-1b:s och vittnet inte gör någon felaktig rättning
  i mixen (jokerns logg: i dag 0). Den faller på en enda felaktig rättning där – den nya rätten är just den som kan göra skada.
- **Kontrollmängdens enda dom i omgången:** till dmx-2b om den bär på övningen. Den är den enda på bordet som kan röra den felande
  låten, och den låten är värd 12,5 pe i ett dubbelviktat mått. Bär den inte går domen till dmx-2.
- **Ny ledare** = slår +8,44 på kontrollmängden utan DISK. För dmx-2b räknar jag dessutom idén som buren bara om mix_klocka eller
  klipp_klocka går upp minst 1 pe; går poängen upp utan det är det samma sorts vinst som förra omgången, inte den låten.
- Bär båda var för sig: omgång 3 är deras kombination, och inget annat.

## Det jag inte vet
- Om den felande låten är tretakt eller 6/8. Då har klockan rätt mot mönstret och vittnet håller med den; då rör ingen av oss
  kontrollens rätt-tempo med det ljud vi har, och det bör sägas till ägaren som det är.
- Vad vittnets nya rätt gör på lang-filerna i kontrollmängden. På övningens lang1011 gick syskon_tid 5,74 → 4,43 i jokerns sond,
  men med ett veto som håller 128 i 30 s – jag kan inte avgöra om det är rätt tempo där.
