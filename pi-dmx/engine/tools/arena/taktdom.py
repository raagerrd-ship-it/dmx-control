"""DOMAREN FÖR ARENAN 'TAKT' (2026-11-17 kväll) - och DELTAGARNAS BRIEF. Måtten, spärrarna och mängderna ändras inte under körningen.

FRÅGAN (ägaren i ladan: "kör på! med vetskapen att använd alla resurser som pi har"): ungefär 26 % av tiden ligger motorns takt FEL -
fasen glider över slagen, tempot är fel, klockan har låst på motslaget eller det är stökigt. Den tiden ska ner. Takt är ägarens prio 1.

MÄTNINGEN = ettdom.py:s (konsertReplay --slag --delad-cfg, analysator + effektmotor som i ladan): json 'ticks' = (t, beatIdx) per
taktklocka-tick. Facit = Beat This-slagen (tools/ladan-2026-11-13/beatthis.jsonl), BARA i domaren.
KLASSNINGEN (tools/arena/fasklass.py, samma logik): varje ticks avstånd till närmaste Beat This-slag, minus filens median (= motorns lead,
den rättas inte här). Filen delas i 10 s-fönster från 15 s; i varje fönster:
  på slaget   >= 70 % av ticken inom +-60 ms                       (halvt tempo mot Beat This räknas hit - motorn på varannat slag är rätt)
  motslag     >= 70 % inom +-60 ms från MITTEN mellan två slag       FEL
  dubbelt     ticken på slag och mittpunkter (motorn 2x Beat This)   tvetydigt, inget fel men spärrat (se OKTAV)
  fel tempo   tickintervallet > 4 % från 1x, 2x och 0,5x slaget       FEL
  glider      fasen rör sig > 60 ms över fönstret                   FEL
  stökigt     resten                                                FEL
  break       < 4 Beat This-slag i fönstret                          räknas inte
MÅTTEN (per fil i % av fönstren utan break, sedan medel över filerna): FEL = motslag + fel tempo + glider + stökigt, och var för sig.
POÄNG = bas.FEL - FEL [procentenheter]. + = bättre.
SPÄRRAR (DISK, sist oavsett poäng):
  oktav    halvt + dubbelt (medel) > bas + 3 procentenheter  (att byta oktav överallt är inte att lösa takten)
  lead     motorns lead (median tick -> slag) ändras > 10 ms på någon fil (beatLeadMs är låst)
  etta     rätt etta (ettdom) medel < bas - 3 procentenheter
  filer    ändrade filer utanför TILLATNA = ettdom.py:s lista; NYA filer får heta analyser*.ts (t.ex. en egen worker)
  mätfel   en fil som inte går att mäta
ORKESTRATORNS SPÄRRAR (topp efter runda 1 och finalisterna): tools/arena/pibudget.py (huvudtråd <= bas x1,10, worker <= x4,0,
  alla trådar utom huvudtråden <= x8,0, minne <= +15 MB, 0 överhoppade), tools/arena/dropdom3.py --mat och tools/arena/klockdom.py --mat
  (drop, låtbyte, låsning oförändrade inom bruset), tools/arena/lotusbank.py (lotus inte sämre, ~5 % marginal).

MÄNGDERNA (172432 är utesluten: den lagade filen stämmer inte i tid mot Beat This)
  ÖVNING   151659, 160345, 200719        deltagarna mäter här (--mat)
  MELLAN   171840                        bara orkestratorn (--mat --mellan)
  KONTROLL 193040, 193818                bara orkestratorn (--mat --holdout), finalen

KOMMANDON (från engine/, PYTHONIOENCODING=utf-8)
  python tools/arena/bygg.py .arena/<körning>/<mapp>
  python tools/arena/taktdom.py .arena/<körning>/<mapp> --mat [--namn m1]    EN MÄTNING på övningen -> <mapp>/taktdom.json
  python tools/arena/taktdom.py .arena/<körning> [--md] [--mellan|--holdout]  rangordning mot bas
  python tools/arena/taktdom.py .arena/<körning>/<mapp> --sond <wav>        FRI SOND, en övningsfil, skriver till <mapp>/sond/
  LÅS: .arena/.banklas. ~4 min per --mat.
JSON <mapp>/taktdom.json: {'matt': {FEL, motslag, feltempo, glider, stokigt, oktav, etta}, 'filer': {<fil>: {klasser i %, lead_ms,
  fonster: [[start_s, klass], ...], etta}}, 'sparr': {'andradeFiler': [...]}}
"""
import io, json, os, shutil, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); ENGINE = os.path.dirname(os.path.dirname(HERE)); sys.path.insert(0, HERE)
import ettdom as E
L3, L4 = 'tools/ladan-2026-11-13/', 'tools/ladan-2026-11-14/'
OVNING = [L3 + 'lang-20261113T151659.wav', L3 + 'lang-20261113T160345.wav', L4 + 'lang-20261114T200719.wav']
MELLAN = [L3 + 'lang-20261113T171840.wav']
KONTROLL = [L4 + 'lang-20261114T193040.wav', L4 + 'lang-20261114T193818.wav']
W, TOL = 10.0, 0.06
FELK = ('motslag', 'feltempo', 'glider', 'stokigt')
ALLA = ('pa', 'halvt', 'dubbelt') + FELK


