# Genomgång av öppna analysatorfynd 10-11 .. 10-19 mot dagens kod (2026-11-13)

Kod: HEAD c56ade9 (+ todo-commit 22b0675), engine/dist byggt 11-13 09:40. 14 fynd i tools/natt/analysator-fynd.md (rad 309-506).
Utfall: **LÖST 3, INAKTUELLT 2, KVAR 9, OKLART 0** (två av KVAR-fynden har en del som är löst resp. en kostnad som inte går att mäta här).
Inget i src/, dist/, analysator-fynd.md eller todo.md är ändrat. Kontrollmängden (lang1014, lang1107, KORPUS_HOLDOUT) är inte läst.

## 1. Tabell

| # | fynd | dom | belägg |
|---|---|---|---|
| 1 | 10-19 Workern får en KOPIA av cfg | **LÖST** | split.ts:101-103 (regeln dokumenterad, 6e08f41); cfg.beat skapas nu I långsamma vägen (split.ts:288) och levande värden går i hop-recordet (split.ts:244). Kodläsning |
| 2 | 10-19 frame.kick fyrar på kylningens kant | **KVAR** | pop_ladan 600 s: 3,24 kickar/s, medianintervall 283-293 ms = 0,61 slag, R mot rutnätet 0,01-0,18 (fyndet: 3,1/s, 283-309 ms, R 0,03-0,18). analyser.ts:2140-2141 |
| 3 | 10-19 Sektionen följer inte dropen upp i 'high' | **LÖST** | 23 lang, 57 drops: basen tillbaka inom 6 dB från taket = 22/23 'high' efter 2 s, 23/23 efter 4 s, 0 via 'build'. Alla drops +4 s: 72 % (fyndet 21 %). Profil rad 43-44, analyser.ts:1059/1086 |
| 4 | 10-18 54-73 B/hop på Node 18 | **INAKTUELLT** | Node 18 finns inte kvar på någon Pi (todo.md:1427-1428, Node 24.18 sedan 10-18); computeBpm borttagen (e451800, 97ac0bf). Det som allokeras i dag: se fynd 8 |
| 5 | 10-17 Tempot vandrar i breaket före/efter drops | **KVAR** | 40 drops utan låtgräns intill: klockan lämnar fönstrets tempo vid 18 (45 %; fyndet 14/29 = 48 %), >= 2 s vid 16 (40 %) |
| 6 | 10-17 Sektionen säger nästan aldrig 'build' före en drop | **KVAR** | 'build' inom 20 s före: 12/55 (22 %; fyndet ~10/62 = 16 %). Vid dropen: build 6, low 36, intro 14 av 57 |
| 7 | 10-17 kväll SKRÄPET HITTAT (tre orsaker) | **LÖST** | 6b4963e; rättningarna står kvar (analyser.ts:651, 706, 1146, 1213), computeBpm är borta. Kodläsning. Samma orsaker finns i NY kod - se fynd 8 |
| 8 | 10-16 Analysatorns skräp (GC) | **KVAR** | allocProf --fran 300, lang-191741: analyser.js 162,5 + analyserClock.js 265,8 = 428 kB/s (253 med live-flaggan); bygget 11-08 på samma fil: 79 (123) |
| 9 | 10-15 miniDropCount räknar i skurar | **KVAR** | 2 494 på 141 min = 177/10 min (fyndet 140), medianavstånd 0,5 s, 66 % < 1 s. Profil rad 60 (MINI_SPACING_MS '1'). Ingen läsare i ljuset (effects.ts:1477) |
| 10 | 10-14 20 s 'intro' efter låtgräns + fladder | **KVAR** (fladdret; intro-delen LÖST) | intro 8,9 % av tiden (fyndet 17 %), median 7,9 s efter gränsen. Fladder: delar < 8 s 34 % (fyndet 23 %), high>low>high 69 st (fyndet 6) |
| 11 | 10-13 Tempohopp inom låt | **KVAR** | samma 23 inspelningar: 93 utflykter = 0,67/min, 4,13 % av tiden; 78,7 % av tiden på låtens vanligaste tempo (fyndet 74 %) |
| 12 | 10-12 frame.buildUp är död | **KVAR** | lang-191741: max 0,00; pop_ladan: max 0,15, över 0,3 = 0 % (fyndet: 0,00 / 0,13). analyser.ts:2753-2756 oförändrad |
| 13 | 10-11 Kort break blir minidrop (BODY_GONE_MIN_MS 4000) | **INAKTUELLT** | profilen står på 2000 (rad 55) och värdet avgör inte längre hel drop: det gör flanken (analyser.ts:302-303, 2682-2687, 8f89cf1). Kodläsning |
| 14 | 10-11 Uppvärmningen de första ~15 s | **KVAR** | 50 övningsklipp: intensity 0,19 -> 0,00 (1 s) -> 0,32 (8 s) -> 0,34 (15 s) -> 0,45 (39 s). analyser.ts:810-811, 2277-2289 orörd sedan 10-11 |

