# a8 – PI-BUDGET: en källa i en workertråd

**IDÉN.** Den enda tempokällan är effektklockan i taktvägen (BeatFeed i workern). Skugg-BeatFeeden är borta, och med den dess 11–16 tempon per sökvarv, dess egen tillit och dess egna återställningar. Analysatorn får inget eget rutnät längre, och om dess sökning säger ett annat tempo än en säker klocka nollas den. Ramens bpm och tillit, effekternas frasräknare och tillit samt ctx.beatIdx läser alla klockan. Taktvägen kostar ~30 % mindre per hop (inline på PC, pop 55 s: 27–80 → 20–55 µs/hop beroende på last). Bänkens worker-p99 föll från 7 till 6 hop.

**DIFFEN:** `.arena/entempo/a8/losning.diff`, 120 rader, i beatFeed.ts, split.ts och effects.ts.

## Genomfört (KRAV EN KÄLLA), fil:rad i `a8/src`
- **(1) En temposökning, delvis.** beatFeed.ts:148–153: skuggan borttagen, ingen `ana` och ingen `setBeatGrid` (analysatorns rutnät är null). beatFeed.ts:326–332: analysatorns tempo nollas (resetTempo) om det i 8 s skiljer sig från klockan med mer än 4 % i samma oktav. Analysatorns egen `computeBpm` är kvar, se nedan.
- **(2) En tillit.** beatFeed.ts:337 och split.ts:239–240: `frame.bpmConfidence` och `frame.bpm` sätts till `cfg.beat` efter matningen. Därmed läser effects.ts:1674/1677 (frasräknaren) och :1774 (trust) klockan, och `hasBeat` läste den redan. `profile.beat` (analyser.ts:1793, `localBpmConfidence`) är inte bytt.
- **(3) En takträknare.** effects.ts:2013: halveringspariteten är rutnätets (`lastBeatIdx & 1`). effects.ts:2018: med takt gäller `beatIdx = lastBeatIdx` (`>> 1` vid halvering). Utan takt räknar den fria räknaren vidare på kickarna.
- (4) och (5) är inte gjorda.

## SIFFRORNA (mätning 3 = koden i src)
`7 | a8 | −5,46 | långsamma −7,76 | snabba −2,02 | cpu +4,0 % (44,09 mot 42,38 µs) | latens 85 ms (=) | p99 6 hop | md5 skiljer | ljusdomaren +1,4 | DISK: ned_s 4,00 s > bas 2,25 s`

- **Bättre:** ettan 91,3 → 92,8, grid40 56,0 → 57,7, gridfel 15,1 → 13,9 ms, korta 32,6 → 29,7, ljusdomaren +1,4, upp_s 1,35 (lika med bas).
- **Sämre:** ned_s 2,25 → 4,00. Orsaken är ett enda värde i lang1011, −1 → 9,1 s, som flyttar medianen. Dessutom mix_still 4,15 → 6,18, mix_hopp 0,08 → 0,13 och klipp_klocka −0,5.

Alla tre mätningarna:
- M1: analysatorns rutnät = klockans tempo + kickfasen (en extra vikning per sökvarv). upp_s 2,85 → DISK. ljusdomaren +0,1.
- M2: inget rutnät och ingen omlåsning. upp_s 2,30 → DISK, men ned_s 1,90, gridfel 12,0 och ljusdomaren +1,26.
- M3: M2 + omlåsning mot klockan. upp_s är tillbaka på 1,35. Det bevisar att det var skuggans resetTempo, inte grinden, som höll sektionerna snabba. ned_s 4,00 → DISK.

Sektionsmedianerna sitter i luckor (14 värden). Ett värde flyttar dem över spärren, så marginalen är liten åt båda håll.

## DUBBLETTER KVAR
- **Analysatorns computeBpm.** Den är fortfarande startlås, sökcentrum och tystnadssignal (`frame.bpm` in i taktvägen). Att ta bort den är den stora Pi-vinsten (scoreEnv ×3 med 4 Hz), men klockan kan inte kallstarta utan den. Det rymdes inte i 3 mätningar.
- **(4) Två pulskurvor och beatEnv-golvet.** Inte rört, eftersom ljusdomaren var enda domaren och budgeten tog slut.
- **(5) Låtgränsen till taktvägen.** Inte gjord. Klockans barReset vid > 3 % tempohopp finns kvar.
- **sectionBars och predictHigh** räknar fortfarande på analysatorns localBpm utan fas.
- **pulseCount-pariteten** (effects.ts ~1355) är en tredje paritet och är kvar.

## RISKEN
- **Omlåsningsregeln är ny dynamik.** Analysatorns tempo nollas mot klockan (8 s, tillit ≥ 0,5). På Pi:n kommer `frame.bpm` till workern ett hop senare, och om analysatorn växlar mellan 4:3-tempon kan den nollas om och om igen. Det förklarar troligen mix_still och mix_hopp.
- **Kickgrinden står alltid öppen.** Fler falska kickar på ARM-signalen kan påverka sektioner och dropp. Bänken visade inga dropmått sämre.
- **frame.bpm är nu flyttal ur klockan** och kommer ett hop sent ur workern. server.ts och UI visar det värdet.

KLAR a8 poäng -5.46 DISK
