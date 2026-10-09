"""
NATTJOBB DMX (2026-10-06). Agaren: "analysera mot nya motorn hur effekterna syns/visualiseras sa de blir tight
mot latarna och en snygg ljusshow". Det har ar natt-agentens MATNING: kor tools/showTight.mjs (riktig analysator
+ riktig effektmotor i smart-lage) over ladans tva mixar i full langd och den frysta latlistan (frozen6, 222 klipp
a 40 s), med EXAKT ladans env (SHOW_ENV importeras ur ladan.py - aldrig en egen kopia, det var matfalla 26),
och skriver en jamforbar dygnspost:

    tools/natt/<datum>.json      allt, per lat
    tools/natt/scoreboard.md     en rad per korning

    python tools/natt.py [--datum YYYY-MM-DD] [--snabb] [--tag namn] [--env K=V ...]

  --snabb      bara mixarna (~30 s) - for att prova en kandidat fort
  (utan --snabb kors aven ladans 20 inspelningar 10-08 genom tools/dynSet.py -> tools/natt/dynamik.md)
  --tag/--env  A/B av en kandidat: raden taggas sa den inte blandas med baslinjen; env laggs OVANPA ladans
  --lista      annan manifest.tsv (standard tools/frozen6/manifest.tsv)
  --norm DBFS  nivaanpassa KLIPPEN till ladans aux-niva, STANDARD -3.5 sedan 10-07 (matfalla 35: frozen6 ~28 dB
               under ladan; korpusrader fore 10-07 v2-norm ar INTE jamforbara); --norm 999 = utan

MIXARNA bar look-/sektions-/dropmatten (10 min var, riktig dramaturgi). KLIPPEN (40 s) ar for korta for
look-byten (MIN_HOLD 8 s, dwell 45 s) men ger bredd for kick/energi/farg over 100+ artister - rapportera
aldrig look-matt fran klippen. Matfalla: korpusens medianer jamfors bara mot samma lista (frozen6), aldrig mot
en annan lista eller mot mixarna.
"""
import argparse, io, json, os, subprocess, sys, time
from concurrent.futures import ThreadPoolExecutor
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))
ENGINE = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from ladan import SHOW_ENV   # ladans sanning: det som faktiskt kor i riggen (utover kodens standard)

MIXAR = [('pop', 'tools/pop_ladan.wav'), ('megamix', 'tools/megamix_ladan.wav')]
METRIC_TAJT = ['kickLagMs', 'kickTraff', 'kickHojd', 'energiR', 'energiRtopp', 'nivaR', 'litLugn', 'litFart', 'litFull']
METRIC_SNYGG = ['alla3', 'en', 'matt', 'lampspr', 'morkt', 'litP50', 'litP90']


def run_one(wav, env, start=0, sek=None, norm=None):
    cmd = ['node', 'tools/showTight.mjs', wav, '--tyst']
    if norm is not None: cmd += ['--norm', str(norm)]
    if start: cmd += ['--start', str(start)]
    if sek: cmd += ['--sek', str(sek)]
    r = subprocess.run(cmd, cwd=ENGINE, env=env, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=600)
    line = next((l for l in reversed(r.stdout.splitlines()) if l.startswith('{')), None)
    if not line:
        return {'wav': wav, 'fel': (r.stderr or r.stdout)[-400:]}
    return json.loads(line)


