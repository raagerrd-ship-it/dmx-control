# DMX-rundan (klocka2dmx) – 2026-11-13 00:10–01:40

Ägarens ord: "Så lås är det viktigaste. Den borde väl låsa om om den hör ny takt?" / "Om vi struntar i lotus i bänken och bara kör
mot ladan/dmx där signalen är renare mm. Lotus får ju ändå info från sonos." / "Kan inte de tre agenterna få informationen att de
enbart skall köra mot dmx. Och se om de kommer fram till något nytt. Och de får gärna tänka helt nya infallsvinklar, lite outofthebox"

## Utfallet på en rad

**INGET ÄR INLAGT I src/.** Ledare efter ALLA spärrar: **dmx-1b +8,44** på kontrollmängden (k4b + taktens självlikhet som vittne),
före k4b +7,59. **dmx-2 (+ parabel i fintempot) fick högst poäng i klockdomaren, +10,99, men är DISKAD i tvavagars analysspärrar:**
den förstör rutnätet (ettan 100 → 62 %, rutnätsträff inom 40 ms 53 → 27 %, rutnätsfelet minst fördubblat) och sektionens uppgång
1,70 → 1,95 s. Klockdomaren mäter inte rutnätets fas och såg det inte. dmx-1b är ren i samma spärrar. Vinsten i dmx-1b mot bas
sitter i FEL TEMPO (per minut −45 %) och tempobyten (−46 %). **Omlåsningen efter låtbyte flyttade ingen variant** (3,02 s = bas hos
alla), och rätt-tempo-andelen flyttades bara av k4b:s del (+1,1 procentenheter i mixen).

## Kontrollmängden, DMX-domaren (vikt 2 på rätt tempo och omlåsning)

| mått | bas | dmx-2 (DISK tvavagar) | **dmx-1b** | dmx-2b | k4b | samrad-1 | k2c | dmx-1 |
|---|---|---|---|---|---|---|---|---|
| mix_klocka % (×2) | 83,41 | 84,47 | 84,53 | 84,51 | 84,53 | 83,02 | 83,11 | 83,41 |
| klipp_klocka % (×2) | 85,78 | 86,45 | 86,45 | 86,45 | 86,45 | 86,45 | 86,33 | 85,78 |
| mix_las s (×2) | 3,02 | 3,02 | 3,02 | 3,02 | 3,02 | 3,02 | 3,02 | 3,02 |
| mix_hopp /min | 0,67 | 0,36 | 0,36 | 0,36 | 0,36 | 0,78 | 0,62 | 0,67 |
| mix_still s (±1 %, spärr) | 3,72 | 3,72 | 3,72 | 3,72 | 3,72 | 3,92 | 3,41 | 3,72 |
| mix_still_ny s (±3 %, bara redovisad) | 1,80 | 1,60 | 1,60 | 1,60 | 1,60 | 1,80 | 1,80 | 1,80 |
| utfl_min | 1,39 | **0,59** | 0,76 | 0,78 | 0,78 | 0,66 | 1,17 | 1,49 |
| utfl_tid % | 4,66 | 4,00 | 4,77 | 5,00 | 5,03 | **3,64** | 3,88 | 4,87 |
| syskon_tid % | 8,28 | 8,37 | 8,32 | 8,51 | 8,52 | 7,90 | **7,84** | 8,48 |
| **poäng** | 0 | +10,99 DISK | **+8,44** | +7,66 | +7,59 | +5,34 | +4,94 | −1,29 |

Övningen: dmx-2 +14,03 (mix_klocka 98,23, mix_las 2,78, mix_hopp 0,00, mix_still 3,15, utfl_min 0,24, utfl_tid 1,20, syskon_tid 1,43),
dmx-1b +13,99, dmx-2b +12,61, samrad-1 +10,53, k2b +9,75, k2c +9,63, k4b +6,44, dmx-1 +3,38. Ingen DISK med gällande gränser.

## Vad varianterna är (bara analyserClock.ts; `dmx/dmx-1b.diff` = del 1 + 2, `dmx/dmx-2.diff` = alla tre; applicerar rent mot 97ac0bf)

