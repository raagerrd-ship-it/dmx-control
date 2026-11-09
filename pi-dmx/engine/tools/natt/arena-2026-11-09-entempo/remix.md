# entempo – REMIX-rundan (runda 2) och r0

Gäller r0 och alla remixar a1r..a8r. Uppgiften (uppgift.md), domaren (tools/arena/tvavagar.py) och de låsta reglerna gäller oförändrat.
Idébanken: `.arena/entempo/idebank/` (alla åtta deltagares losning.md + diff mot engine/src + ranking-r1.md). Läsbar för alla, skrivbar för ingen.

## SPÄRR: KRAV EN KÄLLA (ägaren 11-08 23:40: "Men alla får väl bara köra med en källa?") – ALLA FEM, annars DISK i finalen
1. EN temposökning: analysatorns skuggrutnät OCH dess egen tempovikning/sökning (skugg-BeatFeed, computeBpm/localBpm som tempokälla)
   är borta. Analysatorn (kickgrind, sektioner, sectionBars, boundaryDetector, KICK_COOLDOWN) läser klockans bpm och ankare + EN fast, mätt
   fasoffset.
2. EN tillit: frame.bpmConfidence, profile.beat, hasBeat, effekternas trust och frasräknaren läser alla klockans tillit.
3. EN takträknare: ctx.beatIdx = rutnätets index (>> 1 vid halvering). Ingen fri beatCounter, bara EN halveringsparitet.
4. EN pulskurva: beatEnv/kickEnv och beatPulse/heartPulse går på samma klocka.
5. Låtgränsen: boundaryCount är den enda låtbytessignalen, även i taktvägen (klockans egna låtbytesslutsatser borta).
Skriv i losning.md en tabell KRAV med fil:rad per punkt. Orkestratorn kontrollerar i koden och skriver `<mapp>/KRAV_EN_KALLA.txt`
när alla fem är uppfyllda -> ljusdomarens gräns −3,0 (ägaren 11-09 00:05). Domarens övriga spärrar gäller (lampspr < 94 %, upp_s/ned_s
inte sämre än bas, worker p99).

## ARKITEKTUREN (ägaren 11-08: "Analysatorn skall ju ge all information om låten till dirigent/effekt. Dirigent skall ju välja rätt effekt
och effekten skall enbart styra ljuset såsom den effekten vill.")
- Den enda källan är ANALYSATORN: klockan, rutnätet, ettan och tilliten hör till analysatorns långsamma väg (beatFeed slås ihop med
  analysatorn – i dag körs den redan i workern som taktvägen). Resultatet publiceras i ramen och tillståndsblocket. Lotus (samma delade
  analysator, saknar taktvägen): bakom profilen, på ETT ställe.
- Motorn (effects.ts) analyserar inget eget TEMPO: dirigenten läser ramen, effekten styr ljuset. (flankStep och andra analysflyttar ur
  effects.ts hör INTE hit – de blir en egen arena efteråt.)

## KÄNT EFTER RUNDA 1 (siffror ur idébanken)
- upp_s/ned_s-spärren är fällan: a1 (skuggan bort, kickfas 45 ms) upp_s 1,85 / ned_s 2,80; a3 upp_s 1,90; a8 M1 2,85, M2 2,30.
- a1: sektionernas försprång kommer INTE av fasen (kickfas 5–110 ms ändrade kickantalet ±2 %) utan av att skuggans coast nollade
  analysatorns tempo när det var fel -> kickgrinden släppte fler kickar (lang1021 120–180 s: bas 3 omlåsningar, 25 % utan tempo, 193 kickar,
  6 sektionsbyten; a1 0/0 %/162/4).
- a3: klockan och analysatorns localBpm är ofta oense (megamix 93,7 mot 125 = 4/3); sektionerna räknar på localBpm medan kickgrinden går
  mot klockan. Trolig fix: sektionerna läser klockans tempo.
- a8 M3 (ingen grind + återställning av analysatorns tempo mot en säker klocka efter 8 s oenighet): upp_s 1,35 = bas, men ned_s 4,00.
  Sektionsmedianerna är sköra: median bland ~14 värden, ett värde flyttar den.
- a2: analysatorns heltalstempo som källa är klart sämre (mix_klocka 97 -> 86 %, klipp 98 -> 77 %, ettan 91 -> 75) – källan ska vara
  tempogrammet (klockan).
- a4 (+0,12 OK): boundaryCount som enda låtbytessignal i taktvägen (H_BOUND i hop-recordet, relock()); mix_still +7 %, mix_hopp −26 %.
- a6 (+1,29 OK, alla 17 mått = bas, ljus −0,2): klockans tillit = andelen kickar rutnätet förutsäger; pulsen grindas med hasBeat
  (beatEnv-golvbuggen borta).
- a7 (+0,52, ljus −2,3, koreografi −4,8): ctx.beatIdx = rutnätets index; jitter 52,8 -> 59,3 ms på lang1021 (trolig orsak: räknaren hoppar
  med ankaret när ettan flyttas / klockan låser om – en monoton spärr behövs).
- a5 (0, md5 lika): klockans tillstånd låst/break/tappad/omlåsning i cfg.beat.state + FS_STATE.

## ARBETSGÅNG
- r0: bygg i `.arena/entempo/r0/` från engine/src (cp -r src .arena/entempo/r0/src).
- Remix `<id>r`: `cp -r .arena/entempo/r0/src .arena/entempo/<id>r/src` och förbättra i remixkortets riktning (lägga till ur idébanken,
  BYTA en del i r0 mot en bättre, ta bort det som inte bär). Poängen räknas mot r0 (remixens − r0:s); spärrarna mot bas.
- Budget: r0 högst 5 mätningar; remix högst 3. Samma regler som uppgift.md (--snabb fri, egna korta skript < 60 s ljud fria).
- losning.md: tabellen KRAV (fil:rad), tabellen DELAR (del, vem den kommer från, måttet den bär ur ranking-r1), vad du valde BORT och
  varför, siffrorna, risken. Diffen: `git diff --no-index src .arena/entempo/<mapp>/src > .arena/entempo/<mapp>/losning.diff`.
- Svara sist: `KLAR <mapp> poäng <x> <DISK eller OK> krav <antal av 5>`.

## FÖRTYDLIGANDE (ägaren 11-09 00:30: "allt skall ju ligga i analysatorn")
- Klockan (tempogrammet, rutnätet, ettan, tilliten) FLYTTAS IN i analysatorns långsamma väg. Analysatorn ska INTE läsa något från en
  taktväg utanför sig själv.
- Analysatorns egen tempovikning (scoreEnv/alignScore -> localBpm, skuggrutnätet) TAS BORT.
- Sektionerna, sectionBars, kickgrinden, boundaryDetector och ljuset läser analysatorns ENDA bpm, tillit och ankare.
- Rotorsak till oenigheten (megamix localBpm 93,7 mot klockans 125 = 3/4): kickmönstret har 3 kickar per 2 slag (beatFeed.ts:24, ~42 %
  av tiden) och analysatorns vikning saknar 2:3-logik – två sökningar på olika signaler ger var sitt "rätt" svar.
- a8:s fynd (skuggans tempoåterställningar ger sektionernas fart) löses i den enda klockans BREAK-tillstånd, med kickgrinden öppen i
  coasten – inte med en kvarvarande skugga.
