# pi-dmx — Dedicated audio→DMX controller (Pi Zero 2 W)

*🇬🇧 English · 🇸🇪 [Svenska](README.sv.md)*

Standalone lighting controller. Runs on its own Pi Zero 2 W with nothing else
installed. Reads line-in audio from a mixer via the **Codec Zero HAT**,
analyses kicks/drops/energy, and drives DMX-512 out through a **Whadda
WPM432** module on the PL011 UART. A small web server exposes a mobile UI
for live control.

No cloud, no DAW, no operator. Plug line-out into it, and the lights play
the song.

## Highlights

- **Sub-frame realtime on a $15 Pi.** A dedicated C sidecar owns the UART on
  an *isolated CPU core* (`isolcpus=3`) at `SCHED_FIFO` with `mlockall()`, so
  DMX break-timing never jitters even while Node does FFTs on the other cores.
  End-to-end light-follows-music latency: **~40–80 ms** (see budget below).
- **A show director, not a VU meter.** Local BPM detection (autocorrelation +
  comb + pulse-train + perceptual prior, phase-locked to real kicks via a PLL),
  energy tiering relative to the song's own baseline, riser/drop prediction,
  and a curated-palette phrase engine that changes colour on musical
  boundaries — so it feels *programmed to the track*, not merely reactive.
- **VU as a Master VCA.** Overall brightness is a plain, instant linear map of
  the raw signal level (`0.1 → 0 %`, `0.97 → 100 %`) applied as the *final*
  gain after every effect and after the output ballistics — no filters, no lag.
  Effects stay agnostic to it; it just scales them. This is what makes the rig
  "breathe" with the music.
- **Modular effect registry.** Each effect is one file exporting an `EffectDef`
  (render + metadata). A registry derives the mode list, the smart-mode energy
  pools, validation, and the entire UI from one source of truth — adding an
  effect is a new file plus one line.
- **Built for rental.** Crash-safe atomic config writes, an owner-only `/setup`
  page hidden from renters, a health watchdog that restarts a hung pipeline,
  and self-healing audio capture that recovers from a jostled connector in ~1 s.

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
Each press cycles through the effect modes (Smart → drops → party → chase →
… → twin, in registry order). Blackout is intentionally skipped so a button
press never kills the show — you can still select it from the mobile UI.

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
5. Sets up a permanent **WiFi access point** on `wlan0` via NetworkManager
   — SSID `pi-dmx`, **open by default** (no password), gateway `192.168.4.1`.
   Set a password with `AP_PASS=... AP_SSID=... sudo -E bash install.sh`
   (recommended for a rental rig on a shared site).
6. Installs `/etc/asound.conf` (default capture = `hw:0,0`) and the
   `codec-zero-linein` oneshot for AUX-in routing.
7. Builds + installs `dmx-helper` to `/usr/local/bin/`.
8. Builds + installs the Node engine to `/opt/audio-dmx-engine/`, config
   under `/var/lib/audio-dmx-engine/`.
9. Enables `cpu-performance`, `codec-zero-linein`, `dmx-helper`,
   `audio-dmx-engine`.

After reboot the Pi broadcasts its own network. Join `pi-dmx` from your
phone and open **http://192.168.4.1/**. WiFi/BT chip is on SDIO — fully
independent of the UART, so the AP doesn't touch DMX timing.



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

## Fixtures — add or remove lamps

The rig isn't fixed to four PARs. Add, remove, and re-address lamps live from
the **owner setup page** — open the UI with `/setup` in the URL
(`http://192.168.4.1/setup`) and use the **Fixtures** card:

| Control | What it does |
|---|---|
| **+ Lägg till lampa** | Append a new fixture |
| **×** on a row | Remove that fixture |
| Tap a row | Edit its name, **DMX start address**, and type (RGB / RGBW / dimmer / custom channel roles) |
| **Auto-adressera** | Re-pack every fixture into back-to-back addresses with no gaps |
| **Identifiera** | Flash each lamp in turn at full white so you can match a row to the physical PAR in the room |
| **Spara ändringar** | Commit — writes atomically to `config.json` (temp + rename + `.bak`) so a crash mid-save can't corrupt it |

Addresses are validated as you edit (overlaps and out-of-range are flagged and
block saving). The engine only sends up to the highest channel any fixture
uses, so fewer lamps also means a shorter DMX frame and a faster refresh.

You can also edit the `fixtures` array in
`/var/lib/audio-dmx-engine/config.json` directly and restart the service.

### Effects scale to the fixture count automatically

Effects never hard-code "4 lamps." Each one renders per lamp from its index and
the live count (`c.idx`, `c.count`), so the same effect just spreads across
however many fixtures you have — 1, 3, 8, whatever:

