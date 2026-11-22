# split.ts - anteckningar

Kommentarerna som stod i koden fram till uppdelningen 2026-11-14, ordagrant, under den konstant, det fält eller den metod de hörde till.
Koden har bara en kort etikett kvar per deklaration. Nya anteckningar skrivs här, inte i koden.

## Filhuvudet

```text
DELAD ANALYSATOR (2026-09-21): transporten mellan den SNABBA tråden (ljudvägen: FFT, band,
onset, kick, nivå, drop — måste svara inom en hop) och den LÅNGSAMMA (tempo, gridfas,
sektioner, upprepning — sekunder är ok). Den långsamma kör i en worker_threads-Worker
med egen V8-heap och egen kärna, så dess beräkningar och skräpsamling aldrig ligger i
vägen för hop-loopen och ticken. Ägarens fråga: "dela upp analysatorn och lägga en del
på egen cpu som löpande försöker förstå vilken sektion vi är i samt build-up".

Snittet (kartlagt med fältanalys av analyser.ts): computeBpm/computeGridPhase läser bara
100 Hz-ringarna (helband + bas) plus sin egen tid; sectionHop läser blocksummor per hop
(intensitet, kickar, rms², centroid, bandAbs) plus dropCount/activeMs/buildUp. Tillbaka
går ~12 tal: bpm, konfidens, gridfas, sektion, upprepning.

Transport: en SharedArrayBuffer-ring med ett RECORD per env-sampel (100 Hz, ~26 doubles)
skrivet av den snabba tråden, och ett TILLSTÅNDSBLOCK (seqlock) skrivet av den långsamma.
Inga meddelanden i driftvägen, ingen allokering, ingen kopiering. Kommandon (tystnads-
nollning, resetTempo, låtbyteshint, virtuell klocka) åker som flaggor I recordet, så
ordningen mot ljuddata bevaras exakt — det gör att inline-läget (båda i samma tråd, se
createAnalyser) ger BIT-IDENTISKT tempo mot den odelade analysatorn, vilket körbänken bevisar.
```

## Toppnivå

### import

På raden: tilliten utjämnas i hoppets tid (11-11)


### RING_N

På raden: ~10 s vid 100 Hz — workern får ligga efter utan att tappa


### RING_MARGIN

På raden: records workern lämnar orörda mot skrivaren (80 ms) — läses aldrig närmare kanten


### R_SEQ, R_PERF, R_WALL, R_ENV, R_BASS, R_FLAGS, R_HINT_MS, R_VCLOCK, R_SEC_N, R_SEC_INT, R_SEC_KICKS, R_SEC_BREAK, R_SEC_RMS2, R_SEC_CENT, R_SEC_DT, R_DROPS, R_ACTIVE, R_BUILD, R_SEC_SPEC0, R_SEC_WALL, R_TS, R_FLAGCNT, R_SEC_BON, R_SEC_BPK, R_SEC_FLUX, R_SEC_RMS4, R_HIGH, R_BIGSEQ, R_CLOCK, R_CLOCK_CONF

```text
Record-fält (Float64)
```
Vid `R_DROPS = 15, R_ACTIVE = 16, R_BUILD = 17, R_SEC_SPEC0 = 18`:

```text
 ..25
```
Vid `R_DROPS = 15, R_ACTIVE = 16, R_BUILD = 17, R_SEC_SPEC0 = 18 /* ..25 */, R_SEC_WALL = 26...`:

```text
 Date.now() vid skrivning, for lagmatt over tradar
```
Vid `R_FLAGCNT = 28`:

```text
 packade flaggräknare (se packFlagCounts): hur många gånger varje flagga rests t.o.m. detta record
```
Vid `R_SEC_BON = 29`:

```text
 NYA SEKTIONSSARDRAG (09-23): basonset-envelope (dB-flux 20-250 Hz, summa per hop)
```
Vid `R_SEC_BON = 29 /* NYA SEKTIONSSARDRAG (09-23): basonset-envelope (dB-flux 20-250 Hz, su...`:

```text
 basonset-toppar (librosa-lik toppplockning, antal)
```
Vid `R_SEC_FLUX = 31`:

```text
 helbandsflux (fluxNorm, summa)
```
Vid `R_SEC_FLUX = 31 /* helbandsflux (fluxNorm, summa) */, R_SEC_RMS4 = 32`:

```text
 summa rms^4 (dynamik inom blocket)
```
Vid `R_HIGH = 33`:

```text
 diskant-onset-ringens sampel (bara med <prefix>HIGH_DIAG/HIGH_VOTE)
```
Vid `R_BIGSEQ = 34`:

