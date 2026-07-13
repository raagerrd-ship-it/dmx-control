# pi-dmx — Dedicated audio→DMX controller (Pi Zero 2 W)

Standalone lighting controller. Runs on its own Pi Zero 2 W with nothing else
installed. Reads line-in audio from a mixer via the **Codec Zero HAT**,
analyses kicks/drops/energy, and drives DMX-512 out through a **Whadda
WPM432** module on the PL011 UART. A small web server exposes a mobile UI
for live control.

## Architecture

```
Mixer (Line/Phones out, 3.5mm TRS stereo)
    │
    ├─► Codec Zero HAT (I²S, 48 kHz, line-in via AUX 3.5mm)
    │       │  card 0 — snd_rpi_wsp
    │       ▼
    │   ┌────────────────────────────────────────┐
    │   │  audio-dmx-engine  (Node/TS)           │
    │   │  • ALSA capture (arecord hw:0,0)       │
    │   │  • FFT + kick/drop/onset detection     │◄─── mobile PWA
    │   │  • effect engine → 512 DMX channels    │     (Fastify + WS)
    │   │  • Unix STREAM  → dmx-helper           │
    │   └───────────────┬────────────────────────┘
    │                   │  /run/dmx.sock
    │                   ▼
    │   ┌────────────────────────────────────────┐
    │   │  dmx-helper  (C, SCHED_FIFO)           │
    │   │  • PL011 250k 8N2 + TIOCSBRK/TIOCCBRK  │
    │   │  • 40 Hz refresh, trigger-driven pushes│
    │   └───────────────┬────────────────────────┘
    │                   ▼
    │             GPIO14 (TXD0) → WPM432 RX/DI
    │                              │
    │                          WPM432 → integrated XLR → fixtures
```

Two processes, one job each. C owns the microsecond timing, Node owns the
audio/effect/UI logic.

## Hardware (your build)

| Part | Notes |
|---|---|
| Raspberry Pi Zero 2 W | 512 MB, ARMv8, quad Cortex-A53 |
| **Pi Codec Zero HAT** | I²S line-in via 3.5mm AUX. Card 0 (`snd_rpi_wsp`) |
| 3.5mm TRS cable | Mixer line-out → Codec Zero AUX-IN |
| **Whadda WPM432** DMX-512 module | Contains the RS-485 driver + 3-pin XLR female. No extra breakout needed. |
| 3× jumper wires | Pi ↔ WPM432 (5V / GND / TX) |
| 120 Ω resistor | DMX line termination across pins 2/3 at the last fixture |
| Codec Zero SW1 button | Built-in — cycles through modes. No extra wiring. |
| INMP441 (backup mic) | Not used in this build — line-in only |

### WPM432 wiring (TX-only, no RDM)

The WPM432 already contains the RS-485 driver and an XLR jack, so no MAX485
breakout and no external XLR wiring is needed.

```
Pi 5V   (pin 2 or 4)      ────► WPM432 VCC   (5V)
Pi GND  (pin 6)           ────► WPM432 GND
Pi GPIO14 / TXD0 (pin 8)  ────► WPM432 RX (DI)
```

The WPM432's DE/RE is held for continuous transmit on board, so no direction
GPIO is required. Plug fixtures into the module's XLR out. Terminate the
last fixture in the chain with a 120 Ω resistor across XLR pins 2/3.

Note: the Codec Zero HAT occupies the 40-pin header. Solder or plug the
three WPM432 wires onto the pass-through stacking pins (2, 6, 8) above the
HAT, or use a stacking header.

### Mode button

The Codec Zero HAT has a built-in push-button (SW1) wired to **GPIO27**.
Each press cycles: **Auto → Party → Comet → Mono → Strobe → Auto…**
(Blackout is intentionally skipped so a button press never kills the show —
you can still select it from the mobile UI.)

