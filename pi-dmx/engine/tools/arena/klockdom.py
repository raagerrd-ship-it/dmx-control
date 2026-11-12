"""DOMAREN FÖR ARENAN 'KLOCKAN HÅLLER EN TOLKNING' (klocka2, 2026-11-12) - och DELTAGARNAS BRIEF.
Måtten, vikterna, golven och mängderna ändras inte under körningen. Bara ANALYSMÅTT (ägarens regel 11-10); ljusmått diskar inte här.

UPPGIFTEN (tools/natt/todo.md, <körning>/uppgift.md): klockan i den delade analysatorn ska hålla EN tempotolkning genom en låt:
  (1) färre växlingar mellan syskontempon (4:3, 3:4, 3:2, 2:3, dubbla, halva) inom en låt, (2) rätt tolkning oftare,
  (3) utan att låsningen efter låtbyte eller vid svaga låtstarter blir långsammare.
  TILLÅTNA FILER i <mapp>/src: analyserClock.ts, analyser.ts (tempodelen), split.ts, slowWorker.ts. Annat ändrat = DISK. tools/ ändras inte.

KOMMANDON (från engine/, PYTHONIOENCODING=utf-8)
  python tools/arena/bygg.py .arena/klocka2/<mapp>                 bygg <mapp>/src -> <mapp>/dist (krävs före --mat)
  python tools/arena/klockdom.py .arena/klocka2/<mapp> --mat       EN MÄTNING på övningsmängden -> <mapp>/klockdom.json (räknas mot budgeten)
  python tools/arena/klockdom.py .arena/klocka2 [--md]             rangordning av alla mätta mappar mot bas (--md skriver ranking-klockdom.md)
  Bara domaren/orkestratorn:
    ... --mat --bas            bas = engine/dist + engine/src (mappen behöver inget src)
    ... --mat --holdout        KONTROLLMÄNGDEN (DMX-delen + källarens kontrollklipp) -> klockdom-holdout.json. Deltagarna mäter ALDRIG den.
    ... --mat --final          lotusbanken på hela 503 filer i stället för --snabb (126). Finalen = --holdout --final.
    ... <körning> --holdout    rangordning på kontrollmängden (läser klockdom-holdout.json)
    ... <körning>/bas --urval  spelar alla källarklipp mot bas och skriver <körning>/kallaren/urval.json (görs EN gång; --mat --bas gör
                               det själv om filen saknas)
  LÅS: en mätning åt gången (.arena/.banklas, samma lås som bank.py/tvavagar.py; --mat väntar på sin tur). Inuti körs högst två jobb parallellt.

POÄNG = medel av de 12 måtten, vart och ett i % mot bas: riktning x (v - bas) / max(|bas|, golv) x 100, klippt till +-100 %. LIKA VIKT.
  + = bättre. Ett mått som saknas (källaren utan klipp) räknas inte med. DISK (spärrarna nedan) = sist, oavsett poäng.

MÅTTEN (nyckel, riktning, golv; mängden står under MÄNGDERNA)
  DMX-kedjan = motorns: createAnalyser(BeatFeed.analyserCfg(cfg), 'inline') + BoundaryDetector/hintTrackChange + hopLane.feed, klockan =
  cfg.beat.bpm (takten matas med src/beatFeed.ts som i motorn), virtuell klocka -> bit-identiskt mellan körningar.
  mix_klocka   + golv 1      tvavagarKor.mjs jobb mix (tempoMix): andel tid klockan = katalogfacit (+-4 %, alt godkänt) i MIXEN, %
  mix_las      - golv 1 s    samma: median s från övertoningens slut tills klockan är rätt och håller >= 2 s
  mix_hopp     - golv 0,2    samma: klockans tempobyten inom låt per min (från 8 s efter övertoningen)
  mix_still    - golv 1 s    samma: median s från övertoningens slut tills klockan står inom +-1 % i 5 s i följd
  klipp_klocka + golv 1      tvavagarKor.mjs jobb klipp (taktKorpus): klippen var för sig, kallstart, klockan rätt efter 5 s (snitt, %)
  utfl_min     - golv 0,2    tools/tempoHoppDiag.mjs + tempoHoppUtflykt.mjs på mixen + de långa inspelningarna: utflykter per min
                             (klockan lämnar ett hållet tempo > 4 % och är TILLBAKA inom 2 % inom 15 s), TOTALT-raden
  utfl_tid     - golv 1      samma: andel tid i utflykt, %
  syskon_tid   - golv 1      NYTT. Andel av tiden (%) klockan står på ett SYSKONTEMPO: inte rätt (+-4 %) men inom +-4 % av
                             4:3, 3:4, 3:2, 2:3, 2:1 eller 1:2 gånger referensen (rakt eller vikt till 80-160). Samma körningar som utflykterna
                             (tempoHoppDiag: klockan var 100 ms). Referens i MIXEN = låtens katalogfacit (alt godkänt), räknat från 8 s
                             efter övertoningen -> fångar både växling och att SITTA fel. Referens i de LÅNGA inspelningarna (inget facit) =
                             det dominerande tempot hos klockan själv i fönstret +-30 s (2 %-fack, tre fack i bredd), räknat från 10 s ->
                             fångar växling. Alla prov i nämnaren (även klocka 0). Tidsviktat över alla filer.
  lotus_ratt   + golv 1      tools/arena/lotusbank.py:s körning (lotus bench.mjs på en lotus-analysator byggd av <mapp>/src, den ODELADE vägen =
                             klockan i process()): antal korpusfiler med rätt tempo (klass lika). --snabb = var 4:e fil (126), finalen 503.
  lotus_syskon - golv 5      samma: antal korpusfiler i syskonklasserna 4/3 + 3/2 + dubbla + halva (+ 3/4 + 2/3, som är 0 hos bas på 503:
                             en variant ska inte kunna flytta ett 4/3-fel till 3/4 och få poäng)
  lotus_vaxling - golv 5     NYTT. Källarfelet på inspelat material: antal korpusfiler i samma körning där klockans tempo INOM klippet
                             spänner över ett syskontempo: SPANN_KVOT = q75/q25 >= 1,28 (= 4/3 - 4 %) över klippets prov efter 10 s
                             uppvärmning (bänkens raster, ~10 Hz, bpm > 0). q25..q75 valdes före start för att det skiljer bäst hos bas
                             (se VAXLING_SPANN nedan); min..max redovisas bredvid (lotus.vaxling_minmax) men räknas inte.
  kallaren     - golv 0,5    NYTT. Källarklippen (<körning>/kallaren/v-*.wav, 150 s från lotus-micen medan klockan växlade 11-12) spelade med
                             tools/arena/kallarspel.mjs mot <mapp>/lotus/dist/audio-analyser/index.js (LOTUS_ANALYSER_SPLIT='' som bänken):
                             tempobyten per min, där ett byte = två sekundprov i följd (bpm > 0, efter 10 s) som skiljer > 12 %.
                             Bara klippen i <körning>/kallaren/urval.json: de där BAS återskapar växlingen motorn hade live (klippets .csv):
                             live >= 2 byten, bas >= 2 byten och tidsfördelningen per tempo (4 BPM-fack) överlappar >= 50 %.
                             Varannat godkänt klipp i tidsordning är övning, resten kontroll.

SPÄRRAR (DISK med skäl)
  lotus_ratt < bas;  syntet (lotusbänkens 8 syntfiler, antal rätt) < bas;
  ÄGARBESLUT 2026-11-12 22:12 (under körningen klocka2, gäller alla lika): "Lotus fas borde ju få bli kanske 5% sämre utan att bli
  diskad. Kan ju vara mätfel osv." + 22:16: "Samt för mig är det allra viktigaste DMX, lotus inte lika." -> de lotus-specifika
  fas-spärrarna (fas-median, on-beat, andel i fas, andel i motfas) diskar först vid mer än 5 % (relativt) sämre än bas (LOTUS_REL;
  de tre sista är huvudchattens tolkning av 22:16). DMX-spärrarna (mix_still, mix_las, klipp_klocka, syntet) orörda.
  RÄTTAT 23:1x (orkestratorn): 5 % relativt på andelen i motfas (bas 6/114) blev STRÄNGARE än den gamla gränsen ± 1 procentenhet
  (k4b föll på 7/114). Marginalen skulle vidga, aldrig snäva: i fas/motfas diskar nu först när BÅDE 5 % relativt och 1 pe är passerade.
  ÄGARBESLUT 22:22 (huvudchatten frågade om även lotus_ratt ska få marginal): "Ja om det bara påverkar lotus." -> lotus_ratt diskar
  först under bas x 0,99 (RATT_REL). 1 % och inte 5 % är huvudchattens val: 5 % vore 23 låtar på kontrollmängden = en riktig försämring.
  lotusbankens egen spärr: on-beat-recall < bas, fas-medianen < bas (båda som bänken skriver dem, två decimaler), andelen i motfas
    (motfas/n) > bas + 1 procentenhet, andelen i fas (i fas/n) < bas - 1 procentenhet (andelar: n ändras när fler filer hamnar i rätt oktav);
  mix_las > bas + 0,3 s;  mix_still > bas + 0,3 s;  klipp_klocka < bas - 1 procentenhet;
  ändrade filer utanför de tillåtna;  mätfel/ofullständig mätning;  lotusbanken mätt på annan mängd än bas (snabb mot final).
  INTE HÄR: upp_s/ned_s <= bas + 0,1 s, andelen 'high' <= bas + 10 pe, workerns taktväg p99 och kostnad, övriga fält +0,0 (sektion, drop,
  kick, nivåer), nya objekt per hop i heta loopar. ORKESTRATORN kör tools/arena/tvavagar.py --mat på FINALISTERNA för dem.

MÄNGDERNA (FASTA)
  ÖVNING    mix:   tvavagar.latar(KORPUS_OVNING, 9) = 16 låtar, 42 min ('ovn')
            klipp: KORPUS_OVNING (50 klipp ur frozen6)
            långa: pop_ladan, megamix_ladan, lang1021 (5 min), lang1011 (191741), lang1028 - med mixen 86,7 min (flerhypotes-2026-11-10: träning)
            lotus: bench-manifest.txt var 4:e fil (126) + 8 syntfiler;  källaren: urval.json 'ovning'
  KONTROLL  (--holdout) mix: latar(KORPUS_HOLDOUT, 6) = 8 låtar, 21 min ('kon');  klipp: KORPUS_HOLDOUT (17);  långa: lang1014, lang1107
            (med mixen 40,9 min);  källaren: urval.json 'kontroll';  lotus (--final): hela manifestet, 503 filer.

VAD JSON:EN INNEHÅLLER (<mapp>/klockdom.json; kontroll: klockdom-holdout.json) - så du ser VAR du förlorar
  matt         de 12 måtten (+ informativt: lotus_vaxling_minmax, syskon_tid_mix, syskon_tid_lang)
  sparr        syntet, lotusOnBeat, lotusFas {median, motfas, ifas, n}, andradeFiler
  mix          tvavagarKor-resultatet för mixen (klocka, lasMed, stillMed, still per låt, hoppMin, hopp ...)
  mixLatar     per låt i mixen (tempoHoppDiag): f, tf (facit), ok %, sib % (syskon 4:3/3:2-familjen), sibIn, lock s
  klipp        per klipp: file, klocka (andel rätt efter 5 s)
  utflykt      per fil: min, n, perMin, tidPct, syskon och listan av utflykter {t, from, to, dur, sib, conf}
  syskon       per fil: pct, syskonS, s (+ per låt i mixen under mixLatar[].syskonPct)
  lotus        korpus {ok, n, klasser}, synt, vaxling_minmax och filer[]: i, fil (korpusens json-namn), namn, facit, analys, klass,
               min, max, q25, q75, vaxling (q-spannet rymmer ett syskon), vaxlingMinmax
  kallaren     per klipp: byten, min, perMin, topp (tid per tempo)
  fel, tider, tidS
  Bredvid ligger <mapp>/klockdom/ (kontroll: klockdom-holdout/): tempoHoppDiag-utdata per fil (<namn>.json: samp = [t, klocka, tillit,
  tempoBpm, tgClear, repeatRate, onBeatRate, coast] var 100 ms + ev = tempobytena), lotusbank.out (bänkens hela utskrift, rad per fil),
  lotus-serie.json (klockans tempo ~10 Hz efter uppvärmningen, per fil i bänkens ordning) och kallaren/<klipp>.csv (tempo per sekund).
  Basens motsvarigheter ligger i <körning>/bas/ - jämför fil för fil. bas/lotus-syskonspann.md = korpusfilerna med syskonspann hos bas.

KÖRTID (mätt 11-12): --mat övning 4,5-5,5 min (lotus --snabb 150 s, mix 85 s, klipp 65 s, tempoHoppDiag 170 s, källaren 20 s, på två banor);
  --holdout --final ~8 min (lotus 503 = 480 s styr).

FRIA SONDER (räknas INTE mot budgeten; bara klockan, bara ÖVNINGSFILER, ta inte låset, högst en process åt gången per deltagare):
  node tools/tempoHoppDiag.mjs .arena/klocka2/<mapp>/dist <lista.json> <ut.json>      (lista: .arena/klocka2/bas/klockdom/<namn>.lista.json,
       namn = ovn, pop, mega, l1021, l1011, l1028; ~10 s per 5 min ljud) och sedan  V=1 node tools/tempoHoppUtflykt.mjs <ut.json>
  node tools/arena/kallarspel.mjs .arena/klocka2/<mapp>/lotus/dist/audio-analyser/index.js .arena/klocka2/kallaren/<övningsklipp>.wav ut.csv
       (med LOTUS_ANALYSER_SPLIT= tomt i env; ~5 s per klipp; lotusbygget görs av --mat, eller utan mätning:
        python -c "import sys; sys.path.insert(0,'tools/arena'); import lotusbank as L, os; L.bygg(os.path.abspath('.arena/klocka2/<mapp>'), os.path.abspath('.arena/klocka2/<mapp>/src'), False)")
  Inte fritt: tvavagarKor.mjs, lotusbank.py/bench.mjs, allt på kontrollmängden (kon, l1014, l1107, KORPUS_HOLDOUT, urval 'kontroll').

MÄTFÄLLOR: bänkarna flyttar Date.now med ljudtiden (virtuell klocka) - två körningar av samma kod ger exakt samma tal, så varje skillnad
  mot bas är din ändring. megamix_ladan.wav har trasigt huvud (läsarna här klarar det). lotus-light-link LÄSES bara. Inga länkar/junctions.
  tempoHoppDiag lindar BeatFeed.update/tgStep/peakVote/relock om de finns; byter du namn på dem försvinner bara diagnoskolumnerna, inte måtten.
"""
import argparse, io, json, math, os, re, subprocess, sys, time
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__)); ENGINE = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
import tvavagar as T      # latar, kor (tvavagarKor.mjs), rel, låset, mkenv/basenv, mängderna
import lotusbank as LB    # lotusbygget, bänkens env och tolkning

