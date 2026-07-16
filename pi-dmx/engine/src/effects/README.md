# Writing an effect

An effect is a **pure function of one lamp**:

```ts
render(c: EffectContext): [number, number, number]   // → [r, g, b], each 0..1
```

The engine calls it once per lamp, per frame (~50 Hz), and does *everything else*
around it — master brightness, beat pulse, the VU ceiling, ballistics, drop
bloom, fog, the ambient idle glow, gamma, and the DMX wire. **Your effect only
decides the colour and per-lamp shape of one lamp.** Don't apply master volume,
don't cap brightness to the audio level, don't gamma-correct — that's all done
downstream (see *What the engine does after you* below).

Each effect lives in its own file and exports an `EffectDef`:

```ts
// effects/wave.ts
import type { EffectDef } from "./types.js";

export const wave: EffectDef = {
  key: "wave",            // must also be added to the Mode union in ../config.ts
  label: "Våg",           // shown in the mobile UI
  desc: "Flowing colour wave rolling across the rig.",
  tier: "fart",           // smart-mode energy pool: "lugn" | "fart" | "full"
  render: (c) => {
    const base = 0.55 + 0.45 * Math.sin(c.wavePhase - c.idx * 1.3 * c.phaseSpread);
    const hue  = c.mixedSector(c.idx + Math.floor(c.wavePhase * 0.4)) / 6;
    return c.hsv(hue, 1, c.shaped(0.12, base * (0.35 + c.audio * 0.7) + c.frame.treble * 0.35));
  },
};
```

To register it: add the file, one import + one entry in `registry.ts`'s
`EFFECTS` array, and one entry in the `Mode` union in `../config.ts`. The mode
list, smart-mode pools, server validation, and the whole UI are all derived from
the registry — nothing else to touch.

---

## Inputs — the `EffectContext` (`c`)

Built once per frame and reused; `idx` / `fx` / `band` change per lamp.

### This lamp
| Field | Type | Meaning |
|---|---|---|
| `c.idx` | int | This lamp's index, `0 .. count-1` (left → right) |
| `c.count` | int | Total number of lamps |
| `c.fx` | FixtureConfig? | The fixture (name, address, roles, optional `bands`) |
| `c.band` | 0..1 | This lamp's assigned frequency band level (bass/mid/treble/kick/low — from `fx.bands`, else `idx`-cycled). Great for "each lamp breathes with its own slice of the spectrum". |

### Audio & spectrum (`c.frame` + derived)
| Field | Range | Meaning |
|---|---|---|
| `c.frame.level` | 0..1 | **Raw** input level (what the input meter shows). |
| `c.audio` | 0..1 | Level normalised/clipped against the AGC target (hot-driven; saturates near loud). Use for "brightness follows loudness". |
| `c.frame.energy` | 0..1 | Bass band energy |
| `c.frame.mid` | 0..1 | Mid band (vocals/synth/snare) |
| `c.frame.treble` | 0..1 | Treble band (hi-hats/cymbals) |
| `c.frame.centroid` | 0..1 | Spectral centroid: 0 = dark/bassy, 1 = bright/airy |
| `c.frame.flux` | ≥0 | Spectral flux (onset strength) |
| `c.kickEnv` | 0..1 | Kick / beat envelope (decays after each kick; falls back to the BPM grid) |

### Beat & tempo
| Field | Range | Meaning |
|---|---|---|
| `c.beatIdx` | int | Whole-beat counter (from the PLL-locked beat clock) |
| `c.beatFrac` | 0..1 | Phase within the current beat |
| `c.beatPulse` | 0..1 | `(1 - beatFrac)²` — a soft pulse that's 1 on the beat, 0 between |
| `c.hasBeat` | bool | True when a tempo is locked (else silent / free-running) |
| `c.mclk(beats, secs)` | int | Music clock: steps every `beats` beats when locked, else every `secs` seconds. Use it to change colour on musical boundaries instead of on wall-time. |

