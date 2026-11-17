"""PI-BUDGETEN (2026-11-17, ägaren i ladan: "jag vill ju att vi använder pi till max utan att den buffrar"). En SPÄRR för alla arenor,
inte ett mått som ger poäng. Varianten körs i motorns riktiga worker-läge i realtid på PC:n (tools/feedRealtid.mjs, Node 24 som Pi:n)
och jämförs med bas = HEAD. Bara förhållandet mot bas räknas, så PC:ns fart tar ut sig själv.

LADAN 2026-11-17 22:00 (HEAD 78346df, Zero 2 W, motorn på kärna 0 1 2, kärna 3 = dmx-helper + mic):
  huvudtråden 45-65 % av en kärna (snabba vägen, dirigent, effekter, DMX ut, http), worker 18-22 % (tempo, rutnät, ettan, sektion).
  minnet: RSS 129 MB, topp 143 MB; heapen --max-old-space-size=96, tjänsten MemoryMax 340M, swap av. 190 MB ledigt.

BELASTNINGSPROVET I LADAN 2026-11-17 22:31 (ägaren tittade): konstgjord last nice -10 på kärna 0-2 i steg om 0,5 kärna. Inget hack
  i ögat och 0 överhoppade hopp ända till +2,5 kärnor (kärnorna 82-83 %). Huvudtrådens svarstid p99 11 -> 19-22 ms vid +1,0-2,0,
  39 ms (max 51) vid +2,5 = där den börjar vänta. Minne/GC provades inte (lasten låg i egna processer).

SPÄRRAR (DISK), medel över filerna:
  huvudtråd  huvudtradCpuUsPerHop <= bas x 1,10    huvudtråden bär ljuset; den får inte bli tyngre (10 % = PC:ns mätbrus)
  worker     workerUsPerHop      <= bas x 4,0     80 % av en kärna på Pi:n / 20 % i dag (höjt från 3,5 efter belastningsprovet)
  minne      rssMaxMB            <= bas + 15 MB   minnet är det trånga på Pi:n
  hinner     split.skipped = 0 och taktvag.skipped = 0 (workern får aldrig hoppa över)

KOMMANDON (från engine/, PYTHONIOENCODING=utf-8):
  python tools/arena/pibudget.py .arena/<körning>/<mapp> --mat [--bas]   mät -> <mapp>/pibudget.json (--bas = engine/dist)
  python tools/arena/pibudget.py .arena/<körning>                        alla mappar mot <körning>/bas
  LÅS: .arena/.banklas (samma som de andra domarna): mätningen tar CPU-tid, så inget annat får gå samtidigt. ~7 min (2 filer x 3 varv x 60 s).
"""
import io, json, os, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ENGINE = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
from ettdom import las_lock
import shutil
NODE = 'C:/Users/richa/node24dl/win/node-v24.18.0-win-x64/node.exe'
FILER = ['tools/ladan-2026-11-13/lang-20261113T151659.wav', 'tools/ladan-2026-11-13/lang-20261113T171840.wav']
SEK, VARV = 60, 3   # varje fil 3 varv à 60 s, snabbaste varvet räknas (brus 25-30 % med ett varv, 11-17)
HUVUD_TAK, WORKER_TAK, MINNE_MB = 1.10, 4.0, 15.0


def mat(mapp, bas):
    dist = os.path.join(ENGINE, 'dist') if bas else os.path.join(mapp, 'dist')
    lock = las_lock()
    try:
        rader = {}
        for w in FILER:
            varv = []
            for _ in range(VARV):
                r = subprocess.run([NODE, 'tools/feedRealtid.mjs', dist, w, str(SEK)], cwd=ENGINE, capture_output=True, text=True, encoding='utf-8')
                last = [l for l in r.stdout.splitlines() if l.startswith('{')]
                if not last: sys.exit(f'mätfel {w}: {r.stderr[-400:]}')
                varv.append(json.loads(last[-1]))
            x = dict(varv[0]); x['varv'] = [{k: v[k] for k in ('huvudtradCpuUsPerHop', 'workerUsPerHop')} for v in varv]
            for k in ('huvudtradCpuUsPerHop', 'workerUsPerHop'): x[k] = min(v[k] for v in varv)
            x['rssMaxMB'] = max(v.get('rssMaxMB', 0) for v in varv)
            x['split'] = {'skipped': sum(((v.get('split') or {}).get('skipped') or 0) for v in varv)}
            x['taktvag'] = {'skipped': sum(((v.get('taktvag') or {}).get('skipped') or 0) for v in varv)}
            rader[os.path.basename(w)] = x
    finally:
        shutil.rmtree(lock, ignore_errors=True)
    n = len(rader); v = list(rader.values())
    ut = {'huvud': sum(x['huvudtradCpuUsPerHop'] for x in v) / n, 'worker': sum(x['workerUsPerHop'] for x in v) / n,
          'rss': max(x.get('rssMaxMB', 0) for x in v),
          'skipped': sum(((x.get('split') or {}).get('skipped') or 0) + ((x.get('taktvag') or {}).get('skipped') or 0) for x in v),
          'filer': rader}
    json.dump(ut, io.open(os.path.join(mapp, 'pibudget.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f"{os.path.basename(mapp)}: huvudtråd {ut['huvud']:.1f} us/hop  worker {ut['worker']:.1f} us/hop  minne {ut['rss']:.0f} MB  överhoppade {ut['skipped']}")


def dom(korning):
    b = json.load(io.open(os.path.join(korning, 'bas', 'pibudget.json'), encoding='utf-8'))
    print(f"bas: huvudtråd {b['huvud']:.1f} us/hop  worker {b['worker']:.1f}  minne {b['rss']:.0f} MB\n")
    print('| mapp | huvudtråd x bas | worker x bas (Pi-andel) | minne +MB | överhoppade | DISK |\n|---|---|---|---|---|---|')
    for m in sorted(os.listdir(korning)):
        p = os.path.join(korning, m, 'pibudget.json')
        if m == 'bas' or not os.path.exists(p): continue
        x = json.load(io.open(p, encoding='utf-8')); hk, wk, dm = x['huvud'] / b['huvud'], x['worker'] / b['worker'], x['rss'] - b['rss']
        disk = [s for s, f in (('huvudtråd', hk > HUVUD_TAK), ('worker', wk > WORKER_TAK), ('minne', dm > MINNE_MB), ('hinner inte', x['skipped'] > 0)) if f]
        print(f"| {m} | {hk:.2f} | {wk:.2f} (~{20 * wk:.0f} %) | {dm:+.0f} | {x['skipped']} | {', '.join(disk) or '-'} |")


if __name__ == '__main__':
    a = sys.argv[1:]
    if '--mat' in a: mat(os.path.abspath(a[0]), '--bas' in a)
    else: dom(os.path.abspath(a[0]))
