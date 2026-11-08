"""DOMAREN FÖR ARENAN 'ANALYSATORNS TVÅ VÄGAR' (2026-11-08) - och DELTAGARNAS BRIEF. Vikterna och mängderna ändras inte under körningen.

UPPGIFTEN (tools/natt/todo.md, ARENA: ANALYSATORNS TVÅ VÄGAR): EN analysator, TVÅ vägar.
  SNABBA VÄGEN (huvudtråden, varje hop): det ljuset behöver direkt - nivå, band, kick/anslag, drop-flanken. Mål: SAMMA uppgift eller
    bättre, på kortare tid och med kortare latens.
  LÅNGSAMMA VÄGEN (workern): det dirigenten behöver - tempo, rutnätets fas/ettan, taktmatningen, sektioner, build/drop, låtgräns.
    Mål: att FÖRSTÅ låten så bra som möjligt; fart räknas bara som en gräns (workern ska hinna med).
  TILLÅTNA FILER: allt i src/ (deltagarens kopia <körning>/<id>/src, byggd med python tools/arena/bygg.py <körning>/<id>). Även de
    delade filerna analyser.ts, split.ts, slowWorker.ts, fritt (behöver inte gömmas bakom profilvärden). fft.js byts inte (hur ofta den
    anropas får ändras). tools/ ändras inte. Verktygen läser API:t createAnalyser/Analyser, BeatFeed (analyserCfg, update),
    analyser.hopLane.feed/stats, BoundaryDetector, EffectEngine, beatClock.beatIndex, frame.{bpm, bpmConfidence, section, dropCount,
    miniDropCount, specAbs, level}, cfg.beat - det måste finnas kvar.
  Lotus bedöms inte här - portas efter arenan.
  LÄGEN:
    python tools/arena/tvavagar.py --snabb <mapp>      (~1 min, utan lås och CPU) md5-spärren på 120 s lang1021 - kolla
                                                        att inget gått sönder innan du lägger en riktig mätning
    python tools/arena/tvavagar.py --mat <mapp>        hela mätningen (~7 min; globalt lås .arena/.banklas = en åt gången) -> <mapp>/tvavagar.json
    python tools/arena/tvavagar.py <körning> [--md]    rangordning mot <körning>/bas (--md skriver <körning>/ranking-tvavagar.md)
    (domaren: --mat <körning>/bas --bas = engine/dist; --holdout = KONTROLLMÄNGDEN (finalen; deltagarna får INTE mäta på den);
     --bonus = finalens bonus -> tvavagar-bonus.json; ranking med --holdout läser tvavagar-holdout.json + bonus.)
  Alla mätningar får <körning>/basenv.txt (DMX_LABFX=1) i env. Allt körs mot deltagarens dist (verktyg som tar dist som argument
  får <mapp>/dist, tools/ljusLag.py + bank.py via DMX_DIST + NODE_OPTIONS=--import=tools/arena/distHook.mjs).

POÄNG = 0,6 * LÅNGSAMMA + 0,4 * SNABBA + BONUS (bara i finalen, max +3)
  Varje mått räknas i % mot bas (riktningen inräknad: + = bättre), (v - b) / max(|b|, golv), klipps till +-100 %, och varje mått väger LIKA.
  LÅNGSAMMA = medel av de 16 kvalitetsmåtten (vikt 1/16 vardera). Kedjan = MOTORNS (tools/arena/tvavagarKor.mjs: createAnalyser
  'inline' = workerns kod i samma tråd, deterministiskt; hopLane.feed; låtgränsen + hintTrackChange som index.ts), måtten = verktygens:
    tempo   mix_klocka    + golv 1    tempoMix.mjs: andel tid effektklockans bpm (cfg.beat) = katalogfacit (+-4 %, alt godkänt) i MIXEN (se
                                      MÄNGDERNA: låtar à 4 x 40 s ur frozen6, 3 s övertoning mellan låtarna)
            mix_las       - golv 1 s  tempoMix: median s från övertoningens slut tills klockan är rätt och håller >= 2 s
            mix_hopp      - golv 0,2  tempoMix: klockans tempobyten inom låt per min (från 8 s efter övertoningen)
            klipp_klocka  + golv 1    taktKorpus.mjs: klippen var för sig, kallstart, klockan rätt efter 5 s (snitt över klippen, %)
    ettan   ettan         + golv 5    testDownbeat.mjs-signalen (ettan dubbelt så tung, 90 s, fröat brus) vid 7 tempon: ettan rätt 70-90 s, %
            grid40        + golv 1    natt.py:s gridfas (sektionLag.mjs): basansatser inom +-40 ms från rutnätets slag, %, på lang-mängden
            gridfel       - golv 5 ms sektionLag: median |fasfel| ms
    sektion upp_s         - golv 0,5  sektionLag: etiketten blir high efter ljudets nivåskifte uppåt, median s (miss = 20 s)
            ned_s         - golv 0,5  sektionLag: etiketten lämnar high efter skifte nedåt, median s (miss = 20 s)
            traff         + golv 1    sektionLag: andel skiften (upp+ned) där etiketten följer inom 20 s, %
            korta         - golv 1    sektionLag/sektionStat: andel sektionsdelar < 8 s, %
    drop    drop_traff    + golv 5    dropFacit.mjs: dropklippen (ladan 10-10, riktig drop vid 15,0 s) - drop ELLER minidrop inom +-1,5 s, %
                                      (bas: 0/10 hela drops vid 15 s sedan 'SNÄVT MÅL' 10-11, minin fångar dem - ägarens val); holdout + ägarens
                                      8 drop-markeringar i lang1014 (marks.jsonl mot events.json captureStartWallMs): drop/mini inom [-4, +1] s
            drop_falska   - golv 0,5  HELA drops utanför facit per 10 min ljud (holdout: + lang1014-drops > 4 s före/1 s efter ALLA markeringar)
            drop_ms       - golv 20   dropFacit: median över klippen av närmaste |drop/mini - 15,0 s| ms (ingen träff = 1500)
    låtgräns gr_ratt      + golv 5    BoundaryDetector mot mixens låtskarvar (sektionStat: inom 15 s från övertoningens mitt), % av skarvarna
            gr_falska     - golv 0,5  låtgränser > 15 s från en låtskarv per 10 min mix (50 ms-skarvarna INOM en låt räknas som 'ingen gräns')
    (boundaryBench.mjs utgår: dess facit (PC-sidans librosa-gränser) finns inte i repot och den mäter bara opt-in-nyheten
     BOUNDARY_NOV - låtgränsen döms i stället mot tempomixens kända skarvar.)
  SNABBA = medel av (vikt 1/2 vardera):
    cpu    - huvudtrådens CPU µs per hop (process.threadCpuUsage = egna trådens CPU, inte väggtid): tools/dmxDump.mjs DUMP_SPLIT=worker
             <dist> <cpu-wav> 120 = motorns riktiga worker-läge i full fart (analys + takt + låtgräns + effekter var 25 ms, exkl. wav-
             läsning), MEDIAN AV 5 körningar, växelvis med 5 körningar av engine/dist (ABBA); måttet = kvoten median(variant)/median(bas).
             Varför inte realtid: Windows räknar trådens CPU i klocktick à 15,6 ms och huvudtråden arbetar ~5 % av tiden i realtid -> en
             realtidskörning på 45 s är ~45 tick = +-15 % (bas mot bas samtidigt gav kvoten 0,83); PC:ns last driver dessutom (samma bas
             45 -> 72 us/hop på en kvart). I full fart arbetar tråden hela tiden (+-3 % per körning). Väckningen av workern syns inte i
             full fart (workern väntar aldrig) - den döms i finalens bonus.
    latens - kick->ljus: tools/ljusLag.py (konsertReplay, ljusets uppgång efter LJUDETS basanslag) korskorr + vikningens median + t90, ms
  SPÄRR 'SAMMA UPPGIFT ELLER BÄTTRE' (annars DISK): DMX-md5 per lampa identisk mot bas på HELA md5-filerna, i två lägen:
    tools/dmxDump.mjs DUMP_SPLIT=sync (den riktiga workern i lås-steg) och tools/dmxDumpMoment.mjs DUMP_MOMENTS=1 DUMP_SPLIT=inline,
    3:e arg 100000. Skiljer md5: ljusdomaren - tools/arena/bank.py <mapp> (--holdout i finalen) + domare.py v3: poäng >= bas - 0,5 och
    inga av domarens spärrar (ljus > 103 %, lampspr, slocknat, fladder, t90; domarens filspärr gäller inte här). Fade-down, strobe och
    vitt döms bara genom md5 / ljusdomaren (inget eget mått).
  GRÄNS (annars DISK): workerns taktväg i realtid - hop efter när huvudtråden läser (tools/feedRealtid.mjs <dist> <cpu-wav> 60, efterHop,
    körd SAMTIDIGT med engine/dist = samma last), p99 <= X = bas p99 + 1 hop (bas = basmätningen eller parets bas, den högre).
  BONUS (finalen, ägaren 11-08): tools/feedRealtid.mjs lang1107 300 s (+ tools/arena/notifyMat.mjs: huvudtrådens Atomics.notify, µs/hop),
    varianten SAMTIDIGT med en körning av engine/dist (paret döms mot varandra - PC:ns last driver över minuterna):
    +1 per halvering av andelen >= 2 hop efter, +1 om taktvägens fördröjning p99 halveras, +1 om väckningen (µs/hop) halveras; max +3;
    sämre än bas på något av de tre = 0, där 'sämre' = över bas x 1,35 (bas mot bas samtidigt 11-08: >= 2 hop 15,5/11,6 %, p99
    0,42/0,34 ms, väckning 33,2/34,1 us/hop = upp till 1,33 i ren slump). Väckningen = väggtid runt Atomics.notify (~1,2 per hop).

MÄNGDERNA (FASTA; deltagarna mäter bara på ÖVNING):
  ÖVNING   lang:  lang1021 (5 min), pop_ladan, megamix_ladan, lang-20261011T191741 (10 min var)       = sektioner + gridfas
           klipp: KORPUS_OVNING nedan (50 klipp ur frozen6 = 24 låtar x 2 + 2 x 1, de låtar med katalogfacit som inte är holdout)
           mix: latar(KORPUS_OVNING, 9) = de 7 Ledin-låtarna (klipp n, n+10, n+20, n+30) + 9 övriga (klipp 1,2,1,2), 16 låtar, 42 min
           (alla korpusklipp nivåanpassas till -17 dBFS som showTight --norm; frozen6 ligger annars ~28 dB under ladan)
           drop: ladan-2026-10-10 klipp 0,1,3,4,6,7,9 (sorterade)   ettan: 96 104 112 120 128 136 144 bpm
           md5: lang1021 + megamix_ladan hela   cpu: lang1021 0-120 s, 5 par   gräns: lang1021 0-60 s   latens: lang1021 300 s
  KONTROLLMÄNGDEN (--holdout, finalen):
           lang:  lang1014 (tools/ladan-2026-10-14/lang-20261014T161434.wav) + lang1107 (tools/ladan-2026-11-07/lang-20261107T154200.wav)
           klipp: KORPUS_HOLDOUT nedan (17 klipp: var 4:e låt med facit i filordning = 8 låtar x 2, + 'keith pop remix' flyttad hit)
           mix: latar(KORPUS_HOLDOUT, 6) = 2 Ledin + 6 övriga, 8 låtar, 21 min
           drop: ladan-2026-10-10 klipp 2,5,8 + ägarens markeringar i lang1014 (marks.jsonl)   ettan: 100 116 124 132 140 bpm
           md5: lang1014 + lang1107 hela   cpu: lang1107 0-120 s, 5 par   gräns: lang1107 0-60 s   latens: lang1014 300 s   ljusdomaren: bank.py --holdout
TID: --mat ~6-7 min: batchfasen (2 processer parallellt: mix/latens/drop/ettan | md5/lang/klipp, ~2,5 min) och sedan
  cpu-fasen (10 x ~5 s) + ett samtidigt realtidspar (62 s); +1,5 min om md5 skiljer (bank.py). --bas = bas mot bas: kvoten är bruset;
  bas kör alltid bank.py --bas så ljusdomaren har sin baslinje.
"""
import argparse, io, json, math, os, re, shutil, statistics, subprocess, sys, tempfile, time, pathlib
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__)); ENGINE = os.path.dirname(os.path.dirname(HERE))
L1021 = 'tools/ladan-2026-10-21/lang-20261021T203952.wav'; L1014 = 'tools/ladan-2026-10-14/lang-20261014T161434.wav'
L1107 = 'tools/ladan-2026-11-07/lang-20261107T154200.wav'; POP = 'tools/pop_ladan.wav'; MEGA = 'tools/megamix_ladan.wav'
F6 = lambda n: f'tools/frozen6/{n}.wav'
KORPUS_OVNING = [("001_tomas-ledin-alltid-en-voon-i-mej", 102), ("011_tomas-ledin-alltid-en-voon-i-mej", 102), ("003_tomas-ledin-jag-vet-inte-varfoor", 134), ("013_tomas-ledin-jag-vet-inte-varfoor", 134), ("004_tomas-ledin-en-dag-poo-stranden", 114, 106), ("014_tomas-ledin-en-dag-poo-stranden", 114, 106), ("006_tomas-ledin-hon-goor-allt-foor-att-goora-mig-lycklig", 104), ("016_tomas-ledin-hon-goor-allt-foor-att-goora-mig-lycklig", 104), ("007_tomas-ledin-genom-ett-regnigt-europa", 94), ("017_tomas-ledin-genom-ett-regnigt-europa", 94), ("008_tomas-ledin-hoor-kommer-den-nya-tiden", 102), ("018_tomas-ledin-hoor-kommer-den-nya-tiden", 102), ("010_tomas-ledin-snart-tystnar-musiken", 152, 152), ("020_tomas-ledin-snart-tystnar-musiken", 152, 152), ("126_rivstart-linedance-vilka-fucking-moves", 145), ("176_rivstart-linedance-vilka-fucking-moves", 145), ("127_cooper-alan-first-rodeo", 114), ("177_cooper-alan-first-rodeo", 114), ("133_luke-combs-where-the-wild-things-are", 117), ("183_luke-combs-where-the-wild-things-are", 117), ("134_kaleb-austin-i-m-in-a-hurry", 129), ("184_kaleb-austin-i-m-in-a-hurry", 129), ("135_stella-lefty-i-know-i-know", 83), ("185_stella-lefty-i-know-i-know", 83), ("137_drake-milligan-sounds-like-something-i-d-do", 80.5), ("187_drake-milligan-sounds-like-something-i-d-do", 80.5), ("138_james-johnston-keepin-it-country", 102), ("188_james-johnston-keepin-it-country", 102), ("139_dasha-austin-boots-stop-workin", 115), ("189_dasha-austin-boots-stop-workin", 115), ("145_nate-smith-world-on-fire", 96), ("195_nate-smith-world-on-fire", 96), ("146_cody-johnson-til-you-can-t", 80, 80), ("196_cody-johnson-til-you-can-t", 80, 80), ("147_dylan-scott-what-he-ll-never-have", 113), ("197_dylan-scott-what-he-ll-never-have", 113), ("158_tyler-hubbard-dancin-in-the-country", 115), ("208_tyler-hubbard-dancin-in-the-country", 115), ("163_drake-milligan-over-drinkin-under-thinkin", 105, 106), ("213_drake-milligan-over-drinkin-under-thinkin", 105, 106), ("164_james-johnston-my-people", 82.5), ("214_james-johnston-my-people", 82.5), ("168_alex-warren-bloodline", 128), ("218_alex-warren-bloodline", 128), ("169_wild-whens-backtrack-jack", 97), ("219_wild-whens-backtrack-jack", 97), ("170_andrea-hegard-it-aint-my-fault", 123), ("220_andrea-hegard-it-aint-my-fault", 123), ("173_shaboozey-a-bar-song-tipsy", 81, 81), ("174_tennessee-tears-yours", 100, 101)]
KORPUS_HOLDOUT = [("005_tomas-ledin-en-del-av-mitt-hjoorta", 98, 82), ("015_tomas-ledin-en-del-av-mitt-hjoorta", 98, 82), ("009_tomas-ledin-oar-du-min-kvinna", 130, 133), ("019_tomas-ledin-oar-du-min-kvinna", 130, 133), ("128_zach-bryan-pink-skies", 85, 90), ("178_zach-bryan-pink-skies", 85, 90), ("136_carlene-carter-he-will-be-mine", 145), ("186_carlene-carter-he-will-be-mine", 145), ("142_cameron-whitcomb-medusa", 108), ("192_cameron-whitcomb-medusa", 108), ("149_kaylee-bell-keith", 103), ("199_kaylee-bell-keith", 103), ("166_hannes-aitman-hopeless-nights", 130, 124), ("216_hannes-aitman-hopeless-nights", 130, 124), ("172_cody-johnson-the-painter", 98), ("222_cody-johnson-the-painter", 98), ("175_kaylee-bell-keith-pop-remix", 103)]
DROPDIR = 'tools/ladan-2026-10-10'
MANGD = {
    False: {'lang': [L1021, POP, MEGA, 'tools/ladan-2026-10-11/lang-20261011T191741.wav'], 'korpus': KORPUS_OVNING, 'drop': [0, 1, 3, 4, 6, 7, 9],
            'annan': 9, 'ettan': [96, 104, 112, 120, 128, 136, 144], 'md5': [L1021, MEGA], 'cpu': L1021, 'latens': L1021, 'marks': None},
    True: {'lang': [L1014, L1107], 'korpus': KORPUS_HOLDOUT, 'drop': [2, 5, 8], 'annan': 6, 'ettan': [100, 116, 124, 132, 140], 'md5': [L1014, L1107],
           'cpu': L1107, 'latens': L1014, 'marks': ('tools/ladan-2026-10-14/lang-20261014T161434', L1014)},
}
CPU_N, CPU_S, RT_S, BONUS_WAV, BONUS_S, SNABB_S = 5, 120, 60, L1107, 300, 120
# (nyckel, grupp, riktning, golv) - LIKA VIKT
MATT = [('mix_klocka', 'tempo', 1, 1), ('mix_las', 'tempo', -1, 1), ('mix_hopp', 'tempo', -1, 0.2), ('klipp_klocka', 'tempo', 1, 1),
        ('ettan', 'ettan', 1, 5), ('grid40', 'ettan', 1, 1), ('gridfel', 'ettan', -1, 5),
        ('upp_s', 'sektion', -1, 0.5), ('ned_s', 'sektion', -1, 0.5), ('traff', 'sektion', 1, 1), ('korta', 'sektion', -1, 1),
        ('drop_traff', 'drop', 1, 5), ('drop_falska', 'drop', -1, 0.5), ('drop_ms', 'drop', -1, 20),
        ('gr_ratt', 'latgrans', 1, 5), ('gr_falska', 'latgrans', -1, 0.5)]
