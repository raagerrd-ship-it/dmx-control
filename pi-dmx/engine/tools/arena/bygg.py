"""LJUSARENAN: bygg en deltagares kopia.  python tools/arena/bygg.py <deltagarmapp>
Mappen ska ligga under engine/.arena/ och innehålla src/ (en kopia av engine/src med deltagarens ändringar).
Skriver <mapp>/tsconfig.json och kompilerar till <mapp>/dist (node_modules hittas uppåt i engine/ - inga länkar).
Ett globalt lås (engine/.arena/.bygglas) gör att bara en kompilering körs åt gången."""
import io, json, os, subprocess, sys, time
ENGINE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
d = os.path.abspath(sys.argv[1])
assert os.path.commonpath([d, os.path.join(ENGINE, '.arena')]) == os.path.join(ENGINE, '.arena'), 'mappen måste ligga under engine/.arena'
assert os.path.isdir(os.path.join(d, 'src')), 'saknar src/'
base = json.load(io.open(os.path.join(ENGINE, 'tsconfig.json'), encoding='utf-8'))
base['compilerOptions'].update({'outDir': 'dist', 'rootDir': 'src'}); base['include'] = ['src/**/*']
io.open(os.path.join(d, 'tsconfig.json'), 'w', encoding='utf-8').write(json.dumps(base, indent=1))
lock = os.path.join(ENGINE, '.arena', '.bygglas')
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
        if (pid is not None and not _levande(pid)) or time.time() - os.path.getmtime(lock) > 600:
            import shutil; shutil.rmtree(lock, ignore_errors=True); continue
        time.sleep(2)
try:
    r = subprocess.run(['node', os.path.join(ENGINE, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', d], cwd=d, capture_output=True, text=True, encoding='utf-8', errors='replace')
finally:
    import shutil; shutil.rmtree(lock, ignore_errors=True)
print(r.stdout[-3000:] + r.stderr[-1000:]); print('BYGGT' if r.returncode == 0 else 'BYGGFEL'); sys.exit(r.returncode)
