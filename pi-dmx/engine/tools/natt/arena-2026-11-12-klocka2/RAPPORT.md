# Arenan klocka2 – klockan håller EN tolkning (2026-11-12 16:50–23:40)

Ägarens ord: "Det borde gå till en arena i natt. Hur förbättrar vi analysatorns klocka".

## Utfallet på en rad

**INGEN VARIANT ÄR INLAGD I src/.** Två varianter klarar alla spärrar på BÅDA mängderna – **k4b +8,25** och **k2c +7,72** på
kontrollmängden – men båda kom till via lagningsomgångar där kontrollmängden använts som återkoppling. Valet mellan dem, och om
någon läggs in, är ägarens/huvudchattens. Med ägarens DMX-regel (22:16) pekar siffrorna på k4b; k2c är den som rör minst.
Bas = 97ac0bf (engine/src orörd, `git status --short src dist` tomt efter varje runda). Basenv: tom (ladan kör kodens standard).

## Finalisterna – kontrollmängden (ingen deltagare har mätt den själv)

| mått | bas | k4b | k2c |
|---|---|---|---|
| mix_klocka % | 83,41 | 84,53 | 83,11 |
| mix_las s | 3,02 | 3,02 | 3,02 |
| mix_hopp /min | 0,67 | 0,36 | 0,62 |
| mix_still s | 3,72 | 3,72 | 3,41 |
| klipp_klocka % | 85,78 | 86,45 | 86,33 |
| utfl_min | 1,39 | 0,78 | 1,17 |
| utfl_tid % | 4,66 | 5,03 | 3,88 |
| syskon_tid % | 8,28 | 8,52 | 7,84 |
| lotus_ratt (503) | 463 | 468 | 463 |
| lotus_syskon | 26 | 22 | 25 |
| lotus_vaxling | 82 | 84 | 74 |
| kallaren byten/min | 3,97 | 3,83 | 2,98 |
| lotus fas median / motfas / i fas (n) | 0,89 / 20 / 266 (442) | 0,88 / 23 / 273 (443) | 0,89 / 20 / 264 (442) |
| **poäng (12 mått, lika vikt)** | 0 | **+8,25** | **+7,72** |
| bara DMX-måtten (8 st, medel % mot bas) | 0 | **+10,2** | +6,8 |
| bara lotus-måtten (3 st, medel %) | 0 | +4,7 | +4,5 |
| källaren (lotus-Pi:ns inspelningar, %) | 0 | +3,6 | +25,0 |

Samma två på övningsmängden: k2c +9,24 (DMX-medel +13,2; inget DMX-mått under bas), k4b +8,51 (DMX-medel +8,8; mix_hopp 0 → 0,05 och
mix_still 2,93 → 3,15 är under bas men inom spärren). Det är alltså oavgjort mellan mängderna: k2c vinner övningen, k4b kontrollen.

- **k4b** (+80/−10 rader, bara analyserClock.ts): fh1-regent efter säker låsning; ett utmanartempo som ett långt minne (~10 s) inte
  känner = ny låt och går som basen (lånat av k2b); blippspärr (klockan tar inte ett eget tempo > 3 % från tempogrammets, utan att
  sökningarnas tidpunkter flyttas); fintempots hysteres 6 %. Bär: fel tempo per minut −44 %, tempobyten i mixen −46 %, lotusbanken +5
  låtar (4/3-felen 16 → 13). Kostar: tid i utflykt +8 %, syskon_tid +3 %, lotus_vaxling +2 filer, lotus motfas 20 → 23.
- **k2c** (+102/−4): två tidsskalor (tolkning efter ~15 s stadigt val, byte på bevis i ett ~10 s-minne) + k1:s syskonfamilj; hållet
  gäller bara medan regenten lever och rör bara tempoBpm (inte rutnätet). Bär: tid i utflykt −17 %, källarens byten −25 %,
  lotus_vaxling −8 filer, mix_still bättre än bas. Inget mått klart under bas (mix_klocka −0,3 pe).
- Tvavagar (analysspärrarna, övning): inga brott för någon av dem (sektion, drop, låtgräns +0,0; upp_s/ned_s inom 0,1 s; worker p99
  5 resp. 6 hop mot gränsen 6; k4b ettan −1,4 %, gridfel −10 %; k2c gridfel +6 %). Ljusdomaren (diskar INTE i den här arenan,
  ägarens regel 11-10): poäng +4,4 (k2c) / +5,8 (k4b) men lampspridning −6,4 % / −6,7 % – den kända fällan att en ändrad klocka
  kastar om lookföljden; döm med fast look (KR_MODE) före en utläggning.

