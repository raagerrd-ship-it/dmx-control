"""Läser ägarens marks-hand.json och jämför med ljudet (bas 30-150 Hz, hela nivån), slagen (Beat This) och analysraderna. Skriver inget."""
import sys, os, json, io
import numpy as np, scipy.signal
E = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
sys.path.insert(0, os.path.join(E, 'tools', 'markera'))
import svep
p = os.path.abspath(sys.argv[1]); bas = p[:-4]
y, sr = svep.las_wav(p); dur = len(y) / sr
H = json.load(io.open(bas + '.marks-hand.json', encoding='utf-8'))
M = [m for m in H['marks'] if not m.get('skip')]
beats, downs = svep.slag(p)
Hh = sr // 100; n = len(y) // Hh
sos = scipy.signal.butter(4, [30, 150], btype='bandpass', fs=sr, output='sos'); b = scipy.signal.sosfiltfilt(sos, y).astype(np.float32)
e = lambda x: 10 * np.log10((x[:n * Hh].reshape(n, Hh) ** 2).mean(axis=1) + 1e-12)
B = e(b); A = e(y)
sm = lambda x, k: np.convolve(10 ** (x / 10), np.ones(k) / k, 'same')
Bs = 10 * np.log10(sm(B, 20) + 1e-12)
print('fil %.1f s, %d markeringar, klar=%s, sista markeringen %.1f s' % (dur, len(M), H.get('klar'), max(m['fineS'] for m in M)))
med = lambda x, a, c: float(np.median(x[max(0, int(a * 100)):max(1, int(c * 100))]))
def nb(arr, t):
    if arr is None or not len(arr): return None
    i = int(np.argmin(np.abs(arr - t))); return float(arr[i] - t)
tak = np.percentile(Bs, 95)
print('bastak (95:e) %.1f dB' % tak)
print('\n== DROP / MINI: bas före (3 s..0,3 s) och efter (0,2..3 s), hela nivån före/efter, närmaste slag/etta, basens språng')
for m in M:
    if m['kind'] not in ('drop', 'mini', 'intedrop'): continue
    t = m['fineS']
    f, a = med(Bs, t - 3, t - 0.3), med(Bs, t + 0.2, t + 3); fa, aa = med(A, t - 3, t - 0.3), med(A, t + 0.2, t + 3)
    # största språnget i basen (10 ms-energi, 60 ms efter mot 300 ms före) inom +-2 s
    best = (0, 0)
    for k in range(int((t - 2) * 100), int((t + 2) * 100)):
        if k < 40 or k + 10 >= n: continue
        d = 10 * np.log10(np.mean(10 ** (B[k:k + 6] / 10)) + 1e-12) - 10 * np.log10(np.mean(10 ** (B[k - 30:k] / 10)) + 1e-12)
        if d > best[0]: best = (d, k / 100)
    # hur länge var basen borta före (under tak-10)
    k = int(t * 100) - 5; g = 0
    while k > 0 and Bs[k] < tak - 10: k -= 1; g += 1
    print('%-5s %7.2f  bas %6.1f -> %6.1f (%+5.1f)  nivå %6.1f -> %6.1f (%+5.1f)  slag %+5.2f etta %+5.2f  språng %+5.1f dB vid %7.2f (%+5.2f)  borta %.1f s  %s' % (
        m['kind'], t, f - tak, a - tak, a - f, fa, aa, aa - fa, nb(beats, t) or 9, nb(downs, t) or 9, best[0], best[1], best[1] - t, g / 100, 'flyttad från tryck' if abs(m['pressS'] - t) > 0.01 else ''))
print('\n== UPPBYGGNAD: bas före (3 s) och efter (3 s), sekunder till nästa drop/mini')
P = sorted(x['fineS'] for x in M if x['kind'] in ('drop', 'mini'))
for m in M:
    if m['kind'] != 'uppbyggnad': continue
    t = m['fineS']; nx = next((x for x in P if x > t), None)
    print('uppb  %7.2f  bas %6.1f -> %6.1f  nivå %6.1f -> %6.1f  etta %+5.2f  till nästa %s' % (t, med(Bs, t - 3, t) - tak, med(Bs, t, t + 3) - tak, med(A, t - 3, t), med(A, t, t + 3), nb(downs, t) or 9, '%.1f s' % (nx - t) if nx else '-'))
print('\n== SEKTIONER / LÅTBYTEN: närmaste etta, nivå före/efter (4 s)')
for m in M:
    if m['kind'] in ('drop', 'mini', 'intedrop', 'uppbyggnad'): continue
    t = m['fineS']
    print('%-8s %7.2f  etta %+5.2f slag %+5.2f  nivå %6.1f -> %6.1f  bas %6.1f -> %6.1f  %s' % (m['kind'], t, nb(downs, t) or 9, nb(beats, t) or 9, med(A, t - 4, t), med(A, t, t + 4), med(Bs, t - 4, t) - tak, med(Bs, t, t + 4) - tak, m.get('why', '')))
print('\n== RADERNAS förslag (drop/mini/latbyte) som INTE finns bland dina (inom 2,5 s / 8 s)')
for fn, namn in (('.forslag.json', 'lokal'), ('.kandidater.json', 'motor'), ('.marks-fin.json', 'tryck')):
    if not os.path.exists(bas + fn): continue
    d = json.load(io.open(bas + fn, encoding='utf-8'))
    L = d['marks'] if 'marks' in d else [dict(kind='drop', fineS=t) for t in d.get('drop', [])] + [dict(kind='latbyte', fineS=t) for t in d.get('latgrans', [])]
    for x in sorted(L, key=lambda q: q['fineS']):
        if x.get('skip'): continue
        k = x['kind']
        if k in ('drop', 'mini'):
            nar = [q for q in M if q['kind'] in ('drop', 'mini', 'intedrop') and abs(q['fineS'] - x['fineS']) < 2.5]
            if not nar: print('  %-6s %-5s %7.2f  %s' % (namn, k, x['fineS'], x.get('why', x.get('measure', ''))))
            elif namn == 'tryck' and nar[0]['kind'] != k: print('  %-6s %-5s %7.2f  -> du satte %s %.2f' % (namn, k, x['fineS'], nar[0]['kind'], nar[0]['fineS']))
        elif k == 'latbyte' and not any(q['kind'] == 'latbyte' and abs(q['fineS'] - x['fineS']) < 8 for q in M):
            print('  %-6s %-5s %7.2f  %s' % (namn, k, x['fineS'], x.get('why', x.get('measure', ''))))
if len(sys.argv) > 2:
    print('\n== BAS i 50 ms-steg (dB under taket), -1,5 .. +1,5 s')
    for t in map(float, sys.argv[2:]):
        r = [max(B[int((t + o / 20) * 100):int((t + o / 20) * 100) + 5]) - tak for o in range(-30, 31)]
        print('%7.2f: ' % t + ' '.join('%3.0f' % v for v in r[:30]) + ' | ' + ' '.join('%3.0f' % v for v in r[30:]))
