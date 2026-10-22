# Analysatorfynd från DMX (läses av lotus-morgonagenten)

Den delade analysatorn (src/analyser.ts, split.ts, slowWorker.ts, tempoTracker.ts, recorder/recorder.ts, md5 i src/ANALYSER_SHARED.md5)
ägs av lotus-morgonagenten. DMX-nattagenten får inte ändra den, men hittar fel i den när ladans ljus mäts. Sådana fynd skrivs HIT
i stället för att lämnas i en rapport. Lotus-morgonagenten läser filen varje morgon, tar fynden som rör analysatorn som uppdrag
(opt-in, bänk mot korpus + syntet, paritet i båda repona enligt arbetsgången i ARKITEKTUR.md) och markerar dem.

Format per fynd (nyast överst):

    ## ÖPPET <datum> <kort rubrik>
    Vad: <vad som är fel, med siffror>. Var: <fält i rutan / funktion>. Material: <filer att bänka på>. Önskat: <vad DMX behöver>.
    Status: (lotus fyller i) TAGET <datum> / KLART <datum> <commit> / AVVISAT <datum> <skäl>

DMX-sidan kan ändra sådant som bara ligger i DMX-profilen (src/analyserProfile.ts) själv - det är inte delad kod.

---

## INFO 2026-10-22 Flaggstädningen i delade analysatorn (ägaren) - läs innan nästa ändring
Vad: ägaren 10-22 'koden skall vara optimal, inga massa flaggor'. Gjort i båda repona (dmx 42905b4, lotus 3d992a2, md5 8c771759): flaggor
med samma effektiva värde i DMX och lotus (profil + repots lotus-drop-ins) är kod, flaggor av i båda är borttagna (HMM/tempoTracker.ts,
EVIDLOCK, SHIFT_DOWN, PULSE_VETO, DEADBEAT, CONFBLEED, TG_ADAPT, GHOST_LASTGOOD/34, SUBH_HALF, HIGH_VOTE m.fl., GRID_PHASE_TRIM, BOUNDARY_NOV,
SECTION_MODE != rank, LEVELREF, HOLD_BARS, REENTRY, PREDICT_STRICT/DIP, klangmallen REPEAT 256/512/768, REPEAT 2/8/128, DROP_KICK_LOCK).
Bevis: lotus analyserParity med lotus drop-in-env 0 avvikande hop av 787 500 (rakt+grid+hint, split inline, reset); DMX byte-identisk.
OBS lotus: drop-ins för de nu inbyggda (SECTION, SECTION_ON_HINT, SECTION_EARLY_S, SECTION_W_HIGH, TEMPO_HOLD/SHIFT, DROP_CALM_GATE,
DROP_CALM_INTRO_STRICT, drop-fix-värdena BODY_FAST_S/DROP_ARM_MS/DROP_RISE_MIN) läses inte längre; repots drop-in-filer är förutsättningen -
om lotus-Pi:n har ANDRA värden än repot gäller det inte. Lotus ej deployad. Pi:ns dist/tempoTracker.js blir över (ofarlig).
Status:

## ÖPPET 2026-10-22 Låtstarten: SECTION_EARLY:s median räknas på förra låtens bärda block - starka låtstarter får inte 'high'
Vad: ägaren 10-21 'hur snabbt dirigenten förstår typ av sektion/låt'. tools/latStart.mjs (nytt, konsertReplay-json + wav: facit = 1 s-dB
rangordnad INOM låten) på 25 lang, 41 låtgränser: av facit-high-sekunderna i låtens första 20 s säger etiketten high bara 38 % (resten av
låten 82 %). Exempel lang-20261021T203952: låten startar på full nivå 144 s, 'intro' till 151 s. Orsak: med SECTION_CARRY 20 har rangen
historik direkt, men SECTION_EARLY (första SECTION_EARLY_S s: high kräver m4 >= median + SECTION_EARLY_DB) tar medianen över secBlkDb
som innehåller förra låtens 20 bärda block (ofta dess refräng) -> en låt som startar stark når inte +3 dB. DMX provar profilratten
SECTION_EARLY_DB 1,5 (hiStart 38 -> 49 %, fladder lika, ute som prov 10-22). Fri intro (uppehållstiden ur 'intro' av) PRÖVAD och
FÖRKASTAD: intro 3,3 -> 0,3 s men etiketten fastnade i fel sektion (look >= 8 s 5,8 -> 8,1 s, fladder 143 -> 192).
Var: sectionBlock, SECTION_EARLY-grenen (median över this.secBlkDb). Material: tools/ladan-2026-10-1*/lang-*.wav + ladan-2026-10-21;
mått tools/latStart.mjs (hiStart, fel20), tools/sektionLag.mjs, rodTrad.mjs.
Önskat (opt-in, av = bit-identiskt): SECTION_EARLY:s median bara över blocken EFTER låtgränsen (de bärda blocken räknas inte), så
regeln jämför låten mot sig själv; döms på hiStart utan att 'hör ihop'/fladder går ner.
Status:

## ÖPPET 2026-10-22 onset.kick är klampad 0/1 (q90 = 1) - går inte att toppvälja (tillägg till kickflaggan 10-19)
Vad: uppdrag 10-21 punkt 4 (ersätt KICK-BYPASS/registerKick med onset.kick-toppen). Mätt med FAST_BANDS (lang 203952 + 191741, 120 s
efter uppvärmningen): onset.kick q10/q50 0, q90/q99 1,000 - mättad i > 10 % av hoppen; stigande kant mot 1 med 150 ms spärr ger
5,8-6,4 händelser/s (kickarna ~2/s), frame.kick 2,5-3,7/s. Toppen bär ingen amplitud, så en kickhändelse kan inte väljas ur fältet utan
tempospärr (= dagens kylningskant). Bänkfälla hittad på vägen (DMX, mätfälla 52): konsertReplay/showTight/ljusLag matade aldrig
registerKick/KICK-BYPASS - konsertReplay --live-kick gör det nu; påverkan på ljusLag liten (korskorr median 10 -> 5 ms, 90 % 42 -> 48 ms).
Var: bandOn/fbOn (onset per band, klampning), kickdetektorn. Material: som ovan, tools/natt/ (ondist i rapporten).
Önskat: ett omättat kickonset (t.ex. onset.kick före klampningen, eller kickbandets stigning i dB) i ramen, eller frame.kick på det
lokala maxet av det - då kan DMX prova registerKick/KICK-BYPASS på det. Lotus plan 10-21 (kick på onset-toppen) täcker detta.
Status:

