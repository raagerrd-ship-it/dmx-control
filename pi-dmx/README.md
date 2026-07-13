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


## System setup (one-time)

### 1. `/boot/firmware/config.txt`

```ini
# UART for DMX (WPM432)
enable_uart=1
dtoverlay=disable-bt
init_uart_clock=48000000

# Codec Zero HAT — line-in on 3.5mm AUX
dtoverlay=iqaudio-codec

# Performance
force_turbo=1
```

### 2. `/boot/firmware/cmdline.txt`

Remove `console=serial0,115200`. Append:

```
isolcpus=3 nohz_full=3 rcu_nocbs=3
```

### 3. Disable serial console + Bluetooth stack

```bash
sudo systemctl disable --now hciuart bluetooth serial-getty@ttyAMA0
```

### 4. CPU governor

Installed as a systemd oneshot together with the engine (see step below) — no
manual command needed. If you want to apply it immediately without a reboot:

```bash
echo performance | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor
```

### 5. udev + permissions

```bash
# /etc/udev/rules.d/99-dmx-uart.rules
KERNEL=="ttyAMA0", GROUP="dialout", MODE="0660"

sudo usermod -aG dialout,audio pi
```

### 6. Codec Zero — route AUX line-in to capture

The Codec Zero powers up with the mic pre-amp active. For line-in from the
mixer we disable the boost and route AUX-IN → ADC. Save this as
`/etc/alsa/codec-zero-linein.state` (adapted from the Pi Foundation's
`Record_from_3.5mm_Aux-In.state`) and load it at boot:

```bash
# Apply on boot via systemd
sudo tee /etc/systemd/system/codec-zero-linein.service >/dev/null <<'EOF'
[Unit]
Description=Codec Zero — AUX line-in routing
After=sound.target
[Service]
Type=oneshot
ExecStart=/usr/sbin/alsactl restore -f /etc/alsa/codec-zero-linein.state
RemainAfterExit=yes
[Install]
WantedBy=multi-user.target
EOF
sudo systemctl enable --now codec-zero-linein
```

The Codec Zero registers as card 0 (`snd_rpi_wsp`). Set it as ALSA default:

```bash
# /etc/asound.conf
pcm.!default {
    type asym
    capture.pcm "hw:0,0"
}
```

Verify with `arecord -l` (Codec Zero on card 0) and record a 3 s test:

```bash
arecord -D hw:0,0 -f S16_LE -r 48000 -c 2 -d 3 /tmp/test.wav && aplay /tmp/test.wav
```

## Build & install

```bash
cd pi-dmx/dmx-helper
make
sudo make install                        # → /usr/local/bin/dmx-helper
sudo setcap cap_sys_nice+ep /usr/local/bin/dmx-helper

sudo cp systemd/dmx-helper.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now dmx-helper
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
