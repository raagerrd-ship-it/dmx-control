# DMX-arenan takt13: takten ska sitta - och ettan får ligga på 1 eller 3

Du är en av 8 deltagare. Alla har fått exakt den här uppgiften. Det enda som skiljer er åt är STRATEGIKORTET i din brief.
Domaren är BÄNKEN, inte en människa eller en modell. Din variant byggs, körs genom riggens riktiga analysator och effektmotor mot
inspelningar och poängsätts av `tools/arena/pardom.py`. Läs domarens filhuvud: där står måtten, poängen och spärrarna exakt.

## Riggen och målet

Pi-DMX: 8 RGB-parlampor i en lada (partyljus), allt i realtid ur ljudet. Lotus (en LED-list i en källare) delar samma analysator.
Motor: TypeScript i `C:\Users\richa\Desktop\Claude\dmx-control\pi-dmx\engine`. Arkitekturen: analysatorn ger ALL information om
låten (tempo, klocka, etta, sektion, drop), dirigenten väljer effekt och effekten styr ljuset. Takten och ettan hör till analysatorns
klocka (`analyserClock.ts` = EN KLOCKA med taktminnet; worker-delningen i `split.ts` + `slowWorker.ts`; förklaringar i `docs/analysator/*.md`).
Målet för hela riggen: ljuset ska se ut som en förprogrammerad show på ett dansgolv, och det kräver att klockan sitter på slaget.

## DET NYA (2026-11-19 kväll, i ladan)

Ladan kör sedan i kväll 1AN-3AN-STILEN i effekterna (`src/effects/rig.ts`: `halva`, `ettaTrea`): det en effekt gör på taktens etta gör
den lika starkt på trean på den andra halvan av riggen. Hamnar analysatorns etta på slag 3 byter halvorna bara plats - det syns inte.
Ägarens ord: "om 3an körs mycket idag. så är inte det ett problem. så bättre att takten sitter", "då lamporna tänder på olika tex 1an
eller 3an, så är nog mer takten det viktigaste", och efter ögonprovet "så nu har vi byggt in felet till vår fördel istället".
Det som fortfarande syns är (1) TAKTEN: klockan på slaget, rätt tempo, ingen glidning; (2) PARFELET: ettan på slag 2 eller 4.
Tidigare arenor (takt, etta, etta2, etta3) diskade på 'rätt etta' där 1 och 3 var olika. Den spärren finns inte här: idéer som
föll bara på den kan nu vara rätt.

## Vad som är känt (mätt)

- Basen = HEAD (a6, fasen ur sex band, sedan 11-19 i ladan). Siffrorna för basen med den här domaren står i `.arena/takt13/bas/pardom.json`
  när du startar (övningen) - läs dem.
- Med a6 på övningen (arenan etta3:s mätning): takt FEL ~10 %, oktav ~5,6 %, par i ren 4/4 ~97 % (171840 ~97, de andra ~99).
  Det mesta som finns kvar att vinna på övningen är TAKTEN. Felklasserna per fönster står i `fonster` i domarens json.
- Arenan takt 11-17/18 (`tools/natt/arena-2026-11-18-takt.md` + mappen): a6 vann takten men diskades på 'etta'; jokerns j0/j0b
  hade lika bra eller bättre takt och föll också bara på 'etta'. Med par i stället för etta hade flera klarat sig.
- Bänken är deterministisk (virtuell klocka): samma kod ger samma siffror.
- Pi:n har resurser: workern får bli ~4 gånger tyngre och en ANDRA worker är tillåten (ny fil `analyser*.ts`). Det trånga är MINNET
  (+15 MB) och HUVUDTRÅDEN (får inte bli tyngre). Orkestratorn mäter med `tools/arena/pibudget.py`; över gränsen = DISK.

## TIDIGARE ARENOR SOM KÄLLA

Idébankerna, med varje deltagares losning.md, diff och mått (läs gärna, ta gärna delar - säg varifrån i losning.md, och mät här):
- `tools/natt/arena-2026-11-18-takt.md` + `tools/natt/arena-2026-11-18-takt/` - takten (a6 = basen; j0, j0b, a3, a7 m.fl.)
- `tools/natt/arena-2026-11-18-etta3.md` + mappen - ettan ovanpå a6 (ingen vinnare)
- `tools/natt/arena-2026-11-16-etta.md`, `tools/natt/arena-2026-11-17-etta2.md` + mapparna - ettan del 1 och 2
- `tools/natt/arena-2026-11-12-klocka2/`, `tools/natt/arena-2026-11-14-lat1.md` - tempotolkningen och låsningen efter låtbyte
Läs INTE ranking-*-holdout.md eller annat ur kontrollmängden (193040, 193818), varken här eller i .arena/.

## Låsta regler (bryter du dem är du DISK, oavsett poäng)

