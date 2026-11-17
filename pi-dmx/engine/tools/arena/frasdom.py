"""DOMAREN FÖR ARENAN 'FRASEN' (2026-11-16 kväll) - och DELTAGARNAS BRIEF. Måtten, vikterna och mängderna ändras inte under körningen.

FRÅGAN: ljusets LOOKBYTE ska komma på musikens fras - där ägaren hör att en ny del börjar (vers, refräng, uppbyggnad, drop, break, outro) -
som i en förprogrammerad show. Dagens motor (HEAD 720be60, ettan rätt sedan f0): sektionsbytet kommer median 4,6-7,0 s (11-14 slag) efter
ägarens gräns, spridning 0-41 slag, och landar på frasen 18-24 % (slump 19 %). Ägarens gränser ligger inom +-1 slag från musikens etta till 96-97 %.
FACIT = ägarens sektionsmarkeringar (*.marks-hand.json, klar) + Beat This!-slagen (tools/ladan-2026-11-13/beatthis.jsonl). Facit används BARA
av domaren. Motorns kod får aldrig läsa marks-*.json, beatthis.jsonl eller något annat facit, och får inte se framåt i ljudet.

MÄTNINGEN: node tools/konsertReplay.mjs <wav> --slag --delad-cfg --json <ut> --dist <mapp>/dist (analysator + effektmotor som i ladan, den
delade analysatorn inline). json 'switches' = (t, orsak) för varje lookbyte, alla orsaker (sektion, drop, build ...).
Position räknas i Beat This-slag (interpolerat). För varje ägargräns g (intro/vers/refrang/break/uppbyggnad/drop/outro, ej mini/latbyte):
första lookbytet med läge g-1 .. g+16 slag.
MÅTTEN (per fil, sedan medel över mängdens filer, lika vikt)
  grans  + %     andel ägargränser med ett lookbyte inom +-1 slag (bytet SITTER på frasen)
  lag    - slag  medel av bytets läge efter gränsen (saknas byte inom g+16 slag = 16)
  etta   + %     andel av ALLA lookbyten som sitter på en Beat This-etta (inom 0,15 s)
  losa     /min  lookbyten som inte ligger g-1 .. g+16 slag från någon ägargräns (spärr)
  byten    /min  alla lookbyten (spärr)
  miss     (info) %  andel ägargränser utan något byte inom g+16 slag (11-17, arenan grans)
POÄNG = medel(grans - bas) + 0,5 x medel(etta - bas) - 1,5 x medel(lag - bas). + = bättre. DISK = sist oavsett poäng.
SPÄRRAR (DISK):
  losa     medlet > bas + 0,5/min
  byten    någon fil > 1,3 x bas + 0,3/min (inga byten var fjärde takt "på chans")
  ljus     ljusdomaren (tools/arena/bank.py + domare.py v3 på dess övning) DISK, eller dess poäng < -1,5
           (<körning>/ljusgrans.txt ersätter -1,5 och gör lampspr till info; sätts bara mellan körningar. 11-17: en ensam bänks lookvalsbrus
            är std 2,8-4,2 poäng (tools/natt/ljusbrus-2026-11-17.md) -> rundorna -5,6, finalen döms med ljusskak.py på medel av 4 frön, -3,0)
  filer    ändrade filer utanför TILLATNA (jämfört med .arena/<körning>/bas/src = HEAD vid start)
  mätfel   en fil som inte går att mäta
FINALISTERNAS KONTROLLER (orkestratorn): dropdom3.py --mat (drop/minidrop/uppbyggnad oförändrade mot bas), latskak.py (takt + låtbyten,
  5 starter), ettdom.py (ettan inte sämre), kodgranskning mot de låsta reglerna. Faller en finalist där diskas den och tvåan tas.

MÄNGDERNA
  ÖVNING   151659 (532 s, 33 gränser), 171840 (300 s, 24), 193040 (381 s, 32)       deltagarna mäter här (--mat)
  MELLAN   172432 före 600 s                                                       bara orkestratorn (--mat --mellan), runda 2
  KONTROLL 172432 från 600 s (till Beat This sista slag)                           bara orkestratorn (--mat --holdout), finalen

KOMMANDON (från engine/, PYTHONIOENCODING=utf-8)
  python tools/arena/bygg.py .arena/<körning>/<mapp>                    bygg <mapp>/src -> <mapp>/dist (krävs före --mat)
  python tools/arena/frasdom.py .arena/<körning>/<mapp> --mat [--namn m1]   EN MÄTNING på övningen (replay + ljusdomarens bank.py)
                                                                       -> <mapp>/frasdom.json + <mapp>/bank.json (+ kopia frasdom-<namn>.json)
  python tools/arena/frasdom.py .arena/<körning> [--md] [--mellan|--holdout]   rangordning mot bas (--md skriver ranking-fras[-mellan|-holdout].md)
  python tools/arena/frasdom.py .arena/<körning>/<mapp> --sond <wav>    FRI SOND: en övningsfil, bara replay, skriver till <mapp>/sond/ (räknas
                                                                       inte, går genom samma lås). Bara övningens filer.
  LÅS: .arena/.banklas (samma som bank.py): en mätning åt gången. ~5 min per --mat.
"""
import io, json, os, shutil, subprocess, sys, time
from concurrent.futures import ThreadPoolExecutor
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); ENGINE = os.path.dirname(os.path.dirname(HERE))
L3, L4 = 'tools/ladan-2026-11-13/', 'tools/ladan-2026-11-14/'
OVNING = [(L3 + 'lang-20261113T151659.wav', 0, 1e9), (L3 + 'lang-20261113T171840.wav', 0, 1e9), (L4 + 'lang-20261114T193040.wav', 0, 1e9)]
MELLAN = [(L3 + 'lang-20261113T172432.wav', 0, 600)]
KONTROLL = [(L3 + 'lang-20261113T172432.wav', 600, 1e9)]
SPELA = {L3 + 'lang-20261113T172432.wav': L3 + 'lang-20261113T172432-lagad.wav'}
TILLATNA = {'effects.ts', 'analyserSection.ts', 'analyser.ts', 'split.ts', 'slowWorker.ts', 'analyserProfile.ts', 'ANALYSER_SHARED.md5'}
SEK = {'intro', 'vers', 'refrang', 'break', 'uppbyggnad', 'drop', 'outro'}
START_S, FORE, EFTER, PA, ETTA_S = 15.0, 1.0, 16.0, 1.0, 0.15
BT = {}
for l in io.open(os.path.join(ENGINE, L3, 'beatthis.jsonl'), encoding='utf-8'):
    d = json.loads(l); BT[os.path.basename(d['path']).replace('-oklippt', '')] = d
