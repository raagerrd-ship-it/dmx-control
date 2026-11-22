# analyserSection.ts - anteckningar

Kommentarerna som stod i koden fram till uppdelningen 2026-11-14, ordagrant, under den konstant, det fält eller den metod de hörde till.
Koden har bara en kort etikett kvar per deklaration. Nya anteckningar skrivs här, inte i koden.

## Filhuvudet

```text
 SEKTIONSFÖLJAREN (utbruten ur analyser.ts 2026-11-14). Samlar låtens block (nivå, täthet, klang), rangordnar dem till sektionsetiketter, känner igen upprepning och förutsäger nästa refräng. Körs i långsamma vägen; läser nivå, klang, drop-räknare och klockans tempo ur analysatorn (this.a).
```

## Toppnivå

### DOUBLE_FROM_START

```text
 Talfält som ska vara flyttal från start (se stabiliseringen i analyser.ts).
```

## SectionTracker

### a

```text
 analysatorn som äger den här delen (delade signaler läses via den)
```

### PREDICT_SRC

```text
 Forutsagelsens kallor (bitmask): 1 = minne (tidigare sektion med samma etikett), 2 = fras (stigande energi -> 8-taktsgrans). Bank-A/B.
```
På raden: standard 2 sedan frasgittret: minnet gav +1,6 falska/min utan traffar (09-21 kvall)


### PREDICT_LAT

```text
 Frasregel: LOS (standard): 2 stigande block ELLER energi, horisont 16 takter; LOTUS_PREDICT_STRICT=1: 3 block OCH energi, 8 takter.
 Bank 09-21 (12 hela latar, 22 refrangstarter): los 8/22 forutsedda inom +-2 s, lead 11,9 s, 6,0 falska/min; stram 4/22, 4,0/min;
 bara minne 2/22, 2,0/min. Taket satts av sektionsdetektorn sjalv (high==high 0,51) - battre sektioner -> battre forutsagelse.
```
```text
 FRASGITTER (09-21 kvall, agent-sec4): LOTUS_PREDICT_GRID = 'hi' (standard) forankrar frasgittret i senaste 'high'-STARTEN (fore forsta
 refrangen: sektionsstarten) i stallet for i varje sektionsstart (som flimrar 6 byten/min) -> samma maltid oavsett nar regeln tander.
 'sec' = gamla. LOTUS_PREDICT_LAT = gitterlangd i takter (standard 4; gamla 8). LOTUS_PREDICT_RISE = minsta antal raka stigande block
 (secRiseRun) for frasregeln (standard 4; 0 = gamla losa regeln riseRun>=2 || buildUp>0,35 || bInt>0,55). LOTUS_PREDICT_DIP = dB (0 = av):
 SUG-regel - blockets dB dyker >= DIP dB under medianen av de 6 blocken fore, i hog kontext (medianen >= refrangens dB - 4) -> high om 2 s
 (kalla 3; bara pa dykets forsta block). Bank (12 hela latar, 22 refrangstarter): standard 8/22, 2,0 falska/min (var 8/22, 6,0);
 RISE=0 12/22, 6,0/min; DIP=5 ensam 3/22, 0,8/min (kort lead 2,3 s) men +1,2/min ovanpa standard utan nya traffar.
```

### RANK_W_BASSON