W_LANGSAM, W_SNABB, KLIPP_PCT, SPARR_LJUS, BONUS_TOL = 0.6, 0.4, 100.0, -0.5, 1.35


def rel(v, b, d, golv):
    return max(-KLIPP_PCT, min(KLIPP_PCT, d * (v - b) / max(abs(b), golv) * 100)) + 0.0   # + 0.0: ingen '-0,0'


def basenv(run):
    bf = os.path.join(run, 'basenv.txt')
    return [l.strip() for l in io.open(bf, encoding='utf-8') if '=' in l and not l.lstrip().startswith('#')] if os.path.exists(bf) else []


def mkenv(run, mapp, bas, hook=False):
    env = dict(os.environ)
    for e in basenv(run): k, v = e.split('=', 1); env[k] = v
    if hook and not bas:
        env['DMX_DIST'] = os.path.join(mapp, 'dist')
        env['NODE_OPTIONS'] = (env.get('NODE_OPTIONS', '') + ' --import=' + pathlib.Path(HERE, 'distHook.mjs').as_uri()).strip()
    return env


def run(cmd, env, timeout=1800):
    r = subprocess.run(cmd, cwd=ENGINE, env=env, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=timeout)
    return r


def last_json(r):
    line = next((l for l in reversed(r.stdout.splitlines()) if l.startswith('{')), None)
    if not line: raise RuntimeError((r.stderr or r.stdout)[-600:])
    return json.loads(line)


