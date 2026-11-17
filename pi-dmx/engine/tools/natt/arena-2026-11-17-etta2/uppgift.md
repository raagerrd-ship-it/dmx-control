# DMX-arenan etta2: taktens etta ska ligga på musikens etta, del 2

Du är en av 8 deltagare. Alla har fått exakt den här uppgiften. Det enda som skiljer er åt är STRATEGIKORTET i din brief.
Domaren är BÄNKEN, inte en människa eller en modell. Din variant byggs, körs genom riggens riktiga analysator och effektmotor mot
inspelningar och poängsätts av `tools/arena/ettdom.py`. Läs domarens filhuvud, där står måtten, poängen och spärrarna exakt.
Byt `.arena/etta/` mot `.arena/etta2/` i alla kommandon.

## Riggen och målet

Pi-DMX: 8 RGB-parlampor i en lada (partyljus), allt i realtid ur ljudet. Lotus (en LED-list i en källare) delar samma analysator.
Motor: TypeScript i `C:\Users\richa\Desktop\Claude\dmx-control\pi-dmx\engine` (src/ -> dist/). Arkitekturen: analysatorn ger ALL
information om låten (tempo, klocka, etta, sektion, drop), dirigenten väljer effekt och effekten styr ljuset. Ettan hör till
analysatorns klocka. Ägaren valde den här frågan 2026-11-17 ("Ettan 2"). Hans prioritet är takt, låtbyte och drop.
Målet för hela riggen är att ljuset ska se ut som en förprogrammerad show på ett dansgolv: fras, lookbyten och landningar läggs på
takt-ettan, så ettan måste sitta där musikens etta är.

## Vad som är känt (mätt 2026-11-16/17)

- Arenan etta (11-16) gav f0, nu i koden: glidräkning per slag, relock utan ankarflytt, barOff bara ökar, kickens återstart med tak,
  och en backbeat-term (diskantens anslag i slagets första fjärdedel). Rätt etta bas -> f0: övning 33,5 -> 86,5 %, mellan 34,6 -> 68,9 %,
  kontroll 29,9 -> 63,9 %. Övningen ligger alltså långt över okänd musik.
- MÄNGDERNA ÄR NYA i etta2 (`.arena/etta2/mangder.json`, domaren läser den): f0 var redan 98 / 90 % på två av de gamla övningsfilerna,
  så felet syntes inte där. ÖVNING = 151659, 171840, 200719. MELLAN = 193818. KONTROLL = 193040, 160345, 172432.
- f0 (= bas) per fil, förskjutning 0/1/2/3 slag: 151659 98/1/0/1 %, 171840 63/13/17/6 %, 200719 69/10/16/6 %. Det vanligaste kvarvarande
  felet är förskjutning 2 (ettan på slag 3). Omval 1,2-1,5 per minut på 171840 och 200719.
- I koden (`src/analyserClock.ts`, ETTAN, rad ~394-450): basens stigning K, kickens återstart R och basgångens stigning L röstar per
  plats; backbeat-termen X[i+1] + X[i+3] - X[i] - X[i+2] skiljer {1,3} från {2,4} men säger inget om 1 mot 3. Förklaringen finns i
  `docs/analysator/analyserClock.md` (sök på BAR_DECAY).
- Prövat och struket i arenan etta (idébanken tools/natt/arena-2026-11-16-etta/): basnyhet bassNov (+4,3 övning men +0,2 mellan, kostar
  FFT i snabba vägen), topprestart, taktmallar skattade ur Beat This (föll på mellan), dropvittne (svagt på mellan), fras-nyhet, eget
  backbeat-band.
- Bänken är deterministisk (virtuell klocka): samma kod ger samma siffror.

## Låsta regler (bryter du dem är du DISK, oavsett poäng)

1. Ändra BARA de tillåtna filerna (TILLATNA i domarens filhuvud: analysatorns filer + split.ts + slowWorker.ts) i DIN KOPIA. effects.ts,
   effects/, beatClock.ts, beatFeed.ts, output.ts, config och tools/ är förbjudna. Domaren jämför filerna. En andra källa till ettan
   utanför analysatorn är förbjuden (en storhet, en källa).