```text
 STORA VÄGEN: antal hop-record (stora ringen) skrivna före detta env-record - workern kör dem först
```
Vid `R_CLOCK = 35`:

```text
 EN KÄLLA (r0): klockans bpm (analysatorns enda tempo)
```
Vid `R_CLOCK = 35 /* EN KÄLLA (r0): klockans bpm (analysatorns enda tempo) */, R_CLOCK_CONF ...`:

```text
 klockans tillit
```

### F_SIL350, F_SIL10, F_RESET_TEMPO, F_HINT, F_RESET_BAR, F_VCLOCK_SET, F_VCLOCK_NULL

```text
Flaggor (bitmask i R_FLAGS)
```

### FLAG_MOD

```text
ROBUSTHET (2026-09-21 natt): om workern ligger > RING_N-RING_MARGIN records efter skrivs ringen över och records
TAPPAS. En flagga (t.ex. F_SIL10 = "släpp tempot") som låg i ett överskrivet record fick förr ingen konsekvens alls:
snabba sidan hade nollat lokalt, men nästa tillståndsblock (S_REC_SEQ ≥ barrierSeq) återställde tempot. Därför bär
varje record en PACKAD RÄKNARE per flagga (7 flaggor × 7 bitar = 49 bitar, exakt i en double): antal gånger flaggan
rests t.o.m. recordet, modulo 128. Workern jämför räknaren i recordet den återupptar vid med räknaren i det senast
behandlade och får exakt vilka flaggor som gått förlorade — utan någon kapplöpning mot skrivaren (allt ligger i
recordet, som seq:en). Modulo 128 räcker: ingen flagga kan resas 128 gånger på de ≤ 10 s ett tapp omfattar.
```

### lostFlags()

```text
 Bitmask över flaggor vars räknare skiljer mellan `before` och `after` (packade), minus flaggorna i `ownFlags`
 (recordet man återupptar vid behandlas ändå normalt, dess egna flaggor ska inte dubbleras).
```

### C_WRITE

```text
Kontrollord (Int32, Atomics)
```
På raden: antal skrivna records (monotont) — workern väntar på detta


### C_READ

På raden: antal lästa records


### C_STATE_SEQ

På raden: seqlock för tillståndsblocket (udda = skrivning pågår)


### C_WAITING

På raden: 1 = workern ligger i Atomics.wait (skrivaren notify:ar bara då)


### seqLow()

```text
SEQ-WRAP: C_WRITE/C_READ är Int32 och seq:en växer 100/s → 2^31 efter 248 dagar. Båda sidor räknar därför seq som
JS-tal (double, aldrig wrap) och lägger bara de låga 32 bitarna i kontrollordet (`seq | 0`). Läsaren rekonstruerar
ur en SIGNERAD 32-bitars skillnad mot sin egen seq, korrekt så länge avståndet är < 2^31 records (248 dagar efter
varandra — ringen är 1 024). Aldrig `Atomics.load(C_WRITE)` rakt mot en JS-seq: jämför med seqDelta().
```

### seqDelta()

```text
 Signerad skillnad (ctrlLow − mySeq) i records, wrap-säker.
```

### S_REC_SEQ, S_BPM, S_CONF, S_BPMF, S_PHASE_MS, S_PHASE_CONF, S_SECTION, S_SEC_START, S_SEC_INDEX, S_SEC_TIER, S_REP_SIM, S_REP_AGO, S_REP_SEC, S_PROCESSED, S_LAG_MS, S_LAG_MAX, S_BUSY_US, S_BUSY_MAX_US, S_SKIPPED, S_EXPECT_MS, S_EXPECT_SRC, S_PREV_SEC, S_LVL_HIGH, S_LOST_FLAGS, S_BUILD_AT, S_BUILD_SEEN

```text
Tillståndsblock (Float64)
```
Vid `S_LOST_FLAGS = 23`:

```text
 flaggor aterskapade ur raknarna efter tapp
```
Vid `S_LOST_FLAGS = 23 /* flaggor aterskapade ur raknarna efter tapp */, S_BUILD_AT = 24, S_...`:

```text
 uppbyggnadens start / senast sedd (frame.sectionBuildProg)
```

## SplitBuffers

### hop

På raden:  taktvägen


### spec

På raden:  stora vägen


## Toppnivå

### WorkerMsg

```text
 Meddelanden main ↔ worker (bara utanför driftvägen). `crash` finns ENBART bakom <prefix>SPLIT_TEST_CRASH=1 (stresstest).
```

### WorkerData

