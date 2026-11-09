# a8f – FINALEN (kort a8 ROBUSTHET): r0 utan det som ändrar DMX, plus svängen och följarens skala

## IDÉN
Enligt TILLÄGG 13:00 är r0 DISK på DMX-kontrollmängden. Orsaken är a3:s toppröst, som ändrar sektionerna, och sektionsmedianerna
vilar på få skiften (knivsegg). Robusthetskortet säger då: **ingen ändring av DMX-ljuset som inte är bevisad på okänt material.**

a8f är r0 (en klocka, OWN_TEMPO borta, lotus klocka i workern, setBeatGrid ingen källa, a4:s fas och etta i ramen) med tre ändringar:
- rösten bort, och dessutom oktaven under kanten;
- a1:s svängprov in;
- följarens skala ändrad.

Resultatet är **DMX bit-identisk med bas**, på övningen och på 17 andra lång-filer. Lotus: 441/503, syntet 6/8, fas parat = A.
Delen som ger lotus mest av allt som ändrar DMX, övre oktavzonen, levereras som separat del **D2**. Den är mätt fullt och kan läggas på.

## DELAR mot r0 (en mekanism per del)
| del | mekanism | DMX | lotus |
|---|---|---|---|
| **D1** toppösten bort | a3:s `peakVote`/`peakScore`/HV_* bort. Oktaven under kanten (`TG_OCT_LO`) bort | md5 = bas på övningen OCH på alla 17 lång-filer jag provade. Alla 17 mått = bas, poäng ±0 | 474 → 441. Klasser: 4/3 22, dubbla 24 (som B) |
| **D2** (VAL, *ej i huvudvarianten*) övre oktavzonen ±1 % | a1:s `TG_EDGE_HI = 1,01`. Ett tempo 155–158 halveras inte längre till 80,0 (klämt från 78,x) | övningen: alla 17 mått = bas (md5 på lang1021/megamix ej kontrollerad i körningen, se nedan). **md5 SKILJER på 4 av 17 lång-filer** (10-11 T124725, T125436, 10-12 T110658, 10-28 T181533) | **441 → 461**. Tempoband ≥ 150: per låt 0,53 → 0,78. Dubbla 24 → 2 |
| **D3** svängen | a1:s `swingSig`: 2/3-vikningens diskantsignatur. Vinnaren ×2/3 när svängda åttondelar ger 3/2-fantomen | md5 = bas (alla 17 lång-filer) | syntet 5/8 → **6/8** (swing 149,8 → 100). Korpus oförändrad |
| **D4** följarens skala | `beatPhaseConf` = 1/(1 − tillit), tak 20 (r0: 1 + tillit, 1–2) | DMX läser inte fältet | bänkens följare raw/f1–f3 0,95/0,95/0,95/0,94. På Pi:n blir halvslagsflytten (PHASE_FLIP_CONF 2,0) möjlig vid tillit ≥ 0,5. r0 risk 2 |

Provat och förkastat, i idébanken:
- **Fintempots halvsteg** (klockans skanning går halva vägen mot argmax, fasen på argmax-vikningens senaste slag). 22 korpusklipp à 40 s,
  andel sekunder inom ±1 % av facit: r0 0,920 → 0,951 och aldrig sämre per klipp. Men det ändrar DMX-md5 och därmed sektionerna. Det
  är okänt på kontrollmängden, så det är inte med. Kandidat för mix_still/gridfel i en arena som får mäta sektionerna på fler lång-filer.

## SIFFRORNA
**DMX** (tvavagar --mat, `tvavagar.json`): **md5 lika med bas** (lang1021 + megamix hela, sync- och momentläget), ljusdomaren körs inte.
- Alla 17 mått = bas: mix_klocka 97,24, mix_las 2,48, mix_still 2,73, mix_hopp 0,05, klipp 98,28, ettan 100, grid40 52,90, gridfel 21,40,
  upp_s 1,35, ned_s 3,00, träff 100, korta 30,34, drop 100/5,71/216, gr 73,33/0.
