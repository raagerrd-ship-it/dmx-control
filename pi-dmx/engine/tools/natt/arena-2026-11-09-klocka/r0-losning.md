# r0 – EN KLOCKA FÖR BÅDA (startpunkt för finalen)

## IDÉN
Båda profilerna kör klockan, analyserClock.ts (B). Lotus egen sökning (OWN_TEMPO, computeBpm, scoreEnv/alignScore/shiftDetect,
tempoGramStep/offBeatStep, envStepOwn) och lotus gridfas (computeGridPhase) är borttagna. Analysatorns kick-taktfas (barAcc → barShift) är
också borta. r0 slår ihop de delar som bar i runda 1:
- **Tempovalet: a3.** Topprösten `peakVote`/`peakScore` (syskonen 4:3/3:4/3:2/2:3/5:4/4:5, 1,25× i 3 varv, fönster 30 varv ≈ 11 s efter
  kallstart, låtgräns eller tystnad) och oktaven under kanten (`TG_OCT_LO` 79,6). Hunkarna ligger i analyserClock.ts och är oförändrade från a3.
- **Var klockan körs: a8.** Lotus profil saknar BEAT_FEED och blir då 'slow'. Analysatorn matar sin taktväg själv sist i process() (`hopSelf`),
  så på Pi:n (LOTUS_ANALYSER_SPLIT=worker) körs lotus klocka i **workern** och inte i ljustråden. DMX matar från index.ts som förut.
  Klockans rutnät går till kickgrinden via `setClockGrid`. `setBeatGrid` utifrån (lotus PLL, BENCH_GRID) är ingen rutnätskälla.
- **Fasen och ettan: a4.** `publishPhase` (analyserClock.ts) skriver ramens `beatPhaseMs` = klockans publicerade ankare − GRID_PHASE_OFFSET_MS
  och `beatPhaseConf` = 1 + tillit. `barShift` = klockans etta (taktmodellen) uttryckt i slagindexet för lotus eget rutnät. Det lotus skickar
  med setBeatGrid sparas bara som referens för indexet, och det räknas på klockans slag närmast nu, inte på ankarens avstånd.
  I worker-läget transporteras `barKnown` i ett nytt delat fält, `FS_BARK`.
- **Inte med:** a1:s oktavzon (`TG_EDGE_HI`) och svängprov (`swingSig`). De bär inte ovanpå a3, för det finns inget kvar för dem att rätta:
  med a3 är 'dubbla' redan 2 (a1 gav också 2), och swing-syntet står på 100,2 (6/8). TG_OCT_LO dubblar hela zonen 155–159,2 som TG_EDGE_HI
  riktade sig mot, så oktavdelen överlappar helt. a5:s TG_SW_TRUST behövs inte för syntet med a3 och kostade a5 en korpuslåt.

