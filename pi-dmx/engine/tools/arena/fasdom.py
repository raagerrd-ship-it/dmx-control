"""DOMAREN FÖR ARENAN 'FAS1' (2026-11-21) - och DELTAGARNAS BRIEF. Måtten, spärrarna och mängderna ändras inte under körningen.

FRÅGAN: takten ska följa ett VERKLIGT fashopp på 1-3 s, utan låtbyte och utan tempohopp (en beatmatchad DJ-övergång i annan fas, en
missad låtgräns i samma tempo) - utan att a3c:s vinst mot korta falska toppar (offbeat-bas, uppbyggnad) går förlorad.
Mätt 2026-11-21 (skarvprovet, 7 skarvar): klockan före låset följde på median 4,8 s (2-25 s), a3c på 14 s. Tau 5/3 s och "nekad 8 ggr i
rad" hjälpte inte entydigt.

SKARVPROVET: i inspelningen klipps en del av ett slag bort (1/4, 3/8, 1/2, 5/8, 3/4 - de två sista = fashopp bakåt) med 5 ms överton,
var ~45:e s, bara där Beat This-slagen är jämna (90 % av slagavstånden inom 8 %) 20 s före och 30 s efter. Facit = Beat This flyttat med klippet (BARA i domaren; motorns
kod får aldrig läsa facit). Mätningen: node tools/konsertReplay.mjs <skarvad wav> --slag --delad-cfg --json <ut> --dist <mapp>/dist.
FAS per tick = läget mellan facitslagen (-0,5..0,5 slag), mätt mot filens egen medelfas (motorns lead räknas bort).
FÖLJTID per skarv = tid från skarven till första tick där ALLA tick de närmaste 4 s (minst 6 st) ligger inom 0,1 slag. Kapas vid 30 s.
MÅTTEN (alla skarvar i mängden tillsammans)
  inom3    + %   andel skarvar som följs inom 3 s                      <- POÄNGEN
  median   - s   medianen av följtiden (kapad)
  medel    - s   medlet av följtiden (kapad)
  ifas     + %   andel tick inom 0,1 slag 20 s före skarvarna (redovisas)
POÄNG = (inom3 - bas.inom3) + 2 x (bas.median - median). + = bättre.
SPÄRRAR (DISK) - kräver <mapp>/pardom.json (python tools/arena/pardom.py <mapp> --mat, bas = a3c):
  FEL      pardom FEL-medel > bas + 0,5          (a3c:s vinst mot falska toppar får inte gå förlorad)
  par / paslag   medel < bas - 2 eller någon fil < bas - 5;  oktav  medel > bas + 3;  lead  > 10 ms på någon fil
  ifas     < bas - 3 procentenheter (att följa allt snabbt genom att aldrig sitta stilla är inte att lösa frågan)
  filer    ändrade filer utanför TILLATNA (analyser*.ts, split.ts, slowWorker.ts, beatClock.ts, ANALYSER_SHARED.md5)
  mätfel   en fil som inte går att mäta
ORKESTRATORNS SPÄRRAR (finalisterna): pardom --holdout, lotusbank.py (~5 %), pibudget.py, dropdom3.py --mat, klockdom.py --mat --holdout.

MÄNGDERNA
  ÖVNING   151659, 171840, 200719, 160345      deltagarna mäter här (--mat)
  KONTROLL 193040, 193818                      bara orkestratorn (--mat --holdout), finalen

KOMMANDON (från engine/, PYTHONIOENCODING=utf-8)
  python tools/arena/fasdom.py --skarva .arena/<körning>              (orkestratorn, en gång) skarvade wav + facit -> .arena/<körning>/skarv/
  python tools/arena/bygg.py .arena/<körning>/<mapp>
  python tools/arena/fasdom.py .arena/<körning>/<mapp> --mat [--namn m1]   EN MÄTNING på övningen -> <mapp>/fasdom.json (+ fasdom-m1.json)
  python tools/arena/fasdom.py .arena/<körning> [--md] [--holdout]          rangordning mot bas
  python tools/arena/fasdom.py .arena/<körning>/<mapp> --mat --fil 200719  SOND på EN övningsfil -> <mapp>/fasdom-fil-200719.json (räknas som en mätning, rankas inte)
  LÅS: .arena/.banklas (en mätning åt gången, inuti två replay parallellt). ~1 min per --mat.
JSON <mapp>/fasdom.json: {'matt': {inom3, median, medel, ifas}, 'skarvar': [[fil, t, andel, foljS, ifas], ...], 'sparr': {'andradeFiler': [...]}}
"""
import io, json, os, shutil, subprocess, sys, time, wave
from concurrent.futures import ThreadPoolExecutor
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); ENGINE = os.path.dirname(os.path.dirname(HERE)); sys.path.insert(0, HERE)
import ettdom as E
L3, L4 = 'tools/ladan-2026-11-13/', 'tools/ladan-2026-11-14/'
OVNING = [L3 + 'lang-20261113T151659.wav', L3 + 'lang-20261113T171840.wav', L4 + 'lang-20261114T200719.wav', L3 + 'lang-20261113T160345.wav']
KONTROLL = [L4 + 'lang-20261114T193040.wav', L4 + 'lang-20261114T193818.wav']
TILLATNA = E.TILLATNA | {'beatClock.ts'}
ANDELAR = [0.5, 0.25, 0.75, 0.375, 0.625]
STEG_S, FORE_S, EFTER_S, KAP_S, HALL_S, TOL = 45.0, 20.0, 30.0, 30.0, 4.0, 0.1
BT = {}
for l in io.open(os.path.join(ENGINE, L3, 'beatthis.jsonl'), encoding='utf-8'):
    d = json.loads(l); BT[os.path.basename(d['path'])] = d

