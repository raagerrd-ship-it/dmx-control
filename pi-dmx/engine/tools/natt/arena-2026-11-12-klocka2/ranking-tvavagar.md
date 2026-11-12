# Ranking klocka2 - analysatorns två vägar (tools/arena/tvavagar.py, mot bas)

poäng = 0.6 x långsamma (medel av 18 mått, % mot bas, +-100 %) + 0.4 x latens (cpu ingen poäng; Pi-budget: worker <= 130 us/hop) + bonus. bas: cpu 56.60 us/hop (cpu % = kvoten mot engine/dist i samma mätning, ABBA; bruset bas mot bas 1.24 %), latens 85 ms, worker p99 5 hop -> X = 6

| plats | deltagare | poäng | långsamma % | snabba % | cpu % | latens % | bonus | cpu us/hop | latens ms | p99 hop | md5 | ljusdomare | DISK |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | k2b | +2.61 | +0.43 | +5.88 | -1.28 | +5.88 | 0 | 54.51 | 80 | 5 | skiljer | +4.2 | - |
| 2 | k1 | -0.08 | -0.14 | +0.00 | +2.94 | +0.00 | 0 | 46.87 | 85 | 5 | skiljer | +1.5 | - |
| 3 | k5 | -0.22 | -0.36 | +0.00 | +3.81 | +0.00 | 0 | 52.78 | 85 | 5 | skiljer | +2.1 | - |
| 4 | k2c | +2.47 | +0.19 | +5.88 | -2.40 | +5.88 | 0 | 44.44 | 80 | 5 | skiljer | +4.4 | ljusdomaren: lampspr medel -6.4 % (-17.5/-1.8/+0.0) |
| 5 | k4b | +0.90 | -2.41 | +5.88 | +2.53 | +5.88 | 0 | 53.13 | 80 | 6 | skiljer | +5.8 | ljusdomaren: lampspr medel -6.7 % (-9.0/-7.4/-3.8) |

## Måtten (% mot bas, + = bättre; bas-värdet i rubriken)

| deltagare | mix_klocka (97.88) | mix_las (2.78) | mix_hopp (0.00) | mix_still (2.93) | klipp_klocka (98.32) | ettan (100.00) | grid40 (53.38) | gridfel (20.00) | upp_s (1.70) | ned_s (2.10) | traff (93.33) | korta (33.94) | bygg (0.20) | drop_traff (100.00) | drop_falska (0.00) | drop_ms (216.00) | gr_ratt (73.33) | gr_falska (0.00) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| k2b | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | -0.6 | +4.5 | +0.0 | +0.0 | +0.0 | +3.7 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 |
| k1 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | -0.5 | +2.0 | +0.0 | +0.0 | +0.0 | -4.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 |
| k5 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | -0.5 | +0.0 | +0.0 | +0.0 | +0.0 | -6.1 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 |
| k2c | +0.1 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | -0.5 | +6.0 | +0.0 | +0.0 | +0.0 | -2.1 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 |
| k4b | +0.1 | +0.0 | -26.0 | -7.3 | +0.3 | -1.4 | -1.2 | -10.0 | -5.9 | +2.4 | +0.0 | +5.6 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 |