# ── LÅSET (som bank.py: samma katalog, pid i låset, död ägare = fritt) ──
LOCK = os.path.join(ENGINE, '.arena', '.banklas')
def _levande(pid):
    try:
        import ctypes; h = ctypes.windll.kernel32.OpenProcess(0x1000, False, pid)
        if not h: return False
        code = ctypes.c_ulong(); ctypes.windll.kernel32.GetExitCodeProcess(h, ctypes.byref(code)); ctypes.windll.kernel32.CloseHandle(h); return code.value == 259
    except Exception:
        try: os.kill(pid, 0); return True
        except Exception: return False
def las():
    os.makedirs(os.path.dirname(LOCK), exist_ok=True); sagt = False
    while True:
        try:
            os.mkdir(LOCK); io.open(os.path.join(LOCK, 'pid'), 'w').write(str(os.getpid())); return
        except FileExistsError:
            try: pid = int(io.open(os.path.join(LOCK, 'pid')).read())
            except Exception: pid = None
            if (pid is not None and not _levande(pid)) or time.time() - os.path.getmtime(LOCK) > 3600:
                shutil.rmtree(LOCK, ignore_errors=True); continue
            if not sagt: print(f'väntar på låset (pid {pid}) ...', flush=True); sagt = True
            time.sleep(5)