def skarva(korning):
    ut = os.path.join(ENGINE, korning, 'skarv'); os.makedirs(ut, exist_ok=True); n = 0
    for w in OVNING + KONTROLL:
        B = np.array(BT[os.path.basename(w)]['beatsS']); wf = wave.open(os.path.join(ENGINE, w)); p = wf.getparams(); sr = p.framerate
        x = np.frombuffer(wf.readframes(p.nframes), dtype=np.int16).astype(np.float32); wf.close()
        def jamn(a, b):
            s = B[(B > a) & (B < b)]
            if len(s) < 0.8 * (b - a) * 1.5: return False
            ioi = np.diff(s); m = np.median(ioi); return bool(np.mean(abs(ioi / m - 1) < 0.08) >= 0.9)
        val, t, j = [], 40.0, 0
        while t < B[-1] - EFTER_S - 5:
            if jamn(t - FORE_S, t + EFTER_S):
                k = int(np.searchsorted(B, t)); per = float(np.median(np.diff(B[k - 8:k + 8])))
                val.append((float(B[k]) - 0.25 * per, ANDELAR[j % len(ANDELAR)], per)); j += 1; t += STEG_S
            else: t += 5.0
        XF = int(0.005 * sr); delar, start, klipp = [], 0, []
        for t0, a, per in val:
            m = int(round(a * per * sr)); i0 = int(t0 * sr)
            seg = x[start:i0 + XF].copy(); nxt = x[i0 + m:i0 + m + XF]; r = np.linspace(1, 0, XF)
            seg[-XF:] = seg[-XF:] * r + nxt * (1 - r); delar.append(seg); start = i0 + m + XF; klipp.append((t0, m / sr, per, a))
        delar.append(x[start:]); y = np.concatenate(delar)
        o = wave.open(os.path.join(ut, os.path.basename(w)), 'wb'); o.setparams(p); o.writeframes(np.clip(y, -32768, 32767).astype(np.int16).tobytes()); o.close()
        Bn = B.copy(); keep = np.ones(len(B), bool); sk = []; fl = 0.0
        for t0, dS, per, a in klipp:
            Bn[B > t0] -= dS; keep &= ~((B > t0) & (B < t0 + dS)); sk.append(dict(t=round(t0 - fl, 4), andel=a, klippS=round(dS, 4))); fl += dS
        json.dump(dict(beatsS=[round(float(b), 4) for b in Bn[keep]], skarvar=sk), io.open(os.path.join(ut, E.kort(w) + '.facit.json'), 'w', encoding='utf-8'))
        print(E.kort(w), len(sk), 'skarvar'); n += len(sk)
    print('totalt', n)

