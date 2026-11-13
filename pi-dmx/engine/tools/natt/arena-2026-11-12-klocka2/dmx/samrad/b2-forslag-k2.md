# b2 – förslag från k2

## 1. Vad är felen på kontrollmängden?
| kontroll, bas | |
|---|---|
| fel tempo i mixen | 16,6 % (mix_klocka 83,4) |
| därav syskontempo | 8,3 % |
| därav annat / inget lås | ~8,3 % |
| i utflykt | 4,7 % |

- dmx-1 ändrade mix_klocka och klipp_klocka med **exakt 0,00**. Vittnet får ordet bara när tempogrammets marginal mot bästa syskon
  är under 1,10. Att ingenting rör sig betyder att tempogrammet är SÄKERT när det har fel där: syskonfelen på kontrollmängden är
  stadiga, självsäkra fel (k4: en låt på 2/3 hela låten), inte vacklan mellan två nästan lika.
- Bara 4,7 % av tiden är utflykt, men 16,6 % är fel. Minst 12 % av tiden sitter klockan alltså still på fel tempo. Det är inte
  växling, och därför tog varken gårdagens håll eller dagens vittne det.
- Hälften av felet (~8 %) är inte ens ett syskon. Det kan vara sen låsning på svaga låtar, eller facit som inte är det klockan hör.
  Det kan jag inte avgöra härifrån.

**Övningsmaterial som liknar det:** övningsmixen gör det inte (97,9 %, och dess fel är sen låsning: rivstart, kaleb). Det som
liknar är låtar där basen i dag sitter STADIGT fel. Två ställen att leta, ingen körd:
- De svåraste övningsklippen (bas: rivstart 0,77, kaleb 0,84, backtrack jack 0,91 och 0,94, cooper 0,93). Fem klipp, mest sen start.
- Lotusbankens övningsdel från i går (126 filer med facit, 10 fel hos bas). Där finns just den sorten: Klaas – Cambodia står stadigt
  på 97,7 mot facit 130 (3/4), fler står på "annat". Ljudet är inspelade låtar, inte lotus-micen; körda genom DMX-kedjan
  (`tempoHoppDiag` med fil + facit) är de en sond för "självsäkert fel". Om det ryms i "bara DMX" är orkestratorns sak att säga.

## 2. Förslaget för omgång 2: dmx-2 = dmx-1b + RIKTAD KRONA (en rad i `onsetStep`)
dmx-1b föll med 0,007 s på låt 5 (3,24 s; k4b 2,73). Låsen är k4b:s i alla 16. Det som flyttade låt 5 är inte vittnet utan
fintempots krona: den håller klockan kvar i svackan under övertoningen en sökning till (samma sak som i samrad-1 i går).

**Mekanismen:** kronan finns för att två lika bra grannsteg inte ska växla varannan sökning. Den ska inte hålla klockan kvar LÄNGRE
från tempogrammets topp än nödvändigt. Alltså: grannen måste vara 6 % bättre bara om den ligger längre från `tempoBpm` än klockans
eget tempo; ett steg tillbaka mot toppen tävlar som i basen. Samma tal (1,06), en riktning till – inget nytt att trimma.

    // i dag (k4b):  score = (mx / mean) * (c === 0 && scanStep === 0.005 ? SCAN_HOLD : 1)
    // dmx-2:        score = (mx / mean) / (c !== 0 && scanStep === 0.005 && tempoBpm > 0
    //                         && |bpm − tempoBpm| > |scanC0 − tempoBpm| ? SCAN_HOLD : 1)

**Sond (fri, övningsfilerna 86,7 min, `k2-riktad/`; dmx-1b körd i samma kedja bredvid):**
| | dmx-1b | dmx-1b + riktad krona |
|---|---|---|
| utflykter / min | 21 / 0,24 | 20 / 0,23 |
| utfl_tid % | 1,18 | 1,21 |
| lås efter låtbyte, 16 låtar | = k4b | = k4b (alla 16) |
| låt 5 (sonden träffar domaren: 3,2 mot 3,24) | 3,2 | **2,9** |
| låt 6 / 9 / 13 / 14 | 0,85 / 2,5 / 3,1 / 2,65 | 0,15 / 2,5 / 3,1 / 2,65 |
| låt 15 (sonden opålitlig; domaren 10,57) | 11,3 | 8,4 |
| pålitliga låtar ≤ 3,23 s | 8 | **9** |

Med nio pålitliga låtar under gränsen behövs inte låt 15. Nionde värdet blir låt 13 (3,15 s i domaren, k4b:s eget), alltså
samma marginal som k4b har i dag (0,08 s) – inte bättre än så.
I går på samrad-1 gjorde samma rad låt 9 8,3 → 2,5 och låt 5 4,0 → 3,5 med utflykterna oförändrade.

## Utgången i förväg
- **Bar på övningen** om mix_still ≤ 3,233 med låt 5 ≤ 3,0 s i domaren, låsen = k4b:s, och inget av mix_klocka, klipp_klocka,
  mix_las, utfl_min sämre än dmx-1b:s (98,28 / 98,64 / 2,78 / 0,24). Då går den till kontrollmängden.
- **Föll på övningen** om mix_still fortfarande är över, eller om låt 5 klarar sig men en annan låt under gränsen flyttar över.
  Då ingen fler ändring i sökningen från mig – det vore trimning mot 16 låtar.
- **På kontrollmängden:** ny ledare bara om den slår k4b:s +7,59 utan DISK.

## Vad jag väntar mig, rakt sagt
- Jag tror den klarar övningen. Sonden har träffat domaren på låt 5 varje gång.
- Jag tror INTE att den slår k4b på kontrollmängden. Vittnet gav där −1,29 ovanpå basen (syskon_tid och utfl något sämre, rätt-tempo
  oförändrat). Ovanpå k4b är det troligaste utfallet k4b minus en poäng. Den riktade kronan kan flytta mix_still åt båda håll.
- Därför är det verkliga värdet av mätningen att få veta om övningens +13,99 är något på nytt ljud. Säger kontrollmängden nej är
  svaret på ägarens fråga: på DMX-signalen vi har är k4b det bästa vi kan visa, och det som återstår (12 % stadigt fel) kräver en
  sond på låtar där klockan sitter självsäkert fel – det materialet har vi inte prövat något på.

## Det jag inte vet
- Om den riktade kronan ensam ovanpå k4b (utan vittnet) vore bättre på kontrollmängden. Det är den variant jag själv skulle vilja
  se där, men den är inte sonderad och k4b:s låt 14 (3,46 s) gör övningens marginal osäker.
- Om låt 13:s 3,15 s står kvar i domaren med ändringen; i sonden gör den det (3,1).
