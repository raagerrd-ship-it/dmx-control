# DMX-arenan fras: lookbytet ska komma på musikens fras

Du är en av 8 deltagare. Alla har fått exakt den här uppgiften. Det enda som skiljer er åt är STRATEGIKORTET i din brief.
Domaren är BÄNKEN, inte en människa eller en modell. Din variant byggs, körs genom riggens riktiga analysator och effektmotor mot
inspelningar och poängsätts av `tools/arena/frasdom.py`. Läs domarens filhuvud, där står måtten, poängen och spärrarna exakt.

## Riggen och målet

Pi-DMX: 8 RGB-parlampor i en lada (partyljus), allt i realtid ur ljudet. Lotus (en LED-list i en källare) delar samma analysator.
Motor: TypeScript i `C:\Users\richa\Desktop\Claude\dmx-control\pi-dmx\engine` (src/ -> dist/). Arkitekturen: analysatorn ger ALL
information om låten (tempo, klocka, etta, sektion, drop), dirigenten väljer effekt (look) och effekten styr ljuset. Ägaren valde den
här frågan 2026-11-16 kväll ("Frasen, stor"). Hans prioritet är takt, låtbyte och drop. Målet för hela riggen är att ljuset ska se ut
som en FÖRPROGRAMMERAD show på ett dansgolv: där byter ljuset look när musiken går in i en ny del, på ettan, inte några sekunder senare.

## Vad som är känt (mätt 2026-11-16, HEAD 720be60)

- Ettan ligger nu rätt (arenan etta, f0): taktklockans etta på musikens etta 64-87 %. Tempo och fas är bra (takt 91-95 %).
- Ägarens sektionsgränser ligger inom +-1 slag från musikens etta till 96-97 %.
- Dirigentens sektionsbyte kommer median 4,6-7,0 s (11-14 slag) efter ägarens gräns, spridning 0-41 slag, och sitter på frasen
  18-24 % (slump 19 %), på takten 14-33 % (slump 25 %). f0 ändrade inte det: bytet följer sektionsdetektorn, som är sen, och väntar
  inte in något i musiken.
- Tidigare prov: SWITCH_ON 1 -> 4 (sektionsbytet väntar in takt-ettan, högst 5 slag) föll två gånger (10-25, 11-15) - ljusdomaren
  -0,7 / -2,0 (koreografin) och frasträffen oförändrad. Det var MED den gamla, felvalda ettan.
- Var bytet uppstår: `src/analyserSection.ts` (SectionTracker -> frame.section intro/low/build/high/break, sectionBars; förklaring i
  `docs/analysator/analyserSection.md`), `src/effects.ts` stepDirigent (rad ~951: SWITCH_ON, SECTION_UNIT_MIN_MS, ready/slagOk,
  buildLock/inGap, dropEntry, secEntry, switchWhy). Mät först VAR fördröjningen sitter (detektorn eller dirigenten).
- Sektionsanalysen körs i ladan i analysatorns långsamma väg (worker på kärna 2, `split.ts`/`slowWorker.ts`). Bänken kör allt inline.
  Ett NYTT ramfält ur den långsamma vägen måste bäras i split.ts (se HOP_REC_LEN och hur specAbs.treble bärs) - annars syns det inte i ladan.
- Bänken är deterministisk (virtuell klocka): samma kod ger samma siffror.

## Låsta regler (bryter du dem är du DISK, oavsett poäng)

1. Ändra BARA de tillåtna filerna (TILLATNA i domarens filhuvud) i DIN KOPIA. analyserClock.ts (ettan och tempot), analyserDrop.ts,
   output.ts, beatClock.ts, beatFeed.ts, config och tools/ är förbjudna. Domaren jämför filerna. En storhet, en källa: sektionen och
   frasen hör till analysatorn, dirigenten får läsa dem men inte räkna en egen kopia.
2. Bara realtid: motorn får bara använda ljud som redan har hörts. Ingen framförhållning, inga filer, inget facit. marks-*.json och
   beatthis.jsonl får ALDRIG läsas av motorns kod. Bara domaren läser facit. Inga mallar eller tal skattade per fil ur facit.
