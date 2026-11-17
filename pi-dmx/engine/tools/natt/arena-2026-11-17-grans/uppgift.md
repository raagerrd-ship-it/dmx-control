# DMX-arenan grans: gränsen utan lucka - ny del utan att musiken tystnar

Du är en av 8 deltagare. Alla har fått exakt den här uppgiften. Det enda som skiljer er åt är STRATEGIKORTET i din brief.
Domaren är BÄNKEN, inte en människa eller en modell. Din variant byggs, körs genom riggens riktiga analysator och effektmotor mot
inspelningar och poängsätts av `tools/arena/frasdom.py` (samma domare som arenan fras, med måttet 'missade' som info). Läs domarens
filhuvud, där står måtten, poängen och spärrarna exakt. Körningens egen ljusspärr står i `.arena/grans/ljusgrans.txt` om filen finns
(annars -1,5) - den sätts av orkestratorn före runda 1 efter en mätning av ljusdomarens brus och ändras inte under körningen.
LJUSET I DEN HÄR KÖRNINGEN (tools/natt/ljusbrus-2026-11-17.md): bara ett annat lookval, samma kod, flyttar ljusdomarens poäng med std
2,8-4,2 och fäller lampspr på 6 av 8 frön. Därför: i rundorna gäller ljus < -5,6 = DISK och lampspr är info; i FINALEN döms ljuset på
medlet av 4 lookfrön (tools/arena/ljusskak.py) mot basens medel, spärr -3,0 inklusive lampspr och slocknat. En ensam bänks ljuspoäng
säger alltså lite - jaga den inte; välj looker som sektionen skulle ha fått.

## Riggen och målet

Pi-DMX: 8 RGB-parlampor i en lada (partyljus), allt i realtid ur ljudet. Lotus (en LED-list i en källare) delar samma analysator.
Motor: TypeScript i `C:\Users\richa\Desktop\Claude\dmx-control\pi-dmx\engine` (src/ -> dist/). Arkitekturen: analysatorn ger ALL
information om låten (tempo, klocka, etta, sektion, drop), dirigenten väljer effekt (look) och effekten styr ljuset. Ägaren valde den
här frågan 2026-11-17 natt ("kör 1 först sen 2"). Målet för hela riggen är att ljuset ska se ut som en FÖRPROGRAMMERAD show på ett
dansgolv: ljuset byter look när musiken går in i en ny del, på ettan.

## Vad som är känt (mätt 2026-11-16/17, HEAD 9c15472 = arenan fras vinnare r0 inlagd)

- Dagens motor (r0): sektionsbytet väntar in analysatorns etta (SWITCH_ON 4), dirigentens 2 s-ålder är borta, och lookbytet kommer
  DIREKT på analysatorns minidrop (basen tillbaka efter en lucka) i high/intro ('landning', 24 s uppslukning efter). Ettan rätt 64-87 %.
- Det som är kvar: 28 av 83 ägargränser på övningen får INGET lookbyte inom 16 slag. Per sort: refräng 10/22, vers 8/24, drop 5/14,
  intro 2/5, uppbyggnad 2/14, break 1/1, outro 0/3. Vanligaste övergångar: drop->refräng 5, refräng->vers 4, uppbyggnad->drop 3,
  vers->refräng 3. Analysatorns sektion 3 s efter de missade gränserna: high 20, low 7, build 1. Det är alltså mest delar som byter
  INNE I det detektorn kallar 'high', utan lucka i basen - instrumentering, melodi, sång, energi som ändras men inte tystnar.
- Prövat i arenan fras (tools/natt/arena-2026-11-16-fras.md + idébanken tools/natt/arena-2026-11-16-fras/, läs dem): taktsynkron
  klangnyhet (a5: frame.barNovZ, 8 band), nivåhopp över 4 band (a8: fraseZ), frasprior var 8:e takt (a4), snabbare detektor
  (a2: SECTION_RUN 4 / in 2 / ut 5), daterad gräns (a3: sectionBackMs). INGEN av dem tog de här gränserna på okänd musik: a5r:s nyhet
  slog aldrig till på mellanmängden, a8 gav lösa byten. Runda 2 överanpassade (övningens etta blev sist på kontrollen).
  Med FAST_BANDS är basbanden 0-2 alltid 0 i den snabba vägen (jokerns fynd).
- Ljusdomaren reagerar på VILKEN look som spelar, inte bara tajmningen. Ett extra byte ska välja det sektionen skulle ha fått
  (manusets look eller nästa ur samma pool/tier) - aldrig en mörk/lugn look i en refräng.
- Var: `src/analyserSection.ts` (SectionTracker, docs/analysator/analyserSection.md), `src/analyser.ts` (ramfälten, snabba vägen),
  `src/effects.ts` stepDirigent (~rad 951-1160: landningen, wantSwitch, ready/slagOk, MIN_HOLD 8 s, landAbsorbUntil).
