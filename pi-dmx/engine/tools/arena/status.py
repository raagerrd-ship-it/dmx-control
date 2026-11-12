"""ARENANS LÖPANDE TABELL (ägaren 2026-11-12, arenan klocka2).  python tools/arena/status.py <körning> [--dom klockdom]

Läsande: skriver en markdown-tabell över arenans läge och ändrar ingenting. Ägarens form:
  - deltagarna som KOLUMNER (bas, k1.., joker; tidigare mätningar och kontrollmängden som egna kolumner), måtten som rader;
  - ingen rad med uppgiften/strategikortet, korta celler;
  - 🔴 i den MÄTRUTA som fäller varianten på en spärr, raden Spärr säger bara Ja/Nej;
  - 🟢 på radens bästa värde - på deltagaren om någon är bättre än basen, annars på basen (jokern får ta delar från basen också).

Domarens json läses ur <körning>/<mapp>/<dom>.json (nycklarna direkt eller under "matt") och <dom>-holdout.json. Tidigare mätningar =
<dom>-*.json i samma mapp. En mätning räknas som pågående när <mapp>/<dom>/ har nyare filer än <dom>.json.

RADER OCH SPÄRRAR: inbyggda för 'klockdom'. För en annan domare: lägg <körning>/status.json bredvid uppgiften:
  {"dom": "tvavagar", "statusrad": "ARENAN X", "rader": [["nyckel", "Rubrik", decimaler, "lagre"|"hogre"], ...],
   "sparrar": [["nyckel", "max"|"min", tolerans], ...]}      max = får inte överstiga bas + tolerans, min = får inte understiga bas - tolerans
"""
import glob, io, json, os, re, sys, time

HERE = os.path.dirname(os.path.abspath(__file__)); ENGINE = os.path.normpath(os.path.join(HERE, '..', '..'))
args = sys.argv[1:]
K = os.path.abspath(args[0]) if args and not args[0].startswith('--') else sys.exit(__doc__)
SPEC = {'dom': 'klockdom', 'statusrad': 'ARENAN ' + os.path.basename(K).upper(),
        'rader': [['utfl_min', 'Fel tempo per min', 2, 'lagre'], ['utfl_tid', 'Tid i fel tempo %', 2, 'lagre'], ['syskon_tid', 'Släkttempo %', 2, 'lagre'],
                  ['kallaren', 'Källarklipp, byten per min', 2, 'lagre'], ['lotus_ratt', 'Lotus rätt', 0, 'hogre'], ['lotus_syskon', 'Lotus släktfel', 0, 'lagre'],
                  ['lotus_vaxling', 'Lotus-låtar som växlar', 0, 'lagre'], ['mix_klocka', 'Rätt tempo i mixen %', 1, 'hogre'],
                  ['mix_las', 'Låsning efter låtbyte s', 2, 'lagre'], ['mix_still', 'Tills klockan står still s', 2, 'lagre'],
                  ['klipp_klocka', 'Rätt tempo i klipp %', 1, 'hogre'], ['fas_median', 'Lotus fas, median', 2, 'hogre'], ['fas_ifas', 'Lotus i fas %', 1, 'hogre'],
                  ['fas_motfas', 'Lotus motfas %', 1, 'lagre'], ['lotus_onbeat', 'Lotus on-beat', 2, 'hogre'], ['syntet', 'Syntet rätt', 0, 'hogre']],
        'sparrar': [['lotus_ratt', 'min', 0], ['mix_las', 'max', 0.3], ['mix_still', 'max', 0.3], ['klipp_klocka', 'min', 1], ['fas_median', 'min', 0],
                    ['fas_ifas', 'min', 1], ['fas_motfas', 'max', 1], ['lotus_onbeat', 'min', 0], ['syntet', 'min', 0]]}   # = klockdom.py:s spärrar
sp = os.path.join(K, 'status.json')
if os.path.exists(sp): SPEC.update(json.load(io.open(sp, encoding='utf-8')))
if '--dom' in args: SPEC['dom'] = args[args.index('--dom') + 1]
DOM = SPEC['dom']; LAGRE = {r[0] for r in SPEC['rader'] if r[3] == 'lagre'}

