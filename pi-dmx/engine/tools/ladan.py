"""EN KORNING I LADAN (2026-09-22). Gor allt som behovs nar Pi-DMX ar nabar: hittar Pi:n, bygger om vid behov, deployar
alla dist-filer som skiljer sig (md5-diff, node --check, backup, sudo cp), skriver show-env:en och startar om EN gang.

  cd C:\\Users\\richa\\Desktop\\Claude\\dmx-control\\pi-dmx\\engine
  set PI_PASS=<losenordet>  &&  python tools\\ladan.py            (eller: PI_PASS=... python tools/ladan.py)
  python tools\\ladan.py --dry          visar vad som skulle hanta, ror ingenting
  python tools\\ladan.py --bara-deploy  deployar filer men ror inte env:en
  python tools\\ladan.py --env DMX_X=1  lagger till/andrar en rad i show-env:en

Pi:n nas antingen via sitt eget AP (anslut till WiFi 'pi-dmx' -> 192.168.4.1) eller pa hemnatet/hotspot. Skriptet provar
adresserna i ordning och anvander den som svarar. Losenordet las ur PI_PASS eller %USERPROFILE%\\.lotus-secrets\\pi-dmx.pass
och skrivs aldrig ut.

SHOW-ENV (lotus-portarna, alla bevisade i korbanken pa lotus-korpusen via tools/lotusBenchShim.mjs - se ENV-LADAN.md):
skrivs till /etc/systemd/system/audio-dmx-engine.service.d/lotus.conf och rorbestaende tempo.conf/drop.conf lamnas ifred.
"""
import os, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
ENGINE = os.path.normpath(os.path.join(HERE, '..'))
HOSTS = ([os.environ['PI_HOST']] if os.environ.get('PI_HOST') else []) + ['192.168.4.1', '172.29.167.218', '192.168.1.176']
ARGS = sys.argv[1:]
DRY = '--dry' in ARGS
ONLY_DEPLOY = '--bara-deploy' in ARGS
FROZEN = ARGS[ARGS.index('--fran') + 1] if '--fran' in ARGS else None   # deploya en fryst kopia i stallet for dist/
EXTRA = [ARGS[i + 1] for i, a in enumerate(ARGS) if a == '--env']
PORTAR = '--portar' in ARGS   # skriv aven PORTAR_EJ_LIVE (lotus-portarna) - eget A/B-steg

