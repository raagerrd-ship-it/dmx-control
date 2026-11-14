# fusion (jokern) – TIDEN OCH RÖRELSEN

**r0 = `.arena/drop1/fusion`** (90,7 p på övningen, OK). `fusion-b` = samma lösning utan dropserien (81,9 p), reserv om ägaren vill ha
kvar 12 s-spärren.

## IDÉN
En uppbyggnad har två kännetecken och analysatorn kräver båda: basen har hållits tillbaka i takter (a1: sekunder under låtens tak)
OCH under tiden har det hänt saker ovanför den (a8: de övre bandens rörelse medan basen är borta) – kommer basen då tillbaka HEL är
det drop, annars minidrop. Inget nollas vid ett drop: båda måtten rinner av sig själva, så ett drop som slår om efter en glugg
(stopp-och-gå) är drop igen, medan nästa återkomst utan ny rörelse är minidrop.

Skälet till OCH (inte ELLER) är musikaliskt och syns i varje deltagares fel: tiden ensam gör ett långt break där inget byggs till
drop (a1:s falska 536 och nästan-falska 507), rörelsen ensam gör ett kort svep över en glugg på ett par slag till drop (a8:s
falska 319,7). De två felen ligger på var sin axel, så kravet på båda tar bort dem utan nya gränser.

## TVÅ AXLAR – alla hela landningar på övningen (r0, simulatorn = motorn på hundradelen)
| tid s | tillbakahållen s (gräns 4) | rörelse dB x s (gräns 2,5) | motorn | ägaren |
|---|---|---|---|---|
| 51,18 | 6,7 | 5,8 | DROP | drop |
| 137,27 | 4,7 | 3,9 | DROP | drop |
| 210,63 | 7,3 | 7,3 | DROP | drop |
| 214,39 | 7,6 | 3,5 | DROP | drop (omslag) |
| 218,01 | 8,4 | 3,2 | DROP | drop (omslag) |
| 281,91 | 10,0 | 5,0 | DROP | drop |
| 302,55 | 6,8 | 4,1 | DROP | drop |
| 441,56 | 9,9 | 7,4 | DROP | drop |
| 367,72 | 4,5 | **1,5** | – | drop (MISSAD: bassvep, övre banden står stilla) |
| 536,29 | 9,9 | **2,0** | – | mini (a1 sköt drop här) |
| 507,08 | 6,8 | **0,9** | – | mini |
| 225,34 | 10,0 | **1,3** | – | mini (efter dropserien) |
| 58,51 | 5,1 | **0,9** | – | omarkerad |
| 319,73 | **3,4** | 5,5 | – | mini (a8 sköt drop här) |
| 40,12 | **2,1** | 2,8 | – | omarkerad (a5 sköt drop här) |
| övriga 13 | < 3 (eller andra kanten av 225 och 536, 10 ms–0,8 s efter raden ovan) | < 2,3 | – | mini / omarkerade |

## DELAR
| del | från | mått den bär | med / struken + skäl |
|---|---|---|---|
| TIDEN: `heldS` (sekunder basens topp legat under taket, läcka) | a1 | drop_ratt, bygg | MED. `HELD_DB` 3 -> 2,5 och `HELD_DRAIN` 2 -> 1,5: a1:s värden låg på platåns kant (3,25 dB tappade drop 51, läcka 2,5 tappade 218); med rörelsekravet bredvid kan de stå mitt på platån. |
| HEL LANDNING (`LAND_*`, `bodyLand` 30 ms) | a1 | inte_ratt 0 -> 100 %, precision, tid 0,16 s | MED, orörd. Tar basens halva återkomster (347, 423, 500, 529). |
| RÖRELSEN: `tensionStep` (övre banden 3–7 mot sitt eget 2 s-medel, medan basen är borta, klingar 4 s) | a8 | mini_ratt 91 -> 100 %, precision 88 -> 100 % | MED, koden orörd. Gränsen 3,4 -> 2,5: som ensam dom behövde den hålla undan 2,8 (omarkerad, 2 s glugg); nu tar tiden den, och luckan bland laddade återkomster är 2,0–3,2. |
| Ett drop nollar inte måtten; 12 s-spärren -> `DROP_SAME_MS` 2 s | a5 (fönstret minns över droppet, ingen spärr); a4, a6, a7 tog 214/218 | drop_ratt +2 (214, 218) | MED i r0, STRUKEN i fusion-b. Ägaren markerar tre drop på 7 s; a1 och a8 nollade vid drop och missade dem. Rörelsekravet håller minin 225 (10 s tillbakahållen, rörelse 1,3) utanför – a5 behövde sin flodvakt för den. |
| UPPBYGGNADEN: `inRiser` = tillbakahållen nu, 2–10 s, och rörelse >= 1,5 | a1 x a8 | bygg 52 %, bygg_falsk 6,8 % | MED. a1 ensam 58 % / 8,7 % (utan nollning 11,3 %). Valt för marginalen mot 15 %-spärren: −6 p-enheter bygg (0,6 poäng) mot −3 falsk. |
| En tystnadskälla: a8:s `upCold` nollar båda måtten | a8 (a1:s `QUIET_GAP_S` struken) | – | MED, förenklad: samma dom med 0,8 s som med 1 s. |
| `CAND_WAIT_MS` (ingen minidrop-look strax före droppen) | a1 | inget domarmått; skyddar ljuset (effekterna läser `dropDemoted`) | MED. |
| a8:s landning mot `bodyPeak` + väntan på landningen | a8 | drop_ratt, tid | STRUKEN: en landning räcker; a1:s är snabbare (0,16 mot 0,19 s) och mäter mot taket (−0,15 dB/s) i stället för toppen (minuter), som faller på tystare låt efter starkare. |
| Flodvakt (konto 4, en per 40 s) | a5 | flod | STRUKEN: laddningen är flodvakten (0,82 drop/min). |
| FULLT / `K_LAND` (hela nivån vid eget tak) | a5, a4 | inte_ratt | STRUKEN: a1:s landning bär samma mått på basens egna filter; nivåtaket vore en andra kopia av levelCeil (a5 flaggade det själv). |
| Virvelrullen (`rollStep`, `rollHot`, `rollRush`) | a3 | drop 302/367/441, bygg_falsk 0,2 % | STRUKEN. Enda delen som kunde ge 367 tillbaka, men a3 själv: minidropen 507 och 536 har långa rullar som bara faller på att 32-delarna bryter jämnheten, och rusningens marginal är ett anslag. ~80 rader och en anslagsplockare per stor-FFT för ett drop. |
| Spänningskontot (djup i band 3, stigande diskant, vägd summa) | a4 | drop 214, 367 | STRUKEN: samma tanke som tid x rörelse men i EN summa med gräns 0,40 som vilar på en händelse (0,43 mot 0,37). Vid a1:s landningar skiljer kontot inte 367 (0,63) från minin 536 (0,52). |
| Svepet (stigande tyngdpunkt) | a2 | drop 367 | STRUKEN: 367/441 har 3,6–3,9 s mot gränsen 3,5 och minin 463 har 3,6. Ingen marginal. |
| Frasen i halvslag | a7 | drop 218 | STRUKEN: klockberoende, ett halvslag avgjorde en träff; 218 tas nu av serien. |
| Relativ novelty-riser + inZone | a6 | bygg 6 % | STRUKEN: hittar en av sex uppbyggnader. Fyndet (bandDb mättat) är värt att minnas om novelty behövs i lotus. |
| BASEN kvar | bas | – | Slam-kandidaten (`dropDemoted` = minidrop), filtren `bodyEnv/bodyFast/bodyCeil/bodyPeak`, `MINI_*`, `liftStep`, sektionen och klockan är orörda (tempo = bas 100 %, sektion = bas 99,8 %). Basens flank (10 dB i 4 s) och den döda novelty-risern behöll ingen deltagare; de är ersatta, inte påbyggda. |

