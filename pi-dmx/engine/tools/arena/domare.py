"""LJUSARENAN: DOMAREN.
GRUNDMÅLET (ägaren 11-07): varje natt förbättra ljusshowen så att den blir mer och mer lik en FÖRINSPELAD, PROGRAMMERAD show på ett
dansgolv - ljuset ska öka känslan av takten man dansar till. Mer ljus i snitt är aldrig målet; dynamik, känsla och tajthet är.
 Läser <körning>/*/bank.json och dömer varje deltagare mot <körning>/bas/bank.json.
  python tools/arena/domare.py <körning> [--md] [--holdout]     (--md skriver även <körning>/ranking[-holdout].md)
  --holdout: dömer bank-holdout.json (KONTROLLMÄNGDEN, tre andra ladan-inspelningar, alla lika vikt, utan dynSet) - finalens dom
Domaren är bänken - ingen modell tycker något. Reglerna står här och i uppgiften, samma för alla:

DOMAREN v2 (ägaren 11-07 under puls1: "målet är inte MER ljus i snitt utan bättre dynamik och känsla"):
POÄNG (relativt baslinjen, i procent, lang1021 väger dubbelt överallt):
  dynamik  = medel av relativ ändring i: slagK (ljusets topp/dal per starkt basanslag), djup (ljusets lyft per basanslag mot det lokala ljuset),
             dynSets ljusSteg (ljusets steg) och dynSets kontrast (ljus i högsta dB-kvartilen / lägsta) - KÄNSLAN: slaget syns som kontrast, inte som mer ljus
  takt     = medel av relativ ändring i rAbest och rK (ljuset mot basen 40-150 Hz resp. kickbandet)
  ljus     = medelljusets ändring i procent: INFO sedan 11-08 (förr avdrag 1/procent över bas, bonus 0,5/procent under) - inget kriterium
  poäng v2 = 0,7 * dynamik + 0,3 * takt - ljusavdrag + ljusbonus - lampspr-avdrag        (python domare.py ... --v2; runda 1 i puls1)
DOMAREN v3 (STANDARD från runda 2 i puls1, ägaren 11-07: "mot förinspelad ljuskoreografi ... tänk dansgolv"):
  koreografi = medel av (a) jitter: relativ MINSKNING av spridningen (ms) i fördröjningen basanslag -> ljusets topp (programmerat ljus
               sitter på samma ställe varje slag) och (b) betoning: ändringen x 100 i Spearman r mellan anslagets styrka och ljusets lyft
               (stora slag stora, små slag små). Båda ur rytm.py (fälten jitter/betoning), lang1021 dubbel vikt.
  poäng v3 = 0,45 * dynamik + 0,35 * koreografi + 0,2 * takt - ljusavdrag + ljusbonus - lampspr-avdrag
  Saknar en bänk fälten (bänkad före 2026-11-07 kväll): koreografi räknas som 0 och raden märks 'gammal bänk' - bänka om.
SPÄRRAR (DISK = ute oavsett poäng):
  lampspr  MEDLET över filerna under 94 % av baslinjen, eller någon fil under 80 % (11-09: per fil var brus - ohörbar störning flyttar lookvalet)
  (ljus: INGEN spärr sedan 11-08 - ägaren: 'mer ljus kan ju vara en bra sak ... det vill jag inte här' [att det som minskar ljuset
   vinner]. Medelljuset visas som info. Platt ljus straffas ändå av dynamik och koreografi.)
  slocknat andelen släckt rigg >= 1 s mer än +1 procentenhet (medel över filerna)
  fladder  dynSets fladder/min mer än +0,5 över baslinjen
  t90      lang1021:s ljusLag t90 mer än 15 ms senare än baslinjen
  filer    ändrad fil utanför src/effects.ts och src/effects/*.ts (analysatorn, utgången, uttoningen, kalibreringen, tempot = förbjudet)
           (körningens egna undantag: <körning>/tillatna.txt, ett mönster per rad - arenan basenergi 11-11 tillåter de delade analysatorfilerna)
  basenergi  (bara när <körning>/bas/basenergi.json finns) frame.bassEnergy saknas, gainDiff > 0,05 eller befintliga ramfält ändrade
             (tools/arena/basenergi.mjs: analysatorn ska MÄTA musiken, oberoende av ingångsnivån, och inte röra andra fält)
  fel      en bänk som inte gick igenom
"""
import io, json, os, sys, filecmp
HERE = os.path.dirname(os.path.abspath(__file__)); ENGINE = os.path.dirname(os.path.dirname(HERE))
HOLD = '--holdout' in sys.argv; V2 = '--v2' in sys.argv
WT = {'lang1028': 1, 'lang1014': 1, 'lang1011': 1} if HOLD else {'lang1021': 2, 'pop': 1, 'megamix': 1}
BANK = 'bank-holdout.json' if HOLD else 'bank.json'
LANG = 'lang1028' if HOLD else 'lang1021'

