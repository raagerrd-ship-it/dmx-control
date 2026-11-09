# a8r – PI-BUDGET på r0: den enda sökningen billigare, och det sparade lagt på tempogrammet

**IDÉN.** Kärnan är densamma som i a8 runda 1: en källa ska rymmas i en workertråd och kosta mindre än de två sökningarna gjorde. Det sparade ska sedan läggas på kvaliteten där domaren ser det. Startpunkten är r0, som redan har en sökning (klockans tempogram i taktvägen; analysatorns computeBpm och skuggan är borta). Ovanpå r0 lägger a8r två saker:
- **Kostnaden.** Rutnätets fintempo-skanning (onsetStep, 11 tempon per 250 ms) räknar nu sökvarvets fönster en gång per varv i stället för en gång per tempo. Fasen stegas fram med en addition per värde i stället för `t % period`. Det är samma knep som tgScore redan använde.
- **Kvaliteten.** Tempogrammet tar 2 hypoteser per hop i stället för 1, alltså ett varv per ~0,19 s. Tidskonstanten är oförändrad: TG_A och oktavens EMA är omräknade per varv som 1 − √(1 − a). Toppen väljs därmed ur ett utjämnat tempogram dubbelt så ofta.

**DIFFEN:** `.arena/entempo/a8r/losning.diff` (mot engine/src). Mot r0 är det 30 ändrade rader, alla i beatFeed.ts.

## KRAV (fil:rad i `.arena/entempo/a8r/src`, ärvt från r0 och orört av a8r)
| # | punkt | var |
|---|---|---|
| 1 | en temposökning | analyser.ts:1102 (sökningen borttagen), :1768 `setClock`; beatFeed.ts:340 (inre rutnät + KICK_PHASE_MS, :97), tempogrammet beatFeed.ts:102/238 (a8r: 2 per hop) |
| 2 | en tillit | beatFeed.ts:344, split.ts:242 (ramen + `an.setClock`); effects trust/frasräknaren/hasBeat läser ramen/cfg.beat |
| 3 | en takträknare | effects.ts:2010–2020 (rutnätets index, `>> 1`, en paritet, monoton) |
| 4 | en pulskurva | effects.ts:1302 (beatEnv grindas med samma beatLocked) |
| 5 | låtgränsen | analyser.ts:1770 (trackBoundaries), split.ts:234 (H_BOUND), beatFeed.ts:334 → `relock()` :323 |

## DELAR
| del | från | måttet |
|---|---|---|
| hela r0 (en källa, krona, spärrtak, coast = öppen grind, relock, beatIdx, pulsgrind) | r0 (a1/a4/a5/a6/a7/a8) | r0 −0,77 |
| sökvarvets fönster en gång + additiv fas i onsetStep | a8 (egen, Pi-budget) | taktvägen ~−25 % µs/hop; bit-nära (spåret lika med 2 decimaler på pop/megamix) |
| tempogrammet 2/hop, samma tidskonstant | a8 (egen, det sparade) | mix_hopp 0,104 → 0,026, mix_las 3,49 → 3,29, mix_still 3,86 → 3,65, ljus +5,2 → +7,6 |

## SIFFRORNA (M1 = tvavagar.json = koden)
`a8r +0,86 mot bas (r0 −0,77, alltså +1,63 mot r0) | långsamma +4,17 | snabba −4,11 (cpu 1,082 mot r0:s 1,077 = brus) | latens 85 ms | p99 6 hop | ljusdomaren +7,6 utan spärrar | upp_s 1,35, ned_s 1,90 (= r0)`.
- **Bättre mot r0:** mix_hopp −75 %, mix_las, mix_still, mix_klocka 97,36 → 97,54, klipp 98,29 → 98,35, gridfel 15,2 → 14,7, korta 32,6 → 32,2.
- **Sämre mot r0:** ettan 100 → 95,65 (136 BPM: 8/11 takter; fortfarande över bas 91,3), grid40 56,65 → 56,53.

**Kostnad (inline, eget skript `dbg/lane.mjs`, pop 55 s, PC under last).** Bas (två sökningar) har taktvägen ~27–32 µs/hop plus analysatorns computeBpm ~11 µs/hop, totalt ~40. r0 har ~19–23. a8r med 2 hypoteser per hop har ~22–27. Den sammanslagna sökningen är alltså ~35 % billigare än de två, trots den dubblade tempogramtakten.

## BORTVALT
- **Parvis tgScore** (halva bin-uppdateringarna). Kostnaden syntes inte mätbart under PC-lasten, och spåren ändrades på lang1011/pop. Inte mätt, inte med.
- **Huvudtrådens cpu.** r0 och a8r ligger båda +7–8 % mot bas. Det jagades med profiler och notify-räkning (huvudtråden gör 494 notify mot basens 1337, så det är inte väckningen). Med mixade dist-kataloger hamnar skillnaden på analysatorsidan (kickgrind, GC), inte i effekterna. Orsaken hittades inte och inget ändrades.
- **3 hypoteser per hop.** Det bryter kortets kostnadsmål (> de två sökningarna).

## BUDGET
1 av 3 --mat. Övrigt är egna skript på 55 s (lane.mjs, dmxDump på 120 s för cpu-felsökningen; dmxDump är motorns dump, inte ett bänk- eller korpusmått).

## RISKEN
- **Tempogrammets topp väljs dubbelt så ofta.** Kronan (TG_HOLD) och oktavkantens hysteres dömer per varv, och på Pi:n går varven i realtid. Hoppen blev färre i bänken, men med fler beslut kan en 4:3-växling hinna fram fortare på andra låtar (holdout).
- **ettan 136 BPM föll 3 takter.** Det kan vara känsligt för små tempoändringar som nu kommer oftare.
- **På Pi:n (ARM)** kostar tgScore ~10× PC:ns. Med 2 per hop är det ~2 × 130 µs i worker-tråden. Det är kvar inom kärnans budget eftersom computeBpm och skuggan är borta, men det är inte mätt på Pi:n.

KLAR a8r poäng 1.63 OK krav 5