# Show-env: EN rad per port, med skalet. Andra har - inte pa Pi:n - sa nasta korning inte tar tillbaka det.
# LOTUS-PORTARNA (tempo/kick/grid/tystnad) ar INTE live i ladan: lotus.conf rullades tillbaka 09-22 23:35 ("nastan 0 show") och Pi:n
# kordes 09-22 kvall och 09-23 utan dem. De skrivs bara med flaggan --portar (eget A/B-steg), sa en vanlig korning inte slar pa dem tyst.
PORTAR_EJ_LIVE = [
    ('DMX_TEMPO_EVIDENCE', '1',      'tempovalet pa slagpoang i stallet for tempogramtopp (lotus: 57/91 mot 46/91)'),
    ('DMX_TEMPO_ENV_S',    '10',     'onset-ringen 10 s - kort ring gav instabilt tempo pa langsamt material'),
    ('DMX_KICK_NOGATE',    '1',      'kickarna grindas inte mot eget grid (lotus: on-beat 0,63 -> 0,95)'),
    ('DMX_KICK_COOLDOWN',  '100',    'baston strax fore slaget skuggade slagets kick i 170 ms'),
    ('DMX_GRID_PHASE',     '1',      'fasen ur bas + helband i stallet for senaste kicken (bank: i fas 77/130, motfas 5)'),
    ('DMX_PHASE_FOLLOW',   '1',      'gridet foljer fasmatningen i stallet for enskilda kickar'),
    ('DMX_GRID_PHASE_OFFSET_MS', '15', 'onset-frontens konstanta 15 ms (lotus LIVE 09-23)'),
    ('DMX_TEMPO_UP43',     '1',      'AV i ladan: med DMX-profilen 18 -> 17/21 pa ladans mixklipp (lotus: 171 -> 180/214, LIVE dar)'),
    ('DMX_SILENCE_LEVEL',  '0.03',   'ladans tystnadstroskel - standard 0,05 slackte riggen pa tysta fraser'),
    ('DMX_SILENCE_MS',     '2000',   'sa lange maste det vara tyst innan grinden borjar stanga (standard 250 ms)'),
    ('DMX_SILENCE_RELEASE_S', '1.0', 'mjuk aterhamtning i stallet for 0,25 s'),
]
SHOW_ENV = [
    ('DMX_SECTION',        '1',      'sektioner som DATA - KRAVS av lugn-grinden nedan (levelVsHighDb). INTE lookstyrning, se DMX_SECTION_SWITCH'),
    # DMX_SECTION_SWITCH AV 2026-09-22 22:40 (ladan, live): sektionsdetektorn last pa 'high' (13 av 15 lookbyten i high)
    # -> dirigenten plockade bara ur full-fart-poolen och allt sag likadant ut. Sektionerna ar kvar som DATA (DMX_SECTION=1);
    # slas pa igen forst nar rangen ger vettig fordelning i ladans material.
    # DMX_LIVE_LEVEL AV 2026-09-22 22:50 (ladan, live): nivan kollapsade till 0,003-0,012 om och om igen medan RA vu lag
    # pa 0,2-0,6 - armaturerna gick ner till tandpunkten en efter en ('1, sen 3, sen alla'). 10 dB-fonstret mot det
    # langsamma ankaret (tau 120 s) bottnar pa ladans komprimerade material. Slas pa igen forst efter tuning av
    # LIVE_WIN_DB/LIVE_ANCHOR_S mot inspelat ljud fran ladan - inte live mitt i en spelning.
    # LADANS EGNA VARDEN (2026-09-22 23:00): de satt bara i korningen (wsset) och gick forlorade vid varje omstart -
    # riggen slacktes i tysta fraser ("lamporna stangs av"). Utgangen multipliceras med tystnadsgrinden (drive), sa
    # standard 0,05/250/0,25 nollar ljuset sa fort en fras dippar. Koden dokumenterar sjalv ladans varden.
    # KVALLEN 2026-09-22 23:00-24:00 I LADAN. Varje rad nedan kommer ur ett uttalande + en matning, inte ur en gissning.
    # Filen ar sanningen: allt harunder satt fram till nu BARA som drop-ins pa Pi:n och hade forsvunnit vid nasta korning.
    ('DMX_ATTACK_MS',      '20',     'ladans utgangsattack - 90 ms smetade ut slagen ("heartbeat syns inte")'),
    ('BEAT_MIN',           '0.2',    'pulsgolv 0,2 med DEPTH_GAIN 0,8: pulsen nar botten precis vid nasta slag i st.f. att klippas och sta platt 170 ms (DMX-sond ladan 09-24: platae+ryck = "hackigt")'),
    ('DEPTH_GAIN',         '0.8',    'djupfaktor (drop.conf 1,4 klippte pulsen i golvet); lagre faktor + lagre golv = djupare utan platae'),
    ('DMX_BEAT_RELEASE_S', '0.3',    'hjartslagets fade ner'),
    ('LIGHT_FLOOR',        '0.25',   'GASEN: md = golv + (1-golv) x loudness. 0,45 gav bara halva vagen ("pulsar inte med energi")'),
    ('DMX_FLOOR_CH',       '40',     'SHOW-GOLV i DMX-steg = 16 %. Armaturernas tandpunkt (cal.on=16 av 255) ar 6 % och laser som slackt'),
    ('DMX_TIER_HI',        '0.55',   'FULLFART var OATKOMLIG: kravde 0,78, ladans intensitet ar 0,00-0,49, drop-snappen 0,75'),
    ('DMX_TIER_LO',        '0.22',   'ger fart-poolen mer speltid an lugn-poolen ("kor nastan bara samma effekter")'),
    ('DMX_DWELL_MS',       '45000',  'reservtimer; 120 s gav NOLL lookbyten pa 12 min nar energin sta stilla'),
    ('DMX_CLEAR_BASS',     '0.78',   'toggle-poolen vid tydlig basgang. 0,4 tvingade den standigt, 0,9 ligger utanfor ladans skala (max 0,75)'),
    ('DROP_SNAP_MS',       '0',      'smallen vantade in nasta slag (upp till 150 ms) - "drop kommer nastan en takt sent"'),
    ('BODY_FAST_S',        '0.06',   'baskroppens filter. 0,04 sparade 20 ms men gav "massa drops i lugna partier" - aldrig lagre'),
    # DROP-GRIND I LUGNA PARTIER ("kor drop pa intro" + "missa riktiga droppen"): i lugna partier (>= 6 dB under senaste
    # refrangen) kravs starkare bevis; en kandidat NEKAS inte utan HALLS och fyrar forst nar kroppen legat kvar vid toppen
    # i 300 ms. DMX_SECTION=1 ar ett KRAV - levelVsHighDb raknas bara nar sektionsmaskineriet kors (analyser.ts rad 2783),
    # annars ar hela grinden inert. Sektionerna ar DATA har.
    ('DMX_DROP_CALM_GATE', '1',      'lugna partier kraver starkare bevis for drop'),
    ('DROP_CALM_BUILD',    '0.25',   'riser-kravet (0 = grinden inert)'),
    ('DROP_CALM_LAND_MS',  '0',      'NEKA dropen i lugna partier (agaren i ladan 09-23: "i lugn, ta bort drop helt"); 300 = hall och fyra vid landning'),
    # LATBYTE -> SEKTIONEN NOLLAS (2026-09-23, port fran lotus dar det ar verifierat live: 'intro' vid ny lat 2 % -> 5/5).
    # Sektionsmaskineriet nollades bara vid 10 s tystnad, sa i en megamix jamfordes nya laten mot FORRA latens block och
    # 'intro' (som drop-grinden hanger pa) kunde aldrig intraffa efter forsta laten = "falska drops vid latbyte/intro".
    # Signalen kommer fran boundaryDetector.ts (klangskifte/tempo/nivadipp) via DMX_BOUNDARY_SOFT-hinten i index.ts.
    # LADAN 09-23 kvall (allt ogonbedomt av agaren, "mycket battre"):
    ('DMX_SECTION_SWITCH', '1',      'sektionsstyrning PA igen (rotorsaken till last-pa-high ar SECTION_ON_HINT)'),
    ('DMX_SECTION_UNIT',   '1',      'sektionen ar enheten: byte bara vid ra sektionsgrans (>= 4 s gammal)/drop/basgang, samma look per sektionstyp'),
    ('DMX_SECTION_TRACE',  '1',      'sektionsbyten i journalen (bara logg)'),
    ('DMX_ENERGY_FALLBACK','1',      'utan taktlas: puls pa breda transienter + storre energisving ("dor inte emellanat")'),
    ('DMX_HUE_LIFT',       '1',      'kulorlyft i kalibreringen: starkaste kanalen till tandpunkten, kuloren bevaras (standard pa; 0 = per kanal som forr)'),
    ('DMX_SECTION_CONTRAST','rank',   'ljus foljer KAUSAL RANG (midHi/bas/diskant mot laten) i st.f. refrangetiketten (AUC 0,55): facit-test 41 latar refrang/vers 1,12 -> 1,34'),
    ('DMX_SECTION_RANK_LOW','0.35',  'versgolv; full niva fran rangmedianen (RANK_KNEE 0,5 i koden): facit-test refrang/vers 1,12 -> 1,27 med medelljus kvar 12 % (linjart gav 8 %, "knappt heart-beat eller energi")'),
    ('DMX_SECTION_EARLY_S','45',      'forsta 45 s: refrang kraver +3 dB mot latens median (test: falsk-high 0,50 -> 0,46, refrang 2 igenkand 12 -> 9 s)'),
    ('DMX_SECTION_ON_HINT', '1',     'latgransen nollar sektionshistoriken - annars jamfors nya laten mot forra latens'),
    # DMX_SECTION_SWITCH AV (2026-09-22 22:40, ladan live): sektionsdetektorn last pa 'high' (13 av 15 lookbyten i high)
    # -> dirigenten plockade bara ur full-fart-poolen och allt sag likadant ut. Slas pa igen forst nar rangen ger vettig
    # fordelning i ladans material. Sektionerna ar kvar som DATA ovan.
    # DMX_LIVE_LEVEL AV (2026-09-22 22:50): nivan kollapsade till 0,003-0,012 medan RA vu lag pa 0,2-0,6, och eftersom
    # energitaket multipliceras ovanpa gick armaturerna ner till tandpunkten en efter en ("lamporna stangs av").
    # dB-fonstrets ankare (tau 120 s) passar inte ladans komprimerade PA. Det ar anda RATT vag - agaren pekar sjalv pa
    # BLE-lampan ("dar har vi skon rytm i brightness") - men den ska tunas mot INSPELAT ladljud, inte live i en spelning.
    # LADAN 09-24 KVALL (ogonbedomt): portarna ovan AV igen (tempot vandrade 109-121, fasprediktion 0,4-0,6, fladder/dubbeltakt);
    # lotus-porten i ENERGY_FB (las pa 12 rena slag, tystnadspaus) gjorde pulsen urvattnad ('puls 0,93') -> av; heart-beat-lagret tog
    # hjartslaget fran 41 av 46 effekter -> gamla vagen; energin fran intensity rorde sig 0,012/s -> lotus nivakanal 6/6 dB ('mycket battre energi').
    ('DMX_HEARTBEAT',      '0',      'gamla kompositionen: hjartslag + energi pa alla effekter (lagret gav 5 av 46 effekter puls)'),
    ('DMX_BEAT_LOCK_BEATS','0',      'inget krav pa rena slag i rad for rastret (natt sallan i ladan)'),
    ('DMX_BEAT_QUIET_BEATS','0',     'ingen tystnadspaus av rastret'),
    ('DMX_ENERGY_RISE_K',  '3',      'energi direkt, dodzon 6 % i koden'),
    ('DMX_LIVE_LEVEL',     '1',      'lotus nivakanal: energin foljer ljudnivan sekund for sekund (intensity rorde sig 0,012/s)'),
    ('LIVE_WIN_DB',        '6',      'fonster 6 dB (lotus 09-24)'),
    ('DMX_ANALYSER_SPLIT', 'worker', 'tempo/gridfas/sektion i egen trad (analysatorn 4 ms/hop utan i ladan 09-24)'),
    ('LIVE_OFFSET_DB',     '6',      'toppen 6 dB over ankaret: pop median 0,69, p10-p90 0,34-0,92'),
]