def kort(w): return os.path.basename(w)[-10:-4]
def lika(p): return open(p, 'rb').read().replace(b'\r\n', b'\n')
def tillaten(rel): return rel.replace(' (borttagen)', '') in TILLATNA or (rel.startswith('effects/') and rel.endswith('.ts'))

def las_lock():
    lock = os.path.join(ENGINE, '.arena', '.banklas'); os.makedirs(os.path.dirname(lock), exist_ok=True)
    def levande(pid):
        try:
            import ctypes; h = ctypes.windll.kernel32.OpenProcess(0x1000, False, pid)
            if not h: return False
            c = ctypes.c_ulong(); ctypes.windll.kernel32.GetExitCodeProcess(h, ctypes.byref(c)); ctypes.windll.kernel32.CloseHandle(h); return c.value == 259
        except Exception: return True
    while True:
        try: os.mkdir(lock); io.open(os.path.join(lock, 'pid'), 'w').write(str(os.getpid())); return lock
        except FileExistsError:
            try: pid = int(io.open(os.path.join(lock, 'pid')).read())
            except Exception: pid = None
            if (pid is not None and not levande(pid)) or time.time() - os.path.getmtime(lock) > 3600: shutil.rmtree(lock, ignore_errors=True); continue
            time.sleep(5)