2. Bara realtid: analysatorn får bara använda ljud som redan har hörts. Ingen framförhållning, inga filer, inget facit. Beat This,
   marks-*.json och beatthis.jsonl får ALDRIG läsas av motorns kod. Bara domaren läser facit. Konstanter får inte skattas ur facit
   (mallar eller tabeller anpassade till Beat This föll på okänd musik förra gången).
3. Tempo och fas ska vara oförändrade (spärren paslag). Det är ettan som ska rättas. barOff får bara öka (annars extra tick i lamporna).
4. Din variant ska vara KODENS STANDARD i din kopia. Inga env-flaggor och inga opt-in-rattar.
5. Analysatorn delas med lotus. Håll ändringen minimal och kirurgisk. Inga långa kommentarer i koden: notera i losning.md i stället.
   Ingen ny allokering per hop (GC-stallar på Pi:n). Pi:n har cpu över men ont om minne. Ny FFT i snabba vägen kostar även lotus.
6. Rör aldrig engine/src, engine/dist eller något utanför `.arena/etta2/<ditt-id>/`. Läs inte andra deltagares mappar under runda 1.
   Inga git-kommandon som ändrar något (ingen commit, stash, checkout eller add). Inga länkar, junctions eller worktrees.

## Arbetsgång (exakt)

    cd C:\Users\richa\Desktop\Claude\dmx-control\pi-dmx\engine
    export PYTHONIOENCODING=utf-8
    1. cp -r src .arena/etta2/<id>/src                         (din kopia; första gången)
    2. ändra i .arena/etta2/<id>/src/<tillåten fil>
    3. python tools/arena/bygg.py .arena/etta2/<id>             -> BYGGT / BYGGFEL
    4. python tools/arena/ettdom.py .arena/etta2/<id> --mat --namn m1    (andra gången --namn m2) -> ettdom.json + ettdom-m1.json
    5. python tools/arena/ettdom.py .arena/etta2                -> rangordningen mot bas

Budget: högst 2 mätningar (steg 4). Den första mäter idén rå, den andra lagar en spärr eller förbättrar. Utöver det högst 4 SONDER
(`ettdom.py .arena/etta2/<id> --sond <övningsfil>`: en fil, skriver bara till <id>/sond/kr-*.json; replay-json:en har 'ticks' och
'rows' för egna analyser). Mätning och sond går genom samma kö (en åt gången, ~2-5 min plus väntan). Kör dem med Bash, timeout
600000 ms. Tar det längre: kör i bakgrunden och vänta. Egna node-skript som läser analysatorns frame-fält på övningsfilerna (med din
dist, se konsertReplay.mjs `--dist`) räknas som sonder. Analys av json du redan har är fri, även basens json i .arena/etta2/bas/.
Facit för EGEN analys (aldrig i koden): tools/ladan-2026-11-13/beatthis.jsonl, bara för ÖVNINGENS filer (151659, 171840, 200719).
Mellan- och kontrollmängden (193818, 193040, 160345, 172432) får du varken spela, läsa facit för eller sondera. Domarens filhuvud
listar de gamla mängderna: mangder.json gäller.
Var misstänksam mot din egen övningsvinst: förra gången föll övningens etta till fjärde plats på okänd musik. En del som bara lyfter
en fil är troligen anpassning.

## Leverans

Skriv `.arena/etta2/<id>/losning.md` (svenska, högst ~400 ord):
- IDÉN i två meningar: vad ettan nu väljs efter och varför det är musikens etta.
- DELARNA: en tabell med del | vad den gör | vilket mått den bär (siffra ur din mätning). Jokern ska kunna lyfta ut en enskild del.
- DIFFEN: `git diff --no-index src .arena/etta2/<id>/src` (hela, den ska kunna appliceras).
- SIFFRORNA: din rad ur domaren per fil, och vad som blev sämre.
- RISKEN: var din variant kan fela i ladan (live-mic, låtbyten, breaks, musik utan trumma).

Efter runda 1 bygger en JOKER ihop de bästa delarna från alla deltagare, även diskade. Därför ska losning.md säga vilken del som bär
vilket mått. De bästa går vidare till runda 2 och utgår då från jokerns kombination.

Svara sist med en rad: `KLAR <id> poäng <x> <DISK eller OK>`.
