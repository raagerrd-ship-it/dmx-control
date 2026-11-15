"""Bygger fore_drop5.py ur förra arenans fore_drop.py: samma mått, men FEM inspelningar (två kvällar) och AUC per fil + alla tillsammans.
  python tools/natt/arena-2026-11-14-drop2/mk_fore5.py   (från engine/) -> tools/natt/arena-2026-11-14-drop2/fore_drop5.py"""
import io, os
H = os.path.dirname(os.path.abspath(__file__)); src = io.open(os.path.join(H, '..', 'arena-2026-11-13-drop1', 'fore_drop.py'), encoding='utf-8').read()
i = src.index('ut = {}\nfor namn in FILER:'); huvud = src[:i]
huvud = huvud.replace('D = r"C:\\Users\\richa\\Desktop\\Claude\\dmx-control\\pi-dmx\\engine\\tools\\ladan-2026-11-13"', 'import os\nD = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")')
huvud = huvud.replace('FILER = ["lang-20261113T160345", "lang-20261113T151659"]', 'FILER = ["ladan-2026-11-13/lang-20261113T160345", "ladan-2026-11-14/lang-20261114T193040", "ladan-2026-11-14/lang-20261114T193818", "ladan-2026-11-13/lang-20261113T151659", "ladan-2026-11-14/lang-20261114T200719"]')
huvud = huvud.replace('f"{D}\\\\{namn}.wav"', 'os.path.join(D, namn + ".wav")')
assert 'os.path.join(D, namn + ".wav")' in huvud and 'ladan-2026-11-14' in huvud
svans = '''ut = {}
for namn in FILER:
    t, b = las(namn)
    mk = json.load(open(os.path.join(D, namn + ".marks-fin.json"), encoding="utf-8"))["marks"]
    rad = {"drop": [], "mini": [], "intedrop": []}
    for m in mk:
        if m.get("skip") or m["kind"] not in rad: continue
        s = m["fineS"]
        if s < 9 or s > t[-1] - 4: continue
        rad[m["kind"]].append(matt(t, b, s))
    ut[namn] = rad
nycklar = list(ut[FILER[0]]["drop"][0].keys()); kort = [n[-6:] for n in FILER]
print("antal drop / mini+inte per fil: " + ", ".join("%s %d/%d" % (k, len(ut[n]["drop"]), len(ut[n]["mini"]) + len(ut[n]["intedrop"])) for k, n in zip(kort, FILER)))
print("AUC drop mot mini+inte (1,0 = alla drop over alla mini; 0,5 = slump). ALLA = alla fem filer i en hog. 'haller' = samma hall i alla fem och minst 0,65 fran slumpen raknat.")
print("%-40s | %s | %5s | haller" % ("matt", " ".join("%6s" % k for k in kort), "ALLA"))
rader = []
for k in nycklar:
    A = []; dd = []; mm = []
    for n in FILER:
        d = [m[k] for m in ut[n]["drop"]]; mi = [m[k] for m in ut[n]["mini"]] + [m[k] for m in ut[n]["intedrop"]]
        A.append(auc(d, mi)); dd += d; mm += mi
    al = auc(dd, mm); sida = [a - 0.5 for a in A if a == a]
    h = (all(x > 0 for x in sida) or all(x < 0 for x in sida)) and min(abs(x) for x in sida) >= 0.15
    rader.append((abs(al - 0.5), "%-40s | %s | %5.2f | %s" % (k, " ".join("%6.2f" % a for a in A), al, "JA" if h else "")))
for _, r in sorted(rader, reverse=True): print(r)
json.dump({n: {k: [{q: float(v) for q, v in m.items()} for m in r] for k, r in ut[n].items()} for n in FILER}, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fore5.json'), 'w'))
'''
io.open(os.path.join(H, 'fore_drop5.py'), 'w', encoding='utf-8').write(huvud + svans); print('skrev fore_drop5.py')
