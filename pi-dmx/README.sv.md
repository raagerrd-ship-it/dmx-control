# pi-dmx — Dedikerad ljud→DMX-styrning (Pi Zero 2 W)

*🇬🇧 [English](README.md) · 🇸🇪 Svenska*

Fristående ljusstyrning. Kör på en egen Pi Zero 2 W utan något annat
installerat. Läser line-in-ljud från ett mixerbord via **Codec Zero HAT**,
analyserar kickar/drops/energi och skickar ut DMX-512 genom en **Whadda
WPM432**-modul på PL011-UART:en. En liten webbserver ger ett mobilt gränssnitt
för live-styrning.

Inget moln, ingen DAW, ingen operatör. Koppla in line-out, så spelar ljuset
låten.

## Höjdpunkter

- **Realtid under en bildruta på en $15-Pi.** En dedikerad C-sidecar äger UART:en
  på en *isolerad CPU-kärna* (`isolcpus=3`) med `SCHED_FIFO` och `mlockall()`, så
  DMX-break-timingen aldrig flimrar ens medan Node kör FFT:er på de andra
  kärnorna. Latens hela vägen (ljus följer musik): **~40–80 ms** (se budget nedan).
- **En regissör, inte en VU-mätare.** Lokal BPM-detektering (autokorrelation +
  kam + pulståg + perceptuell prior, fas-låst mot verkliga kickar via en PLL),
  energitiering relativt låtens egen baslinje, riser/drop-prediktion och en
  fras-motor med kurerade paletter som byter färg på musikaliska gränser — så det
  känns *programmerat till låten*, inte bara reaktivt.
- **VU som en Master-VCA.** Den övergripande ljusstyrkan är en rak, ögonblicklig
  linjär mappning av den råa signalnivån (`0.1 → 0 %`, `0.97 → 100 %`), applicerad
  som *sista* gain efter varje effekt och efter utsignals-ballistiken — inga
  filter, ingen lagg. Effekterna är omedvetna om den; den bara skalar dem. Det är
  detta som får riggen att *andas* med musiken.
- **Modulärt effekt-register.** Varje effekt är en fil som exporterar en
  `EffectDef` (render + metadata). Ett register härleder läges-listan,
  smart-lägets energipooler, valideringen och hela gränssnittet ur en enda
  sanningskälla — att lägga till en effekt är en ny fil plus en rad.
- **Byggd för uthyrning.** Kraschsäkra atomiska config-skrivningar, en ägar-låst
  `/setup`-sida dold för hyresgäster, en health-watchdog som startar om en hängd
  pipeline, och en självläkande ljud-capture som återhämtar sig från ett glappande
  kontakt på ~1 s.

## Arkitektur

```
Mixer (Line/Phones out, 3.5mm TRS stereo)
    │
    ├─► Codec Zero HAT (I²S, 48 kHz, line-in via AUX 3.5mm)
    │       │  card 0 — snd_rpi_wsp
    │       ▼
    │   ┌────────────────────────────────────────┐
    │   │  audio-dmx-engine  (Node/TS)           │
    │   │  • ALSA-capture (arecord hw:0,0)       │
    │   │  • FFT + kick/drop/onset-detektering   │◄─── mobil PWA
    │   │  • effektmotor → 512 DMX-kanaler       │     (Fastify + WS)
    │   │  • Unix STREAM  → dmx-helper           │
    │   └───────────────┬────────────────────────┘
    │                   │  /run/dmx.sock
    │                   ▼
    │   ┌────────────────────────────────────────┐
    │   │  dmx-helper  (C, SCHED_FIFO)           │
    │   │  • PL011 250k 8N2 + TIOCSBRK/TIOCCBRK  │
    │   │  • 40 Hz refresh, trigger-drivna pushes│
    │   └───────────────┬────────────────────────┘
    │                   ▼
    │             GPIO14 (TXD0) → WPM432 RX/DI
    │                              │
    │                          WPM432 → integrerad XLR → armaturer
```

Två processer, ett jobb var. C äger mikrosekund-timingen, Node äger
ljud-/effekt-/UI-logiken.

## Hårdvara (din bygge)

