# DMX-arenan etta: taktens etta ska ligga på musikens etta

Du är en av 8 deltagare. Alla har fått exakt den här uppgiften. Det enda som skiljer er åt är STRATEGIKORTET i din brief.
Domaren är BÄNKEN, inte en människa eller en modell. Din variant byggs, körs genom riggens riktiga analysator och effektmotor mot
inspelningar och poängsätts av `tools/arena/ettdom.py`. Läs domarens filhuvud, där står måtten, poängen och spärrarna exakt.

## Riggen och målet

Pi-DMX: 8 RGB-parlampor i en lada (partyljus), allt i realtid ur ljudet. Lotus (en LED-list i en källare) delar samma analysator.
Motor: TypeScript i `C:\Users\richa\Desktop\Claude\dmx-control\pi-dmx\engine` (src/ -> dist/). Arkitekturen: analysatorn ger ALL
information om låten (tempo, klocka, etta, sektion, drop), dirigenten väljer effekt och effekten styr ljuset. Ettan hör till
analysatorns klocka. Ägaren, ordagrant: "kör hel arena" (2026-11-16, om taktens etta). Hans prioritet är takt, låtbyte och drop.
Målet för hela riggen är att ljuset ska se ut som en förprogrammerad show på ett dansgolv, och då måste ettan sitta där musikens etta är.

## Vad som är känt (mätt 2026-11-16, nattagenten + huvudchatten)

- Motorns takt-etta (effektklockans tick med `beatIdx % 4 = 0`) mot Beat This-ettan, förskjutning 0/1/2/3 slag: 151659 43/23/23/11 %,
  171840 34/12/1/53 %, 193040 29/29/13/29 % (rätt = 100/0/0/0). I 30 s-bitar är fasen oftast låst (95-100 % samma förskjutning) men på
  fel slag, och den byter, till exempel i 193040: 0,0,0,1,1,1,3,3,2,2,0. Tempot är rätt. Det är ettan som väljs fel och väljs om.
- Ägarens sektionsgränser ligger på Beat This-ettan till 94-97 % inom +-1 slag.
- Följder i ljuset: lookbyten kan inte läggas på takt-ettan eller frasgränsen. Frasbundna byten (SWITCH_ON 4) föll två gånger, 10-25 och
  11-15, eftersom frasträffen inte rörde sig (15 %).
- Var ettan räknas: `src/analyserClock.ts`, ETTAN (barStep/barCommit/relock, konstanterna BAR_DECAY, BAR_MIN, BAR_MARGIN, BAR_W_BASS,
  BAR_W_BACK, BAR_WIN0, BAR_WIN1, BAR_RISE_HOPS). Förklaringen finns i `docs/analysator/analyserClock.md`, sök på BAR_DECAY. Fyra hypoteser
  (taktens fyra platser i rutnätets slagindex) med långt minne: basens (sub+kick) stigning, basgångens stigning, och diskant/virvel som talar
  emot. Vinnaren läggs bara i det PUBLICERADE ankaret (`cfg.beat` = inre rutnät + barOff hela slag). Rutnätets tempo och fas påverkas inte.
- Bänken är deterministisk (virtuell klocka): samma kod ger samma siffror.

## Låsta regler (bryter du dem är du DISK, oavsett poäng)

1. Ändra BARA de tillåtna filerna (TILLATNA i domarens filhuvud: analysatorns filer + split.ts + slowWorker.ts) i DIN KOPIA. effects.ts,
   effects/, beatClock.ts, beatFeed.ts, output.ts, config och tools/ är förbjudna. Domaren jämför filerna. En andra källa till ettan
   utanför analysatorn är förbjuden (en storhet, en källa).
2. Bara realtid: analysatorn får bara använda ljud som redan har hörts. Ingen framförhållning, inga filer, inget facit. Beat This,
   marks-*.json och beatthis.jsonl får ALDRIG läsas av motorns kod. Bara domaren läser facit.
3. Tempo och fas ska vara oförändrade (spärren paslag). Det är ettan som ska rättas.
4. Din variant ska vara KODENS STANDARD i din kopia. Inga env-flaggor och inga opt-in-rattar.
5. Analysatorn delas med lotus. Håll ändringen minimal och kirurgisk. Inga långa kommentarer i koden: notera i losning.md i stället.
   Ingen ny allokering per hop (GC-stallar på Pi:n). Pi:n har cpu över men ont om minne.
6. Rör aldrig engine/src, engine/dist eller något utanför `.arena/etta/<ditt-id>/`. Läs inte andra deltagares mappar under runda 1.
   Inga git-kommandon som ändrar något (ingen commit, stash, checkout eller add). Inga länkar, junctions eller worktrees.

## Arbetsgång (exakt)

    cd C:\Users\richa\Desktop\Claude\dmx-control\pi-dmx\engine
    export PYTHONIOENCODING=utf-8
    1. cp -r src .arena/etta/<id>/src                         (din kopia; första gången)
    2. ändra i .arena/etta/<id>/src/<tillåten fil>
    3. python tools/arena/bygg.py .arena/etta/<id>             -> BYGGT / BYGGFEL
    4. python tools/arena/ettdom.py .arena/etta/<id> --mat --namn m1    (andra gången --namn m2) -> ettdom.json + ettdom-m1.json
    5. python tools/arena/ettdom.py .arena/etta                -> rangordningen mot bas

Budget: högst 2 mätningar (steg 4). Den första mäter idén rå, den andra lagar en spärr eller förbättrar. Utöver det högst 4 SONDER
(`ettdom.py .arena/etta/<id> --sond <övningsfil>`: en fil, skriver bara till <id>/sond/kr-*.json; replay-json:en har 'ticks' och
'rows' för egna analyser). Mätning och sond går genom samma kö (en åt gången, ~2-5 min plus väntan). Kör dem med Bash, timeout
600000 ms. Tar det längre: kör i bakgrunden och vänta. Egna node-skript som läser analysatorns frame-fält på övningsfilerna (med din
dist, se konsertReplay.mjs `--dist`) räknas som sonder. Analys av json du redan har är fri.
Facit för EGEN analys (aldrig i koden): tools/ladan-2026-11-13/beatthis.jsonl för ÖVNINGENS filer. Mellan- och kontrollmängden
(200719, 171840, 193040, 193818) får du varken spela, läsa facit för eller sondera.

## Leverans

Skriv `.arena/etta/<id>/losning.md` (svenska, högst ~400 ord):
- IDÉN i två meningar: vad ettan nu väljs efter och varför det är musikens etta.
- DELARNA: en tabell med del | vad den gör | vilket mått den bär (siffra ur din mätning). Jokern ska kunna lyfta ut en enskild del.
- DIFFEN: `git diff --no-index src .arena/etta/<id>/src` (hela, den ska kunna appliceras).
- SIFFRORNA: din rad ur domaren per fil, och vad som blev sämre.
- RISKEN: var din variant kan fela i ladan (live-mic, låtbyten, breaks, musik utan trumma).

Efter runda 1 bygger en JOKER ihop de bästa delarna från alla deltagare, även diskade. Därför ska losning.md säga vilken del som bär
vilket mått. De bästa går vidare till runda 2 och utgår då från jokerns kombination.

Svara sist med en rad: `KLAR <id> poäng <x> <DISK eller OK>`.
