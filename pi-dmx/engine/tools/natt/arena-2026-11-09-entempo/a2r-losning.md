# a2r – alternativ A: klockans tempogram som enda sökning, med snabbare fönster och minne

**IDÉN.** r0 hade redan alternativ A: klockans tempogram är analysatorns enda temposökning. Remixen ändrar bara tempogrammets fönster och minne, från 5 s / 0,21 per varv till **3,5 s / 0,4 per varv**. Med det gamla fönstret låg förra låten kvar i fönstret och minnet, så toppen bytte först ~4 s efter skarven. Nu går det snabbare, och den snabbare toppen blir inte mer flackig inne i låten (mix_hopp oförändrad 0,08). Tre rader i beatFeed.ts:100–104 och :213. Fintempo- och fasskanningen är som i r0.

## KRAV (fil:rad i `.arena/entempo/a2r/src`; ärvt från r0 oförändrat, radnumren flyttade +4 efter rad 100)
| # | punkt | var |
|---|---|---|
| 1 | en temposökning | analyser.ts:1102, 1456, 1734 (computeBpm/scoreEnv/alignScore anropas inte), :1768 `setClock`; beatFeed.ts:338 (kickgrindens rutnät = klockans inre + KICK_PHASE_MS), :395 kallstart ur tempogrammet, :256 oktavkanten ur klockans vikning; tempogrammet :100–104/:213 (a2r) |
| 2 | en tillit | beatFeed.ts:342 (frame.bpm/bpmConfidence = klockan), split.ts:242; därmed effects.ts:1772 trust, :1672/1675 frasräknaren, hasBeat, profile |
| 3 | en takträknare | effects.ts:2010–2020 (beatIdx = rutnätets index, `>> 1`, en paritet, monoton) |
| 4 | en pulskurva | effects.ts:1302 |
| 5 | låtgränsen | split.ts:234 H_BOUND, beatFeed.ts:332 `relock()` |

## DELAR
| del | från | mått (mot bas) |
|---|---|---|
| hela r0 (en källa, krona, spärrtak, relock, tillit, beatIdx) | r0 / a4 a5 a6 a7 | r0: +0,76 |
| tempogrammet 3,5 s / 0,4 | a2r (egen, 10 låtpar lokalt: lås median 4,1 -> 2,4 s) | mix_las +40,9, mix_still +31,5, gr_ratt +22,2, gr_falska +47,8 |

## SIFFRORNA (M3 = tvavagar.json)
- **+6,04 mot bas** (r0 +0,76, alltså **+5,28 mot r0**). OK, inga spärrar. Ljusdomaren +5,5 utan spärrar, upp_s/ned_s 1,35/2,15, p99 5 hop, latens 80 ms.
- Bättre än r0:
  - mix_las 3,49 -> 2,10 s
  - mix_still 3,86 -> 2,84 s
  - mix_hopp 0,10 -> 0,08
  - låtgränsen rätt 9 -> 11 av 15, falska 1 -> 0 (BoundaryDetector läser klockans tempo)
  - ned_s 1,90 -> 2,15 är sämre än r0 men inom bas (2,25)
- Sämre: gridfel 15,2 -> 22,1 ms (−46 % mot bas) och grid40 56,6 -> 53,1. Den snabbare toppen flyttar fintempot oftare, och då får vikningen fel fas en stund.
- **Jämförelse med a3r (sammanslagningen) på samma bas:** a3r −3,54 och DISK (upp_s 1,90, ned_s 2,50). A med snabbare tempogram vinner. A har tempomåtten och spärrarna, sammanslagningen tappar sektionerna.

## BORTVALT (mätt)
- **M1:** snabbt läge bara när fasträffarna < 0,7. Det visade sig vara på 85–94 % av tiden i pop, alltså i praktiken alltid. Resultat +4,19 men DISK: upp_s 1,50 och lampspr pop −11,3 %. Ett relativt villkor (träffarna < 0,6 × sitt 18 s-medel) slog aldrig till vid skarvarna, så lokalt var låsen som i r0. Det ger samma kod med färre rattar → alltid 3,5 s / 0,4.
- **M2:** M3 plus fintempo-skanningen kring tempogrammets topp, i stället för kring klockan. mix_still blev lika bra, men ettan föll 100 -> 93, gridfel 26 ms och ned_s 2,80 = DISK.

## WORKERN
Taktvägen kostar 24–27 µs/hop på PC inline (r0 22–25, samma inom bruset; a2r/verktyg/kost.mjs). Tempogrammets vikning går över 30 % färre värden. Inga nya objekt per hop, bara konstanter ändrade. Worker p99 5 hop.

## RISKEN
- Sektionsmedianerna är sköra: ett enda skifte avgjorde DISK i M1 och M2. Kontrollmängden kan falla åt andra hållet.
- Med kortare fönster ser tempogrammet ~6–7 slag vid 110 BPM. Låtar med glesa kickar (ballader) eller långa synkoperade partier kan låsa sämre. Klippen höll dock 98,6 % (r0 98,3).
- gridfel +7 ms ger ljuset något sämre fas. Ljusdomaren är ändå +5,5 och latensen 80 ms.

KLAR a2r poäng 5.28 OK krav 5
