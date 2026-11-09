# a3 – EN sökning, en publicerad sanning (kort: ny sökning med flera hypoteser)

**IDÉN.** Effektklockans tempogram i taktvägen (139 hypoteser på ett cirkulärt log-rutnät över en oktav, där oktav- och 2/3-släktingar
är samma hypotesfamilj) är nu den enda tempo-/fassökningen. Analysatorns skuggrutnät (den andra BeatFeed:en som vek onset.kick) är
borta, och därmed också klockans andra sökcentrum. Analysatorns kickgrind och taktfas får klockans INRE rutnät med en fast offset
(0 ms). `frame.bpm`/`frame.bpmConfidence` sätts till `cfg.beat` innan effekterna läser dem, så ljuset följer samma tempo och samma
tillit som klockan. Det är bättre eftersom det finns en enda sak att trimma.

**DIFFEN:** `.arena/entempo/a3/losning.diff` (beatFeed.ts + split.ts).

**SIFFRORNA (levererad variant = mätning 1, tvavagar.json):** poäng −0,36, långsamma +1,31 %, snabba −2,88 % (cpu 1,06 × bas,
latens 85 ms = bas), worker p99 6 hop, ljusdomaren +1,7. **DISK: upp_s 1,90 s mot bas 1,35 s, och ljusdomarens spärr lampspr pop
−6,1 %** (spärren gäller oavsett regeländringen). Bättre: ned_s 2,25 → 0,00 s, korta 32,6 → 29,1 %, ettan +1,6 %. Sämre: mix_still
4,15 → 5,81 s, gridfel 15,1 → 16,5 ms. Tempomåtten (mix_klocka, mix_las, mix_hopp, klipp_klocka) är oförändrade.
Två försök till att rädda upp_s (sparade i verktyg/tvavagar-mat2.json och -mat3.json, koden återställd till mätning 1):
- M2: grinden fick rutnätet bara när klockans tillit var ≥ 0,5. Det gav upp_s 3,80 s. Ljusdomaren +0,5 utan spärrar och mix_still 3,96.
- M3: när klockan och analysatorn var oense om tempot låg grinden på analysatorns tempo, förankrad i senaste kicken. Det gav upp_s 3,80 s
  och poäng +0,65 (mix_hopp +26 %), men det är ett tempo till och bryter mot kortet.

Orsaken jag hittade (fritt skript verktyg/offset.mjs, 55 s-snuttar): klockan och analysatorns localBpm är ofta oense, och inte bara
harmoniskt. I megamix säger klockan 93,7 och analysatorn 125 (4/3). Sektionerna räknar på analysatorns localBpm, men kickarna grindas
nu mot klockans tempo. Det ena stämmer inte med det andra, så upp_s blir sämre. Detta är punkt (1):s kvarvarande halva.

Mitt eget oktavbeslut vid kanten 80/160, som skulle ersätta analysatorns oktavtips (basens jämnhet + backbeat i samma vikning),
provades offline och förkastades före mätning. 80-låtarna (Drake, Cody, Shaboozey) vändes till 160, och beslutet fladdrade varje varv.

## KRAV EN KÄLLA – genomfört (fil:rad i .arena/entempo/a3/src)
1. **EN temposökning – DELVIS.** Skuggrutnätet borta: `beatFeed.ts:149-150` (ingen `new BeatFeed(true)`, inget kickFold),
   `beatFeed.ts:308-317` (analysatorn får `setBeatGrid` = inre ankaret + `ANA_PHASE_MS`, `beatFeed.ts:102-104`). Det andra sökcentrumet
   är borta i `beatFeed.ts:169`. Resets (resetTempo/resetBar) kommer från klockans coast och barShift. **Kvar:** analysatorns
   egen computeBpm/localBpm (sektioner, kickgrindens tillitskrav, och klockans start och oktavtips vid kanten via clockDetBpm).
2. **EN tillit – DELVIS.** `frame.bpm`/`frame.bpmConfidence` = `cfg.beat` i `split.ts:236-239` (taktvägen) och `beatFeed.ts:318-323`
   (odelad väg). Effects trust (~1774) och frasräknaren (~1674) läser därmed klockans värden. BoundaryDetector läser fortfarande
   analysatorns värden (index.ts:187 körs före matningen).
3. EN takträknare – ej tagen. 4. EN pulskurva – ej tagen. 5. Låtgränsen – ej tagen (mätbudgeten gick åt till spärren upp_s).

**DUBBLETTER KVAR:** analysatorns localBpm (se ovan; att låta sektionerna läsa klockans tempo är nästa steg och sannolikt det som
löser upp_s), beatCounter/halfTick, de två pulskurvorna och låtgränsen i klockan (barReset vid > 3 % och BREAK_HOLD-jämförelsen mot
analysatorns bpm).

**RISKEN:** grinden följer nu klockans fintempo (0,25 %-steg) och ankarhopp var 250 ms. På Pi:n, där taktvägen kan ligga 1–6 hop efter,
kommer grindens rutnät till analysatorn ett eller flera hop sent (förr kom skuggan i samma hopp). `frame.bpm` är nu ett flyttal och
nollskilt under breakhållningen (20 s), så frasräknaren nollas inte längre i breaket. FS_FCONF skrivs fortfarande men läses inte.