def slapp(): shutil.rmtree(LOCK, ignore_errors=True)


# ── MÄTSTEGEN ──
def md5_steg(dist, env, wavs, sek):
    out = {}
    for w in wavs:
        n = os.path.basename(w)[:-4]
        for tag, tool, extra in (('sync', 'tools/dmxDump.mjs', {'DUMP_SPLIT': 'sync'}), ('moment', 'tools/dmxDumpMoment.mjs', {'DUMP_MOMENTS': '1', 'DUMP_SPLIT': 'inline'})):
            e = dict(env); e.pop('DUMP_MOMENTS', None); e.update(extra)
            j = last_json(run(['node', tool, dist, w, str(sek)], e))
            out[f'{n}:{tag}'] = j['md5']
    return out


def latar(korpus, n_annan):
    """MIXENS LÅTAR (tempo + låtgräns): varje låt = 4 delar à 40 s skarvade 50 ms inuti (160 s; låtgränsdetektorn kräver >= 110 s per
    låt, MIN_SEG_MS): Ledin-låtarna med sina klipp n, n+10, n+20, n+30 ur frozen6, övriga låtar klipp 1, 2, 1, 2. Alla Ledin-låtar i
    mängden + de n_annan första övriga (korpusordning, bara låtar med 2 klipp), varvade Ledin/övrig. Låtarna skarvas med 3 s övertoning."""
    led, ann, seen = [], [], set()
    for c in korpus:
        key = c[0][4:]
        if key in seen: continue
        seen.add(key); clips = [F6(x[0]) for x in korpus if x[0][4:] == key]
        if 'tomas-ledin' in key: led.append([[F6(f'{int(c[0][:3]) + 10 * i:03d}_{key}') for i in range(4)], *c[1:]])
        elif len(clips) == 2: ann.append([clips * 2, *c[1:]])
    ann = ann[:n_annan]; out = []
    while led or ann:
        if led: out.append(led.pop(0))
        if ann: out.append(ann.pop(0))
    return out


def kor(dist, env, job, lista):
    fd, li = tempfile.mkstemp(suffix='.json'); os.close(fd); fd, ut = tempfile.mkstemp(suffix='.json'); os.close(fd)
    try:
        io.open(li, 'w', encoding='utf-8').write(json.dumps(lista))
        r = run(['node', os.path.join(HERE, 'tvavagarKor.mjs'), dist, job, li, ut], env)
        if r.returncode: raise RuntimeError(f'{job}: ' + (r.stderr or r.stdout)[-600:])
        return json.load(io.open(ut, encoding='utf-8'))
    finally:
        for p in (li, ut): os.remove(p)