# (nyckel, riktning, golv) - LIKA VIKT
MATT = [('mix_klocka', 1, 1), ('mix_las', -1, 1), ('mix_hopp', -1, 0.2), ('mix_still', -1, 1), ('klipp_klocka', 1, 1),
        ('utfl_min', -1, 0.2), ('utfl_tid', -1, 1), ('syskon_tid', -1, 1),
        ('lotus_ratt', 1, 1), ('lotus_syskon', -1, 5), ('lotus_vaxling', -1, 5), ('kallaren', -1, 0.5)]
LAS_TOL, STILL_TOL, KLIPP_TOL, FAS_TOL = 0.3, 0.3, 1.0, 0.01
TILLATNA = {'analyserClock.ts', 'analyser.ts', 'split.ts', 'slowWorker.ts'}
SYSKON = [4 / 3, 3 / 4, 3 / 2, 2 / 3, 2.0, 0.5]; TOL = 0.04
SYSKONKLASSER = ['4/3', '3/2', 'dubbla', 'halva', '3/4', '2/3']
SPANN_KVOT = 4 / 3 * (1 - TOL)     # spannet rymmer ett syskontempo: övre/nedre >= 1,28
# VAXLING_SPANN: q25..q75 ('q') eller min..max ('mm') efter uppvärmningen. Valt på basens körning (503 filer) före start: q flaggar 82 filer
# (15 av 26 syskonfel, 56 av 463 rätta = 58 % mot 12 %, kvot 4,8); min..max flaggar 226 (24 av 26 mot 189 av 463 = 92 % mot 41 %, kvot 2,2:
# ett enda prov under inlåsningen räcker). q skiljer bäst.
VAXLING_SPANN = 'q'
KALLAR_BYTE, KALLAR_MIN_BYTEN, KALLAR_OVERLAPP = 0.12, 2, 0.5
RATT_REL = 0.01    # ägaren 11-12 22:22: lotus_ratt diskar först > 1 % under bas (övning 116 -> en låt, kontroll 463 -> fyra låtar)
LOTUS_REL = 0.05   # ägaren 11-12 22:12 + 22:16: lotus fas-spärrarna (median, on-beat, i fas, motfas) diskar först vid > 5 % relativt sämre än bas
L1011, L1028 = 'tools/ladan-2026-10-11/lang-20261011T191741.wav', 'tools/ladan-2026-10-28/lang-20261028T180531.wav'
LANG = {False: [('pop', T.POP), ('mega', T.MEGA), ('l1021', T.L1021), ('l1011', L1011), ('l1028', L1028)],
        True: [('l1014', T.L1014), ('l1107', T.L1107)]}
