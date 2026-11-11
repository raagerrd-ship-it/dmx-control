# DMX-arena basenergi – analysatorn ska mäta basenergin, effekten ska styra ljuset

Du är en av 4 deltagare. Alla har fått exakt den här uppgiften. Det enda som skiljer er åt är STRATEGIKORTET längst ner i din brief.
Domaren är BÄNKEN, inte en människa eller en modell: din variant byggs, körs genom riggens riktiga analysator och effektmotor mot
inspelningar och poängsätts av `tools/arena/domare.py`. Läs domarens filhuvud – där står poängen och spärrarna exakt – och filhuvudet i
`tools/arena/basenergi.mjs` (analysmåttet på ditt fält).

## Riggen och målet

Pi-DMX: 4 RGB-parlampor i en lada (partyljus), allt i realtid ur ljudet. Motor: TypeScript i
`C:\Users\richa\Desktop\Claude\dmx-control\pi-dmx\engine` (src/ -> dist/). Samma analysator (byte-identiska filer analyser.ts, split.ts,
slowWorker.ts, analyserClock.ts) kör också i "lotus" (en LED-remsa som stämningsljus, mic i stället för linje in). Ägarens ord, ordagrant:

> "mitt önskemål var att köra en analysator, för att på bästa sätt analysera låten (långsamt och snabbt). Den skall inte styra ljuset
>  enbart analysera. Sen skall effekten styra ljuset."
> "De kanske kan komma med bästa lösningen för Basenergin. Kolla de vi har idag, både i analysatorn samt de två egna. Men sen behöver
>  dom inte begränsas där."
> "analysatorn skall ju enbart analysera inte styra hur lamporna lyser. Så att öka något 8 sekunder osv hör inte hemma i en
>  analysator. Det får ju kanske vara en effekt som heter drop eller liknande"

UPPGIFTEN: ge analysatorn ETT fält, `frame.bassEnergy` (0..1, varje hop), som är den bästa MÄTNINGEN av basenergin – det ljusets nivå
följer – och låt effektsidan läsa det i stället för att mäta musiken själv. Du får lägga till fler fält om din idé behöver dem.

## Vad som finns i dag (läs koden, siffrorna är mätta/lästa 2026-11-11)

I ANALYSATORN (ramen, `src/analyser.ts` interface Frame ca rad 130–240): `specAbs` (band i absolut amplitud: sub, kick, bass ...),
`bodyDb` (baskroppen i rå dB), `energy` (basbandets energi 0..1), `level`/`levelVU`, `intensity` (sektionsenergi mot låtens eget snitt),
`levelVsHighDb` (dB mot senaste refrängen), `onset.*` (anslag per band), `kick`/`kickAtMs`/`kickRise`, `drum.kick`, `silent`,
`section`/`sectionTier`, `dropCount`/`dropDemoted`/`dropSpaced`, klockan (`bpm`, `bpmConfidence`, `beatTrust`, `beatPhaseMs`).

DMX EGEN MÄTNING (det som ska bort ur effektsidan): `src/effects.ts` `stepEnergy` (ca rad 1312–1355). Basenergin `eBass` = sub+kick i dB
(vikt 0,25/0,75) i ett FÖLJANDE FÖNSTER: toppen `bHi` följer direkt upp och 10 s ner, dalen `bLo` direkt ner och 0,25 s upp, minst 6 dB
spann, topp 0,95, släpp 100 ms; tystnad flyttar inte fönstret. Lampornas nivå: `md = drive * max(eBass^3, lift)` (rad ~1352). eBass går
också till effekterna som `ctx.bassBody` (rad ~1976) och till lampspridningen. Fönstret stegas med RENDERNS dt (200 Hz + kick-bypass).
HOPKOPPLINGEN MED DROPEN: i 8 s efter en drop (+3 s fall; `DROP_LIFT_MS`, `dropLiftUntil` i `stepDrop` rad ~1521–1550, hålls i refrängen,
ångras av efterkontrollen) byter fönstrets topp från 10 s till 1 s (`PD_WIN_S`, godkänt i ladan 11-07: "energin efter drop dör fort" ->
"känns bra nu"). Det är alltså effektsidans dropläge som i dag styr mätningen. Samma funktion räknar ett volymfönster (`eHi/eLo/eSm`) som
bara dropens efterkontroll läser.