def dom_fil(rp, wav, t0, t1):
    SWr = json.load(io.open(rp, encoding='utf-8')).get('switches')
    if SWr is None: raise SystemExit('MÄTFEL: %s saknar switches (konsertReplay utan --slag?)' % rp)
    bt = BT[os.path.basename(wav)]; B = np.array(bt['beatsS']); D = np.array(bt['downbeatsS'])
    lo, hi = max(t0, START_S), min(t1, B[-1])
    pos = lambda t: float(np.interp(t, B, np.arange(len(B))))
    S = np.array([t for t in SWr[0::2] if lo <= t <= hi + 10], dtype=float)
    mh = json.load(io.open(wav[:-4] + '.marks-hand.json', encoding='utf-8'))
    G = sorted(m['fineS'] for m in mh['marks'] if m['kind'] in SEK and not m.get('skip') and lo <= m['fineS'] <= hi - 8)
    if len(G) < 5: raise SystemExit('MÄTFEL: %s bara %d gränser' % (wav, len(G)))
    PS = np.array([pos(t) for t in S]); lag, pa = [], 0
    for g in G:
        o = PS - pos(g); k = np.where((o >= -FORE) & (o <= EFTER))[0]
        if len(k): x = float(o[k[0]]); lag.append(max(0.0, x)); pa += abs(x) <= PA
        else: lag.append(EFTER)
    Si = S[S <= hi]; PSi = PS[S <= hi]; PG = np.array([pos(g) for g in G]); losa = 0; etta = 0
    for t, p in zip(Si, PSi):
        o = p - PG
        if not np.any((o >= -FORE) & (o <= EFTER)): losa += 1
        if len(D) and np.min(abs(D - t)) <= ETTA_S: etta += 1
    minuter = (hi - lo) / 60
    return dict(miss=100.0 * sum(1 for x in lag if x >= EFTER) / len(G), grans=100.0 * pa / len(G), lag=float(np.mean(lag)), etta=100.0 * etta / max(1, len(Si)), losa=losa / minuter, byten=len(Si) / minuter,
                n_grans=len(G), n_byten=int(len(Si)), lagslag=[round(x, 1) for x in lag])

