# a3r – SAMMANSLAGNINGEN (dubblett-jämförelsen, alternativ B) ovanpå r0

**IDÉN.** Det finns en enda sökning: r0:s klocka i analysatorns långsamma väg, alltså tempogrammet med basens stigning × diskanten,
2:3-logiken i halvslaget och kronan mot syskonen 4:3 och 3:2. Ur analysatorns gamla tempokälla har jag lagt in kickdetektorns anslag
(`onset.kick`, signalen som computeBpm/skuggan vek). Den viks i samma ring och samma vikning, med samma form topp + halvslag. Ingen
andra sökning finns. Kickvikningen fick inte byta tempo, bara HÅLLA det regerande tempot i kronans syskonduell.

## Jämförelsen (3 mätningar, --mat övning; spärrarna mot bas)
| variant | upp_s | ned_s | mix_hopp | ettan | gridfel | poäng mot bas | |
|---|---|---|---|---|---|---|---|
| r0 (start) | 1,35 | 1,90 | 0,10 | 100 | 15,2 | +0,76 | OK |
| M1: kickvikningen som faktor i HELA poängen (`fb·fh·fk^0,5`) | **1,90** | **2,50** | 0,05 | 87,0 | 15,35 | −3,54 | DISK |
| M2: kickvikningen i kronans duell åt båda hållen (vikt 1) | 1,35 | **4,00** | 0,05 | 100 | 15,4 | −2,04 | DISK |
| **M3 = levererad: kickvikningen kan bara hålla (aldrig byta)** | 1,35 | 1,90 | 0,10 | 100 | 16,2 | **+0,48** | OK |
| a2r (tempogrammet som det är), enligt rankingen | 1,35 | 2,15 | 0,08 | 100 | 22,0 | +6,04 | OK |

**Slutsatsen (mätt):** sammanslagningen bär inte. M1 och M2 minskade tempohoppen inom en låt (mix_hopp 0,10 → 0,05). Men varje gång
kickvikningen flyttade tempovalet föll sektionsmedianerna över spärren, eftersom sektionerna står på en knivsegg (ett värde bland
~14 flyttar medianen). M3 är säker, men den är −0,28 mot r0 (grid40 och gridfel något sämre) och tar inga mått. Det analysatorns
vikning "gjorde bra för sektionerna" var skuggans coast och tempoåterställningar (a1/a8), inte kicksignalen. r0 tar redan det beteendet
i klockans coast med öppen grind. **Rekommendation: a2r:s väg (tempogrammet som det är) är bättre än sammanslagningen.**

## KRAV (alla fem ärvda från r0, orörda; fil:rad i `.arena/entempo/a3r/src`)
| # | punkt | var |
|---|---|---|
| 1 | en temposökning | analyser.ts, split.ts och effects.ts är identiska med r0 (r0:s rader gäller: analyser.ts:1102/1456/1734 sökningen anropas inte, :1768 `setClock`); beatFeed.ts:343 grinden = klockans rutnät + KICK_PHASE_MS (:100); kickvikningen är en del av klockans egen poäng, beatFeed.ts:231–233/253–255 |
| 2 | en tillit | beatFeed.ts:347 (frame.bpm/bpmConfidence = klockan), split.ts som r0 (:242) |
| 3 | en takträknare | effects.ts:2010–2019 (som r0) |
| 4 | en pulskurva | effects.ts:1302 (som r0) |
| 5 | låtgränsen | beatFeed.ts:337 `relock()` på boundaryCount (:326), split.ts:234 H_BOUND (som r0) |

## DELAR
| del | från | mått (ranking-r1 / här) |
|---|---|---|
| hela r0 (en källa, spärrtak, krona, relock, beatIdx, tillit) | r0 (a1/a4/a5/a6/a7) | r0 +0,76 mot bas |
| kickanslagen i tempogrammets vikning | analysatorns gamla computeBpm/skugga (bas) | M1/M2: mix_hopp −50 %, men sektionsspärren föll |
| kickbeviset bara som håll i kronan | egen | M3: ±0 på tempomåtten, gridfel −6 % |

**BORTVALT:** kickvikningen i hela poängen (M1) och duellen åt båda hållen (M2), båda DISK. En egen backbeat- och jämnhetsregel vid
oktavkanten (a3, runda 1) vände 80-låtarna till 160.

## SIFFRORNA (M3 = tvavagar.json)
Poäng +0,48 mot bas, alltså −0,28 mot r0. OK: ljusdomaren +5,2 utan spärrar, latens 85 ms, worker p99 5 hop.
**Workerns kostnad:** feedRealtid workerUs 43,9 µs/hop PC (gräns 130). Kickringen kostar en extra summa per värde i vikningen
(3 → 4 ackumulatorer). Duellen kör två extra vikningar, bara när ett syskon utmanar, högst en gång per varv (~0,37 s).
**Allokering:** inga nya objekt per hop. kV och tgKs är förallokerade typade fält, `Math.pow` allokerar inget.

## RISKEN
Duellen kan hålla ett FEL regerande tempo längre när kickdetektorn är felfasad (mjuk kick, 3 kickar per 2 slag). Holdout kan visa
fler kvarhållna 4:3-fel. Pi:n: samma kod i workern som r0 plus kickringen, alltså ingen ny tråd eller kö.

KLAR a3r poäng -0.28 OK krav 5
