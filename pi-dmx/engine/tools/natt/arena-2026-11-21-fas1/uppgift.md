# DMX-arena fas1 – takten ska följa ett verkligt fashopp

Du är en av 4 deltagare. Alla har fått exakt den här uppgiften. Det enda som skiljer er åt är STRATEGIKORTET längst ner i din brief.
Domaren är BÄNKEN, inte en människa eller en modell: din variant byggs, körs genom riggens riktiga analysator och effektmotor mot
skarvade inspelningar och poängsätts av `tools/arena/fasdom.py`. Läs domarens filhuvud – där står poängen och spärrarna exakt.

## Riggen och målet

Pi-DMX: 8 RGB-parlampor i en lada (partyljus), allt i realtid ur ljudet. Motor: TypeScript i
`C:\Users\richa\Desktop\Claude\dmx-control\pi-dmx\engine` (src/ -> dist/). Taktklockan sitter i den delade analysatorn
(`src/analyserClock.ts`, anteckningar i `docs/analysator/analyserClock.md` – läs dem, koden har korta kommentarer med flit) och
effektmotorns klocka i `src/beatClock.ts`. Ägaren frågade, ordagrant:

> "Något vi kan göra för att minska fasförskjutning redan nu?"

## Vad som är känt (mätt 2026-11-21)

- Koden är a3c ("det trötta låset", `lmAt`/`lmAdd`/`lmTurn`, `freshTo`, sist i `onsetStep`): ett fashopp på 0,12 slag eller mer tas
  bara om ett fasminne (tau 10 s) håller med, utom 8 s efter låtgräns/nytt slag/tempohopp > 4 %. Det vann arenan takt13 på
  pardom FEL 10,27 -> 9,27 (nästan allt på 200719: korta falska toppar, offbeat-bas, uppbyggnad drog inte längre klockan).
- Skarvprovet (7 skarvar, 151659/171840): följtid median före låset 4,8 s (2-25 s), med a3c 14 s (4 av 7 sämre, värst 4,8 -> 16,8 s).
  Tau 5 s / 3 s och "ett hopp som nekats 8 gånger i rad åt samma håll tas" hjälpte inte entydigt (vann en skarv, förlorade en annan,
  tre fastnade > 60 s). Alltså: klockan var långsam att följa redan före låset, och låset gjorde det värre.
- Mätt i fas1 (38 skarvar): bas = a3c inom3 8 %, median 7,98 s, ifas 86,1 %, pardom FEL 9,27 par 98,2. ref = koden före låset:
  inom3 32 %, median 4,82 s, ifas 82,3 % (ref faller på spärren ifas: låset ger alltså verkligen fler tick i fas mellan skarvarna).
- Referensen `ref` i rankingen = koden före låset (fore-a3c). Basen `bas` = a3c (HEAD). Målet: följa som ref eller bättre, inom
  1-3 s, med a3c:s FEL kvar (spärren FEL <= bas + 0,5).

## Låsta regler (bryts de är du DISK, oavsett poäng)

1. Ändra BARA filerna i domarens TILLATNA i DIN KOPIA (analyser*.ts, split.ts, slowWorker.ts, beatClock.ts). Effekterna, output.ts,
   config och verktygen är förbjudna.
2. Motorns lead (beatLeadMs, GRID_EARLY_MS) får inte ändras: spärren lead 10 ms. Ingen ny FFT, inga allokeringar per hopp.
3. Motorns kod får ALDRIG läsa facit (beatthis.jsonl, .facit.json, marks-*.json) eller veta var skarvarna sitter.
4. Din variant ska vara KODENS STANDARD i din kopia (ingen env-flagga). Inga långa kommentarer i analysatorn (korta rader räcker;
   förklaringen hör hemma i losning.md).
5. Rör aldrig engine/src, engine/dist eller något utanför `.arena/fas1/<ditt-id>/`. Läs inte andra deltagares mappar.
   Inga git-kommandon som ändrar något (ingen commit, stash, checkout, add). Inga länkar/junctions.

## Arbetsgång (exakt)

    cd C:\Users\richa\Desktop\Claude\dmx-control\pi-dmx\engine
    export PYTHONIOENCODING=utf-8
    1. cp -r src tsconfig.json .arena/fas1/<id>/        (din kopia; första gången)
    2. ändra i .arena/fas1/<id>/src/...
    3. python tools/arena/bygg.py .arena/fas1/<id>                    -> BYGGT / BYGGFEL
    4. python tools/arena/fasdom.py .arena/fas1/<id> --mat [--namn m1]    -> fasdom.json (~1 min + kö)
       eller som sond: ... --mat --fil 200719                         -> fasdom-fil-200719.json (en fil)
    5. python tools/arena/pardom.py .arena/fas1/<id> --mat            -> pardom.json (KRÄVS för din slutvariant, spärren FEL)
    6. python tools/arena/fasdom.py .arena/fas1                       -> rankingen mot bas och ref

Budget: högst 8 mätningar med fasdom (fulla eller --fil) och högst 3 med pardom. Egna konsertReplay-körningar på en ny variant räknas
som en fasdom-mätning och ska gå genom låset (.arena/.banklas). De skarvade filerna ligger i `.arena/fas1/skarv/` (wav + facit för att
läsa DINA resultat – din kod får inte läsa dem). Analys av en replay-json du redan har är fri. Allt är deterministiskt: samma kod =
samma siffror. Kör långa kommandon i bakgrunden (Bash run_in_background) och vänta på notisen; timeout 600000 ms annars.
Slutvarianten = det som ligger i din src när du lämnar; dess fasdom.json och pardom.json ska vara mätta på exakt den koden.

## Leverans

Skriv `.arena/fas1/<id>/losning.md` (svenska, högst ~400 ord):
- IDÉN i två meningar: hur klockan nu skiljer ett verkligt fashopp från en kort falsk topp.
- DIFFEN: `git diff --no-index src .arena/fas1/<id>/src` (hela, den ska kunna appliceras).
- SIFFRORNA: din rad ur domaren (fasdom + pardom FEL/par), och vad som blev sämre.
- RISKEN: var din variant kan se sämre ut i ladan än bänken visar, och vad den kostar i cpu.
Svara sist med en rad: `KLAR <id> poäng <x> <DISK eller OK>`.
