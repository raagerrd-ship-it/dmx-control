#!/bin/bash
# LATENSMÄTNING PÅ LADANS PI (Pi-DMX, tjänsten audio-dmx-engine, API på port 80). Ingen felsökning påslagen.
#   scp tools/refaktor/latens-ladan.sh pi@<ip>:/tmp/ && ssh pi@<ip> 'bash /tmp/latens-ladan.sh 18'
# N fönster om 10 s med trådarnas CPU (top -H), /api/health före och efter, och de senaste minuterna ur /api/perf.
# Jämför med 2026-11-13 (tools/natt/grund-2026-11-13.md): huvudtråd 30-55 %, arbetstråd 18 %, loop p99 11 ms, eftersläp < 1 ms, 135 MB.
N=${1:-18}; P=$(systemctl show audio-dmx-engine -p MainPID --value)
echo "START $(date +%H:%M:%S) pid $P"
curl -skL -m 6 http://127.0.0.1/api/health-log > /tmp/lat-h0.json
top -H -b -d 10 -n $((N+1)) -p $P -w 200 2>/dev/null | awk '/^top -/{w++} w>1 && $1 ~ /^[0-9]+$/ && $9+0 > 0.2 {print w-1, $1, $9, $NF}' > /tmp/lat-top.txt
curl -skL -m 6 http://127.0.0.1/api/health-log > /tmp/lat-h1.json
curl -skL -m 6 http://127.0.0.1/api/perf > /tmp/lat-perf.json
echo "SLUT $(date +%H:%M:%S)  NRestarts $(systemctl show audio-dmx-engine -p NRestarts --value)  minne $(( $(ps -o rss= -p $P) / 1024 )) MB  temp $(vcgencmd measure_temp 2>/dev/null)"
python3 - <<'PY'
import json, statistics as st
rows = [l.split() for l in open('/tmp/lat-top.txt') if len(l.split()) >= 4]
by = {}
for w, tid, cpu, name in [(r[0], r[1], r[2], r[-1]) for r in rows]:
    try: by.setdefault((tid, name), {})[int(w)] = float(cpu.replace(',', '.'))
    except ValueError: pass
nw = max([int(r[0]) for r in rows] or [0])
for (tid, name), d in sorted(by.items(), key=lambda x: -sum(x[1].values())):
    v = [d.get(i, 0.0) for i in range(1, nw + 1)]
    if not v or sum(v) / len(v) < 0.5: continue
    v2 = sorted(v); print("TRAD %-16s tid %-6s cpu medel %5.1f %%  median %5.1f  min %5.1f  max %5.1f  (%d fonster)" % (name, tid, sum(v) / len(v), st.median(v), v2[0], v2[-1], len(v)))
a = json.load(open('/tmp/lat-h0.json')); b = json.load(open('/tmp/lat-h1.json'))
sa, sb = a.get('split', {}), b.get('split', {}); ca, cb = a.get('analyserCost', {}), b.get('analyserCost', {}); ra, rb = a.get('runtime', {}), b.get('runtime', {})
print("SPLIT skrivna +%s behandlade +%s efter %s lagMs %s (max sedan start %s) busyUs %s (max %s) skippade +%s" % (sb.get('written', 0) - sa.get('written', 0), sb.get('processed', 0) - sa.get('processed', 0), sb.get('behind'), sb.get('lagMs'), sb.get('lagMaxMs'), sb.get('busyUs'), sb.get('busyMaxUs'), sb.get('skipped', 0) - sa.get('skipped', 0)))
print("ANALYS hopp +%s over budget +%s | overrun +%s sena renderingar +%s" % (cb.get('hops', 0) - ca.get('hops', 0), cb.get('overBudget', 0) - ca.get('overBudget', 0), rb.get('overrunTotal', 0) - ra.get('overrunTotal', 0), rb.get('lateRenderTotal', 0) - ra.get('lateRenderTotal', 0)))
print("VERSION %s | handelser: %s" % (b.get('version'), '; '.join("%s %s" % (e.get('tag'), e.get('msg')) for e in b.get('events', [])[-4:])))
try:
    p = json.load(open('/tmp/lat-perf.json'))
    for x in p.get('minutes', [])[-4:]:
        r = x.get('render', {}); g = x.get('gc', {}); l = x.get('loop', {})
        print("MINUT %s render n %s medel %.3f ms max %.2f over5 %s | loop medel %.2f p99 %.2f max %.1f | gc liten %s st max %.1f, stor %s st max %.0f | heap %s MB" % (x.get('startIso', '')[11:19], r.get('n'), r.get('meanMs', 0), r.get('max', 0), r.get('over5'), l.get('meanMs', 0), l.get('p99Ms', 0), l.get('maxMs', 0), g.get('minor', {}).get('n'), g.get('minor', {}).get('max', 0), g.get('major', {}).get('n'), g.get('major', {}).get('max', 0), x.get('heapMb')))
except Exception as e:
    print("perf saknas:", e)
PY
rm -f /tmp/lat-h0.json /tmp/lat-h1.json /tmp/lat-perf.json /tmp/lat-top.txt