## ÖPPET 2026-10-21 Ljusets bandvärden kommer ur 2048-FFT:n och ligger 21-27 ms efter ljudet (delningen: analys i ljusvägen)
Vad: ägarens uppdrag 10-20 (snabba sidan = ljusstyrning, minsta latens; långsamma = dirigentens input, bästa analys). Mätt med Node 24
(tools/faltLatens.mjs: stigande flanker korskorrelerade mot nollfas-filtrerat ljud, pop + lang 191741 + lang 112342, identiskt på alla
tre): level (512-RMS) 8 ms, kickdetektorn 3 ms, men spec/specAbs/bodyDb 21 ms, onset.kick 27 ms, onset.treble/drum.hat 13-24 ms - allt
ur 2048-FFT:n (42,7 ms Hann, var 3:e hop). Dropkroppen (bodyFast) får de 21 ms ovanpå BODY_FAST_S. Det är snabba sidans största
latensbidrag, i fält ljuset läser direkt. Kostnad i dag (tools/splitKarta.mjs --wrap): bigStep 6,9 ms/s PC = 43 % av snabba sidan
(FFT:n 61 µs/anrop av 94), 2048-spektrat matar också låtgränsen och sektionens basonset (analys).
Var: bigStep (bandLvl/bandOn/bandAbs/bandDbRaw), fillFrame. Material: tools/pop_ladan.wav, tools/ladan-2026-10-11/lang-*.wav; mått
tools/faltLatens.mjs, tools/ljusLag.py (riggens ljus mot ljudet), dropFacit/dropTiming.
Önskat (opt-in, standard bit-identisk): banden för LJUSET ur en snabb väg - 512-FFT:n för banden >= 250 Hz och en IIR-filterbank i
tidsdomänen för sub/kick/bas (två biquads per band, ~2-3 µs/hop PC) - och 2048-FFT:n kvar som analys (sektion, låtgräns, låtminne),
gärna på långsamma sidan. Väntat -15..-20 ms på bandstyrda effekter och dropkroppen. Hela kartan: tools/natt/delning-2026-10-21.md.
Status: TAGET 2026-10-21 (lotus-morgonagenten): morgonens latensidé. Plan: opt-in <prefix>FAST_BANDS=1 - banden >= 250 Hz ur 512-FFT:n, sub/kick/bas ur biquad-bank i tidsdomänen, 2048 kvar för sektion/låtgräns; bevis faltLatens.mjs (-15..-20 ms väntat på bodyDb/spec), paritet 0 med flaggan av, korpusbänken oförändrad (tempot läser inte banden). Ej byggt i dag.
KLART 2026-10-21 kväll (DMX-sessionen på ägarens begäran, samma analyser.ts i båda repona, manifest 20a9d62e): opt-in <prefix>FAST_BANDS=1.
Egen uppsättning (fb*) bara för ramens LJUSFÄLT (spec/specAbs/onset/drum.hat+snare+bass/midHiDb); 2048-vägen räknas oförändrat och matar
dropkroppen, sektionen, profilen, basgången. Av = natt --snabb json-identiskt. På (24 lang): drops 68 = 68 med identiska tider, fältlatens
specAbs.kick 21 -> 5 ms, onset.kick 27 -> 5, diskant 21 -> 3; riggens ljus korskorr 25 -> 10 ms (19/24 filer); röd tråd återseende 67 -> 64 %,
hör ihop 81 -> 75 % (sektionerna skiljer 8 % via kickgrinden: rutnätet viker det snabbare onset.kick). Snabba sidan ~+7 µs/hop PC.
Prövat och struket: även dropkroppen snabb - drops 68 -> 57, bara 42 samma (ägarens 161434-facit 6/8 i båda) - kräver omkalibrering.

## ÖPPET 2026-10-21 Workern har ~40x marginal - tempot räknas fortfarande 4 Hz efter lås (gammal enkeltrådskompromiss)
Vad: långsamma sidan kostar 2,5-2,8 ms CPU per s ljud på PC med Node 24 (computeBpm 0,8 + scoreEnv 1,5 ms/s, 200 µs/anrop, sectionHop
0,07), ~2,5 % av en Pi-kärna. envStep kör computeBpm/computeGridPhase var 25:e env-sampel efter lås med motiveringen '20 Hz = ~10 % av
en Zero 2 W-kärna' (2026-08-09, när allt låg i en tråd). Riktig worker: lagMs 0, behind 1 record, skipped 0 (start: lagMax 232 ms).
Var: envStep stride (ENV_HZ / 4). Material: taktKorpus.mjs + frozen6, 24 lang (omlåsning efter låtgräns).
Önskat: pröva 10-20 Hz efter lås med tempogrammets EMA-alfa skalad mot steget (samma tidskonstant) - mät omlåsningstid efter låtbyte och
tempostabilitet. Låg prioritet: DMX:s ljus följer den löpande takten (beatFeed), inte analysatorns tempo direkt.
Status: TAGET 2026-10-21 (lotus-morgonagenten): låg prioritet (lotus i energiläge, DMX följer beatFeed). Bänkas mot omlåsning efter låtbyte i korpusen (TEMPO_SHIFT-måttet 4,8 s) när det byggs; ej byggt i dag.

