#!/bin/bash
# LATENSMÄTNING PÅ LOTUS-PI:N (ingen felsökning påslagen): N fönster om 10 s med trådarnas CPU (top -H), status före/efter, perf-minuterna.
N=${1:-18}; P=$(systemctl show lotus-light-engine -p MainPID --value)
echo "START $(date +%H:%M:%S) pid $P"
curl -s -m 5 http://127.0.0.1:3051/api/status > /tmp/lat-s0.json
top -H -b -d 10 -n $((N+1)) -p $P -w 200 2>/dev/null | awk '/^top -/{w++} w>1 && ($NF ~ /MainThread|WorkerThread|V8Worker|libuv/) && $9+0 > 0.2 {print w-1, $1, $9, $NF}' > /tmp/lat-top.txt
curl -s -m 5 http://127.0.0.1:3051/api/status > /tmp/lat-s1.json
curl -s -m 5 http://127.0.0.1:3051/api/perf > /tmp/lat-perf.json
echo "SLUT $(date +%H:%M:%S)"
python3 - <<'PY'
import json,statistics as st
rows=[l.split() for l in open('/tmp/lat-top.txt')]
by={}
for w,tid,cpu,name in rows: by.setdefault((tid,name),{})[int(w)]=float(cpu)
nw=max(int(r[0]) for r in rows) if rows else 0
for (tid,name),d in sorted(by.items(), key=lambda x:-sum(x[1].values())):
    v=[d.get(i,0.0) for i in range(1,nw+1)]
    if sum(v)/max(nw,1) < 0.5: continue
    v2=sorted(v); print(f"TRAD {name:14s} tid {tid:6s} cpu medel {sum(v)/len(v):5.1f} %  median {st.median(v):5.1f}  min {v2[0]:5.1f}  max {v2[-1]:5.1f}  ({len(v)} fonster)")
a=json.load(open('/tmp/lat-s0.json')); b=json.load(open('/tmp/lat-s1.json'))
ca,cb=a['analyserCost'],b['analyserCost']; sa,sb=ca['split'],cb['split']
print(f"HOPP {cb['hops']-ca['hops']}  overBudget +{cb['overBudget']-ca['overBudget']}  split skrivna +{sb['written']-sa['written']} behandlade +{sb['processed']-sa['processed']} efter {sb['behind']} lagMs {sb['lagMs']} (max sedan start {sb['lagMaxMs']}) busyUs {sb['busyUs']} (max sedan start {sb['busyMaxUs']}) skipped +{sb['skipped']-sa['skipped']}")
ba,bb=a['ble']['stats'],b['ble']['stats']
print(f"BLE skickade +{bb['sentCount']-ba['sentCount']} skipBusy +{bb['skipBusyCount']-ba['skipBusyCount']} skipCtrlBusy +{bb['skipControllerBusyCount']-ba['skipControllerBusyCount']} writeLatAvgMs {bb['writeLatAvgMs']} writeLatMaxMs {bb['writeLatMaxMs']} fel +{bb['writeFailCount']-ba['writeFailCount']} tickOk +{bb['tickOkCount']-ba['tickOkCount']}")
print(f"MUSIK {b['sonos'].get('trackName')} / vol {b['sonos'].get('volume')} / {b['sonos'].get('playbackState')}  bpm {b['analyser']['bpm']:.1f} sektion {b['section']['section']} drops {b['analyser']['dropCount']} buildUp {b['analyser']['buildUp']:.2f} inZone {b['analyser']['inZone']}  uptime {b['uptime']} s  lead {b['beat'].get('leadMs')} chain {b['beat'].get('chainMs')}")
p=json.load(open('/tmp/lat-perf.json')); m=p['minutes'][-4:]
for x in m:
    r=x['render']; g=x['gc']; l=x.get('loop',{})
    print(f"MINUT {x['startIso'][11:19]} tick n {r['n']} medel {r['meanMs']:.3f} ms max {r['max']:.2f} over1 {r['over1']} over2 {r['over2']} over5 {r['over5']} | loop medel {l.get('meanMs',0):.2f} p99 {l.get('p99Ms',0):.2f} max {l.get('maxMs',0):.1f} | gc liten {g['minor']['n']} st {g['minor']['ms']:.0f} ms max {g['minor']['max']:.1f}, stor {g['major']['n']} st max {g['major']['max']:.0f} | heap {x.get('heapMb')} MB")
PY
