# analyserClock.ts - anteckningar

Kommentarerna som stod i koden fram till uppdelningen 2026-11-14, ordagrant, under den konstant, det fält eller den metod de hörde till.
Koden har bara en kort etikett kvar per deklaration. Nya anteckningar skrivs här, inte i koden.

## Filhuvudet

```text
TAKTMATNINGEN (utbruten ur index.ts 2026-10-10, ordagrant): fasprediktionstilliten, den löpande takten (10-19, ersatte kick-PLL:en och fasfoljaren), taktfasen
(ettan) och coasten som haller cfg.beat (ankare + bpm + konfidens) levande per hop. Samma kod i motorn OCH i bankarna -
matfalla 43: bankerna satte cfg.beat.anchorMs = fr.beatAnchorMs varje hop, sa ctx.beatFrac hoppade 0,00 -> 0,45 pa 27 ms per slag
(halverad effektklocka + ankarhopp) och takteffekternas toppar ritades aldrig i banken. Klockan ar Date.now() (banken byter den per hop).
```

## Toppnivå

### import

```text
 ANALYSATORNS KLOCKA (a7r entempo, ägaren 11-09: "allt skall ju ligga i analysatorn"): flyttad hit ur beatFeed.ts ORDAGRANT. Filen hör
till analysatorn (analyser.ts importerar den, samma delade fil i lotus) och drar inte in något motorspecifikt: loggbrytaren kopplas
in utifrån (setClockLog, DMX: beatFeed.ts -> quiet.ts), MIN_BEAT_CONFIDENCE/GRID_EARLY_MS bor här (beatClock.ts re-exporterar), cfg är
klockans eget utfall (ClockCfg = { beat, beatErr }, samma form som motorns cfg). Var klockan körs avgör profilen på ETT ställe
(sys.BEAT_FEED, se analyser.ts clockMode).
```

### MIN_BEAT_CONFIDENCE

```text
 Klockans grind: under denna tillit räknas takten som osäker (hasBeat i beatClock.ts).
```

### SYNC_ERR_FRAC, TRUST_TAU_MS

```text
 TILLITEN TILL TAKTEN (2026-11-11, EN källa för båda systemen: frame.beatTrust; förr räknad i DMX effects.ts och i lotus piEngine).
 Klockans tillit över grinden (ramp MIN_BEAT_CONFIDENCE .. +0,37), nerdragen av ihållande fasfel (> SYNC_ERR_FRAC av ett slag) och
 utjämnad över TRUST_TAU_MS. Förr 0,06 per RENDERRUTA i DMX = 81 ms vid rastrets 200 Hz (bildfrekvensberoende); nu i tid, per hop.
```

### GRID_EARLY_MS

```text
 Effektklockan ligger så många ms före vikningstoppen (se beatClock.ts).
```

### setClockLog()

```text
 Systemets loggbrytare (DMX: quiet.ts isLogOn) - analysatorn själv loggar inget utan den.
```

### ClockCfg

```text
 Klockans utfall: rutnätet (ankare, bpm, tillit) och UI:ts fasfel. Motorns EngineConfig har samma två fält.
```

### GRID_ON_CONF

```text
COAST: konfidensen dippar i breakdowns/brus men TEMPOT är oftast fortfarande rätt.
Släpper vi gridet direkt hoppar effekterna till kick-drift och glider tillbaka när
takten kommer igen. Vi håller därför gridet fri-rullande en stund innan vi ger upp.
```
På raden: tydlig takt igen → coast avbryts


### GRID_COAST_MS

På raden: så länge håller vi gridet på svag konfidens


### TRUST_REPEAT_BEATS, TRUST_REPEAT_TOL

```text
TILLITEN = MÖNSTRET ÅTERKOMMER (natt 10-13, ägarens punkt 4 'taktsäkerhet', 'varje slag ska kännas'). Förr räknades en kick
som bevis bara om den låg inom ±0,25 slag från gridets slag. Mätt på katalogkorpusen frozen6 (161 klipp, taktklockan mot
facit, var 0,25 s): det måttet var SÄMRE än slumpen på att skilja rätt tempo från fel (AUC 0,43 - rätt klocka median 0,41,
fel klocka 0,48), för ±0,25 slag täcker halva cirkeln (slumpkickar ger 0,5) och synkoperade mönster räknas som miss.
I ladan (23 inspelningar, konsertReplay med MÄTFÄLLA 47+48 rättade) stod tilliten i cykeln 0,29/0,33/0,38 = träff-miss-miss
42 % av tiden: kickmönster med 3 kickar per 2 slag (314/416/315 ms vid 114,5 BPM) - exakt periodiska över 2 slag, klockan
rätt, men 2 av 3 kickar 'av'. Nu räknas kicken som bevis om den ligger på slaget (som förr) ELLER om en kick kom exakt TVÅ
SLAG tidigare (±6 % av slaget): då förutsäger gridets tempo mönstret, vilken plats i takten kicken än har. Korpusen: rätt
klocka median 0,41 -> 0,95, fel klocka 0,48 -> 0,87 (AUC 0,43 -> 0,64: måttet gynnar inte längre fel tempo). Tempot rörs inte:
Coastens tempo-nollning läser fortfarande fasträffarna (pllConf) - med det nya måttet
även där nollades tempot mer sällan och korpusens klocka föll 81,5 -> 76,7 % (fel tidiga lås hölls kvar).
DMX_TRUST_REPEAT=0 = gamla måttet (bit-identiskt).
```

### TRUST_UP, TRUST_LEAK_MS

```text
 PROVRATTAR 2026-11-07 (dagkörningen; ladan 11-06: 'efter drop tog det 2-3 s innan den tydligt visade takten igen'): bara för bänken,
 osatt = dagens värden (json-identiskt). DMX_TRUST_UP = tillitens steg per kick UPPÅT (0,12 = som i dag, ned alltid 0,12);
 DMX_TRUST_LEAK_MS = hur fort tilliten läcker i ett break utan kickar (4000 = som i dag; längre = tilliten finns kvar när dropen kommer).
 DMX_BREAK_HOLD_MS/DMX_BREAK_RESTORE_MS (nattens förkastade patch prov/breakhold-20261107.patch) är åter inlagda som rattar för proven.
```

### ONSET_WIN_MS, ONSET_EVERY_MS, ONSET_BINS, ONSET_RING, ONSET_MIN_PEAK

```text
 LÖPANDE TAKT - RUTNÄTET PÅ LJUDETS SLAG (ägaren 10-19: 'allt i bakgrunden så snabbt som möjligt, effekten får info om exakta
 takten så snabbt det går'). Mätt i bänken (showTight --step 5, pop): kickbandets anslag (frame.onset.kick) är tydligt periodiskt, men
 rutnätets slag låg 40-160 ms fel och gled (tempo 1-1,5 BPM fel) - kick-PLL:en drar 10 % per kick och 'kick' fyrar på kylningens kant.
 Här viks de senaste ONSET_WIN_MS av kickbandets anslag (sedan 10-27 basens dB-stigning, se nedan) var ONSET_EVERY_MS på tempon kring det låsta (+-2,5 %), och rutnätet sätts DIREKT på
 toppen (fas + tempo, slagindex bevaras). Sökningen sker kring rutnätets eget tempo OCH analysatorns (nytt tempo/låt); utan tydlig
 topp (< ONSET_MIN_PEAK x medel) rullar rutnätet vidare som det är. Ersatte kick-PLL:en, TEMPO_PERSIST och fasföljaren (enda vägen).
```