```text
 NYA SARDRAG I RANGPOANGEN (09-23, agent-sec6; alla 0 = av = identisk poang). Bakgrund: vers 2 och refrang skiljer < 1,5 dB,
 kickraknaren ar mattad (~5,8/s overallt, den raknar tempo) och centroiden skiljer ~0,02 - vers 2 ar oskiljbar med dB/kick/centroid.
 Referensens tiers (sektionsreferensen) = librosa-RMS + BASONSET-TATHET (onset_strength fmax 220 Hz -> onset_detect toppar/s).
 Kandidater, alla per 1 s-block, z-normerade mot latens historik som dB: W_BASSON = basonset-toppar/s (librosa-lik toppplockning
 pa ett dB-flux-envelope 20-250 Hz, INTE kickdetektorn), W_BASSENV = medelvarde av samma envelope, W_HIGH = de hoga bandens
 absolutniva (bandAbs 6+7, 3,5-16 kHz, dB), W_FLAT = spektral flathet over 8 band (geometriskt/aritmetiskt medel),
 W_FLUX = helbandsflux (fluxNorm-medel), W_DYN = dynamik inom blocket (variationskoefficient for rms^2).
 MATT 09-23 (blockdump, AUC 4 s-fonster mot proxy-tier / akustiskt upprepningsreferens, train): basonset-toppar 0,51/0,48 (skiljer INGET -
 referensens egen onsetPerS skiljer refrang fran vers 2 bara 0,59 mot 0,71 for dB), basenvelope 0,59/0,51, hoga band 0,63/0,71,
 flathet 0,56/0,64, flux 0,62/0,73, dynamik 0,46/0,42 (fel tecken), dagens poang 0,64/0,68. BANK (frusen bankmaterial 165, REPEAT 117):
 W_HIGH 1,0 = enda som vinner pa TEST mot bada referenserna: sektionsreferens 0,29/0,54/0,65/0,52 -> 0,29/0,57/0,71/0,52 (falsk-high lika),
 refrang 2 <= 4 s akustiskt 7/30 -> 9/30 (median 9,1 -> 7,5 s), proxy 1/20 -> 2/20 (proxyns <= 8 s 6 -> 4/20, n litet);
 train 0,29/0,61/0,71/0,47 -> 0,38/0,61/0,75/0,47, vers 2 ej high 0,50 -> 0,58. W_FLUX 1,0-1,5 neutral/samre pa refrang 2,
 W_HIGH 1,5 lika bra pa test men sektionsreferens oforandrad pa train. Standard 0 (av) tills agaren slar pa.
```

### secBlkCentH

```text
 ATERINTRADE (09-22, agent-sec5): efter forsta refrangen ar refrangnivan kand (lastHighDb). Ar 2-blocksmedlet tillbaka pa den nivan
 (>= lastHighDb - REENTRY_DB) och 4 s-fonstrets rang >= REENTRY_PCT (under RANK_HI 0,67) -> 'high' DIREKT utan 3-blocks-run.
 Offline-sim pa train-dumpen (14 latar med refrang 2): refrang 2 <= 4 s 0 -> 3/14 (median 12,3 -> 8,0 s), vers 2 oforandrad,
 refrang-recall 0,58 -> 0,67, falsk-high 0,54 -> 0,55; dB-gransen binder nastan aldrig (0,5-2,0 lika), rangen ar det som avgor.
 REENTRY_PCT = 0 (standard) = av.
```
```text
 NIVAMINNE (09-22, agent-a47; opt-in LOTUS_SECTION_LEVELREF bitmask): efter refrang 1 finns en ABSOLUT referens (lastHighDb =
 refrangens medel-dB, lastHighDens = dess kickar/s). Percentilrangen ar relativ mot allt hittills och trog (4 s-fonster, 3 block,
 hysteres) - refrang 2 tog lika lang tid som refrang 1 (bank 09-22: median 12 s). bit 1 INTRADE: blockets dB >= ref - LVL_IN och
 kickar >= ref x LVL_IN_DENS i LVL_IN_RUN block i rad -> 'high' direkt, forbi rangen. bit 2 UTTRADE/GRIND: dB <= ref - LVL_OUT i
 LVL_OUT_RUN block i rad -> inte 'high' (ur high: 'break'), aven om uppehallet (REPEAT 16/32) sager high - det ar vers 2.
 bit 4 REFRANG 1 SNABBT: fore forsta high - blocket >= latens hittills hogsta 4 s-fonstermedel + LVL_PEAK dB och kickar >= medel,
 LVL_IN_RUN block i rad -> 'high' (fran 10 s, i stallet for rangens 20 s historik). Referensen nollas med sectionReset (10 s tystnad).
 BANK 09-22 (bankmaterial, bench.mjs REFRANG 2, REPEAT 117): block-dB ar i praktiken PLATT genom latarna (median refrang 1 - vers 2 = 0,0 dB,
 refrang 2 - refrang 1 = 0,2 dB) och kickraknaren mattad (~5,8/s overallt) - referensens energitiers vilar pa sub-dB-skillnader +
 librosa-basonsettathet. Darfor: LVL_IN 2 dB fyrar nastan alltid (vers 2 ej high 0,43 -> 0,22), LVL_OUT 5 dB fyrar aldrig, 1 dB
 sanker recall (0,58 -> 0,53); bit 4 gor inget (+1,5 dB over hittills hogsta finns inte). Basta: bit 1 med LVL_IN 0 (hogre an
 refrangens medel) i 3 block: train refrang 2 <= 4 s 0/14 -> 5/14, <= 8 s 5 -> 7, median 12,3 -> 6,8 s, vers 2 ej high 0,43 (of.),
 refrang-recall 0,58 -> 0,69; med 2 block 6/14, 8/14, 5,4 s men vers 2 0,39. TEST (2 block): 0/13 -> 1/13, 3 -> 4, 30 -> 25 s,
 vers 2 0,26 -> 0,21, high==high 0,54 -> 0,49 - vinsten overfors svagt. Standard = 0 (av).
```

