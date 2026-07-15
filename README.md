# pi-dmx — audio-reactive DMX lighting on a Raspberry Pi Zero 2 W

Turn a $15 Raspberry Pi into a standalone, **audio-reactive DMX-512 lighting
controller**. Feed it line-in audio and it drives your PAR cans, wash lights,
and a fog machine live to the music — no laptop, no DAW, no light operator.
Beat detection, drop/riser prediction, a curated-palette show director, and a
mobile web UI, all running on the Pi itself.

> **Hobby project? You're welcome here.** This is free to build and run for any
> **noncommercial** use — see [Highlights & full docs »](pi-dmx/README.md)
> (also in [🇸🇪 svenska](pi-dmx/README.sv.md)).

**Keywords:** Raspberry Pi · Pi Zero 2 W · DMX-512 · audio reactive · music
visualization · sound-to-light · LED PAR · stage lighting · real-time · low
latency · TypeScript · C · SCHED_FIFO · Codec Zero.

## What makes it special

- **Sub-frame realtime on a tiny Pi** — a dedicated C sidecar owns the UART on
  an *isolated CPU core* (`isolcpus=3`, `SCHED_FIFO`, `mlockall()`), so DMX
  timing never jitters. Light-follows-music latency: **~40–80 ms**.
- **A show director, not a VU meter** — local BPM detection (phase-locked to
  real kicks), energy tiering, riser/drop prediction, and a phrase engine that
  changes colour on musical boundaries. It feels *programmed to the track*.
- **Modular effects** — each effect is one small file; a registry derives the
  mode list, smart-mode pools, and the whole UI from one source of truth.
- **Built for rental** — crash-safe config, an owner-only setup page, a health
  watchdog, and self-healing audio capture.

👉 **Full documentation, wiring, and install:** **[pi-dmx/README.md](pi-dmx/README.md)**

## Repository layout

| Path | What it is |
|---|---|
| [`pi-dmx/`](pi-dmx/) | The lighting system — C DMX sidecar + Node/TypeScript audio & effect engine + mobile web UI. **Start here.** |
| `src/` | Web app (Vite + React + Tailwind). |

## License

Free for **noncommercial use** (personal, hobby, research, education) under the
**PolyForm Noncommercial License 1.0.0** — see [LICENSE.md](LICENSE.md).
Commercial use (renting, reselling, paid products) needs a separate license:
**raager.rd@gmail.com**.
