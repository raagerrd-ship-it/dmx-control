# Flera tempohypoteser i den delade klockan (analyserClock.ts) – 2026-11-10 natt

Uppdrag: "starta den tyngre lösningen" för tempohoppen. Klockan ska följa FLERA tempohypoteser parallellt och byta regerande tempo först när en utmanare vunnit över tid.
Rangordning enligt ägaren 22:1x: DMX med ren input avgör, lotusbänken är vakt.
Jämförelsen är hela vägen mot dagens `src` (f757d7d-läget, byggt i `.arena/tempohopp/v2`).

**Utfall: INGEN VINNARE enligt kraven. `src/` är orörd, ingen tagg satt.**
Bästa varianten (fh1) ligger som patch: `prov/flerhypotes-fh1-20261110.patch` (bara `src/analyserClock.ts`, 45 rader in / 42 ut, `git apply --check` går igenom mot ddf8251).
Den klarar huvudmålet med råge (utflykter 1,00 -> 0,26 /min, tid i utflykt 2,93 -> 1,32 %) och lotusvakten (463 -> 468/503), men faller på låsningen efter låtbyte och på tre "inget annat sämre"-punkter. Se "Vilka krav som föll".

## Idén (fh1) i tre meningar

Alla 139 tempohypoteser får var sin bevissumma som fylls på varje varv (0,37 s) med hypotesens poäng i det korta fönstret (3,5 s) minus ett BRUSTAK (varvets median + 0,6), och EN av dem regerar.
Utmanarna börjar från ett golv under regenten som beror på regentens HÄLSA (dess eget överskott över brustaket): en frisk regent kräver flera varvs tydligt bevis, en död släpper till första hypotes som håller sig över brustaket.
Låtgränsen nollar därför inte längre tempogrammet (hypotesen som redan följs tar över), och klockans egen finskanning får inte lämna ±3 % kring det regerande tempot.

Bort ur koden: kronan (TG_HOLD), syskonlistan (TG_SIB), det snabba minnets EMA och "två varv i följd"-regeln. Inga flaggor, inga env-rattar.
Nya konstanter: `TG_FWIN_MS 3500, TG_NOISE 0.6, TG_NB 2, TG_SW_P 1, TG_SW_G 2, TG_HL_A 0.5`.

## Före -> efter (mätt)

"Före" = dagens src (v2). Träning = ovn, pop, mega, l1021, l1011, l1028 (86,7 min). Kontroll = kon, l1014, l1107 (40,9 min), körd EN gång på slutkandidaten.

### Utflykter (riktiga kedjan, `tools/tempoHoppDiag.mjs` + `tools/tempoHoppUtflykt.mjs`)

| Mängd | Före | Efter |
|---|---|---|
| Alla 127,6 min: utflykter | 128 (1,00 /min) | **33 (0,26 /min)** |
| Alla: tid i utflykt | 2,93 % | **1,32 %** |
| Träning: utflykter / tid | 71 (0,82 /min) / 2,11 % | 13 (0,15 /min) / 0,79 % |
| Kontroll: utflykter / tid | 57 (1,39 /min) / 4,66 % | 20 (0,49 /min) / 2,46 % |
| kon | 26 / 3,66 % | 6 / 1,06 % |
| l1014 | 17 / 5,02 % | 8 / 1,61 % |
| l1107 | 14 / 6,40 % | 6 / 6,27 % |

Efter: 3 av 33 är blippar under 0,5 s, 30 är långa (100 s sammanlagt). 16 av 33 går till ett 2/3-, 3/2-, 3/4- eller 4/3-syskon.
l1107: antalet halveras men tiden står nästan kvar (6,40 -> 6,27 %). Där är det få, långa utflykter.

### tvavagar (`--mat`), träning och kontroll

