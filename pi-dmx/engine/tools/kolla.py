"""KOLLA LADAN (2026-09-22): laser av Pi-DMX efter en deploy och sager rakt ut om det blev bra. Kraver inget internet.

  cd C:\\Users\\richa\\Desktop\\Claude\\dmx-control\\pi-dmx\\engine
  python tools\\kolla.py            en gang
  python tools\\kolla.py --folj     uppdaterar var 5:e sekund tills du avbryter (Ctrl+C)

Visar: tjanstens tillstand, vilken show-env som galler, tempo/sektion just nu, och analysatorns kostnad per hop
(analyserCost) som avgor om DMX ocksa behover worker-delningen: over budget > ~5 % av hoppen = ja.
"""
import json, os, sys, time

HOSTS = ([os.environ['PI_HOST']] if os.environ.get('PI_HOST') else []) + ['192.168.4.1', '172.29.167.218', '192.168.1.176']
FOLJ = '--folj' in sys.argv


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
    sys.exit('Pi-DMX svarar inte (anslut till WiFi "pi-dmx" och prova igen)')


def sh(c, cmd, t=20):
    i, o, e = c.exec_command(cmd, timeout=t)
    return o.read().decode('utf-8', 'replace').strip()


def once(c, first):
    if first:
        print('== tjanst ==')
        print(' ', sh(c, 'systemctl is-active audio-dmx-engine'), '| uppe sedan', sh(c, "systemctl show audio-dmx-engine -p ActiveEnterTimestamp --value"))
        env = sh(c, "systemctl show audio-dmx-engine -p Environment --value | tr ' ' '\\n' | grep -E '^(DMX|BPM|DROP|BEAT|LIGHT|MINI)' | sort")
        print('== show-env ==')
        for line in env.splitlines(): print('  ', line)
        print('== fel senaste 10 min ==')
        errs = sh(c, "journalctl -u audio-dmx-engine --since '10 min ago' --no-pager | grep -icE 'error|fatal|crash' || true")
        print('  ', errs, 'rader med error/fatal/crash')
    raw = sh(c, "curl -s -m 3 http://127.0.0.1/health || curl -s -m 3 http://127.0.0.1:80/health")
    try:
        d = json.loads(raw)
    except Exception:
        print('  (fick inget /health-svar:', raw[:120], ')'); return
    ac = d.get('analyserCost') or {}
    rt = d.get('runtime') or {}
    hops = ac.get('hops') or 0; over = ac.get('overBudget') or 0
    pct = (100.0 * over / hops) if hops else 0.0
    print(f"analys {ac.get('msEMA')} ms/hop (max {ac.get('msMax')}), budget {ac.get('budgetMs')} ms, "
          f"over budget {over}/{hops} = {pct:.1f} %  ->  worker {'BEHOVS' if pct > 5 else 'behovs inte'}")
    if rt: print(f"  rutjitter {rt.get('jitterEMA') or rt.get('jitterMs')} | langsamma anrop {rt.get('slowCallTotal')} (max {rt.get('maxSlowCallMs')} ms)")


def main():
    c, h = connect()
    print(f'Pi-DMX pa {h}\n')
    first = True
    try:
        while True:
            once(c, first); first = False
            if not FOLJ: break
            time.sleep(5)
    except KeyboardInterrupt:
        pass
    finally:
        c.close()


if __name__ == '__main__':
    main()
