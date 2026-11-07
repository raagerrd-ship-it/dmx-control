# Dagkörningen 2026-11-07 - TILLITEN EFTER DROPEN (agent-tillit)

Ägaren i ladan 11-06: 'efter drop så tog det kanske 2-3 sekunder innan den tydligt visade takten igen'. Uppdrag: effektklockans takt
låst (tillit >= 0,8) inom ~1 s efter dropen utan att tappa dropsprånget eller variationen. Inget i src/ ändrat, inget byggt/deployat,
inga commits. Allt mätt mot samma baslinje (99b1d53, rattarna osatta = json-identiskt; dag-baslinje.json = hold-av.json från natten).

## Kort

- **Mixarna innehåller inte ägarens fall.** I megamix finns ingen kick-lucka > 0,61 s före någon av de 21 droparna (310 s: 2,4 s);
  tilliten 0-3 s efter dropen (0,67) = låtens egen nivå 5-15 s efter (0,70). 'Lås >= 0,8 efter > 1 s' mäter där låtar vars tillit
  ALDRIG når 0,8 (0,4-0,7 hela låten, t.ex. 435 s, 476 s, 560 s), inte dropen. Effekterna läser dessutom inte 0,8: effects.ts
  trustRaw = (conf - 0,20)/0,37 är full redan vid **0,57**, och dirigentens 'låst takt' kräver beatTrust >= 0,85. I kvällen (ladans ljud,
  natt.py:s körning) är beatTrust >= 0,85 vid 60 av 62 drops direkt; conf >= 0,57 vid 60/62.
- **Nattens 1,73 s / 24 drops** = mega 21 + pop 3 i samma dropTakt-anrop (pops tre ligger på 0). Megamix ensam: median 4,00 s.
  Medianen är dessutom en lotteri-siffra (se brus nedan) - använd medel och antal > 1 s.
- **Ägarens fall byggt syntetiskt** (tools/breakSyntet.py: 6 riktiga kvällslåtar x break 4/8/16 s utan trummor, -20 dB, dropen =
  musiken tillbaka): baslinjen ger 'takt85' (beatTrust >= 0,85) medel 4,5 s, > 1 s i 10 av 18, och 6,8 s efter 16 s-break - precis
  ladans 11-06 (dc 2->3: klockan borta i breaket, låst 4,2 s efter). **DMX_BREAK_HOLD_MS=20000 tar det till 0,26 s (> 1 s: 1 av 18;
  16 s-break 0,06 s).**
- **Nattens förkastande av hållet var brus.** Brusprov: samma ljud startat 1/2/3 hop (2,7-8 ms) senare. Mega dropsprång hög
  0,50/0,45/0,40/0,43 utan håll, 0,46/0,50/0,41/0,43 med håll (medel 0,445 mot 0,45). Nattens 0,50 -> 0,46 är bruset; baslinjens 0,50 är
  bandets topp. Per drop kommer nästan hela skillnaden från EN drop (435 s, frasraknare: 0,74 -> 0,37) där hållet inte ens var aktivt
  (analysatorns bpm 99 hela tiden) - frasräknarens blixt hamnade på ett annat slag efter att tillståndet divergerat tidigare i mixen.
- **Kvällens unika 70 -> 66 är verkligt men litet (-3) och kommer från en analysatorbugg.** Brus: 70/67 utan, 66/65 med håll.
  Analysatorns bpm blir 0 i 183 s av kvällen, ~16 episoder om 7-18 s MITT I MUSIK (2739 s: 'high', intensitet 0,6, kropp 30 dB,
  bpm 0 i 15 s, sedan 136-139). Utan håll nollas effektklockan där -> tillit 0 -> dirigenten väljer en takt-lös look (drumkit 5011 s,
  airglow 6761 s, tick 5169 s, alla med klockan 0) och låtens lookkedja forsätter annorlunda (stege, drops, dunk). Med håll går
  klockan vidare på rätt tempo (140 mot analysatorns 136-139 när den kommer tillbaka) och låten behåller sin look. Samtidigt hör ihop
  81/75 -> 81/84 och återseende 65/65 -> 65/69 (bättre). Det är variation som bugg-tappet skapade, inte variation ägaren bett om.
