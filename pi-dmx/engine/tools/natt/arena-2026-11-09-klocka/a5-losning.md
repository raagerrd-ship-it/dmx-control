# a5 – EN KLOCKA FÖR BÅDA: tilliten och break/coast

## IDÉN
Båda profilerna kör **klockan B** (analyserClock.ts). Lotus egen sökning (OWN_TEMPO-vägen: computeBpm, scoreEnv,
alignScore, shiftDetect och skuggrutnätet) är borta, och lotus egen gridfas (computeGridPhase) är också borta.
Profilen avgör bara VAR klockan körs: DMX kör `BEAT_FEED 'slow'` i taktvägen. Lotus har ingen BEAT_FEED och kör då
`'inline'`, sist i process(). Det finns inget läge kvar där klockan saknas.

Kortets del är att klockan har EN tillit och ETT break-tillstånd, och att lotus konsumenter läser just dem:
1. **EN FAS + EN TILLIT I RAMEN.** `clockPhase()` skriver klockans publicerade rutnät till `frame.beatPhaseMs`
   (ankare + ettan − GRID_EARLY − TG_GRID_EXTRA, samma som effekterna läser i cfg.beat) och klockans tillit till
   `frame.beatPhaseConf` (= bpmConfidence). Det sker på samma sätt i inline-läget (BeatFeed.update) och i taktvägen
   (HopLaneFast.feed).
2. **ETT RUTNÄT I KICKGRINDEN = ETT BREAK-TILLSTÅND.** Rutnätet skrivs nu bara av klockan (`setClockGrid`). Utanför
   coast är det klockans rutnät, i COAST/BREAK är det `null` (öppen grind). Det publika `setBeatGrid` är en no-op, så
   lotus piEngine `setAnalyserBeatGrid` (och bänkens BENCH_GRID) kan inte längre skriva ett andra rutnät utan tillit.
   Mätt neutralt: lotus kick R/P och alla rader är oförändrade, och DMX-md5 är identisk.
3. **TILLITEN VAKTAR TEMPOT (TG_SW_TRUST 0,9).** När klockans två minnen byter till ett 3:2/4:3-syskon går det förbi
   kronan. Det bytet tillåts bara om rutnätet INTE redan förutsäger kickarna (`repeatRate < 0,9`). Syntetens swing
   (100 bpm) hölls i 17 s med repeatRate 0,96, men det snabba minnets 150,7 nådde 1,37 x kronan och bytte. Nu står den
   kvar på 100 (syntet 5/8 -> 6/8 = lotus A).

## Tabellen PER DEL
| del | A (lotus nu) | B (klockan) | sammanslagning | val | siffran |
|---|---|---|---|---|---|
| tempovalet | korpus 396/503, syntet 6/8, 3/2 16, 4/3 14, 2/3 10, 3/4 24, annat 42 | 441/503, 5/8 (swing → 149,8) | B + tillitsvakt mot syskonbyte | **sammanslagning** | 440/503 och 6/8 (B 441, 5/8; A 396, 6/8) |
| låsning/tempohopp | spann 9 BPM | spann 33 BPM; DMX mix_las 2,48, mix_hopp 0,05 | B (+vakten) | B | spann 31; DMX mix_las 2,48, mix_hopp 0,05, mix_still 2,73 = bas |
| fasen (DMX grid40 52,7 / gridfel 21,6 mot bas 52,9 / 21,4) | analysatorns gridfas 0,88 / 33 / 238 (n 399) | klockans rutnät i ramen 0,82 / 21 / 248 (n 452) | – | **B (klockans rutnät)** | på de 388 låtar som är i samma oktav i båda: median 0,88 = 0,88, motfas 32 → 12, i fas 235 → 239; |offset| 36 → 24 ms |
| ettan | lotus barShift (används inte av lotus BLE) | taktmodellen (DMX ettan 100) | – | B | DMX ettan = bas |
| tillitens informationsvärde | bpmConfidence (peak-to-mean), AUC 0,659 (låtens medeltillit, rätt mot fel tempo) | repeatRate × tgClear, AUC 0,650 | B-tilliten i bpmConfidence OCH beatPhaseConf + vaktar tempot | **B, en tillit** | AUC 0,657; dessutom bär tilliten nu ett beslut (syntet +1) |
| break/coast | lotus piEngine coast (conf < 0,20 i 8 s) + analysatorns egen grind på localBpmConfidence | klockans coast (pllConf, golv 0,20 i 4 s) → öppen grind | ett tillstånd: klockans coast styr kickgrinden, piEngine kan inte skriva ett andra rutnät | **B** | lotus-raderna identiska med och utan piEngine-rutnätet (V2 = B-klockfas, rad för rad); DMX-md5 identisk |
| omlåsning vid låtgräns | hintTrackChange → computeBpm-röster | H_BOUND → relock() | – | B | DMX gr_ratt/gr_falska = bas (md5) |

