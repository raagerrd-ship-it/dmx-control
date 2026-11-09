# t1b – t1f + kontinuerlig tillitsgrind i effekterna (riktad, ägarens default 08:25)

**RESULTATET.** Målet nåddes inte. Pop lampspr ligger kvar på −13,6 % (bas 0,331 -> 0,286), alltså DISK. Analysvinsten består: gridfel 13,2, långsamma +11,3, poäng +9,12.

Diagnosen ändrades under arbetet. Den binära `trust > 0,5` i effekterna var INTE mekanismen: att göra den kontinuerlig flyttade inte pop lampspr alls (0,285 -> 0,285).
Det som avgör pop är **manusets låtbeslut** (`manusTog`, effects.ts:973). Det fattas en gång, vid låtens första sektion. Låt 2 i pop börjar 131,6 s och beslutet faller 136 s. Där är den riktiga tilliten låg, och så ska den vara: tempogrammet ser två låtar. Därför blir låten ingen toggle-låt, och lookerna blir stege/kickregn i stället för f0:s chase/tryckvag i 450 s. f0 klarade sig bara för att dess tillit mättade (0,97 vid beslutet).

## DELAR mot t1f (`mot-t1f.diff`; mot-f0.diff = t1f:s D1/D2 + dessa)
| del | mekanism | var | bär |
|---|---|---|---|
| **D1** kontinuerlig punch-grind | Den uniforma per-slag-punchen (`perBeatPunch`) glider ut med tilliten, smoothstep 0,3 -> 0,7, i stället för att slås av/på vid 0,5. Den är identisk med förr vid trust ≥ 0,7 och ≤ 0,3. Chase-/drop-stegen (beatTick eller kick) är diskreta val och står kvar på `beatOk`. | effects.ts:1823–1827 (`punchLocked` borttagen) | Pop lampspr 0,285 -> 0,285 (rytm, egen körning): ingen effekt. Ofarlig, men ingen vinst. |
| **D2** tilliten oberoende av kickgrinden | Bara kickar inom kickgrindens eget fönster (inre ankaret + KICK_PHASE_MS, åttondelar, ±max(30 ms, 0,15 slag) som analyser.ts:2391) räknas in i `repeatRate`. Det bryter en återkopplingsslinga. Tilliten < 0,5 öppnar grinden, och kickar utanför rutnätet sänker då tilliten, som håller grinden öppen. Proben (t1f) visade pop 147–167 s: tydlighet 1,00 och stadigt 124 bpm, men `repeatRate` fast i 0,42–0,54 (f0 0,85–1,0). Med stängd grind är det exakt samma kickar som i f0. | analyserClock.ts:411–416 | M1 (med D1, D3): gridfel 12,0 -> 13,2, korta 32,97 -> 35,71. Lampspr i pop är oförändrad. |
| **D3** syskonen räknas inte som konkurrenter | Tempogrammets harmoniska syskon (4:3/3:2 = TG_SIB, samma som KRONAN, ±2 steg) utesluts ur "näst bästa". KRONAN låter dem ändå aldrig ta tempot. | analyserClock.ts:105, :262–268 | Mätt bara tillsammans med D1 (rytm pop 0,286) och i M1. |
| (bortvald) manusbeslutet låser bara på JA | Ett nej omprövas vid nästa nya look. | effects.ts:973 | **M2: pop lampspr −22,6 %**, lang1021 rAbest 0,310 -> 0,264, latens 85. Toggle-looker senare i låten var sämre för lampspridningen. Återställd. |

## SIFFRORNA (--mat, 2 av 3; tvavagar.json = M1 = koden)
| | poäng | långsamma | gridfel | grid40 | korta | latens | ljusdomaren |
|---|---|---|---|---|---|---|---|
| f0 | +7,69 (+1 bonus) | +8,90 | 19,40 | 53,7 | 32,18 | 80 | +5,6 OK |
| t1f | +9,75 | +12,33 | 12,00 | 60,28 | 32,97 | 80 | +5,9 DISK pop −13,7 % |
| **t1b M1** | **+9,12** | +11,28 | 13,20 | 59,41 | 35,71 | 80 | +6,0 **DISK pop −13,6 %** |
| t1b M2 (+ låsning på JA) | – | – | 13,20 | 59,41 | 35,71 | 85 | +3,2 DISK pop −22,6 % |

Övriga 14 mått är lika med f0. M1 gav worker p99 5 hop, väckning 17,7 µs/hop och cpu 45,8 µs/hop. D2 är några flyttalsoperationer per kick och D3 två jämförelser per varv; ingen av dem skapar nya objekt.

**lampspr / rAbest / ljus per övningsfil (bank.json):**
| | pop | megamix | lang1021 |
|---|---|---|---|
| bas | 0,331 / 0,412 / 0,345 | 0,324 / 0,334 / 0,295 | 0,303 / 0,227 / 0,311 |
| f0 | 0,367 / 0,372 / 0,285 | 0,317 / 0,362 / 0,318 | 0,360 / 0,313 / 0,360 |
| t1f | 0,285 / 0,464 / 0,440 | 0,378 / 0,435 / 0,383 | 0,325 / 0,309 / 0,389 |
| **t1b M1** | **0,286 (86 %)** / 0,462 / 0,441 | 0,377 (116 %) / 0,437 / 0,384 | 0,329 (109 %) / 0,310 / 0,392 |
| t1b M2 | 0,256 (77 %) / 0,452 / 0,461 | 0,377 / 0,437 / 0,384 | 0,301 / 0,264 / 0,320 |

Bara pop ligger under 94 %. Megamix och lang1021 ligger över bas, liksom rAbest och ljuset överallt.

## KRAV EN KÄLLA (5 av 5) och ARKITEKTUREN
- Fortfarande EN tillit: `repeatRate · tgClear` (analyserClock.ts:446) -> cfg.beat.confidence -> ram/kickgrind/profile.beat/hasBeat/trust/frasräknaren.
- D2 läser grindens geometri (KICK_PHASE_MS, samma tolerans som analyser.ts). Det är ingen ny tröskel och ingen kopia av tilliten.
- D3 återanvänder KRONAN:s TG_SIB.
- Klockan ligger kvar i analysatorns långsamma väg. Ingen ny ratt, ingen env och inga nya filer.
- Låsta regler: ingen fade-, strobe- eller vitt-väg är rörd.

## BUDGET
- **--mat:** 2 av 3 (M1, M2). Den tredje användes inte, eftersom egna körningar inte fanns kvar att sikta den med.
- **Egna körningar:** 3 rytm på pop (D1; D1 + låsning på JA; D1 + D3), 2 konsertReplay på pop (f0, t1b D1) och 1 probe på pop 128–200 s (startades om en gång efter ett utskriftsfel). Det blir 6–7 körningar, alltså budgeten eller en över om omstarten räknas.
- Ingen kontrollmängd användes.

## VAD SOM ÅTERSTÅR (för orkestratorn)
Pop lampspr avgörs av vilka looker låt 2 får. Det beror på manusets ENDA toggle-beslut 4,8 s efter låtgränsen, alltså när en ärlig tillit är som lägst. Mätningarna visar:
- M2: att ompröva beslutet senare i låten blev sämre, eftersom fler toggle-looker sent i låten sänkte lampspridningen.
- M1: att göra punchen mjuk påverkade inget.

Nästa steg är troligen att manuset fattar låtbeslutet när tilliten har satt sig, till exempel vid andra sektionen. Annars behövs att lookvalet för stege/kickregn tar hänsyn till lampspridningen. Båda är dirigentändringar som jag inte hann mäta.

KLAR t1b poäng 9.12 DISK krav 5
