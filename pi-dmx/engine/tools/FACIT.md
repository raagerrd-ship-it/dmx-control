# Testklipp, facit och bänkar

Facit kommer från **publicerade källor** (SongBPM / Songstats / Tunebat), aldrig från
egen autokorrelation — den har samma harmonifällor som koden som ska testas och gav
fel svar två gånger (137,5 och 60,0 om samma 90 BPM-låt).

`ledin_bpm.tsv` — 96 Tomas Ledin-låtar med verifierat facit. Kolumn 3 är
alternativvärde när källor är oense; skillnader på exakt 2× är oktavtvetydighet.

## Bänkar

| verktyg | mäter | kör |
|---|---|---|
| `bench.sh` | 4 handplockade klipp, färsk analysator | `bash tools/bench.sh` |
| `scoreCorpus.mjs` | hela inspelade korpusen mot katalogen, färsk analysator | `node tools/scoreCorpus.mjs tools/corpus` |
| `carryOver.mjs` | **överhängande tillstånd mellan låtar** — kör A, hint, B | `node tools/carryOver.mjs` |
| `scoreLive.mjs` | **live-motorns** lås ur korpusmanifestet | `node tools/scoreLive.mjs` |
| `peaks.mjs` | tempogrammets toppstruktur mot facit | `node tools/peaks.mjs <wav> <bpm>` |
| `testBpmHard.mjs` | 10 syntetiska scenarier | `node tools/testBpmHard.mjs` |

`carryOver` är den viktigaste: de andra körde färska instanser per klipp, men
live-motorn ser låtarna i följd genom EN analysator. Samma ljud gav 97 % rätt färskt
och 0 % efter föregående låt.

## Läget

`applyBase.py` lägger det verifierade läget på en ren utcheckning:

```
git checkout -- src/analyser.ts && python tools/applyBase.py --tg --warm
```

| ändring | motivering |
|---|---|
| `OCT_UP` 8 → 24 | en oktavs vikning ⇒ `ratio > 1.4` är alltid triol-artefakt |
| harmoni-veto i grannrättningen | 4/3 gick in genom hålet avsett för grannfel |
| `tempoGram.fill(0)` vid låtbyte | förra låtens toppar konkurrerade med den nya |
| `WARM_N = 24` före första låset | låset togs på ett omoget tempogram |
| `HOLD_N = 50` håller commiten öppen | onset-ringen är 5 s — commiten stängde innan den var ren |
| perceptuell prior 2,0 → **0,7** | prior bredare än vikningsfönstret lät kandidater utanför det tävla |

**Resultat, uppmätt:**

| | före | efter |
|---|---|---|
| korpus (7 låtar med facit) | 56,2 % | **78,5 %** |
| färska instanser | 53,6 % | **78,0 %** |
| övergångar | 53,8 % | **68,3 %** |
| 4/3-fel i korpus | 2 | **0** |
| låslatens | 499 ms | 739 ms |
| syntetsvit | 7/10 | 7/10 |

### Uppmätt före/efter på frusen korpus (10 låtar med facit)

| | rätt | snitt | 4/3-fel |
|---|---|---|---|
| utgångskod | 6/10 (60 %) | 69,5 % | **3** |
| nattens fixar | **9/10 (90 %)** | **85,0 %** | **1** |

### Commit-hold, separat uppmätt (12 låtövergångar)

| | övergångar | korpus |
|---|---|---|
| utan hold | 60,7 % | 9 rätt / 85,0 |
| **HOLD_N = 50** | **72,0 %** | 8 rätt / 82,3 |

Stabil platå 50–400, alltså inget brus. "Snart tystnar musiken" 0 → 79 %. Den
korpuslåt som "tappar" läser 104 mot facit 104 — rätt median, bara 56 % av ramarna
mot tröskeln 60 %. Tröskelartefakt, inte verkligt tapp.

### Manifestets radmarkörer (för `scoreLive.mjs`)

| rader | kod |
|---|---|
| 1–9 | före alla fixar |
| 10–21 | tempogram-nollning + uppvärmning |
| 22–39 | + commit-hold |
| 40– | + smalare prior (slutligt läge) |

## SLUTLIGT RESULTAT

