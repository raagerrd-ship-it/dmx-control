r"""LADAN-VAKTEN (2026-09-23): foljer Pi-DMX:ns journal fran PC:n medan agaren tittar pa riggen, och sammanfattar vad dirigenten
GOR - sa att "kandes enformigt" kan stallas mot "vilka looker gick, i vilka sektioner, hur ofta byttes det".

  cd C:\Users\richa\Desktop\Claude\dmx-control\pi-dmx\engine
  python tools\ladanWatch.py                 folj journalen live (Ctrl+C avbryter), sammanfattning var 60:e s
  python tools\ladanWatch.py --sedan 5       ingen foljning: sammanfatta de senaste 5 minuterna ur journalen
  python tools\ladanWatch.py --sedan 5 --ra  ...och skriv ut raderna ocksa

Losenord: PI_PASS eller ~/.lotus-secrets/pi-dmx.pass (annars Pi-DMX:ns standard). Pi:ns klocka gar ~35 min efter PC:n
(appliance utan internet) - tiderna som skrivs ut ar PC:ns, inte journalens.
"""
import os, re, sys, time, collections

HOSTS = ([os.environ['PI_HOST']] if os.environ.get('PI_HOST') else []) + ['192.168.4.1', '172.29.167.218', '192.168.1.176']
ARGS = sys.argv[1:]
SEDAN = int(ARGS[ARGS.index('--sedan') + 1]) if '--sedan' in ARGS else 0
RA = '--ra' in ARGS
TAGS = ('[dirigent]', '[song]', '[dropfire]', '[minidrop]', '[dropcalm]', '[takt]', '[tillit]', '[palett]', '[analyser-split]', '[health]', '[bpmrst]', '[liveniva]')
LOOK = re.compile(r'\[dirigent\] (\S+): ny look "(\w+)" \(tier (\w+), pool (\d+)(?:, sektion (\w+|-), basgang ([\d.]+))?(, lugn)?\)')
TOGGLE = re.compile(r'\[dirigent\] tydlig basgang \(([\d.]+), (\d+) toggles\) -> "(\w+)"')
SEKT = re.compile(r'\[dirigent\] sektion (\w+) -> (\w+)')
ATERSER = re.compile(r'\[dirigent\] (\S+): återser "(\w+)"')


def pw():
    p = os.environ.get('PI_PASS')
    if p: return p
    f = os.path.expanduser('~/.lotus-secrets/pi-dmx.pass')
    return open(f).read().strip() if os.path.exists(f) else 'raspberry'


def connect():
    import paramiko
    for h in HOSTS:
        try:
            c = paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            c.connect(h, username='pi', password=pw(), timeout=6, look_for_keys=False, allow_agent=False)
            return c, h
        except Exception:
            continue
    sys.exit('Pi-DMX svarar inte (hotspot/AP?)')


class Summary:
    def __init__(self):
        self.reset()

    def reset(self):
        self.t0 = time.time(); self.looks = []; self.byLook = collections.Counter(); self.bySec = collections.defaultdict(collections.Counter)
        self.tiers = collections.Counter(); self.toggles = 0; self.sekt = collections.Counter(); self.songs = 0; self.drops = 0; self.minis = 0
        self.lastLook = None; self.lastLookAt = None; self.dwells = []; self.pools = []; self.calm = 0

    def feed(self, line, now):
        m = LOOK.search(line)
        if m:
            part, look, tier, pool, sec, bass, calm = m.groups()
            if self.lastLook and self.lastLookAt: self.dwells.append(now - self.lastLookAt)
            self.lastLook, self.lastLookAt = look, now
            self.looks.append(look); self.byLook[look] += 1; self.tiers[tier] += 1; self.pools.append(int(pool)); self.bySec[sec or '?'][look] += 1
            if calm: self.calm += 1
            return
        m = TOGGLE.search(line)
        if m:
            self.toggles += 1; look = m.group(3)
            if self.lastLook and self.lastLookAt: self.dwells.append(now - self.lastLookAt)
            self.lastLook, self.lastLookAt = look, now; self.looks.append(look); self.byLook[look] += 1; self.bySec['basgang'][look] += 1
            return
        m = SEKT.search(line)
        if m: self.sekt[m.group(2)] += 1; return
        if '[song]' in line: self.songs += 1
        elif '[dropfire]' in line and 'FIRE' in line.upper(): self.drops += 1
        elif '[minidrop]' in line: self.minis += 1

    def text(self):
        dt = max(1.0, time.time() - self.t0)
        n = len(self.looks); med = sorted(self.dwells)[len(self.dwells) // 2] if self.dwells else 0
        out = [f"-- {dt / 60:.1f} min: {n} lookbyten ({len(self.byLook)} olika), uppehall median {med:.0f} s, toggle-val {self.toggles}, lugn {self.calm}, "
               f"latgranser {self.songs}, drops {self.drops}, minidrops {self.minis}, pool medel {sum(self.pools) / len(self.pools) if self.pools else 0:.0f}"]
        if self.tiers: out.append("   tier: " + ", ".join(f"{k} {v}" for k, v in self.tiers.most_common()))
        if self.byLook: out.append("   looker: " + "  ".join(f"{k} {v}" for k, v in self.byLook.most_common(12)))
        for sec, c in self.bySec.items(): out.append(f"   i {sec}: " + "  ".join(f"{k} {v}" for k, v in c.most_common(8)))
        if self.sekt: out.append("   sektionsbyten till: " + ", ".join(f"{k} {v}" for k, v in self.sekt.most_common()))
        return "\n".join(out)


def main():
    c, h = connect()
    print(f'Pi-DMX pa {h} | tjanst {c.exec_command("systemctl is-active audio-dmx-engine")[1].read().decode().strip()}')
    s = Summary()
    if SEDAN:
        i, o, e = c.exec_command(f"journalctl -u audio-dmx-engine --since '{SEDAN} min ago' -o short-unix --no-pager", timeout=30)
        for line in o.read().decode('utf-8', 'replace').splitlines():
            if not any(t in line for t in TAGS): continue
            try: ts = float(line.split()[0])
            except Exception: ts = time.time()
            if RA: print(line[:200])
            s.feed(line, ts)
        s.t0 = time.time() - SEDAN * 60
        print(s.text()); c.close(); return
    tr = c.get_transport(); ch = tr.open_session(); ch.exec_command("journalctl -u audio-dmx-engine -f -n 0 -o cat")
    buf = b''; lastSum = time.time()
    try:
        while True:
            if ch.recv_ready():
                buf += ch.recv(65536)
                while b'\n' in buf:
                    raw, buf = buf.split(b'\n', 1); line = raw.decode('utf-8', 'replace')
                    if any(t in line for t in TAGS):
                        print(time.strftime('%H:%M:%S'), line[:220], flush=True); s.feed(line, time.time())
            else:
                time.sleep(0.2)
            if time.time() - lastSum >= 60:
                print(s.text(), flush=True); lastSum = time.time()
            if ch.exit_status_ready(): print('(journalen stangdes)'); break
    except KeyboardInterrupt:
        pass
    print(s.text()); c.close()


if __name__ == '__main__':
    main()
