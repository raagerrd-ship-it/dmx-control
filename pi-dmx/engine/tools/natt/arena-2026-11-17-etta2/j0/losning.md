# JOKERN j0 (etta2)

## IDÉN
Ettan väljs efter basens stigning, kickens återstart, basgången, backbeaten och a8:s basgångslandning: basens tonklasser byts på slaget och ligger kvar på nästa slag. Det är den enda delen som höll på okänd musik (mellan +5,18), så j0 är a8 oförändrad. j0b lägger till en strukturell del som inte rör tonhöjd: a7:s mjuka låtgräns.

## DELARNA
| del | från | vad den gör | mått | med? |
|---|---|---|---|---|
| landningen barP + bassPitchStep + transport (BS_BNOV/H_BNOV) | a8 | se a8/losning.md | 171840 63,4 -> 80,9, förskjutning 2 17 -> 0,7 %; mellan +5,18 | JA (j0, j0b) |
| BAR_KEEP 0,1 + barRot (barP roteras också) | a7 | 10 % av minnet följer med över en osäker (soft) låtgräns, vridet med jr | ovanpå a8: 171840 omval 0,89 -> 0,44, etta 80,9 -> 81,8; 200719 69,5 -> 69,2, omval 1,35 -> 1,47 | bara j0b |
| kromabyte | a1 | samma sorts information som a8 (a8:s harmoniska summa når 1,5 kHz) | mellan -0,20 | NEJ |
| varaktighet | a2 | energiklass som K/R | mellan -5,16 | NEJ |
| hierarki + diskanttopp | a6 | lyfte bara 171840 | mellan -0,62 | NEJ |
| cymbal, tvåtakt, återkomst | a3/a4/a5 | negativa eller ~0 på övningen | | NEJ |

## SIFFRORNA (ettdom, övningen; bas 76,7 / 0,93 / 78,2)
| | poäng | etta | omval | paslag | 151659 | 171840 | 200719 |
|---|---|---|---|---|---|---|---|
| j0 m1 (= a8, bit-identisk) | +6,84 | 82,6 | 0,75 | 78,2 | 97/1/0/1 | 81/6/1/12 | 70/8/15/8 |
| j0b m2 (a8 + a7) | +7,60 | 82,8 | 0,64 | 78,2 | 97/1/0/1 | 82/7/3/9 | 69/8/17/6 |

j0b:s vinst kommer också den bara från 171840 (ett blockbyte mindre ger omval -0,45). 200719 blir lite sämre: vid 1000-1020 s bär det överförda minnet förskjutning 2 över gränsen, vilket är a7:s kända risk. Därför ligger j0 = a8 kvar som leverans. j0b ska bara ersätta j0 om den slår j0 på mellanmängden.

## TAKET PÅ ÖVNINGEN (egen analys mot Beat This)
Jag delade a8:s felaktiga tick efter om de ligger inom 16 s från en Beat This-takt som inte har 4 slag. I ren 4/4 är felet bara 1,0 / 4,2 / 6,8 % (151659/171840/200719). Resten (1,6 / 14,9 / 23,7 %) ligger där facit själv lägger takter med 1, 2, 3, 5 eller 6 slag, till exempel 200719 595-608 s med 15 tvåslagstakter. Dit hör också 200719 100-130 s, där tempot är fel (motorn ~89 bpm, Beat This ~176). Det som går att rätta på övningen är alltså ~4 % av tiden. I 200719 är det långsam återhämtning efter riktiga oregelbundna takter (770-823 s förskjutning 1 i alla varianter). Varje ny del som "vinner" på övningen vinner därför i facitbrus eller i en enda låt (171840 145-195 s, som a1, a2, a6 och a8 alla lagade). a8 självt gick inte att göra robustare utan att trimma på det bruset, så jag mätte inget sådant.

## WORKER-VÄGEN (ladan kör delat läge)
Kontrollerat i koden, konsekvent:
- Bänken (konsertReplay `--delad-cfg`) kör snabb och långsam analysator med inlinePeer. bigState-fältet BS_BNOV (BIG_STATE_LEN 25, bigCopy har rätt storlek) prövas alltså på bänken.
- Taktvägen H_BNOV (HOP_REC_LEN 20, HopLaneFast skriver, HopLaneSlow läser in i `fr.bassNov` före `feed.update`) prövas INTE på bänken. Skrivning och läsning är symmetriska och index 19 är fritt.
- Lagget i bassPitchStep använder `dBpm`. Det är snabba sidans `localBpm`, som klockan själv sätter (`setClock`; i workern via `hopLane.clockBpm`), och det skickas genom B_ENVBPM. Lagget följer alltså klockans tempo i båda lägena (en källa).
- Live är bassNov några hop senare än inline, eftersom workern läser bigState asynkront. Det är litet mot ett slag på ~430 ms, och medlet tas över hela slaget.
- a7-delen finns bara i BeatFeed och körs lika i workern. barTmp allokeras en gång.
- ANALYSER_SHARED.md5 är inte omskriven (görs med analyser_shared.py --write vid porten till lotus).

## RISKEN
Samma som a8: brum och rumsbas i live-micken ger stabila tonklasser (rösten tystnar), breaks utan bas ger brus i P, och fel oktav på tempot ger fel jämförelseavstånd. j0b dessutom: en riktig låtgräns som bara bedöms som soft bär 10 % av förra låtens etta i ~10 slag.

## DIFFEN
`j0/j0.diff` (`git diff --no-index src .arena/etta2/j0/src`, src = a8/src) och `j0b/j0b.diff`. j0b mot j0 är bara analyserClock.ts: BAR_KEEP, barTmp, barRot, `barReset(keep)` som roterar K/L/R/X/P, och `relock` som anropar `barReset(soft)`.
