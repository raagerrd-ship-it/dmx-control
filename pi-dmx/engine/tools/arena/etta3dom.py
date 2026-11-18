"""DOMAREN FÖR ARENAN 'ETTA3' (2026-11-18) - och DELTAGARNAS BRIEF. Måtten, spärrarna och mängderna ändras inte under körningen.

FRÅGAN (ägaren 11-18): hitta ettan, ovanpå den nya takten a6 (arenan takt: fasen ur sex band). a6 halverade taktfelet på okänd musik
(27,8 -> 13,9 %) men ettan föll ~5 procentenheter i ren 4/4 (193040 70,1 -> 65,5, 193818 71,6 -> 66,8): när fasen blir stadig väljer
taktmodellen oftare slag 3. Ägaren: "Bedrövning är det om vi hamnar på 3:an istället för 1:an". Målet: ettan rätt, taktvinsten kvar.

MÄTNINGEN = ettdom.py:s (konsertReplay --slag --delad-cfg, analysator + effektmotor som i ladan): json 'ticks' = (t, beatIdx) per
taktklocka-tick. Facit = Beat This (tools/ladan-2026-11-13/beatthis.jsonl), BARA i domaren.
REN 4/4 (lärdomen från etta2): Beat This räknar takter med annat än 4 slag på många ställen; där kan ingen fast etta bli rätt. Ett tick
räknas som REN om närmaste Beat This-takt med != 4 slag ligger mer än 16 s bort (tools/arena/ren44.py, samma logik).
MÅTTEN (per fil, sedan medel över mängdens filer, lika vikt)
  ren      + %     rätt etta (förskjutning 0) bland parade tick i ren 4/4                      <- POÄNGEN
  trean    - %     förskjutning 2 (ettan på slag 3) i ren 4/4
  etta     + %     rätt etta bland alla parade tick (ettdom)
  omval    - /min  byten av förskjutningen per minut (ettdom, block om 16 tick)
  paslag   + %     tick med ett Beat This-slag inom 0,12 s (ettdom)
  FEL      - %     taktens fel per 10 s-fönster (taktdom: motslag + fel tempo + glider + stökigt)
POÄNG = medel(ren - bas.ren) [procentenheter] - 5 x (omval - bas.omval). + = bättre. DISK = sist oavsett poäng.
SPÄRRAR (DISK):
  takt     FEL medel > bas + 2 procentenheter (a6:s vinst ska stå kvar), eller oktav (halvt + dubbelt) > bas + 3
  lead     motorns lead (median tick -> slag) ändras > 10 ms på någon fil (beatLeadMs är låst)
  etta     rätt etta bland ALLA tick (medel) < bas - 3 procentenheter (ren 4/4 får inte köpas med de udda partierna)
  paslag   medel < bas - 2 procentenheter, eller någon fil < bas - 5
  filer    ändrade filer utanför ettdom.py:s TILLATNA; NYA filer får heta analyser*.ts
  mätfel   en fil som inte går att mäta
ORKESTRATORNS SPÄRRAR (finalisterna): tools/arena/pibudget.py, tools/arena/dropdom3.py --mat, tools/arena/lotusbank.py (lotus ~5 %).

MÄNGDERNA (172432 utesluten: den lagade filen stämmer inte i tid mot Beat This)
  ÖVNING   151659, 171840, 200719        deltagarna mäter här (--mat)
  MELLAN   160345                        bara orkestratorn (--mat --mellan)
  KONTROLL 193040, 193818                bara orkestratorn (--mat --holdout), finalen. Där föll a6:s etta.

KOMMANDON (från engine/, PYTHONIOENCODING=utf-8)
  python tools/arena/bygg.py .arena/<körning>/<mapp>
  python tools/arena/etta3dom.py .arena/<körning>/<mapp> --mat [--namn m1]    EN MÄTNING på övningen -> <mapp>/etta3dom.json
  python tools/arena/etta3dom.py .arena/<körning> [--md] [--mellan|--holdout]  rangordning mot bas
  python tools/arena/etta3dom.py .arena/<körning>/<mapp> --sond <wav>        FRI SOND, en övningsfil, skriver till <mapp>/sond/
  LÅS: .arena/.banklas. ~4-6 min per --mat.
JSON <mapp>/etta3dom.json: {'matt': {ren, trean, etta, omval, paslag, FEL, oktav}, 'filer': {<fil>: {ren, trean, n_ren, forskj_ren [0..3 %],
  etta, omval, paslag, FEL, oktav, lead_ms, fonster}}, 'sparr': {'andradeFiler': [...]}}
"""
import io, json, os, shutil, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); ENGINE = os.path.dirname(os.path.dirname(HERE)); sys.path.insert(0, HERE)
import ettdom as E
import taktdom as T
L3, L4 = 'tools/ladan-2026-11-13/', 'tools/ladan-2026-11-14/'
OVNING = [L3 + 'lang-20261113T151659.wav', L3 + 'lang-20261113T171840.wav', L4 + 'lang-20261114T200719.wav']
MELLAN = [L3 + 'lang-20261113T160345.wav']
KONTROLL = [L4 + 'lang-20261114T193040.wav', L4 + 'lang-20261114T193818.wav']
NARA_S = 16.0


