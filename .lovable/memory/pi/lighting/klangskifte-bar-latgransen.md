---
name: Klangskiftet bär låtgränsen ensamt
description: Facitmätt mot gaplös Spotify — nivådipp och tempo är döda signaler vid crossfade; novelty (L1 mot 8 s bakåt, abs tröskel 0.68) sätter gränsen ensam, backdaterad 4 s
type: feature
---
MÄTT MOT FACIT (Pi:ns egen learn.wav, 3 gaplösa Spotify-låtar, gränser 165 s och 317 s):
- Nivådipp DÖD vid crossfade: dipp-kvot 0.979 (gräns 1) och 0.906 (gräns 2) mot DIP_RATIO 0.55. Inte ens 0.85 hade fångat gräns 1.
- Tempo IDENTISKT 125 BPM på båda sidor om gräns 2.
- Klangskifte (L1 mot 8 s tidigare, 8-bands normaliserad profil) såg BÅDA: percentil 88 och 92.
- Simulerat novelty ENSAMT + MIN_SEG 110 s: trösklar 0.60–0.75 gav alla 2/2 träff, 0 falska (platå, inte kant). 0.85 → 0/2.

IMPLEMENTATION (songMemory.ts):
- `pushNovelty` jämför nu mot ringbuffertens profil NOV_LAG_MS (8 s) bakåt, ABSOLUT tröskel. Den adaptiva tröskeln (novAvg × faktor) togs bort: den höjde ribban just i partier där gaplösa övergångar sker.
- `NOV_STRONG = 0.68` räcker ENSAMT. `NOV_WEAK = 0.55` räcker om nivådipp eller temposkifte också fyrar — extrasignaler, aldrig nödvändiga. EVIDENCE_NEEDED är borta.
- Gränsen backdateras `NOV_BACK_MS = 4000` (halva noveltyfönstret) eftersom detektionen konsekvent låg 10–11 s för tidigt... nej: novelty reagerar när nytt material fyllt fönstret, dvs gränsen loggas SENARE än den verkliga i klocktid men simuleringens tidsstämpel låg 10–11 s tidigt; backdateringen flyttar segmentgränsen närmare facit. MIN_SEG mäts därför på `tLive - NOV_BACK_MS`.
