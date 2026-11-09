# Ranking klocka - analysatorns två vägar KONTROLLMÄNGDEN (tools/arena/tvavagar.py, mot bas)

poäng = 0.6 x långsamma (medel av 17 mått, % mot bas, +-100 %) + 0.4 x latens (cpu ingen poäng; Pi-budget: worker <= 130 us/hop) + bonus. bas: cpu 58.67 us/hop (cpu % = kvoten mot engine/dist i samma mätning, ABBA; bruset bas mot bas 1.77 %), latens 90 ms, worker p99 6 hop -> X = 7

| plats | deltagare | poäng | långsamma % | snabba % | cpu % | latens % | bonus | cpu us/hop | latens ms | p99 hop | md5 | ljusdomare | DISK |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | a3f | +0.00 | +0.00 | +0.00 | -7.81 | +0.00 | 0 | 47.91 | 90 | 6 | lika |  | - |
| 2 | vin | +0.00 | +0.00 | +0.00 | +2.58 | +0.00 | 0 | 52.09 | 90 | 6 | lika |  | - |
| 3 | r0 | -5.22 | -8.69 | +0.00 | -3.32 | +0.00 | 0 | 53.82 | 90 | 9 | skiljer | +1.7 | upp_s -0.30 s > bas -0.65 s; ned_s 2.55 s > bas 0.30 s |

## Måtten (% mot bas, + = bättre; bas-värdet i rubriken)

| deltagare | mix_klocka (82.42) | mix_las (2.82) | mix_hopp (0.73) | mix_still (2.91) | klipp_klocka (84.31) | ettan (96.08) | grid40 (78.66) | gridfel (8.20) | upp_s (-0.65) | ned_s (0.30) | traff (100.00) | korta (25.40) | drop_traff (100.00) | drop_falska (0.87) | drop_ms (141.00) | gr_ratt (57.14) | gr_falska (0.48) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| a3f | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 |
| vin | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 |
| r0 | +0.0 | +0.0 | +14.3 | +0.0 | -0.2 | +0.0 | -0.4 | -6.1 | -53.8 | -100.0 | +0.0 | -1.6 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 |
