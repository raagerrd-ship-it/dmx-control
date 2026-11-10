"""EN KLOCKA FÖR BÅDA - LOTUS-SIDANS DOMARE.  python tools/arena/lotusbank.py <mapp> [--bas] [--beat-feed inline] [--snabb] [--fas klocka] [--ref]

Bygger en lotus-analysator i <mapp>/lotus/ och kör lotus tempobänk (lotus-light-link/tools/tempo-facit-pc/bench.mjs) på den,
skriver <mapp>/lotusbank.json. lotus-light-link LÄSES bara (källor, korpus, manifest, bench.mjs, typescript) - ingenting skrivs där.

BYGGET (<mapp>/lotus/src/audio-analyser -> <mapp>/lotus/dist/audio-analyser, lotus tsconfig = NodeNext)
  - lotus pi/src/audio-analyser/*.ts kopieras (index.ts, analyserProfile.ts = LOTUS EGEN profil, beatClock.ts ...),
  - de delade filerna analyser.ts, split.ts, slowWorker.ts, analyserClock.ts ersätts med <mapp>/src/*.ts, med --bas med engine/src.
    (recorder.ts är delad men importeras inte av analysatorn - lotus kopia saknar den; den behövs inte för bänken.)
  - --ref: INGEN ersättning = lotus egen kopia orörd (referensen som --bas ska träffa).
  - --beat-feed inline: BEAT_FEED: 'inline' skrivs in i profilens sys (samma som env LOTUS_BEAT_FEED=inline, sysEnv läser båda).
    Då kör analyser.ts klockan (analyserClock.ts BeatFeed) sist i process(). KONTROLLERAT (engine/src HEAD 5e81d13):
      frame.bpm / frame.bpmConfidence = klockans (analyserClock.update skriver dem, och setClock -> analysatorns localBpm),
      frame.beatAnchorMs = INTE klockan - analysatorns senaste kick som förr. Klockans rutnät finns bara i an.clockOut.beat
      (publishClock(cfg) kopierar det till motorns cfg). Bänkens 'fas' läser frame.beatPhaseMs = analysatorns egen gridfas
      (LOTUS_GRID_PHASE), inte klockans. --fas klocka byter beatPhaseMs mot klockans ankare (clockOut.beat.anchorMs, med
      GRID_EARLY/TG_GRID_EXTRA-förskjutningen) så 'fas'/'följare raw' mäter klockans rutnät; följarna f1-f3 grindar på
      beatPhaseConf (lotus skala) och sätts då till 1 + klockans tillit - läs bara 'raw' i det läget.
  - BÄNKKLOCKAN: klockan anropas med Date.now(). bench.mjs byter den inte (lotus egen väg läser bara den virtuella klockan),
    så <mapp>/lotus/dist/benchEntry.mjs lindar createAnalyser: advance/setVirtualClock(ms) sätter Date.now = 1,7e12 + ms
    (= analysatorns wallNow). Utan detta ser klockan PC:ns väggklocka (~20x realtid) och tempot blir skräp. För lotus egen
    väg (OWN_TEMPO) är lindningen neutral - verifierat: --bas med lindning = --ref utan lindning, tal för tal.

KÖRNINGEN: node bench.mjs --analyser <mapp>/lotus/dist/benchEntry.mjs --dir corpus --synth corpus-synth, BENCH_MANIFEST =
  bench-manifest.txt (fryst, 503 filer), env = nightly.py 'live' + BENCH_GRID=1 (GRID läggs på alla varianter i nightly.py).
  Av LIVE läses i dag (11-09) av koden: TEMPO_EVIDENCE, TEMPO_ENV_S=10, KICK_NOGATE, KICK_COOLDOWN=100, GRID_PHASE, TEMPO_UP43,
  TEMPO_FIVE4. TEMPO_SHIFT och TEMPO_HOLD blev KOD vid kodstädningen 10-22 (ingen sysEnv läser dem) - skickas med ändå, utan verkan.
  --snabb: var 4:e fil i den sorterade manifestlistan (126 filer, deterministisk), skrivs till <mapp>/manifest-snabb.txt. Syntet alltid alla 8.

MÅTTEN (lotusbank.json, ur bench.mjs utskrift)
  korpus  ok/n rätt (lika) + klasser (lika/dubbla/halva/3/2/2/3/4/3/3/4/annat) + spann-median
  synt    ok/8
  kick    recall / precision / bias ms (median per låt mot PC-onsets, +-50 ms)
  onBeat  on-beat-recall (median: andel PC-slag med en analysator-kick inom +-60 ms)
  fas     on-beat-andel median, motfas (<=0,2), i fas (>=0,8), n (analysatorns gridfas mot PC-slagen, samma oktav)
  fasBt   samma mot Beat This!-slagen (om korpusen har dem)
  foljare raw/f1/f2/f3: puls on-beat median, i fas, motfas, IQR, |offset| (bara om bänken skriver dem = Beat This!-slag finns)
  tidS    körtid

SPÄRREN (EN KLOCKA FÖR BÅDA): ingen variant ersätter lotus nuvarande om något av korpus rätt, syntet, on-beat-recall eller
  fas (on-beat-andel median, motfas, i fas) är SÄMRE än lotus nuvarande (A, tabellen nedan) - om det inte är tydligt uppvägt
  (t.ex. +10 korpus mot -0,01 fas) och ägaren godkänner. Kick recall/precision redovisas, är inte spärr.

BASLINJEN (2026-11-09, engine/src HEAD 5e81d13, lotus-light-link pi/src orörd, Node 22, PC, 503 + 8 filer)
                         korpus   syntet  kick R/P   on-beat  fas med/motfas/i fas (n)  fasBt med  följare raw (|off|)  spann
  A  --ref  (lotus orörd)  396/503  6/8   0,80/0,86  0,84     0,88 / 33 / 238 (399)     0,89       0,90 (36 ms)         9
  A  --bas  (engine/src)   396/503  6/8   0,80/0,86  0,84     0,88 / 33 / 238 (399)     0,89       0,90 (36 ms)         9
       --bas och --ref gav BYTE-IDENTISK bänkutskrift (alla 511 rader) = lotusparitet 0 bekräftad. bench.mjs direkt på
       --ref:s index.js UTAN lindning = samma utskrift (bortsett från CRLF) = lindningen är neutral för lotus väg.
       B UTAN lindning (klockan på PC:ns väggklocka): korpus 88/503, syntet 0/8 - därför lindningen.
  B  --bas --beat-feed inline
                           441/503  5/8   0,80/0,86  0,84     0,81 / 24 / 237 (453)     0,81       0,94 (42 ms)         33
  B  ... --fas klocka      441/503  5/8   0,80/0,86  0,84     0,82 / 21 / 248 (452)     0,82       0,95 (24 ms)         33
  B mot spärren: korpus +45, men syntet 6 -> 5 (100_hats8_kick1_snare_swing: 100 -> 149,8 = 3/2-fantom, spann 100-151) och fas-medianen 0,88 -> 0,81/0,82
  (på fler låtar i samma oktav: n 399 -> 453; motfas 33 -> 21-24, i fas 238 -> 237-248). Spannet inom låt 9 -> 33 BPM = klockans
  tempo vandrar mer. Klockfasen (--fas klocka) har tätare puls: |offset| 36 -> 24 ms, andel <= 30 ms 0,43 -> 0,62.

KÖRTIDEN: ~580 s (9,7 min) bänk + ~10 s bygge, per körning (B ~540 s). Under 15 min, så --snabb (126 filer, ~1/4 tid) behövs inte
  som standard men finns. Två bänkar parallellt går bra (en kärna var, tiden oförändrad), fler än två = arenans regel bryts.
"""
import argparse, io, json, os, re, shutil, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__)); ENGINE = os.path.dirname(os.path.dirname(HERE))
LOTUS = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(ENGINE))), 'lotus-light-link')   # Claude/lotus-light-link (bara läsning)
LSRC = os.path.join(LOTUS, 'pi', 'src', 'audio-analyser')
BENCHDIR = os.path.join(LOTUS, 'tools', 'tempo-facit-pc')
TSC = os.path.join(LOTUS, 'pi', 'node_modules', 'typescript', 'bin', 'tsc')
SHARED = ['analyser.ts', 'split.ts', 'slowWorker.ts', 'analyserClock.ts']
# nightly.py:12 LIVE (2026-11-09) + GRID. SHIFT/HOLD är kod sedan 10-22 (läses inte), skickas ändå som i nattjobbet.
LIVE = {'BENCH_GRID': '1', 'LOTUS_ANALYSER_SPLIT': ''}   # 11-10: lotus kör DMX:s profil och Pi:n har inga TEMPO_/KICK_-env; SPLIT '' = inline (worker i bänken ger tempo 0)

