# b2 – svar från jokern

## Håller med
- **Kontrollens fel är EN låt som står stadigt fel.** Tre oberoende räkningar ger 12,5 pe av 16,6, och k4 har namnet ur den öppna
  rapporten från 11-10 (står på ~100 hela låten, låser aldrig i någon variant). Varje tolkningsidé döms alltså på n = 1 där.
- **k2 och k4 har rätt om låt 5 och jag hade fel i b2-förslaget.** Jag skrev att 0,007 s var ett myntkast utan mekanism. k4:s parabel
  halverar klockans avstånd till tempogrammets tempo över HELA mixen (0,20 → 0,10 %), och sex låtar har blivit bättre och ingen sämre i
  två olika byggen. Det är en mekanism, inte en lott.
- k2:s väntan att vittnet ovanpå k4b skulle ge "k4b minus en poäng" slog inte in: dmx-1b +8,44 mot k4b +7,59. Men vinsten sitter i
  utfl_tid och syskon_tid, inte i rätt tempo – k2 har rätt i sak om att vittnet inte rörde den felande låten.

## Parabeln och den riktade kronan: alternativ, inte ett par
Båda ändrar fintempot i `onsetStep` för samma symptom. Tekniskt går de ihop (kronan ändrar poängen, parabeln lägger toppen mellan
stegen), men tillsammans vet vi inte vilken som bar.
| | k4: parabeln | k2: riktad krona |
|---|---|---|
| låt 5 i sonden (dmx-1b 3,2) | 2,9 | 2,9 |
| fler låtar som flyttas | låt 10 8,55 → 3,55, låt 8 och 15 bättre, ingen sämre | låt 6 0,85 → 0,15, låt 15 bättre |
| utflykter (dmx-1b 21) | 21 | 20 |
| nytt tal | inget | inget (samma 1,06, riktad) |
| mått utöver stilla-tiden | klockans avstånd till tempogrammet halveras | – |
Jag röstar på **parabeln**: den gör samma sak som `tgStep` redan gör för tempogrammets topp och har ett mått som gäller hela mixen.
Den riktade kronan är reserven om parabeln rubbar rutnätets fas (omätt, syns i tvavagar).

## Mitt nya vittne ovanpå ledaren: BYGGT som `dmx-2b/` – och sonden säger att det kostar på övningen
`dmx-2b` = `dmx-1b/src` + fyra rader i `pwSim`/`pwJudge` (förskjutning 1 + 2 + 4 slag, `PW_MIN` 0,5 → 0,75, rättningen utan
tempogramvillkoret). BYGGT, `dmx-2b.diff` mot engine/src, inte mätt i domaren. Fri sond, 86,7 min:
| | k4b | dmx-1b (ledaren) | **dmx-2b** |
|---|---|---|---|
| utflykter / min | 0,30 | 0,24 | **0,28** |
| utfl_tid % | 1,54 | 1,18 | **1,46** |
| syskon_tid % | 2,34 | 1,39 | 1,31 |
| mixen: rätt %, alla lås, alla 16 stilla-tider | – | 99,94 | identiskt med dmx-1b |
| megamix syskon % | 0,88 | 0,26 | **1,43** |
| lang1011 utflykter / tid % / syskon % | 6 / 2,69 / 10,66 | 5 / 2,16 / 5,15 | **8 / 4,58 / 3,31** |
Rakt sagt: på övningen är dmx-2b lite SÄMRE än ledaren (utfl_min +17 %, utfl_tid +24 %, megamix sämre), och mixen rörs inte alls.
Jag väntar mig en övningspoäng 1–2 under dmx-1b:s +13,99. Det den har för sig är bara A5-sonden (ser 4/3≡2/3-fantomen i 92,7 % av
fönstren mot 70,7 %, 0 falska av 2230) och rätten att rätta ett säkert tempogram – alltså ett kast mot den ENA låten på kontrollmängden.
Megamixens försämring har jag inte utrett; den filen har inget facit och byter tempo ofta.

## Röst: dmx-2 = dmx-1b + parabeln (k4) och dmx-2b = dmx-1b + nya vittnet (byggd)
En ändring var, båda på ledaren, båda mäts på övningen.

## Utgången i förväg
- **Ny ledare** = slår +8,44 på kontrollmängden utan DISK. Inget annat räknas.
- **Vem får kontrollmängdens enda dom i omgång 2:** dmx-2b, om den är godkänd på övningen. Skälet är storleken på det som står på
  spel: vänder den felande låten är det +12 pe på ett dubbelviktat mått (ungefär +2,6 poäng av mix_klocka ensam, mer med klippen);
  parabeln kan som mest ge mix_still (enkel vikt) och den frågan kan vänta till omgång 3.
  - dmx-2b BÄR om mix_klocka eller klipp_klocka stiger minst 1,0 pe över dmx-1b:s 84,53 / 86,45 och totalen slår +8,44.
  - dmx-2b FALLER om rätt-tempo-måtten står kvar inom ±0,5 pe (då är låten inte ett syskonfel som mönstret ser – tretakt, annan kvot
    eller ingen takt) eller om totalen hamnar under +8,44. Då läggs det nya vittnet ner, dmx-1b:s vittne (2 + 4 slag, med
    tempogramvillkoret) står kvar, och omgång 3:s dom går till dmx-2 (parabeln).
- **Om dmx-2b inte är godkänd på övningen** går domen till dmx-2, som bär om den slår +8,44.
- **Om de andra hellre ger domen till dmx-2 nu** (säkrare, liten vinst) har jag ingen invändning i sak – men då får frågan om den
  felande låten aldrig ett svar inom tre omgångar om något annat kommer emellan.

## Det jag inte vet
- Om den felande låten är ett 2/3- eller 3/2-fel i fyrtakt (då borde nya vittnet se det) eller tretakt/6/8 (då håller mönstret med
  klockan, eller värre: vittnet rättar åt fel håll på andra låtar). Övningen har ingen sådan låt.
- Vad som händer i megamixen.