1. **k4b** (gårdagens finalist): regent efter säker låsning, okänt tempo = ny låt, blippspärr, fintempots hysteres.
2. **Vittnet (jokern, NYTT):** taktens självlikhet – upprepar sig ansatsmönstret när det flyttas 2 och 4 slag? Räknas en gång per varv
   i en egen ring (10 s) och dömer bara mellan klockans tempo och dess syskon: veto när tempogrammet vill till ett syskon men
   regentens mönster är tydligt, rättning när ett syskons mönster är tydligt fem varv i följd. Tiger 10 s efter ett tempobyte som inte
   är ett syskonbyte, så omlåsningen rörs inte.
3. **Parabeln (k4, 7 rader, `dmx/parabeln-ovanpa-dmx-1b.diff`):** klockans egen sökning lade tempot på närmaste 0,5 %-steg, så två
   nästan lika bra grannar gav ett tempo som hoppade ett helt steg. Toppen läggs nu med parabel genom vinnaren och dess två grannar
   (som tempogrammets topp redan gör). Klockans avstånd till tempogrammets tempo halveras (0,20 → 0,10 % i sonden).
   OBS: en parabel i fintempot provades 11-10 ovanpå basen (prov/fintempo-parabel-20261110.patch) och föll då på ned_s, mix_still
   och ettan – och den här formen föll på samma sak, hårdare (se tvavagar sist). Fintempot ska inte flyttas mellan stegen utan
   att rutnätets fas följer med.

## Vad som var nytt, och vad sonderna sa (steg A: var för sig, utan att läsa varandra)

- **Var tiden går vid ett låtbyte (alla tre, oberoende):** tempogrammet har rätt nytt tempo 2,7 s efter övertoningens slut och klockan
  följer 0,1–0,2 s senare. Jokerns och k2:s efterbildningar sa att en rå vikning utan minne har rätt efter 1,0 s; k4 kontrollerade i
  motorn: **1,9 s**, alltså 0,8 s att hämta – och bara mot falska byten (0,8 s vinst kostar 1,0 falska byten per minut).
- **Ingen beslutsregel på samma signal låser om fortare.** k2 prövade tre (kvoten stiger tre varv, tempogrammets form byter, rå topp
  stadig), k4 fyra (kort öra 2 s, räkna bort regentens takt, kickarnas egna intervall, trenden): alla lika långsamma som dagens vid
  samma falsktal, eller 0,2–27 falska besked per minut. Kickarnas tillit är döv för en ny takt (kickgrinden släpper bara igenom
  kickar på det gamla rutnätet).
- **Bandet som bär pulsen (k2):** diskanten ensam hör två svaga låtstarter 2–3,6 s tidigare men är sämre inne i låtarna (90,5 mot
  93,6 %); villkoret "när basen saknar puls" slår inte till, eftersom förra låtens bas fortfarande pulserar under övertoningen. Föll.
- **Taktens självlikhet (jokern; k2 och k4 pekade på samma sak):** den enda nya SIGNALEN som bar en sond – rätt mot syskonen
  97,7 → 99,5 % av fönstren på övningsmixen; i osäkra fönster har tempogrammet rätt i 36 %, självlikheten i 86–89 %.
- **Klockan dömer sina egna förutsägelser (jokern):** faller med dagens signaler (tilliten halveras först efter 7 s).
- Sidofynd: basen ensam har rätt tempo i 90,2 % av fönstren, diskanten 96,2 %, produkten 97,7 %, minst en av dem 99,2 %.

## Samrådets tre omgångar

| omgång | byggt | övning | kontroll | utgång enligt det i förväg bestämda |
|---|---|---|---|---|
| 1 | dmx-1 = bas + vittnet | +3,38 (syskon_tid 2,67 → 1,59) | −1,29, rätt tempo = bas | vittnet ENSAMT föll: kontrollens fel är inte växlande syskonfel |
| 1 | dmx-1b = k4b + vittnet | +13,99 | **+8,44** (dömd efter gränsändringen) | ledare över k4b; delarna adderar inte lika från olika baser |
| 2 | dmx-2b = dmx-1b + vittnet med 1+2+4 slag som får rätta ett säkert tempogram | +12,61 | +7,66, rätt tempo oförändrat | föll: den stadigt felande låten rördes inte; självlikheten nedlagd som väg dit |
| 2/3 | dmx-2 = dmx-1b + parabeln | +14,03 | +10,99 | bar i klockdomaren men DISK i tvavagar (rutnätet, upp_s) – inte ledare |