ENTRY = r"""// lotusbank.py: bänkklockan. Klockan (analyserClock) anropas med Date.now(); bench.mjs flyttar bara analysatorns virtuella
// klocka. Här följer Date.now med: 1,7e12 + ljudtiden (= analysatorns wallNow). Neutral för lotus egen väg (OWN_TEMPO).
import * as M from './audio-analyser/index.js';
export * from './audio-analyser/index.js';
const EPOCH = 1700000000000;
const FAS_KLOCKA = process.env.LOTUSBANK_FAS === 'klocka';
export function createAnalyser(cfg, mode) {
  const an = M.createAnalyser(cfg, mode);
  const adv = an.advanceVirtualClock.bind(an), set = an.setVirtualClock.bind(an);
  an.advanceVirtualClock = (ms) => { Date.now = () => EPOCH + ms; adv(ms); };
  an.setVirtualClock = (ms) => { if (ms !== null && ms !== undefined) Date.now = () => EPOCH + ms; set(ms); };
  if (FAS_KLOCKA) {
    const proc = an.process.bind(an);
    an.process = (buf) => {
      const f = proc(buf); const b = an.clockOut && an.clockOut.beat;
      if (f) { if (b && b.bpm > 0) { f.beatPhaseMs = b.anchorMs; f.beatPhaseConf = 1 + (b.confidence ?? 0); } else { f.beatPhaseMs = 0; } }
      return f;
    };
  }
  return an;
}
"""