def dom_fil(rp, facit):
    F = json.load(io.open(facit, encoding='utf-8')); TK = json.load(io.open(rp, encoding='utf-8')).get('ticks') or []
    B = np.array(F['beatsS']); T = np.array(TK[0::2], float)
    if len(T) < 100: raise SystemExit('MÄTFEL: %s bara %d tick' % (rp, len(T)))
    k = np.clip(np.searchsorted(B, T), 1, len(B) - 1); e = (T - B[k - 1]) / (B[k] - B[k - 1]); e -= np.round(e)
    fore = np.zeros(len(T), bool)
    for s in F['skarvar']: fore |= (T > s['t'] - FORE_S) & (T < s['t'] - 1)
    base = float(np.angle(np.mean(np.exp(2j * np.pi * e[fore]))) / (2 * np.pi)); d = (e - base + 0.5) % 1 - 0.5
    ut = []
    for s in F['skarvar']:
        t0 = s['t']; f = (T > t0 - FORE_S) & (T < t0 - 1); ifas = float(np.mean(abs(d[f]) < TOL)) if f.any() else 0.0; tf = KAP_S
        for i in np.where((T > t0) & (T < t0 + KAP_S))[0]:
            w = (T >= T[i]) & (T < T[i] + HALL_S)
            if w.sum() >= 6 and np.all(abs(d[w]) < TOL): tf = float(T[i] - t0); break
        ut.append([round(t0, 2), s['andel'], round(tf, 2), round(100 * ifas, 1)])
    return ut

def mat(mapp, holdout, utnamn, fil=None):
    mapp = os.path.abspath(mapp); dist = os.path.join(mapp, 'dist'); kor_ = os.path.dirname(mapp); sk = os.path.join(kor_, 'skarv')
    if not os.path.isdir(dist): raise SystemExit('bygg först: python tools/arena/bygg.py ' + mapp)
    if not os.path.isdir(sk): raise SystemExit('skarvarna saknas: python tools/arena/fasdom.py --skarva ' + os.path.relpath(kor_, ENGINE))
    ut = os.path.join(mapp, 'fasdom'); os.makedirs(ut, exist_ok=True)
    def kor(w):
        js = os.path.join(ut, 'kr-%s.json' % E.kort(w))
        if os.path.exists(js): os.remove(js)
        r = subprocess.run(['node', 'tools/konsertReplay.mjs', os.path.join(sk, os.path.basename(w)), '--slag', '--delad-cfg', '--json', js, '--dist', dist],
                           cwd=ENGINE, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=5400)
        if r.returncode != 0 or not os.path.exists(js): raise SystemExit('MÄTFEL %s: %s' % (w, (r.stderr or r.stdout)[-600:]))
        return E.kort(w), dom_fil(js, os.path.join(sk, E.kort(w) + '.facit.json'))
    lock = E.las_lock(); t0 = time.time()
    try:
        with ThreadPoolExecutor(max_workers=2) as ex: R = dict(ex.map(kor, [w for w in OVNING if fil in w] if fil else KONTROLL if holdout else OVNING))
    finally: shutil.rmtree(lock, ignore_errors=True)
    rad = [[f] + s for f in R for s in R[f]]; fs = np.array([r[3] for r in rad])
    m = dict(inom3=float(100 * np.mean(fs <= 3.0)), median=float(np.median(fs)), medel=float(np.mean(fs)), ifas=float(np.mean([r[4] for r in rad])), n=len(rad))
    bas_src = os.path.join(kor_, 'bas', 'src'); andr = []
    if os.path.isdir(bas_src) and os.path.isdir(os.path.join(mapp, 'src')):
        for r_, _d, fl in os.walk(os.path.join(mapp, 'src')):
            for x in fl:
                p = os.path.join(r_, x); q = os.path.join(bas_src, os.path.relpath(p, os.path.join(mapp, 'src')))
                if not os.path.exists(q) or E.lika(p) != E.lika(q): andr.append(os.path.relpath(p, os.path.join(mapp, 'src')).replace('\\', '/'))
    out = dict(mapp=os.path.relpath(mapp, ENGINE), matt=m, skarvar=rad, sparr=dict(andradeFiler=sorted(andr)), tidS=round(time.time() - t0))
    io.open(os.path.join(mapp, utnamn), 'w', encoding='utf-8').write(json.dumps(out, ensure_ascii=False, indent=1))
    print(json.dumps(dict(matt={k: round(v, 2) for k, v in m.items()}, andradeFiler=out['sparr']['andradeFiler'], tidS=out['tidS']), ensure_ascii=False))

