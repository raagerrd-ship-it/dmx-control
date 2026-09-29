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
skrivs till /etc/systemd/system/audio-dmx-engine.service.d/ladan.conf och rorbestaende tempo.conf/drop.conf lamnas ifred.
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
PORTAR = '--portar' in ARGS   # skriv aven PORTAR_EJ_LIVE (lotus-portarna) - eget A/B-steg

# Show-env: EN rad per port, med skalet. Andra har - inte pa Pi:n - sa nasta korning inte tar tillbaka det.
# LOTUS-PORTARNA (tempo/kick/grid/tystnad) ar INTE live i ladan: lotus.conf rullades tillbaka 09-22 23:35 ("nastan 0 show") och Pi:n
# kordes 09-22 kvall och 09-23 utan dem. De skrivs bara med flaggan --portar (eget A/B-steg), sa en vanlig korning inte slar pa dem tyst.
PORTAR_EJ_LIVE = [
    ('DMX_TEMPO_EVIDENCE', '1',      'tempovalet pa slagpoang i stallet for tempogramtopp (lotus: 57/91 mot 46/91)'),
    ('DMX_TEMPO_ENV_S',    '10',     'onset-ringen 10 s - kort ring gav instabilt tempo pa langsamt material'),
    ('DMX_KICK_NOGATE',    '1',      'kickarna grindas inte mot eget grid (lotus: on-beat 0,63 -> 0,95)'),
    ('DMX_KICK_COOLDOWN',  '100',    'baston strax fore slaget skuggade slagets kick i 170 ms'),
    ('DMX_GRID_PHASE',     '1',      'fasen ur bas + helband i stallet for senaste kicken (bank: i fas 77/130, motfas 5)'),
    ('DMX_PHASE_FOLLOW',   '1',      'gridet foljer fasmatningen i stallet for enskilda kickar'),
    ('DMX_GRID_PHASE_OFFSET_MS', '15', 'onset-frontens konstanta 15 ms (lotus LIVE 09-23)'),
    ('DMX_TEMPO_UP43',     '1',      'AV i ladan: med DMX-profilen 18 -> 17/21 pa ladans mixklipp (lotus: 171 -> 180/214, LIVE dar)'),
    ('DMX_SILENCE_LEVEL',  '0.03',   'ladans tystnadstroskel - standard 0,05 slackte riggen pa tysta fraser'),
    ('DMX_SILENCE_MS',     '2000',   'sa lange maste det vara tyst innan grinden borjar stanga (standard 250 ms)'),
    ('DMX_SILENCE_RELEASE_S', '1.0', 'mjuk aterhamtning i stallet for 0,25 s'),
]
# 2026-09-27 RENSNINGEN: allt som stod har (66 rattar i drop/tempo/lotus.conf) ar nu KODENS STANDARD - effects.ts/index.ts/
# postprocess.ts/output.ts for DMX-motorn, analyserProfile.ts (DMX-profilen) for den delade analysatorn. Bevis: showBench
# pop+megamix bit-identiska (gammal kod + live-env == ny kod utan env). Historiken (varje rad = uttalande + matning) finns i
# git: `git show 38d0401:pi-dmx/engine/tools/ladan.py`. Pi:n kor nu UTAN drop-ins; de tre gamla tas bort via REMOVE nedan.
# Nya prov gors som forr: EXTRA pa kommandoraden (--env NAMN=VARDE) -> lotus.conf, och lyfts in i koden nar de godkants.
SHOW_ENV: list = [
    ('DMX_SHAPE_UP_MS',    '25',     'LATENS 09-29: nivans uppgang 60 -> 25 ms som lotus (ca 35 ms snabbare pa uppgangen, fallet orort)'),
]   # 09-29: provet (RISE_K 10, SHAPE_DOWN 220) + 09-27-kvallens ladan.conf (FLOOR_CH 40, WIN 10, ARECORD_CPU 3, QUIET) ar kodens standard