## Rundorna

| steg | vad | övning | kontroll |
|---|---|---|---|
| Runda 1 | k1 syskonfamiljen | +8,17 OK | +0,65 OK |
| | k2 två tidsskalor | +8,03 OK | +10,29 DISK mix_still 8,20 s |
| | k5 underdelningen | +2,20 OK | +1,08 OK |
| | k3 slagens passform | +7,48 DISK mix_still 3,86, lotus i fas | – |
| | k4 fh1 efter låsning | +5,72 DISK mix_still 3,65 | – |
| Jokern | fusion = k2 + k1 + fog | +12,78 OK | +11,14 DISK mix_still 8,20 s |
| Extra chans k2 | k2b (okänt tempo = ny låt, + k1:s famStep) | +10,62 OK | +11,52 DISK mix_still 4,22 s |
| Bonus (avbruten) | k5-bonus (k5 + k1 + håll mot icke-syskon) | +3,70 DISK mix_still 3,86 | ej dömd |
| Lagning | k2c | +9,24 OK | **+7,72 OK** |
| | k4b | +8,51 OK | **+8,25 OK** |
| | fusion-d | +8,62 OK | −2,75 DISK mix_still 4,22 s |
| Samråd 1 | samrad-1 = k2c + k4b:s två sökningsändringar | +9,63 DISK mix_still 3,95 | ej dömd |
| Samråd 2 | samrad-2 = samrad-1, sökningen fri 14 s efter tempobyte/låtgräns | +7,42 DISK mix_still 3,86 | ej dömd |

Runda 1 klar: 5 mätta, 2 diskade, ledare k1 +8,17. Lärdomen direkt: k1:s och k5:s vinst (exakta syskon i långa inspelningar)
försvann på kontrollmängden (syskon_tid +61 % → +1 %), medan k2-linjens vinst höll men kostade låsningen efter låtbyte.

## Domaren och ändringarna under körningen

Domaren `tools/arena/klockdom.py`: 12 analysmått i % mot bas med lika vikt (mix_klocka, mix_las, mix_hopp, mix_still, klipp_klocka ur
tvavagar.py; utfl_min, utfl_tid ur tempoHoppDiag/Utflykt på långa inspelningar; syskon_tid; lotus_ratt, lotus_syskon, lotus_vaxling
(q25..q75) ur lotusbanken; kallaren = tempobyten/min på 4 + 3 av 12 källarklipp som återskapar växlingen). Bas mätt två gånger
bit-identiskt, kopia +0,0 på alla mått, bas = de kända talen (463/503, 1,00 utflykter/min sammanvägt).

Spärrarna ändrades UNDER körningen, på ägarens ord via huvudchatten, lika för alla och allt redan mätt dömdes om:
1. 22:12 "Lotus fas borde ju få bli kanske 5% sämre utan att bli diskad. Kan ju vara mätfel osv." → lotus fas-median diskar först
   under bas × 0,95. Ändrade domar: k2b och fusion (kontroll) föll därefter bara på mix_still. k4:s mätning 1 hade blivit godkänd.
2. 22:16 "Samt för mig är det allra viktigaste DMX, lotus inte lika." → även on-beat, i fas och motfas får 5 % relativt (det är
   HUVUDCHATTENS tolkning av citatet, inte ägarens egna ord). Inga domar ändrades. DMX-spärrarna orörda.
3. 22:22 "Ja om det bara påverkar lotus." (frågan gällde lotus_ratt) → lotus_ratt diskar först > 1 % under bas (1 % är huvudchattens
   val). Ändrade domar: fusion-d mätning 1 (115/126) godkänd på övningen; k2c (115) hade annars diskats på övningen.
4. Mina egna fel/rättningar i domaren: (a) i ändring 1 skrev jag över en befintlig konstant, så i fas/motfas-spärrarna var avstängda
   i ~10 min – ingen dom togs under tiden, rättat i 948828a. (b) 5 % relativt på andelen i motfas (bas 6/114) blev STRÄNGARE än den
   gamla ±1 procentenheten och fällde k4b på en fil; marginalen skulle vidga, så i fas/motfas diskar nu först när både 5 % och 1 pe
   är passerade (6dc2ae6). Utan den rättningen hade k4b inte dömts på kontrollmängden.

