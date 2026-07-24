Fyra små layout-poleringar för att lyfta gränssnittet till en mer enhetlig, uthyrningsvänlig look. Alla ändringar sker parallellt i React-mocken (`src/pages/DmxController.tsx`) och Pi-UI:et (`pi-dmx/engine/public/index.html`) — Pi-first-regeln gäller.

## 1. Dämpa AUX/Mikrofon-pillret

Idag har det aktiva alternativet ett tydligt rosa thumb + glow, medan Effekt-val/Avancerat är diskret glas. Sänk till samma nivå:

- Thumb-bakgrund: från `hot 6%` → `fg 4%` (neutral glas istället för rosa)
- Thumb-border: från `hot 30%` → `fg 12%` (matchar Avancerat)
- Behåller den lilla rosa punkten som "aktiv"-indikator (subtil signal räcker)

## 2. Ta bort "Läge" i tech-rutan

Ordet dupliceras redan under stämningsbaren. Behåll rutan som **2 kolumner**: BPM · Konfidens. Beskrivningstexten under (t.ex. "Pulsar på taktslag…") ligger kvar och bär läges-informationen.

## 3. AV / MAX istället för LVL 00 / LVL 10

Under stämningsbaren:
- Vänster: `AV`
- Höger: `MAX`
- Mitt: dynamiskt lägesnamn (oförändrat)

## 4. Diskret status-footer

Ny liten rad längst ner i huvudvyn (efter Avancerat), centrerad, `text-[10px]` muted:

```text
Ansluten · v1.4.0 · 4 lampor
```

Data hämtas från befintlig `usePi()`-state (connection, version, fixture count). På Pi-UI:et samma layout, samma källa (`cfg.version`, `fixtures.length`, WS-status).

## Teknisk detalj

- Filer som ändras: `src/pages/DmxController.tsx`, `pi-dmx/engine/public/index.html`
- Inga engine-, config- eller state-ändringar — rent presentation
- Version-strängen: läses från `cfg.version` om det finns, annars döljs den delen
- Fixture-count: `fixtures.length` (redan i state)