def klassa(js, wav):
    T = np.array(json.load(io.open(js, encoding='utf-8'))['ticks'][0::2], float)
    B = np.array(E.BT[os.path.basename(wav)]['beatsS'])
    k = np.searchsorted(B, T).clip(1, len(B) - 1); a = B[k] - T; b = B[k - 1] - T; o = np.where(abs(a) < abs(b), a, b)
    g = float(np.median(o[(T > 15) & (T < B[-1])])); c = {x: 0 for x in ALLA}; fon = []
    for s in np.arange(15, B[-1] - W, W):
        m = (T >= s) & (T < s + W); bb = B[(B >= s) & (B < s + W)]
        if m.sum() < 4 or len(bb) < 4: continue
        x = o[m] - g; ibi = float(np.median(np.diff(bb))); rt = float(np.median(np.diff(T[m])))
        on = np.mean(abs(x) < TOL); half = np.mean(abs(abs(x) - ibi / 2) < TOL)
        if on >= 0.7: kl = 'halvt' if abs(rt / (2 * ibi) - 1) < 0.04 else 'pa'
        elif half >= 0.7: kl = 'motslag'
        elif on + half >= 0.8 and min(on, half) >= 0.25: kl = 'dubbelt'
        elif min(abs(rt / f - 1) for f in (ibi, 2 * ibi, ibi / 2)) > 0.04: kl = 'feltempo'
        else:
            tt = T[m]; s_ = np.polyfit(tt - tt[0], np.unwrap(x / ibi * 2 * np.pi) / (2 * np.pi) * ibi, 1)[0] * W
            kl = 'glider' if abs(s_) > TOL else 'stokigt'
        c[kl] += 1; fon.append([round(float(s), 1), kl])
    n = max(1, sum(c.values())); r = {x: 100.0 * v / n for x, v in c.items()}
    r['FEL'] = sum(r[x] for x in FELK); r['oktav'] = r['halvt'] + r['dubbelt']; r['lead_ms'] = round(-g * 1000, 1); r['n'] = n; r['fonster'] = fon
    return r


def mat(mapp, wavs, utnamn, sond=False):
    ut = E.mat(mapp, wavs, utnamn.replace('taktdom', 'ettdom-takt'), sond=sond)
    d = os.path.join(os.path.abspath(mapp), 'sond' if sond else 'ettdom'); F = {}
    for w in wavs:
        f = E.kort(w); F[f] = klassa(os.path.join(d, 'kr-%s.json' % f), w); F[f]['etta'] = ut['filer'][f]['etta']
    m = {x: float(np.mean([F[f][x] for f in F])) for x in ('FEL',) + FELK + ('oktav', 'etta')}
    out = dict(mapp=ut['mapp'], matt=m, filer=F, sparr=ut['sparr'])
    if not sond: io.open(os.path.join(os.path.abspath(mapp), utnamn), 'w', encoding='utf-8').write(json.dumps(out, ensure_ascii=False, indent=1))
    print(json.dumps(dict(matt={k: round(v, 1) for k, v in m.items()}, perFil={f: {'FEL': round(v['FEL'], 1), 'lead': v['lead_ms']} for f, v in F.items()},
                          andradeFiler=out['sparr']['andradeFiler']), ensure_ascii=False))