# RENSNINGEN 2026-09-23: inlarnings-/offline-stacken ar borta ur motorn (latminne, fingeravtryck, inspelare, tvatt,
# strukturko, namngivning - 2 984 rader). deploy-dist.py kopierar bara filer som finns lokalt och raderar aldrig, sa det
# som lag kvar pa Pi:n skulle ligga kvar for alltid. Allt har flyttas till <namn>.bak-<ts> (aldrig rm) sa det gar att
# angra. Datafilerna ar inlarningens rester: songs.bin, structure.json, temp-WAV:ar och koade analyser.
REMOVE = [
    '/opt/audio-dmx-engine/dist/songMemory.js', '/opt/audio-dmx-engine/dist/fingerprint.js',
    '/opt/audio-dmx-engine/dist/structureQueue.js', '/opt/audio-dmx-engine/dist/identify.js',
    '/opt/audio-dmx-engine/dist/learnRecorder.js', '/opt/audio-dmx-engine/dist/refineQueue.js',
    '/opt/audio-dmx-engine/public/structure-worker.js',
    '/opt/audio-dmx-engine/tools/refineSong.mjs', '/opt/audio-dmx-engine/tools/replay.mjs',   # bara Pi-kopiorna; PC-banken behaller sina
    '/var/lib/audio-dmx-engine/songs.bin', '/var/lib/audio-dmx-engine/structure.json',
    '/var/lib/audio-dmx-engine/*.wav', '/var/lib/audio-dmx-engine/*.pending.wav',
    # EFFEKTOVERSYNEN 2026-09-23: innerouter (rPerm 1,00 mot varannan) och neon (aldrig vald, ingen egen signal) ar borta ur
    # registret; filerna pa Pi:n flyttas till .bak sa dist/effects/ inte har spokfiler.
    '/opt/audio-dmx-engine/dist/effects/innerouter.js', '/opt/audio-dmx-engine/dist/effects/neon.js',
    # KVALLENS TESTFILER 09-24 (allt star nu i SHOW_ENV -> lotus.conf); hjarta.conf satte DMX_HEARTBEAT=1 och laddas EFTER lotus.conf.
    '/etc/systemd/system/audio-dmx-engine.service.d/hjarta.conf', '/etc/systemd/system/audio-dmx-engine.service.d/energi.conf',
    '/etc/systemd/system/audio-dmx-engine.service.d/sektion.conf', '/etc/systemd/system/audio-dmx-engine.service.d/zzz-lugn.conf',
    '/etc/systemd/system/audio-dmx-engine.service.d/zzzz-ogat.conf', '/etc/systemd/system/audio-dmx-engine.service.d/split.conf',
]