### FEED_RISE_HOPS

```text
 BASENS STIGNING (STANDARD i ladan 10-27, ägaren: 'ser bra ut'; backup-tagg backup/fore-feed-rise-2026-10-27; gallop-felet i videon 10-26):
 onset.kick är klampad 0/1 (fynd 10-22) och mättar på hela bas-svallet i pumpande musik - vikningen lade då rutnätet där ettorna var
 tätast, mätt +120..170 ms efter kickens ansats (gallop: grupp A tändes +130 ms, B:s 0,75-slag på kicken). Nu viks basens (sub+kick,
 specAbs) STIGNING i dB över FEED_RISE_HOPS hop (omättad, toppar på ansatsen): gridet -32 ms (showLead före), taktKorpus 67,1 -> 83,2 %.
```

### BREAK_HOLD_MS

```text
 TVÅ RUTNÄT (10-28) ÄR BORTA (r0 entempo): analysatorns skuggrutnät och dess resetTempo/resetBar finns inte längre - se update().
 TAKTEN GENOM BREAKET (STANDARD 2026-11-08 = 20000, ladan 11-07 godkänt; förr opt-in DMX_BREAK_HOLD_MS, natt 2026-11-07; ladan 11-06: 'efter drop tog det 2-3 s innan den tydligt visade
 takten igen' - ws-loggen: analysatorns bpm 0 i 14,6 s av breaket, effektklockan nollades och låste 4,2 s efter dropen). Med > 0:
 (1) när analysatorns bpm blir 0 rullar effektklockans rutnät vidare på sitt tempo i högst så många ms (tilliten läcker som förr, så
 takteffekterna lugnar sig i breaket); kommer bpm tillbaka på ett annat tempo (inte samma oktav +-4 %) tas det nya som förr;
 (2) första kicken efter > 1,5 s utan kickar (dropen) som ligger inom +-0,25 slag: fasen sätts på kicken och tilliten tas upp till
 värdet före tystnaden (rutnätet hade redan rätt tempo). 0 = av (bit-identiskt). Bara effektklockan, inte analysatorns skuggrutnät.
```
På raden: r0: hållet = klockan rullar alltid vidare (analysatorns bpm 0 finns inte längre); kvar som (2):s fönster


### BREAK_RESTORE_MS

```text
  // STANDARD 2026-11-08 (ladan 11-07: godkänt; backup-tagg backup/fore-tio-standard-20261108); förr opt-in DMX_BREAK_HOLD_MS
```
På raden: (2) för sig (prov: hållet av, bara dropens upptag)


### BAR_DECAY, BAR_MIN, BAR_MARGIN, BAR_W_BASS, BAR_W_BACK, BAR_WIN0, BAR_WIN1, BAR_RISE_HOPS

```text
 ETTAN I EFFEKTKLOCKANS RUTNÄT (a5, arenan tvavagar 2026-11-08). Förr flyttades effektklockan med analysatorns barShift, men den
 räknas mot ANALYSATORNS rutnät (TVÅ RUTNÄT, skuggan) - de två rutnätens slagindex skiljer ett godtyckligt antal slag, så ettan
 satt rätt bara när skillnaden råkade vara hela takter (testDownbeat-signalen: 23 % rätt, slumpen 25 %). Nu har effektklockan
 en EGEN taktmodell i den långsamma vägen: fyra hypoteser (taktens fyra platser i rutnätets slagindex) körs parallellt med långt
 minne (BAR_DECAY per slag, ~25 takter). Varje slag mäts i fönstret BAR_WIN0..BAR_WIN1 slag runt rutnätets slag: basens (sub+kick)
 linjära stigning (tyngsta slaget = ettan), basgångens stigning (specAbs.bass: basnoten byts på ettan) och virveln/diskanten
 (backbeat på 2 och 4 talar MOT platsen). Platsens andel av varje särdrag summeras; vinner en annan plats med marginalen BAR_MARGIN
 efter minst BAR_MIN slag blir den ettan. Ettan läggs bara i det PUBLICERADE ankaret (cfg.beat = inre rutnät + barOff hela slag):
 rutnätets egen sökning (onsetStep, vikningen mot ankaret) körs på det inre ankaret precis som förr, så tempo och fas är
 oförändrade - en flyttad etta stör aldrig vikningen.
```

### TG_HOLD

```text
 HELA TEMPOOMRÅDET (2026-10-30, ägaren: 'få rutnätet att ha rätt tempo'): effektklockans andra sökcentrum var analysatorns bpm, som
 i en mix står fel länge efter ett låtbyte (tempoMix: rätt 63 %, icke-harmoniskt fel 20 %, lås median 6 s). Nu viks basens stigning
 över ALLA tempon 80-160 (1 %-steg, ett tempo var FULL_EVERY:e hop = ett varv per 0,6 s, minst FULL_MIN_N värden = 3 s ljud); vinnaren
 och dess harmoniska syskon (FULL_SIBLINGS) döms sedan på basens topp x virvelns/diskantens topp (2/3- och 4/3-felen i shuffle) och
 domarens val blir andra sökcentrum (utan topp: analysatorns bpm som förr). Aldrig oktavbyte (80-160 rymmer både slaget och halvslaget:
 en låt på 160 hoppade annars 160 <-> 80), och ett tempo kring andra centrum måste slå klockans eget med FULL_MARGIN (annars hoppar
 klockan mellan harmoniska tvillingar). tempoMix --all (161 klipp, 99 min): klockan rätt 75,8 -> 84,5 %, lås efter låtbyte median
 5,1 -> 2,8 s, rätt inom 5 s 78 -> 127/161, aldrig rätt 9 -> 2, tempohopp inom låt 0,90 -> 0,57/min. taktKorpus (161 klipp var för
 sig): klockan 81,7 -> 91,3 %, tempobyten 1,29 -> 1,20/klipp. Provat och förkastat: marginal 1 (1,23 hopp/min, gridfasen på kvällen
 10-21 95 -> 27 %) och 1,25 (0,95/min, 72 %), bekräftelse två varv, 0,5 %-steg (längre varv), HMM-utjämning av varvets vinnare
 (sämre), samma tempo till analysatorns rutnät (sektion upp 2,6 -> 4,1 s, som 10-29). Analysatorns rutnät orört.
 EN TEMPOSÖKNING (arena tvavagar a1, 2026-11-08; ersätter HELA TEMPOOMRÅDET 10-30 + andra sökcentrumets skanning + klockans egen
 vandring): ETT ackumulerat tempogram i långsamma vägen som klockan läser. Förr sökte tre saker tempo var för sig - helsökningen
 (70 tempon à 1 %, ett varv utan minne, vinnaren flackade 97/145/84/126 mellan varven), andra sökcentrumet (+-2,5 % kring den) och
 klockans egen skanning (+-2,5 % kring sitt tempo var 250 ms, kunde vandra 122 -> 143 på 5 s). Nu: TG_K hypoteser på ett CIRKULÄRT
 log-rutnät över en oktav (80 * 2^(k/TG_K), 0,5 %-steg, 80 och 160 är grannar), TG_PER_HOP per hop (ett varv per ~0,37 s). Poängen per
 hypotes = BASENS vikning x VIRVELNS/DISKANTENS vikning, var och en (topp + värdet ett halvslag efter toppen) / 2 / medel: halvslaget
 (åttondelarna) är beviset som skiljer slaget från 2/3- och 4/3-fantomerna (en fantom har ingen topp mitt emellan sina slag). Poängen
 EMA:as per hypotes (TG_A per varv), vinnaren = tempogrammets topp (parabel i log-rutnätet), klämd till [80, 160). Klockan skannar
 sedan bara fint kring vinnaren (+-1,25 % i 0,25 %-steg) för fas och fintempo. Offline på basens signaler (a1/ev.mjs, 50 klipp + mixen):
 rätt tempo 88,9 -> 99,0 % (klipp) och 88,5 -> 97,8 % (mix), tempobyten i mixen 66 -> 2 (bara basens vikning: 89 / 88 %).
 KRONAN (r0): en annan topp måste slå det regerande tempots poäng med så mycket (r0/verktyg: 1,3 och 1,4 gav ned_s 2,80, 1,35 1,90 - kniveggen).
```

