# DMX-arenan takt: klockan ska sitta på slaget hela tiden

Du är en av 8 deltagare. Alla har fått exakt den här uppgiften. Det enda som skiljer er åt är STRATEGIKORTET i din brief.
Domaren är BÄNKEN, inte en människa eller en modell. Din variant byggs, körs genom riggens riktiga analysator och effektmotor mot
inspelningar och poängsätts av `tools/arena/taktdom.py`. Läs domarens filhuvud: där står måtten, klasserna, poängen och spärrarna exakt.

## Riggen och målet

Pi-DMX: 8 RGB-parlampor i en lada (partyljus), allt i realtid ur ljudet. Lotus (en LED-list i en källare) delar samma analysator.
Motor: TypeScript i `C:\Users\richa\Desktop\Claude\dmx-control\pi-dmx\engine` (src/ -> dist/). Arkitekturen: analysatorn ger ALL
information om låten (tempo, klocka, etta, sektion, drop), dirigenten väljer effekt och effekten styr ljuset. Takten och klockan hör till
analysatorn (`src/analyserClock.ts` = EN KLOCKA, tempot i `src/analyser.ts`, worker-delningen i `src/split.ts` + `src/slowWorker.ts`;
förklaringar i `docs/analysator/*.md`). Målet för hela riggen: ljuset ska se ut som en förprogrammerad show på ett dansgolv, och det
kräver att klockan sitter på slaget. Ägaren valde frågan 2026-11-17 kväll: "kör på! med vetskapen att använd alla resurser som pi har".

## Vad som är känt (mätt 2026-11-17)

- Taktens klasser per 10 s-fönster i dagens kod, 6 inspelningar: på slaget 63 %, dubbelt mot Beat This 11 % (tvetydigt), FASEN GLIDER 11 %,
  FEL TEMPO > 4 % 7 %, MOTSLAG 6 %, stökigt 2 %. Alltså ~26 % fel. Exempel: 200719 08:45-09:05 låst på motslaget (150 bpm, ticket 127 ms
  EFTER slaget i stället för ~60 ms före), 193818 10:15-11:05 motslaget i 50 s, 160345 glider 21 % av tiden.
- Halvt tempo (motorn på varannat Beat This-slag) är RÄTT och räknas som på slaget: Beat This dubblar ofta (200719 01:20-03:00: 88 bpm, BT
  176). Byt inte oktav för att vinna; spärren oktav fångar det.
- Motorns lead (ticket ~50-70 ms före slaget) är avsiktlig (beatLeadMs, låst) och dras av per fil. Ändra den inte.
- PI:N HAR RESURSER (belastningsprov i ladan 2026-11-17, ägaren tittade): motorn på kärna 0 1 2; i dag huvudtråd 45-65 % av en kärna,
  worker 18-22 %. Konstgjord last upp till +2,5 kärnor gav inget hack och inga överhoppade hopp. DU FÅR ANVÄNDA DET: workern får bli ungefär
  fyra gånger tyngre (~80 % av en kärna), och en ANDRA worker-tråd är tillåten (ny fil `analyser*.ts`, ~1 kärna till). Det trånga är
  MINNET (+15 MB) och HUVUDTRÅDEN (får inte bli tyngre: allt nytt räknande ska ligga i worker). Orkestratorn mäter med
  `tools/arena/pibudget.py` (läs filhuvudet); över gränsen = DISK.
- Bänken är deterministisk (virtuell klocka): samma kod ger samma siffror.

## Låsta regler (bryter du dem är du DISK, oavsett poäng)

1. Ändra BARA de tillåtna filerna (TILLATNA i ettdom.py: analysatorns filer + split.ts + slowWorker.ts; nya filer får heta analyser*.ts)
   i DIN KOPIA. effects.ts, effects/, beatClock.ts, beatFeed.ts, output.ts, index.ts, config och tools/ är förbjudna. En andra källa till
   tempo eller klocka utanför analysatorn är förbjuden (en storhet, en källa). En andra worker är en del av analysatorn, inte en källa till.