### bndRef

```text
 levelVsHighDb-referens: 'section' = senaste refrangens medel-dB (standard), 'rank' = HIGH_REF_P-percentilen av latens block-dB.
```
```text
 LATGRANS-NYHET (opt-in <prefix>BOUNDARY_NOV=1): bandfordelning + centroid per 1 s-block mot ett langsamt referensavtryck
 (BOUNDARY_TAU block); kosinusavstandet stiger nar klangen byts. Raknas pa den sida som kor sectionHop.
```

### secHiStartMs

På raden: frasgittrets ankare (senaste high-start), sug-regelns mal + flank


### SEC_EDGE_DB

```text
 SNABBA KANTER (2026-11-12, uppföljningen av arenan bygg): rangen avgör VILKA partier som är 'high', nivåns kant avgör NÄR.
 SEC_EDGE_DB = så stort ska ett nivåskifte vara för att räknas som kant (dB; samma tal åt båda håll och för 'når referensen').
 UPP: blocket ligger SEC_EDGE_DB över medianen av frasen före (4 takter ur klockan - medianen ser varken ett hål eller en smäll på
 något slag) och når referensen (inom SEC_EDGE_DB från senaste 'high'-partiets nivå, lastHighDb) -> 'high' direkt, rangen ställs på 2.
 NED: blocket ligger SEC_EDGE_DB under referensen och blocket före minst halvvägs (skiftet träffar sällan blockgränsen; ett stopp på
 ett enda block är inget sektionsbyte) -> ur 'high' direkt till 'low' (dit rangen själv går ur 'high' när nivån fallit), rangen
 ställs på 0 och får kvalificera sig på nytt.
 Samma mått håller rangen tillbaka: så länge partiet ligger under den refräng musiken lämnade (samma villkor som NED) är rangens
 topp 'build' (på väg upp), inte 'high' - annars tar rangen tillbaka ett tyst parti några sekunder efter kanten.
 secCarryHighDb = förra låtens referens, buren över låtgränsen som blocken (SECTION_CARRY) tills nya låten har en egen (bara UPP).
```

### secScoreSorted

På raden: 2026-10-17: typad scratch, sorteras på plats (var number[] + sort((a, b) => a - b): ~10 kB skräp per block)


### secBlkFeat

