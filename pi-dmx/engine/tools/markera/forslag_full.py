"""FULLT FÖRSLAG till en inspelning ägaren inte gått igenom (ägaren 11-15: "Analysera en av låtarna jag inte gått igenom. Och märk den
fullt ut. Så kollar jag igenom sen"). Skriver <namn>.marks-hand.json med klar: false och VARJE markering forslag: true - sidan visar dem
streckade med "?", G godtar, dra/byt sort gör dem till ägarens. Domarna räknar inte forslag. Skriver aldrig över en befintlig hand-fil.
  <lotus-venv-python> tools/markera/forslag_full.py <wav> <motorn.json> <uppb.json> [<uppb2.json> ...]     (från engine/)
  motorn.json / uppb*.json = tools/arena/dropdom3Kor.mjs-körningar (dagens motor; motorer med frame.buildStartCount).

REGLERNA (tagna ur ägarens tre genomgångna filer 151659, 171840, 172432):
  landning   där basen kommer tillbaka: motorns minidrop/drop och svepets basåterkomster, sammanslagna inom 1,5 s, flyttade till basens
             största språng (+-0,5 s) och närmaste slag. Kvar bara om basen efter (0,2-3 s) ligger minst 8 dB över basen före (3-0,3 s).
  drop       landning med en uppbyggnad 1-12 s före OCH ny sektion (molnets gräns) inom 2 s OCH full nivå efter (låtens 70:e percentil);
             högst ett drop per 12 s. Annars minidrop ("låt det vara minidrop").  (ägaren: 15 av 19 drop har uppbyggnad, 12 av 42 mini)
  uppbyggnad senaste uppbyggnadsstarten 1-12 s före ett drop eller minidrop, ur detektorerna (u4/u2 i arenan UPP1: 4 av 4 på osedd fil).
  låtbyte    ägarens egna Låtbyte-tryck (latbyten.json), flyttade till största spektrumskiftet inom +-10 s och närmaste taktetta.
  sektion    molnets gränser per låt; etikett efter energi i låten (molnets etiketter är fel på den här musiken): första lugna = intro,
             översta tredjedelen = refräng, sista korta lugna = outro, bridge/break = break, annars vers. Varje drop börjar en refräng."""
import sys, os, json, io
import numpy as np, scipy.signal
H = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, H)
import svep
E = svep.E