1. Ändra BARA de tillåtna filerna (TILLATNA i ettdom.py: analysatorns filer + split.ts + slowWorker.ts; nya filer får heta analyser*.ts)
   i DIN KOPIA. effects.ts, effects/, beatClock.ts, beatFeed.ts, output.ts, index.ts, config och tools/ är förbjudna. En andra källa till
   tempo, klocka eller etta utanför analysatorn är förbjuden (en storhet, en källa).
2. Bara realtid: analysatorn får bara använda ljud som redan har hörts. Ingen framförhållning, inga filer, inget facit. Beat This,
   marks-*.json och beatthis.jsonl får ALDRIG läsas av motorns kod. Konstanter och mallar får inte skattas ur facit.
3. beatLeadMs och motorns lead ändras inte (spärren lead). barOff får bara öka (ettan flyttas alltid framåt, så inget extra tick mitt i ett slag).
   Parfelet (ettan på 2 eller 4) är spärrat - ettan på 3 är fritt.
4. Din variant ska vara KODENS STANDARD i din kopia. Inga env-flaggor och inga opt-in-rattar.
5. Analysatorn delas med lotus. Ingen ny allokering per hop i heta loopar (GC-stallar). Ny FFT i snabba vägen kostar huvudtråden: förbjudet,
   lägg det i worker. Inga långa kommentarer i koden: notera i losning.md.
6. Rör aldrig engine/src, engine/dist eller något utanför `.arena/takt13/<ditt-id>/`. Läs inte andra deltagares mappar i .arena/takt13
   under runda 1 (idébankerna i tools/natt/ får du läsa). Inga git-kommandon som ändrar något. Inga länkar, junctions eller worktrees.
   Kör inga egna CPU-mätningar (pibudget, feedRealtid).

## Arbetsgång (exakt)

    cd C:\Users\richa\Desktop\Claude\dmx-control\pi-dmx\engine
    export PYTHONIOENCODING=utf-8
    1. cp -r .arena/takt13/bas/src .arena/takt13/<id>/src && cp .arena/takt13/bas/tsconfig.json .arena/takt13/<id>/   (första gången)
    2. ändra i .arena/takt13/<id>/src/<tillåten fil>
    3. python tools/arena/bygg.py .arena/takt13/<id>             -> BYGGT / BYGGFEL
    4. python tools/arena/pardom.py .arena/takt13/<id> --mat --namn m1    (andra gången --namn m2) -> pardom.json + pardom-m1.json
    5. python tools/arena/pardom.py .arena/takt13                -> rangordningen mot bas

Budget: högst 2 mätningar (steg 4): den första mäter idén rå, den andra lagar en spärr eller förbättrar. Utöver det högst 4 SONDER
(`pardom.py .arena/takt13/<id> --sond <övningsfil>`: en fil, skriver bara till <id>/sond/; `sond/kr-*.json` har 'ticks' och 'rows'
(kolumnerna i 'columns') för egna analyser, `sond/pardom-sond.json` har måtten). Mätning och sond går genom samma kö (en åt gången,
~2-6 min plus väntan). Kör med Bash, timeout 600000 ms; tar det längre, kör i bakgrunden och vänta. Analys av json du redan har är fri,
även basens i .arena/takt13/bas/ (ettdom/kr-*.json, pardom.json).
Facit för EGEN analys (aldrig i koden): beatthis.jsonl, bara för ÖVNINGENS filer (151659, 171840, 200719). Mellan- och kontrollmängden
får du varken spela, läsa facit för eller sondera.
Var misstänksam mot din egen övningsvinst: i de senaste takt- och ettarenorna föll den bästa ofta på okänd musik. En del som bara lyfter
en fil är troligen anpassning. Musikteori och mekanismer som gäller all dansmusik håller bättre än tal som passar övningen.

## Leverans

Skriv `.arena/takt13/<id>/losning.md` (svenska, högst ~400 ord):
- IDÉN i två meningar: vad analysatorn nu gör annorlunda och varför takten då sitter bättre (och paret håller).
- DELARNA: tabell del | vad den gör | vilket mått den bär (siffra ur din mätning) | ev. varifrån i idébanken. Jokern ska kunna lyfta ut en enskild del.
- KOSTNADEN: vad som körs i worker och vad i huvudtråden, ungefär hur mycket mer räkning per hop, och nytt minne (MB).
- DIFFEN: `git diff --no-index .arena/takt13/bas/src .arena/takt13/<id>/src` (hela, den ska kunna appliceras på basen).
- SIFFRORNA: din rad ur domaren per fil, och vad som blev sämre.
- RISKEN: var varianten kan fela i ladan (aux in från mixer, låtbyten, breaks, musik utan trumma, udda takter).

Efter runda 1 bygger en JOKER ihop de bästa delarna från alla deltagare, även diskade. Radvinnarna går vidare till runda 2.
Svara sist med en rad: `KLAR <id> poäng <x> <DISK eller OK>`.