| Mått | Träning före | Träning efter | Kontroll före | Kontroll efter | Krav |
|---|---|---|---|---|---|
| mix rätt tempo (mix_klocka) % | 97,88 | 97,96 | 83,41 | 84,81 | klarat |
| mix_hopp /min | 0,00 | **0,03** | 0,67 | 0,41 | träning föll (1 hopp) |
| låsning mix_las s | 2,78 | 2,68 | 3,02 | 3,02 | **föll** (mål 2,48 / 2,82) |
| mix_still s | 2,93 | 3,65 | 3,72 | 8,51 | sämre |
| klipp_klocka % | 98,32 | 97,84 | 85,78 | 86,48 | träning −0,48 |
| ettan % | 100 | 100 | 96,08 | 96,08 | lika |
| grid40 % | 53,10 | 53,24 | 78,05 | 77,13 | |
| gridfel ms | 20,95 | 19,90 | 8,20 | 8,30 | kontroll +0,1 |
| upp_s | 15,35 | 14,85 | 14,90 | 10,40 | ändrad |
| ned_s | 2,65 | **3,95** | 3,80 | **5,00** | **föll** |
| traff | 75 | 75 | 64 | 62,5 | |
| korta % | 34,04 | 28,12 | 22,22 | 23,73 | |
| drop träff / falska / ms | 100 / 0 / 216 | 100 / 0 / 216 | 100 / 0,87 / 141 | 100 / 0,87 / 141 | oförändrat |
| låtgräns rätt / falska | 73,3 / 0 | 73,3 / 0 | 57,1 / 0,48 | 57,1 / 0,48 | oförändrat |
| mix_23 % | 0,108 | 0,039 | 13,06 | 13,05 | |
| latens ms | 80 | 80 | 95 | 95 | lika |

Kontrollens mix_23 13 % är fortfarande EN låt (Hopeless Nights, står på ~100 hela låten, låser aldrig i någon variant).

### Låsning per låt (s från crossfadens slut, `mixdet.mjs` = tvavagars mix-jobb med per-låt-utskrift)