- Sektionsanalysen körs i ladan i analysatorns långsamma väg (worker på kärna 2, `split.ts`/`slowWorker.ts`). Bänken kör allt inline.
  Ett NYTT ramfält ur den långsamma vägen måste bäras i split.ts (se HOP_REC_LEN och hur specAbs.treble bärs) - annars syns det inte i ladan.
- Bänken är deterministisk (virtuell klocka): samma kod ger samma siffror.

## Låsta regler (bryter du dem är du DISK, oavsett poäng)

1. Ändra BARA de tillåtna filerna (TILLATNA i domarens filhuvud) i DIN KOPIA. analyserClock.ts (ettan och tempot), analyserDrop.ts,
   output.ts, beatClock.ts, beatFeed.ts, config och tools/ är förbjudna. En storhet, en källa: 'ny del' hör till analysatorn,
   dirigenten får läsa den men inte räkna en egen kopia. Två signaler som gör samma sak ska bli en.
2. Bara realtid: motorn får bara använda ljud som redan har hörts. Inget facit i koden. marks-*.json och beatthis.jsonl får ALDRIG läsas
   av motorns kod. Inga mallar, trösklar eller tal skattade per fil ur facit. En tröskel ska ha ett skäl i musiken eller i signalens
   egen fördelning (relativ mot låten), inte väljas så att övningens gränser råkar passera.
3. Ljuset: inga nya looks eller effekter. Nedtoningen görs aldrig snabbare. Strobe högst 3/s. Inget mot vitt. beatLeadMs höjs aldrig.
   Dropvägen (dropHit/dropEntry, 12 s-regeln mellan drops) och r0:s landning ska fungera som i dag om du inte uttryckligen ersätter dem.
4. Din variant ska vara KODENS STANDARD i din kopia. Inga env-flaggor och inga opt-in-rattar.
5. Analysatorn delas med lotus. Håll ändringen minimal och kirurgisk. Inga långa kommentarer i koden: notera i losning.md i stället.
   Ingen ny allokering per hop (GC-stallar på Pi:n). Pi:n har cpu över men ont om minne.
6. Rör aldrig engine/src, engine/dist eller något utanför `.arena/grans/<ditt-id>/`. Läs inte andra deltagares mappar under runda 1
   (idébanken från arenan fras får du läsa). Inga git-kommandon som ändrar något. Inga länkar, junctions eller worktrees.

## Arbetsgång (exakt)

    cd C:\Users\richa\Desktop\Claude\dmx-control\pi-dmx\engine
    export PYTHONIOENCODING=utf-8
    python = C:\Users\richa\Desktop\Claude\lotus-light-link\tools\tempo-facit-pc\.venv\Scripts\python.exe (har numpy)
    1. cp -r src .arena/grans/<id>/src                        (din kopia; första gången)
    2. ändra i .arena/grans/<id>/src/<tillåten fil>
    3. python tools/arena/bygg.py .arena/grans/<id>            -> BYGGT / BYGGFEL
    4. python tools/arena/frasdom.py .arena/grans/<id> --mat --namn m1    (andra gången --namn m2) -> frasdom.json + bank.json
    5. python tools/arena/frasdom.py .arena/grans               -> rangordningen mot bas (med ljusdomaren)

Budget: högst 2 mätningar (steg 4) och högst 3 SONDER (`frasdom.py .arena/grans/<id> --sond <övningsfil>`: en fil, bara replay,
skriver till <id>/sond/kr-*.json; json:en har 'switches' (t, orsak), 'ticks', 'rows' (kolumnerna i 'columns') och 'log'). Mätning och
sond går genom samma kö (en åt gången, ~2-6 min plus väntan). Kör dem med Bash, timeout 600000 ms; tar det längre, kör i bakgrunden och
vänta. Egna node-skript som kör analysatorn/motorn på övningsfilerna räknas som sonder. Analys av json du redan har är fri
(bas: .arena/grans/bas/frasdom/kr-*.json). Facit för EGEN analys (aldrig i koden): övningens *.marks-hand.json och
tools/ladan-2026-11-13/beatthis.jsonl. Mellan- och kontrollmängden (172432) får du varken spela, läsa facit för eller sondera.

## Leverans

Skriv `.arena/grans/<id>/losning.md` (svenska, högst ~400 ord):
- IDÉN i två meningar: vilken förändring i musiken som nu ger lookbyte, och varför den är realtid och inte anpassad till övningen.
- VILKA AV DE 28 MISSADE du tar (antal per sort) och hur många nya byten som INTE ligger vid en gräns.
- DELARNA: tabell del | vad den gör | vilket mått den bär (siffra ur din mätning). Jokern ska kunna lyfta ut en enskild del.
- DIFFEN: `git diff --no-index src .arena/grans/<id>/src` (hela, den ska kunna appliceras).
- SIFFRORNA: din rad ur domaren per fil (även ljusdomaren), och vad som blev sämre.
- RISKEN: var din variant kan fela i ladan (live-mic, prat, låtbyten, breaks, långa uppbyggnader, workern).

Efter runda 1 bygger en JOKER ihop de bästa delarna från alla deltagare, även diskade. Svara sist med en rad:
`KLAR <id> poäng <x> <DISK eller OK>`.