| Del | Noteringar |
|---|---|
| Raspberry Pi Zero 2 W | 512 MB, ARMv8, quad Cortex-A53 |
| **Pi Codec Zero HAT** | I²S line-in via 3.5mm AUX. Card 0 (`snd_rpi_wsp`) |
| 3.5mm TRS-kabel | Mixer line-out → Codec Zero AUX-IN |
| **Whadda WPM432** DMX-512-modul | Innehåller RS-485-drivaren + 3-polig XLR hona. Ingen extra breakout behövs. |
| 3× byglar | Pi ↔ WPM432 (5V / GND / TX) |
| 120 Ω-resistor | DMX-linjeterminering över pin 2/3 på sista armaturen |
| Codec Zero SW1-knapp | Inbyggd — cyklar genom lägen. Ingen extra ledning. |
| INMP441 (reserv-mikrofon) | Ej använd i detta bygge — bara line-in |

### WPM432-koppling (endast TX, ingen RDM)

WPM432 innehåller redan RS-485-drivaren och ett XLR-uttag, så ingen
MAX485-breakout och ingen extern XLR-koppling behövs.

```
Pi 5V   (pin 2 eller 4)   ────► WPM432 VCC   (5V)
Pi GND  (pin 6)           ────► WPM432 GND
Pi GPIO14 / TXD0 (pin 8)  ────► WPM432 RX (DI)
```

WPM432:ans DE/RE hålls för kontinuerlig sändning på kortet, så ingen
riktnings-GPIO behövs. Koppla armaturerna till modulens XLR-ut. Terminera den
sista armaturen i kedjan med en 120 Ω-resistor över XLR-pin 2/3.

Obs: Codec Zero HAT upptar 40-pinnars-headern. Löd eller koppla de tre
WPM432-ledningarna på genomgångs-stackpinnarna (2, 6, 8) ovanför HAT:en, eller
använd en stacking-header.

### Läges-knapp

Codec Zero HAT har en inbyggd tryckknapp (SW1) kopplad till **GPIO27**. Varje
tryck cyklar genom effekt-lägena (Smart → drops → party → chase → … → twin, i
register-ordning). Blackout hoppas medvetet över så att ett knapptryck aldrig
släcker showen — du kan fortfarande välja det från mobilgränssnittet.

Kräver `gpiod` (`sudo apt install -y gpiod`). För att använda en annan GPIO
(t.ex. en extern knapp på GPIO17), ändra `modeButton.line` i
`/var/lib/audio-dmx-engine/config.json`, eller sätt `modeButton` till `null` för
att stänga av den helt.

## Installation

Flasha Raspberry Pi OS Lite (64-bit) till SD-kortet, boota, anslut Pi:n till
Wi-Fi/SSH, klona sedan detta repo och kör engångs-installeraren:

```bash
git clone <detta-repo> ~/pi-dmx-src
sudo bash ~/pi-dmx-src/pi-dmx/install.sh
sudo reboot
```

Skriptet är idempotent — kör det igen efter att du dragit kodändringar så
bygger det om + startar om båda tjänsterna.

Vad det gör:

1. Installerar apt-beroenden (`build-essential nodejs npm alsa-utils gpiod`).
2. Redigerar `/boot/firmware/config.txt` — `enable_uart=1`, `disable-bt`,
   `iqaudio-codec`, `force_turbo=1`.
3. Redigerar `/boot/firmware/cmdline.txt` — tar bort serie-konsolen, lägger till
   `isolcpus=3 nohz_full=3 rcu_nocbs=3` så CPU3 reserveras för `dmx-helper`.
4. Stänger av `hciuart`, `bluetooth`, `serial-getty@ttyAMA0`.
5. Sätter upp en permanent **WiFi-accesspunkt** på `wlan0` via NetworkManager
   — SSID `pi-dmx`, **öppet nät som standard** (inget lösenord), gateway
   `192.168.4.1`. Sätt ett lösenord med `AP_PASS=... AP_SSID=... sudo -E bash
   install.sh` (rekommenderas för en uthyrningsrigg på en delad plats).
6. Installerar `/etc/asound.conf` (default-capture = `hw:0,0`) och
   `codec-zero-linein`-oneshoten för AUX-in-routing.
7. Bygger + installerar `dmx-helper` till `/usr/local/bin/`.
8. Bygger + installerar Node-motorn till `/opt/audio-dmx-engine/`, config under
   `/var/lib/audio-dmx-engine/`.
9. Aktiverar `cpu-performance`, `codec-zero-linein`, `dmx-helper`,
   `audio-dmx-engine`.

Efter omstart sänder Pi:n sitt eget nät. Anslut till `pi-dmx` från telefonen och
öppna **http://192.168.4.1/**. WiFi/BT-chipet sitter på SDIO — helt oberoende av
UART:en, så AP:n rör inte DMX-timingen.

