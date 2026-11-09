# a1 – A-delar in i B (tempovalet): klockan är den enda, OWN_TEMPO-vägen borta

## IDÉN
Båda profilerna kör **klockan** (analyserClock.ts BeatFeed). Profilen avgör bara VAR den körs: DMX `BEAT_FEED 'slow'` (workerns taktväg),
lotus utan BEAT_FEED = `'inline'` (sist i process(); med lotus delade analysator på Pi:n = i den snabba tråden). Lotus egna temposökning
(computeBpm, scoreEnv, alignScore, shiftDetect, tempoGramStep, offBeatStep, evidens, UP43/FIVE4, SHIFT/HOLD-grenarna, envStepOwn) och
lotus gridfas (computeGridPhase, GRID_PHASE) är **borttagna**. Klockan publicerar sitt rutnät i ramen: `frame.beatPhaseMs` = klockans
publicerade ankare, `frame.beatPhaseConf` = 1 + tillit (`publishPhase`, analyser.ts). Lotus PLL/fasföljare läser alltså klockans fas
(= lotusbank `--fas klocka`), DMX läser cfg.beat som förr – samma rutnät.

Två av A:s tempoval-delar lyftes in i klockans tempogram (de som bar i bänken), resten prövades och lämnades:
1. **Oktavvakten** (A: tempot bor i [80,160), en 157-låt kan aldrig bli 78,6): klockans oktavzon på övre sidan 3 % -> 1 % (`TG_EDGE_HI`).
   Förr gav t = 155–158 lo = t/2 < 80 -> klämt till 80,0 (B:s 24 'dubbla' i lotus korpus: Ricky Rose Stora tuttar ×15, Cotton Eye Joe EDM ×4,
   3 Doors Down, Cooper Alan – alla 155–159 BPM med basen på varannat slag). Nedre sidan oförändrad (se DMX --mat 1 nedan).
2. **3/2-fantomen i sväng** (A:s fantomprov, syntetens `100_hats8_kick1_snare_swing`: B 149,8, A 100): `swingSig` – i vikningen på 2/3 av
   vinnaren ligger svängda åttondelar på 2/3 (diskanten >= 0,5 av slagets) och 1/3 är tom (<= 0,1 av 2/3:s). Raka åttondelar fyller båda
   och ger aldrig signaturen. EMA över varven + hysteres (på >= 0,5, av < 0,2), nollas när vinnaren byter (> 3 %) och vid relock.
3. **UP43/FIVE4 som träffandel** (A:s alignScore.hit i klockans termer: andel av bas+diskantvikningen på slag/halvslag): prövad på 7 klipp,
   skiljer INTE äkta takt från fantomen (Jamming fantom 92 -> 0,60 mot äkta 123 -> 0,49; Cambodia 0,45 mot 0,39; Mike Mana 0,39/0,40).
   Inte inlyft. **SHIFT/HOLD**: klockan har redan motsvarigheterna (två minnen + kronan = tempoväxling; coast/break-hållet + 10 s-tystnad = HOLD).

