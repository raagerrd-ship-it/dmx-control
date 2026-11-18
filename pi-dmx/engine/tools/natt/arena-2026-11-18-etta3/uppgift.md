# DMX-arenan etta3: ettan ska ligga på ettan, inte på trean (ovanpå den nya takten a6)

Du är en av 8 deltagare. Alla har fått exakt den här uppgiften. Det enda som skiljer er åt är STRATEGIKORTET i din brief.
Domaren är BÄNKEN, inte en människa eller en modell. Din variant byggs, körs genom riggens riktiga analysator och effektmotor mot
inspelningar och poängsätts av `tools/arena/etta3dom.py`. Läs domarens filhuvud: där står måtten, poängen och spärrarna exakt.

## Riggen och målet

Pi-DMX: 8 RGB-parlampor i en lada (partyljus), allt i realtid ur ljudet. Lotus (en LED-list i en källare) delar samma analysator.
Motor: TypeScript i `C:\Users\richa\Desktop\Claude\dmx-control\pi-dmx\engine`. Arkitekturen: analysatorn ger ALL information om
låten (tempo, klocka, etta, sektion, drop), dirigenten väljer effekt och effekten styr ljuset. Ettan hör till analysatorns klocka
(`analyserClock.ts` = EN KLOCKA med taktminnet; worker-delningen i `split.ts` + `slowWorker.ts`; förklaringar i `docs/analysator/*.md`).
Lookbyten och fraser i ljuset läggs på ettan. Hamnar ettan på slag 3 kommer bytet en halv takt fel (~0,9 s i 128 bpm).

Ägarens ord 2026-11-18: "Bedrövning är det om vi hamnar på 3:an istället för 1:an" och "kan vi sätta igång en arena på att hitta 1an,
med kanske tidigare som källa?" (= tidigare arenors idéer, se nedan).

## BASEN är INTE engine/src

Basen är `.arena/etta3/bas/src` = dagens kod + a6 från arenan takt (fasen ur sex band, väg efter regelbundenhet, lärd lead-kompensation;
ändrar `analyserClock.ts` + `split.ts`). a6 ligger inte i engine/src. **Din kopia görs ur basen**, inte ur engine/src (arbetsgången nedan).

## Vad som är känt (mätt)

- a6 mot dagens kod på okänd musik: taktfelet 27,8 -> 13,9 % (motslag 4,7 -> 1,2, glidning 10,7 -> 2,6). Men ettan i ren 4/4:
  193040 70,1 -> 65,5 %, 193818 71,6 -> 66,8 %; på trean 193040 29 -> 35 %. I övningen: 151659 98,9 -> 92,8, 171840 70,9 -> 75,3,
  200719 84,1 -> 91,8 (blandat: samma kod går åt båda håll på olika låtar).
- Varför (arenan takt, inte bevisat i detalj): taktmodellen (röster K/R/L + backbeat i analyserClock.ts) skiljer {1,3} från {2,4} bra
  via backbeat, men skiljer dåligt slag 1 från slag 3. När a6 flyttar fasen (stadigare, lite annan referens) hamnar särdragen på andra
  ställen i slaget, och 1-mot-3 tippar oftare fel.
- Domarens facit är Beat This. Det har takter med annat än 4 slag på många ställen; därför döms ettan bara i REN 4/4 (filhuvudet).
- Bänken är deterministisk (virtuell klocka): samma kod ger samma siffror.
- Pi:n har resurser: workern får bli ~4 gånger tyngre och en ANDRA worker är tillåten (ny fil `analyser*.ts`). Det trånga är MINNET
  (+15 MB) och HUVUDTRÅDEN (får inte bli tyngre). Orkestratorn mäter med `tools/arena/pibudget.py`; över gränsen = DISK.

## TIDIGARE ARENOR SOM KÄLLA (läs innan du bygger, det är ägarens önskan)

Idébankerna, med varje deltagares losning.md, diff och mått:
- `tools/natt/arena-2026-11-16-etta.md` + mappen `tools/natt/arena-2026-11-16-etta/` - ettan del 1. Vinnaren f0 ligger i basen
  (glidräkning per slag, relock utan ankarflytt, barOff bara ökar, kickåterstart, backbeat). Grundorsaken då: samma slag fick nytt nummer.
- `tools/natt/arena-2026-11-17-etta2.md` + `tools/natt/arena-2026-11-17-etta2/` - ettan del 2, ingen vinnare. Basgångens tonhöjd (a8)
  vann övningen men var ±0 i ren 4/4 på okänd musik; ackord, varaktighet, diskant, cymbal, tvåtakt föll.
- `tools/natt/arena-2026-11-18-takt.md` + `tools/natt/arena-2026-11-18-takt/` - takten. a6 = din bas (losning.md och diff där).
Ta gärna en del därifrån, men säg varifrån i losning.md, och mät den här: det som föll då föll oftast på okänd musik.

