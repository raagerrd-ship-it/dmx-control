# analyser.ts - anteckningar

Kommentarerna som stod i koden fram till uppdelningen 2026-11-14, ordagrant, under den konstant, det fält eller den metod de hörde till.
Koden har bara en kort etikett kvar per deklaration. Nya anteckningar skrivs här, inte i koden.

## Filhuvudet

```text
ENAD ANALYSATOR (2026-09-24) — en fil, samma byte i lotus-light-link (pi/src/audio-analyser/) och
dmx-control (pi-dmx/engine/src/). Deploy-skripten i båda repona vägrar deploya om filen skiljer
sig från den gemensamma (md5, se ANALYSER_SHARED_MD5 i respektive deploy-skript).

SYSTEMSKILLNADER BARA VIA KONFIGURATION, aldrig via "vilket system är detta":
  - analyserProfile.ts (en fil per system, bredvid denna) ger env-prefixet och systemets
    standardvärden för de rattar där systemen i dag har olika standard.
  - Rattar med systemprefix läses som LOTUS_<X> eller DMX_<X> (eget prefix först, det andra som
    alias). Rattar utan prefix (BODY_RISE_DB, MINI_SPACING_MS ...) läses som de heter.
  - Utan env och med respektive profil beter sig analysatorn exakt som systemets analysator
    gjorde före sammanslagningen (bevisat hop för hop i paritetsbänken, tools/analyserParity.mjs).

Analysatorn läser ljud (process) och levererar Frame. Den vet inget om vad konsumenterna gör
med ljudet eller ramarna.
```

## Toppnivå

### BASS_SPAN_DB

```text
 frame.bassEnergy / bassEnergyShort: 0 = så många dB under taket (eller mer), 1 = vid taket. BRETT med avsikt - mätningen klipper
 så lite som möjligt; hur stor del av spannet ljuset använder väljer effektsidan (effects.ts B_SPAN_DB).
```

### import

På raden: ANALYSATORNS KLOCKA (a7r): tempogram, rutnät, etta, tillit


### ENV

```text
── RATTAR ─────────────────────────────────────────────────────────────────────────────────────
```

### env()

```text
 TEMPOKÄLLAN (EN KLOCKA FÖR BÅDA, klocka a8 11-09): klockan (analyserClock.ts) är analysatorns ENDA tempo, fas och tillit i BÅDA
 profilerna. Lotus egen sökning (computeBpm/scoreEnv/alignScore/shiftDetect) och gridfasen (computeGridPhase) är borttagna;
 profilen väljer bara VAR klockan körs (sys.BEAT_FEED 'slow' = taktvägen i workern, annars sist i process(), se clockMode).
 Ratt UTAN prefix (namnet som det star), sedan profilens standard.
```

### sysOn()

```text
 Sann om ratten ar satt till nagot icke-tomt (motsvarar `!!process.env.X`).
```

### HIGH_ON

```text
Rattar som lases i tatslingan (per hop) - lases EN gang vid modulladdning.
```

### SECTION_AGG

```text
 SEKTIONSBLOCKENS TAKT: 'env' = blocksummor per env-sampel (100 Hz; identiskt i odelad och delad analysator),
 'hop' = sectionHop per hop i odelad analysator, spektrum ur band-dB (aldre vagen).
```

### SECTION_SCORE_F32

```text
 Rangpoangens buffert i 32-bitars flyttal (aldre vagen) i stallet for 64.
```

### AnalyserDetection

```text
 Detektionsparametrar. Objektet LASES LOPANDE (varje hop) - vardarna kan andras under drift.
```

## AnalyserConfig

### sampleRate

```text
 Platt form (lotus):
```

### fftSize

```text
 Small-FFT size (default 512). Must match the hop rate the analyser is fed.
```

### silenceLevel

```text
 Släckgränsen på frame.level (motorns cfg.silenceLevel), standard SILENCE_LEVEL.
```

### maxGain

```text
 Upper clamp for analyser gain.
```

### onsetEnhancements

```text
 Enable log-compressed, adaptively whitened and normalized onset features.
```

### audio

```text
 Nastlad form (DMX-motorns config-objekt): audio.rate, fft.size/hop, detection (lases lopande) och beat
 (taktrastret, lases lopande - motorn skriver det). Ges `detection` anvands objektet sjalvt, inte en kopia.
```

### role

```text
 DELAD ANALYSATOR (split.ts): 'all' (standard, allt i en trad) | 'fast' (ljudvagen; tempo/sektion hamtas ur
 tillstandsblocket) | 'slow' (workern: matas ur SAB-ringen via drainRecords()). Kan aven ges som andra argument.
```

### resumeSeq

```text
 Seq att fortsatta fran (slow: senast LASTA record vid omstart av workern; fast: senast SKRIVNA).
 0/utelamnad = fran borjan. Full JS-seq (inte de 32 laga bitarna).
```

## Toppnivå

### SplitInit

```text
 DELAD ANALYSATOR (split.ts): rollen och de delade buffertarna, som andra argument till konstruktorn.
```

## SplitInit

### sync

```text
 Bänkens synk-läge (createAnalyser(cfg, 'sync')): snabba sidan väntar på workern, workern notify:ar efter publicering.
```

## Toppnivå

### Spectrum

```text
 Rikt log-spektrum (8 band) från den parallella 2048-FFT:n. Varje band är
 per-band AGC-normaliserat (0..1) så alla band nyttjar full range oavsett mix.
```

## Spectrum

### sub

På raden: ~20–60 Hz   — sub/808-rumble


### kick

På raden: ~60–120 Hz  — kick-grundton/kropp (nu SKILD från basen)


### bass

På raden: ~120–250 Hz — basgång/basnoter


### lowMid

På raden: ~250–500 Hz — låg kropp, toms, låg röst


### mid

På raden: ~0,5–1,2 kHz — röst, snare-kropp, synth


### highMid

På raden: ~1,2–3,5 kHz — snare-crack/presence (dedikerad backbeat-kanal)


### treble

På raden: ~3,5–10 kHz — hi-hats, cymbaler


### air

På raden: ~10–16 kHz  — luft/glitter


## Toppnivå

### SILENCE_LEVEL

```text
 Släckgränsens standard (motorns cfg.silenceLevel saknas).
```

### silentLevel()

```text
 Samma tystnadsbeslut som frame.silent för den som bara har nivån (BoundaryDetector matad av verktyg utan ramens flagga).
```

## Frame

### silent

```text
 TYSTNAD (a7): level <= släckgränsen (cfg.silenceLevel, EN tröskel, sätts live via setSilenceLevel). Läses av effekternas
 släck-/ingångsgrind och låtgränsens 3 s-tystnad - ingen konsument har egen nivågräns för "tyst".
```

### level

På raden: 0..1, auto-gained RMS (15ms attack / 400ms release smoothed)


### levelRaw

På raden: 0..1, samma auto-gain men OSMOOTHAT (rå per-hop)


### levelVU

På raden: 0..1, ~200ms symmetriskt smoothat PÅ HOP-TAKT (375Hz) — för VU-taket


### energy

```text
 (ser alla hops → mycket mindre brus än att smootha rå på 50Hz)
```
På raden: 0..1, bass-band spectral energy (~0–1.5 kHz)


### centroid

```text
mid/treble på 512-FFT:n är BORTA: ingen effekt läste dem — effektlagret
använder spec.mid/spec.treble ur 2048-FFT:ns oktavband, som är bättre
upplösta. Två EMA + två bandsummor per hop gick åt till ingenting.
```
På raden: 0..1, spektralt tyngdpunkt: mörk/bastung → 0, ljus/diskant → 1


### flux

På raden: 0..1, bass-band spectral flux


### kick

På raden: true on rising edge only


### gain

På raden: current auto-gain factor (debug)


### bpm

På raden: 0 = ej låst; lokal tempo-estimat via autokorrelation


### bpmConfidence

På raden: 0..1, hur tydlig vinnande takttoppen är (peak-to-mean)


### intensity