MIXNAMN = {False: 'ovn', True: 'kon'}

ENTRY = r"""// klockdom.py: som lotusbank.py:s benchEntry.mjs + klockans tempo per fil (bänkens raster: efter 10 s, var 38:e hop, bpm > 0).
import * as M from './benchEntry.mjs';
import { writeFileSync } from 'node:fs';
export * from './benchEntry.mjs';
const all = [];
export function createAnalyser(cfg, mode) {
  const an = M.createAnalyser(cfg, mode);
  const warm = Math.floor(10 * cfg.sampleRate / cfg.hopSize), s = []; all.push(s); let hop = 0;
  const proc = an.process.bind(an);
  an.process = (buf) => { const f = proc(buf); hop++; if (hop > warm && hop % 38 === 0 && f && f.bpm > 0) s.push(+f.bpm.toFixed(2)); return f; };
  return an;
}
process.on('exit', () => { if (process.env.KLOCKDOM_SERIE) writeFileSync(process.env.KLOCKDOM_SERIE, JSON.stringify(all)); });
"""


def fold(b):
    while b < 80: b *= 2
    while b >= 160: b /= 2
    return b
nara = lambda a, b: abs(a / b - 1) <= TOL
ratt = lambda b, tf: b > 0 and any(nara(fold(b), t) for t in tf)                       # = okBpm i tvavagarKor/tempoHoppDiag
syskon = lambda b, tf: b > 0 and not ratt(b, tf) and any(nara(b, t * q) or nara(fold(b), fold(t * q)) for t in tf for q in SYSKON)
skriv = lambda p, o: io.open(p, 'w', encoding='utf-8').write(json.dumps(o, ensure_ascii=False, indent=1))


