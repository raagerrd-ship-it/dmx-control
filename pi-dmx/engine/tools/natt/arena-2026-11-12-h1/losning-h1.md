# h1 – RANGEN VÄLJER, KANTEN TAJMAR (uppföljningen av arenan bygg, 2026-11-12)

**Utfall: poäng +6,32 – DISK (ljusdomaren −14,6 < −0,5).** Analysdelen håller: etiketten är snabb OCH selektiv inom nya spärren på
andelen 'high', buildUp lever, de 13 övriga måtten står på +0,0. Men alla fyra mätta varianter faller i ljusdomaren, och hela fallet
ligger i en fil (lang1021). Det är alltså inte löst – se "Varför det inte gick".

## Idén

**Sektionen.** Rangen (percentilen mot låtens historia, orörd) avgör fortfarande VILKA partier som är 'high'; nivåns kant mot
referensen (senaste 'high'-partiets nivå, `lastHighDb` – samma tal som `levelVsHighDb` mäter mot) avgör NÄR. UPP: blocket ligger 4 dB
över medianen av frasen före och når referensen → 'high' direkt. NED: blocket ligger 4 dB under referensen (blocket före minst
halvvägs) → ur 'high' direkt till 'low'. Och rangen får inte ta tillbaka ett parti som fortfarande ligger under den refräng musiken
lämnade – då är rangens topp 'build' (på väg upp). Det är därför andelen 'high' ligger kvar vid basens: kanten lägger till tid i
början av partierna och tar bort tid i slutet, rangen väljer partierna som förut.

**Uppbyggnaden.** `frame.buildUp` = förloppet genom sista frasen (4 takter) före den väntade höjningen (`expectHighInMs`, en källa;
b4:s mätning). Förutsägelsen ställs bara när något talar för en höjning: energin stiger (befintlig regel) eller partiet är 'break'
(svackan efter ett starkt parti) eller 'build' (rangen på väg upp) – då nästa frasgräns från partiets start. I 'low'/'intro' och i
'high' är den 0. Sågtanden i långa lugna partier (b4:s svaghet) är borta: buildUp > 0,35 under 9–13 % av tiden.

## Var snittet går

I analysatorn (`sectionBlock`, `predictHigh`, `fillFrame`, `hintTrackChange`) – tre tal, alla om musiken:
- `SEC_EDGE_DB = 4`: så stort är ett nivåskifte som räknas som kant (samma tal upp, ned och för "når referensen").
- frasen = 4 takter ur klockan (medianen av blocken i frasen före – ett hål eller en smäll på ett par slag flyttar den inte).
- `BE_MEM_BEATS` (240 slag, basenergins befintliga referensminne): så länge håller referensen rangen tillbaka.
Inga hålltider, ramper eller kurvor. Förra låtens referens bärs över låtgränsen som blocken (SECTION_CARRY), bara för UPP-kanten.
Rangen, dess lopp och uppehållstider är orörda; riserns envelope (`this.buildUp`) är kvar som dropdetektorns egen evidens – därför är
drops och låtgränser identiska med bas på alla fyra filerna (minidrops samma antal).

Ur `effects.ts`: `buildProg`, `buildSecAt`, `buildSecSeen` och blocket "slag sedan build / 32" är borta; `ctx.buildUp`, showTime och
sektionstakets build-steg läser `frame.buildUp`. Dirigentens `inBuild` läste redan analysatorns fält (orörd).

## Diffen

`diff.patch` (`git diff --no-index src .arena/bygg/h1/src`, 2 filer: analyser.ts +54/−11, effects.ts +5/−11).

## Siffrorna (övning, mätning 4 av 4)

| mått | bas | h1 | % |
|---|---|---|---|
| mix_klocka | 97,88 | 97,88 | +0,0 |
| mix_las | 2,78 | 2,78 | +0,0 |
| mix_hopp | 0,00 | 0,00 | +0,0 |
| mix_still | 2,93 | 2,93 | +0,0 |
| klipp_klocka | 98,32 | 98,32 | +0,0 |
| ettan | 100,00 | 100,00 | +0,0 |
| grid40 | 53,38 | 53,38 | +0,0 |
| gridfel | 20,00 | 20,00 | +0,0 |
| upp_s | 12,75 | 1,70 | +86,7 |
| ned_s | 6,00 | 2,10 | +65,0 |
| traff | 75,86 | 93,33 | +23,0 |
| korta | 30,85 | 33,94 | −10,0 |
| bygg | 0,20 | 13,66 | +100,0 |
| drop_traff | 100,00 | 100,00 | +0,0 |
| drop_falska | 0,00 | 0,00 | +0,0 |
| drop_ms | 216,00 | 216,00 | +0,0 |
| gr_ratt | 73,33 | 73,33 | +0,0 |
| gr_falska | 0,00 | 0,00 | +0,0 |

Långsamma +14,70 %, latens 85 ms mot bas 80 (−6,2 %; `vikning` 50 → 55 i ljusLag på lang1021 – den snabba vägen är orörd, det är
ljuset som flyttat sig). Worker p99 5 hop (bas 5), 46,1 us/hop, cpu-kvot 0,96.

**Andel 'high' per fil (bas → h1):** lang1021 62 → 51 %, pop 44 → 41 %, megamix 72 → 73 %, lang1011 55 → 58 %. Spärren (bas + 10)
hålls med marginal; tre av fyra inom ±5.

