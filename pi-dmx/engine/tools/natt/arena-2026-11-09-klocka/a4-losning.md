# a4 – FASEN OCH ETTAN: en klocka, en fas, en etta för båda profilerna

## IDÉN
Båda profilerna kör **klockan** (analyserClock.ts, B). Hela lotus egen väg är borttagen ur den delade analysatorn: OWN_TEMPO, computeBpm/scoreEnv/alignScore/shiftDetect, lotus gridfas computeGridPhase (LOTUS_GRID_PHASE med TRIM/OFFSET/STICKY) och analysatorns kick-taktfas (barAcc → barShift).
Profilen säger bara VAR klockan körs. `sys.BEAT_FEED` 'slow' ger taktvägen (DMX). Osatt eller 'inline' kör den sist i process() (lotus). Lotus profilfil behöver därför inte ändras.

**Kortets del, EN fasmodell:** ramen bär klockans rutnät. `publishPhase()` i analyserClock.ts är den enda stället där fasen skrivs till ramen:
- `frame.beatPhaseMs` = klockans publicerade ankare. Det är samma tal som `cfg.beat.anchorMs`, som DMX-effekterna läser, och ankaret ligger på ettan.
- `frame.beatPhaseConf` = 1 + klockans tillit. Det är samma skala som `lotusbank --fas klocka` mätte. Lotus följare (LOTUS_PHASE_FOLLOW, live) läser fältet utan att ändras.
- `frame.barShift` = klockans etta (taktmodellen, DMX ettan 100 %) uttryckt i slagindex för systemets EGET rutnät. För lotus är det motorns `_beat` via setBeatGrid, och klockans egna setBeatGrid-anrop räknas inte. Lotus `(idx + barShift) % 4 === 0` blir då klockans etta. Fältet är -1 innan taktmodellen dömt en etta och när rutnätens tempo skiljer mer än 4 %.

Alltså får lotus BLE-tick (följaren på beatPhaseMs + beatLeadMs) och DMX-effekterna (cfg.beat) samma rutnät. De skiljer sig bara i sina egna offset: lotus PHASE_BIAS_MS/beatLeadMs, DMX GRID_EARLY.

## Tabellen PER DEL
| del | A (lotus) | B (klockan) | sammanslagning | val | siffran som bär valet |
|---|---|---|---|---|---|
| tempovalet | korpus 396/503, syntet 6/8; DMX klipp 97,7 / mix 96,4 | korpus 441/503, syntet 5/8; DMX klipp 98,3 / mix 97,2 | – (a1/a3:s del) | B | +45 korpus mot −1 syntet (swing 3/2-fantom) |
| låsning, tempohopp | spann inom låt 9 BPM | spann 33 BPM; DMX mix_las 2,48, mix_hopp 0,05 | – | B | DMX-måtten finns bara för B; spannet är priset (risk) |
| **fasen** | gridfas på A:s tempo: median 0,88 / motfas 32 / i fas 235 (388 gemensamma låtar) | klockans rutnät på samma 388: **0,88 / 12 / 242**, medel 0,766 → 0,786; följare raw \|off\| 36 → 24 ms | lotus gridfas som domare över klockans halvslag: offline på 126 låtar ger gridfasens kvot ingen skillnad (kvot ≥ 1,5: 8 rätt / 5 fel; ≥ 2,0: 3/3; ≥ 2,5: 2/2) = slantsingling | **B** | motfas 32 → 12 på samma låtar; gridfas på klockans tempo 0,85 / 16 / 223, sämre än klockan |
| **ettan** | kick-barAcc (bara på kick-hopp, mot ett annat rutnät, ingen bänk) | taktmodellen: DMX ettan 100 % | – | **B** | testDownbeat 100 %. Lotus etta mäts inte i någon bänk |
| tillitens info | tempogrammets peak/mean | repeatRate × tgClear | – (a5) | B | en tillit = cfg.beat.confidence → frame.bpmConfidence + beatPhaseConf |
| break/coast | analysatorns bpm 0 vid tystnad | BREAK_HOLD + coast | – | B | DMX bas (upp_s/ned_s spärr) |
| omlåsning vid låtgräns | hintTrackChange + egna vakter | H_BOUND → relock() | – (a6) | B | DMX gr_ratt 73,3 / gr_falska 0 |

Mätunderlag för fasen: `skript/fasjmf.py` (A mot B mot B-klockfas på gemensamma låtar ur lotusbank-utskrifterna), `skript/dbgEntry.mjs` + `skript/ana.py` (domarprovet, en snabbkörning à 126 filer på B-bygget).

## Siffrorna
**Lotusbank (full, 503 + 8), a4 mot A (lotus nu):**
| | A | a4 |
|---|---|---|
| korpus rätt | 396 | **441** |
| syntet | 6/8 | 5/8 (100_hats8_kick1_snare_swing → 149,8) |
| kick R/P | 0,80/0,86 | 0,80/0,86 |
| on-beat-recall | 0,84 | 0,84 |
| fas median / motfas / i fas (n) | 0,88 / 33 / 238 (399) | 0,82 / 21 / 248 (452) |
| samma 388 låtar | 0,88 / 32 / 235 | **0,88 / 12 / 242** |
| fas mot Beat This! | 0,89 | 0,82 (355 gemensamma: 0,89 → 0,88, motfas 28 → 10) |
| följare raw on-beat (\|off\|) | 0,90 (36 ms) | **0,95 (24 ms)** |
| spann inom låt | 9 | 33 |
Bänkutskriften är byte-identisk med baslinjens "B --fas klocka", så a4 = B + klockans fas, nu som kodens standard utan lindning.
Mot spärren: korpus +45, i fas +10, motfas −12, följaren +0,05, fas på samma låtar lika. Syntet −1 och fasmedianen 0,88 → 0,82 räknas på olika låtmängder: 0,82 kommer av 53 fler låtar i rätt oktav, och på samma låtar är den lika. Uppvägningen ska ägaren godkänna.

