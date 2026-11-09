# a8 ROBUSTHET – EN KLOCKA FÖR BÅDA

## IDÉN
**B (analyserClock.ts) blir den enda klockan i båda profilerna, och tempovalet ändras inte alls.** Lotus egen sökning
(computeBpm/scoreEnv/alignScore/shiftDetect/tempoGramStep/offBeatStep/bpmHistSort, envStepOwn) och lotus gridfas
(computeGridPhase) är borttagna: −855 rader i analyser.ts. Lotus konsumenter läser klockans rutnät och fas:
- `frame.bpm`/`bpmConfidence` = klockans värden (som i B).
- `frame.beatPhaseMs` = klockans **publicerade** rutnät (samma ankare som DMX:s cfg.beat), uttryckt som **senaste slaget ≤ nu**
  (förr gridfasens 4 Hz-värde). Ett gammalt ankare hade gjort lotus följare (piEngine PHASE_FOLLOW, ±4 % tempofönster mot
  motorns utjämnade bpm) känslig för små tempoavvikelser.
- `beatPhaseConf` = 1/(1 − tillit), tak 20, i lotus skala (on/anti-kvot där 1 = ingen information).
- Rutnät utifrån tas inte emot: `setBeatGrid` är en no-op. Lotus PLL (setAnalyserBeatGrid) och bänkens BENCH_GRID var annars en
  andra rutnätskälla för kickgrinden och taktfasen. Klockan skriver via `setClockGrid`.
- **Lotus på Pi:n (ANALYSER_SPLIT=worker) kör klockan i WORKERN, inte i huvudtråden.** Profilen utan BEAT_FEED blir 'slow', och
  analysatorn matar sin taktväg själv sist i process() (`hopSelf`). DMX (BEAT_FEED 'slow') matas som förr från index.ts.
  Bevis att lotus Pi-väg är samma som bänkens väg: på dangerousgame (11 250 hop) gav odelad, split-inline och den riktiga
  workern i lås-steg (sync) **0 avvikande hop** i bpm, tillit, beatPhaseMs, beatPhaseConf, kick och sektion.
  Utan detta hade klockan legat i lotus huvudtråd och kostat ~55 µs/hop på PC.

Robusthetskortet: jag har inte trimmat tempovalet mot enskilda låtar. Kandidaterna jag valde bort är 157→80-halveringen
(2 låtar, 20 klipp: Stora tuttar 15, Cotton Eye Joe 5), swing-syntet och oktavkanten. Oktavkanten 80/160 är en äkta
tvetydighet, och DMX:s facit har fyra countrylåtar på 80–83.

## Tabellen PER DEL
Lotus-siffrorna är 503 fryst korpus. "Per låt" betyder snitt per låt av andelen rätt klipp (194 låtar), så att en låt med
15 klipp inte väger 15 gånger.

| del | A (lotus) | B (klockan) | sammanslagning | val | siffran som bär valet |
|---|---|---|---|---|---|
| tempovalet | 396/503, per låt 0,74 | 441/503, per låt 0,86 | – | **B** | B bättre på 60 låtar, sämre på 20. DMX övning: klipp 98,3 mot 97,7 och mix 97,2 mot 96,4 (kontroll ≈ lika, ±0,8 pp) |
| oktav, 2:3, 4:3, 5:4 | 3/2 16, 4/3 14, 2/3 10, 3/4 24, halva 1, annat 42 | 3/2 7, 4/3 22, dubbla 24, annat 9 | – | **B** | Per tempoband, per låt: <95 0,44→0,95, 95–115 0,68→1,00, 115–135 0,80→0,84, 135–150 0,87→0,83, ≥150 0,65→0,53 (känd svaghet: oktavfönstret 80–160) |
| låsning och tempohopp | spann inom låt 9 BPM | 33 BPM (räknar med kallstarten från 80) | – | **B** | DMX mix_las 2,48 s, mix_hopp 0,05/min, mix_still 2,73 s = bas |
| fasen | gridfas 0,88 median (399), motfas 33 | klockans rutnät 0,82 (452), motfas 21, i fas 248 | gridfas på klockans tempo (B --fas analysator): parad 0,85 | **klockans rutnät** | **Parat på samma 388 låtar: median 0,88 = 0,88, medel 0,766 → 0,786.** Medianfallet 0,88 → 0,82 kommer av 64 svåra låtar som först nu hamnar i rätt oktav (deras median 0,48). DMX grid40 52,9 och gridfel 21,4 = bas |
| ettan | barAcc mot lotus PLL-grid (lotus mäter inte ettan) | taktmodellen | – | **B** | DMX ettan 100 % = bas |
| tillitens informationsvärde | AUC tillit→rätt 0,659 | 0,650 | – | **B** (en tillit) | Lika inom bruset. B har bara 62 fel att skilja ut |
| break/coast | lotus coast i piEngine (konsument, kvar) | GRID_COAST + BREAK_RESTORE i klockan | – | **B** | DMX upp_s 1,35 och ned_s 3,00 = bas |
| omlåsning vid låtgräns | hintTrackChange-fönster i computeBpm | H_BOUND → relock() | – | **B** | Lotus Sonos-hint (hintTrackChange) räknar nu upp samma trackBoundaries som klockan läser. Ett enda omlåsningsställe. DMX gr_ratt 73,3 och gr_falska 0 = bas |