def mat(mapp, mangd, utnamn, sond=False, bank=True):
    mapp = os.path.abspath(mapp); dist = os.path.join(mapp, 'dist')
    if not os.path.isdir(dist): raise SystemExit('bygg först: python tools/arena/bygg.py ' + mapp)
    ut = os.path.join(mapp, 'sond' if sond else 'frasdom'); os.makedirs(ut, exist_ok=True)
    def kor(w):
        js = os.path.join(ut, 'kr-%s.json' % kort(w))
        if os.path.exists(js): os.remove(js)
        r = subprocess.run(['node', 'tools/konsertReplay.mjs', SPELA.get(w, w), '--slag', '--delad-cfg', '--json', js, '--dist', dist], cwd=ENGINE,
                           capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=3600)
        if r.returncode != 0 or not os.path.exists(js): raise SystemExit('MÄTFEL %s: %s' % (w, (r.stderr or r.stdout)[-600:]))
        return w, js
    lock = las_lock(); t0 = time.time()
    try:
        with ThreadPoolExecutor(max_workers=2) as ex: JS = dict(ex.map(kor, sorted({w for w, _, _ in mangd})))
    finally: shutil.rmtree(lock, ignore_errors=True)
    F = {kort(w): dom_fil(JS[w], w, a, b) for w, a, b in mangd}
    m = {k: float(np.mean([F[f][k] for f in F])) for k in ('grans', 'lag', 'etta', 'losa', 'byten', 'miss')}
    if bank and not sond:
        args = [sys.executable, 'tools/arena/bank.py', mapp] + (['--bas'] if os.path.basename(mapp) == 'bas' else [])
        r = subprocess.run(args, cwd=ENGINE, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=3600)
        if r.returncode != 0: print('VARNING bank.py: ' + (r.stderr or r.stdout)[-400:])
    bas_src = os.path.join(os.path.dirname(mapp), 'bas', 'src'); andr = []
    if os.path.isdir(bas_src) and os.path.isdir(os.path.join(mapp, 'src')):
        for r_, _d, fs in os.walk(os.path.join(mapp, 'src')):
            for x in fs:
                p = os.path.join(r_, x); q = os.path.join(bas_src, os.path.relpath(p, os.path.join(mapp, 'src')))
                if not os.path.exists(q) or lika(p) != lika(q): andr.append(os.path.relpath(p, os.path.join(mapp, 'src')).replace('\\', '/'))
        for r_, _d, fs in os.walk(bas_src):
            for x in fs:
                q = os.path.join(r_, x)
                if not os.path.exists(os.path.join(mapp, 'src', os.path.relpath(q, bas_src))): andr.append(os.path.relpath(q, bas_src).replace('\\', '/') + ' (borttagen)')
    out = dict(mapp=os.path.relpath(mapp, ENGINE), matt=m, filer=F, sparr=dict(andradeFiler=sorted(andr)), tidS=round(time.time() - t0))
    if not sond: io.open(os.path.join(mapp, utnamn), 'w', encoding='utf-8').write(json.dumps(out, ensure_ascii=False, indent=1))
    print(json.dumps(dict(matt={k: round(v, 2) for k, v in m.items()}, filer={f: {k: round(v[k], 1) for k in ('grans', 'lag', 'etta', 'losa', 'byten', 'miss')} for f, v in F.items()},
                          andradeFiler=out['sparr']['andradeFiler'], tidS=out['tidS']), ensure_ascii=False))
    return out

def ljusdom(k):
    """ljusdomaren (domare.py v3, dess övning) per mapp: {namn: (poäng, [disk])}"""
    sys.argv = [sys.argv[0]]; sys.path.insert(0, HERE); import domare
    b = domare.load(os.path.join(k, 'bas')); res = {}
    if not b: return res
    for n in os.listdir(k):
        d = os.path.join(k, n); v = domare.load(d) if os.path.isdir(d) and n != 'bas' else None
        if v:
            r = domare.doma(b, v, d); res[n] = (r['poang'], [x for x in r['disk'] if not x.startswith('förbjudna filer')])
    return res