- Latens 80 ms, p99 6 hop. **Poäng ±0,00, ingen DISK.** Workerns µs/hop **46,0** (bas samtidigt 44,2), gräns 130.
- Lång-filerna utöver övningen (egen dmxDump inline, 300 s, DMX_LABFX=1, a8f mot engine/dist): **17/17 LIKA**.
  Filerna: 10-11 T103310/T105428/T112342/T124725/T124945/T125436/T130600/T135035/T140015/T142953/T145248/T150641/T155632/T193430,
  10-12 T110658, 10-28 T180531/T181533.
- D2-varianten (`medkant/`): alla 17 mått = bas och latens 80. Domaren fann inte bas-mappen under den nästlade sökvägen, så md5-raden
  saknas i den körningen. md5 skiljer på 4 lång-filer, se tabellen. På T124725 står DMX:s bas **klämd på 80,0 i ~25 s** där musiken
  går 156,5, och D2 håller 155–158. Det är en riktig rättning, men den ändrar ljuset där.

**Lotus** (lotusbank, full 503 + 8):
| mått | A | r0 | **a8f** | a8f + D2 |
|---|---|---|---|---|
| korpus | 396 | 474 | **441** | 461 |
| syntet | 6/8 | 6/8 | **6/8** | 6/8 |
| kick R/P | 0,80/0,86 | = | = | = |
| on-beat-recall | 0,84 | 0,84 | 0,84 | 0,84 |
| fas median / motfas / i fas (n) | 0,88 / 33 / 238 (399) | 0,84 / 15 / 257 (446) | 0,83 / 21 / 249 (451) | 0,84 / 17 / 252 (438) |
| fas parat mot A (samma klipp) | 0,88 | 0,87 | **0,88** (n 388, medel 0,766 → 0,787) | 0,87 (n 391, 0,765 → 0,788) |
| följare raw (\|offset\|) | 0,90 (36 ms) | 0,96 (23) | 0,95 (23) | 0,95 (22) |
| per låt (194 låtar) | 0,74 | – | 0,86 | 0,88 |
| spann inom låt | 9 | 22 | 34 | 36 |
Mot lotus-spärren är allt lika med eller bättre än A, utom fasmedianens urval (parat 0,88 = 0,88).

## RISK
1. **Lotus tappar 33 korpusklipp mot r0** (474 → 441). Det är rösten, som gör DMX DISK på kontrollmängden. Med D2 återtas 20 av dem
   (461), men då ändras DMX på 155–160-musik. Ägarens val: DMX-säkerhet eller lotus +20.
2. **Tempospann inom låt 34** (A 9). Lotus motor medianar 12 s och behåller PLL-tempot, men BLE-gridet kan om-ankra oftare än med A.
3. **D4 på Pi:n:** fler halvslagsflyttar möjliga, fortfarande bakom kickdomaren i piEngine. Bänkens följare oförändrad.
   GRID_PHASE_OFFSET_MS 15 och PHASE_BIAS_MS 20 gjordes för gridfasen. Klockans puls +21 ms mot Beat This!, följ upp i källaren.
4. Lotus klocka i workern (r0, hopSelf). Bit-identiskt i sync, Pi-µs är inte mätt. De fyra delade filerna + ANALYSER_SHARED.md5 ska portas.

Kontamination: valet att göra DMX md5-lik kommer av TILLÄGG 13:00 (kontrollmängdens felklass). Själva kontrollmängden har jag inte mätt.
Budget: DMX --mat 2/2 (a8f, medkant), lotusbank 2/2 (a8f, medkant). Egna korta skript: spar.mjs (40 s-klipp) och dmxDump på lång-filerna.

Filer: `losning.diff` (mot engine/src), `mot-r0.diff`, `D2-medkant.diff` (D2 ovanpå a8f), `tvavagar.json`, `lotusbank.json`,
`medkant/tvavagar.json`, `medkant/lotusbank.json`.
