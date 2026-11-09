# a8f – finalen: f0 med a8r:s tempogram, valt för kontrollmängden

**IDÉN.** Strukturen är f0:s: en klocka i analysatorns långsamma väg (`analyserClock.ts`), gridK och KRAV 1–5. Tempogrammet och fintempo-skanningen är bytta tillbaka till a8r:s (del B i f0:s dubblettjämförelse). Det är 2 hypoteser per hop med fönster 5 s och samma tidskonstant, och sökvarvets fönster räknas en gång med additiv fas. f0:s A-tempogram (3,5 s, minne 0,4) och relock-ettan är bortvalda.

Skälet är kontrollmängden, som avgör finalen. Där var a8r (B, r0-struktur) bäst av finalisterna: −4,24 mot f0 −13,5, med latens 110 mot 135 ms (bas 100). Den varianten fick också lägst lampspr-fall (−9,9 % mot −12 %). Orkestratorns diagnos lägger latensfelet på A:s snabba låsning: a2r 160 ms, f0 135, r0 155 och a8r 110.

## DELAR mot f0 (`mot-f0.diff`, 87 rader, bara analyserClock.ts)
| del | mekanism | var | bär |
|---|---|---|---|
| D1 | tempogrammet B: 2 hyp/hop, TG_A och oktavens EMA = 1 − √(1 − a), fönster 5 s (A:s TG_WIN_MS 3,5 s / TG_A 0,4 bort) | analyserClock.ts:111–113, tgScore-fönstret | övning: mix_hopp 0,03, gridfel 14,7 (bas 15,1, f0 19,4), ned_s 1,90; kontroll (a8r): latens 110 mot f0 135, poäng −4,2 mot −13,5 |
| D2 | onsetStep: fönstret en gång per sökvarv + additiv fas (Pi-budget) | analyserClock.ts:180–195 | taktvägen ~−25 % µs/hop, bit-nära (spåret lika på 2 decimaler) |
| D3 | relock utan "etta i ankaret" (f0:s rad i relock bort) | analyserClock.ts:334 | med B gav relock-ettan ned_s 2,80 = DISK (f0:s tabell, "B+relock") |

D1 och D3 hör ihop (B + relock-ettan = DISK). D2 kan mätas ensam.

## KRAV EN KÄLLA (fil:rad i `a8f/src`, ärvt från f0)
| # | punkt | var |
|---|---|---|
| 1 | en temposökning | analyser.ts:1769 setClock, :33 klockan i analysatorn; analyserClock.ts:356 kickgrind = klockans inre rutnät + KICK_PHASE_MS (:108), tempogrammet :113 |
| 2 | en tillit | analyserClock.ts:360, split.ts:244 (ramen och setClock); effects.ts:1772/1672/1675, hasBeat |
| 3 | en takträknare | effects.ts:2010–2027 (rutnätets index, `>> 1`, en paritet, gridK :2020) |
| 4 | en pulskurva | effects.ts:1302 |
| 5 | låtgränsen | analyser.ts:1771, split.ts:236 H_BOUND, analyserClock.ts:350 → relock() :334 |

## SIFFRORNA (M1 = tvavagar.json, övning)
`a8f +2,50 (f0 +8,69 med bonus 1) | långsamma +4,17 | latens 85 ms | ljusdomaren +6,9 utan spärrar | upp/ned 1,35/1,90 | p99 6 hop (bas 7)`.
- **Mot f0 på övningen, sämre:** mix_las 2,10 → 3,29, mix_still 2,84 → 3,65, gr_ratt 11 → 9/15, gr_falska 0 → 1, latens 80 → 85, ettan 100 → 95,65 (136 BPM).
- **Mot f0 på övningen, bättre:** gridfel 19,4 → 14,7 (under bas), ned_s 2,15 → 1,90, ljuset +5,6 → +6,9.
- **Robusthetskörningar.** Jag använde 4 av 6: rytm.py --live-kick på lang-20261028T181533, systerinspelningen till kontrollens lang1028.

| | lampspr | t90 | lyft | jitter |
|---|---|---|---|---|
| bas | 0,275 | 20 | 0,49 | 33 |
| f0 | 0,281 | 25 | 0,37 | 30 |
| a8r | 0,288 | 30 | 0,37 | 44 |
| f0 med basens effects.js | 0,277 | 15 | – | – |

  Lampspr-fallet syns inte här, så det reproduceras inte på systerfilen.
- **Kickdiagnos (eget skript, lang1021 100–155 s, ~160 BPM).** f0-familjens kickar kommer ~60–70 ms FÖRE basens. Det är galopp-mönstret med 3 kickar per 2 slag. Basens skuggrutnät höll grinden stängd för förtransienten, så kicken föll på huvudanslaget. KICK_PHASE 0/−40/90, grinden av, konfidensgränsen 0 och spärren 170 ms ändrade inget av det (ungefär 50 % av basens kickar saknas inom ±60 ms i alla varianter). Trolig latensmekanism: kicken triggar på en svagare förtransient, lyftet blir mindre (0,49 → 0,37) och spärren blockerar huvudanslaget. Den är **inte åtgärdad**: jag hittade ingen ändring som flyttar kickarna.

## WORKERN
Domarens realtid: worker 42,3 µs/hop (bas samtidigt 50,7; gräns 130), p99 6 hop. D2 skapar inga objekt: fält på klassen och skalärer. D1 dubblar tgScore-anropen men allokerar inget.

## RISKEN
- Valet vilar på a8r:s kontrollsiffror. a8f har dessutom f0:s struktur och gridK (fusion-b var bit-identisk med a8r i alla 17 mått på övningen), men kontrollmängden har inte mätts med den. Där var a8r DISK på upp_s (−0,30 mot −0,65) och lampspr lang1028 −9,9 %, och a8f ärver troligen båda.
- Den långsammare omlåsningen ger 1 s sämre mix_las och 2 låtgränser färre på övningen än f0.
- Kicken på förtransienten vid snabb galopp är kvar (se ovan).
- cpu-kvoten 1,13 räknas inte på kontrollen. Huvudtråden är orörd.

KLAR a8f poäng -6.19 OK krav 5