## Siffrorna
**DMX-domaren** (`--mat`, .arena/klocka/a8/tvavagar.json): md5 IDENTISK med bas, och alla 17 kvalitetsmått = bas:

    mix_klocka 97,24 mix_las 2,48 mix_still 2,73 mix_hopp 0,05 klipp 98,28 ettan 100 grid40 52,90 gridfel 21,4
    upp_s 1,35 ned_s 3,00 traff 100 korta 30,34 drop 100/5,71/216 gr 73,3/0,00 · latens 80 ms (= bas)

- Poäng ±0. CPU ger inga poäng: kvoten 1,0075 är bruset.
- Ljusdomaren körs inte, eftersom md5 är lika.
- Spärrarna klarade: sektionen = bas, Pi-budget p99 6 hop = bas 6. KRAV EN KÄLLA står kvar: inget annat tempo finns i koden.
- **Workerns µs/hop: 40,7** (bas 44,7) ≤ 130.

**Lotusbank** (.arena/klocka/a8/lotusbank.json) mot A:

| mått | A nu | a8 |
|---|---|---|
| korpus rätt | 396/503 | **441/503** (+45; per låt 0,74 → 0,86) |
| syntet | 6/8 | 5/8 (100_hats8_kick1_snare_swing → 149,8, en syntetisk fil) |
| kick R/P | 0,80/0,86 | 0,80/0,86 |
| on-beat-recall | 0,84 | 0,84 |
| fas median / motfas / i fas (n) | 0,88 / 33 / 238 (399) | 0,82 / **21** / **248** (452). Parat 388 låtar: **0,88 = 0,88** |
| fas mot Beat This! | 0,89 | 0,82 (n 415) |
| följare raw (\|offset\|) | 0,90 (36 ms), n 352 | 0,83 (**23 ms**, andel ≤ 30 ms 0,43 → 0,63), n 411 |

Lotus-spärren: korpus +45 mot syntet −1 och fasmedianen −0,06. Den parade fasen är oförändrad och motfas/i fas blir bättre.
Det menar jag är "tydligt uppvägt", men **ägaren ska godkänna** det.

Följarens 0,95 för "B --fas klocka" i baslinjen var en mätfälla. Där publicerades ett gammalt ankare, och emulatorn la då ut pulser
bara direkt efter en ankarkorrigering. Det gav 10–14 pulser per klipp i stället för 27–40, och bara 338 låtar. a8 publicerar varje
slag och ger därför den fulla bilden. På samma två klipp: gammalt ankare 0,60/0,93 på 10/14 pulser, senaste slaget 0,65/0,78 på 40/27.

## Var OWN_TEMPO och den egna sökningen togs bort (a8/src/analyser.ts)
- :46–48: `const OWN_TEMPO` borta. Doc: klockan är enda tempot.
- Borttagna block: scoreEnv/alignScore/shiftDetect (förr :1095–1297), computeGridPhase (förr :1588–1648), envStepOwn
  (förr :1657–1672), computeBpm + tempoGramStep/bpmHistSort/offBeatStep (förr :1947–2491), GRID_PHASE_ON.
- OWN_TEMPO-grenarna borta i pullSlowState, slowStep (R_CLOCK läses alltid), kickspärren och kickgrinden/barAcc (rutnätets tillit).
- :652 `hopSelf`, :1846–1851 `setBeatGrid` no-op + `setClockGrid`, :3014–3023 klockan/taktvägen + ramens fas, :3086 hopSelf,
  :3140 hopFeedFactory via clockMode, :3144 `clockMode()` = 'inline' bara om BEAT_FEED='inline', annars 'slow' (aldrig null).
- split.ts/analyserClock.ts: `setBeatGrid` → `setClockGrid` i HopTarget/update (4+4 rader).

Diff: `.arena/klocka/a8/losning.diff` (3 filer, +38 −855).

## RISKEN (särskilt lotus live på Pi:n)
1. **Lotus kalibrering av fasen gjordes för gridfasen**: GRID_PHASE_OFFSET_MS=15 (behålls, dras av) och piEngine PHASE_BIAS_MS=20.
   Klockans rutnät ligger +20 ms mot Beat This! (bänkens offset-median) mot gridfasens +31 ms, så Pi:ns puls hamnar ~10 ms
   tidigare än i dag. Följ upp med beatLeadMs/offset i källaren, inte i klockan.
2. **Flippregeln i piEngine** (kvot ≥ 2,0 i 4 raka mätningar + kickdomaren) får nu kvoten 1/(1 − tillit): flipp kräver tillit ≥ 0,5.
   Mätningarna kommer per slag (~2 Hz) i stället för 4 Hz.
3. **Klockan i lotus worker** (hopSelf) är bevisad bit-identisk med bänken bara i sync/inline. Pi:ns async-worker ger klockans tal
   1+ hop senare, som för DMX. Workern blir billigare: computeBpm (~470 µs Pi) ut, klockan (~55 µs/hop PC) in. Huvudtråden
   oförändrad. Pi-µs ej mätt.
4. **Lotus får B:s kända svagheter**: låtar ≥ 150 BPM halveras oftare (per låt 0,65 → 0,53), och swing-syntet tar 3/2. Lotus
   tempoledtråd per låt (_tempoHintRatio) och katalogen täcker delvis upp.
5. Lotus PLL-grid påverkar inte längre analysatorns kickgrind och barShift. Med KICK_NOGATE=1 live ändras inga kickar (bänken: R/P
   oförändrat). barShift följer nu klockans rutnät (barAccent = 1 = av i dag).
6. Lotus måste porta de fyra delade filerna. Deployspärren kräver att lotus kopia är byte-lik.
