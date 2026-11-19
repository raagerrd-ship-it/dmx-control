"""DOMAREN FÖR ARENAN 'TAKT13' (2026-11-19 kväll) - och DELTAGARNAS BRIEF. Måtten, spärrarna och mängderna ändras inte under körningen.

FRÅGAN: takten ska sitta, nu när ettan får hamna på 1 ELLER 3. Ladan kör sedan 2026-11-19 1AN-3AN-STILEN: det en effekt gör på taktens
etta gör den lika starkt på trean på andra halvan av riggen, så att förväxla 1 och 3 syns inte. Ägaren: "så nu har vi byggt in felet
till vår fördel istället" och "då lamporna tänder på olika tex 1an eller 3an, så är nog mer takten det viktigaste". Det enda ettfel som
syns är PARFELET: ettan på slag 2 eller 4. Tidigare arenor diskade på 'rätt etta' (1 skilt från 3) - den spärren finns inte här.

MÄTNINGEN = etta3dom.py:s (ettdom.py: konsertReplay --slag --delad-cfg, analysator + effektmotor som i ladan; json 'ticks' = (t, beatIdx)).
Facit = Beat This (tools/ladan-2026-11-13/beatthis.jsonl), BARA i domaren. Taktens klasser = taktdom.py (fasklass), ren 4/4 = ren44.
MÅTTEN (per fil, sedan medel över mängdens filer, lika vikt)
  FEL      - %     taktens fel per 10 s-fönster: motslag + fel tempo + glider + stökigt (taktdom.py)      <- POÄNGEN
  par      + %     ettan på 1 ELLER 3 (förskjutning 0 eller 2) bland parade tick i ren 4/4                <- poängen, halv vikt
  oktav    - %     halvt + dubbelt tempo mot Beat This (taktdom.py)
  paslag   + %     tick med ett Beat This-slag inom 0,12 s (ettdom)
  ren, trean, etta, omval   redovisas, ingen poäng och ingen spärr (1 och 3 är lika bra)
POÄNG = (bas.FEL - FEL) + 0,5 x (par - bas.par) [procentenheter]. + = bättre. DISK = sist oavsett poäng.
SPÄRRAR (DISK):
  par      medel < bas - 2 procentenheter, eller någon fil < bas - 5   (parfelet är det ettfel som syns)
  oktav    medel > bas + 3 procentenheter                             (att byta oktav överallt är inte att lösa takten)
  lead     motorns lead (median tick -> slag) ändras > 10 ms på någon fil (beatLeadMs är låst)
  paslag   medel < bas - 2 procentenheter, eller någon fil < bas - 5
  filer    ändrade filer utanför ettdom.py:s TILLATNA; NYA filer får heta analyser*.ts
  mätfel   en fil som inte går att mäta
ORKESTRATORNS SPÄRRAR (finalisterna): tools/arena/pibudget.py (cpu/minne), tools/arena/dropdom3.py --mat (drop oförändrad),
  tools/arena/klockdom.py --mat --holdout i DMX-läge 2 (tempo/låsning efter låtbyte på kontrollmängd 2), tools/arena/lotusbank.py (~5 %).

MÄNGDERNA (samma som etta3; 172432 utesluten)
  ÖVNING   151659, 171840, 200719        deltagarna mäter här (--mat)
  MELLAN   160345                        bara orkestratorn (--mat --mellan), runda 2
  KONTROLL 193040, 193818                bara orkestratorn (--mat --holdout), finalen

KOMMANDON (från engine/, PYTHONIOENCODING=utf-8)
  python tools/arena/bygg.py .arena/<körning>/<mapp>
  python tools/arena/pardom.py .arena/<körning>/<mapp> --mat [--namn m1]    EN MÄTNING på övningen -> <mapp>/pardom.json (+ pardom-m1.json)
  python tools/arena/pardom.py .arena/<körning> [--md] [--mellan|--holdout]  rangordning mot bas
  python tools/arena/pardom.py .arena/<körning>/<mapp> --sond <wav>        FRI SOND, en övningsfil, skriver till <mapp>/sond/
  LÅS: .arena/.banklas (en mätning åt gången). ~4-6 min per --mat.
JSON <mapp>/pardom.json: {'matt': {FEL, par, oktav, paslag, ren, trean, etta, omval}, 'filer': {<fil>: {FEL, par, forskj_ren [0..3 %],
  n_ren, oktav, paslag, lead_ms, fonster: [[start_s, klass], ...], ...}}, 'sparr': {'andradeFiler': [...]}}
"""
import io, json, os, shutil, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); ENGINE = os.path.dirname(os.path.dirname(HERE)); sys.path.insert(0, HERE)
import ettdom as E
import etta3dom as E3
OVNING, MELLAN, KONTROLL = E3.OVNING, E3.MELLAN, E3.KONTROLL


def mat(mapp, wavs, utnamn, sond=False):
    E3.mat(mapp, wavs, 'etta3dom-p.json', sond=sond)
    src = os.path.join(os.path.abspath(mapp), 'sond', 'etta3dom-sond.json') if sond else os.path.join(os.path.abspath(mapp), 'etta3dom-p.json')
    d = json.load(io.open(src, encoding='utf-8'))
    for v in d['filer'].values(): v['par'] = v['forskj_ren'][0] + v['forskj_ren'][2]
    d['matt']['par'] = float(np.mean([v['par'] for v in d['filer'].values()]))
    ut = os.path.join(os.path.abspath(mapp), 'sond' if sond else '', 'pardom-sond.json' if sond else utnamn)
    io.open(ut, 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False, indent=1))
    print(json.dumps(dict(matt={k: round(d['matt'][k], 1) for k in ('FEL', 'par', 'oktav', 'paslag', 'ren', 'trean')},
                          perFil={f: {'FEL': round(v['FEL'], 1), 'par': round(v['par'], 1), 'lead': v['lead_ms']} for f, v in d['filer'].items()},
                          andradeFiler=d['sparr']['andradeFiler']), ensure_ascii=False))


