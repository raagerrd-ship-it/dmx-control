"""DOMAREN FÖR ARENAN 'TAKTEN GENOM LÅTBYTET' (2026-11-14) - och DELTAGARNAS BRIEF.
Måtten, vikterna, spärrarna och mängderna ändras inte under körningen. Bara ANALYSMÅTT.

ÄGAREN (2026-11-14): "takt, låtbyte och drop är viktigare" (än uppbyggnad). "kör igång en arena där vi är sämst idag".
  Drop är sämst i tal (2 av 14 träffade) men saknar material; näst sämst är LÅTBYTET, och det står för hälften av klockans fel.

FACIT
  TEMPO  tools/ladan-2026-11-13/beatthis.jsonl - slagen ur Beat This! (lokal slagföljare, körd på hela inspelningen i efterhand).
         Facit vid tiden t = 60 / medianen av slagintervallen inom +-4 s (minst 6 slag). Varje halv sekund döms.
  LÅTBYTEN  tools/ladan-2026-11-13/latbyten.json - skarvarna (s) ur tempots hopp i facit + ägarens Låtbyte-tryck; ägarens genomgång
            (marks-hand.json, klar) går före (skarvar(), 2026-11-15).
MÄNGDER
  ÖVNING   lang-20261113T160345.wav (603 s, låtbyten ~265 och ~406 s)  +  lang-20261113T171840.wav (300 s, ~130 och ~272 s)
  KONTROLL lang-20261113T151659.wav (532 s, två låtbyten) - körs bara av orkestratorn (--holdout). Deltagare får varken spela, läsa,
           tappa eller lyssna på den, och inte läsa dess rader i facitfilerna.

DAGENS LÄGE (bas, övningen): klockan har rätt tempo 92,6 % av tiden (63 s fel av 863). Felen ligger vid låtbytena (256-278 s: klockan
  håller förra låtens tempo genom nästa låts intro) och i break (136-142 s: 131 -> 80 bpm en sekund före ett drop). Låtgränsdetektorn säger
  gränsen 9 s efter skarven som bäst (formvägen jämför 8 s efter med 80 s före), 20 s efter som sämst, och ger en falsk gräns i en
  uppbyggnad (200 s). Låtgränsen är klockans ENDA signal om låtbyte (hintTrackChange -> an.trackBoundaries).

MÅTTEN (per mängd, efter 20 s insvängning)
  takt        andel av halvsekunderna där klockans tempo ligger inom 4 % av facit (oktavfel räknas som fel)            %, högre bättre
  lastid      per låtbyte: sekunder från skarven tills klockan haft rätt tempo 5 s i sträck (tak 40 s), medel           s, lägre bättre
  latbyten    skarvar där motorn SÄGER en låtgräns mellan 8 s före och 25 s efter skarven / antal skarvar              andel
  falska      sagda låtgränser som inte hör till någon skarv, per 10 minuter                                           lägre bättre
POÄNG = takt (%)  +  3 x latbyten (andel)  -  1,5 x falska (per 10 min)  -  0,1 x lastid (s)
  Takten är huvudsaken: en sekund rätt tempo till är värd ~0,12 poäng i övningen. Låtgränserna räknas för sig eftersom ljuset byter
  manus på dem (en falsk gräns byter lookar mitt i låten).
SPÄRRAR (DISK)
  utanfor     takten UTANFÖR låtbytena (allt som inte ligger 10 s före till 40 s efter en skarv) får inte bli sämre än bas - 1,0 %-enheter
              (den som lagar låtbytet får inte förstöra resten av låten)
  kostnad     analysatorns tid per hopp över 1,5 x bas (i rankingen diskar först 2,5 x; finalister mäts ensamma)
  filer       ändrat annat än src/boundaryDetector.ts och src/analyserClock.ts (+ src/ANALYSER_SHARED.md5)
  matfel      bänken kraschar eller ger tom mätning
REDOVISAS (ingen spärr): motorns drop jämfört med bas (låtgränsen nollar sektionerna; drop ska inte flytta sig av det).
REGLER FÖR LÖSNINGEN: inga env-rattar i slutlösningen; nivågränser relativa mot låten eller släckgränsen (ingen ny absolut nivå);
  analysatorn analyserar bara; en källa per storhet (klockan äger tempot, låtgränsdetektorn äger låtgränsen).

KOMMANDON (från engine/, PYTHONIOENCODING=utf-8)
  python tools/arena/latdom.py .arena/<körning>/<id> --mat             hela analysatorn med deltagarens bygge på ÖVNINGEN -> <id>/latdom.json (~50 s)
  python tools/arena/latdom.py .arena/<körning>/bas --mat --bas        engine/dist som den är
  python tools/arena/latdom.py .arena/<körning>/<id> --mat --holdout   KONTROLLEN (bara orkestratorn)
  python tools/arena/latdom.py .arena/<körning> [--holdout] [--md]     ranking mot bas
  Fria prov utan budget (sekunder per körning, se tools/ensamTakt.mjs): klockan eller låtgränsen FÖR SIG på tapparna i .arena/<körning>/tap/
    node tools/ensamTakt.mjs klocka   .arena/<körning>/tap/<fil>.klocka.tap   --dist .arena/<körning>/<id>/dist --facit tools/ladan-2026-11-13/beatthis.jsonl
    node tools/ensamTakt.mjs latgrans .arena/<körning>/tap/<fil>.latgrans.tap --dist .arena/<körning>/<id>/dist --facit tools/ladan-2026-11-13/latbyten.json
  (--set NAMN=värde byter en konstant utan ombygge.) De ser inte samspelet klocka <-> låtgräns <-> kickgrind: domaren kör hela analysatorn.
"""
import sys, os, json, subprocess, hashlib, time