def ren44(js, wav):
    bt = E.BT[os.path.basename(wav)]; B = np.array(bt['beatsS']); D = np.array(bt['downbeatsS'])
    nb = np.diff(np.searchsorted(B, D - 1e-3)); odd = D[:-1][nb != 4]
    TK = json.load(io.open(js, encoding='utf-8'))['ticks']; Tt = np.array(TK[0::2], float); I = np.array(TK[1::2], float)
    h = np.zeros(4)
    for t, i in zip(Tt, I):
        if t < E.START_S or t > B[-1]: continue
        k = int(np.argmin(abs(B - t)))
        if abs(B[k] - t) > E.PAR_S: continue
        dd = np.searchsorted(D, B[k] + 1e-3) - 1
        if dd < 0: continue
        if len(odd) and np.min(abs(odd - t)) < NARA_S: continue
        bp = int(np.searchsorted(B, B[k] + 1e-3) - np.searchsorted(B, D[dd])) - 1
        h[int((int(i) % 4 - bp) % 4)] += 1
    n = max(1.0, h.sum())
    return dict(ren=100.0 * h[0] / n, trean=100.0 * h[2] / n, n_ren=int(h.sum()), forskj_ren=[round(100.0 * x / n, 1) for x in h])


def mat(mapp, wavs, utnamn, sond=False):
    ut = E.mat(mapp, wavs, utnamn.replace('etta3dom', 'ettdom-e3'), sond=sond)
    d = os.path.join(os.path.abspath(mapp), 'sond' if sond else 'ettdom'); F = {}
    for w in wavs:
        f = E.kort(w); js = os.path.join(d, 'kr-%s.json' % f)
        F[f] = ren44(js, w); k = T.klassa(js, w)
        F[f].update({x: k[x] for x in ('FEL', 'oktav', 'lead_ms', 'fonster')})
        F[f].update({x: ut['filer'][f][x] for x in ('etta', 'omval', 'paslag')}); F[f]['forskj'] = ut['filer'][f]['forskj']
    m = {x: float(np.mean([F[f][x] for f in F])) for x in ('ren', 'trean', 'etta', 'omval', 'paslag', 'FEL', 'oktav')}
    out = dict(mapp=ut['mapp'], matt=m, filer=F, sparr=ut['sparr'])
    if not sond: io.open(os.path.join(os.path.abspath(mapp), utnamn), 'w', encoding='utf-8').write(json.dumps(out, ensure_ascii=False, indent=1))
    else: io.open(os.path.join(d, 'etta3dom-sond.json'), 'w', encoding='utf-8').write(json.dumps(out, ensure_ascii=False, indent=1))
    print(json.dumps(dict(matt={k: round(v, 2) for k, v in m.items()}, perFil={f: {'ren': round(v['ren'], 1), 'trean': round(v['trean'], 1), 'FEL': round(v['FEL'], 1),
                          'lead': v['lead_ms']} for f, v in F.items()}, andradeFiler=out['sparr']['andradeFiler']), ensure_ascii=False))


def poang(d, bas):
    return float(np.mean([d['filer'][f]['ren'] - bas['filer'][f]['ren'] for f in d['filer'] if f in bas['filer']])) - 5 * (d['matt']['omval'] - bas['matt']['omval'])