Allt körs som **root** med flit — den här Pi:n är en enfunktions-appliance på ett
isolerat nät, så vi slipper capability-jonglering (`setcap`, dialout/audio-
grupper, port-80-bindningstrick). Vill du låsa ner den: ändra `User=root` i
engine-tjänsten tillbaka till `pi` och lägg tillbaka capabilities.

### ALSA-kalibrering vid första boot

Codec Zero startar med mikrofon-förförstärkaren på. En gång, efter första
omstarten, routa AUX-in till ADC:n och spara läget så att `codec-zero-linein`-
tjänsten återställer det automatiskt:

```bash
alsamixer -c 0                                       # sätt AIN1/AIN2 som capture-källa, Mic Boost = 0
sudo alsactl store -f /etc/alsa/codec-zero-linein.state
sudo systemctl restart codec-zero-linein audio-dmx-engine
```

Verifiera capture:

```bash
arecord -D hw:0,0 -f S16_LE -r 48000 -c 2 -d 3 /tmp/test.wav && aplay /tmp/test.wav
```

## Verifiera DMX

```bash
# Skicka en enda "kanal 1 full"-ram från skalet
python3 -c "import socket,sys; s=socket.socket(socket.AF_UNIX,socket.SOCK_STREAM); \
    s.connect('/run/dmx.sock'); s.sendall(b'\\xff'+b'\\x00'*511)"

# → Armatur på DMX-adress 1 ska gå till full ljusstyrka.
```

## Latensbudget

| Steg | ms |
|---|---|
| Mixer → Codec Zero ADC | 0.5 |
| I²S DMA (128 samples @ 48k) | 2.7 |
| ALSA-period + capture | 2–5 |
| FFT-fönster-latens (512 samples ÷ 2) | ~5 |
| Onset + effekt-pipeline | ~1 |
| Unix-socket → sidecar | <0.5 |
| Vänta på nästa DMX-slot (trigger-driven push) | 0–5 |
| DMX-ram på tråden | 23 |
| Armaturens reaktion | 5–40 |
| **Totalt** | **~40–80 ms** |

Väl under den ~100 ms perceptuella tröskeln för "ljuset följer musiken".

## Armaturer — lägg till eller ta bort lampor

Riggen är inte låst till fyra PAR-kannor. Lägg till, ta bort och omadressera
lampor live från **ägar-setupsidan** — öppna gränssnittet med `/setup` i URL:en
(`http://192.168.4.1/setup`) och använd **Fixtures**-kortet:

| Kontroll | Vad den gör |
|---|---|
| **+ Lägg till lampa** | Lägger till en ny armatur |
| **×** på en rad | Tar bort den armaturen |
| Tryck på en rad | Ändra namn, **DMX-startadress** och typ (RGB / RGBW / dimmer / custom kanalroller) |
| **Auto-adressera** | Packar om alla armaturer till tätt liggande adresser utan luckor |
| **Identifiera** | Blinkar varje lampa i tur och ordning i fullt vitt så du kan matcha en rad mot den fysiska PAR-kannan i rummet |
| **Spara ändringar** | Bekräftar — skriver atomiskt till `config.json` (temp + rename + `.bak`) så en krasch mitt i sparandet inte kan korrumpera den |

Adresser valideras medan du redigerar (överlapp och utanför intervall flaggas och
blockerar sparande). Motorn skickar bara upp till den högsta kanal någon armatur
använder, så färre lampor betyder också en kortare DMX-ram och snabbare refresh.

Du kan också redigera `fixtures`-arrayen i
`/var/lib/audio-dmx-engine/config.json` direkt och starta om tjänsten.

### Effekterna skalar automatiskt efter antalet lampor

Effekterna hårdkodar aldrig "4 lampor". Var och en renderas per lampa utifrån
sitt index och det aktuella antalet (`c.idx`, `c.count`), så samma effekt sprids
bara ut över hur många armaturer du än har — 1, 3, 8, spelar ingen roll:

- **Unison**-effekter (breathe, drift, pulse, snap, strobe) tänder alla lampor
  lika, så vilket antal som helst funkar trivialt.
- **Spatiala** effekter (wave, chase, sweep, bounce, tide…) använder
  `idx`/`count` för att placera ett rörligt huvud, veckla en våg eller skölja
  över hela raden.
- **Grupp**-effekter (rave, flip, gallop, twin) delar på paritet (`idx % 2`), så
  två lampor växlar — och med fyra läses de som ett rent 2-mot-2 anrop-och-svar.
- **Spektrum** (eq) mappar lampor till band (`idx % 3` → bas/mellan/diskant) och
  cyklar banden över så många lampor som finns.

