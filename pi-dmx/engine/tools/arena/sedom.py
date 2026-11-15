"""DOMAREN FÖR MINIARENAN SE1 (2026-11-15): kan en lyssnare som bara får LJUDET, i den ordning det spelas, SE det ägaren markerat -
drop, minidrop och uppbyggnad - i en inspelning han gått igenom i tools/markera? Måtten, vikterna och spärrarna ändras inte under körningen.

ÄGAREN (11-15): "om du kör denna mot en miniarena, där de själva får analysera (utan vår motor först) för att se om de kommer på något
  sätt att 'se' allt. Nästa steg, visa vår motor och de får ge förslag på förbättringar."
  "har jag markerat klar, så är det det jag markerat som jag anser är rätt" -> i en klar fil är allt OMARKERAT varken drop eller minidrop.

DETEKTORN  <mapp>/detektor.py med
    class Detektor:
        def __init__(self, sr): ...            # sr = 48000
        def mata(self, x): ...                 # x = nästa 480 sampel (10 ms, numpy float32, -1..1); svara med en lista av händelser
  händelse = en av strängarna 'drop', 'mini', 'uppbyggnad' (en uppbyggnad har börjat), 'sektion' (ny sektion), 'latbyte' (ny låt).
  Domaren matar ljudet block för block och stämplar varje händelse med ljudets tid när blocket matades: detektorn kan inte se framåt.
  Bara numpy och scipy. Detektorn får inte läsa filer, klockan eller något annat än blocken.

FACIT  ägarens genomgång (<fil>.marks-hand.json, klar: true): fineS = händelsen i ljudet. drop/mini = där landningen kommer,
  uppbyggnad = där uppbyggnaden börjar. Efter 20 s insvängning räknat från där ljudet börjar.
  ÖVNING   tools/ladan-2026-11-13/lang-20261113T151659.wav   532 s   3 drop, 10 minidrop, 5 uppbyggnader
  KONTROLL tre andra inspelningar som bara orkestratorn kör (--holdout): 171840 (ägarens genomgång, klar 11-15 för finalen: 5 drop, 4 mini,
           4 uppbyggnader) döms fullt; 160345 och 193040 har bara knapptryck (uppbyggnad döms inte, falska är inte bevisade).

MÅTTEN (fönster runt fineS: -0,5 .. +1,0 s; en detektordrop räknas en gång)
  drop_ratt       ägarens DROP som detektorn kallar 'drop'                                                              vikt 30
  drop_precision  detektorns 'drop' som träffar en av ägarens drop / alla detektorns 'drop' (inga = 0)                  vikt 20
  mini_ratt       ägarens MINI som detektorn INTE kallar 'drop'                                                         vikt 10
  landning_sedd   ägarens drop + mini som detektorn ser alls ('drop' eller 'mini' i fönstret)                           vikt 15
  mini_precision  ägarens landningar med en 'mini' i fönstret / alla detektorns 'mini' (inga = 0)                       vikt 10
  uppbyggnad      F1 av: ägarens uppbyggnader med en 'uppbyggnad' mellan markeringen - 1,0 s och landningen - 0,3 s,
                  och hittade uppbyggnader / alla detektorns 'uppbyggnad'                                               vikt 15
POÄNG 0..100 = summan, medel över tre starter (ljudet börjar 0, 7,3 och 13,1 s in). Utan bonus: 'sektion' (ägarens sektionsgränser inom
  2 s) och 'latbyte' (inom -2 .. +10 s) redovisas bara.
SPÄRRAR (DISK)
  tid       median |detektorns drop - fineS| över 0,5 s bland träffarna
  flod      över 2,0 'drop' per minut
  fart      körningen tar längre tid än ljudet är långt (en körning ensam ska gå på under en tredjedel)
  regler    detektorn läser filer/klocka, eller bär markeringarnas tider i koden (orkestratorn läser finalisternas kod)

KÖR (från engine/, med <lotus>/tools/tempo-facit-pc/.venv/Scripts/python.exe)
  python tools/arena/sedom.py <mapp>                döm <mapp>/detektor.py på övningen -> <mapp>/sedom.json (en dom åt gången, kö)
  python tools/arena/sedom.py <mapp> --holdout      kontrollen (bara orkestratorn)
  python tools/arena/sedom.py --raw <raw.json> <wav>   döm motorns körning (dropdom2Kor.mjs) med samma mått
  python tools/arena/sedom.py --rank <körning>      rangordna alla mappar i körningen"""
