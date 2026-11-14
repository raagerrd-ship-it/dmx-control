# DMX-arena lat1 – TAKTEN: rätt tempo fler sekunder, särskilt genom låtbytet

Du är en av 8 deltagare. Alla har fått exakt den här uppgiften; det enda som skiljer er åt är STRATEGIKORTET i din brief.
Domaren är BÄNKEN, inte en människa eller en modell: ditt bygge spelar två inspelningar genom hela analysatorn och poängsätts av
`tools/arena/latdom.py` mot ett tempofacit. Läs domarens filhuvud först – där står mått, poäng och spärrar exakt.

## Riggen och målet

Pi-DMX: 8 RGB-parlampor i en lada (partyljus), allt i realtid ur ljudet på en Pi Zero 2 W. Motor: TypeScript i
`C:\Users\richa\Desktop\Claude\dmx-control\pi-dmx\engine` (src/ -> dist/). Arkitekturen är låst: ANALYSATORN ger all information om
låten, DIRIGENTEN väljer effekt, EFFEKTEN styr ljuset. Varje storhet har EN källa: klockan (`src/analyserClock.ts`, klass `BeatFeed`)
äger tempot och rutnätet, låtgränsdetektorn (`src/boundaryDetector.ts`) äger låtgränsen. Låtgränsen är klockans ENDA signal om att
låten bytts (motorn anropar `analyser.hintTrackChange(5000)` -> `an.trackBoundaries` stiger -> klockan läser den per hopp).

Ägaren, 2026-11-14: "takt, låtbyte och drop är viktigare" (än uppbyggnad). Ljuset ska gå i takt. Går klockan på fel tempo pulsar
lamporna fel – tydligast precis efter ett låtbyte och precis vid ett drop, där det syns mest.

## Vad som är känt (mätt 2026-11-14 på ladans tre rena inspelningar, Beat This! som tempofacit)

- Klockan har rätt tempo 92,6 % av tiden på övningen (64 s fel av 863). Var felen ligger (sekunder in i filen):
  - `160345`: 136–142 (ett break: 131 -> 80 bpm en sekund före ett drop, baskroppen 17–19 dB under sitt tak; klockans break-håll kräver
    24 dB), 201–204 (efter en FALSK låtgräns vid 200 s, i en uppbyggnad), 256–278 (låtbytet vid ~265: förra låten tonar ut, 3,5 s tystnad,
    nästa låt har ett intro utan bas; klockan står kvar nära förra tempot och visar sedan 105 i st f 143 i 9 s efter att basen kom), 410–414.
  - `171840`: 20–39 (starten; facit är själv osäkert där: 73 -> 143 -> 150 -> 143), 129–131, 273–276 (låtbyten, 2–5 s).
- Låtgränsdetektorn har två vägar: TYSTNAD (nivån under släckgränsen i 3 s -> gräns direkt) och LÅTENS FORM (jämför de senaste 8 s
  med 80 s före i spektralform, tonart och tempo; säger gränsen som tidigast 9 s efter skarven; kräver 110 s sedan förra gränsen).
  På övningen: 264 s (tystnaden, rätt), 401 s (form, skarven ~406), 151 s (form, skarven ~130 = 20 s sent), 200 s (form, FALSK: en
  uppbyggnad där basen är borta i tio sekunder), och skarven vid ~272 missas. Formpoängen vid riktiga skarvar är 1,12–1,44 och vid
  den falska 1,47 (tröskel 1,3). Utan basbanden i formen hamnar skarvarna rättare men den falska ligger kvar på 1,31.
- Att bara sänka break-hållets djup (TG_BRK_DB 24 -> 20/16/12) ger INGET netto: hoppen före drop rättas men klockan blir lika mycket
  senare vid låtbyten (140 s fel i dag mot 138–151 s på alla tre filerna). Det är mätt; gör inte om det som enda åtgärd.
- Klockans kod: `src/analyserClock.ts` (493 rader, bara korta etiketter). ALLA skäl och mätningar bakom talen står i
  `docs/analysator/analyserClock.md` – läs den delen som rör din mekanism innan du ändrar. Låtgränsen: `src/boundaryDetector.ts`
  (276 rader) + `docs/analysator/boundaryDetector.md`. Kartan: `docs/analysator/README.md`.

## Materialet

- ÖVNING (fritt att spela, mäta och titta på): `tools/ladan-2026-11-13/lang-20261113T160345.wav` (603 s) och
  `lang-20261113T171840.wav` (300 s). Facit för just dem: `.arena/lat1/facit/beatthis.jsonl` (slagen) och
  `.arena/lat1/facit/latbyten.json` (skarvarna i sekunder). Markeringar från ägaren: `lang-20261113T160345.marks-fin.json`.
- KONTROLL: en tredje inspelning som bara orkestratorn kör i finalen. Du får varken spela, läsa, tappa eller lyssna på något som
  heter `lang-20261113T151659.*`, och du får INTE öppna `tools/ladan-2026-11-13/beatthis.jsonl` eller `tools/ladan-2026-11-13/latbyten.json`
  (de innehåller kontrollens facit – använd kopiorna i `.arena/lat1/facit/`). Bryter du mot det är du DISK.
- Det finns bara fyra låtbyten i övningen och två i kontrollen. En lösning som passar fyra tidpunkter men saknar ett MUSIKALISKT skäl
  faller i finalen (det hände hela förra arenan: 90 poäng på övningen, 0 träffar på kontrollen). Bygg en mekanism, inte en tabell:
  inga tidsstämplar, inga tal trimmade mot enstaka händelser, och varje ny gräns ska tåla ±25 % utan att domen på övningen ändras.

