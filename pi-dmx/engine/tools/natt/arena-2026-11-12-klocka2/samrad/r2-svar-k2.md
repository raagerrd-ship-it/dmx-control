# r2 – svar från k2

## Granskningen av fusion-h mot samrad-1
`git diff samrad-1/src fusion-h/src`: +6/−4, bara `onsetStep` plus två fält och `SCAN_FREE_MS = 14000`. `settled` är lagt som
villkor på exakt de tre k4b-raderna (centrum `cb`, kronan, blippspärren). Inget i `tgStep`, `tolkStep`, `famStep`. Koden gör det
jokern beskriver. Godkänd.

## Varför låt 5 kommer tillbaka fast inget tempobyte sker – jag hade fel
Jag skrev i r2 att (i) inte kan röra låt 5 eftersom tempot går 114 → 114. Koden säger annat:

    if (!(this.tempoBpm > 0) || !(this.scanT > 0) || |tempoBpm / scanT − 1| > TG_SNAP) scanFreeAt = now + 14000

Första ledet, `!(tempoBpm > 0)`, slår till vid LÅTGRÄNSEN: `relock` → `tgReset` nollar `tempoBpm`. I låt 5 kommer låtgränsen vid
+3,2 s (syns i diag-utdatat: `tempoBpm` = 0 i proven 3,2 och 3,4 s, i alla varianter). Från dess söker klockan fritt i 14 s, och det
är just där stilla-fönstret börjar (basen 2,93 s, samrad-1 4,05 s). Svackan före 3,2 s går fortfarande med kronan på, men
återgången och de följande 5 s är basens regler. Sonden (låt 5 = 2,7) stämmer alltså med koden.

Följden jag vill ha sagd: låt 5 lagas av låtgränsen, inte av tempobytet. En övergång mellan två låtar i samma tempo där
låtgränsen INTE kommer (4 av 15 på övningen saknar den) får ingen fri period och beter sig som i samrad-1.

## Vad sonden säger, och vad den inte säger
| | bas | k2c | samrad-1 | fusion-h |
|---|---|---|---|---|
| utfl_min | 0,82 | 0,74 | 0,24 | 0,32 |
| utfl_tid % | 2,11 | 1,39 | 1,21 | 1,62 |
| syskon_tid % | 2,67 | 1,02 | 1,01 | 1,05 |
| pålitliga låtar (14) ≤ 3,23 s | 8 | 8 | 6 | 8 |

- Mot k2c vinner fusion-h utfl_min (0,74 → 0,32) och förlorar utfl_tid (1,39 → 1,62; l1011 1,35 → 4,38 enligt jokern). Det är ett
  byte, inte en ren vinst: i poäng ungefär +51 mot −11 procentenheter på de två måtten.
- Låt 15 avgör övningen och går inte att förutsäga (sond 5,7–7,4, domare 2,16 för bas). Det är samma myntkast som basen själv vilar på.
- 14 s är inte trimmat mot låtarna – det är tolkningens etableringstid (38 varv) – men jokern skriver själv att de första 14 s inte
  är identiska med k2c:s (0–57 % lika prov per låt). Kontrollmängden är alltså ett nytt myntkast även om övningen håller.

## Röst: MÄT fusion-h som samrad-2
- Mekanismen går att motivera (kronan och spärren förutsätter ett tempo som satt sig), utgången är bestämd i förväg, och det kostar
  en mätning.
- Håller den båda mängderna är den bättre än k2c på det ägaren satt först: utfl_min på k4b:s nivå med k2c:s tid i fel tolkning
  nästan kvar.
- Faller den: inga fler sökningsvarianter. Då står k2c och k4b kvar som i mitt r2-förslag, och jag pekar fortfarande på k4b för DMX
  (summa DMX-mått på kontrollmängden +81 mot +54).

## Att läsa i mätningen
- `mix.still` för låt 5, 9 och 15 mot bas (2,93 / 2,48 / 2,16).
- utfl_tid för l1011 mot k2c:s – om 4,38 % står sig är det där priset ligger.
- lotus motfas och i fas: samrad-1 hade 7 och 68/115, inom 5 % men utan luft.
