# a3 – DROP SAMMANSLAGNING + LYFT/NÄSTAN-DROP

## Idén
Det finns nu EN dropdetektor, och den ligger i analysatorns `dropStep`. Flanken (det ljuset kör) och slam-kandidaten (förr analysatorns
dropCount) räknar på SAMMA filter: bodyFast 60 ms, bodyEnv 350 ms och bodyCeil −0,15 dB/s. Förr hade effekterna en egen kopia (fdF/fdS/fdC).
Detektorn publicerar sin klassning i ramen: full drop, minidrop-klasser och styrka. Nästan-drop, energilyft och basstopp mäts också i
analysatorn och publiceras som VAD (> 0 / räknare) + STYRKA (dB). Effekterna behåller bara reaktionen: refraktärtider, minidrop-spärr,
dropgrind, build-grind, look, lyft och efterkontroll.

## FLYTTAT
| vad | från (src/effects.ts) | till (a3/src/analyser.ts) | ramens fält |
|---|---|---|---|
| flanken (full drop) + FLANK_* | flankStep 785–806, konst. 352–371 | flankStep 3761, konst. 281–282 | `dropCount`, `dropRiseDb` |
| slam utan flank → minidrop | stepDrop 1590–1594 | dropClassify 3753 (anrop 3749) | `dropDemoted` (+ `miniDropCount`) |
| spärren SHOW_DROP_GAP_MS 12 s | stepDrop 1602–1603, konst. 372 | dropClassify, konst. 283 | `dropSpaced` (+ `miniDropCount`) |
| nästan-drop (nearB/nearNorm/botten) | stepLifts 1207–1237, NEAR_RISE/DIP 236–237 | liftStep 3779, konst. 285 | `nearDropDb`, `nearDipDb` |
| energilyft (lugn 6..2 s mot 0,6 s) | stepLifts 1214–1226, 1260–1266, LIFT_DB 57 | liftStep | `liftDb` |
| stopp-mini (basen borta 0,6–3 s) | stepLifts 1250–1259, STOP_MINI_S 61 | liftStep | `stopCount`, `stopS` |

Transporten från workern går via `split.ts` BS_CAND..BS_STOPSEC (13–21, BIG_STATE_LEN 22) och analyser.ts pushBig/drainBig.
Kvar i effects.ts finns bara reaktionen: stepDrop ~1529–1535 läser räknarna och anropar gapMini. stepLifts ~1175–1210 har refraktärtiderna
NEAR_REFRACT_MS/LIFT_REFRACT_MS, MINI_GAP, !dropActive, BUILD_LOOKS och sektion high för stoppet. Där räknas inget på bodyDb längre.
Dropens längd, uttoning, efterkontroll och minidropens energisläpp (miniBody*) är reaktionens form och ligger kvar.

## DUBBLETTEN – vad valdes
Jag valde en SAMMANSLAGNING i ett och samma steg. Flankens kriterier avgör en full drop (ägarens godkända timing, "på smällen").
dropStep bidrar med filtren och slam-kandidaten (underPeak-kvalitet, lugn-grind, eskalering). Kandidaten är detektorns lägre steg: den blir
minidrop om ingen flank kommit inom 2 s. Den är också sektionens drop-evidens (`dropCand + secBodyRet`), så att sektionen blir bit-identisk.
Spärren är nu en del av klassningen. Därför är `frame.dropCount` exakt de drops ljuset fyrar (före efterkontrollen).
Siffror: drop_falska 5,71 → 0,00 /10 min (+100 %). De två falska helt-drops vid 20–21 s i dropklippen blev minidrops.
drop_traff 100 → 100 och drop_ms 216 → 216.

## SIFFRORNA (mätning 1 av 3, ingen mer behövdes)
- Domarens rad: **+3,53**, långsamma +5,88 %, snabba ±0, latens 80 ms (lika med bas), alla övriga 16 mått ±0,0 (upp_s 1,35 / ned_s 3,00 lika med bas).
- md5 skiljer, men --snabb 120 s lang1021 var identisk. Ljusdomaren ger **+0,15**, inga spärrar (gränsen är −0,5).
- Pi-budgeten: worker p99 6 hop (X = 7), workerUs 45,2 µs/hop mot bas 44,4 (< 130). Huvudtrådens CPU har kvoten 1,0007.
- Allokering: inga nya objekt per hop. Ringarna (fdT/fdV 1024, liftHist 240) är förallokerade Float64Array. Nya talfält står i
  DOUBLE_FROM_START, är −0-initierade och ingår i ramens förinitiering.

## RISKEN
- Flanken körs nu per hop (375 Hz) i stället för per renderruta (40 Hz i bänken, 200 Hz live). Dess min-, topp- och breakfönster blir
  finare, så små tidsskillnader mot ägarens godkända flank är möjliga. Ljusdomaren +0,15 säger inget om ladans öga.
- Flanken fyrade inte i något av dropklippen vid 15 s. drop_traff vilar fortfarande på minidrops, både de gamla MINI_* och dropDemoted.
  Holdout med ägarens markeringar i lang1014 mäter full drops mot facit för första gången.
- Sektionen läser fortfarande slam-kandidaten, inte full drop. Granskningens problem (refräng på en drop ljuset avvisar) är medvetet orört
  för att spärren upp_s/ned_s inte ska riskeras. Nästa steg är att låta sektionen läsa `dropCount + dropDemoted` och mäta det.
- Nästan-drop och lyft är tillståndssignaler som samplas vid rendering. Stoppet är en monoton räknare. Om effekternas grind är stängd i
  stoppets enda ögonblick tappas det, precis som förr.