## ÖPPET 2026-10-20 SECTION_BODY_HIGH når inte drops i 'intro' (efter låtgräns) eller sena drops i 'build'
Vad: 24 lang-*.wav (konsertReplay --delad-cfg --step 5, DMX-profilen med SECTION_BODY_HIGH 2000/_DB 2 = live sedan 10-19), 67 show-drops:
29 sker med frame.section intro (19) eller build (10). 12 av dem når 'high' först efter > 8 s eller inte alls inom 30 s (intro 10: 1011T103310
345 s, 1011T112342 279 s, 1011T142953 11 s, 1011T145248 9 s, 1011T151032 8 s/117 s (14 s), 1011T150641 17 s (23 s), 1011T151414 399 s (19 s),
1011T155632 185 s/304 s (9 s), 1011T193430 314 s (11 s); build 2: 1011T155632 135 s, 1011T191741 168 s (24 s)). 9 av intro-fallen har en
LATGRANS 0,1-7 s FÖRE dropen - låtgränsen nollar sektionen till intro mitt i breaket och SECTION_BODY_HIGH-räknaren verkar inte gälla
från intro (eller nollas med gränsen). 16 av 67 drops har 'build' inom 8 s efter smällen (10 från build, 5 från intro, 1 från low).
Var: sectionBlock + hintTrackChange-nollningen / SECTION_BODY_HIGH-villkoret. Material: tidpunkterna ovan (s från filstart).
Önskat: basen tillbaka med full kraft efter break = 'high' även när sektionen står i intro efter en låtgräns (eller låtgräns i breaket
före en drop räknas inte som ny låt).
Status: KLART 2026-10-20 (lotus-morgonagenten, lotus + dmx samma analyser.ts): inom SECTION_BODY_HIGH (ingen ny flagga) - i rangens första 20 block efter låtgräns blir basen tillbaka 'high' direkt och står kvar tills rangen har 20 block (förr alltid 'intro'). 24 lang, konsertReplay --delad-cfg --step 5, 67 show-drops: high +2/+4/+8/+15 s 33/39/43/50 -> 36/42/46/53, intro/build utan high inom 8 s 13 -> 10, build inom 8 s efter 16 -> 15, byten/min 3,13 -> 3,17. Lotus (flaggan av) paritet 0 (90 000 hop), splitProof flagga på 0/135 000. Resterande 10: basen når inte bodyPeak - _DB inom 2 s (ej undersökt). EJ deployat - ladan.

## ÖPPET 2026-10-19 Workern får en KOPIA av cfg vid start (createAnalyser worker-läget) - ingen effekt i dag, men en fälla
Vad: createAnalyser (analyser.ts ~3863) startar workern med workerData { cfg: { ...cfg } } = structured clone. Den långsamma sidan ser
alltså cfg som den var vid start och aldrig motorns uppdateringar (cfg.beat = taktrutnätet, som DMX nu flyttar var 250 ms med den
löpande takten, och ev. UI-ändrade detection-värden). I dag läser bara den SNABBA sidan cfg.beat (beatSrc: kickgrinden ~3174 och
taktfasens barAcc ~3302), så resultatet är detsamma - men inline-läget (bänken) gav den långsamma sidan SAMMA objekt, så en framtida
cfg-läsning i den långsamma delen skulle bete sig olika i bänk och live utan att någon märker det. Bänkarna showTight/konsertReplay
kör sedan 10-19 delningen inline med structuredClone(cfg) till den långsamma sidan, som live. Var: createAnalyser/slowWorker.
Önskat: antingen dokumentera i split.ts att den långsamma sidan aldrig får läsa cfg efter start, eller skicka cfg.beat i recorden.
Status: KLART 2026-10-21 (lotus-morgonagenten): dokumenterat i split.ts (WorkerData) i båda repona - den långsamma sidan får aldrig läsa cfg efter start, levande värden skickas i recorden. Bara kommentar på ett typ-interface: split.js byte-identisk (md5 2e4cae7d = dist), manifestet synkat i båda repona.

## ÖPPET 2026-10-19 frame.kick fyrar på kylningens kant (~0,6 slag) i stället för på kickarna
Vad: showTight --step 5 med motorns cfg (som live, mätfälla 47), pop_ladan 600 s vid 125-130 BPM: frame.kick ~3,1/s, medianintervall
283-309 ms i varje 60 s-fönster oavsett låt = KICK_COOLDOWN = max(170, 0,6 x slaget) (analyser.ts ~3157). Kickarnas fas mot ljudets
slag är nästan likformig (resultantlängd R 0,03-0,18 per minut). Kickbandets anslag (frame.onset.kick) är däremot tydligt periodiskt
(vikning topp/medel 1,7-2,9 per 10 s). Följd i DMX: kick-PLL:en drog rutnätet mot slumpfaser - rutnätet låg i median 156 ms fel mot
kickbandet (12 % av 10 s-fönstren inom +-25 ms), och 'kick -> ljus' i bänkarna mätte brus. DMX har ersatt PLL:en med en löpande vikning
av onset.kick (beatFeed.ts 10-19), men kicken används fortfarande av tilliten, drop-/minidrop-logiken och effekternas kickEnv.
Var: kickdetektorn (flux-tröskel + KICK_COOLDOWN). Jämför profilrattarna DMX_KICK_NOGATE / DMX_KICK_COOLDOWN=100 i ladan.py PORTAR_EJ_LIVE.
Material: tools/pop_ladan.wav, megamix_ladan.wav, lang-*.wav. Önskat: en kick per riktigt kickanslag (frame.kick i fas med onset.kick-toppen).
Tillägg 2026-10-21 (Node 24, delad inline som live): onset.kick-summan runt frame.kick är platt (pop 155-179 över -160..+160 ms, lang
112342 99-134, ingen topp); vikt på den löpande takten ligger kickarna 66-94 ms FÖRE slaget (pop, megamix, 2 lang). Motorns KICK-BYPASS
(render direkt vid frame.kick) och effekternas registerKick fyrar alltså i slumpfas. Det är den snabba sidans enda kick-bool.
Status: TAGET 2026-10-21 (lotus-morgonagenten): lotus kör KICK_NOGATE + COOLDOWN 100 och energiläge (pulsen läser inte frame.kick), så felet syns mest i DMX. Idé (ej byggd): opt-in där frame.kick fyrar på onset.kick-toppen (lokalt max i kickbandets anslag över adaptiv tröskel) i stället för flux-tröskeln, döms på on-beat-recall/precision i korpusen + fasresultant på pop/lang.

