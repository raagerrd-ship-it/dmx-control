# Klockkarta: vilken klock- och tempokod som körs (2026-11-12)

Läst, inget ändrat. Läget: dmx-control `4c21cae`, lotus-light-link `36403b56`. De fyra delade filerna är byte-identiska i båda repona. Radnummer gäller `engine/src`.

**Kort:** all temposökning sker i `analyserClock.ts` (`BeatFeed`). `analyser.ts` har ingen levande temposökning kvar, bara transport av klockans tal, kickgrinden och rester från den gamla egna vägen: ca 175 säkert döda kodrader, ca 30 som bara verktyg läser och ca 70 som är döda i drift men kräver bevis. Inga env-flaggor är satta enligt repona (DMX: `tools/ladan.py` `SHOW_ENV` tom; lotus: bara `LOTUS_ANALYSER_SPLIT=worker`, samma som profilen). Pi:arnas verkliga drop-ins är inte kontrollerade (ingen ssh).

## 1. Flödet

Steg 1–3 och 5–6 är samma kod i båda systemen. Bara steg 4 och 7 skiljer.

| # | steg | fil:rad | tråd |
|---|---|---|---|
| 1 | `process()` börjar med `setClock(hopLane.clockBpm, clockConf)`: förra hoppets klocka blir `localBpm`/`localBpmConfidence` | analyser.ts:2109, :1818 | snabb |
| 2 | Klockans indata: `fastBandStep` ger `specAbs`/`onset` (FAST_BANDS=1). `kickStep`: spärr 0,6 slag på klockans tempo (170–330 ms), grind mot klockans inre rutnät + 45 ms när tilliten > 0,5. `kickRefine` ger `kickAtMs`/`beatAnchorMs` | analyser.ts:2615, :2385 (:2430, :2449), :2553 | snabb |
| 3 | `fillFrame`: `f.bpm`/`f.bpmConfidence` = klockans tal från förra hoppet, `beatPhaseMs` = 0, `barShift` = −1 | analyser.ts:3147, :3157–3160 | snabb |
| 4a | **DMX:** motorn matar: `analyser.hopLane.feed(frame, cfg, analyser)` | index.ts:202 | snabb |
| 4b | **lotus:** analysatorn matar själv (`hopSelf`): `hopLane.feed(f, clockOut, this)` och sedan `publishPhase` som sätter `beatPhaseMs` (publicerat ankare), `beatPhaseConf`, `barShift` | analyser.ts:3169–3173, analyserClock.ts:162 | snabb |
| 5 | `HopLaneFast.feed`: hop-record (H_NOW = `Date.now()`, specAbs sub/kick/bass, onset highMid/treble, kickAtMs, beatAnchorMs, låtgränsräknare, tystnad). `apply` hämtar senast publicerade resultat till `cfg.beat`, `cfg.beatErr`, `setClockGrid`. Sedan `f.bpm`, `f.bpmConfidence`, `f.beatTrust` (`trustStep`) | split.ts:236–253, :255–270, analyserClock.ts:19 | snabb |
| 6 | Workern (en tråd, part `all`): `lane.drain()` kör `BeatFeed.update` per hop-record och publicerar | slowWorker.ts:57–69, split.ts:298–331 | långsam |
| 6a | låtgräns → `relock`; tystnad > 10 s släpper klockan | analyserClock.ts:474, :457, :504 | |
| 6b | tillit per kick (`onBeatRate`, `repeatRate`, upptag efter break) | :510–529 | |
| 6c | ring: basens dB-stigning över 6 hop + diskantens onset, vartannat hop | :531–537 | |
| 6d | **tempot:** `tgStep` (139 hypoteser per oktav, en per hop) med `tgScore`, två minnen, kronan mot 4:3/3:2, oktavkanten, `peakVote`/`peakScore` → `tempoBpm` | :295, :267, :299–313, :326–331, :339–347, :361, :391 | |
| 6e | kallstart; `onsetStep` var 250 ms (fas, fintempo, hopp till `tempoBpm` vid > 3 % avstånd) | :541, :219–263 | |
| 6f | ettan (`barStep`/`barCommit`); coast; `confidence = repeatRate × tgClear` | :421, :438, :546–557 | |
| 6g | ut: kickrutnät = inre + 45 ms; publicerat ankare = inre + ettan − 25 ms | :478–487 | |
| 7a | **DMX läser:** `cfg.beat` (effects.ts via beatClock.ts, heartbeat, server.ts), `frame.beatTrust` (effects.ts), `frame.bpm`/`bpmConfidence` (boundaryDetector, index.ts:187) | | |
| 7b | **lotus läser:** `frame.bpm`, `beatPhaseMs` (− 20 ms), `bpmConfidence` → `_beat` (piEngine.ts:1779–1808), `frame.beatTrust` (:1828), `barShift` (:1495, :2374), `clockOut.beatErr` (alsaMic.ts:515). `setBeatGrid` är bara referens för `barShift` (analyser.ts:1974) | | |

