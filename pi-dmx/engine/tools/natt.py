"""
NATTJOBB DMX (2026-10-06). Agaren: "analysera mot nya motorn hur effekterna syns/visualiseras sa de blir tight
mot latarna och en snygg ljusshow". Det har ar natt-agentens MATNING: kor tools/showTight.mjs (riktig analysator
+ riktig effektmotor i smart-lage) over ladans tva mixar i full langd och den frysta latlistan (frozen6, 222 klipp
a 40 s), med EXAKT ladans env (SHOW_ENV importeras ur ladan.py - aldrig en egen kopia, det var matfalla 26),
och skriver en jamforbar dygnspost:

    tools/natt/<datum>.json      allt, per lat
    tools/natt/scoreboard.md     en rad per korning

    python tools/natt.py [--datum YYYY-MM-DD] [--snabb] [--tag namn] [--env K=V ...]

  --snabb      bara mixarna + agarens matt + kvallen i ett svep (~6 min) - for att prova en kandidat
  (utan --snabb kors aven ladans 20 inspelningar 10-08 genom tools/dynSet.py -> tools/natt/dynamik.md)
  --tag/--env  A/B av en kandidat: raden taggas sa den inte blandas med baslinjen; env laggs OVANPA ladans
  --lista      annan manifest.tsv (standard tools/frozen6/manifest.tsv)
  --norm DBFS  nivaanpassa KLIPPEN till ladans aux-niva, STANDARD -17 sedan 10-09 (ladans ingang Aux -18 dB: inspelningarna 10-08 p50 -17,4 dBFS; -3,5 var den OVERSTYRDA
               ingangen och klippte kickarna platt = matfalla 42; korpusrader fore 10-09 norm-17 ar INTE jamforbara). Forr -3.5 (matfalla 35: frozen6 ~28 dB
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
# AGARENS MATT (natt 10-22, uppdrag 10-21): ljus mot LJUDETS basanslag (ljusLag.py, inte frame.kick som ar brus - fynd 10-19) och
# sektionsetiketten mot ljudets nivaskiften + fladder (sektionLag.mjs). Mixarna + kvallens inspelning 10-21 (ratt aux-niva).
ARLIGA = MIXAR + [('lang1021', 'tools/ladan-2026-10-21/lang-20261021T203952.wav')]


def run_ljuslag(wav, env):
    import re
    r = subprocess.run([sys.executable, 'tools/ljusLag.py', wav, '--s', '300'], cwd=ENGINE, env=env, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=900)
    m1 = re.search(r'korskorr\) (-?\d+) ms', r.stdout); m2 = re.search(r'90 % vid (-?\d+) ms', r.stdout)
    return {'korskorr': int(m1.group(1)) if m1 else None, 't90': int(m2.group(1)) if m2 else None} if m1 else {'fel': (r.stderr or r.stdout)[-300:]}


def run_tempomix(env):
    # TEMPOMIXEN (2026-10-30): korpusklippen skarvade till en mix med katalogfacit - rätt tempo andel av tiden, lås efter låtbyte, hopp inom låt
    import tempfile
    fd, js = tempfile.mkstemp(suffix='.json'); os.close(fd)
    r = subprocess.run(['node', 'tools/tempoMix.mjs', 'tools/frozen6', '--all', '--n', '400', '--json', js], cwd=ENGINE, env=env, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=1800)
    try:
        t = json.load(io.open(js, encoding='utf-8'))['T']
    except Exception:
        return {'fel': (r.stderr or r.stdout)[-300:]}
    finally:
        os.remove(js)
    n = max(1, t['n'])
    return {'klocka': 100 * t['k'] / n, 'ana': 100 * t['a'] / n, 'agrid': 100 * t['g'] / n, 'annat': 100 * t['other'] / n,
            'hoppMin': t['hops'] / max(1e-9, t['hopMin']), 'oktav': t['oct'], 'lasMed': t['lockMed'], 'inom5': f"{t['inom5']}/{t['segment']}", 'aldrig': t['aldrig']}


def run_sektionlag(wavs, env):
    import tempfile
    fd, js = tempfile.mkstemp(suffix='.json'); os.close(fd)
    r = subprocess.run(['node', 'tools/sektionLag.mjs'] + wavs + ['--json', js], cwd=ENGINE, env=env, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=1800)
    try:
        t = json.load(io.open(js, encoding='utf-8'))['tot']
    except Exception:
        return {'fel': (r.stderr or r.stdout)[-300:]}
    finally:
        os.remove(js)
    return {'uppMed': med(t['upLag']), 'uppTraff': f"{t['upHit']}/{t['up']}", 'nedMed': med(t['downLag']), 'nedTraff': f"{t['downHit']}/{t['down']}",
            'korta': f"{t['short']}/{t['segs']}", 'bytenMin': t['changes'] / max(1e-9, t['min']),
            'gridMed': med(t.get('grid') or []), 'grid40': (sum(1 for e in t.get('grid') or [] if abs(e) <= 40) / len(t['grid'])) if t.get('grid') else None}
# KVALLEN I ETT SVEP (natt 10-25, matfalla 53): bankarna kor varje lang-fil med ny motor -> kvallens minne (lookPlayMs, seenLooks,
# recentLooks, prevSongLook) nollas per fil. Rod trad mats darfor pa 10-11-kvallens 23 lang skarvade till EN wav (141 min, ra PCM
# efter 44-byteshuvudet, mono 48k) genom konsertReplay som live (--step 5 --delad-cfg --live-kick) + rodTrad.mjs.
KVALL_DIR = 'tools/ladan-2026-10-11'
KVALL_WAV = KVALL_DIR + '/kvall-svep.wav'


def kvall_wav():
    import glob, struct
    fs = sorted(glob.glob(os.path.join(ENGINE, KVALL_DIR, 'lang-*.wav')))
    ut = os.path.join(ENGINE, KVALL_WAV)
    if not fs: return None
    n = sum(os.path.getsize(f) - 44 for f in fs)
    if os.path.exists(ut) and os.path.getsize(ut) == n + 44: return ut
    with open(ut, 'wb') as o:
        o.write(b'RIFF' + struct.pack('<I', 36 + n) + b'WAVEfmt ' + struct.pack('<IHHIIHH', 16, 1, 1, 48000, 96000, 2, 16) + b'data' + struct.pack('<I', n))
        for f in fs:
            with open(f, 'rb') as i: i.seek(44); o.write(i.read())
    return ut


def run_kvall(env):
    import tempfile
    wav = kvall_wav()
    if not wav: return {'fel': 'inga lang-*.wav i ' + KVALL_DIR}
    fd, js = tempfile.mkstemp(suffix='.json'); os.close(fd)
    try:
        r = subprocess.run(['node', '--max-old-space-size=4096', 'tools/konsertReplay.mjs', wav, '--step', '5', '--delad-cfg', '--live-kick', '--json', js],
                           cwd=ENGINE, env=env, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=3600)
        if r.returncode: return {'fel': (r.stderr or r.stdout)[-300:]}
        r = subprocess.run(['node', 'tools/rodTrad.mjs', js], cwd=ENGINE, env=env, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=600)
        return json.loads(r.stdout[r.stdout.index('{'):])
    except Exception as e:
        return {'fel': str(e)[-300:]}
    finally:
        os.remove(js)
METRIC_TAJT = ['kickLagMs', 'kickTraff', 'kickHojd', 'energiR', 'energiRtopp', 'nivaR', 'energiR15', 'nivaR15', 'litLugn', 'litFart', 'litFull']
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
    ap.add_argument('--norm', type=float, default=-17)   # STANDARD fran 2026-10-09 (matfalla 42; -3.5 10-07..10-09, matfalla 35): korpusen pa ladans aux-niva; --norm 999 = ingen
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

    # 1b. AGARENS MATT: ljus mot ljudets basanslag + sektionsetikettens lagg/fladder (aven --snabb)
    arl = [(n, w) for n, w in ARLIGA if os.path.exists(os.path.join(ENGINE, w))]
    with ThreadPoolExecutor(max_workers=2) as ex:
        ll = list(ex.map(lambda nw: run_ljuslag(nw[1], env), arl))
    out['ljusLag'] = {n: r for (n, _w), r in zip(arl, ll)}
    out['sektionLag'] = run_sektionlag([w for _n, w in arl], env)
    out['tempoMix'] = run_tempomix(env)
    tm = out['tempoMix']; print(f'  tempo    mix klocka {f(tm.get("klocka"), 1)} % (ana {f(tm.get("ana"), 1)}, agrid {f(tm.get("agrid"), 1)}, icke-harm {f(tm.get("annat"), 1)})  lås {f(tm.get("lasMed"), 1)} s  inom 5 s {tm.get("inom5")}  hopp {f(tm.get("hoppMin"))}/min' if 'fel' not in tm else f'  tempo    FEL {tm["fel"]}')
    print('  ljusLag  ' + '  '.join(f'{n} {f(r.get("korskorr"), 0)}/{f(r.get("t90"), 0)} ms' for n, r in out['ljusLag'].items()) + '  (korskorr/90 %)')
    sl = out['sektionLag']; print(f'  sektion  upp {f(sl.get("uppMed"), 1)} s ({sl.get("uppTraff")})  ned {f(sl.get("nedMed"), 1)} s ({sl.get("nedTraff")})  korta {sl.get("korta")}  {f(sl.get("bytenMin"))}/min  gridfas {f(sl.get("gridMed"), 0)} ms / {f((sl.get("grid40") or 0) * 100, 0)} % inom 40')

    # 1c. ROD TRAD: kvallen 10-11 i ett svep (matfalla 53), aven --snabb
    out['kvall'] = kv = run_kvall(env)
    print(f'  kvall    {kv.get("minuter", "?")} min  hor ihop {kv.get("hör ihop")}  ateseende {kv.get("återseende")}  unika {kv.get("unika kvällen")}  effektivt {kv.get("effektivt antal")}  byten/min {kv.get("byten/min")}  drops {kv.get("drops")}' if 'fel' not in kv else f'  kvall    FEL {kv["fel"]}')

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
        print(f'  korpus   {len(ok)} klipp ({len(res) - len(ok)} fel)  kick->ljus {f(korpus["median"]["kickLagMs"], 0)} ms  traff {f(korpus["median"]["kickTraff"])}  r {f(korpus["median"]["energiR"])} (fran 15 s {f(korpus["median"].get("energiR15"))}, niva {f(korpus["median"].get("nivaR15"))})  alla3 {f(korpus["median"]["alla3"])}')

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
    if os.path.exists(sb) and 'Bank v3' not in io.open(sb, encoding='utf-8').read():
        io.open(sb, 'a', encoding='utf-8').write(
            '\n**Bank v3 fran 2026-10-22 (uppdrag 10-21):** forst AGARENS MATT - ljus mot ljudets basanslag (ljusLag.py, korskorr/90 % av medelljusets topp, ms, '
            'forsta 300 s) pa pop/mega/kvallens inspelning 10-21, och sektionsetiketten mot ljudets nivaskiften (sektionLag.mjs, alla tre: upp/ned median s, '
            'korta delar < 8 s, byten/min). Darefter de gamla kolumnerna (kick->ljus = fran frame.kick, brus - fynd 10-19).\n\n'
            '| datum | git | tag | ljus pop | ljus mega | ljus 1021 | sektion upp/ned s | korta | sek byten/min | pop kick->ljus/traff | pop r energi | pop byten/min musik% | pop alla3/lampspr | pop lookar/langst | pop morkt | '
            'mega kick->ljus/traff | mega r | mega byten/min musik% | mega alla3/lampspr | mega lookar/langst | mega morkt | mega drops lugna/hoga | '
            'korpus n | k kick->ljus/traff | k r | k alla3/matt | k morkt | aldrig valda |\n'
            '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n')
    if os.path.exists(sb) and 'Bank v4' not in io.open(sb, encoding='utf-8').read():
        io.open(sb, 'a', encoding='utf-8').write(
            '\n**Bank v4 fran 2026-10-25 (matfalla 53):** samma kolumner som v3 plus ROD TRAD sist - 10-11-kvallens 23 lang i ETT svep (141 min, '
            'kvallens minne nollas inte per fil): hor ihop % / ateseende % / unika looker / effektivt antal / lookbyten per min (rodTrad.mjs).\n\n'
            '| datum | git | tag | ljus pop | ljus mega | ljus 1021 | sektion upp/ned s | korta | sek byten/min | pop kick->ljus/traff | pop r energi | pop byten/min musik% | pop alla3/lampspr | pop lookar/langst | pop morkt | '
            'mega kick->ljus/traff | mega r | mega byten/min musik% | mega alla3/lampspr | mega lookar/langst | mega morkt | mega drops lugna/hoga | '
            'korpus n | k kick->ljus/traff | k r | k alla3/matt | k morkt | aldrig valda | kvall hor ihop/ateseende | kvall unika/effektivt | kvall byten/min |\n'
            '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n')
    if os.path.exists(sb) and 'Bank v5' not in io.open(sb, encoding='utf-8').read():
        io.open(sb, 'a', encoding='utf-8').write(
            '\n**Bank v5 fran 2026-10-28 (uppdrag 10-27 punkt 2):** samma kolumner som v4 plus GRIDFAS sist - effektklockans rutnat mot basens ansats '
            '(sektionLag.mjs: sub+kick-stigning >= 6 dB, 10 s-fonster med last tempo, pop/mega/1021): median ms (+ = slaget efter ansatsen) / andel inom +-40 ms.\n\n'
            '| datum | git | tag | ljus pop | ljus mega | ljus 1021 | sektion upp/ned s | korta | sek byten/min | pop kick->ljus/traff | pop r energi | pop byten/min musik% | pop alla3/lampspr | pop lookar/langst | pop morkt | '
            'mega kick->ljus/traff | mega r | mega byten/min musik% | mega alla3/lampspr | mega lookar/langst | mega morkt | mega drops lugna/hoga | '
            'korpus n | k kick->ljus/traff | k r | k alla3/matt | k morkt | aldrig valda | kvall hor ihop/ateseende | kvall unika/effektivt | kvall byten/min | gridfas ms/+-40 |\n'
            '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n')
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
    LL = out.get('ljusLag', {}); SL = out.get('sektionLag', {}); kv = out.get('kvall', {})
    lj = lambda n: f'{f(LL.get(n, {}).get("korskorr"), 0)}/{f(LL.get(n, {}).get("t90"), 0)}'
    row = (f'| {a.datum} | {git} | {a.tag or "-"} | {lj("pop")} | {lj("megamix")} | {lj("lang1021")} | {f(SL.get("uppMed"), 1)}/{f(SL.get("nedMed"), 1)} | {SL.get("korta", "-")} | {f(SL.get("bytenMin"))} | {mix("pop")} | {mix("megamix")} | {f(mt.get("dropsLugna"), 0)}/{f((mt.get("drops") or 0) - (mt.get("dropsLugna") or 0), 0)} | '
           f'{(out["korpus"] or {}).get("n", "-")} | {f(km.get("kickLagMs"), 0)}/{f(km.get("kickTraff"))} | {f(km.get("energiR"))} | {f(km.get("alla3"))}/{f(km.get("matt"))} | {f(km.get("morkt"))} | '
           f'{len(out["effekter"]["aldrigValda"])} | {kv.get("hör ihop", "-")} / {kv.get("återseende", "-")} | {kv.get("unika kvällen", "-")}/{kv.get("effektivt antal", "-")} | {kv.get("byten/min", "-")} | {f(SL.get("gridMed"), 0)}/{f((SL.get("grid40") or 0) * 100, 0)}% |\n')
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
