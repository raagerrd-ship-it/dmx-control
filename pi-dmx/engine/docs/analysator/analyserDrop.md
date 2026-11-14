# analyserDrop.ts - anteckningar

Kommentarerna som stod i koden fram till uppdelningen 2026-11-14, ordagrant, under den konstant, det fält eller den metod de hörde till.
Koden har bara en kort etikett kvar per deklaration. Nya anteckningar skrivs här, inte i koden.

## Filhuvudet

```text
 DROP-DETEKTORN (utbruten ur analyser.ts 2026-11-14). Baskroppens tak och frånvaro, flanken (full drop), slam-kandidaten, minidrop, klassningen och lyft/nästan-drop/stopp. Körs i långsamma vägen per stor-FFT; läser baskroppen, nivån och klockans tempo ur analysatorn (this.a) och skriver dropCount/miniDropCount m.m.
```

## Toppnivå

### BODY_PEAK_DB

På raden: BRED onset-grind (en ren edge per event)


### DROP_ARM_MS

```text
ARMERAT FONSTER: edgen ARMERAR, fyrningen sker nar fullSlam blir sann inom fonstret (mjuka pop-drops toppar
50-200 ms efter edgen). 0 = bara edge-ogonblicket.
```

### BODY_FAST_S

```text
FYR-LAGG: hela laggen ar bodyFast-filtret (tau 120 ms) som alla tre villkor laser. BODY_FAST_S sveper tau.
```

### DROP_CALM_DB

```text
 STRIKT INTRO (opt-in DROP_CALM_INTRO_STRICT=1, kraver <prefix>DROP_CALM_GATE): i 'intro' fyrar en drop bara efter riser (buildUp >= DROP_CALM_BUILD).
```

### DROP_SHORT_MS

På raden: minsta drop-avstand nar dropen ESKALERAR


### DROP_LONG_MS

På raden: annars maste sa har lang tid ga (mot falska upprepningar)


### DROP_ESCALATE_DB

På raden: tatare drops maste vara TYDLIGT starkare for att fyra


### FLANK_GONE_DB, FLANK_BREAK_S, FLANK_LAND_DB, FLANK_RISE_DB, FLANK_HOLD_S, FLANK_GRACE_S

```text
FULL DROP PÅ FLANKEN (flyttad ur effects.ts 11-09, a3 - historiken: ägarens ladan 10-12..10-30, se git-historiken för effects.ts):
baskroppens topp (bodyFast över FLANK_HOLD_S) har legat >= FLANK_GONE_DB under taket (bodyCeil) i >= FLANK_BREAK_S (eller
>= FLANK_SHORT_S med >= FLANK_SHORT_RISE_DB djup), och fyrar när bodyFast går upp till taket - FLANK_LAND_DB med >= FLANK_RISE_DB
stigning på 0,5 s. Helt tyst (lvlSmooth <= FLANK_SILENT_LV) i breaket = låtlucka, ingen drop. Samma filter som slam-kandidaten
(bodyFast 60 ms, bodyEnv 350 ms, bodyCeil -0,15 dB/s) - förr en egen kopia i effekterna.
```

### FLANK_ROOF_BEATS (BORTTAGEN 2026-11-14 kväll)

```text
BREAK-TAKET (2026-11-14, ur arenan drop1 a7; ägarens facit i ladan 11-13): har basen varit borta i FLANK_ROOF_BEATS slag eller mer
(2 takter, räknat i klockans tempo) är återkomsten en ny sektion som börjar, inte en drop. Mätt på ägarens två markerade inspelningar:
hans egna drop har basen borta högst 6 slag, återkomsterna han INTE kallar drop (omarkerade, "inte drop", låtbyte) minst drygt 8.
Samma dom för tak 6-9 slag. Slam-kandidaten kan fortfarande göra återkomsten till minidrop.
```