## ÖPPET 2026-10-19 Sektionen följer inte dropen upp i 'high' (och passerar 'build' efter smällen)
Vad: 24 lang-*.wav (151 min, konsertReplay --delad-cfg --step 5, DMX-profilen RUN 5/RUN_IN 3/CARRY 20), 68 show-drops (DMX flank-drop
på bodyDb = basen tillbaka efter break): frame.section vid dropen intro 18 / low 30 / build 12 / break 4 / high 4; +4 s high 14, +8 s high
22 (low 25, build 12), +15 s high 24 (low 26, build 16). 12 av 68 går in i 'build' 2,1-7,7 s EFTER smällen (median 5,4 s) - uppgången
klassas som uppbyggnad när den redan är refräng. Var: sectionBlock (1 s-block, RUN_IN 3 + nivå/täthet mot låtens egen skala - breaket
före drar ner skalan?). Material: tools/ladan-2026-10-1*/lang-*.wav; tidpunkter = rader med why 'drop' i konsertReplay-json.
Önskat: när basen kommer tillbaka med full kraft efter ett break (frame.bodyDb nära taket efter >= 1 s borta) ska sektionen bli 'high'
inom ~2 s och inte passera 'build'. DMX har en egen spärr som opt-in (DMX_DROP_NO_BUILD_S, 10-19), men manus/återseende hänger på etiketten.
Status: KLART 2026-10-19 (lotus-morgonagenten), opt-in <prefix>SECTION_BODY_HIGH=<ms borta> (+ _DB, standard 3): basen borta >= N ms
(bodyEnv under taket - BODY_GONE_DB) och inom 2 s tillbaka till bodyPeak - DB räknas som drop för sektionen ('high' direkt, förbi
uppehållstiden; räknaren går via R_DROPS till workern). Flagga av = paritet 0 (lotus, 146 250 hop), splitProof med flaggan 0/90 000.
konsertReplay --delad-cfg --step 5, 24 lang-*.wav: AV drops 66, high +2 s 12, +4 s 14, +8 s 22, build-inträde 0,5-8 s efter 11, byten 2,64/min;
1000/3 dB: high +2 s 33/70, build 6, byten 3,55/min (break +4 s 6 -> 14); 2000/2 dB: high +2 s 33/69, +8 s 36, build 5, byten 3,08/min,
tid high 45 -> 49 %. Rekommendation för DMX-profilen: DMX_SECTION_BODY_HIGH=2000 DMX_SECTION_BODY_HIGH_DB=2 (nattagentens/ägarens val,
kan ersätta DMX_DROP_NO_BUILD_S). Inte för lotus: sektionsbanken test high==high 0,73 / falsk 0,33 oförändrat men gränsfel 0,43 -> 0,50.

## ÖPPET 2026-10-18 Analysatorn allokerar 54-73 B per hop på Node 18 (Pi:ernas V8) i stabilt läge
Vad: skräpjakten 10-18 mätte med Node 18.20.4 (Pi:ernas version, C:/Users/richa/node18) i stabilt läge = andra varvet av
materialet (alla grenar körda en gång). Analyser.process inklusive: lotus 73 B/hop = 27 kB/s (engineReplay playlist-lang, 710-1090 s),
DMX 54 B/hop = 20 kB/s (skrapReplay lang-1014 --varv 2, 900-1140 s). Det är nu största enskilda posten i lotus (motorn 41 kB/s totalt,
varav bänken ~7) och ~30 % i DMX. MÄTFÄLLA: Node 18:s samplande heap-profilerare saknar includeObjectsCollectedBy*GC och kör en GC
före rapporten - den visar bara överlevare (DMX 1,9 kB/s mot verkliga ~200). PC-profilerna (Node 22) säger inte vad Pi:n allokerar.
Mekanismer som bevisats i motorerna i natt och troligen finns i analysatorn: decimaltal i modulvariabler (let) boxas vid varje skrivning
i V8 10 (analysatorn har inga sådana - bra), decimaltal som argument/retur till icke-inlinade metoder, Map med decimaltal som värde,
strängar/arrayer som byggs per hop. Var: Analyser.process och dess steg. Material: dmx tools/skrap/winAlloc.mjs (WIN_INCL, Node 18,
--min/max-semi-space-size=512), probe.py (PROBE_RET=1) + probeHook.mjs, skrapReplay.mjs --varv 2; lotus engineReplay (__winPatch-krok).
Önskat: ner mot 0 på Node 18 med samma recept; mät på Node 18, inte 22.
Dessutom (optStat.mjs, lang-1014 från 300 s): computeBpm är TurboFan 0 % av tiden på Node 18 (och på Node 22 utan flagga; 21 % med
--invocation-count-for-turbofan=100) - den kör otolkad/Sparkplug på Pi:erna och boxar då varje tal; process/sectionBlock 100 % på Node 18.
Status: TAGET 2026-10-18 (lotus-morgonagenten): computeBpm-delen ORSAKSBESTÄMD på Node 18.20.4 (--trace-opt-verbose, lang-1014): 'not enough ticks: 1–2/18, too large: 17084' — bytekoden är 17 kB ⇒ V8 kräver 3 + 17084/1100 = 18 avbrottsbudgetar, och tickarna nollas vid varje IC-ändring (sällsynta grenar) ⇒ 4 Hz-anropen når aldrig dit (0 % TurboFan på 300 s). Prov: --bytecode-size-allowance-per-tick=20000 (kräver 3 tickar) ⇒ computeBpm 0 → 43 % TurboFan (200–300 s), övriga oförändrat 100 %. Två vägar: (a) kodväg = bryt ut computeBpm i fler små metoder (som tempoGramStep 10-17) tills varje del < ~5 kB bytekod, bit-identiskt + paritet — inte gjort i dag; (b) nodflagga i ExecStart (båda Pi:erna) — ändrar inga värden men är drift, mät på Pi:n (--trace-gc scavenges/min) först, ägarens beslut. 54–73 B/hop i process: ej angripet än.
DMX-sessionen 2026-10-18 (ägaren: 'dela upp computeBpm känns som rätt väg'): väg (a) PROVAD, INTE INFÖRD. computeBpm delad ordagrant i
bpmLockClassic/bpmOctaveTrack/bpmEvidenceScan/bpmLockHmm/bpmLockEvidence (decimaltal via fält, uppvärmningens return som boolesk retur):
bytekod 17084 -> 3935 (+ 585/3389), paritet 0/112 500 hop (dmx, --grid). TurboFan Node 18: computeBpm 1:a varvet 0 -> 72 %, 2:a 80 -> 100 %,
men oktavdelen (egen metod, 4 Hz) bara 20 % - V8 10 optimerar små sällananropade metoder sent. Skräp (winAlloc Node 18, 2:a varvet 900-1140 s):
computeBpm 435 -> 532 B/anrop (1,7 -> 2,1 kB/s), Analyser.process 10,9 -> 9,4 kB/s (inom bruset). computeBpm är ~2 kB/s av Pi:ns ~74 -
ingen mätbar vinst, så den delade filen lämnades orörd. Patchen: dmx tools/skrap/computeBpm-split-2026-10-18.patch. Väg (b) (flaggan) av
samma skäl inte värd driftändringen. Det som är kvar i process (26-30 B/hop) sitter inte i computeBpm.

