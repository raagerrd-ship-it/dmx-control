# DMX Light Engine — Pi Zero 2W

Rent, minimalt bygge. Ingen BLE, ingen Sonos, ingen befintlig kod återanvänds. Ny liten kodbas.

## Systemöversikt

```text
 ┌────────────┐   USB    ┌─────────────┐   DMX    ┌──────────┐
 │ ALSA mic   │ ───────► │ Pi Zero 2W  │ ───────► │ 4× fixt. │
 └────────────┘  I²S/USB │  (Node.js)  │  (FTDI)  └──────────┘
                         │             │
                         │ hostapd AP  │◄── WiFi ── 📱 mobil-UI
                         └─────────────┘         (http://192.168.4.1)
   Ström: 2×18650 → laddkort → stabil 5V → Pi + FTDI
```

## Delar

### 1. Pi-tjänst (Node.js, körs som systemd-service)
- **Audio**: `node-alsa-capture` (befintlig native binding) → 44.1 kHz mono → FFT 1024/hop 128
- **Analys**: bass/mid/high-band-energi + kick-onset (samma matte som befintlig motor, men mycket enklare — bara det som behövs för färg+rörelse)
- **DMX-driver**: `dmx` npm-paket med `enttec-open-usb-dmx` (FTDI, 250 kbaud, korrekt BREAK). 512 kanaler @ ~40 Hz refresh
- **Preset-motor**: väljer färg + rörelsemönster utifrån ljud, blir modulerad av valt preset
- **Web-server**: Express + WebSocket på port 80, serverar mobil-UI + live-parametrar

### 2. Mobil-UI (React, det som byggs i Lovable-preview)
- **Preset-lista**: kort med namn (Auto, Chill, Party, Strobe, Static color, Blackout)
- **Live-kontroller**: master brightness, tempo/hastighet, färgskala (auto/varm/kall/regnbåge), känslighet
- **Fixture-setup**: antal fixtures + kanalmappning per fixture (RGB / RGBW / dimmer-only), sparas i localStorage + skickas till Pi
- **Live-preview**: liten canvas som visar vad som skickas till lamporna just nu
- **Ansluter via WebSocket** till `ws://<host>/live` för realtidsuppdateringar

### 3. Pi-setup (skript, körs en gång)
- `hostapd` + `dnsmasq` → AP `DMX-Lights` på 192.168.4.1
- systemd-service för Node-tjänsten (auto-start, restart-on-failure)
- FTDI: unload `ftdi_sio` kernel-modul (annars låser den enheten från libftdi)

## Presets (v1)

| Preset | Beteende |
|---|---|
| Auto | Färghjul roterar långsamt, kick → vit blixt, bas moduluerar intensitet |
| Chill | Varma toner (röd/orange/magenta), långsam crossfade, ingen blixt |
| Party | Full regnbåge, snabb rotation, kick → färgbyte + blixt |
| Strobe | Vit, tempo-styrd blink |
| Static | En vald färg, ingen animation |
| Blackout | Allt av |

## Plan (i ordning)

1. **Mobil-UI-skelett** i Lovable — presets, kontroller, fixture-mappning, WS-klient. Fungerar mot en mock så det kan designas färdigt i preview.
2. **Pi-tjänst** — separat mapp `pi/` med Node-service (audio + DMX + web). Kör lokalt utan hårdvara via mock-driver för utveckling.
3. **Integration** — WS-protokoll mellan UI ↔ Pi (`preset`, `params`, `fixtures`, `live-frame`).
4. **Pi-setup-skript** — `pi/setup.sh` för hostapd/dnsmasq/systemd/ftdi.
5. **Hårdvarutest på riktig Pi** — du kör setup, jag hjälper felsöka.

## Frågor jag behöver svar på under bygget (inte nu)

- Kanalmappning för dina 4 lampor (RGB? RGBW? Dimmer + färghjul?)
- Vill du kunna spara egna presets, eller räcker inbyggda?

## Design mobil-UI

Mörkt tema (fältbruk, natt), stora touch-targets, en levande färg-accent som följer aktuell preset. Font: **Inter** (body) + **Space Grotesk** (rubriker). Bakgrund `#0a0a0f`, kort `#15151d`, accent följer vald preset. Inga onödiga animationer — snabb feedback viktigare.

## Vad som INTE ingår
- Ingen molnsync (allt lokalt på Pi)
- Ingen inloggning (Pi:ns AP är access-kontrollen)
- Ingen Art-Net / sACN (bara direkt DMX via FTDI)
- Ingen inspelning/timeline — bara realtid

Godkänn så börjar jag med mobil-UI-skelettet.
