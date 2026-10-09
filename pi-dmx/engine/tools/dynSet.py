"""Kor tools/dynBench.mjs over ladans inspelningar 10-08 (Aux -18 dB, 0 % klippt) med ladans SHOW_ENV + ev. --env,
skriver medianer. Natt-agenten 2026-10-09 (levande dynamik utan fladder).
    python tools/dynSet.py [--env K=V ...] [--dir tools/ladan-2026-10-08] [--json ut.json]"""
import argparse, glob, json, os, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__)); ENGINE = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from ladan import SHOW_ENV

def med(xs):
    xs = sorted(x for x in xs if isinstance(x, (int, float)) and x == x)
    return xs[len(xs) // 2] if xs else None

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--env', action='append', default=[])
    ap.add_argument('--dir', default=os.path.join(HERE, 'ladan-2026-10-08')); ap.add_argument('--json', default='')
    a = ap.parse_args()
    env = dict(os.environ)
    for k, v, _ in SHOW_ENV: env[k] = v
    for e in a.env: k, _, v = e.partition('='); env[k] = v
    env['DMX_QUIET'] = '1'
    wavs = sorted(glob.glob(os.path.join(a.dir, '*.wav')))
    def one(w):
        r = subprocess.run(['node', 'tools/dynBench.mjs', w, '--tyst'], cwd=ENGINE, env=env, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=600)
        line = next((l for l in reversed(r.stdout.splitlines()) if l.startswith('{')), None)
        return json.loads(line) if line else {'wav': w, 'fel': r.stderr[-300:]}
    with ThreadPoolExecutor(max_workers=2) as ex: res = list(ex.map(one, wavs))
    ok = [r for r in res if 'levande' in r]
    summ = {g: {k: med([r[g][k] for r in ok]) for k in ok[0][g] if k != 'perLook'} for g in ('levande', 'fladder', 'rgb')} if ok else {}
    tot = {}
    for r in ok:
        for k, v in r['fladder'].get('perLook', {}).items(): tot[k] = tot.get(k, 0) + v
    summ['fladderPerLook'] = dict(sorted(tot.items(), key=lambda kv: -kv[1])[:8]); summ['n'] = len(ok); summ['env'] = a.env
    print(json.dumps(summ, ensure_ascii=False))
    if a.json: json.dump({'summ': summ, 'klipp': res}, open(a.json, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
main()