def poang(d, bas):
    return (bas['matt']['FEL'] - d['matt']['FEL']) + 0.5 * (d['matt']['par'] - bas['matt']['par'])


def disk(d, bas):
    M, B, s = d['matt'], bas['matt'], []
    if M['par'] < B['par'] - 2: s.append('par %.1f < bas %.1f - 2' % (M['par'], B['par']))
    if M['oktav'] > B['oktav'] + 3: s.append('oktav %.1f > bas %.1f + 3' % (M['oktav'], B['oktav']))
    if M['paslag'] < B['paslag'] - 2: s.append('paslag %.1f < bas %.1f - 2' % (M['paslag'], B['paslag']))
    for f, v in d['filer'].items():
        b = bas['filer'].get(f)
        if not b: continue
        if v['par'] < b['par'] - 5: s.append('par %s %.1f < bas %.1f - 5' % (f, v['par'], b['par']))
        if abs(v['lead_ms'] - b['lead_ms']) > 10: s.append('lead %s %.0f mot bas %.0f ms' % (f, v['lead_ms'], b['lead_ms']))
        if v['paslag'] < b['paslag'] - 5: s.append('paslag %s %.1f < bas %.1f - 5' % (f, v['paslag'], b['paslag']))
    fel = [x for x in d['sparr']['andradeFiler'] if '/' in x or not (x.replace(' (borttagen)', '') in E.TILLATNA
           or (x.startswith('analyser') and x.endswith('.ts') and not x.endswith('(borttagen)')))]
    if fel: s.append('filer utanför tillåtna: ' + ', '.join(fel))
    return s


def rangordna(k, suffix, md):
    def las(p):
        try: return json.load(io.open(p, encoding='utf-8'))
        except Exception: return None
    bas = las(os.path.join(k, 'bas', 'pardom%s.json' % suffix))
    if not bas: raise SystemExit('bas saknar pardom%s.json' % suffix)
    B = bas['matt']; rad = []
    for n in sorted(os.listdir(k)):
        d = las(os.path.join(k, n, 'pardom%s.json' % suffix))
        if not d or n == 'bas': continue
        rad.append((n, poang(d, bas), d['matt'], disk(d, bas), d))
    rad.sort(key=lambda r: (bool(r[3]), -r[1]))
    rub = 'mellanmängden' if suffix == '-mellan' else 'kontrollmängden' if suffix == '-holdout' else 'övningen'
    pf = lambda d: '  '.join('%s %.0f/%.0f' % (f, v['FEL'], v['par']) for f, v in d['filer'].items())
    L = ['# Ranking %s, %s (tools/arena/pardom.py, mot bas)' % (os.path.basename(k), rub), '',
         'bas: takt FEL %.1f %%  par %.1f %%  oktav %.1f  paslag %.1f %%  (ren %.1f, trean %.1f)  | per fil FEL/par: %s' % (
             B['FEL'], B['par'], B['oktav'], B['paslag'], B['ren'], B['trean'], pf(bas)), '',
         '| plats | deltagare | poäng | takt FEL % | par % | oktav | paslag % | ren % | trean % | per fil FEL/par | DISK |',
         '|---|---|---|---|---|---|---|---|---|---|---|']
    for i, (n, p, M, ds, d) in enumerate(rad, 1):
        L.append('| %d | %s | %+.2f | %.1f | %.1f | %.1f | %.1f | %.1f | %.1f | %s | %s |' % (i, n, p, M['FEL'], M['par'], M['oktav'], M['paslag'],
                 M['ren'], M['trean'], pf(d), '; '.join(ds) or '-'))
    txt = '\n'.join(L) + '\n'; print(txt)
    if md: io.open(os.path.join(k, 'ranking-pardom%s.md' % suffix), 'w', encoding='utf-8').write(txt)


if __name__ == '__main__':
    a = sys.argv[1:]
    if not a: sys.exit(__doc__)
    p = os.path.abspath(a[0]); os.chdir(ENGINE)
    if '--sond' in a:
        w = a[a.index('--sond') + 1].replace('\\', '/'); w = next((x for x in OVNING if E.kort(x) in w), None)
        if not w: sys.exit('sonden får bara köra övningens filer: ' + ', '.join(OVNING))
        mat(p, [w], 'pardom-sond.json', sond=True)
    elif '--mat' in a:
        wavs, nm = (MELLAN, 'pardom-mellan.json') if '--mellan' in a else (KONTROLL, 'pardom-holdout.json') if '--holdout' in a else (OVNING, 'pardom.json')
        mat(p, wavs, nm)
        if '--namn' in a and nm == 'pardom.json': shutil.copy(os.path.join(p, nm), os.path.join(p, 'pardom-%s.json' % a[a.index('--namn') + 1]))
    else:
        rangordna(p, '-mellan' if '--mellan' in a else '-holdout' if '--holdout' in a else '', '--md' in a)