def med(xs):
    xs = sorted(x for x in xs if isinstance(x, (int, float)) and x == x)
    return xs[len(xs) // 2] if xs else None


def f(x, d=2):
    return '-' if x is None or x != x else (f'{x:.{d}f}' if isinstance(x, float) else str(x))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--datum', default=date.today().isoformat())
    ap.add_argument('--snabb', action='store_true')
    ap.add_argument('--tag', default='')
    ap.add_argument('--env', action='append', default=[])
    ap.add_argument('--norm', type=float, default=-3.5)   # STANDARD fran 2026-10-07 (matfalla 35): korpusen pa ladans aux-niva; --norm 999 = ingen
    ap.add_argument('--lista', default=os.path.join(HERE, 'frozen6', 'manifest.tsv'))
    a = ap.parse_args()

    env = dict(os.environ)
    for k, v, _why in SHOW_ENV: env[k] = v
    for e in a.env:
        k, _, v = e.partition('='); env[k] = v
    env['DMX_QUIET'] = '1'
    git = subprocess.run(['git', 'rev-parse', '--short', 'HEAD'], cwd=ENGINE, capture_output=True, text=True).stdout.strip()
    t0 = time.time()
    out = {'datum': a.datum, 'tag': a.tag, 'git': git, 'env': {k: v for k, v, _ in SHOW_ENV} | {e.partition('=')[0]: e.partition('=')[2] for e in a.env},
           'mixar': {}, 'korpus': None, 'effekter': None, 'norm': a.norm}

    # 1. MIXARNA i full langd (look-/sektions-/dropmatt bor har)
    for namn, wav in MIXAR:
        out['mixar'][namn] = run_one(wav, env)
        print(f'  {namn:8s} {out["mixar"][namn].get("totS", "?")} s  kick->ljus {f(out["mixar"][namn].get("tajt", {}).get("kickLagMs"), 0)} ms  r {f(out["mixar"][namn].get("tajt", {}).get("energiR"))}')

    # 2. KLIPPEN (bredd: kick/energi/farg, aldrig lookar)
    if not a.snabb and os.path.exists(a.lista):
        rows = [l.rstrip('\n').split('\t') for l in io.open(a.lista, encoding='utf-8')][1:]
        base = os.path.dirname(a.lista)
        jobs = [(r[1], r[2], os.path.join(base, r[-1])) for r in rows if len(r) >= 6 and os.path.exists(os.path.join(base, r[-1]))]
        res = []
        with ThreadPoolExecutor(max_workers=2) as ex:   # hogst tva bankar parallellt (regeln fran lotus-rutinen)
            for (artist, title, wav), r in zip(jobs, ex.map(lambda j: run_one(j[2], env, norm=None if a.norm == 999 else a.norm), jobs)):
                r['artist'] = artist; r['title'] = title; res.append(r)
        ok = [r for r in res if 'tajt' in r]
        korpus = {'n': len(ok), 'fel': len(res) - len(ok), 'lista': os.path.relpath(a.lista, ENGINE), 'median': {}, 'samst': {}, 'latar': ok}
        for m in METRIC_TAJT: korpus['median'][m] = med([r['tajt'].get(m) for r in ok])
        for m in METRIC_SNYGG: korpus['median'][m] = med([r['snygg'].get(m) for r in ok])
        # SAMST: de tre latarna som drar ner varje axel - det ar dem natt-agenten ska lyssna pa forst
        def worst(key, sub, rev=False):
            xs = [(r[sub].get(key), f'{r["artist"]} - {r["title"]}') for r in ok if isinstance(r[sub].get(key), (int, float)) and r[sub].get(key) == r[sub].get(key)]
            xs.sort(reverse=rev)
            return [f'{v:.2f} {n}' for v, n in xs[:3]]
        korpus['samst'] = {'energiR lagst': worst('energiR', 'tajt'), 'kickTraff lagst': worst('kickTraff', 'tajt'),
                           'alla3 hogst': worst('alla3', 'snygg', True), 'morkt hogst': worst('morkt', 'snygg', True)}
        out['korpus'] = korpus
        print(f'  korpus   {len(ok)} klipp ({len(res) - len(ok)} fel)  kick->ljus {f(korpus["median"]["kickLagMs"], 0)} ms  traff {f(korpus["median"]["kickTraff"])}  r {f(korpus["median"]["energiR"])}  alla3 {f(korpus["median"]["alla3"])}')

    # 2b. LADANS INSPELNINGAR 10-08 (Aux -18 dB, 0 % klippt, 13 dB spann): DYNAMIK + FLADDER + R/G/B med ladans tandpunkt
    #     (tools/dynSet.py -> dynBench.mjs). De gamla mixarna ar klippta (5 dB spann) och sager inget om dynamik.
    if not a.snabb and os.path.isdir(os.path.join(HERE, 'ladan-2026-10-08')):
        r = subprocess.run([sys.executable, 'tools/dynSet.py'] + sum((['--env', e] for e in a.env), []), cwd=ENGINE,
                           capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=1800)
        line = next((l for l in reversed(r.stdout.splitlines()) if l.startswith('{')), None)
        out['ladan1008'] = json.loads(line) if line else {'fel': (r.stderr or '')[-300:]}
        lv = out['ladan1008'].get('levande', {})
        print(f'  ladan1008 {out["ladan1008"].get("n", 0)} klipp  mdSteg {f(lv.get("mdSteg"))}  rDb {f(lv.get("rDb"))}  fladder/min {f(out["ladan1008"].get("fladder", {}).get("fladderMin"), 1)}')

    # 3. EFFEKTERNA: speltid per look over bada mixarna + de som aldrig valdes (gallringsunderlag)
    try:
        reg = subprocess.run(['node', '-e', 'import("./dist/effects/registry.js").then(m=>console.log(JSON.stringify(m.EFFECTS.map(e=>[e.key,e.tier,e.section||null]))))'],
                             cwd=ENGINE, capture_output=True, text=True).stdout.strip()
        alla = json.loads(reg.splitlines()[-1])
    except Exception:
        alla = []
    tid = {}
    for namn, r in out['mixar'].items():
        for k, s in r.get('lookTime', []): tid[k] = tid.get(k, 0) + s
    out['effekter'] = {'register': len(alla), 'valdes': dict(sorted(tid.items(), key=lambda kv: -kv[1])),
                       'aldrigValda': [k for k, _t, _s in alla if k not in tid and k not in ('drops',)]}
    out['tidS'] = round(time.time() - t0)

    # 4. SKRIV
    d = os.path.join(HERE, 'natt'); os.makedirs(d, exist_ok=True)
    fn = os.path.join(d, f'{a.datum}{"-" + a.tag if a.tag else ""}.json')
    io.open(fn, 'w', encoding='utf-8').write(json.dumps(out, ensure_ascii=False, indent=1))
    sb = os.path.join(d, 'scoreboard.md')
    if not os.path.exists(sb):
        io.open(sb, 'w', encoding='utf-8').write(
            '# DMX natt-scoreboard\n\nEn rad per korning av tools/natt.py. Mixar = pop/megamix i full langd (lookar/drops bor har), '
            'korpus = frozen6 (222 klipp a 40 s, bara kick/energi/farg). Jamfor bara mot rader med samma git-standard, aldrig mot taggade A/B-rader.\n\n'
            '| datum | git | tag | pop kick->ljus/traff | pop r energi | pop byten/min musik% | pop alla3/lampspr | pop lookar/langst | pop morkt | '
            'mega kick->ljus/traff | mega r | mega byten/min musik% | mega alla3/lampspr | mega lookar/langst | mega morkt | mega drops lugna/hoga | '
            'korpus n | k kick->ljus/traff | k r | k alla3/matt | k morkt | aldrig valda |\n'
            '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n')
    def mix(n):
        r = out['mixar'].get(n, {}); t = r.get('tajt', {}); s = r.get('snygg', {})
        return (f'{f(t.get("kickLagMs"), 0)}/{f(t.get("kickTraff"))} | {f(t.get("energiR"))} | {f(t.get("bytenPerMin"), 1)} {f((t.get("musikByten") or 0) * 100, 0)}% | '
                f'{f(s.get("alla3"))}/{f(s.get("lampspr"), 0)} | {f(s.get("lookar"), 0)}/{f(s.get("lookLangstaS"), 0)} s | {f(s.get("morkt"))}')
    km = (out['korpus'] or {}).get('median', {})
    mt = out['mixar'].get('megamix', {}).get('tajt', {})
    row = (f'| {a.datum} | {git} | {a.tag or "-"} | {mix("pop")} | {mix("megamix")} | {f(mt.get("dropsLugna"), 0)}/{f((mt.get("drops") or 0) - (mt.get("dropsLugna") or 0), 0)} | '
           f'{(out["korpus"] or {}).get("n", "-")} | {f(km.get("kickLagMs"), 0)}/{f(km.get("kickTraff"))} | {f(km.get("energiR"))} | {f(km.get("alla3"))}/{f(km.get("matt"))} | {f(km.get("morkt"))} | '
           f'{len(out["effekter"]["aldrigValda"])} |\n')
    io.open(sb, 'a', encoding='utf-8').write(row)
    if out.get('ladan1008', {}).get('levande'):
        dm = os.path.join(d, 'dynamik.md')
        if not os.path.exists(dm):
            io.open(dm, 'w', encoding='utf-8').write(
                '# Dynamik pa ladans inspelningar 10-08 (tools/dynSet.py, medianer over 20 klipp a 30 s, tandpunkt 16)\n\n'
                '| datum | git | tag | mdSteg | ljusSteg | rDb | kontrast | litP50 | fladder/min | R/G/B blink/min | ofrivillig blink/min | alla3 |\n'
                '|---|---|---|---|---|---|---|---|---|---|---|---|\n')
        L = out['ladan1008']; lv = L['levande']; fl = L['fladder']; rg = L['rgb']
        io.open(dm, 'a', encoding='utf-8').write(
            f'| {a.datum} | {git} | {a.tag or "-"} | {f(lv["mdSteg"])} | {f(lv["ljusSteg"])} | {f(lv["rDb"])} | {f(lv["kontrast"])} | {f(lv["litP50"], 3)} | '
            f'{f(fl["fladderMin"], 1)} | {f(rg["sidoBlinkMin"], 1)} | {f(rg.get("ofrivBlinkMin"), 1)} | {f(rg.get("alla3"), 3)} |\n')
    print(f'\nskrev {os.path.relpath(fn, ENGINE)} och en rad i tools/natt/scoreboard.md ({out["tidS"]} s)')
    print(f'aldrig valda i mixarna: {", ".join(out["effekter"]["aldrigValda"]) or "(inga)"}')


if __name__ == '__main__':
    main()
