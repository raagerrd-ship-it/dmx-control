---
name: Energistyrd halvering av presentationstakten
description: Pulsen halveras även i måttligt tempo när frame.intensity (8 s-EMA) är låg; BPM-regeln 135 har företräde, min-hold 10 s
type: feature
---
Portad från Lotus `energySubdiv` (2026-08-31), i `pi-dmx/engine/src/effects.ts`:

- Signalen är `frame.intensity` — sektionsenergi RELATIVT låtens eget snitt — utjämnad
  med τ 8 s (`SUBDIV_ENERGY_TAU_MS`). En FAST nivå-tröskel går inte: materialets nivå
  vandrar (MÄTT i Lotus: median 0.480 → 0.232 mellan låtar).
- Trösklar: halvera under 0.30, släpp över 0.42 (`SUBDIV_ENERGY_LO_ON/OFF`).
- **BPM-regeln (`PULSE_HALVE_ABOVE_BPM` 135 ± 15) är AUKTORITATIV.** Energin får bara
  bestämma utanför dess hysteresband. Lotus lät de två blocken vara oberoende → energin
  skrev över takt-beslutet och pulsen blev en fyrkantsvåg (2.30 ↔ 1.15 Hz var 12:e sekund).
- `SUBDIV_MIN_HOLD_MS = 10000` mellan byten — utan hold flappar gränsen.
- Analysen, taktklockan, `beatTick` och grid-effekterna är ORÖRDA. Bara pulsens form
  sträcks över två slag.
- Lotus `beatDoubleBelowBpm` (dubbla under 105) är PROVAT OCH FÖRKASTAT där (fladdrade
  kring tröskeln i lugna partier) — porta den inte.
- Bänk: `tools/testPulseHalve.mjs` (118 BPM med energi 0.10 → halverad, 0.85 → full).