2. Bara realtid: analysatorn får bara använda ljud som redan har hörts. Ingen framförhållning, inga filer, inget facit. Beat This,
   marks-*.json och beatthis.jsonl får ALDRIG läsas av motorns kod. Konstanter får inte skattas ur facit.
3. beatLeadMs och motorns lead ändras inte (spärren lead). Rätt etta får inte bli sämre (spärren etta). barOff får bara öka.
4. Din variant ska vara KODENS STANDARD i din kopia. Inga env-flaggor och inga opt-in-rattar.
5. Analysatorn delas med lotus. Ingen ny allokering per hop i heta loopar (GC-stallar). Ny FFT i snabba vägen kostar huvudtråden: förbjudet,
   lägg det i worker. Inga långa kommentarer i koden: notera i losning.md.
6. Rör aldrig engine/src, engine/dist eller något utanför `.arena/takt/<ditt-id>/`. Läs inte andra deltagares mappar under runda 1.
   Inga git-kommandon som ändrar något. Inga länkar, junctions eller worktrees. Kör inga egna CPU-mätningar (pibudget, feedRealtid):
   de stör de andras mätningar. Orkestratorn mäter Pi-budgeten.

## Arbetsgång (exakt)

    cd C:\Users\richa\Desktop\Claude\dmx-control\pi-dmx\engine
    export PYTHONIOENCODING=utf-8
    1. cp -r src .arena/takt/<id>/src && cp tsconfig.json .arena/takt/<id>/     (din kopia; första gången)
    2. ändra i .arena/takt/<id>/src/<tillåten fil>
    3. python tools/arena/bygg.py .arena/takt/<id>             -> BYGGT / BYGGFEL
    4. python tools/arena/taktdom.py .arena/takt/<id> --mat --namn m1    (andra gången --namn m2) -> taktdom.json + taktdom-m1.json
    5. python tools/arena/taktdom.py .arena/takt                -> rangordningen mot bas

Budget: högst 2 mätningar (steg 4). Utöver det högst 4 SONDER (`taktdom.py .arena/takt/<id> --sond <övningsfil>`: en fil, skriver
bara till <id>/sond/; replay-json:en `sond/kr-*.json` har 'ticks' och 'rows' (kolumnerna i 'columns', bl.a. bpm, cbpm, conf, lock) för
egna analyser, och taktdom-sond.json har fönstrens klasser). Mätning och sond går genom samma kö (en åt gången, ~2-5 min plus väntan).
Kör med Bash, timeout 600000 ms; tar det längre, kör i bakgrunden och vänta. Analys av json du redan har är fri, även basens json i
.arena/takt/bas/ (taktdom.json har varje fönsters klass, 'fonster'). Facit för EGEN analys (aldrig i koden): beatthis.jsonl, bara för
ÖVNINGENS filer (151659, 160345, 200719). Mellan- och kontrollmängden får du varken spela, läsa facit för eller sondera.
Var misstänksam mot din egen övningsvinst: i förra arenan föll den bästa på okänd musik. En del som bara lyfter en fil är troligen anpassning.

## Leverans

Skriv `.arena/takt/<id>/losning.md` (svenska, högst ~400 ord):
- IDÉN i två meningar: vad klockan nu gör annorlunda och varför den då sitter på slaget.
- DELARNA: tabell del | vad den gör | vilket mått den bär (siffra ur din mätning). Jokern ska kunna lyfta ut en enskild del.
- KOSTNADEN: vad som körs i worker och vad i huvudtråden, ungefär hur mycket mer räkning per hop, och nytt minne (MB).
- DIFFEN: `git diff --no-index src .arena/takt/<id>/src` (hela, den ska kunna appliceras).
- SIFFRORNA: din rad ur domaren per fil, och vad som blev sämre.
- RISKEN: var varianten kan fela i ladan (live-mic, låtbyten, breaks, musik utan trumma).

Efter runda 1 bygger en JOKER ihop de bästa delarna från alla deltagare, även diskade. De bästa går vidare.
Svara sist med en rad: `KLAR <id> poäng <x> <DISK eller OK>`.