### Vad domarna bygger på

- **Egen mätning i dag (10 st): 2, 3, 5, 6, 8, 9, 10, 11, 12, 14.**
- **Bara kodläsning, commit och tidigare anteckningar (4 st): 1, 4, 7, 13.**

## 2. KVAR-fynden: hur stort i dag och vad det kostar ljuset

**2. frame.kick (10-19).** pop_ladan 600 s: 3,24 kickar/s vid 125-130 BPM (2,1 slag/s). 73 % av intervallen ligger på 0,55-0,70 slag,
0 % på ett helt slag. Fasen mot klockans rutnät är likformig: R 0,01-0,18 i nio 60 s-fönster. Det är exakt fyndets bild; kylningen
är samma rad (0,6 slag, minst 170 ms). Kostnad: varje frame.kick ger en 250 ms-puls i kickEnv (effects.ts:1543, 1565-1568, läses
av ett tjugotal effekter), en knuff i show-tiden (effects.ts:1538), en direkt rendering (index.ts:209) och ett prov i klockans
tillit (analyserClock.ts:662-680). 3,2 gånger i sekunden i slumpfas, hela tiden.

**5. Tempot runt drops (10-17).** 23 lang-inspelningar (141 min), 57 drops, varav 40 utan låtgräns inom -12..+10 s. Vid 18 av dem
lämnar klockan fönstrets vanligaste tempo (8 mest till 2:3/3:4-syskon, 10 till annat), vid 16 i minst 2 s. 12,1 % av tiden i
fönstret -8..+10 s står klockan på avvikande tempo, mot 4,1 % i allmänhet. Klockan släpps aldrig (0 fall med bpm 0) och 33/39 har
samma tempo före som efter - felet är en utflykt, inte ett tapp. Bygget 11-08 på samma droptider: 17/45, >= 2 s 13/45, 10,0 % -
novembers klocka har inte flyttat det här måttet. Kostnad: allt som slår på rutnätet går i fel takt i 2-7 s kring dropen.

**6. 'build' före drop (10-17).** Vid dropen står etiketten på low 36, intro 14, build 6, break 1 (av 57). 'build' någon gång
-20..-1 s: 12/55; inom -8..-1 s: 11/55. 'build' är 7,0 % av tiden (fyndet 13,4 %). Med snabba kanterna (272aac7) faller etiketten
nu till 'low' när basen försvinner (high hela vägen före dropen: 12 -> 0 mot bygget 11-08). Kostnad: frame.buildProg räknas från
'build'-etiketten, så uppbyggnadens upptrappning saknas före fyra drops av fem. todo.md:187 säger samma sak: 'INTE löst'.

**8. Skräpet (10-16).** Samma metod som gav 183 -> 39 kB/s den 10-17 (allocProf --fran 300, konsertReplay --delad-cfg --step 5), nu på
lang-191741: analysatorfilerna 428 kB/s utan flagga, 253 med live-flaggan (--invocation-count-for-turbofan=100). Bygget 11-08 på
samma fil: 79 resp. 123. Hela motorn: 833 (428 med flaggan) mot 362 (217). Störst i dag: drainBig 58-68, subarray 60 (per hop i
drainBig, analyser.ts:1457), tgScore 19-63, onsetStep 25-49, updateInner 32-40, tgStep 26-32, dropStep 24-33 kB/s. Det är ny kod
(klockan 11-09, stora vägen, flank/lyft i dropStep med decimaltal som argument = fyndets orsak 2 igen). Kostnad för ljuset: live
ligger det mesta i workern (egen heap), så ljusvägen ser bara pushBig ~10-26 kB/s. Hur många GC-pauser det ger går inte att mäta
här - det kräver /api/perf från Pi:n (små städningar/min och längsta, i huvudtråden och i workern). En körning per variant, PC Node 22.