Missat med flit: **367,4** (ägarens drop, basens enda träff). Uppbyggnaden är 4,5 s bassvep med stilla övre band (rörelse 1,5) och går
på de två axlarna inte att skilja från minidropen 536 (9,9 s / 2,0) och 507 (6,8 s / 0,9). Varje väg dit (a2, a3, a4) hänger på en
enda händelse.

## MARGINALER (övningen; "samma dom" = samma 8 drop och inga andra)
| gräns | värde | samma dom för | närmast under | närmast över |
|---|---|---|---|---|
| `FLANK_BREAK_S` | 4 s | 3,4–4,6 | mini 319,7 på 3,35 s | drop 137 på 4,66 s |
| `TENSION_DROP` | 2,5 | 2,0–3,0 | mini 536 på 1,97 | omslagen 218 på 3,18 och 214 på 3,52; första drop i en uppbyggnad lägst 3,94 |
| `HELD_DB` | 2,5 dB | 1,5–3,5 (allt som prövats) | – | – |
| `HELD_DRAIN` | 1,5 s/s | 0,75–2,25 | 0,5: omarkerad 40,1 + mini 319,7 blir drop | 2,5: omslaget 218 tappas |
| `HELD_CAP_S` | 10 s | 8–12 (allt som prövats) | – | – |
| `TENSION_TAU_S` | 4 s | 3,5–5 | 3,25: omslagen 214/218 tappas | 6: mini 225 blir drop |
| `UP_STILL_DB` | 1 dB | 0,8–1,3 | 0,6: mini 536 blir drop | 1,5: omslaget 218 tappas |
| `LAND_OVER_DB` | 2 dB | 1,25–2,5 | 1,0: omarkerad 423,3 blir drop | 2,75: drop 302 landar utanför fönstret |
| `LAND_STEP_DB` | 3 dB | 2–6 (allt som prövats) | – | – |
| `DROP_SAME_MS` | 2 s | 1–3,5 s | – | omslagen ligger 3,76 och 3,62 s efter föregående drop |
| ingångsnivån | x1 | x0,5 och x2 (sonder): samma 8 drop, bygg 54/52 %, falsk 6,5/5,3 % | | |

Smalast: (1) drop 301,56 träffas på +0,99 s i ett fönster på +1,0 s – landningen ligger där i ljudet (basen kommer på −13 dB och är
hel först 302,5; a1, a4, a5 och a8 landar alla där), ingen gräns flyttar den. (2) Rörelsekravets övre sida bärs av EN dropserie
(214/218: 3,5 och 3,2 mot 2,5); utan serien är luckan 2,0–3,9. (3) Den undre sidan bärs av EN minidrop (536: 1,97).
Uppbyggnadens två tal är valda på kurvan, inte mot en händelse: (`HELD_BUILD_S`, `TENSION_BUILD`) = (3; 1,5) 44 % / 5,2 %,
**(2; 1,5) 51 % / 6,2 %**, (2; 2,0) 46 % / 5,2 %, (3; 1,0) 49 % / 8,0 %, bara tiden 58 % / 11,3 % (simulerat utan buildUp-svansen).

## SIFFRORNA (domaren, övningen)
| mätning | poäng | drop | mini rätt | inte | precision | bygg | falsk | drop/min | tid | tempo = bas | |
|---|---|---|---|---|---|---|---|---|---|---|---|
| bas | 22,8 | 1/9 | 82 % | 0 % | 10 % (10) | 0 % | 0,0 % | 1,03 | 0,31 | – | |
| a1 (bästa i runda 1) | 82,6 | 7/9 | 91 % | 100 % | 88 % (8) | 58 % | 8,7 % | 0,82 | 0,17 | 100 % | |
| fusion m1 (HELD_DRAIN 2) | 90,7 | 8/9 | 100 % | 100 % | 100 % (8) | 52 % | 6,5 % | 0,82 | 0,16 | 100 % | OK |
| **fusion m2 = r0** (HELD_DRAIN 1,5) | **90,7** | 8/9 | 100 % | 100 % | 100 % (8) | 52 % | 6,8 % | 0,82 | 0,16 | 100 % | OK |
| fusion-b m1 (utan serien: nollning + 12 s-spärr) | 81,9 | 6/9 | 100 % | 100 % | 100 % (6) | 52 % | 5,4 % | 0,62 | 0,17 | 100 % | OK |

m1 -> m2 ändrar ingen dom på övningen; den flyttar läckan från platåns kant till dess mitt (se marginalerna). Sämre än a1: bygg 58 ->
52 %, och drop 367 missas. Kostnad 165,6 µs/hopp mot bas 177,3 i samma domarkö (0,93 x): fem band x två medel per hopp in, basens
åttabandsslinga i den döda risern ut. Budget: 3 av 4 domarmätningar, 4 av 8 sonder (två dumpar, två nivåprov). Kontrollfilerna är
inte öppnade, inte heller `bas/dropdom-holdout*` eller `_v2-lang-20261113T151659.json`.