ENGINE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
W = 'tools/ladan-2026-11-13/'
OVNING = [W + 'lang-20261113T160345.wav', W + 'lang-20261113T171840.wav']
KONTROLL = [W + 'lang-20261113T151659.wav']
TILLATNA = {'boundaryDetector.ts', 'analyserClock.ts', 'ANALYSER_SHARED.md5'}
VARM_S = 20.0

def las_ko():
    p = os.path.join(ENGINE, '.arena', '.latlas'); t0 = time.time()
    while True:
        try: fd = os.open(p, os.O_CREAT | os.O_EXCL | os.O_WRONLY); os.write(fd, str(os.getpid()).encode()); os.close(fd); return p
        except FileExistsError:
            if time.time() - os.path.getmtime(p) > 400 or time.time() - t0 > 1800:
                try: os.remove(p)
                except OSError: pass
            time.sleep(2)

def skarvar():
    """låtbytena per fil: latbyten.json, men ägarens genomgång (<fil>.marks-hand.json med klar: true) går före (2026-11-15)"""
    sk = json.load(open(os.path.join(ENGINE, W, 'latbyten.json'), encoding='utf-8'))
    for d in sorted(os.listdir(os.path.join(ENGINE, 'tools'))):
        if not d.startswith('ladan-'): continue
        for f in os.listdir(os.path.join(ENGINE, 'tools', d)):
            if not f.endswith('.marks-hand.json'): continue
            h = json.load(open(os.path.join(ENGINE, 'tools', d, f), encoding='utf-8'))
            if h.get('klar'): sk[f.replace('.marks-hand.json', '.wav')] = sorted(round(m['fineS'], 2) for m in h['marks'] if m['kind'] == 'latbyte' and not m.get('skip') and not m.get('forslag'))
    return sk

def facit_beats():
    ut = {}
    for rad in open(os.path.join(ENGINE, W, 'beatthis.jsonl'), encoding='utf-8'):
        rad = rad.strip()
        if rad.startswith('{'): r = json.loads(rad); ut[os.path.basename(r['path'])] = r.get('beatsS', [])
    return ut

