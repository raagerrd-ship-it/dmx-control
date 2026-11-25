"""LJUSARENAN: domarens bänk för en deltagare.  python tools/arena/bank.py <mapp> [--env K=V ...] [--bas]
<mapp>/dist (byggd med bygg.py) laddas i stället för engine/dist via distHook.mjs; --bas = engine/dist som den är (baslinje/referens).
Kör rytm.py (pop, megamix, lang1021, 300 s var) och dynSet.py (ladans 20 klipp 10-08) med ladans SHOW_ENV + --env,
skriver <mapp>/bank.json. --hela (TILLÄGG 11-25, del M): HELA inspelningarna i stället för de första 300 s, och 172432 (musiken, 1160 s) med i övningen ->
<mapp>/bank-hela.json (med --holdout bank-hela-holdout.json). Utan --hela är allt som förr (samma filer, samma 300 s, samma utfil). Globalt lås engine/.arena/.banklas: en bänk åt gången (varje bänk kör själv två jobb parallellt = regeln högst två)."""
import argparse, io, json, os, subprocess, sys, tempfile, time
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__)); ENGINE = os.path.dirname(os.path.dirname(HERE))
# KONTROLLMÄNGDEN (--holdout): tre andra ladan-inspelningar med rätt aux-nivå som deltagarna ALDRIG bänkar mot - finalen döms på dem (mot överanpassning)
# 11-15: fillistorna ombyggda på det rena ljudet (allt äldre är arkiverat 11-13). ÖVNING = de tre från 11-13, KONTROLL = de tre från 11-14.
# Inspelningarnas första 300 s (rytm.py --s 300). dynSet (ladans 20 klipp 10-08, arkiverade) körs bara om klippen finns - annars dömer
# domaren dynamiken på slagK + djup som i kontrollen.
HOLDOUT = [('l193818', 'tools/ladan-2026-11-14/lang-20261114T193818.wav'), ('l193040', 'tools/ladan-2026-11-14/lang-20261114T193040.wav'), ('l200719', 'tools/ladan-2026-11-14/lang-20261114T200719.wav')]
WAVS = [('l160345', 'tools/ladan-2026-11-13/lang-20261113T160345.wav'), ('l151659', 'tools/ladan-2026-11-13/lang-20261113T151659.wav'), ('l171840', 'tools/ladan-2026-11-13/lang-20261113T171840.wav')]
# --hela (11-25, del M): standardbänken ser 30,0 av 106,7 min (de första 300 s av tre filer per mängd). Med --hela körs filerna hela, och
# övningen får 172432 (30,7 min, den lagade kopian: samma ljud med helt filhuvud, som dropdom3/ettdom spelar). Längst först: två jobb
# parallellt blir då ~lika långa. Måtten (rytm.py) och domarens regler är desamma. Eget utfilnamn, så gamla domar ligger kvar orörda.
# 172432 läses till 1160 s (som dropdom3/ettdom): musiken slutar vid 1168 s, resten (11 min) är tystnad under -40 dBFS. Med tystnaden
# med blir filens basvärden nära noll (slagK 0,08, djup 0,09, slocknat1s 0,37) och domarens relativa mått blåser upp på ingenting.
HELA_EXTRA = [('l172432', 'tools/ladan-2026-11-13/lang-20261113T172432-lagad.wav')]
HELA_S = {'l172432': '1160'}
DYN = bool(__import__('glob').glob(os.path.join(ENGINE, 'tools', 'ladan-2026-10-08', '*.wav')))
ap = argparse.ArgumentParser(); ap.add_argument('mapp'); ap.add_argument('--env', action='append', default=[]); ap.add_argument('--bas', action='store_true'); ap.add_argument('--holdout', action='store_true'); ap.add_argument('--hela', action='store_true')
a = ap.parse_args(); d = os.path.abspath(a.mapp); os.makedirs(d, exist_ok=True)
env = dict(os.environ)
if not a.bas:
    assert os.path.exists(os.path.join(d, 'dist', 'effects.js')), 'bygg först: python tools/arena/bygg.py ' + a.mapp
    env['DMX_DIST'] = os.path.join(d, 'dist')
    import pathlib; env['NODE_OPTIONS'] = (env.get('NODE_OPTIONS', '') + ' --import=' + pathlib.Path(HERE, 'distHook.mjs').as_uri()).strip()
