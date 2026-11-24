"""LJUS PER LOOK OCH NIVÅ (nattagenten 2026-11-24): vilka looker blir mörkare i full än fartens snitt?
Läser showTight --trace-filer (T/LIT/TE/LOOK). Delar i 1 s-block som showTight (tier ur tierEma: <0,30 lugn, <0,63 fart, annars full),
blocket räknas till looken som spelar flest rutor. Första 15 s (uppvärmningen) hoppas över.
  python tools/natt/lookniva.py trace1.json [trace2.json ...]
Skriver per look: sekunder och medelljus i lugn/fart/full, samt fartens och fullens snitt över alla looker."""
import json, sys
from collections import defaultdict

def tier(te): return 0 if te < 0.30 else 1 if te < 0.63 else 2

acc = defaultdict(lambda: [[0.0, 0] for _ in range(3)])   # look -> [ [summa, n] per tier ]
alla = [[0.0, 0] for _ in range(3)]
for fn in sys.argv[1:]:
    d = json.load(open(fn, encoding='utf-8'))
    T, LIT, TE, LOOK = d['T'], d['LIT'], d['TE'], d['LOOK']
    n = max(1, round(1000 / d['STEP_MS']))
    for i in range(0, len(LIT) - n + 1, n):
        if T[i] - T[0] < 15: continue
        blk = range(i, i + n)
        t = tier(sum(TE[k] for k in blk) / n)
        cnt = defaultdict(int)
        for k in blk: cnt[LOOK[k]] += 1
        look = max(cnt, key=cnt.get)
        lit = sum(LIT[k] for k in blk) / n
        acc[look][t][0] += lit; acc[look][t][1] += 1
        alla[t][0] += lit; alla[t][1] += 1

m = lambda a: a[0] / a[1] if a[1] else float('nan')
snitt = [m(a) for a in alla]
print(f"ALLA  lugn {snitt[0]:.3f} ({alla[0][1]} s)  fart {snitt[1]:.3f} ({alla[1][1]} s)  full {snitt[2]:.3f} ({alla[2][1]} s)")
print(f"{'look':18s} {'lugn':>12s} {'fart':>12s} {'full':>12s}  full-fartsnitt")
rows = sorted(acc.items(), key=lambda kv: -kv[1][2][1])
for look, a in rows:
    cell = lambda t: f"{m(a[t]):.3f}/{a[t][1]:4d}" if a[t][1] else "      -     "
    diff = m(a[2]) - snitt[1] if a[2][1] else float('nan')
    flag = '  MÖRKARE' if a[2][1] >= 10 and diff < 0 else ''
    print(f"{look:18s} {cell(0):>12s} {cell(1):>12s} {cell(2):>12s}  {diff:+.3f}{flag}")
