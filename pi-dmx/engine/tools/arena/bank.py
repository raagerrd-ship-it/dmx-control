"""LJUSARENAN: domarens bänk för en deltagare.  python tools/arena/bank.py <mapp> [--env K=V ...] [--bas]
<mapp>/dist (byggd med bygg.py) laddas i stället för engine/dist via distHook.mjs; --bas = engine/dist som den är (baslinje/referens).
Kör rytm.py (pop, megamix, lang1021, 300 s var) och dynSet.py (ladans 20 klipp 10-08) med ladans SHOW_ENV + --env,
skriver <mapp>/bank.json. Globalt lås engine/.arena/.banklas: en bänk åt gången (varje bänk kör själv två jobb parallellt = regeln högst två)."""
import argparse, io, json, os, subprocess, sys, tempfile, time
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__)); ENGINE = os.path.dirname(os.path.dirname(HERE))
# KONTROLLMÄNGDEN (--holdout): tre andra ladan-inspelningar med rätt aux-nivå som deltagarna ALDRIG bänkar mot - finalen döms på dem (mot överanpassning)
HOLDOUT = [('lang1028', 'tools/ladan-2026-10-28/lang-20261028T180531.wav'), ('lang1014', 'tools/ladan-2026-10-14/lang-20261014T161434.wav'), ('lang1011', 'tools/ladan-2026-10-11/lang-20261011T130600.wav')]
WAVS = [('lang1021', 'tools/ladan-2026-10-21/lang-20261021T203952.wav'), ('pop', 'tools/pop_ladan.wav'), ('megamix', 'tools/megamix_ladan.wav')]
ap = argparse.ArgumentParser(); ap.add_argument('mapp'); ap.add_argument('--env', action='append', default=[]); ap.add_argument('--bas', action='store_true'); ap.add_argument('--holdout', action='store_true')
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
        r = subprocess.run([sys.executable, 'tools/rytm.py', w, '--s', '300', '--json', js, '--live-kick'] + envarg, cwd=ENGINE, env=env, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=1800)
        try: return n, json.load(io.open(js, encoding='utf-8'))
        except Exception: return n, {'fel': (r.stderr or r.stdout)[-500:]}
        finally: os.remove(js)
    with ThreadPoolExecutor(max_workers=2) as ex: ry = dict(ex.map(rytm, HOLDOUT if a.holdout else WAVS))
    r = None if a.holdout else subprocess.run([sys.executable, 'tools/dynSet.py'] + envarg, cwd=ENGINE, env=env, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=1800)
    line = next((l for l in reversed(r.stdout.splitlines()) if l.startswith('{')), None) if r else None
    dyn = {} if a.holdout else (json.loads(line) if line else {'fel': (r.stderr or '')[-500:]})
finally:
    import shutil; shutil.rmtree(lock, ignore_errors=True)
out = {'mapp': os.path.relpath(d, ENGINE), 'basenv': basenv, 'env': a.env, 'bas': a.bas, 'rytm': ry, 'dyn': dyn, 'tidS': round(time.time() - t0)}
io.open(os.path.join(d, 'bank-holdout.json' if a.holdout else 'bank.json'), 'w', encoding='utf-8').write(json.dumps(out, ensure_ascii=False, indent=1))
fel = [n for n, v in ry.items() if 'fel' in v] + (['dyn'] if 'fel' in dyn else [])
print(f"BÄNKAT {out['mapp']} {out['tidS']} s" + (f"  FEL i {fel}" if fel else ''))
for n, v in ry.items():
    if 'fel' not in v: print(f"  {n:9s} rA {v['rAbest']:.3f} rK {v['rK']:.3f} slagK {v['slagK']:.3f} synl {v['synl']:.2f} ljus {v['ljus']:.3f} lampspr {v['lampspr']:.3f} slocknat {v['slocknat1s']:.4f} t90 {v['ljusLag'].get('t90')}")
if 'levande' in dyn: print(f"  dynSet ljusSteg {dyn['levande'].get('ljusSteg')} mdSteg {dyn['levande'].get('mdSteg')} fladder/min {dyn['fladder'].get('fladderMin')}")
