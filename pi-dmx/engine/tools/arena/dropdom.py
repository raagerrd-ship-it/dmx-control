"""DOMAREN FÖR ARENAN 'DROP ELLER MINIDROP - KÄNN IGEN UPPBYGGNADEN' (2026-11-13) - och DELTAGARNAS BRIEF.
Måtten, vikterna, spärrarna och mängderna ändras inte under körningen. Bara ANALYSMÅTT (ägarens regel 11-10).

ÄGAREN (ladan 2026-11-13, tools/natt/grund-2026-11-13.md):
  "Är det ingen uppbyggnad, så är det troligen bara minidrop."  /  "mina minidrop kan vara på fler ställen än vad jag hinner markera"
  "ser du inget i ljudet så är det feltryck"  /  "nattens arena kör bara mot de två inspelningarna vi gjort nu"
  "lamporna blinkar fint idag. bara att jag tror det går trimma till"  -> dagens ljus är godkänd baslinje: TRIMMA, bygg inte om.

FACIT = ägarens knapptryck under inspelningen, finjusterade mot ljudet (tools/natt/bygg-facit/finjustera.py -> <fil>.marks-fin.json;
  fineS = händelsen i ljudet, pressS = knapptrycket, skip = feltryck och räknas inte). Sorter: drop, mini, uppbyggnad, latbyte, intedrop.
  ÖVNING   tools/ladan-2026-11-13/lang-20261113T160345.wav  (602 s: 9 drop, 11 mini, 6 uppbyggnad, 4 "inte drop")
  KONTROLL tools/ladan-2026-11-13/lang-20261113T151659.wav  (532 s: 5 drop, 9 mini, 5 uppbyggnad) - körs bara av orkestratorn (--holdout)
  Deltagare får läsa och mäta ÖVNINGEN fritt. KONTROLLEN får deltagare varken spela, läsa markeringar ur eller lyssna på.

DAGENS LÄGE (bas, båda filerna): motorn kallar 1 av 14 markerade drop för drop (12 blir minidrop, 1 missas); 11 av motorns 12 drop har
  ingen markering; vid 3 av 4 "inte drop" hade den just skjutit en drop; uppbyggnaden (buildUp/inRiser) är 0 % av tiden, för gränserna
  är absoluta nivåer (lvlSmooth > 0,3/0,4, inZone > 0,65) och ren musik ligger på nivå 0,16 i median. Tidpunkten hittar den (inom 0,5 s).

MÅTTEN (per fil, efter 20 s insvängning; en motorhändelse räknas en gång):
  drop_ratt   ägarens DROP som motorn kallar drop: dropCount stiger inom -0,5 .. +1,0 s från fineS                      andel, högre bättre
  mini_ratt   ägarens MINI som motorn INTE kallar drop (ingen drop inom -0,5 .. +1,0 s)                                  andel, högre bättre
  inte_ratt   ägarens "INTE DROP" utan motordrop inom pressS -3,0 .. +0,3 s                                              andel, högre bättre
  precision   motorns drop som träffar en av ägarens drop / alla motorns drop (0 drop = 0)                               andel, högre bättre
  bygg        andel av tiden från uppbyggnadens tryck (pressS) till nästa giltiga drop (fineS) då motorn säger uppbyggnad
              (frame.inRiser eller frame.buildUp > 0,3), medel över uppbyggnaderna                                       andel, högre bättre
  bygg_falsk  andel av ÖVRIG tid (utanför alla uppbyggnader, och inte 2 s efter ett drop) då motorn säger uppbyggnad     redovisas + spärr
POÄNG 0..100 = 40 x drop_ratt + 20 x mini_ratt + 10 x inte_ratt + 20 x precision + 10 x bygg
  (saknar filen "inte drop" fördelas de 10 poängen på de andra i samma proportion). Minidrop-räknaren (miniDropCount) döms inte:
  facit är inte heltäckande och ljuset läser den inte.
SPÄRRAR (DISK):
  tempo        samma tempo som bas (inom 4 %) under 97 % av sekunderna - drop-arbetet får inte röra klockan
  tid          median |motorns drop - fineS| över 0,5 s bland träffarna (ljuset ska slå NÄR det händer)
  flod         motorns drop över 2,0 per minut (ägaren markerar ~0,75/min; dagens ljus är godkänt - ingen dropblixt var 20:e sekund)
  bygg_falsk   över 15 % (uppbyggnaden styr dirigentens val av looks; den får inte ligga på jämt)
  kostnad      analysatorns tid per hopp över 1,5 x bas
  filer        ändrat annat än src/analyser.ts, src/split.ts, src/slowWorker.ts (+ src/ANALYSER_SHARED.md5). effects*, output, dirigenten
               och klockan (analyserClock.ts) är låsta: ljuset är godkänt och klockan har egen domare.
  mätfel       bänken kraschar eller ger tom mätning
REGLER FÖR LÖSNINGEN (står även i uppgiften): inga env-rattar i slutlösningen (konstanter i koden), ingen förstärkning av ljudet in i
  analysatorn som kompensation för nivån (ägaren: "det är ju aldrig bra att först dämpa för att sedan i motorn förstärka igen") - nivågränser
  ska vara relativa mot låtens egen nivå; analysatorn analyserar bara (inget tal valt för hur ljuset ser ut); en källa per storhet.

KOMMANDON (från engine/, PYTHONIOENCODING=utf-8):
  python tools/arena/dropdom.py .arena/<körning>/<id> --mat            mät deltagarens dist på ÖVNINGEN -> <id>/dropdom.json  (~25 s)
  python tools/arena/dropdom.py .arena/<körning>/bas --mat --bas       mät engine/dist som den är
  python tools/arena/dropdom.py .arena/<körning>/<id> --mat --holdout  KONTROLLEN -> <id>/dropdom-k.json  (bara orkestratorn)
  python tools/arena/dropdom.py .arena/<körning> [--holdout] [--md]    ranking mot bas
  Fri sond för deltagare: node tools/natt/bygg-facit/dropMotFacit.mjs <övningsfilen> med egen dist via
    DMX_DIST=<id>/dist NODE_OPTIONS=--import=file:///<engine>/tools/arena/distHook.mjs  (DETALJ=1 ger varje händelse); DMX_DROP_TRACE=1 ger
    analysatorns egna spårrader. Varje --mat räknas mot budgeten i uppgiften.
"""
import sys, os, json, subprocess, hashlib

