"""SKAKPROVET TILL ARENAN LAT1 (2026-11-14, mellan rundorna - gäller alla lika). Tre deltagare visade oberoende att klockans val kring en
omlåsning är ett lotteri: en halv sekunds skillnad i när låtgränsen kommer ger +-0,9 poäng. En ensam mätning dömer alltså turen.
Här körs varje variant med ljudet påbörjat 0 / 0,1 / 0,2 / 0,3 / 0,4 s in (samma musik, annan fas mot analysatorns fönster) och
domarens mått tas som MEDEL över de fem; spridningen (min..max) redovisas. Samma mått, vikter och spärrar som tools/arena/latdom.py.
  python tools/arena/latskak.py .arena/lat1 bas a1 a3 ... [--holdout]      -> <id>/latskak(-holdout).json + tabell (4 körningar åt gången)
Kostnaden döms inte här (mät den ensam med latdom.py --mat)."""
import sys, os, json, subprocess
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import latdom
E = latdom.ENGINE; OFFS = [0.0, 0.1, 0.2, 0.3, 0.4]
def kor(arg):
    mapp, wav, off = arg; namn = os.path.basename(mapp); env = dict(os.environ)
    if namn != 'bas':
        env['DMX_DIST'] = os.path.join(mapp, 'dist'); env['NODE_OPTIONS'] = '--import=file:///' + os.path.join(E, 'tools', 'arena', 'distHook.mjs').replace(chr(92), '/')
    ut = os.path.join(mapp, 'skak-%s-%d.json' % (os.path.basename(wav)[:-4], round(off * 10)))
    r = subprocess.run(['node', 'tools/arena/latskakKor.mjs', wav, ut, str(off)], cwd=E, env=env, capture_output=True, text=True, encoding='utf-8', errors='replace')
    if r.returncode != 0 or not os.path.exists(ut): return (mapp, wav, off, None, (r.stderr or r.stdout)[-300:])
    return (mapp, wav, off, json.load(open(ut, encoding='utf-8')), '')
if __name__ == '__main__':
    a = [x for x in sys.argv[1:] if not x.startswith('--')]; hold = '--holdout' in sys.argv; korn = os.path.abspath(a[0]); ids = a[1:]
    wavs = latdom.KONTROLL if hold else latdom.OVNING; beats = latdom.facit_beats(); skarv = json.load(open(os.path.join(E, latdom.W, 'latbyten.json'), encoding='utf-8'))
    jobb = [(os.path.join(korn, i), w, o) for i in ids for w in wavs for o in OFFS]
    with ThreadPoolExecutor(max_workers=4) as ex: res = list(ex.map(kor, jobb))
    ut = {}
    for i in ids:
        per = []
        for o in OFFS:
            ds = []
            for (mapp, w, off, raw, err) in res:
                if os.path.basename(mapp) != i or off != o: continue
                if raw is None: print('MÄTFEL', i, w, o, err); continue
                d = latdom.dom_fil(raw, beats[os.path.basename(w)], skarv[os.path.basename(w)]); ds.append(d)
            if len(ds) != len(wavs): continue
            N = sum(d['n'] for d in ds); takt = 100.0 * sum(d['ratt'] for d in ds) / max(1, N); utanf = 100.0 * sum(d['rattu'] for d in ds) / max(1, sum(d['nu'] for d in ds))
            las = [x for d in ds for x in d['las']]; lt = sum(las) / max(1, len(las)); sk = sum(d['skarvar'] for d in ds); tr = sum(d['traff'] for d in ds)
            fal = sum(len(d['falska']) for d in ds); fpm = fal / (sum(d['sek'] for d in ds) / 600.0)
            per.append(dict(off=o, takt=takt, utanfor=utanf, lastid=lt, traff=tr, skarvar=sk, falska=fal, poang=takt + 3.0 * tr / max(1, sk) - 1.5 * fpm - 0.1 * lt,
                            grans=[[round(g[0]) for g in d['grans']] for d in ds], drops=[[round(x) for x in d['drops']] for d in ds]))
        if not per: continue
        m = lambda k: sum(p[k] for p in per) / len(per)
        ut[i] = dict(poang=m('poang'), pmin=min(p['poang'] for p in per), pmax=max(p['poang'] for p in per), takt=m('takt'), tmin=min(p['takt'] for p in per), tmax=max(p['takt'] for p in per),
                     utanfor=m('utanfor'), lastid=m('lastid'), traff=m('traff'), skarvar=per[0]['skarvar'], falska=m('falska'), per=per)
        json.dump(ut[i], open(os.path.join(korn, i, 'latskak-holdout.json' if hold else 'latskak.json'), 'w', encoding='utf-8'), ensure_ascii=False)
    b = ut.get('bas') or (json.load(open(os.path.join(korn, 'bas', 'latskak-holdout.json' if hold else 'latskak.json'), encoding='utf-8')) if os.path.exists(os.path.join(korn, 'bas', 'latskak-holdout.json' if hold else 'latskak.json')) else None)
    print('| id | poäng medel (min..max) | mot bas | takt % medel (min..max) | utanför % | låstid s | låtbyten | falska | DISK |'); print('|---|---|---|---|---|---|---|---|---|')
    for i, u in sorted(ut.items(), key=lambda x: -x[1]['poang']):
        disk = 'utanför' if b and u['utanfor'] < b['utanfor'] - 1.0 else 'OK'
        print('| %s | %.2f (%.2f..%.2f) | %s | %.1f (%.1f..%.1f) | %.1f | %.1f | %.1f/%d | %.1f | %s |' % (i, u['poang'], u['pmin'], u['pmax'], ('%+.2f' % (u['poang'] - b['poang'])) if b else '-', u['takt'], u['tmin'], u['tmax'], u['utanfor'], u['lastid'], u['traff'], u['skarvar'], u['falska'], disk))
