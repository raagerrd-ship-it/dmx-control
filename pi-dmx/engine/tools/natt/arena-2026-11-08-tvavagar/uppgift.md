# DMX-arena tvavagar – analysatorns två vägar

Du är en av 8 deltagare. Alla har fått exakt den här uppgiften. Det enda som skiljer er åt är STRATEGIKORTET längst ner i din brief.
Domaren är BÄNKEN, inte en människa eller en modell. Din variant byggs, körs genom riggens riktiga analysator och effektmotor mot
inspelningar och korpus, och poängsätts av `tools/arena/tvavagar.py`. Läs domarens filhuvud. Där står måtten, vikterna,
spärrarna, kontrollmängden och tidsåtgången exakt.

## Riggen och målet

Pi-DMX: 4 RGB-parlampor i en lada (partyljus), allt i realtid ur ljudet på en Raspberry Pi. Motorn är TypeScript i
`C:\Users\richa\Desktop\Claude\dmx-control\pi-dmx\engine` (src/ -> dist/). Ägarens ord, ordagrant:

> "Är det inte bättre att slå ihop till en analysator, bara att i den så finns två olika vägar. Den snabba och sen den som ger
>  dirigenten information."
> "Arenan skall tydligt veta att vi vill ha två vägar i analysatorn, de kan gärna flytta mellan/återanvända saker/ta bort/lägga
>  till osv. Målet är inte enbart snabbhet (iaf inte på långsamma, där är det hur bra den analyserar som borde ge högst poäng).
>  Snabba vägen ger högst poäng om den utför samma uppgift eller bättre. Snabbare"
> "Lägg till bonus kanske till sista rundan, hur kan vi minska latens till workern?"
> "Men vi skall ju få ändra? Är väl hela meningen med arenan? Sen får vi ju bara porta till lotus"

**Arkitekturen du bygger mot:** EN analysator med TVÅ vägar.

- **SNABBA VÄGEN** körs i huvudtråden, varje hop (48 kHz, hop 128 = 375 Hz). Den ger det ljuset behöver direkt: nivå, band,
  kick/anslag och dropflanken. Målet är SAMMA uppgift eller bättre, på kortare CPU-tid och med kortare latens.
- **LÅNGSAMMA VÄGEN** körs i workern, på en egen kärna. Den ger det dirigenten behöver: tempo, rutnätets fas/ettan, taktmatningen,
  sektioner, build/drop-struktur och låtgräns. Målet är att FÖRSTÅ låten så bra som möjligt. Fart räknas bara som en gräns:
  workern måste hinna med.
- **FRITT:**
  - flytta saker mellan vägarna
  - återanvända (t.ex. en temposökning i stället för två)
  - ta bort dubbelarbete
  - lägga till nya signaler

## Vad som är känt (mätt 2026-11-08)

- CPU-profilen per funktion (PC, lang-20261107T154200 + LABFX, hela filen, före a9a411b):

  | Funktion | Andel av CPU |
  |---|---|
  | fft.js `_realTransform4` | 27 % |
  | beatFeed `onsetStep` + `fullStep` + `fullScore` + `update` | ~20 % |
  | analyser `process` | 9,1 % |
  | analyser `fastBandStep` | 7,7 % |
  | analyser `bigStep` | 7,5 % |
  | analyser `scoreEnv` | 5,8 % |
  | analyser `dropStep` | 3,8 % |
  | effects.js | 4 % |
  | output.js | 0,6 % |

- **a9a411b (i dag)** flyttade taktmatningen (src/beatFeed.ts) in i workern bakom DMX-profilvärdet `BEAT_FEED: 'slow'`
  (src/analyserProfile.ts).
  - Huvudtråden i realtid: 26,5 -> 22,0 µs per hop (−17 %). Domaren mätte (11-08) väggtiden runt Atomics.notify till ~33 µs per hop (tools/arena/notifyMat.mjs).
  - Workern ligger, när huvudtråden läser: 1 hop efter 67 % av tiden, 2 hop efter 17 %, ≥3 hop efter 7 %.
  - Leveransfördröjning: p50 0,05 ms, p99 0,44 ms, max 16,7 ms.
- Både analysatorn (`scoreEnv`/`alignScore`) och taktmatningen (`onsetStep`/`fullStep`) söker tempo.
- Snittet mellan vägarna: src/split.ts har en SAB-ring med ett record per env-sampel och per hop, plus seqlock-tillståndsblock.
  src/slowWorker.ts är workern. `Analyser` har `role` all|fast|slow. `createAnalyser(cfg, 'sync')` kör workern i lås-steg för bänken.
  Regeln för snittet: nya långsamma signaler läggs i workern och går via tillståndsblocket. Nya kommandon från motorn till
  analysatorn är flaggor i recordet, inte postMessage.

