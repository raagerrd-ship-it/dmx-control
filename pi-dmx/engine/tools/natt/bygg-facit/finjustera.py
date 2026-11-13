"""FINJUSTERA ÄGARENS MARKERINGAR MOT LJUDET (2026-11-13, ägaren: "kolla om du kan trimma in med spektrum till mer exakt när saker
händer och om den blir till hjälp"; knapptrycket kommer upp till ~1 s efter händelsen, uppbyggnad och låtbyte ännu senare).

  python tools/natt/bygg-facit/finjustera.py <lang-*.wav>      (lotus-venv:ens python; läser <namn>.events.json bredvid)

Per markering letas händelsen i LJUDET i ett fönster kring trycket:
  drop / mini   basens återkomst: största lyftet i basnivån (30-150 Hz), 0,4 s efter mot 1 s före; fönster tryck -3,0 .. +0,3 s
  uppbyggnad    basens bortfall: största fallet i basnivån, 1,5 s efter mot 2 s före; fönster tryck -12 .. +1 s
  latbyte       spektrumskiftet: största avståndet mellan medelspektrum 4 s före och 4 s efter; fönster tryck -8 .. +2 s
  intedrop      ingen justering (trycket gäller det ljuset just gjorde)
  angra         "Ångra senaste": stryker markeringen närmast före (ägaren 11-13: "måste ha knapp om jag råkar trycka")
FELTRYCK (ägaren 11-13: "ser du inget i ljudet så är det feltryck"): drop/mini utan basåterkomst (< 6 dB) OCH utan lyft i hela
ljudet (< 4 dB) OCH utan spektrumskifte; låtbyte utan skifte; uppbyggnad utan giltig drop inom 45 s efter. De får skip=true i
marks-fin.json och används inte som facit.
"säker" = händelsen sticker ut i fönstret (lyft/fall >= 6 dB, skifte >= 1,5 x fönstrets median). Skriver <namn>.marks-fin.json och
jämför med motorns egna drop/minidrop (dropCount/miniDropCount i events.json)."""
import sys, os, json
import numpy as np, soundfile as sf
from scipy.signal import stft

p = sys.argv[1]; bas = p[:-4]; ev = json.load(open(bas + '.events.json', encoding='utf-8'))
y, sr = sf.read(p, dtype='float32', always_2d=True); y = y[:, 0]
HOP = 480; f, t, Z = stft(y, fs=sr, nperseg=4096, noverlap=4096 - HOP, window='hann', boundary=None, padded=False); P = np.abs(Z) ** 2; t = t  # 10 ms steg
band = lambda a, b: 10 * np.log10(P[(f >= a) & (f < b)].sum(axis=0) + 1e-12)
B = band(30, 150); ALL = band(30, 16000)
ed = np.geomspace(60, 14000, 25); S = np.stack([band(ed[i], ed[i + 1]) for i in range(24)])           # 24 band, dB
ix = lambda s: int(np.clip(round((s - t[0]) / 0.01), 0, len(t) - 1))
def medel(v, a, b):
    i, j = ix(a), ix(b); return float(np.mean(v[i:max(i + 1, j)]))
def lyft(s): return medel(B, s, s + 0.4) - medel(B, s - 1.0, s - 0.1)
def lyftAlla(s): return medel(ALL, s, s + 0.4) - medel(ALL, s - 1.0, s - 0.1)
def fall(s): return medel(B, s - 2.0, s) - medel(B, s, s + 1.5)
def skifte(s):
    a = S[:, ix(s - 4):ix(s - 0.3)].mean(axis=1); b = S[:, ix(s + 0.3):ix(s + 4)].mean(axis=1); a = a - a.mean(); b = b - b.mean(); return float(np.sqrt(np.mean((a - b) ** 2)))
def basta(fn, a, b, steg=0.02):
    xs = np.arange(max(4.5, a), min(t[-1] - 4.5, b), steg); v = np.array([fn(x) for x in xs]); k = int(np.argmax(v)); return float(xs[k]), float(v[k]), float(np.median(v))

t0 = ev['captureStartWallMs']; ut = []
print('%-8s %-11s %8s %8s %7s  %s' % ('klocka', 'sort', 'tryck s', 'ljud s', 'flytt', 'mått'))
import time
marks = []
for m in ev['marks']:                                              # "Ångra senaste" stryker markeringen närmast före
    if m['kind'] == 'angra':
        if marks: print('ångrad: %s vid %.1f s' % (marks[-1]['kind'], (marks[-1]['wallMs'] - t0) / 1000)); marks.pop()
    else: marks.append(m)
