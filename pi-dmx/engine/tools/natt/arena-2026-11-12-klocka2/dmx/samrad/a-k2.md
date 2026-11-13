# a – k2: var tiden går vid ett låtbyte, och tre nya vinklar

Allt nedan är fria sonder på övningsmixen (16 låtar, 15 låtbyten, 42 min), basens bygge. Jag spelade in klockans råsignaler
(basens stigning, diskantens anslag, kickarnas tider) en gång och räknade offline. Mapp: `.arena/klocka2dmx/k2-signal/`
(`sig.mjs`, `an.py`–`an4.py`). Ingenting är mätt i domaren.

## Först: var går tiden vid ett låtbyte?
| | rätt tempo från (median, s efter övertoningens slut) | aldrig | rätt inne i låtarna |
|---|---|---|---|
| klockan i dag | **2,75** | 0 | 99,5 % |
| tempogrammets RÅA topp, 3,5 s-fönstret, utan minne och krona | **1,0** | 0 | 93,6–94,6 % |

Signalen vet alltså det nya tempot 1,75 s innan klockan byter. De sekunderna är bekräftelse (minnets EMA + kronan i två varv), inte
hörsel. Därför prövade jag först om en klokare BESLUTSREGEL kan ta dem – det kan den inte:

| beslutsregel på samma signal | rätt nytt tempo (median) | falska inne i låtarna |
|---|---|---|
| dagens (kvot ≥ 1,35 två varv) | 2,7 s | 0,11/min |
| kvoten STIGER tre varv i följd (övertoning = trend, fill = hopp) | 2,55 s | 0,24–0,49/min |
| hela tempogrammets form byter (likhet mot profilen 3 s tidigare) | 2,1–2,4 s | 0,08–0,31/min |
| råa toppen står på samma nya tempo K varv | K=4: 2,8 s · K=3: 2,2 s · K=2: 1,5 s | 0,14 · 0,33 · 1,33/min |

Varje regel som är lika säker som dagens är lika långsam. Dagens klocka ligger redan på gränsen för vad den här signalen tillåter.
Ska låset bli snabbare måste SIGNALEN ändras, inte regeln. Det styr de tre vinklarna.

## Vinkel 1 – bandet som bär pulsen (störst, och ny)
**Mekanism.** I dag är varje tempos poäng basens vikning GÅNGER diskantens. En ny låt som börjar utan bas (intro med hi-hat, gitarr,
klapp) får då låg poäng för sitt rätta tempo tills basen kommer in. Låt varje band rösta för sig och multiplicera bara när båda har
en puls; saknar basen puls helt (ingen topp över sitt eget golv på något tempo) gäller diskantens röst ensam.

**Sond (råa toppen, 3,5 s, rätt nytt tempo från):**
| låt | 2 | 3 | 4 | 7 | 8 | 9 | 10 | 11 | 13 | median | aldrig | rätt inne i låtarna |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| bas × diskant (dagens) | **4,2** | 0,2 | **2,6** | 1,0 | 7,8 | 1,0 | 2,2 | 1,8 | 0,6 | 1,0 | 0 | 93,6 % |
| bara diskant | **0,6** | 0,6 | **0,6** | 1,0 | – | 1,4 | 2,2 | 2,2 | 3,0 | 1,0 | 1 | 90,5 % |
| bara bas | – | −0,2 | 3,0 | 1,0 | – | 2,6 | 7,0 | 1,4 | 7,4 | 1,4 | 2 | 83,1 % |

Låt 2 och 4 är just de svaga låtstarterna som fällde k2, k4 och fusion i går (lås 3,0 och 3,3 s i basen; 5,7 s när något höll emot).
Diskanten ensam hör dem 3,6 och 2,0 s tidigare. Den är sämre på andra låtar (13, 9), så den ska inte ersätta produkten utan ta över
när basen är tyst.