3. Ljuset: inga nya looks eller effekter (trimma val och tajmning av de befintliga). Nedtoningen görs aldrig snabbare. Strobe högst
   3/s. Inget mot vitt. beatLeadMs höjs aldrig. Dropvägen (dropHit/dropEntry, 12 s-regeln mellan drops) ska fungera som i dag.
4. Din variant ska vara KODENS STANDARD i din kopia. Inga env-flaggor och inga opt-in-rattar.
5. Analysatorn delas med lotus. Håll ändringen minimal och kirurgisk. Inga långa kommentarer i koden: notera i losning.md i stället.
   Ingen ny allokering per hop (GC-stallar på Pi:n). Pi:n har cpu över men ont om minne.
6. Rör aldrig engine/src, engine/dist eller något utanför `.arena/fras/<ditt-id>/`. Läs inte andra deltagares mappar under runda 1.
   Inga git-kommandon som ändrar något (ingen commit, stash, checkout eller add). Inga länkar, junctions eller worktrees.

## Arbetsgång (exakt)

    cd C:\Users\richa\Desktop\Claude\dmx-control\pi-dmx\engine
    export PYTHONIOENCODING=utf-8
    python = C:\Users\richa\Desktop\Claude\lotus-light-link\tools\tempo-facit-pc\.venv\Scripts\python.exe (har numpy)
    1. cp -r src .arena/fras/<id>/src                         (din kopia; första gången)
    2. ändra i .arena/fras/<id>/src/<tillåten fil>
    3. python tools/arena/bygg.py .arena/fras/<id>             -> BYGGT / BYGGFEL
    4. python tools/arena/frasdom.py .arena/fras/<id> --mat --namn m1    (andra gången --namn m2) -> frasdom.json + bank.json
    5. python tools/arena/frasdom.py .arena/fras                -> rangordningen mot bas (med ljusdomaren)

Budget: högst 2 mätningar (steg 4). Den första mäter idén rå, den andra lagar en spärr eller förbättrar. Utöver det högst 3 SONDER
(`frasdom.py .arena/fras/<id> --sond <övningsfil>`: en fil, bara replay, skriver till <id>/sond/kr-*.json; json:en har 'switches'
(t, orsak), 'ticks' (t, beatIdx), 'rows' och 'log' (dirigentens beslut) för egna analyser). Mätning och sond går genom samma kö (en åt
gången, ~2-6 min plus väntan). Kör dem med Bash, timeout 600000 ms. Tar det längre: kör i bakgrunden och vänta. Egna node-skript som kör
analysatorn/motorn på övningsfilerna räknas som sonder. Analys av json du redan har är fri (bas: .arena/fras/bas/frasdom/kr-*.json).
Facit för EGEN analys (aldrig i koden): övningens *.marks-hand.json och tools/ladan-2026-11-13/beatthis.jsonl. Mellan- och
kontrollmängden (172432) får du varken spela, läsa facit för eller sondera.

## Leverans

Skriv `.arena/fras/<id>/losning.md` (svenska, högst ~400 ord):
- IDÉN i två meningar: när lookbytet nu kommer och varför det är musikens fras.
- VAR FÖRDRÖJNINGEN SATT i bas (detektorn / dirigenten, i slag) enligt din mätning.
- DELARNA: en tabell med del | vad den gör | vilket mått den bär (siffra ur din mätning). Jokern ska kunna lyfta ut en enskild del.
- DIFFEN: `git diff --no-index src .arena/fras/<id>/src` (hela, den ska kunna appliceras).
- SIFFRORNA: din rad ur domaren per fil (även ljusdomaren), och vad som blev sämre.
- RISKEN: var din variant kan fela i ladan (live-mic, låtbyten, breaks, långa uppbyggnader, workern).

Efter runda 1 bygger en JOKER ihop de bästa delarna från alla deltagare, även diskade. Därför ska losning.md säga vilken del som bär
vilket mått. De bästa går vidare till runda 2 och utgår då från jokerns kombination.

Svara sist med en rad: `KLAR <id> poäng <x> <DISK eller OK>`.
