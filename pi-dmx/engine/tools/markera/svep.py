"""SVEPET: ett första förslag till markeringar som ägaren sedan finjusterar i tools/markera (ägaren 2026-11-15: "först köra ett svep och
sen går jag in och finjusterar"). Allt räknas lokalt ur ljudet - inget skickas någonstans.
  <lotus>/tools/tempo-facit-pc/.venv/Scripts/python.exe tools/markera/svep.py [wav ...]     (från engine/; utan argument: alla inspelningar)
  -> <namn>.forslag.json bredvid ljudfilen: { marks: [{ kind, fineS, why }] }.  Sidan lägger in dem med knappen "Lägg in förslag".

Vad svepet föreslår (med facit i efterhand - det får titta FRAMÅT, till skillnad från motorn):
  latbyte      motorns låtgränser (kandidater.json), flyttade till det största spektrumskiftet inom 20 s före; täta gränser (< 30 s) = en.
  sektioner    per låt: strukturgränser ur ljudet (självlikhet på slagen, lotus section_facit_local) + energirang per avsnitt:
               första lugna avsnittet = intro, översta tredjedelen i energi = refräng, övrigt = vers, sista lugna korta = outro.
  drop / mini  basens återkomst: basen (30-150 Hz) minst 10 dB under låtens tak i minst 1 s och sedan tillbaka inom 4 dB av taket och
               KVAR där i 6 s. Borta minst 3,5 s och full nivå efteråt = drop, annars minidrop. Plus motorns egna drop.
  uppbyggnad   där basen försvann före ett föreslaget drop.
  Drop/minidrop flyttas till närmaste slag (Beat This!), uppbyggnad/sektion/låtbyte till närmaste taktetta, om slagen finns.
Förslag nära något ägaren redan markerat (marks-hand.json, annars marks-fin.json) tas inte med."""
import sys, os, json, io, glob, time
import numpy as np, scipy.signal
E = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
LOTUS = os.environ.get('LOTUS_FACIT', os.path.abspath(os.path.join(E, '..', '..', '..', 'lotus-light-link', 'tools', 'tempo-facit-pc')))
sys.path.insert(0, LOTUS)
import section_facit_local as SL
from section_facit import derive

def las_wav(p):
    h = open(p, 'rb').read(44)
    if h[:4] != b'RIFF':   # inspelning som aldrig stängdes: mono 48 kHz 16 bit från byte 44
        return np.fromfile(p, dtype='<i2', offset=44).astype(np.float32) / 32768.0, 48000
    return SL.read_wav(p)

def slag(p):
    bt = os.path.join(E, 'tools', 'ladan-2026-11-13', 'beatthis.jsonl')
    if os.path.exists(bt):
        for l in io.open(bt, encoding='utf-8'):
            if l.strip():
                d = json.loads(l)
                if os.path.basename(d['path']) == os.path.basename(p) and 'beatsS' in d: return np.array(d['beatsS']), np.array(d.get('downbeatsS') or [])
    return None, None

def kurvor(y, sr):
    """basen 30-150 Hz och hela nivån i dB, 100 värden per sekund, utjämnade över 0,2 s"""
    H = sr // 100; n = len(y) // H
    sos = scipy.signal.butter(4, [30, 150], btype='bandpass', fs=sr, output='sos'); b = scipy.signal.sosfiltfilt(sos, y).astype(np.float32)
    f = lambda x: np.convolve((x[:n * H].reshape(n, H) ** 2).mean(axis=1), np.ones(20) / 20, 'same')
    return 10 * np.log10(f(b) + 1e-12), 10 * np.log10(f(y) + 1e-12)

def skifte(y, sr):
    """spektrumskifte per 0,1 s: avståndet mellan medelspektrum 4 s före och 4 s efter"""
    import librosa
    y22 = librosa.resample(y, orig_sr=sr, target_sr=22050, res_type='polyphase'); M = librosa.power_to_db(librosa.feature.melspectrogram(y=y22, sr=22050, n_fft=2048, hop_length=2205, n_mels=40) + 1e-10)
    c = np.cumsum(np.concatenate([np.zeros((40, 1)), M], axis=1), axis=1); n = M.shape[1]; s = np.zeros(n)
    for i in range(40, n - 40): s[i] = np.mean(np.abs((c[:, i + 40] - c[:, i]) - (c[:, i] - c[:, i - 40]))) / 40
    return s   # index = 0,1 s

def narmast(a, t, tol):
    if a is None or not len(a): return t
    i = int(np.argmin(np.abs(a - t))); return float(a[i]) if abs(a[i] - t) <= tol else t