import sys, os, json, time, subprocess, importlib.util
import numpy as np
ENGINE = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
OVNING = ['tools/ladan-2026-11-13/lang-20261113T151659.wav']
KONTROLL = ['tools/ladan-2026-11-13/lang-20261113T171840.wav', 'tools/ladan-2026-11-13/lang-20261113T160345.wav', 'tools/ladan-2026-11-14/lang-20261114T193040.wav']
OFFS = [0.0, 7.3, 13.1]; VARM = 20.0; FORE, EFTER = 0.5, 1.0; BLOCK = 480
VIKT = dict(drop_ratt=30, drop_precision=20, mini_ratt=10, landning_sedd=15, mini_precision=10, uppbyggnad=15)
SORTER = ('drop', 'mini', 'uppbyggnad', 'sektion', 'latbyte'); SEK = ('intro', 'vers', 'refrang', 'outro', 'break')
LAS = os.path.join(ENGINE, '.arena', '.sedomlas')

def las_wav(p):
    d = open(p, 'rb').read(); o, start, n = 12, 44, len(d) - 44
    if d[:4] == b'RIFF':
        while o + 8 <= len(d):
            ln = int.from_bytes(d[o + 4:o + 8], 'little')
            if d[o:o + 4] == b'data': start = o + 8; n = min(ln or len(d) - start, len(d) - start); break
            o += 8 + ln + (ln & 1)
    return np.frombuffer(d, dtype='<i2', count=n // 2, offset=start).astype(np.float32) / 32768.0, 48000

def marks(wav):
    hand = os.path.join(ENGINE, wav[:-4] + '.marks-hand.json')
    if os.path.exists(hand):
        d = json.load(open(hand, encoding='utf-8'))
        if d.get('klar'): return [m for m in d['marks'] if not m.get('skip') and not m.get('forslag')], True
    return [m for m in json.load(open(os.path.join(ENGINE, wav[:-4] + '.marks-fin.json'), encoding='utf-8'))['marks'] if not m.get('skip')], False

def kor(mapp, wav, off, ut):
    """ett barn: matar ljudet från off s genom mappens detektor och skriver händelserna"""
    y, sr = las_wav(os.path.join(ENGINE, wav)); y = y[int(off * sr):]
    sys.path.insert(0, os.path.abspath(mapp)); spec = importlib.util.spec_from_file_location('detektor', os.path.join(mapp, 'detektor.py'))
    mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod); det = mod.Detektor(sr); ev = []; t0 = time.process_time()
    for i in range(len(y) // BLOCK):
        for h in det.mata(y[i * BLOCK:(i + 1) * BLOCK]) or ():
            if h in SORTER: ev.append([round(off + (i + 1) * BLOCK / sr, 3), h])
    json.dump(dict(wav=wav, off=off, seconds=len(y) / sr, cpuS=time.process_time() - t0, events=ev), open(ut, 'w'))

def dom(ev, wav, off, dur):
    M, klar = marks(wav); start = off + VARM; slut = off + dur
    E = lambda k: [t for t, h in ev if h == k and t >= start]
    D, Mi, U = E('drop'), E('mini'), E('uppbyggnad')
    agD = [m['fineS'] for m in M if m['kind'] == 'drop' and m['fineS'] >= start]; agM = [m['fineS'] for m in M if m['kind'] == 'mini' and m['fineS'] >= start]
    used = set()
    def traff(s):
        k = [(abs(t - s), j) for j, t in enumerate(D) if j not in used and -FORE <= t - s <= EFTER]
        if not k: return None
        _, j = min(k); used.add(j); return D[j] - s
    dt = [traff(s) for s in agD]; ratt = [x for x in dt if x is not None]; miniFel = sum(1 for s in agM if traff(s) is not None)
    i = lambda L, s: any(-FORE <= t - s <= EFTER for t in L)
    land = agD + agM; sedd = sum(1 for s in land if i(D, s) or i(Mi, s)); medMini = sum(1 for s in land if i(Mi, s))
    m = dict(drop_ratt=len(ratt) / len(agD) if agD else None, drop_precision=len(ratt) / len(D) if D else 0.0,
             mini_ratt=1 - miniFel / len(agM) if agM else None, landning_sedd=sedd / len(land) if land else None,
             mini_precision=min(1.0, medMini / len(Mi)) if Mi else 0.0, uppbyggnad=None)
    upp = None
    if klar:
        par = []
        for u in sorted(x['fineS'] for x in M if x['kind'] == 'uppbyggnad' and x['fineS'] >= start):
            L = next((s for s in sorted(agD + agM) if 0 < s - u <= 20), None)
            if L: par.append((u, L))
        hit = sum(1 for u, L in par if any(u - 1.0 <= t <= L - 0.3 for t in U)); r = hit / len(par) if par else None; p = min(1.0, hit / len(U)) if U else 0.0
        if r is not None: m['uppbyggnad'] = 2 * r * p / (r + p) if r + p else 0.0; upp = dict(hittade=hit, av=len(par), detektorns=len(U))
    v = {k: w for k, w in VIKT.items() if m[k] is not None}; s = 100.0 / sum(v.values())
    sek = [x['fineS'] for x in M if x['kind'] in SEK and x['fineS'] >= start]; lb = [x['fineS'] for x in M if x['kind'] == 'latbyte' and x['fineS'] >= start]
    S, Lb = E('sektion'), E('latbyte'); minuter = (slut - start) / 60
    return dict(matt=m, poang=sum(w * s * m[k] for k, w in v.items()), klar=klar, n=dict(drop=len(agD), mini=len(agM)), traffar=len(ratt), miniSomDrop=miniFel,
                sedda=sedd, absDt=[abs(x) for x in ratt], dropPerMin=len(D) / minuter, miniPerMin=len(Mi) / minuter, detDrop=D, falskaDrop=[t for j, t in enumerate(D) if j not in used],
                missade=[s for s, x in zip(agD, dt) if x is None], upp=upp, sektion=dict(hittade=sum(1 for s in sek if any(abs(t - s) <= 2 for t in S)), av=len(sek), detektorns=len(S)),
                latbyte=dict(hittade=sum(1 for s in lb if any(-2 <= t - s <= 10 for t in Lb)), av=len(lb), detektorns=len(Lb)))

def ko():
    os.makedirs(os.path.dirname(LAS), exist_ok=True); t0 = time.time()
    while True:
        try: os.close(os.open(LAS, os.O_CREAT | os.O_EXCL | os.O_WRONLY)); return
        except FileExistsError:
            try:
                if time.time() - os.path.getmtime(LAS) > 1200: os.remove(LAS)
            except OSError: pass
            if time.time() - t0 > 3600: raise SystemExit('kön: väntat en timme på ' + LAS)
            time.sleep(3)

def sammanfatta(per):
    """per = [(wav, off, dom, cpuS, seconds)] -> medel och spärrar"""
    disk = []; ad = [x for _, _, d, _, _ in per for x in d['absDt']]
    if ad and float(np.median(ad)) > 0.5: disk.append('tid (median %.2f s)' % np.median(ad))
    if any(d['dropPerMin'] > 2.0 for _, _, d, _, _ in per): disk.append('flod (%.1f drop/min)' % max(d['dropPerMin'] for _, _, d, _, _ in per))
    if any(c > s for _, _, _, c, s in per): disk.append('fart (%.0f s cpu för %.0f s ljud)' % max((c, s) for _, _, _, c, s in per))
    K = list(VIKT); med = {k: (float(np.mean([d['matt'][k] for _, _, d, _, _ in per if d['matt'][k] is not None])) if any(d['matt'][k] is not None for _, _, d, _, _ in per) else None) for k in K}
    return dict(poang=float(np.mean([d['poang'] for _, _, d, _, _ in per])), matt=med, disk=disk, medianDt=float(np.median(ad)) if ad else None,
                cpuAndel=float(np.mean([c / s for _, _, _, c, s in per])), per=[dict(wav=w, off=o, cpuS=c, **d) for w, o, d, c, s in per])

def skriv(namn, r):
    f = lambda x: '  - ' if x is None else '%4.0f' % (100 * x)
    print('%-10s POÄNG %5.1f %s' % (namn, r['poang'], ('DISK: ' + ', '.join(r['disk'])) if r['disk'] else 'OK'))
    print('  ' + '  '.join('%s %s' % (k, f(r['matt'][k])) for k in VIKT) + '   (procent)')
    for p in r['per']:
        u = p['upp']
        print('  %s start %4.1f: %5.1f | drop %d/%d, mini som drop %d/%d, sedda %d/%d, falska drop %d (%s), %.1f drop/min, %.1f mini/min%s | sektion %d/%d (%d), låtbyte %d/%d (%d) | cpu %.0f s%s' % (
            os.path.basename(p['wav'])[-10:-4], p['off'], p['poang'], p['traffar'], p['n']['drop'], p['miniSomDrop'], p['n']['mini'], p['sedda'], p['n']['drop'] + p['n']['mini'],
            len(p['falskaDrop']), ' '.join('%.0f' % t for t in p['falskaDrop'][:8]), p['dropPerMin'], p['miniPerMin'], ', uppbyggnad %d/%d (%d)' % (u['hittade'], u['av'], u['detektorns']) if u else '',
            p['sektion']['hittade'], p['sektion']['av'], p['sektion']['detektorns'], p['latbyte']['hittade'], p['latbyte']['av'], p['latbyte']['detektorns'], p['cpuS'], '' if p['klar'] else ' | EJ KLAR FIL: falska ej bevisade'))

if __name__ == '__main__':
    a = sys.argv[1:]
    if a[0] == '--kor': kor(a[1], a[2], float(a[3]), a[4]); sys.exit(0)
    if a[0] == '--raw':
        raw = json.load(open(a[1])); wav = a[2]; ev = [[t, 'drop'] for t in raw['drops']] + [[t, 'mini'] for t in raw['minis']]
        skriv('motorn', sammanfatta([(wav, raw.get('startS', 0.0), dom(ev, wav, raw.get('startS', 0.0), raw['seconds']), 0.0, raw['seconds'])])); sys.exit(0)
    if a[0] == '--rank':
        rad = []
        for n in sorted(os.listdir(a[1])):
            p = os.path.join(a[1], n, 'sedom-holdout.json' if '--holdout' in a else 'sedom.json')
            if os.path.exists(p): r = json.load(open(p)); rad.append((bool(r['disk']), -r['poang'], n, r))
        for _, _, n, r in sorted(rad): skriv(n, r)
        sys.exit(0)
    mapp = a[0]; hold = '--holdout' in a; wavs = KONTROLL if hold else OVNING
    if not os.path.exists(os.path.join(mapp, 'detektor.py')): raise SystemExit('saknar ' + os.path.join(mapp, 'detektor.py'))
    ko()
    try:
        jobb = [(w, o, os.path.join(mapp, 'kor-%s-%d.json' % (os.path.basename(w)[-10:-4], round(o * 10)))) for w in wavs for o in OFFS]; per = []
        for k in range(0, len(jobb), 3):
            pr = [(j, subprocess.Popen([sys.executable, os.path.abspath(__file__), '--kor', mapp, j[0], str(j[1]), j[2]], cwd=ENGINE, stderr=subprocess.PIPE, text=True, encoding='utf-8', errors='replace')) for j in jobb[k:k + 3]]
            for (w, o, ut), p in pr:
                _, err = p.communicate(timeout=3600)
                if p.returncode != 0: raise SystemExit('DETEKTORN FÖLL (%s start %s): %s' % (w, o, (err or '')[-1500:]))
                r = json.load(open(ut)); per.append((w, o, dom(r['events'], w, o, r['seconds']), r['cpuS'], r['seconds']))
    finally:
        try: os.remove(LAS)
        except OSError: pass
    res = sammanfatta(per); json.dump(res, open(os.path.join(mapp, 'sedom-holdout.json' if hold else 'sedom.json'), 'w'), indent=1); skriv(os.path.basename(os.path.normpath(mapp)), res)
