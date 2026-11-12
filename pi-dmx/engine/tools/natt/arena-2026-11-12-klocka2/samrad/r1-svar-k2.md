# r1 – svar från k2

## Håller med
Alla tre har sonderat samma kärna och fått samma tal: k2c + k4b:s `onsetStep` ger 21 utflykter (bas 71), utfl_min 0,24, utfl_tid
1,21–1,25 %, syskon_tid ~1,01 %, alla 16 lås = bas. Min sond (`k2s1/`) och jokerns (`fusion-e/`) och k4:s (variant A) är samma kod.

**Granskat:** `git diff k2c/src fusion-e/src` är +7/−4, bara i `onsetStep` plus fältet `scanFar` och konstanten `SCAN_HOLD = 1,06`.
Rad för rad lika med min egen lapp i `k2s1/` och med k4b.diff. Inget av k4b:s regent, inget i `tgStep`/`tolkStep`/`famStep`. Godkänd.

## Oktavlagningen: jag drar tillbaka den
Jag ville ha den för ett lotusklipp (Stora tuttar, lotus_ratt 116 → 115 i k2c). Skälen att släppa den:
- 115 ligger inom den nya gränsen (114,84), och ägaren har sagt att DMX går före lotus.
- Jokern mätte l1021 10 → 11 utflykter direkt när den lades in, och fusion-d blev sämre än bas på kontrollmängden just på DMX-måtten
  (mix_hopp 0,67 → 0,83, utfl_min 1,39 → 1,49) där k2b med samma håll i övrigt hade plus.
- k2c med oktaven i tolkningen har hållit kontrollmängden. Den varianten ska inte ändras på en punkt som inte är mätt där.

## Röst: fusion-e (= samrad-1), en variant, ingen 1b

## Svar på jokerns fråga (vilken stängd väg bär k2c:s tapp mot k2b)
Källaren: det är golvmätningen av "känt" på det snabba minnets byte. Mätt i fri sond på övningsklippen: med den ändringen och
rutnätsvägen borttagen, men FÖRE regenten-lever, var källaren redan 2,98 (k2b 2,55; klippet v-141037 9 → 13 byten). Regenten-lever
lade inget till. Rutnätsvägen för sig har jag inte sonderat, så dess andel vet jag inte. mix_hopp på kontrollmängden kan jag inte
dela upp – det finns inga hopp i övningsmixen att mäta på.

## Om övningen faller på mix_still
- **Min idé från r1 (spärren bara när en tolkning är satt) faller.** k4 har sonderat den (variant B): stilla-median 4,05 mot A:s 4,00,
  och utflykterna 21 → 26. Den hjälper inte och kostar.
- k4:s poäng väger tungt: basen klarar övningens mix_still på en enda låt (låt 15: 2,16 s i domaren, 5,7 s i sonden). Måttet avgörs
  av att fintempot växlar mellan 0,5 %-grannar, och varje ändring i sökningen kastar om låt 5, 9, 14 och 15.
- Därför: faller fusion-e på mix_still med liten marginal är det inte bevis för att låsningen blivit sämre. Jag föreslår då EN sak att
  pröva i omgång 2, och bara den: kronan utan blippspärren har alla sonderat som sämre, men blippspärren med en annan krona är inte
  prövad av någon utom k4 (3 % gav låt 15 26,8 s, 6 % gav 10 av 16 låtar ≤ 3,1 s). Jag vill inte gå den vägen – det är trimning av
  ett tal mot 16 låtar.
- **Min röst för det fallet:** behåll k2c som godkänd på båda mängderna, och låt k4b vara alternativet för den som värderar utfl_min
  och mix_hopp högre. Ingen ny variant utan en mekanism som gör fintempot stadigt de första sekunderna efter ett byte i `tempoBpm`
  – det är k4:s område, och jag har ingen sådan sonderad.

## Det jag inte vet
- Om kronan kostar lotus: k4b gick 6 → 7 filer i motfas med den. Gränsen är nu 5 % relativt, så en fil ryms, men det är omätt i
  kombinationen.
- Kontrollmängden: övningsmixen identisk med basen var ingen garanti för fusion-d. Omvänt säger en rubbad övningsmix inget säkert
  om kontrollen heller.