def realtid(dist, env, wav, sek):
    fd, nf = tempfile.mkstemp(suffix='.json'); os.close(fd)
    e = dict(env); e['TVAVAGAR_NOTIFY_OUT'] = nf
    e['NODE_OPTIONS'] = (e.get('NODE_OPTIONS', '') + ' --import=' + pathlib.Path(HERE, 'notifyMat.mjs').as_uri()).strip()
    try:
        j = last_json(run(['node', 'tools/feedRealtid.mjs', dist, wav, str(sek)], e, timeout=sek + 120))
        try: nt = json.load(io.open(nf, encoding='utf-8'))
        except Exception: nt = {'n': 0, 'us': 0}
    finally: os.remove(nf)
    hist = {int(k): float(v.rstrip('%')) for k, v in (x.split(':') for x in (j.get('efterHop') or '').split())}
    return {'cpu': j['huvudtradCpuUsPerHop'], 'hop': j['hop'], 'hist': hist, 'lagP99': j['taktvagLagMs']['p99'], 'lagP50': j['taktvagLagMs']['p50'],
            'lagMax': j['taktvagLagMs'].get('max'), 'envLagP99': j['envLagMs']['p99'], 'notifyPerHop': nt['n'] / max(1, j['hop']), 'vackUsPerHop': nt['us'] / max(1, j['hop'])}


def cpu_batch(dist, env, wav, sek):
    """Huvudtrådens CPU us/hop (process.threadCpuUsage, analys + takt + låtgräns + effekter, exkl. wav-läsning) ur tools/dmxDump.mjs
    i motorns asynkrona worker-läge (DUMP_SPLIT=worker) i full fart över sek s."""
    e = dict(env); e.pop('DUMP_MOMENTS', None); e['DUMP_SPLIT'] = 'worker'
    return last_json(run(['node', 'tools/dmxDump.mjs', dist, wav, str(sek)], e))['cpuUsPerHop']


def par(dist, env, wav, sek):
    """En realtidskörning av engine/dist och en av varianten SAMTIDIGT (samma last på PC:n) -> (bas, variant)."""
    with ThreadPoolExecutor(max_workers=2) as ex:
        fb = ex.submit(realtid, os.path.join(ENGINE, 'dist'), env, wav, sek); fv = ex.submit(realtid, dist, env, wav, sek)
        return fb.result(), fv.result()


def hist_pool(runs):
    tot = {}; H = sum(r['hop'] for r in runs)
    for r in runs:
        for k, v in r['hist'].items(): tot[k] = tot.get(k, 0) + v * r['hop'] / 100
    pct = {k: 100 * v / max(1, H) for k, v in sorted(tot.items())}
    c = 0; p99 = 0
    for k, v in pct.items():
        c += v; p99 = k
        if c >= 99: break
    return {'pct': {str(k): round(v, 2) for k, v in pct.items()}, 'p99Hop': p99 if pct else 0, 'andel2': round(sum(v for k, v in pct.items() if k >= 2), 3)}


def latens(wav, env):
    r = run([sys.executable, 'tools/ljusLag.py', wav, '--s', '300'], env, timeout=900)
    m1 = re.search(r'korskorr\) (-?\d+) ms', r.stdout); m2 = re.search(r'vikning: median (-?\d+) ms', r.stdout); m3 = re.search(r'90 % vid (-?\d+) ms', r.stdout)
    if not (m1 and m2 and m3): raise RuntimeError('ljusLag: ' + (r.stderr or r.stdout)[-400:])
    k, m, t = int(m1.group(1)), int(m2.group(1)), int(m3.group(1))
    return {'korskorr': k, 'vikning': m, 't90': t, 'ms': k + m + t}


def kvalitet(R, hold):
    """De 16 måtten ur tvavagarKor-resultaten."""
    L = R['lang']; mix = R['mix'][0]; kl = R['klipp']; dr = R['drop']; et = R['ettan']
    upLag = [x for f in L for x in f['upLag']] + [20.0] * sum(f['up'] - f['upHit'] for f in L)
    dnLag = [x for f in L for x in f['downLag']] + [20.0] * sum(f['down'] - f['downHit'] for f in L)
    n_sk = sum(f['up'] + f['down'] for f in L); n_hit = sum(f['upHit'] + f['downHit'] for f in L)
    grid = [abs(e) for f in L for e in f['grid']]
    hits, falska, ms = 0, 0, []
    for c in dr:
        inn = [abs(t - 15.0) for t in c['drops'] + c['minis'] if abs(t - 15.0) <= 1.5]
        if inn: hits += 1; ms.append(min(inn) * 1000)
        falska += sum(1 for t in c['drops'] if abs(t - 15.0) > 1.5)
    n_dr = len(dr); drop_min = len(dr) * 0.5
    if R.get('marks'):
        mk = R['marks']; lf = next(f for f in L if f['file'] == mk['file'])
        for m in mk['drop']:
            n_dr += 1
            if any(-4 <= t - m <= 1 for t in lf['drops'] + lf['minis']): hits += 1
        falska += sum(1 for t in lf['drops'] if not any(-4 <= t - m <= 1 for m in mk['alla']))
        drop_min += lf['min']
    med = lambda a, d: statistics.median(a) if a else d
    return {
        'mix_klocka': mix['klocka'], 'mix_las': mix['lasMed'], 'mix_hopp': mix['hoppMin'], 'klipp_klocka': 100 * sum(c['klocka'] for c in kl) / len(kl),
        'ettan': 100 * sum(e['ok'] for e in et) / max(1, sum(e['tot'] for e in et)), 'grid40': 100 * sum(1 for e in grid if e <= 40) / max(1, len(grid)), 'gridfel': med(grid, 500),
        'upp_s': med(upLag, 20.0), 'ned_s': med(dnLag, 20.0), 'traff': 100 * n_hit / max(1, n_sk), 'korta': 100 * sum(f['short'] for f in L) / max(1, sum(f['segs'] for f in L)),
        'drop_traff': 100 * hits / max(1, n_dr), 'drop_falska': 10 * falska / drop_min, 'drop_ms': med(ms, 1500.0),
        'gr_ratt': 100 * mix['grRatt'] / max(1, mix['skarvar']), 'gr_falska': 10 * mix['grFalsk'] / mix['min'],
    }


def marks(stem):
    j = json.load(io.open(stem + '.events.json', encoding='utf-8')); s0 = j['captureStartWallMs']   # (capturedAt - seconds ligger 5,8 s fel)
    ms = [json.loads(l) for l in io.open(os.path.join(os.path.dirname(stem), 'marks.jsonl'), encoding='utf-8') if l.strip()]
    t = [((m['wallMs'] - s0) / 1000, m['kind']) for m in ms if 0 <= (m['wallMs'] - s0) / 1000 <= j['seconds']]
    return {'file': os.path.basename(stem) + '.wav', 'drop': [round(x, 2) for x, k in t if k == 'drop'], 'alla': [round(x, 2) for x, k in t if k in ('drop', 'mini')]}


