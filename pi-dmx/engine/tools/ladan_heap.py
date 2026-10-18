"""HEAP-FLAGGAN + STÄDA NÄR RIGGEN ÄR MÖRK PÅ LADAN-PI:N (2026-10-18, portat från lotus där det mättes live: 0 storstädningar på
28 min med --heap-growing-percent=200, tvingad full GC ~93 ms). På DMX görs den tvingade städningen bara när riggen är mörk
(src/gcDark.ts, DMX_GC_DARK) - i mörker syns pausen inte.
  python tools/ladan_heap.py          (torrkörning: visar heap.conf och vad som skulle ändras)
  python tools/ladan_heap.py --kor    (backup, --heap-growing-percent=200 --expose-gc i heap.conf, gc-dark.conf DMX_GC_DARK=0.6, omstart)
  python tools/ladan_heap.py --backa  (återställer heap.conf från backupen och tar bort gc-dark.conf, omstart)
Kör EFTER `python tools/ladan.py` (gcDark.js måste finnas i dist). Samma inloggning som ladan.py.
"""
import os, sys, time
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import ladan
import paramiko

KOR, BACKA = '--kor' in sys.argv, '--backa' in sys.argv
D = '/etc/systemd/system/audio-dmx-engine.service.d'
pw_ = ladan.pw()
host = next((h for h in ladan.HOSTS if ladan.reachable(h, pw_)), None)
if not host: sys.exit('Pi-DMX gar inte att na (PI_HOST eller WiFi "pi-dmx").')
c = paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
if ladan.KEY: c.connect(host, username='pi', key_filename=ladan.KEY, timeout=10, look_for_keys=False, allow_agent=False)
else: c.connect(host, username='pi', password=pw_, timeout=10, look_for_keys=False, allow_agent=False)
def run(cmd):
    _, o, e = c.exec_command(cmd, timeout=120); return (o.read().decode('utf-8', 'replace') + e.read().decode('utf-8', 'replace')).strip()
SUDO = 'sudo -n ' if ladan.KEY else f'echo {pw_} | sudo -S '
print('Pi-DMX:', host, '| node', run('node --version'))
print('heap.conf nu:\n' + run(f'grep -E "^ExecStart=/" {D}/heap.conf'))
print('gcDark.js i dist:', run('test -f /opt/audio-dmx-engine/dist/gcDark.js && echo ja || echo NEJ - kor ladan.py forst'))
if BACKA:
    print(run(f"{SUDO}sh -c 'test -f {D}/heap.conf.bak-heapgrow && cp -p {D}/heap.conf.bak-heapgrow {D}/heap.conf; rm -f {D}/gc-dark.conf; systemctl daemon-reload; systemctl restart audio-dmx-engine' 2>&1 | grep -v password"))
elif KOR:
    if 'NEJ' in run('test -f /opt/audio-dmx-engine/dist/gcDark.js && echo ja || echo NEJ'): sys.exit('gcDark.js saknas - kor python tools/ladan.py forst')
    cmd = (f"cd {D} && (test -f heap.conf.bak-heapgrow || cp -p heap.conf heap.conf.bak-heapgrow) && "
           f"grep -q heap-growing-percent heap.conf || sed -i 's#^ExecStart=/usr/bin/node #ExecStart=/usr/bin/node --heap-growing-percent=200 --expose-gc #' heap.conf; "
           f"printf '%s\\n' '[Service]' '# 2026-10-18 (agaren): full GC nar riggen ar mork och gamla minnet >= 60 % av gransen (src/gcDark.ts). Av: ta bort filen.' "
           f"'Environment=DMX_GC_DARK=0.6' > gc-dark.conf && systemctl daemon-reload && systemctl restart audio-dmx-engine")
    print(run(f"{SUDO}sh -c \"{cmd}\" 2>&1 | grep -v password"))
else:
    sys.exit('(torrkorning - --kor for att andra, --backa for att aterstalla)')
time.sleep(5)
print('efter:', run('systemctl is-active audio-dmx-engine; systemctl show audio-dmx-engine -p NRestarts'), '|', run('ps -o args= -C node | grep -o "heap-growing-percent=[0-9]*\\|expose-gc" | sort -u | tr "\\n" " "'))
