"""Jämför två ren-baslinjer (tools/natt/ren-<datum>/). python tools/natt/renjmf.py ren-2026-11-22 ren-2026-11-23"""
import json, sys, os
D = os.path.dirname(os.path.abspath(__file__))
ids = "151659 160345 171840 193040 193818 200719".split()
def L(r, k, i): return json.load(open(os.path.join(D, r, f'{k}-{i}.json'), encoding='utf-8'))
rows = [('kick->ljus ms', 'tight', lambda j: j['tajt']['kickLagMs']), ('kickTraff', 'tight', lambda j: round(j['tajt']['kickTraff'], 2)),
        ('energiR15', 'tight', lambda j: round(j['tajt']['energiR15'], 2)), ('nivaR15', 'tight', lambda j: round(j['tajt']['nivaR15'], 2)),
        ('byten', 'tight', lambda j: j['tajt']['byten']), ('drops/mini', 'tight', lambda j: f"{j['tajt']['drops']}/{j['tajt']['minidrops']}"),
        ('lampspr', 'tight', lambda j: round(j['snygg']['lampspr'])), ('längsta look s', 'tight', lambda j: round(j['snygg']['lookLangstaS'])),
        ('litP50', 'tight', lambda j: round(j['snygg']['litP50'], 2)), ('litP90', 'tight', lambda j: round(j['snygg']['litP90'], 2)),
        ('kulörbyten/min', 'konsert', lambda j: round(j['kulorbytenPerMin'], 1)), ('byte på fras', 'konsert', lambda j: j['bytePaFras']),
        ('allaTända', 'konsert', lambda j: j['allaTanda']), ('versRefräng', 'konsert', lambda j: j['versRefrang'])]
for n, k, f in rows:
    out = []
    for r in sys.argv[1:]:
        v = []
        for i in ids:
            try: v.append(str(f(L(r, k, i))))
            except Exception as e: v.append('?')
        out.append('/'.join(v))
    print(f'{n:16s} ' + '   |   '.join(out))
