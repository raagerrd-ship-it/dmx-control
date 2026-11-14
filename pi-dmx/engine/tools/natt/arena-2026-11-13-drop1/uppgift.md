# DMX-arena drop1 – drop eller minidrop: känn igen uppbyggnaden

Du är en av 8 deltagare. Alla har fått exakt den här uppgiften. Det enda som skiljer er åt är STRATEGIKORTET i din brief.
Domaren är BÄNKEN, inte en människa eller en modell: din variant av analysatorn byggs, spelar en inspelning från ladan och
poängsätts av `tools/arena/dropdom.py` mot ägarens egna markeringar. Läs domarens filhuvud – där står poängen och spärrarna exakt.
Läs också `tools/natt/grund-2026-11-13.md` (dagens mätning av hela systemet).

## Riggen och målet

Pi-DMX: 8 RGB-parlampor i en lada (partyljus), allt i realtid ur ljudet. Motor: TypeScript i
`C:\Users\richa\Desktop\Claude\dmx-control\pi-dmx\engine` (src/ -> dist/). Arkitekturen är låst: ANALYSATORN ger all information om
låten (tempo, sektion, drop, uppbyggnad), DIRIGENTEN väljer effekt, EFFEKTEN styr ljuset. Analysatorn analyserar bara – inget tal i
den får vara valt för hur ljuset ser ut, och varje storhet har EN källa.

Ägaren stod i ladan 2026-11-13 och tryckte på knappar medan musiken gick: Drop, Minidrop, Uppbyggnad, Låtbyte, Inte drop.
Hans ord, ordagrant:

> "Är det ingen uppbyggnad, så är det troligen bara minidrop."
> "mina minidrop kan vara på fler ställen än vad jag hinner markera"
> "ser du inget i ljudet så är det feltryck"
> "det är ju aldrig bra att först dämpa för att sedan i motorn förstärka igen"
> "lamporna blinkar fint idag. bara att jag tror det går trimma till"

Det sista är viktigt: dagens ljus är GODKÄNT. Uppgiften är att trimma analysatorns dom över drop och uppbyggnad, inte att bygga om.

## Vad som är känt (mätt 2026-11-13, båda inspelningarna)

- Motorn hittar TIDPUNKTEN (30 av 34 markerade händelser inom 0,5 s) men inte SORTEN: av ägarens 14 drop kallar den 1 för drop,
  12 för minidrop och missar 1. Av motorns egna 12 drop har 11 ingen markering, och vid ägarens "inte drop" hade den just skjutit en.
- ALLA ägarens drop har en uppbyggnad före (han tryckte Uppbyggnad 0,7–26 s före droppen), INGEN av hans minidrop har det.
- I själva ögonblicket skiljer inget drop från minidrop: basen (30–150 Hz) har varit borta ~1 s och kommer tillbaka med 15–50 dB i båda.
  Skillnaden ligger alltså i det som händer FÖRE, över flera sekunder.
- Analysatorns uppbyggnad är död: `frame.buildUp` max 0,00 och `frame.inRiser` 0 % av tiden. Gränserna är absoluta nivåer
  (`lvlSmooth > 0.3` / `> 0.4` i inRiser, `> 0.65` i inZone, analyser.ts ~rad 2055 och ~2760) och trimmades delvis på sönderklippt ljud.
  Rent ljud ger `frame.level` (= rms x förstärkning 1) median 0,16, p90 0,22, max 0,25. Domen är densamma vid ljudet x1, x2, x3.
- Minidrop-räknaren (`miniDropCount`) skjuter 30/min, en per taktslag i långa rader. Ljuset läser den inte och domaren dömer den inte –
  men `dropCount` läser ljuset: varje drop ger droplooken.
- Analysatorn är densamma i bänken som i ladan: varje drop live finns offline inom 0,1 s.
- Dropkoden: analyser.ts `dropStep` (~rad 2560–2760: bodyEnv/bodyCeil/bodyPeak, kandidat, `dropCount++`, `dropDemoted`, `dropSpaced`,
  MINI_*), spårning med `DMX_DROP_TRACE=1`. Äldre erfarenheter: tools/FACIT.md.

## Materialet

- ÖVNING (du får spela, mäta och titta fritt): `tools/ladan-2026-11-13/lang-20261113T160345.wav` (602 s) med
  `lang-20261113T160345.marks-fin.json` (ägarens markeringar finjusterade mot ljudet: `fineS` = händelsen i ljudet, `pressS` = knapptrycket,
  `skip: true` = feltryck, räknas inte) och `.events.json` (vad motorn gjorde live). 9 drop, 11 mini, 6 uppbyggnader, 4 "inte drop", 2 låtbyten.
- KONTROLL: en annan inspelning som bara orkestratorn kör i finalen. Du får varken spela, läsa eller lyssna på
  `lang-20261113T151659.*` eller `lang-20261113T171840.*`. Bryter du mot det är du DISK.
- Det finns bara 9 drop i övningen och 5 i kontrollen. En lösning som passar de nio tidpunkterna men inte har ett MUSIKALISKT skäl
  kommer att falla i finalen. Bygg en mekanism, inte en tabell: inga tidsstämplar, inga tal trimmade mot enstaka händelser.