def svep(p):
    t0 = time.time(); y, sr = las_wav(p); dur = len(y) / sr; bas = p[:-4]; beats, downs = slag(p)
    egna = []
    for f in (bas + '.marks-hand.json', bas + '.marks-fin.json'):
        if os.path.exists(f): egna = [m for m in json.load(io.open(f, encoding='utf-8'))['marks'] if not m.get('skip') and not m.get('forslag')]; break
    kand = json.load(io.open(bas + '.kandidater.json', encoding='utf-8')) if os.path.exists(bas + '.kandidater.json') else {'drop': [], 'latgrans': []}
    B, A = kurvor(y, sr); S = skifte(y, sr); ut = []
    # låtbyten
    lb = []
    for g in sorted(kand.get('latgrans') or []):
        a, b = int(max(4, g - 20) * 10), int(min(dur - 4, g + 3) * 10)
        if b <= a: continue
        t = (a + int(np.argmax(S[a:b]))) / 10; st = float(S[int(t * 10)])
        if t > dur - 8: continue   # tystnaden när inspelningen slutar
        if lb and t - lb[-1][0] < 30:
            if st > lb[-1][1]: lb[-1] = (t, st)
        else: lb.append((t, st))
    lb = [narmast(downs, t, 1.5) for t, _ in lb]
    agL = [m['fineS'] for m in egna if m['kind'] == 'latbyte']
    for t in lb:
        if not any(abs(t - x) < 25 for x in agL): ut.append(dict(kind='latbyte', fineS=t, why='motorns låtgräns, flyttad till spektrumskiftet'))
    kant = sorted(set([0.0, dur] + agL + [t for t in lb if not any(abs(t - x) < 25 for x in agL)]))
    # per låt: sektioner och basens återkomster
    for a, b in zip(kant, kant[1:]):
        if b - a < 30: continue
        i0, i1 = int(a * 100), int(b * 100); Bs, As = B[i0:i1], A[i0:i1]; tak = np.percentile(Bs, 95); p80 = np.percentile(As, 80)
        try:
            ys = y[int(a * sr):int(b * sr)]; bb = beats[(beats >= a) & (beats < b)] - a if beats is not None else None; dd = downs[(downs >= a) & (downs < b)] - a if downs is not None and len(downs) else None
            res = SL.segment(ys, sr, bb if bb is not None and len(bb) > 16 else None, dd if dd is not None and len(dd) > 4 else None); rows = derive(ys, sr, res['segments']) if res else None
        except Exception as e: rows = None; print('  sektioner misslyckades %.0f-%.0f s: %s' % (a, b, e))
        if rows:
            forra = None
            for k, r in enumerate(rows):
                sort = 'intro' if r['tier'] == 'intro' else 'refrang' if r['tier'] == 'high' else 'vers'
                if k == len(rows) - 1 and k > 0 and r['tier'] != 'high' and r['end'] - r['start'] <= 30: sort = 'outro'
                if sort != forra: ut.append(dict(kind=sort, fineS=a + r['start'] if k else a, why='struktur ur ljudet, energi %s (%.1f dB)' % (r['tier'], r['db'])))
                forra = sort
        borta = Bs < tak - 10; i = 0; n = len(Bs); land = []
        while i < n:
            if not borta[i]: i += 1; continue
            j = i
            while j < n and borta[j]: j += 1
            if j - i >= 100 and j < n - 100:
                k = next((q for q in range(j, min(n, j + 100)) if Bs[q] >= tak - 4), None)
                if k is not None and k + 600 < n and np.median(Bs[k + 50:k + 600]) >= tak - 5 and a + k / 100 - a > 6:
                    full = np.median(As[k:k + 600]) >= p80 - 2; lang = (j - i) >= 350
                    land.append((a + k / 100, a + i / 100, 'drop' if lang and full else 'mini', (j - i) / 100))
            i = j + 1
        for t, start, sort, sek in land:
            t = narmast(beats, t, 0.2)
            ut.append(dict(kind=sort, fineS=t, why='basen tillbaka efter %.1f s' % sek))
            if sort == 'drop': ut.append(dict(kind='uppbyggnad', fineS=narmast(downs, max(start, t - 45), 1.0), why='basen försvann här'))
    for t in kand.get('drop') or []:
        if not any(m['kind'] in ('drop', 'mini') and -1.0 <= t - m['fineS'] <= 2.0 for m in ut): ut.append(dict(kind='drop', fineS=narmast(beats, t - 0.15, 0.2), why='motorn slog här'))
    # inte nära det ägaren redan markerat
    klass = lambda k: 'p' if k in ('drop', 'mini', 'intedrop') else k
    kvar = [m for m in ut if not any(klass(m['kind']) == klass(x['kind']) and abs(m['fineS'] - x['fineS']) < (2.5 if klass(m['kind']) == 'p' else 6) for x in egna)]
    kvar.sort(key=lambda m: m['fineS'])
    for m in kvar: m['fineS'] = round(float(m['fineS']), 3)
    json.dump(dict(file=os.path.basename(p), skapad=time.strftime('%Y-%m-%d %H:%M'), marks=kvar), io.open(bas + '.forslag.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    from collections import Counter
    c = Counter(m['kind'] for m in kvar)
    print('%s: %d förslag (%s), %d togs bort nära egna markeringar, slag %s, %.0f s' % (os.path.basename(p), len(kvar), ', '.join('%d %s' % (v, k) for k, v in c.items()), len(ut) - len(kvar), 'Beat This!' if beats is not None else 'saknas', time.time() - t0))

if __name__ == '__main__':
    W = sys.argv[1:] or [w for w in sorted(glob.glob(os.path.join(E, 'tools', 'ladan-*', 'lang-*.wav'))) if '-lagad' not in w]
    for w in W: svep(os.path.abspath(w))
