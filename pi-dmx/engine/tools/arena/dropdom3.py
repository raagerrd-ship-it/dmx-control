"""DOMAREN FÖR ARENAN UPP1 (2026-11-15 kväll): UPPBYGGNAD -> DROP I MOTORN. Måtten, vikterna, spärrarna och mängderna ändras inte under
körningen (undantag: en inspelning som ägaren blir klar med under körningen får gå in i KONTROLLEN före finalen - samma för alla).

ÄGAREN: "Är det ingen uppbyggnad, så är det troligen bara minidrop." (11-13)  "har jag markerat klar, så är det det jag markerat som jag
  anser är rätt" (11-15)  "låt det vara minidrop" (gränsfall, 11-15)  "kör den arenan!" (11-15)
MÄTT 11-15 i ägarens tre genomgångna filer: 15 av hans 19 drop har en uppbyggnad inom 12 s före, men bara 12 av hans 42 minidrop. Dagens
  flank (basens topp >= 10 dB under taket i >= 4 s) ser 5 av 19; 7 av 19 drop har en baslucka under 1 s. Ingen basluckegräns skiljer drop
  från minidrop. Motorn har ingen uppbyggnad. Diskantvetot (inlagt 11-15) tog bort 8 av 9 falska drop.

FACIT = ägarens genomgång (<fil>.marks-hand.json, klar: true) där den finns, annars hans knapptryck (<fil>.marks-fin.json).
  Sorter: drop, mini, uppbyggnad (= här börjar uppbyggnaden). I en KLAR fil är allt omarkerat varken drop eller minidrop.
  ÖVNING   151659  532 s  KLAR      3 drop, 10 mini,  5 uppbyggnader
           172432 1160 s  KLAR     11 drop, 28 mini, 16 uppbyggnader  (motorn spelar 172432-lagad.wav: samma ljud, lagat filhuvud)
           160345  602 s  knapptryck  9 drop, 11 mini (uppbyggnad döms inte där)
  KONTROLL bara orkestratorn (--holdout): 171840 (KLAR) + 193040 (knapptryck). Deltagare får varken spela, läsa markeringar ur, tappa eller
           lyssna på lang-20261113T171840.* eller lang-20261114T193040.*; inte heller 193818 eller 200719 (kan gå in i kontrollen).

UPPBYGGNADEN SOM MOTORN SÄGER: frame.buildStartCount (heltal, monoton) stiger när en uppbyggnad har börjat. Finns inte i dagens motor.

MÅTTEN (per fil, efter 20 s insvängning; fönster runt fineS -0,5 .. +1,0 s; en motordrop räknas en gång)
  drop_ratt   ägarens DROP som motorn kallar drop                                                 vikt 45
  precision   motorns drop som träffar ett av ägarens drop / alla motorns drop (0 drop = 0)       vikt 25
  mini_ratt   ägarens MINI som motorn INTE kallar drop                                            vikt 15
  uppbyggnad  bara KLARA filer: F1 av (ägarens uppbyggnader följda av en landning inom 20 s där motorn säger uppbyggnad mellan
              markeringen - 1,0 s och landningen - 0,3 s) och (träffade / alla motorns uppbyggnader)                         vikt 15
FILENS POÄNG 0..100 (saknas en sort fördelas dess vikt på de andra). POÄNG = 0,5 x medel + 0,5 x SÄMSTA filen.
  Tre starter (ljudet börjar 0 / 0,1 / 0,2 s in) som medel; finalen fem (0 .. 0,4 s).
SPÄRRAR (DISK)
  tempo     samma tempo som bas (inom 4 %) under 97 % av sekunderna i varje fil
  tid       median |motorns drop - fineS| över 0,5 s bland träffarna
  flod      över 2,0 drop per minut i någon fil
  kostnad   analysatorns tid per hopp över 2,5 x bas i rankingen (finalisterna mäts ensamma: över 1,3 x = DISK)
  filer     annat än analyser.ts, analyserDrop/Riser/Section/Spectrum/Level/Kick/Bass/Character.ts, split.ts, slowWorker.ts, ANALYSER_SHARED.md5
  låst      flanken (FLANK_* och flankens kod i analyserDrop.ts) och diskantvetot (HI_VETO_DB, hiFast/hiNorm) får inte ändras - det de släpper
            igenom i dag ska fortfarande bli drop. Nya drop får läggas till. Orkestratorn läser finalisternas diff.

KOMMANDON (från engine/, PYTHONIOENCODING=utf-8)
  python tools/arena/dropdom3.py .arena/upp1/<id> --mat              ÖVNINGEN -> <id>/dropdom3.json   (~10 min, kö: en mätning åt gången)
  python tools/arena/dropdom3.py .arena/upp1/bas --mat --bas         engine/dist som den är
  python tools/arena/dropdom3.py .arena/upp1/<id> --mat --holdout    KONTROLLEN (bara orkestratorn)   ... --final = fem starter
  python tools/arena/dropdom3.py .arena/upp1 [--holdout] [--md]      ranking mot bas"""