def bygg(d, srcdir, inline):
    out = os.path.join(d, 'lotus')
    assert os.path.commonpath([out, os.path.join(ENGINE, '.arena')]) == os.path.join(ENGINE, '.arena'), 'mappen måste ligga under engine/.arena'
    if os.path.isdir(out): shutil.rmtree(out)
    aa = os.path.join(out, 'src', 'audio-analyser'); os.makedirs(aa)
    for f in os.listdir(LSRC):
        if f.endswith('.ts'): shutil.copyfile(os.path.join(LSRC, f), os.path.join(aa, f))   # copyfile: bara bytes, inga länkar
    if srcdir:
        for f in SHARED: shutil.copyfile(os.path.join(srcdir, f), os.path.join(aa, f))
    if inline:
        p = os.path.join(aa, 'analyserProfile.ts'); s = io.open(p, encoding='utf-8', newline='').read()
        assert 'BEAT_FEED' not in s and s.count('sys: {') == 1, 'profilen ser inte ut som väntat'
        io.open(p, 'w', encoding='utf-8', newline='').write(s.replace('sys: {', "sys: {\n    BEAT_FEED: 'inline',   // lotusbank --beat-feed inline", 1))
    tc = json.load(io.open(os.path.join(LOTUS, 'pi', 'tsconfig.json'), encoding='utf-8'))
    tc['compilerOptions'].update({'outDir': 'dist', 'rootDir': 'src', 'declaration': False, 'sourceMap': False}); tc['include'] = ['src/**/*']
    io.open(os.path.join(out, 'tsconfig.json'), 'w', encoding='utf-8').write(json.dumps(tc, indent=1))
    r = subprocess.run(['node', TSC, '-p', os.path.join(out, 'tsconfig.json')], cwd=out, capture_output=True, text=True, encoding='utf-8', errors='replace')
    if r.returncode: sys.exit('BYGGFEL:\n' + (r.stdout + r.stderr)[-3000:])
    io.open(os.path.join(out, 'dist', 'benchEntry.mjs'), 'w', encoding='utf-8').write(ENTRY)
    return os.path.join(out, 'dist', 'benchEntry.mjs')