Med de URSPRUNGLIGA spärrarna (nolltolerans) hade ingen av finalisterna varit godkänd överallt: k2c faller på lotus_ratt 115 < 116
och on-beat 0,40 < 0,41 (övning; kontrollen 463 = bas och fas = bas klarar originalspärrarna), k4b på on-beat 0,40 < 0,41 och lotus fas median 0,89 < 0,91 (övning) och
0,88 < 0,89 (kontroll). Det är alltså lotus-marginalerna som släpper fram dem; alla DMX-spärrar är klarade med originalgränserna.

## Extra domar på kontrollmängden (reservationen)

Kontrollmängden skulle dömas en gång. Den har använts som återkoppling flera gånger: k2 → **k2b** (fick veta: föll på mix_still) →
**k2c** (fick veta: mix_still 4,22 mot 4,02 + fasmedian); jokern → **fusion-d** (fick veta diskskälen); **k4b** (k4 dömdes aldrig där
i runda 1; fick veta att k2b/fusion föll på mix_still). k5-bonus dömdes aldrig där. Ingen fick per-låt-detaljer och ingen körde
själv mot mängden, men en lagad variant som klarar kontrollmängden är inte lika starkt bevisad som en som klarar den första gången.
k2c gick från 4,22 s till 3,41 s (bättre än bas) på en diagnos, inte en trimning; k4b dömdes där EN gång.

## Samrådet (ägaren 22:27) – k2, k4 och jokern mot EN gemensam variant

- **Överens direkt** (tre oberoende förslag, samma sond, samma tal): k2c oförändrad + k4b:s två ändringar i klockans egen sökning
  (onsetStep); inget av k4b:s regent. Sonden: utflykter 71 → 21 på 86,7 min, alla lås efter låtbyte som basen.
- **Det enda de bråkade om:** fusion-d:s oktavlagning (k2 ville ha den; jokern drog själv tillbaka den, k4 nej; k2 gav sig).
  I omgång 2: k2 och k4 ville inte bygga något nytt, jokern ville mäta k4:s idé (i) med utgången bestämd i förväg; båda bytte röst
  efter att ha granskat koden och funnit att deras invändning (låt 5 har inget tempobyte) var fel – låtgränsen öppnar den fria perioden.
- **Resultat:** samrad-1 +9,63 och samrad-2 +7,42, båda DISK på mix_still (3,95 / 3,86 mot 3,23). Den gemensamma varianten blev
  alltså INTE bättre än den bästa enskilda. Bästa DMX-vinsten i hela arenan sitter ändå här: utfl_min 0,82 → 0,24, utfl_tid
  2,11 → 1,21, syskon_tid 2,67 → 1,01 (samrad-1, övning).
- **Samrådets fynd om MÅTTET:** tempoBpm är identiskt prov för prov i bas, k4b och samrad-1 genom de två låtar som fäller
  samrad-1. Skillnaden är klockans fintempo som går mellan 0,5 %-grannar (93,4 / 93,9 / 94,4 = 1,06 % isär) kring ett
  stillastående tempogram; kravet ±1 % i 5 s klaras eller spricker på ETT prov. Basen klarar övningens mix_still med exakt 9 av 16
  låtar under gränsen, och den nionde (låt 15) är 2,16 s i domaren men 5,7 s i en diag-körning av samma kod. mix_still är alltså
  delvis ett lotteri vid gränsen – k4b:s och k2c:s godkännanden vilar på samma lotteri som basens.
- Bonusrundan för slutvinnaren utgår: samrådet prövade just vinnaren + tvåan ihop, två gånger.

## Vad som INTE gick, och varför

- **Källarfelet (uppdragets anledning) är inte löst med marginal.** Källarklippens växlingar är till stor del INTE exakta syskon
  (160 ↔ 92, 104 ↔ 146, 154 ↔ 144) och går till tempon som inte hörts förut; i bytesögonblicket ser de ut som en svag låtstart.
  Samma håll som ger källarvinsten (k2/k2b/fusion: 3,97 → 1,56 på kontrollen) fördröjer låtbytet (mix_still 8,20 / 4,22). Fyra agenter
  kom oberoende till det: utan låtgränsen går de två inte att skilja i klockan. k2c behåller −25 % på kontrollen, k4b −4 %.
- **Exakta syskon (k1, k5):** stor vinst på övningens långa inspelningar, ~0 på kontrollmängden och i lotusbankens korta klipp.
- **Slagens passform som väljare (k3)** skadade (övningsmixen 98,8 → 96,6 %); som veto vann den lotusbanken (116 → 121) men föll
  på mix_still och lotus i fas. På källarens mic-ljud är passformen nästan oinformativ (0,2–0,3 för alla tempon).
