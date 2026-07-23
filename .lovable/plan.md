## Scope

Lägg till stöd för BLEDOM-styrda ljusslingor som körs **parallellt** med DMX-riggen. Slingorna speglar riggens medelfärg + ljusstyrka per frame — samma beat, samma stämning, en förlängning av showen. Ingen egen effektmotor för BLE.

Om en användare köper en BLE-lampa som inte är BLEDOM (t.ex. Triones, Zengge, LEDnetWF) syns den ändå i scan-listan men skrivningar tystnar. Vi loggar chip-typ vid pairing så jag kan lägga till fler protokoll senare utan att bygga om.

## Arkitektur — sidecar-mönster (samma som dmx-helper)

```text
┌──────────────────┐  Unix socket   ┌──────────────────┐
│ audio-dmx-engine │ ─────────────► │   ble-writer     │
│ (kärna 1-2)      │   {r,g,b,br}   │  (kärna 3 låst)  │
│                  │   ~60 Hz       │                  │
│ ALSA · FFT ·     │                │  noble + BLEDOM  │
│ effekter · DMX   │                │  keep-alive 1 Hz │
└──────────────────┘                │  canWriteNow()   │
                                    └───────┬──────────┘
                                            │ GATT writes
                                            ▼
                                     BLEDOM-slingor
```

**Varför sidecar och inte worker_thread?** `noble` äger hci0 exklusivt — kraschar den (vanligt vid dålig signal) ska den kunna respawna utan att ta med ALSA-loopen. Sidecar isolerar det. Samma design som `dmx-helper`.

## Ändringar

**Nytt: `pi-dmx/ble-writer/`**
- `src/index.ts` — noble-scan, GATT-anslut, BLEDOM 9-byte-paket (`7e 00 05 03 RR GG BB 00 ef`), 1 Hz keep-alive, `canWriteNow()` pre-gate (16 ms mellan writes per enhet — samma som Lotus).
- `package.json` — noble som enda deps.
- Lyssnar på `/run/pi-dmx/ble.sock`. Protokoll: `{type:"paired"}` → nuvarande lista, `{type:"color", r, g, b, brightness}` → skriv nu, `{type:"scan"}` → returnera hittade enheter, `{type:"pair", mac}` / `{type:"unpair", mac}`.

**Engine (`pi-dmx/engine/`)**
- `src/config.ts` — nytt fält `bleDevices: { mac: string; name: string; chip: "bledom" | "unknown" }[]` (default `[]`).
- `src/effects.ts` — efter DMX-skrivningen per frame, räkna ut riggens medelfärg (viktat med brightness) och skicka till sidecarn. Inget nytt tungt jobb — färgerna finns redan.
- `src/server.ts` — WS-relay: `{type:"bleScan"}`, `{type:"blePair", mac}`, `{type:"bleUnpair", mac}` → prata med sidecarn.

**UI**
- `pi-dmx/engine/public/index.html` (`/setup`-läget): ny sektion **"BLE-slingor"** med scan-knapp, hittade enheter (namn + MAC + chip-typ, gråa ut icke-BLEDOM med "stöds inte än"), parade enheter med ta-bort-knapp.
- `src/pages/DmxController.tsx` — spegling av samma sektion i mock. Visar bara statisk placeholder (ingen faktisk BLE i browser).
- **Avancerat**-flagga i båda: **"BLE-slingor aktiva"** (grön när ≥1 parad enhet svarar).

**Installation (`pi-dmx/install.sh`)**
- Installera `bluez` + sätt CAP_NET_ADMIN/CAP_NET_RAW på node-binären för ble-writer.
- Ny systemd-service `pi-dmx-ble.service`:
  ```ini
  [Service]
  CPUAffinity=3
  Nice=-5
  User=root
  ExecStart=/usr/bin/node /opt/pi-dmx/ble-writer/dist/index.js
  Restart=always
  ```
- Uppdatera `audio-dmx-engine.service` med `CPUAffinity=1 2` (håll bort från 0 och 3).

## Vad som medvetet INTE ingår

- Inga andra BLE-chip än BLEDOM i första version — skanning visar dem, men skrivning tystnar. Lägg till Triones/Zengge när du har hårdvara att testa mot.
- Ingen per-slinga-färgroll (alla slingor får riggens medelfärg). Kan utökas senare med `role: "ble-mirror" | "ble-warm" | "ble-accent"` om det behövs.
- Ingen effekt-registret-integration (`drives: ["ble"]`) — slingorna reagerar på ALLA effekter automatiskt via medelfärgen.

## Verifiering

1. `npx tsgo --noEmit` i både engine och ble-writer → inga fel.
2. Efter deploy: `systemctl status pi-dmx-ble` → running, `taskset -pc $(pgrep -f ble-writer)` → `3`.
3. `htop`: ALSA-underruns försvinner (dvs. sync-driften du sett förvärras inte).
4. Para en BLEDOM-slinga i `/setup`, dra mood-slidern → slingan skiftar färg synligt i takt med DMX-lamporna.
