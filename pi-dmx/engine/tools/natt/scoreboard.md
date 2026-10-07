# DMX natt-scoreboard

En rad per korning av tools/natt.py. Mixar = pop/megamix i full langd (lookar/drops bor har), korpus = frozen6 (222 klipp a 40 s, bara kick/energi/farg). Jamfor bara mot rader med samma git-standard, aldrig mot taggade A/B-rader.

**Bank v2 fran 2026-10-07:** showTight kor index.ts:s latgrans-sidokedja (tempovaxling/karaktar/grans; matfalla 34) och korpusen nivaanpassas till ladans aux-niva (--norm -3.5; matfalla 35, frozen6 ligger ~28 dB under). Jamfor fran och med raden `v2-norm` - raderna fore ar bank v1.

| datum | git | tag | pop kick->ljus/traff | pop r energi | pop byten/min musik% | pop alla3/lampspr | pop lookar/langst | pop morkt | mega kick->ljus/traff | mega r | mega byten/min musik% | mega alla3/lampspr | mega lookar/langst | mega morkt | mega drops lugna/hoga | korpus n | k kick->ljus/traff | k r | k alla3/matt | k morkt | aldrig valda |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-10-06 | f7cfa11 | - | 125/0.51 | 0.29 | 5.4 100% | 0.13/30 | 29/37 s | 0.16 | 150/0.52 | 0.04 | 6.0 100% | 0.18/41 | 29/19 s | 0.15 | 11/18 | 222 | 150/0.37 | -0.17 | 0.04/1 | 0.24 | 10 |
| 2026-10-06 | f7cfa11 | kontroll | 125/0.51 | 0.29 | 5.4 100% | 0.13/30 | 29/37 s | 0.16 | 150/0.52 | 0.04 | 6.0 100% | 0.18/41 | 29/19 s | 0.15 | 11/18 | - | -/- | - | -/- | - | 10 |
| 2026-10-07 | 6dc9123 | - | 125/0.51 | 0.29 | 5.4 100% | 0.13/30 | 29/37 s | 0.16 | 150/0.52 | 0.04 | 6.0 100% | 0.18/41 | 29/19 s | 0.15 | 11/18 | 222 | 150/0.37 | -0.17 | 0.04/1 | 0.24 | 10 |
| 2026-10-07 | e2ecac8 | v2 | 125/0.53 | 0.26 | 5.1 100% | 0.10/25 | 28/39 s | 0.17 | 150/0.52 | 0.12 | 5.7 100% | 0.18/39 | 27/24 s | 0.15 | 13/14 | 222 | 150/0.37 | -0.17 | 0.04/1 | 0.24 | 10 |
| 2026-10-07 | e2ecac8 | v2-norm | 125/0.53 | 0.26 | 5.1 100% | 0.10/25 | 28/39 s | 0.17 | 150/0.52 | 0.12 | 5.7 100% | 0.18/39 | 27/24 s | 0.15 | 13/14 | 222 | 150/0.54 | 0.43 | 0.09/1 | 0.01 | 10 |