def las(p):
    """domarens mått + spärrvärdena ur 'sparr' (syntet, lotus on-beat, lotus fas) som egna nycklar, så ALLA domarens spärrar syns i tabellen"""
    try:
        d = json.load(io.open(p, encoding='utf-8')); m = dict(d.get('matt') or d); sp = d.get('sparr') or {}
        if isinstance(sp.get('syntet'), (int, float)): m['syntet'] = sp['syntet']
        if isinstance(sp.get('lotusOnBeat'), (int, float)): m['lotus_onbeat'] = sp['lotusOnBeat']
        f = sp.get('lotusFas') or {}
        if f.get('n'):
            if isinstance(f.get('median'), (int, float)): m['fas_median'] = f['median']
            m['fas_ifas'] = 100.0 * f.get('ifas', 0) / f['n']; m['fas_motfas'] = 100.0 * f.get('motfas', 0) / f['n']
        if sp.get('andradeFiler') is not None: m['_filer'] = sp['andradeFiler']
        return m
    except Exception:
        return None
def hm(t): return time.strftime('%H:%M', time.localtime(t))
def sig(m): return tuple(round(m[r[0]], 4) for r in SPEC['rader'] if isinstance(m.get(r[0]), (int, float))) if m else None

bas = las(os.path.join(K, 'bas', DOM + '.json')) or {}
bash = las(os.path.join(K, 'bas', DOM + '-holdout.json')) or {}
def sparr(m, b):
    if not m: return None
    f = set()
    for k, typ, tol in SPEC['sparrar']:
        if not (isinstance(m.get(k), (int, float)) and isinstance(b.get(k), (int, float))): continue
        if (typ == 'max' and m[k] > b[k] + tol) or (typ == 'min' and m[k] < b[k] - tol): f.add(k)
    return f

kol = [('bas', 'mätt', bas, None)]   # (namn, läge, mått, fällande mått)
ovriga = sorted(n for n in os.listdir(K) if os.path.isdir(os.path.join(K, n)) and n not in ('bas', 'bas2', 'kopia', 'ref', 'kallaren', 'idebank'))
ovriga.sort(key=lambda n: (n.startswith('fusion') or n.startswith('r0') or n.startswith('f0'), n))
for n in ovriga:
    d = os.path.join(K, n); namn = 'joker' if n == 'fusion' else n.replace('fusion-', 'joker-')
    klara = sorted(glob.glob(os.path.join(d, DOM + '*.json')), key=os.path.getmtime)
    pj = os.path.join(d, DOM + '.json'); senaste = las(pj) if os.path.exists(pj) else None
    unika = {sig(las(x)) for x in klara if 'holdout' not in os.path.basename(x)} - {None}
    kd = glob.glob(os.path.join(d, DOM, '*')); kd_t = max([os.path.getmtime(x) for x in kd], default=0)
    k_t = os.path.getmtime(pj) if os.path.exists(pj) else 0
    pagar = kd_t > k_t + 5 and time.time() - kd_t < 600
    alla = [os.path.getmtime(os.path.join(r, x)) for r, _ds, fs in os.walk(d) if '/dist' not in r.replace('\\', '/') and '/lotus' not in r.replace('\\', '/') for x in fs]
    sist = max(alla, default=0); klar = os.path.exists(os.path.join(d, 'losning.md'))
    lage = '%d mätt' % len(unika) + (', mäter' if pagar else '') + (', klar' if klar else '') + (', tyst' if sist and time.time() - sist > 1200 and not klar else '')
    for p in klara:   # tidigare mätningar som egna kolumner
        b = os.path.basename(p)
        if b != DOM + '.json' and 'holdout' not in b:
            m = las(p)
            if m and sig(m) != sig(senaste): kol.append((namn + ' ' + b.replace(DOM + '-', '').replace('.json', ''), hm(os.path.getmtime(p)), m, sparr(m, bas)))
    kol.append((namn, lage, senaste, sparr(senaste, bas)))
    h = las(os.path.join(d, DOM + '-holdout.json'))
    if h: kol.append((namn + ' KONTROLL', hm(os.path.getmtime(os.path.join(d, DOM + '-holdout.json'))), h, sparr(h, bash)))
if not any(c[0] == 'joker' for c in kol): kol.append(('joker', 'ej startad', None, None))
if bash and any('KONTROLL' in c[0] for c in kol): kol.insert(1, ('bas KONTROLL', 'mätt', bash, None))

