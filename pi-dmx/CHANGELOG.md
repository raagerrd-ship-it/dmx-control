# Ändringslogg

## v0.2.2 — grannrättning + reproducerbar bänk

- **Grannrättning av tidigt lås**: ett lås från 0,5 s-fönstret kunde hamna 10–20 % fel (t.ex. 122 mot 136) och satt kvar hela låten — glid-bandet slutar vid ±11 % och oktav-grenen börjar vid 1,4×, felet låg i ett dödområde. Nu räknas ~2 s bevis före commit, med samma tre skydd som låtbytesvägen: sammanhållen utmanare (±4 %), konfidensgolv 0,75 och tömd medianhistorik vid omlåsning. Committade lås rörs inte.
- **Bänken mäter över flera brus-seeder** (`SEEDS=8`, median + min–max) och markerar när låstiden träffar 500 ms-golvet (= första möjliga anrop, inte en mätning) samt seeder som aldrig låser.
- Mätning: brusigt rum 136 gick från 1/8 seeder helt fel (0 % rätt hela låten) till 8/8 rätt (den svåra seeden låser på 2,5 s). Övriga scenarier oförändrade; 19–24 µs/hop.

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
