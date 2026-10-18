"""NODE 24 PÅ LADAN-PI:N (2026-10-18, ägaren: 'ta backup och kör på Node 24' - inget A/B, inga rattar). Lotus kör Node 24 (V8 13);
DMX:s körbänk: 34,4 kB/s skräp på Node 22 mot 43,1 på Node 18, samma kontrollsumma. Byter bara motorns node: Node 24.18.0 packas upp i
/opt/node24, ExecStart (enhetsfilen + drop-ins) pekas om från /usr/bin/node, och spi-device (vredets LED-ring, inbyggd modul) får sin
Node 24-byggda spi.node (byggd på lotus 10-18, laddad och testad med require + ESM-import i node 24.18.0). Städar samtidigt bort den
gamla BLE-sidovagnen (pi-dmx-ble + bluetoothd) - BLE är borttaget ur DMX 10-18 (annan BLE-modul än lotus).
  python tools/ladan_node24.py          (torrkörning: arkitektur, node, ExecStart, sidovagnen)
  python tools/ladan_node24.py --kor    (backup -> byte -> omstart -> kontroll)
  python tools/ladan_node24.py --backa  (packar upp backupen: Node 18-ExecStart + gamla spi.node, omstart)
Kör EFTER ladan.py och ladan_heap.py. Kräver Node-tarbollen på PC:n (NODE24_TGZ, standard ~/node24dl).
"""
import hashlib, os, sys, time
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import ladan
import paramiko

KOR, BACKA = '--kor' in sys.argv, '--backa' in sys.argv
TGZ = os.environ.get('NODE24_TGZ', os.path.expanduser('~/node24dl/node-v24.18.0-linux-arm64.tar.xz'))
TGZ_SHA = '58c9520501f6ae2b52d5b210444e24b9d0c029a58c5011b797bc1fe7105886f6'   # nodejs.org SHASUMS256.txt
SPI = os.path.join(HERE, 'node24', 'spi-node24-arm64.node')
SPI_MD5 = 'ed90e3e7075e426c1c4cf2a6feacd1fe'
U = '/etc/systemd/system/audio-dmx-engine.service'
SPI_DST = '/opt/audio-dmx-engine/node_modules/spi-device/build/Release/spi.node'
BAK = '/home/pi/dmx-backup-node18-20261018.tgz'
pw_ = ladan.pw()
host = next((h for h in ladan.HOSTS if ladan.reachable(h, pw_)), None)
if not host: sys.exit('Pi-DMX gar inte att na (PI_HOST eller WiFi "pi-dmx").')
c = paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
if ladan.KEY: c.connect(host, username='pi', key_filename=ladan.KEY, timeout=10, look_for_keys=False, allow_agent=False)
else: c.connect(host, username='pi', password=pw_, timeout=10, look_for_keys=False, allow_agent=False)
def run(cmd, t=300):
    _, o, e = c.exec_command(cmd, timeout=t); return (o.read().decode('utf-8', 'replace') + e.read().decode('utf-8', 'replace')).strip()
SUDO = 'sudo -n ' if ladan.KEY else f'echo {pw_} | sudo -S '
def sudo(cmd, t=300): return run(f"{SUDO}sh -c '{cmd}' 2>&1 | grep -v password", t)
arch = run('uname -m')
print('Pi-DMX:', host, '|', arch, '| system-node', run('node --version'))
print('ExecStart nu:\n' + run('systemctl cat audio-dmx-engine | grep -E "^ExecStart=/"'))
print('sidovagnen pi-dmx-ble:', run('systemctl is-enabled pi-dmx-ble 2>&1; systemctl is-active pi-dmx-ble 2>&1').replace('\n', ' '), '| bluetooth:', run('systemctl is-active bluetooth 2>&1'))
if BACKA:
    if 'ja' not in run(f'test -f {BAK} && echo ja'): sys.exit(f'{BAK} saknas - inget att backa till')
    print(sudo(f'tar xzf {BAK} -C / && systemctl daemon-reload && systemctl restart audio-dmx-engine'))
elif KOR:
    if arch != 'aarch64': sys.exit(f'arkitektur {arch} - tarbollen och spi.node ar arm64, avbryter')
    if hashlib.sha256(open(TGZ, 'rb').read()).hexdigest() != TGZ_SHA: sys.exit(f'{TGZ}: fel sha256')
    if hashlib.md5(open(SPI, 'rb').read()).hexdigest() != SPI_MD5: sys.exit(f'{SPI}: fel md5')
    s = c.open_sftp(); s.put(TGZ, '/tmp/node24.tar.xz'); s.put(SPI, '/tmp/spi24.node'); s.close()
    if TGZ_SHA not in run('sha256sum /tmp/node24.tar.xz'): sys.exit('uppladdad tarboll: fel sha256')
    # 1) backup (en gång): enhetsfilen + drop-ins + nuvarande spi.node. Sidovagnen sparas separat (behövs inte för --backa).
    print(sudo(f'test -f {BAK} || tar czf {BAK} {U} {U}.d {SPI_DST}; '
               f'test -d /opt/pi-dmx-ble && tar czf /home/pi/dmx-backup-ble-20261018.tgz /opt/pi-dmx-ble /etc/systemd/system/pi-dmx-ble.service 2>/dev/null; true'))
    if 'ja' not in run(f'test -s {BAK} && echo ja'): sys.exit('backupen skapades inte - avbryter fore bytet')
    # 2) Node 24 + spi.node + ExecStart. 3) BLE-sidovagnen bort.
    print(sudo(f'rm -rf /opt/node24 && mkdir -p /opt/node24 && tar xJf /tmp/node24.tar.xz -C /opt/node24 --strip-components=1 && '
               f'install -m755 /tmp/spi24.node {SPI_DST} && '
               f'sed -i "s#^ExecStart=/usr/bin/node #ExecStart=/opt/node24/bin/node #" {U} {U}.d/*.conf && '
               f'(systemctl disable --now pi-dmx-ble bluetooth 2>/dev/null; rm -f /etc/systemd/system/pi-dmx-ble.service; rm -rf /opt/pi-dmx-ble; true) && '
               f'systemctl daemon-reload && systemctl restart audio-dmx-engine', 600))
    print('/opt/node24:', run('/opt/node24/bin/node --version'))
else:
    sys.exit('(torrkorning - --kor for att byta, --backa for att aterstalla)')
time.sleep(20)
print('efter:', run('systemctl is-active audio-dmx-engine; systemctl show audio-dmx-engine -p NRestarts').replace('\n', ' '),
      '| process:', run('ps -o args= -C node | head -1')[:120])
print('health:', run('curl -s -m 3 http://127.0.0.1/health')[:200])
print('perf:', run('curl -s -m 3 http://127.0.0.1/api/perf')[:300])
print(run('journalctl -u audio-dmx-engine --since "-40s" --no-pager | grep -i -E "error|cannot|spi|ring" | tail -8'))
