# a6r – r-minsta: EN rad ovanpå r0 (låtgränsen släpper bara en klocka som inte är låst)

**IDÉN.** r0:s låtgräns (a4:s relock) nollade klockans tempogram vid VARJE låtgräns. Låtgränsen kommer ~10 s efter skarven, och falska
gränser kommer inne i låtar, så klockan som redan låst om på nya låten tappade minnet och hoppade (mix_hopp 0,08 -> 0,10). Nu gäller det
bara när klockans EGEN tillit (repeatRate, andelen kickar rutnätet förutsäger) är < 0,65: en låst klocka behåller tempot. boundaryCount är
fortfarande klockans enda låtbytessignal, och tilliten avgör bara om den behövs.

Diffen mot r0 är 4 rader (`mot-r0.diff`): `src/beatFeed.ts:98-100` (RELOCK_TRUST) och `src/beatFeed.ts:331`. Mot engine/src: `losning.diff`.

## KRAV (fil:rad i `.arena/entempo/a6r/src`; r0:s fem, rader +3 i beatFeed.ts efter rad 97)
| # | punkt | var |
|---|---|---|
| 1 | en temposökning | analyser.ts:1102, 1734 (sökningen borttagen), :1768 `setClock`, :1511/1707 R_CLOCK, :2371 spärren, :2389/2516 grinden; beatFeed.ts:338 (inre rutnät + KICK_PHASE_MS, null i coast), :394 kallstart, :244-251 oktavkant/krona |
| 2 | en tillit | beatFeed.ts:341 (frame.bpm/bpmConfidence = klockan), split.ts:242; effects.ts:1772 trust, :1672/1675 frasräknaren, hasBeat (cfg.beat), B_CONF/profile.beat (localBpmConfidence = klockans) |
| 3 | en takträknare | effects.ts:2010-2019, :1359/1363 |
| 4 | en pulskurva | effects.ts:1302 |
| 5 | låtgränsen | analyser.ts:1770, split.ts:234 (H_BOUND), beatFeed.ts:331 (relock enbart på boundaryCount, nu tillitsgrindad) |

## DELAR
| del | från | måttet |
|---|---|---|
| allt i r0 (en källa) | r0 | r0: +0,76 i nya rankingen |
| relock bara vid tillit < 0,65 | a6 (tilliten som mått) + a4 (relock) | mix_hopp 0,104 -> 0,03 (-13 -> +26 %), poäng +0,76 -> +1,84 |

## MÄTT OCH VALT (3 av 3 --mat, poäng i nya rankingen, CPU ger ingen poäng)
| | tröskel | mix_hopp | mix_still | korta | grid40 | gridfel | ljus | poäng |
|---|---|---|---|---|---|---|---|---|
| r0 | (alltid relock) | 0,104 | 3,86 | 32,6 | 56,6 | 15,2 | +5,2 | +0,76 |
| M1 | 0,5 | 0,03 | 4,10 | 33,7 | 56,0 | 15,35 | +2,8 | +1,73 |
| M2 | 0,5 + ettan/breakminnet nollas ändå | identiskt med M1 | | | | | +2,8 | +1,73 -> **bär inte, bort** |
| **M3 (levererad)** | **0,65** | **0,03** | 4,10 | 33,3 | 56,7 | 15,2 | **+5,2** | **+1,84** |

**Bortvalt.** M2 (barReset/goodRep vid varje gräns) ändrade inget mått och är borttaget. Jag tog inte bort något mer ur r0. Inget av
r0:s delar gick att pröva för sig inom budgeten. Att leta CPU i r0 (huvudtråden +8 % mot bas, oklar orsak i profilen) slutade jag med
när regeländringen 02:35 kom.

## SIFFRORNA (M3 = tvavagar.json)
- **+1,84, OK** (r0 +0,76 -> +1,08 över r0). Långsamma +3,06 %, latens 85 ms (= bas), ljusdomaren +5,2 utan spärrar, upp_s/ned_s 1,35/1,90.
- Bättre än r0: mix_hopp +39 procentenheter, korta och gridfel som r0.
- Sämre än r0: mix_still 3,86 -> 4,10 (+7,1 -> +1,1 %), mix_las 3,49 -> 3,50, korta 32,6 -> 33,3 (+0,1 -> -2,2 %).
- **Workerns kostnad:** 26 us/hop (feedRealtid workerUs), mot bas 64,1, gräns 130. p99 5 hop (X = 22).
- **Allokering:** ingen ny. Ändringen är en jämförelse mot ett fält per låtgräns, och relock() är r0:s (fill av befintliga arrayer).

## RISKEN
- En klocka som låst FEL med hög tillit (2:3-mönster, där repeatRate ger fel tempo ~0,87 enligt korpusen 10-13) släpps inte av
  låtgränsen. Den måste då hitta rätt via tempogrammet. Det syns som mix_still -6 % mot r0.
- Tröskeln (0,65) är mätt på två värden. Tilliten ligger 0,5-1,0 inne i låtar, så holdout kan hamna på andra sidan.
- Tilliten når taktvägen samma hop som i r0. Inget nytt på Pi:n.