**Vägval:** `ANALYSER_SPLIT` (`worker` i båda profilerna) och `BEAT_FEED` (DMX `slow`, lotus osatt). Båda ger `clockMode()` = `slow` (analyser.ts:3295); osatt ger dessutom `hopSelf` (:3237). Låtgränsen kommer från boundaryDetector i DMX (index.ts:191) och från Sonos låtbyte i lotus (piEngine.ts:1768).

**Tre vägar som inte är drift men som bänkarna mäter:**
- inline: `peer.drain()` synkront i `feed` (split.ts:247), `dmxDumpMoment` med `DUMP_SPLIT=inline`.
- sync: riktiga workern i lås-steg, `dmxDump` med `DUMP_SPLIT=sync`.
- odelad: `a.clock = new BeatFeed()` (analyser.ts:3231), klockan körs i `fillFrame` (:3170) med `Date.now()`. Det är vägen `lotusbank.py` mäter (`LOTUS_ANALYSER_SPLIT=''`, rad 70), inte lotus driftväg.

## 2. Flaggorna

Alla env-läsningar i de fyra filerna. `sys` = `DMX_`/`LOTUS_`-prefix. Profilvärdena är lika i båda systemen utom `BEAT_FEED`.

| namn | fil:rad | standard | profil DMX / lotus | verkan | bedömning |
|---|---|---|---|---|---|
| ANALYSER_SPLIT | analyser.ts:3229 | odelad | worker / worker | delad analysator | LEVER |
| BEAT_FEED | :3237, :3295 | osatt | slow / osatt | vem som matar taktvägen; `inline` = klockan i `process()` | LEVER (`inline` bara i verktyg) |
| FAST_BANDS | :459 | av | 1 / 1 | klockans indata ur snabba banden | LEVER |
| KICK_COOLDOWN | :832 | 0 | 0 / 0 | fast kickspärr i ms; 0 = tempoanpassad | LEVER, profilraden = standard |
| KICK_EFLOOR | :833 | 0,06 | 0,006 / 0,006 | kickens energigolv | LEVER |
| KICK_NOGATE | :830 | av | – | kickgrinden av | AVSTÄNGT PROV (fungerar) |
| GRID_PHASE_OFFSET_MS | :511 | 0 | – | drar ms från `beatPhaseMs`; verkar bara i lotus väg (:3173) | AVSTÄNGT PROV (fungerar i lotus) |
| DMX_TRUST_UP, DMX_TRUST_LEAK_MS | analyserClock.ts:57 | 0,12 / 4000 | – | tillitens steg och läckage; rå `process.env` | AVSTÄNGT PROV |
| DMX_BREAK_RESTORE_MS | analyserClock.ts:79 | 20000 | – | fönstret för upptag efter break | AVSTÄNGT PROV |
| TEMPO_LAGMAX | analyser.ts:65 | half | full / full | konstanten läses aldrig | DÖD |
| TEMPO_EVIDENCE | :798 | av | – | läses aldrig | DÖD |
| TEMPO_UP43 | :811 | av | – | läses aldrig | DÖD |
| TEMPO_FIVE4 | :815 | av | – | läses aldrig | DÖD |
| TEMPO_ENV_S | :482 | 5 | – | längd på ringar som ingen läser | DÖD i praktiken |
| GHOST_WAIT | :340 | av | 1 / 1 | läses aldrig | DÖD |
| SUBH_GUARD | :326 | av | 1 / 1 | bara i `subhSuspect`, som aldrig anropas | DÖD |
| SUBH_MULT (bar) | :324 | 3 | 8 / 8 | läses aldrig | DÖD |
| OCT_UP (bar) | :903 | 24 | 12 / 12 | läses aldrig | DÖD |
| SIL_CLEAR_PENDING | :63 | av | 1 / 1 | enda läsaren ligger i en onåbar gren (:2492) | DÖD |
| SECTION_HINT_LOWCONF | :288 | på | 0 / 0 | läses aldrig | DÖD |
| HIGH_DIAG | :59, :335 | av | – | fyller en ring ingen läser; :335 läses aldrig | DÖD |
| BPM_TRACE, DROP_TRACE | :60, :61 | av | – | loggrader | DIAGNOSTIK |
| SECTION_DUMP | :642 | av | – | sektionsdump | DIAGNOSTIK |
| SPLIT_TEST_CRASH | slowWorker.ts:34 | av | – | avsiktlig krasch i stresstest | DIAGNOSTIK |
| SECTION_AGG, SECTION_SCORE_F32, SECTION_CARRY, SECTION_WIN, SECTION_RUN, SECTION_RUN_IN, SECTION_BODY_HIGH, SECTION_BODY_HIGH_DB, SECTION_EARLY_DB | :68, :71, :535, :563, :594, :599, :603, :604, :822 | – | satta lika i båda | sektioner, inte tempo | LEVER |
| SECTION_REPEAT | :686 | 0 | – | sektionsprov | AVSTÄNGT PROV |
| BODY_RISE_DB, BODY_GONE_MIN_MS, DROP_QUALITY_DB, DROP_RISE_LOW_DB, DROP_UNDERPEAK_MIN, MINI_SPACING_MS (bara) | :264–300 | – | satta lika i båda | drop, inte tempo | LEVER |