## PER DEL
| del | A (lotus egen) | B (klockan) | sammanslagning (a1) | val | siffran som bär valet |
|---|---|---|---|---|---|
| tempovalet, lotus korpus | 396/503 | 441/503 | **461/503** | B + A:s oktavvakt + svängprov | lotusbank 461 mot A 396 / B 441; 'dubbla' 24 -> 2 (Father's Son 159,0 och Running Out Of Days 159,4: i den kvarvarande ±1 %-zonen) |
| tempovalet, syntet | 6/8 | 5/8 (swing 149,8) | **6/8** | B + svängprov | swing 149,8 -> 100,0 |
| tempovalet, DMX klipp/mix | 97,7 / 96,4 % | 98,3 / 97,2 % | 98,28 / 97,24 % | B | tvavagar klipp_klocka/mix_klocka = bas |
| oktav / 2:3 / 4:3 / 5:4 | 3/2 16, 2/3 10, 4:3 14, 3/4 24, annat 42 | 3/2 7, 4:3 22, dubbla 24, annat 9 | 3/2 6, 4/3 22, dubbla 2, annat 12 | B (+ oktav, sväng); UP43/FIVE4 inte (träffandelen skiljer inte) | se klasserna |
| låsning, tempohopp | spann 9 BPM | mix_las 2,48 s, hopp 0,05/min, spann 33 | B oförändrad (mix_las 2,48, mix_hopp 0,05, mix_still 2,73 = bas); lotus spann 36 BPM (flimmer mot 80 när 157 glider över 158,4) | B | mix_las/mix_hopp/mix_still = bas |
| fasen | 0,88/33/238 (n 399) | klockfas 0,82/21/248 (n 452) | 0,84/17/252 (n 438) | B (klockans rutnät i ramen) | gemensamma låtar (båda i rätt oktav, n 388): A 0,88 = B 0,88; B:s lägre median = de 64 låtar bara B får i rätt oktav (median 0,475); följarens |offset| 36 -> 24 ms |
| ettan | barShift på analysatorns rutnät (DMX-mätt 23 %) | taktmodellen, ettan 100 | B | B | ettan 100 = bas |
| tillitens informationsvärde | tempogrammets topp/medel | repeatRate × tgClear | B | B | (entempo t1f: +2,65 på kontroll) |
| break/coast | TEMPO_HOLD (paus 0,35–10 s) | coast 4 s + break-hållet 20 s + tystnad 10 s | B | B | upp_s/ned_s = bas |
| omlåsning vid låtgräns | hintTrackChange -> resetTempo | H_BOUND -> relock() (lotus hintTrackChange räknar trackBoundaries = samma väg) | B | B | gr_ratt 73,3 / gr_falska 0 = bas |

## SIFFRORNA
**DMX-domaren (tvavagar --mat):**
- mat 1 (oktavzon ±1 % på båda sidor): alla 17 mått = bas (mix_klocka 97,24, mix_las 2,48, ettan 100, gridfel 19,35, upp_s 1,35, ned_s 3,00,
  latens 80 ms), men md5 skilde -> ljusdomaren +3,66 och **DISK** lampspr lang1021 −22,5 % (< −20 %). Orsak: lang1021 = 160, klockan vandrar
  till 81–82 där den nedre zonen förr gav 2t. Därför bara övre sidan smalare (TG_EDGE_HI); `--snabb` därefter: md5 lang1021 120 s IDENTISK.
- mat 2: (övre zonen ±1 %, nedre ±3 %, svängprovet) **md5 lika med bas** på lang1021 + megamix hela, i sync- OCH momentläget -> ljusdomaren körs inte; alla 17 mått = bas (mix_klocka 97,24, mix_las 2,48, mix_still 2,73, mix_hopp 0,05, klipp 98,28, ettan 100, grid40 52,90, gridfel 21,40, upp_s 1,35, ned_s 3,00, träff 100, korta 30,34, drop 100/5,71/216, gr_ratt 73,33, gr_falska 0); latens 80 ms; worker p99 6 hop (bas 6); poäng **+0,00, ingen DISK**. DMX-ljuset är alltså bit-identiskt – lotus får klockan utan att DMX ändras.

**Lotusbank (503 fryst + syntet, lotus LIVE-env, full körning med slutkoden) mot A:**
| mått | A lotus nu | B klockfas | a1 |
|---|---|---|---|
| korpus rätt | 396/503 | 441/503 | **461/503** |
| klasser | 3/2 16, 4/3 14, 2/3 10, 3/4 24, halva 1, annat 42 | 3/2 7, 4/3 22, dubbla 24, annat 9 | 3/2 6, 4/3 22, dubbla 2, annat 12 |
| syntet | 6/8 | 5/8 | **6/8** (swing 100,0) |
| kick recall/prec | 0,80/0,86 | 0,80/0,86 | 0,80/0,86 |
| on-beat-recall | 0,84 | 0,84 | 0,84 |
| fas median / motfas / i fas (n) | 0,88 / 33 / 238 (399) | 0,82 / 21 / 248 (452) | **0,84 / 17 / 252 (438)** |
| fas, låtar båda har i rätt oktav (n 391) | 0,88 | – | 0,87 |
| fas mot Beat This! | 0,89 | 0,82 | 0,85 |
| följarens råa puls on-beat (|offset|) | 0,90 (36 ms) | 0,95 (24 ms) | **0,95 (22 ms)**, andel <= 30 ms 0,64 |
| tempospridning inom låt (median) | 9 BPM | 33 BPM | 36 BPM |

`--snabb` (126 filer) före mat 1: korpus 118/126 (A 98, B 113), syntet 6/8, fas 0,82 / motfas 6 / i fas 67 (A 0,87/9/60, B 0,81/7/65).

**Workerns µs/hop** (feedRealtid workerUs, PC): 46,8 µs/hop (mat 2; mat 1 43,8) (bas samtidigt 45,9 (mat 1 37,5); gräns 130).

## VAR OWN_TEMPO TOGS BORT (fil:rad i a1/src)
- analyser.ts:46 – `const OWN_TEMPO = clockMode() === null` borta (ersatt av kommentaren EN KLOCKA FÖR BÅDA).
- analyser.ts:3152 – `clockMode()`: osatt BEAT_FEED = 'inline' (förr null = ingen klocka, egen sökning).
- analyser.ts: scoreEnv/alignScore/shiftDetect (förr rad 1094–1297) och tempoGramStep/bpmHistSort/offBeatStep/computeBpm (förr 1947–2490),
  envStepOwn och computeGridPhase borttagna; envStep (rad 1399) är en tom krok. OWN_TEMPO-grenarna i pullSlowState, slowStep (localBpm =
  R_CLOCK alltid), kickspärren och kickgrinden (2 ställen) borta.
- analyser.ts:3025 + 3037 – `publishPhase`: ramens beatPhaseMs/beatPhaseConf = klockans publicerade rutnät (efter clock.update i process()).
- analyserClock.ts:105/323 – TG_EDGE_HI = 1,01 (övre oktavzonen); 260/268 swingSig/hiWin; 328 svängprovet i tgStep; 339 tgReset nollar det.
Diff: `losning.diff` (2 filer, +52 / −830; analyser.ts +17/−826, analyserClock.ts +35/−4).

## RISKEN
- **Lotus live på Pi:n:** klockan körs i lotus SNABBA tråd (inline; lotus index anropar inte hopLane.feed, så 'slow' fungerar inte för lotus
  utan att lotus motor matar taktvägen). computeBpm (~470 µs/anrop, 4 Hz, i workern) är borta, men klockan kostar ~40 µs/hop PC i hop-loopen
  (375 Hz) = på Pi Zero 2 W sannolikt ~300–400 µs/hop i den tråd som har ljud och BLE – OMÄTT på Pi:n. Mät /api/perf före deploy; flytta
  klockan till lotus worker (lotus motor anropar hopLane.feed som DMX index.ts) om budgeten spricker.
- Lotus konsument sätter fortfarande `setBeatGrid` med sin egen PLL-grid efter varje frame; klockan sätter analysatorns kickgrind med sitt
  inre rutnät i varje process(). Med KICK_NOGATE=1 (lotus LIVE) styr griden ingen kick – men barShift/kickspärren läser den. Bör städas i lotus
  (sluta mata setBeatGrid) i porten.
- Lotus fasföljare: PHASE_FLIP_CONF/kp-valet läser beatPhaseConf i lotus gamla skala (kvot ~1–6); nu 1 + tillit (1–2). ≥ 1,3 = tillit ≥ 0,3.
  Bänkens följare raw/f1–f3 mäter detta (se tabellen) – ladan/taklisten avgör.
- Svängprovet är byggt på syntetens ideala sväng (1/3-platsen 0,00); riktig shuffle med fantomen 1,5T är omätt utanför syntet (B har 0
  '2/3'-fall i korpusen). Kravet 1/3 <= 0,1 är strängt med flit (lang1021 gav 0,27 i ett varv).
- Oktavzonens övre sida: en verklig 78-BPM-låt (DMX-katalog < 80, ingen i övning/kontroll) visas nu 156 i stället för 80.
- Fasens median 0,82 < A:s 0,88 är spärrens bokstav; på samma låtar är fasen lika (0,88/0,88). Ägaren avgör om det är 'tydligt uppvägt'.

## SPÄRRARNA
- DMX: md5 lika med bas = ljuset oförändrat; KRAV EN KÄLLA kvar (klockan enda tempot, nu även i lotus). Ingen env-flagga (BEAT_FEED väljer bara tråd).
- Lotus: korpus +65 mot A, syntet 6/8 = A, on-beat 0,84 = A, motfas 33 -> 17 och i fas 238 -> 252 bättre. **Fasens median 0,84 < A 0,88** är
  det enda måttet under A (n 438 mot 399: de 39+ låtar A har i fel oktav drar ned medianen; på samma låtar 0,87 mot 0,88). Enligt filhuvudet
  'tydligt uppvägt' (+65 korpus mot −0,04/−0,01 fas) – ägaren godkänner.
- Budget: DMX --mat 2 av 3, lotusbank 1,5 av 3 (en --snabb + en full).