- **Underdelningen (k5)** tillför inget utöver k1:s frasregel. **Håll mot icke-syskon** (k5-bonus) fäller mix_still.
- **Fria sonder förutsäger inte mix_still** (k5-bonus, k4, jokern: identiska lås i sonden, DISK i domaren).

## IDÉBANK (alla diffar + losning.md i den här mappen; samrådets förslag/svar i samrad/)

| deltagare | idén | mått den vann (övning / kontroll, % mot bas) | varför den föll | går att lyfta ut? |
|---|---|---|---|---|
| k1 | syskonfamiljen, medlemsbyte efter 16 slag netto | syskon_tid +61 / +1; utfl_tid +30 / +1 | håller inte på kontrollen | ja, ingår i k2c |
| k2 | två tidsskalor | kallaren +43 / +61; utfl_tid +0,5 / +60; mix_hopp – / +54 | mix_still 8,20 på kontrollen | lagad i k2c |
| k2b | k2 + okänt tempo = ny låt + famStep | kallaren +14 / +61; utfl_tid +36 / +39 | mix_still 4,22 | lagad i k2c |
| **k2c** | k2b, hållet bara medan regenten lever, rutnätet orört | utfl_tid +34 / +17; syskon_tid +62 / +5; kallaren 0 / +25 | **godkänd** | finalist |
| k3 | passformen som veto | lotus_ratt 116 → 121; lotus_syskon +40; kallaren +36 | mix_still, lotus i fas | prova ensam (lotusbanken) |
| k4 | fh1-regent efter säker låsning | utfl_min +52; kallaren +46 | mix_still 3,65 | lagad i k4b |
| **k4b** | k4 + okänt tempo = ny låt + blippspärr + hysteres | utfl_min +63 / +44; mix_hopp – / +46; lotus_syskon 0 / +15 | **godkänd** | finalist |
| k5 | underdelningen som veto | syskon_tid +30 / +1 | liten vinst | nej (k1 gör samma) |
| fusion | k2 + k1 + fog | syskon_tid +75 / +6; kallaren +43 / +61 | mix_still 8,20 | – |
| fusion-d | fusion + okänt = ny låt + oktav ur tempogrammet | syskon_tid +59 | −2,75 på kontrollen | nej (oktavlagningen misstänkt) |
| samrad-1 | k2c + k4b:s sökningsdel | utfl_min +71; utfl_tid +43; syskon_tid +62 | mix_still 3,95 | prova ensam när mix_still mäts robust |
| samrad-2 | samrad-1, sökningen fri 14 s efter byte | utfl_min +61; syskon_tid +61 | mix_still 3,86 | som ovan |
| jokerns sond | k4:s skanningsspärr på fusion (fusion/sond-v2, -v3) | utfl_min 0,24–0,29 | lotus fas / mix_still i tre former | ingår i k4b i ny form |
| k2 (sond) | riktad krona (bara mot granntempo längre från tempogrammets topp) | låt 9: 8,3 → 2,5 s | median ~3,5 | prova med nytt mått |

## Förslag till nästa steg (ägarens val)

1. Välj k4b eller k2c (eller ingen). Diffarna `k4b.diff` och `k2c.diff` applicerar rent mot 97ac0bf (`git apply --check`).
   Före en utläggning: ljusdomaren med fast look (KR_MODE), `analyser_shared.py --write src`, lotus-port av huvudchatten.
2. Gör mix_still robust (t.ex. andel låtar under gränsen i stället för medianen, eller tolerans för EN grannstegsväxling i
   fintempot) – annars avgör ett enda prov. Därefter är samrad-1 (k2c + k4b:s sökningsdel) den starkaste kandidaten på DMX-måtten.
3. Källarfelet: behöver låtgränsen eller en annan signal än klockans egen – inte ett håll i klockan.

## Kostnad

Tid: 16:50–23:40 (6 h 50 min). Agenter: 7 (domarbyggaren, k1–k5, jokern), sammanlagt ca 2,5 M tokens enligt agenternas egna
slutsiffror (domaren 0,25; k1 0,24; k2 0,54; k3 0,25; k4 0,33; k5 0,32; jokern 0,38) plus orkestratorn. Mätningar i domaren: ca 30 på
övningen, 9 på kontrollmängden (bas, k1, k2, k5, fusion, k2b, k2c, fusion-d, k4b), 6 tvavagar.
