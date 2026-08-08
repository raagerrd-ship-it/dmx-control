# Writing an effect

An effect is a **pure function of one lamp**:

```ts
render(c: EffectContext): [number, number, number]   // → [r, g, b], each 0..1
```

The engine calls it once per lamp, per frame (~50 Hz), and does *everything else*
around it — master brightness, the heartbeat pulse, the VU ceiling, ballistics,
drop bloom, the ambient idle glow, gamma, and the DMX wire. **Your effect decides
the colour and per-lamp shape of one lamp**, and may *ask* for special fixtures
(see below). Don't apply master volume, don't cap brightness to the audio level,
don't gamma-correct — that's all done downstream (see *What the engine does after
you* below).

## Asking for special fixtures

Colour comes back as your return value. Everything else — strobe, blinder, UV,
laser, hazer, CO₂ and fog — is requested through `c.want`:

```ts
render(c) {
  if (c.dropEnv > 0.8) c.want.strobe = 1;        // 0..1, scaled to DMX by the engine
  if (c.beatIdx % 32 === 0) c.want.fog = true;   // boolean: "now would be a good moment"
  c.want.uv = c.buildUp;                          // ramp UV with the build-up
  return c.hsv(hue, 1, v);                        // r, g, b as always
}
```

`c.want` is `{ strobe?, blinder?, uv?, laser?, hazer?, co2? }` in **0..1**, plus
`fog?: boolean`. It is cleared before every lamp, so set it fresh each frame.

**You are expressing a wish, not writing a channel.** Two rules always hold:

* **Your effect must declare the role, and the rig must have the fixture.** The
  `drives` tag lives in the `SPECIALTY_DRIVES` table in `registry.ts` — *not* in
  your effect file. If your effect sets `c.want.strobe` but isn't listed there
  for `"strobe"`, the request is **silently ignored**. Add the role to that table
  when you add a `want`, or nothing will happen. Asking for a laser on a rig
  without one also does nothing — you can never write to a channel that isn't
  there. (`c.want.fog` is the exception: the fogger is one machine on its own
  address, not a per-fixture role, so it needs no `drives` tag.)
* **Fog goes through hardware protection.** The output service owns a thermal
  budget (~45 s of spraying per the datasheet), a cooldown between bursts, and an
  emergency stop mid-burst. `c.want.fog = true` may therefore be declined, and
  that is correct behaviour — never try to work around it.

The strongest wish across all lamps wins: if your effect asks for strobe on one
lamp, it means the rig's strobe. Requests are combined with the engine's own
value via `Math.max`, so you can only ever *add* intensity, never dim what the
director already decided.

Effects that set nothing behave exactly as before — `want` is entirely optional.

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

### Special fixtures (write, don't read)
| Field | Range | Meaning |
|---|---|---|
| `c.want.strobe` | 0..1 | Ask for strobe. Combined with the engine's own via `Math.max`. |
| `c.want.blinder` | 0..1 | Ask for blinder. |
| `c.want.uv` | 0..1 | Ask for UV. |
| `c.want.laser` | 0..1 | Ask for laser. |
| `c.want.hazer` | 0..1 | Ask for haze. |
| `c.want.co2` | 0..1 | Ask for CO₂. |
| `c.want.fog` | bool | "Now would be a good moment for a burst." May be declined by the thermal budget. |

Cleared before every lamp — set it fresh each frame. Ignored unless the rig
actually has that fixture. See *Asking for special fixtures* at the top.

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

In order, on top of your `[r,g,b]`. **The order is measured, not arbitrary** — it
was rebuilt on 2026-08-07 after the heartbeat turned out never to reach the lamps.

1. **Bloom / drop blend** — on a bass punch or drop the colour is pushed to full.
2. **`× md`** — master · silence-gate · bass-punch · riser/drop boost · micro-strobe.
   (The heartbeat is *not* here any more; see step 6.)
3. **Ambient idle glow** added when the music stops (owner toggle).
4. **Colour → channels** (`output.ts`): RGBW split, `dim` handling, **gamma 2.2 → 0–255**.
5. **Output ballistics** — soft attack (90 ms) + peak-hold decay. This cleans up the
   *effects'* own jitter. It runs before the ceiling and the pulse so it can never
   smear either of them.
6. **VU ceiling** — the final brightness, taken from the **input level normalised
   against a rolling p5–p95 window** (not the raw level: a compressed track has a
   narrow span, so the gain is capped at 2×). A drop bypasses it. *This is why you
   must NOT scale brightness to the audio level yourself.*
7. **Heartbeat** — attack/decay per beat, scaled with tempo, applied **last of all**
   and outside the ballistics. A drop bypasses it too. Put it before the ballistics
   and its 121 ms decay gets smeared by the output's 0.42 s — measured: the DMX
   output then showed no periodicity at the beat at all.
8. **Calibration** — per-channel on-threshold and the master output cap.

**Rules of thumb**
- One lamp at a time; key everything off `c.idx` / `c.count` so you scale to any
  fixture count (`rave`/`flip`/`gallop` split by parity `idx % 2`; `ripple`
  splits by distance from centre; `bounce`/`sweep` use `count` for the span).
- No allocations in the hot path beyond the returned array.
- Change colour on `c.mclk(...)` or `c.beatIdx`, not on wall-time, so it lands
  musically.
- Multiply per-lamp phase offsets by `c.phaseSpread` to get the pre-drop
  "tear-apart" for free.
