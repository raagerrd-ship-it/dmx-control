"""DOMAREN FÖR ARENAN DROP2 (2026-11-14 natt): ÄGARENS DROP SKA BLI DROP - på FEM inspelningar från två kvällar - och DELTAGARNAS BRIEF.
Måtten, vikterna, spärrarna och mängderna ändras inte under körningen. Bara ANALYSMÅTT.

ÄGAREN: "takt, låtbyte och drop är viktigare" (än uppbyggnad, 11-14). "Är det ingen uppbyggnad, så är det troligen bara minidrop." (11-13)
  "mina minidrop kan vara på fler ställen än vad jag hinner markera" / "ser du inget i ljudet så är det feltryck" (11-13)
  "inspelningen är stoppad, men vi kan ha missat några" (11-14) -> en omarkerad motordrop är inte BEVISAT falsk; precisionen väger lätt.

FACIT = ägarens knapptryck under inspelningen, finjusterade mot ljudet (<fil>.marks-fin.json; fineS = händelsen i ljudet, pressS =
  trycket, skip = feltryck och räknas inte). Sorter som döms: drop, mini, intedrop. (uppbyggnad och latbyte döms INTE här.)
  ÖVNING   tools/ladan-2026-11-13/lang-20261113T160345.wav   602 s   (kväll 1; basen hålls tillbaka före droppen)
           tools/ladan-2026-11-13/lang-20261113T151659.wav   532 s   (kväll 1; basen SPELAR VIDARE före droppen)
           tools/ladan-2026-11-14/lang-20261114T193818.wav  1725 s   (kväll 2; mest tillbakahållen bas)
  KONTROLL två inspelningar från kväll 2 (en av varje sort) som bara orkestratorn kör (--holdout). Deltagare får varken spela, läsa
           markeringar ur, tappa eller lyssna på dem: lang-20261114T193040.* och lang-20261114T200719.* är förbjudna.

MÅTTEN (per fil, efter 20 s insvängning; en motordrop räknas en gång):
  drop_ratt   ägarens DROP som motorn kallar drop: dropCount stiger inom -0,5 .. +1,0 s från fineS                andel, högre bättre
  precision   motorns drop som träffar en av ägarens drop / alla motorns drop (0 motordrop = 0)                    andel, högre bättre
  mini_ratt   ägarens MINI som motorn INTE kallar drop (ingen drop inom -0,5 .. +1,0 s)                           andel, högre bättre
  inte_ratt   ägarens "INTE DROP" utan motordrop inom pressS -3,0 .. +0,3 s                                       andel, högre bättre
FILENS POÄNG 0..100 = 50 x drop_ratt + 20 x precision + 20 x mini_ratt + 10 x inte_ratt
  (saknar filen en sort fördelas dess poäng på de andra i samma proportion). Minidrop-räknaren döms inte: ljuset läser den inte.
POÄNG = 0,5 x medel över filerna + 0,5 x SÄMSTA filen. En lösning som bara passar en sorts musik vinner inte (arenan drop1: 90 poäng
  på övningen, 0-1 av 5 drop på kontrollen; break-taket 11-14: 2 av 9 på kväll 1, tog 3 av 4 drop på kväll 2).
SPÄRRAR (DISK):
  tempo     samma tempo som bas (inom 4 %) under 97 % av sekunderna i varje fil - drop-arbetet får inte röra klockan
  tid       median |motorns drop - fineS| över 0,5 s bland träffarna (ljuset ska slå NÄR det händer)
  flod      motorns drop över 2,0 per minut i någon fil (ägaren markerar under 1/min)
  kostnad   analysatorns tid per hopp över 1,5 x bas (störs när flera mäter: rankingen diskar först vid 2,5 x, finalister mäts ensamma)
  filer     ändrat annat än analyser.ts, analyserDrop/Section/Spectrum/Level/Kick/Riser/Bass/Character.ts, split.ts, slowWorker.ts
            (+ ANALYSER_SHARED.md5). Klockan (analyserClock.ts), låtgränsen (boundaryDetector.ts), effekterna, dirigenten och output
            är låsta.
  mätfel    bänken kraschar eller ger tom mätning

KOMMANDON (från engine/, PYTHONIOENCODING=utf-8):
  python tools/arena/dropdom2.py .arena/<körning>/<id> --mat             ÖVNINGEN (tre filer) -> <id>/dropdom2.json   (~2-3 min, kö)
  python tools/arena/dropdom2.py .arena/<körning>/bas --mat --bas        engine/dist som den är
  python tools/arena/dropdom2.py .arena/<körning>/<id> --mat --holdout   KONTROLLEN -> <id>/dropdom2-holdout.json   (bara orkestratorn)
  ... --mat --skak     SKAKPROVET: fem körningar med ljudet påbörjat 0 / 0,1 / 0,2 / 0,3 / 0,4 s in, måtten som medel (finalen)
  python tools/arena/dropdom2.py .arena/<körning> [--holdout] [--md]     ranking mot bas
"""
import sys, os, json, subprocess, hashlib, time
from concurrent.futures import ThreadPoolExecutor