```text
 KLANGMALL (09-22, REPEAT bit 256/512; bank agent 'refrang 2'): refrang 2 later som refrang 1. I stallet for W rutor mot EN punkt
 (bit 2: avtryck var 2 s, sekvens 2 rutor = nuet syns forst 4-6 s in i refrangen, och st >= 1 kravde rangens 3-blocks-hysteres) matchas
 VARJE 1 s-block (glidande medel TEMPL_SM block) mot MEDELAVTRYCKET av alla block som hittills varit refrang (TEMPL_SRC 'lab' = egna
 'high'-etiketter, 'rank' = omrankade high-block) resp. INTE refrang, minst 8 s gamla; z-normerat mot latens alla block, cosinus.
 bit 256: simHi >= TEMPL_THR och simHi - simLo >= TEMPL_MARGIN och 4 s-fonstrets rang >= TEMPL_MINPCT -> 'high' direkt (ingen rang-dwell).
 bit 512: i 'high' som halls av minnet/prior (st < 2): simLo - simHi >= TEMPL_MARGIN i TEMPL_RUN raka block -> 'break' (vers 2 liknar vers 1).
 TEMPL_W: dimensionsvikter 'full' | 'nobass' (band 0-2 bort) | 'timbre' (bara band + centroid) | 'nolvl' (dB bort).
 BANK 09-22 (bench.mjs 'refrang2': refrang 2 igenkand <= 4 s / <= 8 s, median; vers 2 ej high; sektionsreferens gransfel/high==high/recall/falsk):
   train (n 14)  117 (Pi):            0/14, 5/14, 12,3 s; 0,43; 0,31/0,51/0,58/0,54      119 (bit 2): identiskt med 117
                 373 rank (117+256):  4/14, 7/14,  7,8 s; 0,43; 0,30/0,51/0,71/0,55      373 lab: 2/14, 5/14, 11,9 s
                 325 rank (uppehall 16/32 AV + 256): 5/14, 8/14, 5,2 s; 0,51; 0,31/0,52/0,62/0,52   <- REKOMMENDERAD
   test  (n 13)  117: 0/13, 3/13, 30,1 s; 0,26; 0,27/0,54/0,65/0,52   373 rank: 3/13, 5/13, 25,4 s; 0,17   325 rank: 4/13, 6/13, 15,3 s; 0,26; 0,33/0,52/0,71/0,53
 Uppehallet (16/32) var det som gjorde vers 2 till 'high' (halls sa lange som forra refrangen); med mallinträdet ateroppnas high inom
 1-2 s nar refrangen ar tillbaka, sa uppehallet behovs inte. Bit 512 (utgang pa klang) ar INTE bankad: offline ar klangen per block
 inte separerbar (vers 2 liknar refrangmallen lika ofta som refrang 2; nyhet vid gransen = nyhet inne i sektionen), sa den ar av.
```

### shIn

```text
 sectionHop:s summor (samma skäl): anroparen fyller, sectionHop läser.
```

### secVDrops

```text
 slow + stora vägen: sektionens syn på drop-räknaren (som R_DROPS förr: värdet vid förra env-recordet).
```

### SECTION_EARLY_S

```text
 TIDIG REFRANG KRAVER NIVA (2026-09-24, drejboken i ladan: varje lat fick intro -> build -> high vid 20-28 s): direkt efter 20 s-
 uppvarmningen rangordnas nuet mot bara introt, sa forsta starkare parti blir 'high' aven om det ar en vers. De forsta
 <prefix>SECTION_EARLY_S sekunderna (0 = av) far 'high' bara om de senaste 4 blockens medel ligger >= SECTION_EARLY_DB over
 latens blockmedian hittills; annars 'build' (pa vag upp) / kvar. Drop far alltid ge high.
```

### secDropsNow()

```text
 SEKTION (2026-09-20). Realtidens sektionstillstand ur latens EGEN historik - inget latminne, ingen PC, inget moln
 (slutlaget: bada Pi-systemen kor allt i realtid). Bygger pa intensity (niva relativt latens robusta baslinje),
 buildUp/breaking/drop-detektorn och en 1 s-blockstatistik. Tier (lag/mellan/hog) med 3 s hysteres; trend = skillnad
 mot 8 s tidigare. Upprepning: ett klangavtryck per 4 s (8 band normerade + centroid + kicktathet + intensitet, L2)
 jamfors med alla avtryck >= 16 s tillbaka (max 96 = 6,4 min); bast cosinus -> repeatSim/repeatAgoMs (repeatSection, avtryckets etikett, borttaget steg 24).
 Kostnad: nagra adds per hop, ~100 punktprodukter a 11 var fjarde sekund. Referens for bansken: all-in-one pa hela latar.
 Sektionens drop-evidens: levande i roll 'all'/'fast'; i workern med stora vägen värdet vid förra env-recordet (som R_DROPS förr).
```

### sectionHop()

```text
 Tar BLOCKSUMMOR (n hop): i roll 'all' anropas den per hop med n = 1, i workern en gang per env-sampel med summorna
 for de ~4 hoppen (split.ts). Samma matematik - medelvardena delas med secBlkN i bada fallen.
```

### sectionBlock()