def facit_vid(b, t):
    m = [x for x in b if t - 4 <= x <= t + 4]
    if len(m) < 6: return 0.0
    d = sorted(m[i + 1] - m[i] for i in range(len(m) - 1)); k = len(d)
    return 60.0 / (d[k // 2] if k % 2 else (d[k // 2 - 1] + d[k // 2]) / 2)

def dom_fil(raw, beats, skarvar):
    s = raw['stegS']; B = raw['bpm']; n = ratt = nu = rattu = 0; ok = []
    for i, v in enumerate(B):
        t = i * s
        if t < VARM_S: ok.append(None); continue
        f = facit_vid(beats, t)
        if f <= 0: ok.append(None); continue
        r = v > 0 and abs(v - f) / f <= 0.04; ok.append(r); n += 1; ratt += r
        if not any(-10 <= t - T <= 40 for T in skarvar): nu += 1; rattu += r
    need = int(round(5 / s)); las = []
    for T in skarvar:
        i0 = int(T / s); run = 0; hit = 40.0
        for i in range(i0, min(len(ok), i0 + int(45 / s))):
            run = run + 1 if ok[i] else 0
            if run >= need: hit = max(0.0, (i - need + 1) * s - T); break
        las.append(min(40.0, hit))
    G = [g[0] for g in raw['grans'] if g[0] >= VARM_S]
    traff = [T for T in skarvar if any(T - 8 <= g <= T + 25 for g in G)]
    falska = [g for g in G if not any(T - 8 <= g <= T + 25 for T in skarvar)]
    return dict(n=n, ratt=ratt, nu=nu, rattu=rattu, las=las, traff=len(traff), skarvar=len(skarvar), falska=falska, sek=raw['seconds'] - VARM_S, grans=raw['grans'], drops=raw['drops'], kostnad=raw['cpuUsPerHop'])

def mat(mapp, bas, holdout):
    las = las_ko()
    try: _mat(mapp, bas, holdout)
    finally:
        try: os.remove(las)
        except OSError: pass

def _mat(mapp, bas, holdout):
    os.makedirs(mapp, exist_ok=True); env = dict(os.environ)
    if not bas:
        dist = os.path.abspath(os.path.join(mapp, 'dist'))
        if not os.path.isdir(dist): raise SystemExit('saknar ' + dist + ' (kör tools/arena/bygg.py först)')
        env['DMX_DIST'] = dist; env['NODE_OPTIONS'] = '--import=file:///' + os.path.join(ENGINE, 'tools', 'arena', 'distHook.mjs').replace('\\', '/')
    beats = facit_beats(); skarv = skarvar(); per = []
    for wav in (KONTROLL if holdout else OVNING):
        ut = os.path.join(mapp, 'latraw-' + os.path.basename(wav)[:-4] + '.json')
        r = subprocess.run(['node', 'tools/arena/latdomKor.mjs', wav, ut], cwd=ENGINE, env=env, capture_output=True, text=True, encoding='utf-8', errors='replace')
        if r.returncode != 0 or not os.path.exists(ut): raise SystemExit('MÄTFEL: ' + (r.stderr or r.stdout)[-800:])
        raw = json.load(open(ut, encoding='utf-8')); d = dom_fil(raw, beats[os.path.basename(wav)], skarv[os.path.basename(wav)]); d['wav'] = os.path.basename(wav); d['bpm'] = raw['bpm']; per.append(d)
    N = sum(d['n'] for d in per); takt = 100.0 * sum(d['ratt'] for d in per) / max(1, N); utanf = 100.0 * sum(d['rattu'] for d in per) / max(1, sum(d['nu'] for d in per))
    las = [x for d in per for x in d['las']]; lastid = sum(las) / max(1, len(las)); sk = sum(d['skarvar'] for d in per); tr = sum(d['traff'] for d in per)
    fal = sum(len(d['falska']) for d in per); falska = fal / (sum(d['sek'] for d in per) / 600.0); steg = 0.5013
    m = dict(takt=takt, felS=(N - sum(d['ratt'] for d in per)) * steg, utanfor=utanf, lastid=lastid, latbyten=tr / max(1, sk), traff=tr, skarvar=sk, falska=falska, falskaN=fal,
             kostnad=sum(d['kostnad'] for d in per) / len(per))
    m['poang'] = takt + 3.0 * m['latbyten'] - 1.5 * falska - 0.1 * lastid
    json.dump(dict(matt=m, filer=per), open(os.path.join(mapp, 'latdom-holdout.json' if holdout else 'latdom.json'), 'w', encoding='utf-8'), ensure_ascii=False)
    print('%s  poäng %.2f  takt %.1f %% (fel %.0f s)  utanför låtbytena %.1f %%  låstid %.1f s  låtbyten %d/%d  falska %d (%.1f per 10 min)  %.0f us/hopp' % (
        os.path.basename(mapp), m['poang'], takt, m['felS'], utanf, lastid, tr, sk, fal, falska, m['kostnad']))
    for d in per: print('   %s: takt %.1f %%, låstider %s s, låtgränser %s, falska %s, drop %s' % (d['wav'][-10:-4], 100.0 * d['ratt'] / max(1, d['n']), ' / '.join('%.0f' % x for x in d['las']),
        ' '.join('%.0f' % g[0] for g in d['grans']) or '-', ' '.join('%.0f' % g for g in d['falska']) or '-', ' '.join('%.0f' % t for t in d['drops']) or '-'))

def filer(mapp):
    src = os.path.join(mapp, 'src'); ut = []
    if not os.path.isdir(src): return ut
    h = lambda p: hashlib.md5(open(p, 'rb').read().replace(b'\r\n', b'\n')).hexdigest()
    for rot, _, fs in os.walk(src):
        for f in fs:
            p = os.path.join(rot, f); rel = os.path.relpath(p, src).replace('\\', '/'); q = os.path.join(ENGINE, 'src', rel)
            if not os.path.exists(q) or h(p) != h(q): ut.append(rel)
    return ut

def ranking(korning, holdout, md):
    namn = 'latdom-holdout.json' if holdout else 'latdom.json'; bas = json.load(open(os.path.join(korning, 'bas', namn), encoding='utf-8')); bm = bas['matt']; rader = []
    for d in sorted(os.listdir(korning)):
        p = os.path.join(korning, d, namn)
        if not os.path.isfile(p): continue
        j = json.load(open(p, encoding='utf-8')); m = j['matt']; disk = []
        if m['utanfor'] < bm['utanfor'] - 1.0: disk.append('utanför %.1f %% (bas %.1f)' % (m['utanfor'], bm['utanfor']))
        if m['kostnad'] > 2.5 * bm['kostnad']: disk.append('kostnad x%.1f' % (m['kostnad'] / bm['kostnad']))
        fl = [f for f in filer(os.path.join(korning, d)) if f not in TILLATNA]
        if fl: disk.append('filer: ' + ', '.join(fl[:3]))
        dr = sum(1 for a, b in zip(j['filer'], bas['filer']) if [round(x) for x in a['drops']] != [round(x) for x in b['drops']])
        rader.append((m['poang'], d, m, disk, dr))
    rader.sort(key=lambda r: (bool(r[3]), -r[0]))
    hd = ['plats', 'id', 'poäng', 'mot bas', 'takt %', 'fel s', 'utanför %', 'låstid s', 'låtbyten', 'falska', 'drop ändrade i', 'kostnad', 'DISK']
    if md: print('| ' + ' | '.join(hd) + ' |'); print('|' + '---|' * len(hd))
    else: print('  '.join(hd))
    for i, (po, d, m, disk, dr) in enumerate(rader):
        c = [str(i + 1), d, '%.2f' % po, '%+.2f' % (po - bm['poang']), '%.1f' % m['takt'], '%.0f' % m['felS'], '%.1f' % m['utanfor'], '%.1f' % m['lastid'], '%d/%d' % (m['traff'], m['skarvar']),
             '%d' % m['falskaN'], '%d filer' % dr, 'x%.2f' % (m['kostnad'] / bm['kostnad']), '; '.join(disk) or 'OK']
        print(('| ' + ' | '.join(c) + ' |') if md else '  '.join(c))

if __name__ == '__main__':
    a = [x for x in sys.argv[1:] if not x.startswith('--')]
    if not a: print(__doc__); sys.exit(0)
    mapp = os.path.abspath(a[0]); hold = '--holdout' in sys.argv
    if '--mat' in sys.argv: mat(mapp, '--bas' in sys.argv, hold)
    else: ranking(mapp, hold, '--md' in sys.argv)