## Låsta regler (bryter du dem är du DISK, oavsett poäng)

1. Ändra BARA de tillåtna filerna (TILLATNA i ettdom.py: analysatorns filer + split.ts + slowWorker.ts; nya filer får heta analyser*.ts)
   i DIN KOPIA. effects.ts, effects/, beatClock.ts, beatFeed.ts, output.ts, index.ts, config och tools/ är förbjudna. En andra källa till
   tempo, klocka eller etta utanför analysatorn är förbjuden (en storhet, en källa).
2. Bara realtid: analysatorn får bara använda ljud som redan har hörts. Ingen framförhållning, inga filer, inget facit. Beat This,
   marks-*.json och beatthis.jsonl får ALDRIG läsas av motorns kod. Konstanter och mallar får inte skattas ur facit.
3. a6:s takt ska stå kvar (spärren takt: FEL högst bas + 2). beatLeadMs och motorns lead ändras inte (spärren lead). barOff får bara öka
   (ettan flyttas alltid framåt, så inget extra tick mitt i ett slag).
4. Din variant ska vara KODENS STANDARD i din kopia. Inga env-flaggor och inga opt-in-rattar.
5. Analysatorn delas med lotus. Ingen ny allokering per hop i heta loopar (GC-stallar). Ny FFT i snabba vägen kostar huvudtråden: förbjudet,
   lägg det i worker. Inga långa kommentarer i koden: notera i losning.md.
6. Rör aldrig engine/src, engine/dist eller något utanför `.arena/etta3/<ditt-id>/`. Läs inte andra deltagares mappar i .arena/etta3
   under runda 1 (idébankerna i tools/natt/ får du läsa). Inga git-kommandon som ändrar något. Inga länkar, junctions eller worktrees.
   Kör inga egna CPU-mätningar (pibudget, feedRealtid).

## Arbetsgång (exakt)

    cd C:\Users\richa\Desktop\Claude\dmx-control\pi-dmx\engine
    export PYTHONIOENCODING=utf-8
    1. cp -r .arena/etta3/bas/src .arena/etta3/<id>/src && cp .arena/etta3/bas/tsconfig.json .arena/etta3/<id>/   (första gången)
    2. ändra i .arena/etta3/<id>/src/<tillåten fil>
    3. python tools/arena/bygg.py .arena/etta3/<id>             -> BYGGT / BYGGFEL
    4. python tools/arena/etta3dom.py .arena/etta3/<id> --mat --namn m1    (andra gången --namn m2) -> etta3dom.json + etta3dom-m1.json
    5. python tools/arena/etta3dom.py .arena/etta3                -> rangordningen mot bas

Budget: högst 2 mätningar (steg 4). Utöver det högst 4 SONDER (`etta3dom.py .arena/etta3/<id> --sond <övningsfil>`: en fil, skriver
bara till <id>/sond/; `sond/kr-*.json` har 'ticks' och 'rows' (kolumnerna i 'columns') för egna analyser, `sond/etta3dom-sond.json`
har måtten). Mätning och sond går genom samma kö (en åt gången, ~2-6 min plus väntan). Kör med Bash, timeout 600000 ms; tar det
längre, kör i bakgrunden och vänta. Analys av json du redan har är fri, även basens i .arena/etta3/bas/ (ettdom/kr-*.json).
Facit för EGEN analys (aldrig i koden): beatthis.jsonl, bara för ÖVNINGENS filer (151659, 171840, 200719). Mellan- och kontrollmängden
får du varken spela, läsa facit för eller sondera.
Var misstänksam mot din egen övningsvinst: i de tre senaste ettarenorna föll den bästa på okänd musik. En del som bara lyfter en fil
är troligen anpassning. Musikteori (vad som brukar hända på ettan) håller bättre än tal som passar övningen.

## Leverans

Skriv `.arena/etta3/<id>/losning.md` (svenska, högst ~400 ord):
- IDÉN i två meningar: vad analysatorn nu gör annorlunda och varför ettan då hamnar på ettan i stället för trean.
- DELARNA: tabell del | vad den gör | vilket mått den bär (siffra ur din mätning) | ev. varifrån i idébanken. Jokern ska kunna lyfta ut en enskild del.
- KOSTNADEN: vad som körs i worker och vad i huvudtråden, ungefär hur mycket mer räkning per hop, och nytt minne (MB).
- DIFFEN: `git diff --no-index .arena/etta3/bas/src .arena/etta3/<id>/src` (hela, den ska kunna appliceras på basen).
- SIFFRORNA: din rad ur domaren per fil, och vad som blev sämre.
- RISKEN: var varianten kan fela i ladan (live-mic, låtbyten, breaks, musik utan trumma, udda takter).

Efter runda 1 bygger en JOKER ihop de bästa delarna från alla deltagare, även diskade. De bästa går vidare.
Svara sist med en rad: `KLAR <id> poäng <x> <DISK eller OK>`.