LOTUS EGNA MÄTNINGAR (läs, skriv aldrig: `C:\Users\richa\Desktop\Claude\lotus-light-link\pi\src`):
- `bassBody.ts` `BassBodyWindow`: lotus port av DMX-fönstret (topp upp direkt/10 s ner, dal ner direkt/1 s upp, kurva). Ej i drift.
- `piEngine.ts` dB-fönstret (ca rad 3030–3090, `_wlevelSm`, `_wdbSlow`): nivå = mid/hög + lite bas i dB mot ett LÅNGSAMT ankare (60 s ner,
  180 s upp, 6 s snabbläge), fönster 6–10 dB under ankaret. Mäter ljudstyrkan över minuter, inte bastrycket per slag. I drift.

MÄTT I DAG: ljuset följer basen med rA 0,33 (lang1021), rK 0,27, slagK 0,42, t90 20 ms (domarens bas). Tidigare mätning (11-07):
energilagret md följer basen med r 0,69–0,83 i taktskalan. Dagens DMX-fönster räknat per hop i sonden (`basenergi.mjs`, lang1021 180 s):
gainDiff 0,014, slagDjup 0,36, p05/p50/p95 0,22/0,56/0,99, tyst 0,01 – det är referensen för analysmåttet.

## Kraven (bryts de är du DISK, oavsett poäng)

1. ANALYSATORN MÄTER, EFFEKTEN STYR. I analysatorn får det inte finnas något som finns till för ljusets skull: inga tidsfönster som
   startas av en drop för att "lyfta" eller "hålla" något i N sekunder, ingen kurva/gamma för lampor, inget som vet vad en lampa är.
   En mätning som anpassar sig för att MUSIKEN ändrats (nivåstatistiken skiftar, tempot ger tidsskalan, sektionen byter) är analys och
   tillåten. Orkestratorn granskar vinnarens kod mot detta i finalen.
2. EFFEKTSIDAN MÄTER INTE MUSIKEN. Fönstret `bHi/bLo/eBass` ska bort ur `effects.ts`; nivån (`md`), `ctx.bassBody` och lampspridningen
   läser `frame.bassEnergy` (och ev. dina andra fält). Det som ska hända EFTER EN DROP (i dag: 8 s lyft + snabbt fönster) löser du på
   effektsidan – som ett dropläge/en dropeffekt som formar ljuset ur analysatorns fält (t.ex. egen förstärkning, eget golv, annan kurva
   medan droppen bär). Dropens lyft (`lift`, `dropEnv`, `DROP_LIFT_MS`) är ljusstyrning och får vara kvar på effektsidan.
3. FÄLTET: `frame.bassEnergy` ska finnas i `Frame` (analyser.ts), vara ett ändligt tal 0..1 varje hop och sättas i båda vägarna
   (odelad och delad analysator; fältet räknas i den SNABBA vägen – ljuset behöver det direkt, ingen fördröjning via workern om du
   inte kan visa att den inte kostar latens). Inga nya objekt per hop.
4. NIVÅOBEROENDE: `node tools/arena/basenergi.mjs .arena/basenergi/<id>` (≈ 20 s, inget lås, räknas inte mot budgeten) ska ge
   `finns: true`, `gainDiff <= 0,05` (fältet vid insignal x1 mot x0,25) och `falt` = basens (`.arena/basenergi/bas/basenergi.json`):
   du lägger till fält, du ändrar inga befintliga ramfält. Domaren läser `<id>/basenergi.json` – saknas den är du DISK.