Träning (16 låtar), före / efter:
2,66/1,95 · 3,02/**6,36** · 1,92/1,41 · 3,25/**4,06** · 0,12/0,12 · 0,03/0,03 · 2,78/2,48 · 7,46/**9,49** · 2,51/2,20 · 3,54/**5,36** · 2,84/2,84 · 1,74/2,25 · 3,88/3,68 · 2,68/2,68 · 2,19/1,88 · 2,81/**3,82**.
Medel 2,72 -> 3,16. Median (9:e av 16) 2,78 -> 2,68.

Kontroll (8 låtar), före / efter:
6,51/**10,77** · 3,02/3,02 · 0,90/0,70 · 1,83/1,63 · 7,52/**8,53** · 0,64/0,03 · 153,85/153,85 · 0,06/0,06.

Bilden är densamma i båda mängderna: en vanlig övergång går 0,1–0,7 s FORTARE, en svår (ny låt med svag början) går 1–4 s LÅNGSAMMARE.
Träningens enda "hopp" (mix_hopp 0,03) är låt 8 som låser efter 9,49 s. Måttet räknar tempobyten från 8 s in i låten, så det är en sen låsning och ingen utflykt.
Kontrollens mix_still 3,72 -> 8,51 bärs av en låt som låser på 0,70 s men står stilla inom ±1 % först efter 12,3 s (förr 3,7 s), plus första låten (kallstart 10,4 -> 18,2 s).

### Lotusvakten (`lotusbank.py`, LIVE-env)

| | Före | Efter |
|---|---|---|
| korpus | 463/503 | **468/503** |
| klasser fel | 4/3 16, annat 14, 3/2 7, dubbla 2, halva 1 | 4/3 13, annat 10, 3/2 7, dubbla 2, halva 1, 3/4 1, 2/3 1 |
| synt | 6/8 | 6/8 |
| kick R / P | 0,32 / 0,88 | 0,33 / 0,88 |
| on-beat | 0,40 | 0,41 |
| fas median / motfas | 0,89 / 20 | 0,88 / 20 |
| följare raw on-beat | 0,97 | 0,94 |

Ingen klass föll. Inget är stämt mot lotuskorpusen.

### Kostnad

- Hela analysatorn (tvavagars cpu-jobb, 5 växlande körningar, median): 45,16 -> 45,49 µs/hop (faktor 1,007) på träningen, 48,60 -> 52,07 (1,07) på kontrollen. Spridningen inom körningarna är 45–57, så skillnaden ligger i bruset.
- Bara klockan (`replay.mjs`, ovn 942 225 hop, tre par rygg mot rygg på en belastad PC): 28,40 -> 29,11, 31,42 -> 39,82, 52,18 -> 39,02 µs/hop. Lugnaste paret ger faktor 1,03. Tidigare under kvällen i samma verktyg: 22–25 -> 20,7.
  Antalet vikningar per hop är oförändrat (det gamla snabba minnet vek också två fönster per hypotes).
- Realtid p99: 5 hop mot bas 5 (kontrollkörningen). Träningskörningen gav 10 mot 6; bedömt som brus från en belastad PC (dagens src fick 193 mot 205 i sin kontrollkörning), inte ommätt.
- Minne: tre nya Float64Array(139) (det fjärde ersätter gamla tgAccF) = +3,3 kB. Inga allokeringar per hop. En `Float64Array.sort()` per varv (0,37 s), på plats.

## Vilka krav som föll, och varför

1. **Låsning efter låtbyte: 2,68 s mot målet ≤ 2,48 (kontroll 3,02 mot ≤ 2,82).** Bättre än dagens 2,78, men kompromissen från f757d7d är inte borta.
2. **mix_hopp 0,00 -> 0,03** på träningen (den sena låsningen ovan). Kontrollen går åt rätt håll, 0,67 -> 0,41.
3. **Sektionerna är inte oförändrade:** ned_s 2,65 -> 3,95 (kontroll 3,80 -> 5,00), upp_s 15,35 -> 14,85 (14,90 -> 10,40), traff kontroll 64 -> 62,5.
4. Småposter: klipp_klocka −0,48 procentenheter på träningen, gridfel +0,1 ms på kontrollen, mix_still sämre i båda.

**Varför låsningen inte går att få ner utan att utflykterna kommer tillbaka (mätt med per-varv-utskrift på övningsmixen):**
Regenten är motsagd redan 0,4–0,7 s efter skarven. Det som dröjer är att den NYA låtens tempo inte kommer över brustaket i 3,5-sekundersfönstret på flera sekunder när låten börjar svagt.
Dagens kod tar helt enkelt toppen efter nollställningen, hur svag den än är. Det är samma beteende som ger utflykterna.
Varje regel som sänker ribban när regenten "ser död ut" snabbar på låsningen men släpper in utflykter igen, eftersom dödsdetektorn slår falskt i breaks och fills (regentens kontrast i ett friskt läge: p5 0,73, p10 1,01, median 2,68; en död regent ligger på 0,5–1,6, alltså överlapp).

Punkt 3 är en andra ordningens effekt: sektionsetiketterna läser klockan (localBpm med 8 takters håll, kickgrinden via klockans rutnät), så VARJE klockändring kastar om upp_s/ned_s. Tidigare rena klockvarianter i kväll gav ned_s 1,30–3,65 mot 2,65. Det går inte att hålla sektionerna oförändrade och samtidigt ändra tempovalet; kravet behöver i så fall dömas på sektionsmåtten med klockan låst, eller släppas för klockändringar.

## Prövat och förkastat (replay på träningen, 86,7 min; utflykter / tid i utflykt / låsning median / medel på ovn)

Baslinje i samma verktyg: 71 / 2,11 % / 2,8 / 2,72. fh1 i samma verktyg: 12 / 0,78 % / 2,6 / 3,15.

| Familj | Bästa körningar | Dom |
|---|---|---|
| p1: ren bevissumma (CUSUM) på log-poäng, fast bytesstraff | bäst 45 utfl., låsning 4,0 | för trög, ingen måttstock för "över bruset" |
| p2: som p1 med normaliserat bevis | 61 utfl., låsning 3,5 | förkastad |
| p3: brustak + hälsostyrt golv | p3h = fh1 | vald |
| Sänkt ribba när regenten ligger under taket (P_LO 0,3) | 36–38 utfl. | utflykterna tillbaka |
| p4: exponentiellt fönster i stället för 3,5 s | ingen vinst | förkastad |
| Låtgränsen skalar hälsan | identiskt resultat | ingen effekt, struken |
| Lägre bytesstraff: q1 (P 0,6 / G 2), q3 (0,3 / 3), q5 (0 / 4) | 20 / 1,37 % / 2,5 / 2,88 · 38 / 2,93 % / 2,5 / 2,76 · 88 / 4,97 % / 2,0 / 2,58 | byter utflykter mot låsning |
| Skivtest (regentens topp saknas i de senaste 1,2 s): r1 utan sänkt ribba, r3 ribba = median, r5 mjukare | 13 / 0,48 % / 2,6 / 2,98 · 48 / 3,60 % / 2,4 / 2,44 · 23 / 1,33 % / 2,6 / 2,75 | r1 inom bruset för ~25 rader extra; resten läcker |
| Fönster "sedan döden" (d1–d6) | bäst 15 / 1,04 % / 2,6 / 2,87, d3 17 / 1,41 % / 2,4 / 2,74 | ingen ren vinst |
| Utjämnad dödsdetektor (e1–e6) | 15 / 0,67 % / 2,6 / 2,95 … 45 / 3,59 % / 2,5 / 2,23 | samma avvägning |
| Fler hypoteser per hop (g1 ×2, g2 ×4 = varv 0,09 s) | 18 / 1,59 % / 2,8 / 3,13 · 10 / 0,97 % / 2,6 / 2,99 | varvtiden är inte flaskhalsen |
| Sänkt ribba bara när regenten också ligger under taket (f1–f3) | 29–36 utfl., 2,12–2,87 %, 2,5–2,6 / 2,53–2,64 | läcker |
| Låtgräns -> sänkt ribba | ej byggd | låtgränsen kommer +3,2…+9,7 s efter skarven, efter låsningen på 4 av 5 svåra övergångar |

Sammantaget: ingen prövad variant ger både median ≤ 2,48 s och få utflykter. Mellanlägen att välja på om låsningen väger tyngre: q1 (20 utflykter, median 2,5 i replay) och r5 (23, medel 2,75). De är INTE mätta i riktiga kedjan eller på kontrollmängden.

## Effektfynd (ljusmått, diskar inget)

- lampspridning medel: −6,9 % (dagens src) -> −10,2 % mot tvavagars bas på träningen; −7,4 % -> −10,8 % på kontrollen.
- lang1021 −24,3 % -> −25,0 %; på kontrollen lang1028 −23,5 % (dagens src −20,0 %).
- Ljusdomarens poäng 4,2 -> 3,0 (träning), −1,3 -> −6,0 (kontroll).
Troligen ger färre tempobyten färre omstarter i effekterna och därmed lägre spridning (antaget, inte uppmätt).

## Risker som bänken inte ser

- Låtar med svag början låser 1–4 s senare än i dag (5 av 16 på träningen, 2 av 8 på kontrollen, kallstarten på kontrollen 6,5 -> 10,8 s). På dansgolvet syns det som att ljuset går kvar i förra låtens tempo några sekunder till i stället för att gissa.
- Replay-sållningen använder baslinjens låtgränser. Bara fh1 är körd i riktiga kedjan.
- Lotus live efter f757d7d visade 3/4-utflykter (100–108 mot 140 bpm, 2,5–5 s). 16 av fh1:s 33 kvarvarande utflykter är syskon, så den sorten är färre men inte borta. Mikrofonvägen är omätt.
- Ingen live-lyssning. Allt ovan är offline på inspelningarna.
- Konstanterna per varv (TG_HL_A, TG_SW_P/G) förutsätter varvtiden 0,37 s (TG_PER_HOP 1).

## Om patchen ändå ska in

`git tag backup/fore-flerhypotes-20261110`, `git apply prov/flerhypotes-fh1-20261110.patch` (från repo-roten), `python tools/analyser_shared.py --write src`, och sedan samma fil till lotus.
Rekommendation: fh1 är bättre än dagens src på det ägaren rankade först (utflykter, tid i utflykt, rätt tempo, medianlåsning, lotusbänken). Priset är långsammare låsning på svaga låtstarter och omkastade sektionstider. Det är ett ägarbeslut, därför inte inlagt.

## Mätt och antaget

Mätt: alla tal i tabellerna (tvavagar träning + kontroll, utflykter i riktiga kedjan på 9 set, lotusbank, per-låt-låsning, replay-svepen, kostnaden).
Antaget: att `Float64Array.sort()` inte allokerar på Pi:ns Node 24; att låtgränsregeln inte hade hjälpt (bedömt på tidpunkterna, inte byggd); att mellanlägena q1/r5 beter sig i riktiga kedjan som i replay; att ljusets lägre spridning kommer av färre tempobyten och är ofarlig; att realtid p99 10 mot 6 på träningen var brus.

Verktyg och mätfiler (ej i git): `.arena/flerhyp/verktyg/` (replay, gen1–gen5, mixdet, svep), `.arena/flerhyp/fh1/` (src, dist, tvavagar.json, tvavagar-holdout.json, lotusbank.json), `.arena/flerhyp/ut/`.
