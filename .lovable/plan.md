# Live Analysis (Essentia.js) — separat läge parallellt med SmartSync

## Mål

Ny panel i mobil-UI:t som lyssnar via telefonens mikrofon, kör Essentia.js lokalt (WASM) och streamar events till Pi:n i realtid. SmartSync-panelen lämnas orörd — båda kan vara på samtidigt.

## Vad Essentia.js ger oss

1. **BPM-lock** (`RhythmExtractor2013`) → stabil beat-grid, beat-anchor skickas till Pi så beat-drivna effekter (pulse, chase) ligger exakt i fas.
2. **Drop-lookahead** — 500 ms audio-buffer, spectral flux + energy-rise-detektion. När drop detekteras skickas `flash`-event med `atMs = now + 200ms` så vitpulsen hinner före Pi:ns audio-in.
3. **Key + mode (dur/moll)** (`KeyExtractor`) → färg-hint: dur = varm palett, moll = kall.
4. **Danceability + energy** (`Danceability`, `Energy`) → auto-val av preset (låg energy = breathe/mono, hög = split/chase).
5. **Build-up detection** — glidande fönster på spectral centroid + energy; stigande trend = "build" → förbereder drop-flash.

## Prioritet i engine när båda är på

```
1. Essentia drop-flash        (kort override, ~200 ms vit puls)
2. SmartSync section/hue      (låt-nivå färg/preset)
3. Vanlig mode/preset         (default)
```

Ingen konflikt: Essentia skickar bara *events* (`beat`, `flash`, `hue-hint`), aldrig mode-lås. SmartSync ändrar `cfg.mode` som vanligt.

## Arkitektur

```text
Mobil (browser)
  Mic (getUserMedia) 
    → AudioWorklet (128-sample hop @ 48kHz)
      → RingBuffer (2s lookahead)
        → Essentia.js WASM
          → BPM / beat / drop / key / energy
            → WS /live-analysis → Pi engine
                                    ↓
                          cfg.beat (BPM anchor)
                          cfg.flashUntil (drop)
                          cfg.liveHueHint (key-based)
```

## Filer som skapas / ändras

**Nya:**
- `public/wasm/essentia-wasm.web.wasm` — WASM-binären (kopieras från npm-paketet `essentia.js` vid install)
- `src/lib/essentia/loader.ts` — laddar WASM + skapar Essentia-instans
- `src/lib/essentia/analyser.ts` — AudioWorklet-glue + ring buffer + feature-extraction-loop
- `src/hooks/useLiveAnalysis.ts` — React hook: mic on/off, state (BPM, energy, key, senaste event)
- `src/store/liveAnalysis.ts` — zustand store (enabled, status, bpm, key, energy, lastFlashMs)
- `src/components/LiveAnalysisPanel.tsx` — UI-panel (toggle, status, BPM-display, "sensitivity"-slider)
- `pi-dmx/engine/src/liveAnalysis.ts` — WS-handler på Pi:n, applyar events på cfg

**Ändras:**
- `src/pages/DmxController.tsx` — lägger in `<LiveAnalysisPanel />` under `<SmartSyncPanel />`
- `pi-dmx/engine/src/server.ts` — nytt WS-endpoint `/ws/live-analysis`
- `pi-dmx/engine/src/config.ts` — lägger till `liveHueHint?: { hue: number; atMs: number }` (valfri; overrides bara ~2s)
- `pi-dmx/engine/src/effects.ts` — respekterar `liveHueHint` om nyare än 2s

## UI-panel (mobilen)

```
┌─ Live Analysis ─────────────────────┐
│  [OFF/ON]           status: locked  │
│  BPM: 128           Key: A minor    │
│  Energy: ▓▓▓▓▓▓░░░░ 0.62            │
│  Last drop: 1.2s ago                │
│                                     │
│  Sensitivity: ●───────  0.6         │
│  □ Send beats  □ Send drops         │
│  □ Send hue hints                   │
└─────────────────────────────────────┘
```

Tre separata toggles så användaren kan välja: bara BPM-lock, bara drops, eller allt.

## Steg-för-steg

1. `bun add essentia.js` — kopiera WASM till `public/wasm/`.
2. AudioWorklet + ring buffer — 2s lookahead, 128-sample hop.
3. Essentia-loop i main thread: läs senaste 2048 samples var 100 ms, kör BPM/energy/key.
4. Drop-detektor: spectral flux över 43-frame fönster (≈1s), threshold justerbar via sensitivity-slider. När trigger → `postMessage({type:'flash', atMs: now + 200})`.
5. WS-klient batchar events, skickar var 50 ms (eller direkt vid flash).
6. Pi:s `/ws/live-analysis`-handler: `beat` → sätter `cfg.beat = {anchorMs, bpm}`; `flash` → `cfg.flashUntil = event.atMs + 250`; `hue` → `cfg.liveHueHint = {hue, atMs: now}`.
7. `effects.ts`: om `liveHueHint` yngre än 2s, blenda in dess hue i comet/mono/split.

## Tekniska noter

- **WASM-storlek**: Essentia.js är ~2 MB. Lazy-loadas bara när panelen slås på.
- **iOS Safari**: kräver `AudioContext` startad från user gesture. Toggle-knappen räcker.
- **Batteri**: mic + WASM drar ~5 %/h. Auto-stopp efter 15 min inaktivitet (om Pi WS är död).
- **Latens end-to-end**: mic → analys → WS → Pi engine ≈ 30-50 ms. Drop-lookahead på 200 ms täcker det med marginal.
- **Ingen internet** krävs — allt lokalt. Fungerar på pi-dmx AP:n även utan mobildata.

## Vad som INTE ändras

- SmartSync-panel, ACRCloud-flöde, Spotify-edge-function: oförändrade.
- Befintliga presets (drops, party, chase, wave, cycle, mono): oförändrade.
- Pi engine mode-cykling, rotation-toggle: oförändrade.

## Vad som blir kvar att göra sen (om vi vill)

- Sections (verse/chorus/drop) från Essentia — kräver egen state-machine ovanpå energy-envelope, hoppar över i första iterationen.
- Multi-band drop-detektion (bass vs full-spectrum) — kan läggas till om drop-detektorn missar sub-drops.