## RISKEN på annan musik
- **Uppbyggnad utan rörelse där uppe** (bassvep, ren paus, virvelrulle på jämn nivå): rörelsen mäter NIVÅ-ändring i banden, inte
  anslagstäthet – droppet blir minidrop, som 367. En av nio på övningen; räkna med samma andel i finalen.
- **Dropserien bärs av en enda episod.** Efter ett riktigt drop med stor laddning blir en hel återkomst inom ~3–5 s drop igen. På
  musik där första utfyllnaden efter droppet tar bort basen en halv takt ger det ett extra drop (precision, inte flod: läckan tömmer
  på några sekunder). Litar man inte på det: fusion-b.
- **12 s-spärren är ägarens regel från 10-12** och r0 ersätter den. Hans egna markeringar 11-13 (drop 3,7 s isär) säger emot den,
  men det är hans beslut – värt ett öga i ladan.
- **Tystare låt efter starkare:** taket sjunker 0,15 dB/s; tills det hunnit ner är allt "tillbakahållet" (laddat i tid), landningen
  över taket + 2 dB nås inte -> missade drop första halvminuten. Samma svaghet som i dag och hos a1.
- **Långa mixar / låtbyten:** basen skärs och övre banden byter innehåll = både tid och rörelse; nästa låts första hela basslag
  blir drop (281,8 här – ägaren kallade just den drop) och övergången står som uppbyggnad i upp till 8 s per gång (256–274 s är
  15 av övningens 36 falska sekunder). Många sådana byten är hotet mot 15 %-spärren.
- **Tal mellan låtar:** rösten rör mellanbanden medan basen är borta -> rörelse; slår musiken in hel efter > 4 s tal blir det drop.
  Helt tyst 0,8 s nollar båda måtten.
- **Långsam musik:** gränserna är sekunder, inte takter (under ~100 bpm är fyra sekunder mindre än två takter). Lugna låtar och
  låtar utan bas: ingen hel landning, varken drop eller uppbyggnad (ofarligt).
- **Lotus delar filen:** novelty-risern försvinner och `dropSpaced` står stilla; bänka lotus före port.

## DIFFEN (`git diff --no-index src .arena/drop1/fusion/src`, även `fusion.diff`; fusion-b: `../fusion-b/fusion-b.diff`)

~~~~diff
diff --git a/src/ANALYSER_SHARED.md5 b/.arena/drop1/fusion/src/ANALYSER_SHARED.md5
index a35bdb2..1d1a3d6 100644
--- a/src/ANALYSER_SHARED.md5
+++ b/.arena/drop1/fusion/src/ANALYSER_SHARED.md5
@@ -1,5 +1,5 @@
 # md5 (CRLF->LF) av de gemensamma filerna - samma i lotus-light-link och dmx-control. Skrivs av analyser_shared.py --write
-f93bc245699cc547f8b1926d5cba6219 analyser.ts
+7dbef99cbf432262311e7a04d87f466f analyser.ts
 bd23979ae9882d48c6fc8924f137dd09 split.ts
 ab875f44c6cdc8a687c9ed8805d7501e slowWorker.ts
 b78ab7295bb4303a9976b57b329586e3 analyserClock.ts
