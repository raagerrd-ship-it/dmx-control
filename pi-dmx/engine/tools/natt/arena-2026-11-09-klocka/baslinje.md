# Baslinje EN KLOCKA FÖR BÅDA (11-09)
DMX (tvavagar.py, bas = HEAD = B): se bas/tvavagar.json (mix_klocka 97,24, mix_las 2,48, ettan 100, gridfel 21,4, upp_s 1,35, ned_s 3,00, latens 80).
LOTUS (lotusbank.py, 503 fryst korpus + syntet, lotus LIVE-env, ~9,7 min/körning):
| mått | A lotus nu (--bas) | B klockan inline (--bas --beat-feed inline) | B med klockans fas (--fas klocka) |
|---|---|---|---|
| korpus rätt | 396/503 | 441/503 | 441/503 |
| klasser | 3/2 16, 4/3 14, 2/3 10, 3/4 24, halva 1, annat 42 | 3/2 7, 4/3 22, dubbla 24, annat 9 | lika |
| syntet | 6/8 | 5/8 (swing 100 -> 149,8) | 5/8 |
| kick recall/prec | 0,80/0,86 | 0,80/0,86 | 0,80/0,86 |
| on-beat-recall | 0,84 | 0,84 | 0,84 |
| fas median / motfas / i fas (n) | 0,88 / 33 / 238 (399) | 0,81 / 24 / 237 (453) | 0,82 / 21 / 248 (452) |
| fas mot Beat This! | 0,89 | 0,81 | 0,82 |
| följarens råa puls on-beat (|offset|) | 0,90 (36 ms) | 0,94 (42 ms) | 0,95 (24 ms) |
| tempospridning inom låt (median) | 9 BPM | 33 BPM | 33 BPM |
OBS (lotusbank-agenten): med BEAT_FEED inline kommer frame.bpm/bpmConfidence från klockan men frame.beatAnchorMs är analysatorns senaste kick;
klockans rutnät finns i an.clockOut.beat (publishClock). Bänkens fas läser frame.beatPhaseMs (analysatorns egen gridfas) - '--fas klocka' mäter klockans.
Bänken behöver Date.now virtuell (benchEntry.mjs, lotusbank bygger den).
