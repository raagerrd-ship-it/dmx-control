Fem små UI-polish + två Avancerat-tillägg. Alla ändringar mirrors i mock (`src/pages/DmxController.tsx`) och Pi-UI (`pi-dmx/engine/public/index.html`).

## 1. Enhetligt BPM/Konfidens-tomläge

Idag: "Lyssnar…" i kursiv rosa i BPM, tunt streck i Konfidens → asymmetriskt.

Nytt: Båda kolumner visar `— —` i samma stora typvikt (`text-3xl fg/40`) tills BPM låser. Liten pulserande rosa prick bredvid "BPM"-etiketten signalerar lyssning. När BPM låser: siffror fadar in, pricken slocknar.

## 2. Dämpa AUTO-badgen

Glas-variant likt Avancerat-chevron: bg `fg/4`, border `fg/12`, text `fg/60`. Behåller "AUTO"-texten men blir lugn indikator istället för rosa accent.

## 3. Neutralisera slider-legenden

`CHILL / FEST / GALET` i `fg` (vit) `font-medium` istället för rosa. Thumb-halon blir ensam rosa fokuspunkt i regionen. AV/MAX oförändrade.

## 4. Header-förankring

Diskret tagline under DMS-logotypen: `text-[10px] tracking-[0.3em] uppercase text-muted-foreground/60`, texten `LJUS SOM LYSSNAR`. Ingen linje — bara typografiskt ankare.

## 5. Rökmaskin-toggle (i Avancerat)

Ny rad inuti Avancerat, renderas endast om minst en fixture har rollen `hazer` eller `co2`:

```
🌫  Dimma          [  ●○  ]
    Rökmaskin & CO₂
```

Samma glas-thumb-toggle som AUX/Mikrofon. Default PÅ. State: `hazeEnabled` i `usePiMock` + `cfg.hazeEnabled` på Pi. Gate i output-mixern så alla effekter respekterar den utan egna ändringar.

## 6. Fixture-adresser i Avancerat

Ny read-only lista längst ner i Avancerat, så en användare som råkat justera DIP-switcharna kan verifiera adressering utan att gå in i /setup. Kompakt tabell-look:

```
LAMPOR
─────────────────────────
Lampa 1   RGB          DMX 1
Lampa 2   RGB          DMX 5
Lampa 3   Hazer        DMX 9
Lampa 4   Blinder      DMX 12
```

- Rubrik `LAMPOR` i samma stil som andra Avancerat-etiketter
- Rader: namn (fg), typ (dim), adress (fg mono, höger)
- Tunn `border-t` mellan rader, ingen egen kort-bakgrund
- Data: `fixtures` från `usePi()` (mock) / `cfg.fixtures` (Pi)
- Länk sist: `Justera i inställningar →` som öppnar /setup (bara på Pi:n, döljs i mocken)

## Teknisk detalj

Filer:
- `src/pages/DmxController.tsx` — punkt 1–6 UI
- `src/hooks/usePiMock.ts` — `hazeEnabled` fält + setter, mock-fixtures-lista med adresser
- `pi-dmx/engine/public/index.html` — punkt 1–6 speglade
- `pi-dmx/engine/src/config.ts` — `hazeEnabled` fält
- `pi-dmx/engine/src/effects.ts` — output-gate på hazer/co2 när `hazeEnabled=false`
- `pi-dmx/engine/src/server.ts` — persist + WS-message `setHaze`

Ingen ändring i effekter, palette, rotation, BLE eller fixture-modellen. Punkt 6 är rent en läs-vy över befintlig `fixtures`-data.