BORTTAGEN samma kväll, efter ny musik i ladan (lang-20261114T193040, 4 markerade drop): ägarens drop där kommer efter break på
20-48 slag. Med taket 8 slag: 1 av 4 drop kvar; 24 slag: 2 av 4; 32: 3 av 4; först vid 48 eller mer 4 av 4. Gårdagens falska drop
har break på 12-32 slag, så inget tak går mellan dem. Breakets längd skiljer alltså INTE drop från icke-drop; taket var trimmat på
två inspelningar av samma sorts musik. Utan taket: 4 av 4 på den nya inspelningen (plus två omarkerade, 245 och 316 s), och på
160345 tillbaka till de 10 drop motorn gav före taket (ägarens 1 av 9 där). Vad som skiljer hans drop från andra basåterkomster
är fortfarande olöst; nästa försök döms på fler inspelningar än två.

### SHOW_DROP_GAP_MS

På raden: spärr mellan full drops (ägaren 10-12): flank inom spärren = minidrop (dropSpaced)


### NEAR_RISE_DB, NEAR_DIP_DB, LIFT_DB, STOP_MINI_S

```text
LYFT/NÄSTAN-DROP/STOPP (flyttade ur effects.ts stepLifts 11-09): kroppen 120 ms (nearB), normalnivån 8 s, historik i 25 ms-rutor.
```

### DOUBLE_FROM_START

```text
 Talfält som ska vara flyttal från start (se stabiliseringen i analyser.ts).
```

## DropDetector

### a

```text
 analysatorn som äger den här delen (delade signaler läses via den)
```

### bodyEnv

```text
 BASKROPPEN — (sub+kick+bas)/3, utjämnad. Det är HÄR en drop syns.
 MÄTT över 15 min av ägarens egen musik: `level` ligger i sin övre tredjedel
 67 % av tiden (dynamik p90/p10 = 2.1) — den kan omöjligt peka ut ett särskilt
 ögonblick. Baskroppen ligger högt bara 9 % av tiden (dynamik 5.6). Sång och
 synth håller uppe nivån hela låten; det som FÖRSVINNER i en breakdown och
 SLÅR TILLBAKA i dropen är basen.
 Nivå-baserad zon gav 172 flanker på 15 min (en var 5:e sekund) för ~19 drops.
 Baskropps-zonen ger 46 (en var 20:e sekund) — rätt storleksordning.
```

### bodyFast

```text
 Snabb envelopp (0.12 s) ENBART for stigningstakten. Den langsammare
 bodyEnv (0.35 s) styr tak och franvaro. Blandar man ihop dem dampas
 stigningen och trosklarna slutar motsvara det som mattes i banken.
```

### bodyCeil

På raden: dB


### bodyPeak

På raden: SEG topp (loud-referens i minuter) for landa-hogt


### lastDropRise

På raden: -0 = HeapNumber: Double-falt fran start (typstabilt), beter sig som 0


### bodyHist

```text
 ANSLAGSDETEKTION. En tröskel som ska NÅS korsas först när basen redan
 kommit — uppmätt 2.5 s efter anslaget. STIGNINGSTAKTEN fyrar när den
 börjar: uppmätt 0.1 s. Ringbuffert med 0.5 s historik (förallokerad).
```

### bodyGoneMs

```text
 Ihållande bas-FRÅNVARO. Det som gör en drop till en drop är att basen
 varit BORTA. Utan varaktighetskrav räcker en trumfill, och då är villkoret
 uppfyllt nästan jämt — då blir 8-takters-spärren det enda som begränsar
 takten och detektorn förvandlas till en METRONOM. Uppmätt live: den fyrade
 var 15:e sekund (= spärren) och användarens riktiga drops låg 9-15 s FEL,
 blockerade av den föregående falska avfyrningen.
```

### dropArmGoneMs

På raden: armerat drop-fonster (DROP_ARM_MS)


### calmHoldRise

På raden: DROP_CALM_LAND_MS: kandidat som halls for verifierad landning


### goneEpisodeMs

På raden: (double fran start, se dropArmGoneMs) gone-episodens START (lastBodyGoneMs uppdateras varje hop och duger INTE som id)


### dropCount

