# Ändringslogg

## v0.2.1 — analysator-städning

- **Grid-coasting**: beat-rutnätet frilöper i 4 s vid låg konfidens i stället för att glida/hoppa; auto-omlås därefter.
- **Crossfade-omlås**: tidsbaserad bevisföring (1,5 s vid dominant rival, 4 s vid stark, annars 25 s) + hälsogrind mot falska omlås i breakdowns.
- **Precision-PLL**: kick-tidsstämpel (sub-hop parabolisk fluxtopp) tar bort ALSA-batchningens ~8 ms jitter.
- **Taktfas (downbeat)**: `beatIdx = 0` landar på musikens etta.
- **Snabb omlåsning** vid låtgräns från låtminnet (~0,5 s).
- Död kod borta: `bodyZoneState`, `breakAtMs`/`breakHoldMs`, drop-debugglogg, `frame.mid`/`frame.treble`/`levelRaw` (effekter använder `spec.mid`/`spec.treble`).
- Prestanda: förberäknad `hopMs`/`dtHop`, parabolisk BPM-topp läser `acScratch` (−3 O(N)-loopar per anrop), `barShift` bara vid bokfört slag.
- Mätning: breakdown 142 BPM 82 % → 100 % rätt; lås 499–669 ms; 20–55 µs/hop.

## v0.2.0

- Låtminne, replay-ljusshow, Regi-flaggor, beat-synk-lägen, wizard, export/import, watchdog, typskylt.