## Låsta regler (bryts de är du DISK, oavsett poäng)

1. Allt i `src/` i DIN KOPIA får ändras FRITT, även de delade filerna (analyser.ts, split.ts, slowWorker.ts, recorder/). Ägaren:
   "Men vi skall ju få ändra? Är väl hela meningen med arenan? Sen får vi ju bara porta till lotus". Samma filer används av en
   annan rigg (lotus), men den portas EFTER arenan och bedöms då i lotus egen bänk. Du behöver inte gömma beteendet bakom
   profilvärden. Domaren tittar inte alls på lotus.
   fft.js (node_modules) byts inte, men hur och hur ofta den anropas får ändras.
2. Snabbare fade-down är förbjudet. Strobe högst 3 blixtar/s. Inget får dra mot vitt. Ljusmängden är INGET kriterium (ägaren 11-08: "mer ljus kan ju vara en bra sak"): mer eller mindre ljus i snitt varken kostar eller ger poäng.
3. Snabba vägen får poäng bara om den gör SAMMA uppgift eller bättre. Antingen är riggens DMX-värden identiska med bas
   (md5 per lampa), eller så visar ljusdomaren (domare.py v3) att ljuset är minst lika bra (≥ bas −0,5). Annars ger
   snabba vägen DISK.
4. Workern får inte ligga efter mer än domarens gräns i realtid (står i filhuvudet).
5. Din variant ska vara KODENS STANDARD i din kopia, alltså på utan env-flagga.
6. Rör aldrig engine/src, engine/dist eller något utanför `.arena/tvavagar/<ditt-id>/`. Läs inte andra deltagares mappar.
   - Inga git-kommandon som ändrar något: ingen commit, stash, checkout eller add. Inga länkar eller junctions.
   - Skriv aldrig i lotus-light-link (portningen görs efter arenan).
   - MÄTFÄLLA: kör aldrig `tsc --rootDir <annan> --outDir ...` mot huvud-tsconfig. Vid rootDir-fel emitterar tsc ändå, och .js-filer
     hamnar i engine/src. Använd bygg.py.

## Arbetsgång (exakt)

    cd C:\Users\richa\Desktop\Claude\dmx-control\pi-dmx\engine
    export PYTHONIOENCODING=utf-8
    1. cp -r src .arena/tvavagar/<id>/src                        (din kopia; första gången)
    2. ändra i .arena/tvavagar/<id>/src/
    3. python tools/arena/bygg.py .arena/tvavagar/<id>             -> BYGGT / BYGGFEL
    4. python tools/arena/tvavagar.py --snabb .arena/tvavagar/<id> -> snabbkoll av md5-spärren (fri, ~15 s)
    5. python tools/arena/tvavagar.py --mat .arena/tvavagar/<id>   -> skriver tvavagar.json (kö: en mätning åt gången)
    6. python tools/arena/tvavagar.py .arena/tvavagar              -> rankingen mot bas

**Budget:** högst 3 mätningar (steg 5). Egna körningar av bänk- eller korpusverktyg på en NY variant räknas mot budgeten, utom
`--snabb`. Bänken är deterministisk (virtuell klocka): samma kod ger samma kvalitetssiffror. CPU-måttet har brus, och domarens
filhuvud säger hur stort det är. Du får gärna bygga egna små mätskript i `.arena/tvavagar/<id>/`, men domarens siffror avgör.
Kör långa kommandon med Bash-verktyget med timeout 600000 ms, eller i bakgrunden, och vänta på notisen.

## Leverans

Skriv `.arena/tvavagar/<id>/losning.md` (svenska, högst ~500 ord):
- **IDÉN** i två meningar: vad som ligger i vilken väg nu, och varför det är bättre.
- **DIFFEN:** `git diff --no-index src .arena/tvavagar/<id>/src`. Klistra in hela, den ska gå att applicera.
- **SIFFRORNA:** din rad ur domaren (långsamma, snabba, spärrar) och vad som blev sämre.
- **RISKEN:** var din variant kan bete sig annorlunda på Pi:n (ARM, Node 24) eller i realtid än bänken visar.

Svara sist med en rad: `KLAR <id> poäng <x> <DISK eller OK>`.