### TG_SIB

På raden: 4:3 och 3:2 i rutnätets steg (TG_K = 139 per oktav)


### KICK_PHASE_MS

```text
 EN KÄLLA (r0): analysatorns kickgrind på klockans inre rutnät + denna fasta, mätta offset (a1 entempo: analysatorns kickar ligger
 median +30..+65 ms efter rise-rutnätet på 6 fönster ur övningens lång-filer).
```

### TG_GRID_EXTRA_MS

```text
 a8r (ladan-provet 11-08, punkt 3): rutnätet 5 ms tidigare utöver GRID_EARLY_MS, ljusets försprång orört -> ljuset 5 ms tidigare.
```
På raden: oktavkanten +-3 %; övre oktaven bara om analysatorns bpm ligger nära den (>= 148); fullt fönster (~4,8 s)


### TG_WIN_MS, TG_FULL_N, TG_FWIN_MS, TG_FFULL_N, TG_FA, TG_SW_STEPS, TG_SW_N

```text
 TEMPOGRAMMETS FÖNSTER OCH MINNE (a2r entempo): 3,5 s och 0,4 per varv (förr 5 s / 0,21 = ONSET_WIN_MS). Efter en låtskarv tog
 toppen ~4 s att byta (förra låten fyllde fönstret och minnet), mätt på 10 låtpar (a2r/verktyg/par.mjs): lås median 4,1 -> 2,4 s;
 M1 (--mat, snabbt läge när fasträffarna < 0,7 = i praktiken alltid i pop): mix_las 3,49 -> 2,10, mix_hopp 0,10 -> 0,03, låtgränsen 9 -> 11 av 15.
 TVÅ MINNEN I SAMMA SÖKNING (a2f entempo): tempogrammet bär ett LÅNGSAMT minne (5 s / 0,21 = r0: stabil topp -> fasen, gridfel
 r0 15,2 mot a2r 22,1 ms) och ett SNABBT (3,5 s / 0,4 = a2r: låser om på ~2 s efter en skarv). Klockans tempo är alltid det
 långsammas topp; pekar det snabba på ett annat tempo (> TG_SW_STEPS steg, se TEMPOHOPPEN) TG_SW_N varv i följd ersätter
 det snabba minnet det långsamma, så toppen byter direkt; tills det långsamma fönstret är fullt (kallstart, relock vid låtgräns) styr
 det snabba (a2f M1 utan det: upp_s 1,35 -> 2,85 = lang1021-skiftet 2,3 s efter låtgränsen). Samma hypoteser, samma poäng - två EMA:er.
 TEMPOHOPPEN (2026-11-10, lotus i källaren: 125 -> 82-86 -> 125 inom sekunder, tilliten på golvet; backup-tagg backup/fore-tempohopp-20261110):
 bytet krävde förr bara att det snabba pekade ANNANSTANS två varv (0,74 s); kronans marginal gällde bara exakta 4:3/3:2-syskon (±1 %).
 Det snabba minnet (3,5 s) följer fills och breaks, och fantomerna ligger ofta 1,38-1,46 x eller 1-3 % bredvid 3:2: 359 av 528 tempobyten
 i 128 min ljud kom den vägen, de flesta studsade tillbaka. Nu måste det snabba minnets topp slå det regerande tempots poäng i samma
 minne med TG_HOLD (kronan) för ALLA tempon. En ny låt utan låtgräns klarar det: förra låtens poäng dör ur det snabba fönstret på ~3 s.
 Mätt (tools/natt/tempohopp-2026-11-10.md): utflykter (tempot lämnar och kommer tillbaka inom 15 s) 1,45 -> 1,00/min, tid i utflykt 4,6 -> 2,9 %.
```

### TG_NOISE, TG_NB, TG_SW_P, TG_SW_G, TG_HL_A, TG_LOCK_N, TG_LA, TG_KNOWN, SCAN_HOLD

```text
 HÅLLEN TOLKNING EFTER SÄKER LÅSNING (arena klocka2 k4, 2026-11-12; bygger på prov/flerhypotes-fh1-20261110.patch). Klockan har två
 lägen. START (tgR < 0: kallstart, efter låtgräns, tystnad eller ett bevisat byte): dagens snabba väg oförändrad (två minnen, kronan).
 När tempogrammets val stått på samma hypotes (+-2 steg) OCH över brustaket i TG_LOCK_N varv i följd (~3 s = 1-2 takter) är låsningen
 SÄKER och hypotesen blir REGENT (tgR). HÅLLET: alla TG_K hypoteser följs med var sin bevissumma (tgD); varvets bevis = log av poängen i
 det korta fönstret (bästa av grannarna +-TG_NB) minus BRUSTAKET (varvets median + TG_NOISE). Utmanarna summerar sitt bevis från ett
 golv = TG_SW_P + TG_SW_G x regentens HÄLSA (EMA av dess överskott); regenten byts först när en utmanares summa gått om = bevis över
 flera varv (takter), inte en enstaka topp i ett fill. Ett bevisat byte är en NY tolkning/låt: tempogrammet sås ur varvets poäng och
 klockan går tillbaka till START tills nästa säkra låsning. Mätning av bevis över tid, ingen utjämning av det publicerade tempot.
```