def ljusdomare(mapp, run_dir, hold):
    r = subprocess.run([sys.executable, os.path.join(HERE, 'bank.py'), mapp] + (['--holdout'] if hold else []), cwd=ENGINE, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=3600)
    saved = sys.argv; sys.argv = ['domare.py', run_dir] + (['--holdout'] if hold else [])
    try:
        sys.path.insert(0, HERE); import importlib, domare; importlib.reload(domare)
        b = domare.load(os.path.join(run_dir, 'bas')); v = domare.load(mapp)
        if not b: return {'fel': 'saknar bas/' + domare.BANK + ' (domaren: --mat <körning>/bas --bas)'}
        if not v: return {'fel': 'bank.py gick inte: ' + (r.stderr or r.stdout)[-400:]}
        d = domare.doma(b, v, mapp)
    finally: sys.argv = saved
    disk = [x for x in d['disk'] if not x.startswith('förbjudna filer')]
    return {'poang': d['poang'], 'disk': disk}


def mat(a):
    mapp = os.path.abspath(a.mat); run_dir = os.path.dirname(mapp); hold = a.holdout; bas = a.bas
    M = MANGD[hold]; dist = os.path.join(ENGINE, 'dist') if bas else os.path.join(mapp, 'dist')
    assert os.path.exists(os.path.join(dist, 'effects.js')), 'bygg först: python tools/arena/bygg.py ' + a.mat
    if not bas:
        assert os.path.isdir(os.path.join(mapp, 'src')), 'saknar src/'
        nya = [os.path.join(r, f) for r, _, fs in os.walk(os.path.join(mapp, 'src')) for f in fs]
        if max(os.path.getmtime(p) for p in nya) > os.path.getmtime(os.path.join(dist, 'analyser.js')) + 1: sys.exit('dist är äldre än src - bygg om: python tools/arena/bygg.py ' + a.mat)
    env = mkenv(run_dir, mapp, bas); envh = mkenv(run_dir, mapp, bas, hook=True)
    t0 = time.time(); tider = {}; fel = []
    def steg(namn, fn):
        s = time.time()
        try: return fn()
        except Exception as e: fel.append(f'{namn}: {e}'); return None
        finally: tider[namn] = round(time.time() - s)
    def bonus_mat():   # BONUSEN: 300 s realtid, varianten SAMTIDIGT med engine/dist (samma last)
        las()
        try:
            rb, rt = steg('bonus', lambda: par(dist, env, BONUS_WAV, BONUS_S)) or (None, None)
        finally: slapp()
        out = {'mapp': os.path.relpath(mapp, ENGINE), 'bas': bas, 'basenv': basenv(run_dir), 'bonus': rt and {**rt, **hist_pool([rt])},
               'bonusBas': rb and {**rb, **hist_pool([rb])}, 'fel': fel, 'tider': tider}
        io.open(os.path.join(mapp, 'tvavagar-bonus.json'), 'w', encoding='utf-8').write(json.dumps(out, ensure_ascii=False, indent=1))
        for k in ('bonusBas', 'bonus'):
            if out[k]: print(f"  {k}: >=2 hop {out[k]['andel2']} %, taktväg p99 {out[k]['lagP99']} ms, väckning {out[k]['vackUsPerHop']:.2f} us/hop ({out[k]['notifyPerHop']:.2f} notify/hop), cpu {out[k]['cpu']} us/hop")
    if a.bonus and not hold: bonus_mat(); return   # bara bonusen
    cv, cb, runs, bruns, lat = [], [], [], [], None
    las()
    try:
        R = {}
        def lane_a():
            R['mix'] = steg('mix', lambda: kor(dist, env, 'mix', latar(M['korpus'], M['annan'])))
            lat = steg('latens', lambda: latens(M['latens'], envh))
            dfiles = sorted(f for f in os.listdir(os.path.join(ENGINE, DROPDIR)) if f.endswith('.wav'))
            R['drop'] = steg('drop', lambda: kor(dist, env, 'drop', [f'{DROPDIR}/{dfiles[i]}' for i in M['drop']]))
            R['ettan'] = steg('ettan', lambda: kor(dist, env, 'ettan', M['ettan']))
            return lat
        def lane_b():
            R['md5'] = steg('md5', lambda: md5_steg(dist, env, M['md5'], 100000))
            R['lang'] = steg('lang', lambda: kor(dist, env, 'lang', M['lang']))
            R['klipp'] = steg('klipp', lambda: kor(dist, env, 'klipp', [[F6(c[0])] + list(c[1:]) for c in M['korpus']]))
            if bas and not hold: R['md5snabb'] = steg('md5snabb', lambda: md5_steg(dist, env, [L1021], SNABB_S))
        with ThreadPoolExecutor(max_workers=2) as ex:   # BATCHFASEN: två processer parallellt
            fa = ex.submit(lane_a); fb = ex.submit(lane_b); lat = fa.result(); fb.result()
        if M['marks']: R['marks'] = marks(os.path.join(ENGINE, M['marks'][0]))
        # CPU-FASEN: huvudtrådens CPU i motorns worker-läge i full fart (dmxDump DUMP_SPLIT=worker), 5 par variant/bas växelvis (ABBA).
        # I realtid gick det inte: Windows räknar trådens CPU i klocktick à 15,6 ms och huvudtråden arbetar ~5 % av tiden, så en körning
        # på 45 s är ~45 tick = +-15 % (bas mot bas samtidigt: kvot 0,83). I full fart arbetar tråden hela tiden: +-3 % per körning.
        for i in range(CPU_N):
            for vem in ((0, 1) if i % 2 == 0 else (1, 0)):
                r = steg(f'cpu{i}{"bv"[vem]}', lambda: cpu_batch(os.path.join(ENGINE, 'dist') if vem == 0 else dist, env, M['cpu'], CPU_S))
                if r is not None: (cb if vem == 0 else cv).append(r)
        # REALTIDSFASEN (gränsen + väckningen, informativt cpu): EN körning av varianten SAMTIDIGT med en av engine/dist (samma last)
        rp = steg('realtid', lambda: par(dist, env, M['cpu'], RT_S))
        runs, bruns = ([rp[1]], [rp[0]]) if rp else ([], [])
    finally: slapp()
    q = steg('kvalitet', lambda: kvalitet(R, hold)) if all(R.get(k) for k in ('lang', 'mix', 'klipp', 'drop', 'ettan')) else None
    cpu = None
    if cv and cb:
        mv, mb = statistics.median(cv), statistics.median(cb)
        cpu = {'runs': cv, 'basRuns': cb, 'us': mv, 'basUs': mb, 'kvot': round(mv / mb, 4), 'spridningPct': round(100 * (max(cv) - min(cv)) / mv, 1),
               'realtidUs': runs[0]['cpu'] if runs else None, 'realtidBasUs': bruns[0]['cpu'] if bruns else None}
        if bas: cpu['brusPct'] = round(100 * abs(mv - mb) / mb, 2)   # bas mot bas = bruset i kvoten
    rtb = hist_pool(bruns) if bruns else None
    rt = {**hist_pool(runs), 'basP99Hop': rtb and rtb['p99Hop'], 'lagP99': statistics.median(r['lagP99'] for r in runs), 'vackUsPerHop': statistics.median(r['vackUsPerHop'] for r in runs),
          'notifyPerHop': statistics.median(r['notifyPerHop'] for r in runs)} if runs else None
    # SPÄRREN: md5 mot bas
    bj = None if bas else load(os.path.join(run_dir, 'bas'), 'tvavagar-holdout.json' if hold else 'tvavagar.json')
    md5lika, ljus = (True, None) if bas else (None, None)
    if not bas:
        if not bj: fel.append('saknar bas-mätningen - domaren kör: --mat <körning>/bas --bas' + (' --holdout' if hold else ''))
        elif R.get('md5'):
            md5lika = R['md5'] == bj.get('md5')
            if not md5lika: ljus = steg('ljusdomare', lambda: ljusdomare(mapp, run_dir, hold))
    else:
        steg('bank_bas', lambda: subprocess.run([sys.executable, os.path.join(HERE, 'bank.py'), mapp, '--bas'] + (['--holdout'] if hold else []), cwd=ENGINE, capture_output=True, timeout=3600))
    out = {'mapp': os.path.relpath(mapp, ENGINE), 'bas': bas, 'holdout': hold, 'basenv': basenv(run_dir),
           'git': subprocess.run(['git', 'rev-parse', '--short', 'HEAD'], cwd=ENGINE, capture_output=True, text=True).stdout.strip(),
           'kvalitet': q, 'cpu': cpu, 'realtid': rt, 'latens': lat, 'md5': R.get('md5'), 'md5snabb': R.get('md5snabb'), 'md5Lika': md5lika, 'ljusdomare': ljus,
           'detalj': {k: R.get(k) for k in ('mix', 'klipp', 'drop', 'ettan', 'marks')} | {'lang': [{k: v for k, v in f.items() if k != 'grid'} for f in (R.get('lang') or [])]},
           'fel': fel, 'tider': tider, 'tidS': round(time.time() - t0)}
    io.open(os.path.join(mapp, 'tvavagar-holdout.json' if hold else 'tvavagar.json'), 'w', encoding='utf-8').write(json.dumps(out, ensure_ascii=False, indent=1))
    print(f"MÄTT {out['mapp']}{' KONTROLLMÄNGDEN' if hold else ''} {out['tidS']} s  steg {tider}")
    if q: print('  ' + '  '.join(f'{k} {v:.2f}' for k, v in q.items()))
    if cpu: print(f"  cpu {cpu['us']:.2f} us/hop mot bas {cpu['basUs']:.2f} = kvot {cpu['kvot']} (körningar {cpu['runs']} / bas {cpu['basRuns']}; realtid {cpu['realtidUs']}/{cpu['realtidBasUs']})  realtid p99 {rt['p99Hop']} hop, >=2 hop {rt['andel2']} %, väckning {rt['vackUsPerHop']:.2f} us/hop")
    if lat: print(f"  latens {lat}")
    print(f"  md5 lika {md5lika}  ljusdomare {ljus}")
    if a.bonus: bonus_mat()   # --holdout --bonus: bonusen efter holdout-mätningen
    if fel: print('  FEL: ' + '; '.join(fel))


