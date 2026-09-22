"""EN KORNING I LADAN (2026-09-22). Gor allt som behovs nar Pi-DMX ar nabar: hittar Pi:n, bygger om vid behov, deployar
alla dist-filer som skiljer sig (md5-diff, node --check, backup, sudo cp), skriver show-env:en och startar om EN gang.

  cd C:\\Users\\richa\\Desktop\\Claude\\dmx-control\\pi-dmx\\engine
  set PI_PASS=<losenordet>  &&  python tools\\ladan.py            (eller: PI_PASS=... python tools/ladan.py)
  python tools\\ladan.py --dry          visar vad som skulle hanta, ror ingenting
  python tools\\ladan.py --bara-deploy  deployar filer men ror inte env:en
  python tools\\ladan.py --env DMX_X=1  lagger till/andrar en rad i show-env:en

Pi:n nas antingen via sitt eget AP (anslut till WiFi 'pi-dmx' -> 192.168.4.1) eller pa hemnatet/hotspot. Skriptet provar
adresserna i ordning och anvander den som svarar. Losenordet las ur PI_PASS eller %USERPROFILE%\\.lotus-secrets\\pi-dmx.pass
och skrivs aldrig ut.

SHOW-ENV (lotus-portarna, alla bevisade i korbanken pa lotus-korpusen via tools/lotusBenchShim.mjs - se ENV-LADAN.md):
skrivs till /etc/systemd/system/audio-dmx-engine.service.d/lotus.conf och rorbestaende tempo.conf/drop.conf lamnas ifred.
"""
import os, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
ENGINE = os.path.normpath(os.path.join(HERE, '..'))
HOSTS = ([os.environ['PI_HOST']] if os.environ.get('PI_HOST') else []) + ['192.168.4.1', '172.29.167.218', '192.168.1.176']
ARGS = sys.argv[1:]
DRY = '--dry' in ARGS
ONLY_DEPLOY = '--bara-deploy' in ARGS
FROZEN = ARGS[ARGS.index('--fran') + 1] if '--fran' in ARGS else None   # deploya en fryst kopia i stallet for dist/
EXTRA = [ARGS[i + 1] for i, a in enumerate(ARGS) if a == '--env']

# Show-env: EN rad per port, med skalet. Andra har - inte pa Pi:n - sa nasta korning inte tar tillbaka det.
SHOW_ENV = [
    ('DMX_TEMPO_EVIDENCE', '1',      'tempovalet pa slagpoang i stallet for tempogramtopp (lotus: 57/91 mot 46/91)'),
    ('DMX_TEMPO_ENV_S',    '10',     'onset-ringen 10 s - kort ring gav instabilt tempo pa langsamt material'),
    ('DMX_KICK_NOGATE',    '1',      'kickarna grindas inte mot eget grid (lotus: on-beat 0,63 -> 0,95)'),
    ('DMX_KICK_COOLDOWN',  '100',    'baston strax fore slaget skuggade slagets kick i 170 ms'),
    ('DMX_GRID_PHASE',     '1',      'fasen ur bas + helband i stallet for senaste kicken (bank: i fas 77/130, motfas 5)'),
    ('DMX_PHASE_FOLLOW',   '1',      'gridet foljer fasmatningen i stallet for enskilda kickar'),
    ('DMX_SECTION',        '1',      'realtidssektioner (intro/low/build/high/break) ur latens egen historik'),
    ('DMX_SECTION_SWITCH', '1',      'dirigenten gasar pa refrangen och drar ner i break/low'),
    ('DMX_LIVE_LEVEL',     '1',      'nivakanalen genom dB-fonster mot langsamt ankare - liv i nivan'),
]


def pw():
    p = os.environ.get('PI_PASS')
    if p: return p
    f = os.path.expanduser('~/.lotus-secrets/pi-dmx.pass')
    if os.path.exists(f): return open(f).read().strip()
    return 'raspberry'   # Pi-DMX:ns standardlosenord (appliance utan internet); PI_PASS eller ~/.lotus-secrets/pi-dmx.pass vinner


def reachable(host, pw_):
    try:
        import paramiko
        c = paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        c.connect(host, username='pi', password=pw_, timeout=6, look_for_keys=False, allow_agent=False)
        i, o, e = c.exec_command('systemctl is-active audio-dmx-engine', timeout=10)
        st = o.read().decode().strip(); c.close()
        return st
    except Exception:
        return None


def newest(path, exts):
    t = 0
    for root, _dirs, fs in os.walk(path):
        if 'node_modules' in root: continue
        for f in fs:
            if f.endswith(exts): t = max(t, os.path.getmtime(os.path.join(root, f)))
    return t


def main():
    p = pw()
    host = None
    for h in HOSTS:
        st = reachable(h, p)
        if st is not None:
            host = h; print(f'Pi-DMX svarar pa {h} (tjansten: {st})'); break
        print(f'  {h} svarar inte')
    if not host:
        sys.exit('Pi-DMX gar inte att na. Anslut till WiFi "pi-dmx" (eller satt PI_HOST) och kor igen.')

    if FROZEN:
        import shutil
        print(f'deployar FRYST kopia: {FROZEN}')
        if not DRY:
            for root, _d, fs in os.walk(FROZEN):
                rel = os.path.relpath(root, FROZEN)
                dst = os.path.join(ENGINE, 'dist', rel) if rel != '.' else os.path.join(ENGINE, 'dist')
                os.makedirs(dst, exist_ok=True)
                for f in fs: shutil.copy2(os.path.join(root, f), os.path.join(dst, f))
    src_t = 0 if FROZEN else newest(os.path.join(ENGINE, 'src'), ('.ts',))
    dist_t = newest(os.path.join(ENGINE, 'dist'), ('.js',))
    if src_t > dist_t:
        print('kallkoden ar nyare an bygget - bygger om (npx tsc -p .)')
        if not DRY:
            r = subprocess.run(['npx', 'tsc', '-p', '.'], cwd=ENGINE, shell=True)
            if r.returncode: sys.exit('bygget misslyckades - deployar inget')
    else:
        print('bygget ar aktuellt')

    env_pairs = [f'{k}={v}' for k, v, _why in SHOW_ENV] + EXTRA
    cmd = [sys.executable, os.path.join(HERE, 'deploy-dist.py')]
    if DRY: cmd.append('--dry')
    if not ONLY_DEPLOY:
        cmd += ['--conf', 'lotus']
        for e in env_pairs: cmd += ['--env', e]
    print('\nshow-env som skrivs till lotus.conf:' if not ONLY_DEPLOY else '\n(env orord)')
    for k, v, why in SHOW_ENV:
        if not ONLY_DEPLOY: print(f'  {k}={v:<6} {why}')
    for e in EXTRA: print(f'  {e}   (extra fran kommandoraden)')
    print()
    os.environ['PI_HOST'] = host; os.environ['PI_PASS'] = p
    sys.exit(subprocess.run(cmd, cwd=ENGINE).returncode)


if __name__ == '__main__':
    main()
