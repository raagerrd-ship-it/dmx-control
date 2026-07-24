## Problem

Motorn och servern har fullt stöd för att styra WS2812-ringens tre parametrar (`maxBright`, `pulseBoost`, `blackoutFadeMs`) via WS-meddelandet `setRing`, men UI-kontrollerna för dem finns inte i `pi-dmx/engine/public/index.html`. Det gör att inställningarna bara kan ändras genom att handredigera `config.json` — vilket motsäger tidigare beslut att alla ägarinställningar ska ligga under `/setup`.

## Åtgärd

Lägg till ett "LED-ring"-kort i `#ownerOnly`-sektionen i `pi-dmx/engine/public/index.html`, ovanför eller under System-kortet, med tre sliders:

- **Max ljusstyrka** — 5–100 % (skickar `maxBright` 0.05–1.0)
- **Pulse-boost** — 0–50 % (skickar `pulseBoost` 0–0.5)
- **Blackout-fade** — 0–3000 ms (skickar `blackoutFadeMs`)

Kortet visas bara om `cfg.intensityRing` finns i senast mottagna config (annars är hårdvaran inte konfigurerad → dölj för att inte förvirra). Värden läses från `cfg.intensityRing` i `onConfig`-callbacken; skrivningar skickas som `{ type: "setRing", ring: { ... } }` med debounce ~150 ms medan användaren drar. Live-värde visas som `%`/`ms` bredvid slidern (samma pattern som kalibreringssliders).

Ingen ändring i motor/server/`config.ts` — hela kedjan finns redan.

## Teknisk detalj

- Ny DOM-block placeras kring rad 340 i `pi-dmx/engine/public/index.html` (inuti `#ownerOnly`, före System-kortet).
- JS-block läggs in i den befintliga config-mottagaren där andra ägarkontroller synkas.
- Använder samma `send({ type, ... })`-helper som resten av UI:t.
- Ringen renderar redan om vid `onConfigChanged` → ingen extra broadcast behövs; inställningen syns direkt fysiskt.

## Utanför scope

- Mock-UI:t (`src/pages/DmxController.tsx`) — ringinställningar är hårdvaruspecifika för lådan och hör inte hemma i hyresgäst-mocken. Kan speglas separat om du vill senare.