- **Unison** effects (breathe, drift, pulse, snap, strobe) light every lamp the
  same, so any count works trivially.
- **Spatial** effects (wave, chase, sweep, bounce, tide…) use `idx`/`count` to
  place a moving head, wrap a wave, or wash across the whole line.
- **Group** effects (rave, flip, gallop, twin) split by parity (`idx % 2`), so
  two lamps alternate — and with four they read as a clean 2-vs-2 call-and-
  response.
- **Spektrum** (eq) maps lamps to bands (`idx % 3` → bass/mid/treble) and cycles
  the bands across as many lamps as there are.

Add a fifth PAR and the waves get longer, the groups get wider, and the
spectrum repeats — no code change, no per-count tuning.

## Effect architecture

Every effect lives in its own file under `engine/src/effects/` and exports an
`EffectDef` — logic **and** metadata in one place:

```ts
// effects/wave.ts
export const wave: EffectDef = {
  key: "wave", label: "Våg", tier: "fart",
  desc: "Flowing colour wave rolling across the rig.",
  render: (c) => {
    const base = 0.55 + 0.45 * Math.sin(c.wavePhase - c.idx * 1.3 * c.phaseSpread);
    const hue  = c.mixedSector(c.idx + Math.floor(c.wavePhase * 0.4)) / 6;
    return c.hsv(hue, 1, c.shaped(0.12, base * (0.35 + c.audio * 0.7) + c.frame.treble * 0.35));
  },
};
```

`c` is an `EffectContext` the engine builds once per frame (beat index/phase,
band energies, riser build-up, a music clock, palette helpers…) and reuses per
lamp, so there are no allocations in the render loop. `registry.ts` collects
every `EffectDef` and derives everything else from that one list:

- the physical-button / WS mode cycle (`EFFECT_KEYS`)
- the smart-mode energy pools (`TIER` — from each effect's `tier` tag)
- server-side mode validation
- the mobile UI's effect lists (pushed as metadata, rendered client-side)

**Adding an effect** = create one file, add one line to the registry, add one
entry to the `Mode` union. No editing five files, no duplicated lists.

The engine (`EffectEngine`) owns all the *cross-cutting* show logic — beat
clock, drop/riser detection, the VU ceiling, output ballistics, bass punch,
fog, ambient idle — and applies it uniformly on top of whatever an effect
returns. Effects only decide colour and per-lamp shape.

## Smart show director

`Smart` mode makes the rig behave like a lighting operator reading the room:

- **BPM** is detected locally (length-normalised autocorrelation + harmonic
  comb + pulse-train cross-correlation + a log-Gaussian perceptual prior),
  self-corrects octave errors over ~5 s, and a **PLL** nudges the beat anchor
  toward each real kick so the pulse stays in phase even if the number is a
  hair off.
- **Energy tiering is relative** to the song's own ~25 s baseline (a line
  feed is compressed and sits high, so absolute level is meaningless): clearly
  above average → *full fart*, around average → *fart*, below → *lugn*.
- **Riser/drop prediction** watches the spectral centroid and level climb into
  a drop, swells brightness through the build, then lands the hit.
- A **phrase engine** rotates a curated RGB palette every 32 beats on musical
  boundaries, biased warm/cool by the centroid.
- **Beat pulse** dips the whole rig between beats *under* the VU ceiling, and a
  short pre-drop **blackout** makes the impact hit twice as hard.

The physical PARs can't blend hues, so all colour is snapped to the six pure
R/G/B corners and every bit of smoothness lives in brightness instead.

## Layout

```
pi-dmx/
├── README.md                  ← this file
├── dmx-helper/                ← C sidecar (owns UART timing)
│   ├── main.c
│   ├── Makefile
│   └── systemd/dmx-helper.service
└── engine/                    ← Node/TS audio + effect engine
    ├── src/
    │   ├── analyser.ts         ← FFT, bands, BPM, kick/onset
    │   ├── effects.ts          ← EffectEngine (director + pipeline)
    │   ├── effects/            ← one file per effect + registry
    │   ├── dmx.ts / audio.ts   ← sidecar socket / ALSA capture
    │   └── server.ts           ← Fastify UI + WebSocket
    ├── public/                 ← mobile PWA (renter view + /setup)
    └── systemd/                ← services + health watchdog
```

## License & commercial use

Free for **noncommercial use** — personal, hobby, tinkering, research,
education — under the [PolyForm Noncommercial License 1.0.0](../LICENSE.md).
Read it, run it in your own barn, learn from the architecture.

**Commercial use** — renting the rig out, reselling it, or building a paid
product or service on it — is **not** granted by that license. For a commercial
license, get in touch first: **raager.rd@gmail.com**.
