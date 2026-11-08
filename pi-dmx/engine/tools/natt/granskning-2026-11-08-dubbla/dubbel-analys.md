# Dubbla källor på analyssidan (HEAD 0315d2d, bara läsning)

**Känt fall (nattuppdraget, bara kort):** tempot söks två gånger, i skuggrutnätet och i cfg.beat. Samma kluvenhet finns i konsumenterna: `profile.beat` = analysatorns `localBpmConfidence` (analyser.ts:1836/3732) medan `hasBeat` läser `cfg.beat.confidence` (repeatRate). Kickgrinden går mot skuggrutnätet (analyser.ts:3107), och `sectionBars`, boundaryDetector och KICK_COOLDOWN läser analysatorns bpm. Det nedan är andra saker.

## Styr ljuset blandat

**1. Drop: två detektorer på samma baskropp**
- A: `dropStep` (analyser.ts:3485, i workern). B: `flankStep` (effects.ts:811), med samma filter: `fdF` 0,06 s, `fdS` 0,35 s, `fdC` −0,15 dB/s (effects.ts:815–817), lika med `bodyFast`/`bodyEnv`/`bodyCeil` (analyser.ts:3488–3494). Trösklarna skiljer (gone 5 dB/2 s mot 10 dB/4 s, rise 20 mot 12 dB).
- Läsare: ljuset tar B (`dropHitRaw = this.flankStep(frame)`, effects.ts:1622). A:s drop blir minidrop (`gapMini`, 1623). Sektionen tar A: `dropped || st === 2 → 'high'` (analyser.ts:1364), samt `secDropHoldUntil`. `miniDropCount` läses inte av ljuset (effects.ts:1648).
- Problem: sektionen går till refräng på en drop som ljuset själv avvisat. Två uppsättningar trösklar att trimma.
- Förslag: B vinner men flyttas in i analysatorn som `dropCount`. A tas bort, och analysatorns minidrop också (effekternas lyft/stopp/nästan-drop finns redan).
- Risk: drop_traff/drop_falska/drop_ms mäter i dag **A** (dropFacit läser frame.dropCount/miniDropCount), så de måste peka om. Därtill sektionens upp_s/traff och ljusdomaren.

**2. Baskroppen/basenergin: tre källor**
- A: `bodyDb` = 2048-banden 0–2, rå dB (analyser.ts:1832; ~42 ms fönster plus workerns fördröjning). B: `specAbs.sub/kick` från snabba IIR-banden (3–5 ms). C: `frame.energy` = 512-bin 0–15 × gain.
- Läsare: energilagret tar B (effects.ts:1428). Flank-drop, lyft och nästan-drop tar A (effects.ts:442: "Flank-dropen läser fortfarande bodyDb"). Punch och `registerKick` tar C (effects.ts:1800, index.ts:205).
- Problem: ljusets nivå och dropbeslutet ser olika bas med olika latens.
- Förslag: B (snabbast, FB_K-kalibrerad mot 2048-dB) blir den enda basen. bodyDb blir en transform av B, och C ersätts av B.
- Risk: dropkalibreringen (DROP_QUALITY_DB med flera) är mätt på 2048. Mått: drop_*, latens, ljusdomaren.

**3. Sektionsenergi: intensity och section/sectionTier**
- A: `intensity` (snabba tråden, nivå-EMA mot ett golv på 150 s, analyser.ts:3263). B: `section`/`sectionTier` (workern, percentilrang av block-dB, täthet och klang).
- Läsare: `tierEma` matas av A (effects.ts:1057) men snäpps av B (1075–1076). Halveringen går på A (1314). Manus, droplyft och buildExit går på B. Sektionen själv använder A för trend och prediktion (`secRiseRun`).
- Problem: lookens energinivå väljs av två mått som rör sig olika.
- Förslag: B vinner. Tiern blir sectionTier plus rangens percentil (`secPct`) som kontinuerligt värde. A tas bort eller blir B:s blockmedel.
- Risk: konsertlookernas val (ljusdomaren), upp_s/ned_s/korta.