Requires `gpiod` (`sudo apt install -y gpiod`). To use a different GPIO
(e.g. an external button on GPIO17), edit `modeButton.line` in
`/var/lib/audio-dmx-engine/config.json`, or set `modeButton` to `null` to
disable it entirely.


## Install

Flash Raspberry Pi OS Lite (64-bit) to the SD card, boot, connect the Pi to
Wi-Fi/SSH, then clone this repo and run the one-shot installer:

```bash
git clone <this-repo> ~/pi-dmx-src
sudo bash ~/pi-dmx-src/pi-dmx/install.sh
sudo reboot
```

The script is idempotent — re-run it after pulling code changes and it will
rebuild + restart both services.

What it does:

1. Installs apt deps (`build-essential nodejs npm alsa-utils gpiod`).
2. Edits `/boot/firmware/config.txt` — `enable_uart=1`, `disable-bt`,
   `iqaudio-codec`, `force_turbo=1`.
3. Edits `/boot/firmware/cmdline.txt` — drops the serial console, appends
   `isolcpus=3 nohz_full=3 rcu_nocbs=3` so CPU3 is reserved for `dmx-helper`.
4. Disables `hciuart`, `bluetooth`, `serial-getty@ttyAMA0`.
5. Installs `/etc/asound.conf` (default capture = `hw:0,0`) and the
   `codec-zero-linein` oneshot for AUX-in routing.
6. Builds + installs `dmx-helper` to `/usr/local/bin/`.
7. Builds + installs the Node engine to `/opt/audio-dmx-engine/`, config
   under `/var/lib/audio-dmx-engine/`.
8. Enables `cpu-performance`, `codec-zero-linein`, `dmx-helper`,
   `audio-dmx-engine`.

Everything runs as **root** on purpose — this Pi is a single-purpose
appliance on an isolated network, so we skip capability juggling
(`setcap`, dialout/audio groups, port-80 binding tricks). If you ever want
to lock it down, change `User=root` in the engine service back to `pi` and
re-add the caps.

### First-boot ALSA calibration

The Codec Zero powers up with the mic pre-amp enabled. Once, after the
first reboot, route AUX-in to the ADC and save the state so the
`codec-zero-linein` service restores it automatically:

```bash
alsamixer -c 0                                       # set AIN1/AIN2 as capture source, Mic Boost = 0
sudo alsactl store -f /etc/alsa/codec-zero-linein.state
sudo systemctl restart codec-zero-linein audio-dmx-engine
```

Verify capture:

```bash
arecord -D hw:0,0 -f S16_LE -r 48000 -c 2 -d 3 /tmp/test.wav && aplay /tmp/test.wav
```



## Verify DMX

```bash
# Send a single channel-1-full frame from the shell
python3 -c "import socket,sys; s=socket.socket(socket.AF_UNIX,socket.SOCK_STREAM); \
    s.connect('/run/dmx.sock'); s.sendall(b'\\xff'+b'\\x00'*511)"

# → Fixture on DMX address 1 should go to full brightness.
```

## Latency budget

| Stage | ms |
|---|---|
| Mixer → Codec Zero ADC | 0.5 |
| I²S DMA (128 samples @ 48k) | 2.7 |
| ALSA period + capture | 2–5 |
| FFT window latency (512 samples ÷ 2) | ~5 |
| Onset + effect pipeline | ~1 |
| Unix socket → sidecar | <0.5 |
| Wait for next DMX slot (trigger-driven push) | 0–5 |
| DMX frame on wire | 23 |
| Fixture reaction | 5–40 |
| **Total** | **~40–80 ms** |

Well under the ~100 ms perceptual threshold for "light follows music".

## Layout

```
pi-dmx/
├── README.md                  ← this file
├── dmx-helper/                ← C sidecar (owns UART timing)
│   ├── main.c
│   ├── Makefile
│   └── systemd/dmx-helper.service
├── engine/                    ← Node/TS audio+effect engine
└── mobile-ui/                 ← Static PWA served by engine
```
