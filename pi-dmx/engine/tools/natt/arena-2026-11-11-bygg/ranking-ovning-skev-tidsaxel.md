# Ranking bygg - analysatorns två vägar (tools/arena/tvavagar.py, mot bas)

poäng = 0.6 x långsamma (medel av 18 mått, % mot bas, +-100 %) + 0.4 x latens (cpu ingen poäng; Pi-budget: worker <= 130 us/hop) + bonus. bas: cpu 42.38 us/hop (cpu % = kvoten mot engine/dist i samma mätning, ABBA; bruset bas mot bas 3.15 %), latens 80 ms, worker p99 5 hop -> X = 6

| plats | deltagare | poäng | långsamma % | snabba % | cpu % | latens % | bonus | cpu us/hop | latens ms | p99 hop | md5 | ljusdomare | DISK |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | b3 | +8.09 | +13.48 | +0.00 | +0.00 | +0.00 | 0 | 46.18 | 80 | 5 | skiljer | +1.4 | - |
| 2 | b4 | +7.56 | +12.59 | +0.00 | +4.42 | +0.00 | 0 | 52.78 | 80 | 5 | skiljer | -0.0 | - |
| 3 | kopia | +0.00 | +0.00 | +0.00 | -3.38 | +0.00 | 0 | 43.76 | 80 | 5 | lika |  | - |
| 4 | b1 | +7.80 | +13.00 | +0.00 | +5.07 | +0.00 | 0 | 51.73 | 80 | 5 | skiljer | -4.5 | ljusdomaren -4.5 < -0.5 |
| 5 | b2 | +7.72 | +12.86 | +0.00 | +0.74 | +0.00 | 0 | 45.82 | 80 | 5 | skiljer | -6.5 | ljusdomaren -6.5 < -0.5 |

## Måtten (% mot bas, + = bättre; bas-värdet i rubriken)

| deltagare | mix_klocka (97.88) | mix_las (2.78) | mix_hopp (0.00) | mix_still (2.93) | klipp_klocka (98.32) | ettan (100.00) | grid40 (53.38) | gridfel (20.00) | upp_s (15.35) | ned_s (2.65) | traff (75.00) | korta (34.04) | bygg (1.38) | drop_traff (100.00) | drop_falska (0.00) | drop_ms (216.00) | gr_ratt (73.33) | gr_falska (0.00) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| b3 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +93.5 | +81.1 | +25.5 | -50.4 | +93.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 |
| b4 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +99.0 | +58.5 | +33.3 | -31.3 | +67.2 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 |
| kopia | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 |
| b1 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +100.0 | +66.0 | +33.3 | -25.9 | +60.6 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 |
| b2 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +76.5 | +60.4 | +33.3 | -38.7 | +100.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 |