### Motion & dramaturgy
| Field | Range | Meaning |
|---|---|---|
| `c.t` | seconds | Free-running show-time (accelerates under risers + lurches on bass "acoustic inertia"). Use for sine motion. |
| `c.wavePhase` | radians | Integrated phase for `wave`/`sweep` (speed can vary without the wave jumping) |
| `c.buildUp` | 0..1 | Riser build-up (rises into a drop) |
| `c.phaseSpread` | 1..3.5 | `1 + buildUp·2.5` — multiply per-lamp phase offsets by this so a coordinated wave "tears apart" into chaos just before a drop |
| `c.punchFloor` | 0.08..0.5 | Tempo-adaptive floor (deep punch at slow tempo, shallow at fast) |
| `c.chasePos` | int | The chase head's current lamp index (advances on the beat) |
| `c.dropFired[idx]` `c.dropHue[idx]` `c.now` | — | Per-lamp fire time (in `performance.now()` ms) + hue, for decay-based effects like `drops` (`c.now` is this frame's timestamp) |

### Helpers
| Helper | Returns | Meaning |
|---|---|---|
| `c.mixedSector(n)` | 0..5 | Golden-ratio colour walk mapped into the **active palette**. Divide by 6 for a hue. Colours change palette every musical phrase in smart mode; use this instead of raw hues so effects stay on-palette. |
| `c.hsv(h, s, v)` | [r,g,b] | HSV → RGB. **Hue is snapped to the 6 pure sectors** and saturation to pure/white — physical PARs can't blend hues, so all smoothness must live in `v`. |
| `c.shaped(floor, v)` | 0..1 | Applies the user's Dynamics knob: raises `floor` in quiet passages, gammas the audio-driven part so beats punch. Wrap your brightness in this to respect Dynamics. |

---

## Output — what you return

`[r, g, b]`, each **0..1**. Almost always build it with `c.hsv(hue, 1, v)`:

- **`hue`** = `c.mixedSector(...) / 6` (stay on-palette) — or a fixed hue for a
  signature look (e.g. fire uses `0.015 + 0.11 * ember`). Hues snap to 6 pure
  corners; don't expect smooth colour gradients.
- **`v`** (brightness) is where all your dynamics go — pulse it with
  `beatPulse`, `kickEnv`, `band`, `audio`, sine on `t`, etc.
- **Floors matter for calm effects.** Return `0.3 + 0.7 * m` so a calm mode
  never goes fully dark; leave energetic modes free to hit 0 between beats.

You may also return raw single-channel colours (e.g. `eq` returns `[r,0,0]` for
a pure-red bass lamp) when you want one physical LED group per lamp.

---

## What the engine does *after* you (so you don't)

In order, on top of your `[r,g,b]`:

1. **Bloom / drop blend** — on a bass punch or drop the colour is pushed to full.
2. **`× md`** — master · silence-gate · **beatPulse dip** · bass-punch · riser/drop
   boost · micro-strobe. (So `beatPulse` is *also* applied globally — you can add
   your own on top for a stronger per-effect pulse, or rely on the global one.)
3. **Ambient idle glow** added when the music stops (owner toggle).
4. **Output ballistics** — a peak-hold with tempo/energy-adaptive decay
   (transient-sharpen) smooths the DMX output.
5. **VU ceiling** — the final gain: output brightness = **raw input level**
   (only a drop bypasses it). *This is why you must NOT scale brightness to the
   audio level yourself — it's done here, last.*
6. **Gamma 2.2 → 0–255** per DMX channel; `dim` channel handling for fixtures
   with a separate dimmer.

**Rules of thumb**
- One lamp at a time; key everything off `c.idx` / `c.count` so you scale to any
  fixture count (`rave`/`flip`/`gallop` split by parity `idx % 2`; `ripple`
  splits by distance from centre; `bounce`/`sweep` use `count` for the span).
- No allocations in the hot path beyond the returned array.
- Change colour on `c.mclk(...)` or `c.beatIdx`, not on wall-time, so it lands
  musically.
- Multiply per-lamp phase offsets by `c.phaseSpread` to get the pre-drop
  "tear-apart" for free.