**DMX (tvavagar --mat):** se `tvavagar.json` och raden nedan. DMX-md5 identisk i --snabb (lang1021 120 s) eftersom DMX-vägen inte ändrats (ingen DMX-konsument läser beatPhaseMs/barShift).
DMX-domarens rad: **a4 +0,00** (långsamma +0,00, latens +0,00, cpu-kvot 0,994, latens 80 ms, p99 6 hop ≤ X = 7, md5 LIKA på hela lang1021 + megamix i sync- och moment-läget). Alla 17 mått = bas: mix_klocka 97,24, mix_las 2,48, mix_still 2,73, mix_hopp 0,05, klipp 98,28, ettan 100, grid40 52,9, gridfel 21,4, upp_s 1,35, ned_s 3,00, träff 100, korta 30,3, drop 100/5,71/216, gr_ratt 73,3, gr_falska 0.
Ljusdomaren körs inte, eftersom md5 är lika (= bas). KRAV EN KÄLLA står kvar: klockan är den enda tempokällan, och nu också i lotus.

**Workerns µs/hop:** feedRealtid workerUsPerHop **44,4 µs/hop** (bas i samma mätning 37,4; PC-last, md5 identisk), långt under 130. DMX-workern är orörd. Lotus gridfas och computeBpm i lotus worker är borta.
**Lotus snabba tråd (PC, skript/tid.mjs, 60 s lang1021, inline):** klockan **53 µs/hop** i process(). Hela inline-analysatorn: 154 µs/hop mot A 133 (+21 µs totalt).

## Var OWN_TEMPO togs bort (fil:rad i engine/src HEAD → a4)
- analyser.ts:49 `const OWN_TEMPO = clockMode() === null` bort. analyser.ts:3961 `clockMode()` ger 'slow' | 'inline' (osatt = 'inline'), a4 analyser.ts:3081.
- analyser.ts:1990–2490 computeBpm, 1114–1221 scoreEnv, 1228–1251 alignScore, 1262–1296 shiftDetect, 1948–1987 tempoGramStep/bpmHistSort/offBeatStep, 1658–1671 envStepOwn, 904/926/784 subhSuspect/sharpOf/debugCandidates: bort (−904 rader).
- analyser.ts:1601–1647 computeGridPhase och 408–439 GRID_PHASE_ON/TRIM/OFFSET/STICKY bort. S_PHASE_MS skrivs och läses inte längre (1743–1744, 1796).
- analyser.ts:1743, 1920, 3127, 3146, 3273: OWN_TEMPO-grenarna bort, bara klockgrenen kvar.
- analyser.ts:3266–3295 kick-taktfasen (barAcc → barShift) bort. Den ersätts av publishPhase (a4 analyserClock.ts, före BeatFeed), anropad i process() (a4 analyser.ts:2956–2960) och i HopLaneFast.feed (a4 split.ts).

## RISKEN
1. **Lotus live på Pi:n, CPU i huvudtråden.** Lotus kör `LOTUS_ANALYSER_SPLIT=worker` utan BEAT_FEED, så klockan körs i process() på motorns tråd (53 µs/hop på PC, grovt 8–10× på Zero 2 W ≈ 0,4–0,5 ms av 2,67 ms per hop). computeBpm och gridfasen försvinner ur workern, men lasten flyttar till ljustråden. Så kan det portas: lotus engine anropar `analyser.hopLane.feed(frame, cfg, analyser)` som DMX och sätter BEAT_FEED 'slow', så att klockan körs i workern. Det är en ändring bara i konsumenten. Mät `/api/perf` före och efter.
2. **Följaren live:** LOTUS_PHASE_FOLLOW får nu beatPhaseMs vid varje fasrättning i klockan (onsetStep var 250 ms) i stället för 4 Hz gridfas. Halvslagsflytt kräver kvot ≥ 2,0, det vill säga klockans tillit 1,0. Klockan flyttar själv sitt rutnät, så när tilliten är lägre följer lotus bara med små steg (KP_LO/HI). Bänkens f1–f3 0,94–0,95 är mätta på exakt den här skalan. PHASE_BIAS_MS 20 ms och beatLeadMs är oförändrade: klockans puls ligger +21 ms (median) mot Beat This!, gridfasen låg +15–20 ms.
3. **Lotus etta** byter källa från kick-barAcc till klockans taktmodell. Ingen lotusbänk mäter ettan. Ögat i källaren avgör (barAccent).
4. **Tempospannet inom låt** 9 → 33 BPM och syntetens swing-fantom (3/2) följer med B. Det är tempovalets del, inte fasens.
5. LOTUS_GRID_PHASE / _TRIM / _OFFSET_MS / _STICKY och TEMPO_EVIDENCE/UP43/FIVE4/SHIFT/HOLD i lotus drop-in läses inte längre (verkningslösa). ANALYSER_SHARED.md5 och lotus kopia måste uppdateras vid porten, annars stoppar deployspärren.
