"""NATT --SNABB MOT EN PATCHAD DIST-KOPIA (dagkörningen 2026-11-07). natt.py kör alltid dist/ - för att döma en kodändring som bara finns
som opåförd patch (src/ rörs inte, ingen bygg) körs samma effektmotorberoende delar av natt.py --snabb mot en handpatchad kopia av dist/
som ligger INNE i engine-trädet (så node_modules/fft.js hittas), t.ex. tools/natt/prov/dag-drop-dist-landtak:
  mixarna   showTight.mjs --dist (kick->ljus, r, dropsprång lugn/hög, lampspr, ...)
  ljusLag   ljusLag.py med LJUSLAG_REPLAY_ARGS='--dist ...' (konsertReplay --dist)
  kvällen   konsertReplay.mjs --dist --step 5 --delad-cfg --live-kick + rodTrad.mjs (som natt.run_kvall)
sektionLag och tempoMix läser bara analysatorn (inte effects.js) och är identiska med natt.py:s - körs inte här.

  python tools/nattDist.py --dist tools/natt/prov/<kopia> --tag namn [--env K=V ...] [--mot tools/natt/<datum>-<tag>.json]
  -> tools/natt/<datum>-<tag>.json (samma nycklar som natt.py för mixar/ljusLag/kvall), ingen scoreboard-rad
"""
import argparse, io, json, os, subprocess, sys, tempfile, time
from datetime import date
HERE = os.path.dirname(os.path.abspath(__file__)); ENGINE = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import natt
from ladan import SHOW_ENV


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dist', required=True); ap.add_argument('--tag', required=True)
    ap.add_argument('--env', action='append', default=[]); ap.add_argument('--mot', default=None)
    a = ap.parse_args()
    env = dict(os.environ)
    for k, v, _w in SHOW_ENV: env[k] = v
    for e in a.env: k, _, v = e.partition('='); env[k] = v
    env['DMX_QUIET'] = '1'
    dist = os.path.relpath(os.path.abspath(a.dist), ENGINE).replace('\\', '/')
    out = {'datum': date.today().isoformat(), 'tag': a.tag, 'dist': dist, 'env': a.env, 'mixar': {}, 'ljusLag': {}}
    t0 = time.time()
    for namn, wav in natt.MIXAR:
        r = subprocess.run(['node', 'tools/showTight.mjs', wav, '--tyst', '--dist', dist], cwd=ENGINE, env=env, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=1200)
        line = next((l for l in reversed(r.stdout.splitlines()) if l.startswith('{')), None)
        out['mixar'][namn] = json.loads(line) if line else {'fel': (r.stderr or r.stdout)[-400:]}
    env2 = dict(env); env2['LJUSLAG_REPLAY_ARGS'] = '--dist ' + dist
    for namn, wav in natt.ARLIGA:
        out['ljusLag'][namn] = natt.run_ljuslag(wav, env2)
    wav = natt.kvall_wav(); fd, js = tempfile.mkstemp(suffix='.json'); os.close(fd)
    try:
        r = subprocess.run(['node', '--max-old-space-size=4096', 'tools/konsertReplay.mjs', wav, '--step', '5', '--delad-cfg', '--live-kick', '--dist', dist, '--json', js],
                           cwd=ENGINE, env=env, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=3600)
        r = subprocess.run(['node', 'tools/rodTrad.mjs', js], cwd=ENGINE, env=env, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=600)
        out['kvall'] = json.loads(r.stdout[r.stdout.index('{'):])
    except Exception as e:
        out['kvall'] = {'fel': str(e)[-300:]}
    finally:
        os.remove(js)
    out['tidS'] = round(time.time() - t0)
    ut = os.path.join(HERE, 'natt', f"{out['datum']}-{a.tag}.json")
    json.dump(out, io.open(ut, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    base = json.load(io.open(a.mot, encoding='utf-8')) if a.mot else None
    def row(d):
        c = []
        for n in ('pop', 'megamix'):
            m = d['mixar'][n]; t = m.get('tajt', {}); s = m.get('snygg', {})
            c.append(f"{n} kick->ljus {t.get('kickLagMs')} r {t.get('energiR', float('nan')):.3f} drops lugn/hög {t.get('dropSprangLugn', float('nan')):.3f}/{t.get('dropSprangHog', float('nan')):.3f} lampspr {s.get('lampspr', float('nan')):.2f} p50/p90 {s.get('litP50', float('nan')):.3f}/{s.get('litP90', float('nan')):.3f} mörkt {s.get('morkt', float('nan')):.3f}")
        c.append('ljusLag ' + ' '.join(f"{n} {r.get('korskorr')}/{r.get('t90')}" for n, r in d['ljusLag'].items()))
        k = d.get('kvall', {}); c.append(f"kvall unika {k.get('unika kvällen')} effektivt {k.get('effektivt antal')} hör ihop {k.get('hör ihop')} drops {k.get('drops')} byten/min {k.get('byten/min')}")
        return c
    print(f"{a.tag} ({dist}, {' '.join(a.env)}) {out['tidS']} s")
    for x in row(out): print('  ' + x)
    if base:
        print('baslinje ' + (base.get('tag') or ''))
        for x in row(base): print('  ' + x)


if __name__ == '__main__':
    main()