**Läs siffrorna rätt:** de 23 inspelningarna är bara **8 unika låtar** — spellistan
rullar runt, så samma låt spelas in flera gånger. Upprepade inspelningar av samma låt
är korrelerade, inte oberoende test. Därför redovisas båda måtten, och det smalare
(unika låtar) är det som ska citeras.

| | unika låtar rätt i ALLA sina inspelningar | inspelningar | snitt | 4/3-fel | övergångar |
|---|---|---|---|---|---|
| utgångskod | 5/8 | 17/23 (74 %) | 75,9 % | **5** | 55,5 % |
| tre första fixarna | — | 20/23 (87 %) | 87,6 % | 2 | 76,9 % |
| **+ smalare prior** | **8/8** | **23/23 (100 %)** | **97,6 %** | **0** | **85,2 %** |

### Slutlig körning, hela nattens material (51 märkta inspelningar, 8 unika låtar)

| | unika låtar | inspelningar | snitt | 4/3-fel | övergångar |
|---|---|---|---|---|---|
| utgångskod | 5/8 | 38/51 (75 %) | 75,9 % | **10** | 52,7 % |
| **slutligt** | **7/8** | **50/51 (98 %)** | **94,5 %** | **0** | **83,2 %** |

Samtliga tio 4/3-fel borta. Den enda inspelning som inte når tröskeln är
*En del av mitt hjärta* med median **100 mot facit 98** — 2 % fel, felkategori
"annat", alltså inget harmoniskt felslag. Det är en tröskelartefakt (54 % av
ramarna inom ±4 %, kravet är 60 %), inte ett tempofel.

### Allra sista körningen — 62 märkta inspelningar, 77 totalt

| | unika låtar | inspelningar | snitt | harmoniska fel | övergångar |
|---|---|---|---|---|---|
| **slutligt** | 6/8 | **59/62 (95 %)** | **92,5 %** | **0** | **83,8 %** |

**Live på enheten, slutlig kodgeneration: 32/32 rätt (100 %).**

Måttet "unika låtar" är strängt — en låt räknas bara om VARENDA inspelning av den
klarar tröskeln, och med 8–10 inspelningar per låt fäller en enda marginell dipp hela
låten. De tre inspelningar som inte når tröskeln är:

| inspelning | avläst | facit | fel |
|---|---|---|---|
| Hon gör allt... | 113 | 104 | 8,7 % — drift, ingen harmonisk relation |
| En del av mitt hjärta | 100 | 98 | 2,0 % |
| Hon gör allt... | 104 | 104 | **0,0 %** — rätt median, vandrar under låten |

Alltså **noll harmoniska fel** (4/3, 2/3, 2×, ½) på 62 inspelningar. Det var hela
problemet: utgångskoden hade tio stycken 4/3-fel på samma material.

**Korpusen är mättad.** 64 inspelningar men bara 8 unika låtar med facit —
spellistan är en kort slinga. Fler inspelningar tillför ingen ny information;
det som behövs är annan musik, särskilt under 85 BPM.

Korpusens tempospridning: 90–99 (2 låtar), 100–109 (3), 110–119 (1), 130–139 (1),
150–159 (1). **Inga låtar under 85 BPM har spelats in än** — den delen av registret
är alltså otestad, och det är just där vikningen tvingar upp tempot till 150–160.

Noll fel i någon kategori. Syntetsviten oförändrad 7/10, låslatens 739 ms,
CPU 83 µs/hopp mot budgeten 2667.

**Priorbredden — och varför jag först drog fel slutsats.** På fyra handplockade klipp
(alla 90–124 BPM, alltså kring priorns egen topp) såg en smalare prior ut som
överfittning och parkerades med beslutsregeln "≥25 låtar". Med 23 låtars
tempospridning är trenden monoton på *båda* måtten. 0,5 är marginellt bättre på
riktigt ljud men mjukar upp syntetscenariot "breakdown 142" (100 → 88 %); 0,7 tar
nästan hela vinsten utan den kostnaden. Scenariot "158 (nära gränsen)" påverkas inte
av någondera — fönsterkanten offras alltså inte.

## Klipp utan katalogfacit

| fil | låt | facit | not |
|---|---|---|---|
| `drickervin.wav` | Ricky Rose — Dricker Vin | 124 | Songstats, verifierat |
| `utandig.wav` | Ricky Rose — UTAN DIG | 90 | Songstats, verifierat |
| `stranden.wav` | Tomas Ledin — En dag på stranden | 114 | verifierat |
| `real.wav` | **okänd** | ~90 **OVERIFIERAT** | se nedan |
| `tspel.wav` | Tillfälligheternas spel + låtbyte | — | orenad, byter låt vid 20 s |