**Ljusdomaren −14,65** (takt −17,6, dynamik −1,5, koreografi −29,9). Per fil, de andra satta till bas: **lang1021 −14,0**, pop −0,01,
megamix −0,43. lang1021: rAbest 0,326 → 0,238, rK 0,269 → 0,179, jitter 25,9 → 55,6 ms, betoning 0,279 → 0,237, medelljus 0,40 → 0,30.
Lampspridning lang1021 +29,5 %, pop −1,6 %, megamix +3,6 % (medel +10,5 %); inga av domarens spärrar (lampspr, slocknat, fladder,
t90) löste ut.

**De fyra mätningarna** (filer + json i `varianter/`):

| | variant | upp_s | ned_s | traff | korta | bygg | high per fil | ljusdomaren (varav lang1021) |
|---|---|---|---|---|---|---|---|---|
| 1 | kanter (ned → 'break') + buildUp | 2,00 | 2,10 | 93,1 | 34,2 | 13,3 | 54/41/73/59 | −8,4 (−7,8) |
| 2 | bara kanterna, buildUp och effects.ts orörda | 2,00 | 2,10 | 93,1 | 34,2 | 0,2 | 54/41/73/59 | −9,0 (−8,0) |
| 3 | kanter (ned → 'low') + buildUp | 2,00 | 2,10 | 93,1 | 34,9 | 9,2 | 54/41/73/59 | −14,9 (−14,3) |
| 4 | 3 + rangen hålls tillbaka = leveransen | 1,70 | 2,10 | 93,3 | 33,9 | 13,7 | 51/41/73/58 | −14,6 (−14,0) |

**Sämre:** `korta` 30,9 → 33,9 % (37 av 109 delar mot 29 av 94; b3/b4 hade 42–50). De nya korta är verkliga: fallet vid låtslut före
låtgränsen, och break → drop på 1–6 s. Sektionsbyten per minut: lang1021 2,4 → 3,6, lang1011 2,4 → 3,0, megamix 3,1 → 3,4, pop lika.
buildUp som förutsägelse är svag: 8 av 28 fullgångna fraser följs av 'high' inom ±2 s (29 %).

## Varför det inte gick

Mätning 2 (bara kanterna, effektsidan orörd) faller lika mycket som mätning 1 – det är alltså etikettens tajmning, inte buildUp, som
ljusdomaren fäller, och bara i lang1021. Där växlar musiken starkt/tyst var 20–25:e sekund (−10 mot −17 dB); bas står kvar i 'high'
genom de tysta partierna (201–220 s helt, 156–171 och 246–260 s till större delen), h1 följer dem. Pop, där etiketten knappt
flyttar sig de första 300 s, är oförändrad (−0,00 i mätning 2). Att kalla de tysta partierna 'low' i stället för 'break' (mätning
3) hjälpte inte – lugn-poolen var inte orsaken.

Vad jag INTE vet: mekanismen på effektsidan. Jag har inte kört effektmotorn utanför de fyra mätningarna (sonderna är
analysator-only), så vilka looker dirigenten valde är inte observerat. Rimliga kandidater, obevisade: fler lookbyten (7 inträden i
'high' mot 5; `HIGH_VARV = 4` roterar looken från fjärde besöket), `MIN_HOLD` 8 s som låter förra partiets look ligga kvar in i
nästa, och lookvalets lotteri (megamix lampspridning +3,6 % i mätning 1 mot −19,1 % i mätning 2 med exakt samma etiketter – bara
buildUp skiljer).
Nästa steg som avgör: dirigentens logg (`[dirigent] sektion/manus`) på lang1021 150–300 s, bas mot h1.

Slutsatsen till ägaren: etiketten GÅR att få snabb inom spärren på andelen 'high' – men en etikett som följer lang1021 rätt ger
sämre siffror i ljusdomaren än en som står kvar i 'high'. Antingen ska dirigenten tåla tätare sektionsbyten (effektsidan, ägarens
bord), eller så mäter ljusdomaren här lookblandningen snarare än ett fel. Inget av det går att lösa i analysatorn utan att välja
tal för ljusets skull.

## Risken

- Referensen är refrängens MEDEL: ett långsamt avtagande parti ger ingen kant (rangen tar det, som i dag).
- Rangen hålls tillbaka upp till 240 slag om en ny låt utan upptäckt låtgräns ligger > 4 dB under den förra refrängen.
- Blocken är 1 s: kanten kommer 1–2 s efter skiftet, aldrig snabbare; domaren ser 19 skiften upp och 11 ned – medianerna är sköra.
- buildUp går som sågtand var 4:e takt i 'build'/'break'; build-effekterna var byggda för 32 slags ramp och dirigentens `inBuild`
  (> 0,35) slår till i slutet av varje sådan fras.
- Lotus delar filen och är inte provad.

## Kvar i idébanken (simulerat, inte mätt)

- Dropen som kant i stället för 7 s hålltid (`secDropHoldUntil` → rangen ställs på 2): 109 → 101 delar, men 'high' +2–4
  procentenheter (megamix 77, lang1011 61).
- Sonderna: `sond.mjs` (dump), `anal.py` (domarens sektionsmått, sanna tidsaxlar), `sim.py` + `svep.py` (etikettlogiken offline ur
  blockdumpen – återger bas exakt, 0–2 prov av 5922 skiljer; kräver `nb`/`songStartMs` i `dbgSecBlock`, se varianter/v1).