def disk(d, bas):
    M, B, s = d['matt'], bas['matt'], []
    if M['FEL'] > B['FEL'] + 2: s.append('takt FEL %.1f > bas %.1f + 2' % (M['FEL'], B['FEL']))
    if M['oktav'] > B['oktav'] + 3: s.append('oktav %.1f > bas %.1f + 3' % (M['oktav'], B['oktav']))
    for f, v in d['filer'].items():
        b = bas['filer'].get(f)
        if not b: continue
        if abs(v['lead_ms'] - b['lead_ms']) > 10: s.append('lead %s %.0f mot bas %.0f ms' % (f, v['lead_ms'], b['lead_ms']))
        if v['paslag'] < b['paslag'] - 5: s.append('paslag %s %.1f < bas %.1f - 5' % (f, v['paslag'], b['paslag']))
    if M['etta'] < B['etta'] - 3: s.append('etta (alla tick) %.1f < bas %.1f - 3' % (M['etta'], B['etta']))
    if M['paslag'] < B['paslag'] - 2: s.append('paslag %.1f < bas %.1f - 2' % (M['paslag'], B['paslag']))
    fel = [x for x in d['sparr']['andradeFiler'] if '/' in x or not (x.replace(' (borttagen)', '') in E.TILLATNA
           or (x.startswith('analyser') and x.endswith('.ts') and not x.endswith('(borttagen)')))]
    if fel: s.append('filer utanför tillåtna: ' + ', '.join(fel))
    return s


def rangordna(k, suffix, md):
    def las(p):
        try: return json.load(io.open(p, encoding='utf-8'))
        except Exception: return None
    bas = las(os.path.join(k, 'bas', 'etta3dom%s.json' % suffix))
    if not bas: raise SystemExit('bas saknar etta3dom%s.json' % suffix)
    B = bas['matt']; rad = []
    for n in sorted(os.listdir(k)):
        d = las(os.path.join(k, n, 'etta3dom%s.json' % suffix))
        if not d or n == 'bas': continue
        rad.append((n, poang(d, bas), d['matt'], disk(d, bas), d))
    rad.sort(key=lambda r: (bool(r[3]), -r[1]))
    rub = 'mellanmängden' if suffix == '-mellan' else 'kontrollmängden' if suffix == '-holdout' else 'övningen'
    pf = lambda d: '  '.join('%s %.0f/%.0f' % (f, v['ren'], v['trean']) for f, v in d['filer'].items())
    L = ['# Ranking %s, %s (tools/arena/etta3dom.py, mot bas)' % (os.path.basename(k), rub), '',
         'bas: ren 4/4 %.1f %%  trean %.1f %%  etta alla %.1f %%  omval %.2f/min  paslag %.1f %%  takt FEL %.1f  oktav %.1f  | %s' % (
             B['ren'], B['trean'], B['etta'], B['omval'], B['paslag'], B['FEL'], B['oktav'], pf(bas)), '',
         '| plats | deltagare | poäng | ren 4/4 % | trean % | etta alla % | omval /min | paslag % | takt FEL % | oktav | per fil ren/trean | DISK |',
         '|---|---|---|---|---|---|---|---|---|---|---|---|']
    for i, (n, p, M, ds, d) in enumerate(rad, 1):
        L.append('| %d | %s | %+.2f | %.1f | %.1f | %.1f | %.2f | %.1f | %.1f | %.1f | %s | %s |' % (i, n, p, M['ren'], M['trean'], M['etta'], M['omval'],
                 M['paslag'], M['FEL'], M['oktav'], pf(d), '; '.join(ds) or '-'))
    txt = '\n'.join(L) + '\n'; print(txt)
    if md: io.open(os.path.join(k, 'ranking-etta3dom%s.md' % suffix), 'w', encoding='utf-8').write(txt)


if __name__ == '__main__':
    a = sys.argv[1:]
    if not a: sys.exit(__doc__)
    p = os.path.abspath(a[0]); os.chdir(ENGINE)
    if '--sond' in a:
        w = a[a.index('--sond') + 1].replace('\\', '/'); w = next((x for x in OVNING if E.kort(x) in w), None)
        if not w: sys.exit('sonden får bara köra övningens filer: ' + ', '.join(OVNING))
        mat(p, [w], 'etta3dom-sond.json', sond=True)
    elif '--mat' in a:
        wavs, nm = (MELLAN, 'etta3dom-mellan.json') if '--mellan' in a else (KONTROLL, 'etta3dom-holdout.json') if '--holdout' in a else (OVNING, 'etta3dom.json')
        mat(p, wavs, nm)
        if '--namn' in a and nm == 'etta3dom.json': shutil.copy(os.path.join(p, nm), os.path.join(p, 'etta3dom-%s.json' % a[a.index('--namn') + 1]))
    else:
        rangordna(p, '-mellan' if '--mellan' in a else '-holdout' if '--holdout' in a else '', '--md' in a)
