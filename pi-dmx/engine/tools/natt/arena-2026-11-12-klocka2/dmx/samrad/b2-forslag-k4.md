# b2-förslag k4

## (1) Vad kontrollmängdens fel ÄR

Kontrollmixen är 8 låtar à ~2,6 min, alltså **12,5 % av tiden per låt**. Räkna baklänges från bas 83,41 %:
- 100 − 83,4 = 16,6 pe fel. **En hel låt = 12,5 pe.** Resten, ~4 pe, är sena lås.
- Det stämmer med det som redan står i `tools/natt/flerhypotes-2026-11-10.md` (öppen rapport, samma mix): lås per låt 6,51 · 3,02 · 0,90 · 1,83 · 7,52 · 0,64 · **153,85** · 0,06 s, och "mix_23 13 % är EN låt (Hopeless Nights, står på ~100 hela låten, låser aldrig i någon variant)".
- klipp_klocka 85,78 % över 17 klipp = 14,2 pe fel ≈ 2,4 klipp à 5,9 pe: samma låts två klipp plus småposter.
- syskon_tid 8,3 % och utfl_tid 4,7 % är mest de långa inspelningarna (lang1014, lang1107), inte mixen.

**Slutsats: kontrollens "rätt tempo" är till tre fjärdedelar EN låt som står stadigt på 2/3 eller 3/2 av katalogens tempo.** Vittnet rörde den inte av ett av två skäl, och båda var varnade i förväg: felet är stadigt med STOR marginal (vittnet får aldrig ordet), eller låten går i tretakt/6/8 (då har 3:2-läsningen ett riktigt mönster och vittnet håller med klockan). k4b:s +1,1 pe där är 1,3 s snabbare medellås på övriga låtar, inte den låten.

Följd: varje idé om tolkning döms på n = 1 på kontrollen. Ingen av oss kan vinna mix_klocka där med mer än ~1 pe utan att just den låten vänder.

**Övningsmaterial som liknar svårigheten:** inget i KORPUS_OVNING – 48 av 50 klipp ≥ 0,9 rätt, ingen låt står stadigt fel. Det som finns:
- lang1011 (96 ↔ 128) och lang1021 är VÄXLING, inte stadigt fel; vittnet löser lang1011 redan.
- frozen6 har 223 filer; övning + kontroll använder ~67. Finns katalogfacit för fler låtar är en "svår mängd" (de låtar där bas står < 50 % rätt) en timmes arbete för orkestratorn och det enda sättet att sondera tolkningsidéer. Jag har inte rört filer utanför övningslistorna.

## (2) FÖRSLAG omgång 2: dmx-1b + FINTEMPOT MELLAN STEGEN (dmx-2)

**Mekanismen.** Klockans egen sökning (`onsetStep`) väljer i dag bästa av 11 tempon i 0,5 %-steg och lägger tempot PÅ steget. Två nästan lika bra grannar ger då ett tempo som hoppar ett helt steg mellan sökningarna (114,0 ↔ 114,6). Lägg toppen med parabel genom vinnaren och dess två grannar – exakt det `tgStep` redan gör för tempogrammets topp. Inget nytt tal, ingen tröskel.

**Ändringen (bas `dmx-1b/src`, bara `onsetStep` + två fält):** spara varje kandidats råa poäng (`scanS[c + 5]`, förallokerad Float64Array(11)) och vinnarens index; efter sökningen `bestBpm = scanC0 · (1 + (bestC + off) · scanStep)` med `off` = parabelns förskjutning, klämd ±0,5. Kronan och blippspärren orörda. Byggd och sonderad: `k4-parabel/`.

**Sond (fri, diag-kedjan; för dmx-1b stämmer den med domaren på 15 av 16 låtar, låt 5: 3,20 mot 3,24):**
| | dmx-1b | + parabeln |
|---|---|---|
| stilla-tid låt 5 | 3,20 | **2,90** |
| låt 10 | 8,55 | **3,55** |
| låt 8 / låt 15 | 9,45 / 11,30 | 7,95 / 9,00 |
| övriga 12 | – | oförändrade |
| median (gräns 3,233) | 3,15–3,24 | **3,00** |
| lås efter låtbyte (16) | = k4b | oförändrade |
| utflykter ovn / pop / mega / l1021 / l1011 / l1028 | 1 / 3 / 0 / 5 / 5 / 7 | 1 / 3 / 0 / 5 / 5 / 7 |
| tid i utflykt, samma | 0,06 / 1,52 / 0 / 8,32 / 2,16 / 2,16 | 0,06 / 1,66 / 0 / 8,39 / 2,16 / 2,19 |
| klockans avstånd till tempogrammets tempo inne i låtarna, median | 0,20 % (bas 0,20 %) | **0,10 %** |

Varför det är mekanism och inte lott: (a) samma ändring ovanpå samrad-1 i går flyttade låt 5 4,0 → 3,2 och låt 9 8,3 → 4,2; i två olika byggen har sex låtar blivit bättre och ingen sämre; (b) avståndet klocka–tempogram halveras över hela mixen, inte bara i de 5 s måttet tittar på.

**Utgången i förväg**
- **Bar:** övningen godkänd med mix_still ≤ 3,10 (minst 0,13 s luft, inte 0,007), mix_las = 2,78, utfl_min ≤ 0,26, mix_klocka ≥ 98,2; då kontrollens dom, och där ska den slå k4b:s +7,59.
- **Föll:** mix_still > 3,233, eller något av utfl_min / mix_hopp / mix_las sämre än dmx-1b. Då ingen fler variant av sökningen (samma regel som i går), och k4b står kvar som ledare.
- Godkänd på övningen men under k4b på kontrollen: vittnet + parabeln läggs i idébanken, k4b står kvar.

## Det jag inte vet
- Vad parabeln gör med rutnätets FAS (gridfel, ettan): omätt, syns först i tvavagar på en finalist. Fasen sätts fortfarande på vinnarens vikning; bara tempot flyttas ≤ 0,25 %.
- Om låt 15 (10,57 s i dmx-1b, 2,16 i bas) kommer tillbaka; sonden säger 9,0. Medianen 3,00 räknar med att den inte gör det.
- Om "en låt" stämmer för dagens kontrollmix; siffran 153,85 s är från 11-10.
