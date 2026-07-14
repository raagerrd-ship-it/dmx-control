
## Mål

Preview i Lovable ska se ut och kännas som Pi:ns riktiga UI (`pi-dmx/engine/public/index.html`). Pi behåller sin vanilla-HTML som sanning; React-appen blir en visuell spegel driven av samma mock som idag.

## Vad som ändras

**Behålls:** `pi-dmx/engine/public/index.html` (oförändrad), `useMockLive`, `useDmx`-store (data-layer).

**Skrivs om (src/):**
- `src/pages/DmxController.tsx` — ny sektionsordning som matchar Pi.
- `src/index.css` — CSS-variabler + typografi ska matcha Pi (`--bg #0a0a0f`, `--card #15151f`, `--line #252535`, `--hot #ff3a6b`, system-font-stack, uppercase 13px h1 med `letter-spacing:.12em`).
- Nya komponenter (samma visuella språk som Pi):
  - `ShowCard` — "Energi styr läget"-toggle, dwell-segment (Sällan/Normal/Ofta), "Pulsa på taktslag".
  - `LevelCard` — level-meter + kick-dot + gain + AUX/Mic-knappar.
  - `RotationList` — tre kort: Lugna effekter / Effekter med fart / Effekter med full fart, med raderna, beskrivning, "● SPELAS"-badge.
  - `EffectsCard` — Drop-blixt segment (Av/Låg/Normal/Hög).
  - `SettingsCard` — Reaktion/Dynamik/Ljusstyrka segment.
  - `OwnerBanner` + befintlig `FixtureSetup` visuellt uppdaterad till Pi-stil, `SystemCard`, `WifiCard` (owner-mode via `/setup` i URL:en).

**Tas bort från preview:** `BpmDisplay`, `HueColorCard` (mono/comet/split UI), `PresetGrid` (grid-view), `LiveControls`, tab-navigationen `Live/Fixtures`. Datat i store:t behålls; bara UI-ytor försvinner.

**Mock utökas:** `useMockLive` genererar redan level/kick/mode-cykling — utökas med tre kategorilistor + rotation-toggles + dwell/energy-simulering så alla nya kort har liv.

## Sektioner i ny ordning

1. Show
2. Level
3. Lugna effekter
4. Effekter med fart
5. Effekter med full fart
6. Effekter (drop)
7. Inställningar
8. Owner-only (om URL innehåller `/setup`): Fixtures, System, WiFi

## Tekniskt

- Byter Inter/Space Grotesk → samma system-font-stack som Pi (`-apple-system, system-ui`) för pixel-parity. Tailwind-tokens uppdateras via `index.css` — inga `bg-[#...]` i komponenter.
- Owner-mode: `useLocation().pathname.includes("setup")` eller hash.
- `LivePreview` behålls som liten debugvy men flyttas till `/setup`.

## Ur scope

- Pi:ns HTML rörs inte.
- Ingen WebSocket-klient i React (den befintliga `usePiLive` behålls; den gör inget i preview eftersom Pi inte finns där).
- Ingen unifiering av kod mellan Pi och React — det var alternativen 1 och 2 som du valde bort.