def load(p):
    try: return json.load(io.open(os.path.join(p, BANK), encoding='utf-8'))
    except Exception: return None

def changed_files(d):
    s = os.path.join(d, 'src'); ref = os.path.join(ENGINE, 'src'); out = []
    if not os.path.isdir(s): return out
    for root, _, fs in os.walk(s):
        for fn in fs:
            p = os.path.join(root, fn); rel = os.path.relpath(p, s).replace(os.sep, '/'); q = os.path.join(ref, rel)
            if not os.path.exists(q) or not filecmp.cmp(p, q, shallow=False): out.append(rel)
    for root, _, fs in os.walk(ref):
        for fn in fs:
            rel = os.path.relpath(os.path.join(root, fn), ref).replace(os.sep, '/')
            if not os.path.exists(os.path.join(s, rel)): out.append(rel + ' (borttagen)')
    return out

def rel(v, b): return (v - b) / abs(b) * 100 if b else 0.0

def doma(b, v, d):
    R, B = v.get('rytm', {}), b['rytm']; disk = []; avdrag = 0.0
    if any('fel' in R.get(n, {'fel': 1}) for n in WT) or (not HOLD and 'fel' in v.get('dyn', {'fel': 1})): return {'disk': ['fel: bänken gick inte igenom'], 'poang': None}
    wsum = sum(WT.values())
    takt = sum(WT[n] * (rel(R[n]['rAbest'], B[n]['rAbest']) + rel(R[n]['rK'], B[n]['rK'])) / 2 for n in WT) / wsum
    slag = sum(WT[n] * rel(R[n]['slagK'], B[n]['slagK']) for n in WT) / wsum
    djup = sum(WT[n] * rel(R[n]['djup'], B[n]['djup']) for n in WT) / wsum
    if HOLD: kontrast = (slag + djup) / 2
    else:
        L, LB = v['dyn']['levande'], b['dyn']['levande']
        kontrast = (slag + djup + rel(L['ljusSteg'], LB['ljusSteg']) + rel(L['kontrast'], LB['kontrast'])) / 4
    # LAMPSPRIDNINGEN PÅ MEDLET (ägaren 11-09: 'Fixa lampspridningsspärren'): per fil var den brus - samma kod på pop gav 0,405 eller
    # 0,267 av en ohörbar skillnad (0,003 %) i hur klippet skrevs, för den flyttar en sektionsgräns och dirigentens lookval flyttar alla
    # senare. Spärren dömer därför medlet av kvoterna över filerna (< 94 % = DISK); en fil under 80 % fäller fortfarande (riktig kollaps).
    qs = {n: R[n]['lampspr'] / B[n]['lampspr'] for n in WT}
    qm = sum(qs.values()) / len(qs)
    if qm < 0.94: disk.append(f'lampspr medel {100 * (qm - 1):+.1f} % (' + '/'.join(f'{100 * (q - 1):+.1f}' for q in qs.values()) + ')')
    for n, q in qs.items():
        if q < 0.80: disk.append(f'lampspr {n} {100 * (q - 1):+.1f} % (< -20 %)')
    # (mjukt lampspr-avdrag under 98 % borttaget 11-08: 'om 2 lampor lyser i stället för 1 fungerar showen ändå')
    lj = sum(R[n]['ljus'] for n in WT) / sum(B[n]['ljus'] for n in WT)
    bonus = 0.0   # ägaren 11-08: ljusmängden är INTE ett kriterium (inget avdrag, ingen bonus, ingen spärr) - visas bara som info
    sl = sum(R[n]['slocknat1s'] - B[n]['slocknat1s'] for n in WT) / len(WT)
    if sl > 0.01: disk.append(f'slocknat {100 * sl:+.1f} pe')
    fl = 0 if HOLD else v['dyn']['fladder']['fladderMin'] - b['dyn']['fladder']['fladderMin']
    if fl > 0.5: disk.append(f'fladder {fl:+.1f}/min')
    t9v, t9b = R[LANG]['ljusLag'].get('t90'), B[LANG]['ljusLag'].get('t90')
    if t9v is not None and t9b is not None and t9v - t9b > 15: disk.append(f't90 {t9b}->{t9v} ms')
    # KÖRNINGENS EGNA TILLÅTNA FILER (11-11, arenan basenergi): <körning>/tillatna.txt, ett fnmatch-mönster per rad, utöver effekterna.
    tf = os.path.join(os.path.dirname(d), 'tillatna.txt'); extra = [l.strip() for l in io.open(tf, encoding='utf-8') if l.strip() and not l.startswith('#')] if os.path.exists(tf) else []
    import fnmatch
    bad = [f for f in changed_files(d) if not (f == 'effects.ts' or (f.startswith('effects/') and f.endswith('.ts')) or any(fnmatch.fnmatch(f, m) for m in extra))]
    if bad: disk.append('förbjudna filer: ' + ', '.join(bad[:4]))
    # ANALYSMÅTTET (11-11, arenan basenergi): finns <körning>/bas/basenergi.json krävs <mapp>/basenergi.json (tools/arena/basenergi.mjs):
    # fältet frame.bassEnergy finns, är nivåoberoende (gainDiff <= 0,05) och de befintliga ramfälten är orörda (falt = bas).
    bb = os.path.join(os.path.dirname(d), 'bas', 'basenergi.json')
    if os.path.exists(bb) and os.path.basename(d) not in ('bas', 'kopia', 'ref'):
        try: be = json.load(io.open(os.path.join(d, 'basenergi.json'), encoding='utf-8')); bf = json.load(io.open(bb, encoding='utf-8'))
        except Exception: be = None
        if not be: disk.append('basenergi.json saknas')
        else:
            if not be.get('finns'): disk.append('frame.bassEnergy saknas eller utanför 0..1')
            if (be.get('gainDiff') or 0) > 0.05: disk.append(f"nivåberoende: gainDiff {be.get('gainDiff')}")
            if be.get('falt') != bf.get('falt'): disk.append('befintliga ramfält ändrade')
    gammal = not all('jitter' in R[n] and 'jitter' in B[n] for n in WT)
    if gammal: kor = 0.0
    else:
        jit = -sum(WT[n] * rel(R[n]['jitter'], B[n]['jitter']) for n in WT) / wsum
        bet = sum(WT[n] * 100 * (R[n]['betoning'] - B[n]['betoning']) for n in WT) / wsum
        kor = (jit + bet) / 2
    poang = (0.7 * kontrast + 0.3 * takt if V2 else 0.45 * kontrast + 0.35 * kor + 0.2 * takt) - avdrag + bonus
    if gammal and not V2: disk.append('gammal bänk (saknar jitter/betoning) - bänka om')
    return {'takt': takt, 'kontrast': kontrast, 'kor': kor, 'jitter': R[LANG].get('jitter'), 'betoning': R[LANG].get('betoning'), 'avdrag': avdrag, 'poang': poang, 'ljus': 100 * (lj - 1),
            'lampspr': {n: 100 * (R[n]['lampspr'] / B[n]['lampspr'] - 1) for n in WT}, 'rA_lang': R[LANG]['rAbest'], 'rK_lang': R[LANG]['rK'],
            'slagK_lang': R[LANG]['slagK'], 'ljusSteg': None if HOLD else v['dyn']['levande']['ljusSteg'], 't90': t9v, 'disk': disk}

