# Arenan fras, 2026-11-16 23:00 – 11-17 00:55: lookbytet på musikens fras

Ägaren: "Frasen, stor" (2026-11-16 kväll, borta från ladan i 20 h). Inget är inlagt i src och inget är utlagt. Vinnaren väntar på ägarens ord.
Bas = HEAD 720be60 (f0 inlagd, ingen env). Domare: tools/arena/frasdom.py (ny, 16a232e). Den mäter lookbytena (konsertReplay --slag, ny json
'switches') mot ägarens sektionsmarkeringar (marks-hand, klar) i Beat This-slag:
- gräns = andel gränser med ett byte inom ±1 slag
- lag = slag efter gränsen
- etta = andel byten på en Beat This-etta

Spärrar: lösa byten, alla byten, ljusdomaren (bank.py + domare.py v3 ≥ −1,5) och tillåtna filer.
Mängder:
- Övning: 151659, 171840, 193040
- Mellan: 172432 före 600 s
- Kontroll: 172432 från 600 s

## VINNARE: r0 (jokerns kombination) - bara effects.ts, 20 rader

| | övning | mellan | KONTROLL |
|---|---|---|---|
| byte på ägarens gräns, bas -> r0 | 12,7 -> 22,7 % | 9,1 -> 20,5 % | 15,7 -> 23,5 % |
| lag (slag efter gränsen), bas -> r0 | 10,0 -> 8,5 | 8,4 -> 7,5 | 10,5 -> 8,7 |
| byte på ettan, bas -> r0 | 17,7 -> 41,7 % | 6,8 -> 42,5 % | 17,1 -> 38,9 % |
| lösa byten /min, bas -> r0 | 1,14 -> 0,98 | 1,64 -> 1,54 | 1,48 -> 1,48 |
| alla byten /min, bas -> r0 | 3,52 -> 3,39 | 4,51 -> 4,10 | 3,71 -> 3,81 |
| poäng | +24,21 | +30,57 | +21,49 (bäst) |

Ljusdomaren: +1,5 (takt +2,5, dynamik −0,8, koreografi +4,0; slocknat +0,67 pe av 1,0).

FINALISTENS KONTROLLER:
- dropdom3, ensam: drop, minidrop och uppbyggnad är identiska med bas på alla tre filerna. Kostnad ×0,79, alltså inte dyrare (×1,30 i första
  körningen var trängsel med deltagarnas bänkar).
- latskak (takt och låtbyten, 5 starter): identiskt med bas på både övningen (95,85) och kontrollen (92,29).
- ettdom: ettan är identisk med f0 (86,5 %), eftersom analysatorn är orörd.
- Kodgranskning (orkestratorn):
  - Bara effects.ts ändras: inga flaggor, inga nya looks och ingen ny allokering.
  - Dropbytet och dropEntry går direkt som förut, och landningen ligger i en egen gren efter dem.
  - Nedtoning, strobe och vitt är orörda. MIN_HOLD 8 s är kvar.

## r0:s delar

| del | från | vad | bär |
|---|---|---|---|
| SWITCH_ON 1 -> 4 | a1, a3, a4, a5, a6 | sektionsbytet väntar in analysatorns etta (högst 5 slag) | ettan 17,7 -> ~42 % (~+12 poäng) |
| 2 s-åldern bort (SECTION_UNIT_MIN_MS) | a6, a2 (a3, a4 via datering) | dirigentens ~4 slag extra efter detektorn | lag ~−0,5 slag |
| väntklockan bara när bytet är tillåtet | a1, a3 | annars tog taket slut under spärren och bytet sköt mitt i takten | ettan |
| build in/ut/pool genom samma grind | a6, a3 | även uppbyggnadsbytena på ettan (drop orört) | ettan |
| LANDNINGEN | a7 | lookbyte direkt på analysatorns minidrop (basen tillbaka efter luckan), bara i high/intro, minst 6 s hållen look | gränsen 12,7 -> 22,7 % (~+10 poäng): 13 av 17 inom ±1 slag |
| uppslukning 24 s | a7 | detektorns sena eko av samma gräns tas inte | utan den: byten-spärren |
| landningen aldrig i low | jokern | a7 föll på ljuset (−4,3, släckt rigg) för landningar i low med mörka looker | ljuset −4,3 -> +1,5 |

## Ranking

RUNDA 1 (övning; mellan inom parentes):

| deltagare | idé | övning | mellan | ljus | status |
|---|---|---|---|---|---|
| a7 | lookbyte på minidropen | +27,8 | (+40,6) | −4,3 | DISK på ljuset; lagad +1,4 |
| a2 | snabbare detektor | +15,0 | (+14,5) | −2,7 | DISK på ljuset |
| a5 | klangnyhet takt mot takt | +13,9 | (+20,1) | +4,1 | OK |
| a3 | datera gränsen bakåt | +12,9 | (+19,9) | +0,4 | OK |
| a4 | frasprior var 8:e takt | +11,4 | (+15,9) | −0,9 | OK |
| a6 | dirigentens spärrar | +11,4 | (+19,0) | +0,8 | OK |
| a1 | vänta in frasen | +9,7 | (+8,4) | −0,4 | OK |
| a8 | nivåhopp som ägaren hör | +2,7 | (+0,5) | −0,2 | OK |

