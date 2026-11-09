# a7 – MINSTA DIFF (entempo)

**IDÉN.** Effektklockan (`cfg.beat`, taktvägen i workern) är den enda sanningen nedströms: taktvägens snabba sida skriver klockans bpm och tillit tillbaka i ramen (`frame.bpm`/`frame.bpmConfidence` = `cfg.beat`), och effekternas takträknare `ctx.beatIdx` är rutnätets eget index i stället för en fri räknare. Effekternas tillit, frasräknaren, taktgrinden och de 17 `beatIdx % 4`-effekterna läser då samma tempo, tillit och etta som klockan (taktmodellens barOff når dem). Det kostar tre små ingrepp och ingen ny sökning.

**DIFFEN:** `losning.diff` (76 rader, 3 filer: split.ts, index.ts, effects.ts).

## KRAV EN KÄLLA – genomförda punkter (fil:rad i `.arena/entempo/a7/src`)
- **(2) EN tillit – genomförd.** `split.ts:205-209` `oneTempo()`: `f.bpm = cfg.beat.bpm`, `f.bpmConfidence = cfg.beat.confidence` (0 utan klocka). Anropas på alla utgångar ur `HopLaneFast.feed` (`split.ts:242, 243, 255`). Det gamla undantaget som bara kopierade matningens tillit (FS_FCONF) är borta. Den odelade vägen likadant: `index.ts:30, 203`. Därmed läser effects trust (`effects.ts:1774`), frasräknaren (`effects.ts:1674/1677`), `hasBeat` (`beatClock.ts:44`, redan cfg.beat) och profile.beat (`index.ts:119`, redan cfg.beat) klockans tillit. Analysatorns bpm går bara IN i taktvägen (hop-recordet skrivs före överskrivningen, `split.ts:233`) och till BoundaryDetector (läses före feed, `index.ts:187`).
- **(3) EN takträknare – genomförd i låst läge.** `effects.ts:2013-2018`: `beatCounter = lastBeatIdx + 1024` (rutnätets index, `+1024` = multipel av 64 så det aldrig blir negativt när ettan lägger ankaret upp till 3 slag fram), vid halvering `>> 1` och pariteten = rutnätets `& 1`. Taktgrinden `effects.ts:1156` (`beatCounter % 16`) följer med. Kvar: utan låst klocka stegar räknaren fortfarande på kickar (reservläget), och `pulseCount % 2` (`effects.ts:1360-1365`) är en andra paritet för pulsformen.
- **(1) EN temposökning – INTE genomförd.** Analysatorns skuggrutnät (`beatFeed.ts:312-316`) och tempoTracker finns kvar.
- (4), (5) – inte på kortet, inte rörda.

## SIFFRORNA (mätning 1 av 3, `prov/tvavagar-v1.json` = `tvavagar.json`)
- Långsamma **+0,00 %** (alla 17 mått bit-lika bas: mix_klocka 97,06, mix_still 4,15, upp_s 1,35, ned_s 2,25 ...). Väntat: analysatorn och klockan är orörda, bara konsumenterna byter källa.
- Snabba **+1,30 %**: cpu 43,40 us/hop (kvot 1,033 = -3,3 %, inom bruset 6 %), latens 80 ms mot 85 (+5,9 %). Worker p99 7 hop (gräns 22).
- **Poäng +0,52.** md5 skiljer → ljusdomaren **-2,30** (takt -0,33, dynamik -1,20, koreografi -4,83: jitter lang1021 52,8 → 59,3 ms, megamix 37,0 → 40,7; betoning 0,158 → 0,146). Inga domarspärrar (lampspr +1,5/-0,2/+1,8 %, t90 30).
- Med gamla gränsen -0,5 = DISK; med REGELÄNDRINGEN 11-09 (-3,0 för KRAV EN KÄLLA) OK om orkestratorn godkänner (2)+(3).
- Mätning 2 (bara (2), utan beatIdx, för att isolera koreografi-tappet) avbröts i kön när regeländringen kom – den skulle mätt kod jag inte levererar. Orsaken till jitter-ökningen är alltså inte isolerad; min gissning är (3): räknaren hoppar nu med ankaret (ettans flytt, omlås), så mönster-effekterna byter plats mitt i en fras.

## DUBBLETTER KVAR
(1) analysatorns egen sökning + skuggrutnät: historiskt kostar samma tempo/fas till analysatorn upp_s 2,6 → 4,1 s (spärren (a)); utan mätbudget att hitta den fasta offseten lät jag den vara. (4) två pulskurvor och beatEnv-golvbuggen, (5) låtgränsen till taktvägen/barReset, `pulseCount`-pariteten och lookbytenas fasfria sectionBars.

## RISKEN
Ramens bpm är nu klockans flyttal i stället för analysatorns heltal: UI/ws-loggar och recorder ser det. I worker-läget på Pi:n släpar `cfg.beat` (och därmed tillit/bpm i ramen) det antal hop workern ligger efter (p99 7 hop ≈ 19 ms) – förr gällde det bara klockan, nu även tilliten. Frasräknaren nollas inte längre i breaket så länge klockan hålls (BREAK_HOLD 20 s).
