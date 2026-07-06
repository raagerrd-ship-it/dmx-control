# pi-dmx — Dedicated audio→DMX controller (Pi Zero 2 W)

Standalone lighting controller. Runs on its own Pi Zero 2 W with nothing else
installed. Reads audio from a USB line-in (mixer Phones/Main-out), analyses
kicks/drops/energy, and drives DMX-512 out over `MAX485` on the PL011 UART.
A small web server exposes a mobile UI for live control.

## Architecture

```
Mixer (Phones 2, 6.3mm TRS stereo)
    │
    ├─► UCA202 USB audio interface (RCA line-in, 48 kHz)
    │       │
    │       ▼
    │   ┌────────────────────────────────────────┐
    │   │  audio-dmx-engine  (Node/TS)           │
    │   │  • ALSA capture (native)               │
    │   │  • FFT + kick/drop/onset detection     │◄─── mobile PWA
    │   │  • effect engine → 512 DMX channels    │     (Fastify + WS)
    │   │  • Unix DGRAM  → dmx-helper            │
    │   └───────────────┬────────────────────────┘
    │                   │  /run/dmx.sock
    │                   ▼
    │   ┌────────────────────────────────────────┐
    │   │  dmx-helper  (C, SCHED_FIFO)           │
    │   │  • PL011 250k 8N2 + TIOCSBRK/TIOCCBRK  │
    │   │  • 40 Hz refresh, trigger-driven pushes│
    │   └───────────────┬────────────────────────┘
    │                   ▼
    │             GPIO14 (TXD0) → MAX485 DI
    │                              │
    │                          MAX485 → XLR → fixtures
```

Two processes, one job each. C owns the microsecond timing, Node owns the
audio/effect/UI logic.

## Hardware

| Part | Notes |
|---|---|
| Raspberry Pi Zero 2 W | 512 MB, ARMv8, quad Cortex-A53 |
| Behringer UCA202 | USB line-in, kernel-native (`snd-usb-audio`) |
| 6.3mm TRS → 2× RCA cable | Mixer Phones 2 → UCA202 in |
| MAX485 breakout | RS-485 transceiver (DE + RE tied HIGH for TX-only) |
| 3-pin XLR female | DMX output |
| 120 Ω resistor | DMX line termination (across A/B at last fixture) |

### MAX485 wiring (TX-only, no RDM)

```
Pi GPIO14 (pin 8, TXD0) ────► MAX485 DI
Pi 3V3                  ────► MAX485 VCC, DE, RE̅   (DE+RE tied HIGH)
Pi GND                  ────► MAX485 GND
MAX485 A                ────► XLR pin 3 (+)
MAX485 B                ────► XLR pin 2 (−)
Pi GND                  ────► XLR pin 1 (shield)
```

## System setup (one-time)

### 1. `/boot/firmware/config.txt`

```ini
enable_uart=1
dtoverlay=disable-bt
init_uart_clock=48000000
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

```bash
echo performance | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor
```

### 5. udev + permissions

```bash
# /etc/udev/rules.d/99-dmx-uart.rules
KERNEL=="ttyAMA0", GROUP="dialout", MODE="0660"

sudo usermod -aG dialout,audio pi
```

### 6. ALSA default capture (UCA202 as card 1)

```bash
# /etc/asound.conf
pcm.!default {
    type asym
    capture.pcm "hw:1,0"
}
```

Verify: `arecord -l` shows UCA202 as card 1.

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

## Verify

```bash
# Send a single channel-1-full frame from the shell
echo -n -e '\xff'$(printf '\x00%.0s' {1..511}) | \
    socat -u - UNIX-SENDTO:/run/dmx.sock

# → Fixture on DMX address 1 should go to full brightness.
```

## Latency budget

| Stage | ms |
|---|---|
| Mixer → UCA202 ADC | 0.5 |
| USB audio packet (128 samples @ 48k) | 2.7 |
| ALSA period + native capture | 2–5 |
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
├── engine/                    ← Node/TS audio+effect engine (TBD)
└── mobile-ui/                 ← React PWA served by engine (TBD)
```