# RENSNINGEN 2026-09-23: inlarnings-/offline-stacken ar borta ur motorn (latminne, fingeravtryck, inspelare, tvatt,
# strukturko, namngivning - 2 984 rader). deploy-dist.py kopierar bara filer som finns lokalt och raderar aldrig, sa det
# som lag kvar pa Pi:n skulle ligga kvar for alltid. Allt har flyttas till <namn>.bak-<ts> (aldrig rm) sa det gar att
# angra. Datafilerna ar inlarningens rester: songs.bin, structure.json, temp-WAV:ar och koade analyser.
REMOVE = [
    '/opt/audio-dmx-engine/dist/songMemory.js', '/opt/audio-dmx-engine/dist/fingerprint.js',
    '/opt/audio-dmx-engine/dist/structureQueue.js', '/opt/audio-dmx-engine/dist/identify.js',
    '/opt/audio-dmx-engine/dist/learnRecorder.js', '/opt/audio-dmx-engine/dist/refineQueue.js',
    '/opt/audio-dmx-engine/public/structure-worker.js',
    '/opt/audio-dmx-engine/tools/refineSong.mjs', '/opt/audio-dmx-engine/tools/replay.mjs',   # bara Pi-kopiorna; PC-banken behaller sina
    '/var/lib/audio-dmx-engine/songs.bin', '/var/lib/audio-dmx-engine/structure.json',
    '/var/lib/audio-dmx-engine/*.wav', '/var/lib/audio-dmx-engine/*.pending.wav',
    # EFFEKTOVERSYNEN 2026-09-23: innerouter (rPerm 1,00 mot varannan) och neon (aldrig vald, ingen egen signal) ar borta ur
    # registret; filerna pa Pi:n flyttas till .bak sa dist/effects/ inte har spokfiler.
    '/opt/audio-dmx-engine/dist/effects/innerouter.js', '/opt/audio-dmx-engine/dist/effects/neon.js',
    # KVALLENS TESTFILER 09-24 (allt star nu i SHOW_ENV -> lotus.conf); hjarta.conf satte DMX_HEARTBEAT=1 och laddas EFTER lotus.conf.
    # 09-27: drop-ins som bar live-varden - nu standard i koden. OBS ordningen: systemd laser alfabetiskt, senare vinner;
    # zz-dynamik.conf (09-22) skrev over lotus.conf (09-24) for DMX_FLOOR_CH (40 mot 26) och DROP_CALM_LAND_MS (300 mot 0)
    # - agarens 09-24-beslut var aldrig live. Koden har 09-24-vardena.
    '/etc/systemd/system/audio-dmx-engine.service.d/ballistik.conf', '/etc/systemd/system/audio-dmx-engine.service.d/bass.conf',
    '/etc/systemd/system/audio-dmx-engine.service.d/dwell.conf', '/etc/systemd/system/audio-dmx-engine.service.d/zz-dynamik.conf',
    '/etc/systemd/system/audio-dmx-engine.service.d/drop.conf', '/etc/systemd/system/audio-dmx-engine.service.d/tempo.conf',
    '/etc/systemd/system/audio-dmx-engine.service.d/lotus.conf',
    '/etc/systemd/system/audio-dmx-engine.service.d/ladan.conf',   # forra provet byts ut (REMOVE kor fore conf-skrivningen)
    '/etc/systemd/system/audio-dmx-engine.service.d/hjarta.conf', '/etc/systemd/system/audio-dmx-engine.service.d/energi.conf',
    '/etc/systemd/system/audio-dmx-engine.service.d/sektion.conf', '/etc/systemd/system/audio-dmx-engine.service.d/zzz-lugn.conf',
    '/etc/systemd/system/audio-dmx-engine.service.d/zzzz-ogat.conf', '/etc/systemd/system/audio-dmx-engine.service.d/split.conf',
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

    env_pairs = [f'{k}={v}' for k, v, _why in (SHOW_ENV + (PORTAR_EJ_LIVE if PORTAR else []))] + EXTRA
    cmd = [sys.executable, os.path.join(HERE, 'deploy-dist.py')]
    if DRY: cmd.append('--dry')
    if not ONLY_DEPLOY:
        cmd += ['--conf', 'ladan']   # 09-27: EN fil, ladan.conf, for pagaende prov; allt godkant lyfts in i koden
        for e in env_pairs: cmd += ['--env', e]
    for r in REMOVE: cmd += ['--remove', r]   # alltid, aven med --bara-deploy: rensningen ar en del av koden
    print('\nprov-env som skrivs till ladan.conf:' if not ONLY_DEPLOY else '\n(env orord)')
    for k, v, why in SHOW_ENV:
        if not ONLY_DEPLOY: print(f'  {k}={v:<6} {why}')
    for e in EXTRA: print(f'  {e}   (extra fran kommandoraden)')
    print()
    os.environ['PI_HOST'] = host; os.environ['PI_PASS'] = p
    os.environ['PYTHONIOENCODING'] = 'utf-8'   # annars dor deploy-dist.py pa en pil i en utskrift (cp1252-konsol i ladan)
    sys.exit(subprocess.run(cmd, cwd=ENGINE).returncode)


if __name__ == '__main__':
    main()
