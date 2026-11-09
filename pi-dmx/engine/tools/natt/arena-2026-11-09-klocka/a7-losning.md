# a7 – MINSTA DIFF: EN KLOCKA (B) FÖR BÅDA, A BORT

## IDÉN
Båda profilerna kör analyserClock.ts (B). Det enda som skiljer profilerna är VAR klockan körs: DMX `BEAT_FEED 'slow'` i taktvägen,
lotus utan BEAT_FEED = `'inline'` sist i process(). Klockan och dess logik är samma. Lotus egen temposökning (A: computeBpm,
scoreEnv/alignScore/shiftDetect, tempoGramStep/offBeatStep, evidens/UP43/FIVE4/SHIFT/HOLD) och lotus gridfas (computeGridPhase)
är borta ur koden. Fasen ut till lotus konsumenter (`frame.beatPhaseMs`/`beatPhaseConf`) är KLOCKANS rutnät: `clockOut.beat.anchorMs`
och 1 + klockans tillit, alltså exakt det `lotusbank --fas klocka` mätte. Lotus piEngine (setBeatGrid ur frame.bpm + beatAnchorMs,
fasföljaren på beatPhaseMs) är orörd: den läser nu klockans tempo och klockans fas.

Diffen är 13 rader in och 845 ut, allt i analyser.ts (`losning.diff`). Varje rad som finns kvar har ett mått bakom sig (tabellen).
DMX-md5 är IDENTISK mot bas, så DMX-sidan av diffen är bara borttagen död kod.

## PER DEL
| del | A (lotus) | B (klockan) | sammanslagning | val | siffran som bär valet |
|---|---|---|---|---|---|
| tempovalet (klipp/mix, oktav, 2:3, 4:3, 5:4) | lotus 396/503; DMX mix 96,4 / klipp 97,7 | lotus 441/503; DMX mix 97,2 / klipp 98,3 | ej provad (strategikortet: minsta diff) | **B** | lotus korpus +45 (3/2 16→7, 2/3 10→0, 3/4 24→0, annat 42→9); 4/3 14→22 och dubbla 0→24 är B:s svagheter |
| låsning/tempohopp | spann inom låt 9 BPM | 33 BPM; DMX mix_las 2,48 s, mix_hopp 0,05/min | – | **B** | DMX mix_las/hopp = bas (A mättes inte i DMX-bänken på lås); lotus spann sämre (33) men det är ingen spärr |
| fasen | gridfas 0,88 / motfas 33 / i fas 238 (n 399); raw 0,90, 36 ms | klockans rutnät 0,82 / 21 / 248 (n 452); raw 0,95, 24 ms | gridfasen på B-tempo: 0,81 / 24 / 237, raw 0,94, 42 ms | **B:s rutnät** | motfas −12, i fas +10, raw-puls +0,05 och |offset| −12 ms; medianen 0,88→0,82 räknas på 53 fler låtar i samma oktav |
| ettan | – (lotus har ingen) | taktmodellen, DMX ettan 100 % | – | **B** | ettan 100 = bas |
| tillitens informationsvärde | localBpmConfidence (tempogram) | repeatRate × tgClear | – | **B** | DMX-md5 identisk; lotus beatPhaseConf = 1 + tillit (lotusbank-konventionen) |
| break/coast | TEMPO_HOLD (holdSilent/holdGrace) | klockans coast + takten genom breaket | – | **B** | DMX upp_s 1,35 / ned_s 3,00 = bas; holdSilent stoppar fortfarande env-steget i båda |
| omlåsning vid låtgräns | hintTrackChange/resetTempo + egna röster | H_BOUND → relock() | – | **B** | DMX gr_ratt 73,3 / gr_falska 0 = bas; mix_las 2,48 s |

## SIFFRORNA
**DMX** (tvavagar.py --mat, en körning): poäng **+0,00** (långsamma +0,00, snabba +0,00), alla 17 mått = bas (mix_klocka 97,24, mix_las 2,48,
mix_still 2,73, mix_hopp 0,05, klipp 98,28, ettan 100, grid40 52,90, gridfel 21,4, upp_s 1,35, ned_s 3,00, traff 100, korta 30,34,
drop 100/5,71/216, gr 73,33/0). latens 80 ms. cpu 51,73 mot 54,16 µs/hop (kvot 0,955, inom bruset, och ingen poäng).
**md5 identisk** i båda lägena → ljusdomaren behövs inte (= bas). Realtid p99 10 hop mot parets bas 9 (X = 10) → OK. KRAV EN KÄLLA står kvar.

