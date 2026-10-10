r"""LADAN B (2026-09-30, resursgranskningen): systemfixar pa Pi-DMX som kraver ett ladan-besok och EN reboot.
  1. /boot/firmware/cmdline.txt: lagg till 'cgroup_enable=memory cgroup_memory=1' sist pa den enda raden (firmware satter
     cgroup_disable=memory; senare flagga vinner, verifierat pa lotus). Utan den verkar MemorySwapMax/MemoryMax inte alls.
  2. systemd/audio-dmx-engine.d.memory.conf  -> motorn swappar aldrig, tak 300 MB.
  3. systemd/pi-dmx-watchdog.d.quiet.conf    -> watchdogens rutinrader (var 30:e s) ut ur journalen.
  4. systemd/journald-zz-dmx.conf            -> journalen i RAM (ingen SD-slitning), 8 MB.
  5. triggerhappy, cron (inga jobb) och getty@tty1 (ingen skarm) av. timesyncd far vara kvar: hotspoten ger internet
     under besoken och klockan behovs ratt i loggarna.
  6. systemd/<timer>.timer.d.natt.conf      -> apt/man-db/logrotate/fstrim/e2scrub bara 03-06, Persistent=false (2026-10-04).
Sedan reboot, vanta tills Pi:n svarar igen, och verifiera allt. Backup: cmdline.txt.bak-<ts> och alla ersatta filer .bak-<ts>.
Ordning i ladan: forst `python tools\ladan.py` (koden), sedan `python tools\ladan_b.py --kor`.
  python tools\ladan_b.py          visar planen och nulaget, ror ingenting
  python tools\ladan_b.py --kor    gor det (reboot ingar)
  python tools\ladan_b.py --mat    MATNING medan musik spelar: CPU per trad och process i 60 s + motorns halsa -> pi-backup/
PI_HOST valfri; annars pi-dmx.local (mDNS) och ladans kanda adresser. Losenordet som i ladan.py (pw())."""
import os, socket, sys, time, paramiko
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ladan
HERE = os.path.dirname(os.path.abspath(__file__)); SYSD = os.path.join(HERE, '..', 'systemd')
RUN = '--kor' in sys.argv
MEASURE = '--mat' in sys.argv
FILES = [('audio-dmx-engine.d.memory.conf', '/etc/systemd/system/audio-dmx-engine.service.d/memory.conf'),
         ('pi-dmx-watchdog.d.quiet.conf', '/etc/systemd/system/pi-dmx-watchdog.service.d/quiet.conf'),
         ('journald-zz-dmx.conf', '/etc/systemd/journald.conf.d/zz-dmx.conf')]
# 6. (2026-10-04, portat fran lotus) Debians systemtimers bara 03-06 och utan ikappkorning vid uppstart (Persistent=false).
FILES += [(f'{t}.timer.d.natt.conf', f'/etc/systemd/system/{t}.timer.d/natt.conf')
          for t in ('logrotate', 'dpkg-db-backup', 'apt-daily', 'apt-daily-upgrade', 'man-db', 'fstrim', 'e2scrub_all')]
# 7. (2026-10-10) WIFI-VAKT: egen AP (pi-dmx) -> tillbaka till telefonens hotspot nar den syns (se systemd/pi-dmx-wifi-watch.sh).
FILES += [('pi-dmx-wifi-watch.sh', '/usr/local/bin/pi-dmx-wifi-watch.sh'),
          ('pi-dmx-wifi-watch.service', '/etc/systemd/system/pi-dmx-wifi-watch.service'),
          ('pi-dmx-wifi-watch.timer', '/etc/systemd/system/pi-dmx-wifi-watch.timer')]
FLAGS = 'cgroup_enable=memory cgroup_memory=1'
CG = '/sys/fs/cgroup/system.slice/audio-dmx-engine.service'

def hosts():
    h = [os.environ['PI_HOST']] if os.environ.get('PI_HOST') else []
    try: h.append(socket.getaddrinfo('pi-dmx.local', 22, socket.AF_INET)[0][4][0])
    except Exception: pass
    return h + ['192.168.4.1', '172.29.167.218']

def connect(tries=1):
    for _ in range(tries):
        for h in hosts():
            try:
                c = paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
                c.connect(h, username='pi', password=ladan.pw(), timeout=8, look_for_keys=False, allow_agent=False, banner_timeout=20)
                return c, h
            except Exception: pass
        if tries > 1: time.sleep(10)
    return None, None

def run(c, cmd, t=60):
    i, o, e = c.exec_command(cmd, timeout=t); rc = o.channel.recv_exit_status(); return rc, o.read().decode('utf-8', 'replace').strip()

def sudo(c, script, t=120):
    sf = c.open_sftp()
    with sf.open('/tmp/ladan_b.sh', 'w') as f: f.write(script)
    sf.close()
    return run(c, f"echo {ladan.pw()} | sudo -S sh /tmp/ladan_b.sh 2>&1; rm -f /tmp/ladan_b.sh", t)