**9. miniDropCount (10-15).** 2 494 ökningar på 141 min mot 57 drops; 80 % av ökningarna kommer inom 2,6 s från förra. Bygget
11-08: 2 445. Profilvalet MINI_SPACING_MS '1' står kvar. Kostnad: ingen - effekterna läser dropDemoted/dropSpaced/stopCount i stället
(effects.ts:1454, 1477). Fältet är fortfarande oanvändbart som källa.

**10. Fladdret (10-14).** Intro-delen är borta: 'intro' står median 7,9 s efter en låtgräns (p90 8,0 = uppehållstiden) i stället för
20 s, 8,9 % av tiden i stället för 17 % (SECTION_CARRY 40, profil rad 39). Fladdret har däremot vuxit: inre sektioner < 8 s
172/513 = 34 % (bygget 11-08: 80/345 = 23 %), byten 3,63/min (2,44), high>low>high under 8 s 69 st (15), medianlängd 3,0 s.
Det kommer med snabba kanterna (272aac7). Kostnad: dirigenten byter look 3,17 gånger/min mot 2,53 (+25 %; nattrapporten 11-13 mätte
+29 % på kvällen). Om det är fel eller rätt (musiken faller faktiskt 4 dB) är ägarens ögonfråga i ladan.

**11. Tempohopp inom låt (10-13).** tools/tempoHoppUtflykt.mjs på samma 23 inspelningar: 93 utflykter (0,67/min, 35 till syskon),
4,13 % av tiden. Bygget 11-08: 98 (0,70/min, 10 till syskon), 4,65 %. Min räkning per låt (51 låtar, byte = > 3 % i >= 1 s):
2,13 byten/min, 65 % av tempoloppen kortare än 8 s (fyndet 43 %, annan definition), 78,7 % av tiden på låtens vanligaste tempo
(fyndet 74 %, bygget 11-08 72,2 %). På mixbänkarna har klockan blivit bättre (utflykter 1,39 -> 0,76/min på kontrollmängden,
RAPPORT-DMX.md), på ladans långinspelningar syns nästan ingen vinst. Kostnad: ett hopp var 90:e sekund, drygt 4 % av tiden i fel takt.

**12. frame.buildUp (10-12).** lang-191741 (585 s från 15 s): medel 0,0000, max 0,00, inRiser 0,00 % av tiden; level över 0,3 bara
5,8 % av tiden (grinden lvlSmooth > 0,3 och novSlow > 0,45 står kvar). pop_ladan: max 0,15. Kostnad: liten i sig - ljuset tar
max(frame.buildUp, frame.buildProg) (effects.ts:1923) och buildProg lever (> 0 under 100 % av build-tiden). Felet syns som fynd 6.
Kvar är beslutet fyndet bad om: laga fältet eller ta bort det och reglerna som läser det (DROP_CALM_BUILD, effects.ts:1095).

**14. Uppvärmningen (10-11).** 50 övningsklipp (frozen6, 40 s): intensity börjar 0,19, faller till 0,00 efter 1 s, når 0,32 efter
8 s och 0,45 först vid 39 s (median per klipp 30-40 s: 0,46). Kostnad: frame.intensity väljer nivå åt dirigenten (tierEma,
effects.ts:975), så showen väljer lugnt i 10-40 s efter motorstart. Efter tystnad går golvet i snabbläge i 8 s (activeMs nollas,
analyser.ts:2273, 2277) - inte mätt. Motorn går i timmar, så det är litet.

## 3. Rangordning av KVAR-fynden (störst först)