`split.ts` läser ingen env. Sju profilrader per system styr alltså ingenting: TEMPO_LAGMAX, SIL_CLEAR_PENDING, GHOST_WAIT, SUBH_GUARD, SECTION_HINT_LOWCONF, OCT_UP, SUBH_MULT.

Obs SIL_CLEAR_PENDING: profilen säger `1` (tystnad nollar en väntande kickförfining), men grenen som gör det är onåbar. Beteendet gäller alltså inte i något av systemen i dag. Att ta bort grenen ändrar inget; om nollningen ska gälla är det en egen ändring, inte städning.

## 3. Död kod i klock- och tempodelen

Läsare är sökta i 10 282 filer i båda repona (src, tools, public, deploy, lotus pi/src, pi/tools, tools); rådata i `lasare.out`. `pi-dmx/deploy/*.js` är ett gammalt bygge (4 okt) och räknas inte som läsare.

### Säkert dött (inga läsare någonstans)

| post | fil:rad | kodrader | varför |
|---|---|---|---|
| Gamla temposökningens fält och konstanter: röster, lås, historik, 7 arbetsytor, `priorLut`, `subhSuspect`, `sharpOf`, SHIFT_*, EVID*, cand*, HARM_*, OCT_* m.fl. | analyser.ts:320–342, :516–518, :717–727 (fas-fälten), :775–1024 (allt utom det som räknas upp under 4.1) | ca 105 (+ ca 130 kommentarrader) | deklareras eller skrivs, läses aldrig; `computeBpm` är borta |
| Två onåbara grenar: `else if` med samma villkor som grenen före | analyser.ts:1744–1749, :2487–2497 | 17 | kan aldrig nås |
| Tomma skal: `envStep`, `clearLockVotes`, `traceWin`, `alignAt` med anrop | :1510–1513, :1858–1862, :1788, :3190–3195, anrop :1767, :1778, :2549, :1797, :1838 | ca 20 | gör ingenting eller skriver bara döda fält |
| `holdSilent`/`holdGrace` och skrivningarna till `tempoGram` | :853, :1743, :1757, :2485, :2506–2507; :1748, :1750, :1798, :1837, :2494, :2500 | ca 12 | enda läsaren är tomma `envStep` |
| `frame.kickRise` och ringen `kickRiseDb` | :250, :420–421, :3149–3153 | 8 | noll läsare i båda repona (bara två html-rapporter nämner ordet) |
| Döda delar i `hintTrackChange` och `setVirtualClock` | :1825–1837, :1911–1915 | ca 9 | nollar döda fält |
| Räknarna `onsetFixes`, `barShifts`; dubbelgrenen i `onsetStep`; `resetTempo`/`resetBar` i `update`-typen | analyserClock.ts:186, :262, :201, :451, :226–227, :472 | 5 | skrivs bara; grenarna är identiska; anropas aldrig |
| Inaktuella kommentarer som pekar fel | analyserClock.ts:40–51, :70, :91–101, :140–154; analyser.ts:741, :3225–3226; split.ts:191; DMX-profilens "lotus: 'inline'" | ca 45 rader text | beskriver flaggor och vägar som inte finns |

