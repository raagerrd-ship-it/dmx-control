# DMX-arena <körning> – effekternas puls ska följa basgången

Du är en av 8 deltagare. Alla har fått exakt den här uppgiften. Det enda som skiljer er åt är STRATEGIKORTET längst ner i din brief.
Domaren är BÄNKEN, inte en människa eller en modell: din variant byggs, körs genom riggens riktiga analysator och effektmotor mot
inspelningar och poängsätts av `tools/arena/domare.py`. Läs domarens filhuvud – där står poängen och spärrarna exakt.

## Riggen och målet

Pi-DMX: 4 RGB-parlampor i en lada (partyljus), allt i realtid ur ljudet. Motor: TypeScript i
`C:\Users\richa\Desktop\Claude\dmx-control\pi-dmx\engine` (src/ -> dist/). Ägarens önskemål, ordagrant:

> "takten som syns i lamporna, kan man få den att följa själva basrytmen bättre"
> "Målet är ju inte mer ljus överlag. Utan att takten syns bättre, då borde ju nästan mindre ljus i snitt vara bättre.
>  Om basgång (det man dansar till) skall 'kännas' i ögonen"

## Vad som är känt (mätt i dag, 2026-11-07)

- När takten är låst får effekterna sin puls (`ctx.heartPulse`, `ctx.beatPulse`, `ctx.kickEnv`, används via `c.heart(depth)`,
  `c.beatPulse`, `c.kickEnv` i effektfilerna) ur RUTNÄTET (`beatFrac`), och punchens per-slag-del stängs av (`punchLocked`).
  Basgången själv når alltså aldrig effekternas puls – bara energilagret (som bara dämpar). Se src/effects.ts ca rad 1700–1810
  och 1980–2050 (kommentaren vid rad ~210 beskriver provratten DMX_FX_BASS).
- Energilagret `md` följer basen med r 0,69–0,83 i taktskalan, men riggens ljus följer md bara med r 0,35–0,54: effektens eget
  mönster står för det mesta av ljusets rörelse. Taket sitter i effekterna.
- Referensen att slå (provratt, ligger redan i koden): `DMX_FX_BASS=1 DMX_FX_BASS_PUNCH=0.5` blandar in basens kropp (eBass^2) i
  pulsen. Den höjer rA lang1021 kraftigt men sänker lampspridningen (pop −8 %), dvs. fler lampor lika tända. Den står i
  rankingen som `ref`. Din variant ska vara bättre än den – helst samma takt-vinst UTAN att lampspridningen faller.
- Bandsvep: bara subbandet 20–60 Hz (≈ lågpass 60 Hz) var sämst; kickbandet 60–120 Hz bäst.

## Låsta regler (bryts de är du DISK, oavsett poäng)

1. Ändra BARA `src/effects.ts` och `src/effects/*.ts` i DIN KOPIA. Analysatorn (analyser.ts, split.ts, slowWorker.ts,
   tempoTracker.ts, recorder/), utgången/kalibreringen (output.ts), uttoningen (DMX_FADE_MIN_S), tempot/beatFeed och config är
   förbjudna – domaren jämför filerna.
2. Snabbare fade-down är förbjudet: rör inte uttoningen per lampa eller minsta på-tid. Tajthet jobbas bara på UPPGÅNGEN.
3. Strobe: högst 3 blixtar/s. Rör inte strobekanalen.
4. Inget får dra mot vitt eller lyfta en färgkanal efter effektsteget.
5. Din variant ska vara KODENS STANDARD i din kopia (ingen env-flagga behövs för att den ska vara på).
6. Rör aldrig engine/src, engine/dist eller något utanför `.arena/<körning>/<ditt-id>/`. Läs inte andra deltagares mappar.
   Inga git-kommandon som ändrar något (ingen commit, stash, checkout, add). Inga länkar/junctions.

## Arbetsgång (exakt)

    cd C:\Users\richa\Desktop\Claude\dmx-control\pi-dmx\engine
    set PYTHONIOENCODING=utf-8                (i bash: export PYTHONIOENCODING=utf-8)
    1. cp -r src .arena/<körning>/<id>/src        (din kopia; första gången)
    2. ändra i .arena/<körning>/<id>/src/effects.ts och/eller .arena/<körning>/<id>/src/effects/*.ts
    3. python tools/arena/bygg.py .arena/<körning>/<id>          -> BYGGT / BYGGFEL
    4. python tools/arena/bank.py .arena/<körning>/<id>          -> skriver bank.json (kö: en bänk åt gången, ~10 min + väntan)
    5. python tools/arena/domare.py .arena/<körning>             -> rankingen mot bas och ref

Budget: högst 4 bänkningar (steg 4). Egna körningar av rytm.py, konsertReplay.mjs eller dynSet.py på en NY variant räknas mot budgeten, lika för alla, och de går också genom kön. Analys av en trace du redan har (--trace-in) är fri. Bänken är deterministisk (virtuell klocka): samma kod = samma siffror. Skillnader ≥ 0,01 i rA
är verkliga. Du får gärna bygga egna små mätskript i `.arena/<körning>/<id>/` (t.ex. `node`-skript som läser tracen), men domarens
siffror avgör. Bänken körs med Bash-verktyget med timeout 600000 ms; tar den längre, kör den i bakgrunden och vänta på den.

## Leverans

Skriv `.arena/<körning>/<id>/losning.md` (svenska, högst ~400 ord):
- IDÉN i två meningar: vad pulsen nu följer och varför det syns bättre i ögat.
- DIFFEN: `git diff --no-index src .arena/<körning>/<id>/src` (klistra in hela, den ska kunna appliceras).
- SIFFRORNA: din rad ur domaren, och vad som blev sämre.
- RISKEN: var din variant kan se sämre ut i ladan än bänken visar (bänken kan inte mäta upplevd ljusstyrka).
Svara sist med en rad: `KLAR <id> poäng <x> <DISK eller OK>`.
