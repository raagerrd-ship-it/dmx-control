# a6 SEKTIONSENERGI – losning (arenan pausad efter 1 mätning)

## IDÉN
"Lugnt"/energinivån räknas EN gång, i analysatorn: `frame.sectionEnergy` (0..1). Det är intensity som asymmetrisk EMA (upp 5 s,
ned 2 s), snäppt av analysatorns egen drop och av sektionsgränsen. Dirigentens tier och pulsens halvering läser samma mått, och
effects.ts har ingen egen EMA kvar.

## FLYTTAT
| vad | från effects.ts (bas src/) | till analysatorn (a6/src/analyser.ts) | ramens fält |
|---|---|---|---|
| tierEma 5 s/2 s-EMA | effects.ts:1033-1037, fält :589 | analyser.ts:3841-3843, fält :848 | frame.sectionEnergy |
| drop-snapp >= 0,75 | effects.ts:1046 (show-dropHit) | analyser.ts:3844 (eget dropCount) | frame.sectionEnergy |
| sektionssnapp high/tier2 0,75, break/low 0,35 | effects.ts:1050-1054, konst :379 | analyser.ts:3845-3848 | frame.sectionEnergy |
| subdivEnergy 8 s-EMA (pulsens "lugnt") | effects.ts:1285-1292, fält :521, konst :192 | ersatt av samma mått | frame.sectionEnergy |
| falsk-drop-återställning av tiern | effects.ts:1610/1614 (preDropTier) | borttagen (analysatorns drop har ingen efterkontroll) | – |

Läsarna i a6/src/effects.ts: 1030 (`intensity = frame.sectionEnergy`), 1260 (`secE = frame.sectionEnergy`). Tröskel/hysteres
(SUBDIV_ENERGY_LO_ON/OFF, TIER-trösklarna) stannar i dirigenten. Det är reaktion, inte analys. Frame-fältet deklareras på analyser.ts:189.

## DUBBLETTEN
Det fanns tre definitioner: A tierEma (asymmetrisk + snäpp), B subdivEnergy (8 s symmetrisk), C section/sectionTier/secPct (rang i workern).
Valet blev A som enda mått, flyttad till analysatorn. C används bara som snäpp-bevis vid gränsen, som förut. B slogs ihop med A. Mätt: alla 17
kvalitetsmått är oförändrade (0,0 %), eftersom inget av dem läser energinivån. Ljusdomaren föll däremot på –1,3, och lampspridningen i lang1021
blev –30,2 %. Halveringen på A:s snäppta/asymmetriska kurva och dropsnappet från analysatorns drop (i stället för showens flankdrop) ändrar lookvalet.
Det kaotiska lookvalet förstärker sedan skillnaden (RAPPORT entempo).

## SIFFRORNA (mätning 1/3, tvavagar.json)
- Domarens rad: poäng +0,00, långsamma +0,00 %, latens 80 ms (=bas), cpu 53,47 mot 53,82 µs/hop (kvot 0,99), p99 6 hop (X = 7).
- md5 skiljer. Ljusdomaren –1,3 < –0,5, och spärren lampspr lang1021 –30,2 % ger **DISK**.

## Workern
Workern är orörd: allt nytt ligger i huvudtrådens fillFrame (3 multiplikationer per hop). Realtidsmätningen gav worker p99 6 hop och väckning
36,3 µs/hop. Inga nya objekt skapas: två talfält, initierade som 0.5 (Double-form).

## RISKEN och nästa steg (till idébanken)
Flytten i sig är billig och neutral för analysmåtten. Det som kostar ljus är att två beteenden ändrades samtidigt: B (8 s symmetrisk)
försvann ur halveringen, och drop-snappet bytte källa. Nästa prov, en i taget:
(1) behåll A för tiern men publicera även B som `frame.calmEnergy` från analysatorn. Det ger två fält med en källa var och borde ge md5-likhet
eller nästan.
(2) Ta därefter bort B och mät enbart den effekten.
Snäppet vid showens spärrade drop och falsk-drop-återställningen kan behöva läsa en analysator-flagga i stället för att
försvinna.