Summa säkert dött: **ca 175 kodrader och ca 175 kommentarrader**, nästan allt i `analyser.ts`.

`linK` och `riseDb` är **inte** döda. `riseDb` (dB) matar tempogrammet och `linK` (linjär) matar ettan. De bär samma signal i två former; att slå ihop dem är en omskrivning, inte städning. Den verkliga dubbletten är `kickRiseDb` i analyser.ts.

### Dött i drift men läst av verktyg

| post | fil:rad | kodrader | läsare / risk |
|---|---|---|---|
| `dbgBestLag`, `dbgLagMin/Max`, `dbgTgAt`, `dbgPhase`, `evidRelockVotes`, `evidenceRelocks`, `evidenceLockScore`, `evidenceScore/Half/Cands/Second`, `rawBpmLast`, `tempoShifts`, `debugCandidates()` | analyser.ts:721, :842, :845, :864, :869, :872, :874, :876–879 | ca 12 | lotus `bench.mjs` (rad 46–63, guardat med `?.` och `> 0`; mest `--dbg`), `tempoShift.mjs`. Alltid 0 i dag |
| `lagBounds`, `tempoGramSnapshot`, `tempoGram`, `diagLagMin/Max` | :955, :993, :1004–1005 | 5 | DMX `tools/evidence.mjs`, `peaks.mjs`, `offlineRefine.mjs` destrukturerar dem och kraschar om de tas bort. Verktygen mäter redan bara nollor |
| `resetTempo()`, `resetBar()`, F_RESET_TEMPO/F_RESET_BAR, `FS_RT_CNT`/`FS_RB_CNT`, `rt`/`rb` | analyser.ts:1792–1799, :1865, :1740, :1742; split.ts:224, :260–261, :289, :328 | ca 15 | klockan anropar dem aldrig. Verktyg anropar: `analyserParity.mjs` (båda repona), `effectMix`, `showStory`, `showTight`, `testDownbeat`, `applyBase.py`, lotus `splitStress.mjs` |
| Odelad och inline klocka: `clock`, `publishClock`, tilliten i `update` | analyser.ts:3170, :3178–3181, :3231, :3236; analyserClock.ts:485–487 | 8 | **rör inte**: `lotusbank.py` (odelad analysator) och index.ts:202 (motorn utan delning) går den vägen |

### Dött i drift, inga verktygsläsare, men kräver bevis

| post | fil:rad | kodrader | varför / risk |
|---|---|---|---|
| Hop-recordets `H_BPM`, `H_CONF`, `H_BARSHIFT`, `H_ON_KICK`; `FS_FCONF`, `fconf`, `cin` | split.ts:200, :240–241, :284, :307, :310, :312, :326 | ca 8 | klockan läser dem aldrig. Låt platserna stå kvar (layouten), ta bara skrivningarna |
| `S_BPM`, `S_CONF`, `S_BPMF`, `S_PHASE_MS`, `S_PHASE_CONF`; analysatorns `beatPhaseMs`/`beatPhaseConf` (alltid 0) | analyser.ts:1585, :1636–1637, :717, :3159–3160 | ca 6 | skrivs men läses inte, eller läser alltid 0. lotus `splitStress.mjs` läser `S_BPM` |
| Env-ringarna och dubbelslagsdämpningen: `envRing`, `envBassRing`, `envHighRing`, `envFilled`, `envAccum`, `envBassAccum`, REFRAC_*, `R_ENV`/`R_BASS`/`R_HIGH`, `envLastWallMs` | analyser.ts:483–484, :950–951, :1015–1016, :1757–1763, :2255–2262, :2527–2546 | ca 30 | dämpningen läser bara sin egen ring; resultatet når bara `holdSilent` (dött). oklart: kedjan ser verkningslös ut men är lång, md5 måste avgöra |
| `part` `lane`/`slow`, `WAIT_FLAG`, `C_WAITING_B`, slutslingan | slowWorker.ts:28–29, :56, :70–81; analyser.ts:3252, :1573, :1661; split.ts:246 | ca 18 | `parts` är alltid `['all']`. Slutslingan nås bara utan taktväg och utan stora vägen (ingen profil). Trådkod: bara md5 i sync-läget räcker inte, kräver också en riktig worker-körning |
| F_SIL350/F_SIL10-kedjan | analyser.ts:2484–2486, :2498–2502, :1743, :1750 | ca 8 | oklart: sätter `localBpm` = 0 under ett hopp innan klockan själv släpper; kan synas i `sectionBars`. Rör inte utan md5 |

