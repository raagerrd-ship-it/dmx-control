"""NOBLE-PATCHEN PÅ LADAN-PI:N (2026-10-18, samma som lotus): BLE-sidovagnen (pi-dmx-ble, /opt/pi-dmx-ble) kör @abandonware/noble,
som bygger loggsträngar för varje BLE-paket även med loggen av. Skriptet laddar upp ble-writer/scripts/patch-noble-debug.py, visar
först hur många loggrader som är oskyddade (--check) och patchar + startar om sidovagnen bara med --kor. Sidovagnen är en egen
process - motorns rendering påverkas inte av omstarten (BLE-slingorna blinkar till om de används).
  python tools/ladan_noble.py          (bara kontroll)
  python tools/ladan_noble.py --kor    (patcha + starta om pi-dmx-ble)
Samma inloggning som ladan.py (nyckel ~/.ssh/id_pidmx, annars lösenordet; PI_HOST eller mDNS/standardadresserna).
"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import ladan   # HOSTS, pw(), KEY, reachable()
import paramiko

KOR = '--kor' in sys.argv
pw_ = ladan.pw()
host = next((h for h in ladan.HOSTS if ladan.reachable(h, pw_)), None)
if not host: sys.exit('Pi-DMX gar inte att na (PI_HOST eller WiFi "pi-dmx").')
c = paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
if ladan.KEY: c.connect(host, username='pi', key_filename=ladan.KEY, timeout=10, look_for_keys=False, allow_agent=False)
else: c.connect(host, username='pi', password=pw_, timeout=10, look_for_keys=False, allow_agent=False)
def run(cmd):
    _, o, e = c.exec_command(cmd, timeout=120); return o.read().decode('utf-8', 'replace') + e.read().decode('utf-8', 'replace')
SUDO = 'sudo -n ' if ladan.KEY else f'echo {pw_} | sudo -S '
print('Pi-DMX:', host)
print('sidovagnen:', run('systemctl is-enabled pi-dmx-ble 2>&1; systemctl is-active pi-dmx-ble 2>&1').replace('\n', ' '))
lib = '/opt/pi-dmx-ble/node_modules/@abandonware/noble/lib'
if 'ja' not in run(f'test -d {lib} && echo ja'): sys.exit(f'{lib} finns inte - sidovagnen ar inte installerad, inget att patcha.')
s = c.open_sftp(); s.put(os.path.join(HERE, '..', '..', 'ble-writer', 'scripts', 'patch-noble-debug.py'), '/tmp/patch-noble-debug.py'); s.close()
print(run(f'python3 /tmp/patch-noble-debug.py --check {lib}').strip())
if not KOR: sys.exit('(bara kontroll - kor med --kor for att patcha och starta om pi-dmx-ble)')
print(run(f'{SUDO}python3 /tmp/patch-noble-debug.py {lib} 2>&1 | grep -v password').strip())
print(run(f'{SUDO}systemctl restart pi-dmx-ble 2>&1 | grep -v password; sleep 3; systemctl is-active pi-dmx-ble').strip())