```text
 cfg ar en KOPIA (structured clone) fran workerns start: den langsamma sidan ser aldrig motorns senare andringar (cfg.beat,
 UI-andrade detection-varden). Las darfor aldrig cfg efter start i den langsamma sidan - behovs ett levande varde, skicka det i recorden
 (bankens inline-lage ger samma kopia, structuredClone, sedan 10-19).
```

## WorkerData

### buffers

På raden:  senast lästa record (full seq) — 0 vid första start


### resumeSeq

På raden:  bänkens synk-läge


### part

På raden:  två trådar med stora vägen: taktvägen resp. analysatorn (slowWorker.ts)


## Toppnivå

### stateWrite()

```text
 Skriv tillståndsblocket under seqlock (skrivaren är ensam: workern). `word` = seqlockens kontrollord (taktvägen: C_FEED_SEQ).
```

### stateRead()

```text
 Läs tillståndsblocket konsistent till `out` (kopia). false = fick ingen konsistent läsning (behåll förra).
```

### StateReader

```text
 stateRead med minne (a7): står seqlock-ordet kvar på samma jämna värde som vid förra lyckade läsningen har ingen skrivning
 börjat sedan dess, och `out` håller redan exakt det blocket - då hoppas kopian över. Annars som stateRead. Ett minne per `out`.
```

## StateReader

### w

På raden: ordet vid senaste lyckade läsningen (-1: ingen; udda värden matchar aldrig)


## Toppnivå

### syncWait()

```text
 SYNK-LÄGET (bara bänken, createAnalyser(cfg, 'sync')): den snabba sidan väntar tills workern publicerat (workern notify:ar `word`
 efter varje publicering) - den RIKTIGA workern i lås-steg med ljudet, så den kan jämföras hop för hop mot inline-läget.
```

### BIG_REC_LEN, BIG_RING_N, BIG_HOP_MAX

```text
── STORA VÄGEN (arena tvavagar a3, 2026-11-08): allt i analysatorns hop som inte är ljusets direkta signal ──────────────────────
Snabba vägen behåller 512-FFT:n, nivån/AGC:n, kicken, snabba banden (FAST_BANDS) och trumenveloperna. 2048-FFT:n med sina 8 band,
drop-detektorn (baskroppen), risern/buildUp, karaktärsprofilen, basgången och sektionsaggregatet körs i den långsamma tråden på
ett record PER HOP (hoppets 128 sampel + ~15 fakta från snabba sidan). Resultatet (dropCount, bodyDb, buildUp, profilen och
2048-spektrumet till låtgränsens sink) går tillbaka i ett eget tillståndsblock. I inline/synk-läget körs recordet inom samma
process() -> bit-identiskt; i realtid ligger de här fälten workerns fördröjning efter (p50 ~1 hop).
Bara med FAST_BANDS + SECTION_AGG 'hop' (DMX); annars kör snabba sidan allt som förr.
```

### C_BIG_WRITE, C_BIG_READ, C_BIG_SEQ, C_WAITING_B

Vid `export const C_BIG_WRITE = 8, C_BIG_READ = 9, C_BIG_SEQ = 10`:

```text
 stora vägens seqlock
```
Vid `export const C_BIG_WRITE = 8, C_BIG_READ = 9, C_BIG_SEQ = 10 /* stora vägens seqlock */...`:

```text
 analysatortråden väntar (två trådar, se slowWorker)
```

### BS_SEQ, BS_BODY, BS_DROPS, BS_MINI, BS_BUILD, BS_RISER, BS_PUNCH, BS_BASS, BS_BRIGHT, BS_BEAT, BS_BASSLINE, BS_SPEC_N, BS_SKIPPED, BS_CAND, BS_DEMOTED, BS_SPACED, BS_DROPRISE, BS_NEAR, BS_NEARDIP, BS_LIFT, BS_STOPS, BS_STOPSEC, BS_UNDER

Vid `BS_BASSLINE = 10, BS_SPEC_N = 11`:

```text
 antal 2048-spektra skrivna
EN DROPDETEKTOR + LYFT (a3): kandidaterna, minidrop-klasserna, flankens styrka, nästan-drop/lyft/stopp (VAD + styrka)
```
Vid `BS_UNDER = 22`:

```text
 dB baskroppen ligger under sitt tak (klockans break-håll)
```

### SPEC_SLOTS, SPEC_MAX

På raden: 16 spektra = 48 hop: en sen worker tappar inget till låtgränsens sink


### HOP_REC_LEN