**Lotus** (lotusbank.py, full 503 + 8, en körning, 975 s under last):
| mått | A lotus nu | a7 | Δ |
|---|---|---|---|
| korpus rätt | 396/503 | **441/503** | +45 |
| syntet | 6/8 | 5/8 | −1 (100_hats8_kick1_snare_swing: 100 → 149,8, 3/2-fantom) |
| kick R/P | 0,80/0,86 | 0,80/0,86 | 0 |
| on-beat-recall | 0,84 | 0,84 | 0 |
| fas median / motfas / i fas (n) | 0,88 / 33 / 238 (399) | 0,82 / **21** / **248** (452) | −0,06 / −12 / +10 |
| fas mot Beat This! | 0,89 | 0,82 | −0,07 |
| följare raw (|offset|) | 0,90 (36 ms) | **0,95 (24 ms)** | +0,05 / −12 ms |
| spann inom låt | 9 | 33 | sämre |
Spärren: syntet −1 och fasmedianen −0,06 är sämre än A. Uppvägt enligt mig av +45 korpus, färre i motfas och tätare puls, men det
kräver ägarens godkännande enligt lotusbank.py:s filhuvud. a7 = bit för bit samma tal som baslinjens "B ... --fas klocka" (väntat:
samma klocka, och fasen publicerad på samma sätt). Jag räknar alltså lotus som **OK med förbehåll (ägaren)**.

**Workerns µs/hop** (DMX, feedRealtid): 43,3 mot parets bas 38,2 (samma kod körs i DMX, md5 lika = brus/last); gräns 130 → OK.
Lotus: workern kör inte längre computeBpm (~470 µs × 4/s, mätt 08-09) eller gridfasen; klockan kostar i stället på huvudtråden (se RISKEN).

## VAR DET TOGS BORT (engine/src/analyser.ts, HEAD-rader)
- 46–49 `OWN_TEMPO` (konstanten och dokumentet) → en rad: klockan är det enda tempot.
- 408 `GRID_PHASE_ON` (LOTUS_GRID_PHASE läses inte längre); 3240 dess envLastWallMs-skrivning.
- 1095–1296 scoreEnv, alignScore, shiftDetect.
- 1588–1647 computeGridPhase (lotus gridfas, ersatt av klockans rutnät).
- 1651 OWN-grenen i envStep; 1657–1671 envStepOwn.
- 1743 OWN-grenen i pullSlowState; 1920 `if (!OWN_TEMPO)` (alltid klockans tempo nu).
- 1947–2490 tempoGramStep, bpmHistSort, offBeatStep, computeBpm.
- 3127, 3146, 3273 OWN-grenarna i kick-cooldown och grid-grinden (klockans rutnät och tillit gäller).
- 3840 fasen publiceras: `f.beatPhaseMs = clockOut.beat.anchorMs`, `f.beatPhaseConf = 1 + confidence` (0 utan rutnät).
- 3897 `if (cm)` (klocka alltid), 3961 `clockMode()` saknar null: osatt = 'inline'.
Kvar: ~85 privata fält/konstanter som bara den borttagna sökningen läste (tsc --noUnusedLocals listar dem, t.ex. bpmHist*, shift*,
EVIDENCE_*, TEMPO_UP43/FIVE4, scoreFull/scoreBass, phaseScratch*). De beräknar inget tempo, men de är skräp som bör städas i ett eget
steg med md5-kontroll. Det är inte gjort här för att hålla diffen minimal.

## RISKEN
1. **Lotus live på Pi:n, CPU:** med LOTUS_ANALYSER_SPLIT=worker kör lotus klockan i process() på HUVUDTRÅDEN (ljusvägen, kärna 1), inte i
   workern. DMX kör den i taktvägen. Workern blir lättare (ingen computeBpm), huvudtråden tyngre. Det är inte mätt på Pi:n: mät process()-
   budgeten (/api/perf) före deploy. Om den inte räcker är nästa steg BEAT_FEED 'slow' i lotus profil. Det kräver en slowHopFeed-väg för
   lotus (hopLane.feed i piEngine), alltså en konsumentändring, inte en klockändring.
2. **Fasens nivå:** klockans ankare ligger GRID_EARLY 20 + 5 ms före kickfasen. Lotus beatLeadMs/PHASE_BIAS_MS (20) är kalibrerade mot den
   gamla gridfasen. Bänken säger raw |offset| 24 ms (bättre), men lyssna i källaren innan beatLeadMs rörs (feedback-lead-latens: aldrig uppåt).
3. **beatPhaseConf-skalan** är nu 1 + tillit (1..2). Lotus PHASE_FLIP_CONF = 2,0 nås därför nästan aldrig, och fasföljarens flipp i stället
   för PLL-drag stängs i praktiken av (opt-in LOTUS_PHASE_FOLLOW). f1–f3 i bänken är ändå 0,94–0,95.
4. **Tempovandring:** spann inom låt 9 → 33 BPM. Lotus setBeatGrid om-ankrar vid >2 BPM-avvikelse (beatBpmKeep 0,25 dämpar), så fler
   omankringar kan märkas som ryck i BLE-ticken. Det syns inte i någon spärr.
5. **Syntetens swing 3/2-fantom** (100 → 150) och fler 4/3/dubbla i korpusen är B:s kända svagheter. A:s UP43/FIVE4-prov finns inte längre
   i koden; vill man ha tillbaka dem går de in i klockans tempogram (strategi a1), inte som en andra väg.
6. LOTUS_GRID_PHASE / TEMPO_EVIDENCE / UP43 / FIVE4 / SHIFT / HOLD i lotus nightly.py LIVE-env blir verkningslösa. nightly.py bör städas
   när lotus portas.
