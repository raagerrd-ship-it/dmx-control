"""Ordnad deploy av pi-dmx/engine/dist/*.js till Pi-DMX (samma stege som lotus deploy-dist-files.py, 2026-09-21).
Sanningen (pi-dmx.md): motorn kor FORBYGGD dist ur /opt/audio-dmx-engine som tjansten audio-dmx-engine; ingen git/tsc pa boxen,
dist ags inte av pi -> sudo cp. Steg: md5-diff per fil, upp till /tmp, node --check, backup <fil>.bak-<ts>, sudo cp, valfria
drop-in-rader (--env NAMN=VARDE ... -> /etc/systemd/system/audio-dmx-engine.service.d/<--conf>.conf), daemon-reload, EN omstart,
vanta pa tjansten. Inga hemligheter i repot:
  PI_PASS=... [PI_HOST=192.168.4.1] python tools/deploy-dist.py [--dry] [--no-restart] [--conf evidens] [--env DMX_TEMPO_EVIDENCE=1 ...] [fil ...]
Utan filargument: alla dist/*.js (toppniva) + dist/effects/*.js som skiljer sig. Bygg forst: npx tsc -p . (i pi-dmx/engine)."""
import hashlib, os, sys, time, paramiko
HOST = os.environ.get('PI_HOST', '192.168.4.1'); PW = os.environ.get('PI_PASS')
if not PW: sys.exit('PI_PASS saknas')
args = sys.argv[1:]
DRY = '--dry' in args; NORESTART = '--no-restart' in args
CONF = args[args.index('--conf') + 1] if '--conf' in args else None
ENVS = [args[i + 1] for i, a in enumerate(args) if a == '--env']
files_arg = [a for i, a in enumerate(args) if not a.startswith('--') and (i == 0 or args[i - 1] not in ('--conf', '--env'))]
HERE = os.path.dirname(os.path.abspath(__file__)); LOCAL = os.path.normpath(os.path.join(HERE, '..', 'dist'))
REMOTE = '/opt/audio-dmx-engine/dist'
if not files_arg:
    files_arg = [f for f in os.listdir(LOCAL) if f.endswith('.js')] + ['effects/' + f for f in os.listdir(os.path.join(LOCAL, 'effects')) if f.endswith('.js')] if os.path.isdir(os.path.join(LOCAL, 'effects')) else [f for f in os.listdir(LOCAL) if f.endswith('.js')]
c = paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, username='pi', password=PW, timeout=15, look_for_keys=False, allow_agent=False)
def run(cmd, t=300):
    i, o, e = c.exec_command(cmd, timeout=t); rc = o.channel.recv_exit_status(); return rc, o.read().decode('utf-8', 'replace'), e.read().decode('utf-8', 'replace')
def sudo(cmd, t=300): return run(f"echo {PW} | sudo -S sh -c '{cmd}' 2>/dev/null", t)
files = {f: open(os.path.join(LOCAL, f), 'rb').read().replace(b'\r\n', b'\n') for f in files_arg}
rc, out, _ = run(f"cd {REMOTE} && md5sum {' '.join(files_arg)} 2>/dev/null"); remote = {l.split()[1]: l.split()[0] for l in out.splitlines() if len(l.split()) == 2}
todo = [f for f, d in files.items() if remote.get(f) != hashlib.md5(d).hexdigest()]
print(f"{len(files)} filer, skiljer/saknas pa Pi:n: {todo or 'inga'}")
if DRY: sys.exit(0)
ts = time.strftime('%Y%m%d-%H%M'); sf = c.open_sftp()
for f in todo:
    tmp = '/tmp/' + f.replace('/', '__')
    with sf.open(tmp, 'wb') as fh: fh.write(files[f])
    rc, out, err = run(f"node --check {tmp}")
    if rc: sys.exit(f"node --check {f} misslyckades: {err[:300]}")
    rc, out, _ = sudo(f"[ -f {REMOTE}/{f} ] && cp {REMOTE}/{f} {REMOTE}/{f}.bak-{ts}; cp {tmp} {REMOTE}/{f} && chmod 644 {REMOTE}/{f} && ls -la {REMOTE}/{f}")
    print(out.strip())
if ENVS:
    name = CONF or 'deploy'
    body = '[Service]\\n# ' + ts + ' via deploy-dist.py\\n' + ''.join(f'Environment={e}\\n' for e in ENVS)
    rc, out, _ = sudo(f"mkdir -p /etc/systemd/system/audio-dmx-engine.service.d && printf \"{body}\" > /etc/systemd/system/audio-dmx-engine.service.d/{name}.conf && cat /etc/systemd/system/audio-dmx-engine.service.d/{name}.conf && systemctl daemon-reload")
    print(out.strip())
if not todo and not ENVS: sys.exit(0)
if NORESTART: print('ingen omstart begard'); sys.exit(0)
rc, out, _ = sudo("systemctl restart audio-dmx-engine")
for i in range(45):
    time.sleep(2); rc, out, _ = run("systemctl is-active audio-dmx-engine; journalctl -u audio-dmx-engine -n 3 --no-pager 2>/dev/null | tail -2")
    if out.startswith('active'): print(f"tjansten uppe efter {2*(i+1)} s\n{out.strip()}"); break
else: sys.exit('tjansten kom inte upp - aterstall fran .bak-' + ts)