ENGINE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OVNING = ['tools/ladan-2026-11-13/lang-20261113T160345.wav', 'tools/ladan-2026-11-13/lang-20261113T151659.wav', 'tools/ladan-2026-11-14/lang-20261114T193818.wav']
KONTROLL = ['tools/ladan-2026-11-14/lang-20261114T193040.wav', 'tools/ladan-2026-11-14/lang-20261114T200719.wav']
TILLATNA = {'analyser.ts', 'analyserDrop.ts', 'analyserSection.ts', 'analyserSpectrum.ts', 'analyserLevel.ts', 'analyserKick.ts', 'analyserRiser.ts',
            'analyserBass.ts', 'analyserCharacter.ts', 'split.ts', 'slowWorker.ts', 'ANALYSER_SHARED.md5'}
VARM_S, FORE, EFTER = 20.0, 0.5, 1.0
VIKT = dict(drop_ratt=50, precision=20, mini_ratt=20, inte_ratt=10)
OFFS = [0.0, 0.1, 0.2, 0.3, 0.4]

def las_ko():
    """En mätning åt gången: låsfil i .arena, väntar högst 40 min."""
    p = os.path.join(ENGINE, '.arena', '.droplas'); t0 = time.time()
    while True:
        try: fd = os.open(p, os.O_CREAT | os.O_EXCL | os.O_WRONLY); os.write(fd, str(os.getpid()).encode()); os.close(fd); return p
        except FileExistsError:
            if time.time() - os.path.getmtime(p) > 900 or time.time() - t0 > 2400:
                try: os.remove(p)
                except OSError: pass
            time.sleep(2)

def kor(arg):
    mapp, bas, wav, off = arg; env = dict(os.environ)
    if not bas:
        env['DMX_DIST'] = os.path.abspath(os.path.join(mapp, 'dist')); env['NODE_OPTIONS'] = '--import=file:///' + os.path.join(ENGINE, 'tools', 'arena', 'distHook.mjs').replace(chr(92), '/')
    ut = os.path.join(mapp, 'raw-%s-%d.json' % (os.path.basename(wav)[:-4], round(off * 10)))
    if os.path.exists(ut): os.remove(ut)
    r = subprocess.run(['node', 'tools/arena/dropdom2Kor.mjs', wav, ut, str(off)], cwd=ENGINE, env=env, capture_output=True, text=True, encoding='utf-8', errors='replace')
    if r.returncode != 0 or not os.path.exists(ut): raise SystemExit('MÄTFEL: ' + (r.stderr or r.stdout)[-800:])
    return json.load(open(ut, encoding='utf-8'))

def dom_fil(raw, wav):
    fin = [m for m in json.load(open(os.path.join(ENGINE, wav[:-4] + '.marks-fin.json'), encoding='utf-8'))['marks'] if not m.get('skip')]
    D = [t for t in raw['drops'] if t >= VARM_S]; used = set()
    agD = [m for m in fin if m['kind'] == 'drop' and m['fineS'] >= VARM_S]; agM = [m for m in fin if m['kind'] == 'mini' and m['fineS'] >= VARM_S]
    agI = [m for m in fin if m['kind'] == 'intedrop' and m['pressS'] >= VARM_S]
    def traff(s):
        k = [(abs(t - s), j) for j, t in enumerate(D) if j not in used and -FORE <= t - s <= EFTER]
        if not k: return None
        _, j = min(k); used.add(j); return D[j] - s
    dt = [traff(m['fineS']) for m in agD]; ratt = [x for x in dt if x is not None]
    miniFel = sum(1 for m in agM if traff(m['fineS']) is not None)
    inteFel = sum(1 for m in agI if any(m['pressS'] - 3.0 <= t <= m['pressS'] + 0.3 for t in D))
    m = dict(drop_ratt=(len(ratt) / len(agD)) if agD else None, precision=(len(ratt) / len(D)) if D else 0.0,
             mini_ratt=(1 - miniFel / len(agM)) if agM else None, inte_ratt=(1 - inteFel / len(agI)) if agI else None)
    v = {k: w for k, w in VIKT.items() if m[k] is not None}; s = 100.0 / sum(v.values())
    return dict(matt=m, poang=sum(w * s * m[k] for k, w in v.items()), n=dict(drop=len(agD), mini=len(agM), inte=len(agI), motorDrop=len(D)), traffar=len(ratt),
                absDt=[abs(x) for x in ratt], flod=len(D) / ((raw['seconds'] - VARM_S) / 60), kostnad=raw['cpuUsPerHop'], motorDrop=D, missade=[a['fineS'] for a, x in zip(agD, dt) if x is None],
                miniSomDrop=miniFel, inteMedDrop=inteFel, minis=len(raw['minis']), grans=raw['grans'], bpm=raw['bpm'])

