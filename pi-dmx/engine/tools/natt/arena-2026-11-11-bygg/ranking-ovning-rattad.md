# Ranking bygg - analysatorns två vägar (tools/arena/tvavagar.py, mot bas)

poäng = 0.6 x långsamma (medel av 18 mått, % mot bas, +-100 %) + 0.4 x latens (cpu ingen poäng; Pi-budget: worker <= 130 us/hop) + bonus. bas: cpu 42.71 us/hop (cpu % = kvoten mot engine/dist i samma mätning, ABBA; bruset bas mot bas 2.33 %), latens 80 ms, worker p99 5 hop -> X = 6

| plats | deltagare | poäng | långsamma % | snabba % | cpu % | latens % | bonus | cpu us/hop | latens ms | p99 hop | md5 | ljusdomare | DISK |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | b4 | +8.81 | +14.69 | +0.00 | +2.28 | +0.00 | 0 | 43.76 | 80 | 5 | skiljer | -0.0 | - |
| 2 | b3 | +5.46 | +9.10 | +0.00 | -1.55 | +0.00 | 0 | 44.44 | 80 | 5 | skiljer | +1.4 | - |
| 3 | b1 | +8.34 | +13.91 | +0.00 | +5.07 | +0.00 | 0 | 51.73 | 80 | 5 | skiljer | -4.5 | ljusdomaren -4.5 < -0.5 |
| 4 | b2 | +7.77 | +12.95 | +0.00 | +0.74 | +0.00 | 0 | 45.82 | 80 | 5 | skiljer | -6.5 | ljusdomaren -6.5 < -0.5 |
| 5 | kopia | +1.19 | +1.99 | +0.00 | -3.38 | +0.00 | 0 | 43.76 | 80 | 5 | lika |  | upp_s 15.35 s > bas 12.75 s |

## Måtten (% mot bas, + = bättre; bas-värdet i rubriken)

| deltagare | mix_klocka (97.88) | mix_las (2.78) | mix_hopp (0.00) | mix_still (2.93) | klipp_klocka (98.32) | ettan (100.00) | grid40 (53.38) | gridfel (20.00) | upp_s (12.75) | ned_s (6.00) | traff (75.86) | korta (30.85) | bygg (0.20) | drop_traff (100.00) | drop_falska (0.00) | drop_ms (216.00) | gr_ratt (73.33) | gr_falska (0.00) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| b4 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +89.0 | +80.8 | +31.8 | -37.3 | +100.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 |
| b3 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +85.9 | +61.7 | +27.4 | -60.8 | +49.7 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 |
| b1 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +100.0 | +85.0 | +31.8 | -38.9 | +72.4 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 |
| b2 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +71.8 | +82.5 | +31.8 | -53.1 | +100.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 |
| kopia | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | -20.4 | +55.8 | -1.1 | -10.3 | +11.8 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 |