def snabb(a):
    mapp = os.path.abspath(a.snabb); run_dir = os.path.dirname(mapp); dist = os.path.join(mapp, 'dist'); env = mkenv(run_dir, mapp, False); t0 = time.time()
    assert os.path.exists(os.path.join(dist, 'effects.js')), 'bygg först: python tools/arena/bygg.py ' + a.snabb
    bj = load(os.path.join(run_dir, 'bas'), 'tvavagar.json'); ref = (bj or {}).get('md5snabb') or md5_steg(os.path.join(ENGINE, 'dist'), env, [L1021], SNABB_S)
    m = md5_steg(dist, env, [L1021], SNABB_S)
    diff = [k for k in ref if ref[k] != m.get(k)]
    print(f"SNABBKOLL {os.path.relpath(mapp, ENGINE)} {round(time.time() - t0)} s: md5 120 s lang1021 {'IDENTISK' if not diff else 'SKILJER i ' + ', '.join(diff) + ' (då döms ljuset av bank.py/domare.py i --mat)'}"
          )


def load(d, fn):
    try: return json.load(io.open(os.path.join(d, fn), encoding='utf-8'))
    except Exception: return None


def bonus_poang(b, v):
    if not v or not v.get('bonus') or not (v.get('bonusBas') or (b and b.get('bonus'))): return 0.0, ''
    B, V = v.get('bonusBas') or b['bonus'], v['bonus']   # mot parets bas (samma last), annars basens bonusmätning
    if V['andel2'] > BONUS_TOL * B['andel2'] or V['lagP99'] > BONUS_TOL * B['lagP99'] or V['vackUsPerHop'] > BONUS_TOL * B['vackUsPerHop']: return 0.0, 'sämre än bas på något'
    p = (max(0, math.floor(math.log2(B['andel2'] / max(V['andel2'], 1e-9)))) if B['andel2'] > 0 else 0) + (1 if V['lagP99'] <= B['lagP99'] / 2 else 0) + (1 if V['vackUsPerHop'] <= B['vackUsPerHop'] / 2 else 0)
    return float(min(3, p)), f"≥2 hop {B['andel2']}->{V['andel2']} %, p99 {B['lagP99']}->{V['lagP99']} ms, väckning {B['vackUsPerHop']:.2f}->{V['vackUsPerHop']:.2f} µs"