def status(c):
    _, cmd = run(c, 'cat /proc/cmdline')
    _, swp = run(c, f'cat {CG}/memory.swap.max 2>/dev/null || echo saknas')
    _, mx = run(c, f'cat {CG}/memory.max 2>/dev/null || echo saknas')
    _, act = run(c, 'systemctl is-active audio-dmx-engine')
    _, stor = run(c, "ls /var/log/journal 2>/dev/null | head -1; systemctl show -p Storage systemd-journald 2>/dev/null")
    _, th = run(c, 'for s in triggerhappy cron getty@tty1; do printf "%s=%s " $s $(systemctl is-enabled $s 2>/dev/null); done')
    _, wd = run(c, "journalctl -u pi-dmx-watchdog --since '-10 min' --no-pager -o cat 2>/dev/null | wc -l")
    return {'cgroup-flaggor i /proc/cmdline': 'cgroup_enable=memory' in cmd, 'motor memory.swap.max': swp, 'motor memory.max': mx,
            'motor': act, 'persistent journal (/var/log/journal)': bool(stor.split('\n')[0]) if stor else False,
            'avstangningsbara tjanster': th or '-', 'watchdog-rader senaste 10 min': wd}

c, host = connect()
if not c: sys.exit('Pi-DMX nas inte (pi-dmx.local / PI_HOST). Ar du i ladan med hotspoten pa?')
print(f'Pi-DMX pa {host}')
for k, v in status(c).items(): print(f'  {k}: {v}')
_, line = run(c, 'cat /boot/firmware/cmdline.txt'); _, n = run(c, 'wc -l < /boot/firmware/cmdline.txt')
print(f'  cmdline.txt ({n} radbrytning): {line}')
if MEASURE:
    # MATNING (ladan, musik PA): vad anvander CPU nar ljud blir ljus? top -H pa motorns tradar + alla processer, 2 x 30 s.
    _, pid = run(c, 'systemctl show -p MainPID --value audio-dmx-engine')
    _, h0 = run(c, 'curl -s -m 5 http://127.0.0.1/api/health-log')
    _, top = run(c, f'top -b -H -d 30 -n 2 -p {pid} | tail -25; echo ===; top -b -d 30 -n 2 -o %CPU | tail -30', 120)
    _, h1 = run(c, 'curl -s -m 5 http://127.0.0.1/api/health-log')
    _, extra = run(c, 'uptime; free -m; cat /proc/pressure/cpu /proc/pressure/memory /proc/pressure/io 2>/dev/null; grep -E "ctxt|procs_running" /proc/stat')
    out = os.path.join(HERE, '..', '..', 'pi-backup', time.strftime('matning-%Y%m%d-%H%M.txt'))
    with open(out, 'w', encoding='utf-8') as f:
        f.write(f'# ladan_b --mat {time.ctime()} pa {host}\n\n## top\n{top}\n\n## health fore\n{h0}\n\n## health efter\n{h1}\n\n## system\n{extra}\n')
    print(top[:3000]); print(f'\nsparat: {os.path.normpath(out)}'); sys.exit(0)
if not RUN: sys.exit('\n(torrkorning - lagg till --kor for att gora det; reboot ingar; --mat = matning under musik)')

ts = time.strftime('%Y%m%d-%H%M')
sf = c.open_sftp()
for local, remote in FILES:   # aldrig CRLF till systemd (git autocrlf pa Windows): ett CR sist pa raden ger ogiltiga varden
    data = open(os.path.join(SYSD, local), 'rb').read().replace(bytes([13, 10]), bytes([10]))
    with sf.open('/tmp/' + os.path.basename(local), 'wb') as f: f.write(data)
sf.close()
script = f"""set -e
cp /boot/firmware/cmdline.txt /boot/firmware/cmdline.txt.bak-{ts}
if ! grep -q 'cgroup_enable=memory' /boot/firmware/cmdline.txt; then sed -i '1 s/[[:space:]]*$/ {FLAGS}/' /boot/firmware/cmdline.txt; fi
test "$(wc -l < /boot/firmware/cmdline.txt)" -le 1
grep -q 'root=PARTUUID' /boot/firmware/cmdline.txt && grep -q 'cgroup_enable=memory' /boot/firmware/cmdline.txt
"""
for local, remote in FILES:
    d = os.path.dirname(remote); b = os.path.basename(local)
    script += f"mkdir -p {d}; [ -f {remote} ] && cp {remote} {remote}.bak-{ts} || true; cp /tmp/{b} {remote}; chmod 644 {remote}\n"
script += "chmod 755 /usr/local/bin/pi-dmx-wifi-watch.sh\nsystemctl enable pi-dmx-wifi-watch.timer 2>/dev/null || true\n"
script += "systemctl disable --now triggerhappy.service triggerhappy.socket cron.service getty@tty1.service 2>/dev/null || true\nsystemctl daemon-reload\necho FILER_OK\ncat /boot/firmware/cmdline.txt\n"
rc, out = sudo(c, script)
print(out)
if 'FILER_OK' not in out: sys.exit(f'AVBRUTET fore reboot (rc {rc}) - cmdline.txt.bak-{ts} finns, inget omstartat')
print('reboot ...'); run(c, f"echo {ladan.pw()} | sudo -S systemctl reboot 2>/dev/null; true", 15); c.close()
time.sleep(40)
c, host = connect(tries=18)
if not c: sys.exit('Pi:n svarar inte efter reboot (3 min). Ta ut SD-kortet: /boot/firmware/cmdline.txt.bak-' + ts + ' ar backupen.')
time.sleep(20)
st = status(c); print(f'efter reboot pa {host}:')
for k, v in st.items(): print(f'  {k}: {v}')
ok = st['cgroup-flaggor i /proc/cmdline'] and st['motor memory.swap.max'] == '0' and st['motor'] == 'active'
print('\nKLART - minnesskyddet verkar.' if ok else '\nKONTROLLERA - nagot ovan ar inte som vantat.')