## TABELLEN PER DEL
| del | A (lotus) | B (klockan) | delen | valet | siffran |
|---|---|---|---|---|---|
| tempovalet, lotus | 396/503, syntet 6/8 | 441/503, 5/8 | a3 röst + oktav under kanten; a1 oktav/sväng ovanpå | **a3** | r0 **474/503, 6/8**; klasser 3/2 6, 4/3 7, dubbla 2, annat 14. a1:s mål är redan nått (dubbla 2, swing 100,2) |
| tempovalet, DMX | klipp 97,7 / mix 96,4 | 98,28 / 97,24 | a3 | **a3** | klipp_klocka 98,61, mix_klocka 97,31 |
| låsning/tempohopp | spann 9 BPM | spann 33; mix_las 2,48, hopp 0,05, still 2,73 | a3:s fönster | a3 (kostnad) | spann 22; mix_las 2,48, mix_hopp 0,05, **mix_still 3,24** (−18,6 %) |
| fasen | 0,88/33/238 (n 399); följare raw 0,90 (36 ms) | gridfel 21,4, grid40 52,9 | a4 ankaret + 1+tillit **mot** a8 senaste slaget + 1/(1−tillit) | **a4** | båda: fas 0,84/15/257 (n 446). Följare: a4 raw 0,96 (23 ms, n 343), f1–f3 0,98, i fas 243; a8 raw 0,83 (22 ms, n 403), f1–f3 0,85, i fas 221–226. DMX gridfel 23,0, grid40 51,66 |
| fasen parat (samma 397 klipp, samma oktav i A och r0) | 0,88 / medel 0,762 / motfas 33 / i fas 237 | – | – | – | r0 **0,87 / 0,786 / motfas 11 / i fas 250**. De 49 klipp som bara r0 har i rätt oktav: median 0,52. Det är de som drar ned medianen till 0,84 |
| ettan | kick-barAcc mot lotus PLL (bara på kickhopp, mest −1) | taktmodellen, DMX ettan 100 | a4 klockans etta i lotus index | **a4** | DMX ettan 100; lotus barShift satt 64–72 % av hoppen på de två provklippen (förr bara på kickhopp). Ingen lotusbänk mäter ettan |
| tilliten | bpmConfidence | repeatRate × tgClear | en tillit: frame.bpmConfidence + beatPhaseConf = 1 + tillit | B | (a5: AUC 0,657 mot A 0,659) |
| break/coast | TEMPO_HOLD | coast + break-hållet | ett tillstånd (a8: setBeatGrid ingen källa → kickgrinden följer klockans coast) | B | upp_s 1,35, ned_s 3,00 = bas |
| omlåsning vid låtgräns | hintTrackChange-fönster | H_BOUND → relock() | B (relock öppnar a3:s röstfönster igen) | B | gr_ratt 73,33, gr_falska 0 = bas |
| var lotus klocka körs | – | inline i ljustråden (a1/a3/a4/a5/a7) | **a8 workern (hopSelf)** | a8 | odelad mot sync-worker: **0 avvikande hop** av 11 250 på två klipp (bpm, tillit, beatPhaseMs/Conf, barShift, kick, sektion). Huvudtråden i async worker 42,6 µs/hop mot 106 odelad (PC) |

## SIFFRORNA
**DMX** (tvavagar --mat, 1 körning, `tvavagar.json`): poäng **−0,99** (långsamma −1,64 %, latens 80 ms = bas), **ingen DISK**.
mix_klocka 97,31, mix_las 2,48, mix_still 3,24, mix_hopp 0,05, klipp 98,61, ettan 100, grid40 51,66, gridfel 23,00, upp_s 1,35,
ned_s 3,00, träff 100, korta 30,34, drop 100/5,71/216, gr 73,33/0. md5 skiljer (a3:s röst), så ljusdomaren körs: **+0,06**, inga spärrar.
Realtid p99 6 hop (X = 7). Siffrorna är exakt a3:s, alltså lägger a8/a4-delarna inget på DMX. KRAV EN KÄLLA står kvar: klockan är det enda tempot.
**Workerns µs/hop: 44,8** (gräns 130). Huvudtråd 46,5 µs/hop, kvot 1,06 inom PC-bruset, ger ingen poäng.

**Lotus** (lotusbank, full 503 + 8, `lotusbank.json` = slutkoden; koden skiljer sig från körningen bara i −offsetMs, som är 0 i bänken):
| mått | A | r0 |
|---|---|---|
| korpus | 396/503 | **474/503** |
| syntet | 6/8 | **6/8** |
| kick R/P | 0,80/0,86 | 0,80/0,86 |
| on-beat-recall | 0,84 | 0,84 |
| fas median / motfas / i fas (n) | 0,88 / 33 / 238 (399) | 0,84 / **15** / **257** (446) |
| fas parat 397 klipp | 0,88 / 33 / 237 | 0,87 / **11** / **250** |
| fas mot Beat This! | 0,89 | 0,85 |
| följare raw (\|offset\|) | 0,90 (36 ms) | **0,96 (23 ms)**, f1–f3 0,98 |
| spann inom låt | 9 | 22 |
Mot spärren: allt är lika med eller bättre än A, utom fasmedianen 0,88 → 0,84. Det beror på urvalet: parat på samma klipp är den
0,88 → 0,87 och motfasen 33 → 11. Ägaren ska godkänna det.
Underlagen: `lotusbank-senasteslag.json/.out` (a8:s fas), `prov-ankare/` (a4:s fas, = r0), `prov-ankare2/` (ankaret med beatPhaseConf
oavsiktligt 0: följaren 0,96/0,97–0,98, alltså lika). Skalan på beatPhaseConf ändrar knappt bänkens följare.