På raden: 0..1 SEKTIONSENERGI relativt låtens eget snitt (0.5 = snittet,


### dropCount

```text
 <0.34 breakdown, >0.78 drop/topp) — driver show-orkestreringen
 DROP-DETEKTION. dropCount är MONOTON: den ökar en gång per upptäckt drop, så
 en konsument på lägre takt (render 100Hz) kan jämföra mot sitt eget senaste
 värde och ALDRIG missa en flank (till skillnad från en enframs-boolean).
```
På raden: monoton räknare — +1 per drop


### miniDropCount

```text
 MINIDROP: mindre lyft (stigning MINI_RISE_DB efter kort svacka) som inte ar en full drop. Monoton. 0 nar MINI_SPACING_MS=0 (av).
```

### dropDemoted

```text
 EN DROPDETEKTOR (a3, 11-09: förr effects.ts flankStep bredvid dropStep). dropCount = full drop på FLANKEN (break + smäll, efter
 spärren SHOW_DROP_GAP_MS). Detektorns lägre steg är minidrops: dropDemoted = slam-kandidat utan egen flank (inom 2 s),
 dropSpaced = flank inom spärren. Båda räknas också i miniDropCount. dropRiseDb = senaste flankens stigning (styrka).
```

### nearDropDb

```text
 LYFT/NÄSTAN-DROP/STOPP (a3, förr effects.ts stepLifts): VAD (> 0 medan villkoret håller) + STYRKA (dB).
 nearDropDb = språnget från dippens botten (dipp nearDipDb under 8 s-normalen), liftDb = kroppen 0,6 s över lugnet 6..2 s sedan,
 stopCount = basstopp 0,6-3 s som kom tillbaka (monoton), stopS = dess längd. Reaktionen (refraktär, look, lyft) ligger i effekterna.
```

### inZone

På raden: nivån är i låtens topp-zon (ihållande tillstånd, hysteres)


### breaking

På raden: nivån är i en svacka/break (ihållande tillstånd)


### buildUp

```text
 UPPBYGGNAD (riser): 0..1 tension som ramsar upp mot en drop. Mjuk signal →
 sampling-säker. Show-REAKTIONERNA (strobe, swell) ligger i effekt-motorn.
```

### buildProg

```text
 UPPBYGGNADENS FÖRLOPP 0..1 (ägaren 11-12: 'Uppbyggnaden borde flyttas till långsamma analysatorn'; förr effects.ts buildProg):
 slag sedan sektionen blev 'build' / 32, räknat från uppbyggnadens START, och hålls över sektionsfladder kortare än 2 s.
 En mätning av hur långt uppbyggnaden gått - vad ljuset gör med den är effektens sak.
```

### profile

```text
 KARAKTÄRSPROFIL (~8s glidande) — vad SLAGS musik är detta? Dirigenten väljer
 effekt efter passform mot den här, inte bara efter energinivå.
   punch  = transienttäthet (fyra-på-golvet/trummigt ↔ svävande)
   bass   = låg-endens tyngd (sub+kick+bas mot resten)
   bright = klang uppåt (hi-hats/luft mot resten)
   beat   = hur tydlig takten är (BPM-konfidens)
```
På raden: bassline: TYDLIG BASGANG 0..1 (basnot-anslag per slag, ~1 s)


### beatAnchorMs

På raden: wall-clock ms för ett taktslag (fas)


### kickAtMs

```text
 >0 = ett trumslag är FÄRDIGMÄTT denna ruta: väggklocka för slagets flux-topp
 med sub-hop-precision (±1.3 ms). Kommer en hop EFTER frame.kick (parabeln
 behöver hoppet efter toppen) och är den enda tidsstämpel PLL:en får mäta
 fasfel mot — Date.now() vid rutans behandling bär ALSA-leveransens jitter.
```

### barShift

```text
 TAKTFAS: hur många slag ankaret ska flyttas FRAMÅT för att landa på ettan
 (0..3), eller -1 när fasen ännu är osäker. Motorn äger ankaret och applicerar.
```

### beatPhaseMs

```text
 GRIDFAS (09-20, opt-in LOTUS_GRID_PHASE=1): vaggklocka (ms) for ett NYLIGT TAKTSLAG enligt fasanalys pa basringen +
 helbandsringen vid last tempo, med halvslagstest och hysteres. 0 = ej beraknad/olast. Motorn kan folja den
 (LOTUS_PHASE_FOLLOW=1) i stallet for att lasa fasen pa forsta basta kick.
```

### beatPhaseConf

```text
 Gridfasens on/half-kvot (>1 = slagfasen starkare an halvslagsfasen; ~1 = tvetydig).
```

### beatTrust

```text
 TILLITEN TILL TAKTEN 0..1 (11-11): klockans tillit över grinden, nerdragen av fasfel, utjämnad (trustStep i analyserClock.ts).
 Dirigenternas grind i båda systemen - ingen motor räknar en egen.
```

### section

```text
 SEKTION (09-20, opt-in LOTUS_SECTION=1) - realtidens sektionstillstand relativt LATENS EGEN historik, for
 orkestrering (DMX-dirigenten, Lotus show): 'intro' | 'low' (vers/lugnt) | 'build' (uppbyggnad) | 'high' (refrang/drop)
 | 'break' (svacka efter topp). Ingen latkunskap kravs; refrangen kanns igen som upprepning (repeat*).
```

### sectionAgeMs

På raden: ms sedan sektionen borjade


### sectionIndex

På raden: antal 'high'-partier hittills i laten (refrang nr)


### sectionTier

På raden: 0 lag / 1 mellan / 2 hog (stabil niva-tier, hysteres 3 s)


### repeatSim

```text
 UPPREPNING: likhet (cosinus, 0..1) mellan de senaste 4 s och det mest lika partiet >= 16 s tillbaka i laten,
 och hur langt tillbaka det lag samt vilken sektion det hade. repeatSim >= 0,92 mot 'high' = refrangen ar tillbaka.
 Med LOTUS_SECTION_REPEAT (bit 1) ar avtrycket z-normerat och repeatSim typiskt 0,2-0,9 (troskel REPEAT_THR 0,7), se Analyser.REPEAT.
```

### expectHighInMs

```text
 SEKTIONSMINNE + FORUTSAGELSE (09-21, workern; agaren: "komma ihag hur laten lat for nagra sekunder sedan och forra sektionen").
 expectHighInMs: ms tills nasta 'high' vantas (-1 = ingen forutsagelse, 0 = vi ar i high). Tva kallor: (1) MINNE - en tidigare
 sektion med samma etikett foljdes av 'high' efter N takter (avrundat till 4) -> samma langd nu; (2) FRAS - energin stiger
 (secRiseRun >= 4 raka stigande block, LOTUS_PREDICT_RISE) -> nasta 4-taktsgrans i ett frasgitter forankrat i senaste high-starten
 (LOTUS_PREDICT_GRID/LAT); (3) SUG (opt-in LOTUS_PREDICT_DIP) - dyk i dB strax fore smallen -> high om 2 s. prevSection = forra sektionens etikett.
 levelVsHighDb = blockets dB mot senaste refrangens medel-dB (negativt = tystare an refrangen; 0 utan refrang) - latens EGEN
 referens for dynamiken. sectionBars = takter sedan sektionsstart (0 utan tempo).
```

### spec

```text
 Rikt spektrum + per-band onset (anslag) från dubbel-FFT:n (hög-upplöst).
```
På raden: per-band NIVÅ (AGC 0..1)


### specAbs

```text
 Absolut per-band magnitud före AGC, för Lotus ljusväg och bandandelar.
```

### bodyDb

```text
 BASKROPPEN I RA dB (negativt tal, medel av sub+kick+bas), utan AGC - drop-detektorns kropp.
```

### bassEnergy

```text
 BASENERGIN 0..1 (arenan basenergi 2026-11-11, EN mätning för båda systemen; förr DMX effects.ts bHi/bLo/eBass): basens NIVÅ
 (sub+kick i rå dB, vikt 0,25/0,75) mot ett TAK, som dB-skillnad över ett fast spann: 1 = vid taket, 0 = BE_SPAN_DB eller mer
 under det. Taket räknas med SLAGET SOM TIDSENHET (klockans tempo; utan klocka 500 ms). TVÅ SKALOR:
 bassEnergy = mot FRASEN (taket = de starkaste slagen, glöms på BE_TOP_BEATS slag: starka och svaga partier skiljs åt),
 bassEnergyShort = mot TAKTEN (glöms på BE_FAST_BEATS slag: varje slag mot sina närmaste grannar, ikapp två slag efter ett
 nivåbyte). bassEnergyShort >= bassEnergy. Bara dB-skillnader: oberoende av ingångsnivån; 0 när ramen är tyst. Ren mätning:
 ingen dal, ingen uttoning, ingen kurva - hur fort ljuset släpper efter ett slag (pulsens bredd), vilken skala det följer och
 dropläget ligger i effekterna. Se bassEnergyStep.
 bassLevel (0..1) = PARTIETS BASNIVÅ MOT LÅTENS REFERENS: frasens tak mot refrängens tak som amplitudkvot (6 dB under = 0,5),
 så som levelVsHighDb mäter hela nivån mot refrängen. I refrängen (section 'high') ÄR frasens tak referensen (1); i vers, break
 och uppbyggnad står referensen kvar som låtens minne (följer ett starkare tak direkt upp, glöms på BE_MEM_BEATS slag). Före
 låtens första refräng är referensen det starkaste partiet hittills. Hur mycket ett svagare parti ska dämpas väljer konsumenten.
```

### midHiDb

```text
 ABSOLUT mid+diskant-niva i dB (band 3-7, >250 Hz), RMS-kombinerad, ingen AGC.
```

### onset

På raden: per-band ONSET/anslag (halvvågs-flux mot adaptiv baslinje, 0..1)


### drum

```text
 TRUM-KIT-envelopes (0..1): peak-hold + decay PÅ HOP-TAKT (375Hz) → fångar
 varje anslag, aldrig missat mellan två render-frames. kick=diskret kick +
 snare=highMid-onset, hat=treble-onset, bass=spec.bass (nivå).
 OBS: kick drivs ENBART av den diskreta kick-detektorn. Den fylldes forut
 ocksa pa av onset.kick (bandOn[1]), men det bandet domineras av sustained
 bas — MATT 816-1377 anslag/min dar ~110 fanns, dvs 8x for manga.
```

## Toppnivå

### BODY_RISE_DB

```text
── DROP-DETEKTOR ──────────────────────────────────────────────────────────────────────────────
Kroppen ar RA dB -> alla grindar ar dB-SKILLNADER (gain-oberoende). underPeak-kvalitetsgrinden skiljer
riktiga slam (landar pa toppen) fran falska partiella aterhamtningar. Alla rattar inerta i standard.
```
På raden: 18+ halverar traffarna (matt)


### BODY_GONE_MIN_MS

På raden: breakdown-langd som kravs


### DROP_QUALITY_DB

```text
HARD KVALITETSGRIND vid fyrningen: underPeak (bodyPeak-bodyFast) ar BIMODAL - riktiga drops slar till full
niva (< 3 dB), falska ar partiella aterhamtningar kring 9-10 dB. Att kapa i gapet dodar de falska.
```

### DROP_RISE_LOW_DB

```text
DROP_RISE_MIN: stigningen mats mot MINIMUM av bodyFast senaste 0,5 s, inte mot punkten 0,5 s bakat. Mjuka
pop-drops har ett SUG (dipp 100-200 ms) fore dropen; med punkt-referensen nas kravet forst nar referensen
hamnar i dippen -> fyrningen landar 0,5 s sent = en takt vid 130 BPM ("drop en takt efter").
VILLKORAT STIGNINGSKRAV: landar kandidaten NARA TOPPEN (underPeak < DROP_RISE_LOW_Q) racker DROP_RISE_LOW_DB. 0 = av.
```

### DROP_UNDERPEAK_MIN

```text
LUGN-SEKTIONS-GRIND (opt-in <prefix>DROP_CALM_GATE=1): i lugna partier (sektion low/intro, eller >= DROP_CALM_DB under senaste
refrangen) kravs starkare bevis (riser, landning vid toppen eller extra lyft). DROP_CALM_LAND_MS > 0 -> kandidaten halls och fyrar
forst vid verifierad landning; 0 -> nekas.
```
På raden: se 'INTE I TAKET'


### MINI_SPACING_MS

```text
KICK-LAS (opt-in DROP_KICK_LOCK_MS > 0): kroppsvillkoret armerar, fyrningen sker pa forsta kicken darefter (tak DROP_KICK_LOCK_MS
eller en halv takt). DROP_KICK_LOCK_GRID=1: nasta rasterslag ar malet om gridfasen ar palitlig.
```
```text
MINIDROPS: egen losare lyft-detektor med eget avstand MINI_SPACING_MS. 0 = av.
```

### BODY_CEIL_DB_S

På raden: taket haller latens loud-referens lange


### DOUBLE_FROM_START

```text
 Instansfalt som MATT (--trace-generalization, 240 s pop-facit, 2026-09-27) byter Smi->Double efter start. Ges Double-form i
 konstruktorn (se slutet av constructor) sa kartan inte deprecerar mitt i driften. Fyra av dem stod har redan sedan 896ab7c.
```

### stabiliseNumbers()

```text
 TYPSTABILA TALFALT (2026-09-27, realtidsprincipen): skriv ett icke-heltal och sedan ursprungsvardet, sa V8 ger faltet
 Double-representation fran start. Ett Smi-initierat falt (0, -1 ...) som senare far ett decimaltal deprecerar objektets
 form, och TurboFan kastar all kod som lastes med den formen (matt: 'wrong map'-deopts av process() i stabilt lage).
```

## Analyser

### buffer

På raden: sliding FFT window


### prevMag

På raden: transformed magnitude from the previous hop


### onsetPeak

På raden: per-bin whitening peak history


### onsetPrev

På raden: previous raw magnitude for onset differencing


### windowed512

```text
--- Pre-allokerade scratchpads för 512-FFT + utdata (GC-skydd: process()
    allokerade ~7KB/hop → ~2.6 MB/s skräp @375Hz. Nu 0 alloc/hop). ---
```
På raden: fönstrad tidssignal (scratch)


### spectrum512

På raden: fft.js komplex-spektrum (scratch)


### mag512

På raden: magnitud denna hop (swap:as med prevMag)


### outDrum

På raden: trum-envelopes (återanvänt)


### outFrame

På raden: ETT återanvänt Frame (muteras/hop; säkert — main-tråden läser synkront)


### hatHit

```text
TRUM-KIT peak-hold-envelopes (håll mellan hops). Flyttade FRÅN effects.ts render
(100Hz) hit (375Hz) → fångar varje onset-topp. tau bevarade: hat 60ms / snare
110ms / kick 150ms. (Block 3 av arkitektur-refaktoreringen.)
```

### bandAbs

På raden: absolut per-band magnitud före AGC


### bandLvl

På raden: scratch: per-band nivå denna frame (~90ms smoothad)


### bandOn

På raden: scratch: per-band onset denna frame


### bigCounter

På raden: decimering av 2048-FFT:n (se BIG_EVERY)


### BIG_EVERY

På raden: kor stor-FFT var N:e hop → analysen ryms i realtid


### PEAK_DECAY

```text
 bandPeak-decay per stor-FFT (τ ≈ 3.8 s oavsett BIG_EVERY).
```

### FAST_BANDS

```text
 SNABBA BANDEN FÖR LJUSET (opt-in <prefix>FAST_BANDS=1, DMX-fyndet 10-21): ramens LJUSFÄLT - spec, specAbs, onset, drum.hat/
 snare/bass, midHiDb - räknas VARJE hop ur en snabb väg i stället för ur 2048-FFT:n (42,7 ms Hann, var 3:e hop: 21-27 ms efter
 ljudet). Sub/kick/bas (band 0-2) ur en IIR-filterbank i tidsdomänen (Butterworth HP+LP per band, effekten per hop utjämnad
 FB_TAU_MS), band 3-7 ur 512-FFT:n (94 Hz per bin räcker där). Egen uppsättning (fb*): 2048-vägens band räknas OFÖRÄNDRAT och
 matar allt som är analys eller drop - dropkroppen (bodyDb), sektionen, karaktärsprofilen, basgången, risern. Nivåerna är
 kalibrerade mot 2048-vägens bandmedel (FB_K) så dB-skalan är densamma; tidskonstanterna desamma (90 ms nivå, peak-decay ~3,8 s,
 onset-medianens steg, uppvärmning), räknade per hop. Mätt 10-21 (faltLatens, 2 filer): specAbs.kick 21 -> 5 ms, onset.kick 27 -> 5,
 onset.treble 21 -> 3 ms efter ljudet.
```

### fbMax

På raden:  Valfri avlyssnare på den stora magnituden (låtminnets fingeravtryck).


### ENV_LEN

```text
 Onset-ringens langd i sekunder x 100 Hz. Env LOTUS_TEMPO_ENV_S bara for korbanken (bench.mjs) - 5 s ar driftvardet.
```

### GRID_PHASE_OFFSET_MS

```text
 Fasval: 'sum' = bas+helband (standard), 'bass' = basringen forst, helbandet bara nar basen ar tvetydig (kvot < BASS_MIN). Korbank-A/B.
```
```text
 GRIDFASENS SYSTEMATISKA SLAP (2026-09-23, opt-in LOTUS_GRID_PHASE_TRIM=1). PC-referensen tre dygn i rad:
 gridets slap mot Beat This!-slagen 5,7 -> 9,9 -> 18,3 ms (median) medan KICKARNAS bias ar 0,0 ms
 (onset bias +0,1 ms, on-beat-recall 0,95). Felet sitter alltsa i fasmatningen, inte i kedjan: fasen mats
 pa envelope-ringen i 10 ms-hinkar (ENV_HZ) med max over +-1 sampel, vilket lagger estimatet en halv hink
 eller mer efter det verkliga anslaget. Kickarna ar sub-hop-forfinade (parabeltopp) och darmed obiaserade.
 TRIM: median av de senaste 8 on-beat-kickarnas offset mot RA gridfas, klampt till +-TRIM_MS, laggs pa
 frame.beatPhaseMs. Ingen aterkoppling: offseten mats alltid mot den ORORDA fasen, sa trimmen ar en
 absolut skattning och kan inte skena. Rors bara i den snabba vagen (worker/odelad ger samma varde).
 MATT 2026-09-23 (korbank, 145 banklatar, live-flaggor, foljar-emulering mot Beat This!-slagen):
   av:  offset-median +15 ms, |offset| 22 ms, puls on-beat 0,84, andel |offset| <= 30 ms 0,63
   pa:  offset-median +16 ms, |offset| 23 ms, puls on-beat 0,82, andel 0,60   (tempo 114/145 i bada)
 ALLTSA INGEN VINST - och det motbevisar premissen: hade kickarna legat 15 ms fore gridet hade trimmen
 dragit gridet dit. Att den inte ror sig betyder att kickarna ligger i SAMMA fas som gridet, dvs. hela
 onset-fronten (bade analysatorns kickar och PC-referensens onsets, dar biasen mattes till 0 ms) ligger
 ~15 ms efter ML-slagen. Det ar en KONSTANT i detektorn, inte ett fasfel att folja. Flaggan lamnas
 opt-in och AV som dokumentation av det negativa resultatet; nasta prov ar en konstant, inte en trim.
```
```text
 ONSET-FRONTENS KONSTANTA SLAP (2026-09-23, opt-in LOTUS_GRID_PHASE_OFFSET_MS, standard 0).
 Mattes fram av trimmens misslyckande (se ovan): gridet OCH kickarna ligger i samma fas, ~15 ms efter
 ML-slagen (Beat This!). Kedjan ljud->ljus (30 ms, mat med klapp + 240 fps) ar en ANNAN sak och
 kompenseras avsiktligt inte - det har ar ett matfel i sjalva detektorn: envelope-ringen ar 10 ms-hinkar
 och fasscoret tar max over +-1 sampel, vilket skjuter estimatet efter anslaget. Darfor dras en KONSTANT
 fran den utsanda gridfasen (positivt varde = rapportera slaget tidigare). Ingen inlarning, inget att
 skena med. Mats i banken som foljarens offset-median mot Beat This!-slagen.
```

### SECTION_CARRY

```text
── SEKTION (opt-in LOTUS_SECTION=1) ──────────────────────────────────────
 SEKTIONSLAGE: 'rank' (standard, 09-20 15:35) = kausal percentilrang av 4 s-fonstrets energi+anslagstathet mot alla block
 hittills i laten (samma matt som referens, sektionsreferensen, fast i realtid); 'tier' = gamla intensity-tiern (bank: 0,53 = slump).
```
```text
 SEKTIONEN NOLLAS VID LATBYTE (2026-09-23, opt-in LOTUS_SECTION_ON_HINT=1).
 MATT pa 128 latborjor fran kvallens lyssning: vid borjan av en NY lat sager sektionsetiketten 'low' i 77 %,
 'high' i 12 %, 'build' i 9 % - och 'intro' i 2 %. Sektionsindex vid ny lat: median 44, max 174. Sektions-
 maskineriet nollas namligen BARA vid 10 s tystnad eller full resetTempo, sa i en spellista rullar det vidare
 genom hela kvallen: rang-percentilerna jamfor nya laten mot FORRA latens block, `levelVsHighDb` mater mot
 forra latens refrang, och 'intro' (som drop-grinden hanger pa) kan aldrig intraffa efter forsta laten.
 Det ar samma klass av overhang som kommentaren i hintTrackChange redan dokumenterar for tempogrammet -
 och det ar orsaken till agarens "falska drops vid latbyte/intro/outro".
 Tempot ror vi INTE: hinten ar fortfarande mjuk dar, av de skal som star i hintTrackChange.
 BLOCK OVER LATGRANSEN (opt-in <prefix>SECTION_CARRY=N, 2026-10-14, DMX-fyndet 'intro 17 % av ladans tid'): hintTrackChange
 nollar sektionerna och etiketten star 'intro' tills 20 nya block finns - en FALSK latgrans ger 20 s intro mitt i refrangen.
 N > 0: de senaste N blocken (niva/tathet/klang) bars over nollningen, sa rangen fortsatter direkt. 0 = som forr.
```

### RANK_WIN

```text
 RANG-RATTAR (09-21, agent-sec1; offline-simulering av 12 hela latar + bank): referens rankar SEGMENTMEDEL, sa fonstret rankas mot
 alla 4 s-FONSTERMEDEL hittills (RANK_WIN=0 -> mot enskilda block som forr); kickvikt 0,5 (kicktatheten korrelerar 0,87 med dB men
 -0,05 med referensens onsettathet - den ar en nivaproxy, inte ett eget sardrag); centroid 0,5 (basta proxyn for referensens onsettathet,
 0,55); hysteres 0,15 kring trosklarna for den redan satta tiern; 3 raka block. Bank: high==high 0,51 -> 0,60, refrang-recall
 0,34 -> 0,73, falsk-high 0,58 -> 0,41, byten/lat 15 -> 7. Taket med referensens egna granser och dB ensamt ar ~0,64 (referensens
 onsettathet ar negativt korrelerad med dess dB, -0,23).
```

### RANK_RUN_IN

```text
 SNABB ATTACK (09-22, agent-sec5, matt REFRANG 2): LOTUS_SECTION_RUN_IN = antal raka block for att ga IN i tier 2 (high) fran en
 lagre tier (0 = som RANK_RUN). Ut ur high galler RANK_RUN som forr (asymmetrisk hysteres: refrangen ska synas direkt, slappa langsamt).
 LOTUS_SECTION_HOLD_BARS = N (0 = av): uppehallet i high (REPEAT bit 16/32) ersatts av TAKTSTRUKTUR - minst N takter fran high-starten,
 sedan slapps high bara pa en 4-taktsgrans (fas +-1 takt) nar rangen inte langre sager high.
```

### BODY_HIGH_MS

```text
 BASEN TILLBAKA = HIGH (2026-10-19, DMX-fyndet: 12/68 show-drops gick in i 'build' 2-8 s EFTER smallen): <prefix>SECTION_BODY_HIGH = ms
 kroppen (bodyEnv) maste ha varit borta (under taket - BODY_GONE_DB), 0 = av. Nar den kommer tillbaka och inom 2 s nar
 bodyPeak - SECTION_BODY_HIGH_DB raknas det som en drop for sektionen: 'high' direkt, forbi uppehallstiden.
```

### boundaryNov

```text
 Klangnyhet 0..1 per 1 s-block mot det langsamma referensavtrycket (se BOUNDARY_NOV). 0 = av/okand.
```

### secSpecHop

```text
 Bandens absoluta magnitud for sektionsblocket (SECTION_AGG 'hop') - scratch sa hop-vagen inte allokerar.
```

### secDump

```text
 Korbanks-dump (LOTUS_SECTION_DUMP=1): en rad per 1 s-block [tS, dB, kickar, centroid, bInt, breaking, dropped, spec0..7, tier, label] for offline-simulering av rangloggiken.
```

### secBuildSeen

På raden: uppbyggnadens start och senast sedd (ms, sektionens klocka) -> frame.buildProg


### expectHighMs

```text
Sektionsminne (se Frame.expectHighInMs): logg over avslutade sektioner + forutsagelse + referensniva
```

### REPEAT

```text
 UPPREPNINGSMINNE v2 (09-21, opt-in LOTUS_SECTION_REPEAT bitmask; bank agent-sec3). Det gamla avtrycket (11 positiva dim, cosinus)
 gav repeatSim 0,97-1,00 mot ALLT (bandandelar summerar till 1 - vinkeln ar alltid liten) och kunde inte anvandas i beslut.
 bit 1: nytt avtryck - 12 dim (8 bandandelar, centroid, kicktathet, intensitet, dB) per 2 s, Z-NORMERAT mot latens egen
        historik (alla lagrade avtryck) och SEKVENSMATCHAT (3 rutor = 6 s) mot alla lagen >= 16 s tillbaka. Det matchade
        partiet OMRANKAS med dagens kunskap (dess dB/kicktathet mot hela blockfordelningen) -> repeatTier, och tiden for
        forsta high-blocket efter det matchade partiet + lag -> repeatHighAtMs ("det forflutna spelas upp igen med lag L").
 bit 2: etikettregel HIGH - liknar nuet (sim >= REPEAT_THR) ett parti som nu rankas high och nuet inte ar tydligt lagt -> 'high'.
 bit 4: forutsagelse via lag (predictHigh, hogsta prioritet).   bit 8: etikettregel LOW (matchat parti rankas low -> ej 'high').
 bit 16: uppehall i high = langsta omrankade high-korningen hittills (tak 40 s); bit 32: prior 8 takter; bit 64: intrade i high nar
 det forflutnas high-start + lag ar NU; bit 128: utgang ur high nar det forflutnas high-slut + lag ar NU (och hall tills dess).
 BANK 09-21 (12 hela latar, 22 refrangstarter; gransfel / high==high / recall / falsk-high; forutsedd, lead, falska/min):
   baslinje (0):        0,32 / 0,51 / 0,34 / 0,58;  8/22, 11,9 s, 6,0
   REKOMMENDERAD 117:   0,23 / 0,57 / 0,61 / 0,45;  9/22, 11,2 s, 5,2   (W 2; bit 2 gav inget utover 64, bit 8 sankte recall 0,54->0,47)
   245 (= 117 + 128):   0,29 / 0,57 / 0,56 / 0,48; 10/22, 11,2 s, 5,2
 Obs: repeatSim byter betydelse med bit 1 (cosinus av z-vektorer, -1..1, typiskt 0,2-0,9; gamla 0,92-troskeln galler inte).
 bit 256/512: KLANGMALL (09-22), se TEMPL_*. Varfor bit 2 inte gav nagot: avtryck var 2 s + sekvens 2 rutor = nuet syns forst
 4-6 s in i refrangen, dessutom kravs st >= 1 (rangens 3-blocks-hysteres) och att det MATCHADE partiet omrankas high (dB+kickar,
 percentil >= 0,67 - i platt country ligger refrangen ofta under). Nar bit 64 (lag-intrade) traffar ar bit 2 overflodig; annars for sen.
```

### repeatTier

```text
 Klangmallens likhet for senaste blocket: mot refrangmallen / mot icke-refrangmallen (-1..1; 0 utan mall), antal mallblock. Bank-telemetri.
 Matchat parti: tier med dagens rankning (-1 = inget), och nar 'high' vantas om det forflutna upprepas (absolut tid, 0 = ingen).
```

### dbgPhase

```text
 Korbanks-telemetri for gridfasen: vald fas mot motfas per band.
```

### dbgSecBlock

```text
 Korbanks-krok: ett anrop per sektionsblock (1 s) med blockets varden (null i drift, ingen kostnad).
```

### role

```text
── DELAD ANALYSATOR (split.ts) ─────────────────────────────────────────────────────────────
```

### stateRd

På raden: a7: kopian bara när blocket ändrats


### recSeq

På raden: fast: senast skrivna record; slow: senast lasta. JS-tal, wrap-sakert (split.ts seqDelta)


### barrierSeq

På raden: fast: tillstand aldre an detta record ignoreras (en flagga ar pa vag)


### flagCnt

På raden: fast: antal ganger varje flagga rests (packas i R_FLAGCNT, se split.ts)


### slowLastCnt

På raden: slow: R_FLAGCNT i senast behandlade record (-1 = okant, t.ex. direkt efter omstart)


### slowGap

På raden: slow: records tappade sedan senast behandlade -> kontrollera forlorade flaggor


### slowLostFlags

På raden: slow: antal flaggor som aterskapats ur raknarna efter tapp (statistik)


### splitRestarts

På raden: fast: antal omstarter av workern (satts av index.ts)


### hopLane

```text
 TAKTVÄGEN (split.ts): klockan i den långsamma tråden. null = ingen (odelad analysator eller BEAT_FEED 'inline').
```

### hopSelf

```text
 EN KLOCKA (klocka a8): analysatorn matar SJÄLV sin taktväg sist i process() - profilen utan BEAT_FEED (lotus), vars motor inte
 anropar hopLane.feed. DMX (BEAT_FEED 'slow') matar från index.ts som förr. Samma klocka, samma tråd (workern), bara vem som matar.
```

### syncWorker

På raden: fast: vänta på workern efter varje record; slow: notify efter publicering (bänkens synk-läge)


### hRms

```text
 HOPPETS VÄRDEN (2026-10-17, skräpjakten): decimaltal som skickas som argument till, eller returneras från, en metod som V8 inte
 inlinar blir ett nytt HeapNumber per anrop (process 47 -> 6 kB/s skräp när de gick via fält). De heta stegen läser därför hoppets
 värden ur fält som process() skriver. Alla initieras som decimaltal (0,5) så fälten har Double-form från start.
```

### bigOn

```text
 STORA VÄGEN (split.ts, a3): 2048-FFT, drop, riser, profil, basgång och sektionsaggregat i långsamma tråden, ett record per hop.
 fast: skriver recordet och läser tillbaka; slow: kör stegen. Bara med FAST_BANDS + SECTION_AGG 'hop' och split-buffertarna.
```

### dSec

```text
 Snabba sidans syn på långsamma värden vid hoppet (drop/profil/basgång läser dessa i stället för de levande fälten).
```

### bigYield

```text
 PI:NS VERKLIGHET (a3r): EN worker-tråd (motorn är låst till 2 kärnor). Anropas efter varje behandlat env- och hop-record, så
 taktvägen (det motorn läser varje hop) körs mellan dem och aldrig köar bakom en hel 2048-backlog. null i bänkens inline/synk-läge
 (taktvägen är oberoende av analysatorn, så ordningen påverkar inga värden).
```

### KICK_COOLDOWN_MS

```text
 0 = tempoanpassad: max(170, 0,6 slag) nar tempot ar kant, annars 170 ms.
```

### dbgKick

```text
 Korbank: tempogrammets argmax-lag och sokfonster i senaste anropet.
```

### tempoShifts

```text
 Telemetri: antal tempovaxlingar (TEMPO_SHIFT).
```

### evidenceRelocks

```text
 Antal evidensomlasningar (telemetri/korbank) + lasets senaste slagpoang.
```

### evidenceScore

```text
 Senaste evidensvalets telemetri: vald kandidats slagpoang, halvslagskvot, antal kandidater, tvaans poang.
```

### rawBpmLast

```text
 Senaste RA-estimatet (vikt till 80..160) fore las/median - for korbanken.
```

### debugCandidates()

```text
 Korbank: kandidaterna fran senaste evidensvalet.
```

### REFRAC_N

På raden: 200 ms @ ENV_HZ 100


### dtHop

```text
Förberäknade EMA-alfor / decay-faktorer (fasta dtHop + fasta tidskonstanter).
```

### envBassRing

```text
 BASBANDETS onset-envelope (kick-flux), samma raster och position som envRing.
```

### tempoGram

```text
 Ackumulerat tempogram (EMA av hela lag-kurvan mellan anrop).
```

### hGated

På raden: brusgrinden för hoppet (process)


### setSilenceLevel()

```text
 Släckgränsen live (index.ts, /setup-ratten cfg.silenceLevel).
```

### lagBounds

```text
 Tempogrammets lagfonster i senaste anropet (diagnostik).
```

### REFRAC_ATT

På raden: env-ringens refraktar: 0 = nolla sampel efter stort anslag


### blAccum

```text
 TYDLIG BASGANG: basNOTER (bandLvl[1]+bandLvl[2], 60-250 Hz) mellan kickarna pa env-rastret; en topp ar en not om den
 reser sig >= 25 % av senaste topphojd over dalen och inte ligger inom 60 ms efter en kick. Noter per slag (2 s fonster)
 -> profile.bassline 0..1, glattat ~1 s.
```

### envHighRing

```text
DIAGNOSTIK (<prefix>HIGH_DIAG / HIGH_VOTE): diskant-onset-ring (bandOn[6]/[7]) - mater om diskanten bar tempot.
```

### kfPrev

```text
#2 sub-hop fas: kick-flankens flux-topp ligger sällan exakt på en hop. Vi
sparar de två föregående kick-flux-värdena och gör parabolisk interpolation
hoppet EFTER en kick → förfinar beatAnchorMs med ±0.5 hop (~1.3ms). Ren
fas-korrektion; själva kick-blixten fyrar oförändrat direkt.
```

### pendingKickMs

På raden: >0 = kick väntar på fas-förfining nästa hop


### lvlSmooth

```text
Attack/release-smoothed outputs — raw per-hop values update ~370x/s and
read as flicker on the lamps. Fast attack keeps hits punchy; the slower
release lets light glide down instead of sputtering.
```

### activeMs

På raden: hur länge musik spelat (warmup för baslinjen)


### levelCeil

```text
DROP-DETEKTION (flyttad från effects: analys hör hemma här; show-reaktionen stannar där)
```
På raden: långsamt nivå-tak (låtens loud-topp)


### bandDbRaw

På raden: RA dB per band (drop-detektorns kropp) — synk fran DMX-master 2026-09-03


### buildUp

På raden: 0..1 uppbyggnads-envelope


### lvlVU

På raden: ~200ms hop-takt-smooth av levelRaw → VU-taket (låg jitter)


### resetGain()

```text
 Called when the input routing changes — the old gain is meaningless for
 the new source's signal level, so re-converge from neutral.
```
Vid `this.gain = Math.max(0.5, Math.min(20, startGain));`:

```text
Seed per input: line (aux) arrives hot -> 1x; the room mic is weak -> ~20x.
```
Vid `this.envelope = this.cfg.detection.autoGainTarget;`:

```text
NEUTRALT ÄR autoGainTarget, INTE 0: AGC:n räknar desired = target/max(1e-4, env),
så env = 0 ger ett enormt tal som slår gainen i 20x-taket innan envelopen
konvergerat — en hörbar ljuspump vid varje ingångsbyte.
```

### setGainLock()

```text
 Lock the AGC (aux: fixed 1x, level tracks the mixer directly) or let it run.
```

### flagSlow()

```text
── DELAD ANALYSATOR: snabba sidan ────────────────────────────────────────────────────────────
```

### pushSlowRecord()

```text
 Ett record per env-sampel (100 Hz) till workern: ringvardena, flaggorna sedan forra recordet, sektionens blocksummor.
```
Vid `if (SECTION_AGG_HOP) { r[o + R_DROPS] = g.drops; r[o + R_ACTIVE] = g.active; r[o + R_BU...`:

```text
SECTION_AGG 'hop': fakta fran sista aggregerade hoppet (som sectionHop sag dem i odelat lage); 'env': vid skrivningen.
```
Vid `r[o + R_CLOCK] = this.localBpm; r[o + R_CLOCK_CONF] = this.localBpmConfidence;`:

```text
EN KÄLLA (r0): klockans tempo/tillit till långsamma sidan
```
Vid `r[o + R_BIGSEQ] = this.bigSeq;`:

```text
stora vägen: hop-record före detta (workern kör dem först)
```
Vid `r[o + R_SEQ] = seq;`:

```text
sist: seq = recordet ar komplett
```
Vid `Atomics.store(ctrl, C_WRITE, seqLow(seq));`:

```text
laga 32 bitarna; workern rekonstruerar via seqDelta (wrap-sakert)
```
Vid `if (this.bigOn) {`:

```text
stora vägen: analysatortråden väntar på C_WAKE (C_WAITING_B); med taktväg väcker feed() i samma hop
```
Vid `} else if (!this.hopLane) { if (Atomics.load(ctrl, C_WAITING)) Atomics.notify(ctrl, C_W...`:

```text
Dekker: workern satter C_WAITING fore wait-jamforelsen
a7: MED taktvägen väntar workern bara på C_WAKE - en notify på C_WRITE vore ett anrop i onödan.
```
Vid `else { Atomics.add(ctrl, C_WAKE, 1); if (Atomics.load(ctrl, C_WAITING)) Atomics.notify(...`:

```text
taktvägen: workern väntar på C_WAKE
```
Vid `if (this.inlinePeer) { this.inlinePeer.drainRecords(); this.pullSlowState(); }`:

```text
inline-lage (korbank): synkront har, tillstandet hamtas direkt
```

### pullSlowState()

```text
 Hamta tempo/gridfas/sektion ur tillstandsblocket (varje hop, ~20 doubles). Aldre an barrierSeq ignoreras.
```
Vid `this.beatPhaseMs = s[S_PHASE_MS]; this.beatPhaseConf = s[S_PHASE_CONF];`:

```text
(EN KÄLLA, r0: med klockan sätts localBpm/localBpmConfidence via setClock - inte av långsamma sidans tillstånd; lotus väg: som förr)
```

### getSplitStats()

```text
 Halsa for /api/live: hur langt efter workern ligger (records och ms), dess kostnad per record, tappade records.
```

### fastWriteSeq()

```text
 fast: senast skrivna record (full seq) resp. senast LASTA enligt workern (C_READ, wrap-sakert) — for omstart av workern.
```

### slowReadSeq()

```text
── DELAD ANALYSATOR: langsamma sidan (workern / inline) ─────────────────────────────────────
```

### drainRecords()

```text
 Behandla alla records som skrivits sedan sist, publicera tillstandet. Returnerar antal.
```
Vid `const w = this.recSeq + seqDelta(Atomics.load(ctrl, C_WRITE), this.recSeq); let n = 0;`:

```text
full seq ur 32 laga bitar (wrap-sakert)
```
Vid `if (w - this.recSeq > RING_N - RING_MARGIN) { this.slowSkipped += (w - this.recSeq) - (...`:

```text
ringen hann skrivas over
```
Vid `if (this.slowLastCnt >= 0) {`:

```text
Records tappade sedan senast behandlade: flaggor som lag i dem far inte forsvinna utan konsekvens (split.ts).
Vardena (hint-fonster, virtuell klocka) ar borta -> standard 5000 ms resp. recordets egen tid.
```
Vid `if (this.bigOn) this.drainBig(r[o + R_BIGSEQ]);`:

```text
stora vägen: hoppen före recordet först (sektionsaggregatet, drop-räknaren)
```

### pushBig()

```text
── STORA VÄGEN (split.ts) ────────────────────────────────────────────────────────────────────
 fast: hoppets record (sampel + snabba sidans fakta) till långsamma tråden; hämta drop/riser/profil/kropp/spektrum tillbaka.
```
Vid `r[o + B_SEQ] = seq;`:

```text
sist: recordet ar komplett
```
Vid `if ((this.syncWorker || !this.hopLane) && (Atomics.load(ctrl, C_WAITING) || Atomics.loa...`:

```text
Väckning: taktvägens feed() följer i samma hop och väcker workern - här bara i synk-läget eller utan taktväg.
```

### drainBig()

```text
 slow: behandla hop-recorden t.o.m. `limit` (full seq) i exakt snabba sidans gamla ordning, publicera.
```
Vid `{ const bl = this.bandLvl[1] + this.bandLvl[2]; if (bl > this.blAccum) this.blAccum = b...`:

```text
basgången (process(): ackumulatorn med förra 2048-bandens nivå och förra hoppets kick, sedan env-sampelns steg)
```

### bigIdle()

```text
 slow: alla hop-record lästa? (workerns sömnvillkor)
```

### bigAgg()

```text
 slow: sektionens hopaggregat (som snabba sidans SECTION_AGG 'hop'-gren förr, samma summeringsordning).
```
Vid `const sp = this.secSpecHop;`:

```text
bandDbRaw ändras bara i bigStep (var 3:e hop): räkna om då, samma värden
```

### applyFlags()

```text
 Snabba sidans kommandon i exakt den ordning de restes (virtuell klocka forst: den nollar ankare som resten skriver).
```

### slowStep()

```text
 Ett record = ett env-sampel: flaggor i ordning, ringvardena, snabba sidans fakta, sektionsblocket.
```
Vid `this.virtualMs = r[o + R_PERF]; this.virtualOn = true;`:

```text
perfNow() = snabba tradens tid vid sampeln (deterministiskt)
```
Vid `this.localBpm = r[o + R_CLOCK], this.localBpmConfidence = r[o + R_CLOCK_CONF];`:

```text
EN KÄLLA (r0): klockans tempo, inte en egen sökning
```
Vid `if (this.bigOn) {`:

```text
stora vägen: sektionens fakta och blocksummor ur den egna hopvägen (hoppen före recordet är redan körda)
```

### traceT()

```text
 Sparets tid (s sedan den virtuella epoken; diagnostik, bara med sparflaggor).
```

### resetTempo()

```text
 Nollställ analysatorns kopia av klockans tempo (verktygens krok; klockan anropar den aldrig).
```

### trackBoundaries

```text
 LÅTGRÄNSEN (a4 entempo): antal låtgränser (boundaryDetector -> hintTrackChange). Klockan läser den per hop (hop-recordet H_BOUND) -
 det är klockans ENDA signal om låtbyte.
```

### boundSure

```text
 LÅTGRÄNSEN ÄR SÄKER (LÅTENS MINNE i klockan): värden sätter den när låtgränsen kommer utifrån och spåret är EN låt (lotus: Sonos-spår,
 inte mix/radio/tv). Då är allt mellan två låtgränser samma låt. Osatt (DMX: gränsdetektorn missar byten) = av. Hop-recordet H_SURE.
```

### bodyUnderDb

```text
 BASKROPPEN UNDER TAKET (klockans break-håll): hur många dB dropdetektorns baskropp (bodyEnv) ligger under sitt tak (bodyCeil) just nu.
 0 = på taket; ett riktigt break tar bort basen nästan helt, ett låtbyte några dB. Hop-recordet H_UNDER.
```

### quietMs

```text
 Tystnad i ms (klockans tystnadssignal, hop-recordet H_QUIET; > 10 s släpper klockan som förr F_SIL10 släppte tempot).
```

### setClock()

```text
 EN KÄLLA (r0 entempo): analysatorns ENDA tempo och tillit = klockans (taktvägen i analysatorns långsamma väg, efter varje hop).
 Läses av kickspärren/-grinden (via rutnätet), sectionBars, basgången, sektionernas långsamma sida (env-recordet R_CLOCK) och ramen.
```

### hintTrackChange()

Vid `if (sections) {`:

```text
NY LAT = NY STRUKTUR. Tempot ar klockans sak (H_BOUND), men sektionshistoriken tillhor forra laten och maste bort:
annars rangordnas nya laten mot gamla block och 'intro' intraffar aldrig. sectionReset() ar samma nollning
som 10 s tystnad redan gor - enda skillnaden ar att vi nu ocksa litar pa latbytes-signalen.
```

### resetBar()

```text
 Taktfasen är applicerad av motorn (ankaret flyttat) → börja om räkningen.
```

### lastT

```text
0 = "ej satt". Får INTE seedas med performance.now(): vid virtuell klocka
(perfNow → virtualMs, startar nära 0) blir första dt negativ → exp(+stort)
→ NaN i envelope/gain, och NaN passerar båda clamparna nedan.
```

### sumSq

```text
 Löpande kvadratsumma över `buffer` (glidande RMS) + räknare för full omräkning.
```

### virtualMs

```text
 VIRTUELL KLOCKA. Analysatorns dtHop är sampelbaserad, men fyra beslut läser
 väggklockan — drop-spärren ("8 takter sedan förra"), svackans ålder, riserns
 ålder. Spelar man upp ljud snabbare än realtid hinner åtta takter
 gå på några millisekunder och hela strukturlogiken kollapsar.

 Med en injicerbar klocka blir analysatorn DETERMINISTISK: samma ljud in ger
 samma bildrutor ut, oavsett hur fort man matar den. Det är förutsättningen
 för en regressionsbänk — och för att kunna välja tröskelvärden mot tjugo
 låtar i stället för mot en. Live är beteendet oförändrat (null = riktig tid).
TYPSTABIL (2026-09-27, realtidsprincipen): aldrig null<->tal i ett falt som lases varje hop - det deprecerar
instansens map och kastar TurboFan-koden. virtualOn ar vaxeln, virtualMs alltid ett tal (NaN nar av).
```

### setVirtualClock()

```text
 Driv analysatorn på en virtuell klocka (offline-uppspelning). Anropas med
 ackumulerad ljudtid i ms före varje process(). null = tillbaka till realtid.
VIRTUELL KLOCKA FOR OFFLINE-BANKEN.

Alla klockankare maste nollstallas, annars laser detektorerna sig. Uppmatt
mekanism: efter en live-korning ar `lastKick` ~1e6 medan `now` startar om
pa ~0, sa `now - lastKick` blir NEGATIVT → cooldown-villkoret blir aldrig
sant → ingen kick fyrar nagonsin igen, och eftersom `lastKick` bara skrivs
NAR en kick fyrar ar lasningen permanent. Samma falla gallde flera andra
ankare. Att bara satta `virtualMs` racker alltsa inte.
```
Vid `const prev = this.virtualMs;`:

```text
LAGESBYTE bara vid ett HOPP (forsta anropet, bakat, eller > 1 s framat): en bank som anropar per hop med
ljudtiden far bara klockan flyttad (som advanceVirtualClock) - ankarna nollas inte varje hop.
```

### advanceVirtualClock()

```text
 KORBANK (09-20): flytta bara den virtuella klockan, utan att nolla nagra ankare. setVirtualClock() ar ett
 LAGESBYTE (nollar lastT/lastKick/pendingKickMs/lastVoteMs...) och far bara anropas en gang - anropad per hop
 fros AGC:n (dt=0), kickar forfinades aldrig (0 kickar) och rosterna foll varje anrop.
```

### audioClockMs

```text
LJUDKLOCKAN — ms sedan start raknat ur ANTALET BEARBETADE SAMPEL, satt av
matningen strax fore varje process(). -1 = inte satt (aldre anropare).

VARFOR: slagtiden (`beatAnchorMs` -> `kickAtMs`) forfinas sub-hop med en
parabel och PLL:en litar pa den som "+-1,3 ms". Men stampeln som parabeln
forfinar RELATIVT var `Date.now()` vid den hop som sag slaget — alltsa
exakt den ALSA-leveransjitter PLL-kommentaren tror sig ha undvikit.
Perioden ar 5,3 ms, callbacks kommer i klumpar om 1-3 hop, plus
handelseloopens fordrojning: verklig fasnoise +-5-8 ms per slag, och
systematiskt sen. Sub-hop-precisionen var alltsa illusorisk.

Ljudklockan bar ingen leveransjitter alls. Den mappas till vaggtid via en
LANGSAMT filtrerad offset, sa PLL:ens vaggklocke-ram behalls men jittret
forsvinner. Det tar ocksa bort analyslatensen ur fasen: slaget stamplas
nar det VAR i ljudet, inte nar det rapporterades.
```

### setAudioClockMs()

Vid `if (Math.abs(raw - this.audioToWallOffset) > 250) { this.audioToWallOffset = raw; retur...`:

```text
DISKONTINUITET (mic-omstart, stall): ljudklockan star still medan
vaggklockan gar, och en EMA med tau ~5 s skulle lamna slagen felstamplade i
sekunder. Ett hopp storre an ett taktslag ar aldrig drift — sa om direkt.
```
Vid `this.audioToWallOffset += (raw - this.audioToWallOffset) * 0.0005;`:

```text
Tidskonstant ~5 s vid 375 Hz: foljer klockdrift, slatar ut leveransjitter.
```

### clearAudioClock()

```text
 Tillbaka till Date.now(). Nasta setAudioClockMs sar om offseten.
```

### beatSrc

```text
 Taktrastret (kick-grind + taktfas). Nastlad konfig: motorns eget objekt (lases lopande); platt: internt, via setBeatGrid.
```

### setBeatGrid()

```text
 EN KLOCKA: rutnätet utifrån (lotus PLL via setAnalyserBeatGrid, bänkens BENCH_GRID) är INGEN rutnätskälla - kickgrinden läser
 klockans inre rutnät (setClockGrid). Det sparas bara som REFERENS för slagindexet i frame.barShift (EN ETTA, publishPhase):
 klockans etta uttryckt i systemets eget rutnäts index.
```

### setClockGrid()

```text
 Klockans inre rutnät (analyserClock.update / taktvägen HopLaneFast) - analysatorns enda rutnät.
```

### constructor

Vid `this.recSeq = splitIn?.resumeSeq ?? cfgIn.resumeSeq ?? 0;`:

```text
resumeSeq (full JS-seq) fran index.ts: slow = senast lasta record (omstart av workern fortsatter dar den dog,
drainRecords klipper backloggen till RING_N-RING_MARGIN); C_READ ar bara 32 laga bitar och duger inte ensamt.
```
Vid `this.slowGap = true;`:

```text
forsta recordet: okand forhistoria -> raknarna tas som utgangspunkt
Seqlock-paritet: dog forra workern MITT I stateWrite (terminate/OOM) star C_STATE_SEQ udda for alltid och varje
stateRead pa snabba sidan misslyckas — aven mot den nya workern (som skulle skriva udda→jamn→udda). En skribent
i taget, sa det ar sakert att jamna till har.
```
Vid `if (this.role === 'slow') {`:

```text
omstart av workern: fortsätt i sekvensen, med räknarna (en drop-räknare som hoppar bakåt vore en ny 'drop')
```
Vid `detection: cfgIn.detection ?? {`:

```text
Nastlad form: motorns detection-objekt anvands sjalvt (UI:t kan andra AGC-rattarna under drift).
```
Vid `const BIG = 2048;`:

```text
Dubbel-FFT: 2048 för hög låg-uppl. Egen buffert, matas samma hop-chunks.
```
Vid `this.bands.bandPeak[b] = 1e-4;`:

```text
seed → själv-kalibrerar inom ~1s
```
Vid `if (Analyser.FAST_BANDS) {`:

```text
snabba banden: 512-binnar för band 3-7, biquads för band 0-2 (RBJ, Q 0,707)
```
Vid `if (s === 0) { C[o] = (1 + c) / 2 / a0; C[o + 1] = -(1 + c) / a0; C[o + 2] = (1 + c) / ...`:

```text
HP vid bandets nedre kant
```
Vid `else { C[o] = (1 - c) / 2 / a0; C[o + 1] = (1 - c) / a0; C[o + 2] = (1 - c) / 2 / a0; }`:

```text
LP vid övre kanten
```
Vid `const dtHop = cfg.fft.hop / cfg.audio.rate;`:

```text
FÖRBERÄKNADE EMA-ALFOR. dtHop och alla tidskonstanter är fasta, så de 11
Math.exp()-anropen per hop (~4000/s vid 375 Hz) hörde inte hemma i tick-vägen.
```
Vid `this.outFrame = {`:

```text
Ett återanvänt Frame (spec/onset pekar på de pre-allokerade objekten).
```
Vid `for (const o of [this.outFrame, this.character.outProfile, this.outSpec, this.outSpecAb...`:

```text
Ramen och dess delobjekt skrivs varje hop av optimerad kod: ge alla talfalt Double-form redan har (se stabiliseNumbers).
```
Vid `for (const k of DOUBLE_FROM_START) { const v = (this as unknown as Record<string, numbe...`:

```text
Instansfalt som i stabilt lage bytte Smi->Double forst vid sallsynta handelser (V8 --trace-generalization, 540 s).
FORSLAG 2026-09-27 (minnesgranskningen, tools/mem/): --trace-generalization over 240 s pop-facit visade att 60 instansfalt
byter Smi->Double EFTER start (var och en deprecerar Analyser-kartan: +10..+369 kartor per falt) -> scoreEnv deoptades 41 ggr,
process() 13 ggr ("wrong map", "Maps became deprecated during optimization"), och ooptimerad kod boxar varje flyttal:
43 kB skrap/hop kallt mot 1,2 kB/hop stabilt (--no-opt: 1 MB/hop). Listan ar exakt de falt som mattes generalisera.
```

### process()

```text
 Feed a hop-sized chunk of mono samples, get a frame back.
```
Vid `if (this.hopLane) this.setClock(this.hopLane.clockBpm, this.hopLane.clockConf);`:

```text
EN KÄLLA (a7r): klockans tal ur analysatorns EGEN taktväg (förra hoppets publicering)
```
Vid `const hop = samples.length;`:

```text
Slide buffer left by hop, append new samples at end.
```
Vid `let ss = this.sumSq;`:

```text
RMS på rå (o-fönstrad) buffert — LÖPANDE SUMMA. Bufferten glider en hop i
taget, så det räcker att dra av utgående hop och lägga till den inkommande
(128 ops i stället för 512 kvadrater, 375 gånger i sekunden). Full omräkning
~1×/s mot flyttalsdrift.
```
Vid `for (let i = this.buffer.length - hop; i < this.buffer.length; i++) { const v = this.bu...`:

```text
Läs den INKOMMANDE hopen ur this.buffer (efter set), inte ur `samples`: annars
adderas float64-tal och subtraheras float32-tal → systematisk drift, inte brus.
```
Vid `const rms = Math.sqrt(ss / this.buffer.length);`:

```text
DC-HANTERING: PROVAT OCH FÖRKASTAT (2026-08-23), båda vägarna kostade lås:
 • utesluta bin 0 ur bass/kick-banden — binbredden är 93.75 Hz, så bin 0 är
   0–94 Hz och BÄR bastrumman ("brusigt rum 136" gick 100 % → 0 %);
 • dra bort fönstrets medelvärde före FFT:n — vid 512 sampel (10.7 ms) är det
   ett högpass kring 100 Hz som dämpade 58 Hz-kicken (92/100 BPM låste på 113);
 • RMS som standardavvikelse (ss/N − mean²) — sänkte nivån just under
   energi-grinden i brusiga rum (100 % → 0 %).
```
Vid `const windowed = this.windowed512;`:

```text
Windowed FFT (pre-allokerade scratchpads → ingen alloc/hop)
```
Vid `const half = this.cfg.fft.size / 2;`:

```text
Magnitude spectrum + bass band (mag återanvänds; swap:as med prevMag nedan)
```
Vid `let kickFlux = 0;`:

```text
onset ENBART i kick-bandet (sub-bas)
```
Vid `let powSum = 0, powW = 0;`:

```text
för spektralt centroid (EFFEKT-viktat)
```
Vid `const bassBins = Math.min(16, half);`:

```text
~0–1.5 kHz
```
Vid `const kickBins = Math.min(1, half);`:

```text
ENBART bin 0 ≈ 0–94 Hz (bastrummans transient, inte basgången)
```
Vid `const fbMax = Analyser.FAST_BANDS ? this.fbMax : 0, fbMag = this.bands.fbMag;`:

```text
Ljusets nivå använder fortfarande rå magnitud. Onset-vägen kan däremot
komprimeras och vitbalanseras per FFT-bin, så en högljudd/tonal källa inte
sväljer svagare transienter i tempogrammet.
TRE LOOPAR I STÄLLET FÖR EN (a7, samma aritmetik i samma ordning): basbinnen (onset + snabba bandens magnitud = samma
sqrt som m), binnen upp till de snabba bandens tak (sqrt) och resten (bara centroidens summor). Fälten hissade ut ur
loopen (ingen this-läsning per varv); powSum/powW summeras fortfarande i stigande bin-ordning.
```
Vid `const compressed = Math.log1p(m);`:

```text
Log-kompression före differensen + SuperFlux-liknande långsam
per-bin-whitening. Peak uppdateras före division så varje bin börjar
på en stabil skala även när signalen startar från tystnad.
```
Vid `if (dd > 0) { flux += dd; if (i < kickBins) kickFlux += dd; }`:

```text
half-wave rectified
```
Vid `{ const t = this.prevMag; this.prevMag = this.mag512; this.mag512 = t; }`:

```text
Swap: denna hops magnitud blir nästa hops prevMag (zero-copy, ingen alloc).
```
Vid `const energy = Math.min(1, (bassEnergy / bassBins) * 0.02 * this.gain);`:

```text
Gain-compensated like `level` — otherwise the band-driven fixtures and
the kick energy gate die at low volume while the AGC keeps level alive.
```
Vid `const centroid = powSum > 1e-12 ? Math.min(1, Math.sqrt(1.47 * (powW / powSum) / half))...`:

```text
CENTROID-KALIBRERING (mätt 2026-08-23, 60 s syntetisk låt 128 BPM, statistik
på `frame.centroid` = det EMA-utjämnade värdet, inte råvärdet per hop):
  magnitudviktad (gamla) p10/p50/p90 = 0.194 / 0.254 / 0.343
  effektviktad rå                    = 0.025 / 0.044 / 0.115
Effektvikten kvadrerar ungefär tyngdpunkten, så sqrt återställer skalan.
KONSTANTEN 1.47 ÄR PASSAD MOT MEDIANEN, inget annat: sqrt är monoton, så en
enda faktor kan bara träffa en percentil. Efter ändringen mätte utjämnade
p10/p50/p90 = 0.176 / 0.223 / 0.353 — p50 landar där den låg, svansarna
ungefär (den övre något bredare). Kostar 1 sqrt/hop i stället för 240, och
`centSmooth > centSlow + 0.06` samt effektlagrets färgtemperatur läser rätt
storleksordning igen.
FOTNOT: sqrt(effektviktad tyngdpunkt) är INTE samma mått som magnitudviktad —
effektvikten ger de starkaste binen mer att säga till om, så glesa/ljusa
arrangemang (sparsam techno, akustiskt) kan landa annorlunda. Riser-grinden är
relativ och tål det; färgtemperaturen är absolut och märks först. Ser lamporna
ovanligt varma ut på ett spår utanför sviten är det här konstanten sitter.
```
Vid `const now = this.perfNow();`:

```text
Auto-gain (slow: seconds-to-minute timescales)
```
Vid `this.dbgRms = rms;`:

```text
AGC körs BARA för mic (aux låser gain på 1× — line-level är hett & stabilt).
PERCENTIL-AGC (från Lotus, live-mätt): envelopen är 95:e percentilen av RÅ rms
över ~2 s, inte en EMA av den gainade momentannivån. Målet är ett TAK för
topparna. Långsam attack (tauUp×2) så uppbyggnader får höras, snabb retreat
(tauDown×0.25) eftersom AGC:n inte kan ta bort redan inbränd klippning.
```
Vid `this.hGated = rms >= this.cfg.detection.noiseFloor * 1.5;`:

```text
BRUSGRINDEN (a7): enda jämförelsen, snabba sidan; workern läser activeMs > 0 (B_ACTIVE)
```
Vid `const hopMs = this.hopMs;`:

```text
Hoppets längd i ms. (Tva stallen nedan raknar fortfarande `dtHop * 1000`
for hand i stallet for att lasa den har — numeriskt identiskt, men
pastaendet "en enda forberaknad konstant" var inte sant.)
```
Vid `this.hHopMs = hopMs;`:

```text
Tystnad → nollställ BPM-klockan så beat-effekter inte fortsätter i fantom-takt.
```
Vid `this.envAccum = Math.max(this.envAccum, fluxNorm);`:

```text
--- Onset-envelope → lokal BPM (nedsamplad till 100 Hz) ---
```
Vid `const bassFluxNorm = Math.min(1, kickFlux * (this.cfg.onset.enhancements ? 0.5 : 0.02));`:

```text
Basbandets egen envelope (kick-flux) — samma raster, oberoende signal.
```
Vid `const big = this.bigOn;`:

```text
TYDLIG BASGANG: basnivans topp per env-sampel + senaste kick (se stepBassline).
```
Vid `const big = this.bigOn;`:

```text
STORA VÄGEN (fast): basgången, 2048-vägen, drop, riser, profil och sektionsaggregatet körs i långsamma tråden
```
Vid `let kickAtMs = 0;`:

```text
#2 Förfina förra kickens fas: nu har vi y(-1)=kfPrev2, y(0)=kfPrev, y(+1)=kickFlux
runt kick-hopet. Parabelns topp ger sub-hop-offset δ ∈ [-0.5,0.5] hop.
```
Vid `this.lvlSmooth = ema(this.lvlSmooth, level, aAtt, aRel);`:

```text
Modulnivå-funktion, inte closure: två closures per hop (~750/s) allokerades
rakt emot filens 0-alloc-ambition.
```
Vid `this.lvlVU += (level - this.lvlVU) * this.aVU;`:

```text
VU-nivå: symmetrisk ~200ms lågpass PÅ HOP-TAKT (integrerar alla 375 hops/s
→ långt mindre brus än att smootha rå-nivån efter 50Hz-decimering). ≤200 BPM
= ett slag var ≥300ms, så 200ms suddar aldrig ut en äkta beat — bara brus.
```
Vid `if (!big) {`:

```text
--- DUBBEL-FFT: hög-upplöst log-spektrum för effekterna ---
Egen glidande 2048-buffert, matas samma hop. Ger 23 Hz/bin i botten så
sub/kick/bas separeras. Per-band AGC-nivå + per-band adaptiv onset.
Bufferten matas VARJE hop (glidande fönster måste vara obrutet)...
```
Vid `if (++this.bigCounter >= Analyser.BIG_EVERY) this.bands.bigStep();`:

```text
...men själva FFT:n + band-analysen körs bara var BIG_EVERY:e hop. 2048-FFT:n
är analysatorns dyraste steg och spec-NIVÅERNA smoothas ändå ~90ms — de behöver
inte 375Hz. MÄTT: analysen tog 3.8ms/hop mot 2.67ms budget → ljud droppades och
ljuset låg 40–140ms efter. Decimeringen får den att rymmas i realtid.
Tidssteget skalas (bigDt) så smoothing-tidskonstanterna blir oförändrade.
```
Vid `const ON = Analyser.FAST_BANDS ? this.fbOn : this.bandOn;`:

```text
TRUM-KIT peak-hold-envelopes PÅ HOP-TAKT (var 2.7ms) → fångar varje anslag,
aldrig missat mellan två render-frames (100Hz). tau bevarade från effects.ts:
hat 60ms (treble+air-onset O[6]/O[7]) / snare 110ms (highMid-onset O[5]) / kick 150ms
(ENBART diskret kick — se nedan). bass = spec.bass-NIVÅ (L[2], ingen envelope).
Hi-hats/sizzle i modern EDM/trap ligger ofta >10 kHz, så hat får lyssna på både
treble (3,5–10 kHz) och air (10–16 kHz) och ta den starkaste transienten.
```
Vid `const ON = Analyser.FAST_BANDS ? this.fbOn : this.bandOn;`:

```text
trumenveloperna är ljus: snabba banden med FAST_BANDS
```
Vid `if (kick) this.kickHit = 1;`:

```text
Drivs ENBART av den riktiga kick-detektorn (median + 4.5*MAD). Tidigare
fylldes den ocksa pa av bandOn[1], men det bandet (60-120 Hz) domineras av
sustained bas: MATT 816-1377 anslag/min dar ~110 fanns, dvs 8x for manga.
Den svammade over den korrekta detektorn sa envelopen aldrig slocknade och
kicken forlorade sin accent.
```
Vid `const nowWallA = this.wallNow();`:

```text
── DROP-DETEKTION (flyttad hit: att AVGÖRA om det är en drop är analys) ──
En "riktig" drop = nivån surgar upp mot låtens tak EFTER en break (svacka).
Topp-zonen har hysteres (in vid 85% av taket, ut först vid 70%) så nivån inte
flimrar kring tröskeln. Kräver ≥2s musik så låtens INTRO (tystnad→musik) inte
läses som en drop. Resultatet exponeras som en MONOTON räknare → en konsument
på lägre takt kan aldrig missa flanken.
```
Vid `const breaking = this.lvlSmooth < this.levelCeil * 0.65;`:

```text
`breaking` = nivån ligger i en svacka. Exponeras till effektlagret (lugnt läge).
Den GAMLA svack-stämpeln (breakAtMs, 400 ms ihållande) grindade drop-villkoret
innan flanken flyttades till baskroppen; den är borttagen med sitt villkor.
```
Vid `this.hKick = kick; this.hNowWall = nowWallA;`:

```text
BASKROPPEN — drop-detektionens egen signal (tak + frånvaro + stigningstakt).
`inZone` lämnas orörd: effektlagret använder den som "musiken ligger högt".
```
Vid `const bodyNow = (this.bandDbRaw[0] + this.bandDbRaw[1] + this.bandDbRaw[2]) / 3;`:

```text
ra dB
```

### envSampleStep()

```text
 Ett onset-envelope-sampel (ENV_HZ): dubbelslagsdampning, ringar, basgang, sektionsflush/record till workern.
```
Vid `let _e = this.envAccum;`:

```text
DUBBELSLAG: tva anslag narmare an REFRAC_N sampel ar SAMMA handelse.
Anvandarens regel: "om det ar mindre an X ms mellan slag ar det ett
dubbelslag och 1a ska raknas till bpm". Implementerad som icke-max-
undertryckning (standard onset-peakplockning): ett sampel som foregas av
ett STORRE inom fonstret dampas bort.
200 ms (20 sampel @ ENV_HZ 100) UPPMATT som optimum pa 110 ljudklipp
ur tva genrer: unika latar ratt 13/18 -> 15/18, snitt 89.7 -> 91.7 %.
  100 ms 13/18 · 150 ms 15/18 (90.8) · 200 ms 15/18 (91.7) · 250 ms 12/18
  300 ms 14/18 · 400 ms 13/18
Att 200 slar 300 ar logiskt: vid 150 BPM ar en attondel exakt 200 ms, sa
ett bredare fonster borjar ata genuina attondelar i stallet for prydnadsslag.
Loste dessutom syntetscenariot "svag bas + pad 132" som legat pa 0 % sedan
lange -- just utsmetade anslag ar dar dubbelslagen gor mest skada.
```
Vid `if (this.role === 'fast') { this.pushSlowRecord(_e, _b, _h); } else if (!SECTION_AGG_HO...`:

```text
Sektionens blocksummor levereras per ENV-SAMPEL i bada rollerna (SECTION_AGG 'env': samma kodvag -> delad och odelad
analysator ar bit-identiska). SECTION_AGG 'hop': odelad analysator kor sectionHop per hop sist i process().
```

### fillFrame()

```text
 Muterar det ateranvanda Frame:t (spec/onset/drum + alla skalarer) och kor sektionsaggregatet. Bara skalarer in: ingen allokering per hop.
```
Vid `const FB = Analyser.FAST_BANDS, L = FB ? this.bands.fbLvl : this.bandLvl, A = FB ? this...`:

```text
ljusfälten
```
Vid `const f = this.outFrame;`:

```text
Mutera det återanvända Frame:t (spec/onset pekar redan på outSpec/outOnset).
```
Vid `f.kickAtMs = kickAtMs; f.barShift = -1;`:

```text
EN ETTA (r0): klockans etta sätts av publishPhase nedan (lotus); DMX läser ettan i cfg.beat
Gridfasen ut: konstant offset (detektorns slap) och/eller trim. Bada 0/av som standard => oforandrad fas.
```
Vid `if (this.clock) this.clock.update(f, this.clockOut, this, Date.now());`:

```text
KLOCKAN I process() (BEAT_FEED 'inline', eller ingen delning)
```
Vid `else this.hopLane!.feed(f, this.clockOut, this);`:

```text
KLOCKAN I WORKERN (lotus delad: taktvägen, egen matning)
EN FAS OCH EN ETTA (r0): ramens fas och etta = klockans publicerade rutnät och taktmodell (publishPhase, analyserClock.ts)
```

### clock

```text
 ANALYSATORNS KLOCKA utan taktväg (a7r; lotus profil, eller DMX utan delning): körs sist i process(), utfallet här.
```

### publishClock()

```text
 Klockans utfall till motorn (som hopLane.feed gör med taktvägen): rutnätet och fasfelet.
```

### drop

```text
 DROP: flanken, slam-kandidaten, minidrop, lyft/nästan-drop/stopp (analyserDrop.ts)
```

### sections

```text
 SEKTIONER: block, rang (intro/low/build/high/break), upprepning, förutsägelse (analyserSection.ts)
```

### riser

```text
 UPPBYGGNAD: riser (spektral nyhet + klang/nivå) och buildUp (analyserRiser.ts)
```

### character

```text
 KARAKTÄR: låtens långsamma profil (punch, bas, ljushet, täthet) (analyserCharacter.ts)
```

### kicks

```text
 KICK: anslag i snabba vägen (kick, virvel, hi-hat) och förfiningen (analyserKick.ts)
```

### bass

```text
 BAS: basenergin per slag och basgången (analyserBass.ts)
```

### levels

```text
 NIVÅ: förstärkning/AGC, tystnad, intensitet, nivåtak och topp-zon (analyserLevel.ts)
```

### bands

```text
 SPEKTRUM: snabba banden per hopp och stor-FFT:ns band, flöde och onsets (analyserSpectrum.ts)
```

## Toppnivå

### ema()

```text
 Asymmetrisk EMA (snabb attack, långsam release) — modulnivå så tick-vägen
 inte allokerar en closure per hop.
```

### WORKER_RESTART_BACKOFF_MS

```text
── DELAD ANALYSATOR: fabriken ────────────────────────────────────────────────────────────────
 Omstart av workern: backoff 1/2/5/5/5 s, hogst 5 omstarter per 10 min, sedan ges upp (snabba
 sidan fortsatter leverera ljus med senaste tillstandet i blocket; tempo/sektion fryser).
```

### createAnalyser()

```text
<prefix>ANALYSER_SPLIT (se split.ts):
  (osatt)   en analysator i en trad.
  worker    snabba delen har, langsamma (tempo/gridfas/sektion) i en worker_threads-Worker pa egen karna.
  inline    bada i SAMMA trad, workern kord synkront efter varje record — for banken: bevisar att den delade
            analysatorn ger identiskt resultat som den odelade (deterministiskt, virtuell klocka).

Testkrokar pa den returnerade analysatorn (bara worker-laget): __worker (aktuell Worker), __stopWorker() (stanger
utan omstart), splitRestarts (antal omstarter hittills).

`mode` (andra argumentet, bara bänken) går före ratten; 'sync' = den RIKTIGA workern i lås-steg (snabba sidan väntar på
varje publicering) - deterministiskt, för att jämföra workern hop för hop mot inline-läget.

TAKTVÄGEN (split.ts): klockan (analyserClock.ts) körs i den långsamma vägen om inte <prefix>BEAT_FEED är 'inline' (clockMode).
DMX (BEAT_FEED 'slow'): motorn matar den med analyser.hopLane.feed(frame, cfg, analyser). Lotus (BEAT_FEED osatt): analysatorn
matar den själv sist i process() (hopSelf).
```
Vid `const withWorker = ({ Worker }: typeof import('node:worker_threads')) => {`:

```text
Worker: SAB:arna delas via workerData (structured clone DELAR SharedArrayBuffer). cfg ar ren data och klonas.
Importen ar dynamisk sa modulen fortfarande laddar i miljoer utan worker_threads (bank, webblasare). Synk-läget måste starta
workern innan första process() (den väntar på den) och tar modulen synkront.
```
Vid `const attempts: number[] = [];`:

```text
tidpunkter for omstarter inom fonstret
STORA VÄGEN + TAKTVÄG (a3): två trådar - 'lane' (bara taktmatningen) och 'slow' (analysatorn: env + stora vägen). Annars en.
PI:NS VERKLIGHET (a3r): EN worker-tråd även med stora vägen - motorn är låst till 2 kärnor (CPUAffinity), en tredje tråd delar
kärna med ljusvägen. Taktvägen får förtur i tråden via bigYield (slowWorker.ts). Delningen 'lane'/'slow' finns kvar i slowWorker.
```
Vid `const w = new Worker(new URL('./slowWorker.js', import.meta.url), { workerData: data });`:

```text
Pekar pa den BYGGDA filen (slowWorker.js bredvid denna).
```

### hopFeedFactory()

```text
 TAKTVÄGEN: klockan för den långsamma vägen, om inte <prefix>BEAT_FEED är 'inline' (clockMode).
```

### clockMode()

```text
 VAR KLOCKAN KÖRS - profilen på ETT ställe (sys.BEAT_FEED): 'slow' = i taktvägen (analysatorns långsamma väg, workern) när
 analysatorn är delad, annars sist i process(); 'inline' = alltid sist i process() (ingen taktväg); osatt (lotus) = som 'slow', men analysatorn matar taktvägen själv (hopSelf; EN KLOCKA: det finns ingen annan tempoväg).
```