import sys, os, json, subprocess, hashlib, time
from concurrent.futures import ThreadPoolExecutor
ENGINE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
L3, L4 = 'tools/ladan-2026-11-13/', 'tools/ladan-2026-11-14/'
OVNING = [L3 + 'lang-20261113T151659.wav', L3 + 'lang-20261113T172432.wav', L3 + 'lang-20261113T160345.wav']
KONTROLL = [L3 + 'lang-20261113T171840.wav', L4 + 'lang-20261114T193040.wav']
SPELA = {L3 + 'lang-20261113T172432.wav': L3 + 'lang-20261113T172432-lagad.wav'}
TILLATNA = {'analyser.ts', 'analyserDrop.ts', 'analyserSection.ts', 'analyserSpectrum.ts', 'analyserLevel.ts', 'analyserKick.ts', 'analyserRiser.ts',
            'analyserBass.ts', 'analyserCharacter.ts', 'split.ts', 'slowWorker.ts', 'ANALYSER_SHARED.md5'}
VARM_S, FORE, EFTER = 20.0, 0.5, 1.0
VIKT = dict(drop_ratt=45, precision=25, mini_ratt=15, uppbyggnad=15)
OFFS3, OFFS5 = [0.0, 0.1, 0.2], [0.0, 0.1, 0.2, 0.3, 0.4]

def las_ko():
    p = os.path.join(ENGINE, '.arena', '.droplas'); t0 = time.time()
    while True:
        try: fd = os.open(p, os.O_CREAT | os.O_EXCL | os.O_WRONLY); os.write(fd, str(os.getpid()).encode()); os.close(fd); return p
        except FileExistsError:
            if time.time() - os.path.getmtime(p) > 1800 or time.time() - t0 > 5400:
                try: os.remove(p)
                except OSError: pass
            time.sleep(3)

def kor(arg):
    mapp, bas, wav, off = arg; env = dict(os.environ)
    if not bas:
        env['DMX_DIST'] = os.path.abspath(os.path.join(mapp, 'dist')); env['NODE_OPTIONS'] = '--import=file:///' + os.path.join(ENGINE, 'tools', 'arena', 'distHook.mjs').replace(chr(92), '/')
    ut = os.path.join(mapp, 'raw3-%s-%d.json' % (os.path.basename(wav)[:-4], round(off * 10)))
    if os.path.exists(ut): os.remove(ut)
    r = subprocess.run(['node', 'tools/arena/dropdom3Kor.mjs', SPELA.get(wav, wav), ut, str(off)], cwd=ENGINE, env=env, capture_output=True, text=True, encoding='utf-8', errors='replace')
    if r.returncode != 0 or not os.path.exists(ut): raise SystemExit('MÄTFEL: ' + (r.stderr or r.stdout)[-800:])
    return json.load(open(ut, encoding='utf-8'))

def las_marks(wav):
    hand = os.path.join(ENGINE, wav[:-4] + '.marks-hand.json')
    if os.path.exists(hand):
        d = json.load(open(hand, encoding='utf-8'))
        if d.get('klar'): return [m for m in d['marks'] if not m.get('skip') and not m.get('forslag')], True
    return [m for m in json.load(open(os.path.join(ENGINE, wav[:-4] + '.marks-fin.json'), encoding='utf-8'))['marks'] if not m.get('skip')], False

