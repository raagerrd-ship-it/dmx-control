"""DOMAREN FÖR ARENAN 'ETTAN' (2026-11-16) - och DELTAGARNAS BRIEF. Måtten, vikterna och mängderna ändras inte under körningen.

FRÅGAN: motorns takt-etta (effektklockans tick med beatIdx % 4 = 0) ska ligga på MUSIKENS etta. Dagens motor: 29-43 % rätt på ägarens
genomgångna filer, låst i 30 s-bitar men på fel slag, och den väljs om var 30-60 s. Tempo och fas ska vara oförändrade.
FACIT = Beat This!-ettorna (tools/ladan-2026-11-13/beatthis.jsonl; ägarens sektionsmarkeringar ligger på dem till 94-97 % inom +-1 slag).
Facit används BARA av domaren. Motorns kod får aldrig läsa beatthis.jsonl, marks-*.json eller något annat facit.

MÄTNINGEN: node tools/konsertReplay.mjs <wav> --slag --delad-cfg --json <ut> --dist <mapp>/dist (analysator + effektmotor som i ladan,
den delade analysatorn inline). json 'ticks' = (t, beatIdx) för varje taktklocka-tick. Varje tick (15 s in i filen till Beat This sista
slag) paras med närmaste Beat This-slag inom 0,12 s; förskjutning = (beatIdx % 4 - slagets plats i Beat This-takten) % 4.
MÅTTEN (per fil, sedan medel över mängdens filer, lika vikt)
  etta     + %     andel parade tick med förskjutning 0 (rätt etta)
  omval    - /min  byten av förskjutningen räknat i block om 16 parade tick (majoriteten per block), per minut parad tid
  paslag   + %     andel tick som har ett Beat This-slag inom 0,12 s (tempo + fas; ettan påverkar inte det här måttet)
POÄNG = medel(etta - bas.etta) [procentenheter] - 5 x (omval - bas.omval). + = bättre. DISK = sist oavsett poäng.
SPÄRRAR (DISK):
  paslag   medlet < bas - 2 procentenheter, eller någon fil < bas - 5 procentenheter
  filer    ändrade filer i <mapp>/src utanför TILLATNA (jämfört med .arena/<körning>/bas/src = HEAD vid start)
  mätfel   en fil som inte går att mäta
FINALISTERNAS KONTROLLER (orkestratorn, efter finalen): tools/arena/dropdom3.py --mat (drop/minidrop/uppbyggnad och us/hopp oförändrade
  mot bas inom bruset) och tools/arena/klockdom.py --mat i DMX-läge 2 (tempo, låsning, testsignalens etta, grid40). Faller en finalist där
  diskas den och tvåan tas.

MÄNGDERNA
  ÖVNING   151659 (532 s), 172432 (1160 s, spelas som -lagad.wav), 160345 (602 s)       deltagarna mäter här (--mat)
  MELLAN   200719                                                                       bara orkestratorn (--mat --mellan), runda 2
  KONTROLL 171840, 193040, 193818                                                       bara orkestratorn (--mat --holdout), finalen

KOMMANDON (från engine/, PYTHONIOENCODING=utf-8)
  python tools/arena/bygg.py .arena/<körning>/<mapp>                 bygg <mapp>/src -> <mapp>/dist (krävs före --mat)
  python tools/arena/ettdom.py .arena/<körning>/<mapp> --mat [--namn m1]   EN MÄTNING på övningen -> <mapp>/ettdom.json (+ kopia ettdom-<namn>.json)
  python tools/arena/ettdom.py .arena/<körning> [--md] [--mellan|--holdout]   rangordning mot bas (--md skriver ranking-ettdom[-mellan|-holdout].md)
  python tools/arena/ettdom.py .arena/<körning>/<mapp> --sond <wav>   FRI SOND: en övningsfil, skriver bara till <mapp>/sond/ (räknas inte, går
                                                                    genom samma lås). Bara övningens filer.
  LÅS: .arena/.banklas (samma som bank.py): en mätning åt gången, inuti högst två replay-körningar parallellt. ~4 min per --mat.
JSON <mapp>/ettdom.json: {'matt': {etta, omval, paslag, etta_<fil>...}, 'filer': {<fil>: {etta, omval, paslag, forskj [0..3 %], n}}, 'sparr': {'andradeFiler': [...]}}
"""
import glob, io, json, os, shutil, subprocess, sys, time
from concurrent.futures import ThreadPoolExecutor
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); ENGINE = os.path.dirname(os.path.dirname(HERE))
L3, L4 = 'tools/ladan-2026-11-13/', 'tools/ladan-2026-11-14/'
OVNING = [L3 + 'lang-20261113T151659.wav', L3 + 'lang-20261113T172432.wav', L3 + 'lang-20261113T160345.wav']
MELLAN = [L4 + 'lang-20261114T200719.wav']
KONTROLL = [L3 + 'lang-20261113T171840.wav', L4 + 'lang-20261114T193040.wav', L4 + 'lang-20261114T193818.wav']
SPELA = {L3 + 'lang-20261113T172432.wav': L3 + 'lang-20261113T172432-lagad.wav'}
TILLATNA = {'analyser.ts', 'analyserClock.ts', 'analyserBass.ts', 'analyserKick.ts', 'analyserSection.ts', 'analyserSpectrum.ts', 'analyserLevel.ts',
            'analyserRiser.ts', 'analyserCharacter.ts', 'analyserDrop.ts', 'split.ts', 'slowWorker.ts', 'ANALYSER_SHARED.md5'}