# BASENV (ägaren 11-07: 'domaren ska få de förändringar vi fastställt natten innan'): <körning>/basenv.txt, en K=V per rad, läggs FÖRE --env
# på ALLA i körningen (bas, ref, deltagare) - det är dagens bästa läge som deltagarna ska slå, inte gårdagens kod.
bf = os.path.join(os.path.dirname(d), 'basenv.txt')
basenv = [l.strip() for l in io.open(bf, encoding='utf-8') if '=' in l and not l.lstrip().startswith('#')] if os.path.exists(bf) else []
envarg = sum((['--env', e] for e in basenv + a.env), [])
lock = os.path.join(ENGINE, '.arena', '.banklas'); os.makedirs(os.path.dirname(lock), exist_ok=True)
def _levande(pid):   # LÅSET BÄR PID (11-07: en avbruten bänk lämnade låset och stoppade alla i 19 min) - död ägare = fritt lås
    try:
        import ctypes; h = ctypes.windll.kernel32.OpenProcess(0x1000, False, pid)
        if not h: return False
        code = ctypes.c_ulong(); ctypes.windll.kernel32.GetExitCodeProcess(h, ctypes.byref(code)); ctypes.windll.kernel32.CloseHandle(h); return code.value == 259
    except Exception:
        try: os.kill(pid, 0); return True
        except Exception: return False
while True:
    try:
        os.mkdir(lock); io.open(os.path.join(lock, 'pid'), 'w').write(str(os.getpid())); break
    except FileExistsError:
        try: pid = int(io.open(os.path.join(lock, 'pid')).read())
        except Exception: pid = None
        if (pid is not None and not _levande(pid)) or time.time() - os.path.getmtime(lock) > 3600:
            import shutil; shutil.rmtree(lock, ignore_errors=True); continue
        time.sleep(5)
t0 = time.time()
try:
    # --live-kick (från runda 2 i puls1): rytm.py kör som riggen (registerKick + KICK-BYPASS), mätfälla 52
    def rytm(nw):
        n, w = nw; fd, js = tempfile.mkstemp(suffix='.json'); os.close(fd)
        r = subprocess.run([sys.executable, 'tools/rytm.py', w, '--s', HELA_S.get(n, '99999') if a.hela else '300', '--json', js, '--live-kick'] + envarg, cwd=ENGINE, env=env, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=7200 if a.hela else 1800)
        try: return n, json.load(io.open(js, encoding='utf-8'))
        except Exception: return n, {'fel': (r.stderr or r.stdout)[-500:]}
        finally: os.remove(js)
    with ThreadPoolExecutor(max_workers=2) as ex: ry = dict(ex.map(rytm, HOLDOUT if a.holdout else (HELA_EXTRA + WAVS if a.hela else WAVS)))
    r = None if a.holdout or not DYN else subprocess.run([sys.executable, 'tools/dynSet.py'] + envarg, cwd=ENGINE, env=env, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=1800)
    line = next((l for l in reversed(r.stdout.splitlines()) if l.startswith('{')), None) if r else None
    dyn = {} if a.holdout or not DYN else (json.loads(line) if line else {'fel': (r.stderr or '')[-500:]})
finally:
    import shutil; shutil.rmtree(lock, ignore_errors=True)
out = {'mapp': os.path.relpath(d, ENGINE), 'basenv': basenv, 'env': a.env, 'bas': a.bas, **({'hela': True} if a.hela else {}), 'rytm': ry, 'dyn': dyn, 'tidS': round(time.time() - t0)}
io.open(os.path.join(d, ('bank-hela-holdout.json' if a.holdout else 'bank-hela.json') if a.hela else ('bank-holdout.json' if a.holdout else 'bank.json')), 'w', encoding='utf-8').write(json.dumps(out, ensure_ascii=False, indent=1))
fel = [n for n, v in ry.items() if 'fel' in v] + (['dyn'] if 'fel' in dyn else [])
print(f"BÄNKAT {out['mapp']} {out['tidS']} s" + (f"  FEL i {fel}" if fel else ''))
for n, v in ry.items():
    if 'fel' not in v: print(f"  {n:9s} rA {v['rAbest']:.3f} rK {v['rK']:.3f} slagK {v['slagK']:.3f} synl {v['synl']:.2f} ljus {v['ljus']:.3f} lampspr {v['lampspr']:.3f} slocknat {v['slocknat1s']:.4f} t90 {v['ljusLag'].get('t90')}")
if 'levande' in dyn: print(f"  dynSet ljusSteg {dyn['levande'].get('ljusSteg')} mdSteg {dyn['levande'].get('mdSteg')} fladder/min {dyn['fladder'].get('fladderMin')}")