Överens: allt utom detaljer – tre gånger röstade de enhälligt, och alla tre drog tillbaka egna idéer när en annans sond visade fel
(k2: diskanten och den riktade kronan; jokern: korta minnet och sin läsning av dmx-1b:s 0,007 s; k4: storleken på vinsten i den råa
vikningen rättades åt alla). Det de inte vet: vad kontrollmängdens stora fel ÄR. k4:s läsning (ur rapporten 11-10): till tre
fjärdedelar EN låt i kontrollmixen som står stadigt fel hela låten (12,5 % av tiden) – ingen variant i två arenor har rört den.

## Domaren, ändringar och antal kontrolldomar

DMX-läget i `tools/arena/klockdom.py` (commit 5322306, före första nya resultat): lotusbanken, källaren och alla lotus-spärrar ur;
mix_klocka, klipp_klocka, mix_las vikt 2, övriga vikt 1; spärrar mix_las (bas + 0,3 s), mix_still, klipp_klocka (bas − 1 pe);
syntet-spärren utgår (bara lotusbänken). Bas mätt två gånger identiskt, kopia +0,0.
- **Det robusta mix_still (±3 %) FÖLL i sin egen i förväg bestämda kontroll:** på kontrollmängden bas 1,80 / k2 1,80 / fusion 2,43 s
  (gamla ±1 %: 3,72 / 8,20 / 8,20) – det fäller fusion men inte k2, eftersom en klocka som står kvar på förra låtens tempo "står
  still" från första provet. Gamla måttet står därför kvar som poäng och spärr; det nya redovisas bredvid. (Committens rubrik säger
  "tröskel 3 %" – det blev alltså inte gällande.)
- **ÄGARBESLUT 01:00 under körningen:** "Öka gränsen för att få den diskad på tills klockan är still till 4 sek." → mix_still diskar
  först över max(4,0 s, bas + 0,3 s) (commit 1a1f3c5). Domar som ändrades: dmx-1b (3,24 s, 0,007 över gamla gränsen 3,233) och
  referensen samrad-1 (3,95 s) blev godkända på övningen och fick var sin dom på kontrollmängden. Utan gränsändringen hade dmx-1b
  inte dömts där, och dmx-2 (3,15 s) hade klarat även den gamla gränsen.
- **Kontrolldomar i DMX-rundan: 7** – referenserna k4b och k2c (omdömda med nya vikter), dmx-1 (omgång 1), dmx-1b och samrad-1
  (efter gränsändringen), dmx-2b (omgång 2), dmx-2 (omgång 3). Till det gårdagens 9. Kontrollmängden är alltså väl använd: dmx-1b:s
  försprång över k4b (+0,85) kommer ur utfl_tid/syskon_tid på två långa inspelningar (lang1014, lang1107) och är litet – läs det
  som "inte sämre än k4b", inte som bevisat bättre. Ingen deltagare har fått per-låt-detaljer därifrån eller mätt den själv.

## Idébank (allt i `dmx/`: a-filerna, förslag, svar, diffar; sondbyggen ligger kvar i .arena/klocka2dmx/)

| idé | från | vad sonden/domen sa | status |
|---|---|---|---|
| taktens självlikhet som vittne (2+4 slag) | jokern | övning syskon_tid −40 %; kontroll 0 ensam, +0,85 ovanpå k4b; tvavagar ren | ingår i ledaren dmx-1b |
| parabel i fintempot | k4 | kontroll utfl_min 0,76 → 0,59, utfl_tid 4,77 → 4,00; tvavagar: ettan −38 %, gridfel ×2 | DISK, samma fall som 11-10; vinsten i fel tempo är värd att få UTAN fasskadan (flytta fasen med tempot) |
| riktad krona (en rad i onsetStep) | k2 | låt 5 3,2 → 2,9 s men låt 8 sämre | reserv om parabeln rubbar fasen |
| vittnet med 1+2+4 slag, rättar säkert tempogram | jokern | ser 4/3-fantomen 92,7 % mot 70,7 %; kontroll 0 | nedlagd för kontrollens låt; tretakt/6-8 oprövat |
| diskanten när basen saknar puls | k2 | villkoret slår inte till under övertoning | föll |
| kort öra / rå vikning öppnar valet | k4, jokern | 0,8 s vinst = 1,0 falska byten/min | föll |
| räkna bort regentens takt | k4 | 6,9 falsklarm/min | föll i enkel form |
| kickarnas egna intervall | k4, k2 | 9–27 fel besked/min; rätt i 2 av 15 låtbyten | föll |
| trenden i snabba minnet | k4 | ingen vinst | föll |
| robust mix_still (±3 %) | huvudchatten | fäller inte k2 på kontrollen | föll; måttet behöver en annan form (t.ex. kräva RÄTT tempo i fönstret) |