1. **Fynd 5, tempot runt drops** - 40 % av dropsen har klockan på fel tempo i minst 2 s, tre gånger tätare än annars, i kvällens mest sedda ögonblick; ägaren har påpekat det två gånger.
2. **Fynd 2, frame.kick** - enda felet som slår hela tiden: 3,2 pulser/s i slumpfas in i kickEnv, show-tiden, direktrenderingen och tilliten.
3. **Fynd 11, tempohopp inom låt** - samma klocka som fynd 5: 0,67 utflykter/min och 4,1 % av all tid i fel takt, oförändrat på ladans inspelningar sedan 11-08.
4. **Fynd 10, fladdret** - korta sektioner 23 -> 34 % och lookbyten +25 %; störst synlig följd av novembers ändringar, men kan vara önskat (ögonfråga).
5. **Fynd 6, ingen 'build' före drop** - fyra drops av fem kommer utan uppladdning i ljuset; ingen mätning som håller på båda mängderna finns än.
6. **Fynd 12, buildUp död** - samma symptom som fynd 6 men redan ersatt av buildProg; kvar är bara städbeslutet.
7. **Fynd 14, uppvärmningen** - bara motorstart och efter tystnad, 10-40 s.
8. **Fynd 8, skräpet** - ökat 2-5 gånger sedan 11-08 (med/utan live-flaggan) men mest i workerns egen heap; betyder något först om /api/perf visar pauser.
9. **Fynd 9, miniDropCount** - ingen läser fältet, noll verkan på ljuset.

## 4. Sidofynd under mätningen (hör inte till de 14)

- **Drop strax efter låtgräns når inte 'high':** 8 av de 16 drops som inte är 'high' efter 4 s har en låtgräns 0-6 s före; etiketten
  står oftast 'intro' i 8 s (uppehållstiden). Det är fyndet 10-20 i ny form. De andra 8 är svaga landningar (kroppen 8-23 dB under taket).
- **Syskonutflykterna har ökat på ladans inspelningar:** 10 -> 35 av utflykterna går till ett 2:3/3:4-syskon (bygget 11-08 -> HEAD),
  fast totalen är lika. En körning per bygge.
- **Nattens 'kick->ljus'** (showTight kickLag) utgår enligt verktygets egen beskrivning från analysatorns kick (fynd 2) och är då brus
  som mått. Inte kontrollerat i natt.py i dag.

## 5. Så mättes det

Allt ligger i .arena/triage1113/ (gitignorerad). En mätning åt gången, inga lås tagna.

| mätning | verktyg | material | utdata |
|---|---|---|---|
| sektion, drops, tempo, minidrop | tools/konsertReplay.mjs --delad-cfg --step 5 (befintligt) | 23 lang-*.wav i tools/ladan-2026-10-11 (141 min) | kr/ (HEAD), kr1108/ (--dist .arena/bf-gammal/dist) |
| utflykter | tools/tempoHoppUtflykt.mjs (befintligt) på replayens 10 Hz-rader | samma | utflykt-lang1011.txt, utflykt-lang1011-1108.txt |
| allokering | tools/allocProf.mjs --fran 300 (befintligt), med och utan flagga, HEAD och bygget 11-08 | lang-20261011T191741.wav | allocProf-191741*.txt |
| kick, buildUp, uppvärmning | falt.mjs (eget skript, analysatorn kopplad som sektionLag.mjs) | pop_ladan, lang-191741, 50 klipp ur KORPUS_OVNING | kick-pop.txt, build.txt, varm.txt |
| summeringar | krStat.mjs, tempoDrop.mjs, dropDetalj.mjs, fladder.mjs (egna, läser bara json) | kr/, kr1108/ | krStat*.txt, tempoDrop*.txt, dropDetalj.txt, fladder.txt |

Förbehåll:
- En körning per mätning; PC med Node 22, analysatorn delad inline (inte i worker som live).
- Jämförelsen mot bygget 11-08 använder HEAD-körningens droptider som ankare i båda, eftersom drop-kolumnen betydde något annat före 11-09.
- Mina tempomått per låt (fynd 11) och 'fönstrets vanligaste tempo' (fynd 5) är inte facit, och definitionerna är inte fyndens egna - jämför riktning, inte decimaler.
- Drop-urvalen är små (40-57 st): 29 % mot 40 % i fynd 5 är inom bruset.
- Basansats-referensen i falt.mjs hittar bara 1,31 ansatser/s; kickens avstånd till den är därför inte använt som belägg, bara intervallen och R.