- **DMX_TRUST_UP och DMX_TRUST_LEAK_MS förkastas** (se tabellerna; UP 0,2 i natt.py: ljusLag 1021 40 -> 130 ms, sektion upp 2,6 -> 4,1 s, unika 70 -> 62): TRUST_UP flyttar jämvikten (asymmetrisk EMA, p = h*up/(h*up+(1-h)*0,12):
  60 % träff -> 0,79 med 0,3) - megas tillit 'låtens 5-15 s' 0,70 -> 0,79/0,85 = falsk tillit överallt, inte snabbare återkomst.
  LEAK_MS gör nästan inget: läckan multipliceras PER HOP (375 Hz) med 1-(tyst-1500)/L, så tilliten är ~0 redan 1,8-2,0 s efter sista
  kicken för L = 4000/8000/15000 (räknat: kvar vid 1,8 s 0,01/0,11/0,32, vid 2,0 s 0,00/0,00/0,04; i megas spår 310 s: 0,68 -> 0,20 på
  0,2 s). Kommentaren 'läcker över 4 s' stämmer inte; först L = 1 000 000 håller ~3,5 s.

## Tabell 1 - natt.py --snabb (tools/natt/2026-11-07-*.json)

| mått | dag-baslinje | tillit-hold20 (DMX_BREAK_HOLD_MS=20000) | restore20 (natten) | tillit-up02 (DMX_TRUST_UP=0.2) |
|---|---|---|---|---|
| mega dropsprång hög | 0.50 | 0.46 (brusband 0,40-0,50) | 0.49 | 0.36 |
| mega dropsprång lugn | 0.36 | 0.36 | 0.35 | 0.43 |
| pop dropsprång hög / lugn | 0.26 / 0.68 | 0.26 / 0.68 | 0.26 / 0.68 | 0.26 / 0.68 |
| mega kick->ljus ms | 187 | 189 | 187 | 157 |
| mega r / lampspr | 0.17 / 88.3 | 0.17 / 88.3 | 0.16 / 88.4 | 0.14 / 85.9 |
| ljusLag 90 % pop/mega/1021 | 15/15/40 | 15/-5/40 | 15/15/40 | 15/35/**130** |
| tempoMix klocka % | 84.5 | **86.9** | 84.5 | 84.8 |
| tempoMix lås s / inom 5 s | 2.81 / 127 | 2.72 / 125 | 2.81 / 127 | 2.57 / 126 |
| tempoMix hopp/min / icke-harm % | 0.57 / 8.0 | 0.55 / 7.0 | 0.57 / 8.0 | 0.57 / 7.1 |
| gridfas ms / grid40 % | 22 / 62 | 22 / **67** | 22 / 62 | 22 / 63 |
| sektion upp/ned s | 2.6/5.4 | 2.6/5.4 | 2.6/5.4 | **4.1**/5.4 |
| kväll hör ihop | 81 % | 81 % | 79 % | 86 % |
| kväll återseende | 65 % | 65 % | 65 % | 68 % |
| kväll unika / effektivt | 70 / 28.6 | 66 / 27.1 | 68 / 28.2 | **62 / 24.5** |
| kväll drops | 62 | 62 | 62 | 59 |

tillit-hold20 är json-lik nattens hold20 (samma kod som ratt). tillit-up02 är klart sämre: ljusLag 90 % 1021 40 -> 130 ms och mega
15 -> 35, sektion upp 2,6 -> 4,1 s (rattarna gäller även analysatorns skugg-BeatFeed, så kickgrinden/sektionen påverkas), kvällen unika
70 -> 62 / effektivt 28,6 -> 24,5, mega dropsprång hög 0,36 (under brusbandet), mega r 0,17 -> 0,14.