ENGINE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OVNING = 'tools/ladan-2026-11-13/lang-20261113T160345.wav'
KONTROLL = 'tools/ladan-2026-11-13/lang-20261113T151659.wav'
TILLATNA = {'analyser.ts', 'split.ts', 'slowWorker.ts', 'ANALYSER_SHARED.md5'}
VARM_S, FORE, EFTER = 20.0, 0.5, 1.0

def mat(mapp, bas, holdout):
    wav = KONTROLL if holdout else OVNING; ut = os.path.join(mapp, 'dropdom-k.raw.json' if holdout else 'dropdom.raw.json'); os.makedirs(mapp, exist_ok=True)
    env = dict(os.environ)
    if not bas:
        dist = os.path.abspath(os.path.join(mapp, 'dist'))
        if not os.path.isdir(dist): raise SystemExit('saknar ' + dist + ' (kör tools/arena/bygg.py först)')
        env['DMX_DIST'] = dist; env['NODE_OPTIONS'] = '--import=file:///' + os.path.join(ENGINE, 'tools', 'arena', 'distHook.mjs').replace('\\', '/')
    r = subprocess.run(['node', 'tools/arena/dropdomKor.mjs', wav, ut], cwd=ENGINE, env=env, capture_output=True, text=True, encoding='utf-8', errors='replace')
    if r.returncode != 0 or not os.path.exists(ut): raise SystemExit('MÄTFEL: ' + (r.stderr or r.stdout)[-800:])
    raw = json.load(open(ut, encoding='utf-8')); fin = [m for m in json.load(open(os.path.join(ENGINE, wav[:-4] + '.marks-fin.json'), encoding='utf-8'))['marks'] if not m.get('skip')]
    D = [t for t in raw['drops'] if t >= VARM_S]; used = set()
    agD = [m for m in fin if m['kind'] == 'drop' and m['fineS'] >= VARM_S]; agM = [m for m in fin if m['kind'] == 'mini' and m['fineS'] >= VARM_S]
    agI = [m for m in fin if m['kind'] == 'intedrop' and m['pressS'] >= VARM_S]; agU = [m for m in fin if m['kind'] == 'uppbyggnad' and m['pressS'] >= VARM_S]
    def traff(s):
        k = [(abs(t - s), j) for j, t in enumerate(D) if j not in used and -FORE <= t - s <= EFTER]
        if not k: return None
        _, j = min(k); used.add(j); return D[j] - s
    dt = [traff(m['fineS']) for m in agD]; ratt = [x for x in dt if x is not None]
    miniFel = sum(1 for m in agM if traff(m['fineS']) is not None)
    inteFel = sum(1 for m in agI if any(m['pressS'] - 3.0 <= t <= m['pressS'] + 0.3 for t in D))
    steg = raw['byggStegS']; B = raw['bygg']; ix = lambda s: max(0, min(len(B) - 1, int(s / steg)))
    spann = []
    for u in agU:
        nd = [d['fineS'] for d in agD if -3 <= d['fineS'] - u['pressS'] <= 45]
        if nd: spann.append((min(u['pressS'], min(nd) - 0.5), min(nd)))
    bygg = [sum(B[ix(a):ix(b) + 1]) / max(1, ix(b) + 1 - ix(a)) for a, b in spann]
    ute = [1] * len(B)
    for a, b in spann:
        for i in range(ix(a - 1), ix(b + 2) + 1): ute[i] = 0
    for i in range(0, ix(VARM_S)): ute[i] = 0
    byggFalsk = sum(x for x, u in zip(B, ute) if u) / max(1, sum(ute))
    m = dict(drop_ratt=len(ratt) / max(1, len(agD)), mini_ratt=1 - miniFel / max(1, len(agM)), inte_ratt=(1 - inteFel / len(agI)) if agI else None,
             precision=(len(ratt) / len(D)) if D else 0.0, bygg=(sum(bygg) / len(bygg)) if bygg else 0.0, bygg_falsk=byggFalsk,
             tid=(sorted(abs(x) for x in ratt)[len(ratt) // 2] if ratt else 0.0), flod=len(D) / ((raw['seconds'] - VARM_S) / 60), kostnad=raw['cpuUsPerHop'])
    vikt = dict(drop_ratt=40, mini_ratt=20, inte_ratt=10, precision=20, bygg=10)
    if m['inte_ratt'] is None: s = 100 / 90; vikt = {k: v * s for k, v in vikt.items() if k != 'inte_ratt'}
    poang = sum(v * m[k] for k, v in vikt.items())
    ut2 = dict(wav=wav, n=dict(drop=len(agD), mini=len(agM), inte=len(agI), bygg=len(spann), motorDrop=len(D)), matt=m, poang=poang,
               detalj=dict(dropDt=dt, motorDrop=D, miniSomDrop=miniFel, inteMedDrop=inteFel, byggPerSpann=bygg), bpm=raw['bpm'], sek=raw['sek'])
    json.dump(ut2, open(os.path.join(mapp, 'dropdom-k.json' if holdout else 'dropdom.json'), 'w', encoding='utf-8'), ensure_ascii=False)
    print('%s  poäng %.1f  drop %d/%d  mini rätt %.0f %%  inte %s  precision %.0f %% (%d motordrop)  bygg %.0f %% (falsk %.1f %%)  tid %.2f s' % (
        os.path.basename(mapp), poang, len(ratt), len(agD), 100 * m['mini_ratt'], '-' if m['inte_ratt'] is None else '%.0f %%' % (100 * m['inte_ratt']),
        100 * m['precision'], len(D), 100 * m['bygg'], 100 * m['bygg_falsk'], m['tid']))

def filer(mapp):
    """Ändrade filer i deltagarens src mot engine/src (namn relativt src)."""
    src = os.path.join(mapp, 'src'); ut = []
    if not os.path.isdir(src): return ut
    h = lambda p: hashlib.md5(open(p, 'rb').read().replace(b'\r\n', b'\n')).hexdigest()
    for rot, _, fs in os.walk(src):
        for f in fs:
            p = os.path.join(rot, f); rel = os.path.relpath(p, src).replace('\\', '/'); q = os.path.join(ENGINE, 'src', rel)
            if not os.path.exists(q) or h(p) != h(q): ut.append(rel)
    return ut

def ranking(korning, holdout, md):
    namn = 'dropdom-k.json' if holdout else 'dropdom.json'; bas = json.load(open(os.path.join(korning, 'bas', namn), encoding='utf-8')); rader = []
    for d in sorted(os.listdir(korning)):
        p = os.path.join(korning, d, namn)
        if not os.path.exists(p): continue
        r = json.load(open(p, encoding='utf-8')); m = r['matt']; disk = []
        sam = sum(1 for a, b in zip(r['bpm'], bas['bpm']) if (a == 0 and b == 0) or (a > 0 and b > 0 and abs(a / b - 1) < 0.04)) / max(1, len(bas['bpm']))
        if sam < 0.97: disk.append('tempo %.0f %%' % (100 * sam))
        if m['tid'] > 0.5: disk.append('tid %.2f s' % m['tid'])
        if m['flod'] > 2.0: disk.append('flod %.1f/min' % m['flod'])
        if m['bygg_falsk'] > 0.15: disk.append('bygg_falsk %.0f %%' % (100 * m['bygg_falsk']))
        if m['kostnad'] > 1.5 * bas['matt']['kostnad']: disk.append('kostnad x%.2f' % (m['kostnad'] / bas['matt']['kostnad']))
        fel = [f for f in filer(os.path.join(korning, d)) if f not in TILLATNA]
        if fel: disk.append('filer: ' + ', '.join(fel[:4]))
        sek = sum(1 for a, b in zip(r['sek'], bas['sek']) if a == b) / max(1, len(bas['sek']))
        rader.append((r['poang'], d, r, disk, sam, sek))
    rader.sort(key=lambda x: (bool(x[3]), -x[0]))
    kol = 'plats | id | poäng | mot bas | drop | mini rätt | inte | precision | bygg | bygg falsk | drop/min | tid s | tempo = bas | sektion = bas | DISK'
    print(('| ' + kol + ' |\n|' + '---|' * 15) if md else kol)
    for i, (po, d, r, disk, sam, sek) in enumerate(rader):
        m = r['matt']; n = r['n']
        c = [str(i + 1), d, '%.1f' % po, '%+.1f' % (po - bas['poang']), '%d/%d' % (round(m['drop_ratt'] * n['drop']), n['drop']), '%.0f %%' % (100 * m['mini_ratt']),
             '-' if m['inte_ratt'] is None else '%.0f %%' % (100 * m['inte_ratt']), '%.0f %% (%d)' % (100 * m['precision'], n['motorDrop']), '%.0f %%' % (100 * m['bygg']),
             '%.1f %%' % (100 * m['bygg_falsk']), '%.2f' % m['flod'], '%.2f' % m['tid'], '%.0f %%' % (100 * sam), '%.0f %%' % (100 * sek), '; '.join(disk) or 'OK']
        print(('| ' + ' | '.join(c) + ' |') if md else '  '.join(c))

if __name__ == '__main__':
    a = sys.argv[1:]; mapp = a[0]
    if '--mat' in a: mat(mapp, '--bas' in a, '--holdout' in a)
    else: ranking(mapp, '--holdout' in a, '--md' in a)