def main():
    run = os.path.abspath(sys.argv[1]); b = load(os.path.join(run, 'bas'))
    if not b: sys.exit('saknar bas/' + BANK + ' - bänka baslinjen först: python tools/arena/bank.py <körning>/bas --bas')
    rows = []
    for name in sorted(os.listdir(run)):
        d = os.path.join(run, name)
        if name == 'bas' or not os.path.isdir(d): continue
        v = load(d)
        if v: rows.append((name, doma(b, v, d)))
    rows.sort(key=lambda r: (bool(r[1]['disk']), -(r[1]['poang'] if r[1]['poang'] is not None else -1e9)))
    B = b['rytm'][LANG]
    lines = [f"# Ranking {os.path.basename(run)}{' KONTROLLMÄNGDEN' if HOLD else ''} (domaren {'v2' if V2 else 'v3'}: tools/arena/domare.py, mot bas)", '',
             f"bas ({LANG}): rA {B['rAbest']:.3f}  rK {B['rK']:.3f}  slagK {B['slagK']:.3f}  ljusSteg {None if HOLD else b['dyn']['levande']['ljusSteg']}  t90 {B['ljusLag'].get('t90')}", '',
             '| plats | deltagare | poäng | takt % | dynamik % | koreografi | jitter lang ms | betoning lang | avdrag | rA lang | rK lang | slagK lang | ljusSteg | ljus % | lampspr ' + '/'.join(WT) + ' % | t90 | DISK |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|']
    for i, (n, r) in enumerate(rows, 1):
        if r['poang'] is None: lines.append(f"| {i} | {n} | - | | | | | | | | | | | | | | {'; '.join(r['disk'])} |"); continue
        lp = '/'.join(f"{r['lampspr'][k]:+.1f}" for k in WT)
        lines.append(f"| {i} | {n} | {r['poang']:+.1f} | {r['takt']:+.1f} | {r['kontrast']:+.1f} | {r['kor']:+.1f} | {r['jitter']} | {r['betoning']} | {r['avdrag']:.1f} | {r['rA_lang']:.3f} | {r['rK_lang']:.3f} | {r['slagK_lang']:.3f} | {r['ljusSteg']} | {r['ljus']:+.1f} | {lp} | {r['t90']} | {'; '.join(r['disk']) or '-'} |")
    txt = '\n'.join(lines) + '\n'; print(txt)
    if '--md' in sys.argv: io.open(os.path.join(run, 'ranking-holdout.md' if HOLD else 'ranking.md'), 'w', encoding='utf-8').write(txt)

if __name__ == '__main__':
    main()
