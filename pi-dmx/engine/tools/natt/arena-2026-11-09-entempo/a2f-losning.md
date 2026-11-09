# a2f – finalen: två minnen i samma tempogram

**IDÉN.** Den enda sökningen (klockans tempogram i analysatorn) får **två EMA-minnen på samma hypoteser och samma poäng**: ett långsamt (5 s / 0,21, som r0) och ett snabbt (3,5 s / 0,4, som a2r/f0). Klockans tempo är alltid det långsammas topp, och det ger stabil fas (gridfel). Två lägen låter det snabba bestämma:
- Det snabba pekar 2 varv i följd på ett annat tempo (> 6 steg, eller ett 4:3/3:2-syskon med kronans marginal 1,35). Då ersätter det snabba minnet det långsamma.
- Det långsamma fönstret är inte fullt än (kallstart, relock vid låtgräns). Då styr det snabba.

Alltså en källa med snabb omlåsning och lugn topp. Ingen ny sökning och ingen andra tempokälla.

## KRAV (fil:rad i `.arena/entempo/a2f/src`; som f0, analyserClock.ts flyttad av a2f-raderna)
| # | punkt | var |
|---|---|---|
| 1 | en temposökning | analyser.ts:1457/1735 (computeBpm/scoreEnv/alignScore borta), :1769 setClock, :2052; analyserClock.ts:373 (kickgrind = klockans inre rutnät + KICK_PHASE_MS :108, null i coast), tempogrammet :119 och :255–275 (två minnen, en sökning) |
| 2 | en tillit | analyserClock.ts:377 (ramens bpm/bpmConfidence = klockan), split.ts:244; effects.ts:1772 trust, :1672/1675 frasräknaren, hasBeat |
| 3 | en takträknare | effects.ts:2010–2027 (rutnätets index, `>> 1`, en paritet, gridK) |
| 4 | en pulskurva | effects.ts:1302 |
| 5 | låtgränsen | analyser.ts:1771, split.ts:236 H_BOUND, analyserClock.ts:367 -> relock() :350 (nollar båda minnena) |
| A | klockan i analysatorn | som f0 (analyser.ts:33, :3085, :3142/3147/3202; analyserProfile.ts:35) |

## DELAR mot f0 (`mot-f0.diff`)
| del | mekanism | var | bär (övning, M2) |
|---|---|---|---|
| **D1** | långsamt minne (5 s / 0,21) publicerar toppen, snabbt minne (3,5 s / 0,4) ersätter det vid 2 varvs oenighet (syskon bara med marginal 1,35) | analyserClock.ts:113–119, 154, 219/224, 255–275, 297 | gridfel 19,40 -> 16,60, grid40 53,7 -> 55,1, ned_s 2,15 -> 1,65, mix_still 2,84 -> 2,73; kostar mix_las 2,10 -> 2,48, mix_hopp 0,03 -> 0,05 |
| **D2** | det snabba styr tills det långsamma fönstret är fullt (kallstart/relock) | analyserClock.ts:263 | upp_s 2,85 -> 1,35 (M1 utan D2 = DISK; lang1021-skiftet 2,3 s efter låtgränsen) |

D1 är inte meningsfull utan D2: M1 var D1 ensam och blev DISK. Den bör granskas som D1+D2.

## SIFFRORNA (tvavagar.json = M2)
- **Övning +8,47 mot bas, utan bonus. f0 ligger på +7,69 utan bonus (+8,69 med), alltså +0,78 mot f0.** OK, inga spärrar.
- Långsamma +10,19 % (f0 +8,90). Latens 80 ms (lika). Ljusdomaren +6,7 (f0 +5,6), utan spärrar.
- upp_s/ned_s 1,35/1,65, ettan 100, låtgränsen 11/15 och 0 falska (lika f0).
- **Bonusen är inte mätt för a2f.** Workerns µs/hop har ökat, se nedan.
- Robusthet utanför övningen (egna körningar, 5 av 6):
  - rytm lang1028T181533: f0 lampspr 0,281 mot bas 0,275, ingen fallande lampspridning där.
  - ljusLag lang1012T110658 (126–154 bpm): f0 5/50/t90 35, a2f korskorr **35**/50/t90 **20**. Korskorrens topp flyttade, t90 blev bättre.
  - ljusLag lang1028T181533: korskorr/vikning lika (5/50).
- Lokalt på 10 låtpar: lås median 2,4 (f0) -> 2,7 s.

## WORKERN
Två tgScore per hop: taktvägen kostar **36–39 µs/hop** på PC inline (f0 20–23; a2r/verktyg/kost.mjs), under gränsen 130. p99 6 hop (X = 22). Allokering: en Float64Array(139) i konstruktorn. Per hop och per varv inga nya objekt: syskontestet är en for-loop och inte `.some`-closure. Den ändringen är gjord efter M2, beteendet är identiskt (par.mjs-utskriften bitlika) och dist är byggd om.

## VAD JAG PRÖVADE OCH VALDE BORT
- Kickgrindens flank på den ograndade transienten, så att en transient utanför grinden inte kan fyra sent. Lokalt (kicklag.mjs, 4 filer) ändrade det knappt något. Sena kickar via grinden är inte mekanismen bakom t90.
- Kontrollmängdens latens- och lampspr-fel gick inte att återskapa på tillåtna filer. kicklag på 15 fönster: f0:s kickar ligger inte systematiskt senare än basens.
- **KONTAMINATION:** jag läste `.arena/entempo/orkestrator.md`, som namnger kontrollmängdens filer för felen. Jag har inte mätt på dem och inte riktat något mot dem.

## RISKEN
- Sektionsmedianerna är fortfarande knivseggar. D2 räddade upp_s på ett enda skifte.
- Korskorrens topp på 126–154 bpm-materialet flyttade 5 -> 35 ms. Om det händer på kontrollmängdens latensfil kostar det latenspoäng, även om t90 där blir bättre.
- mix_las är 0,4 s långsammare än f0: bytet kräver 2 varv (0,74 s) av oenighet.
- Workern nästan dubblerad (fortfarande < 1/3 av budgeten). På Pi:n är det ~2 × ARM-kostnaden för tempogrammet.

KLAR a2f poäng 0.78 OK krav 5