def bast(k, kontroll):
    """(radens bästa värde, om basen har det): deltagaren om någon är bättre än basen, annars basen"""
    b = (bash if kontroll else bas).get(k)
    vs = [c[2][k] for c in kol if c[2] and not c[0].startswith('bas') and ('KONTROLL' in c[0]) == kontroll and isinstance(c[2].get(k), (int, float))]
    if not isinstance(b, (int, float)) or not vs: return None, False
    x = min(vs) if k in LAGRE else max(vs)
    return (x, False) if (x < b - 1e-9 if k in LAGRE else x > b + 1e-9) else (b, True)
def v(c, k, n):
    m = c[2]
    if not (m and isinstance(m.get(k), (int, float))): return '–'
    t = ('%.*f' % (n, m[k])).replace('.', ',')
    if c[3] and k in c[3]: return '🔴 ' + t
    x, bas_bast = bast(k, 'KONTROLL' in c[0])
    if x is None: return t
    ar_bas = c[0].startswith('bas')
    return '🟢 ' + t if (ar_bas if bas_bast else (not ar_bas and abs(m[k] - x) < 1e-9)) else t

print('klockan %s | bänklås: %s' % (time.strftime('%H:%M'), 'taget' if os.path.isdir(os.path.join(ENGINE, '.arena', '.banklas')) else 'fritt'))
try:
    for l in io.open(os.path.join(ENGINE, 'tools', 'natt', 'todo.md'), encoding='utf-8'):
        if l.startswith(SPEC['statusrad']): print(l.strip()[:200])
except Exception:
    pass
print()
# RANKINGRADEN (ägaren 11-12): domarens plats och poäng längst ner, ur ranking*.md (kontrollmängdens ranking för KONTROLL-kolumnerna)
rank = {False: {}, True: {}}
for f in sorted(glob.glob(os.path.join(K, 'ranking*.md')), key=os.path.getmtime):
    hold = 'holdout' in os.path.basename(f) or 'kontroll' in os.path.basename(f)
    for l in io.open(f, encoding='utf-8'):
        m = re.match(r'\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*([+-]?[\d.,]+)\s*\|', l)
        if m: rank[hold][m.group(2)] = (m.group(1), m.group(3).replace('.', ','))
def rk(c):
    hold = 'KONTROLL' in c[0]; n = c[0].replace(' KONTROLL', ''); n = 'fusion' + n[5:] if n.startswith('joker') else n
    r = rank[hold].get(n)
    return '%s (%s)' % r if r else '–'
def tabell(kol, rubrik):
    if rubrik: print(rubrik); print()
    print('| | ' + ' | '.join(c[0].replace(' KONTROLL', '') for c in kol) + ' |')
    print('|---|' + '---|' * len(kol))
    print('| Läge | ' + ' | '.join(c[1] for c in kol) + ' |')
    for k, rub, n, _r in SPEC['rader']:
        if any(c[2] and isinstance(c[2].get(k), (int, float)) for c in kol): print('| %s | ' % rub + ' | '.join(v(c, k, n) for c in kol) + ' |')
    print('| Spärr | ' + ' | '.join('–' if c[3] is None else ('Ja' if c[3] else 'Nej') for c in kol) + ' |')
    print('| Ranking (poäng) | ' + ' | '.join(rk(c) for c in kol) + ' |')
    print()
ovn = [c for c in kol if 'KONTROLL' not in c[0]]; kon = [c for c in kol if 'KONTROLL' in c[0]]
tabell(ovn, 'ÖVNINGSMÄNGDEN' if kon else '')
if kon: tabell(kon, 'KONTROLLMÄNGDEN (finalen)')
for f in sorted(glob.glob(os.path.join(K, 'ranking*.md'))):
    rows = [l for l in io.open(f, encoding='utf-8') if re.match(r'\| \d+ \|', l)]
    print(os.path.basename(f), hm(os.path.getmtime(f)), '|', '; '.join('%s %s %s' % (r.split('|')[1].strip(), r.split('|')[2].strip(), r.split('|')[3].strip()) for r in rows[:8]))
for rp in glob.glob(os.path.join(ENGINE, 'tools', 'natt', 'arena-*-' + os.path.basename(K), 'RAPPORT.md')): print('RAPPORT.md finns (%s): %s' % (hm(os.path.getmtime(rp)), rp))