def rangordna(k, suffix, md):
    def las(p):
        try: return json.load(io.open(p, encoding='utf-8'))
        except Exception: return None
    bas = las(os.path.join(k, 'bas', 'taktdom%s.json' % suffix))
    if not bas: raise SystemExit('bas saknar taktdom%s.json' % suffix)
    B = bas['matt']; rad = []
    for n in sorted(os.listdir(k)):
        d = las(os.path.join(k, n, 'taktdom%s.json' % suffix))
        if not d or n == 'bas': continue
        M = d['matt']; disk = []
        if M['oktav'] > B['oktav'] + 3: disk.append('oktav %.1f > bas %.1f + 3' % (M['oktav'], B['oktav']))
        for f, v in d['filer'].items():
            if f in bas['filer'] and abs(v['lead_ms'] - bas['filer'][f]['lead_ms']) > 10: disk.append('lead %s %.0f mot bas %.0f ms' % (f, v['lead_ms'], bas['filer'][f]['lead_ms']))
        if M['etta'] < B['etta'] - 3: disk.append('etta %.1f < bas %.1f - 3' % (M['etta'], B['etta']))
        fel = [x for x in d['sparr']['andradeFiler'] if '/' in x or not (x.replace(' (borttagen)', '') in E.TILLATNA
               or (x.startswith('analyser') and x.endswith('.ts') and not x.endswith('(borttagen)')))]
        if fel: disk.append('filer utanför tillåtna: ' + ', '.join(fel))
        rad.append((n, B['FEL'] - M['FEL'], M, disk, d))
    rad.sort(key=lambda r: (bool(r[3]), -r[1]))
    rub = 'mellanmängden' if suffix == '-mellan' else 'kontrollmängden' if suffix == '-holdout' else 'övningen'
    hdr = lambda M: 'FEL %.1f (motslag %.1f, fel tempo %.1f, glider %.1f, stökigt %.1f)  oktav %.1f  etta %.1f' % (M['FEL'], M['motslag'], M['feltempo'], M['glider'], M['stokigt'], M['oktav'], M['etta'])
    L = ['# Ranking %s, %s (tools/arena/taktdom.py, mot bas)' % (os.path.basename(k), rub), '', 'bas: ' + hdr(B) + '  | ' +
         '  '.join('%s FEL %.0f' % (f, v['FEL']) for f, v in bas['filer'].items()), '',
         '| plats | deltagare | poäng | FEL % | motslag | fel tempo | glider | stökigt | oktav | etta | per fil FEL | DISK |', '|---|---|---|---|---|---|---|---|---|---|---|---|']
    for i, (n, p, M, disk, d) in enumerate(rad, 1):
        L.append('| %d | %s | %+.1f | %.1f | %.1f | %.1f | %.1f | %.1f | %.1f | %.1f | %s | %s |' % (i, n, p, M['FEL'], M['motslag'], M['feltempo'], M['glider'],
                 M['stokigt'], M['oktav'], M['etta'], '  '.join('%s %.0f' % (f, v['FEL']) for f, v in d['filer'].items()), '; '.join(disk) or '-'))
    txt = '\n'.join(L) + '\n'; print(txt)
    if md: io.open(os.path.join(k, 'ranking-taktdom%s.md' % suffix), 'w', encoding='utf-8').write(txt)


if __name__ == '__main__':
    a = sys.argv[1:]
    if not a: sys.exit(__doc__)
    p = os.path.abspath(a[0]); os.chdir(ENGINE)
    if '--sond' in a:
        w = a[a.index('--sond') + 1].replace('\\', '/'); w = next((x for x in OVNING if E.kort(x) in w), None)
        if not w: sys.exit('sonden får bara köra övningens filer: ' + ', '.join(OVNING))
        mat(p, [w], 'taktdom-sond.json', sond=True)
    elif '--mat' in a:
        wavs, nm = (MELLAN, 'taktdom-mellan.json') if '--mellan' in a else (KONTROLL, 'taktdom-holdout.json') if '--holdout' in a else (OVNING, 'taktdom.json')
        mat(p, wavs, nm)
        if '--namn' in a and nm == 'taktdom.json': shutil.copy(os.path.join(p, nm), os.path.join(p, 'taktdom-%s.json' % a[a.index('--namn') + 1]))
    else:
        rangordna(p, '-mellan' if '--mellan' in a else '-holdout' if '--holdout' in a else '', '--md' in a)
