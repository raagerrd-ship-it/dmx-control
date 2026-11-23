"""LJUSSKAKET (2026-11-17, natten efter arenan fras): hur mycket av ljusdomarens poäng är LOOKVALETS SLUMP? Samma kod, samma analys -
bara dirigentens lookföljd ändras: konsertReplay.mjs KR_SEED=1..3 (var tredje look förspelad 60 s, så pickLook drar andra looker)
och KR_TOG=0/1 (låtens toggle-beslut låst). Varje frö bänkas med bank.py (vanlig körning, bara --env ovanpå) och dömes med
domare.py:s doma(). bank.py och domaren är orörda: vanlig bank.py-körning ger samma bank.json som förut.
  python tools/arena/ljusskak.py <körning> <id> [<id> ...] [--bank] [--frön s1,s2,...]
    --bank   bänka saknade frön (en bänk åt gången via bänklåset; ~50 s per frö). Frön hamnar i <körning>/skak/<id>-<frö>/bank.json
             (frö 0 = <körning>/<id>/bank.json, den ordinarie bänken). id 'bas' = engine/dist, annat id = <körning>/<id>/dist.
  Utskrift: (1) varje frö mot ordinarie bas (poäng + delmått + per fil), (2) BRUSET = alla par frö i mot frö j (bas mot bas),
  (3) medel över N frön mot medel över N andra frön (spärrens kostnad), (4) med fler id: id:s fröMEDEL mot basens fröMEDEL.
  Resultat även i <körning>/ljusskak.json.
  --holdout (11-23): samma sak på KONTROLLMÄNGDEN (bank-holdout.json per frö, domare.py:s --holdout-vikter) -> ljusskak-holdout.json."""
import io, itertools, json, os, shutil, statistics as st, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ENGINE = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE); import domare
FRON = {'s1': ['KR_SEED=1'], 's2': ['KR_SEED=2'], 's3': ['KR_SEED=3'], 't0': ['KR_TOG=0'], 't1': ['KR_TOG=1'],
        's1t0': ['KR_SEED=1', 'KR_TOG=0'], 's2t1': ['KR_SEED=2', 'KR_TOG=1'], 's3t0': ['KR_SEED=3', 'KR_TOG=0']}   # KR_SEED går runt mod 3

def bank(korn, i, fro):
    d = os.path.join(korn, 'skak', f'{i}-{fro}'); env = dict(os.environ)
    if os.path.exists(os.path.join(d, domare.BANK)): return
    bf = os.path.join(korn, 'basenv.txt')
    if os.path.exists(bf): os.makedirs(os.path.join(korn, 'skak'), exist_ok=True); shutil.copy(bf, os.path.join(korn, 'skak', 'basenv.txt'))
    if i != 'bas':   # deltagarens dist via kroken (bank.py --bas tar env som den är; utan --bas kräver bank.py <mapp>/dist)
        import pathlib; env['DMX_DIST'] = os.path.join(korn, i, 'dist')
        env['NODE_OPTIONS'] = (env.get('NODE_OPTIONS', '') + ' --import=' + pathlib.Path(HERE, 'distHook.mjs').as_uri()).strip()
    cmd = [sys.executable, os.path.join(HERE, 'bank.py'), d, '--bas'] + (['--holdout'] if domare.HOLD else []) + sum((['--env', e] for e in FRON[fro]), [])
    print('bänkar', i, fro, flush=True); subprocess.run(cmd, cwd=ENGINE, env=env, check=True)

def medel(bs):   # medel av alla tal (rekursivt) över bänkarna; annat tas från den första
    def m(xs):
        x0 = xs[0]
        if isinstance(x0, dict): return {k: m([x[k] for x in xs]) for k in x0 if all(isinstance(x, dict) and k in x for x in xs)}
        if isinstance(x0, (int, float)) and not isinstance(x0, bool) and all(isinstance(x, (int, float)) for x in xs): return sum(xs) / len(xs)
        return x0
    return m(bs)

def per_fil(b, v):   # delmåtten fil för fil (samma räkning som doma, utan vikter)
    o = {}
    for n in domare.WT:
        R, B = v['rytm'][n], b['rytm'][n]; rel = domare.rel
        o[n] = dict(takt=(rel(R['rAbest'], B['rAbest']) + rel(R['rK'], B['rK'])) / 2, dyn=(rel(R['slagK'], B['slagK']) + rel(R['djup'], B['djup'])) / 2,
                    jit=-rel(R['jitter'], B['jitter']), bet=100 * (R['betoning'] - B['betoning']))
        o[n]['kor'] = (o[n]['jit'] + o[n]['bet']) / 2; o[n]['poang'] = 0.45 * o[n]['dyn'] + 0.35 * o[n]['kor'] + 0.2 * o[n]['takt']
    return o

def dom(b, v):
    r = domare.doma(b, v, os.path.join(ENGINE, '.arena', 'ljusbrus', '_ingen'))
    pf = per_fil(b, v); wsum = sum(domare.WT.values())
    r['jit'] = sum(domare.WT[n] * pf[n]['jit'] for n in pf) / wsum; r['bet'] = sum(domare.WT[n] * pf[n]['bet'] for n in pf) / wsum
    r['sl'] = sum(v['rytm'][n]['slocknat1s'] - b['rytm'][n]['slocknat1s'] for n in domare.WT) / len(domare.WT) * 100
    r['lsm'] = sum(r['lampspr'].values()) / len(r['lampspr']); r['fil'] = pf; return r