**4. Ettan och takträkningen: tre modeller**
- A: `barAcc` → `frame.barShift`, beräknad mot skuggrutnätet (analyser.ts:3256). B: BeatFeeds `barStep`/`barOff` (beatFeed.ts:275). C: `sectionBars` = (nu − sectionStart)/localBpm, utan fas (analyser.ts:3801), plus `predictHigh`-frasgittret (1548–1568).
- Läsare: effektklockan tar B. A roteras in och kompenseras bort (beatFeed.ts:417–420), så A räknas men verkar netto bara på skuggan. Lookbytets taktgrind tar C (effects.ts:1155), förvarningen tar C.
- Problem: lookbyten hamnar på en "takt" som inte är effektklockans takt.
- Förslag: B vinner. sectionBars och predictHigh räknar på cfg.beat + barOff, och A tas bort.
- Risk: ettan, ljusdomaren (bytenas timing).

## Risk för isärglidning

**5. Låtgräns**
- Källor: boundaryDetector (form + tystnad 3 s, boundaryDetector.ts:196), analysatorns sektionsnollning efter 10 s tystnad (analyser.ts:1334), och BeatFeeds egna slutsatser (tempohopp > 3 % → `barReset`, beatFeed.ts:204 och 368).
- Läsare: index.ts:191 skickar gränsen bara till effekter och analysator. Effektklockans tempogram och etta får aldrig höra den.
- Förslag: boundaryCount blir den enda källan. Den skickas även in i taktvägen (en flagga i hop-recordet), och 10 s-regeln tas bort, eftersom 3 s-gränsen redan fyrar först.
- Risk: gr_*, mix_las, ettan.

**6. Basnot-anslag**
- Källor: `stepBassline` (2048 `bandLvl`, analyser.ts:1659) ger `profile.bassline`. Effekternas `bassNoteIdx` (snabb `onset.bass`-flank, effects.ts:2095). BeatFeeds basgångsstigning (beatFeed.ts:276).
- Problem: tydligheten mäts på en signal men stegen tas på en annan.
- Förslag: en anslagsräknare i analysatorn på snabba banden. Tydligheten blir dess takt per slag.
- Risk: ljusdomaren, ettan.

**7. Tystnad och brusgrind**
- Samma jämförelse `rms vs noiseFloor·1,5` finns på fyra ställen (analyser.ts:3133, 3274, 3308, 3381). Det sista ligger i workern och läser en `cfg`-kopia som aldrig uppdateras (split.ts:99).
- Därtill tre andra trösklar för "tyst": nivå ≤ 0,02 i 3 s (boundary), nivå < 0,02 i 2 s (effects INPUT_OFF) och FLANK_SILENT_LV 0,005.
- Risk i dag: låg, eftersom noiseFloor inte ändras live.
- Förslag: `activeMs > 0` från snabba sidan (redan i B_ACTIVE) ersätter workerns grind. En tröskel för "tyst".

## CPU och död kod

**8. 2048-banden kör i onödan parallellt med de snabba**
- `bandPeak`/`bandLvl`/`bandOn` med median/MAD för 8 band (analyser.ts:3407–3479) läses bara av profilen (bandOn[5], bandOn[6]) och basgången. Ljuset läser fb*.
- Förslag: profilen tar fb*, och 2048-loopen behåller bara `bandDbRaw`/`bandDb` och sinken.
- Risk: profilvärden, alltså lookval.

**9. Ren dubbelräkning eller död kod**
- `frame.kickRise` (analyser.ts:3784) är samma tal som BeatFeeds `riseDb` (beatFeed.ts:403) och har noll läsare.
- `linK` (beatFeed.ts:277) och `riseDb` är samma 6-hopsring, linjär respektive dB. En ring räcker.
- boundaryDetector `pushNovelty` och `tempoShiftCount`/`charShiftCount` saknar läsare. `noteCharShift` finns inte längre, så bänkens anrop är no-op.
- `levelCeil`/`inZone`/`breaking` läses bara av UI/logg.
- index.ts:115 skapar en `BeatFeed` (med skugga) som aldrig körs med taktvägen.

## Uteslutet (inte samma storhet, eller inte aktivt)
- GRID_PHASE/beatPhaseMs: av, räknas inte.
- Total-AGC (`gain`) och per-band-AGC: olika storheter.
- `level`/`levelVU`/`lvlSmooth`: transformer av samma källa, vilket är tillåtet.
- audio.ts kanalbalans: kanalval, inte nivå.
- centroid och profile.bright: olika mått.
- Effekternas `eSm`-fönster: används bara av dropens efterkontroll och faller med fynd 1.
