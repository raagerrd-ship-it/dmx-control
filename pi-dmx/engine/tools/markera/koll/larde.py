"""Vad skiljer ägarens DROP från hans MINIDROP i en genomgången fil (marks-hand.json), vad gör motorn på samma ställen, vilka omarkerade
ställen liknar en landning, och vad händer i ljudet under hans uppbyggnader? Läser bara (motorns körning sparas i .arena/markera-cache).
  <lotus>/tools/tempo-facit-pc/.venv/Scripts/python.exe tools/markera/koll/larde.py ladan-2026-11-13/lang-20261113T151659     (från engine/)
koll_hand.py <wav> [tider ...] = markeringarna mot basen, slagen och analysraderna (+ basen i 50 ms-steg runt angivna tider)."""
import sys, os, json, io, subprocess
import numpy as np
E = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
src = io.open(os.path.join(E, 'tools', 'natt', 'arena-2026-11-14-drop2', 'fore_drop5.py'), encoding='utf-8').read()
G = {'__file__': os.path.join(E, 'tools', 'natt', 'arena-2026-11-14-drop2', 'fore_drop5.py')}
exec(src[:src.index('ut = {}\nfor namn in FILER:')], G)
namn = sys.argv[1]
t, b = G['las'](namn)
H = json.load(io.open(os.path.join(E, 'tools', namn + '.marks-hand.json'), encoding='utf-8'))['marks']
rp = os.path.join(E, '.arena', 'markera-cache', 'raw-' + os.path.basename(namn) + '.json')
if not os.path.exists(rp): subprocess.run(['node', 'tools/arena/dropdom2Kor.mjs', 'tools/' + namn + '.wav', rp, '0'], cwd=E, check=True)
raw = json.load(open(rp))
P = [m for m in H if m['kind'] in ('drop', 'mini')]; U = sorted(m['fineS'] for m in H if m['kind'] == 'uppbyggnad')
SEK = sorted((m['fineS'], m['kind']) for m in H if m['kind'] in ('intro', 'vers', 'refrang', 'outro', 'break'))
LB = [0.0] + sorted(m['fineS'] for m in H if m['kind'] == 'latbyte')
rows = []
for m in P:
    s = m['fineS']; r = G['matt'](t, b, s)
    u = [x for x in U if 0 < s - x < 20]; r['uppbyggnad före (s)'] = s - u[-1] if u else 0.0
    r['in i låten (s)'] = s - max(x for x in LB if x <= s + 0.01)
    r['refräng börjar här'] = 1.0 if any(k == 'refrang' and abs(x - s) < 0.3 for x, k in SEK) else 0.0
    md = [x for x in raw['drops'] if -0.5 <= x - s <= 1.0]; mm = [x for x in raw['minis'] if -0.5 <= x - s <= 1.0]
    rows.append((m['kind'], s, r, md, mm))
keys = list(rows[0][2].keys())
print('%-40s' % 'mått' + ''.join('%8s' % ('%s%.0f' % ('D' if k == 'drop' else 'm', s)) for k, s, *_ in rows) + '   AUC')
for k in keys:
    d = [r[k] for kind, s, r, *_ in rows if kind == 'drop']; mi = [r[k] for kind, s, r, *_ in rows if kind == 'mini']
    print('%-40s' % k + ''.join('%8.1f' % r[k] for _, _, r, *_ in rows) + '   %.2f' % G['auc'](d, mi))
print('%-40s' % 'motorn: drop' + ''.join('%8s' % ('JA' if md else '-') for *_, md, mm in rows))
print('%-40s' % 'motorn: minidrop' + ''.join('%8s' % ('%+.2f' % (mm[0] - s) if mm else '-') for _, s, _, md, mm in rows))
# motorns minidrop som inte ligger vid någon av ägarens markeringar
fria = [x for x in raw['minis'] if not any(-0.5 <= x - m['fineS'] <= 1.0 for m in P)]
print('\nmotorns minidrop: %d totalt (%.1f/min), %d vid ägarens drop/mini, %d utan markering' % (len(raw['minis']), len(raw['minis']) / (raw['seconds'] / 60), len(raw['minis']) - len(fria), len(fria)))
print('motorns drop: %s' % raw['drops'])
# samma mått vid de omarkerade motor-minidroppen: hur många ser ut som ägarens drop?
AK = [k for k in keys if k in rows[0][2] and k not in ('uppbyggnad före (s)', 'in i låten (s)', 'refräng börjar här')]
F = [(x, G['matt'](t, b, x)) for x in fria if 9 < x < t[-1] - 4]
print()
print('ALLA ägarens markeringar (drop+mini, 13) mot motorns omarkerade minidrop (%d): AUC' % len(F))
for k in AK:
    a = [r[k] for _, _, r, *_ in rows]; v = [r[k] for _, r in F]
    print('  %-40s markerade median %6.1f   omarkerade median %6.1f   AUC %.2f' % (k, np.median(a), np.median(v), G['auc'](a, v)))
# omarkerade ställen som ser ut som en landning: baslucka >= 1,0 s och nivåsteg >= 0
print()
print('OMARKERADE motor-minidrop med baslucka >= 1,0 s (ett per 3 s): tid, baslucka, nivåsteg, närmaste av ägarens markeringar')
sist = -9
for x, r in F:
    if r['langsta baslucka (s)'] < 1.0 or x - sist < 3: continue
    sist = x; nar = min(H, key=lambda m: abs(m['fineS'] - x))
    print('  %7.2f  lucka %.1f s  nivåsteg %+5.1f  bas borta %3.0f %%  ny topp %+5.1f   närmast: %s %.2f (%+.1f s)' % (x, r['langsta baslucka (s)'], r['nivasteg efter-fore (dB)'], r['bas borta 8 s (%)'], r['ny topp mot 25 s (dB)'], nar['kind'], nar['fineS'], nar['fineS'] - x))
# uppbyggnaderna: vad händer i ljudet mellan markeringen och landningen
print()
print('UPPBYGGNADERNA: före (lika lång tid före markeringen) -> under -> efter landningen (4 s)')
seg = G['seg']; ons = G['ons']
def puls(a, c):
    v = seg(t, b['bas'], a, c); return np.percentile(v, 90) - np.percentile(v, 10) if len(v) > 4 else 0
for u in U:
    L = next((m for m in sorted(P, key=lambda m: m['fineS']) if m['fineS'] > u), None)
    if not L: continue
    s = L['fineS']; n = max(s - u, 2.0)
    f = lambda nyc, a, c: np.median(seg(t, b[nyc], a, c))
    print('  %7.2f -> %s %7.2f (%.1f s)' % (u, L['kind'], s, s - u))
    for nyc, nm in (('bas', 'bas 30-150'), ('lmid', '150-500'), ('mid', '500-2k'), ('hog', '2-8k'), ('luft', '8-16k'), ('tot', 'allt')):
        print('      %-10s %6.1f -> %6.1f -> %6.1f' % (nm, f(nyc, u - n, u), f(nyc, u, s - 0.05), f(nyc, s + 0.1, s + 4)))
    print('      %-10s %6.1f -> %6.1f -> %6.1f   (anslag/s)' % ('anslag', ons(t, b['flode'], u - n, u), ons(t, b['flode'], u, s), ons(t, b['flode'], s, s + 4)))
    print('      %-10s %6.1f -> %6.1f -> %6.1f   (dB mellan slag och mellanrum i basen)' % ('baspuls', puls(u - n, u), puls(u, s - 0.05), puls(s + 0.1, s + 4)))
