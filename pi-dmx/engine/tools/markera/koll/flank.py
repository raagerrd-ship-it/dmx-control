"""Hur djup och lång är basens lucka före ägarens drop, minidrop och omarkerade baslandningar? (ungefär som flanken ser den:
basens 0,6 s-topp mot ett tak som sjunker 0,5 dB/s) + diskanten mot sitt 30 s-medel vid landningen (diskantvetot). Läser bara.
  <lotus-venv-python> tools/markera/koll/flank.py      (från engine/; alla genomgångna filer)"""
import sys, os, json, io, glob
import numpy as np, scipy.signal
E = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
sys.path.insert(0, os.path.join(E, 'tools', 'markera')); import svep
DJUP = (6, 8, 10)
def kurvor(y, sr):
    H = sr // 100; n = len(y) // H
    def band(lo, hi):
        sos = scipy.signal.butter(4, [lo, hi], btype='bandpass', fs=sr, output='sos'); b = scipy.signal.sosfilt(sos, y)
        return 10 * np.log10((b[:n * H].reshape(n, H) ** 2).mean(axis=1) + 1e-12)
    bas = band(20, 250); hi = band(4000, 12000)
    e = np.convolve(10 ** (bas / 10), np.ones(35) / 35, 'full')[:n]; env = 10 * np.log10(e + 1e-12)   # ~0,35 s
    top = np.array([env[max(0, i - 60):i + 1].max() for i in range(n)])                                # 0,6 s-topp bakåt
    tak = np.empty(n); t = env[0]
    for i in range(n): t = max(env[i], t - 0.005); tak[i] = t                                          # 0,5 dB/s
    a2 = scipy.signal.lfilter([0.005], [1, -0.995], 10 ** (hi / 10)); h2 = 10 * np.log10(a2 + 1e-12)   # ~2 s
    a30 = scipy.signal.lfilter([1 / 3000], [1, -1 + 1 / 3000], 10 ** (h2 / 10)); h30 = 10 * np.log10(a30 + 1e-12)
    return env, top, tak, h2 - h30
def lucka(top, tak, i, d):
    """längsta sammanhängande tid (s) inom 20 s före index i där toppen låg minst d dB under taket"""
    u = top[max(0, i - 2000):i] < tak[max(0, i - 2000):i] - d; best = run = 0
    for q in u: run = run + 1 if q else 0; best = max(best, run)
    return best / 100
rad = []
for hp in sorted(glob.glob(os.path.join(E, 'tools', 'ladan-*', 'lang-*.marks-hand.json'))):
    d = json.load(io.open(hp, encoding='utf-8'))
    if not d.get('klar'): continue
    wav = hp.replace('.marks-hand.json', '.wav'); y, sr = svep.las_wav(wav); env, top, tak, hd = kurvor(y, sr)
    M = [m for m in d['marks'] if not m.get('skip') and not m.get('forslag')]
    P = [(m['fineS'], m['kind']) for m in M if m['kind'] in ('drop', 'mini')]
    # omarkerade baslandningar: basen stiger minst 10 dB på 0,3 s, inte inom 2 s från en markering
    n = len(env); egna = []
    for i in range(200, n - 50):
        if env[i] - env[i - 30] > 10 and env[i - 1] - env[i - 31] <= 10 and not any(abs(i / 100 - t) < 2 for t, _ in P) and not any(abs(i / 100 - x) < 3 for x in egna): egna.append(i / 100)
    for t, k in P + [(x, 'omark') for x in egna]:
        i = int(t * 100) + 20
        if i >= n or t < 20: continue
        rad.append((os.path.basename(wav)[-10:-4], t, k, [lucka(top, tak, i, dd) for dd in DJUP], float(hd[min(n - 1, i)])))
print('%-7s %8s %-6s %s  diskant' % ('fil', 'tid', 'sort', '  '.join('lucka %2d dB' % dd for dd in DJUP)))
for f, t, k, L, h in rad:
    if k != 'omark': print('%-7s %8.2f %-6s %s  %+5.1f' % (f, t, k, '  '.join('%9.1f s' % x for x in L), h))
print('\nANDEL som passerar "lucka >= S s vid D dB" (och diskantvetot >= 0 dB):')
for dd_i, dd in enumerate(DJUP):
    for S in (0.5, 1.0, 1.5, 2.0, 3.0, 4.0):
        c = {}
        for k in ('drop', 'mini', 'omark'):
            R = [r for r in rad if r[2] == k]; a = [r for r in R if r[3][dd_i] >= S]; b = [r for r in a if r[4] >= 0]
            c[k] = '%3d/%-3d -> %3d' % (len(a), len(R), len(b))
        print('  %2d dB %3.1f s:  drop %s   mini %s   omarkerade %s' % (dd, S, c['drop'], c['mini'], c['omark']))