## VAR OWN_TEMPO TOGS BORT (r0/src)
- analyser.ts:46 – OWN_TEMPO är borta och ersatt av doc-kommentaren TEMPOKÄLLAN. analyser.ts:3104 – `clockMode()` ger 'slow' | 'inline' och aldrig null.
- analyser.ts: scoreEnv/alignScore/shiftDetect, computeGridPhase, envStepOwn, computeBpm/tempoGramStep/bpmHistSort/offBeatStep och
  OWN-grenarna är borttagna (från a8). Kick-taktfasen barAcc/barCount/barShiftOut är också borta (kickRefine, 5 nollställningar).
- analyser.ts:652/3046 – `hopSelf`; analyser.ts:1844 – `setBeatGrid` = bara referens (extGrid); analyser.ts:2982 – `publishPhase`.
- analyserClock.ts:121 – HV_*/TG_OCT_LO, `peakVote`/`peakScore` (a3); :146 – `publishPhase`; :192 – `barKnown()`.
- split.ts:204 – `FS_BARK`, FEED_STATE_LEN 20, HopFeed.barKnown, HopLaneFast.barKnown; setBeatGrid → setClockGrid (a8).
- Diff: `losning.diff` (3 filer, +131 −908).

## RISKEN
1. **Lotus live på Pi:n.** Klockan körs i lotus worker (hopSelf). Det är bevisat bit-identiskt i sync-läget, men Pi:ns async-worker ger
   klockans tal 1+ hop senare, som för DMX. Workern blir billigare: computeBpm (~470 µs Pi × 4 Hz) tas bort och klockan (~45–55 µs/hop PC)
   läggs till, samt röstens 7 vikningar per varv under ~11 s efter varje låtgräns. Det är omätt på ARM. Mät /api/perf (worker busyUs) före och efter.
2. **Följaren (LOTUS_PHASE_FOLLOW=1 är live).** beatPhaseConf = 1 + tillit ligger i 1–2. Följarens halvslagsflytt (PHASE_FLIP_CONF 2,0)
   nås alltså nästan aldrig, och ett motorgrid i motfas mot klockan rättas inte med en flytt. Vid porten bör LOTUS_PHASE_FLIP_CONF sättas
   till ~1,5 (konsumentens ratt, inte klockans). 1/(1 − tillit) (a8) är ett alternativ, men den skalan är inte mätt i bänken. Lotus
   kalibrering GRID_PHASE_OFFSET_MS 15 och PHASE_BIAS_MS 20 gjordes för gridfasen. Klockans puls ligger +21 ms mot Beat This!, så följ upp beatLeadMs/offset i källaren.
3. **Lotus etta** byter källa till klockans taktmodell och blir satt nästan jämt (förr −1 utom på kickhopp). barAccent = 1 = av i dag,
   och ingen bänk mäter den.
4. **DMX:** mix_still 2,73 → 3,24 s och gridfel 21,4 → 23,0 är a3-röstens pris (röstfönstret efter varje skarv). Det ger ingen DISK.
   Rösten (HV_K/HV_N/HV_AGE) är satt på några lotusfiler och inte trimmad mot kontrollmängden.
5. Lotus spann inom låt är 22 BPM mot A:s 9. De fyra delade filerna och ANALYSER_SHARED.md5 måste portas, annars stoppar deployspärren.

Budget: DMX --mat 1/3, lotusbank 3/3 (r0, prov-ankare, prov-ankare2), alla fulla.