def pw():
    p = os.environ.get('PI_PASS')
    if p: return p
    f = os.path.expanduser('~/.lotus-secrets/pi-dmx.pass')
    if os.path.exists(f): return open(f).read().strip()
    return 'raspberry'   # Pi-DMX:ns standardlosenord (appliance utan internet); PI_PASS eller ~/.lotus-secrets/pi-dmx.pass vinner


def reachable(host, pw_):
    try:
        import paramiko
        c = paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        c.connect(host, username='pi', password=pw_, timeout=6, look_for_keys=False, allow_agent=False)
        i, o, e = c.exec_command('systemctl is-active audio-dmx-engine', timeout=10)
        st = o.read().decode().strip(); c.close()
        return st
    except Exception:
        return None


def newest(path, exts):
    t = 0
    for root, _dirs, fs in os.walk(path):
        if 'node_modules' in root: continue
        for f in fs:
            if f.endswith(exts): t = max(t, os.path.getmtime(os.path.join(root, f)))
    return t


def main():
    p = pw()
    host = None
    for h in HOSTS:
        st = reachable(h, p)
        if st is not None:
            host = h; print(f'Pi-DMX svarar pa {h} (tjansten: {st})'); break
        print(f'  {h} svarar inte')
    if not host:
        sys.exit('Pi-DMX gar inte att na. Anslut till WiFi "pi-dmx" (eller satt PI_HOST) och kor igen.')

    if FROZEN:
        import shutil
        print(f'deployar FRYST kopia: {FROZEN}')
        if not DRY:
            for root, _d, fs in os.walk(FROZEN):
                rel = os.path.relpath(root, FROZEN)
                dst = os.path.join(ENGINE, 'dist', rel) if rel != '.' else os.path.join(ENGINE, 'dist')
                os.makedirs(dst, exist_ok=True)
                for f in fs: shutil.copy2(os.path.join(root, f), os.path.join(dst, f))
    src_t = 0 if FROZEN else newest(os.path.join(ENGINE, 'src'), ('.ts',))
    dist_t = newest(os.path.join(ENGINE, 'dist'), ('.js',))
    if src_t > dist_t:
        print('kallkoden ar nyare an bygget - bygger om (npx tsc -p .)')
        if not DRY:
            r = subprocess.run(['npx', 'tsc', '-p', '.'], cwd=ENGINE, shell=True)
            if r.returncode: sys.exit('bygget misslyckades - deployar inget')
    else:
        print('bygget ar aktuellt')

    env_pairs = [f'{k}={v}' for k, v, _why in (SHOW_ENV + (PORTAR_EJ_LIVE if PORTAR else []))] + EXTRA
    cmd = [sys.executable, os.path.join(HERE, 'deploy-dist.py')]
    if DRY: cmd.append('--dry')
    if not ONLY_DEPLOY:
        cmd += ['--conf', 'lotus']
        for e in env_pairs: cmd += ['--env', e]
    for r in REMOVE: cmd += ['--remove', r]   # alltid, aven med --bara-deploy: rensningen ar en del av koden
    print('\nshow-env som skrivs till lotus.conf:' if not ONLY_DEPLOY else '\n(env orord)')
    for k, v, why in SHOW_ENV:
        if not ONLY_DEPLOY: print(f'  {k}={v:<6} {why}')
    for e in EXTRA: print(f'  {e}   (extra fran kommandoraden)')
    print()
    os.environ['PI_HOST'] = host; os.environ['PI_PASS'] = p
    os.environ['PYTHONIOENCODING'] = 'utf-8'   # annars dor deploy-dist.py pa en pil i en utskrift (cp1252-konsol i ladan)
    sys.exit(subprocess.run(cmd, cwd=ENGINE).returncode)


if __name__ == '__main__':
    main()