## Förslag till ägaren

1. **Omlåsningen går inte att köpa i klockans beslut.** Sju regler och tre signaler prövade av tre agenter: tempogrammet behöver
   ~2,7 s efter övertoningen, och det som finns att hämta (≤ 0,8 s) kostar falska byten. Ska låset bli snabbare behövs en signal
   UTIFRÅN klockan – låtgränsen tidigare/säkrare (analysatorns hintTrackChange), eller ett kortare tempogramfönster bara direkt
   efter en säker låtgräns. Det är nästa fråga, inte fler varianter av håll.
2. **Kandidat att lägga in: dmx-1b (k4b + vittnet)** – bäst på båda mängderna med DMX-domaren bland dem som klarar alla spärrar,
   låser exakt som bas, hälften så många fel tempo per minut och ren i tvavagar (ettan −1,4 %, upp_s 1,80 inom toleransen).
   Före utläggning: ljusdomaren med fast look (KR_MODE), `analyser_shared.py --write src`, lotusbanken som vakt (k4b ensam gav
   468/503; vittnet är omätt mot lotus). Försiktigare alternativ: k4b ensam (dömd i går på hela domaren inklusive lotus) –
   skillnaden mellan dem på kontrollmängden är liten (+0,85). dmx-2 ska INTE läggas in.
2b. **Lägg rutnätets fas i klockdomaren** (ettan, grid40, gridfel ur tvavagar) före nästa klockarena: 62 av 91 effekter stegar på
   rutnätet, och domaren som pekade ut dmx-2 i natt såg inte att rutnätet gick sönder.
3. **Den stadigt felande låten i kontrollmixen** bör lyssnas på av en människa eller pekas ut med facit: är det tretakt/6-8 har
   klockan "rätt" mot mönstret och måttet fel; är det en ren 2/3-läsning är det klockans största enskilda fel (12,5 % av mixen).
4. Bygg en svår ÖVNINGSMÄNGD (låtar där basen står stadigt fel – t.ex. de 10 lotusbanksfelen körda genom DMX-kedjan): i dag kan
   övningen bara visa att en tolkningsidé inte förstör, aldrig att den hjälper.

## Kostnad

Tid 00:10–01:40. Samma tre agenter + domarbyggaren, ca 0,6 M tokens till (agenternas egna slutsiffror: k2 +0,08, k4 +0,11,
jokern +0,15, domaren +0,07, resten orkestratorn). Mätningar i domaren: 14 på övningen, 8 på kontrollmängden (bas + de 7 ovan), 2 tvavagar.

## Tvavagar (analysspärrarna, övning) på de två bästa

| | ettan | grid40 | gridfel | upp_s | ned_s | korta | worker p99 | latens | spärr |
|---|---|---|---|---|---|---|---|---|---|
| bas | 100 % | 53,4 % | 20,0 ms | 1,70 s | 2,10 s | 33,9 | 5 hop | 85 ms | |
| dmx-1b | −1,4 % | −1,5 % | ±0 | 1,80 (−5,9 %) | ±0 | +4,6 % | 5 | 80 ms | ren |
| dmx-2 | **−37,7 %** | **−49,6 %** | **−100 % (minst fördubblat)** | **1,95 (−14,7 %) DISK** | +2,4 % | −7,4 % | 5 | 85 ms | DISK upp_s; rutnätet förstört |

(% mot bas, + = bättre. Sektion träff, drop, låtgräns +0,0 hos båda. Ljusdomaren är inte körd i den här körningen – bas/bank.json
saknas i klocka2dmx; för k4b gav den i går +5,8 poäng och lampspridning −6,7 %.)