for m in marks:
    s = (m['wallMs'] - t0) / 1000; k = m['kind']; fin, sak, matt = s, False, ''
    if k in ('drop', 'mini'):
        fin, v, md = basta(lyft, s - 3.0, s + 0.3); sak = v >= 6; matt = 'baslyft %+.1f dB' % v
        if sak:                                                    # exakt anslag: första 10 ms-steget där basen passerar halva lyftet
            lo = medel(B, fin - 1.0, fin - 0.1); i = ix(fin - 0.3)
            while i < ix(fin + 0.4) and B[i] < lo + v / 2: i += 1
            fin = float(t[i])
        else:                                                      # ingen basåterkomst: finns något annat i ljudet? (lyft i hela ljudet / skifte)
            f2, v2, _ = basta(lyftAlla, s - 3.0, s + 0.3); f3, v3, md3 = basta(skifte, s - 3.0, s + 0.3, 0.05)
            if v2 >= 4: fin, sak, matt = f2, True, matt + ', hela ljudet %+.1f dB' % v2
            elif v3 >= 1.5 * md3 and v3 >= 3: fin, sak, matt = f3, True, matt + ', skifte %.1f dB' % v3
            else: matt += ', hela ljudet %+.1f dB, skifte %.1f dB' % (v2, v3)
    elif k == 'uppbyggnad':
        fin, v, md = basta(fall, s - 12, s + 1); sak = v >= 6; matt = 'basfall %+.1f dB' % v
    elif k == 'latbyte':
        fin, v, md = basta(skifte, s - 8, s + 2, 0.05); sak = v >= 1.5 * md and v >= 3; matt = 'skifte %.1f dB (median %.1f)' % (v, md)
    ut.append(dict(kind=k, pressS=round(s, 2), fineS=round(fin, 2), sure=bool(sak), measure=matt, klocka=time.strftime('%H:%M:%S', time.localtime(m['wallMs'] / 1000))))
for u in ut:                                                       # FELTRYCK
    if u['kind'] in ('drop', 'mini', 'latbyte'): u['skip'] = not u['sure']
for u in ut:
    if u['kind'] == 'uppbyggnad':
        u['skip'] = not any(d['kind'] == 'drop' and not d.get('skip') and -3 <= d['fineS'] - u['pressS'] <= 45 for d in ut)   # -3: även uppbyggnad trycks sent
        if u['skip'] is False and not u['sure']: u['fineS'] = u['pressS']          # starten osäker: behåll trycket som "här pågår den"
for u in ut:
    print('%-8s %-11s %8.2f %8.2f %+7.2f  %s%s' % (u.pop('klocka'), u['kind'], u['pressS'], u['fineS'], u['fineS'] - u['pressS'], u['measure'], '   FELTRYCK (inget i ljudet)' if u.get('skip') else ''))
json.dump(dict(file=os.path.basename(p), note='fineS = händelsen i ljudet (s från filens början); skip=true = feltryck (inget i ljudet), används inte', marks=ut), open(bas + '.marks-fin.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

# MOTORNS EGNA HÄNDELSER
C = ev['columns']; iD, iM, iB = C.index('dropCount'), C.index('miniDropCount'), C.index('buildUp')
mot = []; pd, pm = ev['flags'][0][iD], ev['flags'][0][iM]
for r in ev['flags']:
    s = (r[0] - t0) / 1000
    if r[iD] > pd: mot.append((s, 'drop'))
    if r[iM] > pm: mot.append((s, 'mini'))
    pd, pm = r[iD], r[iM]
print('\nmotorn: %d drop, %d minidrop under inspelningen' % (sum(1 for _, k in mot if k == 'drop'), sum(1 for _, k in mot if k == 'mini')))
agare = [u for u in ut if u['kind'] in ('drop', 'mini') and not u.get('skip')]; tagna = set()
print('%-6s %8s   %-28s' % ('ägaren', 'ljud s', 'motorn närmast (inom 3 s)'))
for u in agare:
    kand = [(abs(s - u['fineS']), j) for j, (s, k) in enumerate(mot) if abs(s - u['fineS']) <= 3 and j not in tagna]
    if kand:
        _, j = min(kand); tagna.add(j); s, k = mot[j]; print('%-6s %8.2f   %-5s %+6.2f s%s' % (u['kind'], u['fineS'], k, s - u['fineS'], '' if k == u['kind'] else '   <- annan sort'))
    else: print('%-6s %8.2f   MISSAD' % (u['kind'], u['fineS']))
extra = [(s, k) for j, (s, k) in enumerate(mot) if j not in tagna]
print('motorns händelser utan markering (%d):' % len(extra), ', '.join('%s %.1f s' % (k, s) for s, k in extra))
inte = [u for u in ut if u['kind'] == 'intedrop']
if inte: print('ägarens "inte drop":', ', '.join('%.1f s' % u['pressS'] for u in inte))