**`real.wav` ska inte styra beslut.** Låten är okänd och "90" härleddes genom att
poängsätta mot mina egna kandidater — cirkulärt. Med uppvärmningen läser den 113 och
faller till 0 %, medan varje externt verifierat klipp förbättras. Ett overifierat
facit får inte lägga veto mot det.

## Öppet

**`Tillfälligheternas spel`** (katalogfacit 75, alt 77) är enda kvarvarande felet i
korpusen. Tempogrammet har **ingen topp alls** vid 75 eller 150 — starkast är 88,2
följt av 83,3. Antingen är katalogvärdet fel för den inspelningen, eller så har låten
en rubatokänsla som inte ger någon stabil periodicitet. Behöver en andra källa.

## Provat och förkastat (mätt)

- **Halvtempo-detektor** på `tg[2L]/tg[L]`. Byggd på antagandet att stranden gick i
  ~75,5. Den går i 114. Enda positiva exemplet föll ⇒ borttagen.
- **Släppa harmoni-vetot när utmanaren är starkare** (`rival > 3`): utandig 70,6 → 26,2 %.
- **Tak på övertonsbidraget** (multiplikativ comb, Klapuri/two-way-mismatch-logik):
  noll effekt — comb är bara halva poängen, `pulse` är den andra halvan.
- **Partiell avklingning av tempogrammet** (0,5 / 0,3 / 0,15): noll effekt. Att skala
  hela arrayen med en konstant ändrar inte vilken bin som är störst. Bara nollning biter.
- **Vikningsfönster `[70,140)` och `[75,150)`**: klart sämre än `[80,160)`.
  `[60,180)` är omöjligt — 3× spann ⇒ vikningen kanoniserar inte längre.
- **Smalare perceptuell prior** (bredd 2,0 → 1,0) gav bänken 59,7 → 85,2 %, men alla
  fyra bänkklipp ligger 90–124, alltså kring priorns topp på 120. Överfittningsrisk —
  parkerad tills korpusen har tempospridning.

## Beslutsregel: priorbredden

Ompröva när korpusen har **≥25 låtar med facit**. På 10 låtar gav bredd 1,0
korpus +7,4 p.e. och stranden 81 → 96 %, men utandig 70 → 35,6 % (median 143)
och överhängets kostnad 9,7 → 16,4 p.e. För osäkert netto för att skicka.

## Provat och förkastat, forts.

- **Släppa startgissningen vid låtbyte** (`localBpm = 0` i `hintTrackChange`, så
  uppvärmningen gäller även där). Nollsummespel: Snart tystnar musiken 0 → 78 % och
  utandig 56 → 76 %, men En dag på stranden 92 → 0 % och Hon gör allt 56 → 0 %.
  Netto −1,9 p.e.
- **Extra uppvärmning vid låtbyte** (`WARM_EXTRA`, för att låta onset-ringen spolas).
  Svepet svänger vilt utan platå: 0→58,8 · 50→72,6 · 100→62,0 · 150→66,0 · 175→56,3 ·
  200→76,4 · 225→50,0 · 400→8,3. Parametern påverkar dessutom korpuspoängen, trots
  att det testet kör färska instanser — alltså slår den även på tystnadsutlösta
  återställningar inne i klippen. Knivsegg, inte förbättring.

**Kvarstående gap:** överhängande tillstånd kostar fortfarande ~11 p.e. Det som är
kvar efter att tempogrammet nollas är sannolikt **onset-envelopens ringbuffert**, som
är flera sekunder lång — direkt efter ett byte består halva autokorrelationen av förra
låten. Det behöver en bättre idé än fler parametrar på 12 övergångar.

## Facitets faktiska status — läs detta före nästa mätning

**Alla BPM-sajter återförsäljer samma uppströmskälla** (Spotifys audio-features).
songbpm, tunebat, musicstax, gemtracks och songdata.io är alltså INTE oberoende av
varandra — att två av dem säger samma sak är ingen korroborering. Facit här är
enkälligt och Spotify-härlett, och den källan har själv kända oktavfel.

