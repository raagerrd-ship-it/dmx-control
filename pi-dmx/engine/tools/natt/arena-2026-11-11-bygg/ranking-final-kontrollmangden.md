# Ranking bygg - analysatorns två vägar KONTROLLMÄNGDEN (tools/arena/tvavagar.py, mot bas)

poäng = 0.6 x långsamma (medel av 18 mått, % mot bas, +-100 %) + 0.4 x latens (cpu ingen poäng; Pi-budget: worker <= 130 us/hop) + bonus. bas: cpu 44.11 us/hop (cpu % = kvoten mot engine/dist i samma mätning, ABBA; bruset bas mot bas 3.77 %), latens 90 ms, worker p99 5 hop -> X = 6

| plats | deltagare | poäng | långsamma % | snabba % | cpu % | latens % | bonus | cpu us/hop | latens ms | p99 hop | md5 | ljusdomare | DISK |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | b4 | +15.29 | +10.67 | +22.22 | +2.90 | +22.22 | 0 | 45.16 | 70 | 5 | skiljer | +0.3 | ljusdomaren: lampspr medel -20.6 % (-9.9/-13.7/-38.1); lampspr lang1011 -38.1 % (< -20 %) |
| 2 | b3 | +9.07 | +4.01 | +16.67 | -0.79 | +16.67 | 0 | 46.18 | 75 | 5 | skiljer | -1.4 | ljusdomaren -1.4 < -0.5 |

## Måtten (% mot bas, + = bättre; bas-värdet i rubriken)

| deltagare | mix_klocka (83.41) | mix_las (3.02) | mix_hopp (0.67) | mix_still (3.72) | klipp_klocka (85.78) | ettan (96.08) | grid40 (78.91) | gridfel (7.80) | upp_s (3.30) | ned_s (6.80) | traff (71.43) | korta (19.05) | bygg (-0.22) | drop_traff (100.00) | drop_falska (0.87) | drop_ms (141.00) | gr_ratt (57.14) | gr_falska (0.48) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| b4 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +68.2 | +83.8 | +40.0 | -100.0 | +100.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 |
| b3 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +50.0 | +69.1 | +40.0 | -100.0 | +13.1 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 |