På raden: monoton drop-räknare (edge-säker för konsumenter) - full drop på flanken


### dropCand

På raden: slam-kandidaterna (förr dropCount): sektionens drop-evidens och minidrop utan flank


### fdN

På raden: (tid, bodyFast) för toppens fönster


### lastDropMs

På raden: utanfor Smi-intervallet -> Double fran start (typstabilt)


### dropStep()

```text
 Drop-detektionen (baskropp, franvaro, stigning, armering, minidrop, lugn-grind, kick-las, fyrning). Manga kalla grenar: egen funktion sa att en deopt bara kostar den har, inte hetslingan.
```
Vid `const bodyPeek = this.bodyFast;`:

```text
(DROP_PEEK forkastad 09-08: ra-min oppnade falska klassen)   // 0.06 testat men gav falsklarm live utan att fixa beat-lagget (det sitter i lamp-vagen/energin, inte har)
TAKET SJUNKER I dB PER SEKUND, inte i procent. Kroppen ar nu ett dB-tal
(negativt), och "1,5 % av ett negativt tal" gor taket STORRE, inte mindre —
den gamla raden var matematiskt omvand sa fort skalan blev logaritmisk.
```
Vid `this.bodyPeak = Math.max(this.bodyEnv, this.bodyPeak - dtHop * 0.04);`:

```text
~0.04 dB/s ≈ haller loud-referensen i minuter
```
Vid `const flank = this.flankStep(nowWallA, dtHop);`:

```text
EN DROPDETEKTOR: flanken på samma filter (se FLANK_GONE_DB)
```
Vid `if (this.bodyEnv < this.bodyCeil - BODY_GONE_DB) {`:

```text
BAS-FRÅNVARO med VARAKTIGHETSKRAV: under 40 % av taket i ≥2 s i sträck.
FRANVARO = ETT AVSTAND I dB, inte en kvot. En kvot mellan tva logaritmer
betyder ingenting fysiskt.
```
Vid `if (this.bodyGoneMs >= BODY_GONE_MIN_MS) {`:

```text
BODY_GONE_MIN_MS: hur LÄNGE kroppen måste ha varit borta för att räknas
som en riktig breakdown. En 2s sidechain-dipp i en megamix är inte en
drop-förberedelse; en riktig breakdown varar flera sekunder. Env-tunbar
så den kan svepas mot referens offline.
```
Vid `if (this.bodyGoneMs - dtHop * 1000 < BODY_GONE_MIN_MS) this.goneEpisodeMs = nowWallA;`:

```text
NY episod (korsningen), oforandrad tills nasta
```
Vid `const hist = this.bodyHist, HL = hist.length;`:

```text
STIGNINGSTAKT över 0.5 s (ringbuffert, ingen allokering).
```
Vid `{ const pos = this.bodyHistPos, len = this.bodyHistLen; let mn = oldest;`:

```text
MINIMUM UTAN MODULO (a7): fönstret pos-1 .. pos-len läses som högst två raka bitar (var en heltalsdivision per varv,
~188 varv per hop). Samma mängd värden -> samma minimum.
```
Vid `const n1 = len < pos ? len : pos;`:

```text
pos-1 .. pos-n1
```
Vid `for (let j = HL - (len - n1); j < HL; j++) { const v = hist[j]; if (v < mn) mn = v; }`:

```text
resten från slutet
```
Vid `let bodyRise = bodyPeek - riseRef;`:

```text
let: CALMLAND/KICKLOCK bar kandidatens lyft vidare till fyrningen
```
Vid `const landsHigh = bodyPeek > this.bodyPeak - BODY_PEAK_DB;`:

```text
Anslaget: basen stiger snabbt OCH den var nyss borta på riktigt.
TROSKLARNA ar svepta mot 15 min av agarens musik (20 varianter). Ett
STORRE stigningskrav vann i tre av fyra franvaro-varianter — riktningen
ar alltsa robust, aven om decimalerna inte ar det (n=17 referenspunkter).
40 %/2 s slar 30 %/3 s: verkliga drops kommer ofta efter en DELVIS
nedgang, inte total tystnad — 10 av 11 missade drops foll pa just det.
Precision 46 -> 56 %, recall 35 -> 53 %.
MÅSTE LANDA HÖGT, inte bara stiga. bodyRise är i dB, så en liten uppgång från
nära-tystnad (en djup breakdown) ger ett STORT dB-lyft trots att den landar på
en fortfarande LÅG nivå → falsk drop "där energin knappt gått upp" (ägaren i
ladan 2026-09-03). Kräv att kroppen landar inom BODY_PEAK_DB av den senaste
toppen (bodyCeil) — en riktig drop når nästan sitt eget tak; en uppgång i ett
tyst parti gör det inte.
Mot SEGA toppen (bodyPeak), inte snabba taket: en falsk drop i ett tyst parti
landar lagt (fast ~10) medan riktiga landar hogt (fast ~34+); den sega toppen
haller loud-referensen (~44) sa den laga landningen avvisas aven om taket tillf. sjunkit.
```
Vid `const sinceDrop = nowWallA - this.lastDropMs;`:

```text
EN DROP MASTE LANDA I HOG ENERGI. Villkoren ovan tittar bara pa LOKALA
nivasprang (svacka -> topp-zon) och vet inget om var i laten vi ar, sa varje
liten variation i ett tyst parti raknades som en drop.
  MATT: 4.7 drops/minut, varav 71% vid intensitet under 0.45. Uppmatta
  drop-intensiteter: 0.39 0.32 0.81 0.34 0.40 0.37 0.51 - bara EN av sju
  lag i genuint hog energi.
En drop ar per definition ett sprang IN i hog energi, inte bara ett sprang.
intensity ar nu en levande signal (se 4392f61) och raknas fram i samma
funktion, sa gransen kostar ingenting.
TVA VAGAR IN I EN DROP, inte en. Villkoret krävde tidigare att nivan FALLIT
(breakAtMs inom 3.5s) fore zonintradet - alltsa breakdown -> drop. Men en
modern EDM-uppbyggnad STIGER rakt in i dropen utan att forst falla, och da
blockerades den.
  MATT vid atta zonintraden: ett hade energi 1.00 OCH aktiv riser - ett
  solklart drop - men blockerades for att senaste svackan lag 8.0s bort.
Nu racker antingen en svacka (klassisk breakdown) ELLER en riser (modern
uppbyggnad) strax innan. Riser-signalen ar bekraftat levande: den fyrar
9.8% av tiden och buildUp nar 0.61.
ENERGIGOLVET (intensity > 0.45) och svacka/riser-fönstren är BORTA som villkor
sedan flanken flyttades till baskroppen: de mättes fram mot den gamla
nivå-zon-detektorn och grindade signaler som inte längre bär beslutet.
Innan något av dem återinförs måste det mätas om mot bodyOnset.
```
Vid `const sinceDrop = nowWallA - this.lastDropMs;`:

```text
REFRAKTARPERIOD. Det fanns ingen alls: en drop kunde folja pa en annan
inom brakdelen av en sekund. MATT i drop-intervall-loggen: tva av tio
intervall lag pa 0.2 och 0.5 TAKTER, dvs dubbelfyrningar - resten lag pa
8-40 takter. En drop ar en sektionsgrans; tva sadana kan inte ligga en
halv sekund isar. 2s ar valdigt lagt satt mot narmaste akta intervall
(8 takter = ~13s vid 150 BPM), sa den kan inte kapa nagot verkligt.
SPARRAS I TAKTER, INTE SEKUNDER. Musik raknas inte i millisekunder: 2s var
drygt EN takt vid 150 BPM. Uppmatta AKTA drop-intervall lag pa 8-40 takter,
dar 8 var det kortaste. En drop kan alltsa omojligt folja pa en annan inom
8 takter (32 taktslag). Gransen skalar nu med tempot: ~13s vid 150 BPM,
~21s vid 90 BPM.
REFRAKTAR = 32 taktslag (8 takter). MATT: verkliga drop-avstand 8-40 takter.
TESTAT 2026-09-02 att korta till 16: F1 45 -> 33, +50 falsklarm (modern-spar
fyrar flera ggr per drop utan spärren). "Kroppen-var-borta"-kravet racker INTE
som ensamt skydd → spärren behalls. En falsk drop som lasar ute en riktig loses
med BATTRE PRECISION eller energi-gasen, inte med kortare spärr.
DROP-REFRAKTÄR 4 s (ägaren i ladan 2026-09-03: vill ha tätare lamp-drops).
Var 32 taktslag (~15 s). Röken översprutar INTE av detta — den har egen
cooldown (fog.cooldownMs = 30 s) som gatar den oberoende av lampornas drop.
OBS: kortare spärr → fler drops (och fler falska); medvetet val, agaren dömer
live. testDrops-F1 sjunker (spärren gjorde jobb där) men det är sekundärt här.
ESKALERINGS-REFRAKTÄR (ägaren i ladan 2026-09-03, mot falska drops): en drop
strax efter en annan får BARA fyra om den är TYDLIGT STARKARE (större bas-lyft)
än den förra — annars måste 20 s gå. Riktiga drops eskalerar (varje större);
falska är svagare upprepningar och sållas bort. En eskalerande drop (kvällens
stora ögonblick) släpps ändå igenom direkt (ned till 4 s).
```
Vid `const dropSpacingOk = sinceDrop > DROP_LONG_MS || (sinceDrop > DROP_SHORT_MS && stronger);`:

```text
(DROP_UPGRADE_DB matt 09-12, av: risk for dubbelsmall)
RISER-KRAVET AR AVSTANGT — men INTE for att signalen ar dod. Den gamla
motiveringen ("inRiser 0% av tiden, buildUp p99=0.31") mattes mot en
aldre riser-detektor och ar RADERAD som falsk.
  OMMATT mot novelty-baserad novRiser (tools/testDrops.mjs, 8 seeder):
  inRiser 8.8% av tiden, buildUp p50=0.00 p90=0.00 p99=0.42 max=0.85.
  p50/p90=0 ar forvantat — en riser SKA vara sallsynt. I ett brusigt rum
  fyrar den nastan aldrig (0.6%, max 0.04), sa ett hart riser-krav skulle
  sla av drop-detektionen just dar mikrofonen sitter.
Kravet ar fortfarande avstangt: risern lever igen (relativa granser, 2026-11-14)
men ser bara svep, inte breakdowns (drop1: 1 av agarens 6 uppbyggnader).
```
Vid `const bodyOnsetEdge = bodyOnset && !this.wasBodyOnset;`:

```text
FLANKEN TAS PÅ BASKROPPEN, inte på nivån. Nivå-zonen var sann 80 % av tiden
i ägarens musik → dess flanker låg godtyckligt, och 8-takters-spärren blev
i praktiken den som VALDE när en drop fyrade (första flanken efter att
fönstret löpt ut). Uppmätt resultat: 3 träffar av 19, 16 falsklarm.
STIGANDE FLANK: `bodyOnset` är sann KONTINUERLIGT i höga/pumpande partier (basen
dippar och återhämtar ~17 dB varje takt via sidechain → bodyRise ligger konstant
över tröskeln). MÄTT 2026-09-03: många kandidater/sekund. Fyra bara på den FÖRSTA
framen lyftet passerar tröskeln → ett kandidat-event per verkligt lyft, inte per
frame. Då blir eskalerings-/spärr-kravet meningsfullt (jämför distinkta lyft).
```
Vid `if (bodyOnsetEdge && this.goneEpisodeMs !== this.dropArmGoneMs) { this.dropArmUntil = n...`:

```text
Armera bara EN gang per "borta"-episod. Floden vid ARM=300 (36 mot 19 pa referens) kom fran
UPPREPADE aterhamtnings-edges i samma post-breakdown-fonster. Forsta edgen efter en ny
gone-episod armerar (fangar en mjuk drops fordrojda topp); senare edges far bara ogonblicket.
```
Vid `if (MINI_SPACING_MS > 0) {`:

```text
(KICK-FIRST forkastad 09-04: flod pa megamix; [firstkick]-sparet borttaget 09-27.)
MINIDROP-lyftet (se MINI_*). Egen svacka-raknare (kortare/grundare an gone) och egen flank.
```
Vid `const nv = hist[(this.bodyHistPos + HL - 1) % HL]; const mnRef = nv < riseRef ? nv : ri...`:

```text
Samma fönster som riseRef plus det nyss skrivna värdet (minus inget: den äldsta platsen ingår via `oldest`) -> en jämförelse
i stället för en andra genomläsning (a7).
```
Vid `&& (DROP_UNDERPEAK_MIN <= 0 || this.bodyPeak - bodyPeek >= DROP_UNDERPEAK_MIN)) {`:

```text
INTE I TAKET galler aven minidrops (19:19: 'falsk' = minidrop med underPeak 0,6)
```
Vid `if (DROP_TRACE && bodyOnsetEdge && !(dropSpacingOk && fullSlam)) console.log('[dropedge...`:

```text
DMX_DROP_TRACE=1: logga KONSUMERADE edges (kandidat som INTE fyrade) — var ligger kroppen vid
forsta takten? Matdata for DROP_QUALITY_DB pa mjukare material (pop) dar inget referens finns.
```
Vid `const notAtCeil = DROP_UNDERPEAK_MIN <= 0 || this.bodyPeak - this.bodyFast >= DROP_UNDE...`:

```text
INTE I TAKET (opt-in DROP_UNDERPEAK_MIN, ladan 2026-09-29): en drop som fyrar nar kroppen redan ligger vid sin topp (underPeak
0,4/0,8 dB) ar en upprepning av samma small, inte en ny - agarens markeringar: ratta 2,4-6,5 dB, falska 0,4/0,8/2,9. 0 = av.
```
Vid `if (fireNow) {`:

```text
LUGN-SEKTIONS-GRINDEN (se DROP_CALM_GATE). Domen tas per kandidat-hop; den hallna kandidaten (DROP_CALM_LAND_MS) foljs nedan.
```
Vid `if (this.a.dSec === 'intro') strong = this.a.buildUp >= DROP_CALM_BUILD;`:

```text
STRIKT INTRO (ladan 09-24: 'den gjorde fortfarande drop i intro'): landning vid toppen racker inte i intro - bara en riktig riser.
```
Vid `if (this.calmHoldStart > 0) {`:

```text
verifierad landning: kroppen maste ligga kvar vid toppen hela DROP_CALM_LAND_MS
```
Vid `else if (fireNow) this.calmHoldStart = 0;`:

```text
fyrar anda (starkare bevis kom)
```
Vid `if (fireNow) {`:

```text
KICK-LASET (se DROP_KICK_LOCK_MS): kandidaten vantar in forsta kicken, hogst en halv takt / DROP_KICK_LOCK_MS.
```

### dropClassify()

```text
 EN DROPDETEKTOR - klassningen (a3): flanken är full drop (efter spärren), slam-kandidaten utan egen flank inom 2 s är minidrop.
```

### flankStep()

```text
 FULL DROP PÅ FLANKEN (se FLANK_GONE_DB): på dropStep:s egna filter (bodyFast/bodyEnv/bodyCeil), per hop.
```

### liftStep()

```text
 NÄSTAN-DROP, ENERGILYFT, STOPP (a3, förr effects.ts stepLifts): VAD + STYRKA ut i ramen; effekterna avgör reaktionen.
```
Vid `if (now - this.liftHistAt >= 25) {`:

```text
25 ms-rutor AV TID: 60 rutor = dippens botten (1,5 s), 240 = lugnet 6..2 s + lyftet 0,6 s
```
Vid `const near = rise >= NEAR_RISE_DB && dip >= NEAR_DIP_DB && floor > -80 && this.nearB >=...`:

```text
floor > -80: inspelningsavbrott
```

