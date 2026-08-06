---
name: Tvättad show (sidecar v2)
description: Offline-tvättens v2-fält (normaliserad intensitet, risers, sektioner, frasgrid, graderad dropstyrka) och hur motorn använder dem
type: feature
---
Sidecar från `tools/refineSong.mjs` är `v: 2` (motorn läser även v1):
- `intensity` — 1 värde/s, 0–255, sträckt mellan p5 och p95 (full dynamik), glättad EFTER sträckningen.
- `drops[].s` — graderad relativt låtens egna lyft (p10..p90 → 0.35..1.0), inte absolut nivå.
- `risers[{start,end,drop}]` — uppbyggnad med KÄNT mål; start = kroppens lägsta punkt inom 30 s före dropen.
- `sections[ms]` — L1-novelty mellan klangprofiler per 1,5 s, topp > snitt+2σ, minst 8 s isär.
- `phrase{barMs,p8,p16,p32}` — frasgrid, fas = `beatPhaseMs`.

Motorn (bara IGENKÄNDA låtar):
- `songMemory.replayCues()` (muterat objekt, ingen allokering på ljudvägen) → `{build, ceiling, section, phrase, hasGrid}`.
- `effects.memCeiling` ersätter live-VU:ns ljustak (VU:n fladdrade vid höga nivåer). Golv 0.20, drop bypassar. Gäller även när `cfg.energyCeiling` är av.
- Riser-ramp skrivs in som `frame.buildUp`/`frame.inRiser` → når 1.0 exakt på dropen.
- Dirigenten byter effekt på sektionsgräns; med grid väntar dwell-timern in nästa sektion/fras (max 20 s extra).

Nya SongMeta-fält är valfria och ligger i meta-JSON:en → `songs.bin` behövde ingen ny MAGIC.
