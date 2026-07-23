## Mål

Rensa default-vyn för hyresgäster så bara det som spelar roll för dem syns. Tekniska värden (BPM, konfidens, auto-gain) flyttas till ägarläge. Ägarläge är oförändrat i funktion.

## Ändringar

**1. Slå ihop "Ljudkälla" in i "Ljudnivå"**

Ta bort separat h1 + kort för AUX/Mic. Lägg AUX/Mic-knapparna som första rad inuti Ljudnivå-kortet, ovanför nivå-metern. H1 döps om till "Ljud".

**2. Förenkla Ljudnivå för hyresgäst**

Behåll, kanske snygga till, så det är tydligt bara

**3. Tydligare stämnings-etikett**

Under slidern: ersätt "Fest · 5/10" med en kortare beskrivning av vad läget faktiskt gör vid det värdet. Mappning (baseras på `deriveFeel`-bucket + intensity):

- 1–2 · **Chill** — "Mjukt, långsamt, följer inte taktslag"
- 3–4 · **Chill+** — "Följer musiken lugnt"
- 5–6 · **Fest** — "Pulsar på taktslag, byter effekt ibland"
- 7–8 · **Fest+** — "Klubb-läge, byter oftare"
- 9–10 · **Galet** — "Full fart, drop-blackout, riser-strobe"

Siffran `x/10` blir liten tabular-nums till höger istället för dominant.

## Filer

**Pi (källa till sanning):**

- `pi-dmx/engine/public/index.html` — flytta AUX/Mic-knappar in i Ljudnivå-kortet, ta bort separat Ljudkälla-block, wrappa BPM/beat/konfidens/auto-gain-raderna i `#ownerOnly`-container (eller flytta dem in i ägar-sektionen som nytt "Diagnostik"-kort), uppdatera stämnings-etikett-JSX + JS-mapping.

**Mock (spegel):**

- `src/pages/DmxController.tsx` — samma tre ändringar i `AudioSourceCard` (tas bort), `AudioMeterCard` (skalas ner till nivå + kick), `OwnerSections` (får Diagnostik-kort), `MoodSlider` (ny etikett-mapping).

## Ur scope

- Slidern behålls 1–10 (fysiska vredet mappar hit); Power-kortet rörs inte.
- "Avancerat · spegel av stämningen" ligger kvar för alla (du valde inte att gömma det).
- Effekt-val oförändrat.
- Ingen ändring av engine, BPM-detektor eller mock-data.