### TG_SONG_A

```text
 LÅTENS MINNE (2026-11-13, ägaren: "lös källarväxlingen med Sonos låtgräns"). När värden har en SÄKER låtgräns (an.boundSure: lotus
 spelar ett Sonos-spår som är EN låt) är allt mellan två låtgränser samma låt, och ett nytt tempo utan låtgräns är en annan läsning av
 den - inte en ny låt. Då blir det långa minnet (tgAccL) LÅTENS: medelvärdet av varje varvs poäng sedan låtgränsen, med horisonten
 1 / TG_SONG_A varv (~60 s) i stället för ~9 s, och när det hört lika länge som sin gamla horisont (1 / TG_LA varv) väljer DET tempot.
 Hållet, kronan och de två minnena vilar - de finns för att skilja ny låt från samma, och det har låtgränsen redan sagt. Fintempo,
 oktavkant, topprösten och vittnet går som förr. Utan säker låtgräns (DMX, mixar, radio, tv) är allt som förut.
 HORISONTEN är skyddsnätet: en låt som verkligen byter tempo (eller en mix som värden tagit för en låt) följs efter 30-45 s i stället
 för aldrig (megamixen som EN låt: fel tempo 294 av 600 s utan horisont, 120 s med 60 s, 72 s med 30 s).
 Mätt på källarklippen med Sonos-låtbytena inlagda (11 klipp, 27 min, byten > 4 % utanför låtgräns): alla 2,06 -> 0,60 /min, de 7 som
 återskapar växlingen 3,34 -> 0,85 (30 s: 1,16; 120 s: 0,67; utan horisont: 0,73). Lotus 126 låtar: 117 rätt = oförändrat.
```

### TG_BRK_DB, TG_BRK_MAX_MS

```text
 BREAK OCH DROP ÄR SAMMA LÅT (2026-11-13, ägaren: "vid drop ändras väl aldrig klockan då det alltid är samma låt"). När baskroppen
 ligger DJUPT under sitt tak (an.bodyUnderDb >= TG_BRK_DB: ett riktigt break tar bort basen nästan helt, ett låtbyte bara några dB)
 och tills det långsamma fönstret (TG_WIN_MS) bara rymmer musik efteråt, VÄLJER klockan inget nytt tempo: breakets svaga rytm är
 inget bevis. Minnena fylls på som vanligt och fintempot/rutnätet följer. Högst TG_BRK_MAX_MS i sträck: längre än så är det inget
 break utan en ny låt med tyst början, och då väljer klockan som förut. Hållet armeras först när klockan varit utanför ett break
 efter kallstart eller låtgräns (tgReset), så en ny låt aldrig fryser sin första gissning.
 MÄTT (21 ladinspelningar 10-11, 36 drops utan låtgräns intill; övningsmixen 16 låtar): drops där klockan står fel >= 2 s 13 -> 3,
 tid på fel tempo -8..+10 s runt dropen 10,8 -> 2,7 %; mixen identisk med förut (lås per låt lika). Djupet svept: 8 dB 3,6 % men
 mixens lås 2,8 -> 5,8 s (en ny låt med svagare bas ser ut som ett break), 12: 2,6 % / 3,0 s, 16: 3,3 % (två låtar med baslöst
 intro 13-25 s), 20: 2,3 % (en låt 12 s), 24: 2,7 % utan kostnad, 28: 3,4 %. Längsta håll svept vid 24 dB: 8 s 4,8 %, 16 s 4,0 %,
 30 s 2,7 % (= utan gräns; djupa break före drops varar högst ~17 s + fönstret). Gränsen är bara skydd mot att klockan står kvar
 när basen försvinner länge (taket sjunker 0,15 dB/s).
```

### HV_R, HV_K, HV_N, HV_AGE, TG_OCT_LO, TG_OCT_LO_N

```text
 a3 TOPPRÖSTEN (se peakVote): syskonen, faktor, varv i följd; oktaven under kanten (se tgStep).
```

### PW_RING, PW_WIN_MS, PW_MIN, PW_Q

```text
 TAKTENS SJÄLVLIKHET - ett andra vittne (arena klocka2dmx J1, 2026-11-13). Tempogrammet frågar 'ligger energin PÅ slaget?'. Vittnet
 frågar 'upprepar sig MÖNSTRET när det flyttas 2 och 4 slag?': korrelationen mellan ansatsserien och sig själv förskjuten 2 resp. 4 slag
 av kandidatens tempo, över PW_WIN_MS, basens stigning och diskanten var för sig (fyra tal, summan -4..4). Rätt tempo upprepar sig på
 båda (virveln på 2 och 4, basgången per takt); 4/3-fantomens '2 slag' är 1,5 riktiga slag, 3/2-fantomens '4 slag' är 2,67.
 Vittnet dömer bara mellan klockans tempo och dess SYSKON (4/3, 3/4, 3/2, 2/3), och bara när domen är TYDLIG: den enes mönster finns
 (>= PW_MIN) och är TG_HOLD gånger tydligare än den andres. Sond (joker-sond/analys.py A4, övningsmixen 2230 fönster): tydligt för rätt
 tempo 68,0 %, tydligt för ett syskon 0,04 % (1 fönster), otydligt 32 %; i de 51 fönster där vikningen har fel: 24 tydligt rätt, 0 fel.
 (1) VETO: vill varvets val byta till ett syskon och vittnet är tydligt för regenten står regenten kvar - men bara om regentens mönster
     också finns i fönstrets senare halva (en ny låt i syskonförhållande, övningsmixen 152 -> 102: då är det borta och bytet går som förr).
 (2) RÄTTNING: är vittnet tydligt för ett syskon mot klockans tempo HV_N varv i följd, och tempogrammet inte är säkert på regenten
     (syskonet inom kronans marginal TG_HOLD i det långsamma minnet), byter klockan dit.
 Efter ett tempobyte som INTE är ett syskonbyte (ny låt, låtgräns, kallstart) tiger vittnet i PW_WIN_MS - fönstret rymmer förra takten.
```

### publishPhase()