**Borde vinna:** mix_las (dubbel vikt) på låtar med svag start, och mix_klocka med samma sekunder. **Kan falla:** diskanten ensam
väljer oftare fel inne i låtarna (90,5 mot 93,6 %); villkoret "basen saknar puls" måste vara ett mått på basen, inte ett tal mot
16 låtar. Låt 8 (7,8 s) hör inget band – den lagas inte av det här.

**Billig sond som avgör:** samma offline-räkning med regeln "diskanten ensam när basens bästa vikning ligger under sitt golv"
i stället för hela tiden. Blir låt 2 och 4 < 1,5 s utan att "rätt inne i låtarna" går under 93,6 % är den värd en mätning.
Inte körd (maskinen delas med ommätningen).

## Vinkel 2 – det senaste väger tyngst (en spanare, inte en domare)
**Mekanism.** Ett fönster på 3,5 s är till hälften förra låten i 1,75 s efter ett byte. Vik samma ring med vikter som avtar bakåt
(tidskonstant ~1,5 s) i ett tredje minne som bara får FÖRESLÅ ett byte; de vanliga minnena bekräftar. Fönstret blir inte kortare
(lika många slag), men det nya hörs först.

**Sond:** rätt nytt tempo från median **0,6 s** (jämnt fönster 1,0 s); 8 av 15 låtbyten tidigare, 2 senare eller aldrig (låt 2 och
13). Rätt inne i låtarna 88,3 % (jämnt 93,6 %).

**Borde vinna:** 0,4 s på mix_las i medianen. **Kan falla:** som ensam domare är den klart sämre (88 %), och beslutstabellen ovan
säger att bekräftelsen äter upp det mesta av försprånget. Jag tror mindre på den här än på vinkel 1; den är med för att siffran finns.

## Vinkel 3 – taktens mönster i stället för slagets (osonderad)
**Mekanism.** Fel tolkning (4:3, 3:2) har slag, men ingen TAKT: virveln på 2 och 4 ger en topp per två slag bara på rätt tempo.
Vik diskanten på två slags period för varvets kandidater och dess syskon; den som har störst skillnad mellan "slag 2" och "slag 1"
är pulsen. Det är en annan fråga än k3:s passform och k5:s underdelning: de tittade inom slaget, det här tittar över takten.

**Borde vinna:** mix_klocka och klipp_klocka (dubbel vikt) där klockan sitter stadigt på fel syskon – det som gör kontrollmängdens
83 % mot övningens 98 %. **Kan falla:** fyra-i-golvet med hi-hat på varje åttondel har ingen skillnad mellan slag 1 och 2; då måste
den tiga, inte gissa. Övningen har nästan inga sådana fel (99,5 % rätt inne i låtarna), så en sond här kan bara visa att den inte
förstör, inte att den vinner.

**Billig sond:** på råsignalerna, per 8 s-fönster inne i låtarna: hur ofta har facit-tempot störst två-slags-skillnad bland sig
själv och sina fyra syskon? Under ~90 % är den inte värd att bygga.

## Prövat och förkastat i dag (så ingen gör om det)
- **Låsa på kickarnas TIDPUNKTER** (intervall mellan kickar, 4 s): rätt nytt tempo i 2 av 15 låtbyten, aldrig i 13. Kickarna är för
  glesa och sållas av klockans eget rutnät; de är inget oberoende vittne.
- **Trend, formbyte, stadig rå topp** som beslutsregel: se tabellen överst. Ingen slår dagens regel vid samma antal falska byten.
- **Bara bas:** sämst av alla (83 % rätt inne i låtarna, två låtbyten aldrig).

## Vad jag inte vet
- Allt är räknat på EN mix med 15 låtbyten. Låt 2 och 4 är två låtar.
- "Rätt från" är min egen räkning (rätt i minst 2 s), inte domarens mix_las.
- Offline-vikningen är min efterbildning av `tgScore` i Python; den ger 93,6–94,6 % där jag inte har basens egen råa topp att
  jämföra med.