```text
 Blockets sardrag och etikett (1 s): den kalla delen av sectionHop, egen funktion sa att dess sallan korda grenar inte deoptimerar 100 Hz-ackumuleringen.
```
Vid `const bBon = this.secBlkBon / n, bBpk = this.secBlkBpk / Math.max(0.25, this.secBlkMs /...`:

```text
NYA SARDRAG (09-23): basonset-envelope/toppar, hoga band, flathet, flux, dynamik - per block, se RANK_W_*.
```
Vid `if (this.a.activeMs === 0) { if (++this.secSilentBlocks >= 10) { this.sectionReset(); r...`:

```text
tystnad mellan latar: 3 tysta block -> ny lat
```
Vid `if (this.a.activeMs === 0) { if (++this.secSilentBlocks >= 10) { this.sectionReset(); r...`:

```text
10 s tystnad (var 3: en tyst vers nollade laten, Regnblota 100 s)
```
Vid `let tier = bInt >= 0.62 ? 2 : bInt <= 0.40 ? 0 : 1;`:

```text
tier med hysteres
```
Vid `const db = 10 * Math.log10(this.secBlkRms2 / n + 1e-10); this.secBlkDb.push(db); this.s...`:

```text
KAUSAL PERCENTILRANG (15:35): blockets dB (ra rms, fore AGC) och basonset-tathet (kickar/s) z-normeras mot alla block
hittills i laten, 4 s-fonstrets medelpoang rangordnas mot alla blockpoang hittills. Minst 20 s historik; innan dess 'intro'.
```
Vid `let edgeUp = false, edgeDown = false, fallen = false;`:

```text
SNABBA KANTER (se SEC_EDGE_DB): nivåskiftet mot referensen tar etiketten direkt, förbi rangens fönster, lopp och uppehållstid.
```
Vid `fallen = nb >= 2 && blkDb <= this.lastHighDb - E && D[nb - 2] <= this.lastHighDb - E / 2;`:

```text
partiet ligger under låtens egen referens
```
Vid `const m = Math.min(nb - 1, 4 * Math.max(2, Math.min(4, Math.round(barMs / 1000)))), w =...`:

```text
frasen före blocket, i block
```
Vid `this.secHist[this.secHistPos] = bInt; this.secHistPos = (this.secHistPos + 1) & 15; if ...`:

```text
trend mot 8 s sedan
```
Vid `if (this.secBlkDb.length < 20) label = edgeDown ? 'low' : edgeUp || (Analyser.BODY_HIGH...`:

```text
rang-lage: tier 2 = high, tier 0 = low, mitten = 'break' pa vag ner fran high, 'build' pa vag upp fran low/intro, annars kvar
SECTION_BODY_HIGH aven i intro (DMX-fyndet 10-20: latgransen 0,1-7 s fore dropen nollade till intro, smallen nadde aldrig high):
basen tillbaka = 'high' direkt och kvar tills rangen har 20 block.
```
Vid `if ((Analyser.REPEAT & 64) && this.a.repeatSim >= SectionTracker.REPEAT_THR && this.a.r...`:

```text
MINNET (bit 2/8): nuet liknar ett tidigare parti -> det partiets tier (omrankad med dagens kunskap) vager in.
INTRADE VIA LAG (bit 64): det forflutnas high-start + lag ar NU (-1,5..+1 s) -> high direkt, utan rangens 2-blocks-hysteres + 4 s-fonster
```
Vid `if ((Analyser.REPEAT & 48) && prev === 'high' && label === 'break' && st === 1) {`:

```text
ATERINTRADE (REENTRY_PCT): nivan ar tillbaka pa refrangens och rangen nastan uppe -> high direkt (refrang 2 <= 4 s)
KLANGMALL IN (bit 256): blocket later som refrangen hittills (och inte som resten) och rangen ar inte tydligt lag -> high direkt
UPPEHALL I HIGH (bit 16 minne / bit 32 prior 8 takter): rangen dippar till mellan mitt i refrangen (4 s-fonster) -> high -> break -> high
var 4 s (baslinjen: joaquinphoenix 24h 28b 32h 36b 45h mot referens high 27-102 s). Sa lange forra refrangen varade halls high; tier 0 slapper.
```
Vid `if (dropped && label === 'high') this.secDropHoldUntil = nowMs + (Analyser.RANK_WIN + A...`:

```text
DROPEN HALLER HIGH (2026-11-03, DMX-fyndet 11-02: break med full bas efter dropen, high 66,2 -> break -> high 71,3 i ladan):
dropped ger high i ett block, men rangens 4 s-fonster bar breakets block i RANK_WIN + RANK_RUN block till - sa lange halls
'high' efter en drop om tier >= 1; tier 0 slapper. Standard i koden sedan 11-03 (agaren; backup/fore-drop-hold-20261103).
```
Vid `}`:

```text
UTGANG VIA LAG (bit 128): det forflutnas high-SLUT + lag. Sa lange det forflutna fortfarande ar high halls high (st 1);
nar slutet ar NU (-1,5..+1,5 s) och rangen inte langre sager high -> 'break' direkt (minnets grans i stallet for uppehallets slut).
NIVAMINNE (LEVELREF, se flaggan): absolut referens fran refrang 1 i stallet for den troga percentilrangen. Drop vinner alltid.
KLANGMALL UT (bit 512): high som bara halls (rangen sager inte high) men blocket later som icke-refrangen i TEMPL_RUN raka block -> break
```
Vid `if (label === 'high' && prev !== 'high' && !dropped && !edgeUp && fallen && nowMs - thi...`:

```text
RANGEN NÅR INTE REFERENSEN (se SEC_EDGE_DB): rangen säger topp men partiet ligger kvar under den refräng musiken lämnade ->
på väg upp ('build'), inte framme. Gäller så länge den referensen är färsk (BE_MEM_BEATS slag, som basenergins referens).
```
Vid `const dwellMs = label === 'high' ? 4000 : 8000;`:

```text
UPPEHALLSTID (09-20, forsta forsta hela laten: build/intro/low bytte var 1-3 s): ett byte kravs ha statt >= 4 s i nuvarande
sektion, utom in i 'high' (drop/topp ska synas direkt) och ur 'high' till 'break' (svackan ar en flank).
uppehallstid 8 s (var 4: build/low/high bytte var 4 s pa pop 14:30), utom in i 'high' (4 s) och high -> break (direkt)
```
Vid `const dbMean = this.secCurDbN ? this.secCurDbSum / this.secCurDbN : blkDb;`:

```text
MINNE: avslutad sektion till loggen (medel-dB, kickar/s); refrangens dB blir referensen for levelVsHighDb.
```
Vid `if (prev === 'build' || this.a.section === 'build') { if (this.a.section === 'build' &&...`:

```text
UPPBYGGNADENS START (frame.sectionBuildProg): 'build' som återkommer inom 2 s räknas som samma uppbyggnad (sektionsfladder).
```
Vid `if (this.a.section === 'high') { this.lastHighDb = this.secCurDbSum / this.secCurDbN; }`:

```text
pagaende refrang = farskaste referensen
```
Vid `let sum = 0; for (let i = 0; i < 8; i++) sum += this.secBlkSpec[i];`:

```text
klangavtryck var 4:e sekund
```

### rankTier()

```text
 RANGBERÄKNINGEN (2026-10-17, skräpjakten): utbruten ur sectionBlock. sectionBlock körs 1 gång/s och deoptas; V8 optimerar om
 först efter tusentals anrop, så looparna här över hela låtens block (~600) gick otolkade och boxade varje flyttal (~21 kB per
 block). Som egen metod med tunga loopar optimeras den på loopbudgeten. Samma räkning i samma ordning; returnerar tiern.
```
Vid `const terms = this.secTerms; let nt = 0;`:

```text
Nya sardrag (RANK_W_*): z mot latens historik med sd-golv (skala per sardrag), viktade in i samma poang i fast
ordning. Poangen summeras i 64 bitar och lagras en gang (SECTION_SCORE_F32 avrundar da en gang, som aldre vagen).
```

### rankTerm()

```text
 En RANK_W_*-term (2026-10-17: fasta objekt i secTerms i st f en ny array + objekt + closure per block). Samma räkning som förr.
```

### repeatStep()

```text
 UPPREPNINGSMINNE v2 (se REPEAT). Kors per sektionsblock; avtryck var REPEAT_STEP:e block. Bara sectionHops blocksummor + egna falt.
```
Vid `const N = this.secFp2N; const idx = (m: number) => (pos - m + MAX) % MAX;`:

```text
m = alder i rutor (0 = nyaste)
z-normering mot latens egen historik: medel/std per dimension over alla lagrade avtryck, sedan enhetslangd
```
Vid `const W = Math.min(SectionTracker.REPEAT_W, N); let best = 0, bestM = -1;`:

```text
sekvensmatch: de W senaste rutorna mot W rutor som slutar >= 16 s tillbaka
```
Vid `const nb = this.secBlkDb.length; if (nb < 20) { this.a.repeatAgoMs = 0; this.a.repeatSe...`:

```text
omrankning med dagens kunskap: blockpoang sorterade -> percentil for det matchade partiet (medel over W rutor) och for blocken efter det
```
Vid `if (Analyser.REPEAT & 16) {`:

```text
MINNE OM LANGD (bit 16): langsta high-korningen (omrankad, luckor <= 2 block) fore nuvarande sektion -> sa lange varar high
```
Vid `const tEnd = this.secFp2T[kEnd]; let run = 0, at = 0, endAt = 0, lowRun = 0;`:

```text
det forflutnas framtid: forsta blocket efter det matchade partiet som (2 i rad) rankas high -> vantas igen efter lag
```
Vid `else if (!hi) { if (++lowRun >= 3) { endAt = this.secBlkT[i - 2] + lagMs; break; } } el...`:

```text
slutet: 3 block i rad under high
```
Vid `if (at > 0 && prevAt > nowMs && Math.abs(at - prevAt) <= 4000) { at = prevAt; this.repe...`:

```text
STABILT MAL: matchningens lag driver nagra sekunder mellan stegen (techno: allt liknar allt) och malet gled med (tim: 12 falska/min).
Ett aktivt mal behalls om det nya ligger inom +-4 s; ett mal publiceras forst nar det statt tva steg i rad (repeatHighRun).
```

### predictHigh()

```text
 FORUTSAGELSE av nasta 'high' (se Frame.expectHighInMs). Kors per sektionsblock (1 s) i workern. Kallor: 1 minne, 2 fras
 (stigande energi -> nasta gitterpunkt), 3 sug (dyk i dB strax fore smallen). Frasgittret ligger i takter fran senaste
 high-starten (PREDICT_GRID 'hi') sa att en forutsagelse pekar pa samma tid oavsett i vilket block regeln tander.
```
Vid `if ((Analyser.REPEAT & 4) && this.a.section !== 'high' && this.a.repeatSim >= SectionTr...`:

```text
(4) UPPREPNING (REPEAT bit 4): det forflutna spelas upp igen med lag L -> forra gangens high-start + L
```
Vid `if (SectionTracker.PREDICT_SRC & 1) for (let i = this.secLog.length - 2; i >= 0; i--) {`:

```text
(1) MINNE: senaste tidigare sektion med samma etikett som foljdes av 'high' -> samma antal takter (avrundat till 4, minst 4)
```
Vid `const rising = this.secRiseRun >= SectionTracker.PREDICT_RISE;`:

```text
(2) FRAS: energin stiger -> nasta gitterpunkt (PREDICT_LAT takter) fran ankaret (minst en takt bort, hogst 16 takter)
```
Vid `if (exp === 0 && this.a.expectHighMs > 0 && this.a.section !== 'high' && this.a.expectH...`:

```text
hall forutsagelsen tills 2 s efter
```

### sectionFlushAgg()

```text
 Roll 'all': sektionsblocket ur samma aggregat som workern far (se secAgg).
```

### sectionAggStep()

```text
 Sektionens blocksummor per hop (SECTION_AGG 'env': ackumulator; 'hop': sectionHop direkt / snabba sidans aggregat).
```
Vid `if (this.a.bigOn) return;`:

```text
stora vägen: aggregatet byggs i långsamma tråden (bigAgg)
```
Vid `const sp = this.a.secSpecHop;`:

```text
Aldre vagen: bandens magnitud ur band-dB; odelad analysator kor sectionHop per hop, snabba sidan aggregerar.
```
Vid `const sp = this.a.secSpecHop;`:

```text
bandDbRaw ändras bara i bigStep (var BIG_EVERY:e hop): potensen räknas om då, samma värden (a7/a8)
```