## 4. Städlistan

Störst nytta först. Bevis för varje steg, på en kopia byggd med `python tools/arena/bygg.py <mapp>`:
- `DUMP_SPLIT=sync node tools/dmxDump.mjs <dist> <wav> 100000` och `DUMP_MOMENTS=1 DUMP_SPLIT=inline node tools/dmxDumpMoment.mjs ...` på lang1021 och megamix: md5 per lampa identisk mot `engine/dist`. Obs: megamix_ladan.wav har trasigt huvud och ger falsk "identisk" (0 rutor); använd den rättade kopian eller kontrollera `frames > 0`.
- `python tools/arena/lotusbank.py <mapp>` mot `--bas`: samma utskrift rad för rad (463/503).
- `python tools/arena/tvavagar.py --snabb <mapp>`: IDENTISK.

Efter varje steg i delade filer: samma ändring i lotus och `analyser_shared.py --write` (annars vägrar deployen).

| # | vad | rader | risk | extra bevis |
|---|---|---|---|---|
| 4.1 | Gamla temposökningens fält och konstanter i analyser.ts (tabell 3, rad 1) + döda flaggkonstanterna + de 7 profilraderna. Behåll i :772–1030: `localBpm`, `localBpmConfidence`, SECTION_EARLY_*, KICK_*, `dbgKick`/`dbgRms`, EMA-fälten :935–940, `hGated`/`silenceLevel`/`silentMs`, basgångsfälten :1011–1013, REFRAC_N, `silenceArmed`, `beatAnchorMs`. Ta namnen ur `DOUBLE_FROM_START` (:346) | ca 105 kod + 130 kommentar | lägst: rena deklarationer | inget utöver de tre |
| 4.2 | Onåbara grenar, tomma skal, `holdSilent`, tempoGram-skrivningarna | ca 50 | låg | inget utöver de tre |
| 4.3 | `frame.kickRise` + ringen | 8 | låg | inget; ramens form ändras, bara V8 |
| 4.4 | Inaktuella kommentarer (tabell 3) | ca 45 text | ingen (md5 på dist oförändrad) | – |
| 4.5 | Klockans småsaker: `onsetFixes`, `barShifts`, dubbelgrenen, typen | 5 | låg, men filen är arenans mål: gör före start eller inte alls | inget utöver de tre |
| 4.6 | Verktygslästa tempofält (tabell 3, del två, rad 1–2) | ca 17 | medel: tre DMX-verktyg kraschar, lotus bänk i `--dbg` | ta bort eller rätta verktygen samtidigt; kör `bench.mjs` utan och med `--dbg` |
| 4.7 | `resetTempo`/`resetBar`-kedjan | ca 15 | medel: sju verktyg anropar | behåll metoderna som tomma eller rätta verktygen |
| 4.8 | Env-ringarna, hop-recordets oanvända fält, S_*-platserna | ca 45 | medel | md5 även på en fil med tystnad och låtbyten |
| 4.9 | slowWorker `lane`/`slow`, F_SIL-kedjan | ca 26 | högst: trådkod och tystnadskanter | riktig worker-körning (`DUMP_SPLIT=worker`, `feedRealtid.mjs`) + lotus `splitStress.mjs` |

**Före arenan:** 4.1–4.4 (ca 165 kodrader, md5-bevisbart, ca 20 min bevis). 4.5 bara om det hinner in i basen innan deltagarna kopierar den. 4.6–4.9 efter arenan; de krockar inte med deltagarnas ändringar eftersom tempot bor i analyserClock.ts.

## Det jag inte kunde avgöra

- oklart: vilka drop-ins som faktiskt ligger på Pi:arna (bara repona lästa).
- oklart: om F_SIL10-grenen och env-ringarnas dämpning är helt verkningslösa (se tabell 3); inget kört.
- oklart: om klockan ger exakt samma tal i odelad väg (lotusbank) som i taktvägen (lotus drift). Koden är densamma, men i taktvägen når klockans rutnät kickgrinden ett eller flera hopp senare.
- Radantalen är uppskattningar ur en egen genomgång (`dodsok.py`: namn som aldrig läses i kod), inte ett kompilatorbevis.

Verktyg i mappen: `dodsok.py` (olästa namn), `var.py` (förekomster i kod), `lasare.py` + `namn.txt` → `lasare.out` (läsare i båda repona).