## Siffrorna
- **DMX (tvavagar --mat, ranking mot bas):** poäng **−0,10**, långsamma −0,16 %, latens 80 ms (= bas), cpu 45,47 µs/hop (kvot 0,98), p99 6 hop (X = 7), ingen DISK.
  Alla 17 mått är lika med bas utom grid40 52,70 (bas 52,90), gridfel 21,6 ms (bas 21,4) och korta 30,77 % (bas 30,34).
  mix_klocka 97,24, mix_las 2,48, ettan 100, upp_s 1,35, ned_s 3,00 = bas. md5 skiljer (vakten slår till någonstans på hela filerna;
  120 s lang1021 var identisk i --snabb).
- **Ljusdomaren:** 0,0, inga spärrar (lampspr osv.).
- **Lotusbank (full, 503 + 8):**

| mått | A lotus nu | B klockan (--fas klocka) | **a5 (v3)** |
|---|---|---|---|
| korpus rätt | 396 | 441 | **440** |
| syntet | 6/8 | 5/8 | **6/8** |
| kick R/P | 0,80/0,86 | 0,80/0,86 | 0,80/0,86 |
| on-beat-recall | 0,84 | 0,84 | 0,84 |
| fas median / motfas / i fas (n) | 0,88 / 33 / 238 (399) | 0,82 / 21 / 248 (452) | 0,83 / 22 / 245 (452) |
| fas mot Beat This! | 0,89 | 0,82 | 0,82 |
| följarens råa puls (|offset|) | 0,90 (36 ms) | 0,95 (24 ms) | 0,94 (24 ms) |
| spann inom låt | 9 | 33 | 31 |

Mot spärren (A): korpus +44, syntet lika, on-beat lika, motfas 33 → 22, i fas 238 → 245. Bara fas-**medianen** är
lägre (0,88 → 0,83). Det beror på att 64 fler låtar nu ligger i rätt oktav och därför räknas med (deras median är
0,47). På de 388 låtar som mäts i båda är medianen 0,88 = 0,88. Ägaren avgör om det räknas som "tydligt uppvägt".

Kostnad för vakten mot B: −1 korpus (Yung Lean – Red Bottom Sky: 119 → 102), −3 i fas.

## Workerns µs/hop
feedRealtid workerUs **45,2 µs/hop** (basen i samma par 41,9). Bas-mätningen gav 46,2/43,7 – inom bruset och långt under gränsen 130. Väckningen 17,9 µs/hop.

## Var OWN_TEMPO togs bort (HEAD src/analyser.ts)
- `:46-49` OWN_TEMPO-konstanten → kommentar. `:3961` `clockMode()` returnerar aldrig null (osatt = 'inline').
- `:1095-1296` borttagna: scoreEnv/alignScore/shiftDetect med dokumentation. `:1588-1648` computeGridPhase.
  `:1657-1672` envStepOwn. `:1947-2491` tempoGramStep/bpmHistSort/offBeatStep/computeBpm.
- `:1651, 1743, 1920, 3127, 3146, 3273` OWN_TEMPO-grenarna borta: klockans grenar gäller ensamma.
- `:2675` setBeatGrid → no-op, setClockGrid = klockans skrivare (även split.ts HopTarget/HopLaneSlow/HopLaneFast).
- analyserClock.ts: `clockPhase()`, `TG_SW_TRUST`. split.ts: `clockPhase` i HopLaneFast.feed.
Diff: `losning.diff` (3 filer, +38/−850).

## RISKEN
- **Lotus live på Pi:n:** med LOTUS_ANALYSER_SPLIT=worker och utan BEAT_FEED körs klockan inline i huvudtråden.
  Det är ~23–45 µs/hop på PC, och på Zero 2 W gissningsvis 4–6 gånger mer, i ljusets tråd. computeBpm försvinner från
  workern (~470 µs × 4 Hz). Det är ingen bänkmätning på ARM. Om det behövs kan lotus profil få `BEAT_FEED: 'slow'`,
  men lotus saknar slowHopFeed-fabriken (hopFeedFactory är generisk, så det borde gå) – det är otestat.
- **Lotus piEngine** matar fortfarande setAnalyserBeatGrid. Anropet är nu verkningslöst, och kickgrinden följer
  klockans coast. piEngines egna trösklar (smoothing conf ≥ 0,5, metaVerdict ≥ 0,6, coast < 0,20) är kalibrerade på
  A:s tillit. B:s tillit är lägre (median för rätt låt 0,65 mot 0,78), så tempomedianen i piEngine får färre sampel och
  faller oftare tillbaka på råvärdet. Det ska ses över i lotus konsument, inte i klockan.
- **beatPhaseConf** har ny skala (0..1 i stället för kvot ≥ 1). LOTUS_PHASE_FOLLOW (opt-in, inte live) flippar då
  aldrig fas (tröskel 2,0). Det är avsiktligt: klockan äger fasen.
- **TG_SW_TRUST** kan hålla kvar ett fel syskon om rutnätet ändå förutsäger kickarna (fel klocka har repeatRate ~0,87
  i median). Vakten kräver ≥ 0,9, och relock vid låtgräns nollställer tempogrammet ändå.
- Fas-medianen mot spärren (se ovan).
