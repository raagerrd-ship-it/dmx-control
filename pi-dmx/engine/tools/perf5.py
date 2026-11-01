"""Läser Pi:ns /api/perf varje minut i 6 minuter efter en omstart och skriver en tabell per minut.
Jämförs med baslinjen 2026-10-26 (minut 1: minor 92, major 1-2/min i 5 min, loop max 1144 ms).
  PI_HOST=<ip> python tools/perf5.py
"""
import json, os, sys, time, urllib.request

host = os.environ.get('PI_HOST') or (sys.argv[1] if len(sys.argv) > 1 else None)
if not host: sys.exit('ange PI_HOST=<ip>')
url = f'http://{host}/api/perf'
seen = set()
print(f'läser {url} varje minut i 6 min ...')
for _ in range(7):
    try:
        d = json.load(urllib.request.urlopen(url, timeout=8))
    except Exception as e:
        print('  (svarar inte än:', e, ')'); time.sleep(60); continue
    for i, m in enumerate(d.get('minutes', [])):
        key = m.get('startIso')
        if key in seen: continue
        seen.add(key)
        g = m.get('gc', {}); lp = m.get('loop', {}); r = m.get('render', {})
        print(f"min {i+1}: minor {g.get('minor',{}).get('n',0):3d} (max {g.get('minor',{}).get('max',0):5.1f} ms)  "
              f"major {g.get('major',{}).get('n',0):2d} (max {g.get('major',{}).get('max',0):5.1f} ms)  "
              f"loop p99 {lp.get('p99Ms',0):6.1f} max {lp.get('maxMs',0):7.1f} ms  render max {r.get('max',0):5.1f} ms  heap {m.get('heapMb',0)} MB")
    c = d.get('current', {}); g = c.get('gc', {}); lp = c.get('loop', {})
    print(f"  pågående minut: minor {g.get('minor',{}).get('n',0)}  major {g.get('major',{}).get('n',0)}  loop max {lp.get('maxMs',0)} ms")
    fg = d.get('forcedGc', {})
    if fg.get('n'): print(f"  tvingade städningar: {fg.get('n')} (max {fg.get('maxMs', fg.get('max','?'))} ms)")
    time.sleep(60)