def node(cmd, env, timeout=3600, cwd=ENGINE):
    r = subprocess.run(['node'] + cmd, cwd=cwd, env=env, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=timeout)
    if r.returncode: raise RuntimeError(' '.join(os.path.basename(str(c)) for c in cmd[:2]) + ': ' + (r.stderr or r.stdout)[-600:])
    return r.stdout


# ── DMX-DELEN: tempoHoppDiag -> utflykter + syskon_tid ──
def diag(dist, env, ut, namn, lista):
    li = os.path.join(ut, namn + '.lista.json'); io.open(li, 'w', encoding='utf-8').write(json.dumps(lista))
    node(['tools/tempoHoppDiag.mjs', dist, li, os.path.join(ut, namn + '.json')], env)


def utflykter(ut, namn, env):
    """tools/tempoHoppUtflykt.mjs (V=1) på alla diag-filerna: TOTALT-raden = måtten, raderna per fil + listan = detaljen."""
    txt = node(['tools/tempoHoppUtflykt.mjs'] + [os.path.join(ut, n + '.json') for n in namn], dict(env, V='1'))
    rad = r'\s+([\d.]+) min\s+utflykter (\d+) \(([\d.]+)/min, syskon (\d+)\)\s+tid i utflykt ([\d.]+) %'
    per, cur, tot = {}, None, None
    for l in txt.splitlines():
        m = re.match(r'^TOTALT' + rad, l)
        if m: tot = {'min': float(m.group(1)), 'n': int(m.group(2)), 'perMin': float(m.group(3)), 'syskon': int(m.group(4)), 'tidPct': float(m.group(5))}; continue
        m = re.match(r'^(\S+)\.json' + rad, l)
        if m: cur = m.group(1); per[cur] = {'min': float(m.group(2)), 'n': int(m.group(3)), 'perMin': float(m.group(4)), 'syskon': int(m.group(5)), 'tidPct': float(m.group(6)), 'lista': []}; continue
        if cur and l.strip().startswith('{'): per[cur]['lista'].append(json.loads(l))
    if not tot: raise RuntimeError('tempoHoppUtflykt: ingen TOTALT-rad: ' + txt[-300:])
    return tot, per


def syskon_fil(d):
    """Syskontid i en tempoHoppDiag-fil -> (syskonprov, prov, per låt). Mixen (flera seg med facit): mot facit från 8 s in i låten.
    Lång inspelning (ett seg, platshållarfacit): mot klockans eget dominerande tempo i fönstret +-30 s, från 10 s."""
    samp = d['samp']; seg = d['seg']
    if len(seg) > 1:
        sib = n = 0; per = []
        for s in seg:
            a = b = 0
            for r in samp:
                t = r[0] * 1000
                if t < s['t0'] + 8000 or t >= s['t1']: continue
                b += 1; a += 1 if syskon(r[1], s['tf']) else 0
            per.append(round(100 * a / max(1, b), 2)); sib += a; n += b
        return sib, n, per
    LG = math.log(1.02); W = 300; N = len(samp)
    fack = [int(round(math.log(r[1]) / LG)) if r[1] > 0 else None for r in samp]
    hist = {}; sib = n = 0; hi = -1
    for i in range(N):
        while hi < min(N - 1, i + W):
            hi += 1
            if fack[hi] is not None: hist[fack[hi]] = hist.get(fack[hi], 0) + 1
        if i - W - 1 >= 0 and fack[i - W - 1] is not None: hist[fack[i - W - 1]] -= 1
        if samp[i][0] < 10: continue
        n += 1; b = samp[i][1]
        if not (b > 0): continue
        k = max(sorted(hist), key=lambda k: hist.get(k - 1, 0) + hist[k] + hist.get(k + 1, 0))   # sorted: lika -> lägsta facket (bestämt)
        ref = math.exp(k * LG)
        if not nara(b, ref) and any(nara(b, ref * q) or nara(fold(b), fold(ref * q)) for q in SYSKON): sib += 1
    return sib, n, None


# ── LOTUS-DELEN: lotusbank.py:s bygge + bänk, med klockans tempo per fil ──
def lotus_bygg(mapp, bas):
    srcdir = os.path.join(ENGINE, 'src') if bas else os.path.join(mapp, 'src')
    assert all(os.path.exists(os.path.join(srcdir, f)) for f in LB.SHARED), f'saknar {LB.SHARED} i {srcdir}'
    LB.bygg(mapp, srcdir, False)
    entry = os.path.join(mapp, 'lotus', 'dist', 'klockEntry.mjs'); io.open(entry, 'w', encoding='utf-8').write(ENTRY)
    return entry


def korpusfiler(man):
    """Bänkens filordning (bench.mjs: sorterade json i manifestet, utan brus och utan facit) -> json-namnen, för att namnge raderna."""
    keep = set(x.strip() for x in io.open(man, encoding='utf-8') if x.strip()); cdir = os.path.join(LB.BENCHDIR, 'corpus'); out = []
    for f in sorted(x for x in os.listdir(cdir) if x.endswith('.json') and x in keep):
        if not os.path.exists(os.path.join(cdir, f[:-5] + '.wav')): continue
        try: res = json.load(io.open(os.path.join(cdir, f), encoding='utf-8')).get('result') or {}
        except Exception: res = {}
        if res.get('method') == 'brus' or ((res.get('quality') or {}).get('ok') is False): continue
        if not res.get('bpm') and not (((res.get('analysis') or {}).get('sections') or {}).get('segments')): continue
        out.append(f)
    return out


