# a1r – r-ljus: takträknaren och låtgränsens omlåsning ovanpå r0

**IDÉN.** r0:s monotona takträknare frös vid varje halvering. Från `index` gick den till `index >> 1`, och spärren höll räknaren tills
`index >> 1` passerat det gamla värdet, vilket i praktiken aldrig hände i halveringen. När halveringen släpptes hoppade räknaren +44.
Det var bänkens jitter: lang1021 120–180 s gav 86 steg på 60 s, och mönstereffekterna stod stilla. Nu är räknaren
rutnätets index plus en HELTAKTSFÖRSKJUTNING `gridK` (multipel av 4, så ettan och pariteten är rutnätets). `gridK` sätts bara när skalan
byts (halveringen på/av) eller när låset kommer tillbaka, och då till det minsta värdet som inte backar. Vid låtgränsen läggs dessutom
gällande etta in i det inre ankaret före taktmodellens omstart, så att det publicerade rutnätet inte backar 1–3 slag mitt i skarven.

Diffen mot engine/src finns i `losning.diff`. Bara remixens del, mot r0, är 52 rader i `mot-r0.diff` (effects.ts och beatFeed.ts).

## KRAV EN KÄLLA (fil:rad i `.arena/entempo/a1r/src`; r0:s fem är behållna)
| # | punkt | var |
|---|---|---|
| 1 | en temposökning | analyser.ts:1768 `setClock` (klockans bpm/tillit = analysatorns localBpm). Den egna sökningen är borttagen som i r0. beatFeed.ts:340 kickgrindens rutnät = klockans inre + `KICK_PHASE_MS` (:97, 45 ms), null i coast |
| 2 | en tillit | beatFeed.ts:344 och split.ts:242 (ramens bpm/bpmConfidence = klockan, `an.setClock`) |
| 3 | en takträknare | effects.ts:2010–2025: rutnätets index (`>> 1` vid halvering) + `gridK` (:2020, multipel av 4), paritet `halfTick = gi & 1`. Pulsens paritet är samma rutnätsindex (:1359/:1363). Ingen fri räknare i låst läge |
| 4 | en pulskurva | effects.ts:1302 (beatEnv bakom samma `beatLocked` som beatPulse/heartPulse) |
| 5 | låtgränsen | analyser.ts:1770 `trackBoundaries`, split.ts:234 H_BOUND, beatFeed.ts:334 `relock()` (:317, nu med ettan inlagd i ankaret) |

## DELAR
| del | från | måttet |
|---|---|---|
| allt i r0 (en källa, krona, spärrtak, coast = öppen grind) | r0 | r0 −0,77, ljus +5,2 |
| takträknaren: index + gridK, ingen frysning vid halvering | egen (a1r, `diag.mjs`: frysning och +44-hopp mätta) | jitter lang1021 59,3 → 55,6 ms, megamix 37,0 → 33,3, ljus +5,2 → +7,5 |
| relock behåller ettan i ankaret | egen (a4:s relock som grund) | mix_hopp 0,10 → 0,03/min, korta 32,6 → 34,1 % (sämre), gridfel 15,2 → 16,2 ms (sämre) |

## SIFFRORNA (mätning 1 av 3 = `tvavagar.json`)
- **Poäng −0,15 mot bas (r0 −0,77 → +0,62 mot r0), OK.** Långsamma +2,90 % (r0 +1,27), snabba −4,74 % (cpu 48,3 µs/hop, kvot 1,095;
  basens egna körningar spred 40–50 µs, och diffen rör inget på huvudtråden utom räknaren). Latens 85 ms, p99 5 hop.
- **Ljusdomaren +7,5** (r0 +5,2), inga spärrar, lampspr +21,4/+3,2/+6,7 %. Betoning lang 0,258, pop jitter oförändrat 29,6 (bas 25,9).
- upp_s 1,35 och ned_s 1,90, samma som r0 (spärren klaras).
- Sämre än r0: gridfel 16,2 mot 15,2 och korta 34,1 mot 32,6.
- Domarens filspärr ("förbjudna filer") gäller inte här (tvavagar-läget). r0 har samma rad.

## BORTVALT
- Halverat läge med gridK som multipel av 2 (ännu mindre hopp vid påslag). Vinsten är liten och skulle kosta en mätning.
- Backande ankare (ettan flyttas bakåt): r0:s spärr håller räknaren 1–3 slag. Det syntes inte i diag-fönstren, så det fick vara kvar.
- Popens jitter (29,6 mot bas 25,9) kommer inte av räknaren (`diag.mjs`: noll hopp och frysningar i pop). Den hör till pulsen eller fasen
  och ligger utanför kortet.

## BUDGET
1 av 3 --mat. `diag.mjs` (effektmotorn på 60 s-fönster: steg, hopp, frysningar, ankarhopp, halvering) är ett gratis-skript.

## RISKEN
- `gridK` gör att `beatIdx` skiljer från rutnätets råa index med en multipel av 4. Ettan, pariteten och `% 16` inom en takt är
  desamma, men frasräkningar som antar index 0 vid låsets början gör inte det (det gjorde de inte heller förr).
- Vid ett påslag av halveringen kan räknaren stå 0–3 effektslag tills rutnätet hunnit ikapp i rätt fas.
- Relock-ändringen flyttar det inre ankaret hela slag vid låtgränsen. Fasen är orörd, men tempots slagindex bär med sig förra låtens etta
  tills taktmodellen hittat den nya (minst 16 slag).

KLAR a1r poäng +0.62 OK krav 5   (mot r0; mot bas −0,15)