diff --git a/src/analyser.ts b/.arena/drop1/fusion/src/analyser.ts
index 1529918..66ce8ca 100644
--- a/src/analyser.ts
+++ b/.arena/drop1/fusion/src/analyser.ts
@@ -157,9 +157,11 @@ export interface Frame {
   dropCount: number;    // monoton räknare — +1 per drop
   /** MINIDROP: mindre lyft (stigning MINI_RISE_DB efter kort svacka) som inte ar en full drop. Monoton. 0 nar MINI_SPACING_MS=0 (av). */
   miniDropCount: number;
-  /** EN DROPDETEKTOR (a3, 11-09: förr effects.ts flankStep bredvid dropStep). dropCount = full drop på FLANKEN (break + smäll, efter
-   *  spärren SHOW_DROP_GAP_MS). Detektorns lägre steg är minidrops: dropDemoted = slam-kandidat utan egen flank (inom 2 s),
-   *  dropSpaced = flank inom spärren. Båda räknas också i miniDropCount. dropRiseDb = senaste flankens stigning (styrka). */
+  /** EN DROPDETEKTOR (a3, 11-09: förr effects.ts flankStep bredvid dropStep). dropCount = full drop: basen kommer tillbaka HEL efter
+   *  en UPPBYGGNAD = tillbakahållen i minst FLANK_BREAK_S medan de övre banden rört sig (drop1 fusion, 11-13, se HELD_DB). Detektorns
+   *  lägre steg är minidrop: dropDemoted = slam-kandidat utan full drop (inom DROP_SAME_MS), räknas också i miniDropCount.
+   *  dropSpaced står stilla sedan 11-13 (12 s-spärren mellan drop är borta: ägaren markerar drop 3,7 s isär).
+   *  dropRiseDb = senaste droppens stigning (styrka). */
   dropDemoted: number; dropSpaced: number; dropRiseDb: number;
   /** LYFT/NÄSTAN-DROP/STOPP (a3, förr effects.ts stepLifts): VAD (> 0 medan villkoret håller) + STYRKA (dB).
    *  nearDropDb = språnget från dippens botten (dipp nearDipDb under 8 s-normalen), liftDb = kroppen 0,6 s över lugnet 6..2 s sedan,
@@ -167,8 +169,9 @@ export interface Frame {
   nearDropDb: number; nearDipDb: number; liftDb: number; stopCount: number; stopS: number;
   inZone: boolean;      // nivån är i låtens topp-zon (ihållande tillstånd, hysteres)
   breaking: boolean;    // nivån är i en svacka/break (ihållande tillstånd)
-  /** UPPBYGGNAD (riser): 0..1 tension som ramsar upp mot en drop. Mjuk signal →
-   *  sampling-säker. Show-REAKTIONERNA (strobe, swell) ligger i effekt-motorn. */
+  /** UPPBYGGNAD: 0..1 = hur länge basen hållits tillbaka under låtens tak (heldS / HELD_CAP_S) medan inRiser, annars 0.
+   *  inRiser = basen hålls tillbaka, har gjort det i HELD_BUILD_S..HELD_CAP_S och de övre banden rör sig (tension >= TENSION_BUILD).
+   *  Show-REAKTIONERNA ligger i effekt-motorn. */
   buildUp: number;
   /** UPPBYGGNADENS FÖRLOPP 0..1 (ägaren 11-12: 'Uppbyggnaden borde flyttas till långsamma analysatorn'; förr effects.ts buildProg):
    *  slag sedan sektionen blev 'build' / 32, räknat från uppbyggnadens START, och hålls över sektionsfladder kortare än 2 s.
@@ -294,14 +297,50 @@ const DROP_SHORT_MS = 4000;    // minsta drop-avstand nar dropen ESKALERAR
 const DROP_LONG_MS = 20000;    // annars maste sa har lang tid ga (mot falska upprepningar)
 const DROP_ESCALATE_DB = 3;    // tatare drops maste vara TYDLIGT starkare for att fyra
 const BODY_CEIL_DB_S = 0.15;   // taket haller latens loud-referens lange
-// FULL DROP PÅ FLANKEN (flyttad ur effects.ts 11-09, a3 - historiken: ägarens ladan 10-12..10-30, se git-historiken för effects.ts):
-// baskroppens topp (bodyFast över FLANK_HOLD_S) har legat >= FLANK_GONE_DB under taket (bodyCeil) i >= FLANK_BREAK_S (eller
-// >= FLANK_SHORT_S med >= FLANK_SHORT_RISE_DB djup), och fyrar när bodyFast går upp till taket - FLANK_LAND_DB med >= FLANK_RISE_DB
-// stigning på 0,5 s. Helt tyst (lvlSmooth <= FLANK_SILENT_LV) i breaket = låtlucka, ingen drop. Samma filter som slam-kandidaten
-// (bodyFast 60 ms, bodyEnv 350 ms, bodyCeil -0,15 dB/s) - förr en egen kopia i effekterna.
-const FLANK_GONE_DB = 10, FLANK_BREAK_S = 4, FLANK_LAND_DB = 6, FLANK_RISE_DB = 12, FLANK_HOLD_S = 0.6, FLANK_GRACE_S = 1;
-const FLANK_SHORT_S = 2, FLANK_SHORT_RISE_DB = 24, FLANK_SILENT_LV = 0.005;
-const SHOW_DROP_GAP_MS = 12000;   // spärr mellan full drops (ägaren 10-12): flank inom spärren = minidrop (dropSpaced)
+// FULL DROP = BASEN KOMMER TILLBAKA HEL EFTER EN UPPBYGGNAD (drop1 fusion a1 + a8, ladan 2026-11-13; ägaren: "är det ingen
+// uppbyggnad, så är det troligen bara minidrop"). I själva ögonblicket skiljer inget drop från minidrop - skillnaden är det som hänt
+// FÖRE. En uppbyggnad har TVÅ kännetecken och BÅDA krävs: basen hålls tillbaka i takter (TIDEN), och under tiden händer det saker
+// ovanför den - riser, virvelrulle, filtersvep (RÖRELSEN). Vart och ett ensamt släpper igenom det andra tar: tiden ensam gör ett
+// långt break där inget byggs till drop (11-13: två av ägarens minidrop, 5-10 s), rörelsen ensam gör ett kort svep över en glugg
+// på ett par slag till drop (en av hans minidrop, 3,3 s). Samma filter som slam-kandidaten (bodyFast 60 ms, bodyEnv 350 ms, bodyCeil
+// -0,15 dB/s); allt är dB-avstånd till låtens egna nivåer - ingen absolut nivå, samma dom vid ljudet x1, x2, x3.
+// TIDEN (a1): heldS = sekunder basens topp (bodyFast över FLANK_HOLD_S) legat under låtens tak (bodyCeil).
+//   HELD_DB       toppen >= 2,5 dB under taket = basen hålls tillbaka: heldS fylls 1 s/s. Övningen 11-13 ger samma dom för 1,5-3,5 dB.
+//   HELD_DRAIN    annars rinner heldS 1,5 s/s: ett kort återbesök av basen (basstötar i uppbyggnaden, slagen i en dropserie) tömmer
+//                 inte en lång uppbyggnad, men en bas som spelar vidare gör det på några sekunder. Mitt på platån: samma dom för
+//                 0,75-2,25 (vid 2,5 tappas dropseriens omslag, vid 0,5 laddar basstötar med 2 s gluggar ett intro).
+//   FLANK_BREAK_S 4 s (två takter vid 120 bpm) = laddat. Samma 4 s som flankens gamla break-krav (ägaren 10-12). Mätt 11-13 bland
+//                 återkomster MED rörelse: ägarens drop 4,7-10 s, hans minidrop 3,3 s.
+//   HELD_CAP_S    10 s: där slutar måttet räkna. En bas som varit borta längre är ett lugnt parti/intro/övergång, inte en
+//                 uppbyggnad (inRiser släpper) - men återkomsten kan fortfarande vara ett drop.
+//   HELD_BUILD_S  uppbyggnad (inRiser) kräver 2 s tillbakahållen bas (en takt; en glugg på ett par slag är ingen uppbyggnad) - halvvägs
+//                 till laddat, och rörelsen (TENSION_BUILD) krävs också.
+// RÖRELSEN (a8): tension = de övre bandens (3-7, 250 Hz-16 kHz) rörelse medan basen är borta, i dB x s (tensionStep).
+//   UP_*          varje bands nivå i dB, snabbt medel (UP_FAST_S) mot långsamt (UP_SLOW_S) - skillnaden är rörelsen. När basen varit
+//                 borta (BODY_GONE_DB under taket, drop-detektorns eget mått) i UP_SETTLE_S ställs det långsamma på det snabba:
+//                 själva utträdet är inte uppbyggnad. Rörelse över UP_STILL_DB (vanlig musik gungar ~1 dB i snitt över banden)
+//                 samlas medan basen är borta. Ett band UP_QUIET_DB under det starkaste är tyst (golvbrus rör sig inte);
+//                 UP_CLIP_DB = ett band som faller ur helt är inte fem gånger mer uppbyggnad än ett svep.
+//   TENSION_TAU_S spänningen klingar av på 4 s (två takter): en uppbyggnad kulminerar, den ligger inte 10 s bakåt.
+//   TENSION_DROP  2,5 dB x s = laddat. Mätt 11-13 bland återkomster efter >= 4 s tillbakahållen bas: långa break med stilla övre
+//                 band (ägarens minidrop) <= 2,0, hans drop >= 3,9 (omslagen i en dropserie 3,2 och 3,5).
+//   TENSION_BUILD 1,5 = uppbyggnaden syns (inRiser) medan spänningen samlas, före den är full.
+//   Helt tyst (lvlSmooth <= FLANK_SILENT_LV) i UP_SETTLE_S = låtlucka: musiken är borta, basen är inte tillbakahållen - båda måtten
+//   nollas, och musiken som kommer igång räknas inte som rörelse (medlen följs åt lika länge efteråt).
+// ÅTERKOMSTEN ska vara HEL (a1, LAND_*): kroppen över taket + LAND_OVER_DB (slagen minst lika hårda som de som satte taket; taket
+//   har sjunkit under uppehållet) och LAND_STEP_DB över allt basen gjort de senaste 0,6 s (äldre än LAND_OLD_MS, dvs. före själva
+//   anslaget). Prövas på bodyLand = kroppen med LAND_FAST_S (30 ms): bodyFast:s 60 ms lägger ~0,05 s på anslaget, och droppen ska
+//   komma NÄR det händer. En halv återkomst (basen tillbaka men svagare) är ingen drop.
+// ETT DROP NOLLAR INGENTING: båda måtten rinner av sig själva (HELD_DRAIN, TENSION_TAU_S). Slår basen om HEL efter en ny glugg medan
+//   laddningen finns kvar (stopp-och-gå efter droppet; ägaren 11-13: tre drop på 7 s) är det drop igen. DROP_SAME_MS = samma smäll
+//   (en takt): en landning eller slam-kandidat så tätt efter ett drop är samma händelse. Den gamla 12 s-spärren (SHOW_DROP_GAP_MS,
+//   ägaren 10-12) är ersatt av laddningen: utan ny uppbyggnad är nästa återkomst en minidrop av sig själv.
+const HELD_DB = 2.5, HELD_DRAIN = 1.5, FLANK_BREAK_S = 4, HELD_CAP_S = 10, HELD_BUILD_S = 2, FLANK_HOLD_S = 0.6;
+const UP_FAST_S = 0.25, UP_SLOW_S = 2, UP_SETTLE_S = 0.8, UP_STILL_DB = 1, UP_CLIP_DB = 12, UP_QUIET_DB = 30;
+const TENSION_TAU_S = 4, TENSION_DROP = 2.5, TENSION_BUILD = 1.5;
+const LAND_OVER_DB = 2, LAND_STEP_DB = 3, LAND_OLD_MS = 150, LAND_FAST_S = 0.03, FLANK_SILENT_LV = 0.005, DROP_SAME_MS = 2000;
+const BUILD_FALL_S = 0.5;   // buildUp släpper på en halv sekund när basen är tillbaka (uppbyggnaden är över då, inte en sekund senare)
+const CAND_WAIT_MS = 300;   // en slam-kandidat medan uppbyggnaden är laddad väntar så här länge på den hela återkomsten innan den blir minidrop
 // LYFT/NÄSTAN-DROP/STOPP (flyttade ur effects.ts stepLifts 11-09): kroppen 120 ms (nearB), normalnivån 8 s, historik i 25 ms-rutor.
 const NEAR_RISE_DB = 10, NEAR_DIP_DB = 8, LIFT_DB = 10, STOP_MINI_S = 0.6;
 
@@ -310,13 +349,13 @@ const NEAR_RISE_DB = 10, NEAR_DIP_DB = 8, LIFT_DB = 10, STOP_MINI_S = 0.6;
 const DOUBLE_FROM_START = [
   'secHiStartMs', 'secHiEndMs', 'expectHighMs', 'levelVsHighDb',
   'sumSq', 'lastT', 'dbgRms', 'lastKick', 'envAccum', 'envAccumT', 'envBassAccum', 'blAccum', 'lvlSmooth', 'lvlVU', 'engSmooth', 'activeMs',
-  'buildUp', 'novSlow', 'kickHit', 'snareHit', 'hatHit', 'bodyEnv', 'bodyFast', 'bodyCeil', 'bodyPeak', 'lastGoneSpanMs', 'lastDropMs',
+  'buildUp', 'kickHit', 'snareHit', 'hatHit', 'bodyEnv', 'bodyFast', 'bodyLand', 'bodyCeil', 'bodyPeak', 'lastGoneSpanMs', 'lastDropMs',
   'lastMiniGoneMs', 'lastMiniMs', 'pendingKickMs', 'kfPrev', 'kfPrev2', 'beatAnchorMs',
   'blPrev1', 'blPrev2', 'blTrough', 'profBassline', 'bassOnsetsPerBeat',
   'rawBpmLast', 'localBpmConfidence',
   'secPct', 'secSongStartMs', 'sectionStartMs', 'secBuildAt', 'secBuildSeen', 'secBlkMs', 'secBlkInt', 'secBlkCent', 'secBlkRms2', 'secCurDbSum', 'repeatSim', 'repeatAgoMs',
   'miniGoneMs', 'bodyGoneMs', 'lastBodyGoneMs', 'dropArmUntil', 'dropArmAt',
-  'fdGone', 'fdSpan', 'fdEnd', 'fdAt', 'fdQuietAt', 'lastShowDropMs', 'dropRiseDb', 'nearB', 'nearNorm', 'nearFloor', 'liftCalm', 'liftLift', 'liftHistAt', 'stopRunS',
+  'heldS', 'candWaitMs', 'fdAt', 'dropRiseDb', 'nearB', 'nearNorm', 'nearFloor', 'liftCalm', 'liftLift', 'liftHistAt', 'stopRunS',
   'nearDropDb', 'nearDipDb', 'liftDb', 'stopS',   // byter forst vid forsta drop-episoden (sags i andra matningen)
 ] as const;
 /** TYPSTABILA TALFALT (2026-09-27, realtidsprincipen): skriv ett icke-heltal och sedan ursprungsvardet, sa V8 ger faltet
@@ -767,7 +806,7 @@ export class Analyser {
   private aAtt = 0; private aRel = 0; private aVU = 0;
   private aIUp = 0; private aIDown = 0; private aBandLvl = 0;
   private dHat = 0; private dSnare = 0; private dKick = 0;
-  private aSpecSlow = 0; private aNovSlow = 0; private aProf = 0;
+  private aProf = 0;
   /** BASBANDETS onset-envelope (kick-flux), samma raster och position som envRing. */
   private envBassRing = new Float32Array(Analyser.ENV_LEN);
   private envBassAccum = 0;
@@ -828,6 +867,7 @@ export class Analyser {
    *  bodyEnv (0.35 s) styr tak och franvaro. Blandar man ihop dem dampas
    *  stigningen och trosklarna slutar motsvara det som mattes i banken. */
   private bodyFast = -120;
+  private bodyLand = -120;   // kroppen med LAND_FAST_S: bara den hela återkomstens prövning (se LAND_*)
   private bodyCeil = -300;   // dB
   private bodyPeak = -300;   // SEG topp (loud-referens i minuter) for landa-hogt
   private lastGoneSpanMs = 0;
@@ -855,7 +895,10 @@ export class Analyser {
   private dropCount = 0;         // monoton drop-räknare (edge-säker för konsumenter) - full drop på flanken
   private dropCand = 0;          // slam-kandidaterna (förr dropCount): sektionens drop-evidens och minidrop utan flank
   private dropDemoted = 0; private dropSpaced = 0; private dropRiseDb = -0;
-  private fdGone = -0; private fdSpan = -0; private fdEnd = -1e12; private fdAbove = true; private fdAt = -1e12; private fdQuietAt = -1e12; private lastShowDropMs = -1e12;
+  private heldS = -0; private heldNow = false; private candWaitMs = -0; private fdAbove = true; private fdAt = -1e12;
+  private upFast = new Float64Array(5).fill(-70); private upSlow = new Float64Array(5).fill(-70);   // övre banden (3-7) i dB, snabbt/långsamt medel (se UP_*)
+  private bassAwayS = -0; private tension = -0;   // basen borta sedan (s) och uppbyggnadens spänning (dB x s)
+  private upCold = UP_SETTLE_S;   // s: växer i tystnad (tak UP_SETTLE_S = låtlucka), krymper med musik; > 0 = musiken har inte hunnit sätta sig
   private fdT = new Float64Array(1024); private fdV = new Float64Array(1024); private fdS0 = 0; private fdN = 0;   // (tid, bodyFast) för toppens fönster
   private nearOn = false; private nearB = -0; private nearNorm = -0; private nearFloor = 1e9; private liftCalm = -0; private liftLift = -0;
   private liftHist = new Float64Array(240); private liftW = 0; private liftN = 0; private liftHistAt = -1e12; private stopRunS = -0;
@@ -883,11 +926,6 @@ export class Analyser {
   /** ~1,5 s vid 125 Hz. MAD startar i noll efter tystnad och byggs upp med
    *  `mad ← 1.006·mad + 6e-5`, vilket tar ≈183 rutor att nå ett användbart värde. */
   private static readonly ONSET_WARM = 183;
-  private specSlow = new Float32Array(8);
-  private novSlow = 0;           // ihållande spektral novelty (~1.5s)
-  private novBaseline = 0.2;     // ~8s baslinje → riser = novelty STIGER över den
-  private centSlow = 0.3;
-  private lvlSlowR = 0.3;
   private buildUp = 0;           // 0..1 uppbyggnads-envelope
   // KARAKTÄRSPROFIL (långsam, ~8s)
   private profPunch = 0.4;
@@ -1796,8 +1834,6 @@ export class Analyser {
     this.dHat = Math.exp(-dtHop / 0.06);
     this.dSnare = Math.exp(-dtHop / 0.11);
     this.dKick = Math.exp(-dtHop / 0.15);
-    this.aSpecSlow = 1 - Math.exp(-dtHop / 2.0);
-    this.aNovSlow = 1 - Math.exp(-dtHop / 1.5);
     this.aProf = 1 - Math.exp(-dtHop / 8.0);
     // Ett återanvänt Frame (spec/onset pekar på de pre-allokerade objekten).
     this.outFrame = {
@@ -2487,6 +2523,7 @@ export class Analyser {
     const dtHop = this.dtHop;
     this.bodyEnv += (bodyNow - this.bodyEnv) * Math.min(1, dtHop / 0.35);
     this.bodyFast += (bodyNow - this.bodyFast) * Math.min(1, dtHop / BODY_FAST_S);
+    this.bodyLand += (bodyNow - this.bodyLand) * Math.min(1, dtHop / LAND_FAST_S);
     const bodyPeek = this.bodyFast;   // (DROP_PEEK forkastad 09-08: ra-min oppnade falska klassen)   // 0.06 testat men gav falsklarm live utan att fixa beat-lagget (det sitter i lamp-vagen/energin, inte har)
     // TAKET SJUNKER I dB PER SEKUND, inte i procent. Kroppen ar nu ett dB-tal
     // (negativt), och "1,5 % av ett negativt tal" gor taket STORRE, inte mindre —
@@ -2494,7 +2531,8 @@ export class Analyser {
     this.bodyCeil = Math.max(this.bodyEnv, this.bodyCeil - dtHop * BODY_CEIL_DB_S);
     this.bodyPeak = Math.max(this.bodyEnv, this.bodyPeak - dtHop * 0.04);   // ~0.04 dB/s ≈ haller loud-referensen i minuter
     this.bodyUnderDb = this.bodyCeil - this.bodyEnv;
-    const flank = this.flankStep(nowWallA, dtHop);   // EN DROPDETEKTOR: flanken på samma filter (se FLANK_GONE_DB)
+    this.tensionStep(dtHop);
+    const flank = this.flankStep(nowWallA, dtHop);   // EN DROPDETEKTOR: hel återkomst efter uppbyggnad, på samma filter (se HELD_DB)
     this.liftStep(nowWallA, dtHop, bodyNow);
 
     // BAS-FRÅNVARO med VARAKTIGHETSKRAV: under 40 % av taket i ≥2 s i sträck.
@@ -2682,32 +2720,63 @@ export class Analyser {
     this.dropClassify(flank, fireNow, nowWallA);
   }
 
-  /** EN DROPDETEKTOR - klassningen (a3): flanken är full drop (efter spärren), slam-kandidaten utan egen flank inom 2 s är minidrop. */
+  /** EN DROPDETEKTOR - klassningen (a3): den hela återkomsten efter uppbyggnad är full drop, slam-kandidaten utan den är minidrop.
+   *  Kandidaten kommer ofta några hopp FÖRE den hela återkomsten (den nöjer sig med toppen - 3,5 dB): är uppbyggnaden laddad väntar
+   *  den CAND_WAIT_MS på droppen i stället för att ge en minidrop strax före den. */
   private dropClassify(flank: boolean, cand: boolean, nowWallA: number): void {
-    if (flank) {
-      if (nowWallA - this.lastShowDropMs < SHOW_DROP_GAP_MS) { this.dropSpaced++; this.miniDropCount++; }
-      else { this.lastShowDropMs = nowWallA; this.dropCount++; }
-    } else if (cand && nowWallA - this.fdAt > 2000) { this.dropDemoted++; this.miniDropCount++; }
+    if (flank) { this.candWaitMs = 0; this.dropCount++; return; }
+    if (cand && nowWallA - this.fdAt > DROP_SAME_MS) {
+      if (this.heldS >= FLANK_BREAK_S && this.tension >= TENSION_DROP) this.candWaitMs = nowWallA; else { this.dropDemoted++; this.miniDropCount++; }
+    }
+    if (this.candWaitMs > 0 && nowWallA - this.candWaitMs >= CAND_WAIT_MS) { this.candWaitMs = 0; this.dropDemoted++; this.miniDropCount++; }
   }
 
-  /** FULL DROP PÅ FLANKEN (se FLANK_GONE_DB): på dropStep:s egna filter (bodyFast/bodyEnv/bodyCeil), per hop. */
+  /** FULL DROP = HEL ÅTERKOMST EFTER UPPBYGGNAD (se HELD_DB): på dropStep:s egna filter (bodyFast/bodyCeil), per hop.
+   *  Håller heldS (sekunder tillbakahållen bas) och heldNow åt uppbyggnaden (riserStep). */
   private flankStep(now: number, dt: number): boolean {
     const CAP = 1024, T = this.fdT, V = this.fdV, f = this.bodyFast, ceil = this.bodyCeil;
     if (this.fdN === CAP) { this.fdS0 = (this.fdS0 + 1) & (CAP - 1); this.fdN--; }
     { const w = (this.fdS0 + this.fdN) & (CAP - 1); T[w] = now; V[w] = f; this.fdN++; }
     while (this.fdN > 1 && now - T[this.fdS0] > FLANK_HOLD_S * 1000) { this.fdS0 = (this.fdS0 + 1) & (CAP - 1); this.fdN--; }
-    let top = -1e9, low = 1e9; for (let q = 0; q < this.fdN; q++) { const i = (this.fdS0 + q) & (CAP - 1); if (V[i] > top) top = V[i]; if (now - T[i] <= 500 && V[i] < low) low = V[i]; }
-    if (top < ceil - FLANK_GONE_DB) this.fdGone += dt; else { if (this.fdGone > 0) { this.fdSpan = this.fdGone; this.fdEnd = now; } this.fdGone = 0; }
-    const above = f > ceil - FLANK_LAND_DB, edge = above && !this.fdAbove; this.fdAbove = above;
-    const span = this.fdGone > 0 ? this.fdGone : now - this.fdEnd < FLANK_GRACE_S * 1000 ? this.fdSpan : 0;
-    if (this.lvlSmooth <= FLANK_SILENT_LV) this.fdQuietAt = now;
-    if (!edge || f - low < FLANK_RISE_DB || (span < FLANK_BREAK_S && !(span >= FLANK_SHORT_S && ceil - low >= FLANK_SHORT_RISE_DB))) return false;
-    if (now - this.fdQuietAt < span * 1000 + 500) { this.fdGone = 0; this.fdSpan = 0; if (DROP_TRACE) console.log(`[flank] ingen drop: helt tyst i breaket (latstart), break ${span.toFixed(1)} s`); return false; }
-    this.fdGone = 0; this.fdSpan = 0; this.fdAt = now; this.dropRiseDb = f - low;
-    if (DROP_TRACE) console.log(`[flank] full drop pa flanken: break ${span.toFixed(1)} s, stigning ${(f - low).toFixed(1)} dB`);
+    // top = basens topp över hela fönstret, old = toppen FÖRE anslaget (äldre än LAND_OLD_MS), low = botten senaste 0,5 s (styrkan)
+    let top = -1e9, old = -1e9, low = 1e9;
+    for (let q = 0; q < this.fdN; q++) { const i = (this.fdS0 + q) & (CAP - 1), v = V[i], age = now - T[i]; if (v > top) top = v; if (age > LAND_OLD_MS && v > old) old = v; if (age <= 500 && v < low) low = v; }
+    const held = top < ceil - HELD_DB; this.heldNow = held;
+    if (this.upCold >= UP_SETTLE_S) this.heldS = 0;   // låtlucka (se tensionStep)
+    else if (held) { this.heldS += dt; if (this.heldS > HELD_CAP_S) this.heldS = HELD_CAP_S; }
+    else { this.heldS -= dt * HELD_DRAIN; if (this.heldS < 0) this.heldS = 0; }
+    const g = this.bodyLand, land = g > ceil + LAND_OVER_DB && g - old >= LAND_STEP_DB, edge = land && !this.fdAbove; this.fdAbove = land;
+    if (!edge || now - this.fdAt < DROP_SAME_MS) return false;
+    const built = this.heldS >= FLANK_BREAK_S && this.tension >= TENSION_DROP;
+    if (DROP_TRACE) console.log(`[flank] wall ${this.wallNow()} hel aterkomst: basen tillbakahallen ${this.heldS.toFixed(2)} s, spanning ${this.tension.toFixed(2)}, over taket ${(g - ceil).toFixed(1)} dB, steg ${(g - old).toFixed(1)} dB -> ${built ? 'DROP' : 'ingen uppbyggnad'}`);
+    if (!built) return false;
+    this.fdAt = now; this.dropRiseDb = f - low;
     return true;
   }
 
+  /** UPPBYGGNADENS SPÄNNING (a8, se UP_*): de övre bandens rörelse medan basen är borta -> this.tension (dB x s). Per hop, inga
+   *  allokeringar: fem band, två medel var. */
+  private tensionStep(dt: number): void {
+    const gone = this.bodyCeil - BODY_GONE_DB, away = this.bodyEnv < gone && this.bodyFast < gone;
+    const was = this.bassAwayS; this.bassAwayS = away ? was + dt : 0;
+    const cold = this.upCold = this.lvlSmooth <= FLANK_SILENT_LV ? Math.min(UP_SETTLE_S, this.upCold + dt) : Math.max(0, this.upCold - dt);
+    if (cold >= UP_SETTLE_S) this.tension = 0;   // låtlucka
+    const settled = this.bassAwayS >= UP_SETTLE_S, anchor = cold > 0 || (settled && was < UP_SETTLE_S);
+    const F = this.upFast, S = this.upSlow, raw = this.bandDbRaw, aF = dt / UP_FAST_S, aS = dt / UP_SLOW_S;
+    let top = S[0]; for (let b = 1; b < 5; b++) if (S[b] > top) top = S[b];
+    const quiet = top - UP_QUIET_DB; let mv = 0;
+    for (let b = 0; b < 5; b++) {
+      const x = raw[b + 3] > -70 ? raw[b + 3] : -70;   // -70 dB = analysatorns eget golv (bandDb)
+      const f = F[b] += (x - F[b]) * aF;
+      const s = anchor ? (S[b] = f) : (S[b] += (x - S[b]) * aS);
+      if (f < quiet && s < quiet) continue;
+      const d = f > s ? f - s : s - f; mv += d < UP_CLIP_DB ? d : UP_CLIP_DB;
+    }
+    mv /= 5;
+    if (settled && cold === 0 && mv > UP_STILL_DB) this.tension += (mv - UP_STILL_DB) * dt;
+    this.tension -= this.tension * dt / TENSION_TAU_S;
+  }
+
   /** NÄSTAN-DROP, ENERGILYFT, STOPP (a3, förr effects.ts stepLifts): VAD + STYRKA ut i ramen; effekterna avgör reaktionen. */
   private liftStep(now: number, dt: number, body: number): void {
     const x = Math.max(-90, body);
@@ -2737,38 +2806,13 @@ export class Analyser {
     }
   }
 
-  /** Uppbyggnad/riser (spektral novelty + klang/niva). Returnerar inRiser och uppdaterar buildUp. */
+  /** Uppbyggnad = basen hålls tillbaka medan de övre banden rör sig (se HELD_DB): samma två mått (heldS, tension) som avgör drop
+   *  eller minidrop. Returnerar inRiser och uppdaterar buildUp = hur långt in i det längsta en uppbyggnad varar (heldS / HELD_CAP_S,
+   *  0..1). Den gamla risern (spektral novelty + klang/nivå) hade absoluta nivågränser (lvlSmooth > 0,3/0,4) och var död vid ren nivå: 0 % av tiden 11-13. */
   private riserStep(): boolean {
-    const nowWallA = this.hNowWall;
-    const dtHop = this.dtHop;
-    // ── UPPBYGGNAD / RISER (flyttad hit) ──
-    // Spektral NOVELTY = summan av bandens POSITIVA avvikelse från en ~2s baslinje,
-    // ihållande ~1.5s. Mätt validerad: ramsar 0.25→0.78 in i en drop. Relativt en
-    // ~8s baslinje → RISER = novelty STIGER över den (filter-sweep/snare-roll),
-    // skilt från bara-busy (ihållande → baslinjen kommer ikapp). Gammal väg
-    // (klang+nivå stiger) ligger kvar som OR. Inte direkt efter en drop.
-    let nov = 0; const sr = this.aSpecSlow;
-    // NOVELTY PÅ `bandDb`, INTE `bandLvl` — se fältets dokumentation. Med den
-    // AGC-normaliserade nivån var det här uttrycket matematiskt tvunget att gå
-    // mot noll under exakt de förlopp det skulle upptäcka.
-    for (let b = 0; b < 8; b++) { this.specSlow[b] += (this.bandDb[b] - this.specSlow[b]) * sr; nov += Math.max(0, this.bandDb[b] - this.specSlow[b]); }
-    this.novSlow += (nov - this.novSlow) * this.aNovSlow;
-    this.novBaseline += (this.novSlow - this.novBaseline) * (dtHop / 8);
-    const novRiser = this.novSlow > this.novBaseline + 0.15 && this.novSlow > 0.45;
-    this.centSlow += (this.centSmooth - this.centSlow) * (dtHop / 2.5);
-    this.lvlSlowR += (this.lvlSmooth - this.lvlSlowR) * (dtHop / 2.5);
-    const inRiser = this.activeMs > 2500 && this.lvlSmooth > 0.3 && nowWallA - this.lastDropMs > 1500 && (
-        novRiser
-        || (this.centSmooth > this.centSlow + 0.06 && this.lvlSmooth > this.lvlSlowR + 0.04 && this.lvlSmooth > 0.4)
-      );
-    // Stampla uppbyggnaden. OBS: drop-villkoret ovan kraver INTE en riser — det
-    // kravet ar avstangt (se dar). Stampeln halls uppdaterad for att kravet ska
-    // kunna aterinforas nu nar riser-signalen faktiskt lever (se `bandDb`).
-    // Nagot "4000 ms-fonster" finns inte i filen; den formuleringen var kvar
-    // fran en tidigare version av villkoret.
-    const bTarget = inRiser ? 1 : 0;
-    const bRate = bTarget > this.buildUp ? dtHop / 3.5 : dtHop / 1.0;   // bygg ~3.5s, klinga ~1s
-    this.buildUp += Math.max(-bRate, Math.min(bRate, bTarget - this.buildUp));
+    const inRiser = this.heldNow && this.heldS >= HELD_BUILD_S && this.heldS < HELD_CAP_S && this.tension >= TENSION_BUILD;
+    if (inRiser) this.buildUp = this.heldS / HELD_CAP_S;
+    else { this.buildUp -= this.dtHop / BUILD_FALL_S; if (this.buildUp < 0) this.buildUp = 0; }
     return inRiser;
   }
 
~~~~