BLOCK, PAR_S, START_S = 16, 0.12, 15.0
BT = {}
for l in io.open(os.path.join(ENGINE, L3, 'beatthis.jsonl'), encoding='utf-8'):
    d = json.loads(l); BT[os.path.basename(d['path']).replace('-oklippt', '')] = d
def kort(w): return os.path.basename(w)[-10:-4]
def lika(p): return open(p, 'rb').read().replace(b'\r\n', b'\n')

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

def dom_fil(rp, wav):
    TK = json.load(io.open(rp, encoding='utf-8')).get('ticks') or []
    bt = BT[os.path.basename(wav)]; B = np.array(bt['beatsS']); D = np.array(bt['downbeatsS'])
    T = np.array(TK[0::2], dtype=float); I = np.array(TK[1::2], dtype=float); ok = (T > START_S) & (T < B[-1])
    pos, tp = [], []
    for t, i in zip(T[ok], I[ok]):
        k = int(np.argmin(abs(B - t)))
        if abs(B[k] - t) > PAR_S: continue
        dd = np.searchsorted(D, B[k] + 1e-3) - 1
        if dd < 0: continue
        bp = int(np.searchsorted(B, B[k] + 1e-3) - np.searchsorted(B, D[dd])) - 1
        pos.append(int((int(i) % 4 - bp) % 4)); tp.append(t)
    n = len(pos)
    if n < 50: raise SystemExit('MÄTFEL: %s bara %d parade tick' % (wav, n))
    h = np.bincount(pos, minlength=4)
    maj = [int(np.bincount(pos[j:j + BLOCK], minlength=4).argmax()) for j in range(0, n - BLOCK + 1, BLOCK)]
    byten = sum(1 for a, b in zip(maj, maj[1:]) if a != b); minuter = (tp[-1] - tp[0]) / 60
    return dict(etta=100.0 * h[0] / n, omval=byten / max(minuter, 1e-6), paslag=100.0 * n / max(1, int(ok.sum())), forskj=[round(100.0 * x / n, 1) for x in h], n=n)

def mat(mapp, wavs, utnamn, sond=False):
    mapp = os.path.abspath(mapp); dist = os.path.join(mapp, 'dist')
    if not os.path.isdir(dist): raise SystemExit('bygg först: python tools/arena/bygg.py ' + mapp)
    ut = os.path.join(mapp, 'sond' if sond else 'ettdom'); os.makedirs(ut, exist_ok=True)
    def kor(w):
        js = os.path.join(ut, 'kr-%s.json' % kort(w))
        if os.path.exists(js): os.remove(js)
        r = subprocess.run(['node', 'tools/konsertReplay.mjs', SPELA.get(w, w), '--slag', '--delad-cfg', '--json', js, '--dist', dist], cwd=ENGINE,
                           capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=3600)
        if r.returncode != 0 or not os.path.exists(js): raise SystemExit('MÄTFEL %s: %s' % (w, (r.stderr or r.stdout)[-600:]))
        return kort(w), dom_fil(js, w)
    lock = las_lock(); t0 = time.time()
    try:
        with ThreadPoolExecutor(max_workers=2) as ex: F = dict(ex.map(kor, wavs))
    finally: shutil.rmtree(lock, ignore_errors=True)
    m = {k: float(np.mean([F[f][k] for f in F])) for k in ('etta', 'omval', 'paslag')}
    for f in F: m['etta_' + f] = F[f]['etta']
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
    if not sond:
        io.open(os.path.join(mapp, utnamn), 'w', encoding='utf-8').write(json.dumps(out, ensure_ascii=False, indent=1))
    print(json.dumps(dict(matt={k: round(v, 2) for k, v in m.items()}, andradeFiler=out['sparr']['andradeFiler'], tidS=out['tidS']), ensure_ascii=False))
    return out