def tolka(txt):
    res = {}
    num = lambda x: None if x in ('-', 'undefined', 'NaN') else float(x)
    for line in txt.splitlines():
        m = re.match(r'^(korpus|synt): (\d+)/(\d+) ratt \(lika\)\s+klasser (\{.*?\})\s+spann-median (\S+) BPM', line)
        if m: res[m.group(1)] = {'ok': int(m.group(2)), 'n': int(m.group(3)), 'klasser': json.loads(m.group(4)), 'spann': num(m.group(5))}; continue
        m = re.match(r'^(korpus|synt) kick: recall (\S+) precision (\S+) bias (\S+) ms \(n=(\d+)', line)
        if m: res[m.group(1) + 'Kick'] = {'recall': num(m.group(2)), 'precision': num(m.group(3)), 'biasMs': num(m.group(4)), 'n': int(m.group(5))}; continue
        m = re.match(r'^(korpus|synt) on-beat-recall: (\S+) \(median, n=(\d+)', line)
        if m: res[m.group(1) + 'OnBeat'] = {'recall': num(m.group(2)), 'n': int(m.group(3))}; continue
        m = re.match(r'^(korpus|synt) fas: on-beat-andel median (\S+), motfas \(<=0,2\) (\d+), i fas \(>=0,8\) (\d+) \(n=(\d+)', line)
        if m: res[m.group(1) + 'Fas'] = {'median': num(m.group(2)), 'motfas': int(m.group(3)), 'ifas': int(m.group(4)), 'n': int(m.group(5))}; continue
        m = re.match(r'^(korpus|synt) fas mot Beat This!: on-beat-andel median (\S+), motfas (\d+), i fas (\d+), mellan (\d+) \(n=(\d+)', line)
        if m: res[m.group(1) + 'FasBt'] = {'median': num(m.group(2)), 'motfas': int(m.group(3)), 'ifas': int(m.group(4)), 'mellan': int(m.group(5)), 'n': int(m.group(6))}; continue
        m = re.match(r'^(korpus|synt) foljare (\w+): puls on-beat median (\S+), i fas \(>=0,8\) (\d+), motfas \(<=0,2\) (\d+), IQR median (\S+) ms, offset median (\S+) ms, \|offset\| median (\S+) ms, andel \|offset\| <= 30 ms (\S+) \(n=(\d+)', line)
        if m: res.setdefault(m.group(1) + 'Foljare', {})[m.group(2)] = {'onBeat': num(m.group(3)), 'ifas': int(m.group(4)), 'motfas': int(m.group(5)), 'iqrMs': num(m.group(6)), 'offsetMs': num(m.group(7)), 'absOffsetMs': num(m.group(8)), 'andel30': num(m.group(9)), 'n': int(m.group(10))}; continue
    k = {'korpus': res.get('korpus'), 'synt': res.get('synt'), 'kick': res.get('korpusKick'), 'onBeat': res.get('korpusOnBeat'),
         'fas': res.get('korpusFas'), 'fasBt': res.get('korpusFasBt'), 'foljare': res.get('korpusFoljare')}
    return k


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('mapp'); ap.add_argument('--bas', action='store_true', help='delade filer ur engine/src')
    ap.add_argument('--ref', action='store_true', help='lotus egen kopia orörd (ingen ersättning)')
    ap.add_argument('--beat-feed', choices=['inline'], default=None); ap.add_argument('--snabb', action='store_true')
    ap.add_argument('--fas', choices=['analysator', 'klocka'], default='analysator')
    a = ap.parse_args(); d = os.path.abspath(a.mapp); os.makedirs(d, exist_ok=True)
    srcdir = None if a.ref else os.path.join(ENGINE, 'src') if a.bas else os.path.join(d, 'src')
    if srcdir: assert all(os.path.exists(os.path.join(srcdir, f)) for f in SHARED), f'saknar {SHARED} i {srcdir}'
    t0 = time.time(); entry = bygg(d, srcdir, a.beat_feed == 'inline'); tBygg = time.time() - t0
    man = os.path.join(BENCHDIR, 'bench-manifest.txt')
    if a.snabb:
        rows = sorted(x.strip() for x in io.open(man, encoding='utf-8') if x.strip())
        man = os.path.join(d, 'manifest-snabb.txt'); io.open(man, 'w', encoding='utf-8').write('\n'.join(rows[::4]) + '\n')
    env = dict(os.environ, **LIVE, BENCH_MANIFEST=man)
    if a.fas == 'klocka': env['LOTUSBANK_FAS'] = 'klocka'
    t1 = time.time()
    r = subprocess.run(['node', os.path.join(BENCHDIR, 'bench.mjs'), '--analyser', entry, '--dir', os.path.join(BENCHDIR, 'corpus'), '--synth', os.path.join(BENCHDIR, 'corpus-synth')],
                       cwd=d, env=env, capture_output=True, encoding='utf-8', errors='replace', timeout=7200)
    tid = time.time() - t1
    io.open(os.path.join(d, 'lotusbank.out'), 'w', encoding='utf-8').write(r.stdout + ('\n--- stderr ---\n' + r.stderr if r.stderr else ''))
    res = tolka(r.stdout)
    out = {'mapp': os.path.relpath(d, ENGINE), 'kalla': 'ref (lotus orörd)' if a.ref else 'engine/src' if a.bas else '<mapp>/src',
           'beatFeed': a.beat_feed, 'fas': a.fas, 'snabb': a.snabb, 'manifest': man, **res,
           'tidS': round(tid), 'byggS': round(tBygg), 'fel': (r.stderr or '')[-800:] if r.returncode or not res.get('korpus') else ''}
    io.open(os.path.join(d, 'lotusbank.json'), 'w', encoding='utf-8').write(json.dumps(out, ensure_ascii=False, indent=1))
    k, s, ob, fa = res.get('korpus') or {}, res.get('synt') or {}, res.get('onBeat') or {}, res.get('fas') or {}
    kk = res.get('kick') or {}; fr = (res.get('foljare') or {}).get('raw') or {}
    print(f"LOTUSBANK {out['mapp']}  korpus {k.get('ok')}/{k.get('n')}  syntet {s.get('ok')}/{s.get('n')}  kick R {kk.get('recall')} P {kk.get('precision')}  "
          f"on-beat {ob.get('recall')}  fas {fa.get('median')} motfas {fa.get('motfas')} i fas {fa.get('ifas')}  följare raw {fr.get('onBeat')}  {out['tidS']} s" + (f"  FEL {out['fel'][-200:]}" if out['fel'] else ''))


if __name__ == '__main__':
    main()