5. Tillåtna filer i DIN KOPIA: `src/effects.ts`, `src/effects/*.ts`, `src/analyser.ts`, `src/split.ts`, `src/slowWorker.ts`,
   `src/analyserClock.ts`. Allt annat (output.ts, config, index.ts, beatFeed, profilen, tools/) är förbjudet – domaren jämför filerna.
6. Snabbare fade-down är förbjudet: rör inte uttoningen per lampa eller minsta på-tid. Strobe högst 3 blixtar/s. Inget får dra mot
   vitt eller lyfta en färgkanal efter effektsteget.
7. Din variant ska vara KODENS STANDARD i din kopia (ingen env-flagga). Ersätt, lägg inte till lager: den gamla mätningen tas bort.
8. Rör aldrig engine/src, engine/dist, lotus-light-link eller något utanför `.arena/basenergi/<ditt-id>/`. Läs inte andra deltagares
   mappar. Inga git-kommandon som ändrar något (ingen commit, stash, checkout, add). Inga länkar/junctions.

## Vad som avgör

Domaren v3 (ljuset mot musiken: dynamik 45 %, koreografi 35 % = jitter + betoning, takt 20 %, spärrar för lampspridning, släckt rigg,
fladder, t90) mot `bas` = dagens kod. En ren flytt som ger samma ljus som i dag hamnar på ±0 och är ett godkänt resultat – men målet är
en BÄTTRE mätning: slaget syns tydligare, stora slag stora och små slag små, samma ställe varje slag, utan mer ljus i snitt. Finalen
döms på en kontrollmängd som du aldrig får bänka mot.

## Arbetsgång (exakt)

    cd C:\Users\richa\Desktop\Claude\dmx-control\pi-dmx\engine
    export PYTHONIOENCODING=utf-8
    1. cp -r src .arena/basenergi/<id>/src                         (din kopia; första gången)
    2. ändra i .arena/basenergi/<id>/src/ (bara de tillåtna filerna)
    3. python tools/arena/bygg.py .arena/basenergi/<id>            -> BYGGT / BYGGFEL
    4. node tools/arena/basenergi.mjs .arena/basenergi/<id>        -> basenergi.json (fritt, ~20 s; kör efter varje bygge)
    5. python tools/arena/bank.py .arena/basenergi/<id>            -> bank.json (kö: en bänk åt gången, ~3 min + väntan)
    6. python tools/arena/domare.py .arena/basenergi               -> rankingen mot bas

Budget: högst 4 bänkningar (steg 5). Egna körningar av rytm.py, konsertReplay.mjs eller dynSet.py på en NY variant räknas mot budgeten
och går genom kön. `basenergi.mjs` och analys av en trace du redan har är fria. Bänken är deterministisk (virtuell klocka): samma kod =
samma siffror. Grep-verktyget fungerar inte på den här maskinen (rg saknas) – använd Bash med grep/sed. Kör bänken med Bash-verktyget med
timeout 600000 ms; tar den längre, kör den i bakgrunden och vänta på den. Kontrollmängden (tools/ladan-2026-10-28, -10-14, -10-11) får
du ALDRIG köra mot.

## Leverans

Skriv `.arena/basenergi/<id>/losning.md` (svenska, högst ~500 ord):
- IDÉN i två meningar: vad `frame.bassEnergy` mäter och varför det är en bättre mätning.
- VAR SNITTET GÅR: vad som nu ligger i analysatorn, vad som ligger på effektsidan, och hur läget efter en drop löses utan att
  analysatorn känner till ljuset.
- DIFFEN: `git diff --no-index src .arena/basenergi/<id>/src` (klistra in hela, den ska kunna appliceras).
- SIFFRORNA: din rad ur domaren, raden ur basenergi.json, och vad som blev sämre.
- LOTUS: en mening om hur lotus (mic, en remsa, klockstyrd puls) kan läsa fältet.
- RISKEN: var din variant kan se sämre ut i ladan än bänken visar.
Svara sist med en rad: `KLAR <id> poäng <x> <DISK eller OK>`.