def rangordna(k, suffix, md):
    def las(p):
        try: return json.load(io.open(p, encoding='utf-8'))
        except Exception: return None
    bas = las(os.path.join(k, 'bas', 'ettdom%s.json' % suffix))
    if not bas: raise SystemExit('bas saknar ettdom%s.json' % suffix)
    B = bas['matt']; rad = []
    for n in sorted(os.listdir(k)):
        d = las(os.path.join(k, n, 'ettdom%s.json' % suffix))
        if not d or n == 'bas': continue
        M = d['matt']; disk = []
        if M['paslag'] < B['paslag'] - 2: disk.append('paslag %.1f < bas %.1f - 2' % (M['paslag'], B['paslag']))
        for f, v in d['filer'].items():
            if f in bas['filer'] and v['paslag'] < bas['filer'][f]['paslag'] - 5: disk.append('paslag %s %.1f < bas %.1f - 5' % (f, v['paslag'], bas['filer'][f]['paslag']))
        fel = [x for x in d['sparr']['andradeFiler'] if x.split('/')[-1].replace(' (borttagen)', '') not in TILLATNA or '/' in x]
        if fel: disk.append('filer utanför tillåtna: ' + ', '.join(fel))
        p = float(np.mean([d['filer'][f]['etta'] - bas['filer'][f]['etta'] for f in d['filer'] if f in bas['filer']])) - 5 * (M['omval'] - B['omval'])
        rad.append((n, p, M, disk, d))
    rad.sort(key=lambda r: (bool(r[3]), -r[1]))
    rub = 'mellanmängden' if suffix == '-mellan' else 'kontrollmängden' if suffix == '-holdout' else 'övningen'
    L = ['# Ranking %s, %s (tools/arena/ettdom.py, mot bas)' % (os.path.basename(k), rub), '',
         'bas: etta %.1f %%  omval %.2f/min  paslag %.1f %%  | %s' % (B['etta'], B['omval'], B['paslag'], '  '.join('%s %.0f/%.0f/%.0f/%.0f' % (f, *v['forskj']) for f, v in bas['filer'].items())), '',
         '| plats | deltagare | poäng | etta % | omval /min | paslag % | per fil etta (förskjutning 0/1/2/3 %) | DISK |', '|---|---|---|---|---|---|---|---|']
    for i, (n, p, M, disk, d) in enumerate(rad, 1):
        L.append('| %d | %s | %+.2f | %.1f | %.2f | %.1f | %s | %s |' % (i, n, p, M['etta'], M['omval'], M['paslag'],
                 '  '.join('%s %.0f/%.0f/%.0f/%.0f' % (f, *v['forskj']) for f, v in d['filer'].items()), '; '.join(disk) or '-'))
    txt = '\n'.join(L) + '\n'; print(txt)
    if md: io.open(os.path.join(k, 'ranking-ettdom%s.md' % suffix), 'w', encoding='utf-8').write(txt)

if __name__ == '__main__':
    a = sys.argv[1:]
    if not a: sys.exit(__doc__)
    p = os.path.abspath(a[0]); os.chdir(ENGINE)
    if '--sond' in a:
        w = a[a.index('--sond') + 1].replace('\\', '/'); w = next((x for x in OVNING if kort(x) in w), None)
        if not w: sys.exit('sonden får bara köra övningens filer: ' + ', '.join(OVNING))
        mat(p, [w], None, sond=True)
    elif '--mat' in a:
        wavs, nm = (MELLAN, 'ettdom-mellan.json') if '--mellan' in a else (KONTROLL, 'ettdom-holdout.json') if '--holdout' in a else (OVNING, 'ettdom.json')
        out = mat(p, wavs, nm)
        if '--namn' in a and nm == 'ettdom.json': shutil.copy(os.path.join(p, nm), os.path.join(p, 'ettdom-%s.json' % a[a.index('--namn') + 1]))
    else:
        rangordna(p, '-mellan' if '--mellan' in a else '-holdout' if '--holdout' in a else '', '--md' in a)