```text
── TAKTVÄGEN (2026-11-08, ägaren: 'en analysator, två vägar - den snabba och den som ger dirigenten information') ─────────────
Systemets TAKTMATNING (DMX: src/beatFeed.ts, ~20 % av motorns CPU) körs i den långsamma tråden i stället för i hop-loopen.
I båda systemen när analysatorn är delad och BEAT_FEED inte är 'inline': DMX-motorn matar (hopLane.feed), lotus analysator matar själv (hopSelf).
Den snabba sidan skriver ett RECORD PER HOP (ramens ~10 fält taktmatningen läser + hoppets klocka) i en egen ring; workern kör
taktmatningen på recordet och publicerar resultatet (rutnätet, tilliten, analysatorns eget rutnät, kommandona resetTempo/resetBar)
i ett eget tillståndsblock med egen seqlock. Den snabba sidan lägger resultatet i motorns cfg/ram och utför kommandona på SIN
analysator (som förr - flaggorna går sedan i env-recorden som vanligt), så kommandoordningen är exakt den gamla i inline-läget.
Taktmatningen läser inget ur den långsamma analysatorn: de två körs oberoende i workern.
```

### HOP_RING_N

På raden: ~11 s vid 375 Hz


### H_SEQ, H_NOW, H_TS, H_BPM, H_CONF, H_ANCHOR, H_KICKAT, H_BARSHIFT, H_ON_KICK, H_ON_HIMID, H_ON_TREBLE, H_SA_SUB, H_SA_KICK, H_SA_BASS, H_BOUND, H_QUIET, H_SURE, H_UNDER

Vid `export const H_SEQ = 0, H_NOW = 1`:

```text
 Date.now() vid hoppet = taktmatningens klocka
```
Vid `export const H_SEQ = 0, H_NOW = 1 /* Date.now() vid hoppet = taktmatningens klocka */, ...`:

```text
 timeOrigin+performance.now(), fördröjningsmått
```
Vid `H_BPM = 3, H_CONF = 4, H_ANCHOR = 5, H_KICKAT = 6, H_BARSHIFT = 7, H_ON_KICK = 8, H_ON_...`:

```text
 a5: basgången (ettan)
```
Vid `H_BOUND = 14`:

```text
 låtgränsräknaren (an.trackBoundaries, a4 entempo)
```
Vid `H_BOUND = 14 /* låtgränsräknaren (an.trackBoundaries, a4 entempo) */, H_QUIET = 15`:

```text
 ms tystnad (an.quietMs, r0: klockans tystnadssignal)
```
Vid `H_SURE = 16`:

```text
 låtgränsen är säker 0/1 (an.boundSure, LÅTENS MINNE)
```
Vid `H_SURE = 16 /* låtgränsen är säker 0/1 (an.boundSure, LÅTENS MINNE) */, H_UNDER = 17`:

```text
 dB baskroppen ligger under sitt tak (an.bodyUnderDb, klockans break-håll)
```

### C_HOP_WRITE, C_HOP_READ, C_FEED_SEQ, C_WAKE

Vid `export const C_HOP_WRITE = 4, C_HOP_READ = 5, C_FEED_SEQ = 6`:

```text
 taktvägens seqlock
```
Vid `export const C_HOP_WRITE = 4, C_HOP_READ = 5, C_FEED_SEQ = 6 /* taktvägens seqlock */, ...`:

```text
 väckningsord: env- OCH hop-record (bara med taktvägen)
```

### FS_HOP_SEQ, FS_BEAT, FS_ANCHOR, FS_BPM, FS_BCONF, FS_BEATERR, FS_FCONF, FS_GRID, FS_GANCHOR, FS_GBPM, FS_GCONF, FS_RT_CNT, FS_RB_CNT, FS_PROCESSED, FS_LAG_MS, FS_LAG_MAX, FS_BUSY_US, FS_BUSY_MAX_US, FS_SKIPPED, FS_BARK

Vid `export const FS_HOP_SEQ = 0, FS_BEAT = 1`:

```text
 cfg.beat: 0 undefined, -1 null, 1 objekt
```
Vid `FS_BEATERR = 5`:

```text
 NaN = osatt
```
Vid `FS_BEATERR = 5 /* NaN = osatt */, FS_FCONF = 6`:

```text
 frame.bpmConfidence efter matningen, NaN = orörd
```
Vid `FS_BEATERR = 5 /* NaN = osatt */, FS_FCONF = 6 /* frame.bpmConfidence efter matningen, ...`:

```text
 analysatorns rutnät 0 null/1
```
Vid `FS_GANCHOR = 8, FS_GBPM = 9, FS_GCONF = 10, FS_RT_CNT = 11`:

```text
 resetTempo, räknare
```
Vid `FS_GANCHOR = 8, FS_GBPM = 9, FS_GCONF = 10, FS_RT_CNT = 11 /* resetTempo, räknare */, F...`:

```text
 resetBar, räknare
```
Vid `FS_BARK = 19`:

```text
 EN ETTA (klocka r0): klockans taktmodell har dömt en etta 0/1
```

### HopFrame

```text
 Det taktmatningen läser ur ramen, och det den skriver (cfg.beat/beatErr, frame.bpmConfidence, analysatorns rutnät/kommandon).
```

## HopTarget

### setClock

```text
 EN KÄLLA (r0): analysatorns tempo/tillit = klockans (cfg.beat efter matningen).
```

## Toppnivå

### HopFeed

```text
 Systemets taktmatning (DMX: BeatFeed). `now` = hoppets klocka (Date.now() när hoppet kom, inte när workern kör det).
```

## HopFeed

### update

På raden:  EN ETTA (r0): taktmodellen har en etta


## Toppnivå

### HopLaneFast

```text
 Taktvägen, snabba sidan (motorns tråd): skriv hoppet, hämta senaste resultatet och lägg det i motorns cfg/ram/analysator.
```

## HopLaneFast

### clockBpm

```text
 Klockans tempo/tillit efter senaste feed - analysatorn läser dem själv i början av nästa process() (a7r, ingen setClock utifrån).
```

### barKnown

```text
 EN ETTA (klocka r0): klockans taktmodell har dömt en etta (workerns senaste publicering).
```

### peer

```text
 inline-läget (bänken): den långsamma sidan körs synkront här.
```

### feed()

```text
 Ett hop (efter analysatorn, före effekterna - där motorn förr anropade taktmatningen).
```
Vid `r[o + H_SEQ] = seq;`:

```text
sist: seq = recordet ar komplett
```
Vid `if (Atomics.load(ctrl, C_WAITING) || Atomics.load(ctrl, C_WAITING_B)) Atomics.notify(ct...`:

```text
alla väntare (en eller två trådar)
```
Vid `const b = cfg.beat; f.bpm = b ? b.bpm : 0; f.bpmConfidence = b ? (b.confidence ?? 0) : ...`:

```text
EN KÄLLA (r0): ramen och analysatorn bär klockans tempo och tillit (0/0 utan klocka) - samma tal för ljuset, låtgränsen och sektionerna
```
Vid `const b = cfg.beat; f.bpm = b ? b.bpm : 0; f.bpmConfidence = b ? (b.confidence ?? 0) : ...`:

```text
a7r: analysatorn läser dem själv i nästa process()
EN TILLIT TILL DIRIGENTERNA (11-11): utjämnad i hoppets tid (trustStep, analyserClock.ts)
```

### apply()

Vid `if (!this.sr.read(ctrl, this.state, s, C_FEED_SEQ) || s[FS_HOP_SEQ] === 0) return;`:

```text
inget resultat an (eller mitt i skrivning: behall forra)
```

### stats()

```text
 Hälsa: hur långt efter taktvägen ligger (hop och ms), dess kostnad per hop, tappade hop.
```

## Toppnivå

### HopLaneSlow

```text
 Taktvägen, långsamma sidan (workern, eller inline i bänken): kör systemets taktmatning på varje hop-record, publicera resultatet.
```

## HopLaneSlow

### constructor

Vid `const sq = Atomics.load(this.ctrl, C_FEED_SEQ); if (sq & 1) Atomics.store(this.ctrl, C_...`:

```text
Omstart av workern: fortsatt i sekvensen och med raknarna (annars ser snabba sidan ett 'nytt' resetTempo); matningen borjar om.
```
Vid `const sq = Atomics.load(this.ctrl, C_FEED_SEQ); if (sq & 1) Atomics.store(this.ctrl, C_...`:

```text
dog mitt i skrivning
```

### drain()

```text
 Behandla alla hop-record sedan sist, publicera. Returnerar antal.
```

## Steg 18b (flytten 2026-11-22): fackens platser ur taggarna

Konstanterna `B_RMS` … `B_CONF`, `B_ENVBPM`, `BS_BODY` … `BS_BUILDSTART`, `S_PHASE_MS` … `S_BUILD_SEEN` och `R_CLOCK`/`R_CLOCK_CONF` finns inte längre:
platserna räknas fram ur fackens taggar (`B`, `BS`, `S`, `R` i `split.ts`, se `analyserFack.md`). Anteckningarna ovan om de gamla konstanterna är historik.
Kärnans egna platser (sekvens, längd, flaggor, telemetri) står kvar som konstanter, med nya nummer i `S_*` och `BS_*`.