def main(wav, motor, uppbs):
    p = os.path.abspath(wav); bas = p[:-4]; namn = os.path.basename(p)
    if os.path.exists(bas + '.marks-hand.json'): sys.exit('finns redan en hand-fil - skriver inte över ägarens genomgång')
    y, sr = svep.las_wav(p); dur = len(y) / sr; beats, downs = svep.slag(p)
    B, A = svep.kurvor(y, sr); S = svep.skifte(y, sr); n = len(B)
    med = lambda x, a, c: float(np.median(x[max(0, int(a * 100)):max(int(a * 100) + 1, int(c * 100))]))
    R = json.load(open(motor)); U = sorted(set(round(t, 2) for f in uppbs for t in json.load(open(f)).get('uppb', [])))
    F = json.load(io.open(bas + '.forslag.json', encoding='utf-8'))['marks'] if os.path.exists(bas + '.forslag.json') else []
    M = json.load(io.open(bas + '.forslag-moln.json', encoding='utf-8'))['marks'] if os.path.exists(bas + '.forslag-moln.json') else []
    lb = json.load(io.open(os.path.join(E, 'tools', 'ladan-2026-11-13', 'latbyten.json'), encoding='utf-8')).get(namn, [])
    ut = []
    # låtbyten
    L = []
    for t in lb:
        a, b = int(max(5, t - 10) * 10), int(min(dur - 5, t + 10) * 10); tt = (a + int(np.argmax(S[a:b]))) / 10 if b > a else t
        L.append(svep.narmast(downs, tt, 1.5)); ut.append(dict(kind='latbyte', fineS=L[-1], why='ditt Låtbyte-tryck %.0f s, flyttat till spektrumskiftet' % t))
    kant = sorted([0.0] + L + [dur])
    # landningar
    kand = [(t, 'motorn minidrop') for t in R['minis']] + [(t, 'motorn drop') for t in R['drops']] + [(m['fineS'], 'svepet: ' + m.get('why', '')) for m in F if m['kind'] in ('drop', 'mini')]
    kand += [(i / 100, 'basen') for i in range(200, n - 50) if B[i] - B[i - 30] > 12 and B[i - 1] - B[i - 31] <= 12]   # egen genomsökning: basen +12 dB på 0,3 s
    kand.sort(); grupp = []
    for t, k in kand:
        if grupp and t - grupp[-1][0][0] < 1.5: grupp[-1].append((t, k))
        else: grupp.append([(t, k)])
    land = []
    for g in grupp:
        kk = []
        for tc, _ in g:   # varje kandidat: största språnget inom +-0,25 s och basens nivå 0-0,5 s efter
            i0, i1 = int((tc - 0.25) * 100), int((tc + 0.25) * 100)
            if i0 < 40 or i1 + 60 >= n: continue
            d = [10 * np.log10(np.mean(10 ** (B[k:k + 6] / 10)) + 1e-12) - 10 * np.log10(np.mean(10 ** (B[k - 30:k] / 10)) + 1e-12) for k in range(i0, i1)]
            t = svep.narmast(beats, (i0 + int(np.argmax(d))) / 100, 0.15); kk.append((t, med(B, t, t + 0.5), med(B, t + 0.2, t + 3) - med(B, t - 3, t - 0.3)))
        if not kk: continue
        topp = max(x[1] for x in kk)   # landningen = FÖRSTA punkten där basen är full (inom 1,5 dB av gruppens högsta): uppgången före vinner inte
        t, _, lyft = min((x for x in kk if x[1] >= topp - 1.5), key=lambda x: x[0])
        if lyft >= 8 and t > 15 and (not land or t - land[-1][0] >= 1.5): land.append((t, lyft, ', '.join(sorted(set(k.split(':')[0] for _, k in g)))))
    # sektionsgränser (molnet) per låt
    sek = sorted(set(round(m['fineS'], 2) for m in M))
    sista = -99
    for t, lyft, kalla in land:
        song = max(k for k in kant if k <= t); slut = min(k for k in kant if k > t); p70 = np.percentile(A[int(song * 100):int(slut * 100)], 70)
        up = [u for u in U if 1.0 <= t - u <= 12]; nysek = any(abs(s - t) <= 2 for s in sek); full = med(A, t + 0.2, t + 4) >= p70 - 1
        drop = bool(up) and nysek and full and t - sista >= 12
        if drop: sista = t
        ut.append(dict(kind='drop' if drop else 'mini', fineS=t, why='basen +%.0f dB (%s)%s' % (lyft, kalla, '; uppbyggnad + ny sektion + full nivå' if drop else
                       ('; ' + ', '.join(x for x, ok in (('uppbyggnad', bool(up)), ('ny sektion', nysek), ('full nivå', full)) if not ok) + ' saknas') if not (up and nysek and full) else '; 12 s efter förra droppet')))
        if up and not any(m['kind'] == 'uppbyggnad' and abs(m['fineS'] - svep.narmast(downs, up[-1], 1.0)) < 0.5 for m in ut):
            ut.append(dict(kind='uppbyggnad', fineS=svep.narmast(downs, up[-1], 1.0), why='uppbyggnadsdetektorn (%.1f s före %s)' % (t - up[-1], 'droppet' if drop else 'minidroppet')))
    # knapptrycken (osäkra: kompisen 11-14) där förslaget inget har: med som förslag så att ägaren lyssnar ("basen spelar vidare"-sorten)
    if os.path.exists(bas + '.marks-fin.json'):
        for m in json.load(io.open(bas + '.marks-fin.json', encoding='utf-8'))['marks']:
            if m.get('skip') or m['kind'] not in ('drop', 'mini') or any(x['kind'] in ('drop', 'mini') and abs(x['fineS'] - m['fineS']) < 2 for x in ut): continue
            t = svep.narmast(beats, m['fineS'], 0.15); ly = med(B, t + 0.2, t + 3) - med(B, t - 3, t - 0.3)
            ut.append(dict(kind=m['kind'], fineS=t, why='knapptryck %s (osäkert), basen %+.0f dB' % (m['kind'], ly)))
    # sektioner: molnets gränser, etikett efter energi
    drops = [m['fineS'] for m in ut if m['kind'] == 'drop']
    for a, b in zip(kant, kant[1:]):
        g = sorted(set([a] + [s for s in sek if a + 3 < s < b - 3] + [d for d in drops if a < d < b]))
        g2 = []
        for s in g:
            if g2 and s - g2[-1] < 4: g2[-1] = s if s in drops else g2[-1]
            else: g2.append(s)
        seg = list(zip(g2, g2[1:] + [b])); en = [med(A, s, e) for s, e in seg]
        if not en: continue
        hog = np.percentile(en, 67); etik = {round(m['fineS'], 2): m.get('etikett', '') for m in M}
        for k, ((s, e), v) in enumerate(zip(seg, en)):
            lab = etik.get(round(s, 2), '')
            sort = 'refrang' if (s in drops or v >= hog) else 'break' if lab in ('bridge', 'break') else 'intro' if k == 0 and v < np.median(en) else 'outro' if k == len(seg) - 1 and k > 0 and e - s <= 30 and v < np.median(en) else 'vers'
            ut.append(dict(kind=sort, fineS=svep.narmast(downs, s, 1.0) if s not in drops else s, why='molnets gräns%s, energi %.1f dB (låtens översta tredjedel %.1f)' % (' (' + lab + ')' if lab else '', v, hog)))
    marks = [dict(kind=m['kind'], fineS=round(float(m['fineS']), 3), pressS=round(float(m['fineS']), 3), sure=True, skip=False, hand=False, forslag=True, why=m['why'][:120]) for m in sorted(ut, key=lambda m: m['fineS'])]
    json.dump(dict(file=namn, note='FULLT FÖRSLAG (tools/markera/forslag_full.py): allt är forslag tills ägaren godtar (G) eller ändrar det.', klar=False, marks=marks),
              io.open(bas + '.marks-hand.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    from collections import Counter
    print('%s: %d förslag %s' % (namn, len(marks), dict(Counter(m['kind'] for m in marks))))
    for m in marks:
        if m['kind'] in ('drop', 'mini', 'uppbyggnad', 'latbyte'): print('  %-10s %8.2f  %s' % (m['kind'], m['fineS'], m['why']))

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], sys.argv[3:])