def spann(s):
    q = sorted(s); n = len(q)
    if not n: return {'min': 0, 'max': 0, 'q25': 0, 'q75': 0, 'vaxling': False, 'vaxlingMinmax': False}
    q25, q75 = q[min(n - 1, int(0.25 * n))], q[min(n - 1, int(0.75 * n))]    # som bench.mjs q(p)
    return {'min': q[0], 'max': q[-1], 'q25': q25, 'q75': q75, 'vaxling': q75 / q25 >= SPANN_KVOT, 'vaxlingMinmax': q[-1] / q[0] >= SPANN_KVOT}


def lotus(mapp, entry, ut, final):
    man = os.path.join(LB.BENCHDIR, 'bench-manifest.txt')
    if not final:
        rows = sorted(x.strip() for x in io.open(man, encoding='utf-8') if x.strip())
        man = os.path.join(ut, 'manifest-snabb.txt'); io.open(man, 'w', encoding='utf-8').write('\n'.join(rows[::4]) + '\n')   # = lotusbank.py --snabb
    serie = os.path.join(ut, 'lotus-serie.json')
    if os.path.exists(serie): os.remove(serie)
    env = dict(os.environ, **LB.LIVE, BENCH_MANIFEST=man, KLOCKDOM_SERIE=serie)
    r = subprocess.run(['node', os.path.join(LB.BENCHDIR, 'bench.mjs'), '--analyser', entry, '--dir', os.path.join(LB.BENCHDIR, 'corpus'), '--synth', os.path.join(LB.BENCHDIR, 'corpus-synth')],
                       cwd=ut, env=env, capture_output=True, encoding='utf-8', errors='replace', timeout=7200)
    io.open(os.path.join(ut, 'lotusbank.out'), 'w', encoding='utf-8').write(r.stdout + ('\n--- stderr ---\n' + r.stderr if r.stderr else ''))
    res = LB.tolka(r.stdout)
    if r.returncode or not res.get('korpus') or not res.get('synt'): raise RuntimeError('bench.mjs: ' + (r.stderr or r.stdout)[-600:])
    rader = [m.groups() for m in (re.match(r'^(korpus|synt)\s+(.*?)\s+(\d+\.\d)\s+(\d+\.\d)\s+(\d+\.\d)\s+(\d+)–(\d+)\s+(\d\.\d\d)\s+(\S+)\s+(\d+\.\d\d)', l) for l in r.stdout.splitlines()) if m]
    S = json.load(io.open(serie, encoding='utf-8'))
    if len(S) != len(rader): raise RuntimeError(f'lotus: {len(rader)} rader men {len(S)} tempoföljder')
    namn = korpusfiler(man); nk = sum(1 for x in rader if x[0] == 'korpus')
    filer = []
    for i, (x, s) in enumerate(zip(rader, S)):
        filer.append({'i': i, 'set': x[0], 'fil': namn[i] if x[0] == 'korpus' and len(namn) == nk else None, 'namn': x[1], 'facit': float(x[2]), 'analys': float(x[3]), 'klass': x[8], **spann(s)})
    kf = [f for f in filer if f['set'] == 'korpus']
    return {**res, 'final': final, 'manifest': os.path.relpath(man, ENGINE), 'vaxling_q': sum(f['vaxling'] for f in kf), 'vaxling_minmax': sum(f['vaxlingMinmax'] for f in kf), 'filer': filer}


# ── KÄLLAREN ──
def kallar_csv(p, col=1):
    out = []
    for l in io.open(p, encoding='utf-8').read().splitlines()[1:]:
        x = l.split(',')
        try: out.append((float(x[0]), float(x[col])))
        except Exception: pass
    return out


def kallar_stat(v):
    v = [b for t, b in v if t >= 10 and b > 0]
    byten = sum(1 for i in range(1, len(v)) if abs(v[i] / v[i - 1] - 1) > KALLAR_BYTE)
    h = {}
    for b in v: k = int(round(b / 4)) * 4; h[k] = h.get(k, 0) + 1
    return {'byten': byten, 'min': round(len(v) / 60, 3), 'perMin': round(byten / max(1e-9, len(v) / 60), 3), 'topp': {str(k): round(c / len(v), 3) for k, c in sorted(h.items(), key=lambda x: -x[1])[:6]},
            '_h': {k: c / max(1, len(v)) for k, c in h.items()}}


def kallar_spela(mapp, ut, klipp, kdir):
    an = os.path.join(mapp, 'lotus', 'dist', 'audio-analyser', 'index.js'); os.makedirs(os.path.join(ut, 'kallaren'), exist_ok=True); out = {}
    for k in klipp:
        csvp = os.path.join(ut, 'kallaren', k + '.csv')
        node([os.path.join(HERE, 'kallarspel.mjs'), an, os.path.join(kdir, k + '.wav'), csvp], dict(os.environ, LOTUS_ANALYSER_SPLIT=''))
        out[k] = kallar_stat(kallar_csv(csvp))
    return out