JOKERN r0 = grindarna (a1/a3/a6) + a7:s landning med ljuslagning: övning +24,21, mellan +30,57. a5:s nyhet ströks (en källa, gör samma jobb).

RUNDA 2 (remix från r0):

| deltagare | idé | övning | mellan |
|---|---|---|---|
| a6r | uppslukning i takter + landning tar över efter 1 takt | +31,39 | +30,75 |
| a2r | detektorn 4 block, in i refräng på 2, ut på 5 | +30,85 | +30,84 |
| a5r | klangnyhet ovanpå | +28,29 | +30,57 (= r0, slog aldrig till) |
| a3r | daterad gräns släpper uppslukningen | +26,75 | +29,20 |

Fusion (orkestratorn) = a6r:s dirigent + a2r:s detektor: övning +31,66, mellan +31,02.

FINAL (kontroll):

| plats | deltagare | poäng | gräns % | lag | etta % |
|---|---|---|---|---|---|
| 1 | r0 | +21,49 | 23,5 | 8,7 | 38,9 |
| 2 | a2r | +20,10 | 25,5 | 9,4 | 34,2 |
| 3 | fusion | +13,24 | 19,6 | 10,3 | 35,1 |
| 4 | a6r | +7,83 | 15,7 | 10,4 | 32,4 |

Kontrollmängden användes 4 gånger (finalisterna) + bas. Runda 2:s vinster på övningen (+2,5 till +7,2 över r0) höll inte. På mellan låg alla
inom ±1,4 av r0, och på kontrollen föll a6r (övningens etta) till sist, så de var överanpassade.

## Fynd värda mer än varianten
- Fördröjningen i bas, mätt av sex deltagare oberoende:
  - Detektorn kommer median 3 slag efter ägarens gräns.
  - Dirigenten lägger till ~4,6 slag, mest SECTION_UNIT_MIN_MS 2 s.
  - Detektorn MISSAR 27 av 83 gränser helt, mest vers->vers inne i 'high'. Det är där resten av lagen ligger, och ingen av de nya
    idéerna (nyhet, nivåhopp, frasprior, snabbare detektor) tog dem på okänd musik.
- Minidropen (basen tillbaka efter luckan) sitter på ägarens gräns: i 151659 låg 13 av 43 inom ±1 slag, median +0,2 slag. Det är den
  starkaste realtidssignalen för "ny del".
- Ljusdomaren dömer VILKEN look som råkar spela, inte bara tajmningen:
  - Samma tajmning gav −4,3 eller +1,5 beroende på om landningen valde "vidga" (mörknar i tysta partier) eller en annan look.
  - På 171840, där basens jitter är 18,5 ms, flyttar en enda ny look koreografin.
  - Ljusspärren på −1,5 är därför delvis brus om lookval. Gör inget åt det under en körning, men tänk på det inför nästa ljusarena.
- SWITCH_ON 4 föll två gånger förut (10-25, 11-15) med den felvalda ettan. Med f0:s etta ger den ljus +0,8 (a6) och ettan dubbelt.

## Risk bänken inte ser
- Live-mic: minidropen i ladan beror på analysatorns drop-del, som är oförändrad sedan 11-15 kväll (minidrop per lucka), men inte prövad
  i ladan ihop med lookbytet.
- Uppslukningen på 24 s kan svälja en äkta gräns. Jokern och a3r mätte 5 sådana på övningen. Låtar med en lucka var fjärde takt landar var
  7-8 s, men MIN_HOLD 8 s och 6 s hållen look begränsar det.
- Där ettan är fel hamnar alla sektionsbyten säkert på fel slag, högst 5 slag sent. Det gäller 171840 (45 % rätt) och tiden efter ett låtbyte innan ettan låst.
- Uppbyggnadsbyten kan komma upp till en takt senare än i dag.

## In i koden (väntar på ägarens ord)
Backup-tagg, sedan .arena/fras/r0/src/effects.ts -> src/effects.ts, bygg, commit. Ingen delad fil, så lotus påverkas inte.
Ladan: nästa besök, ihop med dagens fem andra ändringar och f0. Ögonprov: kommer nya looks när musiken går in i en ny del, på ettan?
Fladdrar det (två byten tätt) eller känns det sent?

Tokens ungefär 3,6 M (8 deltagare + a7:s lagning + jokern + 4 remixer, plus orkestratorn). Tid cirka 2 h. Alla lösningar och diffar
ligger i tools/natt/arena-2026-11-16-fras/ (idébanken).