## Tabell 2 - brusprovet (samma ljud, start 0/1/2/3 hop senare)

| | utan håll 0 / 1 / 2 / 3 hop | DMX_BREAK_HOLD_MS=20000 0 / 1 / 2 / 3 hop |
|---|---|---|
| mega dropsprång hög | 0.50 / 0.45 / 0.40 / 0.43 (medel 0,445) | 0.46 / 0.50 / 0.41 / 0.43 (medel 0,45) |
| mega dropsprång lugn | 0.36 / 0.33 / 0.53 / 0.42 | 0.36 / 0.36 / 0.53 / 0.42 |
| mega drops | 21 / 22 / 23 / 21 | 21 / 22 / 23 / 21 |
| mega lås (>= 0,8) medel s / > 1 s | 4.84/12, 4.13/10, 4.83/14, 3.82/12 | 3.97/10, 3.55/10, 4.46/12, 4.15/13 |
| mega lås57 medel s / > 1 s | 1.59/7, 0.90/3, 1.20/5, 0.75/3 | 1.20/7, 0.38/2, 1.01/4, 0.81/5 |
| kväll unika (0 / 1 hop) | 70 / 67 | 66 / 65 |
| kväll effektivt | 28.6 / 27.9 | 27.1 / 26.6 |
| kväll hör ihop | 81 % / 75 % | 81 % / 84 % |
| kväll återseende | 65 % / 65 % | 65 % / 69 % |
| kväll drops | 62 / 56 | 62 / 56 |

Slutsats: dropsprång hög i megamix har en spridning på ~0,1 av ren slump (15 drops, en frasräknare-blixt på rätt/fel slag flyttar
medlet 0,025). Ett prov kan inte dömas på 0,04 där. Kvällens unika har brus ~3; hållets -3/-2 ligger i underkant på båda.

## Tabell 3 - megamix-spår per ratt (tools/tillitDrop.mjs, showTight ST_BEAT=1, 21 drops)

| ratt | lås57 medel / > 1 s | lås >= 0,8 medel / > 1 s / aldrig | tillit 0-3 s (låtens 5-15 s) | språng hög / lugn |
|---|---|---|---|---|
| baslinje | 1.59 / 7 | 4.84 / 12 / 3 | 0.67 (0.70) | 0.50 / 0.36 |
| DMX_TRUST_LEAK_MS=4001 (kontroll) | identisk | identisk | identisk | identisk |
| DMX_TRUST_UP=0.121 (kontroll) | 1.59 / 7 | 4.82 / 12 / 3 | 0.67 (0.70) | 0.50 / 0.36 |
| DMX_TRUST_UP=0.2 | 0.01 / 0 | 2.67 / 7 / 2 | 0.80 (**0.79**) | 0.36 / 0.43 |
| DMX_TRUST_UP=0.3 | 0.00 / 0 | 0.57 / 4 / 0 | 0.86 (**0.85**) | 0.36 / 0.45 |
| DMX_TRUST_LEAK_MS=8000 | 1.30 / 3 | 4.88 / 12 / 4 | 0.70 (0.71) | 0.43 / 0.49 |
| DMX_TRUST_LEAK_MS=15000 | 1.00 / 5 | 7.46 / 14 / 5 | 0.63 (0.66) | 0.41 / 0.37 |
| DMX_TRUST_LEAK_MS=1000000 | 1.00 / 3 | 5.61 / 15 / 4 | 0.72 (0.70) | 0.36 / 0.45 |
| DMX_BREAK_HOLD_MS=20000 | 1.20 / 7 | 3.97 / 10 / 2 | 0.68 (0.74) | 0.46 / 0.36 |

UP 0,2/0,3 'låser' för att tilliten blir högre i HELA låten (5-15 s efter: 0,70 -> 0,79/0,85), inte för att den kommer fortare,
och dirigenten byter då till takt-lookar (127 s gallop -> kickregn, 190/214/241 s gallop/backbeat -> tryckvag, 371/392 s sidokedja ->
frasraknare). LEAK-raderna skiljer sig från baslinjen bara genom divergens (megamix har inga tysta break).
pop: 3 drops, lås 0 i alla prov. lang-20261021T203952: 0 drops i showTight.

