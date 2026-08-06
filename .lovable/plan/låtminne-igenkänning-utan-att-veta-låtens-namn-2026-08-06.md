# Låtminne — igenkänning utan att veta låtens namn

Motorn lär sig automatiskt varje låt som spelas via ett akustiskt fingeravtryck. Nästa gång samma inspelning spelas känns den igen inom några sekunder, och showen körs från minnet istället för att gissa i realtid: drops triggas exakt (till och med några hundra millisekunder *före*), BPM/taktankare låser direkt, och effekt/stämningskurvan blir samma som förra gången.

Ingen internetuppkoppling, ingen ACRCloud, ingen låttitel — bara "är det här samma ljud som spår #218?".

## Så fungerar det för användaren

1. Låt spelas första gången → motorn kör som idag (realtidsdetektor) och spelar tyst in ett fingeravtryck plus en tidslinje.
2. Samma låt igen → efter ~3-5 sekunder står det "Känd låt" i UI:t, och lamporna följer den inlärda showen.
3. Andra remix/liveversion räknas som ny låt (annat ljud = annat fingeravtryck) — den lärs in separat.
4. Minnet rymmer ~500 låtar; äldst och minst spelade rensas bort när det blir fullt.

## Teknik

### Fingeravtryck (nytt: `pi-dmx/engine/src/fingerprint.ts`)
- Återanvänder analysatorns befintliga FFT-magnitud (1024 samples, hop 128) — ingen extra FFT, ingen extra CPU-kostnad för transformen.
- Per ~85 ms-ruta: plocka spektraltoppar i 6 log-spridda band, para toppar inom ett måltidsfönster (0.2–2.0 s) → 32-bitars hash `(f1, f2, Δt)` + tidsstämpel.
- Målsatt täthet ~4 hashar/s → ~1 200 hashar per 5-minuterslåt.

### Matchning
- Invers hash-index i minnet: `hash → [(songId, offsetMs)]`.
- Röstning på `offset = tid_i_låt − nu`: när en offset-bucket får tillräckligt många röster (och tydlig marginal mot näst bästa) räknas låten som igenkänd — och vi vet samtidigt **var i låten** vi är. Det är den positionen hela replayen bygger på.
- Fortlöpande omröstning i bakgrunden → hoppar man i låten eller byter spår följer matchningen med, och tappad match faller tillbaka till realtidsläget.

### Lagring (nytt: `pi-dmx/engine/src/songMemory.ts`)
- En binär fil under motorns datakatalog (`/var/lib/audio-dmx-engine/songs.bin`) + ett litet index. Uppskattning: ~500 låtar × 1 200 hashar × 8 byte ≈ 5 MB — ryms lätt, och hash-indexet byggs i RAM vid start (~600 k poster, några MB).
- Ligger utanför `config.json` så inlärningen inte sliter på SD-kortet vid varje inställningsändring; skrivs när en låt är färdiginspelad.
- Överlever uppdateringar (samma regel som övrig persistens); täcks av befintlig export/import som valfri bilaga.

### Tidslinje per låt
Sparas som en gles lista med händelser i låttid:
- `drop` (ms) med styrka — vid replay pre-fire ~120 ms före för att kompensera lampornas svarstid.
- `bpm` + taktfas → beat-klockan ankras direkt vid igenkänning istället för att låsa in sig under 10-20 s.
- `intensity`/effekt-spår i grov upplösning (~1 s) → samma dramaturgi som förra gången.
- Tidslinjen förbättras varje gång låten spelas (drops som bekräftas av båda körningarna vinner; enstaka falska rensas bort).

### Motorintegration
- `analyser.ts`: exponera spektralramen till fingerprint-modulen (ingen ändrad detektionslogik).
- `effects.ts` / `index.ts`: när en låt är igenkänd får replay-spåret prioritet över realtidsdrops; realtidsdetektorn körs vidare parallellt som fallback och som inlärning.
- Nytt `songMemory`-block i WS-state: `{ known: bool, plays: n, confidence, positionMs }`.
- CPU-budget på Pi Zero 2W: toppdetektion + hashning i steget som redan körs, matchningsröstningen körs var ~250 ms på ett litet fönster. Mål < 3 % extra CPU; mätning ingår i arbetet och tätheten sänks om det inte håller.

## UI

- `src/pages/DmxController.tsx` (mocken, som jag äger): rad i Teknisk info — "Låtminne: Känd låt (3:e gången)" / "Lär in…" / "—", plus antal lärda låtar och en knapp för att glömma minnet.
- Samma ändring levereras som diff/beskrivning för `pi-dmx/engine/public/index.html`, som din Pi-agent äger.

## Ordning

1. `fingerprint.ts` + enhetstest mot en inspelad fil via `tools/replay.mjs` → verifiera: samma fil matchar sig själv, två olika låtar matchar inte.
2. `songMemory.ts` (lagring + index + rensning) → verifiera: 500 låtar laddas vid start under 1 s.
3. Tidslinje-inspelning och replay i motorn → verifiera: andra genomspelningen triggar drops på samma sekunder som första.
4. CPU-mätning på Pi → verifiera: inga ALSA-överskridningar, analystiden kvar under budget.
5. UI-rad i mocken + diff för Pi-filen.