def urval(mapp):
    """Spelar ALLA källarklipp mot basens lotusbygge och avgör vilka som återskapar växlingen motorn hade live -> <körning>/kallaren/urval.json."""
    run_dir = os.path.dirname(mapp); kdir = os.path.join(run_dir, 'kallaren'); ut = os.path.join(mapp, 'klockdom-urval'); os.makedirs(ut, exist_ok=True)
    if not os.path.exists(os.path.join(mapp, 'lotus', 'dist', 'audio-analyser', 'index.js')): lotus_bygg(mapp, True)
    klipp = sorted(f[:-4] for f in os.listdir(kdir) if re.match(r'^v-\d+\.wav$', f) and os.path.exists(os.path.join(kdir, f[:-4] + '.csv')))
    B = kallar_spela(mapp, ut, klipp, kdir); rader = []; ok = []
    for k in klipp:
        L = kallar_stat(kallar_csv(os.path.join(kdir, k + '.csv'))); b = B[k]
        ov = sum(min(L['_h'].get(x, 0), b['_h'].get(x, 0)) for x in set(L['_h']) | set(b['_h']))
        god = L['byten'] >= KALLAR_MIN_BYTEN and b['byten'] >= KALLAR_MIN_BYTEN and ov >= KALLAR_OVERLAPP
        if god: ok.append(k)
        rader.append({'klipp': k, 'liveByten': L['byten'], 'basByten': b['byten'], 'overlapp': round(ov, 3), 'liveTopp': L['topp'], 'basTopp': b['topp'], 'aterskapar': god})
    out = {'kriterium': f'live >= {KALLAR_MIN_BYTEN} byten (> {KALLAR_BYTE:.0%} mellan sekundprov efter 10 s), bas >= {KALLAR_MIN_BYTEN} byten och tidsfördelningen per tempo (4 BPM-fack) överlappar >= {KALLAR_OVERLAPP:.0%}',
           'git': git(), 'klipp': rader, 'ovning': ok[0::2], 'kontroll': ok[1::2]}
    skriv(os.path.join(kdir, 'urval.json'), out)
    print(f"URVAL: {len(ok)} av {len(klipp)} klipp återskapar växlingen. övning {out['ovning']}  kontroll {out['kontroll']}")
    for r in rader: print(f"  {r['klipp']}  live {r['liveByten']:2d} byten  bas {r['basByten']:2d}  överlapp {r['overlapp']:.2f}  {'JA' if r['aterskapar'] else 'nej'}")
    return out


def git(): return subprocess.run(['git', 'rev-parse', '--short', 'HEAD'], cwd=ENGINE, capture_output=True, text=True).stdout.strip()


def andrade(mapp):
    out = []; es = os.path.join(ENGINE, 'src'); ms = os.path.join(mapp, 'src')
    for root, _, fs in os.walk(ms):
        for f in fs:
            p = os.path.join(root, f); q = os.path.join(es, os.path.relpath(p, ms))
            if not os.path.exists(q) or io.open(p, 'rb').read().replace(b'\r\n', b'\n') != io.open(q, 'rb').read().replace(b'\r\n', b'\n'): out.append(os.path.relpath(p, ms).replace('\\', '/'))
    for root, _, fs in os.walk(es):
        for f in fs:
            r = os.path.relpath(os.path.join(root, f), es)
            if not os.path.exists(os.path.join(ms, r)): out.append('(borttagen) ' + r.replace('\\', '/'))
    return sorted(out)


def mat(a):
    mapp = os.path.abspath(a.mal); run_dir = os.path.dirname(mapp); hold, bas, final = a.holdout, a.bas, a.final
    assert os.path.commonpath([mapp, os.path.join(ENGINE, '.arena')]) == os.path.join(ENGINE, '.arena'), 'mappen måste ligga under engine/.arena'
    os.makedirs(mapp, exist_ok=True)
    dist = os.path.join(ENGINE, 'dist') if bas else os.path.join(mapp, 'dist')
    assert os.path.exists(os.path.join(dist, 'analyserClock.js')), 'bygg först: python tools/arena/bygg.py ' + a.mal
    src = os.path.join(ENGINE, 'src') if bas else os.path.join(mapp, 'src')
    assert os.path.isdir(src), 'saknar src/'
    if max(os.path.getmtime(os.path.join(r, f)) for r, _, fs in os.walk(src) for f in fs) > os.path.getmtime(os.path.join(dist, 'analyser.js')) + 1:
        sys.exit('dist är äldre än src - bygg om: ' + ('npx tsc -p tsconfig.json' if bas else 'python tools/arena/bygg.py ' + a.mal))
    ut = os.path.join(mapp, 'klockdom-holdout' if hold else 'klockdom'); os.makedirs(ut, exist_ok=True)
    env = T.mkenv(run_dir, mapp, bas); M = T.MANGD[hold]; kdir = os.path.join(run_dir, 'kallaren'); uf = os.path.join(kdir, 'urval.json')
    t0 = time.time(); tider = {}; fel = []; R = {}
    T.las()
    try:
        if bas and not os.path.exists(uf) and os.path.isdir(kdir):
            lotus_bygg(mapp, True); urval(mapp)
        U = T.load(kdir, 'urval.json'); klipp = (U or {}).get('kontroll' if hold else 'ovning') or []
        entry = lotus_bygg(mapp, bas)
        def steg(namn, fn):
            s = time.time()
            try: R[namn] = fn()
            except Exception as e: fel.append(f'{namn}: {e}')
            finally: tider[namn] = round(time.time() - s)
        mixl = T.latar(M['korpus'], M['annan']); mn = MIXNAMN[hold]
        jobb = [('lotus', lambda: lotus(mapp, entry, ut, final)),
                ('diag_' + mn, lambda: diag(dist, env, ut, mn, mixl)),
                ('mix', lambda: T.kor(dist, env, 'mix', mixl)[0]),
                ('klipp', lambda: T.kor(dist, env, 'klipp', [[T.F6(c[0])] + list(c[1:]) for c in M['korpus']]))]
        jobb += [('diag_' + n, (lambda n=n, w=w: diag(dist, env, ut, n, {'wav': w, 'facit': [120]}))) for n, w in LANG[hold]]
        jobb += [('kallaren', lambda: kallar_spela(mapp, ut, klipp, kdir))]
        with ThreadPoolExecutor(max_workers=2) as ex:     # högst två jobb parallellt (varje jobb = en node-process)
            for f in [ex.submit(steg, n, fn) for n, fn in jobb]: f.result()
        namn = [mn] + [n for n, _ in LANG[hold]]
        if not any(f.startswith('diag_') for f in fel): steg('utflykt', lambda: utflykter(ut, namn, env))
    finally: T.slapp()
    q = {}; sysk = {}; mixLatar = None
    if R.get('mix'): mix = R['mix']; q.update(mix_klocka=mix['klocka'], mix_las=mix['lasMed'], mix_hopp=mix['hoppMin'], mix_still=mix.get('stillMed', 0.0))
    if R.get('klipp'): q['klipp_klocka'] = 100 * sum(c['klocka'] for c in R['klipp']) / len(R['klipp'])
    if R.get('utflykt'):
        tot, per = R['utflykt']; q.update(utfl_min=tot['perMin'], utfl_tid=tot['tidPct'])
        try:
            sa = sn = 0; la = ln = 0
            for n in namn:
                d = json.load(io.open(os.path.join(ut, n + '.json'), encoding='utf-8')); a_, n_, pl = syskon_fil(d)
                sysk[n] = {'pct': round(100 * a_ / max(1, n_), 3), 'syskonS': round(a_ / 10, 1), 's': round(n_ / 10, 1)}; sa += a_; sn += n_
                if pl is None: la += a_; ln += n_
                else: mixLatar = [{**p, 'syskonPct': x} for p, x in zip(d['per'], pl)]
            q.update(syskon_tid=100 * sa / max(1, sn), syskon_tid_mix=100 * (sa - la) / max(1, sn - ln), syskon_tid_lang=100 * la / max(1, ln))
        except Exception as e: fel.append(f'syskon_tid: {e}')
    lo = R.get('lotus')
    if lo:
        kl = lo['korpus']['klasser']
        q.update(lotus_ratt=lo['korpus']['ok'], lotus_syskon=sum(kl.get(k, 0) for k in SYSKONKLASSER),
                 lotus_vaxling=lo['vaxling_q' if VAXLING_SPANN == 'q' else 'vaxling_minmax'], lotus_vaxling_minmax=lo['vaxling_minmax'], lotus_vaxling_q=lo['vaxling_q'])
    ka = R.get('kallaren')
    if ka:
        for v in ka.values(): v.pop('_h', None)
        q['kallaren'] = sum(v['byten'] for v in ka.values()) / max(1e-9, sum(v['min'] for v in ka.values()))
    elif 'kallaren' in R: q['kallaren'] = None   # inga klipp i urvalet: fallet utgår
    out = {'mapp': os.path.relpath(mapp, ENGINE), 'bas': bas, 'holdout': hold, 'final': final, 'basenv': T.basenv(run_dir), 'git': git(), 'vaxlingSpann': VAXLING_SPANN,
           'matt': q,
           'sparr': {'syntet': lo and lo['synt']['ok'], 'syntN': lo and lo['synt']['n'], 'lotusOnBeat': lo and (lo.get('onBeat') or {}).get('recall'), 'lotusFas': lo and lo.get('fas'),
                     'andradeFiler': [] if bas else andrade(mapp)},
           'mix': R.get('mix'), 'mixLatar': mixLatar, 'klipp': R.get('klipp'), 'utflykt': R['utflykt'][1] if R.get('utflykt') else None, 'utflyktTotalt': R['utflykt'][0] if R.get('utflykt') else None,
           'syskon': sysk, 'lotus': lo, 'kallaren': ka, 'kallarklipp': klipp, 'fel': fel, 'tider': tider, 'tidS': round(time.time() - t0)}
    skriv(os.path.join(mapp, 'klockdom-holdout.json' if hold else 'klockdom.json'), out)
    print(f"MÄTT {out['mapp']}{' KONTROLLMÄNGDEN' if hold else ''}{' FINAL (lotus 503)' if final else ''} {out['tidS']} s  steg {tider}")
    print('  ' + '  '.join(f'{k} {q[k]:.2f}' if q.get(k) is not None else f'{k} -' for k, *_ in MATT))
    if lo: print(f"  lotus {lo['korpus']['ok']}/{lo['korpus']['n']} klasser {lo['korpus']['klasser']}  syntet {lo['synt']['ok']}/{lo['synt']['n']}  on-beat {(lo.get('onBeat') or {}).get('recall')}  fas {lo.get('fas')}  växling q {lo['vaxling_q']} / minmax {lo['vaxling_minmax']}")
    if fel: print('  FEL: ' + '; '.join(fel))
    if bas and lo: syskonlista(mapp, out, hold)