## Tabell 4 - ägarens fall, syntetiskt (tools/breakSyntet.py --gain 0.1, konsertReplay som kvällen, tools/tillitKvall.mjs --facit)

18 drops (6 låtar x break 4/8/16 s). takt85 = s tills effects.ts beatTrust >= 0,85 (dirigentens 'låst takt'), lås57 = conf >= 0,57
(effekternas ramp full), lås = conf >= 0,8 med klocka (uppdragets mått), 15 = aldrig inom 15 s.

| ratt | klocka borta före | takt85 medel / > 1 s | lås57 medel / > 1 s | lås medel / > 1 s | beatTrust 0-3 s |
|---|---|---|---|---|---|
| baslinje | 4 | 4.49 / 10 | 5.16 / 11 | 9.87 / 17 | 0.53 |
| **DMX_BREAK_HOLD_MS=20000** | **0** | **0.26 / 1** | 1.35 / 6 | 9.75 / 16 | **0.88** |
| DMX_BREAK_RESTORE_MS=20000 (bara upptaget) | 4 | 0.88 / 4 | 2.81 / 7 | 8.88 / 16 | 0.74 |
| DMX_TRUST_UP=0.2 | 3 | 1.80 / 6 | 2.00 / 7 | 4.33 / 12 | 0.75 |
| DMX_TRUST_UP=0.3 | 3 | 1.64 / 5 | 1.60 / 5 | 3.04 / 10 | 0.76 |
| DMX_TRUST_LEAK_MS=1000000 | 1 | 2.17 / 6 | 2.95 / 8 | 9.33 / 16 | 0.75 |
| HOLD 20000 + LEAK 1000000 | 0 | 0.34 / 2 | 0.71 / 5 | 8.16 / 15 | 0.90 |
| HOLD 20000 + UP 0.2 | 0 | 0.24 / 2 | 0.43 / 3 | 2.55 / 8 | 0.92 |

Per breaklängd, takt85 medel: baslinje 4 s 1,11 / 8 s 5,56 / 16 s 6,82; HOLD 0,48 / 0,24 / 0,06; RESTORE 0,19 / 1,07 / 1,37.
'lås >= 0,8' når inte under 1 s med hållet: upptaget sätter tilliten till värdet FÖRE breaket (låtarnas 0,6-0,7) - rätt beteende,
måttet 0,8 är fel ribba för de här låtarna. Bara UP 0,2 lyfter det, med falsk tillit som pris (tabell 3). Syntetens begränsning:
motorn räknar inga show-drops (0/18, sektionen blir 'intro' efter tystnaden), så dropsprånget går inte att döma här.
Det svagare HP-breaket (-6 dB högpass 250 Hz) tar inte tilliten alls: kickdetektorn hittar 'kickar' i högpassad musik och i brus
(tilliten för slumpkickar ~0,6-0,7 > rampens 0,57).

## Diagnos: varför hållet 'kostade' dropsprång och variation

1. Dropsprång hög (mega 0,50 -> 0,46): brus. Lookval och ljuset före dropen är lika vid alla 21 drops (samma look före/vid/efter
   i båda); skillnaden sitter i toppen efter dropen på några drops, mest 435 s (frasraknare, 0,87 -> 0,51 i topp), där hållet inte var
   aktivt - effektklockans fas hade divergerat sedan hållet varit aktivt tidigare i mixen (analysatorns bpm 0: 105-122, 311-326 och
   539-553 s; vid 310 s-dropen tar hållet låset från aldrig till 3,2 s). Brusprovet ger samma medel med och utan håll. Ingen mekanism 'takteffekter reagerar på hållet rutnät i breaket' syns: klockan var borta före bara 2 mega-drops.
