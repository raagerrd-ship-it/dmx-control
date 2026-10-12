r"""RATTSVEPET (2026-10-11, natt-todo FÄRRE REGLAGE steg 1: "inventeringstabell med MÄTT effekt per numerisk ratt").
Kör tools/showTight.mjs på båda mixarna med varje numerisk env-ratt på 0,5x och 1,5x standard (ladans SHOW_ENV ovanpå, som natt.py)
och skriver tools/natt/rattar.md: per ratt största ändringen i showens mått mot standard. 0 överallt = ratten gör inget på mixarna.
  python tools/knobSweep.py [--jobb 4] [--bara DMX_E_CURVE,DMX_FX_FLOOR]
Tar ~2 x 50 x 25 s / jobb. Bänken kör på virtuell klocka - resultatet beror inte på datorns last."""
import json, os, subprocess, sys, concurrent.futures as cf
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import natt
ROOT = os.path.join(HERE, '..')
ARGS = sys.argv[1:]
JOBB = int(ARGS[ARGS.index('--jobb') + 1]) if '--jobb' in ARGS else 4
BARA = ARGS[ARGS.index('--bara') + 1].split(',') if '--bara' in ARGS else None
# (namn, standard) - numeriska rattar som rör showen. Utelämnade: portar/sökvägar/CPU, opt-in-prov (TIER_OPEN, DROP_STROBE, PHASE_*
# som bara gäller med DMX_PHASE_FOLLOW=1), DMX_FALLBACK_HOLD_MS (bara live), DMX_PALETTE (namn).
KNOBS = [('DMX_CH_MIN_ON_MS', 100), ('DMX_CLEAR_BASS', 0.78), ('DMX_CLEAR_BASS_BOOST', 0.25), ('DMX_CLEAR_BASS_HARD', 0.85),
         ('DMX_DROP_MIN_GAP_S', 15), ('DMX_DROP_SONG_HOLD_S', 30), ('DMX_DWELL_MS', 45000), ('DMX_EFFECT_HEART', 1.4),
         ('DMX_E_CURVE', 10), ('DMX_E_MIN_DB', 4), ('DMX_E_NORM_MAX', 6), ('DMX_E_NORM_S', 2), ('DMX_E_RELEASE_MS', 100),
         ('DMX_E_TOP', 0.95), ('DMX_E_WIN_S', 10), ('DMX_FADE_MIN_S', 0.25), ('DMX_FOG_HUNGRY_S', 300), ('DMX_FX_FLOOR', 0.6),
         ('DMX_GAMMA', 1.6), ('DMX_MAP_TOP', 0.95), ('DMX_MIN_ON_MS', 150), ('DMX_MIX_RECENT_N', 8), ('DMX_MIX_RECENT_PENALTY', 0.2),
         ('DMX_MIX_TOP_FRAC', 0.8), ('DMX_MIX_UNSEEN_BONUS', 0.10), ('DMX_NEAR_DIP_DB', 8), ('DMX_NEAR_FULL_DB', 24), ('DMX_NEAR_MAX', 0.85),
         ('DMX_NEAR_MIN', 0.5), ('DMX_NEAR_REFRACT_MS', 4000), ('DMX_NEAR_RISE_DB', 10), ('DMX_SAT_FLOOR', 0), ('DMX_SECTION_UNIT_MIN_MS', 4000),
         ('DMX_SILENCE_LEVEL', 0.05), ('DMX_SYNC_ERR_FRAC', 0.2),
         ('DMX_TIER_HI', 0.55), ('DMX_TIER_LO', 0.22), ('DROP_CALM_BUILD', 0.25), ('DROP_LAND_GAIN', 1.15), ('MINI_BANG_MS', 150),
         ('MINI_DROP_ENV', 0.9), ('SECTION_HIGH_SNAP', 0.75), ('SECTION_LOW_SNAP', 0.35)]
if BARA: KNOBS = [k for k in KNOBS if k[0] in BARA]
MATT = [('kickLagMs', 'tajt'), ('kickTraff', 'tajt'), ('energiR', 'tajt'), ('bytenPerMin', 'tajt'), ('drops', 'tajt'), ('minidrops', 'tajt'),
        ('litP50', 'snygg'), ('lampspr', 'snygg'), ('lookar', 'snygg'), ('morkt', 'snygg'), ('alla3', 'snygg')]
env0 = dict(os.environ)
for k, v, _ in natt.SHOW_ENV: env0[k] = v
env0['DMX_QUIET'] = '1'
OUT = os.path.join(ROOT, 'tools', 'natt', 'rattsvep'); os.makedirs(OUT, exist_ok=True)

def run(tag, extra):
    res = {}
    for namn, wav in natt.MIXAR:
        f = os.path.join(OUT, f'{tag}-{namn}.json')
        if not os.path.exists(f):
            e = dict(env0); e.update(extra)
            subprocess.run(['node', 'tools/showTight.mjs', wav, '--tyst', '--json', f], cwd=ROOT, env=e, capture_output=True, text=True, encoding='utf-8')
        res[namn] = json.load(open(f, encoding='utf-8'))
    return tag, res

def val(r, k, grp): return (r.get(grp) or {}).get(k)

jobs = [('standard', {})]
for k, d in KNOBS:
    lo, hi = (d * 0.5, d * 1.5) if d else (0.3, 0.6)   # standard 0 (av) -> prova 0,3 och 0,6
    jobs += [(f'{k}={lo:g}', {k: f'{lo:g}'}), (f'{k}={hi:g}', {k: f'{hi:g}'})]
with cf.ThreadPoolExecutor(JOBB) as ex: R = dict(ex.map(lambda j: run(*j), jobs))
base = R['standard']
rows = []
for k, d in KNOBS:
    tags = [t for t in R if t.startswith(k + '=')]
    big = 0; desc = []
    for t in tags:
        for namn in base:
            for m, g in MATT:
                a, b = val(base[namn], m, g), val(R[t][namn], m, g)
                if a is None or b is None or a == b: continue
                rel = abs(b - a) / max(abs(a), 1e-6)
                if rel > big: big = rel
                if rel >= 0.05: desc.append(f'{t.split("=")[1]} {namn[:3]} {m} {a:.3g}->{b:.3g}')
    ident = all(json.dumps(R[t][n], sort_keys=True) == json.dumps(base[n], sort_keys=True) for t in tags for n in base)
    rows.append((k, d, 'DÖD (json-identisk)' if ident else f'max {big*100:.0f} %', '; '.join(desc[:4])))
with open(os.path.join(ROOT, 'tools', 'natt', 'rattar.md'), 'w', encoding='utf-8') as f:
    f.write('# Rattsvepet (tools/knobSweep.py)\n\nVarje ratt på 0,5x och 1,5x standard (standard 0 -> 0,3/0,6), showTight på pop + megamix med ladans SHOW_ENV.\n'
            '"DÖD" = json-identisk i båda mixarna och båda värdena. Mått: kick->ljus, kickträff, r energi, byten/min, drops, minidrops, ljus p50,\n'
            'lampspridning, lookar, mörkt, alla3. Ändringar >= 5 % listas (högst fyra).\n\n| ratt | standard | effekt | största ändringar |\n|---|---|---|---|\n')
    for k, d, e, s in rows: f.write(f'| `{k}` | {d:g} | {e} | {s} |\n')
for k, d, e, s in rows: print(f'{k:32} {d:<8g} {e:22} {s[:110]}')