```text
FAS-PREDIKTIONSTILLIT — landar verkliga trumslag dar rutnatet pastar?

Tempogrammets peak-to-mean (`frame.bpmConfidence`) matte fel sak for det har
andamalet. Tva invandningar, bada mekaniska:
  1. Harmonikerna pa 2L och 3L lyfter medelvardet i namnaren och SANKER
     darmed konfidensen — precis nar takten ar som tydligast.
  2. Hjartslaget behover inte veta hur spetsigt tempogrammet ar, utan om
     rutnatet FORUTSAGER slagen. Det ar en annan fraga.
Den fragan ar redan nastan besvarad: PLL:en raknar fasfelet per kick.

Bevaras: i ett lugnt parti kommer inga kickar, bevisen slutar komma, tilliten
lacker ner och pulsen drar sig undan — samma beteende som forut, men nu med
en principiell grund i stallet for som biprodukt av ett tempogram.
 EN FAS OCH EN ETTA FÖR BÅDA (klocka r0 = a4:s fas och etta): ramens fasfält är klockans PUBLICERADE rutnät (samma ankare som
 DMX:s cfg.beat), aldrig en egen fasanalys. beatPhaseMs = det publicerade ankaret minus offsetMs (lotus GRID_PHASE_OFFSET_MS, 0 i bänken);
 beatPhaseConf = 1 + tillit (= lotusbank --fas klocka). Mätt i lotusbank r0 mot a8:s 'senaste slaget <= nu' + 1/(1 - tillit):
 följare raw 0,96 (23 ms, n 343) / f1-f3 0,98 mot 0,83 (22 ms, n 403) / 0,85; fasen (0,84/15/257) lika. barShift (a4) = klockans
 etta (taktmodellen, DMX ettan 100 %) i slagindex för systemets EGET rutnät `ref` (lotus: motorns _beat via setBeatGrid;
 (idx + barShift) % 4 === 0 = ettan), räknat på klockans slag närmast nu; -1 innan taktmodellen dömt en etta. Ersätter analysatorns
 kick-taktfas (barAcc).
```
Vid `f.beatPhaseMs = b.anchorMs - offsetMs; f.beatPhaseConf = 1 / Math.max(0.05, 1 - (b.conf...`:

```text
a8f D4: lotus on/anti-skala (1 = ingen information) - halvslagsflytten (PHASE_FLIP_CONF 2,0) nås vid tillit >= 0,5
```
Vid `const ir = Math.round((b.anchorMs + j * per - r.anchorMs) / (60000 / r.bpm));`:

```text
klockans senaste slag i ref-rutnätets index
```
Vid `f.barShift = (((((j % 4) + 4) % 4) - ir) % 4 + 4) % 4;`:

```text
ettan = ir - (j mod 4) i ref-index -> (idx + barShift) % 4 === 0 där
```

## BeatFeed

### trustAt

På raden: dirigenternas tillit (trustStep), stegad sist i update


### onBeatRate

På raden: andel kickar med |fasfel| < 0.25 (coasten; tilliten utan TRUST_REPEAT)


### repeatRate

På raden: TRUST_REPEAT: andel kickar på slaget ELLER som upprepar en kick två slag tidigare (tilliten)


### pllKicks

På raden: hur mycket bevis fasprediktionen faktiskt vilar pa


### gridWeakSince

På raden: ms-tidpunkt då konfidensen föll under grinden (0 = stark)


### onT

```text
LÖPANDE TAKT: ring med (tid, onset.kick) per hop + vikningens arbetsytor (inga allokeringar per hop)
```

### fullS

```text
HELA TEMPOOMRÅDET: egna vikningsytor, varvets bästa och förra varvets vinnare (fullBpm = andra sökcentrum, 0 = ingen topp)
```

### tgSwitches

På raden: TVÅ MINNEN (a2f)


### tgF

```text
HÅLLEN TOLKNING (k4): varvets poäng (tgF), dess log med grannar (tgW), sorteringsyta (tgQ), bevissumman (tgD), regenten (tgR, -1 = START), hälsan, låsräknaren
```

### brkFrom

På raden: BREAK-HÅLLET: senaste hop djupt borta; armerat; hållets början


### sure

På raden: LÅTENS MINNE: värdens låtgräns är säker (an.boundSure)


### tgLN

På raden: k4b (lånat av k2b): långt minne (~10 s) - har låten hört tempot?


### tempoBpm

```text
 EN TEMPOSÖKNING: tempogrammets vinnare (0 = ingen topp än) - klockans skanningscentrum.
```

### tgClear

```text
 TEMPOTS TYDLIGHET 0..1 (t1f): 1 - näst bästa tempohypotesens poäng / vinnarens, x 3, tak 1 (se tgStep).
```

### hvBest

På raden: a3 TOPPRÖSTEN (hvEver: D1, rösten har bytt sedan låset)


### pwE

```text
TAKTENS SJÄLVLIKHET (J1): egen ring (bas, diskant, tid), fönstret (antal, ms per värde), rättningens kandidat och varv i följd, tystnad till
```

### octHi

På raden: OKTAVKANTEN (r0): halvslagskvotens EMA och läget


### goodAt

På raden: TAKTEN GENOM BREAKET


### barK

```text
ETTAN (a5): fyra platsers särdrag (inre slagindex & 3), pågående slagets max, linjära ringar för stigningen, publicerat ankare
```

### anaGrid

```text
 EN KÄLLA (r0 entempo): analysatorns rutnät (kickgrinden) = klockans INRE rutnät + KICK_PHASE_MS; null = grinden öppen (klockan i coast).
```

### barKnown()

```text
 Det cfg analysatorn ska byggas med: en grund kopia (analysatorns rutnät sätts via setClockGrid i update, aldrig i motorns cfg.beat).
 EN ETTA (a4): har taktmodellen dömt en etta (minst BAR_MIN slag sedan start/låtgräns)?
```

### scanStep

```text
Sökningen sprids över hoppen: ETT tempo per hop (Pi Zero: hela sökningen i ett anrop = 2 ms på PC:n, ~20 ms på Pi:n = stopp i slingan).
```

### onsetStep()

```text
 LÖPANDE TAKT: ett hop av sökningen - vik ringen (fönstret före sökningens start) på nästa tempo; sist läggs rutnätet på toppen.
```
Vid `if (this.scanC > this.scanEnd) {`:

```text
ingen sökning pågår
```
Vid `const cb = this.scanFar > 0 ? this.scanFar : beat.bpm; this.scanFar = 0;`:

```text
k4b BLIPPEN ÖVERHOPPAD: förra sökningens eget tempo låg utanför TG_SNAP från tempogrammets och togs inte (scanFar, se nedan). Den här
sökningen görs precis som den hade gjorts om det tagits - samma tidpunkt, samma centrum - så rutnätet efteråt är detsamma som förr.
```
Vid `if (this.tempoBpm > 0 && Math.abs(cb / this.tempoBpm - 1) > TG_SNAP) { this.scanC0 = th...`:

```text
EN TEMPOSÖKNING: klockan utanför tempogrammets topp -> dit
```
Vid `else if (this.tempoBpm > 0) { this.scanC0 = cb; this.scanStep = 0.005; this.scanEnd = 5; }`:

```text
inom: klockans egen skanning som förr (fas, fintempo; a2r M2: kring tempogrammets topp gav ettan 100 -> 93, gridfel 15 -> 26 ms)
```
Vid `else { this.scanC0 = beat.bpm; this.scanStep = 0.005; this.scanEnd = 5; }`:

```text
tempogrammet nollat (låtgräns): kring klockans tempo (inget andra sökcentrum - EN KÄLLA)
```
Vid `if (t > this.scanNow) continue;`:

```text
kom in efter sökningens start
```
Vid `const score = (mx / mean) * (c === 0 && this.scanStep === 0.005 ? SCAN_HOLD : 1);`:

```text
k4b FINTEMPOTS KRONA: i klockans egen sökning (0,5 %-steg kring sitt tempo) måste ett granntempo passa ansatserna SCAN_HOLD bättre än det
tempo klockan har - annars växlar två lika bra grannar varannan sökning (114,0 <-> 114,6) utan att musiken ändrats. Samma princip som KRONAN.
```
Vid `const a = this.foldMean(mb - 1), cc = this.foldMean(mb), d = this.foldMean(mb + 1), den...`:

```text
parabel genom toppen
```
Vid `if (this.tempoBpm > 0) this.bestBpm = Math.min(159.9, Math.max(80, this.bestBpm));`:

```text
nytt tempo med bevarat slagindex + fas, sedan fasen direkt på toppen (toppen låg på bestPh räknat från sökningens ankare)
```
Vid `if (this.tempoBpm > 0) this.bestBpm = Math.min(159.9, Math.max(80, this.bestBpm));`:

```text
samma oktavfönster som tempogrammet
k4b BLIPPEN ÖVERHOPPAD (k4:s skanningsspärr i ny form; jokern mätte 45 av 59 utflykter som sådana): klockans egen sökning (+-2,5 % kring
sitt tempo, som självt får ligga 3 % från tempogrammets) kunde ta ett tempo 3-5 % från tempogrammets topp; nästa sökning 250 ms senare
hämtade det tillbaka = en 'blipp' på 0,2-0,4 s. Ett sådant tempo tas inte: rutnätet rullar orört till nästa ordinarie sökning, som görs
som om det tagits. (Stryka kandidaterna: hämtningen uteblev, lotus fasmedian 0,91 -> 0,90. Hämta genast: sökningarnas tidpunkter flyttas.)
```
Vid `const shift = ((((beat.anchorMs - ref) % nb) + nb) % nb) / nb;`:

```text
(a8r:s barReset vid > 3 % tempohopp borttagen, a4 entempo: klockan drar inga egna slutsatser om låtbyte - det gör låtgränsen)
```
Vid `const shift = ((((beat.anchorMs - ref) % nb) + nb) % nb) / nb;`:

```text
nya ankarets fas mot sökningens ankare
```

### tgScore()

```text
 EN TEMPOSÖKNING: hypotesens poäng = basens x diskantens (topp + halvslaget efter toppen) / 2 / medel, en gemensam vikning av
 ringen (fönstret ONSET_WIN_MS bakåt från now). 0 = för lite ljud.
```
Vid `const S = this.fullS, N = this.fullN, Hs = this.tgH, oT = this.onT, oV = this.onV, oH =...`:

```text
Poängen beror inte på fasen: ringens värden ligger med jämn takt (vartannat hop), så fasen stegas fram med en addition per värde
i stället för t % period på väggklockan (3 x billigare; i realtid är ringens Date.now() dessutom ryckig - hoppens takt är exakt).
```
Vid `let lo = 0, hi = this.onN;`:

```text
n = antal värden inom fönstret (tiderna växer i ringen: binärsökning i st f att räkna)
```

### tgStep()

```text
 EN TEMPOSÖKNING: TG_PER_HOP hypoteser per hop in i tempogrammet; sist i varvet blir toppen klockans centrum.
```
Vid `const sf = this.tgScore(bk0, now, TG_FWIN_MS);`:

```text
snabba minnet först (tgN/tgHalfR ska vara det långsammas efteråt)
```
Vid `if (s > 0) acc[k] = acc[k] < 0 || this.tgN < TG_FULL_N ? s : acc[k] + TG_A * (s - acc[k]);`:

```text
minne först när fönstret är fullt (kort fönster = brusig, långsam-gynnad poäng)
```
Vid `else if (this.brkArm && this.tempoBpm > 0) {`:

```text
BREAK OCH DROP ÄR SAMMA LÅT: inget nytt tempoval
```
Vid `this.brkArm = false;`:

```text
längre än ett break: som förut tills baskroppen varit tillbaka ett fönster
```
Vid `const F = this.tgF, W = this.tgW, Q = this.tgQ, D = this.tgD;`:

```text
HÅLLEN TOLKNING (k4): varvets bevis mot brustaket; med en regent avgör bevissumman bytet
```
Vid `const song = this.sure && this.tgLN * TG_LA >= 1;`:

```text
LÅTENS MINNE väljer: ingen regent, inget snabbt byte
```
Vid `if (Math.min(d0, TG_K - d0) > 2) {`:

```text
bevisat byte: ny tolkning -> tempogrammet sås ur varvets poäng, START-läget tar vid
```
Vid `const r = this.tgR, L = this.tgAccL; let fk = -1, fv = 0; for (let i = 0; i < TG_K; i++...`:

```text
k4b (lånat av k2b) NY LÅT ELLER SAMMA? Snabba minnets byte prövas som förr (TG_HOLD i TG_SW_N varv), men tas bara om utmanarens tempo är
OKÄNT för det långa minnet (< TG_KNOWN x regentens poäng där) = nytt material, inte en annan läsning av samma låt. Då går allt som
förr och START-läget tar vid. En KÄND utmanare (hörd i låten) måste vinna på bevissumman ovan.
```
Vid `if (held || song) {`:

```text
 regenten håller / låtens minne väljer
```
Vid `else if (this.tgN < TG_FULL_N) acc.set(accF);`:

```text
TVÅ MINNEN: tills det långsamma fönstret är fullt (kallstart, efter relock) styr det snabba
```
Vid `else if (this.tempoBpm > 0) {`:

```text
TVÅ MINNEN: det snabba pekar på ett annat tempo -> det ersätter det långsamma
```
Vid `const fc = Math.max(accF[kc0], accF[(kc0 + 1) % TG_K], accF[(kc0 + TG_K - 1) % TG_K]);`:

```text
det regerande tempots poäng i det snabba
TEMPOHOPPEN (11-10): kronans marginal mot ALLA tempon, inte bara syskonen
```
Vid `if (held) { bk = this.tgR; bv = acc[bk]; for (let d = -2, c0 = bk; d <= 2; d++) { const...`:

```text
fintempot: det långsamma minnets topp kring regenten
```
Vid `{ let sv = 0;`:

```text
TEMPOTS TYDLIGHET (t1f): marginalen till NÄST BÄSTA tempohypotes = högsta andra lokala toppen i varvets tempogram (mer än
2 steg från vinnaren, så toppens egen flank räknas inte). Ett enda tydligt tempo -> 1; två lika starka (96 <-> 128,
tempot vandrar) -> 0. Två tredjedelar av vinnarens poäng eller mindre = full tydlighet. Läses av tilliten (updateInner).
(lang1021/lang1011 i f0: tydliga partier 2:a/bästa 0,24-0,50, låtskarvar och vandrande tempo 0,85-0,99.)
```
Vid `if (!held && !song && this.tempoBpm > 0) {`:

```text
KRONAN (r0): det regerande tempot behåller toppen tills en annan hypotes slår det med TG_HOLD (lang1011 490-570 s: 96 <-> 128 = 4:3
varannat varv, kickspärren och grinden bytte med -> sektionerna). Bara om det regerande tempots egen poäng finns (> 0).
```
Vid `const d = ((bk - kc) % TG_K + TG_K) % TG_K, sib = TG_SIB.some((q) => Math.abs(d - q) <=...`:

```text
bara mot ett HARMONISKT syskon (4:3, 3:2 åt båda hållen, i det cirkulära oktavrutnätet): ett annat tempo (ny låt utan låtgräns) tas som förr
```
Vid `if (!held && !song) {`:

```text
SÄKER LÅSNING: samma hypotes (+-2 steg), över brustaket, fullt fönster, TG_LOCK_N varv i följd -> regent
```
Vid `const a = A[(bk + TG_K - 1) % TG_K], c = A[(bk + 1) % TG_K], den = a - 2 * bv + c;`:

```text
parabel i log-rutnätet (cirkulärt)
```
Vid `if (!(t < 80 * TG_EDGE || t > 160 / TG_EDGE)) this.octLoN = 0;`:

```text
OKTAVKANTEN: 80 och 160 är grannar i det cirkulära rutnätet, och vikningen kan inte skilja dem (halvslagsbeviset gynnar 80).
Nära kanten avgör analysatorns oktav (lang1021 = 160: rutnätet på 80 missade varannan ansats; Cody Johnson = 80, analysatorn 104-116).
EN KÄLLA (r0): oktaven avgörs av klockans egen vikning (analysatorns tempo finns inte längre): ligger basens stigning lika starkt
mitt emellan 80-slagen som på dem är pulsen 160 (lang1021: varannan ansats), annars 80 (backbeat: virveln, inte basen, på 2 och 4).
```
Vid `this.octLoN = lo < TG_OCT_LO ? this.octLoN + 1 : 0;`:

```text
D2: halvslaget under kanten i TG_OCT_LO_N varv i följd
brusigt per varv (lang1021 0,5-1,0, Cody Johnson 0,1-0,9): EMA ~3,7 s + hysteres (upp >= TG_OCT_UP, ned < TG_OCT_DN), startläget ur första varvet
```
Vid `t = this.octHi || this.octLoN >= TG_OCT_LO_N ? 2 * lo : lo; }`:

```text
a3 OKTAVEN UNDER KANTEN: båda bänkarnas facit (och lotus BPM_MIN/MAX) bor i [80, 160) - ett slag under 80 finns inte, så ligger
halvslaget tydligt under kanten (< TG_OCT_LO) är pulsen dubbla (lotus 503: 20 'dubbla' 155-159 -> klockan 80,0 = klämd 78,x).
```
Vid `if (pj !== pc && pj !== r0 && this.tgR >= 0) { this.tgR = ((Math.round(Math.log(pj / 80...`:

```text
dmx-1b: vittnets RÄTTNING flyttar också k4b:s regent (annars drar regenten tillbaka klockan nästa varv)
```

### peakVote()

```text
 a3 TOPPRÖSTEN (EN KLOCKA FÖR BÅDA, sammanslagningen av tempovalet - båda signalerna röstar). Tempogrammet (B, rise-vikningen) dömer
 varje tempo på (topp + HALVSLAGET) / 2: halvslaget fäller 4/3- och 3/2-fantomerna (ingen topp mitt emellan), men GYNNAR 3/4-fantomen:
 på 3/4 av tempot landar de riktiga slagen på fyra jämnt fördelade faser (0, 1/4, 1/2, 3/4), så både toppen och halvslaget har slag.
 Lotus 503: klockan föll på 3/4 i 21 låtar där A (kickvikningen: alignScore/UP43, slagets topp och träffar) hade rätt - Klaas Cambodia
 130 -> 97,6 (basens topp 5,7-6,4 x medel på 130 mot 4,7-5,0 på 97,5, diskanten 7,7 mot 6,9). KICKVIKNINGENS RÖST = bara TOPPEN:
 basens topp/medel x diskantens topp/medel på samma ring. Uttalad kvotlogik: syskonen 4:3, 3:4, 3:2, 2:3, 5:4, 4:5 (vikta in i
 [80, 160)) är alla icke-heltalskvoter - de riktiga slagen sprids på 3-8 faser där, så toppen späds ut åt BÅDA hållen (oktaven och
 undertoner ingår inte: där späds toppen inte). Ett syskon tar över tempogrammets val om dess topp-poäng är minst HV_K x valets i HV_N
 varv i följd; det regerande tempot har samma faktor (hysteres). Täta ansatser ger lika toppar = tempogrammet står kvar.
```
Vid `const open = this.hvAge++ < HV_AGE;`:

```text
tempovalet: bara i låsets första HV_AGE varv (kallstart, efter låtgräns/tystnad)
```
Vid `if (!open) {`:

```text
inne i låten: tempoKLASSEN som valdes i fönstret står kvar mot ett syskon tills syskonets topp är HV_K x högre
```
Vid `if (this.hvAge === HV_AGE + 1) this.hvKeep = this.hvEver ? this.tempoBpm : 0;`:

```text
D1: klasslåset bara om rösten faktiskt bytt i fönstret
```
Vid `const v = this.peakScore(c, now) * (this.hvEver && cur > 0 && Math.abs(c / cur - 1) < 0...`:

```text
D1: hysteresen bara efter ett röstbyte
```
Vid `if (this.hvEver && cur > 0 && Math.abs(best / cur - 1) < 0.02) { this.hvRun = 0; return...`:

```text
redan bytt: står kvar (även efter fönstret)
D3: samma tempogramval OCH samma syskon i alla HV_N varv (övergångar där tempogrammet vandrar röstar inte)
```

### peakScore()

```text
 Topp-poängen på bpm: ringens basstigning och diskant (fönstret TG_WIN_MS) viks som i tgScore; basens topp/medel x diskantens
 topp/medel (utan halvslaget). 0 = för lite ljud.
```

### pwSib()

```text
 Är a ett syskon till b (4/3, 3/4, 3/2, 2/3, oktaven bortvikt, +-TG_SNAP)?
```

### pwCorr()

```text
 Seriens likhet med sig själv `lag` värden bort, över fönstret pwWn (Pearson).
```

### pwAt()

```text
 Långsamma minnets poäng kring bpm (+-2 steg, cirkulärt).
```

### pwSim()

```text
 Mönstrets självlikhet 2 och 4 slag bort på tempot bpm, bas + diskant.
```

### pwJudge()

```text
 TAKTENS SJÄLVLIKHET (se PW_RING): varvets val `cand` mot regenten -> klockans tempo.
```
Vid `if (moved && !sib) { this.pwQuietAt = now + PW_WIN_MS; this.pwRun = 0; return cand; }`:

```text
ny takt som inte är en annan läsning: som förr, vittnet tiger
```
Vid `const M = PW_RING - 1; let lo = 0, hi = this.pwN;`:

```text
fönstret: de senaste PW_WIN_MS i ringen
```
Vid `if (sib) {`:

```text
(1) VETO: tempogrammet vill till ett syskon
```
Vid `this.pwWn = lo >> 1; const sN = this.pwSim(reg);`:

```text
... och mönstret finns kvar i fönstrets SENARE halva (en ny låt i syskonförhållande: borta)
```
Vid `let bs = 0, bb = 0;`:

```text
(2) RÄTTNING: klockan står (cand = regenten, fintempot följer); är ett syskons mönster tydligt mot dess eget?
```
Vid `if (bs >= PW_MIN && bs > (sR > 0 ? sR * TG_HOLD : 0) && this.pwAt(bb) * TG_HOLD >= this...`:

```text
tydligt mönster OCH tempogrammet är inte säkert på regenten
```

### kickRepeats()

```text
 Kom en tidigare kick (ringen, före denna) lag ms före t, inom ±tol? (TRUST_REPEAT)
```

### barStep()

```text
 ETTAN (se BAR_DECAY): ett hop av effektklockans taktmodell, på det inre rutnätet.
```

### barCommit()

```text
 Slaget barIdx är färdigmätt: bokför det på sin plats och döm de fyra hypoteserna (vinnaren med marginal blir ettan).
```

### relock()

```text
 LÅTGRÄNSEN (a4 entempo): den ENDA signalen om låtbyte. Klockan fortsätter (inget mörker), men det som tillhör förra låten
 släpps: tempogrammet (nästa varv tar nya låtens poäng direkt ur ringen), taktmodellen (ettan börjar om) och upptagets minne
 av förra låtens tillit.
```
Vid `if (this.innerValid && this.innerBpm > 0) this.innerAnchor += this.barOff * (60000 / th...`:

```text
a1r: ettan som gällde läggs in i det inre ankaret före taktmodellens omstart, så det PUBLICERADE rutnätet (och effekternas
takträknare) inte backar barOff slag vid låtgränsen. Förr: barOff -> 0 flyttade ankaret 1-3 slag bakåt mitt i skarven och
räknaren stod still lika länge. Nya låtens etta tas sedan av taktmodellen som vanligt.
```

### update()

```text
 EN KÄLLA (r0 entempo, ägaren 11-09: "allt skall ju ligga i analysatorn"): ETT hop av analysatorns klocka i dess långsamma väg.
 Klockan är den ENDA temposökningen: tempogrammet (tgStep) startar och håller tempot själv, rutnätet (onsetStep) sätter fas och
 fintempo, taktmodellen (barStep) ettan, och tilliten = andelen kickar rutnätet förutsäger (repeatRate). Analysatorn har ingen egen
 tempovikning längre: den får klockans tempo/tillit (cfg.beat, se Analyser.setClock) och för kickgrinden klockans INRE rutnät +
 KICK_PHASE_MS - eller null när klockan är i COAST (fasträffarna svaga): då står grinden öppen och kickspärren är 170 ms, som när
 skuggrutnätets återställning förr nollade analysatorns tempo (a1/a8: det var det som höll sektionerna snabba). Låtgränsen
 (an.trackBoundaries) är klockans enda låtbytessignal, och an.boundSure säger om den är säker (LÅTENS MINNE); tystnad (an.quietMs > 10 s) släpper klockan. `now` = hoppets klocka.
```
Vid `if (cfg.beat && this.innerValid) { cfg.beat.anchorMs = this.innerAnchor; cfg.beat.bpm =...`:

```text
ETTAN: matningen räknar på det inre ankaret
```
Vid `an.setClockGrid?.(this.gridWeakSince === 0 ? g as EngineConfig["beat"] : null);`:

```text
COAST/BREAK = öppen grind (skuggans bpm 0 som transform av klockan)   // COAST = öppen grind
```
Vid `frame.bpm = b ? b.bpm : 0; frame.bpmConfidence = b ? (b.confidence ?? 0) : 0;`:

```text
EN TILLIT: ramen bär klockans tal
```
Vid `an.setClock?.(frame.bpm, frame.bpmConfidence);`:

```text
odelad väg: analysatorn direkt (taktvägen: HopLaneFast.feed)
EN TILLIT TILL DIRIGENTERNA (11-11): stegas här så varje väg som matar klockan direkt får den (taktvägen: HopLaneFast.feed på motorns tråd)
```

### updateInner()

Vid `if (cfg.beat && this.lastPllKickMs) {`:

```text
TILLITEN KOMMER FRAN FASPREDIKTIONEN. Coast: utan kickar finns inga nya bevis, sa tilliten lacker ner over ~4 s.
```
Vid `const pllConf = this.pllKicks >= 12 ? this.onBeatRate : 0;`:

```text
EN TILLIT (a6 entempo): tilliten = repeatRate från första kicken; coasten vilar på fasträffarna (0 innan 12 kickar = coast).
```
Vid `if (quietMs > 10000) {`:

```text
TYSTNAD (förr analysatorns F_SIL10 -> bpm 0): efter 10 s tystnad släpps klockan helt. Pauser < 10 s rullar klockan vidare.
```
Vid `if (frame.kickAtMs > 0 && beat0) {`:

```text
TILLITEN: landar kickarna på rutnätets slag? (tidsstämpeln är slagets egen, frame.kickAtMs)
```
Vid `if (BREAK_RESTORE_MS > 0) {`:

```text
TAKTEN GENOM BREAKET (2): dropens kick tar upp rutnätet direkt
```
Vid `if (onBeat) cfg.beatErr = (cfg.beatErr ?? 0) * 0.85 + err * 0.15;`:

```text
UI: ihållande fasfel
```
Vid `{`:

```text
ringen + vikningen (basens stigning i dB mot FEED_RISE_HOPS hop sedan; var 2:a hop in i ringen, max av de två)
```
Vid `if (!cfg.beat && this.tempoBpm > 0) cfg.beat = { anchorMs: frame.beatAnchorMs || now, b...`:

```text
KALLSTART (förr analysatorns första lås): klockan föds på tempogrammets första topp, fasen på senaste kicken; onsetStep lägger
sedan rutnätet på vikningens topp inom 250 ms.
```
Vid `if (cfg.beat) this.barStep(frame, cfg.beat, now);`:

```text
(analysatorns barShift flyttar inte längre klockan: ETTAN är klockans egen taktmodell - en etta, inte två)
```
Vid `if (pllConf >= GRID_ON_CONF) { this.gridWeakSince = 0; this.gridCoasting = false; }`:

```text
COAST på fasträffarna: svaga -> rutnätet rullar vidare GRID_COAST_MS med tilliten golvad, sedan släpps golvet.
```
Vid `const live = this.repeatRate * this.tgClear;`:

```text
EN TILLIT SOM MÅTT (t1f): andelen kickar rutnätet förutsäger (repeatRate) x tempots tydlighet (tgClear). Förr bara
repeatRate, som mättade på 1,00 även när tempogrammet hade två nästan lika starka tempon (konsertReplay: 1,00 vid VARJE manusval).
```