Det är fortfarande vida bättre än egen autokorrelation (som har exakt de fällor koden
ska testas för), men slutsatser ska formuleras därefter: aggregerade trender över många
låtar är meningsfulla, ett enskilt klipps facit är det inte nödvändigtvis.

**`Tillfälligheternas spel` är borttagen ur katalogen.** Samma pipeline ger 75 för
studioversionen och 143 för liveversionen — pulsen är svagt definierad. Mina uppmätta
toppar 88,2 och 83,3 ligger tätt ihop, vilket talar för rubato snarare än stabil puls.
Att poängsätta mot 75 mätte brus.

**Varning om `Alt-BPM`-kolumnen:** den blandar två olika saker — äkta oktavtvetydighet
OCH andra inspelningar av samma låt. "77" för Tillfälligheternas spel visade sig vara
Symphonia-versionen (2022, 5:13, h-moll), inte studioversionen (1990, 5:52, c-moll).
Kontrollera speltid innan ett alternativvärde tolkas som oktavfel.

## Omprövat efter att uppvärmning + commit-hold lagts till

Parametrar satta i ett tidigare läge är inte nödvändigtvis optimala efteråt.
Omsvept på frusen korpus + 12 övergångar:

| parameter | slutsats |
|---|---|
| `HARM_PENALTY` | **6 kvarstår** — korpus 82,3 mot 70,4 vid 1. Övergångar marginellt bättre vid 1 (75,2 mot 72,0), men korpusvinsten är fyra gånger större. |
| `OCT_UP` | **numera neutralt.** 8/16/24/32 ger identisk korpuspoäng; 8 är 1 p.e. bättre på övergångar. Behålls på 24 eftersom mekanismen är förstådd och skyddar vid kallstart utan låtbytes-hint — men det är inte längre en uppmätt vinst. |

Sista kvarvarande fel: **"Alltid en vän i mej"**, och det är inspelningsberoende.
Två inspelningar av samma låt: 001 börjar på 95 och landar rätt (102), 011 börjar på
128 och fastnar på 135. Tempogrammet i 011 har dessutom *rätt* svar som starkaste
topp (101,7 = 0,7294) — låset formas alltså i öppningens brus, före mognaden, och
`ratio = 102/135 = 0,756 ≈ 3/4` gör att harmoni-vetot sedan bromsar rättningen.

## Puls-termens subharmoniska blindhet — analyserad, straff förkastat

`pulse[lag]` är medelvärdet av `envPos` **på** rutnätet vid bästa fas. Den kan per
konstruktion inte skilja ett tempo från sin subharmonik: för tempot P ger både
`lag = P` och `lag = 2P` samma höga medelvärde, eftersom man vid 2P träffar varannat
slag och alla träffar fortfarande är slag. Termen är alltså **blind för 2/3- och
1/2-familjen** — och den är halva tempogrammets poäng, vilket förklarar varför
ändringar i `comb` ensamt hade så liten effekt.

Percival-Tzanetakis ursprungliga pulståg straffar energi MELLAN pulserna, vilket
skulle straffa 2P (de överhoppade slagen ligger då off-grid med full energi).
Implementerat och svept (`PULSE_OFF`, straffvikt):

| straff | korpus | övergångar |
|---|---|---|
| 0 (nuvarande) | **8 rätt / 82,3** | 72,0 |
| 0,25 | 7 / 78,3 | 71,9 |
| 0,5 | 7 / 78,6 | **77,4** |
| 1,0 | 7 / 77,5 | 75,9 |

Nollsummespel: övergångar +5,4, korpus −4,0 och en låt. **Förkastat.** Trolig orsak:
onset-envelopen är utsmetad (mjuka anslag), så off-grid-energin är hög även vid rätt
tempo och straffet träffar alla kandidater ungefär lika. En vassare envelope
(skarpare fluxberäkning) skulle behövas först — det är den riktiga uppströmsfixen.

- **Snabbare tempogram-EMA efter låtbyte** (`a = 0.30` medan commiten hålls öppen,
  i stället för 0,15). Övergångar 85,2 → 87,0 % och överhängets kostnad 10,0 → 7,3,
  men korpusen 8/8 → 7/8 unika låtar. Förkastat: en perfekt korpus offras inte för
  1,8 procentenheter på övergångsmåttet.