def syskonlista(mapp, out, hold):
    """<bas>/lotus-syskonspann[-final].md: korpusfilerna där klockans tempo inom klippet spänner över ett syskontempo hos bas."""
    kf = [f for f in out['lotus']['filer'] if f['set'] == 'korpus']
    L = [f"# Korpusfiler med syskonspann hos bas ({'503 filer' if out['final'] else '--snabb, 126 filer'}, git {out['git']})", '',
         f"q25..q75 >= {SPANN_KVOT:.2f}: {sum(f['vaxling'] for f in kf)} filer (måttet lotus_vaxling). min..max >= {SPANN_KVOT:.2f}: {sum(f['vaxlingMinmax'] for f in kf)} filer.", '',
         '| fil | låt | facit | analys | klass | q25–q75 | min–max | q-spann | minmax-spann |', '|---|---|---|---|---|---|---|---|---|']
    for f in kf:
        if f['vaxling'] or f['vaxlingMinmax']:
            L.append(f"| {f['fil'] or f['i']} | {f['namn']} | {f['facit']:.1f} | {f['analys']:.1f} | {f['klass']} | {f['q25']:.0f}–{f['q75']:.0f} | {f['min']:.0f}–{f['max']:.0f} | {'JA' if f['vaxling'] else ''} | {'ja' if f['vaxlingMinmax'] else ''} |")
    io.open(os.path.join(mapp, 'lotus-syskonspann-final.md' if out['final'] else 'lotus-syskonspann.md'), 'w', encoding='utf-8').write('\n'.join(L) + '\n')


