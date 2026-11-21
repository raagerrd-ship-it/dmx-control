"""LOOKVALET (nattagenten 2026-11-21): läser lookvalHook-json och svarar 'varför väljs effekten aldrig?'.
  python tools/natt/lookval.py ut1.json [ut2.json ...]
Per lookbyte: vilka effekter som är taggade för sektionen, klarar kraven (registry REQUIREMENTS) och vilka som valdes.
Kraven läses ur src/effects/registry.ts (regex), taggarna ur src/effects/<namn>.ts."""
import json, re, sys, os, collections, glob
ENG = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
reg = open(os.path.join(ENG, 'src/effects/registry.ts'), encoding='utf8').read()
REQ = {}
for m in re.finditer(r'^\s*([a-z]+):\s*\{([^}]*)\}', reg.split('const REQUIREMENTS')[1].split('};')[0], re.M):
    REQ[m.group(1)] = {k: float(v) for k, v in re.findall(r'(\w+):\s*([0-9.]+)', m.group(2))}
TAG = {}
for f in glob.glob(os.path.join(ENG, 'src/effects/*.ts')):
    s = open(f, encoding='utf8').read(); k = re.search(r'key: "([a-z]+)"', s)
    if not k: continue
    t = re.search(r'tier: "([a-z]+)"', s); sec = re.search(r'section: \[([^\]]*)\]', s)
    TAG[k.group(1)] = (t.group(1) if t else '', re.findall(r'"([a-z]+)"', sec.group(1)) if sec else [], 'toggle: true' in s)
def meets(m, r):
    q = REQ.get(m, {}); p = r['p']
    if 'minBpm' in q and r['bpm'] < q['minBpm']: return 'bpm'
    for k, f in (('needsPunch', 'punch'), ('needsBass', 'bass'), ('needsBright', 'bright'), ('needsBeat', 'beat')):
        if k in q and (p.get(f) or 0) < q[k]: return f
    return ''
rows = sum((json.load(open(a)) for a in sys.argv[1:]), [])
byten = [r for r in rows if r['to'] != r['from']]
print(f'{len(rows)} anrop, {len(byten)} lookbyten')
val = collections.Counter(r['to'] for r in byten)
mojlig = collections.Counter(); spärr = collections.defaultdict(collections.Counter)
for r in byten:
    for m, (tier, secs, tog) in TAG.items():
        if r['sec'] not in secs: continue
        why = meets(m, r)
        if why: spärr[m][why] += 1
        else: mojlig[m] += 1
print('\neffekt        tier  sektioner          valt  krav-ok  spärrad (orsak)')
for m in sorted(TAG, key=lambda m: (-val[m], -mojlig[m])):
    tier, secs, tog = TAG[m]
    print(f'{m:13s} {tier:5s} {",".join(secs):18s} {val[m]:4d}  {mojlig[m]:6d}   {dict(spärr[m])}')
print('\nprofil vid byten (median): ' + ', '.join(f'{k} {sorted((r["p"].get(k) or 0) for r in byten)[len(byten)//2]:.2f}' for k in ('punch','bass','bright','beat','bassline')) + f', bpm {sorted(r["bpm"] for r in byten)[len(byten)//2]:.0f}')
print('sektion vid byten:', dict(collections.Counter(r['sec'] for r in byten)), ' tier:', dict(collections.Counter(r['tier'] for r in byten)), ' toggle-låt:', dict(collections.Counter(str(r['manusTog']) for r in byten)))
