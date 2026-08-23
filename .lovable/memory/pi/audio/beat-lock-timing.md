---
name: Beat-lås: kickAtMs, taktfas och omlåsning
description: PLL:en mäter fasfel mot frame.kickAtMs (sub-hop), taktfasen (ettan) flyttar ankaret hela slag, tempolåset nollas vid bekräftad låtgräns
type: feature
---

**kickAtMs (analyser.ts → index.ts):** `frame.kickAtMs > 0` = ett slag är färdigmätt DENNA ruta, väggklocka för flux-toppen med parabolisk sub-hop-precision (±1.3 ms). Kommer EN hop efter `frame.kick` (parabeln behöver hoppet efter toppen). PLL:en i `index.ts` får bara mäta fasfel mot detta — `Date.now()` vid rutans behandling bär ALSA-leveransens batch-jitter (flera hops i en klump).

**Taktfas / ettan:** `barAcc[4]` i analysatorn bokför varje slags **kickFlux²** på sin plats mod 4 mot `cfg.beat`-gridet (glömska ×0.997/slag). Vikt måste vara slagets EGEN anslagsstyrka — bandenergin (`engSmooth`) är utjämnad över ~100 ms och gav alla fyra platser samma vikt (MÄTT 2026-08-23), och kvoten flux/tröskel mättade mot klampen. `frame.barShift` = vinnande plats när ≥16 slag bokförts och marginalen > 1.35×, annars −1. Motorn äger ankaret: `anchorMs += barShift * beatMs` (hela slag ⇒ fasen inom takten orörd) + `analyser.resetBar()`. Görs inte när tempot är låst ur låtminnet.

**bpmConfidence:** tidsbaserad alpha (tau 25 ms upp / 120 ms ner). Fasta 0.35/0.08 per `computeBpm()` gav 5× olika hastighet olåst (100 Hz) mot låst (20 Hz, adaptiv stride) — och konfidensen grindar kick-gridet (>0.5), PLL-frekvenstermen (>0.4) och hjärtslagets djup.

**Omlåsning:** `analyser.resetTempo()` anropas när `songs.boundaryCount` tickar (bekräftad låtgräns) → medianfönster + tempogram nollas, första estimatet låser direkt. Utan minnesstöd styr dominansgrinden: rival >2.5× ⇒ 8 röster (~2 s), >1.6× ⇒ 24, annars 100.

**Testbänk:** `tools/testDownbeat.mjs` (medvetet en takt fel start ⇒ ska rättas), `testBpmHard.mjs`, `testSongMemory.mjs`, `testSeekLocked.mjs`.

## Coast vid svag konfidens (2026-08-23)
`cfg.beat.confidence` uppdateras nu VARJE ruta i index.ts (tidigare bara vid låsning).
Hysteres: stark takt ≥0.35 nollar coast; under MIN_BEAT_CONFIDENCE (0.20) hålls gridet
fri-rullande i 4 s (fasen bevaras → effekter glider inte). Håller svagheten i sig
släpps gridet och `analyser.resetTempo()` körs → nytt lås på ~0,5 s. Minneslåst tempo
(memoryBeatLocked) undantas alltid.
