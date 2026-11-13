# b2-svar k4

## Kontroll av jokerns j1c mot motorn (det som inte var sonderat)
`joker-j1c/dist` körd på de fyra övningsfiler jokern inte hann med (`k4-j1c-koll/`), mot dmx-1 och bas:
| fil | utflykter j1c / dmx-1 / bas | tid i utflykt % | prov där j1c ≠ dmx-1 |
|---|---|---|---|
| pop | 11 / 11 / 9 | 1,69 / 1,69 / 2,04 | 0 av 5922 |
| megamix | 6 / 6 / 7 | 0,27 / 0,27 / 0,99 | 503 av 5922 (8,5 %) |
| lang1021 | 15 / 15 / 14 | 11,78 / 11,78 / 11,64 | 0 av 2961 |
| lang1028 | 15 / 15 / 15 | 1,94 / 1,94 / 1,94 | 0 av 5922 |
- Att ta bort villkoret "tempogrammet osäkert" gör INGENTING på tre av fyra filer och ändrar megamixen utan en enda ny utflykt. Med övningsmixens 0 av 2230 falska domar: vittnet med 1 + 2 + 4 slag rättar inte i onödan på 86,7 min övningsljud.
- Bygget är äkta: diffen mot dmx-1 är tre rader (`PW_MIN` 0,5 → 0,75, `pwSim` med ett slag till, villkoret bort i `pwJudge`).

## Håller med
- **Jokern om kontrollens fel:** en eller två låtar stadigt fel med ett SÄKERT tempogram. Samma räkning som min (12,5 pe per låt).
- **Jokern om dmx-1b:s 0,007 s:** ett veto i låt 2 flyttar fintempots gitter (114,2 mot 114,0); samma tempogram, samma lås. Ingen mekanism att laga i vittnet.
- **Jokern om varför 2 + 4 slag var blint:** fantomens 2 och 4 slag är 3 och 6 riktiga. Ett slag (1,5 riktiga) är den förskjutning som skiljer. 70,7 → 92,7 % är en mätt skillnad, inte en trimning.
- **k2 om vad en mätning är värd:** det viktiga är om övningens +13,99 är något på nytt ljud – det har vi nu svar på (+8,44, ny ledare).

## Parabeln och den riktade kronan: ALTERNATIV, inte ett par
Båda ligger i `onsetStep` men på olika rader (kronan avgör VILKEN kandidat som vinner, parabeln VAR mellan stegen tempot läggs), så de går tekniskt ihop. De siktar på samma mått och ska inte mätas i samma variant – då vet vi inte vilken som bar.
| sond på dmx-1b | låt 5 | övriga flyttade | stilla-median | mer än måttet |
|---|---|---|---|---|
| riktad krona (k2) | 3,2 → 2,9 | låt 6 0,85 → 0,15, låt 15 11,3 → 8,4 | ~3,03 | – |
| parabel (k4) | 3,2 → 2,9 | låt 10 8,55 → 3,55, låt 8 9,45 → 7,95, låt 15 11,3 → 9,0 | 3,00 | klocka–tempogram 0,20 → 0,10 % (median, hela mixen) |
Lika på låt 5. Med gränsen 4,0 är ingen av dem längre avgörande: måttet väger 1 av 11, och 3,24 → 3,00 är under en poäng. Jag håller parabeln för den som har ett mätt skäl utöver måttet, men den riktade kronan är den mindre ändringen. **Högst en av dem, och inte i samma bygge som vittnet.**

## Röst: dmx-2b (jokerns vittne på ledaren) + parabeln på dmx-1b

**Variant 1 = dmx-2b: `dmx-1b/src` + jokerns två ändringar** (`pwSim`: 1 + 2 + 4 slag, `PW_MIN` 0,75; `pwJudge`: villkoret bort). Det är den enda idén på bordet som kan flytta rätt-tempo på kontrollen, och den är den enda som siktar på det ägaren kallar viktigast. Min kontroll ovan säger att den inte skadar övningsljudet.

**Variant 2 = dmx-2c: `dmx-1b/src` + parabeln** (`k4-parabel/src`, bara `onsetStep` + två fält). Mäts på övningen för poängens skull; går in i ledaren först om den bär där.

## Utgången i förväg
- **Kontrollens enda dom går till dmx-2b** om den är godkänd på övningen (mix_las = 2,78, mix_klocka ≥ 98,2, utfl_min ≤ 0,26, mix_still ≤ 4,0).
- **Ny ledare** = dmx-2b slår +8,44 utan DISK. **Idén bar** bara om mix_klocka eller klipp_klocka går minst +1,0 pe över dmx-1b (84,53 / 86,45); slår den +8,44 på småposter utan det är den ledare men självlikheten har inte tagit felet.
- **Föll** om rätt-tempo ligger inom ±0,5 pe (felet är inte ett syskon mönstret kan peka ut → självlikheten läggs ner) eller går NER > 0,5 pe (vittnet rättar åt fel håll, t.ex. tretakt). Då står dmx-1b kvar.
- **dmx-2c bar** om övningen ger mix_still ≤ 3,10 med mix_las, utfl_min, mix_hopp och mix_klocka inte sämre än dmx-1b. Då läggs den på ledaren i omgång 3. Annars inga fler ändringar i sökningen.

## Det jag inte vet
- Tretakt och 6/8: finns inte i övningen, och är just där ett vittne som får rätta ett säkert tempogram kan göra skada. Min kontroll säger ingenting om det.
- Om megamixens 8,5 % ändrade prov är rätt eller fel håll (inget facit där).
- Vad parabeln gör med rutnätets fas; syns först i tvavagar.