def stat(xs): return dict(medel=st.mean(xs), std=st.pstdev(xs) if len(xs) > 1 else 0.0, min=min(xs), max=max(xs), n=len(xs))
def fmt(s): return f"{s['medel']:+.2f} ± {s['std']:.2f} ({s['min']:+.2f}..{s['max']:+.2f}, n {s['n']})"
KEYS = [('poang', 'poäng'), ('kontrast', 'dynamik'), ('kor', 'koreografi'), ('jit', ' jitter'), ('bet', ' betoning'), ('takt', 'takt'), ('ljus', 'ljus %'), ('sl', 'slocknat pe'), ('lsm', 'lampspr medel %')]

if __name__ == '__main__':
    a = [x for i, x in enumerate(sys.argv[1:], 1) if not x.startswith('--') and sys.argv[i - 1] != '--frön']; korn = os.path.abspath(a[0]); ids = a[1:] or ['bas']
    fron = sys.argv[sys.argv.index('--frön') + 1].split(',') if '--frön' in sys.argv else list(FRON)
    if '--bank' in sys.argv:
        for i in ids:
            for f in fron: bank(korn, i, f)
    def banker(i):
        out = {'0': domare.load(os.path.join(korn, i))}
        for f in fron: out[f] = domare.load(os.path.join(korn, 'skak', f'{i}-{f}'))
        return {k: v for k, v in out.items() if v}
    B = banker('bas'); b0 = B['0']; res = {'fron': list(B)}
    print(f"## 1. varje frö mot ordinarie bas ({len(B) - 1} frön)\n")
    print('| frö | poäng | dynamik | koreografi | jitter | betoning | takt | ljus % | slocknat pe | lampspr ' + '/'.join(domare.WT) + ' % | DISK |'); print('|' + '---|' * 11)
    rows = {}
    for f, v in B.items():
        if f == '0': continue
        r = rows[f] = dom(b0, v)
        print(f"| {f} | {r['poang']:+.2f} | {r['kontrast']:+.2f} | {r['kor']:+.2f} | {r['jit']:+.2f} | {r['bet']:+.2f} | {r['takt']:+.2f} | {r['ljus']:+.2f} | {r['sl']:+.2f} | " + '/'.join(f"{x:+.1f}" for x in r['lampspr'].values()) + f" | {'; '.join(r['disk']) or '-'} |")
    if rows:
        res['motBas'] = {k: stat([r[k] for r in rows.values()]) for k, _ in KEYS}
        print('\n' + '\n'.join(f"  {n:16s} {fmt(res['motBas'][k])}" for k, n in KEYS))
        print('\n  per fil (poäng utan vikter; dyn / kor / takt):')
        for n in domare.WT:
            s = {k: stat([r['fil'][n][k] for r in rows.values()]) for k in ('poang', 'dyn', 'kor', 'jit', 'bet', 'takt')}; res.setdefault('motBasFil', {})[n] = s
            print(f"   {n}: poäng {fmt(s['poang'])} | dyn ±{s['dyn']['std']:.2f} kor ±{s['kor']['std']:.2f} (jit ±{s['jit']['std']:.2f} bet ±{s['bet']['std']:.2f}) takt ±{s['takt']['std']:.2f}")
    par = [dom(B[j], B[i]) for i, j in itertools.permutations(B, 2)]
    if par:
        res['par'] = {k: stat([r[k] for r in par]) for k, _ in KEYS}; nd = sum(1 for r in par if r['poang'] < -1.5); ndisk = sum(1 for r in par if r['disk'])
        print(f"\n## 2. BRUSET: alla par frö i mot frö j ({len(par)} par, samma kod)\n" + '\n'.join(f"  {n:16s} {fmt(res['par'][k])}" for k, n in KEYS))
        print(f"  poäng < -1,5 (dagens ljusspärr): {nd} av {len(par)} par;  andra spärrar fällde {ndisk} par: " + '; '.join(sorted({x for r in par for x in r['disk']}))[:300])
        res['parUnder15'] = nd; res['parDisk'] = ndisk
    ks = list(B); res['N'] = {}
    print('\n## 3. medel över N frön mot medel över N ANDRA frön (alla disjunkta par av grupper)\n')
    for N in range(1, len(ks) // 2 + 1):
        ps = []
        for A in itertools.combinations(ks, N):
            rest = [k for k in ks if k not in A]
            for C in itertools.combinations(rest, N): ps.append(domare.doma(medel([B[k] for k in C]), medel([B[k] for k in A]), os.path.join(korn, '_ingen'))['poang'])
        s = res['N'][N] = stat(ps); print(f"  N {N}: poäng {fmt(s)}  -> 2·std {2 * s['std']:.2f}, bänktid ~{N} × 50 s per deltagare")
    for i in ids:
        if i == 'bas': continue
        V = banker(i)
        if len(V) < 2: continue
        r = domare.doma(medel(list(B.values())), medel(list(V.values())), os.path.join(korn, i)); en = domare.doma(b0, V['0'], os.path.join(korn, i)) if '0' in V else None
        print(f"\n## {i}: fröMEDEL ({len(V)}) mot basens fröMEDEL ({len(B)}): poäng {r['poang']:+.2f}" + (f"  (ensam bänk {en['poang']:+.2f})" if en else '') + f"  DISK {'; '.join(r['disk']) or '-'}")
        res.setdefault('id', {})[i] = dict(medel=r['poang'], ensam=en and en['poang'], disk=r['disk'], n=len(V))
    json.dump(res, io.open(os.path.join(korn, 'ljusskak-holdout.json' if domare.HOLD else 'ljusskak.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