2. Kvällens unika (-3, verkligt): analysatorns bpm 0 i 7-18 s mitt i full musik (16 episoder). Utan håll ger det takt-lösa lookar i
   de luckorna och en annan lookkedja resten av låten; med håll fortsätter låten med sin look. Variationen som försvinner är den
   bugg-tappet skapade. Inget patchförslag 'hållet rutnät ska inte styra lookar' - det skulle återskapa just tappet.

## Dom

**HÅLLER: DMX_BREAK_HOLD_MS=20000** (ett steg, mot samma baslinje). Löser ägarens fall (syntet: takt85 4,5 -> 0,26 s, 16 s-break
6,8 -> 0,06 s), tempoMix klocka 84,5 -> 86,9 %, icke-harm 8,0 -> 7,0 %, hopp/min 0,57 -> 0,55, grid40 62 -> 67 %, ljusLag och
dropsprång lika inom bruset, kvällen hör ihop/återseende lika eller bättre. Pris: kvällen unika -3 / effektivt -1,5 (förklarat ovan),
tempoMix inom 5 s 127 -> 125. Ägarens öga avgör om priset är värt det.
FÖRKASTADE: DMX_TRUST_UP (falsk tillit i hela låten, lookvalet flyttas), DMX_TRUST_LEAK_MS (verkningslös 4000-15000, se läckan),
kombinationerna HOLD+UP/HOLD+LEAK (UP:s falska tillit; LEAK håller takteffekterna pulserande i breakets första sekunder - inte
begärt, och HOLD ensam räcker).

Ögonprov (behåller kvällens pågående ladan-prov, ladan.conf skrivs om med exakt det som står på raden):

    python tools/ladan.py --env DMX_KICKREGN_PAR=1 --env DMX_BUILD_TOPP=1 --env DMX_BREAK_HOLD_MS=20000

Titta på: kommer takten direkt när dropen slår in efter ett tyst break (som dc 2->3 11-06)? Och: byter looken mitt i en låt utan anledning
mindre (hållet täcker analysatorns bpm-tapp mitt i musiken)?

## Patchförslag

Inget patchförslag. Två noteringar för den som rör beatFeed.ts senare:
- Läckan (beatFeed.ts rad ~230) multipliceras per hop: `rate *= 1 - (quiet - 1500)/TRUST_LEAK_MS` -> tilliten är borta ~0,3-0,5 s efter
  respiten, oavsett 'läcker över 4 s'. Rätta kommentaren, eller gör läckan linjär från värdet vid respitens slut, men då pulserar
  takteffekterna ~4 s in i breaket - ägarens öga först. Hållets upptag gör att det inte behövs för dropen.
- Analysatorns bpm 0 i 7-18 s MITT I MUSIK (kvällen 2739, 3052, 3278, 3340, 4634, 4827, 5005, 5161, 5470, 6761, 7700 s; int 0,5-1,0,
  kropp ~30 dB) är ett analysatorfynd utöver ÖPPET 2026-11-07 (som bara nämner break). Material: kvall-svep.wav, konsertReplay --step 5
  --delad-cfg --live-kick, kolumn bpm.

## Filer (nya, inga ändrade i src/)
- tools/tillitDrop.mjs - A/B per drop i showTight-spår (lås, lås57, låtens egen tillit, språng, look)
- tools/tillitKvall.mjs - lås/lås57/takt85 per drop ur konsertReplay-json; --facit för syntetens droptider, per breaklängd
- tools/breakSyntet.py - bygger ägarens fall: riktiga låtar med trumlöst break (pad -20 dB) 4/8/16 s
- tools/natt/2026-11-07-tillit-hold20.json, tools/natt/2026-11-07-tillit-up02.json (+ rader i scoreboard.md)
- skrapyta (spår, brusprov, syntet-wav): C:\Users\richa\AppData\Local\Temp\claude\60d245907d1be17d\c57dc893-0927-4d75-9f99-0e596758d32b\scratchpad\agent-tillit\