def mat(mapp, bas, holdout, skak):
    os.makedirs(mapp, exist_ok=True)
    if not bas and not os.path.isdir(os.path.join(mapp, 'dist')): raise SystemExit('saknar ' + os.path.join(mapp, 'dist') + ' (kör tools/arena/bygg.py först)')
    wavs = KONTROLL if holdout else OVNING; offs = OFFS if skak else [0.0]; las = las_ko()
    try:
        jobb = [(mapp, bas, w, o) for o in offs for w in wavs]
        with ThreadPoolExecutor(max_workers=3) as ex: res = list(ex.map(kor, jobb))
    finally:
        try: os.remove(las)
        except OSError: pass
    per = {}
    for (_, _, w, o), raw in zip(jobb, res): per.setdefault(w, []).append(dom_fil(raw, w))
    filer_ut = []; med = lambda xs: sum(xs) / len(xs)
    for w in wavs:
        ds = per[w]; d0 = ds[0]; ad = sorted(x for d in ds for x in d['absDt'])
        filer_ut.append(dict(wav=w, poang=med([d['poang'] for d in ds]), pmin=min(d['poang'] for d in ds), pmax=max(d['poang'] for d in ds), n=d0['n'],
                             traffar=med([d['traffar'] for d in ds]), motorDrop=med([d['n']['motorDrop'] for d in ds]), miniSomDrop=med([d['miniSomDrop'] for d in ds]),
                             inteMedDrop=med([d['inteMedDrop'] for d in ds]), tid=(ad[len(ad) // 2] if ad else 0.0), flod=max(d['flod'] for d in ds),
                             kostnad=med([d['kostnad'] for d in ds]), drops=d0['motorDrop'], missade=d0['missade'], minis=d0['minis'], grans=d0['grans'], bpm=d0['bpm']))
    P = [f['poang'] for f in filer_ut]; poang = 0.5 * med(P) + 0.5 * min(P)
    json.dump(dict(poang=poang, medel=med(P), samst=min(P), skak=skak, filer=filer_ut), open(os.path.join(mapp, 'dropdom2-holdout.json' if holdout else 'dropdom2.json'), 'w', encoding='utf-8'), ensure_ascii=False)
    print('%s  POÄNG %.1f  (medel %.1f, sämsta filen %.1f)%s' % (os.path.basename(mapp), poang, med(P), min(P), '  [skakprov, medel av fem]' if skak else ''))
    for f in filer_ut:
        n = f['n']
        print('  %-26s %5.1f  drop %.1f/%d  motordrop %.1f  mini som drop %.1f/%d  inte-drop med drop %.1f/%d  tid %.2f s  %.2f drop/min' % (
            os.path.basename(f['wav'])[:-4], f['poang'], f['traffar'], n['drop'], f['motorDrop'], f['miniSomDrop'], n['mini'], f['inteMedDrop'], n['inte'], f['tid'], f['flod']))
        if not holdout: print('      motorns drop (s): %s   missade av ägarens (s): %s' % (' '.join('%d' % round(x) for x in f['drops']), ' '.join('%d' % round(x) for x in f['missade']) or '-'))

def filer(mapp):
    """Ändrade filer i deltagarens src mot engine/src (namn relativt src)."""
    src = os.path.join(mapp, 'src'); ut = []
    if not os.path.isdir(src): return ut
    h = lambda p: hashlib.md5(open(p, 'rb').read().replace(b'\r\n', b'\n')).hexdigest()
    for rot, _, fs in os.walk(src):
        for f in fs:
            p = os.path.join(rot, f); rel = os.path.relpath(p, src).replace(chr(92), '/'); q = os.path.join(ENGINE, 'src', rel)
            if not os.path.exists(q) or h(p) != h(q): ut.append(rel)
    return ut

def ranking(korning, holdout, md):
    namn = 'dropdom2-holdout.json' if holdout else 'dropdom2.json'; bas = json.load(open(os.path.join(korning, 'bas', namn), encoding='utf-8')); rader = []
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
    kol = ['plats', 'id', 'poäng', 'mot bas', 'medel', 'sämsta'] + [os.path.basename(f['wav'])[13:-4] + ': drop, motordrop, mini som drop' for f in bas['filer']] + ['tempo = bas', 'kostnad', 'DISK']
    print(('| ' + ' | '.join(kol) + ' |\n|' + '---|' * len(kol)) if md else '  '.join(kol))
    for i, (po, d, r, disk, sam, kk) in enumerate(rader):
        c = [str(i + 1), d, '%.1f' % po, '%+.1f' % (po - bas['poang']), '%.1f' % r['medel'], '%.1f' % r['samst']]
        c += ['%.1f/%d, %.1f, %.1f/%d' % (f['traffar'], f['n']['drop'], f['motorDrop'], f['miniSomDrop'], f['n']['mini']) for f in r['filer']]
        c += ['%.0f %%' % (100 * sam), 'x%.2f' % kk, '; '.join(disk) or 'OK']
        print(('| ' + ' | '.join(c) + ' |') if md else '  '.join(c))

if __name__ == '__main__':
    a = sys.argv[1:]; mapp = a[0]
    if '--mat' in a: mat(mapp, '--bas' in a, '--holdout' in a, '--skak' in a)
    else: ranking(mapp, '--holdout' in a, '--md' in a)