## ÖPPET 2026-10-17 Tempot vandrar i breaket före/efter drops
Vad: 24 lang-*.wav (konsertReplay --delad-cfg --step 5): 14 av 29 show-drops har tempobyte i frame.bpm (> 2 BPM) mellan 8 s före och 10 s
efter dropen - ofta glidning i 3 BPM-steg (126 -> 123 -> 120 -> 117 -> 114 på 3 s, lang-105428 447 s) eller hopp till fel tempo som håller
i flera sekunder (117 -> 88, 133 -> 94, 128 -> 86, 125 -> 81). Kickarna saknas när basen är borta, så tempogrammet driver. Ägaren i ladan:
'efter drop känns det som effekten inte vet vad den skall göra i några sekunder' / 'taktlåset ... inte helt släppas efter drop'.
Var: computeBpm under breaket (inga/få kickar, onset-ringen domineras av riser/virvel). Material: tools/ladan-2026-10-1*/lang-*.wav,
tidpunkterna i natt-todo 10-17. Önskat: håll tempot (som lotus TEMPO_HOLD gör i tystnad) när basen/kickarna försvinner i ett break, och
släpp först när ett nytt tempo bevisats efter att basen kommit tillbaka. DMX har ett eget filter i taktklockan (beatFeed DMX_TEMPO_PERSIST_S,
live-prov 10-17 15:3x: tempohopp 3,36 -> 1,35/min) men analysatorns frame.bpm är fortfarande fel i de sekunderna.
Status: TAGET 2026-10-18 (lotus-morgonagenten): idé = utvidga TEMPO_HOLD från tystnad till 'basen borta' (bodyDb långt under taket) — håll frame.bpm tills ny evidens bevisats efter att basen kommit tillbaka; bänkas på lang-*.wav (tempobyten ±8/10 s runt drops) + korpus. Ej byggt i dag.

