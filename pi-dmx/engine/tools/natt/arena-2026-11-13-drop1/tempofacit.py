"""KLOCKAN MOT TEMPOFACIT (Beat This!, lokal slagföljare): andel av tiden klockans tempo är rätt (inom 4 %), per fil och variant.
Facit vid tiden t = 60 / medianen av slagintervallen inom +-4 s (minst 6 slag); sekunder utan facit räknas inte.
  python tools/natt/arena-2026-11-13-drop1/tempofacit.py tools/ladan-2026-11-13/beatthis.jsonl <sond.json> [<sond.json> ...]     (--runt 137.2,367.4 = bara -8..+10 s runt de tiderna)"""
import json, sys, os
import numpy as np
args = [a for a in sys.argv[1:] if not a.startswith('--')]
runt = None
for a in sys.argv[1:]:
    if a.startswith('--runt='): runt = [float(x) for x in a[7:].split(',') if x]
bt = {}
for rad in open(args[0], encoding='utf-8'):
    rad = rad.strip()
    if rad.startswith('{'):
        r = json.loads(rad); bt[os.path.basename(r['path'])] = np.array(r.get('beatsS', []))
def facit(b, t):
    m = b[(b >= t - 4) & (b <= t + 4)]
    if len(m) < 6: return 0.0
    return 60.0 / float(np.median(np.diff(m)))
for p in args[1:]:
    j = json.load(open(p)); b = bt[os.path.basename(j['wav'])]; s = j['stegS']
    n = ratt = okt = fel = 0; felvar = []
    for i, v in enumerate(j['bpm']):
        t = i * s
        if t < 20: continue
        if runt is not None and not any(-8 <= t - r <= 10 for r in runt): continue
        f = facit(b, t)
        if f <= 0: continue
        n += 1
        if v > 0 and abs(v - f) / f <= 0.04: ratt += 1
        elif v > 0 and any(abs(v * k - f) / f <= 0.04 for k in (2, 0.5)): okt += 1
        else:
            fel += 1
            if felvar and t - felvar[-1][1] <= 1.5: felvar[-1][1] = t
            else: felvar.append([t, t])
    print(f"{p:44s} rätt {100*ratt/max(n,1):5.1f} %  oktav {100*okt/max(n,1):4.1f} %  FEL {100*fel/max(n,1):5.1f} % ({fel*s:5.0f} s av {n*s:.0f})  " + ' '.join(f"{a:.0f}-{c:.0f}" for a, c in felvar if c - a >= 2))