def ranking(a):
    rd = os.path.abspath(a.korning); hold = a.holdout; fn = 'tvavagar-holdout.json' if hold else 'tvavagar.json'
    B = load(os.path.join(rd, 'bas'), fn)
    if not B: sys.exit(f'saknar bas/{fn} - mät baslinjen först: python tools/arena/tvavagar.py --mat {a.korning}/bas --bas' + (' --holdout' if hold else ''))
    bb = load(os.path.join(rd, 'bas'), 'tvavagar-bonus.json'); X = B['realtid']['p99Hop'] + 1
    rows = []
    for name in sorted(os.listdir(rd)):
        d = os.path.join(rd, name); V = load(d, fn)
        if name == 'bas' or not V: continue
        disk = list(V.get('fel') or [])
        if not V.get('kvalitet') or not V.get('cpu') or not V.get('latens'): disk.append('mätningen ofullständig')
        rt = V.get('realtid') or {}
        Xv = max(X, (rt.get('basP99Hop') or 0) + 1)   # X = bas p99 + 1 hop (basmätningen eller parets bas, den högre: samma last)
        if rt and rt['p99Hop'] > Xv: disk.append(f"worker p99 {rt['p99Hop']} hop > X {Xv}")
        if V.get('md5Lika') is False:
            lj = V.get('ljusdomare') or {}
            if 'fel' in lj or lj.get('poang') is None: disk.append('ljusdomaren: ' + str(lj.get('fel', 'saknas'))[:120])
            elif lj['poang'] < SPARR_LJUS: disk.append(f"ljusdomaren {lj['poang']:+.1f} < {SPARR_LJUS}")
            elif lj['disk']: disk.append('ljusdomaren: ' + '; '.join(lj['disk']))
        elif V.get('md5Lika') is None: disk.append('md5 ej jämförd')
        q = {}
        if V.get('kvalitet'):
            for k, _, dr, g in MATT: q[k] = rel(V['kvalitet'][k], B['kvalitet'][k], dr, g)
        lang = sum(q.values()) / len(MATT) if q else 0.0
        cpu = rel(V['cpu']['kvot'], 1.0, -1, 1e-6) if V.get('cpu') else 0.0   # mot engine/dist i samma mätning (ABBA)
        lat = rel(V['latens']['ms'], B['latens']['ms'], -1, 10) if V.get('latens') else 0.0
        sn = (cpu + lat) / 2
        bo, btxt = bonus_poang(bb, load(d, 'tvavagar-bonus.json'))
        rows.append((name, {'poang': W_LANGSAM * lang + W_SNABB * sn + bo, 'lang': lang, 'snabb': sn, 'cpu': cpu, 'lat': lat, 'bonus': bo, 'btxt': btxt, 'q': q, 'V': V, 'disk': disk}))
    rows.sort(key=lambda r: (bool(r[1]['disk']), -r[1]['poang']))
    Bc = B['cpu']
    L = [f"# Ranking {os.path.basename(rd)} - analysatorns två vägar{' KONTROLLMÄNGDEN' if hold else ''} (tools/arena/tvavagar.py, mot bas)", '',
         f"poäng = {W_LANGSAM} x långsamma (medel av {len(MATT)} mått, % mot bas, +-{KLIPP_PCT:.0f} %) + {W_SNABB} x snabba (cpu, latens) + bonus. "
         f"bas: cpu {Bc['us']:.2f} us/hop (cpu % = kvoten mot engine/dist i samma mätning, ABBA; bruset bas mot bas {Bc.get('brusPct')} %), latens {B['latens']['ms']} ms, worker p99 {B['realtid']['p99Hop']} hop -> X = {X}", '',
         '| plats | deltagare | poäng | långsamma % | snabba % | cpu % | latens % | bonus | cpu us/hop | latens ms | p99 hop | md5 | ljusdomare | DISK |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|']
    for i, (n, r) in enumerate(rows, 1):
        V = r['V']; lj = V.get('ljusdomare') or {}
        L.append(f"| {i} | {n} | {r['poang']:+.2f} | {r['lang']:+.2f} | {r['snabb']:+.2f} | {r['cpu']:+.2f} | {r['lat']:+.2f} | {r['bonus']:.0f} | {(V.get('cpu') or {}).get('us', float('nan')):.2f} | "
                 f"{(V.get('latens') or {}).get('ms', '-')} | {(V.get('realtid') or {}).get('p99Hop', '-')} | {'lika' if V.get('md5Lika') else 'skiljer' if V.get('md5Lika') is False else '-'} | "
                 f"{'' if not lj else (format(lj['poang'], '+.1f') if lj.get('poang') is not None else 'fel')} | {'; '.join(r['disk']) or '-'} |")
    L += ['', '## Måtten (% mot bas, + = bättre; bas-värdet i rubriken)', '', '| deltagare | ' + ' | '.join(f"{k} ({B['kvalitet'][k]:.2f})" for k, *_ in MATT) + ' |', '|---|' + '---|' * len(MATT)]
    for n, r in rows: L.append(f'| {n} | ' + ' | '.join(f"{r['q'].get(k, 0):+.1f}" for k, *_ in MATT) + ' |')
    if any(r['btxt'] for _, r in rows): L += ['', '## Bonus', ''] + [f"- {n}: {r['bonus']:.0f} ({r['btxt']})" for n, r in rows if r['btxt']]
    txt = '\n'.join(L) + '\n'; print(txt)
    if a.md: io.open(os.path.join(rd, 'ranking-tvavagar-holdout.md' if hold else 'ranking-tvavagar.md'), 'w', encoding='utf-8').write(txt)


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description='Domaren för arenan analysatorns två vägar (se filhuvudet)')
    ap.add_argument('korning', nargs='?'); ap.add_argument('--mat'); ap.add_argument('--snabb'); ap.add_argument('--bas', action='store_true')
    ap.add_argument('--holdout', action='store_true'); ap.add_argument('--bonus', action='store_true'); ap.add_argument('--md', action='store_true')
    a = ap.parse_args()
    if a.mat: mat(a)
    elif a.snabb: snabb(a)
    elif a.korning: ranking(a)
    else: ap.print_help()
