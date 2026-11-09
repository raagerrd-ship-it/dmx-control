# r0 – EN KÄLLA i analysatorn (startpunkt för remixen)

**IDÉN.** Den enda tempokällan är analysatorns klocka i dess långsamma väg (beatFeed.ts i taktvägen: tempogram, rutnät, etta och tillit). Analysatorns egen sökning (computeBpm, scoreEnv/alignScore/shiftDetect) och skuggrutnätet är borttagna. Analysatorn, alltså kickgrinden, kickspärren, sectionBars, sektionernas långsamma sida och boundaryDetector, läser klockans bpm, tillit och ankare. Det gör också ramen och ljuset. Skuggans *beteende* finns kvar som en ren transform av klockans tillstånd: i coast/break är rutnätet null, vilket ger öppen grind och 170 ms spärr, alltså samma sak som skuggans bpm 0.

## KRAV (fil:rad i `.arena/entempo/r0/src`)
| # | punkt | var |
|---|---|---|
| 1 | en temposökning | analyser.ts:1102 och 1734 (sökningen borttagen), :1768 `setClock`, :1511/1707 (klockans bpm till långsamma sidan, R_CLOCK), :2371 spärren och :2389/2516 grinden på klockans rutnät; beatFeed.ts:335 (inre rutnät + KICK_PHASE_MS 45, null i coast), :391 kallstart ur tempogrammet, :241–248 oktavkant/krona ur klockans egen vikning |
| 2 | en tillit | beatFeed.ts:338 (frame.bpm/bpmConfidence = klockan), split.ts:242 (ramen och `an.setClock`); därmed effects.ts:1772 trust, :1672/1675 frasräknaren, hasBeat (cfg.beat), B_CONF/profile (localBpmConfidence = klockans) |
| 3 | en takträknare | effects.ts:2010–2019 (beatIdx = rutnätets index, `>> 1` vid halvering, paritet `& 1`, monoton spärr), :1359/1363 (pulsens paritet = rutnätets, pulseCount borta) |
| 4 | en pulskurva | effects.ts:1302 (beatEnv grindas med samma hasBeat som beatPulse/heartPulse, så golvbuggen är borta) |
| 5 | låtgränsen | analyser.ts:1770 (trackBoundaries), split.ts:234 (H_BOUND/H_QUIET i hop-recordet), beatFeed.ts:328 `relock()`; barReset vid >3 % och break-hållets tempojämförelse är borta |

## DELAR
| del | från | måttet i r1 / här |
|---|---|---|
| låtgräns → relock | a4 | mix_still −7 % (här 3,86 mot 4,15) |
| tillit = repeatRate, pulsgrinden | a6 | ljus −0,2 → här +5,2 |
| beatIdx = rutnätet + monoton spärr | a7 (+ egen) | koreografi-jitter (a7 −2,3) → här ljus +5,2 |
| klockans tillstånd (coast = öppen grind) | a5, a1/a8:s fynd | upp_s |
| kickspärrens tak 330 ms | egen, mätt | upp_s 2,85 → 1,35 |
| krona mot 4:3/3:2-syskon (1,35) | egen, mätt (orkestratorns 3/4-rotorsak) | ned_s 2,80 → 1,90 |

## A / B / sammanslagning (--mat, övningen)
| | upp_s | ned_s | korta | mix_las | mix_still | mix_hopp | klipp | ettan | gridfel | ljus |
|---|---|---|---|---|---|---|---|---|---|---|
| A skuggan kvar (bas) | 1,35 | 2,25 | 32,6 | 3,55 | 4,15 | 0,08 | 98,4 | 91,3 | 15,1 | – |
| B enbart klockan (M1) | **2,85** | 1,90 | 29,1 | 3,49 | 4,15 | 0,08 | 98,8 | 97,1 | 14,8 | +0,9 |
| B + spärrtak (M2) | 1,35 | **2,80** | 34,1 | 3,49 | 4,15 | 0,08 | 98,8 | 97,1 | 14,8 | +5,7 |
| + krona mot alla (M3) | 1,35 | 1,90 | 34,4 | 4,00 | 4,57 | 0,03 | 97,8 | 100 | 18,0 | +6,3 |
| **sammanslagning (M4 = levererad)** | 1,35 | 1,90 | 32,6 | 3,49 | 3,86 | 0,10 | 98,3 | 100 | 15,2 | +5,2 |

**Orsaken (mätt, inte gissad).** Sektionerna rangordnar kicktäthet. Spärren 0,6 slag på klockans tempo 87 (lang1011 141–320 s, där analysatorn sade 110–131) gav 414 ms, alltså högst 2,4 kickar/s. Det blev en platt täthet (44 kickar mot basens 55–69 per 20 s). Taket 330 ms gav 148 kickar/min mot basens 140. ned_s kom från att klockan växlade 96↔128 (4:3) varannat varv, och spärren och grinden växlade med. Kronan stoppar det. Grinden "öppen när fasträffarna < 0,35" provades också (r0/verktyg/G_b*.json) och förkastades.

## SIFFRORNA (M4 = tvavagar.json)
- **Poäng −0,77, OK.** Långsamma +1,27 %, snabba −3,83 %, ljusdomaren +5,2 utan spärrar, p99 5 hop.
- Bättre: ettan 91,3 → 100, mix_still +7 %, mix_las +1,6 %, grid40 +1,2 %, mix_klocka +0,3 %.
- Sämre: cpu −7,7 % (huvudtråden 44,5 mot 41,3 µs/hop, bruset 6 %; profilen pekar på fft/process, inget i diffen), mix_hopp 0,08 → 0,10 (−13 %), klipp −0,1 %, gridfel −0,7 %.

## BORTVALT
- Analysatorns barShift flyttar inte längre klockan, så ettan är bara klockans. Analysatorns barAcc/resetBar finns kvar men läses inte av klockan. resetTempo från klockan är borta: det finns inget eget tempo att nolla.
- Kickfallback när klockan saknas: räknaren stegar på kickar bara när hasBeat är falskt.

## BUDGET
4 av 5 --mat. Orkestratorn bad om verifiering med tvavagarKor `lang` i egna körningar, och därför kördes ~20 sådana (45 s styck, `r0/verktyg/G_*.json`, grid.sh/med.py) och 4 fullfilsdiagnoser med kick.mjs. Övriga skript körde < 60 s.

## RISKEN
- Sektionsmedianerna står på en knivsegg: kronan 1,3 och 1,4 ger ned_s 2,80. Holdout kan falla åt andra hållet.
- Klockan får analysatorns tystnad (quietMs) och låtgräns med ett hops fördröjning. På Pi:n kommer klockans tempo till kickspärren 1–7 hop sent, och förr kom analysatorns eget tempo samma hop.
- Oktavkanten 80/160 avgörs nu av halvslagskvoten (EMA och hysteres 0,85/0,4) och inte av analysatorns tempo. Den är mätt på 5 kantlåtar, inte fler.
- frame.bpm är klockans flyttal (UI och inspelaren).

KLAR r0 poäng -0.77 OK krav 5