def doma(B, V):
    """-> (poäng, {mått: %}, [diskskäl])"""
    disk = list(V.get('fel') or []); b, v = B['matt'], V['matt']; q = {}
    for k, d, g in MATT:
        if b.get(k) is None: continue                      # fallet utgår (källaren utan klipp)
        if v.get(k) is None: disk.append(f'{k} saknas'); continue
        q[k] = T.rel(v[k], b[k], d, g)
    if not V.get('bas') and V.get('final') != B.get('final'): disk.append('lotusbanken mätt på annan mängd än bas (snabb/final)')
    has = lambda *ks: all(v.get(k) is not None and b.get(k) is not None for k in ks)
    if has('lotus_ratt') and v['lotus_ratt'] < b['lotus_ratt'] * (1 - RATT_REL): disk.append(f"lotus_ratt {v['lotus_ratt']} < bas {b['lotus_ratt']} - 1 %")
    sb, sv = B.get('sparr') or {}, V.get('sparr') or {}
    if sv.get('syntet') is not None and sb.get('syntet') is not None:
        if sv['syntet'] < sb['syntet']: disk.append(f"syntet {sv['syntet']} < bas {sb['syntet']}")
        if sv.get('lotusOnBeat') is not None and sb.get('lotusOnBeat') is not None and sv['lotusOnBeat'] < sb['lotusOnBeat'] * (1 - LOTUS_REL): disk.append(f"lotus on-beat-recall {sv['lotusOnBeat']} < bas {sb['lotusOnBeat']} - 5 %")
        fb, fv = sb.get('lotusFas'), sv.get('lotusFas')
        if fb and fv and fb.get('n') and fv.get('n'):
            if fv['median'] is not None and fb['median'] is not None and fv['median'] < fb['median'] * (1 - LOTUS_REL): disk.append(f"lotus fas median {fv['median']} < bas {fb['median']} - 5 %")
            if fv['motfas'] / fv['n'] > max(fb['motfas'] / fb['n'] * (1 + LOTUS_REL), fb['motfas'] / fb['n'] + FAS_TOL): disk.append(f"lotus motfas {fv['motfas']}/{fv['n']} > bas {fb['motfas']}/{fb['n']} + 5 %")
            if fv['ifas'] / fv['n'] < min(fb['ifas'] / fb['n'] * (1 - LOTUS_REL), fb['ifas'] / fb['n'] - FAS_TOL): disk.append(f"lotus i fas {fv['ifas']}/{fv['n']} < bas {fb['ifas']}/{fb['n']} - 5 %")
    else: disk.append('lotusbanken saknas')
    if has('mix_las') and v['mix_las'] > b['mix_las'] + LAS_TOL: disk.append(f"mix_las {v['mix_las']:.2f} s > bas {b['mix_las']:.2f} + {LAS_TOL}")
    if has('mix_still') and v['mix_still'] > b['mix_still'] + STILL_TOL: disk.append(f"mix_still {v['mix_still']:.2f} s > bas {b['mix_still']:.2f} + {STILL_TOL}")
    if has('klipp_klocka') and v['klipp_klocka'] < b['klipp_klocka'] - KLIPP_TOL: disk.append(f"klipp_klocka {v['klipp_klocka']:.2f} % < bas {b['klipp_klocka']:.2f} - {KLIPP_TOL:.0f} pe")
    otill = [f for f in (sv.get('andradeFiler') or []) if f not in TILLATNA]
    if otill: disk.append('förbjudna filer: ' + ', '.join(otill[:6]))
    return (sum(q.values()) / len(q) if q else 0.0), q, disk


def ranking(a):
    rd = os.path.abspath(a.mal); hold = a.holdout; fn = 'klockdom-holdout.json' if hold else 'klockdom.json'
    B = T.load(os.path.join(rd, 'bas'), fn)
    if not B: sys.exit(f'saknar bas/{fn} - mät baslinjen först: python tools/arena/klockdom.py {a.mal}/bas --mat --bas' + (' --holdout --final' if hold else ''))
    rows = []
    for name in sorted(os.listdir(rd)):
        V = T.load(os.path.join(rd, name), fn)
        if name == 'bas' or not V or 'matt' not in V: continue
        p, q, disk = doma(B, V); rows.append((name, p, q, disk, V))
    rows.sort(key=lambda r: (bool(r[3]), -r[1]))
    bm = B['matt']; ks = [k for k, *_ in MATT if bm.get(k) is not None]
    L = [f"# Ranking {os.path.basename(rd)} - klockan håller en tolkning{' KONTROLLMÄNGDEN' if hold else ''} (tools/arena/klockdom.py, mot bas)", '',
         f"poäng = medel av {len(ks)} mått i % mot bas (riktningen inräknad, + = bättre, +-100 %), lika vikt. lotusbanken: {'503 filer' if B.get('final') else '--snabb, 126 filer'}; "
         f"bas lotus {bm.get('lotus_ratt')}/{(B.get('lotus') or {}).get('korpus', {}).get('n')}, syntet {(B.get('sparr') or {}).get('syntet')}/{(B.get('sparr') or {}).get('syntN')}; källarklipp {len(B.get('kallarklipp') or [])}; lotus_vaxling på {'q25..q75' if B.get('vaxlingSpann') == 'q' else 'min..max'}.", '',
         '| plats | deltagare | poäng | ' + ' | '.join(f'{k} ({bm[k]:.2f})' for k in ks) + ' | DISK |', '|---|---|---|' + '---|' * len(ks) + '---|']
    for i, (n, p, q, disk, V) in enumerate(rows, 1):
        L.append(f'| {i} | {n} | {p:+.2f} | ' + ' | '.join(f'{q[k]:+.1f}' if k in q else '-' for k in ks) + f" | {'; '.join(disk) or '-'} |")
    L += ['', '## Värdena (bas överst)', '', '| deltagare | ' + ' | '.join(ks) + ' | syntet | lotus on-beat | lotus fas med/motfas/i fas (n) | tid s |', '|---|' + '---|' * (len(ks) + 4)]
    for n, V in [('bas', B)] + [(r[0], r[4]) for r in rows]:
        s = V.get('sparr') or {}; f = s.get('lotusFas') or {}
        L.append(f'| {n} | ' + ' | '.join(f"{V['matt'][k]:.2f}" if V['matt'].get(k) is not None else '-' for k in ks) + f" | {s.get('syntet')} | {s.get('lotusOnBeat')} | {f.get('median')} / {f.get('motfas')} / {f.get('ifas')} ({f.get('n')}) | {V.get('tidS')} |")
    txt = '\n'.join(L) + '\n'; print(txt)
    if a.md: io.open(os.path.join(rd, 'ranking-klockdom-holdout.md' if hold else 'ranking-klockdom.md'), 'w', encoding='utf-8').write(txt)


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description='Domaren för arenan klocka2 (se filhuvudet)')
    ap.add_argument('mal', help='--mat/--urval: deltagarmappen; annars körningen (rangordning)')
    ap.add_argument('--mat', action='store_true'); ap.add_argument('--bas', action='store_true'); ap.add_argument('--holdout', action='store_true')
    ap.add_argument('--final', action='store_true'); ap.add_argument('--md', action='store_true'); ap.add_argument('--urval', action='store_true')
    a = ap.parse_args()
    if a.urval: urval(os.path.abspath(a.mal))
    elif a.mat: mat(a)
    else: ranking(a)