def rangordna(k, suffix, md):
    def las(p):
        try: return json.load(io.open(p, encoding='utf-8'))
        except Exception: return None
    bas = las(os.path.join(k, 'bas', 'frasdom%s.json' % suffix))
    if not bas: raise SystemExit('bas saknar frasdom%s.json' % suffix)
    LJ = ljusdom(k); B = bas['matt']; rad = []
    lg = os.path.join(k, 'ljusgrans.txt'); LJG = float(io.open(lg).read().strip()) if os.path.exists(lg) else -1.5   # körningens egen ljusspärr (mellan körningar)
    for n in sorted(os.listdir(k)):
        d = las(os.path.join(k, n, 'frasdom%s.json' % suffix))
        if not d or n == 'bas': continue
        M = d['matt']; disk = []
        if M['losa'] > B['losa'] + 0.5: disk.append('lösa byten %.2f > bas %.2f + 0,5/min' % (M['losa'], B['losa']))
        for f, v in d['filer'].items():
            if f in bas['filer'] and v['byten'] > 1.3 * bas['filer'][f]['byten'] + 0.3: disk.append('byten %s %.2f > 1,3 x bas %.2f + 0,3' % (f, v['byten'], bas['filer'][f]['byten']))
        lj = LJ.get(n)
        if lj is None: disk.append('ljusdomaren saknas (bank.json)')
        else:
            ld = [x for x in lj[1] if not (os.path.exists(lg) and x.startswith('lampspr'))]   # med ljusgrans.txt: lampspr döms bara på frömedlet (ljusskak.py) i finalen
            if ld: disk.append('ljus: ' + '; '.join(ld))
            if lj[0] is not None and lj[0] < LJG: disk.append('ljus %.1f < %.1f' % (lj[0], LJG))
        fel = [x for x in d['sparr']['andradeFiler'] if not tillaten(x)]
        if fel: disk.append('filer utanför tillåtna: ' + ', '.join(fel))
        fs = [f for f in d['filer'] if f in bas['filer']]
        dlt = lambda key: float(np.mean([d['filer'][f][key] - bas['filer'][f][key] for f in fs]))
        p = dlt('grans') + 0.5 * dlt('etta') - 1.5 * dlt('lag')
        rad.append((n, p, M, disk, d, lj))
    rad.sort(key=lambda r: (bool(r[3]), -r[1]))
    rub = 'mellanmängden' if suffix == '-mellan' else 'kontrollmängden' if suffix == '-holdout' else 'övningen'
    L = ['# Ranking %s, %s (tools/arena/frasdom.py, mot bas)' % (os.path.basename(k), rub), '',
         'bas: gräns %.1f %%  lag %.1f slag  etta %.1f %%  lösa %.2f/min  byten %.2f/min  | %s' % (B['grans'], B['lag'], B['etta'], B['losa'], B['byten'],
             '  '.join('%s %.0f%%/%.1f' % (f, v['grans'], v['lag']) for f, v in bas['filer'].items())), '',
         '| plats | deltagare | poäng | gräns % | lag slag | missade % | etta % | lösa /min | byten /min | ljus | per fil gräns %/lag | DISK |', '|---|---|---|---|---|---|---|---|---|---|---|---|']
    for i, (n, p, M, disk, d, lj) in enumerate(rad, 1):
        L.append('| %d | %s | %+.2f | %.1f | %.1f | %s | %.1f | %.2f | %.2f | %s | %s | %s |' % (i, n, p, M['grans'], M['lag'], '%.1f' % M['miss'] if 'miss' in M else '-', M['etta'], M['losa'], M['byten'],
                 '-' if not lj or lj[0] is None else '%+.1f' % lj[0], '  '.join('%s %.0f/%.1f' % (f, v['grans'], v['lag']) for f, v in d['filer'].items()), '; '.join(disk) or '-'))
    txt = '\n'.join(L) + '\n'; print(txt)
    if md: io.open(os.path.join(k, 'ranking-fras%s.md' % suffix), 'w', encoding='utf-8').write(txt)

if __name__ == '__main__':
    a = sys.argv[1:]
    if not a: sys.exit(__doc__)
    p = os.path.abspath(a[0]); os.chdir(ENGINE)
    if '--sond' in a:
        w = a[a.index('--sond') + 1].replace('\\', '/'); m = [x for x in OVNING if kort(x[0]) in w]
        if not m: sys.exit('sonden får bara köra övningens filer: ' + ', '.join(x[0] for x in OVNING))
        mat(p, m, None, sond=True)
    elif '--mat' in a:
        mangd, nm = (MELLAN, 'frasdom-mellan.json') if '--mellan' in a else (KONTROLL, 'frasdom-holdout.json') if '--holdout' in a else (OVNING, 'frasdom.json')
        mat(p, mangd, nm, bank=(nm == 'frasdom.json'))
        if '--namn' in a and nm == 'frasdom.json': shutil.copy(os.path.join(p, nm), os.path.join(p, 'frasdom-%s.json' % a[a.index('--namn') + 1]))
    else:
        rangordna(p, '-mellan' if '--mellan' in a else '-holdout' if '--holdout' in a else '', '--md' in a)