def dom_fil(raw, wav):
    M, klar = las_marks(wav)
    D = [t for t in raw['drops'] if t >= VARM_S]; U = [t for t in raw.get('uppb', []) if t >= VARM_S]; used = set()
    agD = [m['fineS'] for m in M if m['kind'] == 'drop' and m['fineS'] >= VARM_S]; agM = [m['fineS'] for m in M if m['kind'] == 'mini' and m['fineS'] >= VARM_S]
    def traff(s):
        k = [(abs(t - s), j) for j, t in enumerate(D) if j not in used and -FORE <= t - s <= EFTER]
        if not k: return None
        _, j = min(k); used.add(j); return D[j] - s
    dt = [traff(s) for s in agD]; ratt = [x for x in dt if x is not None]; miniFel = sum(1 for s in agM if traff(s) is not None)
    m = dict(drop_ratt=len(ratt) / len(agD) if agD else None, precision=len(ratt) / len(D) if D else 0.0, mini_ratt=1 - miniFel / len(agM) if agM else None, uppbyggnad=None)
    upp = None
    if klar:
        land = sorted(agD + agM); par = []
        for u in sorted(x['fineS'] for x in M if x['kind'] == 'uppbyggnad' and x['fineS'] >= VARM_S):
            Ld = next((s for s in land if 0 < s - u <= 20), None)
            if Ld: par.append((u, Ld))
        hit = sum(1 for u, Ld in par if any(u - 1.0 <= t <= Ld - 0.3 for t in U))
        if par:
            r = hit / len(par); p = min(1.0, hit / len(U)) if U else 0.0; m['uppbyggnad'] = 2 * r * p / (r + p) if r + p else 0.0
        upp = dict(hittade=hit, av=len(par), motorns=len(U))
    v = {k: w for k, w in VIKT.items() if m[k] is not None}; s = 100.0 / sum(v.values())
    return dict(matt=m, poang=sum(w * s * m[k] for k, w in v.items()), klar=klar, n=dict(drop=len(agD), mini=len(agM)), traffar=len(ratt), absDt=[abs(x) for x in ratt],
                flod=len(D) / ((raw['seconds'] - VARM_S) / 60), kostnad=raw['cpuUsPerHop'], motorDrop=D, falska=[t for j, t in enumerate(D) if j not in used],
                missade=[a for a, x in zip(agD, dt) if x is None], miniSomDrop=miniFel, upp=upp, bpm=raw['bpm'])

