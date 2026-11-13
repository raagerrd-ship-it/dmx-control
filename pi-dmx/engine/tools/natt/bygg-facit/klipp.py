"""Kandidater för ägarens markering (drop / minidrop / inget) + ljudklipp.  Körs med lotus-venv:ens python (soundfile med MP3) från engine/.
Kandidater: (a) analysatorns hela drops i de 23 lang-inspelningarna 10-11, (b) baskroppen tillbaka >= 8 dB utan helt drop (i efterhand),
(c) ägarens 13 markeringar i lang1014 (ommärks blint = mått på hur stadig märkningen är). Klipp -15..+7 s kring kandidaten, mono mp3."""
import json, os, glob, random, io, sys
import numpy as np, soundfile as sf
E = os.getcwd(); UT = os.path.join(E, '.arena', 'bygg2', 'sida'); os.makedirs(os.path.join(UT, 'ljud'), exist_ok=True)
FORE, EFTER = 15.0, 7.0
def kr(path):
    J = json.load(open(path, encoding='utf-8')); C = J['columns']; R = J['rows']
    return [r[C.index('t')] for r in R], [r[C.index('bodyDb')] for r in R], [r[C.index('drops')] for r in R], [x[0] for x in J['log'] if x[1] == 'LATGRANS']
K = []
def kandidater(jsonp, wav, extra=None):
    t, b, d, gr = kr(jsonp); n = len(t); dur = t[-1]
    at = lambda x: min(n - 1, max(0, int(round((x - t[0]) * 10))))
    mean = lambda a, c: float(np.mean(b[at(a):max(at(a) + 1, at(c))]))
    drops = [t[i] for i in range(1, n) if d[i] != d[i - 1] and FORE + 1 < t[i] < dur - EFTER - 1]
    for x in drops: K.append({'wav': wav, 't': round(x, 1), 'kalla': 'drop', 'lyft': round(mean(x + 0.5, x + 3.5) - mean(x - 4, x - 0.5), 1)})
    # (b) baskroppen tillbaka utan helt drop: största lyftet i 1 s-steg, minst 6 s från drops och varandra
    cand = []
    for i in range(at(FORE + 1), at(dur - EFTER - 1), 5):
        x = t[i]; l = mean(x + 0.5, x + 3.5) - mean(x - 4, x - 0.5)
        if l >= 8 and all(abs(x - y) > 6 for y in drops): cand.append((l, x))
    cand.sort(reverse=True); tagna = []
    for l, x in cand:
        if all(abs(x - y) > 8 for y in tagna): tagna.append(x); K.append({'wav': wav, 't': round(x, 1), 'kalla': 'lyft', 'lyft': round(l, 1)})
    for x, k in (extra or []):
        if FORE + 1 < x < dur - EFTER - 1: K.append({'wav': wav, 't': round(x - 1.0, 1), 'kalla': 'agare-' + k, 'lyft': round(mean(x - 0.5, x + 2.5) - mean(x - 5, x - 1.5), 1)})   # markeringen ligger ~1 s efter (reaktionstid)
for f in sorted(glob.glob('.arena/triage1113/kr/*.json')):
    kandidater(f, 'tools/ladan-2026-10-11/' + os.path.basename(f)[:-5] + '.wav')
s0 = json.load(io.open('tools/ladan-2026-10-14/lang-20261014T161434.events.json', encoding='utf-8'))['captureStartWallMs']
ms = [json.loads(l) for l in io.open('tools/ladan-2026-10-14/marks.jsonl', encoding='utf-8') if l.strip()]
agare = [((m['wallMs'] - s0) / 1000, m['kind']) for m in ms if m['kind'] in ('drop', 'mini') and 0 <= (m['wallMs'] - s0) / 1000 <= 600]
n0 = len(K); K14 = []
t, b, d, gr = kr('.arena/bygg2/l1014.json')
for x, k in agare:
    if FORE + 1 < x < t[-1] - EFTER - 1: K.append({'wav': 'tools/ladan-2026-10-14/lang-20261014T161434.wav', 't': round(x - 1.0, 1), 'kalla': 'agare-' + k, 'lyft': 0})
# urval: alla drops, alla ägarens, högst 30 'lyft' (de största 15 + 15 slumpade av resten)
lyft = sorted([k for k in K if k['kalla'] == 'lyft'], key=lambda k: -k['lyft']); random.seed(1113)
valda = [k for k in K if k['kalla'] != 'lyft'] + lyft[:15] + random.sample(lyft[15:], min(15, max(0, len(lyft) - 15)))
random.shuffle(valda)
print('kandidater: drops', sum(1 for k in K if k['kalla'] == 'drop'), 'lyft', len(lyft), 'ägarens', sum(1 for k in K if k['kalla'].startswith('agare')), '-> valda', len(valda))
tot = 0
for i, k in enumerate(valda):
    k['id'] = 'k%03d' % (i + 1)
    info = sf.info(k['wav']); sr = info.samplerate; a = int((k['t'] - FORE) * sr); n = int((FORE + EFTER) * sr)
    y, _ = sf.read(k['wav'], start=a, frames=n, dtype='float32', always_2d=True); y = y.mean(axis=1)
    pk = float(np.max(np.abs(y))) or 1.0; y = y * min(4.0, 0.9 / pk)   # jämn lyssningsnivå
    fade = int(0.05 * sr); y[:fade] *= np.linspace(0, 1, fade); y[-fade:] *= np.linspace(1, 0, fade)
    y = y[::2] if sr == 48000 else y   # 24 kHz räcker gott för att höra virvelrullar och risers (upp till 12 kHz)
    p = os.path.join(UT, 'ljud', k['id'] + '.mp3'); sf.write(p, y, sr // 2 if sr == 48000 else sr, format='MP3', subtype='MPEG_LAYER_III'); tot += os.path.getsize(p)
json.dump({'fore': FORE, 'efter': EFTER, 'klipp': valda}, open(os.path.join(E, '.arena', 'bygg2', 'kandidater.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('klipp', len(valda), 'totalt %.1f MB' % (tot / 1e6), 'största %.0f kB' % (max(os.path.getsize(os.path.join(UT, 'ljud', k['id'] + '.mp3')) for k in valda) / 1e3))