## Låsta regler (bryts de är du DISK, oavsett poäng)

1. Ändra BARA `src/analyser.ts`, `src/split.ts`, `src/slowWorker.ts` i DIN KOPIA (kör sedan `python tools/analyser_shared.py --write
   <din-mapp>/src` om manifestet `ANALYSER_SHARED.md5` kontrolleras vid bygget). Klockan (`analyserClock.ts`), effekterna, dirigenten
   (`effects.ts`, `effects/*`), utgången, config och allt annat är förbjudet – domaren jämför filerna.
2. Ingen förstärkning av ljudet eller nivån som kompensation (inget gain, ingen ny AGC på aux). Nivågränser ska vara RELATIVA mot
   låtens egen nivå (analysatorn följer redan t.ex. `levelCeil`, `bodyCeil`).
3. Tempot får inte röras: samma tempo som bas i minst 97 % av sekunderna.
4. Droppen ska komma NÄR det händer: träffarnas tidsfel i median högst 0,5 s (i dag 0,31 s). Ingen väntan "för säkerhets skull".
5. Högst 2,0 drop per minut, och uppbyggnad utanför ägarens uppbyggnader högst 15 % av tiden.
6. Din variant ska vara KODENS STANDARD i din kopia: inga env-rattar i slutlösningen, konstanter med kommentar om varför.
7. Analysatorn körs på en Pi Zero 2 W: inga nya stora buffertar per hopp, inga allokeringar i den snabba vägen (375 hopp/s);
   tyngre räkning hör hemma i den långsamma vägen. Kostnaden per hopp får inte överstiga 1,5 x bas.
8. Rör aldrig engine/src, engine/dist eller något utanför `.arena/drop1/<ditt-id>/`. Läs inte andra deltagares mappar.
   Inga git-kommandon som ändrar något (ingen commit, stash, checkout, add). Inga länkar/junctions. Inga nätverksanrop.

## Arbetsgång (exakt)

    cd C:\Users\richa\Desktop\Claude\dmx-control\pi-dmx\engine
    export PYTHONIOENCODING=utf-8
    1. mkdir -p .arena/drop1/<id> && cp -r src .arena/drop1/<id>/src      (din kopia; första gången)
    2. ändra i .arena/drop1/<id>/src/analyser.ts (ev. split.ts, slowWorker.ts)
    3. python tools/arena/bygg.py .arena/drop1/<id>                        -> BYGGT / BYGGFEL
    4. python tools/arena/dropdom.py .arena/drop1/<id> --mat               -> skriver dropdom.json (kö: en mätning åt gången, ~30 s)
    5. python tools/arena/dropdom.py .arena/drop1                          -> rankingen mot bas

Budget: högst 2 domarmätningar (steg 4). Den första mäter idén rå, den andra lagar en spärr eller den största svagheten.
Spara varje mätning under eget namn direkt efteråt (`cp dropdom.json dropdom-m1.json`, sedan `-m2.json`) så ingen skrivs över.
Fria sonder (högst 6 körningar med din egen dist, bara på ÖVNINGEN): `node tools/natt/bygg-facit/dropMotFacit.mjs <övningsfilen>`
med `DMX_DIST=<din dist> NODE_OPTIONS=--import=file:///C:/Users/richa/Desktop/Claude/dmx-control/pi-dmx/engine/tools/arena/distHook.mjs`
(`DETALJ=1` visar varje händelse, `DMX_DROP_TRACE=1` analysatorns egna spårrader), eller egna små skript i din mapp.
Att läsa och räkna på ljudet självt (python med numpy/scipy/soundfile:
`C:\Users\richa\Desktop\Claude\lotus-light-link\tools\tempo-facit-pc\.venv\Scripts\python.exe`) är fritt – börja där: titta på vad
som faktiskt händer i ljudet före ägarens nio drop och före hans elva minidrop innan du skriver kod.

## Jokern och idébanken

När runda 1 är dömd bygger en joker ihop de delar som vann sina mått – även ur diskade lösningar. Skriv därför i din `losning.md`
vilken DEL av din ändring som bär vilket mått. Alla lösningar sparas i idébanken, även förlorarnas.

## Leverans

Skriv `.arena/drop1/<id>/losning.md` (svenska, högst ~450 ord):
- IDÉN i två meningar: vad analysatorn nu lyssnar efter och varför det skiljer drop från minidrop MUSIKALISKT.
- DELAR: en rad per del av ändringen och vilket mått den bär (drop_ratt, mini_ratt, inte_ratt, precision, bygg).
- DIFFEN: `git diff --no-index src .arena/drop1/<id>/src` (hela, den ska kunna appliceras).
- SIFFRORNA: din rad ur domaren för varje mätning, och vad som blev sämre.
- RISKEN: var mekanismen går fel på annan musik än övningens (lugna låtar, låtar utan bas, långa mixar, tal mellan låtar).
Svara sist med en rad: `KLAR <id> poäng <x> <DISK eller OK>`.