def mat(mapp, bas, holdout, final):
    os.makedirs(mapp, exist_ok=True)
    if not bas and not os.path.isdir(os.path.join(mapp, 'dist')): raise SystemExit('saknar ' + os.path.join(mapp, 'dist') + ' (kör tools/arena/bygg.py först)')
    wavs = KONTROLL if holdout else OVNING; offs = OFFS5 if final else OFFS3; las = las_ko()
    try:
        jobb = [(mapp, bas, w, o) for o in offs for w in wavs]
        with ThreadPoolExecutor(max_workers=3) as ex: res = list(ex.map(kor, jobb))
    finally:
        try: os.remove(las)
        except OSError: pass
    per = {}
    for (_, _, w, o), raw in zip(jobb, res): per.setdefault(w, []).append(dom_fil(raw, w))
    med = lambda xs: sum(xs) / len(xs); ut = []
    for w in wavs:
        ds = per[w]; d0 = ds[0]; ad = sorted(x for d in ds for x in d['absDt'])
        ut.append(dict(wav=w, poang=med([d['poang'] for d in ds]), n=d0['n'], klar=d0['klar'], traffar=med([d['traffar'] for d in ds]), motorDrop=med([len(d['motorDrop']) for d in ds]),
                       falska=med([len(d['falska']) for d in ds]), miniSomDrop=med([d['miniSomDrop'] for d in ds]), tid=(ad[len(ad) // 2] if ad else 0.0), flod=max(d['flod'] for d in ds),
                       kostnad=med([d['kostnad'] for d in ds]), upp=d0['upp'], uppMatt=(med([d['matt']['uppbyggnad'] for d in ds]) if d0['matt']['uppbyggnad'] is not None else None),
                       drops=d0['motorDrop'], falskaT=d0['falska'], missade=d0['missade'], bpm=d0['bpm']))
    P = [f['poang'] for f in ut]; poang = 0.5 * med(P) + 0.5 * min(P)
    json.dump(dict(poang=poang, medel=med(P), samst=min(P), starter=len(offs), filer=ut), open(os.path.join(mapp, 'dropdom3-holdout.json' if holdout else 'dropdom3.json'), 'w', encoding='utf-8'), ensure_ascii=False)
    print('%s  POÄNG %.1f  (medel %.1f, sämsta filen %.1f, %d starter)' % (os.path.basename(os.path.normpath(mapp)), poang, med(P), min(P), len(offs)))
    for f in ut:
        n = f['n']; u = f['upp']
        print('  %-26s %5.1f  drop %.1f/%d  motordrop %.1f (falska %.1f)  mini som drop %.1f/%d  %s tid %.2f s  %.2f drop/min  %.0f us/hopp%s' % (
            os.path.basename(f['wav'])[:-4], f['poang'], f['traffar'], n['drop'], f['motorDrop'], f['falska'], f['miniSomDrop'], n['mini'],
            ('uppbyggnad %d/%d (motorns %d) ' % (u['hittade'], u['av'], u['motorns'])) if u else '', f['tid'], f['flod'], f['kostnad'], '' if f['klar'] else '  [knapptryck: falska ej bevisade]'))
        if not holdout: print('      motorns drop (s): %s   falska: %s   missade av ägarens: %s' % (' '.join('%d' % round(x) for x in f['drops']) or '-', ' '.join('%d' % round(x) for x in f['falskaT']) or '-', ' '.join('%d' % round(x) for x in f['missade']) or '-'))

def filer(mapp):
    src = os.path.join(mapp, 'src'); ut = []
    if not os.path.isdir(src): return ut
    h = lambda p: hashlib.md5(open(p, 'rb').read().replace(b'\r\n', b'\n')).hexdigest()
    for rot, _, fs in os.walk(src):
        for f in fs:
            p = os.path.join(rot, f); rel = os.path.relpath(p, src).replace(chr(92), '/'); q = os.path.join(ENGINE, 'src', rel)
            if not os.path.exists(q) or h(p) != h(q): ut.append(rel)
    return ut

def ranking(korning, holdout, md):
    namn = 'dropdom3-holdout.json' if holdout else 'dropdom3.json'; bas = json.load(open(os.path.join(korning, 'bas', namn), encoding='utf-8')); rader = []
    for d in sorted(os.listdir(korning)):
        p = os.path.join(korning, d, namn)
        if not os.path.exists(p): continue
        r = json.load(open(p, encoding='utf-8')); disk = []; sam = 1.0
        for f, b in zip(r['filer'], bas['filer']):
            s = sum(1 for x, y in zip(f['bpm'], b['bpm']) if (x == 0 and y == 0) or (x > 0 and y > 0 and abs(x / y - 1) < 0.04)) / max(1, len(b['bpm'])); sam = min(sam, s)
            if f['tid'] > 0.5: disk.append('tid %.2f s' % f['tid'])
            if f['flod'] > 2.0: disk.append('flod %.1f/min' % f['flod'])
        if sam < 0.97: disk.append('tempo %.0f %%' % (100 * sam))
        kb = sum(f['kostnad'] for f in bas['filer']); kd = sum(f['kostnad'] for f in r['filer'])
        if kd > 2.5 * kb: disk.append('kostnad x%.2f' % (kd / kb))
        fel = [f for f in filer(os.path.join(korning, d)) if f not in TILLATNA]
        if fel: disk.append('filer: ' + ', '.join(fel[:4]))
        rader.append((r['poang'], d, r, disk, sam, kd / kb))
    rader.sort(key=lambda x: (bool(x[3]), -x[0]))
    kol = ['plats', 'id', 'poäng', 'mot bas', 'medel', 'sämsta'] + [os.path.basename(f['wav'])[13:-4] + ': drop, falska, mini som drop, uppb' for f in bas['filer']] + ['tempo = bas', 'kostnad', 'DISK']
    print(('| ' + ' | '.join(kol) + ' |\n|' + '---|' * len(kol)) if md else '  '.join(kol))
    for i, (po, d, r, disk, sam, kk) in enumerate(rader):
        c = [str(i + 1), d, '%.1f' % po, '%+.1f' % (po - bas['poang']), '%.1f' % r['medel'], '%.1f' % r['samst']]
        c += ['%.1f/%d, %.1f, %.1f/%d, %s' % (f['traffar'], f['n']['drop'], f['falska'], f['miniSomDrop'], f['n']['mini'], ('%d/%d' % (f['upp']['hittade'], f['upp']['av'])) if f['upp'] else '-') for f in r['filer']]
        c += ['%.0f %%' % (100 * sam), 'x%.2f' % kk, '; '.join(disk) or 'OK']
        print(('| ' + ' | '.join(c) + ' |') if md else '  '.join(c))

if __name__ == '__main__':
    a = sys.argv[1:]; mapp = a[0]
    if '--mat' in a: mat(mapp, '--bas' in a, '--holdout' in a, '--final' in a)
    else: ranking(mapp, '--holdout' in a, '--md' in a)
