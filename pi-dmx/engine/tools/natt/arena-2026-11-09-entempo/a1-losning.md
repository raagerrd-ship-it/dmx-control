# a1 – tempogrammet som enda källa (arena entempo)

## IDÉN
Effektklockans sökning i taktvägen (beatFeed: tempogrammet + rise-rutnätet + taktmodellen) är nu den enda tempokällan. Skugg-BeatFeed:en
är borta: analysatorns kickgrind och taktfas får klockans inre rutnät + EN fast kickfas (45 ms), och ramens `frame.bpm`/`frame.bpmConfidence`
sätts efter matningen till klockans värden (`publishClock`), så effekterna läser samma tempo och tillit som de följer.

## DIFFEN
`losning.diff` (beatFeed.ts: skuggan bort, `kickFold`-grenarna bort, analysatorns rutnät = inre ankare + `KICK_PHASE_MS`; split.ts:
`publishClock` i `HopLaneFast.feed`; index.ts: samma i den odelade vägen).
Kickfasen är mätt med `a1/offset.mjs` på engine/dist, 6 fönster om 60 s ur övningens lång-filer. Analysatorns kickar ligger median +30..+65 ms
(mod halvslag) efter rise-rutnätet. Skuggan låg på +4..+116 ms och vandrade alltså med låten.

## SIFFRORNA (mätning 1 = levererad kod; `tvavagar.json` är mätning 1, mätning 2 ligger i `tvavagar-mat2.json`)
- Poäng **−4,00**: långsamma −6,41 %, snabba −0,39 % (cpu 43,0 mot 42,7 µs/hop, latens 85 = bas). Workern p99 6 hop (gräns 22).
- Ljusdomaren +1,3, men spärren **lampspr pop −7,7 %**.
- Spärren **upp_s 1,85 s mot 1,35 s och ned_s 2,80 s mot 2,25 s → DISK**. Sämre blev även mix_still (4,15 → 5,81 s) och gridfel (15,1 → 17,0 ms).
  Bättre blev korta och ettan (+1,6). mix_klocka och klipp_klocka är oförändrade.
- Mätning 2 lade till en regel: analysatorn låses om (resetTempo) när dess tempo ligger utanför klockans oktaver i 4 s. Den gav −5,80
  och sämre sektioner (ned_s 3,50 s), mix_hopp 0,08 → 0,29 och ljusdomaren −1,2. Regeln är förkastad och borttagen.

**Fyndet (gratis-skript `a1/rt.mjs`, 60 s-fönster):** skuggans fördel i sektionerna kommer inte från fasen. KICK_PHASE_MS 5/45/80/110 ändrade
antalet kickar med högst ±2 %. Den kommer från att skuggans coast nollade analysatorns tempo när analysatorn hade fel tempo:
- lang1021 120–180 s: 3 resetTempo, bpm 0 i 25 % av tiden, 193 kickar och 6 sektionsbyten. Med a1: 0 resetTempo, 162 kickar och 4 byten.
- pop 120–180 s: samma mönster.

Analysatorns kickdetektor släpper alltså fram fler kickar när den saknar tempo, och sektionerna lever på det. Skuggans "dåliga" rutnät var
i praktiken en återställningsmekanism.

## DUBBLETTER KVAR
- Analysatorns egen temposökning (`localBpm`) finns kvar. Gränsdetektorn läser `frame.bpm` före matningen, och klockan använder den för
  första låset och för tystnad (bpm 0). Den behövs tills kickdetektorns och sektionernas beroende av `localBpm` är utrett (fyndet ovan).
- beatIdx/beatCounter, de två pulskurvorna, halveringspariteterna, taktgrinden (sectionBars) och låtgränsen till klockan är inte gjorda.
  Budgeten räckte inte när första steget redan bröt sektionsspärren.

## RISKEN
- `publishClock` skriver över ramens bpm/tillit varje hop. På Pi:n i worker-läge läses tillståndsblocket asynkront, så under de första
  hoppen (innan något resultat kommit) ser effekterna 0/0 i stället för analysatorns värden.
- Frasräknaren nollas inte längre i break (klockan håller 20 s), vilket ändrar lookbytena. Det syns som lampspr pop.
- Den fasta kickfasen 45 ms har en spridning per låt på ±50 ms mot den gamla skuggan. Vid 160 BPM är grindens tolerans 56 ms.

KLAR a1 poäng -4.00 DISK