## ÖPPET 2026-10-17 Sektionen säger nästan aldrig 'build' före en drop
Vad: 24 lang-*.wav (149 min, konsertReplay --delad-cfg --step 5, DMX-profilen RUN 5/RUN_IN 3/CARRY 20): av analysatorns 62 drops har
37 sektion 'high' redan 20 s före (23 st high hela vägen -20..-1 s), bara ~10 st har 'build' någon gång inom 20 s före. 'build' är ändå
13,4 % av tiden - den ligger alltså mest före refränger utan drop. DMX-ersättaren basen borta (bodyDb > 12/18/24 dB under 10 s-taket i 1-3 s)
förkastad i natt: bara 18-26 % av sådana händelser följs av en drop inom 20 s (0,3-2,2 händelser/min), oavsett djup/längd. Samma bild som
morgonens buildUp-fynd 10-12 (AUC <= 0,56). Var: sektionsklassningen (sectionBlock) - pre-drop-breaket/risern i EDM klassas 'high'
(hög nivå/täthet) eftersom bara basen försvinner. Material: tools/ladan-2026-10-1*/lang-*.wav. Önskat (ägarens prio 2, 'byta till BUILD
innan drops'): ett build-mått som skiljer pre-drop-uppbyggnaden inne i high från refrängen, 4-8 takter före; facit = analysatorns drops
(dropTiming). Inget brådskande - DMX har ingen egen signal som fungerar.
Status:

## ÖPPET 2026-10-17 kväll SKRÄPET HITTAT – tre orsaker, alla bevisade bit-identiska (ersätter gissningarna nedan)
Mätt i STABILT läge (allocProf --fran 300, lang-20261014T161434.wav, konsertReplay --delad-cfg --step 5; utan --fran mäts mest
uppvärmningen - därför såg 10-17-morgonens 240 s bigStep/scoreEnv som störst; i stabilt läge är de ~0). Analysatorn 183 kB/s:
computeBpm 66, process 47, sectionBlock 39, dropStep 14, intensityStep 5, alignScore 4, bigStep 2.
(1) OMOPTIMERINGEN ÄR FÖR LÅNGSAM - störst. V8 kräver 3000 anrop innan en funktion optimeras om (--invocation-count-for-turbofan=3000).
    computeBpm deoptas på sällsynta grenar (dist-rad 3321 oktavrösten 'ratio > 1.4', 3442 '!sameChallenger', 'Insufficient type feedback
    for generic named access') och körs 4 ggr/s ⇒ upp till 12,5 min otolkad, där varje tal boxas (10,8 kB/anrop i off-beat-loopen,
    8,4 kB i tempogramloopen). Mätt (tools/skrap/optStat.mjs): computeBpm i TurboFan bara 44 % av tiden 300-600 s. Samma för dropStep.
    Med node --invocation-count-for-turbofan=100: computeBpm 79 % TurboFan, 66 -> 16-23 kB/s, dropStep 17 -> 1-4, sectionBlock 43 -> 15,
    HELA MOTORN 450 -> 187 kB/s (effects 146 -> 35 - DMX-effekterna hade samma problem). Ljuset byte-identiskt (3 inspelningar).
    Kodfix (lotus): flytta de sällsynta grenarna i computeBpm (oktavröst, utmanare/newSongVote, veto, nollningar) och dropStep (dist-rad
    4811/4945/4983/4990) till egna små metoder, så att en deopt där inte kastar den stora funktionen. Flaggan är processens (systemd).
(2) DECIMALTAL ÖVER ANROPSGRÄNSEN BOXAS - process 47 -> 6 kB/s. Varje decimaltal som skickas som argument till, eller returneras från,
    en metod som inte inlinas blir ett HeapNumber per anrop. Bevis (tools/skrap/skrapPatch1.py + skrapPatch2.py på en dist-kopia: argumenten
    via this._<metod>_<param>-fält, initierade i konstruktorn, resultatet via fält): intensityStep 4,9 -> 0 (returvärdet), fillFrame 22,5 -> 0,
    process 47 -> 5,9, lang-1014 byte-identisk. Metoderna: fillFrame (12 arg), sectionAggStep (6), sectionHop (14, 3 anropsställen), kickStep,
    silenceStep, bigStep, riserStep, kickRefine (+ returvärdet), dropStep, intensityStep (returvärdet).
(3) EXPLICITA ALLOKERINGAR i sectionBlock (15 kB/s kvar efter (1)), alignScore (2,3) - per block/anrop: new Float32Array(FP2_DIM) i
    REPEAT-grenen, terms-arrayen av objekt + closuren add, D.slice().sort(), secBlkDb.slice(nb-8, nb-2).sort(), Array.prototype.slice.call(
    phaseTrimRing).sort(), closurerna score/isHi/zOf/idx/pct per block; alignScore: closuren at + returobjektet {score, half, hit} (ring av
    4 objekt prövad: 4,1 -> 2,7, bit-identiskt). Återanvänd scratch-buffertar (Float64Array + subarray().sort()) och metoder i st f closurer.
(1)+(2) tillsammans: analysatorn 183 -> 46 kB/s, hela motorn 450 -> 138 kB/s. Gjort med doubleFields på hela Analyser-objektet: SÄMRE
(dropStep 14 -> 72) - gör inte det.
Önskat: (2) och (3) i analyser.ts, bit-identiskt (paritet 0, bänk 396/503), och (1) som kodfix. DMX prövar flaggan i ladan.
Status: KLART 2026-10-17 kväll (DMX-sessionen, ägaren: 'gör kodfixen nu i båda repona', analyser.ts md5 656c093a i båda): hoppets
decimaltal via h*-fält (agcStep/kickStep/silenceStep/kickRefine/intensityStep/bigStep/dropStep/riserStep/sectionAggStep/fillFrame) och
shIn (sectionHop, 3 anropsställen); computeBpm:s tunga loopar utbrutna (tempoGramStep, offBeatStep, bpmHistSort) och sectionBlock:s
rangberäkning (rankTier) - små metoder med tunga loopar optimeras på loopbudgeten även när den stora deoptas (att lyfta ut SÄLLSYNTA
grenar hjälper inte: ett anrop utan typåterkoppling deoptar också); secScoreSorted = Float64Array som sorteras på plats (var number[] +
sort(jämförare): ~10 kB per block), RANK_W-termerna i fasta objekt + metod, särdragsvektorn återanvänds, alignScore: modulfunktion
alignAt + ring av 4 resultatobjekt. Bevis: DMX konsertReplay 24/24 byte-identiska, natt --snabb mixar identiska; lotus analyserParity 0
avvikande hop (450 000 hop x 4 varianter: plain, --grid, --split inline, hint/reset), bänken live 396/503, syntet 6/8, on-beat 0,84.
Skräp i stabilt läge (lang-1014): DMX analysatorn 183 -> 39 kB/s utan flagga, 21 med (motorn 450 -> 112 med flagga); lotus (lotus-
profil, ingen split) 72 -> 18 kB/s. KVAR (lotus): riserStep 6,7 + agcStep 5,8 kB/s bara i lotus mic-läge (ingen synlig allokering, inte
fältform - prövat), computeBpm 4-14 och dropStep 4-15 kB/s = otolkad tid efter deopt (flaggan halverar). Ej deployat någonstans.

## ÖPPET 2026-10-16 Analysatorns skräp (GC) – huvudtrådens näst största källa
Vad: DMX-ägaren jagar GC-stopp (live GET /api/perf: ~15 minor-GC/min, längsta 6–10 ms; stora 27–63 ms bara de första minuterna efter
start). Allokeringsprofil (DMX tools/allocProf.mjs = V8:s samplande heap-profilerare inkl. bortstädade objekt, konsertReplay --delad-cfg
--step 5, lang-20261014T161434.wav): motorn 1,9 MB per s ljud över 10 min, analyser.js 29 % (560 kB/s) - de första 3 min 1,4 MB/s (39 %,
uppvärmningen). Per funktion (10 min, kB per s ljud): bigStep 152, computeBpm 106, process 100, scoreEnv 46, sectionBlock 41, dropStep 39,
fillFrame 15, intensityStep 14, riserStep 11, kickStep 9; under uppvärmningen process 292, bigStep 471, scoreEnv 162, computeBpm 152, dropStep
106. Var (konkret, sectionBlock): per block `new Float32Array(FP2_DIM)` (REPEAT-grenen), `terms`-arrayen av objekt + closuren `add` per block,
`D.slice().sort(...)` per block. Övriga funktioner: profileraren ger funktion, inte rad - kör `node tools/allocProf.mjs <wav>` i dmx-control
för samma lista. DMX kör analysatorn i HUVUDTRÅDEN (ingen DMX_ANALYSER_SPLIT), så dess skräp delar GC med renderingen.
Önskat: återanvända buffertar/objekt i de heta stegen (bigStep, computeBpm, process, scoreEnv, dropStep) och i sectionBlock, bit-identiskt
(paritet + bänk 396/503). Målet är färre minor-GC per minut, inte ändrade värden.
Status: TAGET 2026-10-17 (lotus-morgonagenten): allocProf på pop_ladan 240 s bekräftar ordningen (bigStep 280, process 210, dropStep 118, scoreEnv 114, computeBpm 88, sectionBlock 49 kB/s). Men bigStep/scoreEnv/dropStep har INGA explicita allokeringar (alla band-/onset-buffertar är Float32Array, inga slice/map/objekt) och --trace-opt/--trace-deopt (120 s) visar att de heta funktionerna ligger i TurboFan i stabilt läge (deopt var ~10–20 s: dropStep 'insufficient type feedback for generic named access' 5×, bigStep/process 'wrong map' = Analyser-objektets form ändras efter konstruktorn, lazy deopt vid bytecode 13 i bigStep). Profilerarens rad = funktionens startrad, inte allokeringsraden ⇒ resten är troligen HeapNumber-boxning eller inlinade anropades skräp (Array.prototype.sort kopierar till arbetsarray: templStep/sectionBlock sorterar ~600 element per block). Nästa steg (ej gjort): A/B med --trace-gc (scavenges/min) mot en dist där Analyser-fälten initieras i konstruktorn (stabil form) resp. sort ersatt med Float64Array-scratch + subarray().sort(); bit-identiskt kräver samma jämförelseordning (NaN fritt).

## ÖPPET 2026-10-15 miniDropCount räknar i skurar var 0,4-0,5 s (27 st på 13 s)
Vad: ladans live-events 10-14 18:14 (tools/ladan-2026-10-14/lang-20261014T161434.events.json, kolumn miniDropCount, fr.miniDropCount)
ökar 27 gånger på 288-301 s och 18 gånger på 333-337 s (var 0,23-0,5 s), och var ~2,5 s genom hela 448-568 s (50 st) - totalt 140 på
10 min mot ägarens 5 minidrop-markeringar. Ingen av skurarna sammanfaller med en markering. Var: miniDrop-räknaren (spärr/omladdning
saknas?). Material: filen ovan (wav + events). Önskat: en minidrop per händelse (spärr ~1-2 s) så att fältet går att använda som källa.
DMX:s minidrop-look tar inte fältet direkt i dag, så inget ljusfel - men det gör fältet oanvändbart. (Not, fyndet 2026-10-11 'kort break
-> minidrop': DMX har nu opt-in DMX_FLANK_SHORT_S på sin egen flank, 9f417c0 - inget analysatorbehov kvar där.)
Status: DMX-PROFIL 2026-10-15 (lotus-morgonagenten): spärren finns redan i den delade koden — MINI_SPACING_MS (analyser.ts, kräver nowWallA − lastMiniMs > MINI_SPACING_MS) — men DMX-profilen sätter den till '1' (src/analyserProfile.ts:59, 'utan spärr', ägaren i ladan 2026-10-08; var 12000). Skurarna 0,23–0,5 s är alltså profilvalet, inget analysatorfel. Önskas 1–2 s: profilratten (nattagentens/ägarens), ingen kodändring.

## ÖPPET 2026-10-14 Sektionen efter låtgräns: 20 s 'intro' hårdkodat (17 % av ladans tid), högt->break->högt-fladder
Vad: DMX-nattagenten 10-14 (ägarens prio 1: sektioner som håller) mätte 23 lang-*.wav (141 min, tools/sektionMatt.mjs + sektionStat.mjs,
analysatorn + låtgränsdetektorn som konsertReplay): 441 inre sektioner, 23 % kortare än 8 s; fladder (kort, ej build, ej nollning)
41 st, mest high>break>high (18) och high>low>high (6). 'intro' står 17 % av tiden: efter varje hintTrackChange (49 låtgränser, 3,5/10 min)
är sektionen 'intro' tills secBlkDb har 20 block (analyser.ts ~1371) - en falsk låtgräns ger 20 s intro mitt i en refräng.
DMX löser fladdret i profilen (prov: DMX_SECTION_RUN=5 + DMX_SECTION_RUN_IN=3 -> fladder 41 -> 17, byten 3,1 -> 2,3/min, high-start
oförändrad, build 13 % oförändrad). Var: sectionReset/rangens 20-blockskrav, RANK_RUN. Material: tools/ladan-2026-10-11/lang-*.wav.
Önskat: (a) efter en låtgräns: ta med de senaste ~20 s blocken (eller deras fördelning) i stället för att börja om helt - då blir en falsk
gräns ofarlig för sektionen; (b) överväg RUN 5 / RUN_IN 3 även för lotus om ni ser samma fladder.
Status: KLART 2026-10-14 lotus 4a008a5 (lotus-morgonagenten): (a) byggd som opt-in <prefix>SECTION_CARRY=N (de senaste N blocken niva/tathet/klang bars over hintTrackChange-nollningen). sektionMatt+sektionStat pa alla 23 lang-*.wav (DMX-profil): CARRY 0 -> 20: tid intro 17 -> 10 %, sektioner < 8 s 23 -> 20 %, korta build 34 -> 23, men byten 3,12 -> 3,33/min (fler etikettbyten, low 24 -> 28 % av tiden). Flagga av = paritet 0 (33 750 hop). Resterande intro = 10 s tystnad (sectionReset) och inspelningsstarter. Att prova DMX_SECTION_CARRY=20 (ihop med RUN 5/RUN_IN 3) i profilen ar nattagentens/agarens val; lotus far riktiga latbyten fran Sonos och behaller 0 (drop-grinden hanger pa 'intro'). (b) RUN 5/RUN_IN 3 for lotus: ej provat i dag.

## ÖPPET 2026-10-13 Tempohopp inom låt i ladan: 2,9 klockbyten/låt, 43 % av tempona står < 8 s
Vad: DMX-nattagenten 10-13 (taktsäkerheten, ägarens punkt 4) körde alla 23 lang-*.wav (141 min, 64 låtar mellan LATGRANS) genom
konsertReplay --delad-cfg --step 5 (som live, se mätfälla 47/48 nedan): analysatorns bpm byter 3,2 ggr/låt (2:3 24, 3:4 38, 'nära'
4-19 % 117, annat 24, oktav 0), taktklockan följer (2,9/låt), 74 % av musiktiden på låtens vanligaste tempo, 38 utflykter som går
tillbaka till förra tempot (21 kortare än 8 s). DMX-sidan prövade två ersättare mot katalogfacit (tools/taktKorpus.mjs, frozen6, 161
klipp, klockan 81,5 % rätt): (a) kickarnas fasspridning väljer 3/2, 2/3, 4/3, 3/4 av analysatorns tempo -> 79,9 % (shufflelåtar har
kickar på triolens 2/3 och drogs till 3/2); (b) klockan tar ett nytt tempo först efter 4 s (om inte kickarna passar det bättre) ->
75,5 % (varje klipps första korrigering 4 s senare). Båda förkastade - tempovalet måste göras där tempogrammet finns.
Fynd om kickarna: på ladans material kommer kickdetektorns kickar sällan på varje slag (en kick 1 slag tidigare: ~0 %, 2 slag
tidigare: 82 % median på rätt tempo) - mönster som 314/416/315 ms vid 114,5 BPM (3 kickar per 2 slag, exakt periodiska över 2 slag).
Var: tempovalet/låsbytena (lock votes, TEMPO_SHIFT 'nära'-byten, ghost/2:3-vägarna). Material: tools/ladan-2026-10-11/lang-*.wav,
tools/frozen6 (+ tools/taktKorpus.mjs som dömer både analysatorn och taktklockan som live). Önskat: färre 'nära'-byten och utflykter
inom låt (ett tempo som håller >= 8 s), utan att korpusens 81,6 % sjunker.
MÄTFÄLLOR för er bänk (samma fil i båda repona): 47 - live får analysatorn MOTORNS cfg (beatSrc.beat = taktklockan -> kickgrinden och
taktfasen är på), alla DMX-bänkar gav en kopia (cfg.beat null); 48 - setVirtualClock(EPOCH + t) ger wallNow = 2*EPOCH + t, så
kickAtMs låg 1,7e12 ms före Date.now() i bänkarna: klockans fas efter varje tempobyte och effekternas slag hamnade en godtycklig,
tempoberoende bit från kickarna (128 BPM: 0,67 slag). Med båda rättade återger replay live-tilliten (p10/25/50/75/90 0,29/0,33/0,41/
0,62/0,68 mot live-loggens 0,29/0,33/0,38/0,59/0,67).
Status: TAGET 2026-10-14 (lotus-morgonagenten): mattfallorna 47/48 noterade; tempovalet/'nara'-byten bankas mot taktKorpus.mjs + korpusen i en kommande morgon.

## ÖPPET 2026-10-12 frame.buildUp är död (0,000) även i sektion build
Vad: nattagenten 10-12 körde analysatorn (dist, DMX-profil, virtuell klocka) över lang-20261011T191741.wav (10 min, ladans nivå, 81 s
sektion build) och pop_ladan.wav: buildUp medel 0,000 i ALLA sektioner, max 0,00 resp. 0,13 (low), andel > 0,3 = 0 %. Kommentaren vid
bandDb (analyser.ts ~979) säger att p50 = p90 = 0 skulle vara fixat - det är det inte på det här materialet. Följd: DMX ersatte buildUp
med motorns eget förlopp (32 slag från build-lookens start, 287bdc4) och analysatorns egna regler som läser buildUp (label 'build' vid
buildUp > 0,5, rising-regeln > 0,35, DROP_CALM_BUILD) är i praktiken av. Var: buildUp/novSlow/novBaseline (riser). Material:
tools/ladan-2026-10-11/lang-20261011T191741.wav (+ 193430, 112342 som har builds med drop), tools/pop_ladan.wav. Önskat: en buildUp
som stiger 0 -> 1 under en riktig uppbyggnad (risers, virvel, filtersvep) - eller beslut att fältet tas bort ur rutan.
Sidoobservation (DMX-profilens sak, inte er): dropfire edgeAgo 256/299 ms på kvällens inspelning = ägarens 'sen' drop.
Status: TAGET 2026-10-12 (lotus-morgonagenten): orsaken mätt på lang-20261011T191741 (dist, gain-lås 1): riserStep kräver lvlSmooth > 0,3 (uppfyllt 6 % av tiden på ladans nivå, p90 0,28) OCH novSlow > 0,45 absolut (novSlow p90 0,20 — tröskeln är kvar från bandLvl-skalan; i 'build' är novSlow−baslinje p90 0,013) ⇒ buildUp max 0,03. Ersättare prövad offline på alla 22 lang-*.wav 10-11 (8 s före varje dropfire mot allt > 12 s från drops, n 1777/24805): 2 s-mot-8 s-stigning i bandDb helband AUC 0,55, höga band 0,56, låga 0,53, dagens novelty 0,45 — ingen signal värd en flagga. Förslag: behåll motorns förlopp (287bdc4); att ta bort fältet/reglerna ur rutan är ägarens beslut.

## ÖPPET 2026-10-11 Riktiga drops med kort break blir minidrops efter BODY_GONE_MIN_MS 4000
Vad: ägaren valde 10-10 "hellre färre drops" -> DMX-profilen BODY_GONE_MIN_MS 2000 -> 4000 (megamix 27 -> 15 riktiga, minidrops tar resten).
Ladans 10 dropklipp (tools/ladan-2026-10-10, drop vid 15,0 s) går inte att använda som facit: klippen börjar 15 s före dropen, så
analysatorn ser aldrig kropp -> borta -> tillbaka (dropFacit.mjs: 0/10 fulla, minidrop vid dropen 10/10). Material: långinspelningar
(lang-*.wav, knappen "Spela in 5 min" i /setup) när ägaren tagit några. Önskat: mät breaklängden före riktiga drops på material med
historik; är 4 s fel för vanlig pop? Bara DMX-profilen berörs om svaret är ett annat värde - ingen ändring i delad kod väntas.
Status: DMX-PROFIL (lotus-morgonagenten 2026-10-13): BODY_GONE_MIN_MS är en profilratt, nattagentens.

## ÖPPET 2026-10-11 Analysatorns uppvärmning de första ~15 s
Vad: nattagenten (mätfälla 44): frame.intensity stiger +0,26 under de första 15 s i varje 40 s-korpusklipp, vilket vände korpusens
energiR till -0,39 (från 15 s: +0,27). I riggen märks det vid motorstart och efter långa pauser. Var: intensity/tierEma-baslinjen.
Material: frozen6-korpusen (dmx-control tools/frozen6). Önskat: kortare inlärning eller bättre startvärde, om det går utan att
läsningen blir instabil. Låg prioritet - live körs motorn i timmar.
Status: TAGET 2026-10-13 (lotus-morgonagenten): mätt per sekund på bench-manifestet (lotus-stil, AGC fri). Två delar: (1) MATERIAL — dropklippen (_dmu, 91 st) har sin drop vid 15 s, därav steget 0,66→0,87 vid 15 s; (2) ÄKTA ARTEFAKT — på 34 klipp utan drop: intensity 0,19 → 0,01 (1 s) → 0,73 (13 s) och ligger kvar 0,60–0,69 till 29 s i stället för ~0,5. Orsak: intensityFloor/Ema startar på 0,5, lvlSmooth dyker till 0,26 vid 3 s (AGC/nivåns egen start) och stiger till 0,40 vid 13 s; golvet följer dykningen med tau 3 s under 8 s-värmen och kryper sedan med ~0,0025/s ⇒ ~40 s för 0,1. Gain-lås ändrar inte bilden. Längre värme (15/25 s) flyttar inte 0–14 s, sänker 15–29 s 0,72→0,66/0,56. Förslag (opt-in, ej byggt): sätt Ema=Floor=lvlSmooth vid första aktiva hopet + värme tills |Ema−Floor| < spread i stället för fast 8 s; bänkas mot sektionsbanken (tier) + energiR. activeMs nollas vid varje tystnad ⇒ samma värme efter låtbyten med paus, så det är inte bara ett korpusfenomen.