Lägg till en femte PAR och vågorna blir längre, grupperna bredare och spektrumet
upprepas — ingen kodändring, ingen trimning per antal.

## Effekt-arkitektur

Varje effekt bor i sin egen fil under `engine/src/effects/` och exporterar en
`EffectDef` — logik **och** metadata på ett ställe:

```ts
// effects/wave.ts
export const wave: EffectDef = {
  key: "wave", label: "Våg", tier: "fart",
  desc: "Flödande färgvåg som rullar över hela riggen.",
  render: (c) => {
    const base = 0.55 + 0.45 * Math.sin(c.wavePhase - c.idx * 1.3 * c.phaseSpread);
    const hue  = c.mixedSector(c.idx + Math.floor(c.wavePhase * 0.4)) / 6;
    return c.hsv(hue, 1, c.shaped(0.12, base * (0.35 + c.audio * 0.7) + c.frame.treble * 0.35));
  },
};
```

`c` är ett `EffectContext` som motorn bygger en gång per frame (taktindex/fas,
band-energier, riser-uppbyggnad, en musik-klocka, palett-hjälpare…) och
återanvänder per lampa, så det finns inga allokeringar i render-loopen.
`registry.ts` samlar varje `EffectDef` och härleder allt annat ur den enda
listan:

- fysiska knappens / WS:ens läges-cykel (`EFFECT_KEYS`)
- smart-lägets energipooler (`TIER` — ur varje effekts `tier`-tagg)
- serverns läges-validering
- mobilgränssnittets effekt-listor (skickas som metadata, renderas i klienten)

**Att lägga till en effekt** = skapa en fil, lägg till en rad i registret, lägg
till en post i `Mode`-unionen. Inget redigerande i fem filer, inga duplicerade
listor.

Motorn (`EffectEngine`) äger all *tvärgående* show-logik — takt-klocka,
drop/riser-detektering, VU-taket, utsignals-ballistik, bas-punch, rök, ambient-
vila — och applicerar den uniformt ovanpå vad en effekt än returnerar.
Effekterna bestämmer bara färg och form per lampa.

## Smart regi

`Smart`-läget får riggen att bete sig som en ljusoperatör som läser rummet:

- **BPM** detekteras lokalt (längd-normaliserad autokorrelation + harmonisk kam +
  pulståg-korskorrelation + en log-Gaussisk perceptuell prior), självrättar
  oktav-fel över ~5 s, och en **PLL** knuffar takt-ankaret mot varje verklig kick
  så pulsen sitter i fas även om siffran är en aning fel.
- **Energitieringen är relativ** till låtens egen ~25 s-baslinje (en line-feed är
  komprimerad och ligger högt, så absolut nivå säger inget): tydligt över snittet
  → *full fart*, runt snittet → *fart*, under → *lugn*.
- **Riser/drop-prediktion** bevakar spektral-centroiden och nivån som klättrar mot
  en drop, sväller ljuset genom uppbyggnaden och landar sedan smällen.
- En **fras-motor** roterar en kurerad RGB-palett var 32:e takt på musikaliska
  gränser, viktad varm/kall av centroiden.
- **Beat-puls** dippar hela riggen mellan slagen *under* VU-taket, och en kort
  **blackout** strax före dropen får smällen att slå dubbelt så hårt.

De fysiska PAR-kannorna kan inte blanda toner, så all färg snäpps till de sex
rena R/G/B-hörnen och all mjukhet ligger i ljusstyrkan i stället.

## Struktur

```
pi-dmx/
├── README.md / README.sv.md   ← denna fil
├── dmx-helper/                ← C-sidecar (äger UART-timingen)
│   ├── main.c
│   ├── Makefile
│   └── systemd/dmx-helper.service
└── engine/                    ← Node/TS ljud- + effektmotor
    ├── src/
    │   ├── analyser.ts         ← FFT, band, BPM, kick/onset
    │   ├── effects.ts          ← EffectEngine (regi + pipeline)
    │   ├── effects/            ← en fil per effekt + register
    │   ├── dmx.ts / audio.ts   ← sidecar-socket / ALSA-capture
    │   └── server.ts           ← Fastify-UI + WebSocket
    ├── public/                 ← mobil PWA (hyresgästvy + /setup)
    └── systemd/                ← tjänster + health-watchdog
```

## Licens & kommersiell användning

© 2026 — med ensamrätt. Ingen open source-licens ges. Du är välkommen att läsa
koden och lära av arkitekturen.

**Vill du använda den kommersiellt** — hyra ut den, sälja den vidare eller bygga
en produkt på den? Hör av dig först: **raager.rd@gmail.com**.
