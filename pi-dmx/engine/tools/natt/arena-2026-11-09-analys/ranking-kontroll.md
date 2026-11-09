# Ranking analys - analysatorns två vägar KONTROLLMÄNGDEN (tools/arena/tvavagar.py, mot bas)

poäng = 0.6 x långsamma (medel av 17 mått, % mot bas, +-100 %) + 0.4 x latens (cpu ingen poäng; Pi-budget: worker <= 130 us/hop) + bonus. bas: cpu 58.67 us/hop (cpu % = kvoten mot engine/dist i samma mätning, ABBA; bruset bas mot bas 1.77 %), latens 90 ms, worker p99 6 hop -> X = 7

| plats | deltagare | poäng | långsamma % | snabba % | cpu % | latens % | bonus | cpu us/hop | latens ms | p99 hop | md5 | ljusdomare | DISK |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | d-tyst | +0.15 | +0.24 | +0.00 | +4.46 | +0.00 | 0 | 44.80 | 90 | 6 | skiljer | +4.3 | - |
| 2 | r0 | +0.15 | +0.24 | +0.00 | +4.40 | +0.00 | 0 | 45.16 | 90 | 6 | skiljer | +4.3 | - |
| 3 | d-drop | +0.00 | +0.00 | +0.00 | +4.49 | +0.00 | 0 | 44.42 | 90 | 6 | skiljer | -0.0 | - |

## Måtten (% mot bas, + = bättre; bas-värdet i rubriken)

| deltagare | mix_klocka (82.42) | mix_las (2.82) | mix_hopp (0.73) | mix_still (2.91) | klipp_klocka (84.31) | ettan (96.08) | grid40 (78.66) | gridfel (8.20) | upp_s (-0.65) | ned_s (0.30) | traff (100.00) | korta (25.40) | drop_traff (100.00) | drop_falska (0.87) | drop_ms (141.00) | gr_ratt (57.14) | gr_falska (0.48) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| d-tyst | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | -0.6 | +0.0 | +0.0 | +0.0 | +4.7 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 |
| r0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | -0.6 | +0.0 | +0.0 | +0.0 | +4.7 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 |
| d-drop | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 |