## Verktygen (nytt: varje analys går att köra FÖR SIG)

    cd C:\Users\richa\Desktop\Claude\dmx-control\pi-dmx\engine
    export PYTHONIOENCODING=utf-8
    1. mkdir -p .arena/lat1/<id> && cp -r src .arena/lat1/<id>/src                 (din kopia; första gången)
    2. ändra i .arena/lat1/<id>/src/boundaryDetector.ts och/eller .arena/lat1/<id>/src/analyserClock.ts
    3. python tools/arena/bygg.py .arena/lat1/<id>                                 -> BYGGT / BYGGFEL
    4. FRIA PROV, sekunder per körning, ingen budget (tapparna i .arena/lat1/tap/, en per övningsfil):
       node tools/ensamTakt.mjs klocka   .arena/lat1/tap/lang-20261113T160345.klocka.tap   --dist .arena/lat1/<id>/dist --facit .arena/lat1/facit/beatthis.jsonl
       node tools/ensamTakt.mjs latgrans .arena/lat1/tap/lang-20261113T160345.latgrans.tap --dist .arena/lat1/<id>/dist --facit .arena/lat1/facit/latbyten.json
       (samma med lang-20261113T171840; `--set NAMN=värde` byter en konstant i den kompilerade filen utan ombygge, bra för marginalprov)
       Klockan ensam får samma indata per hopp som i hela körningen (anslag, basband, kick, låtgränsräknaren, tystnad, baskroppen under
       taket) och sitt eget förra svar tillbaka. Låtgränsen ensam får nivå/tempo/tystnad per hopp och spektrum upp till 12 kHz.
       DE SER INTE SAMSPELET: en ny låtgräns når inte klockan i ensam-körningen, och klockans nya tempo når inte låtgränsen eller
       kickgrinden. Det gör bara steg 5.
    5. python tools/arena/latdom.py .arena/lat1/<id> --mat                         -> hela analysatorn, skriver latdom.json (~50 s, kö)
    6. python tools/arena/latdom.py .arena/lat1                                    -> rankingen mot bas

Budget: högst 3 domarmätningar (steg 5). Spara var och en direkt (`cp latdom.json latdom-m1.json`, `-m2`, `-m3`). Fria prov (steg 4)
är obegränsade men kör högst två åt gången. Att läsa och räkna på ljudet självt är fritt (python med numpy/scipy/soundfile:
`C:\Users\richa\Desktop\Claude\lotus-light-link\tools\tempo-facit-pc\.venv\Scripts\python.exe`). Skriv egna små skript i din mapp.

## Låsta regler (bryts de är du DISK, oavsett poäng)

1. Ändra BARA `src/boundaryDetector.ts` och `src/analyserClock.ts` i DIN KOPIA (kör `python tools/analyser_shared.py --write
   .arena/lat1/<id>/src` om du vill hålla manifestet rätt; domaren godtar `ANALYSER_SHARED.md5`). Allt annat är förbjudet – domaren
   jämför filerna. Gränssnittet mellan dem och resten (BeatFeed.update, HopTarget, BoundaryDetector.tick/pushSpectrum/boundaryCount)
   får inte ändras: resten av motorn och lotus anropar dem som i dag.
2. Takten UTANFÖR låtbytena får inte bli sämre än bas − 1,0 %-enheter (spärren `utanfor`). Laga inte låtbytet genom att förstöra låten.
3. Ingen förstärkning av ljudet eller nivån, inga nya absoluta nivågränser (relativt låtens egen nivå eller släckgränsen
   `frame.silent`). Inget tal valt för hur ljuset ser ut.
4. Din variant ska vara KODENS STANDARD i din kopia: inga env-rattar i slutlösningen. Konstanter får en kort etikett på raden;
   skälet och mätningen skriver du i `losning.md`, inte som långa kommentarer i koden (ägarens regel 11-14).
5. Pi Zero 2 W: inga allokeringar per hopp i den snabba vägen (375 hopp/s), inga nya stora buffertar. Kostnaden per hopp får inte
   överstiga 1,5 × bas.
6. Rör aldrig engine/src, engine/dist, engine/tools eller något utanför `.arena/lat1/<ditt-id>/`. Läs inte andra deltagares mappar.
   Inga git-kommandon som ändrar något (ingen commit, stash, checkout, add). Inga länkar/junctions. Inga nätverksanrop.

## Jokern och idébanken

När runda 1 är dömd bygger en joker ihop de delar som vann sina mått – även ur diskade lösningar. Skriv därför i `losning.md` vilken
DEL av din ändring som bär vilket mått. Alla lösningar sparas i idébanken, även förlorarnas.

## Leverans

Skriv `.arena/lat1/<id>/losning.md` (svenska, högst ~500 ord + diffen):
- IDÉN i två meningar: vad klockan/låtgränsen nu gör annorlunda och varför det stämmer MUSIKALISKT (inte bara på de här filerna).
- DELAR: en rad per del av ändringen och vilket mått den bär (takt, lastid, latbyten, falska, utanfor).
- MARGINALER: varje ny eller ändrad gräns ±25 % – ändras domen på övningen? (tabell; använd `--set` i ensam-körningen)
- SIFFRORNA: din rad ur domaren för varje mätning (m1..m3), per fil, och vad som blev sämre.
- RISKEN: var mekanismen går fel på annan musik (långa mixar, låtar med tyst intro, tal mellan låtar, tempobyte mitt i en låt,
  halvtempo/3:2-släktingar).
- DIFFEN: `git diff --no-index src .arena/lat1/<id>/src` (hela, den ska kunna appliceras).
Svara sist med en rad: `KLAR <id> poäng <x> <DISK eller OK>`.