def sparrar(d, b, pd, pb, holdout):
    s = []
    if d['matt']['ifas'] < b['matt']['ifas'] - 3: s.append('ifas %.1f mot bas %.1f' % (d['matt']['ifas'], b['matt']['ifas']))
    fel = [x for x in d['sparr']['andradeFiler'] if '/' in x or not (x in TILLATNA or (x.startswith('analyser') and x.endswith('.ts')))]
    if fel: s.append('filer ' + ', '.join(fel))
    if pd is None: s.append('pardom%s.json saknas' % ('-holdout' if holdout else ''))
    elif pb is not None:
        M, N = pd['matt'], pb['matt']
        if M['FEL'] > N['FEL'] + 0.5: s.append('FEL %.2f mot bas %.2f' % (M['FEL'], N['FEL']))
        for k in ('par', 'paslag'):
            if M[k] < N[k] - 2: s.append('%s %.1f mot bas %.1f' % (k, M[k], N[k]))
            for f, v in pd['filer'].items():
                if f in pb['filer'] and v[k] < pb['filer'][f][k] - 5: s.append('%s %s %.1f mot bas %.1f' % (k, f, v[k], pb['filer'][f][k]))
        if M['oktav'] > N['oktav'] + 3: s.append('oktav %.1f mot bas %.1f' % (M['oktav'], N['oktav']))
        for f, v in pd['filer'].items():
            if f in pb['filer'] and abs(v['lead_ms'] - pb['filer'][f]['lead_ms']) > 10: s.append('lead %s' % f)
    return s

def rangordna(k, holdout, md):
    nm, pn = ('fasdom-holdout.json', 'pardom-holdout.json') if holdout else ('fasdom.json', 'pardom.json')
    def las(p):
        try: return json.load(io.open(p, encoding='utf-8'))
        except Exception: return None
    b = las(os.path.join(k, 'bas', nm)); pb = las(os.path.join(k, 'bas', pn))
    if not b: raise SystemExit('bas/%s saknas' % nm)
    rows = []
    for x in sorted(os.listdir(k)):
        d = las(os.path.join(k, x, nm))
        if not d: continue
        s = sparrar(d, b, las(os.path.join(k, x, pn)), pb, holdout) if x != 'bas' else []
        p = (d['matt']['inom3'] - b['matt']['inom3']) + 2 * (b['matt']['median'] - d['matt']['median'])
        rows.append((bool(s), -p, x, d['matt'], p, s, las(os.path.join(k, x, pn))))
    rows.sort()
    L = ['| plats | mapp | poäng | inom3 % | median s | medel s | ifas % | FEL | par | spärr |', '|---|---|---|---|---|---|---|---|---|---|']
    for i, (_dq, _np, x, m, p, s, pd) in enumerate(rows, 1):
        L.append('| %d | %s | %+.1f | %.0f | %.2f | %.2f | %.1f | %s | %s | %s |' % (i, x, p, m['inom3'], m['median'], m['medel'], m['ifas'],
                 '%.2f' % pd['matt']['FEL'] if pd else '-', '%.1f' % pd['matt']['par'] if pd else '-', 'DISK: ' + '; '.join(s) if s else 'OK'))
    print('\n'.join(L))
    if md: io.open(os.path.join(k, 'ranking-fasdom%s.md' % ('-holdout' if holdout else '')), 'w', encoding='utf-8').write('\n'.join(L) + '\n')

if __name__ == '__main__':
    a = sys.argv[1:]
    if '--skarva' in a: skarva(a[a.index('--skarva') + 1].replace('\\', '/'))
    elif '--mat' in a:
        fil = a[a.index('--fil') + 1] if '--fil' in a else None
        if fil and not any(fil in w for w in OVNING): sys.exit('--fil får bara vara en övningsfil')
        nm = 'fasdom-fil-%s.json' % fil if fil else 'fasdom-holdout.json' if '--holdout' in a else 'fasdom.json'
        mat(a[0], '--holdout' in a and not fil, nm, fil)
        if '--namn' in a: shutil.copy(os.path.join(a[0], nm), os.path.join(a[0], nm.replace('.json', '-%s.json' % a[a.index('--namn') + 1])))
    else: rangordna(os.path.abspath(a[0]), '--holdout' in a, '--md' in a)
